"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceFileIndex = exports.IWorkspaceFileIndex = exports.FileRepresentation = void 0;
exports.shouldAlwaysIgnoreFile = shouldAlwaysIgnoreFile;
exports.isMinifiedText = isMinifiedText;
const nodeFs = __importStar(require("fs"));
const isbinaryfile_1 = require("isbinaryfile");
const glob_1 = require("../../../util/common/glob");
const languages_1 = require("../../../util/common/languages");
const services_1 = require("../../../util/common/services");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const errors_1 = require("../../../util/vs/base/common/errors");
const event_1 = require("../../../util/vs/base/common/event");
const lazy_1 = require("../../../util/vs/base/common/lazy");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const network_1 = require("../../../util/vs/base/common/network");
const resources_1 = require("../../../util/vs/base/common/resources");
const ternarySearchTree_1 = require("../../../util/vs/base/common/ternarySearchTree");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const configurationService_1 = require("../../configuration/common/configurationService");
const fileSystemService_1 = require("../../filesystem/common/fileSystemService");
const fileTypes_1 = require("../../filesystem/common/fileTypes");
const ignoreService_1 = require("../../ignore/common/ignoreService");
const searchService_1 = require("../../search/common/searchService");
const tabsAndEditorsService_1 = require("../../tabs/common/tabsAndEditorsService");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const workspaceService_1 = require("../../workspace/common/workspaceService");
/**
 * The maximum size of a file to index (in bytes)
 */
const maxIndexableFileSize = 1.5 * 1024 * 1024; // 1.5 MB
/**
 * List of file extension we know for sure that we should not index.
 */
const EXCLUDE_EXTENSIONS = new Set([
    // Images
    'jpg', 'jpeg', 'jpe',
    'png',
    'gif',
    'bmp',
    'tif', 'tiff',
    'tga',
    'ico', 'icns', 'xpm',
    'webp',
    'svg', 'eps',
    'heif', 'heic',
    'raw', 'arw', 'cr2', 'cr3', 'nef', 'nrw', 'orf', 'raf', 'rw2', 'rwl', 'pef', 'srw', 'x3f', 'erf', 'kdc', '3fr', 'mef', 'mrw', 'iiq', 'gpr', 'dng', // raw formats
    // Video
    'mp4', 'm4v',
    'mkv',
    'webm',
    'mov',
    'avi',
    'wmv',
    'flv',
    // Audio
    'mp3',
    'wav',
    'm4a',
    'flac',
    'ogg',
    'wma',
    'weba',
    'aac',
    'pcm',
    // Compressed
    '7z',
    'bz2',
    'gz', 'gz_', 'tgz',
    'rar',
    'tar',
    'xz',
    'zip', 'vsix',
    'iso',
    'img',
    'pkg',
    // Fonts
    'woff', 'woff2',
    'otf',
    'ttf',
    'eot',
    // 3d formats
    'obj',
    'fbx',
    'stl',
    '3ds',
    'dae',
    'blend',
    'ply',
    'glb', 'gltf',
    'max',
    'c4d',
    'ma', 'mb',
    'pcd',
    // Documents
    'pdf', 'ai', 'ps', 'eps', 'indd', // PDF and related formats
    'doc', 'docx', // Word
    'xls', 'xlsx', // Excel
    'ppt', 'pptx', // PowerPoint
    'odt', 'ods', 'odp', // OpenDocument formats
    'rtf', // Rich Text Format
    'psd',
    'pbix', // PowerBI
    // Others
    'temp', 'tmp',
    'exe',
    'db', 'db-wal', 'db-shm', 'sqlite', // SQLite
    'parquet',
    'bin', 'dat', 'data', 'hex', 'cache', 'sum', 'hash',
    'wasm',
    'pdb', 'idb', 'sym',
    'coverage',
    'testlog',
    'git', 'pack', 'pack_', // git
    'lock',
    'log', 'trace', 'tlog',
    'snap',
    'msi',
    'deb',
    'vsidx', 'suo', // VS
    'xcuserstate', // XCode
    'download',
    'map', 'tsbuildinfo', 'jsbundle', // JS/TS
    'dll', 'dll.config', 'dylib', 'so', 'a', 'o', 'lib', 'out', 'elf', // C++
    'nupkg', 'winmd', // C#
    'pyc', 'pkl', 'pickle', 'pyd', // Python
    'rlib', 'rmeta', // Rust
    'dill', // Dart
    'jar', 'class', 'ear', 'war', // Java
    'apk', 'dex', // Android
    'phar', // PHP
    // Certificates and private keys (security sensitive)
    'pfx', 'p12', // PKCS#12 files
    'pem', 'crt', 'cer', // Certificate files
    'key', 'priv', // Private key files
    'jks', 'keystore', // Java keystore files
    'csr', // Certificate signing requests
]);
const EXCLUDED_FOLDERS = [
    'node_modules',
    'venv',
    'out',
    'dist',
    '.git',
    '.yarn',
    '.npm',
    '.venv',
    'foo.asar',
    '.vscode-test',
];
const EXCLUDED_FILES = [
    '.ds_store',
    'thumbs.db',
    'package-lock.json',
    'yarn.lock',
    '.cache',
];
/**
 * List of file schemes we should never index, even if they are open in the workspace.
 */
const EXCLUDED_SCHEMES = [
    network_1.Schemas.vscode,
    network_1.Schemas.vscodeUserData,
    'output',
    network_1.Schemas.inMemory,
    network_1.Schemas.internal,
    network_1.Schemas.vscodeChatCodeBlock,
    network_1.Schemas.vscodeChatCodeCompareBlock,
    'git',
];
function shouldAlwaysIgnoreFile(resource) {
    if (EXCLUDED_SCHEMES.includes(resource.scheme)) {
        return true;
    }
    // Ignore some common filenames
    if (EXCLUDED_FILES.includes((0, resources_1.basename)(resource).toLowerCase())) {
        return true;
    }
    // Ignore some common folders like node_modules
    const parts = resource.fsPath.toLowerCase().split(/[/\\]/g);
    if (parts.some(part => EXCLUDED_FOLDERS.includes(part))) {
        return true;
    }
    // Ignore some common extensions
    const normalizedExt = (0, resources_1.extname)(resource).replace(/\./, '').toLowerCase();
    if (EXCLUDE_EXTENSIONS.has(normalizedExt)) {
        return true;
    }
    return false;
}
/**
 * Checks if a file in the workspace should potentially be indexed.
 *
 * Caller should also look at file content to make sure the file is not binary or copilot ignored.
 */
function shouldPotentiallyIndexFile(accessor, resource) {
    if (shouldAlwaysIgnoreFile(resource)) {
        return false;
    }
    // Only index if the file is in the same scheme as one of the workspace folders
    const workspaceService = accessor.get(workspaceService_1.IWorkspaceService);
    if (![network_1.Schemas.file, network_1.Schemas.untitled].includes(resource.scheme) && // Still always allow loose and untitled files
        !workspaceService.getWorkspaceFolders().some(folder => resource.scheme === folder.scheme)) {
        return false;
    }
    return true;
}
class FileRepresentation {
    constructor(_uri) {
        this._uri = _uri;
        this._isDisposed = false;
        this._disposedCts = new cancellation_1.CancellationTokenSource();
    }
    dispose() {
        this._isDisposed = true;
        this._disposedCts.cancel();
        this._disposedCts.dispose();
    }
    get uri() {
        return this._uri;
    }
    /**
     * Get an id that quickly lets you check if a file has changed.
     */
    async getFastContentVersionId() {
        const stats = await this.getStats();
        return `${stats.size}-${stats.mtime}`;
    }
}
exports.FileRepresentation = FileRepresentation;
let FsFileRepresentation = class FsFileRepresentation extends FileRepresentation {
    constructor(uri, limiter, _fileSystem) {
        super(uri);
        this._fileSystem = _fileSystem;
        this._fileReadLimiter = limiter;
    }
    isDirty() {
        return false;
    }
    async getStats() {
        const stat = await this._fileSystem.stat(this.uri);
        return { size: stat.size, mtime: stat.mtime };
    }
    async getText() {
        try {
            const fileReadResult = await this._readFile();
            if (!fileReadResult || this._isDisposed) {
                return '';
            }
            const decoder = new TextDecoder();
            const text = decoder.decode(fileReadResult.data);
            // Exclude minified css and js files
            const lang = (0, languages_1.getLanguageForResource)(this.uri).languageId;
            if ((lang === 'javascript' || lang === 'javascriptreact' || lang === 'css') && isMinifiedText(text)) {
                return '';
            }
            return text;
        }
        catch {
            return '';
        }
    }
    async _readFile() {
        try {
            return await this._fileReadLimiter.queue(() => readTextFile(this.uri, this._fileSystem, this._disposedCts.token));
        }
        catch (_err) {
            return undefined;
        }
    }
};
FsFileRepresentation = __decorate([
    __param(2, fileSystemService_1.IFileSystemService)
], FsFileRepresentation);
let TextDocumentFileRepresentation = class TextDocumentFileRepresentation extends FileRepresentation {
    constructor(_textDocument, _fileSystem) {
        super(_textDocument.uri);
        this._textDocument = _textDocument;
        this._fileSystem = _fileSystem;
        this._mtime = Date.now();
        this._text = new lazy_1.Lazy(() => {
            const truncate = (originalText, data) => {
                if (data.length <= maxIndexableFileSize) {
                    return { text: originalText };
                }
                const truncated = data.slice(0, maxIndexableFileSize);
                return {
                    text: new TextDecoder().decode(truncated),
                    truncated: { originalByteLength: data.byteLength }
                };
            };
            const doRead = () => {
                const text = this._textDocument.getText();
                // Check size of the file
                // TODO: For /chunks, should all of these checks actually be in utf8?
                // TODO: should we truncate files instead of returning empty strings?
                // First do a fast check based on maximum size of the string in bytes.
                // utf-16 strings have at most 4 bytes per character (2 * 2)
                const upperEstimatedByteLength = text.length * 4;
                if (upperEstimatedByteLength < maxIndexableFileSize) {
                    return { text };
                }
                // Do another fast check based on shortest possible size of the string in bytes.
                // utf-8 strings have at least 2 bytes per character
                const lowerEstimatedByteLength = text.length * 2;
                if (lowerEstimatedByteLength >= maxIndexableFileSize) {
                    return truncate(text, new TextEncoder().encode(text));
                }
                // Finally fall back to a real (expensive) check
                const encoder = new TextEncoder();
                const encodedStr = encoder.encode(text);
                if (encodedStr.length >= maxIndexableFileSize) {
                    return truncate(text, encodedStr);
                }
                return { text };
            };
            const content = doRead();
            return content.text;
        });
    }
    isDirty() {
        return this._textDocument.isDirty;
    }
    async getStats() {
        if (!this.isDirty) {
            try {
                const stat = await this._fileSystem.stat(this.uri);
                return { size: stat.size, mtime: stat.mtime };
            }
            catch (e) {
                // noop
            }
        }
        return {
            size: new TextEncoder().encode(this._textDocument.getText()).length,
            mtime: this._mtime
        };
    }
    async getText() {
        return this._text.value;
    }
};
TextDocumentFileRepresentation = __decorate([
    __param(1, fileSystemService_1.IFileSystemService)
], TextDocumentFileRepresentation);
exports.IWorkspaceFileIndex = (0, services_1.createServiceIdentifier)('workspaceFileIndex');
let WorkspaceFileIndex = class WorkspaceFileIndex extends lifecycle_1.Disposable {
    constructor(_configurationService, _expService, _fileSystem, _ignoreService, _instantiationService, _searchService, _tabsAndEditorsService, _telemetryService, _workspaceService) {
        super();
        this._configurationService = _configurationService;
        this._expService = _expService;
        this._fileSystem = _fileSystem;
        this._ignoreService = _ignoreService;
        this._instantiationService = _instantiationService;
        this._searchService = _searchService;
        this._tabsAndEditorsService = _tabsAndEditorsService;
        this._telemetryService = _telemetryService;
        this._workspaceService = _workspaceService;
        this._textDocumentFiles = new map_1.ResourceMap();
        this._fsFileTree = new SimpleFsTree();
        this._onDidCreateFile = this._register(new event_1.Emitter());
        this.onDidCreateFiles = this._onDidCreateFile.event;
        this._onDidChangeFiles = this._register(new event_1.Emitter());
        this.onDidChangeFiles = this._onDidChangeFiles.event;
        this._onDidDeleteFile = this._register(new event_1.Emitter());
        this.onDidDeleteFiles = this._onDidDeleteFile.event;
        this._isDisposed = false;
        this._disposeCts = this._register(new cancellation_1.CancellationTokenSource());
        this._fileReadLimiter = this._register(new async_1.Limiter(20));
    }
    dispose() {
        this._isDisposed = true;
        this._disposeCts.cancel();
        super.dispose();
        (0, lifecycle_1.dispose)(this._fsFileTree.values());
        this._fsFileTree.clear();
        (0, lifecycle_1.dispose)(this._textDocumentFiles.values());
        this._textDocumentFiles.clear();
    }
    get fileCount() {
        let openedNonFsFileCount = 0;
        for (const entry of this._textDocumentFiles.values()) {
            if (!this._fsFileTree.get(entry.uri)) {
                openedNonFsFileCount++;
            }
        }
        return this._fsFileTree.fileCount + openedNonFsFileCount;
    }
    get(file) {
        return this._textDocumentFiles.get(file) || this._fsFileTree.get(file);
    }
    async tryLoad(uri) {
        const existing = this.get(uri);
        if (existing) {
            return existing;
        }
        if (!await this.statIsFsFile(uri)) {
            return;
        }
        if (this._isDisposed) {
            return;
        }
        return this.createOrUpdateFsEntry(uri);
    }
    async tryRead(uri) {
        const existing = this.get(uri);
        if (existing) {
            return existing.getText();
        }
        // Don't add to the index to avoid caching too much
        if (!await this.statIsFsFile(uri)) {
            return;
        }
        const file = this.createFsFileRepresentation(uri);
        return file.getText();
    }
    *values(glob) {
        for (const entry of this._textDocumentFiles.values()) {
            if ((0, glob_1.shouldInclude)(entry.uri, glob)) {
                yield entry;
            }
        }
        for (const [uri, entry] of this._fsFileTree.entries()) {
            if (!this._textDocumentFiles.has(uri)) {
                if ((0, glob_1.shouldInclude)(entry.uri, glob)) {
                    yield entry;
                }
            }
        }
    }
    registerListeners() {
        // Create text document watchers
        this._register(this._workspaceService.onDidOpenTextDocument(doc => this.addOrUpdateTextDocumentEntry(doc)));
        this._register(this._workspaceService.onDidChangeTextDocument(e => this.addOrUpdateTextDocumentEntry(e.document)));
        this._register(this._workspaceService.onDidCloseTextDocument(doc => this.deleteTextDocumentEntry(doc.uri)));
        this._register(this._tabsAndEditorsService.onDidChangeTabs(e => {
            for (const tab of e.opened) {
                if (tab.uri) {
                    const doc = this._workspaceService.textDocuments.find(doc => (0, resources_1.isEqual)(doc.uri, tab.uri));
                    if (doc) {
                        this.addOrUpdateTextDocumentEntry(doc);
                    }
                }
            }
            for (const tab of e.closed) {
                if (tab.uri) {
                    this.deleteTextDocumentEntry(tab.uri);
                }
            }
        }));
        // Create file system watchers
        const watcher = this._register(this._fileSystem.createFileSystemWatcher(`**/*`));
        this._register(watcher.onDidChange(async (uri) => {
            if (!await this.shouldIndexWorkspaceFile(uri, this._disposeCts.token)) {
                return;
            }
            if (!await this.statIsFsFile(uri)) {
                return;
            }
            const existing = this._fsFileTree.get(uri);
            this.createOrUpdateFsEntry(uri);
            if (existing) {
                this._onDidChangeFiles.fire([uri]);
            }
            else {
                this._onDidCreateFile.fire([uri]);
            }
        }));
        this._register(watcher.onDidCreate(async (uri) => {
            if (!await this.shouldIndexWorkspaceFile(uri, this._disposeCts.token)) {
                return;
            }
            if (!await this.statIsFsFile(uri)) {
                return;
            }
            if (this._fsFileTree.get(uri)) {
                return;
            }
            this.createOrUpdateFsEntry(uri);
            this._onDidCreateFile.fire([uri]);
        }));
        this._register(watcher.onDidDelete(deletedUri => {
            const entry = this._fsFileTree.get(deletedUri);
            if (entry) {
                entry.dispose();
                this._fsFileTree.delete(deletedUri);
                this._onDidDeleteFile.fire([deletedUri]);
            }
            else {
                // Not in our list but still could be a directory. In this case we need to delete all files under it
                const deletedFiles = this._fsFileTree.deleteFolder(deletedUri);
                if (deletedFiles.length) {
                    this._onDidDeleteFile.fire(deletedFiles);
                }
            }
        }));
    }
    /**
     * Checks that the file exists and is a file, not a directory.
     */
    async statIsFsFile(uri) {
        try {
            const stat = await this._fileSystem.stat(uri);
            return !!(stat.type & fileTypes_1.FileType.File);
        }
        catch {
            return false;
        }
    }
    initialize() {
        this._initialized ??= (async () => {
            this.registerListeners();
            await this._workspaceService.ensureWorkspaceIsFullyLoaded();
            if (this._isDisposed) {
                return;
            }
            await Promise.all(this._workspaceService.textDocuments.map(doc => this.addOrUpdateTextDocumentEntry(doc, true)));
            if (this._isDisposed) {
                return;
            }
            for (const resource of await this.getWorkspaceFilesToIndex(this.getMaxFilesToIndex(), this._disposeCts.token)) {
                this.createOrUpdateFsEntry(resource);
            }
            /* __GDPR__
                "workspaceChunkIndex.initialize" : {
                    "owner": "mjbvz",
                    "comment": "Information about successful code searches",
                    "totalFileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of files we can index" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('workspaceChunkIndex.initialize', {}, {
                totalFileCount: this.fileCount
            });
        })();
        return this._initialized;
    }
    getMaxFilesToIndex() {
        return this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.WorkspaceMaxLocalIndexSize, this._expService);
    }
    async getWorkspaceFilesToIndex(maxResults, token) {
        await (0, async_1.raceCancellationError)(this._ignoreService.init(), token);
        const resourcesToIndex = new map_1.ResourceMap();
        const cts = new cancellation_1.CancellationTokenSource(token);
        try {
            for (const folder of this._workspaceService.getWorkspaceFolders() ?? []) {
                const paths = await (0, async_1.raceCancellationError)(this._searchService.findFilesWithDefaultExcludes(new fileTypes_1.RelativePattern(folder, `**/*`), maxResults - resourcesToIndex.size, cts.token), cts.token);
                const tasks = paths.map(async (uri) => {
                    if (await this.shouldIndexWorkspaceFile(uri, cts.token)) {
                        if (resourcesToIndex.size < maxResults) {
                            resourcesToIndex.set(uri);
                        }
                        if (resourcesToIndex.size >= maxResults) {
                            cts.cancel();
                        }
                    }
                });
                await (0, async_1.raceCancellationError)(Promise.all(tasks), cts.token);
            }
        }
        catch (e) {
            if ((0, errors_1.isCancellationError)(e)) {
                // If outer token was cancelled, rethrow
                if (token.isCancellationRequested) {
                    throw e;
                }
                // Otherwise ignore
            }
            else {
                // Rethrow all non-cancellation errors
                throw e;
            }
        }
        finally {
            cts.dispose();
        }
        return resourcesToIndex.keys();
    }
    async shouldIndexWorkspaceFile(resource, token) {
        if (!this._instantiationService.invokeFunction(accessor => shouldPotentiallyIndexFile(accessor, resource))) {
            return false;
        }
        // Only index files that are inside of the workspace
        if (!this._workspaceService.getWorkspaceFolders().some(folder => (0, resources_1.isEqualOrParent)(resource, folder))) {
            return false;
        }
        return this._fileReadLimiter.queue(async () => {
            return !await this._ignoreService.isCopilotIgnored(resource, token);
        });
    }
    createOrUpdateFsEntry(resource) {
        const entry = this._fsFileTree.get(resource);
        if (entry) {
            entry.dispose();
        }
        const newEntry = this.createFsFileRepresentation(resource);
        this._fsFileTree.addFile(resource, newEntry);
        return newEntry;
    }
    createFsFileRepresentation(resource) {
        return this._instantiationService.createInstance(FsFileRepresentation, resource, this._fileReadLimiter);
    }
    async addOrUpdateTextDocumentEntry(doc, skipEmit = false) {
        if (!await this.shouldIndexWorkspaceFile(doc.uri, this._disposeCts.token)) {
            return;
        }
        // Check to make sure the document is open in the editor area
        if (!this._tabsAndEditorsService.tabs.some(tab => (0, resources_1.isEqual)(doc.uri, tab.uri))) {
            return;
        }
        const existingTextDoc = this._textDocumentFiles.get(doc.uri);
        const existingFsFile = this._fsFileTree.get(doc.uri);
        existingTextDoc?.dispose();
        const newTextDoc = this._instantiationService.createInstance(TextDocumentFileRepresentation, doc);
        this._textDocumentFiles.set(doc.uri, newTextDoc);
        if (!skipEmit) {
            if (!existingTextDoc && !existingFsFile) {
                // File is new both from disk and as an open file
                this._onDidCreateFile.fire([doc.uri]);
            }
            else {
                // File existed before, either on disk or as an open file
                const existingContent = await (existingTextDoc ?? existingFsFile)?.getText().catch(() => undefined);
                if (existingContent !== await newTextDoc.getText()) {
                    this._onDidChangeFiles.fire([doc.uri]);
                }
            }
        }
    }
    async deleteTextDocumentEntry(deletedUri) {
        const existingTextDoc = this._textDocumentFiles.get(deletedUri);
        if (!existingTextDoc) {
            return;
        }
        // Check to make sure the document is not still open in another tab
        if (this._tabsAndEditorsService.tabs.some(tab => (0, resources_1.isEqual)(deletedUri, tab.uri))) {
            return;
        }
        const existingTextDocContent = await existingTextDoc.getText().catch(() => undefined);
        this._textDocumentFiles.delete(deletedUri);
        existingTextDoc.dispose();
        const existingFsFile = this._fsFileTree.get(deletedUri);
        if (existingFsFile) {
            // File still exists on disk
            // See if the text document content was different than the content on disk
            const existingFsFileContent = await existingFsFile.getText().catch(() => undefined);
            if (existingFsFileContent !== existingTextDocContent) {
                this._onDidChangeFiles.fire([deletedUri]);
            }
        }
        else {
            // File deleted on disk too
            this._onDidDeleteFile.fire([deletedUri]);
        }
    }
};
exports.WorkspaceFileIndex = WorkspaceFileIndex;
exports.WorkspaceFileIndex = WorkspaceFileIndex = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, nullExperimentationService_1.IExperimentationService),
    __param(2, fileSystemService_1.IFileSystemService),
    __param(3, ignoreService_1.IIgnoreService),
    __param(4, instantiation_1.IInstantiationService),
    __param(5, searchService_1.ISearchService),
    __param(6, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(7, telemetry_1.ITelemetryService),
    __param(8, workspaceService_1.IWorkspaceService)
], WorkspaceFileIndex);
/**
 * Tracks files that exist on disk.
 */
class SimpleFsTree {
    constructor() {
        this._tree = ternarySearchTree_1.TernarySearchTree.forUris();
        this._fileCount = 0;
    }
    get fileCount() {
        return this._fileCount;
    }
    get(uri) {
        return this._tree.get(uri);
    }
    addFile(uri, value) {
        if (!this._tree.get(uri)) {
            this._fileCount++;
        }
        this._tree.set(uri, value);
    }
    clear() {
        this._tree.clear();
    }
    delete(uri) {
        const existed = !!this.get(uri);
        this._tree.delete(uri);
        if (existed) {
            this._fileCount = Math.max(0, this._fileCount - 1);
        }
        return existed;
    }
    deleteFolder(folder) {
        const toDelete = [];
        for (const [fileUri] of this._tree.findSuperstr(folder) ?? []) {
            toDelete.push(fileUri);
        }
        for (const fileUri of toDelete) {
            this._tree.delete(fileUri);
        }
        this._fileCount = Math.max(0, this._fileCount - toDelete.length);
        return toDelete;
    }
    *values() {
        for (const [, value] of this.entries()) {
            yield value;
        }
    }
    entries() {
        return this._tree;
    }
}
/**
 * Helper that reads the data for a text file.
 *
 * Automatically handles truncating the file if it is too large and detects if the file is binary.
 */
async function readTextFile(uri, fileSystem, token) {
    if (uri.scheme === network_1.Schemas.file) {
        // If the file is on disk, try to avoid reading too much of it into memory if the file is too big
        // Use nodefs to check that the file really exists on disk
        let stats;
        try {
            stats = await (0, async_1.raceCancellationError)(nodeFs.promises.stat(uri.fsPath), token);
        }
        catch (e) {
            // noop
        }
        if (stats) {
            const data = await (0, async_1.raceCancellationError)(readLocalTextFileUsingReadStream(uri.fsPath, maxIndexableFileSize), token);
            if (data === 'binary') {
                return undefined;
            }
            return {
                data: data,
                truncatedInfo: { originalByteLength: stats.size }
            };
        }
    }
    let binaryData = await (0, async_1.raceCancellationError)(fileSystem.readFile(uri), token);
    if (await (0, isbinaryfile_1.isBinaryFile)(Buffer.from(binaryData))) {
        return undefined;
    }
    let truncatedInfo;
    if (binaryData.byteLength >= maxIndexableFileSize) {
        truncatedInfo = { originalByteLength: binaryData.byteLength };
        binaryData = binaryData.subarray(0, maxIndexableFileSize);
    }
    return { data: binaryData, truncatedInfo };
}
async function readLocalTextFileUsingReadStream(fsFilePath, byteLimit) {
    const bytesRequiredForIsBinaryCheck = 1024;
    return new Promise((resolve, reject) => {
        const stream = nodeFs.createReadStream(fsFilePath, { start: 0, end: byteLimit - 1 });
        const chunks = [];
        let totalBytesRead = 0;
        let hasCheckedForBinary = false;
        stream.on('data', chunk => {
            totalBytesRead += chunk.length;
            if (!hasCheckedForBinary && totalBytesRead >= bytesRequiredForIsBinaryCheck) {
                hasCheckedForBinary = true;
                const isBinary = (0, isbinaryfile_1.isBinaryFileSync)(Buffer.concat(chunks));
                if (isBinary) {
                    stream.close();
                    return resolve('binary');
                }
            }
            return chunks.push(chunk);
        });
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}
function isMinifiedText(str, options = { minifiedMaxLineLength: 10_000, minifiedMaxAverageLineLength: 400 }) {
    let foundNewLines = 0;
    let characterCount = 0;
    let accCurrentLineLength = 0;
    let startNewLineSearchIndex = 0;
    while (true) {
        const newLineIndex = str.indexOf('\n', startNewLineSearchIndex);
        if (newLineIndex === -1) {
            if ((str.length - startNewLineSearchIndex) > options.minifiedMaxLineLength) {
                return true;
            }
            characterCount += str.length - startNewLineSearchIndex;
            break;
        }
        const foundLineLength = accCurrentLineLength + (newLineIndex - startNewLineSearchIndex);
        if (foundLineLength > options.minifiedMaxLineLength) {
            return true;
        }
        foundNewLines++;
        characterCount += foundLineLength;
        accCurrentLineLength = 0;
        startNewLineSearchIndex = newLineIndex + 1;
    }
    return characterCount / (foundNewLines + 1) > options.minifiedMaxAverageLineLength;
}
//# sourceMappingURL=workspaceFileIndex.js.map