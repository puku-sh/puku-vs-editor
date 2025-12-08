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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestFromSourceInvocation = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const assert_1 = __importDefault(require("assert"));
const commonTypes_1 = require("../../../../platform/chat/common/commonTypes");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const path = __importStar(require("../../../../util/vs/base/common/path"));
const types_1 = require("../../../../util/vs/base/common/types");
const stringEdit_1 = require("../../../../util/vs/editor/common/core/edits/stringEdit");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const intents_1 = require("../../../prompt/node/intents");
const pseudoStartStopConversationCallback_1 = require("../../../prompt/node/pseudoStartStopConversationCallback");
const streamingEdits_1 = require("../../../prompt/node/streamingEdits");
const testExample_1 = require("../../../prompt/node/testExample");
const testFiles_1 = require("../../../prompt/node/testFiles");
const copilotIdentity_1 = require("../../../prompts/node/base/copilotIdentity");
const instructionMessage_1 = require("../../../prompts/node/base/instructionMessage");
const promptRenderer_1 = require("../../../prompts/node/base/promptRenderer");
const safetyRules_1 = require("../../../prompts/node/base/safetyRules");
const tag_1 = require("../../../prompts/node/base/tag");
const promptingSummarizedDocument_1 = require("../../../prompts/node/inline/promptingSummarizedDocument");
const summarizeDocument_1 = require("../../../prompts/node/inline/summarizedDocument/summarizeDocument");
const summarizeDocumentHelpers_1 = require("../../../prompts/node/inline/summarizedDocument/summarizeDocumentHelpers");
const streaming_1 = require("../../../prompts/node/inline/utils/streaming");
const chatVariables_1 = require("../../../prompts/node/panel/chatVariables");
const conversationHistory_1 = require("../../../prompts/node/panel/conversationHistory");
const customInstructions_1 = require("../../../prompts/node/panel/customInstructions");
const safeElements_1 = require("../../../prompts/node/panel/safeElements");
const testDeps_1 = require("./testDeps");
const testPromptUtil_1 = require("./testPromptUtil");
/**
 * Invoke from within a non-test file
 */
let TestFromSourceInvocation = class TestFromSourceInvocation {
    constructor(intent, endpoint, location, documentContext, alreadyConsumedChatVariable, instantiationService, workspaceService, ignoreService, _parserService) {
        this.intent = intent;
        this.endpoint = endpoint;
        this.location = location;
        this.documentContext = documentContext;
        this.alreadyConsumedChatVariable = alreadyConsumedChatVariable;
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
        this.ignoreService = ignoreService;
        this._parserService = _parserService;
        this._testFileFinder = this.instantiationService.createInstance(testFiles_1.TestFileFinder);
    }
    async buildPrompt(promptContext, progress, token) {
        (0, assert_1.default)(!(0, testFiles_1.isTestFile)(this.documentContext.document), 'TestFromSourceInvocation should not be invoked from a test file');
        // identify in which file generated tests will be placed at
        const testExampleFile = await this.findTestFileForSourceFile(token);
        if (testExampleFile !== null && testExampleFile.kind === 'candidateTestFile') {
            this._testFileToWriteTo = {
                kind: 'existing',
                uri: testExampleFile.testExampleFile,
            };
        }
        else {
            const testFileUri = (0, testFiles_1.suggestUntitledTestFileLocation)(this.documentContext.document);
            this._testFileToWriteTo = {
                kind: 'new',
                uri: testFileUri,
            };
        }
        let range;
        if (this._testFileToWriteTo.kind === 'new') {
            range = new vscodeTypes_1.Range(0, 0, 0, 0);
        }
        else {
            const testFileUri = this._testFileToWriteTo.uri;
            const testFile = await this.workspaceService.openTextDocument(testFileUri);
            const testFileAST = this._parserService.getTreeSitterAST(testFile);
            const lastTest = testFileAST ? await testFileAST.findLastTest() : null;
            if (lastTest === null) {
                range = new vscodeTypes_1.Range(testFile.lineCount, 0, testFile.lineCount, 0);
            }
            else {
                const lastLineOfTest = testFile.positionAt(lastTest.endIndex);
                const lineAfterLastLine = lastLineOfTest.line + 1;
                range = new vscodeTypes_1.Range(lastLineOfTest.line, lastLineOfTest.character, lineAfterLastLine, 0);
            }
        }
        progress.report(new vscodeTypes_1.ChatResponseMovePart(this._testFileToWriteTo.uri, range)); // FIXME@ulugbekna
        if (this.location === commonTypes_1.ChatLocation.Panel && !promptContext.query) {
            promptContext = { ...promptContext, query: 'Write a set of detailed unit test functions for the code above.', };
        }
        const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, this.endpoint, Prompt, {
            context: this.documentContext,
            endpoint: this.endpoint,
            location: this.location,
            testExampleFile,
            testFileToWriteTo: this._testFileToWriteTo,
            promptContext,
            alreadyConsumedChatVariable: this.alreadyConsumedChatVariable,
        });
        const result = await renderer.render(progress, token); // FIXME@ulugbekna
        return result;
    }
    async processResponse(context, inputStream, outputStream, token) {
        if (this.location === commonTypes_1.ChatLocation.Panel) {
            const responseProcessor = this.instantiationService.createInstance(pseudoStartStopConversationCallback_1.PseudoStopStartResponseProcessor, [], undefined);
            await responseProcessor.processResponse(context, inputStream, outputStream, token);
            return;
        }
        const doc = this.documentContext.document;
        const additionalParts = this._additionalResponseParts;
        this._additionalResponseParts = undefined;
        const testFileKind = this._testFileToWriteTo?.kind;
        const testFileUri = this._testFileToWriteTo?.uri;
        this._testFileToWriteTo = undefined;
        if (testFileKind === undefined || testFileUri === undefined) {
            (0, types_1.assertType)(additionalParts, 'Expected to have a textual response without a test file');
        }
        else if (testFileKind === 'new') {
            const range = new vscodeTypes_1.Range(0, 0, 0, 0);
            const projectedDoc = new summarizeDocument_1.ProjectedDocument('', stringEdit_1.StringEdit.empty, doc.languageId);
            const replyInterpreter = new promptingSummarizedDocument_1.InlineReplyInterpreter(testFileUri, projectedDoc, this.documentContext.fileIndentInfo, intents_1.LeadingMarkdownStreaming.Emit, 1 /* EarlyStopping.StopAfterFirstCodeBlock */, (lineFilter, streamingWorkingCopyDocument) => new streamingEdits_1.InsertionStreamingEdits(streamingWorkingCopyDocument, range.start, lineFilter), streamingEdits_1.TextPieceClassifiers.createCodeBlockClassifier(), _ => true);
            await replyInterpreter.processResponse(context, inputStream, outputStream, token);
        }
        else {
            const testFile = await this.workspaceService.openTextDocumentAndSnapshot(testFileUri);
            const testFileAST = this._parserService.getTreeSitterAST(testFile);
            const lastTest = testFileAST ? await testFileAST.findLastTest() : null;
            let range;
            if (lastTest === null) {
                range = new vscodeTypes_1.Range(testFile.lineCount, 0, testFile.lineCount, 0);
            }
            else {
                const lastLineOfTest = testFile.positionAt(lastTest.endIndex);
                const lineAfterLastLine = lastLineOfTest.line + 1;
                range = new vscodeTypes_1.Range(lastLineOfTest.line, lastLineOfTest.character, lineAfterLastLine, 0);
            }
            const summarizedDocument = await (0, promptingSummarizedDocument_1.createPromptingSummarizedDocument)(this._parserService, testFile, this.documentContext.fileIndentInfo, range, testFile.getText().length // @ulugbekna: we shouldn't be restricted on the token size because we're not sending it in the prompt
            );
            const splitDoc = summarizedDocument.splitAroundOriginalSelectionEnd();
            // FIXME@ulugbekna: we shouldn't need this
            // const { codeAbove, hasContent, codeBelow } = splitDoc;
            const placeHolder = '$PLACEHOLDER$';
            // const code = `${codeAbove}${placeHolder}${codeBelow}`;
            const replyInterpreter = splitDoc.createReplyInterpreter(streaming_1.StreamPipe.chain(markdownStream => (0, streaming_1.replaceStringInStream)(markdownStream, "`" + placeHolder + "`", 'selection'), markdownStream => (0, streaming_1.replaceStringInStream)(markdownStream, placeHolder, 'selection')), 1 /* EarlyStopping.StopAfterFirstCodeBlock */, splitDoc.insertStreaming, streamingEdits_1.TextPieceClassifiers.createCodeBlockClassifier(), line => line.value.trim() !== placeHolder);
            await replyInterpreter.processResponse(context, inputStream, outputStream, token);
        }
        additionalParts?.forEach(p => outputStream.push(p));
    }
    /**
     * Finds either a test file corresponding to the source file or any test file within the workspace.
     * The found test file is used in the prompt.
     *
     * @remark respects copilot-ignored
     */
    async findTestFileForSourceFile(token) {
        let kind;
        let testExampleFile = await this._testFileFinder.findTestFileForSourceFile(this.documentContext.document, token);
        if (token.isCancellationRequested) {
            return null;
        }
        if (testExampleFile !== undefined) {
            kind = 'candidateTestFile';
        }
        else {
            const anyTestFile = await this._testFileFinder.findAnyTestFileForSourceFile(this.documentContext.document, token);
            if (token.isCancellationRequested) {
                return null;
            }
            kind = 'anyTestFile';
            testExampleFile = anyTestFile;
        }
        if (testExampleFile === undefined || (await this.ignoreService.isCopilotIgnored(testExampleFile))) {
            return null;
        }
        return { kind, testExampleFile };
    }
};
exports.TestFromSourceInvocation = TestFromSourceInvocation;
exports.TestFromSourceInvocation = TestFromSourceInvocation = __decorate([
    __param(5, instantiation_1.IInstantiationService),
    __param(6, workspaceService_1.IWorkspaceService),
    __param(7, ignoreService_1.IIgnoreService),
    __param(8, parserService_1.IParserService)
], TestFromSourceInvocation);
let Prompt = class Prompt extends prompt_tsx_1.PromptElement {
    constructor(props, parserService, workspaceService) {
        super(props);
        this.parserService = parserService;
        this.workspaceService = workspaceService;
    }
    async render(state, sizing) {
        const { history, query, chatVariables, } = this.props.promptContext;
        const { context, testExampleFile, testFileToWriteTo, location, alreadyConsumedChatVariable } = this.props;
        // get testable node
        const treeSitterAST = this.parserService.getTreeSitterAST(context.document);
        let userSelection = context.selection;
        let testedSymbolIdentifier;
        let nodeKind;
        if (treeSitterAST !== undefined) {
            const node = await treeSitterAST.getNodeToDocument((0, parserService_1.vscodeToTreeSitterOffsetRange)(context.selection, context.document));
            userSelection = (0, parserService_1.treeSitterOffsetRangeToVSCodeRange)(context.document, node.nodeToDocument);
            testedSymbolIdentifier = node.nodeIdentifier;
            nodeKind = node.nodeToDocument.type;
        }
        const documentSummarizationSettings = (
        // special score function for TS/TSX classes and methods
        // we want to preserve constructor's and other methods' signatures
        ['typescript', 'typescriptreact'].includes(context.document.languageId) &&
            nodeKind !== undefined && ['class_declaration', 'method_definition'].includes(nodeKind))
            ? {
                costFnOverride: (node, currentScore) => {
                    return !node ? currentScore : node.kind === 'constructor' || node.kind === 'method_definition' ? 0 : currentScore;
                }
            }
            : undefined;
        const summarization = await (0, summarizeDocumentHelpers_1.summarizeDocument)(this.parserService, context.document, context.fileIndentInfo, userSelection, sizing.tokenBudget / 2, // leave half of token budget to response
        documentSummarizationSettings);
        // get test frameworks info
        const languageId = context.language.languageId;
        const extraContext = await this.computeLangSpecificExtraGuidelines(context, testExampleFile);
        const requestAndUserQuery = (0, testPromptUtil_1.formatRequestAndUserQuery)({
            workspaceService: this.workspaceService,
            chatVariables,
            userQuery: query,
            testFileToWriteTo: testFileToWriteTo.uri,
            testedSymbolIdentifier,
            context,
        });
        const srcFilePath = (0, testPromptUtil_1.relativeToWorkspace)(this.workspaceService, context.document.uri.path) ?? path.basename(context.document.uri.path);
        const filteredChatVariables = alreadyConsumedChatVariable === undefined ? chatVariables : chatVariables.filter(v => v.reference !== alreadyConsumedChatVariable);
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are an AI programming assistant.",
                vscpp("br", null),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp("br", null),
                vscpp(safetyRules_1.SafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { history: history, passPriority: true, historyPriority: 700 },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    location === commonTypes_1.ChatLocation.Editor
                        ? vscpp(vscppf, null,
                            "The user has a ",
                            languageId,
                            " file opened in a code editor.",
                            vscpp("br", null),
                            "The user includes some code snippets from the file.",
                            vscpp("br", null),
                            "Answer with a single ",
                            languageId,
                            " code block.")
                        : location === commonTypes_1.ChatLocation.Panel
                            ? vscpp(vscppf, null,
                                "First think step-by-step - describe your plan for what to build in pseudocode, written out in great detail.",
                                vscpp("br", null),
                                "Then output the code in a single code block.",
                                vscpp("br", null),
                                "Minimize any other prose.",
                                vscpp("br", null),
                                "Use Markdown formatting in your answers.",
                                vscpp("br", null),
                                "Make sure to include the programming language name at the start of the Markdown code blocks.",
                                vscpp("br", null),
                                "Avoid wrapping the whole response in triple backticks.",
                                vscpp("br", null),
                                "The user works in an IDE called Visual Studio Code which has a concept for editors with open files, integrated unit test support, an output pane that shows the output of running the code as well as an integrated terminal.",
                                vscpp("br", null),
                                "The active document is the source code the user is looking at right now.",
                                vscpp("br", null),
                                "You can only give one reply for each conversation turn.")
                            : undefined // @ulugbekna: should be unreachable
                ,
                    extraContext.length > 0 && vscpp(vscppf, null,
                        vscpp("br", null),
                        " ",
                        extraContext))),
            vscpp(prompt_tsx_1.UserMessage, null,
                vscpp(testDeps_1.TestDeps, { languageId: languageId, priority: 750 }),
                vscpp(customInstructions_1.CustomInstructions, { chatVariables: filteredChatVariables, languageId: context.language.languageId, includeTestGenerationInstructions: true, priority: 725 }),
                vscpp(chatVariables_1.ChatToolReferences, { priority: 750, promptContext: this.props.promptContext, flexGrow: 1 }),
                vscpp(chatVariables_1.ChatVariables, { priority: 750, chatVariables: filteredChatVariables }),
                testExampleFile !== null && vscpp(testExample_1.TestExample, { priority: 750, ...testExampleFile }),
                vscpp(tag_1.Tag, { name: "currentFile", priority: 900 },
                    "Here is the current file at `",
                    srcFilePath,
                    "`:",
                    vscpp("br", null),
                    vscpp("br", null),
                    vscpp(safeElements_1.CodeBlock, { uri: context.document.uri, languageId: context.document.languageId, code: summarization.text }),
                    vscpp("br", null),
                    vscpp("br", null),
                    requestAndUserQuery))));
    }
    async computeLangSpecificExtraGuidelines(context, testExampleFile) {
        const extraContext = [];
        if (context.document.languageId === 'python') {
            const usingExistingTestFile = testExampleFile !== null && testExampleFile.kind === 'candidateTestFile';
            if (!usingExistingTestFile) {
                extraContext.push('Make sure your answer imports the function to test as this is a total new file.');
                // this will be true if there is not a candidate test file so goal is creating a new test file which will require imports
                const parent = path.dirname(context.document.uri.fsPath);
                const init_search = path.join(parent, '__init__.py');
                const workspaceRootPath = this.workspaceService.getWorkspaceFolder(context.document.uri);
                try {
                    await this.workspaceService.openTextDocument(vscodeTypes_1.Uri.file(init_search));
                    if (workspaceRootPath !== undefined && path.resolve(parent) === path.resolve(workspaceRootPath?.fsPath ?? '')) {
                        /* current file is at the root of the workspace */
                        extraContext.push('The file is in the root of the workspace, which has an __init__.py but use an absolute import to import the function to test.');
                    }
                    else {
                        extraContext.push('The parent directory of the given file has an __init__.py file making it a regular package. Use a relative import to import the function to test.');
                    }
                }
                catch (error) {
                    extraContext.push('The parent directory of the given file has no __init__.py file making it a namespace package. Use an absolute import to import the function to test.');
                }
            }
        }
        return extraContext.join('\n');
    }
};
Prompt = __decorate([
    __param(1, parserService_1.IParserService),
    __param(2, workspaceService_1.IWorkspaceService)
], Prompt);
//# sourceMappingURL=testFromSrcInvocation.js.map