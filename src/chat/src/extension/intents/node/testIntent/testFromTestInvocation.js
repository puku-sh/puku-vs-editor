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
exports.TestFromTestInvocation = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../../platform/chat/common/commonTypes");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const notebooks_1 = require("../../../../util/common/notebooks");
const errors_1 = require("../../../../util/vs/base/common/errors");
const types_1 = require("../../../../util/vs/base/common/types");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const intents_1 = require("../../../prompt/node/intents");
const test2Impl_1 = require("../../../prompt/node/test2Impl");
const copilotIdentity_1 = require("../../../prompts/node/base/copilotIdentity");
const instructionMessage_1 = require("../../../prompts/node/base/instructionMessage");
const promptRenderer_1 = require("../../../prompts/node/base/promptRenderer");
const safetyRules_1 = require("../../../prompts/node/base/safetyRules");
const tag_1 = require("../../../prompts/node/base/tag");
const chatVariables_1 = require("../../../prompts/node/panel/chatVariables");
const conversationHistory_1 = require("../../../prompts/node/panel/conversationHistory");
const customInstructions_1 = require("../../../prompts/node/panel/customInstructions");
const safeElements_1 = require("../../../prompts/node/panel/safeElements");
const summarizedDocumentWithSelection_1 = require("./summarizedDocumentWithSelection");
const testDeps_1 = require("./testDeps");
const testInfoStorage_1 = require("./testInfoStorage");
const testPromptUtil_1 = require("./testPromptUtil");
const pseudoStartStopConversationCallback_1 = require("../../../prompt/node/pseudoStartStopConversationCallback");
/**
 * Invoke from within a test file
 */
let TestFromTestInvocation = class TestFromTestInvocation {
    constructor(intent, endpoint, location, context, alreadyConsumedChatVariable, instantiationService, testGenInfoStorage) {
        this.intent = intent;
        this.endpoint = endpoint;
        this.location = location;
        this.context = context;
        this.alreadyConsumedChatVariable = alreadyConsumedChatVariable;
        this.instantiationService = instantiationService;
        this.testGenInfoStorage = testGenInfoStorage;
        this.replyInterpreter = null;
    }
    async buildPrompt(promptContext, progress, token) {
        const testGenInfo = this.testGenInfoStorage.sourceFileToTest;
        if (testGenInfo !== undefined) {
            this.testGenInfoStorage.sourceFileToTest = undefined;
        }
        const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, this.endpoint, TestFromTestPrompt, {
            context: this.context,
            promptContext,
            alreadyConsumedChatVariable: this.alreadyConsumedChatVariable,
            testGenInfo,
        });
        const result = await renderer.render(progress, token);
        this.replyInterpreter = result.metadata.get(intents_1.ReplyInterpreterMetaData)?.replyInterpreter ?? null;
        return result;
    }
    async processResponse(context, inputStream, outputStream, token) {
        if (this.location === commonTypes_1.ChatLocation.Panel) {
            const responseProcessor = this.instantiationService.createInstance(pseudoStartStopConversationCallback_1.PseudoStopStartResponseProcessor, [], undefined);
            await responseProcessor.processResponse(context, inputStream, outputStream, token);
            return;
        }
        (0, types_1.assertType)(this.replyInterpreter !== null, 'TestFromTestInvocation should have received replyInterpreter from its prompt element');
        return this.replyInterpreter.processResponse(context, inputStream, outputStream, token);
    }
};
exports.TestFromTestInvocation = TestFromTestInvocation;
exports.TestFromTestInvocation = TestFromTestInvocation = __decorate([
    __param(5, instantiation_1.IInstantiationService),
    __param(6, testInfoStorage_1.ITestGenInfoStorage)
], TestFromTestInvocation);
let TestFromTestPrompt = class TestFromTestPrompt extends prompt_tsx_1.PromptElement {
    constructor(props, workspaceService, parserService) {
        super(props);
        this.workspaceService = workspaceService;
        this.parserService = parserService;
    }
    async render(_state, sizing) {
        const { history, query, chatVariables, } = this.props.promptContext;
        const { context, testGenInfo, alreadyConsumedChatVariable, } = this.props;
        if ((0, notebooks_1.isNotebookCellOrNotebookChatInput)(context.document.uri)) {
            throw (0, errors_1.illegalArgument)('TestFromTestPrompt should not be used for notebooks');
        }
        const testedSymbolIdentifier = testGenInfo?.identifier;
        const requestAndUserQuery = testGenInfo === undefined
            ? `Please, generate more tests, taking into account existing tests. ${query}`.trim()
            : (0, testPromptUtil_1.formatRequestAndUserQuery)({
                workspaceService: this.workspaceService,
                chatVariables,
                userQuery: query,
                testFileToWriteTo: context.document.uri,
                testedSymbolIdentifier,
                context,
            });
        let testedDeclarationExcerpt = undefined;
        if (testGenInfo !== undefined) {
            const srcFileDoc = await this.workspaceService.openTextDocument(testGenInfo.uri);
            const declStart = testGenInfo.target.start;
            const expandedRange = testGenInfo.target.with(declStart.with(declStart.line, 0));
            testedDeclarationExcerpt = srcFileDoc.getText(expandedRange);
        }
        const data = await summarizedDocumentWithSelection_1.SummarizedDocumentData.create(this.parserService, context.document, context.fileIndentInfo, context.wholeRange, summarizedDocumentWithSelection_1.SelectionSplitKind.Adjusted);
        const filteredChatVariables = alreadyConsumedChatVariable === undefined ? chatVariables : chatVariables.filter(v => v.reference !== alreadyConsumedChatVariable);
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are an AI programming assistant.",
                vscpp("br", null),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp("br", null),
                vscpp(safetyRules_1.SafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { passPriority: true, history: history, historyPriority: 700 },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    "The user has a ",
                    context.language.languageId,
                    " file opened in a code editor.",
                    vscpp("br", null),
                    "The user includes some code snippets from the file.",
                    vscpp("br", null),
                    "Answer with a single ",
                    context.language.languageId,
                    " code block.",
                    vscpp("br", null),
                    "Your expertise is strictly limited to software development topics.",
                    vscpp("br", null))),
            vscpp(prompt_tsx_1.UserMessage, null,
                vscpp(testDeps_1.TestDeps, { priority: 750, languageId: context.language.languageId }),
                vscpp(customInstructions_1.CustomInstructions, { chatVariables: filteredChatVariables, priority: 725, languageId: context.language.languageId, includeTestGenerationInstructions: true }),
                vscpp(chatVariables_1.ChatToolReferences, { priority: 750, promptContext: this.props.promptContext, flexGrow: 1 }),
                vscpp(chatVariables_1.ChatVariables, { priority: 750, chatVariables: filteredChatVariables }),
                vscpp(test2Impl_1.Test2Impl, { priority: 800, documentContext: context, srcFile: testGenInfo }),
                vscpp(tag_1.Tag, { name: "testsFile", priority: 900 },
                    vscpp(summarizedDocumentWithSelection_1.SummarizedDocumentWithSelection, { documentData: data, tokenBudget: sizing.tokenBudget / 3, _allowEmptySelection: true })),
                testGenInfo !== undefined && testedDeclarationExcerpt !== undefined && /* FIXME@ulugbekna: include class around */
                    vscpp(tag_1.Tag, { name: "codeToTest", priority: 900 },
                        `Repeating excerpt from \`${testGenInfo?.uri.path}\` here that needs to be tested:`,
                        vscpp("br", null),
                        vscpp(safeElements_1.CodeBlock, { uri: testGenInfo.uri, languageId: context.language.languageId, code: testedDeclarationExcerpt })),
                vscpp(tag_1.Tag, { name: "userPrompt", priority: 900 }, requestAndUserQuery))));
    }
};
TestFromTestPrompt = __decorate([
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, parserService_1.IParserService)
], TestFromTestPrompt);
//# sourceMappingURL=testFromTestInvocation.js.map