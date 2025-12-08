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
var ReferencesAtPosition_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferencesAtPosition = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const envService_1 = require("../../../../platform/env/common/envService");
const extensionContext_1 = require("../../../../platform/extContext/common/extensionContext");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const languageFeaturesService_1 = require("../../../../platform/languages/common/languageFeaturesService");
const logService_1 = require("../../../../platform/log/common/logService");
const nodes_1 = require("../../../../platform/parser/node/nodes");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const languages_1 = require("../../../../util/common/languages");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const selectionContextHelpers_1 = require("../../../context/node/resolvers/selectionContextHelpers");
const definitionAroundCursor_1 = require("../../../prompt/node/definitionAroundCursor");
const safeElements_1 = require("./safeElements");
/**
 * @remark Excludes references that are in copilot-ignored files.
 */
let ReferencesAtPosition = class ReferencesAtPosition extends prompt_tsx_1.PromptElement {
    static { ReferencesAtPosition_1 = this; }
    static { this.DEFAULT_TIMEOUT_MS = 200; }
    constructor(props, ignoreService, extensionContext, languageFeaturesService, workspaceService, logService, parserService, telemetryService) {
        super(props);
        this.ignoreService = ignoreService;
        this.extensionContext = extensionContext;
        this.languageFeaturesService = languageFeaturesService;
        this.workspaceService = workspaceService;
        this.logService = logService;
        this.parserService = parserService;
        this.telemetryService = telemetryService;
    }
    async render(state, sizing) {
        if (await this.ignoreService.isCopilotIgnored(this.props.document.uri)) {
            return vscpp("ignoredFiles", { value: [this.props.document.uri] });
        }
        const timeout = this.extensionContext.extensionMode === vscodeTypes_1.ExtensionMode.Test && !envService_1.isScenarioAutomation
            ? 0
            : (this.props.timeoutMs === undefined ? ReferencesAtPosition_1.DEFAULT_TIMEOUT_MS : this.props.timeoutMs);
        const [definitions, usages] = await this.findReferences(timeout);
        this.logService.debug(`Found ${definitions.length} implementation(s)/definition(s), ${usages.length} usages`);
        if (definitions.length > 0) {
            this.logService.debug(`Implementation(s)/definition(s) found:` + JSON.stringify(definitions, null, '\t'));
        }
        if (usages.length > 0) {
            this.logService.debug(`Usages found:` + JSON.stringify(usages, null, '\t'));
        }
        return (vscpp(vscppf, null,
            this.renderCodeExcerpts(`Relevant definition${definitions.length > 1 ? 's' : ''}:`, definitions),
            this.renderCodeExcerpts(`Other usages:`, usages)));
    }
    renderCodeExcerpts(title, excerts) {
        if (excerts.length > 0) {
            return (vscpp(vscppf, null,
                title,
                vscpp("br", null),
                vscpp("br", null),
                excerts.map(excerpt => {
                    const lineCommentStart = (0, languages_1.getLanguage)(excerpt.languageId).lineComment.start;
                    const filePath = `${lineCommentStart} FILEPATH: ${excerpt.uri.path}`;
                    const code = `${filePath}\n${excerpt.code}`;
                    return (vscpp(safeElements_1.CodeBlock, { uri: excerpt.uri, languageId: excerpt.languageId, code: code, references: [new prompt_tsx_1.PromptReference(new vscodeTypes_1.Location(excerpt.uri, excerpt.excerptRange))] }));
                }),
                vscpp("br", null),
                vscpp("br", null)));
        }
        return undefined;
    }
    async findReferences(timeoutMs) {
        const { document, position } = this.props;
        const findReference = async () => {
            try {
                const refs = await this.languageFeaturesService.getReferences(document.uri, position);
                this.logService.debug(`Found ${refs.length} references: ` + JSON.stringify(refs, null, '\t'));
                return refs;
            }
            catch (e) {
                return [];
            }
        };
        const foundRefs = await (0, selectionContextHelpers_1.asyncComputeWithTimeBudget)(this.logService, this.telemetryService, document, timeoutMs * 3, findReference, []);
        const nonIgnoredDefs = [];
        const nonIgnoredRefs = [];
        for (const ref of foundRefs) {
            if (await this.ignoreService.isCopilotIgnored(ref.uri)) {
                continue;
            }
            const docContainingRef = await this.workspaceService.openTextDocumentAndSnapshot(ref.uri);
            const treeSitterAST = this.parserService.getTreeSitterAST(docContainingRef);
            if (!treeSitterAST) {
                continue;
            }
            const range = (0, parserService_1.vscodeToTreeSitterOffsetRange)(ref.range, docContainingRef);
            const calls = await treeSitterAST.getCallExpressions(range);
            const functions = await treeSitterAST.getFunctionDefinitions();
            if (calls.length > 0) {
                nonIgnoredRefs.push({
                    languageId: docContainingRef.languageId,
                    uri: docContainingRef.uri,
                    code: calls[0].text,
                    excerptRange: (0, parserService_1.treeSitterOffsetRangeToVSCodeRange)(docContainingRef, calls[0]),
                });
            }
            else if (functions.some(f => nodes_1.TreeSitterOffsetRange.doIntersect(f, range))) {
                // since language service gives us only links to identifiers, expand to whole implementation/definition using tree-sitter
                const nodeToDocument = await (0, definitionAroundCursor_1.determineNodeToDocument)(this.parserService, this.telemetryService, {
                    document: docContainingRef,
                    language: (0, languages_1.getLanguage)(document.languageId),
                    wholeRange: ref.range,
                    selection: new vscodeTypes_1.Selection(ref.range.start, ref.range.end),
                    fileIndentInfo: undefined,
                });
                const excerptRange = nodeToDocument.range;
                nonIgnoredDefs.push({
                    languageId: docContainingRef.languageId,
                    uri: docContainingRef.uri,
                    code: docContainingRef.getText(excerptRange),
                    excerptRange,
                });
            }
        }
        return [nonIgnoredDefs, nonIgnoredRefs];
    }
};
exports.ReferencesAtPosition = ReferencesAtPosition;
exports.ReferencesAtPosition = ReferencesAtPosition = ReferencesAtPosition_1 = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, extensionContext_1.IVSCodeExtensionContext),
    __param(3, languageFeaturesService_1.ILanguageFeaturesService),
    __param(4, workspaceService_1.IWorkspaceService),
    __param(5, logService_1.ILogService),
    __param(6, parserService_1.IParserService),
    __param(7, telemetry_1.ITelemetryService)
], ReferencesAtPosition);
//# sourceMappingURL=referencesAtPosition.js.map