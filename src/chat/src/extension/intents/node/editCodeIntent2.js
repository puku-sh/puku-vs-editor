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
var EditCode2Intent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditCode2IntentInvocation = exports.EditCode2Intent = void 0;
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const chatModelCapabilities_1 = require("../../../platform/endpoint/common/chatModelCapabilities");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const envService_1 = require("../../../platform/env/common/envService");
const logService_1 = require("../../../platform/log/common/logService");
const editLogService_1 = require("../../../platform/multiFileEdit/common/editLogService");
const helpers_1 = require("../../../platform/notebook/common/helpers");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const commandService_1 = require("../../commands/node/commandService");
const codeMapperService_1 = require("../../prompts/node/codeMapper/codeMapperService");
const editCodePrompt2_1 = require("../../prompts/node/panel/editCodePrompt2");
const toolNames_1 = require("../../tools/common/toolNames");
const toolsService_1 = require("../../tools/common/toolsService");
const agentIntent_1 = require("./agentIntent");
const editCodeIntent_1 = require("./editCodeIntent");
const specialRequestTypes_1 = require("../../prompt/common/specialRequestTypes");
const getTools = (instaService, request) => instaService.invokeFunction(async (accessor) => {
    const toolsService = accessor.get(toolsService_1.IToolsService);
    const endpointProvider = accessor.get(endpointProvider_1.IEndpointProvider);
    const notebookService = accessor.get(notebookService_1.INotebookService);
    const model = await endpointProvider.getChatEndpoint(request);
    const lookForTools = new Set([toolNames_1.ToolName.EditFile]);
    if ((0, helpers_1.requestHasNotebookRefs)(request, notebookService, { checkPromptAsWell: true })) {
        lookForTools.add(toolNames_1.ToolName.CreateNewJupyterNotebook);
    }
    if (await (0, chatModelCapabilities_1.modelSupportsReplaceString)(model)) {
        lookForTools.add(toolNames_1.ToolName.ReplaceString);
        if (await (0, chatModelCapabilities_1.modelSupportsMultiReplaceString)(model)) {
            lookForTools.add(toolNames_1.ToolName.MultiReplaceString);
        }
    }
    lookForTools.add(toolNames_1.ToolName.EditNotebook);
    if ((0, helpers_1.requestHasNotebookRefs)(request, notebookService, { checkPromptAsWell: true })) {
        lookForTools.add(toolNames_1.ToolName.GetNotebookSummary);
        lookForTools.add(toolNames_1.ToolName.RunNotebookCell);
    }
    return toolsService.getEnabledTools(request, model, tool => lookForTools.has(tool.name));
});
let EditCode2Intent = class EditCode2Intent extends editCodeIntent_1.EditCodeIntent {
    static { EditCode2Intent_1 = this; }
    static { this.ID = "edit2" /* Intent.Edit2 */; }
    constructor(instantiationService, endpointProvider, configurationService, expService, codeMapperService, workspaceService) {
        super(instantiationService, endpointProvider, configurationService, expService, codeMapperService, workspaceService, { processCodeblocks: false, intentInvocation: EditCode2IntentInvocation });
        this.id = EditCode2Intent_1.ID;
    }
    getIntentHandlerOptions(request) {
        return {
            maxToolCallIterations: (0, specialRequestTypes_1.getRequestedToolCallIterationLimit)(request) ?? this.configurationService.getNonExtensionConfig('chat.agent.maxRequests') ?? 15,
            temperature: this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.AgentTemperature) ?? 0,
            overrideRequestLocation: commonTypes_1.ChatLocation.EditingSession,
        };
    }
};
exports.EditCode2Intent = EditCode2Intent;
exports.EditCode2Intent = EditCode2Intent = EditCode2Intent_1 = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, nullExperimentationService_1.IExperimentationService),
    __param(4, codeMapperService_1.ICodeMapperService),
    __param(5, workspaceService_1.IWorkspaceService)
], EditCode2Intent);
let EditCode2IntentInvocation = class EditCode2IntentInvocation extends agentIntent_1.AgentIntentInvocation {
    get linkification() {
        return { disable: false };
    }
    constructor(intent, location, endpoint, request, intentOptions, instantiationService, codeMapperService, envService, promptPathRepresentationService, endpointProvider, workspaceService, toolsService, configurationService, editLogService, commandService, telemetryService, notebookService, logService) {
        super(intent, location, endpoint, request, intentOptions, instantiationService, codeMapperService, envService, promptPathRepresentationService, endpointProvider, workspaceService, toolsService, configurationService, editLogService, commandService, telemetryService, notebookService, logService);
        this.prompt = editCodePrompt2_1.EditCodePrompt2;
    }
    async getAvailableTools() {
        return getTools(this.instantiationService, this.request);
    }
};
exports.EditCode2IntentInvocation = EditCode2IntentInvocation;
exports.EditCode2IntentInvocation = EditCode2IntentInvocation = __decorate([
    __param(5, instantiation_1.IInstantiationService),
    __param(6, codeMapperService_1.ICodeMapperService),
    __param(7, envService_1.IEnvService),
    __param(8, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(9, endpointProvider_1.IEndpointProvider),
    __param(10, workspaceService_1.IWorkspaceService),
    __param(11, toolsService_1.IToolsService),
    __param(12, configurationService_1.IConfigurationService),
    __param(13, editLogService_1.IEditLogService),
    __param(14, commandService_1.ICommandService),
    __param(15, telemetry_1.ITelemetryService),
    __param(16, notebookService_1.INotebookService),
    __param(17, logService_1.ILogService)
], EditCode2IntentInvocation);
//# sourceMappingURL=editCodeIntent2.js.map