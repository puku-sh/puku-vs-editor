"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
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
var PukuSemanticContextProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PukuSemanticContextProvider = void 0;
const vscode = __importStar(require("vscode"));
const languageContextProviderService_1 = require("../../../platform/languageContextProvider/common/languageContextProviderService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const pukuIndexingService_1 = require("../node/pukuIndexingService");
/**
 * Puku Semantic Context Provider
 *
 * Provides semantically relevant code snippets from the workspace index
 * to be used in FIM (Fill-In-Middle) completions.
 */
let PukuSemanticContextProvider = class PukuSemanticContextProvider extends lifecycle_1.Disposable {
    static { PukuSemanticContextProvider_1 = this; }
    static { this.PROVIDER_ID = 'puku.semanticContext'; }
    constructor(_instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        // Register context provider after workspace is loaded
        setTimeout(() => this._registerContextProvider(), 5000);
    }
    _registerContextProvider() {
        try {
            const languageContextService = this._instantiationService.invokeFunction((accessor) => {
                return accessor.get(languageContextProviderService_1.ILanguageContextProviderService);
            });
            const indexingService = this._instantiationService.invokeFunction((accessor) => {
                return accessor.get(pukuIndexingService_1.IPukuIndexingService);
            });
            // Create the context provider
            const provider = {
                id: PukuSemanticContextProvider_1.PROVIDER_ID,
                // Match all supported languages
                selector: [
                    { language: 'typescript' },
                    { language: 'typescriptreact' },
                    { language: 'javascript' },
                    { language: 'javascriptreact' },
                    { language: 'python' },
                    { language: 'java' },
                    { language: 'c' },
                    { language: 'cpp' },
                    { language: 'csharp' },
                    { language: 'go' },
                    { language: 'rust' },
                    { language: 'ruby' },
                    { language: 'php' },
                    { language: 'swift' },
                    { language: 'kotlin' },
                    { language: 'scala' },
                    { language: 'vue' },
                    { language: 'svelte' },
                ],
                resolver: {
                    resolve: async (request, token) => {
                        // Check if indexing is ready
                        if (indexingService.status !== pukuIndexingService_1.PukuIndexingStatus.Ready) {
                            console.log('[PukuSemanticContext] Indexing not ready, skipping');
                            return [];
                        }
                        if (token.isCancellationRequested) {
                            return [];
                        }
                        try {
                            // Get current document content around cursor for semantic search
                            const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(request.documentContext.uri));
                            const position = new vscode.Position(request.documentContext.position.line, request.documentContext.position.character);
                            // Extract context around cursor (5 lines before + current line)
                            const startLine = Math.max(0, position.line - 5);
                            const contextRange = new vscode.Range(startLine, 0, position.line, position.character);
                            const contextText = document.getText(contextRange);
                            if (!contextText || contextText.trim().length < 10) {
                                console.log('[PukuSemanticContext] Context too short, skipping');
                                return [];
                            }
                            console.log('[PukuSemanticContext] Searching for context:', contextText.substring(0, 100));
                            // Search the index for semantically similar code
                            const results = await indexingService.search(contextText, 5);
                            if (results.length === 0) {
                                console.log('[PukuSemanticContext] No results found');
                                return [];
                            }
                            console.log(`[PukuSemanticContext] Found ${results.length} results`);
                            // Convert to CodeSnippet format
                            const snippets = results
                                .filter(result => {
                                // Exclude the current file
                                return result.uri.toString() !== request.documentContext.uri;
                            })
                                .map((result, index) => ({
                                uri: result.uri.toString(),
                                value: result.content,
                                importance: Math.round((1 - index * 0.1) * 100), // Decrease importance for later results
                                id: `puku-semantic-${index}`,
                            }));
                            console.log(`[PukuSemanticContext] Returning ${snippets.length} snippets`);
                            return snippets;
                        }
                        catch (error) {
                            console.error('[PukuSemanticContext] Error resolving context:', error);
                            return [];
                        }
                    },
                },
            };
            // Register with the language context provider service
            this._registration = languageContextService.registerContextProvider(provider);
            this._register({ dispose: () => this._registration?.dispose() });
            console.log('[PukuSemanticContext] Context provider registered');
        }
        catch (error) {
            console.error('[PukuSemanticContext] Failed to register context provider:', error);
        }
    }
    dispose() {
        this._registration?.dispose();
        super.dispose();
    }
};
exports.PukuSemanticContextProvider = PukuSemanticContextProvider;
exports.PukuSemanticContextProvider = PukuSemanticContextProvider = PukuSemanticContextProvider_1 = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], PukuSemanticContextProvider);
//# sourceMappingURL=pukuSemanticContextProvider.js.map