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
exports.PukuEmbeddingsComputer = void 0;
const configurationService_1 = require("../../configuration/common/configurationService");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const fileSystemService_1 = require("../../filesystem/common/fileSystemService");
const logExecTime_1 = require("../../log/common/logExecTime");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const embeddingsComputer_1 = require("../common/embeddingsComputer");
const pukuEmbeddingsCache_1 = require("./pukuEmbeddingsCache");
let PukuEmbeddingsComputer = class PukuEmbeddingsComputer {
    constructor(_fetcherService, _logService, _telemetryService, _configurationService, _extensionContext, _fileSystemService) {
        this._fetcherService = _fetcherService;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._configurationService = _configurationService;
        this._extensionContext = _extensionContext;
        this._fileSystemService = _fileSystemService;
        this.batchSize = 100;
        this._cacheInitialized = false;
        // Get configuration values with defaults
        this._endpoint = this._configurationService.getNonExtensionConfig('puku.embeddings.endpoint') || 'https://api.puku.sh/v1/embeddings';
        this._model = this._configurationService.getNonExtensionConfig('puku.embeddings.model') || 'mistralai/codestral-embed-2505';
        this._dimensions = this._configurationService.getNonExtensionConfig('puku.embeddings.dimensions') || 1024;
        this._authToken = this._configurationService.getNonExtensionConfig('puku.embeddings.token');
        // Initialize cache
        this._cache = new pukuEmbeddingsCache_1.PukuEmbeddingsCache(this._extensionContext.globalStorageUri, this._fileSystemService, this._logService);
    }
    async computeEmbeddings(type, inputs, options, telemetryInfo, cancellationToken) {
        return (0, logExecTime_1.logExecTime)(this._logService, 'PukuEmbeddingsComputer::computeEmbeddings', async () => {
            if (inputs.length === 0) {
                return { type, values: [] };
            }
            // Initialize cache if not already done
            if (!this._cacheInitialized) {
                await this._cache.load();
                this._cacheInitialized = true;
            }
            // Use codestralEmbed type for Codestral Embed model
            const embeddingType = type.equals(embeddingsComputer_1.EmbeddingType.text3small_512) && this._model.includes('codestral')
                ? embeddingsComputer_1.EmbeddingType.codestralEmbed
                : type;
            const embeddingsOut = [];
            const inputsToFetch = [];
            // Check cache for each input
            for (let i = 0; i < inputs.length; i++) {
                const input = inputs[i];
                const hash = pukuEmbeddingsCache_1.PukuEmbeddingsCache.computeHash(input);
                const cacheKey = `${embeddingType.id}-${hash}`;
                const cached = await this._cache.get(cacheKey, hash);
                if (cached) {
                    embeddingsOut[i] = cached;
                }
                else {
                    inputsToFetch.push({ index: i, input, hash });
                }
            }
            // Fetch missing embeddings in batches
            if (inputsToFetch.length > 0) {
                for (let i = 0; i < inputsToFetch.length; i += this.batchSize) {
                    const batch = inputsToFetch.slice(i, i + this.batchSize);
                    if (!batch.length) {
                        break;
                    }
                    if (cancellationToken?.isCancellationRequested) {
                        throw new Error('Embeddings computation cancelled');
                    }
                    try {
                        const batchInputs = batch.map(b => b.input);
                        const headers = {
                            'Content-Type': 'application/json',
                        };
                        // Add Authorization header if token is configured
                        if (this._authToken) {
                            headers['Authorization'] = `Bearer ${this._authToken}`;
                        }
                        const response = await this._fetcherService.fetch(this._endpoint, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                input: batchInputs,
                                model: this._model,
                                dimensions: this._dimensions,
                            }),
                        });
                        if (!response.ok) {
                            const errorText = await response.text();
                            this._logService.error(`Embeddings API error: ${response.status} ${errorText}`);
                            this._telemetryService.sendMSFTTelemetryErrorEvent('puku.embeddings.error', {
                                statusCode: String(response.status),
                                error: errorText.substring(0, 200),
                            });
                            throw new Error(`Error fetching embeddings: ${response.status} ${errorText}`);
                        }
                        const jsonResponse = await response.json();
                        if (batch.length !== jsonResponse.data.length) {
                            throw new Error(`Mismatched embedding result count. Expected: ${batch.length}. Got: ${jsonResponse.data.length}`);
                        }
                        // Store embeddings in output array and cache
                        for (let j = 0; j < batch.length; j++) {
                            const batchItem = batch[j];
                            const embedding = {
                                type: embeddingType,
                                value: jsonResponse.data[j].embedding,
                            };
                            embeddingsOut[batchItem.index] = embedding;
                            const cacheKey = `${embeddingType.id}-${batchItem.hash}`;
                            await this._cache.set(cacheKey, batchItem.hash, embedding);
                        }
                        // Log success telemetry
                        this._telemetryService.sendMSFTTelemetryEvent('puku.embeddings.success', {
                            model: this._model,
                            correlationId: telemetryInfo?.correlationId,
                        }, {
                            batchSize: batch.length,
                            totalTokens: jsonResponse.usage.total_tokens,
                        });
                    }
                    catch (error) {
                        this._logService.error('PukuEmbeddingsComputer error:', error);
                        this._telemetryService.sendMSFTTelemetryErrorEvent('puku.embeddings.error', {
                            error: error instanceof Error ? error.message : 'Unknown error',
                        });
                        throw error;
                    }
                }
                // Persist cache after fetching
                await this._cache.persist();
            }
            // Ensure all embeddings are in order
            const finalEmbeddings = inputs.map((_, index) => embeddingsOut[index]).filter((e) => e !== undefined);
            return { type: embeddingType, values: finalEmbeddings };
        });
    }
};
exports.PukuEmbeddingsComputer = PukuEmbeddingsComputer;
exports.PukuEmbeddingsComputer = PukuEmbeddingsComputer = __decorate([
    __param(0, fetcherService_1.IFetcherService),
    __param(1, logService_1.ILogService),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, configurationService_1.IConfigurationService),
    __param(4, extensionContext_1.IVSCodeExtensionContext),
    __param(5, fileSystemService_1.IFileSystemService)
], PukuEmbeddingsComputer);
//# sourceMappingURL=pukuEmbeddingsComputer.js.map