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
exports.ThrottlingChatMLFetcher = exports.ChatModelThrottlingTaskLaunchers = void 0;
const chatMLFetcher_1 = require("../../src/extension/prompt/node/chatMLFetcher");
const commonTypes_1 = require("../../src/platform/chat/common/commonTypes");
const conversationOptions_1 = require("../../src/platform/chat/common/conversationOptions");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const pausableThrottledWorker_1 = require("./pausableThrottledWorker");
class ChatModelThrottlingTaskLaunchers {
    constructor(limits) {
        this._throttlers = new Map();
        this._rateLimitBackoff = new Map();
        this._inFlightRequests = new Map();
        this._limits = limits;
    }
    getInFlightRequests(model) {
        if (!this._inFlightRequests.has(model)) {
            this._inFlightRequests.set(model, new Set());
        }
        return this._inFlightRequests.get(model);
    }
    getThrottler(model) {
        if (!this._throttlers.has(model)) {
            // If no limit is configured, the default limit is 1 RPS.
            if (!this._limits[model]) {
                this._limits[model] = { limit: 1, type: 'RPS' };
            }
            const limit = this._limits[model].type === 'RPM' ? this._limits[model].limit : (this._limits[model].limit * 60);
            const options = {
                maxBufferedWork: undefined, // We want to hold as many requests as possible
                maxWorkChunkSize: 1,
                waitThrottleDelayBetweenWorkUnits: true,
                throttleDelay: Math.ceil(60000 / limit)
            };
            this._throttlers.set(model, new pausableThrottledWorker_1.PausableThrottledWorker(options, async (tasks) => {
                for (const task of tasks) {
                    await task();
                }
            }));
        }
        return this._throttlers.get(model);
    }
    isPaused(model) {
        return this._throttlers.get(model)?.isPaused() ?? false;
    }
    pauseProcessing(model) {
        this.getThrottler(model).pause();
    }
    resumeProcessing(model) {
        this.getThrottler(model).resume();
    }
    /**
     * Handles rate limit responses by implementing exponential backoff.
     * This updated version uses a shared “backoff chain” to ensure that multiple inflight
     * requests for the same model do not all retry at the same time.
     *
     * @param model The chat model that was rate limited
     * @param baseDelay The base delay in milliseconds (usually from the retryAfter value)
     * @returns Whether the request should be retried
     */
    async handleRateLimit(model, baseDelay, retryCount) {
        this.pauseProcessing(model);
        if (retryCount > 3) {
            return false; // Do not retry after too many attempts.
        }
        // If any backoff is already in progress for this model, wait for it first.
        const ongoingBackoff = this._rateLimitBackoff.get(model);
        if (ongoingBackoff) {
            await ongoingBackoff;
        }
        // Calculate exponential backoff delay: 1x, 2x, 3x…
        const delay = baseDelay * retryCount;
        // Create a new backoff promise and set it as active for this model.
        const backoffPromise = new Promise(resolve => {
            setTimeout(resolve, delay);
        });
        this._rateLimitBackoff.set(model, backoffPromise);
        await backoffPromise;
        this._rateLimitBackoff.delete(model);
        return true; // Indicate we should retry.
    }
    /**
     * Execute a request with retry logic for rate limits.
     * @param model The chat model to use
     * @param requestFn The function that performs the actual request
     * @returns The result from the request function
     */
    async executeWithRateLimitHandling(model, requestFn) {
        let result;
        let continueRetrying = true;
        const inFlightRequests = this.getInFlightRequests(model);
        const cleanup = () => {
            inFlightRequests.delete(promise);
            // Only resume processing if there are no more in-flight requests
            if (inFlightRequests.size === 0) {
                this.resumeProcessing(model);
            }
        };
        const promise = (async () => {
            let retryCount = 1;
            try {
                while (continueRetrying) {
                    result = await requestFn();
                    if (result.type === commonTypes_1.ChatFetchResponseType.RateLimited) {
                        // Minimum wait should be 5 seconds
                        result.retryAfter ??= Math.max(5, result.retryAfter || 0);
                        // Convert the retryAfter value in seconds to milliseconds.
                        const retryAfterMs = result.retryAfter * 1000;
                        const shouldRetry = await this.handleRateLimit(model, retryAfterMs, retryCount);
                        if (shouldRetry) {
                            retryCount++;
                            continueRetrying = true;
                            continue;
                        }
                    }
                    // On successful (or non‑rate‑limited) responses:
                    continueRetrying = false;
                }
            }
            finally {
                cleanup();
            }
        })();
        inFlightRequests.add(promise);
        await promise;
        return result;
    }
}
exports.ChatModelThrottlingTaskLaunchers = ChatModelThrottlingTaskLaunchers;
let ThrottlingChatMLFetcher = class ThrottlingChatMLFetcher extends chatMLFetcher_1.AbstractChatMLFetcher {
    constructor(fetcherDescriptor, _modelTaskLaunchers, instantiationService, options) {
        super(options);
        this._modelTaskLaunchers = _modelTaskLaunchers;
        this._fetcher = instantiationService.createInstance(fetcherDescriptor);
    }
    async fetchMany(opts, token) {
        const taskLauncher = this._modelTaskLaunchers.getThrottler(opts.endpoint.model);
        return new Promise((resolve, reject) => {
            taskLauncher.work([async () => {
                    try {
                        const result = await this._modelTaskLaunchers.executeWithRateLimitHandling(opts.endpoint.model, () => this._fetcher.fetchMany(opts, token));
                        resolve(result);
                    }
                    catch (error) {
                        reject(error);
                    }
                }]);
        });
    }
};
exports.ThrottlingChatMLFetcher = ThrottlingChatMLFetcher;
exports.ThrottlingChatMLFetcher = ThrottlingChatMLFetcher = __decorate([
    __param(2, instantiation_1.IInstantiationService),
    __param(3, conversationOptions_1.IConversationOptions)
], ThrottlingChatMLFetcher);
//# sourceMappingURL=throttlingChatMLFetcher.js.map