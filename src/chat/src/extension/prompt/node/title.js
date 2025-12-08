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
exports.ChatTitleProvider = void 0;
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../platform/log/common/logService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const title_1 = require("../../prompts/node/panel/title");
const conversation_1 = require("../common/conversation");
const chatParticipantRequestHandler_1 = require("./chatParticipantRequestHandler");
let ChatTitleProvider = class ChatTitleProvider {
    constructor(logService, endpointProvider, instantiationService) {
        this.logService = logService;
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
    }
    async provideChatTitle(context, token) {
        const { turns } = this.instantiationService.invokeFunction(accessor => (0, chatParticipantRequestHandler_1.addHistoryToConversation)(accessor, context.history));
        if (turns.filter(t => t.responseStatus === conversation_1.TurnStatus.Success).length === 0) {
            return '';
        }
        const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        const { messages } = await (0, promptRenderer_1.renderPromptElement)(this.instantiationService, endpoint, title_1.TitlePrompt, { history: turns });
        const response = await endpoint.makeChatRequest('title', messages, undefined, token, commonTypes_1.ChatLocation.Panel, undefined, undefined, false);
        if (token.isCancellationRequested) {
            return '';
        }
        if (response.type === commonTypes_1.ChatFetchResponseType.Success) {
            let title = response.value.trim();
            if (title.match(/^".*"$/)) {
                title = title.slice(1, -1);
            }
            return title;
        }
        else {
            this.logService.error(`Failed to fetch conversation title because of response type (${response.type}) and reason (${response.reason})`);
            return '';
        }
    }
};
exports.ChatTitleProvider = ChatTitleProvider;
exports.ChatTitleProvider = ChatTitleProvider = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, instantiation_1.IInstantiationService)
], ChatTitleProvider);
//# sourceMappingURL=title.js.map