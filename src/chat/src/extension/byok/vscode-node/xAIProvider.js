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
var XAIBYOKLMProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.XAIBYOKLMProvider = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const baseOpenAICompatibleProvider_1 = require("./baseOpenAICompatibleProvider");
let XAIBYOKLMProvider = class XAIBYOKLMProvider extends baseOpenAICompatibleProvider_1.BaseOpenAICompatibleLMProvider {
    static { XAIBYOKLMProvider_1 = this; }
    static { this.providerName = 'xAI'; }
    constructor(knownModels, byokStorageService, _fetcherService, _logService, _instantiationService) {
        super(0 /* BYOKAuthType.GlobalApiKey */, XAIBYOKLMProvider_1.providerName, 'https://api.x.ai/v1', knownModels, byokStorageService, _fetcherService, _logService, _instantiationService);
    }
    parseModelVersion(modelId) {
        const match = modelId.match(/^grok-(\d+)/);
        return match ? parseInt(match[1], 10) : undefined;
    }
    humanizeModelId(modelId) {
        const parts = modelId.split('-').filter(p => p.length > 0);
        return parts.map(p => {
            if (/^\d+$/.test(p)) {
                return p; // keep pure numbers as-is
            }
            return p.charAt(0).toUpperCase() + p.slice(1);
        }).join(' ');
    }
    async getAllModels() {
        try {
            const response = await this._fetcherService.fetch(`${this._baseUrl}/language-models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this._apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (!data.models || !Array.isArray(data.models)) {
                throw new Error('Invalid response format from xAI API');
            }
            this._logService.trace(`Fetched ${data.models.length} language models from xAI`);
            const modelList = {};
            for (const model of data.models) {
                if (this._knownModels && this._knownModels[model.id]) {
                    modelList[model.id] = this._knownModels[model.id];
                    continue;
                }
                // Add new model with reasonable defaults
                let maxInputTokens;
                let maxOutputTokens;
                // Coding models and Grok 4+ models have larger context windows
                const parsedVersion = this.parseModelVersion(model.id) ?? 0;
                if (model.id.startsWith('grok-code') || parsedVersion >= 4) {
                    maxInputTokens = 120000;
                    maxOutputTokens = 120000;
                }
                else {
                    maxInputTokens = 80000;
                    maxOutputTokens = 30000;
                }
                modelList[model.id] = {
                    name: this.humanizeModelId(model.id),
                    toolCalling: true,
                    vision: model.input_modalities.includes('image'),
                    maxInputTokens,
                    maxOutputTokens,
                };
            }
            this._logService.trace(`Combined to ${Object.keys(modelList).length} known models for xAI`);
            return modelList;
        }
        catch (error) {
            throw new Error(error.message ? error.message : error);
        }
    }
};
exports.XAIBYOKLMProvider = XAIBYOKLMProvider;
exports.XAIBYOKLMProvider = XAIBYOKLMProvider = XAIBYOKLMProvider_1 = __decorate([
    __param(2, fetcherService_1.IFetcherService),
    __param(3, logService_1.ILogService),
    __param(4, instantiation_1.IInstantiationService)
], XAIBYOKLMProvider);
//# sourceMappingURL=xAIProvider.js.map