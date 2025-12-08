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
exports.DevContainerConfigGenerator = void 0;
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const strings_1 = require("../../../util/vs/base/common/strings");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const devContainerConfigPrompt_1 = require("../../prompts/node/devcontainer/devContainerConfigPrompt");
const excludedTemplates = [
    'alpine',
    'debian',
    'docker-existing-docker-compose',
    'docker-existing-dockerfile',
    'docker-in-docker',
    'docker-outside-of-docker',
    'docker-outside-of-docker-compose',
    'ubuntu',
    'universal',
].map(shortId => `ghcr.io/devcontainers/templates/${shortId}`);
const excludedFeatures = [
    'common-utils',
    'git',
].map(shortId => `ghcr.io/devcontainers/features/${shortId}`);
let DevContainerConfigGenerator = class DevContainerConfigGenerator {
    constructor(telemetryService, endpointProvider, instantiationService) {
        this.telemetryService = telemetryService;
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
    }
    async generate(index, filenames, token) {
        if (!filenames.length) {
            return {
                type: 'success',
                template: undefined,
                features: [],
            };
        }
        const startTime = Date.now();
        const endpoint = await this.endpointProvider.getChatEndpoint('gpt-4.1');
        const charLimit = Math.floor((endpoint.modelMaxPromptTokens * 4) / 3);
        const processedFilenames = this.processFilenames(filenames, charLimit);
        const templates = index.templates.filter(template => !excludedTemplates.includes(template.id));
        const features = (index.features || []).filter(feature => !excludedFeatures.includes(feature.id));
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, devContainerConfigPrompt_1.DevContainerConfigPrompt, {
            filenames: processedFilenames,
            templates,
            features,
        });
        const prompt = await promptRenderer.render();
        const requestStartTime = Date.now();
        const fetchResult = await endpoint
            .makeChatRequest('devContainerConfigGenerator', prompt.messages, undefined, token, commonTypes_1.ChatLocation.Other);
        const suggestions = fetchResult.type === commonTypes_1.ChatFetchResponseType.Success ? this.processGeneratedConfig(fetchResult.value, templates, features) : undefined;
        /* __GDPR__
            "devcontainer.generateConfig" : {
                "owner": "chrmarti",
                "comment": "Metadata about the Dev Container Config generation",
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that is used in the endpoint." },
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                "responseType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The result type of the response." },
                "templateId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The chosen template id." },
                "featureIds": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The chosen feature ids." },
                "originalFilenameCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of filenames." },
                "originalFilenameLength": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The length of the filenames." },
                "processedFilenameCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of filenames after processing." },
                "processedFilenameLength": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The length of the filenames after processing." },
                "timeToRequest": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "How long it took to start the request." },
                "timeToComplete": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "How long it took to complete the request." }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('devcontainer.generateConfig', {
            model: endpoint.model,
            requestId: fetchResult.requestId,
            responseType: fetchResult.type,
            templateId: suggestions?.template,
            featureIds: suggestions?.features.join(','),
        }, {
            originalFilenameCount: filenames.length,
            originalFilenameLength: filenames.join('').length,
            processedFilenameCount: processedFilenames.length,
            processedFilenameLength: processedFilenames.join('').length,
            timeToRequest: requestStartTime - startTime,
            timeToComplete: Date.now() - startTime
        });
        return {
            type: 'success',
            template: suggestions?.template,
            features: suggestions?.features || [],
        };
    }
    processFilenames(filenames, charLimit) {
        const result = [...filenames];
        // Reserve 10% of the character limit for the safety rules and instructions
        const availableChars = Math.floor(charLimit * 0.9);
        // Remove filenames if needed
        let totalChars = result.join('\n').length;
        if (totalChars > availableChars) {
            // Remove filenames until we are under the character limit
            while (totalChars > availableChars && result.length > 0) {
                const lastDiff = result.pop();
                totalChars -= lastDiff.length;
            }
        }
        return result;
    }
    processGeneratedConfig(message, availableTemplates, availableFeatures) {
        let template = availableTemplates.find(t => new RegExp(`\\b${(0, strings_1.escapeRegExpCharacters)(t.id)}\\b`).test(message))?.id;
        if (template === 'ghcr.io/devcontainers/templates/javascript-node') {
            template = 'ghcr.io/devcontainers/templates/typescript-node'; // Rarely suggested otherwise.
        }
        return {
            template: template,
            features: availableFeatures.filter(f => new RegExp(`\\b${(0, strings_1.escapeRegExpCharacters)(f.id)}\\b`).test(message)).map(f => f.id),
        };
    }
};
exports.DevContainerConfigGenerator = DevContainerConfigGenerator;
exports.DevContainerConfigGenerator = DevContainerConfigGenerator = __decorate([
    __param(0, telemetry_1.ITelemetryService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, instantiation_1.IInstantiationService)
], DevContainerConfigGenerator);
//# sourceMappingURL=devContainerConfigGenerator.js.map