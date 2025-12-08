"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const chatVariablesCollection_1 = require("../../common/chatVariablesCollection");
const conversation_1 = require("../../common/conversation");
const toolCallRound_1 = require("../../common/toolCallRound");
(0, vitest_1.describe)('Turn', () => {
    (0, vitest_1.describe)('setResponse', () => {
        (0, vitest_1.it)('should set the response message and status correctly', () => {
            const request = { type: 'user', message: 'Hello' };
            const turn = new conversation_1.Turn('1', request, new chatVariablesCollection_1.ChatVariablesCollection([]));
            const result = { metadata: {} };
            const response = { type: 'model', message: 'Hi there!' };
            turn.setResponse(conversation_1.TurnStatus.Success, response, undefined, result);
            (0, vitest_1.expect)(turn.responseMessage).to.equal(response);
            (0, vitest_1.expect)(turn.responseStatus).to.equal(conversation_1.TurnStatus.Success);
            (0, vitest_1.expect)(turn.responseChatResult === result);
        });
        (0, vitest_1.it)('should throw an error if setResponse is called more than once', () => {
            const request = { type: 'user', message: 'Hello' };
            const turn = new conversation_1.Turn('1', request, new chatVariablesCollection_1.ChatVariablesCollection([]));
            const response = { type: 'model', message: 'Hi there!' };
            turn.setResponse(conversation_1.TurnStatus.Success, response, undefined, undefined);
            (0, vitest_1.expect)(() => turn.setResponse(conversation_1.TurnStatus.Success, response, undefined, undefined)).to.throw();
        });
        (0, vitest_1.it)('should default status to InProgress if not set', () => {
            const request = { type: 'user', message: 'Hello' };
            const turn = new conversation_1.Turn('1', request, new chatVariablesCollection_1.ChatVariablesCollection([]));
            (0, vitest_1.expect)(turn.responseStatus).to.equal(conversation_1.TurnStatus.InProgress);
        });
        const genericToolCall = { id: 'id', name: 'name', arguments: '{}' };
        (0, vitest_1.it)('should restore summaries from metadata to current turns', () => {
            const turn1 = new conversation_1.Turn('1', { type: 'user', message: 'Hello' });
            const turn1Meta = {
                summary: {
                    text: 'summary 1',
                    toolCallRoundId: 'round1'
                },
                toolCallRounds: [
                    new toolCallRound_1.ToolCallRound('Hello', [genericToolCall], undefined, 'round1'),
                    new toolCallRound_1.ToolCallRound('Hello', [], undefined, 'round2'),
                ]
            };
            turn1.setResponse(conversation_1.TurnStatus.Success, { type: 'model', message: 'Hi there!' }, undefined, { metadata: turn1Meta });
            (0, conversation_1.normalizeSummariesOnRounds)([turn1]);
            (0, vitest_1.expect)(turn1.rounds[0].summary).to.equal('summary 1');
        });
        (0, vitest_1.it)('should restore summaries from metadata to previous turns', () => {
            const turn1 = new conversation_1.Turn('1', { type: 'user', message: 'Hello' });
            const turn1Meta = {
                toolCallRounds: [
                    new toolCallRound_1.ToolCallRound('Hello', [genericToolCall], undefined, 'round1'),
                    new toolCallRound_1.ToolCallRound('Hello', [], undefined, 'round2'),
                ]
            };
            turn1.setResponse(conversation_1.TurnStatus.Success, { type: 'model', message: 'Hi there!' }, undefined, { metadata: turn1Meta });
            const turn2 = new conversation_1.Turn('2', { type: 'user', message: 'Hello' });
            const turn2Meta = {
                summary: {
                    text: 'summary',
                    toolCallRoundId: 'round1'
                },
                toolCallRounds: [
                    new toolCallRound_1.ToolCallRound('Hello', [genericToolCall], undefined, 'round3'),
                    new toolCallRound_1.ToolCallRound('Hello', [], undefined, 'round4'),
                ]
            };
            turn2.setResponse(conversation_1.TurnStatus.Success, { type: 'model', message: 'Hi there!' }, undefined, { metadata: turn2Meta });
            (0, conversation_1.normalizeSummariesOnRounds)([turn1, turn2]);
            (0, vitest_1.expect)(turn1.rounds[0].summary).to.equal('summary');
            (0, vitest_1.expect)(turn2.rounds[0].summary).to.equal(undefined);
        });
    });
});
//# sourceMappingURL=conversation.spec.js.map