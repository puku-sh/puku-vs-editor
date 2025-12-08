"use strict";
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
exports.SpyingChatMLFetcher = exports.FetchRequestCollector = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const chatMLFetcher_1 = require("../../src/extension/prompt/node/chatMLFetcher");
const conversationOptions_1 = require("../../src/platform/chat/common/conversationOptions");
const globalStringUtils_1 = require("../../src/platform/chat/common/globalStringUtils");
const async_1 = require("../../src/util/common/async");
const arrays_1 = require("../../src/util/vs/base/common/arrays");
const lifecycle_1 = require("../../src/util/vs/base/common/lifecycle");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const sharedTypes_1 = require("../simulation/shared/sharedTypes");
const stopwatch_1 = require("../../src/util/vs/base/common/stopwatch");
class FetchRequestCollector {
    constructor() {
        this._interceptedRequests = [];
        this._pendingRequests = new async_1.TaskQueue();
        this._scheduledRequests = [];
    }
    get interceptedRequests() {
        return this._interceptedRequests;
    }
    addInterceptedRequest(requestPromise) {
        this._scheduledRequests.push(this._pendingRequests.schedule(async () => {
            try {
                const request = await requestPromise;
                this._interceptedRequests.push(request);
            }
            catch (err) {
                // ignore errors here- the error will be thrown out of the ChatMLFetcher and handled
            }
        }));
    }
    /**
     * Intercepted requests are async. This method waits for all pending requests to complete.
     */
    async complete() {
        await Promise.all(this._scheduledRequests);
    }
    get contentFilterCount() {
        return this.interceptedRequests.filter(x => x.response.type === 'filtered').length;
    }
    get usage() {
        // Have to extract this to give it an explicit type or TS is confused
        const initial = { completion_tokens: 0, prompt_tokens: 0, total_tokens: 0, prompt_tokens_details: { cached_tokens: 0 } };
        return this.interceptedRequests.reduce((p, c) => {
            const initialUsage = { completion_tokens: 0, prompt_tokens: 0, total_tokens: 0, prompt_tokens_details: { cached_tokens: 0 } };
            const cUsage = c.response.usage || initialUsage;
            return {
                completion_tokens: p.completion_tokens + cUsage.completion_tokens,
                prompt_tokens: p.prompt_tokens + cUsage.prompt_tokens,
                total_tokens: p.total_tokens + cUsage.total_tokens,
                prompt_tokens_details: {
                    cached_tokens: (p.prompt_tokens_details?.cached_tokens ?? 0) + (cUsage.prompt_tokens_details?.cached_tokens ?? 0),
                }
            };
        }, initial);
    }
    get averageRequestDuration() {
        const requestDurations = (0, arrays_1.coalesce)(this.interceptedRequests.map(r => r.response.cacheMetadata?.requestDuration));
        return requestDurations.reduce((sum, duration) => sum + duration, 0) / requestDurations.length;
    }
    get hasCacheMiss() {
        return this.interceptedRequests.some(x => x.response.isCacheHit === false);
    }
    get cacheInfo() {
        return (0, arrays_1.coalesce)(this.interceptedRequests.map(r => r.cacheKey)).map(key => ({ type: 'request', key }));
    }
}
exports.FetchRequestCollector = FetchRequestCollector;
let SpyingChatMLFetcher = class SpyingChatMLFetcher extends chatMLFetcher_1.AbstractChatMLFetcher {
    get interceptedRequests() {
        return this.requestCollector.interceptedRequests;
    }
    get contentFilterCount() {
        return this.requestCollector.contentFilterCount;
    }
    constructor(requestCollector, fetcherDesc, instantiationService, options) {
        super(options);
        this.requestCollector = requestCollector;
        this.fetcher = instantiationService.createInstance(fetcherDesc);
    }
    dispose() {
        if ((0, lifecycle_1.isDisposable)(this.fetcher)) {
            this.fetcher.dispose();
        }
    }
    async fetchMany(opts, token) {
        const toolCalls = [];
        const captureToolCallsCb = async (text, idx, delta) => {
            if (delta.copilotToolCalls) {
                toolCalls.push(...delta.copilotToolCalls);
            }
            if (opts.finishedCb) {
                return opts.finishedCb(text, idx, delta);
            }
        };
        const respPromise = this.fetcher.fetchMany({ ...opts, finishedCb: captureToolCallsCb }, token);
        const sw = new stopwatch_1.StopWatch(false);
        this.requestCollector.addInterceptedRequest(respPromise.then(resp => {
            let cacheKey;
            if (typeof resp.cacheKey === 'string') {
                cacheKey = resp.cacheKey;
            }
            resp.copilotFunctionCalls = toolCalls;
            return new sharedTypes_1.InterceptedRequest(opts.messages.map(message => {
                return {
                    role: (0, globalStringUtils_1.roleToString)(message.role),
                    content: message.content,
                    tool_call_id: message.role === prompt_tsx_1.Raw.ChatRole.Tool ? message.toolCallId : undefined,
                    tool_calls: message.role === prompt_tsx_1.Raw.ChatRole.Assistant ? message.toolCalls : undefined,
                    name: message.name,
                };
            }), opts.requestOptions, resp, cacheKey, opts.endpoint.model, sw.elapsed());
        }));
        return await respPromise;
    }
};
exports.SpyingChatMLFetcher = SpyingChatMLFetcher;
exports.SpyingChatMLFetcher = SpyingChatMLFetcher = __decorate([
    __param(2, instantiation_1.IInstantiationService),
    __param(3, conversationOptions_1.IConversationOptions)
], SpyingChatMLFetcher);
//# sourceMappingURL=spyingChatMLFetcher.js.map