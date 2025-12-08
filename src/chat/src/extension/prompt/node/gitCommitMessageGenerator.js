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
exports.GitCommitMessageGenerator = void 0;
const authentication_1 = require("../../../platform/authentication/common/authentication");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const conversationOptions_1 = require("../../../platform/chat/common/conversationOptions");
const interactionService_1 = require("../../../platform/chat/common/interactionService");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const notificationService_1 = require("../../../platform/notification/common/notificationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const gitCommitMessagePrompt_1 = require("../../prompts/node/git/gitCommitMessagePrompt");
let GitCommitMessageGenerator = class GitCommitMessageGenerator {
    constructor(conversationOptions, endpointProvider, instantiationService, telemetryService, notificationService, interactionService, authService) {
        this.conversationOptions = conversationOptions;
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
        this.telemetryService = telemetryService;
        this.notificationService = notificationService;
        this.interactionService = interactionService;
        this.authService = authService;
    }
    async generateGitCommitMessage(repositoryName, branchName, changes, recentCommitMessages, attemptCount, token) {
        const startTime = Date.now();
        const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, gitCommitMessagePrompt_1.GitCommitMessagePrompt, { repositoryName, branchName, changes, recentCommitMessages });
        const prompt = await promptRenderer.render(undefined, undefined);
        const temperature = Math.min(this.conversationOptions.temperature * (1 + attemptCount), 2 /* MAX temperature - https://platform.openai.com/docs/api-reference/chat/create#chat/create-temperature */);
        const requestStartTime = Date.now();
        this.interactionService.startInteraction();
        const fetchResult = await endpoint
            .makeChatRequest('gitCommitMessageGenerator', prompt.messages, undefined, token, commonTypes_1.ChatLocation.Other, undefined, { temperature }, true);
        /* __GDPR__
            "git.generateCommitMessage" : {
                "owner": "lszomoru",
                "comment": "Metadata about the git commit message generation",
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that is used in the endpoint." },
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                "responseType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The result type of the response." },
                "attemptCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many times the user has retried." },
                "diffFileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of files in the commit." },
                "diffLength": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The length of the diffs in the commit." },
                "timeToRequest": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "How long it took to start the request." },
                "timeToComplete": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "How long it took to complete the request." }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('git.generateCommitMessage', {
            model: endpoint.model,
            requestId: fetchResult.requestId,
            responseType: fetchResult.type
        }, {
            attemptCount: attemptCount + 1,
            diffFileCount: changes.length,
            diffLength: changes.map(c => c.diff).join('').length,
            timeToRequest: requestStartTime - startTime,
            timeToComplete: Date.now() - startTime
        });
        if (fetchResult.type === commonTypes_1.ChatFetchResponseType.QuotaExceeded || (fetchResult.type === commonTypes_1.ChatFetchResponseType.RateLimited && this.authService.copilotToken?.isNoAuthUser)) {
            await this.notificationService.showQuotaExceededDialog({ isNoAuthUser: this.authService.copilotToken?.isNoAuthUser ?? false });
            return undefined;
        }
        if (fetchResult.type !== commonTypes_1.ChatFetchResponseType.Success) {
            return undefined;
        }
        const [responseFormat, commitMessage] = this.processGeneratedCommitMessage(fetchResult.value);
        if (responseFormat !== 'oneTextCodeBlock') {
            /* __GDPR__
                "git.generateCommitMessageIncorrectResponseFormat" : {
                    "owner": "lszomoru",
                    "comment": "Metadata about the git commit message generation when the response is not in the expected format",
                    "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                    "responseFormat": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The type of the response format." }
                }
            */
            this.telemetryService.sendMSFTTelemetryEvent('git.generateCommitMessageIncorrectResponseFormat', { requestId: fetchResult.requestId, responseFormat });
        }
        return commitMessage;
    }
    processGeneratedCommitMessage(raw) {
        const textCodeBlockRegex = /^```text\s*([\s\S]+?)\s*```$/m;
        const textCodeBlockMatch = textCodeBlockRegex.exec(raw);
        if (textCodeBlockMatch === null) {
            return ['noTextCodeBlock', raw];
        }
        if (textCodeBlockMatch.length !== 2) {
            return ['multipleTextCodeBlocks', raw];
        }
        return ['oneTextCodeBlock', textCodeBlockMatch[1]];
    }
};
exports.GitCommitMessageGenerator = GitCommitMessageGenerator;
exports.GitCommitMessageGenerator = GitCommitMessageGenerator = __decorate([
    __param(0, conversationOptions_1.IConversationOptions),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, instantiation_1.IInstantiationService),
    __param(3, telemetry_1.ITelemetryService),
    __param(4, notificationService_1.INotificationService),
    __param(5, interactionService_1.IInteractionService),
    __param(6, authentication_1.IAuthenticationService)
], GitCommitMessageGenerator);
//# sourceMappingURL=gitCommitMessageGenerator.js.map