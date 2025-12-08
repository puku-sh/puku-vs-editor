"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticChatMLFetcher = void 0;
const event_1 = require("../../../../util/vs/base/common/event");
const commonTypes_1 = require("../../common/commonTypes");
class StaticChatMLFetcher {
    constructor(value) {
        this.value = value;
        this.onDidMakeChatMLRequest = event_1.Event.None;
        this.reqs = 0;
    }
    async fetchOne({ finishedCb }) {
        // chunk up
        const value = typeof this.value === 'string'
            ? this.value
            : (this.value.at(this.reqs++) || this.value.at(-1));
        const chunks = (Array.isArray(value) ? value : [value]).flatMap(value => {
            if (typeof value === 'string') {
                const chunks = [];
                for (let i = 0; i < value.length; i += 4) {
                    const chunk = value.slice(i, i + 4);
                    chunks.push({ text: chunk });
                }
                return chunks;
            }
            else {
                return value;
            }
        });
        // stream through finishedCb
        let responseSoFar = '';
        for (let i = 0; i < chunks.length; i++) {
            finishedCb?.(responseSoFar, i, chunks[i]);
            responseSoFar += chunks[i].text;
        }
        return { type: commonTypes_1.ChatFetchResponseType.Success, requestId: '', serverRequestId: '', usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, prompt_tokens_details: { cached_tokens: 0 } }, value: responseSoFar, resolvedModel: '' };
    }
    async fetchMany() {
        throw new Error('Method not implemented.');
    }
}
exports.StaticChatMLFetcher = StaticChatMLFetcher;
//# sourceMappingURL=staticChatMLFetcher.js.map