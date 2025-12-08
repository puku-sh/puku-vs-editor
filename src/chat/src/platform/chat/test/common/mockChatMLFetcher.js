"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockChatMLFetcher = void 0;
const event_1 = require("../../../../util/vs/base/common/event");
const commonTypes_1 = require("../../common/commonTypes");
class MockChatMLFetcher {
    constructor() {
        this.onDidMakeChatMLRequest = event_1.Event.None;
    }
    async fetchOne() {
        return { type: commonTypes_1.ChatFetchResponseType.Success, requestId: '', serverRequestId: '', usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, prompt_tokens_details: { cached_tokens: 0 } }, value: '', resolvedModel: '' };
    }
    async fetchMany() {
        return { type: commonTypes_1.ChatFetchResponseType.Success, requestId: '', serverRequestId: '', usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, prompt_tokens_details: { cached_tokens: 0 } }, value: [''], resolvedModel: '' };
    }
}
exports.MockChatMLFetcher = MockChatMLFetcher;
//# sourceMappingURL=mockChatMLFetcher.js.map