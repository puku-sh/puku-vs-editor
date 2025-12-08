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
var TestModelMetadataFetcher_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestEndpointProvider = exports.TestModelMetadataFetcher = void 0;
const cache_1 = require("../../../../../test/base/cache");
const salts_1 = require("../../../../../test/base/salts");
const tokenizer_1 = require("../../../../util/common/tokenizer");
const async_1 = require("../../../../util/vs/base/common/async");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const authentication_1 = require("../../../authentication/common/authentication");
const configurationService_1 = require("../../../configuration/common/configurationService");
const envService_1 = require("../../../env/common/envService");
const logService_1 = require("../../../log/common/logService");
const fetcherService_1 = require("../../../networking/common/fetcherService");
const requestLogger_1 = require("../../../requestLogger/node/requestLogger");
const nullExperimentationService_1 = require("../../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../telemetry/common/telemetry");
const capiClient_1 = require("../../common/capiClient");
const embeddingsEndpoint_1 = require("../../node/embeddingsEndpoint");
const modelMetadataFetcher_1 = require("../../node/modelMetadataFetcher");
const azureEndpoint_1 = require("./azureEndpoint");
const capiEndpoint_1 = require("./capiEndpoint");
const customNesEndpoint_1 = require("./customNesEndpoint");
const openaiCompatibleEndpoint_1 = require("./openaiCompatibleEndpoint");
async function getModelMetadataMap(modelMetadataFetcher) {
    let metadataArray = [];
    try {
        metadataArray = await modelMetadataFetcher.getAllChatModels();
    }
    catch (e) {
        metadataArray = [];
        // We only want to catch errors for the model lab models, otherwise we have no models to test and should just throw the error
        if (!modelMetadataFetcher.isModelLab) {
            throw e;
        }
    }
    const metadataMap = new Map();
    metadataArray.forEach(metadata => {
        metadataMap.set(metadata.id, metadata);
    });
    return metadataMap;
}
class ModelMetadataRequest {
    constructor(hash) {
        this.hash = hash;
    }
}
let TestModelMetadataFetcher = class TestModelMetadataFetcher extends modelMetadataFetcher_1.ModelMetadataFetcher {
    static { TestModelMetadataFetcher_1 = this; }
    static { this.Queues = new async_1.SequencerByKey(); }
    get isModelLab() { return this._isModelLab; }
    constructor(collectFetcherTelemetry, _isModelLab, info, _skipModelMetadataCache = false, _fetcher, _capiClientService, _configService, _expService, _envService, _authService, _telemetryService, _logService, _instantiationService, _requestLogger) {
        super(collectFetcherTelemetry, _isModelLab, _fetcher, _requestLogger, _capiClientService, _configService, _expService, _envService, _authService, _telemetryService, _logService, _instantiationService);
        this._skipModelMetadataCache = _skipModelMetadataCache;
        this.cache = new cache_1.SQLiteCache('modelMetadata', salts_1.TestingCacheSalts.modelMetadata, info);
    }
    async getAllChatModels() {
        const type = this._isModelLab ? 'modelLab' : 'prod';
        const req = new ModelMetadataRequest(type);
        return await TestModelMetadataFetcher_1.Queues.queue(type, async () => {
            if (this._skipModelMetadataCache) {
                return super.getAllChatModels();
            }
            const result = await this.cache.get(req);
            if (result) {
                return result;
            }
            // If the cache doesn't have the result, we need to fetch it
            const modelInfo = await super.getAllChatModels();
            await this.cache.set(req, modelInfo);
            return modelInfo;
        });
    }
};
exports.TestModelMetadataFetcher = TestModelMetadataFetcher;
exports.TestModelMetadataFetcher = TestModelMetadataFetcher = TestModelMetadataFetcher_1 = __decorate([
    __param(4, fetcherService_1.IFetcherService),
    __param(5, capiClient_1.ICAPIClientService),
    __param(6, configurationService_1.IConfigurationService),
    __param(7, nullExperimentationService_1.IExperimentationService),
    __param(8, envService_1.IEnvService),
    __param(9, authentication_1.IAuthenticationService),
    __param(10, telemetry_1.ITelemetryService),
    __param(11, logService_1.ILogService),
    __param(12, instantiation_1.IInstantiationService),
    __param(13, requestLogger_1.IRequestLogger)
], TestModelMetadataFetcher);
let TestEndpointProvider = class TestEndpointProvider {
    constructor(gpt4ModelToRunAgainst, gpt4oMiniModelToRunAgainst, _fastRewriteModelToRunAgainst, info, skipModelMetadataCache, customModelConfigs = new Map(), _instantiationService) {
        this.gpt4ModelToRunAgainst = gpt4ModelToRunAgainst;
        this.gpt4oMiniModelToRunAgainst = gpt4oMiniModelToRunAgainst;
        this.customModelConfigs = customModelConfigs;
        this._instantiationService = _instantiationService;
        this._chatEndpoints = new Map();
        const prodModelMetadata = this._instantiationService.createInstance(TestModelMetadataFetcher, undefined, false, info, skipModelMetadataCache);
        const modelLabModelMetadata = this._instantiationService.createInstance(TestModelMetadataFetcher, undefined, true, info, skipModelMetadataCache);
        this._prodChatModelMetadata = getModelMetadataMap(prodModelMetadata);
        this._modelLabChatModelMetadata = getModelMetadataMap(modelLabModelMetadata);
    }
    async getChatEndpointInfo(model, modelLabMetadata, prodMetadata) {
        let chatEndpoint = this._chatEndpoints.get(model);
        if (!chatEndpoint) {
            const customModel = this.customModelConfigs.get(model);
            if (customModel !== undefined) {
                chatEndpoint = this._instantiationService.createInstance(openaiCompatibleEndpoint_1.OpenAICompatibleTestEndpoint, customModel);
            }
            else if (model === "custom-nes" /* CHAT_MODEL.CUSTOM_NES */) {
                chatEndpoint = this._instantiationService.createInstance(customNesEndpoint_1.CustomNesEndpoint);
            }
            else if (model === "experimental-01" /* CHAT_MODEL.EXPERIMENTAL */) {
                chatEndpoint = this._instantiationService.createInstance(azureEndpoint_1.AzureTestEndpoint, model);
            }
            else {
                const isProdModel = prodMetadata.has(model);
                const modelMetadata = isProdModel ? prodMetadata.get(model) : modelLabMetadata.get(model);
                if (!modelMetadata) {
                    throw new Error(`Model ${model} not found`);
                }
                chatEndpoint = this._instantiationService.createInstance(capiEndpoint_1.CAPITestEndpoint, modelMetadata, !isProdModel);
            }
            this._chatEndpoints.set(model, chatEndpoint);
        }
        return chatEndpoint;
    }
    async getAllCompletionModels(forceRefresh) {
        throw new Error('getAllCompletionModels is not implemented in TestEndpointProvider');
    }
    async getAllChatEndpoints() {
        const modelIDs = new Set([
            "custom-nes" /* CHAT_MODEL.CUSTOM_NES */
        ]);
        if (this.customModelConfigs.size > 0) {
            this.customModelConfigs.forEach(config => {
                modelIDs.add(config.name);
            });
        }
        const modelLabMetadata = await this._modelLabChatModelMetadata;
        const prodMetadata = await this._prodChatModelMetadata;
        modelLabMetadata.forEach((modelMetadata) => {
            modelIDs.add(modelMetadata.id);
        });
        prodMetadata.forEach((modelMetadata) => {
            modelIDs.add(modelMetadata.id);
        });
        for (const model of modelIDs) {
            this._chatEndpoints.set(model, await this.getChatEndpointInfo(model, modelLabMetadata, prodMetadata));
        }
        return Array.from(this._chatEndpoints.values());
    }
    async getChatEndpoint(requestOrFamilyOrModel) {
        if (typeof requestOrFamilyOrModel !== 'string') {
            requestOrFamilyOrModel = 'gpt-4.1';
        }
        if (requestOrFamilyOrModel === 'gpt-4.1') {
            return await this.getChatEndpointInfo(this.gpt4ModelToRunAgainst ?? "gpt-4.1-2025-04-14" /* CHAT_MODEL.GPT41 */, await this._modelLabChatModelMetadata, await this._prodChatModelMetadata);
        }
        else {
            return await this.getChatEndpointInfo(this.gpt4oMiniModelToRunAgainst ?? "gpt-4o-mini" /* CHAT_MODEL.GPT4OMINI */, await this._modelLabChatModelMetadata, await this._prodChatModelMetadata);
        }
    }
    async getEmbeddingsEndpoint(family) {
        const id = "text-embedding-3-small" /* LEGACY_EMBEDDING_MODEL_ID.TEXT3SMALL */;
        const modelInformation = {
            id: id,
            name: id,
            version: '1.0',
            model_picker_enabled: false,
            is_chat_default: false,
            billing: { is_premium: false, multiplier: 0 },
            is_chat_fallback: false,
            capabilities: {
                type: 'embeddings',
                tokenizer: tokenizer_1.TokenizerType.O200K,
                family: 'test'
            }
        };
        this._testEmbeddingEndpoint ??= this._instantiationService.createInstance(embeddingsEndpoint_1.EmbeddingEndpoint, modelInformation);
        return this._testEmbeddingEndpoint;
    }
};
exports.TestEndpointProvider = TestEndpointProvider;
exports.TestEndpointProvider = TestEndpointProvider = __decorate([
    __param(6, instantiation_1.IInstantiationService)
], TestEndpointProvider);
//# sourceMappingURL=testEndpointProvider.js.map