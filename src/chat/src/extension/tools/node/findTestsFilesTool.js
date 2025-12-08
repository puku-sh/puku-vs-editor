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
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const types_1 = require("../../../util/common/types");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const testFiles_1 = require("../../prompt/node/testFiles");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const tag_1 = require("../../prompts/node/base/tag");
const parserService_1 = require("../../../platform/parser/node/parserService");
const testDeps_1 = require("../../intents/node/testIntent/testDeps");
const summarizeDocumentHelpers_1 = require("../../prompts/node/inline/summarizedDocument/summarizeDocumentHelpers");
const safeElements_1 = require("../../prompts/node/panel/safeElements");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolUtils_1 = require("../common/toolUtils");
const toolUtils_2 = require("./toolUtils");
let FindTestFilesTool = class FindTestFilesTool extends lifecycle_1.Disposable {
    static { this.toolName = toolNames_1.ToolName.FindTestFiles; }
    constructor(instantiationService, workspaceService, promptPathRepresentationService, ignoreService) {
        super();
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.ignoreService = ignoreService;
        this._testFileFinder = this.instantiationService.createInstance(testFiles_1.TestFileFinder);
    }
    async invoke(options, token) {
        let languageId;
        const inputUris = [];
        const testFiles = [];
        const anyTestFiles = [];
        const srcFiles = [];
        let lookForAnyTestFile;
        await Promise.all(options.input.filePaths.map(async (filePath) => {
            const uri = this.promptPathRepresentationService.resolveFilePath(filePath);
            if (!uri) {
                throw new Error(`Invalid input path ${filePath}`);
            }
            if (await this.ignoreService.isCopilotIgnored(uri)) {
                return;
            }
            const document = await this.workspaceService.openTextDocumentAndSnapshot(uri);
            inputUris.push(document.uri);
            if (languageId === undefined) {
                languageId = document.languageId;
            }
            if (token.isCancellationRequested) {
                return;
            }
            if ((0, testFiles_1.isTestFile)(document)) {
                const srcFileUri = await this._testFileFinder.findFileForTestFile(document, token);
                if (srcFileUri && !await this.ignoreService.isCopilotIgnored(srcFileUri)) {
                    const srcFileDocument = await this.workspaceService.openTextDocumentAndSnapshot(srcFileUri);
                    srcFiles.push({ srcFile: srcFileUri, testFile: document.uri, document: srcFileDocument });
                }
            }
            else {
                const testFileUri = await this._testFileFinder.findTestFileForSourceFile(document, token);
                if (testFileUri) {
                    const testFileDocument = await this.workspaceService.openTextDocumentAndSnapshot(testFileUri);
                    testFiles.push({ srcFile: document.uri, testFile: testFileUri, document: testFileDocument });
                }
            }
        }));
        (0, toolUtils_2.checkCancellation)(token);
        if (testFiles.length === 0 && lookForAnyTestFile) {
            const testFileUri = await this._testFileFinder.findAnyTestFileForSourceFile(lookForAnyTestFile, token);
            if (testFileUri && !await this.ignoreService.isCopilotIgnored(testFileUri)) {
                const testFileDocument = await this.workspaceService.openTextDocumentAndSnapshot(testFileUri);
                anyTestFiles.push({ srcFile: lookForAnyTestFile.uri, testFile: testFileUri, document: testFileDocument });
            }
        }
        const nTestFilesFound = testFiles.length + srcFiles.length + anyTestFiles.length;
        const props = {
            languageId: languageId,
            testFiles,
            srcFiles,
            anyTestFiles
        };
        const result = new vscodeTypes_1.ExtendedLanguageModelToolResult([
            new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, FindTestFilesToolOutput, props, options.tokenizationOptions, token))
        ]);
        result.toolResultMessage = nTestFilesFound === 0 ?
            new vscodeTypes_1.MarkdownString(l10n.t `Checked ${this.formatURIs(inputUris)} for test related files, none found`) :
            nTestFilesFound === 1 ?
                new vscodeTypes_1.MarkdownString(l10n.t `Checked ${this.formatURIs(inputUris)}, 1 file found`) :
                new vscodeTypes_1.MarkdownString(l10n.t `Checked ${this.formatURIs(inputUris)}, ${nTestFilesFound} files found`);
        return result;
    }
    prepareInvocation(options, token) {
        if (!options.input.filePaths?.length) {
            throw new Error('Invalid input');
        }
        const uris = options.input.filePaths.map(filePath => (0, toolUtils_2.resolveToolInputPath)(filePath, this.promptPathRepresentationService));
        if (uris.some(uri => uri === undefined)) {
            throw new Error('Invalid input');
        }
        return {
            invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Checking ${this.formatURIs(uris)}`),
        };
    }
    formatURIs(uris) {
        return uris.map(toolUtils_1.formatUriForFileWidget).join(', ');
    }
    async provideInput(promptContext) {
        const seen = new Set();
        const filePaths = [];
        const ranges = [];
        function addPath(path, range) {
            if (!seen.has(path)) {
                seen.add(path);
                filePaths.push(path);
                ranges.push(range && [range.start.line, range.start.character, range.end.line, range.end.character]);
            }
        }
        for (const ref of promptContext.chatVariables) {
            if (uri_1.URI.isUri(ref.value)) {
                addPath(this.promptPathRepresentationService.getFilePath(ref.value), undefined);
            }
            else if ((0, types_1.isLocation)(ref.value)) {
                addPath(this.promptPathRepresentationService.getFilePath(ref.value.uri), ref.value.range);
            }
        }
        if (promptContext.workingSet) {
            for (const file of promptContext.workingSet) {
                addPath(this.promptPathRepresentationService.getFilePath(file.document.uri), file.range);
            }
        }
        if (!filePaths.length) {
            // no context variables or working set
        }
        return {
            filePaths,
            ranges
        };
    }
};
FindTestFilesTool = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(3, ignoreService_1.IIgnoreService)
], FindTestFilesTool);
toolsRegistry_1.ToolRegistry.registerTool(FindTestFilesTool);
let FindTestFilesToolOutput = class FindTestFilesToolOutput extends prompt_tsx_1.PromptElement {
    constructor(props, parserService) {
        super(props);
        this.parserService = parserService;
    }
    async render(_state, sizing) {
        if (this.props.testFiles.length === 0 && this.props.srcFiles.length === 0 && this.props.anyTestFiles.length === 0) {
            return vscpp(vscppf, null, "No test related files found.");
        }
        const tokenSizing = Math.min(sizing.tokenBudget, 32_000);
        const documentData = [...this.props.testFiles, ...this.props.anyTestFiles, ...this.props.srcFiles].map(info => ({ document: info.document, formattingOptions: undefined, selection: undefined }));
        const docs = await (0, summarizeDocumentHelpers_1.summarizeDocuments)(this.parserService, documentData, tokenSizing);
        let index = 0;
        return vscpp(vscppf, null,
            vscpp(testDeps_1.TestDeps, { languageId: this.props.languageId }),
            "The following files are useful when writing tests: ",
            vscpp("br", null),
            this.props.testFiles.map(info => vscpp(RelatedTestDescription, { info: info, projectedDoc: docs[index++] })),
            this.props.anyTestFiles.map(info => vscpp(ExampleTestDescription, { info: info, projectedDoc: docs[index++] })),
            this.props.srcFiles.map(info => vscpp(RelatedSourceDescription, { info: info, projectedDoc: docs[index++] })));
    }
};
FindTestFilesToolOutput = __decorate([
    __param(1, parserService_1.IParserService)
], FindTestFilesToolOutput);
let RelatedSourceDescription = class RelatedSourceDescription extends prompt_tsx_1.PromptElement {
    constructor(props, promptPathRepresentationService) {
        super(props);
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    render(state, sizing) {
        const document = this.props.info.document;
        return vscpp(tag_1.Tag, { name: 'relatedSource' },
            "The test file ",
            this.promptPathRepresentationService.getFilePath(this.props.info.testFile),
            " contains tests for the following file:",
            vscpp("br", null),
            vscpp(safeElements_1.CodeBlock, { code: this.props.projectedDoc.text, uri: document.uri, languageId: document.languageId, includeFilepath: true }),
            vscpp("br", null));
    }
};
RelatedSourceDescription = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], RelatedSourceDescription);
let RelatedTestDescription = class RelatedTestDescription extends prompt_tsx_1.PromptElement {
    constructor(props, promptPathRepresentationService) {
        super(props);
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    render(state, sizing) {
        const document = this.props.info.document;
        return vscpp(tag_1.Tag, { name: 'relatedTest' },
            "Tests for ",
            this.promptPathRepresentationService.getFilePath(this.props.info.srcFile),
            " can go into the following existing file:",
            vscpp("br", null),
            vscpp(safeElements_1.CodeBlock, { code: this.props.projectedDoc.text, uri: document.uri, languageId: document.languageId, includeFilepath: true }),
            vscpp("br", null));
    }
};
RelatedTestDescription = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], RelatedTestDescription);
class ExampleTestDescription extends prompt_tsx_1.PromptElement {
    constructor(props) {
        super(props);
    }
    render(state, sizing) {
        return vscpp(tag_1.Tag, { name: 'sampleTest' },
            "This is a sample test file:",
            vscpp("br", null),
            vscpp(safeElements_1.CodeBlock, { code: this.props.projectedDoc.text, uri: this.props.info.document.uri, languageId: this.props.info.document.languageId, includeFilepath: true }),
            vscpp("br", null));
    }
}
//# sourceMappingURL=findTestsFilesTool.js.map