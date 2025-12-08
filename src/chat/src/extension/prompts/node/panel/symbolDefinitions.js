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
var SymbolDefinitions_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymbolDefinitions = void 0;
exports.treeSitterInfoToContext = treeSitterInfoToContext;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const textDocumentSnapshot_1 = require("../../../../platform/editing/common/textDocumentSnapshot");
const envService_1 = require("../../../../platform/env/common/envService");
const extensionContext_1 = require("../../../../platform/extContext/common/extensionContext");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const languageFeaturesService_1 = require("../../../../platform/languages/common/languageFeaturesService");
const logService_1 = require("../../../../platform/log/common/logService");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const tabsAndEditorsService_1 = require("../../../../platform/tabs/common/tabsAndEditorsService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const selectionContextHelpers_1 = require("../../../context/node/resolvers/selectionContextHelpers");
const conversation_1 = require("../../../prompt/common/conversation");
const promptElement_1 = require("../base/promptElement");
const tag_1 = require("../base/tag");
const safeElements_1 = require("./safeElements");
let SymbolDefinitions = class SymbolDefinitions extends prompt_tsx_1.PromptElement {
    static { SymbolDefinitions_1 = this; }
    static { this.DEFAULT_TIMEOUT_MS = 200; }
    constructor(props, ignoreService, extensionContext, tabsAndEditorsService, parserService, logService, telemetryService, languageFeaturesService, workspaceService) {
        super(props);
        this.ignoreService = ignoreService;
        this.extensionContext = extensionContext;
        this.tabsAndEditorsService = tabsAndEditorsService;
        this.parserService = parserService;
        this.logService = logService;
        this.telemetryService = telemetryService;
        this.languageFeaturesService = languageFeaturesService;
        this.workspaceService = workspaceService;
    }
    async prepare() {
        const emptyState = { implementations: [], activeDocument: undefined, isIgnored: false };
        let { document: activeDocument, range: selection } = this.props;
        if (!activeDocument) {
            const activeEditor = this.tabsAndEditorsService.activeTextEditor;
            if (!activeEditor) {
                return emptyState;
            }
            activeDocument ??= textDocumentSnapshot_1.TextDocumentSnapshot.create(activeEditor.document);
            selection ??= activeEditor.selection;
        }
        if (!selection || selection.isEmpty) {
            return emptyState;
        }
        if (await this.ignoreService.isCopilotIgnored(activeDocument.uri)) {
            return { ...emptyState, isIgnored: true };
        }
        const timeout = this.extensionContext.extensionMode === vscodeTypes_1.ExtensionMode.Test && !envService_1.isScenarioAutomation
            ? 0
            : (this.props.timeoutMs === undefined ? SymbolDefinitions_1.DEFAULT_TIMEOUT_MS : this.props.timeoutMs);
        const refFinders = [
            { header: 'Relevant function implementations', findImpls: selectionContextHelpers_1.findAllReferencedFunctionImplementationsInSelection },
            { header: 'Relevant class declarations', findImpls: selectionContextHelpers_1.findAllReferencedClassDeclarationsInSelection },
            { header: 'Relevant type declarations', findImpls: selectionContextHelpers_1.findAllReferencedTypeDeclarationsInSelection }
        ];
        const implementations = [];
        for (const { header, findImpls } of refFinders) {
            const impls = await findImpls(this.parserService, this.logService, this.telemetryService, this.languageFeaturesService, this.workspaceService, activeDocument, selection, timeout);
            implementations.push([header, impls]);
        }
        return { implementations, activeDocument, isIgnored: false };
    }
    render(state, sizing) {
        if (!state.implementations.length || !state.activeDocument) {
            return;
        }
        const activeDocumentUri = state.activeDocument.uri;
        if (state.isIgnored) {
            return vscpp("ignoredFiles", { value: [activeDocumentUri] });
        }
        const combinedElements = [];
        for (const [header, implementations] of state.implementations) {
            const { references, text, uris } = treeSitterInfoToContext(state.activeDocument, implementations);
            if (text.length === 0) {
                continue;
            }
            const elements = (vscpp(vscppf, null,
                header,
                ":",
                vscpp("br", null),
                vscpp("br", null),
                text.map((t, i) => vscpp(vscppf, null,
                    vscpp(safeElements_1.CodeBlock, { code: t, languageId: state.activeDocument?.languageId, uri: uris[i], references: [references[i]] }),
                    vscpp("br", null)))));
            const msg = this.props.embeddedInsideUserMessage ?? promptElement_1.embeddedInsideUserMessageDefault ? (vscpp(tag_1.Tag, { name: 'symbolDefinitions', priority: this.props.priority }, elements)) : (vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority }, elements));
            combinedElements.push(msg);
        }
        return (vscpp(vscppf, null, ...combinedElements));
    }
};
exports.SymbolDefinitions = SymbolDefinitions;
exports.SymbolDefinitions = SymbolDefinitions = SymbolDefinitions_1 = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, extensionContext_1.IVSCodeExtensionContext),
    __param(3, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(4, parserService_1.IParserService),
    __param(5, logService_1.ILogService),
    __param(6, telemetry_1.ITelemetryService),
    __param(7, languageFeaturesService_1.ILanguageFeaturesService),
    __param(8, workspaceService_1.IWorkspaceService)
], SymbolDefinitions);
function treeSitterInfoToContext(activeDocument, info) {
    const references = [];
    const seenReferences = new Set();
    const text = [];
    const uris = [];
    for (const impl of info) {
        const uri = impl.uri ?? activeDocument.uri;
        const range = impl.range ?? (0, parserService_1.treeSitterOffsetRangeToVSCodeRange)(activeDocument, impl);
        const key = `${uri.toString()}-${range.start.line}-${range.start.character}-${range.end.line}-${range.end.character}`;
        if (seenReferences.has(key)) {
            continue;
        }
        seenReferences.add(key);
        references.push(new conversation_1.PromptReference(new vscodeTypes_1.Location(uri, range)));
        text.push(impl.text);
        uris.push(uri);
    }
    return { references, text, uris };
}
//# sourceMappingURL=symbolDefinitions.js.map