"use strict";
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
var CachingChatMLFetcher_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachingChatMLFetcher = exports.CachedResponseMetadata = exports.CachedTestInfo = exports.CacheableChatRequest = void 0;
const fs_1 = require("fs");
const os_1 = require("os");
const path = __importStar(require("path"));
const chatMLFetcher_1 = require("../../src/extension/prompt/node/chatMLFetcher");
const commonTypes_1 = require("../../src/platform/chat/common/commonTypes");
const conversationOptions_1 = require("../../src/platform/chat/common/conversationOptions");
const globalStringUtils_1 = require("../../src/platform/chat/common/globalStringUtils");
const logService_1 = require("../../src/platform/log/common/logService");
const openai_1 = require("../../src/platform/networking/common/openai");
const diff_1 = require("../../src/util/common/diff");
const lock_1 = require("../../src/util/common/lock");
const errors_1 = require("../../src/util/vs/base/common/errors");
const descriptors_1 = require("../../src/util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const cacheSalt_1 = require("../cacheSalt");
const jsonOutputPrinter_1 = require("../jsonOutputPrinter");
const sharedTypes_1 = require("../simulation/shared/sharedTypes");
const simulationLogger_1 = require("../simulationLogger");
const hash_1 = require("./hash");
const simulationContext_1 = require("./simulationContext");
const simulationEndpointHealth_1 = require("./simulationEndpointHealth");
const simulationOutcome_1 = require("./simulationOutcome");
const stdout_1 = require("./stdout");
const stest_1 = require("./stest");
class CacheableChatRequest {
    constructor(messages, model, requestOptions, extraCacheProperties) {
        this.obj = { messages: (0, openai_1.rawMessageToCAPI)(messages), model, requestOptions, extraCacheProperties };
        this.hash = (0, hash_1.computeSHA256)(cacheSalt_1.CHAT_ML_CACHE_SALT + JSON.stringify(this.obj));
        // To aid in reading cache entries, we will write objects to disk splitting each message by new lines
        // We do this after the sha computation to avoid invalidating all the existing caches
        this.obj.messages = this.obj.messages.map((m) => {
            return { ...m, content: (0, globalStringUtils_1.getTextPart)(m.content).split('\n') };
        });
    }
    toJSON() {
        return this.obj;
    }
}
exports.CacheableChatRequest = CacheableChatRequest;
class CachedTestInfo {
    get testName() { return this.stest.fullName; }
    constructor(stest, cacheSlot = 0) {
        this.stest = stest;
        this.cacheSlot = cacheSlot;
    }
}
exports.CachedTestInfo = CachedTestInfo;
var CachedResponseMetadata;
(function (CachedResponseMetadata) {
    function isCachedResponseMetadata(obj) {
        return (typeof obj === 'object' &&
            obj !== null &&
            'requestDuration' in obj &&
            typeof obj.requestDuration === 'number' &&
            'requestTime' in obj &&
            typeof obj.requestTime === 'string' &&
            'testName' in obj &&
            typeof obj.testName === 'string');
    }
    CachedResponseMetadata.isCachedResponseMetadata = isCachedResponseMetadata;
})(CachedResponseMetadata || (exports.CachedResponseMetadata = CachedResponseMetadata = {}));
let CachingChatMLFetcher = class CachingChatMLFetcher extends chatMLFetcher_1.AbstractChatMLFetcher {
    static { CachingChatMLFetcher_1 = this; }
    static { this.Locks = new lock_1.LockMap(); }
    constructor(fetcherOrDescriptor, cache, testInfo, extraCacheProperties = undefined, cacheMode = simulationContext_1.CacheMode.Default, jsonOutputPrinter, simulationEndpointHealth, instantiationService, options) {
        super(options);
        this.cache = cache;
        this.testInfo = testInfo;
        this.extraCacheProperties = extraCacheProperties;
        this.cacheMode = cacheMode;
        this.jsonOutputPrinter = jsonOutputPrinter;
        this.simulationEndpointHealth = simulationEndpointHealth;
        this.instantiationService = instantiationService;
        this.isDisposed = false;
        this.fetcher = (fetcherOrDescriptor instanceof descriptors_1.SyncDescriptor ? instantiationService.createInstance(fetcherOrDescriptor) : fetcherOrDescriptor);
    }
    dispose() {
        this.isDisposed = true;
    }
    async fetchMany(opts, token) {
        if (this.isDisposed) {
            throw new errors_1.BugIndicatingError('The CachingChatMLFetcher has been disposed and cannot be used anymore.');
        }
        if (!this.testInfo.testName) {
            throw new Error(`Illegal usage of the ChatMLFetcher! You should only use the ChatMLFetcher that is passed to your test and not an ambient one!`);
        }
        if (this.cacheMode === simulationContext_1.CacheMode.Require) {
            for (const message of opts.messages) {
                if (containsRepoPath((0, globalStringUtils_1.getTextPart)(message.content))) {
                    const message = `You should not use the repository root (${stest_1.REPO_ROOT}) in your ChatML messages because this leads to cache misses! This request is generated by test "${this.testInfo.testName}`;
                    console.error(`\n\n${message}\n\n`);
                    this.printTerminatedWithRequireCache(message);
                    await (0, stdout_1.drainStdoutAndExit)(1);
                    throw new Error(message);
                }
            }
        }
        const finalReqOptions = this.preparePostOptions(opts.requestOptions);
        const req = new CacheableChatRequest(opts.messages, opts.endpoint.model, finalReqOptions, this.extraCacheProperties);
        // console.log(`request with hash: ${req.hash}`);
        return CachingChatMLFetcher_1.Locks.withLock(req.hash, async () => {
            let isCacheHit = undefined;
            if (this.cacheMode !== simulationContext_1.CacheMode.Disable) {
                const cacheValue = await this.cache.get(req, this.testInfo.cacheSlot);
                if (cacheValue) {
                    if (cacheValue.type === commonTypes_1.ChatFetchResponseType.Success) {
                        await opts.finishedCb?.(cacheValue.value[0], 0, { text: cacheValue.value[0], copilotToolCalls: cacheValue.copilotFunctionCalls, logprobs: cacheValue.logprobs });
                    }
                    else if (cacheValue.type === commonTypes_1.ChatFetchResponseType.Length) {
                        await opts.finishedCb?.(cacheValue.truncatedValue, 0, { text: cacheValue.truncatedValue, copilotToolCalls: cacheValue.copilotFunctionCalls, logprobs: cacheValue.logprobs });
                    }
                    return { ...cacheValue, isCacheHit: true, cacheKey: req.hash };
                }
                isCacheHit = false;
            }
            if (this.cacheMode === simulationContext_1.CacheMode.Require) {
                let diff;
                try {
                    diff = await this.suggestDiffCommandForCacheMiss(req);
                }
                catch (err) {
                    console.log(err);
                }
                console.log(JSON.stringify(opts.messages, (key, value) => {
                    if (typeof value === 'string') {
                        const split = value.split(/\n/g);
                        return split.length > 1 ? split : value;
                    }
                    return value;
                }, 4));
                let message = `\n✗ Cache entry not found for a request generated by test "${this.testInfo.testName}"!
- Valid cache entries are currently required for all requests!
- The missing request has the hash: ${req.hash} (cache slot ${this.testInfo.cacheSlot}, make sure to call simulate -- -n=10).
`;
                if (diff) {
                    message += `- Compare with the closest cache entry using \`code-insiders --diff "${diff.oldRequest}" "${diff.newRequest}"\`\n`;
                }
                console.log(message);
                this.printTerminatedWithRequireCache(message);
                await (0, stdout_1.drainStdoutAndExit)(1);
                throw new Error(message);
            }
            const callbackWrapper = new FinishedCallbackWrapper(opts.finishedCb);
            const start = Date.now();
            if (simulationLogger_1.logger.shouldLog(logService_1.LogLevel.Trace)) {
                simulationLogger_1.logger.trace(`Making request:\n` + opts.messages.map(m => `  ${m.role}: ${(0, globalStringUtils_1.getTextPart)(m.content)}`).join('\n'));
            }
            const result = await this.fetcher.fetchMany({ ...opts, finishedCb: callbackWrapper.getCb() }, token);
            const fetchingResponseTimeInMs = Date.now() - start;
            // Don't cache failed results
            if (result.type === commonTypes_1.ChatFetchResponseType.OffTopic
                || result.type === commonTypes_1.ChatFetchResponseType.Filtered
                || result.type === commonTypes_1.ChatFetchResponseType.PromptFiltered
                || result.type === commonTypes_1.ChatFetchResponseType.Length
                || result.type === commonTypes_1.ChatFetchResponseType.Success) {
                const cacheMetadata = {
                    testName: this.testInfo.testName,
                    requestDuration: fetchingResponseTimeInMs,
                    requestTime: new Date().toISOString()
                };
                const cachedResponse = {
                    ...result,
                    cacheMetadata,
                    copilotFunctionCalls: callbackWrapper.copilotFunctionCalls,
                    logprobs: callbackWrapper.logprobs,
                };
                if (!(this.fetcher instanceof simulationContext_1.NoFetchChatMLFetcher)) {
                    try {
                        await this.cache.set(req, this.testInfo.cacheSlot, cachedResponse);
                    }
                    catch (err) {
                        if (/Key already exists/.test(err.message)) {
                            console.log(JSON.stringify(opts.messages, (key, value) => {
                                if (typeof value === 'string') {
                                    const split = value.split(/\n/g);
                                    return split.length > 1 ? split : value;
                                }
                                return value;
                            }, 4));
                            console.log(`\n✗ ${err.message}`);
                            await (0, stdout_1.drainStdoutAndExit)(1);
                        }
                        throw err;
                    }
                    return { ...result, cacheMetadata, isCacheHit, cacheKey: req.hash };
                }
            }
            else {
                // A request failed, so we don't want to cache it.
                // But we should warn the developer that they need to rerun
                this.simulationEndpointHealth.markFailure(this.testInfo, result);
            }
            return { ...result, isCacheHit };
        });
    }
    async suggestDiffCommandForCacheMiss(req) {
        const outcome = await this.instantiationService.createInstance(simulationOutcome_1.SimulationOutcomeImpl, false).get(this.testInfo.stest);
        if (!outcome?.requests.length) {
            return;
        }
        const newRequest = path.join((0, os_1.tmpdir)(), `${req.hash}-new.json`);
        await fs_1.promises.writeFile(newRequest, JSON.stringify(req.toJSON(), null, '\t'));
        let best;
        let bestScore = Infinity;
        for (const requestHash of outcome.requests) {
            const request = await this.cache.getRequest(requestHash);
            if (!request) {
                continue;
            }
            const diff = new diff_1.LcsDiff(new diff_1.LineSequence(JSON.stringify(request, null, '\t').split('\n')), new diff_1.LineSequence(JSON.stringify(req.toJSON(), null, '\t').split('\n'))).ComputeDiff();
            let score = 0;
            for (const d of diff) {
                score += d.modifiedLength + d.originalLength;
            }
            if (score < bestScore) {
                best = request;
                bestScore = score;
            }
        }
        const oldRequest = path.join((0, os_1.tmpdir)(), `${req.hash}-previous.json`);
        await fs_1.promises.writeFile(oldRequest, JSON.stringify(best, null, '\t'));
        return {
            newRequest,
            oldRequest,
            get isWhitespaceOnly() {
                let whitespaceOnly = false;
                if (best) {
                    const bestCast = best;
                    const currentCast = req.toJSON();
                    if (bestCast.messages.length === currentCast.messages.length && bestCast.messages.every((v, i) => v.content.join('').replace(/\n\n+/, '\n').trim() === currentCast.messages[i].content.join('').replace(/\n\n+/, '\n').trim())) {
                        whitespaceOnly = true;
                    }
                }
                return whitespaceOnly;
            }
        };
    }
    printTerminatedWithRequireCache(message) {
        return this.jsonOutputPrinter.print({ type: sharedTypes_1.OutputType.terminated, reason: `Terminated because of --require-cache\n${message}` });
    }
};
exports.CachingChatMLFetcher = CachingChatMLFetcher;
exports.CachingChatMLFetcher = CachingChatMLFetcher = CachingChatMLFetcher_1 = __decorate([
    __param(5, jsonOutputPrinter_1.IJSONOutputPrinter),
    __param(6, simulationEndpointHealth_1.ISimulationEndpointHealth),
    __param(7, instantiation_1.IInstantiationService),
    __param(8, conversationOptions_1.IConversationOptions)
], CachingChatMLFetcher);
const repoRootRegex = new RegExp(stest_1.REPO_ROOT.replace(/[/\\]/g, '[/\\\\]'), 'i');
function containsRepoPath(testString) {
    return repoRootRegex.test(testString);
}
class FinishedCallbackWrapper {
    constructor(original) {
        this.original = original;
        this.copilotFunctionCalls = [];
    }
    getCb() {
        return async (text, index, delta) => {
            if (delta.copilotToolCalls) {
                this.copilotFunctionCalls.push(...delta.copilotToolCalls);
            }
            if (delta.logprobs) {
                if (!this.logprobs) {
                    this.logprobs = { ...delta.logprobs };
                }
                else {
                    this.logprobs.content.push(...delta.logprobs.content);
                }
            }
            return this.original?.(text, index, delta);
        };
    }
}
//# sourceMappingURL=cachingChatMLFetcher.js.map