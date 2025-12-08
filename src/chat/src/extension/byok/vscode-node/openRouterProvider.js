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
var OpenRouterLMProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterLMProvider = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const baseOpenAICompatibleProvider_1 = require("./baseOpenAICompatibleProvider");
let OpenRouterLMProvider = class OpenRouterLMProvider extends baseOpenAICompatibleProvider_1.BaseOpenAICompatibleLMProvider {
    static { OpenRouterLMProvider_1 = this; }
    static { this.providerName = 'OpenRouter'; }
    constructor(byokStorageService, _fetcherService, _logService, _instantiationService) {
        super(0 /* BYOKAuthType.GlobalApiKey */, OpenRouterLMProvider_1.providerName, 'https://openrouter.ai/api/v1', undefined, byokStorageService, _fetcherService, _logService, _instantiationService);
    }
    async getAllModels() {
        try {
            const response = await this._fetcherService.fetch('https://openrouter.ai/api/v1/models?supported_parameters=tools', { method: 'GET' });
            const data = await response.json();
            const knownModels = {};
            for (const model of data.data) {
                knownModels[model.id] = {
                    name: model.name,
                    toolCalling: model.supported_parameters?.includes('tools') ?? false,
                    vision: model.architecture?.input_modalities?.includes('image') ?? false,
                    maxInputTokens: model.top_provider.context_length - 16000,
                    maxOutputTokens: 16000
                };
            }
            this._knownModels = knownModels;
            return knownModels;
        }
        catch (error) {
            this._logService.error(error, `Error fetching available OpenRouter models`);
            throw error;
        }
    }
};
exports.OpenRouterLMProvider = OpenRouterLMProvider;
exports.OpenRouterLMProvider = OpenRouterLMProvider = OpenRouterLMProvider_1 = __decorate([
    __param(1, fetcherService_1.IFetcherService),
    __param(2, logService_1.ILogService),
    __param(3, instantiation_1.IInstantiationService)
], OpenRouterLMProvider);
//# sourceMappingURL=openRouterProvider.js.map