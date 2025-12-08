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
exports.DefinitionAroundCursor = void 0;
exports.determineNodeToDocument = determineNodeToDocument;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const parserService_1 = require("../../../platform/parser/node/parserService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const codeContextRegion_1 = require("../../inlineChat/node/codeContextRegion");
let DefinitionAroundCursor = class DefinitionAroundCursor extends prompt_tsx_1.PromptElement {
    constructor(props, _telemetryService, _parserService, _ignoreService) {
        super(props);
        this._telemetryService = _telemetryService;
        this._parserService = _parserService;
        this._ignoreService = _ignoreService;
    }
    async prepare(sizing, progress, token) {
        if (await this._ignoreService.isCopilotIgnored(this.props.documentContext.document.uri)) {
            return { k: 'ignored' };
        }
        const nodeToDocument = this.props.nodeToDocument ?? await determineNodeToDocument(this._parserService, this._telemetryService, this.props.documentContext);
        const contextInfo = generateDocContext(this.props.endpointInfo, this.props.documentContext, nodeToDocument.range);
        return {
            k: 'found',
            nodeToDocument,
            codeExcerptToDocument: contextInfo.range,
        };
    }
    render(state, sizing) {
        if (state.k === 'ignored') {
            return vscpp("ignoredFiles", { value: [this.props.documentContext.document.uri] });
        }
        const codeExcerpt = state.codeExcerptToDocument.generatePrompt().join('\n');
        return (vscpp(prompt_tsx_1.UserMessage, null,
            "I have the following code in the selection:",
            codeExcerpt !== '' ? vscpp("br", null) : '',
            state.codeExcerptToDocument.generatePrompt().join('\n')));
    }
};
exports.DefinitionAroundCursor = DefinitionAroundCursor;
exports.DefinitionAroundCursor = DefinitionAroundCursor = __decorate([
    __param(1, telemetry_1.ITelemetryService),
    __param(2, parserService_1.IParserService),
    __param(3, ignoreService_1.IIgnoreService)
], DefinitionAroundCursor);
async function determineNodeToDocument(parserService, telemetryService, ctx) {
    const selectionRange = (0, parserService_1.vscodeToTreeSitterOffsetRange)(ctx.selection, ctx.document);
    const treeSitterAST = parserService.getTreeSitterAST(ctx.document);
    if (treeSitterAST === undefined) {
        return {
            range: ctx.wholeRange,
        };
    }
    const startTime = Date.now();
    const nodeToDocContext = await treeSitterAST.getNodeToDocument(selectionRange);
    const timeSpentMs = Date.now() - startTime;
    const wholeOffsetRange = (0, parserService_1.vscodeToTreeSitterOffsetRange)(ctx.wholeRange, ctx.document);
    sendNodeToDocumentTelemetry(telemetryService, selectionRange, wholeOffsetRange, nodeToDocContext, ctx.document.languageId, timeSpentMs);
    const rangeOfNodeToDocument = (0, parserService_1.treeSitterOffsetRangeToVSCodeRange)(ctx.document, nodeToDocContext.nodeToDocument);
    return {
        identifier: nodeToDocContext.nodeIdentifier,
        range: rangeOfNodeToDocument,
    };
}
function generateDocContext(endpoint, ctx, range) {
    const tracker = new codeContextRegion_1.CodeContextTracker((endpoint.modelMaxPromptTokens * 4) / 3);
    const rangeInfo = new codeContextRegion_1.CodeContextRegion(tracker, ctx.document, ctx.language);
    // we only want to include the code that's being documented but we need `above` and `below` for the return value's type
    // so we just make these code regions empty
    const above = new codeContextRegion_1.CodeContextRegion(new codeContextRegion_1.CodeContextTracker(0), ctx.document, ctx.language);
    const below = new codeContextRegion_1.CodeContextRegion(new codeContextRegion_1.CodeContextTracker(0), ctx.document, ctx.language);
    for (let i = range.start.line, len = range.end.line; i <= len; ++i) {
        if ((i === len && range.end.character === 0) // we don't want to include the end line if it's (end.line, 0)
            || !rangeInfo.appendLine(i) // didn't fit
        ) {
            break;
        }
    }
    rangeInfo.trim(ctx.selection);
    return {
        language: ctx.language,
        above,
        range: rangeInfo,
        below,
    };
}
function sendNodeToDocumentTelemetry(telemetryService, selectionRange, wholeOffsetRange, nodeToDocContext, languageId, timeSpentMs) {
    /* __GDPR__
        "getNodeToDocument" : {
            "owner": "ulugbekna",
            "comment": "Info on success and properties of detecting AST node to document",
            "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The language ID of the document" },
            "typeOfNodeToDocument": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Type of the AST node offered to be documented (type defined by tree-sitter grammar for that language)" },
            "nodeToDocumentStart": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Start offset of the AST node offered to be documented (type defined by tree-sitter grammar for that language)" },
            "nodeToDocumentEnd": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "End offset of the AST node offered to be documented (type defined by tree-sitter grammar for that language)" },
            "selectionOffsetRangeStart": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The start offset range of the selection in the document" },
            "selectionOffsetRangeEnd": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The end offset range of the selection in the document" },
            "wholeRangeOffsetRangeStart": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The start offset range of the inline-chat wholeRange" },
            "wholeRangeOffsetRangeEnd": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The end offset range of the inline-chat wholeRange" },
            "timeSpentMs": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time (in milliseconds) spent on finding the AST node to document (approximate as it's an async call)" }
        }
    */
    telemetryService.sendMSFTTelemetryEvent('getNodeToDocument', {
        languageId,
        typeOfNodeToDocument: nodeToDocContext.nodeToDocument.type,
        nodeToDocumentStart: nodeToDocContext.nodeToDocument.startIndex.toString(),
        nodeToDocumentEnd: nodeToDocContext.nodeToDocument.endIndex.toString(),
        selectionOffsetRangeStart: selectionRange.startIndex.toString(),
        selectionOffsetRangeEnd: selectionRange.endIndex.toString(),
        wholeRangeOffsetRangeStart: wholeOffsetRange.startIndex.toString(),
        wholeRangeOffsetRangeEnd: wholeOffsetRange.endIndex.toString(),
    }, {
        timeSpentMs,
    });
}
//# sourceMappingURL=definitionAroundCursor.js.map