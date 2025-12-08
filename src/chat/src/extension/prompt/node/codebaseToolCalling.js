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
var CodebaseToolCallingLoop_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodebaseToolCallingLoop = void 0;
const crypto_1 = require("crypto");
const authenticationUpgrade_1 = require("../../../platform/authentication/common/authenticationUpgrade");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../platform/log/common/logService");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const toolCallingLoop_1 = require("../../intents/node/toolCallingLoop");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const codebaseAgentPrompt_1 = require("../../prompts/node/panel/codebaseAgentPrompt");
const toolsService_1 = require("../../tools/common/toolsService");
let CodebaseToolCallingLoop = class CodebaseToolCallingLoop extends toolCallingLoop_1.ToolCallingLoop {
    static { CodebaseToolCallingLoop_1 = this; }
    static { this.ID = 'codebaseTool'; }
    constructor(options, instantiationService, logService, requestLogger, endpointProvider, toolsService, authenticationChatUpgradeService, telemetryService) {
        super(options, instantiationService, endpointProvider, logService, requestLogger, authenticationChatUpgradeService, telemetryService);
        this.instantiationService = instantiationService;
        this.endpointProvider = endpointProvider;
        this.toolsService = toolsService;
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
        const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, codebaseAgentPrompt_1.CodebaseAgentPrompt, {
            promptContext: buildPromptContext
        });
        return await renderer.render(progress, token);
    }
    async getAvailableTools() {
        const endpoint = await this.getEndpoint(this.options.request);
        return this.toolsService.getEnabledTools(this.options.request, endpoint, tool => tool.tags.includes('vscode_codesearch'));
    }
    async fetch({ messages, finishedCb, requestOptions }, token) {
        const endpoint = await this.getEndpoint(this.options.request);
        return endpoint.makeChatRequest(CodebaseToolCallingLoop_1.ID, messages, finishedCb, token, this.options.location, undefined, {
            ...requestOptions,
            temperature: 0
        }, 
        // This loop is inside a tool called from another request, so never user initiated
        false, {
            messageId: (0, crypto_1.randomUUID)(), // @TODO@joyceerhl
            messageSource: CodebaseToolCallingLoop_1.ID
        });
    }
};
exports.CodebaseToolCallingLoop = CodebaseToolCallingLoop;
exports.CodebaseToolCallingLoop = CodebaseToolCallingLoop = CodebaseToolCallingLoop_1 = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, logService_1.ILogService),
    __param(3, requestLogger_1.IRequestLogger),
    __param(4, endpointProvider_1.IEndpointProvider),
    __param(5, toolsService_1.IToolsService),
    __param(6, authenticationUpgrade_1.IAuthenticationChatUpgradeService),
    __param(7, telemetry_1.ITelemetryService)
], CodebaseToolCallingLoop);
//# sourceMappingURL=codebaseToolCalling.js.map