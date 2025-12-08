"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteSlottedCache = exports.SQLiteCache = exports.Cache = void 0;
const sqlite_1 = __importDefault(require("@keyv/sqlite"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const keyv_1 = __importDefault(require("keyv"));
const node_stream_1 = require("node:stream");
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const zlib_1 = __importDefault(require("zlib"));
const lock_1 = require("../../src/util/common/lock");
const uuid_1 = require("../../src/util/vs/base/common/uuid");
const compress = (0, util_1.promisify)(zlib_1.default.brotliCompress);
const decompress = (0, util_1.promisify)(zlib_1.default.brotliDecompress);
const DefaultCachePath = process.env.VITEST ? path_1.default.resolve(__dirname, '..', 'simulation', 'cache') : path_1.default.resolve(__dirname, '..', 'test', 'simulation', 'cache');
function isValidSqliteFile(filePath) {
    try {
        // SQLite files start with "SQLite format 3\0" (16 bytes header)
        const fd = fs_1.default.openSync(filePath, 'r');
        const buffer = Buffer.alloc(16);
        fs_1.default.readSync(fd, buffer, 0, 16, 0);
        fs_1.default.closeSync(fd);
        // Check for SQLite magic header
        return buffer.toString('utf8', 0, 15) === 'SQLite format 3';
    }
    catch {
        return false;
    }
}
async function getGitRoot(cwd) {
    const execAsync = (0, util_1.promisify)(child_process_1.exec);
    const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd });
    return stdout.trim();
}
class Cache extends node_stream_1.EventEmitter {
    static get Instance() {
        return this._Instance ?? (this._Instance = new Cache());
    }
    constructor(cachePath = DefaultCachePath) {
        super();
        this.cachePath = cachePath;
        this.layersPath = path_1.default.join(this.cachePath, 'layers');
        this.externalLayersPath = process.env.EXTERNAL_CACHE_LAYERS_PATH;
        const baseSqlitePath = path_1.default.join(this.cachePath, 'base.sqlite');
        if (!fs_1.default.existsSync(baseSqlitePath)) {
            throw new Error(`Base cache file does not exist at ${baseSqlitePath}.`);
        }
        if (!isValidSqliteFile(baseSqlitePath)) {
            throw new Error(`Base cache file at ${baseSqlitePath} is not a valid SQLite database. If this is a Git LFS pointer file, run 'git lfs pull' to download the actual database.`);
        }
        if (this.externalLayersPath && !fs_1.default.existsSync(this.externalLayersPath)) {
            throw new Error(`External layers cache directory provided but it does not exist at ${this.externalLayersPath}.`);
        }
        fs_1.default.mkdirSync(this.layersPath, { recursive: true });
        this.base = new keyv_1.default(new sqlite_1.default(path_1.default.join(this.cachePath, 'base.sqlite')));
        this.layers = new Map();
        let layerFiles = fs_1.default.readdirSync(this.layersPath)
            .filter(file => file.endsWith('.sqlite'))
            .map(file => path_1.default.join(this.layersPath, file));
        if (this.externalLayersPath !== undefined) {
            const externalLayerFiles = fs_1.default.readdirSync(this.externalLayersPath)
                .filter(file => file.endsWith('.sqlite'))
                .map(file => path_1.default.join(this.externalLayersPath, file));
            layerFiles = layerFiles.concat(externalLayerFiles);
        }
        for (const layerFile of layerFiles) {
            const name = path_1.default.basename(layerFile, path_1.default.extname(layerFile));
            this.layers.set(name, new keyv_1.default(new sqlite_1.default(layerFile)));
        }
    }
    async get(key) {
        let data;
        // First check base database
        data = await this.base.get(key);
        if (!data) {
            // Check layer databases
            for (const [, layer] of this.layers) {
                data = await layer.get(key);
                if (data) {
                    break;
                }
            }
        }
        if (!data) {
            return undefined;
        }
        // GC mode in progress
        if (this.gcBase && this.gcBaseKeys) {
            if (!this.gcBaseKeys.has(key)) {
                if (await this.gcBase.set(key, data)) {
                    this.gcBaseKeys.add(key);
                }
            }
        }
        return this._decompress(data);
    }
    async set(key, value, layer) {
        if (await this.has(key)) {
            throw new Error(`Key already exists in cache: ${key}`);
        }
        const data = await this._compress(value);
        switch (layer) {
            case undefined: {
                const layerDatabase = await this._getActiveLayerDatabase();
                await layerDatabase.set(key, data);
                break;
            }
            case 'base': {
                await this.base.set(key, data);
                break;
            }
            default: {
                const layerDatabase = this.layers.get(layer);
                if (!layerDatabase) {
                    throw new Error(`Layer with UUID not found: ${layer}`);
                }
                await layerDatabase.set(key, data);
                break;
            }
        }
    }
    async has(key) {
        // Check primary first
        if (await this.base.has(key)) {
            return true;
        }
        // Check layers
        for (const layer of this.layers.values()) {
            if (await layer.has(key)) {
                return true;
            }
        }
        return false;
    }
    async checkDatabase() {
        const keys = new Map();
        const result = new Map();
        const checkDatabase = async (name, database) => {
            for await (const [key] of database.store.iterator()) {
                if (result.has(key)) {
                    result.get(key).push(name);
                }
                else if (keys.has(key)) {
                    result.set(key, [keys.get(key), name]);
                    keys.delete(key);
                }
                else {
                    keys.set(key, name);
                }
            }
        };
        // Base database
        await checkDatabase('base', this.base);
        // Layer databases
        for (const [uuid, database] of this.layers.entries()) {
            await checkDatabase(uuid, database);
        }
        return result;
    }
    async gcStart() {
        if (this.gcBase || this.gcBaseKeys) {
            throw new Error('GC is currently in progress');
        }
        this.gcBaseKeys = new Set();
        this.gcBase = new keyv_1.default(new sqlite_1.default(path_1.default.join(this.cachePath, '_base.sqlite')));
    }
    async gcEnd() {
        if (!this.gcBase || !this.gcBaseKeys) {
            throw new Error('GC is not in progress');
        }
        // Close the connections
        await this.base.disconnect();
        await this.gcBase.disconnect();
        // Delete base.sqlite
        fs_1.default.unlinkSync(path_1.default.join(this.cachePath, 'base.sqlite'));
        // Rename _base.sqlite to base.sqlite
        fs_1.default.renameSync(path_1.default.join(this.cachePath, '_base.sqlite'), path_1.default.join(this.cachePath, 'base.sqlite'));
        // Delete the layer databases
        for (const [uuid, layer] of this.layers.entries()) {
            try {
                // Close the connection
                await layer.disconnect();
            }
            catch (error) { }
            try {
                // Delete the layer database
                fs_1.default.unlinkSync(path_1.default.join(this.layersPath, `${uuid}.sqlite`));
            }
            catch (error) { }
        }
        this.activeLayer = undefined;
        this.layers.clear();
        this.gcBase = undefined;
        this.gcBaseKeys.clear();
        this.gcBaseKeys = undefined;
    }
    async _getActiveLayerDatabase() {
        if (!this.activeLayer) {
            this.activeLayer = (async () => {
                const execAsync = (0, util_1.promisify)(child_process_1.exec);
                const activeLayerPath = this.externalLayersPath ?? this.layersPath;
                const gitStatusPath = this.externalLayersPath
                    ? `${path_1.default.relative(await getGitRoot(activeLayerPath), activeLayerPath)}/*`
                    : 'test/simulation/cache/layers/*';
                // Check git for an uncommitted layer database file
                try {
                    const gitRoot = await getGitRoot(activeLayerPath);
                    const { stdout: statusStdout } = await execAsync(`git status -z ${gitStatusPath}`, { cwd: gitRoot });
                    if (statusStdout !== '') {
                        const layerDatabaseEntries = statusStdout.split('\0').filter(entry => entry.endsWith('.sqlite'));
                        if (layerDatabaseEntries.length > 0) {
                            const regex = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.sqlite$/;
                            const match = layerDatabaseEntries[0].match(regex);
                            if (match && this.layers.has(match[1])) {
                                return this.layers.get(match[1]);
                            }
                        }
                    }
                }
                catch (error) {
                    // If git operations fail, continue to create new layer
                }
                // Create a new layer database
                const uuid = (0, uuid_1.generateUuid)();
                const activeLayer = new keyv_1.default(new sqlite_1.default(path_1.default.join(activeLayerPath, `${uuid}.sqlite`)));
                this.layers.set(uuid, activeLayer);
                return activeLayer;
            })();
        }
        return this.activeLayer;
    }
    async _compress(value) {
        const buffer = await compress(value, { params: { [zlib_1.default.constants.BROTLI_PARAM_QUALITY]: 6, } });
        return buffer.toString('base64');
    }
    async _decompress(data) {
        const buffer = await decompress(Buffer.from(data, 'base64'));
        return buffer.toString('utf8');
    }
}
exports.Cache = Cache;
class SQLiteCache {
    constructor(name, salt, info) {
        this.locks = new lock_1.LockMap();
        this.namespace = `${name}${salt ? `|${salt}` : ''}`;
    }
    async hasRequest(hash) {
        return Cache.Instance.has(`${this.namespace}:request:${hash}`);
    }
    async getRequest(hash) {
        const result = await Cache.Instance.get(`${this.namespace}:request:${hash}`);
        return result ? JSON.parse(result) : undefined;
    }
    async setRequest(hash, value) {
        await Cache.Instance.set(`${this.namespace}:request:${hash}`, JSON.stringify(value));
    }
    async has(req) {
        return Cache.Instance.has(`${this.namespace}:response:${req.hash}`);
    }
    async get(req) {
        const result = await Cache.Instance.get(`${this.namespace}:response:${req.hash}`);
        return result ? JSON.parse(result) : undefined;
    }
    async set(req, value) {
        await this.locks.withLock(req.hash, async () => {
            if (!!req.toJSON && !await this.hasRequest(req.hash)) {
                await this.setRequest(req.hash, req);
            }
        });
        await Cache.Instance.set(`${this.namespace}:response:${req.hash}`, JSON.stringify(value));
    }
}
exports.SQLiteCache = SQLiteCache;
class SQLiteSlottedCache {
    constructor(name, salt, info) {
        this.locks = new lock_1.LockMap();
        this.namespace = `${name}|${salt}`;
    }
    async hasRequest(hash) {
        return Cache.Instance.has(`${this.namespace}:request:${hash}`);
    }
    async getRequest(hash) {
        const result = await Cache.Instance.get(`${this.namespace}:request:${hash}`);
        return result ? JSON.parse(result) : undefined;
    }
    async setRequest(hash, value) {
        await Cache.Instance.set(`${this.namespace}:request:${hash}`, JSON.stringify(value));
    }
    async has(req, cacheSlot) {
        return Cache.Instance.has(`${this.namespace}:response:${req.hash}:${cacheSlot}`);
    }
    async get(req, cacheSlot) {
        const result = await Cache.Instance.get(`${this.namespace}:response:${req.hash}:${cacheSlot}`);
        return result ? JSON.parse(result) : undefined;
    }
    async set(req, cacheSlot, value) {
        await this.locks.withLock(req.hash, async () => {
            if (!await this.hasRequest(req.hash)) {
                await this.setRequest(req.hash, req);
            }
        });
        await Cache.Instance.set(`${this.namespace}:response:${req.hash}:${cacheSlot}`, JSON.stringify(value));
    }
}
exports.SQLiteSlottedCache = SQLiteSlottedCache;
//# sourceMappingURL=cache.js.map