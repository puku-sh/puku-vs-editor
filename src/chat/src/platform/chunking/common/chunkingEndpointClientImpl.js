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
var RequestRateLimiter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkingEndpointClientImpl = void 0;
exports.getGithubMetadataHeaders = getGithubMetadataHeaders;
const pukuRequestTypes_1 = require("../../api/common/pukuRequestTypes");
const crypto_1 = require("../../../util/common/crypto");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const async_1 = require("../../../util/vs/base/common/async");
const lazy_1 = require("../../../util/vs/base/common/lazy");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const linkedList_1 = require("../../../util/vs/base/common/linkedList");
const process_1 = require("../../../util/vs/base/common/process");
const strings_1 = require("../../../util/vs/base/common/strings");
const range_1 = require("../../../util/vs/editor/common/core/range");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const embeddingsComputer_1 = require("../../embeddings/common/embeddingsComputer");
const capiClient_1 = require("../../endpoint/common/capiClient");
const envService_1 = require("../../env/common/envService");
const logExecTime_1 = require("../../log/common/logExecTime");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const networking_1 = require("../../networking/common/networking");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const workspaceService_1 = require("../../workspace/common/workspaceService");
const chunkingStringUtils_1 = require("./chunkingStringUtils");
let RequestRateLimiter = class RequestRateLimiter extends lifecycle_1.Disposable {
    static { RequestRateLimiter_1 = this; }
    static { this._abuseLimit = 1000.0 / 40.0; } // 40 requests per second. Actually more like 20 but that causes too much stalling
    constructor(experimentationService) {
        super();
        /** Max number of times to retry a request before failing. */
        this._maxAttempts = 3;
        /**
         * Target quota usage percentage that we want to maintain.
         *
         * Anything under this will be sent as fast as possible. Once we go over this, we start sending requests slower
         * and slower as we approach 100% quota usage.
         */
        this.targetQuota = 80; // %
        this.requestQueue = new linkedList_1.LinkedList();
        // State
        this._numberInFlightRequests = 0;
        this._lastSendTime = Date.now();
        this._isPumping = false;
        this._maxParallelChunksRequests = experimentationService.getTreatmentVariable('workspace.embeddingIndex.maxParallelChunksRequests') ?? 8;
    }
    enqueue(task, token) {
        const deferred = new async_1.DeferredPromise();
        token.onCancellationRequested(() => deferred.cancel());
        this.requestQueue.push({ task, attempt: 0, deferred, token });
        this.pump();
        return deferred.p;
    }
    async pump() {
        if (this._isPumping) {
            return;
        }
        try {
            this._isPumping = true;
            while (!this.requestQueue.isEmpty()) {
                if (this._rateLimitTimeout) {
                    await this._rateLimitTimeout;
                    this._rateLimitTimeout = undefined;
                }
                const elapsedSinceLastSend = Date.now() - this._lastSendTime;
                if (elapsedSinceLastSend < RequestRateLimiter_1._abuseLimit) {
                    await (0, async_1.timeout)(RequestRateLimiter_1._abuseLimit - elapsedSinceLastSend);
                }
                if (this._numberInFlightRequests >= this._maxParallelChunksRequests) {
                    await (0, async_1.timeout)(10);
                    continue; // Check again
                }
                // Check the global github rate limit
                if (this._latestRateLimitHint) {
                    const currentTime = Date.now();
                    if (currentTime < this._latestRateLimitHint.resetAt) {
                        if (this._latestRateLimitHint.remaining - this._numberInFlightRequests <= 0) {
                            // There are no remaining requests, wait until reset
                            const resetTimeSpan = this._latestRateLimitHint.resetAt - currentTime;
                            await (0, async_1.timeout)(Math.min(resetTimeSpan, 2_000));
                        }
                    }
                }
                // Check the quota percent
                if (this._latestQuotaUsed && this._latestQuotaUsed.quota > this.targetQuota) {
                    const currentTime = Date.now();
                    const quotaDelta = this._latestQuotaUsed.quota - this.targetQuota;
                    const quotaDeltaTime = currentTime - this._latestQuotaUsed.timestamp;
                    const decayTime = 2500; // Estimated time for quota to reset
                    const maxDelay = 1000;
                    let quotaAdjustment = (quotaDelta / (100 - this.targetQuota));
                    quotaAdjustment *= Math.max(1.0 - (quotaDeltaTime / decayTime), 0); // Adjust by time passed
                    const delay = quotaAdjustment * maxDelay;
                    if (delay > 0) {
                        await (0, async_1.timeout)(Math.min(delay, maxDelay));
                    }
                }
                const e = this.requestQueue.shift();
                if (e.token.isCancellationRequested) {
                    e.deferred.cancel();
                    continue;
                }
                // Send the request
                this._numberInFlightRequests++;
                this._lastSendTime = Date.now();
                const request = e.task(e.attempt);
                request.then(response => {
                    this.updateQuotasFromResponse(response);
                    if (e.token.isCancellationRequested) {
                        e.deferred.cancel();
                        return;
                    }
                    if (response.ok) {
                        e.deferred.complete(response);
                        return;
                    }
                    // Request failed, see if we can retry
                    if (e.attempt < this._maxAttempts) {
                        if (response.status === 429 || response.status === 403 || response.status === 408) {
                            const retryAfter_seconds = this.getRequestRetryDelay(response);
                            if (retryAfter_seconds > 0) {
                                this._rateLimitTimeout = (0, async_1.timeout)(retryAfter_seconds * 1000);
                            }
                            // Add back into the queue
                            this.requestQueue.unshift({ task: e.task, attempt: e.attempt + 1, deferred: e.deferred, token: e.token });
                            this.pump();
                            return;
                        }
                    }
                    // Unknown failure or max attempts reached, complete  the failed response
                    e.deferred.complete(response);
                }).catch(err => {
                    e.deferred.error(err);
                }).finally(() => {
                    this._numberInFlightRequests--;
                });
            }
        }
        finally {
            this._isPumping = false;
        }
    }
    updateQuotasFromResponse(response) {
        const timestamp = Date.now();
        try {
            const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
            const rateLimitReset = response.headers.get('x-ratelimit-reset');
            if (rateLimitRemaining && rateLimitReset) {
                this._latestRateLimitHint = {
                    timestamp: timestamp,
                    remaining: parseFloat(rateLimitRemaining),
                    resetAt: parseFloat(rateLimitReset) * 1000, // convert to ms
                };
            }
            const totalQuotaUsed = response.headers.get('x-github-total-quota-used');
            if (totalQuotaUsed) {
                if (this._latestQuotaUsed) {
                    this._latestQuotaUsed = {
                        timestamp: timestamp,
                        quota: parseFloat(totalQuotaUsed)
                    };
                }
                else {
                    this._latestQuotaUsed = {
                        timestamp: timestamp,
                        quota: parseFloat(totalQuotaUsed),
                    };
                }
            }
        }
        catch (e) {
            console.error('Error parsing rate limit headers', e);
            // Ignore errors
        }
    }
    /**
     * Get the retry delay for a request based on the response.
     *
     * @returns The retry delay in seconds.
     */
    getRequestRetryDelay(response) {
        // Check `retry-after` header
        try {
            const retryAfterHeader = response.headers.get('retry-after');
            if (retryAfterHeader) {
                const intValue = parseFloat(retryAfterHeader);
                if (!isNaN(intValue)) {
                    return intValue;
                }
            }
        }
        catch {
            // Noop
        }
        // Fallback to `x-ratelimit-reset` header
        try {
            const resetHeader = response.headers.get('x-ratelimit-reset');
            if (resetHeader) {
                const intValue = parseFloat(resetHeader);
                if (!isNaN(intValue)) {
                    const currentEpochSeconds = Math.floor(Date.now() / 1000);
                    return intValue - currentEpochSeconds;
                }
            }
        }
        catch {
            // Noop
        }
        // Seeing if the request timed out which lets us use a faster retry
        if (response.status === 408) {
            return 0.25;
        }
        // Otherwise use a generic timeout
        return 2;
    }
};
RequestRateLimiter = RequestRateLimiter_1 = __decorate([
    __param(0, nullExperimentationService_1.IExperimentationService)
], RequestRateLimiter);
let ChunkingEndpointClientImpl = class ChunkingEndpointClientImpl extends lifecycle_1.Disposable {
    constructor(instantiationService, _capiClientService, _envService, _fetcherService, _logService, _telemetryService, _workspaceService) {
        super();
        this._capiClientService = _capiClientService;
        this._envService = _envService;
        this._fetcherService = _fetcherService;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._workspaceService = _workspaceService;
        this._requestHmac = new lazy_1.Lazy(() => (0, crypto_1.createRequestHMAC)(process_1.env.HMAC_SECRET));
        this._requestLimiter = this._register(instantiationService.createInstance(RequestRateLimiter));
    }
    computeChunks(authToken, embeddingType, content, batchInfo, qos, cache, telemetryInfo, token) {
        return this.doComputeChunksAndEmbeddings(authToken, embeddingType, content, batchInfo, { qos, computeEmbeddings: false }, cache, telemetryInfo, token);
    }
    async computeChunksAndEmbeddings(authToken, embeddingType, content, batchInfo, qos, cache, telemetryInfo, token) {
        const result = await this.doComputeChunksAndEmbeddings(authToken, embeddingType, content, batchInfo, { qos, computeEmbeddings: true }, cache, telemetryInfo, token);
        return result;
    }
    async doComputeChunksAndEmbeddings(authToken, embeddingType, content, batchInfo, options, cache, telemetryInfo, token) {
        const text = await (0, async_1.raceCancellationError)(content.getText(), token);
        if ((0, strings_1.isFalsyOrWhitespace)(text)) {
            return [];
        }
        try {
            const hmac = await (0, async_1.raceCancellationError)(this._requestHmac.value, token);
            const makeRequest = async (attempt) => {
                return (0, logExecTime_1.logExecTime)(this._logService, `ChunksEndpointEmbeddingComputer.fetchChunksRequest(${content.uri}, attempt=${attempt})`, () => (0, networking_1.postRequest)(this._fetcherService, this._telemetryService, this._capiClientService, { type: pukuRequestTypes_1.RequestType.Chunks }, authToken, hmac, 'copilot-panel', '', {
                    embed: options.computeEmbeddings,
                    // Only to online set during re-ranking step
                    qos: options.qos,
                    content: text,
                    path: (0, workspaceService_1.getWorkspaceFileDisplayPath)(this._workspaceService, content.uri),
                    local_hashes: cache ? Array.from(cache.keys()) : [],
                    language_id: content.githubLanguageId,
                    embedding_model: embeddingType.id,
                }, getGithubMetadataHeaders(telemetryInfo, this._envService), token));
            };
            batchInfo.recomputedFileCount++;
            batchInfo.sentContentTextLength += text.length;
            const response = await (0, async_1.raceCancellationError)(this._requestLimiter.enqueue(makeRequest, token), token);
            if (!response.ok) {
                this._logService.debug(`Error chunking '${content.uri}'. Status: ${response.status}. Status Text: ${response.statusText}.`);
                /* __GDPR__
                    "workspaceChunkEmbeddingsIndex.computeChunksAndEmbeddings.error" : {
                        "owner": "mjbvz",
                        "comment": "Tracks errors from the chunks service",
                        "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Caller of computeChunksAndEmbeddings" },
                        "responseStatus": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Status code" }
                    }
                */
                this._telemetryService.sendMSFTTelemetryEvent('workspaceChunkEmbeddingsIndex.computeChunksAndEmbeddings.error', {
                    source: telemetryInfo.toString(),
                }, {
                    responseStatus: response.status,
                });
                return undefined;
            }
            const body = await response.json();
            if (!body.chunks.length) {
                return [];
            }
            return (0, arrays_1.coalesce)(body.chunks.map((chunk) => {
                const range = new range_1.Range(chunk.line_range.start, 0, chunk.line_range.end, 0);
                const cached = cache?.get(chunk.hash);
                if (cached) {
                    return {
                        chunk: {
                            file: content.uri,
                            text: (0, chunkingStringUtils_1.stripChunkTextMetadata)(cached.chunk.text),
                            rawText: undefined,
                            range,
                            isFullFile: cached.chunk.isFullFile, // TODO: get from endpoint
                        },
                        chunkHash: chunk.hash,
                        embedding: cached.embedding,
                    };
                }
                if (typeof chunk.text !== 'string') {
                    // Invalid chunk
                    return undefined;
                }
                let embedding;
                if (chunk.embedding?.embedding) {
                    const returnedEmbeddingsType = new embeddingsComputer_1.EmbeddingType(body.embedding_model);
                    if (!returnedEmbeddingsType.equals(embeddingType)) {
                        throw new Error(`Unexpected embedding model. Got: ${returnedEmbeddingsType}. Expected: ${embeddingType}`);
                    }
                    embedding = { type: returnedEmbeddingsType, value: chunk.embedding.embedding };
                }
                if (options.computeEmbeddings && !embedding) {
                    // Invalid chunk
                    return undefined;
                }
                return {
                    chunk: {
                        file: content.uri,
                        text: (0, chunkingStringUtils_1.stripChunkTextMetadata)(chunk.text),
                        rawText: undefined,
                        range,
                        isFullFile: false, // TODO: get from endpoint
                    },
                    chunkHash: chunk.hash,
                    embedding: embedding
                };
            }));
        }
        catch (e) {
            this._logService.error(e);
            return undefined;
        }
    }
};
exports.ChunkingEndpointClientImpl = ChunkingEndpointClientImpl;
exports.ChunkingEndpointClientImpl = ChunkingEndpointClientImpl = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, capiClient_1.ICAPIClientService),
    __param(2, envService_1.IEnvService),
    __param(3, fetcherService_1.IFetcherService),
    __param(4, logService_1.ILogService),
    __param(5, telemetry_1.ITelemetryService),
    __param(6, workspaceService_1.IWorkspaceService)
], ChunkingEndpointClientImpl);
function getGithubMetadataHeaders(callerInfo, envService) {
    const editorInfo = envService.getEditorInfo();
    // Try converting vscode/1.xxx-insiders to vscode-insiders/1.xxx
    const versionNumberAndSubName = editorInfo.version.match(/^(?<version>.+?)(\-(?<subName>\w+?))?$/);
    const application = versionNumberAndSubName && versionNumberAndSubName.groups?.subName
        ? `${editorInfo.name}-${versionNumberAndSubName.groups.subName}/${versionNumberAndSubName.groups.version}`
        : editorInfo.format();
    return {
        'X-Client-Application': application,
        'X-Client-Source': envService.getEditorPluginInfo().format(),
        'X-Client-Feature': callerInfo.toAscii().slice(0, 1000),
    };
}
//# sourceMappingURL=chunkingEndpointClientImpl.js.map