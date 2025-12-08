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
var AzureBYOKModelProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureBYOKModelProvider = void 0;
exports.resolveAzureUrl = resolveAzureUrl;
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const logService_1 = require("../../../platform/log/common/logService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const customOAIProvider_1 = require("./customOAIProvider");
function resolveAzureUrl(modelId, url) {
    // The fully resolved url was already passed in
    if ((0, customOAIProvider_1.hasExplicitApiPath)(url)) {
        return url;
    }
    // Remove the trailing slash
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    // if url ends with `/v1` remove it
    if (url.endsWith('/v1')) {
        url = url.slice(0, -3);
    }
    // Default to chat completions for base URLs
    const defaultApiPath = '/chat/completions';
    if (url.includes('models.ai.azure.com') || url.includes('inference.ml.azure.com')) {
        return `${url}/v1${defaultApiPath}`;
    }
    else if (url.includes('openai.azure.com')) {
        return `${url}/openai/deployments/${modelId}${defaultApiPath}?api-version=2025-01-01-preview`;
    }
    else {
        throw new Error(`Unrecognized Azure deployment URL: ${url}`);
    }
}
let AzureBYOKModelProvider = class AzureBYOKModelProvider extends customOAIProvider_1.CustomOAIBYOKModelProvider {
    static { AzureBYOKModelProvider_1 = this; }
    static { this.providerName = 'Azure'; }
    constructor(byokStorageService, configurationService, logService, instantiationService, experimentationService) {
        super(byokStorageService, configurationService, logService, instantiationService, experimentationService);
        // Override the instance properties
        this.providerName = AzureBYOKModelProvider_1.providerName;
    }
    getConfigKey() {
        return configurationService_1.ConfigKey.AzureModels;
    }
    resolveUrl(modelId, url) {
        return resolveAzureUrl(modelId, url);
    }
};
exports.AzureBYOKModelProvider = AzureBYOKModelProvider;
exports.AzureBYOKModelProvider = AzureBYOKModelProvider = AzureBYOKModelProvider_1 = __decorate([
    __param(1, configurationService_1.IConfigurationService),
    __param(2, logService_1.ILogService),
    __param(3, instantiation_1.IInstantiationService),
    __param(4, nullExperimentationService_1.IExperimentationService)
], AzureBYOKModelProvider);
//# sourceMappingURL=azureProvider.js.map