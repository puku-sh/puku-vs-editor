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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Test2Impl = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const assert_1 = __importDefault(require("assert"));
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const tag_1 = require("../../prompts/node/base/tag");
const summarizeDocumentHelpers_1 = require("../../prompts/node/inline/summarizedDocument/summarizeDocumentHelpers");
const safeElements_1 = require("../../prompts/node/panel/safeElements");
const conversation_1 = require("../common/conversation");
const testFiles_1 = require("./testFiles");
/**
 * @remark Respects copilot-ignore.
 */
let Test2Impl = class Test2Impl extends prompt_tsx_1.PromptElement {
    constructor(props, instaService, ignoreService, workspaceService) {
        super(props);
        this.instaService = instaService;
        this.ignoreService = ignoreService;
        this.workspaceService = workspaceService;
    }
    async render(state, sizing) {
        const { documentContext, srcFile, } = this.props;
        (0, assert_1.default)((0, testFiles_1.isTestFile)(documentContext.document), 'Test2Impl must be invoked on a test file.');
        let candidateFile;
        let selection;
        if (srcFile) {
            candidateFile = srcFile.uri;
            selection = srcFile.target;
        }
        else {
            // @ulugbekna: find file that this test file corresponds to
            const finder = this.instaService.createInstance(testFiles_1.TestFileFinder);
            candidateFile = await finder.findFileForTestFile(documentContext.document, cancellation_1.CancellationToken.None);
        }
        if (candidateFile === undefined || await this.ignoreService.isCopilotIgnored(candidateFile)) {
            return undefined;
        }
        const doc = await this.workspaceService.openTextDocumentAndSnapshot(candidateFile);
        const docSummarizer = this.instaService.createInstance(summarizeDocumentHelpers_1.DocumentSummarizer);
        const summarizedDoc = await docSummarizer.summarizeDocument(doc, documentContext.fileIndentInfo, selection, sizing.tokenBudget);
        const references = [new conversation_1.PromptReference(candidateFile)];
        return (vscpp(tag_1.Tag, { name: 'codeToTest', priority: this.props.priority },
            vscpp("references", { value: references }),
            "Below is the file located at ",
            candidateFile.path,
            ":",
            vscpp("br", null),
            vscpp(safeElements_1.CodeBlock, { code: summarizedDoc.text, uri: candidateFile, languageId: documentContext.document.languageId })));
    }
};
exports.Test2Impl = Test2Impl;
exports.Test2Impl = Test2Impl = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, ignoreService_1.IIgnoreService),
    __param(3, workspaceService_1.IWorkspaceService)
], Test2Impl);
//# sourceMappingURL=test2Impl.js.map