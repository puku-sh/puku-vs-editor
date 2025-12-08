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
exports.ReferencesSymbolResolver = void 0;
exports.findWordInReferences = findWordInReferences;
const vscode = __importStar(require("vscode"));
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const parserService_1 = require("../../../platform/parser/node/parserService");
const treeSitterLanguages_1 = require("../../../platform/parser/node/treeSitterLanguages");
const languages_1 = require("../../../util/common/languages");
const async_1 = require("../../../util/vs/base/common/async");
const strings_1 = require("../../../util/vs/base/common/strings");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
/**
 * How the word was resolved.
 */
var ResolvedWordLocationType;
(function (ResolvedWordLocationType) {
    // Ordered by priority. Higher properties are preferred.
    /** Resolve using string matching */
    ResolvedWordLocationType[ResolvedWordLocationType["TextualMatch"] = 1] = "TextualMatch";
    /** Resolve by matching a symbol name in code */
    ResolvedWordLocationType[ResolvedWordLocationType["SymbolMatch"] = 2] = "SymbolMatch";
    /** Resolve by matching a definition in code */
    // TODO: not implemented yet
    ResolvedWordLocationType[ResolvedWordLocationType["Definition"] = 3] = "Definition";
})(ResolvedWordLocationType || (ResolvedWordLocationType = {}));
async function findWordInReferences(accessor, references, word, options, token) {
    const parserService = accessor.get(parserService_1.IParserService);
    const out = [];
    const maxResultCount = options.maxResultCount ?? Infinity;
    const limiter = new async_1.Limiter(10);
    try {
        await Promise.all(references.map(ref => limiter.queue(async () => {
            if (out.length >= maxResultCount || token.isCancellationRequested) {
                return;
            }
            let loc;
            if ((0, uri_1.isUriComponents)(ref.anchor)) {
                loc = await findWordInDoc(parserService, word, ref.anchor, new vscode.Range(0, 0, Number.MAX_SAFE_INTEGER, 0), options, token);
            }
            else if ('range' in ref.anchor) {
                loc = await findWordInDoc(parserService, word, ref.anchor.uri, ref.anchor.range, options, token);
            }
            else if ('value' in ref.anchor && uri_1.URI.isUri(ref.anchor.value)) {
                loc = await findWordInDoc(parserService, word, ref.anchor.value, new vscode.Range(0, 0, Number.MAX_SAFE_INTEGER, 0), options, token);
            }
            if (loc) {
                out.push(loc);
            }
        })));
    }
    finally {
        limiter.dispose();
    }
    return out
        .sort((a, b) => b.type - a.type)
        .map(x => x.location)
        .slice(0, options.maxResultCount);
}
async function findWordInDoc(parserService, word, uri, range, options, token) {
    const doc = await openDocument(uri);
    if (!doc || token.isCancellationRequested) {
        return;
    }
    const symbols = await getSymbolsInRange(parserService, doc, range, token);
    if (token.isCancellationRequested) {
        return;
    }
    for (const symbol of symbols) {
        if (symbol.identifier === word) {
            const pos = doc.positionAt(symbol.startIndex);
            return { type: ResolvedWordLocationType.SymbolMatch, location: new vscode.Location(uri, pos) };
        }
    }
    if (options.symbolMatchesOnly) {
        return;
    }
    // Fall back to word based
    const text = doc.getText(range);
    const startOffset = doc.offsetAt(range.start);
    for (const match of text.matchAll(new RegExp((0, strings_1.escapeRegExpCharacters)(word), 'g'))) {
        if (match.index) {
            const wordPos = doc.positionAt(startOffset + match.index);
            if ('getWordRangeAtPosition' in doc) {
                const wordInDoc = doc.getText(doc.getWordRangeAtPosition(wordPos));
                if (word === wordInDoc) {
                    return { type: ResolvedWordLocationType.TextualMatch, location: new vscode.Location(uri, wordPos) };
                }
            }
            else {
                const wordInDoc = doc.getText(new vscode.Range(wordPos, doc.positionAt(doc.offsetAt(wordPos) + word.length)));
                if (word === wordInDoc) {
                    return { type: ResolvedWordLocationType.TextualMatch, location: new vscode.Location(uri, wordPos) };
                }
            }
        }
    }
    return undefined;
}
async function openDocument(uri) {
    const vsCodeDoc = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());
    if (vsCodeDoc) {
        return vsCodeDoc;
    }
    try {
        const contents = await vscode.workspace.fs.readFile(uri);
        const languageId = (0, languages_1.getLanguageForResource)(uri).languageId;
        const doc = vscode_languageserver_textdocument_1.TextDocument.create(uri.toString(), languageId, 0, new TextDecoder().decode(contents));
        return new class {
            constructor() {
                this.languageId = languageId;
            }
            getText(range) {
                return doc.getText(range);
            }
            offsetAt(position) {
                return doc.offsetAt(position);
            }
            positionAt(offset) {
                const pos = doc.positionAt(offset);
                return new vscode.Position(pos.line, pos.character);
            }
        };
    }
    catch {
        return undefined;
    }
}
async function getSymbolsInRange(parserService, doc, range, token) {
    const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)(doc.languageId);
    if (!wasmLanguage) {
        return [];
    }
    const ast = parserService.getTreeSitterASTForWASMLanguage(wasmLanguage, doc.getText());
    if (!ast) {
        return [];
    }
    return ast.getSymbols({
        startIndex: doc.offsetAt(range.start),
        endIndex: doc.offsetAt(range.end),
    });
}
let ReferencesSymbolResolver = class ReferencesSymbolResolver {
    constructor(findWordOptions, instantiationService) {
        this.findWordOptions = findWordOptions;
        this.instantiationService = instantiationService;
        /** Symbols which we have already tried to resolve */
        this.cache = new Map();
    }
    async resolve(codeText, references, token) {
        if (!references.length) {
            return;
        }
        const existing = this.cache.get(codeText);
        if (existing) {
            return existing;
        }
        else {
            const p = this.doResolve(codeText, references, token);
            this.cache.set(codeText, p);
            return p;
        }
    }
    async doResolve(codeText, references, token) {
        // Prefer exact match
        let wordMatches = await this.instantiationService.invokeFunction(accessor => findWordInReferences(accessor, references, codeText, this.findWordOptions, token));
        if (token.isCancellationRequested) {
            return;
        }
        // But then try breaking up inline code into symbol parts
        if (!wordMatches.length) {
            // Extract all symbol parts from the code text
            // For example: `TextModel.undo()` -> ['TextModel', 'undo']
            const symbolParts = Array.from(codeText.matchAll(/[#\w$][\w\d$]*/g), x => x[0]);
            if (symbolParts.length >= 2) {
                // For qualified names like `Class.method()`, search for both parts together
                // This helps disambiguate when there are multiple methods with the same name
                const firstPart = symbolParts[0];
                const lastPart = symbolParts[symbolParts.length - 1];
                // First, try to find the class
                const classMatches = await this.instantiationService.invokeFunction(accessor => findWordInReferences(accessor, references, firstPart, {
                    symbolMatchesOnly: true,
                    maxResultCount: this.findWordOptions.maxResultCount,
                }, token));
                // If we found the class, we'll rely on the click-time resolution to find the method
                if (classMatches.length) {
                    wordMatches = classMatches;
                }
                else {
                    // If no class found, try just the method name as fallback
                    wordMatches = await this.instantiationService.invokeFunction(accessor => findWordInReferences(accessor, references, lastPart, {
                        symbolMatchesOnly: true,
                        maxResultCount: this.findWordOptions.maxResultCount,
                    }, token));
                }
            }
            else if (symbolParts.length > 0) {
                // For single names like `undo`, try to find the method directly
                const lastPart = symbolParts[symbolParts.length - 1];
                if (lastPart && lastPart !== codeText) {
                    wordMatches = await this.instantiationService.invokeFunction(accessor => findWordInReferences(accessor, references, lastPart, {
                        symbolMatchesOnly: true,
                        maxResultCount: this.findWordOptions.maxResultCount,
                    }, token));
                }
            }
        }
        return wordMatches.slice(0, this.findWordOptions.maxResultCount);
    }
};
exports.ReferencesSymbolResolver = ReferencesSymbolResolver;
exports.ReferencesSymbolResolver = ReferencesSymbolResolver = __decorate([
    __param(1, instantiation_1.IInstantiationService)
], ReferencesSymbolResolver);
//# sourceMappingURL=findWord.js.map