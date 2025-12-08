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
exports.ConditionalEmbeddingsComputer = void 0;
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const remoteEmbeddingsComputer_1 = require("../../../platform/embeddings/common/remoteEmbeddingsComputer");
const pukuEmbeddingsComputer_1 = require("../../../platform/embeddings/node/pukuEmbeddingsComputer");
/**
 * Conditionally uses PukuEmbeddingsComputer if puku embeddings endpoint is configured,
 * otherwise falls back to RemoteEmbeddingsComputer
 */
let ConditionalEmbeddingsComputer = class ConditionalEmbeddingsComputer {
    constructor(_configurationService, _instantiationService) {
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
    }
    getDelegate() {
        if (!this._delegate) {
            // Use PukuEmbeddingsComputer if:
            // 1. PukuAI endpoint is configured (indicates using Puku AI)
            // 2. Ollama endpoint is configured (indicates using proxy/Ollama)
            // 3. Puku embeddings endpoint is explicitly configured
            if (this._shouldUsePukuEmbeddings()) {
                this._delegate = this._instantiationService.createInstance(pukuEmbeddingsComputer_1.PukuEmbeddingsComputer);
            }
            else {
                this._delegate = this._instantiationService.createInstance(remoteEmbeddingsComputer_1.RemoteEmbeddingsComputer);
            }
        }
        return this._delegate;
    }
    _shouldUsePukuEmbeddings() {
        // Check if PukuAI endpoint is configured, which indicates we're using Puku AI
        const pukuAIEndpoint = this._configurationService.getNonExtensionConfig('pukuai.endpoint');
        const ollamaEndpoint = this._configurationService.getNonExtensionConfig('puku.chat.byok.ollamaEndpoint');
        const pukuEmbeddingsEndpoint = this._configurationService.getNonExtensionConfig('puku.embeddings.endpoint');
        // Use Puku embeddings if any of these are configured
        return !!(pukuAIEndpoint || ollamaEndpoint || pukuEmbeddingsEndpoint);
    }
    async computeEmbeddings(type, inputs, options, telemetryInfo, cancellationToken) {
        return this.getDelegate().computeEmbeddings(type, inputs, options, telemetryInfo, cancellationToken);
    }
};
exports.ConditionalEmbeddingsComputer = ConditionalEmbeddingsComputer;
exports.ConditionalEmbeddingsComputer = ConditionalEmbeddingsComputer = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, instantiation_1.IInstantiationService)
], ConditionalEmbeddingsComputer);
//# sourceMappingURL=conditionalEmbeddingsComputer.js.map