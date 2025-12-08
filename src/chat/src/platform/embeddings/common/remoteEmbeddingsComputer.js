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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteEmbeddingsComputer = void 0;
const pukuRequestTypes_1 = require("../../api/common/pukuRequestTypes");
const crypto_1 = require("../../../util/common/crypto");
const telemetryCorrelationId_1 = require("../../../util/common/telemetryCorrelationId");
const async_1 = require("../../../util/vs/base/common/async");
const process_1 = require("../../../util/vs/base/common/process");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const authentication_1 = require("../../authentication/common/authentication");
const chunkingEndpointClientImpl_1 = require("../../chunking/common/chunkingEndpointClientImpl");
const capiClient_1 = require("../../endpoint/common/capiClient");
const endpointProvider_1 = require("../../endpoint/common/endpointProvider");
const envService_1 = require("../../env/common/envService");
const logExecTime_1 = require("../../log/common/logExecTime");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const networking_1 = require("../../networking/common/networking");
const telemetry_1 = require("../../telemetry/common/telemetry");
const embeddingsComputer_1 = require("./embeddingsComputer");
let RemoteEmbeddingsComputer = class RemoteEmbeddingsComputer {
    constructor(_authService, _capiClientService, _envService, _fetcherService, _logService, _telemetryService, _endpointProvider) {
        this._authService = _authService;
        this._capiClientService = _capiClientService;
        this._envService = _envService;
        this._fetcherService = _fetcherService;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._endpointProvider = _endpointProvider;
        this.batchSize = 100;
    }
    async computeEmbeddings(embeddingType, inputs, options, telemetryInfo, cancellationToken) {
        return (0, logExecTime_1.logExecTime)(this._logService, 'RemoteEmbeddingsComputer::computeEmbeddings', async () => {
            // Determine endpoint type: use CAPI for no-auth users, otherwise use GitHub
            const copilotToken = await this._authService.getCopilotToken();
            if (copilotToken.isNoAuthUser) {
                const embeddings = await this.computeCAPIEmbeddings(inputs, options, cancellationToken);
                return embeddings ?? { type: embeddingType, values: [] };
            }
            const token = (await this._authService.getAnyGitHubSession({ silent: true }))?.accessToken;
            if (!token) {
                throw new Error('No authentication token available');
            }
            const embeddingsOut = [];
            for (let i = 0; i < inputs.length; i += this.batchSize) {
                const batch = inputs.slice(i, i + this.batchSize);
                if (!batch.length) {
                    break;
                }
                const body = {
                    inputs: batch,
                    input_type: options?.inputType ?? 'document',
                    embedding_model: embeddingType.id,
                };
                const response = await (0, networking_1.postRequest)(this._fetcherService, this._telemetryService, this._capiClientService, { type: pukuRequestTypes_1.RequestType.DotcomEmbeddings }, token, await (0, crypto_1.createRequestHMAC)(process_1.env.HMAC_SECRET), 'copilot-panel', (0, uuid_1.generateUuid)(), body, (0, chunkingEndpointClientImpl_1.getGithubMetadataHeaders)(telemetryInfo?.callTracker ?? new telemetryCorrelationId_1.CallTracker(), this._envService), cancellationToken);
                if (!response.ok) {
                    /* __GDPR__
                        "remoteEmbeddingsComputer.computeEmbeddings.error" : {
                            "owner": "mjbvz",
                            "comment": "Total time for searchFileChunks to complete",
                            "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller" },
                            "correlationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id" },
                            "embeddingType": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Embedding type" },
                            "totalInputLength": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total length of the input" },
                            "batchInputLength": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total length of the batch" },
                            "statusCode": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Status code of the response" }
                        }
                    */
                    this._telemetryService.sendMSFTTelemetryEvent('remoteEmbeddingsComputer.computeEmbeddings.error', {
                        source: telemetryInfo?.callTracker.toString(),
                        correlationId: telemetryInfo?.correlationId,
                        embeddingType: embeddingType.id,
                    }, {
                        totalInputLength: inputs.length,
                        batchInputLength: batch.length,
                        statusCode: response.status,
                    });
                    throw new Error(`Error fetching embeddings: ${response.status}`);
                }
                const jsonResponse = await response.json();
                const resolvedType = new embeddingsComputer_1.EmbeddingType(jsonResponse.embedding_model);
                if (!resolvedType.equals(embeddingType)) {
                    throw new Error(`Unexpected embedding model. Got: ${resolvedType}. Expected: ${embeddingType}`);
                }
                if (batch.length !== jsonResponse.embeddings.length) {
                    throw new Error(`Mismatched embedding result count. Expected: ${batch.length}. Got: ${jsonResponse.embeddings.length}`);
                }
                embeddingsOut.push(...jsonResponse.embeddings.map(embedding => ({
                    type: resolvedType,
                    value: embedding.embedding,
                })));
            }
            return { type: embeddingType, values: embeddingsOut };
        });
    }
    async computeCAPIEmbeddings(inputs, options, cancellationToken) {
        const typeInfo = (0, embeddingsComputer_1.getWellKnownEmbeddingTypeInfo)(embeddingsComputer_1.EmbeddingType.text3small_512);
        if (!typeInfo) {
            throw new Error(`Embeddings type info not found: ${embeddingsComputer_1.EmbeddingType.text3small_512}`);
        }
        const endpoint = await this._endpointProvider.getEmbeddingsEndpoint('text3small');
        const batchSize = endpoint.maxBatchSize;
        // Open AI seems to allow 1 less than max tokens for the model requests. So if the max tokens is 8192, we can only send 8191 tokens.
        const maxTokens = endpoint.modelMaxPromptTokens - 1;
        return this.fetchResponseWithBatches(typeInfo, endpoint, inputs, cancellationToken, maxTokens, batchSize);
    }
    /**
     * A recursive helper that drives the public `fetchResponse` function. This allows accepting a batch and supports backing off the endpoint.
     * @param inputs The inputs to get embeddings for
     * @param cancellationToken A cancellation token to allow cancelling the requests
     * @param batchSize The batch size to calculate
     * @returns The embeddings
     */
    async fetchResponseWithBatches(type, endpoint, inputs, cancellationToken, maxTokens, batchSize, parallelism = 1) {
        // First we loop through all inputs and count their token length, if one exceeds max tokens then we fail
        for (const input of inputs) {
            const inputTokenLength = await endpoint.acquireTokenizer().tokenLength(input);
            if (inputTokenLength > maxTokens) {
                return undefined;
            }
        }
        let embeddings = [];
        const promises = [];
        const limiter = new async_1.Limiter(parallelism);
        try {
            for (let i = 0; i < inputs.length; i += batchSize) {
                const currentBatch = inputs.slice(i, i + batchSize);
                promises.push(limiter.queue(async () => {
                    if (cancellationToken?.isCancellationRequested) {
                        return;
                    }
                    const r = await this.rawEmbeddingsFetchWithTelemetry(type, endpoint, (0, uuid_1.generateUuid)(), currentBatch, cancellationToken);
                    if (r.type === 'failed') {
                        throw new Error('Embeddings request failed ' + r.reason);
                    }
                    return r;
                }));
            }
            embeddings = (await Promise.all(promises)).flatMap(response => response?.embeddings ?? []);
        }
        catch (e) {
            return undefined;
        }
        finally {
            limiter.dispose();
        }
        if (cancellationToken?.isCancellationRequested) {
            return undefined;
        }
        // If there are no embeddings, return undefined
        if (embeddings.length === 0) {
            return undefined;
        }
        return { type: embeddingsComputer_1.EmbeddingType.text3small_512, values: embeddings.map((value) => ({ type: embeddingsComputer_1.EmbeddingType.text3small_512, value })) };
    }
    async rawEmbeddingsFetchWithTelemetry(type, endpoint, requestId, inputs, cancellationToken) {
        const startTime = Date.now();
        const rawRequest = await this.rawEmbeddingsFetch(type, endpoint, requestId, inputs, cancellationToken);
        if (rawRequest.type === 'failed') {
            this._telemetryService.sendMSFTTelemetryErrorEvent('embedding.error', {
                type: rawRequest.type,
                reason: rawRequest.reason
            });
            return rawRequest;
        }
        const tokenizer = endpoint.acquireTokenizer();
        const tokenCounts = await Promise.all(inputs.map(input => tokenizer.tokenLength(input)));
        const inputTokenCount = tokenCounts.reduce((acc, count) => acc + count, 0);
        this._telemetryService.sendMSFTTelemetryEvent('embedding.success', {}, {
            batchSize: inputs.length,
            inputTokenCount,
            timeToComplete: Date.now() - startTime
        });
        return rawRequest;
    }
    /**
     * The function which actually makes the request to the API and handles failures.
     * This is separated out from fetchResponse as fetchResponse does some manipulation to the input and handles errors differently
     */
    async rawEmbeddingsFetch(type, endpoint, requestId, inputs, cancellationToken) {
        try {
            const token = await this._authService.getCopilotToken();
            const body = { input: inputs, model: type.model, dimensions: type.dimensions };
            endpoint.interceptBody?.(body);
            const response = await (0, networking_1.postRequest)(this._fetcherService, this._telemetryService, this._capiClientService, endpoint, token.token, await (0, crypto_1.createRequestHMAC)(process_1.env.HMAC_SECRET), 'copilot-panel', requestId, body, undefined, cancellationToken);
            const jsonResponse = response.status === 200 ? await response.json() : await response.text();
            if (response.status === 200 && jsonResponse.data) {
                return { type: 'success', embeddings: jsonResponse.data.map((d) => d.embedding) };
            }
            else {
                return { type: 'failed', reason: jsonResponse.error };
            }
        }
        catch (e) {
            let errorMessage = e?.message ?? 'Unknown error';
            // Timeouts = JSON parse errors because the response is incomplete
            if (errorMessage.match(/Unexpected.*JSON/i)) {
                errorMessage = 'timeout';
            }
            return { type: 'failed', reason: errorMessage };
        }
    }
};
exports.RemoteEmbeddingsComputer = RemoteEmbeddingsComputer;
exports.RemoteEmbeddingsComputer = RemoteEmbeddingsComputer = __decorate([
    __param(0, authentication_1.IAuthenticationService),
    __param(1, capiClient_1.ICAPIClientService),
    __param(2, envService_1.IEnvService),
    __param(3, fetcherService_1.IFetcherService),
    __param(4, logService_1.ILogService),
    __param(5, telemetry_1.ITelemetryService),
    __param(6, endpointProvider_1.IEndpointProvider)
], RemoteEmbeddingsComputer);
//# sourceMappingURL=remoteEmbeddingsComputer.js.map