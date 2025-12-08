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
var RemoteEmbeddingsCache_1, RemoteEmbeddingsExtensionCache_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseEmbeddingsIndex = exports.RemoteEmbeddingsExtensionCache = exports.RemoteEmbeddingsCache = exports.LocalEmbeddingsCache = exports.EmbeddingCacheType = exports.RemoteCacheType = void 0;
const buffer_1 = require("../../../util/vs/base/common/buffer");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const fileSystemService_1 = require("../../filesystem/common/fileSystemService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const workbenchService_1 = require("../../workbench/common/workbenchService");
const embeddingsComputer_1 = require("./embeddingsComputer");
var RemoteCacheType;
(function (RemoteCacheType) {
    RemoteCacheType["Settings"] = "settings";
    RemoteCacheType["Commands"] = "commands";
    RemoteCacheType["Api"] = "api";
    RemoteCacheType["Extensions"] = "extensions";
    RemoteCacheType["ProjectTemplates"] = "project-templates";
    RemoteCacheType["Tools"] = "tools";
})(RemoteCacheType || (exports.RemoteCacheType = RemoteCacheType = {}));
// These values are the blob storage container names where we publish computed embeddings
var RemoteEmbeddingsContainer;
(function (RemoteEmbeddingsContainer) {
    RemoteEmbeddingsContainer["TEXT3SMALL"] = "text-3-small";
    RemoteEmbeddingsContainer["METIS_1024_I16_BINARY"] = "metis-1024-I16-Binary";
})(RemoteEmbeddingsContainer || (RemoteEmbeddingsContainer = {}));
function embeddingsModelToRemoteContainer(embeddingType) {
    switch ((0, embeddingsComputer_1.getWellKnownEmbeddingTypeInfo)(embeddingType)?.model) {
        case "metis-I16-Binary" /* LEGACY_EMBEDDING_MODEL_ID.Metis_I16_Binary */:
            return RemoteEmbeddingsContainer.METIS_1024_I16_BINARY;
        case "text-embedding-3-small" /* LEGACY_EMBEDDING_MODEL_ID.TEXT3SMALL */:
        default:
            return RemoteEmbeddingsContainer.TEXT3SMALL;
    }
}
var EmbeddingCacheType;
(function (EmbeddingCacheType) {
    EmbeddingCacheType[EmbeddingCacheType["GLOBAL"] = 1] = "GLOBAL";
    EmbeddingCacheType[EmbeddingCacheType["WORKSPACE"] = 2] = "WORKSPACE";
})(EmbeddingCacheType || (exports.EmbeddingCacheType = EmbeddingCacheType = {}));
let EmbeddingsCache = class EmbeddingsCache {
    constructor(cacheType, cacheKey, cacheVersion, fileSystemService, extensionContext) {
        this.cacheType = cacheType;
        this.cacheKey = cacheKey;
        this.cacheVersion = cacheVersion;
        this.fileSystemService = fileSystemService;
        this.extensionContext = extensionContext;
        this.cacheVersionKey = `${cacheKey}-version`;
    }
    get cacheStorageUri() {
        return this.cacheType === EmbeddingCacheType.WORKSPACE
            ? this.extensionContext.storageUri
            : this.extensionContext.globalStorageUri;
    }
    get cacheVersionMementoStorage() {
        return this.cacheType === EmbeddingCacheType.WORKSPACE
            ? this.extensionContext.workspaceState
            : this.extensionContext.globalState;
    }
    async updateCache(value) {
        if (!this.cacheStorageUri || value === undefined) {
            return;
        }
        // Cannot write to readonly file system
        if (!this.fileSystemService.isWritableFileSystem(this.cacheStorageUri.scheme)) {
            return;
        }
        // Create directory at stoageUri if it doesn't exist
        try {
            await this.fileSystemService.stat(this.cacheStorageUri);
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                // Directory doesn't exist we should create it
                await this.fileSystemService.createDirectory(this.cacheStorageUri);
            }
        }
        // Update cache version
        await this.cacheVersionMementoStorage.update(this.cacheVersionKey, this.cacheVersion);
        const cacheFile = uri_1.URI.joinPath(this.cacheStorageUri, `${this.cacheKey}.json`);
        try {
            await this.fileSystemService.writeFile(cacheFile, buffer_1.VSBuffer.fromString(JSON.stringify(value)).buffer);
        }
        catch (e) {
            if (value !== undefined) {
                console.error(`Failed to write embeddings cache to ${cacheFile}`);
            }
        }
    }
    async getCache() {
        if (!this.cacheStorageUri) {
            return;
        }
        const cacheVersion = this.cacheVersionMementoStorage.get(this.cacheVersionKey);
        if (cacheVersion !== this.cacheVersion) {
            return undefined;
        }
        try {
            const cacheEntries = await fileSystemService_1.fileSystemServiceReadAsJSON.readJSON(this.fileSystemService, uri_1.URI.joinPath(this.cacheStorageUri, `${this.cacheKey}.json`));
            if (this.isEmbeddingCacheEntriesType(cacheEntries)) {
                // If the cache is of the type EmbeddingCacheEntriesWithExtensions (during tests), we need to flatten it
                return this.constructExposedCache(cacheEntries);
            }
            return cacheEntries;
        }
        catch {
            return undefined;
        }
    }
    async clearCache() {
        if (!this.cacheStorageUri) {
            return;
        }
        const hasOldCache = this.cacheVersionMementoStorage.get(this.cacheKey);
        if (hasOldCache) {
            await this.cacheVersionMementoStorage.update(this.cacheKey, undefined);
        }
        const cacheFile = uri_1.URI.joinPath(this.cacheStorageUri, `${this.cacheKey}.json`);
        try {
            await this.fileSystemService.stat(this.cacheStorageUri);
            await this.fileSystemService.delete(cacheFile, { useTrash: false });
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                throw new Error(`Cache file ${cacheFile} does not exist`);
            }
        }
    }
    isEmbeddingCacheEntriesType(cache) {
        return cache.core !== undefined && cache.extensions !== undefined;
    }
    constructExposedCache(cache) {
        const flattenedCache = { ...cache.core };
        for (const extensionId in cache.extensions) {
            const extensionCache = cache.extensions[extensionId];
            for (const key in extensionCache) {
                flattenedCache[key] = extensionCache[key];
            }
        }
        return flattenedCache;
    }
};
EmbeddingsCache = __decorate([
    __param(3, fileSystemService_1.IFileSystemService),
    __param(4, extensionContext_1.IVSCodeExtensionContext)
], EmbeddingsCache);
/**
 * A local cache which caches information on disk.
 */
let LocalEmbeddingsCache = class LocalEmbeddingsCache {
    constructor(cacheType, cacheKey, cacheVersion, embeddingType, instantiationService) {
        this.cacheKey = cacheKey;
        this.cacheVersion = cacheVersion;
        this.embeddingType = embeddingType;
        this._embeddingsCache = instantiationService.createInstance(EmbeddingsCache, cacheType, cacheKey, cacheVersion);
    }
    async getCache() {
        const cacheEntries = await this._embeddingsCache.getCache();
        if (cacheEntries === undefined) {
            throw new Error(`Failed to get cache for ${this.cacheKey}, version ${this.cacheVersion}`);
        }
        return cacheEntries;
    }
    clearCache() {
        return this._embeddingsCache.clearCache();
    }
};
exports.LocalEmbeddingsCache = LocalEmbeddingsCache;
exports.LocalEmbeddingsCache = LocalEmbeddingsCache = __decorate([
    __param(4, instantiation_1.IInstantiationService)
], LocalEmbeddingsCache);
/**
 * An embeddings cache which fetches embeddings from a remote CDN.
 * It is limited to one remote file
 */
let RemoteEmbeddingsCache = RemoteEmbeddingsCache_1 = class RemoteEmbeddingsCache {
    constructor(cacheType, cacheKey, cacheVersion, embeddingType, remoteCacheType, fetcherService, instantiationService) {
        this.cacheVersion = cacheVersion;
        this.embeddingType = embeddingType;
        this.remoteCacheType = remoteCacheType;
        this.fetcherService = fetcherService;
        this.embeddingsCache = instantiationService.createInstance(EmbeddingsCache, cacheType, cacheKey, cacheVersion);
        this.remoteCacheVersionKey = `${cacheKey}-version-remote`;
    }
    async clearCache() {
        await this.embeddingsCache.clearCache();
    }
    async getRemoteContainer() {
        return embeddingsModelToRemoteContainer(this.embeddingType);
    }
    async getRemoteCacheURL() {
        if (!this._remoteCacheURL) {
            const remoteCacheContainer = await this.getRemoteContainer();
            this._remoteCacheURL = RemoteEmbeddingsCache_1.calculateRemoteCDNURL(remoteCacheContainer, this.remoteCacheType, this.cacheVersion);
        }
        return this._remoteCacheURL;
    }
    async getRemoteCacheLatestUpdateURL() {
        if (!this._remoteCacheLatestUpdateURL) {
            const remoteCacheContainer = await this.getRemoteContainer();
            this._remoteCacheLatestUpdateURL = RemoteEmbeddingsCache_1.calculateRemoteCDNLatestURL(remoteCacheContainer, this.remoteCacheType, this.cacheVersion);
        }
        return this._remoteCacheLatestUpdateURL;
    }
    async fetchRemoteCache() {
        if (this._remoteCacheEntries) {
            return this._remoteCacheEntries;
        }
        const remoteCacheURL = await this.getRemoteCacheURL();
        try {
            const remoteCacheURL = await this.getRemoteCacheURL();
            const response = await this.fetcherService.fetch(remoteCacheURL, { method: 'GET' });
            if (response.ok) {
                this._remoteCacheEntries = (await response.json());
                return this._remoteCacheEntries;
            }
            else {
                console.error(`Failed to fetch remote embeddings cache from ${remoteCacheURL}`);
                console.error(`Response status: ${response.status}, status text: ${response.statusText}`);
                return;
            }
        }
        catch (err) {
            console.error(`Failed to fetch remote embeddings cache from ${remoteCacheURL}`);
            console.error(err);
            return;
        }
    }
    async fetchRemoteCacheLatest() {
        const remoteCacheLatestUpdateURL = await this.getRemoteCacheLatestUpdateURL();
        try {
            const response = await this.fetcherService.fetch(remoteCacheLatestUpdateURL, { method: 'GET' });
            if (response.ok) {
                return response.text();
            }
            else {
                console.error(`Failed to fetch remote embeddings cache from ${remoteCacheLatestUpdateURL}`);
                console.error(`Response status: ${response.status}, status text: ${response.statusText}`);
                return;
            }
        }
        catch (err) {
            console.error(`Failed to fetch remote embeddings cache from ${remoteCacheLatestUpdateURL}`);
            console.error(err);
            return;
        }
    }
    async getCache() {
        const remoteCacheLatest = await this.fetchRemoteCacheLatest();
        const cache = await this.embeddingsCache.getCache();
        // If the cache exists and the remote cache version is a match,
        // it means it is the latest version and we can return it,
        // otherwise we will fetch again the remote cache
        if (cache && remoteCacheLatest === this.embeddingsCache.cacheVersionMementoStorage.get(this.remoteCacheVersionKey)) {
            return cache;
        }
        const remoteCache = await this.fetchRemoteCache();
        if (remoteCache === undefined) {
            // fallback to previous local cache if remote cache is unavailable
            return cache;
        }
        await this.embeddingsCache.clearCache();
        await this.embeddingsCache.cacheVersionMementoStorage.update(this.remoteCacheVersionKey, remoteCacheLatest);
        await this.embeddingsCache.updateCache(remoteCache);
        return remoteCache;
    }
    static calculateRemoteCDNURL(cacheContainer, embeddingsType, cacheVersion) {
        return `https://embeddings.vscode-cdn.net/${cacheContainer}/v${cacheVersion}/${embeddingsType}/core.json`;
    }
    static calculateRemoteCDNLatestURL(cacheContainer, embeddingsType, cacheVersion) {
        return `https://embeddings.vscode-cdn.net/${cacheContainer}/v${cacheVersion}/${embeddingsType}/latest.txt`;
    }
};
exports.RemoteEmbeddingsCache = RemoteEmbeddingsCache;
exports.RemoteEmbeddingsCache = RemoteEmbeddingsCache = RemoteEmbeddingsCache_1 = __decorate([
    __param(5, fetcherService_1.IFetcherService),
    __param(6, instantiation_1.IInstantiationService)
], RemoteEmbeddingsCache);
/**
 * A remote cache which is also aware of installed extensions and updates properly when they are updated, installed, or uninstalled
 * Internally we use a nested structure which breaks down core, and each extension id for better perf.
 * Externally a flattened cache with all values on the same level is exposed for easier consumption and to conform to the other cache interfaces.
 * When updating the cache we use the internal structure rather than the flatten one because the flattened on is only for external consumption.
 */
let RemoteEmbeddingsExtensionCache = RemoteEmbeddingsExtensionCache_1 = class RemoteEmbeddingsExtensionCache extends RemoteEmbeddingsCache {
    constructor(cacheType, cacheKey, cacheVersion, embeddingType, remoteCacheType, fetcher, workbenchService, instantiationService) {
        super(cacheType, cacheKey, cacheVersion, embeddingType, remoteCacheType, fetcher, instantiationService);
        this.workbenchService = workbenchService;
    }
    async getBaseExtensionCDNURL() {
        if (!this._baseExtensionCDNURL) {
            const remoteCacheContainer = await this.getRemoteContainer();
            this._baseExtensionCDNURL = RemoteEmbeddingsExtensionCache_1.calculateBaseRemoteExtensionCDNURL(remoteCacheContainer, this.remoteCacheType, this.cacheVersion);
        }
        return this._baseExtensionCDNURL;
    }
    constructExposedCache() {
        if (!this._remoteExtensionCache) {
            return;
        }
        const flattenedCache = { ...this._remoteExtensionCache.core };
        for (const extensionId in this._remoteExtensionCache.extensions) {
            const extensionCache = this._remoteExtensionCache.extensions[extensionId];
            for (const key in extensionCache) {
                flattenedCache[key] = extensionCache[key];
            }
        }
        return flattenedCache;
    }
    async fetchRemoteExtensionCache(extensionId) {
        const baseExtensionCDNURL = await this.getBaseExtensionCDNURL();
        const extensionUrl = `${baseExtensionCDNURL}/${extensionId}.json`;
        try {
            const response = await this.fetcherService.fetch(extensionUrl, { method: 'GET' });
            if (response.ok) {
                return (await response.json());
            }
            else {
                if (response.status === 404) {
                    // The file doesn't exist on our CDN return an empty object so we don't try to fetch it again
                    return {};
                }
                console.error(`Failed to fetch remote embeddings cache from ${extensionUrl}`);
                console.error(`Response status: ${response.status}, status text: ${response.statusText}`);
                return;
            }
        }
        catch (err) {
            console.error(`Failed to fetch remote embeddings cache from ${extensionUrl}`);
            console.error(err);
            return;
        }
    }
    async getCache() {
        const coreOrLocalCache = await super.getCache();
        // The remote cache for core coming back unavaiable indicates request problems so we cannot continue with fetching extensions
        if (coreOrLocalCache === undefined) {
            return;
        }
        let currentCache = { core: {}, extensions: {} };
        // Check if the cache has a property 'core' as the RemoteCachewithExtensions has it
        if (coreOrLocalCache &&
            RemoteEmbeddingsExtensionCache_1.isEmbeddingsCacheEntriesWithExtensions(coreOrLocalCache)) {
            currentCache = coreOrLocalCache;
        }
        else {
            currentCache = { core: coreOrLocalCache, extensions: {} };
        }
        const activatedExtensionIds = RemoteEmbeddingsExtensionCache_1.getInstalledExtensionIds(this.workbenchService);
        let removedExtensions = false;
        // Remove any extensions from currentCache which aren't in activatedExtensionIds
        for (const extensionId in currentCache.extensions) {
            if (!activatedExtensionIds.includes(extensionId)) {
                delete currentCache.extensions[extensionId];
                removedExtensions = true;
            }
        }
        const extensionIdsToFetch = activatedExtensionIds.filter(id => !(id in currentCache.extensions) || currentCache.extensions[id] === undefined);
        for (const extensionId of extensionIdsToFetch) {
            const extensionCache = await this.fetchRemoteExtensionCache(extensionId);
            if (extensionCache) {
                currentCache.extensions[extensionId] = extensionCache;
            }
        }
        this._remoteExtensionCache = currentCache;
        if (extensionIdsToFetch.length > 0 || removedExtensions) {
            await this.embeddingsCache.clearCache();
            await this.embeddingsCache.updateCache(currentCache);
        }
        return this.constructExposedCache();
    }
    static isEmbeddingsCacheEntriesWithExtensions(obj) {
        return 'core' in obj && 'extensions' in obj;
    }
    static getInstalledExtensionIds(workbenchService) {
        return workbenchService.getAllExtensions().filter(e => !e.id.startsWith('vscode')).map(e => e.id);
    }
    static calculateBaseRemoteExtensionCDNURL(cacheContainer, embeddingsType, cacheVersion) {
        return `https://embeddings.vscode-cdn.net/${cacheContainer}/v${cacheVersion}/${embeddingsType}`;
    }
};
exports.RemoteEmbeddingsExtensionCache = RemoteEmbeddingsExtensionCache;
exports.RemoteEmbeddingsExtensionCache = RemoteEmbeddingsExtensionCache = RemoteEmbeddingsExtensionCache_1 = __decorate([
    __param(5, fetcherService_1.IFetcherService),
    __param(6, workbenchService_1.IWorkbenchService),
    __param(7, instantiation_1.IInstantiationService)
], RemoteEmbeddingsExtensionCache);
class BaseEmbeddingsIndex {
    constructor(loggerContext, embeddingType, cacheKey, _embeddingsCache, embeddingsComputer, logService) {
        this.embeddingType = embeddingType;
        this.cacheKey = cacheKey;
        this._embeddingsCache = _embeddingsCache;
        this.embeddingsComputer = embeddingsComputer;
        this.logService = logService;
        this._isIndexLoaded = false;
        this._items = new Map();
    }
    get isIndexLoaded() {
        return this._isIndexLoaded;
    }
    set isIndexLoaded(value) {
        this._isIndexLoaded = value;
    }
    async rebuildCache() {
        await this._embeddingsCache.clearCache();
        this._items.clear();
        return this.calculateEmbeddings();
    }
    /**
     * Finds the n closest values to a given embedding
     * @param queryEmbedding The embedding to find the n closest values for
     * @param n The number of closest values to return
     * @returns The n closest values to the embedding, sorted by similarity. Could be less than n if there are less than n items indexed
     */
    nClosestValues(queryEmbedding, n) {
        return (0, embeddingsComputer_1.rankEmbeddings)(queryEmbedding, Array.from(this._items.values()).filter(x => x.embedding).map(x => [x, { value: x.embedding, type: this.embeddingType }]), n)
            .map(x => x.value);
    }
    hasItem(key) {
        return this._items.has(key);
    }
    getItem(key) {
        return this._items.get(key);
    }
    async calculateEmbeddings() {
        // This prevents being able to queue many calculations at once since it should always be referring to the same promise
        if (this._calculationPromise) {
            return this._calculationPromise;
        }
        this._calculationPromise = this._calculateEmbeddings();
        return this._calculationPromise.then(() => (this._calculationPromise = undefined));
    }
    async _calculateEmbeddings() {
        const startTime = Date.now();
        const allItems = await this.getLatestItems();
        const cachedEmbeddings = await this._embeddingsCache.getCache();
        // check that the cached embeddings is of flattened format, if not, we need to construct it
        const latestEmbeddingsIndex = new Map();
        for (const item of allItems) {
            let newItem = item;
            const oldItem = this._items.get(item.key);
            const key = item.key;
            // We have it in our current index
            if (oldItem?.embedding) {
                newItem = oldItem;
            }
            else if (cachedEmbeddings && cachedEmbeddings[key]) {
                // We have it in our cache
                newItem = { ...item, ...cachedEmbeddings[key] };
            }
            latestEmbeddingsIndex.set(key, newItem);
        }
        this._items = latestEmbeddingsIndex;
        this.logService.debug(`Embeddings for ${this.cacheKey} calculated in ${Date.now() - startTime}ms`);
        this.isIndexLoaded = true;
    }
}
exports.BaseEmbeddingsIndex = BaseEmbeddingsIndex;
//# sourceMappingURL=embeddingsIndex.js.map