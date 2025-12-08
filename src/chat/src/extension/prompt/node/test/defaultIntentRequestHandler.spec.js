"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const vitest_1 = require("vitest");
const chatMLFetcher_1 = require("../../../../platform/chat/common/chatMLFetcher");
const globalStringUtils_1 = require("../../../../platform/chat/common/globalStringUtils");
const staticChatMLFetcher_1 = require("../../../../platform/chat/test/common/staticChatMLFetcher");
const mockEndpoint_1 = require("../../../../platform/endpoint/test/node/mockEndpoint");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const spyingTelemetryService_1 = require("../../../../platform/telemetry/node/spyingTelemetryService");
const nullWorkspaceFileIndex_1 = require("../../../../platform/workspaceChunkSearch/node/nullWorkspaceFileIndex");
const workspaceFileIndex_1 = require("../../../../platform/workspaceChunkSearch/node/workspaceFileIndex");
const chatResponseStreamImpl_1 = require("../../../../util/common/chatResponseStreamImpl");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const event_1 = require("../../../../util/vs/base/common/event");
const types_1 = require("../../../../util/vs/base/common/types");
const uuid_1 = require("../../../../util/vs/base/common/uuid");
const descriptors_1 = require("../../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const toolCallingLoop_1 = require("../../../intents/node/toolCallingLoop");
const toolCalling_1 = require("../../../prompts/node/panel/toolCalling");
const services_1 = require("../../../test/node/services");
const conversation_1 = require("../../common/conversation");
const toolCallRound_1 = require("../../common/toolCallRound");
const chatParticipantTelemetry_1 = require("../chatParticipantTelemetry");
const defaultIntentRequestHandler_1 = require("../defaultIntentRequestHandler");
const intents_1 = require("../intents");
(0, vitest_1.suite)('defaultIntentRequestHandler', () => {
    let accessor;
    let response;
    let chatResponse = [];
    let promptResult;
    let telemetry;
    let endpoint;
    let turnIdCounter = 0;
    let builtPrompts = [];
    const sessionId = 'some-session-id';
    const getTurnId = () => `turn-id-${turnIdCounter}`;
    (0, vitest_1.beforeEach)(async () => {
        const services = (0, services_1.createExtensionUnitTestingServices)();
        telemetry = new spyingTelemetryService_1.SpyingTelemetryService();
        chatResponse = [];
        services.define(telemetry_1.ITelemetryService, telemetry);
        services.define(chatMLFetcher_1.IChatMLFetcher, new staticChatMLFetcher_1.StaticChatMLFetcher(chatResponse));
        services.define(workspaceFileIndex_1.IWorkspaceFileIndex, new descriptors_1.SyncDescriptor(nullWorkspaceFileIndex_1.NullWorkspaceFileIndex));
        accessor = services.createTestingAccessor();
        endpoint = accessor.get(instantiation_1.IInstantiationService).createInstance(mockEndpoint_1.MockEndpoint, undefined);
        builtPrompts = [];
        response = [];
        promptResult = (0, intents_1.nullRenderPromptResult)();
        turnIdCounter = 0;
        toolCallingLoop_1.ToolCallingLoop.NextToolCallId = 0;
        toolCallRound_1.ToolCallRound.generateID = () => 'static-id';
    });
    (0, vitest_1.afterEach)(() => {
        accessor.dispose();
    });
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
    function getDerandomizedTelemetry() {
        const evts = telemetry.getEvents();
        return cloneAndChangeWithKey(evts, (e, key) => {
            if (typeof e === 'string' && uuidRegex.test(e)) {
                return 'some-uuid';
            }
            else if (typeof e === 'number' && typeof key === 'string' && key.startsWith('timeTo')) {
                return '<duration>';
            }
        });
    }
    class TestIntent {
        constructor() {
            this.id = 'test';
            this.description = 'test intent';
            this.locations = [vscodeTypes_1.ChatLocation.Panel];
        }
        invoke() {
            return Promise.resolve(new TestIntentInvocation(this, this.locations[0], endpoint));
        }
    }
    class TestIntentInvocation {
        constructor(intent, location, endpoint) {
            this.intent = intent;
            this.location = location;
            this.endpoint = endpoint;
            this.context = [];
        }
        async buildPrompt(context) {
            builtPrompts.push(context);
            if (Array.isArray(promptResult)) {
                const next = promptResult.shift();
                if (!next) {
                    throw new Error('ran out of prompts');
                }
                return next;
            }
            return promptResult;
        }
    }
    class TestChatRequest {
        constructor() {
            this.attempt = 1;
            this.enableCommandDetection = false;
            this.isParticipantDetected = false;
            this.location = vscodeTypes_1.ChatLocation.Panel;
            this.location2 = undefined;
            this.prompt = 'hello world!';
            this.references = [];
            this.toolReferences = [];
            this.model = { family: '' };
            this.tools = new Map();
            this.id = (0, uuid_1.generateUuid)();
            this.sessionId = (0, uuid_1.generateUuid)();
        }
    }
    const responseStream = new chatResponseStreamImpl_1.ChatResponseStreamImpl(p => response.push(p), () => { });
    const maxToolCallIterations = 3;
    const makeHandler = ({ request = new TestChatRequest(), turns = [] } = {}) => {
        turns.push(new conversation_1.Turn(getTurnId(), { type: 'user', message: request.prompt }, undefined));
        const instaService = accessor.get(instantiation_1.IInstantiationService);
        return instaService.createInstance(defaultIntentRequestHandler_1.DefaultIntentRequestHandler, new TestIntent(), new conversation_1.Conversation(sessionId, turns), request, responseStream, cancellation_1.CancellationToken.None, undefined, vscodeTypes_1.ChatLocation.Panel, instaService.createInstance(chatParticipantTelemetry_1.ChatTelemetryBuilder, Date.now(), sessionId, undefined, turns.length > 1, request), { maxToolCallIterations }, event_1.Event.None);
    };
    (0, vitest_1.test)('avoids requests when handler return is null', async () => {
        const handler = makeHandler();
        const result = await handler.getResult();
        (0, vitest_1.expect)(result).to.deep.equal({});
        (0, vitest_1.expect)(getDerandomizedTelemetry()).toMatchSnapshot();
    });
    (0, vitest_1.test)('makes a successful request with a single turn', async () => {
        const handler = makeHandler();
        chatResponse[0] = 'some response here :)';
        promptResult = {
            ...(0, intents_1.nullRenderPromptResult)(),
            messages: [{ role: prompt_tsx_1.Raw.ChatRole.User, content: [(0, globalStringUtils_1.toTextPart)('hello world!')] }],
        };
        const result = await handler.getResult();
        (0, vitest_1.expect)(result).toMatchSnapshot();
        // Wait for event loop to finish as we often fire off telemetry without properly awaiting it as it doesn't matter when it is sent
        await new Promise(setImmediate);
        (0, vitest_1.expect)(getDerandomizedTelemetry()).toMatchSnapshot();
    });
    (0, vitest_1.test)('makes a tool call turn', async () => {
        const handler = makeHandler();
        chatResponse[0] = [{
                text: 'some response here :)',
                copilotToolCalls: [{
                        arguments: 'some args here',
                        name: 'my_func',
                        id: 'tool_call_id',
                    }],
            }];
        chatResponse[1] = 'response to tool call';
        const toolResult = new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart('tool-result')]);
        promptResult = {
            ...(0, intents_1.nullRenderPromptResult)(),
            messages: [{ role: prompt_tsx_1.Raw.ChatRole.User, content: [(0, globalStringUtils_1.toTextPart)('hello world!')] }],
            metadata: (0, intents_1.promptResultMetadata)([new toolCalling_1.ToolResultMetadata('tool_call_id__vscode-0', toolResult)])
        };
        const result = await handler.getResult();
        (0, vitest_1.expect)(result).toMatchSnapshot();
        // Wait for event loop to finish as we often fire off telemetry without properly awaiting it as it doesn't matter when it is sent
        await new Promise(setImmediate);
        (0, vitest_1.expect)(getDerandomizedTelemetry()).toMatchSnapshot();
        (0, vitest_1.expect)(builtPrompts).toHaveLength(2);
        (0, vitest_1.expect)(builtPrompts[1].toolCallResults).toEqual({ 'tool_call_id__vscode-0': toolResult });
        (0, vitest_1.expect)(builtPrompts[1].toolCallRounds).toMatchObject([
            {
                toolCalls: [{ arguments: 'some args here', name: 'my_func', id: 'tool_call_id__vscode-0' }],
                toolInputRetry: 0,
                response: 'some response here :)',
            },
            {
                toolCalls: [],
                toolInputRetry: 0,
                response: 'response to tool call',
            },
        ]);
    });
    function fillWithToolCalls(insertN = 20) {
        promptResult = [];
        for (let i = 0; i < insertN; i++) {
            chatResponse[i] = [{
                    text: `response number ${i}`,
                    copilotToolCalls: [{
                            arguments: 'some args here',
                            name: 'my_func',
                            id: `tool_call_id_${i}`,
                        }],
                }];
            const toolResult = new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart(`tool-result-${i}`)]);
            promptResult[i] = {
                ...(0, intents_1.nullRenderPromptResult)(),
                messages: [{ role: prompt_tsx_1.Raw.ChatRole.User, content: [(0, globalStringUtils_1.toTextPart)('hello world!')] }],
                metadata: (0, intents_1.promptResultMetadata)([new toolCalling_1.ToolResultMetadata(`tool_call_id_${i}__vscode-${i}`, toolResult)])
            };
        }
    }
    function setupMultiturnToolCalls(turns, roundsPerTurn) {
        // Matches the counter in ToolCallingLoop
        let toolCallCounter = 0;
        promptResult = [];
        const setupOneRound = (startIdx) => {
            const endIdx = startIdx + roundsPerTurn;
            for (let i = startIdx; i < endIdx; i++) {
                const isLast = i === endIdx - 1;
                chatResponse[i] = [{
                        text: `response number ${i}`,
                        copilotToolCalls: isLast ?
                            undefined :
                            [{
                                    arguments: 'some args here',
                                    name: 'my_func',
                                    id: `tool_call_id_${toolCallCounter++}`,
                                }],
                    }];
                // ToolResultMetadata is reported by the prompt for all tool calls, in history or called this round
                const promptMetadata = [];
                for (let toolResultIdx = 0; toolResultIdx <= toolCallCounter; toolResultIdx++) {
                    // For each request in a round, all the previous and current ToolResultMetadata are reported
                    const toolResult = new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart(`tool-result-${toolResultIdx}`)]);
                    promptMetadata.push(new toolCalling_1.ToolResultMetadata(`tool_call_id_${toolResultIdx}__vscode-${toolResultIdx}`, toolResult));
                }
                promptResult[i] = {
                    ...(0, intents_1.nullRenderPromptResult)(),
                    messages: [{ role: prompt_tsx_1.Raw.ChatRole.User, content: [(0, globalStringUtils_1.toTextPart)('hello world!')] }],
                    metadata: (0, intents_1.promptResultMetadata)(promptMetadata)
                };
            }
        };
        for (let i = 0; i < turns; i++) {
            setupOneRound(i * roundsPerTurn);
        }
    }
    (0, vitest_1.test)('confirms on max tool call iterations, and continues to iterate', async () => {
        const handler = makeHandler();
        fillWithToolCalls();
        const result1 = await handler.getResult();
        (0, vitest_1.expect)(result1).toMatchSnapshot();
        const last = response.at(-1);
        (0, vitest_1.expect)(last).toBeInstanceOf(vscodeTypes_1.ChatResponseConfirmationPart);
        const request = new TestChatRequest();
        request.acceptedConfirmationData = [last.data];
        const handler2 = makeHandler({ request });
        (0, vitest_1.expect)(await handler2.getResult()).toMatchSnapshot();
        (0, vitest_1.expect)(response).toMatchSnapshot();
        // Wait for event loop to finish as we often fire off telemetry without properly awaiting it as it doesn't matter when it is sent
        await new Promise(setImmediate);
        (0, vitest_1.expect)(getDerandomizedTelemetry()).toMatchSnapshot();
    });
    (0, vitest_1.test)('ChatResult metadata after multiple turns only has tool results from current turn', async () => {
        const request = new TestChatRequest();
        const handler = makeHandler();
        setupMultiturnToolCalls(2, maxToolCallIterations);
        const result1 = await handler.getResult();
        (0, vitest_1.expect)(result1.metadata).toMatchSnapshot();
        const turn1 = new conversation_1.Turn((0, uuid_1.generateUuid)(), { message: request.prompt, type: 'user' }, undefined);
        const handler2 = makeHandler({ request, turns: [turn1] });
        const result2 = await handler2.getResult();
        (0, vitest_1.expect)(result2.metadata).toMatchSnapshot();
    });
    (0, vitest_1.test)('aborts on max tool call iterations', async () => {
        fillWithToolCalls();
        const handler = makeHandler();
        await handler.getResult();
        const last = response.at(-1);
        (0, vitest_1.expect)(last).toBeInstanceOf(vscodeTypes_1.ChatResponseConfirmationPart);
        const request = new TestChatRequest();
        request.acceptedConfirmationData = [last.data];
        request.prompt = last.buttons[1];
        const handler2 = makeHandler({ request });
        await handler2.getResult();
        (0, vitest_1.expect)(response.at(-1)).toMatchInlineSnapshot(`
			ChatResponseMarkdownPart {
			  "value": MarkdownString {},
			}
		`);
    });
});
function cloneAndChangeWithKey(obj, changer) {
    return _cloneAndChangeWithKey(obj, changer, new Set(), undefined);
}
function _cloneAndChangeWithKey(obj, changer, seen, key) {
    if ((0, types_1.isUndefinedOrNull)(obj)) {
        return obj;
    }
    const changed = changer(obj, key);
    if (typeof changed !== 'undefined') {
        return changed;
    }
    if (Array.isArray(obj)) {
        const r1 = [];
        for (const [i, e] of obj.entries()) {
            r1.push(_cloneAndChangeWithKey(e, changer, seen, i));
        }
        return r1;
    }
    if ((0, types_1.isObject)(obj)) {
        if (seen.has(obj)) {
            throw new Error('Cannot clone recursive data-structure');
        }
        seen.add(obj);
        const r2 = {};
        for (const i2 in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, i2)) {
                r2[i2] = _cloneAndChangeWithKey(obj[i2], changer, seen, i2);
            }
        }
        seen.delete(obj);
        return r2;
    }
    return obj;
}
//# sourceMappingURL=defaultIntentRequestHandler.spec.js.map