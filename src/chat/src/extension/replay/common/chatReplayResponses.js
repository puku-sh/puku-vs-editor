"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatReplayResponses = void 0;
const async_1 = require("../../../util/vs/base/common/async");
class ChatReplayResponses {
    static getInstance() {
        if (!ChatReplayResponses.instance) {
            // if no one created an instance yet, return one that is already marked done
            ChatReplayResponses.instance = new ChatReplayResponses();
            ChatReplayResponses.instance.markDone();
        }
        return ChatReplayResponses.instance;
    }
    static create(onCancel) {
        ChatReplayResponses.instance = new ChatReplayResponses(onCancel);
        return ChatReplayResponses.instance;
    }
    constructor(onCancel) {
        this.onCancel = onCancel;
        this.pendingRequests = [];
        this.responses = [];
        this.toolResults = new Map();
    }
    replayResponse(response) {
        const waiter = this.pendingRequests.shift();
        if (waiter) {
            waiter.settleWith(Promise.resolve(response));
        }
        else {
            this.responses.push(response);
        }
    }
    getResponse() {
        const next = this.responses.shift();
        if (next) {
            return Promise.resolve(next);
        }
        const deferred = new async_1.DeferredPromise();
        this.pendingRequests.push(deferred);
        return deferred.p;
    }
    setToolResult(id, result) {
        this.toolResults.set(id, result);
    }
    getToolResult(id) {
        return this.toolResults.get(id);
    }
    markDone() {
        while (this.pendingRequests.length > 0) {
            const waiter = this.pendingRequests.shift();
            if (waiter) {
                waiter.settleWith(Promise.resolve('finished'));
            }
        }
        this.responses.push('finished');
    }
    cancelReplay() {
        this.onCancel?.();
        this.markDone();
    }
}
exports.ChatReplayResponses = ChatReplayResponses;
//# sourceMappingURL=chatReplayResponses.js.map