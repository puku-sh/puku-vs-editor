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
exports.TestExample = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const parserService_1 = require("../../../platform/parser/node/parserService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const path = __importStar(require("../../../util/vs/base/common/path"));
const vscodeTypes_1 = require("../../../vscodeTypes");
const tag_1 = require("../../prompts/node/base/tag");
const summarizeDocumentHelpers_1 = require("../../prompts/node/inline/summarizedDocument/summarizeDocumentHelpers");
const safeElements_1 = require("../../prompts/node/panel/safeElements");
/**
 * @remark Does NOT respected copilot-ignore. Parent element must make sure the URI is not copilot-ignored.
 */
let TestExample = class TestExample extends prompt_tsx_1.PromptElement {
    constructor(props, parserService, workspaceService) {
        super(props);
        this.parserService = parserService;
        this.workspaceService = workspaceService;
    }
    async render(state, sizing, progress, token) {
        const { kind, testExampleFile } = this.props;
        let testDocument;
        try {
            testDocument = await this.workspaceService.openTextDocumentAndSnapshot(testExampleFile);
        }
        catch (e) {
            return undefined;
        }
        const codeExcerpt = await (0, summarizeDocumentHelpers_1.summarizeDocument)(this.parserService, testDocument, undefined, new vscodeTypes_1.Range(0, 0, 0, 0), sizing.tokenBudget);
        const references = [new prompt_tsx_1.PromptReference(testExampleFile)];
        const workspaceOfTestFile = this.workspaceService.getWorkspaceFolders().find(folder => testExampleFile.path.startsWith(folder.path));
        let pathToTestFile = testExampleFile.path;
        if (workspaceOfTestFile !== undefined) {
            pathToTestFile = path.relative(workspaceOfTestFile.path, testExampleFile.path);
            // Convert the path separator to be platform-independent
            pathToTestFile = pathToTestFile.split(path.sep).join('/');
        }
        switch (kind) {
            case 'candidateTestFile': {
                return (vscpp(tag_1.Tag, { name: 'testExample', priority: this.props.priority },
                    vscpp("references", { value: references }),
                    "Excerpt of the existing test file at `",
                    pathToTestFile,
                    "`:",
                    vscpp("br", null),
                    vscpp(safeElements_1.CodeBlock, { uri: testExampleFile, code: codeExcerpt.text, languageId: codeExcerpt.languageId }),
                    vscpp("br", null),
                    "Because a test file exists: ",
                    vscpp("br", null),
                    "- Do not generate preambles, like imports, copyright headers etc.",
                    vscpp("br", null),
                    "- Do generate code that can be appended to the existing test file."));
            }
            case 'anyTestFile': {
                return (vscpp(tag_1.Tag, { name: 'testExample', priority: this.props.priority },
                    "This is a sample test file:",
                    vscpp("br", null),
                    vscpp(safeElements_1.CodeBlock, { uri: testExampleFile, code: codeExcerpt.text, languageId: codeExcerpt.languageId })));
            }
        }
    }
};
exports.TestExample = TestExample;
exports.TestExample = TestExample = __decorate([
    __param(1, parserService_1.IParserService),
    __param(2, workspaceService_1.IWorkspaceService)
], TestExample);
//# sourceMappingURL=testExample.js.map