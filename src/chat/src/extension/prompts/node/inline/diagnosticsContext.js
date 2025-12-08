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
exports.DiagnosticSuggestedFix = exports.DiagnosticRelatedInfo = exports.Diagnostics = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../../platform/log/common/logService");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const selectionContextHelpers_1 = require("../../../context/node/resolvers/selectionContextHelpers");
const tag_1 = require("../base/tag");
const referencesAtPosition_1 = require("../panel/referencesAtPosition");
const safeElements_1 = require("../panel/safeElements");
const fixCookbookService_1 = require("./fixCookbookService");
const LINE_CONTEXT_MAX_SIZE = 200;
const RELATED_INFO_MAX_SIZE = 300;
let Diagnostics = class Diagnostics extends prompt_tsx_1.PromptElement {
    constructor(props, ignoreService, fixCookbookService) {
        super(props);
        this.ignoreService = ignoreService;
        this.fixCookbookService = fixCookbookService;
    }
    async render(state, sizing) {
        const { diagnostics, documentContext } = this.props;
        const isIgnored = await this.ignoreService.isCopilotIgnored(documentContext.document.uri);
        if (isIgnored) {
            return vscpp("ignoredFiles", { value: [documentContext.document.uri] });
        }
        return (diagnostics.length > 0 &&
            vscpp(vscppf, null, diagnostics.map((d, idx) => {
                const cookbook = this.fixCookbookService.getCookbook(documentContext.language.languageId, d);
                return vscpp(vscppf, null,
                    vscpp(DiagnosticDescription, { diagnostic: d, cookbook: cookbook, maxLength: LINE_CONTEXT_MAX_SIZE, documentContext: documentContext }),
                    this.props.includeRelatedInfos !== false && vscpp(DiagnosticRelatedInfo, { diagnostic: d, cookbook: cookbook, document: documentContext.document }),
                    vscpp(DiagnosticSuggestedFix, { cookbook: cookbook }));
            })));
    }
};
exports.Diagnostics = Diagnostics;
exports.Diagnostics = Diagnostics = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, fixCookbookService_1.IFixCookbookService)
], Diagnostics);
class DiagnosticDescription extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const d = this.props.diagnostic;
        const document = this.props.documentContext.document;
        const range = d.range;
        const content = document.getText(new vscodeTypes_1.Range(range.start.line, 0, range.end.line + 1, 0)).trimEnd();
        const code = (content.length > this.props.maxLength) ?
            content.slice(0, this.props.maxLength) + ' (truncated…)' :
            content;
        if (code) {
            return vscpp(vscppf, null,
                "This code at line ",
                range.start.line + 1,
                vscpp("br", null),
                vscpp(safeElements_1.CodeBlock, { code: code, uri: document.uri, shouldTrim: false }),
                vscpp("br", null),
                vscpp(vscppf, null,
                    "has the problem reported:",
                    vscpp("br", null),
                    vscpp(tag_1.Tag, { name: 'compileError' }, d.message)));
        }
        return vscpp(vscppf, null);
    }
}
let DiagnosticRelatedInfo = class DiagnosticRelatedInfo extends prompt_tsx_1.PromptElement {
    constructor(props, workspaceService, parserService, ignoreService, logService, telemetryService) {
        super(props);
        this.workspaceService = workspaceService;
        this.parserService = parserService;
        this.ignoreService = ignoreService;
        this.logService = logService;
        this.telemetryService = telemetryService;
    }
    async render(_state, sizing) {
        const { infos, ignoredFiles, definitionRanges } = await this.getRelatedInfos();
        if (!infos.length && !definitionRanges.length) {
            return vscpp("ignoredFiles", { value: ignoredFiles });
        }
        return vscpp(vscppf, null,
            "This diagnostic has some related code:",
            vscpp("br", null),
            infos.map(info => vscpp(safeElements_1.CodeBlock, { code: info.content, uri: info.uri, references: [new prompt_tsx_1.PromptReference(new vscodeTypes_1.Location(info.uri, info.range))], includeFilepath: true })),
            definitionRanges.map(range => vscpp(referencesAtPosition_1.ReferencesAtPosition, { document: this.props.document, position: range.start })),
            vscpp("ignoredFiles", { value: ignoredFiles }));
    }
    async getRelatedInfos() {
        const infos = [];
        const definitionRanges = [];
        const ignoredFiles = [];
        const diagnostic = this.props.diagnostic;
        if (diagnostic.relatedInformation) {
            for (const relatedInformation of diagnostic.relatedInformation) {
                try {
                    const location = relatedInformation.location;
                    if (await this.ignoreService.isCopilotIgnored(location.uri)) {
                        ignoredFiles.push(location.uri);
                        continue;
                    }
                    const document = await this.workspaceService.openTextDocument(location.uri);
                    const locationRange = location.range;
                    const treeSitterAST = this.parserService.getTreeSitterAST(document);
                    let relatedCodeText;
                    if (treeSitterAST) {
                        const treeSitterLocationRange = (0, parserService_1.vscodeToTreeSitterRange)(locationRange);
                        const rangeOfInterest = await treeSitterAST.getCoarseParentScope(treeSitterLocationRange);
                        relatedCodeText = document.getText((0, parserService_1.treeSitterToVSCodeRange)(rangeOfInterest));
                    }
                    if (!relatedCodeText || relatedCodeText.length > RELATED_INFO_MAX_SIZE) {
                        relatedCodeText = document.getText(locationRange);
                    }
                    if (relatedCodeText.length <= RELATED_INFO_MAX_SIZE) {
                        infos.push({ content: relatedCodeText, uri: location.uri, range: location.range });
                    }
                }
                catch (e) {
                    // ignore
                }
            }
        }
        const definitionLocations = this.props.cookbook.additionalContext();
        for (const location of definitionLocations) {
            switch (location) {
                case fixCookbookService_1.ContextLocation.ParentCallDefinition: {
                    const treeSitterAST = this.parserService.getTreeSitterAST(this.props.document);
                    if (treeSitterAST) {
                        const diagnosticOffsetRange = (0, parserService_1.vscodeToTreeSitterOffsetRange)(this.props.diagnostic.range, this.props.document);
                        const expressionInfos = await (0, selectionContextHelpers_1.asyncComputeWithTimeBudget)(this.logService, this.telemetryService, this.props.document, 500, () => treeSitterAST.getCallExpressions(diagnosticOffsetRange), []);
                        for (const expressionInfo of expressionInfos) {
                            const expressionRange = (0, parserService_1.treeSitterOffsetRangeToVSCodeRange)(this.props.document, expressionInfo);
                            definitionRanges.push(expressionRange);
                        }
                    }
                    break;
                }
                case fixCookbookService_1.ContextLocation.DefinitionAtLocation: {
                    definitionRanges.push(this.props.diagnostic.range);
                    break;
                }
            }
        }
        return { infos, definitionRanges, ignoredFiles };
    }
};
exports.DiagnosticRelatedInfo = DiagnosticRelatedInfo;
exports.DiagnosticRelatedInfo = DiagnosticRelatedInfo = __decorate([
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, parserService_1.IParserService),
    __param(3, ignoreService_1.IIgnoreService),
    __param(4, logService_1.ILogService),
    __param(5, telemetry_1.ITelemetryService)
], DiagnosticRelatedInfo);
class DiagnosticSuggestedFix extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const suggestedFixes = this.props.cookbook.fixes;
        if (suggestedFixes.length) {
            const prompt = suggestedFixes[0];
            return vscpp(tag_1.Tag, { name: 'suggestedFix' }, prompt.title + prompt.message);
        }
        return null;
    }
}
exports.DiagnosticSuggestedFix = DiagnosticSuggestedFix;
// #endregion DiagnosticSuggestedFix
//# sourceMappingURL=diagnosticsContext.js.map