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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchConversationOptions = fetchConversationOptions;
exports.generateScenarioTestRunner = generateScenarioTestRunner;
exports.shouldSkip = shouldSkip;
const assert_1 = __importDefault(require("assert"));
const fs = __importStar(require("fs"));
const codeBlockProcessor_1 = require("../../src/extension/codeBlocks/node/codeBlockProcessor");
const constants_1 = require("../../src/extension/common/constants");
require("../../src/extension/intents/node/allIntents");
const chatParticipantRequestHandler_1 = require("../../src/extension/prompt/node/chatParticipantRequestHandler");
const documentContext_1 = require("../../src/extension/prompt/node/documentContext");
const codeMapper_1 = require("../../src/extension/prompts/node/codeMapper/codeMapper");
const toolNames_1 = require("../../src/extension/tools/common/toolNames");
require("../../src/extension/tools/node/allTools");
const chatAgents_1 = require("../../src/platform/chat/common/chatAgents");
const conversationOptions_1 = require("../../src/platform/chat/common/conversationOptions");
const tabsAndEditorsService_1 = require("../../src/platform/tabs/common/tabsAndEditorsService");
const isInExtensionHost_1 = require("../../src/platform/test/node/isInExtensionHost");
const simulationWorkspace_1 = require("../../src/platform/test/node/simulationWorkspace");
const mockChatResponseStream_1 = require("../../src/util/common/test/mockChatResponseStream");
const chatTypes_1 = require("../../src/util/common/test/shims/chatTypes");
const cancellation_1 = require("../../src/util/vs/base/common/cancellation");
const event_1 = require("../../src/util/vs/base/common/event");
const lifecycle_1 = require("../../src/util/vs/base/common/lifecycle");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../src/vscodeTypes");
const simulationWorkspaceExtHost_1 = require("../base/extHostContext/simulationWorkspaceExtHost");
const stest_1 = require("../base/stest");
const sharedTypes_1 = require("../simulation/shared/sharedTypes");
const testHelper_1 = require("./testHelper");
/**
 * Grabs the default conversation options. Copied over from conversationFeature.ts
 * TODO @lramos15, these should use the same code as conversationFeature.ts
 */
function fetchConversationOptions() {
    const maxResponseTokens = undefined;
    const temperature = 0.1;
    const topP = 1;
    const options = {
        _serviceBrand: undefined,
        maxResponseTokens: maxResponseTokens,
        temperature: temperature,
        topP: topP,
        rejectionMessage: 'Sorry, but I can only assist with programming related questions.',
    };
    return options;
}
function generateScenarioTestRunner(scenario, evaluator) {
    return async function (testingServiceCollection) {
        const disposables = new lifecycle_1.DisposableStore();
        try {
            testingServiceCollection.define(conversationOptions_1.IConversationOptions, fetchConversationOptions());
            const simulationWorkspace = disposables.add(isInExtensionHost_1.isInExtensionHost ? new simulationWorkspaceExtHost_1.SimulationWorkspaceExtHost() : new simulationWorkspace_1.SimulationWorkspace());
            simulationWorkspace.setupServices(testingServiceCollection);
            const accessor = testingServiceCollection.createTestingAccessor();
            const testContext = accessor.get(stest_1.ISimulationTestRuntime);
            const log = (message, err) => testContext.log(message, err);
            const history = [];
            for (let i = 0; i < scenario.length; i++) {
                const testCase = scenario[i];
                simulationWorkspace.resetFromDeserializedWorkspaceState(testCase.getState?.());
                await testCase.setupCase?.(accessor, simulationWorkspace);
                const mockProgressReporter = new mockChatResponseStream_1.SpyChatResponseStream();
                log(`> Query "${testCase.question}"\n`);
                const parsedQuery = await (0, testHelper_1.parseQueryForScenarioTest)(accessor, testCase, simulationWorkspace);
                const participantId = (parsedQuery.participantName && (0, chatAgents_1.getChatParticipantIdFromName)(parsedQuery.participantName)) ?? '';
                const request = { prompt: parsedQuery.query, references: parsedQuery.variables, command: parsedQuery.command, location: vscodeTypes_1.ChatLocation.Panel, location2: undefined, attempt: 0, enableCommandDetection: false, isParticipantDetected: false, toolReferences: parsedQuery.toolReferences, toolInvocationToken: undefined, model: null, tools: new Map(), id: '1', sessionId: '1' };
                if (testCase.tools) {
                    for (const [toolName, shouldUse] of Object.entries(testCase.tools)) {
                        request.tools.set((0, toolNames_1.getContributedToolName)(toolName), shouldUse);
                    }
                }
                const interactiveSession = accessor.get(instantiation_1.IInstantiationService).createInstance(chatParticipantRequestHandler_1.ChatParticipantRequestHandler, history, request, mockProgressReporter, cancellation_1.CancellationToken.None, {
                    agentId: participantId,
                    agentName: parsedQuery.participantName || '',
                    intentId: (!parsedQuery.participantName && parsedQuery.command) ? parsedQuery.command :
                        parsedQuery.command ? constants_1.agentsToCommands[parsedQuery.participantName][parsedQuery.command] :
                            parsedQuery.participantName,
                }, event_1.Event.None);
                const result = await interactiveSession.getResult();
                assert_1.default.ok(!result.errorDetails, result.errorDetails?.message);
                history.push(new chatTypes_1.ChatRequestTurn(request.prompt, request.command, [...request.references], (0, chatAgents_1.getChatParticipantIdFromName)(participantId), []));
                history.push(new chatTypes_1.ChatResponseTurn(mockProgressReporter.items.filter(x => x instanceof vscodeTypes_1.ChatResponseMarkdownPart || x instanceof vscodeTypes_1.ChatResponseAnchorPart), result, participantId, request.command));
                testCase.answer = mockProgressReporter.currentProgress;
                const turn = interactiveSession.conversation.getLatestTurn();
                const fullResponse = turn?.responseMessage?.message ?? '';
                accessor.get(stest_1.ISimulationTestRuntime).setOutcome({
                    kind: 'answer',
                    content: fullResponse
                });
                // Use the evaluator passed to us to evaluate if the response is correct
                log(`## Response:\n${fullResponse}\n`);
                log(`## Commands:\n`);
                const commands = mockProgressReporter.commandButtons;
                for (const command of commands) {
                    log(`- ${JSON.stringify(command)}\n`);
                }
                if (scenario[i].applyChatCodeBlocks) {
                    const codeBlocks = turn?.getMetadata(codeBlockProcessor_1.CodeBlocksMetadata)?.codeBlocks ?? [];
                    const testRuntime = accessor.get(stest_1.ISimulationTestRuntime);
                    if (codeBlocks.length !== 0) {
                        const codeMapper = accessor.get(instantiation_1.IInstantiationService).createInstance(codeMapper_1.CodeMapper);
                        const changedDocs = new Map();
                        // Apply Code Block Changes
                        let codeBlockApplyErrorDetails = undefined;
                        for (const codeBlock of codeBlocks) {
                            const prevDocument = simulationWorkspace.activeTextEditor?.document;
                            // Set the active document if the code resource has a uri
                            if (codeBlock.resource) {
                                simulationWorkspace.setCurrentDocument(codeBlock.resource);
                            }
                            const editor = accessor.get(tabsAndEditorsService_1.ITabsAndEditorsService).activeTextEditor;
                            const codeMap = codeBlock.code;
                            const document = simulationWorkspace.activeTextEditor.document;
                            const documentContext = documentContext_1.IDocumentContext.fromEditor(editor);
                            const workspacePath = simulationWorkspace.getFilePath(document.uri);
                            const previousTextContent = document.getText();
                            const response = {
                                textEdit(target, edits) {
                                    simulationWorkspace.applyEdits(target, Array.isArray(edits) ? edits : [edits]);
                                },
                                notebookEdit(target, edits) {
                                    simulationWorkspace.applyNotebookEdits(target, Array.isArray(edits) ? edits : [edits]);
                                },
                            };
                            const input = { createNew: false, codeBlock: codeMap, uri: document.uri, markdownBeforeBlock: undefined, existingDocument: documentContext.document };
                            const result = await codeMapper.mapCode(input, response, undefined, cancellation_1.CancellationToken.None);
                            if (!result) {
                                codeBlockApplyErrorDetails = {
                                    message: `Code block changes failed to apply to ${document.uri.toString()}`,
                                };
                                break;
                            }
                            if (result.errorDetails) {
                                result.errorDetails.message = `Code block changes failed to apply to ${document.uri.toString()}:\n${result.errorDetails.message}`;
                                codeBlockApplyErrorDetails = result.errorDetails;
                                break;
                            }
                            const postEditTextContent = editor.document.getText();
                            if (previousTextContent !== postEditTextContent) {
                                const previousChange = changedDocs.get(workspacePath);
                                if (previousChange) {
                                    previousChange.postContent = postEditTextContent;
                                    changedDocs.set(workspacePath, previousChange);
                                }
                                else {
                                    changedDocs.set(workspacePath, { document, originalContent: previousTextContent, postContent: postEditTextContent });
                                }
                            }
                            if (prevDocument) {
                                simulationWorkspace.setCurrentDocument(prevDocument.uri);
                            }
                        }
                        // Log the changed files
                        const changedFilePaths = [];
                        if (!codeBlockApplyErrorDetails && changedDocs.size > 0) {
                            const seenDoc = new Set();
                            for (const [workspacePath, changes] of changedDocs.entries()) {
                                if (seenDoc.has(workspacePath)) {
                                    continue;
                                }
                                seenDoc.add(workspacePath);
                                if ((0, simulationWorkspace_1.isNotebook)(changes.document.uri)) {
                                    await testRuntime.writeFile(workspacePath + '.txt', changes.originalContent, sharedTypes_1.INLINE_INITIAL_DOC_TAG); // using .txt instead of real file extension to avoid breaking automation scripts
                                    changedFilePaths.push({
                                        workspacePath,
                                        relativeDiskPath: await testRuntime.writeFile(workspacePath, changes.postContent, sharedTypes_1.INLINE_CHANGED_DOC_TAG),
                                        languageId: changes.document.languageId
                                    });
                                }
                                else {
                                    await testRuntime.writeFile(workspacePath + '.txt', changes.originalContent, sharedTypes_1.INLINE_INITIAL_DOC_TAG); // using .txt instead of real file extension to avoid breaking automation scripts
                                    changedFilePaths.push({
                                        workspacePath,
                                        relativeDiskPath: await testRuntime.writeFile(workspacePath, changes.postContent, sharedTypes_1.INLINE_CHANGED_DOC_TAG),
                                        languageId: changes.document.languageId
                                    });
                                }
                            }
                            testRuntime.setOutcome({
                                kind: 'edit',
                                files: changedFilePaths.map(f => ({ srcUri: f.workspacePath, post: f.relativeDiskPath }))
                            });
                        }
                        else if (codeBlockApplyErrorDetails) {
                            testRuntime.setOutcome({
                                kind: 'failed',
                                error: codeBlockApplyErrorDetails.message,
                                hitContentFilter: codeBlockApplyErrorDetails.responseIsFiltered ?? false,
                                critical: false
                            });
                        }
                    }
                }
                const evaluatedResponse = await evaluator(accessor, testCase.question, mockProgressReporter.currentProgress, fullResponse, turn, i, commands, mockProgressReporter.confirmations, mockProgressReporter.fileTrees);
                assert_1.default.ok(evaluatedResponse.success, evaluatedResponse.errorMessage);
            }
        }
        finally {
            disposables.dispose();
        }
    };
}
function shouldSkip(scenario) {
    const workspaceFolderPath = scenario[0].getState?.().workspaceFolderPath;
    try {
        return !workspaceFolderPath || fs.readdirSync(workspaceFolderPath).length === 0;
    }
    catch (e) {
        return true;
    }
}
//# sourceMappingURL=scenarioTest.js.map