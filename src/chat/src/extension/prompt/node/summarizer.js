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
exports.ChatSummarizerProvider = void 0;
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../platform/log/common/logService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const summarizedConversationHistory_1 = require("../../prompts/node/agent/summarizedConversationHistory");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const chatVariablesCollection_1 = require("../common/chatVariablesCollection");
const conversation_1 = require("../common/conversation");
const chatParticipantRequestHandler_1 = require("./chatParticipantRequestHandler");
let ChatSummarizerProvider = class ChatSummarizerProvider {
    constructor(logService, endpointProvider, instantiationService, configurationService) {
        this.logService = logService;
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
    }
    async provideChatSummary(context, token) {
        // Check if summarization is enabled via configuration (following Copilot's approach)
        const summarizationEnabled = this.configurationService.getConfig(configurationService_1.ConfigKey.SummarizeAgentConversationHistory);
        if (!summarizationEnabled) {
            return '';
        }
        const { turns } = this.instantiationService.invokeFunction(accessor => (0, chatParticipantRequestHandler_1.addHistoryToConversation)(accessor, context.history));
        const successfulTurns = turns.filter(t => t.responseStatus === conversation_1.TurnStatus.Success);
        // Only summarize when there are successful turns
        if (successfulTurns.length === 0) {
            return '';
        }
        // Use copilot-fast endpoint (following Copilot's approach - gpt-4o-mini for summarization)
        // Fall back to puku-ai if copilot-fast is not available
        let endpoint;
        try {
            endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        }
        catch {
            endpoint = await this.endpointProvider.getChatEndpoint('puku-ai');
        }
        const promptContext = {
            requestId: 'chat-summary',
            query: '',
            history: turns,
            chatVariables: new chatVariablesCollection_1.ChatVariablesCollection(),
            isContinuation: false,
            toolCallRounds: undefined,
            toolCallResults: undefined,
        };
        let allMessages;
        try {
            const rendered = await (0, promptRenderer_1.renderPromptElement)(this.instantiationService, endpoint, summarizedConversationHistory_1.ConversationHistorySummarizationPrompt, {
                priority: 0,
                endpoint,
                location: commonTypes_1.ChatLocation.Panel,
                promptContext,
                maxToolResultLength: 2000,
                triggerSummarize: false,
                simpleMode: false,
                maxSummaryTokens: 7_000,
            }, undefined, token);
            allMessages = rendered.messages;
        }
        catch (err) {
            this.logService.error(`Failed to render conversation summarization prompt: ${err instanceof Error ? err.message : String(err)}`);
            return '';
        }
        const response = await endpoint.makeChatRequest('summarize', allMessages, undefined, token, commonTypes_1.ChatLocation.Panel, undefined, undefined, false);
        if (token.isCancellationRequested) {
            return '';
        }
        if (response.type === commonTypes_1.ChatFetchResponseType.Success) {
            let summary = response.value.trim();
            if (summary.match(/^".*"$/)) {
                summary = summary.slice(1, -1);
            }
            return summary;
        }
        else {
            this.logService.error(`Failed to fetch conversation summary because of response type (${response.type}) and reason (${response.reason})`);
            return '';
        }
    }
};
exports.ChatSummarizerProvider = ChatSummarizerProvider;
exports.ChatSummarizerProvider = ChatSummarizerProvider = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, instantiation_1.IInstantiationService),
    __param(3, configurationService_1.IConfigurationService)
], ChatSummarizerProvider);
//# sourceMappingURL=summarizer.js.map