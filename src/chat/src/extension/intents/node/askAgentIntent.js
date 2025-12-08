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
var AskAgentIntent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AskAgentIntentInvocation = exports.AskAgentIntent = void 0;
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const envService_1 = require("../../../platform/env/common/envService");
const logService_1 = require("../../../platform/log/common/logService");
const editLogService_1 = require("../../../platform/multiFileEdit/common/editLogService");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const commandService_1 = require("../../commands/node/commandService");
const defaultIntentRequestHandler_1 = require("../../prompt/node/defaultIntentRequestHandler");
const agentPrompt_1 = require("../../prompts/node/agent/agentPrompt");
const codeMapperService_1 = require("../../prompts/node/codeMapper/codeMapperService");
const toolsService_1 = require("../../tools/common/toolsService");
const agentIntent_1 = require("./agentIntent");
const specialRequestTypes_1 = require("../../prompt/common/specialRequestTypes");
const getTools = (instaService, request) => instaService.invokeFunction(async (accessor) => {
    const toolsService = accessor.get(toolsService_1.IToolsService);
    const lookForTags = new Set(['vscode_codesearch']);
    const endpointProvider = accessor.get(endpointProvider_1.IEndpointProvider);
    const model = await endpointProvider.getChatEndpoint(request);
    // Special case...
    // Since AskAgent currently has no tool picker, have to duplicate the toolReference logic here.
    // When it's no longer experimental, it should be a custom mode, have a tool picker, etc.
    // And must return boolean to avoid falling back on other logic that we don't want, like the `extension_installed_by_tool` check.
    return toolsService.getEnabledTools(request, model, tool => tool.tags.some(tag => lookForTags.has(tag)) || request.toolReferences.some(ref => ref.name === tool.name));
});
let AskAgentIntent = class AskAgentIntent {
    static { AskAgentIntent_1 = this; }
    static { this.ID = "askAgent" /* Intent.AskAgent */; }
    constructor(instantiationService, endpointProvider, configurationService) {
        this.instantiationService = instantiationService;
        this.endpointProvider = endpointProvider;
        this.configurationService = configurationService;
        this.id = AskAgentIntent_1.ID;
        this.description = 'unused';
        this.locations = [commonTypes_1.ChatLocation.Panel];
    }
    getIntentHandlerOptions(request) {
        return {
            maxToolCallIterations: (0, specialRequestTypes_1.getRequestedToolCallIterationLimit)(request) ?? this.configurationService.getNonExtensionConfig('chat.agent.maxRequests') ?? 15,
            temperature: this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.AgentTemperature) ?? 0,
            overrideRequestLocation: commonTypes_1.ChatLocation.EditingSession,
        };
    }
    async handleRequest(conversation, request, stream, token, documentContext, agentName, location, chatTelemetry, onPaused) {
        const actual = this.instantiationService.createInstance(defaultIntentRequestHandler_1.DefaultIntentRequestHandler, this, conversation, request, stream, token, documentContext, location, chatTelemetry, this.getIntentHandlerOptions(request), onPaused);
        return await actual.getResult();
    }
    async invoke(invocationContext) {
        const { location, request } = invocationContext;
        const endpoint = await this.endpointProvider.getChatEndpoint(request);
        return this.instantiationService.createInstance(AskAgentIntentInvocation, this, location, endpoint, request);
    }
};
exports.AskAgentIntent = AskAgentIntent;
exports.AskAgentIntent = AskAgentIntent = AskAgentIntent_1 = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, configurationService_1.IConfigurationService)
], AskAgentIntent);
let AskAgentIntentInvocation = class AskAgentIntentInvocation extends agentIntent_1.AgentIntentInvocation {
    get linkification() {
        return { disable: false };
    }
    constructor(intent, location, endpoint, request, instantiationService, codeMapperService, envService, promptPathRepresentationService, endpointProvider, workspaceService, toolsService, configurationService, editLogService, commandService, telemetryService, notebookService, logService) {
        super(intent, location, endpoint, request, { processCodeblocks: true }, instantiationService, codeMapperService, envService, promptPathRepresentationService, endpointProvider, workspaceService, toolsService, configurationService, editLogService, commandService, telemetryService, notebookService, logService);
        this.prompt = agentPrompt_1.AgentPrompt;
        this.extraPromptProps = { codesearchMode: true };
    }
    async getAvailableTools() {
        return getTools(this.instantiationService, this.request);
    }
};
exports.AskAgentIntentInvocation = AskAgentIntentInvocation;
exports.AskAgentIntentInvocation = AskAgentIntentInvocation = __decorate([
    __param(4, instantiation_1.IInstantiationService),
    __param(5, codeMapperService_1.ICodeMapperService),
    __param(6, envService_1.IEnvService),
    __param(7, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(8, endpointProvider_1.IEndpointProvider),
    __param(9, workspaceService_1.IWorkspaceService),
    __param(10, toolsService_1.IToolsService),
    __param(11, configurationService_1.IConfigurationService),
    __param(12, editLogService_1.IEditLogService),
    __param(13, commandService_1.ICommandService),
    __param(14, telemetry_1.ITelemetryService),
    __param(15, notebookService_1.INotebookService),
    __param(16, logService_1.ILogService)
], AskAgentIntentInvocation);
//# sourceMappingURL=askAgentIntent.js.map