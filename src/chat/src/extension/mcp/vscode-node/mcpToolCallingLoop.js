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
var McpToolCallingLoop_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpToolCallingLoop = void 0;
const authenticationUpgrade_1 = require("../../../platform/authentication/common/authenticationUpgrade");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../platform/log/common/logService");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const toolCallingLoop_1 = require("../../intents/node/toolCallingLoop");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const mcpToolCallingLoopPrompt_1 = require("./mcpToolCallingLoopPrompt");
const mcpToolCallingTools_1 = require("./mcpToolCallingTools");
let McpToolCallingLoop = class McpToolCallingLoop extends toolCallingLoop_1.ToolCallingLoop {
    static { McpToolCallingLoop_1 = this; }
    static { this.ID = 'mcpToolSetupLoop'; }
    constructor(options, instantiationService, logService, requestLogger, endpointProvider, authenticationChatUpgradeService, telemetryService) {
        super(options, instantiationService, endpointProvider, logService, requestLogger, authenticationChatUpgradeService, telemetryService);
        this.instantiationService = instantiationService;
        this.endpointProvider = endpointProvider;
    }
    async getEndpoint(request) {
        let endpoint = await this.endpointProvider.getChatEndpoint(this.options.request);
        if (!endpoint.supportsToolCalls) {
            endpoint = await this.endpointProvider.getChatEndpoint('gpt-4.1');
        }
        return endpoint;
    }
    async buildPrompt(buildPromptContext, progress, token) {
        const endpoint = await this.getEndpoint(this.options.request);
        const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, mcpToolCallingLoopPrompt_1.McpToolCallingLoopPrompt, {
            promptContext: buildPromptContext,
            ...this.options.props
        });
        return await renderer.render(progress, token);
    }
    async getAvailableTools() {
        if (this.options.conversation.turns.length > 5) {
            return []; // force a response
        }
        return [{
                description: mcpToolCallingTools_1.QuickInputTool.description,
                name: mcpToolCallingTools_1.QuickInputTool.ID,
                inputSchema: mcpToolCallingTools_1.QuickInputTool.schema,
                source: undefined,
                tags: [],
            }, {
                description: mcpToolCallingTools_1.QuickPickTool.description,
                name: mcpToolCallingTools_1.QuickPickTool.ID,
                inputSchema: mcpToolCallingTools_1.QuickPickTool.schema,
                source: undefined,
                tags: [],
            }];
    }
    async fetch(opts, token) {
        const endpoint = await this.getEndpoint(this.options.request);
        return endpoint.makeChatRequest2({
            ...opts,
            debugName: McpToolCallingLoop_1.ID,
            location: commonTypes_1.ChatLocation.Agent,
            requestOptions: {
                ...opts.requestOptions,
                temperature: 0
            },
        }, token);
    }
};
exports.McpToolCallingLoop = McpToolCallingLoop;
exports.McpToolCallingLoop = McpToolCallingLoop = McpToolCallingLoop_1 = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, logService_1.ILogService),
    __param(3, requestLogger_1.IRequestLogger),
    __param(4, endpointProvider_1.IEndpointProvider),
    __param(5, authenticationUpgrade_1.IAuthenticationChatUpgradeService),
    __param(6, telemetry_1.ITelemetryService)
], McpToolCallingLoop);
//# sourceMappingURL=mcpToolCallingLoop.js.map