"use strict";
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
exports.SimulationLanguageFeaturesService = void 0;
const languageFeaturesService_1 = require("../../../src/platform/languages/common/languageFeaturesService");
const languages_1 = require("../../../src/util/common/languages");
const uri_1 = require("../../../src/util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../src/vscodeTypes");
const hash_1 = require("../../base/hash");
const salts_1 = require("../../base/salts");
const simulationContext_1 = require("../../base/simulationContext");
const tsServerClient_1 = require("./tsServerClient");
let SimulationLanguageFeaturesService = class SimulationLanguageFeaturesService {
    constructor(_workspace, _cachingResourceFetcher) {
        this._workspace = _workspace;
        this._tsService = new TSServerLanguageFeaturesService(_workspace, _cachingResourceFetcher);
        this._noOpService = new languageFeaturesService_1.NoopLanguageFeaturesService();
    }
    getLanguageFeatures(uri) {
        const language = (0, languages_1.getLanguageForResource)(uri);
        switch (language?.languageId) {
            case 'javascript':
            case 'javascriptreact':
            case 'typescript':
            case 'typescriptreact':
                return this._tsService;
            default:
                return this._noOpService;
        }
    }
    getDocumentSymbols(uri) {
        return this.getLanguageFeatures(uri).getDocumentSymbols(uri);
    }
    getDefinitions(uri, position) {
        return this.getLanguageFeatures(uri).getDefinitions(uri, position);
    }
    getImplementations(uri, position) {
        return this.getLanguageFeatures(uri).getImplementations(uri, position);
    }
    getReferences(uri, position) {
        return this.getLanguageFeatures(uri).getReferences(uri, position);
    }
    getDiagnostics(uri) {
        return this.getLanguageFeatures(uri).getDiagnostics(uri);
    }
    getWorkspaceSymbols(query) {
        return Promise.resolve([]);
    }
    dispose() {
        this._tsService.teardown().catch(err => {
            console.error(err);
        });
    }
    teardown() {
        return this._tsService.teardown();
    }
};
exports.SimulationLanguageFeaturesService = SimulationLanguageFeaturesService;
exports.SimulationLanguageFeaturesService = SimulationLanguageFeaturesService = __decorate([
    __param(1, simulationContext_1.ICachingResourceFetcher)
], SimulationLanguageFeaturesService);
let TSServerLanguageFeaturesService = class TSServerLanguageFeaturesService {
    constructor(_workspace, _cachingResourceFetcher) {
        this._workspace = _workspace;
        this._cachingResourceFetcher = _cachingResourceFetcher;
    }
    async teardown() {
        try {
            await this._tsServerClient?.teardown();
        }
        catch {
            // ignored
        }
    }
    async getDefinitions(uri, position) {
        return (await this.cachedGetFromTSServer(uri, position, 'def', async (tsserver, currentFile, position) => {
            const definitions = await tsserver.findDefinitions(currentFile, position);
            return definitions.map(def => {
                return {
                    targetUri: this._workspace.getUriFromFilePath(def.fileName),
                    targetRange: def.range
                };
            });
        })).map((def) => {
            return {
                ...def,
                targetUri: uri_1.URI.isUri(def.targetUri) ? def.targetUri : vscodeTypes_1.Uri.file(def.targetUri.path),
                targetRange: def.targetRange instanceof vscodeTypes_1.Range ? def.targetRange : new vscodeTypes_1.Range(def.targetRange[0].line, def.targetRange[0].character, def.targetRange[1].line, def.targetRange[1].character),
            };
        });
    }
    async getReferences(uri, position) {
        return (await this.cachedGetFromTSServer(uri, position, 'ref', async (tsserver, currentFile, position) => {
            const references = await tsserver.findReferences(currentFile, position);
            return references.map(ref => {
                return {
                    uri: this._workspace.getUriFromFilePath(ref.fileName),
                    range: ref.range
                };
            });
        })).map((ref) => {
            return {
                ...ref,
                uri: uri_1.URI.isUri(ref.uri) ? ref.uri : vscodeTypes_1.Uri.file(ref.uri.path),
                range: ref.range instanceof vscodeTypes_1.Range ? ref.range : new vscodeTypes_1.Range(ref.range[0].line, ref.range[0].character, ref.range[1].line, ref.range[1].character),
            };
        });
    }
    async cachedGetFromTSServer(uri, position, target, f) {
        const currentFile = this._workspace.getFilePath(uri);
        const files = this._workspace.documents.map(d => ({ fileName: this._workspace.getFilePath(d.document.uri), fileContents: d.getText() }));
        const serializablePosition = { line: position.line, character: position.character };
        const cacheKey = (0, hash_1.computeSHA256)(`${tsServerClient_1.TSServerClient.id}-v${tsServerClient_1.TSServerClient.cacheVersion}-${target}-${JSON.stringify({ files, currentFile, serializablePosition })}`);
        const getFromTSServer = async () => {
            try {
                if (this._tsServerClient === undefined) {
                    this._tsServerClient = new tsServerClient_1.TSServerClient(files);
                }
                return f(this._tsServerClient, currentFile, position);
            }
            catch (error) {
                console.error(error);
                return [];
            }
        };
        return this._cachingResourceFetcher.invokeWithCache(simulationContext_1.CacheScope.TSC, undefined, salts_1.TestingCacheSalts.tscCacheSalt, cacheKey, getFromTSServer);
    }
    getImplementations(uri, position) {
        return Promise.resolve([]);
    }
    getWorkspaceSymbols(query) {
        return Promise.resolve([]);
    }
    getDocumentSymbols(uri) {
        return Promise.resolve([]);
    }
    getDiagnostics(uri) {
        return [];
    }
};
TSServerLanguageFeaturesService = __decorate([
    __param(1, simulationContext_1.ICachingResourceFetcher)
], TSServerLanguageFeaturesService);
//# sourceMappingURL=simulationLanguageFeatureService.js.map