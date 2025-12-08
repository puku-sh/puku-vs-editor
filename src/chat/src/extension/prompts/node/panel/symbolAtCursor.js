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
var SymbolAtCursor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymbolAtCursor = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const textDocumentSnapshot_1 = require("../../../../platform/editing/common/textDocumentSnapshot");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const languageFeaturesService_1 = require("../../../../platform/languages/common/languageFeaturesService");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const scopeSelection_1 = require("../../../../platform/scopeSelection/common/scopeSelection");
const tabsAndEditorsService_1 = require("../../../../platform/tabs/common/tabsAndEditorsService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const path_1 = require("../../../../util/vs/base/common/path");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const safeElements_1 = require("./safeElements");
const symbolDefinitions_1 = require("./symbolDefinitions");
let SymbolAtCursor = SymbolAtCursor_1 = class SymbolAtCursor extends prompt_tsx_1.PromptElement {
    constructor(props, _ignoreService, _configurationService, _tabsAndEditorsService, _scopeSelector, _parserService, _languageFeaturesService, _workspaceService) {
        super(props);
        this._ignoreService = _ignoreService;
        this._configurationService = _configurationService;
        this._tabsAndEditorsService = _tabsAndEditorsService;
        this._scopeSelector = _scopeSelector;
        this._parserService = _parserService;
        this._languageFeaturesService = _languageFeaturesService;
        this._workspaceService = _workspaceService;
    }
    static getSymbolAtCursor(tabsAndEditorsService, props) {
        let { selection, document } = props;
        // If not provided, fall back to the active editor
        if (!selection || !document) {
            const editor = tabsAndEditorsService.activeTextEditor;
            if (!editor) {
                return;
            }
            selection = editor.selection;
            document = textDocumentSnapshot_1.TextDocumentSnapshot.create(editor.document);
        }
        // This component should not return anything if we have a real selection
        if (!selection.isEmpty) {
            return;
        }
        const range = document.getWordRangeAtPosition(selection.active) ?? selection;
        const selectedText = document.getText(range);
        return { selectedText, document, range };
    }
    static async getDefinitionAtRange(ignoreService, parserService, document, range, preferDefinitions) {
        const fileIsIgnored = await ignoreService.isCopilotIgnored(document.uri);
        if (fileIsIgnored) {
            return undefined;
        }
        const treeSitterAST = parserService.getTreeSitterAST(document);
        if (treeSitterAST === undefined) {
            return undefined;
        }
        const treeSitterOffsetRange = (0, parserService_1.vscodeToTreeSitterOffsetRange)(range, document);
        let nodeContext;
        if (preferDefinitions) {
            nodeContext = await treeSitterAST.getNodeToExplain(treeSitterOffsetRange);
        }
        nodeContext ??= await treeSitterAST.getNodeToDocument(treeSitterOffsetRange);
        const { startIndex, endIndex } = 'nodeToDocument' in nodeContext ? nodeContext.nodeToDocument : nodeContext.nodeToExplain;
        const expandedRange = (0, parserService_1.treeSitterOffsetRangeToVSCodeRange)(document, { startIndex, endIndex });
        return { identifier: nodeContext.nodeIdentifier, text: document.getText(expandedRange), range: expandedRange, uri: document.uri, startIndex, endIndex };
    }
    static async getSelectedScope(ignoreService, configurationService, tabsAndEditorsService, scopeSelector, parserService, props) {
        if (!props.document || await ignoreService.isCopilotIgnored(props.document.uri)) {
            return undefined;
        }
        const symbolAtCursor = SymbolAtCursor_1.getSymbolAtCursor(tabsAndEditorsService, props);
        let symbolAtCursorState;
        const definition = symbolAtCursor ? await SymbolAtCursor_1.getDefinitionAtRange(ignoreService, parserService, symbolAtCursor.document, symbolAtCursor.range, false) : undefined;
        const isExplicitScopeSelectionEnabled = configurationService.getConfig(configurationService_1.ConfigKey.ExplainScopeSelection);
        if (isExplicitScopeSelectionEnabled || symbolAtCursor && (definition?.identifier !== symbolAtCursor.selectedText || !symbolAtCursor.selectedText)) {
            // The cursor wasn't somewhere that clearly indicates intent
            const editor = tabsAndEditorsService.activeTextEditor;
            if (!editor) {
                return;
            }
            const rangeOfEnclosingSymbol = await scopeSelector.selectEnclosingScope(editor, { reason: l10n.t('Select an enclosing range to explain'), includeBlocks: true });
            if (rangeOfEnclosingSymbol) {
                const document = textDocumentSnapshot_1.TextDocumentSnapshot.create(editor.document);
                const definitionText = document.getText(rangeOfEnclosingSymbol);
                if (!definitionText) {
                    return;
                }
                symbolAtCursorState = { codeAtCursor: definitionText, document, range: rangeOfEnclosingSymbol, definitions: [], references: [] };
            }
        }
        return { symbolAtCursorState, definition, symbolAtCursor };
    }
    async prepare(sizing, progress, token) {
        const selectedScope = await SymbolAtCursor_1.getSelectedScope(this._ignoreService, this._configurationService, this._tabsAndEditorsService, this._scopeSelector, this._parserService, this.props).catch(() => undefined);
        if (!selectedScope) {
            return;
        }
        let { symbolAtCursorState, definition, symbolAtCursor } = selectedScope;
        if (!symbolAtCursor) {
            return;
        }
        if (definition?.identifier === symbolAtCursor?.selectedText) {
            // If the cursor is on a symbol reference, include the line of code that the cursor is on and the definition
            symbolAtCursorState ??= {
                codeAtCursor: definition.text,
                document: symbolAtCursor.document,
                range: definition.range,
                definitions: [],
                references: [],
            };
        }
        else {
            // Use the current line of code that the cursor is on
            symbolAtCursorState ??= {
                codeAtCursor: symbolAtCursor.document.lineAt(symbolAtCursor.range.start).text,
                document: symbolAtCursor.document,
                range: symbolAtCursor.document.lineAt(symbolAtCursor.range.start).range,
                definitions: [],
                references: []
            };
        }
        // Enrich symbol state with definitions
        progress.report(new vscodeTypes_1.ChatResponseProgressPart(l10n.t("Searching for relevant definitions...")));
        try {
            for (const link of await this._languageFeaturesService.getDefinitions(symbolAtCursor.document.uri, symbolAtCursor.range.start)) {
                const { uri, range } = (0, languageFeaturesService_1.isLocationLink)(link) ? { uri: link.targetUri, range: link.targetRange } : link;
                if (range.isEqual(symbolAtCursor.range)) {
                    continue;
                }
                const textDocument = await this._workspaceService.openTextDocumentAndSnapshot(uri);
                const definition = await SymbolAtCursor_1.getDefinitionAtRange(this._ignoreService, this._parserService, textDocument, range, true);
                if (definition) {
                    symbolAtCursorState.definitions.push(definition);
                }
            }
        }
        catch { }
        // Enrich symbol state with references
        progress.report(new vscodeTypes_1.ChatResponseProgressPart(l10n.t("Searching for relevant references...")));
        try {
            const seenReferences = new Set();
            for (const link of await this._languageFeaturesService.getReferences(symbolAtCursor.document.uri, symbolAtCursor.range.start)) {
                const { uri, range } = (0, languageFeaturesService_1.isLocationLink)(link) ? { uri: link.targetUri, range: link.targetRange } : link;
                if (range.isEqual(symbolAtCursor.range)) {
                    continue;
                }
                const key = `${uri.toString()}-${range.start.line}-${range.start.character}-${range.end.line}-${range.end.character}`;
                if (seenReferences.has(key)) {
                    continue;
                }
                seenReferences.add(key);
                const textDocument = await this._workspaceService.openTextDocumentAndSnapshot(uri);
                const reference = await SymbolAtCursor_1.getDefinitionAtRange(this._ignoreService, this._parserService, textDocument, range, false);
                if (reference) {
                    symbolAtCursorState.references.push(reference);
                }
            }
        }
        catch { }
        return symbolAtCursorState;
    }
    render(state, sizing) {
        if (!state) {
            return;
        }
        // Include a reference for the code on the line that the cursor is on
        const info = [...state.definitions, ...state.references];
        if (state.codeAtCursor) {
            const { startIndex, endIndex } = (0, parserService_1.vscodeToTreeSitterOffsetRange)(state.range, state.document);
            info.push({ version: state.document.version, uri: state.document.uri, range: state.range, text: state.codeAtCursor, startIndex, endIndex });
        }
        const { references } = (0, symbolDefinitions_1.treeSitterInfoToContext)(state.document, info);
        return (vscpp(vscppf, null,
            vscpp("references", { value: references }),
            vscpp(prompt_tsx_1.UserMessage, null,
                "I have the following  code in the active editor:",
                vscpp("br", null),
                vscpp(safeElements_1.CodeBlock, { uri: state.document.uri, languageId: state.document.languageId, code: state.codeAtCursor }),
                vscpp("br", null),
                Boolean(state.definitions.length) && vscpp(vscppf, null,
                    "Here are some relevant definitions for the symbols in my code:",
                    vscpp("br", null)),
                Boolean(state.definitions.length) && vscpp(prompt_tsx_1.PrioritizedList, { priority: this.props.priority, descending: true }, state.definitions.map(def => vscpp(safeElements_1.CodeBlock, { uri: state.document.uri, languageId: state.document.languageId, code: def.text }))),
                Boolean(state.references.length) && vscpp(vscppf, null,
                    vscpp("br", null),
                    "Here are some places where the the symbols in my code are referenced:",
                    vscpp("br", null)),
                Boolean(state.references.length) &&
                    vscpp(prompt_tsx_1.PrioritizedList, { priority: this.props.priority - state.definitions.length, descending: true }, state.references.map(ref => vscpp(vscppf, null,
                        Boolean(ref.uri) && vscpp(vscppf, null,
                            "From the file ",
                            (0, path_1.basename)(ref.uri.toString()),
                            ":",
                            vscpp("br", null)),
                        vscpp(safeElements_1.CodeBlock, { uri: state.document.uri, languageId: state.document.languageId, code: ref.text }),
                        vscpp("br", null)))))));
    }
};
exports.SymbolAtCursor = SymbolAtCursor;
exports.SymbolAtCursor = SymbolAtCursor = SymbolAtCursor_1 = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(4, scopeSelection_1.IScopeSelector),
    __param(5, parserService_1.IParserService),
    __param(6, languageFeaturesService_1.ILanguageFeaturesService),
    __param(7, workspaceService_1.IWorkspaceService)
], SymbolAtCursor);
//# sourceMappingURL=symbolAtCursor.js.map