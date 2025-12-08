"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestWorkbenchService = void 0;
const vscodeVersion_1 = require("../../../util/common/vscodeVersion");
const platform_1 = require("../../../util/vs/base/common/platform");
const uri_1 = require("../../../util/vs/base/common/uri");
const embeddingsIndex_1 = require("../../embeddings/common/embeddingsIndex");
const envService_1 = require("../../env/common/envService");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const fileSystemService_1 = require("../../filesystem/common/fileSystemService");
const fetcherService_1 = require("../../networking/common/fetcherService");
let TestWorkbenchService = class TestWorkbenchService {
    constructor(fetcherService, fileSystemService, vscodeExtensionContext, envService) {
        const cacheVersion = (0, vscodeVersion_1.sanitizeVSCodeVersion)(envService.getEditorInfo().version);
        this.commandsTestData = new RemoteTestDataCache(vscodeExtensionContext, fileSystemService, fetcherService, 'allCoreCommands', cacheVersion, embeddingsIndex_1.RemoteCacheType.Commands);
        this.settingsTestData = new RemoteTestDataCache(vscodeExtensionContext, fileSystemService, fetcherService, 'allCoreSettings', cacheVersion, embeddingsIndex_1.RemoteCacheType.Settings);
    }
    getAllExtensions() {
        // TODO: Implement this
        return [];
    }
    async getAllCommands(filterByPreCondition) {
        const commands = await this.commandsTestData.getCache();
        // Commands that are not contributed by extensions. Update list as needed for tests
        const filteredCommands = commands.filter((command) => command.command.startsWith('workbench') ||
            command.command.startsWith('telemetry') ||
            command.command.startsWith('editor') ||
            (filterByPreCondition ? command.precondition === undefined : true));
        return filteredCommands.map((command) => ({
            label: command.label,
            command: command.command,
            keybinding: command.keybinding ?? 'Not set'
        }));
    }
    async getAllSettings() {
        return await this.settingsTestData.getCache();
    }
};
exports.TestWorkbenchService = TestWorkbenchService;
exports.TestWorkbenchService = TestWorkbenchService = __decorate([
    __param(0, fetcherService_1.IFetcherService),
    __param(1, fileSystemService_1.IFileSystemService),
    __param(2, extensionContext_1.IVSCodeExtensionContext),
    __param(3, envService_1.IEnvService)
], TestWorkbenchService);
class RemoteTestDataCache {
    constructor(vscodeExtensionContext, fileSystem, fetcher, cacheKey, cacheVersion, remoteCacheType) {
        this.vscodeExtensionContext = vscodeExtensionContext;
        this.fileSystem = fileSystem;
        this.fetcher = fetcher;
        this.cacheKey = cacheKey;
        this.cacheVersion = cacheVersion;
        this.cacheVersionKey = `${cacheKey}-version`;
        this.remoteCacheURL = `https://embeddings.vscode-cdn.net/test-artifacts/v${cacheVersion}/${remoteCacheType}/core.json`;
    }
    async getCache() {
        const cache = await this.getLocalCache();
        if (cache) {
            return cache;
        }
        if (platform_1.isCI) {
            throw new Error(`No embeddings cache found for ${this.cacheVersion}`);
        }
        const remoteCache = await this.fetchRemoteCache();
        if (!remoteCache) {
            return;
        }
        await this.cacheVersionMementoStorage.update(this.cacheVersionKey, this.cacheVersion);
        await this.updateCache(remoteCache);
        return remoteCache;
    }
    async fetchRemoteCache() {
        if (this._remoteCache) {
            return this._remoteCache;
        }
        try {
            const response = await this.fetcher.fetch(this.remoteCacheURL, { method: 'GET' });
            if (response.ok) {
                this._remoteCache = (await response.json());
                return this._remoteCache;
            }
            else {
                console.error(`Failed to fetch remote embeddings cache from ${this.remoteCacheURL}`);
                return;
            }
        }
        catch {
            console.error(`Failed to fetch remote embeddings cache from ${this.remoteCacheURL}`);
            return;
        }
    }
    get cacheStorageUri() {
        return this.vscodeExtensionContext.globalStorageUri;
    }
    get cacheVersionMementoStorage() {
        return this.vscodeExtensionContext.globalState;
    }
    async getLocalCache() {
        if (!this.cacheStorageUri) {
            return;
        }
        const cacheVersion = this.cacheVersionMementoStorage.get(this.cacheVersionKey);
        if (cacheVersion !== this.cacheVersion) {
            return undefined;
        }
        try {
            const buffer = await this.fileSystem.readFile(uri_1.URI.joinPath(this.cacheStorageUri, `${this.cacheKey}.json`));
            // Convert the buffer to a string and JSON parse it
            return JSON.parse(buffer.toString());
        }
        catch {
            return undefined;
        }
    }
    async updateCache(value) {
        if (!this.cacheStorageUri) {
            return;
        }
        // Cannot write to readonly file system
        if (!this.fileSystem.isWritableFileSystem(this.cacheStorageUri.scheme)) {
            return;
        }
        // Create directory at stoageUri if it doesn't exist
        try {
            await this.fileSystem.stat(this.cacheStorageUri);
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                // Directory doesn't exist we should create it
                await this.fileSystem.createDirectory(this.cacheStorageUri);
            }
        }
        // Update cache version
        await this.cacheVersionMementoStorage.update(this.cacheVersionKey, this.cacheVersion);
        const hasOldCache = this.cacheVersionMementoStorage.get(this.cacheKey);
        if (hasOldCache) {
            await this.cacheVersionMementoStorage.update(this.cacheKey, undefined);
        }
        const cacheFile = uri_1.URI.joinPath(this.cacheStorageUri, `${this.cacheKey}.json`);
        try {
            const fileSystemPromise = value === undefined
                ? this.fileSystem.delete(cacheFile, { useTrash: false })
                : this.fileSystem.writeFile(cacheFile, Buffer.from(JSON.stringify(value)));
            await fileSystemPromise;
        }
        catch (e) {
            if (value !== undefined) {
                console.error(`Failed to write embeddings cache to ${cacheFile}`);
            }
        }
    }
}
//# sourceMappingURL=testWorkbenchService.js.map