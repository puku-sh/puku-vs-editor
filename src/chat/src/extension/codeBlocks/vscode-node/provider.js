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
exports.register = register;
const vscode = __importStar(require("vscode"));
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const languages_1 = require("../../../util/common/languages");
const types_1 = require("../../../util/common/types");
const crypto_1 = require("../../../util/common/crypto");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const findWord_1 = require("../../linkify/vscode-node/findWord");
const conversation_1 = require("../../prompt/common/conversation");
const codeBlockScheme = 'vscode-chat-code-block';
/**
 * Hovers that are provided by a language provider in cases where the correct types are not known.
 *
 * A good example of this is how js/ts shows `any` for any unknown types. In these cases, we instead want to try looking
 * up a more helpful hover using the workspace symbols.
 */
const genericHoverMessages = [
    /^\n```(typescript|javascript|tsx|jsx)\S*\nany\n```\n$/i,
];
/**
 * Groupings of languages that can reference each other for intellisense.
 *
 * For example, when trying to look up a symbol in a JS code block, we shouldn't bother
 * looking up symbols in c++ or markdown files.
 */
const languageReferenceGroups = [
    new Set([
        'typescript',
        'javascript',
        'typescriptreact',
        'javascriptreact',
    ]),
    // Put all other languages in their own group
    ...Array.from(languages_1.wellKnownLanguages.keys(), lang => new Set([lang]))
];
/**
 * Provides support for Intellisense chat code blocks.
 */
let CodeBlockIntelliSenseProvider = class CodeBlockIntelliSenseProvider {
    constructor(instantiationService, telemetryService) {
        this.instantiationService = instantiationService;
        this.telemetryService = telemetryService;
    }
    async provideDefinition(document, position, token) {
        return this.goTo('vscode.experimental.executeDefinitionProvider_recursive', document, position, token);
    }
    async provideImplementation(document, position, token) {
        return this.goTo('vscode.experimental.executeImplementationProvider_recursive', document, position, token);
    }
    async provideTypeDefinition(document, position, token) {
        return this.goTo('vscode.experimental.executeTypeDefinitionProvider_recursive', document, position, token);
    }
    async provideHover(document, position, token) {
        const localHoverResponse = await this.execHover(document.uri, position);
        const localHovers = this.filterOutGenericHovers(localHoverResponse);
        if (localHovers?.length) {
            return this.convertHover(localHovers);
        }
        if (token.isCancellationRequested) {
            return;
        }
        const referencesCtx = await this.getReferencesContext(document, position, token);
        if (!referencesCtx || token.isCancellationRequested) {
            return;
        }
        for (const wordMatch of referencesCtx.wordMatches) {
            const hovers = await this.execHover(wordMatch.uri, wordMatch.range.start);
            if (token.isCancellationRequested) {
                return;
            }
            if (hovers?.length) {
                return this.convertHover(hovers);
            }
        }
        return this.convertHover(localHoverResponse);
    }
    async execHover(uri, position) {
        return vscode.commands.executeCommand('vscode.experimental.executeHoverProvider_recursive', uri, position);
    }
    convertHover(hovers) {
        return hovers.length ?
            new vscode.Hover(hovers.flatMap(x => x.contents), hovers[0].range)
            : undefined;
    }
    filterOutGenericHovers(localHoverResponse) {
        return localHoverResponse.filter(hover => {
            return hover.contents.some(entry => {
                if (typeof entry === 'string') {
                    return entry.length;
                }
                if (!entry.value.length) {
                    return false;
                }
                for (const pattern of genericHoverMessages) {
                    if (pattern.test(entry.value)) {
                        return false;
                    }
                }
                return true;
            });
        });
    }
    async goTo(command, document, position, token) {
        const codeBlockId = await (0, crypto_1.createSha256Hash)(document.uri.fragment);
        if (token.isCancellationRequested) {
            return;
        }
        /* __GDPR__
            "codeBlock.action.goTo" : {
                "owner": "mjbvz",
                "comment": "Counts interactions with code blocks in chat responses",
                "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Language of the currently open document." },
                "command": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The go to command being run." },
                "codeBlockId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Unique hash of the code block." }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('codeBlock.action.goTo', {
            languageId: document.languageId,
            command,
            codeBlockId,
        });
        const localLocations = await this.executeGoToInChatBlocks(command, document, position);
        if (localLocations?.length) {
            return localLocations;
        }
        if (token.isCancellationRequested) {
            return;
        }
        return this.executeGoToInChatReferences(command, document, position, token);
    }
    async executeGoToInChatBlocks(command, document, position) {
        const result = await this.executeGoTo(command, document.uri, position);
        return result?.map((result) => {
            if ('uri' in result) {
                return {
                    targetRange: result.range,
                    targetUri: result.uri,
                };
            }
            else {
                return result;
            }
        });
    }
    async executeGoTo(command, uri, position) {
        return vscode.commands.executeCommand(command, uri, position);
    }
    async executeGoToInChatReferences(command, document, position, token) {
        const ctx = await this.getReferencesContext(document, position, token);
        if (!ctx || token.isCancellationRequested) {
            return;
        }
        for (const wordMatch of ctx.wordMatches) {
            const result = await this.executeGoTo(command, wordMatch.uri, wordMatch.range.start);
            if (token.isCancellationRequested) {
                return;
            }
            if (result) {
                return result.map((result) => {
                    if ('uri' in result) {
                        return {
                            targetRange: result.range,
                            targetUri: result.uri,
                            originSelectionRange: ctx.wordRange,
                        };
                    }
                    else {
                        return {
                            targetSelectionRange: result.targetSelectionRange,
                            targetRange: result.targetRange,
                            targetUri: result.targetUri,
                            originSelectionRange: ctx.wordRange,
                        };
                    }
                });
            }
        }
        return undefined;
    }
    async getReferencesContext(document, position, token) {
        const references = this.getReferences(document);
        if (!references?.length) {
            return;
        }
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return;
        }
        const word = document.getText(wordRange);
        const wordMatches = await this.instantiationService.invokeFunction(accessor => (0, findWord_1.findWordInReferences)(accessor, references, word, {}, token));
        return { wordRange, wordMatches };
    }
    getReferences(document) {
        const refs = this.extractReferences(document);
        // Filter out references that don't belong to the same language family
        const docLang = (0, languages_1.getLanguage)(document);
        const docLangGroup = getReferenceGroupForLanguage(docLang);
        if (!docLangGroup) {
            // Unknown language so skip filtering
            return refs;
        }
        return refs.filter(ref => {
            const uri = refToUri(ref);
            if (!uri) {
                return false;
            }
            const lang = (0, languages_1.getLanguageForResource)(uri);
            if (!docLangGroup.has(lang.languageId)) {
                return false;
            }
            return true;
        });
    }
    extractReferences(document) {
        try {
            const fragment = decodeURIComponent(document.uri.fragment);
            const parsedFragment = JSON.parse(fragment);
            return parsedFragment.references.map((ref) => {
                if ('range' in ref) {
                    return new conversation_1.PromptReference(new vscodeTypes_1.Location(vscodeTypes_1.Uri.from(ref.uri), new vscodeTypes_1.Range(ref.range.startLineNumber - 1, ref.range.startColumn - 1, ref.range.endLineNumber - 1, ref.range.endColumn - 1)));
                }
                else {
                    return new conversation_1.PromptReference(vscodeTypes_1.Uri.from(ref.uri));
                }
            });
        }
        catch {
            return [];
        }
    }
};
CodeBlockIntelliSenseProvider = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, telemetry_1.ITelemetryService)
], CodeBlockIntelliSenseProvider);
function refToUri(ref) {
    return (0, types_1.isUri)(ref.anchor)
        ? ref.anchor
        : 'uri' in ref.anchor
            ? ref.anchor.uri
            : 'value' in ref.anchor && (0, types_1.isUri)(ref.anchor.value) ? ref.anchor.value : undefined;
}
function getReferenceGroupForLanguage(docLang) {
    return languageReferenceGroups.find(group => group.has(docLang.languageId));
}
function register(accessor) {
    const goToProvider = accessor.get(instantiation_1.IInstantiationService).createInstance(CodeBlockIntelliSenseProvider);
    const selector = { scheme: codeBlockScheme, exclusive: true };
    return vscode.Disposable.from(vscode.languages.registerDefinitionProvider(selector, goToProvider), vscode.languages.registerTypeDefinitionProvider(selector, goToProvider), vscode.languages.registerImplementationProvider(selector, goToProvider), vscode.languages.registerHoverProvider(selector, goToProvider));
}
//# sourceMappingURL=provider.js.map