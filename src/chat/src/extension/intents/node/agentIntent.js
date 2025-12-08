"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AgentIntent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentIntentInvocation = exports.AgentIntent = exports.getAgentTools = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const materialized_1 = require("@vscode/prompt-tsx/dist/base/materialized");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const chatModelCapabilities_1 = require("../../../platform/endpoint/common/chatModelCapabilities");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const envService_1 = require("../../../platform/env/common/envService");
const logService_1 = require("../../../platform/log/common/logService");
const editLogService_1 = require("../../../platform/multiFileEdit/common/editLogService");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const tasksService_1 = require("../../../platform/tasks/common/tasksService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const testProvider_1 = require("../../../platform/testing/common/testProvider");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const iterator_1 = require("../../../util/vs/base/common/iterator");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const commandService_1 = require("../../commands/node/commandService");
const chatVariablesCollection_1 = require("../../prompt/common/chatVariablesCollection");
const conversation_1 = require("../../prompt/common/conversation");
const specialRequestTypes_1 = require("../../prompt/common/specialRequestTypes");
const agentPrompt_1 = require("../../prompts/node/agent/agentPrompt");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const codeMapperService_1 = require("../../prompts/node/codeMapper/codeMapperService");
const toolCalling_1 = require("../../prompts/node/panel/toolCalling");
const editToolLearningService_1 = require("../../tools/common/editToolLearningService");
const toolNames_1 = require("../../tools/common/toolNames");
const toolsService_1 = require("../../tools/common/toolsService");
const virtualTool_1 = require("../../tools/common/virtualTools/virtualTool");
const virtualToolTypes_1 = require("../../tools/common/virtualTools/virtualToolTypes");
const applyPatchTool_1 = require("../../tools/node/applyPatchTool");
const cacheBreakpoints_1 = require("./cacheBreakpoints");
const editCodeIntent_1 = require("./editCodeIntent");
const getAgentTools = (instaService, request) => instaService.invokeFunction(async (accessor) => {
    const toolsService = accessor.get(toolsService_1.IToolsService);
    const testService = accessor.get(testProvider_1.ITestProvider);
    const tasksService = accessor.get(tasksService_1.ITasksService);
    const configurationService = accessor.get(configurationService_1.IConfigurationService);
    const experimentationService = accessor.get(nullExperimentationService_1.IExperimentationService);
    const endpointProvider = accessor.get(endpointProvider_1.IEndpointProvider);
    const editToolLearningService = accessor.get(editToolLearningService_1.IEditToolLearningService);
    const model = await endpointProvider.getChatEndpoint(request);
    const allowTools = {};
    const learned = editToolLearningService.getPreferredEndpointEditTool(model);
    if (learned) { // a learning-enabled (BYOK) model, we should go with what it prefers
        allowTools[toolNames_1.ToolName.EditFile] = learned.includes(toolNames_1.ToolName.EditFile);
        allowTools[toolNames_1.ToolName.ReplaceString] = learned.includes(toolNames_1.ToolName.ReplaceString);
        allowTools[toolNames_1.ToolName.MultiReplaceString] = learned.includes(toolNames_1.ToolName.MultiReplaceString);
        allowTools[toolNames_1.ToolName.ApplyPatch] = learned.includes(toolNames_1.ToolName.ApplyPatch);
    }
    else {
        allowTools[toolNames_1.ToolName.EditFile] = true;
        allowTools[toolNames_1.ToolName.ReplaceString] = await (0, chatModelCapabilities_1.modelSupportsReplaceString)(model);
        allowTools[toolNames_1.ToolName.ApplyPatch] = await (0, chatModelCapabilities_1.modelSupportsApplyPatch)(model) && !!toolsService.getTool(toolNames_1.ToolName.ApplyPatch);
        if (allowTools[toolNames_1.ToolName.ApplyPatch] && await (0, chatModelCapabilities_1.modelCanUseApplyPatchExclusively)(model)) {
            allowTools[toolNames_1.ToolName.EditFile] = false;
        }
        if (await (0, chatModelCapabilities_1.modelCanUseReplaceStringExclusively)(model)) {
            allowTools[toolNames_1.ToolName.ReplaceString] = true;
            allowTools[toolNames_1.ToolName.EditFile] = false;
        }
        if (allowTools[toolNames_1.ToolName.ReplaceString] && await (0, chatModelCapabilities_1.modelSupportsMultiReplaceString)(model)) {
            allowTools[toolNames_1.ToolName.MultiReplaceString] = true;
        }
    }
    allowTools[toolNames_1.ToolName.RunTests] = await testService.hasAnyTests();
    allowTools[toolNames_1.ToolName.CoreRunTask] = tasksService.getTasks().length > 0;
    if (model.family === 'gpt-5-codex' || model.family.includes('grok-code')) {
        allowTools[toolNames_1.ToolName.CoreManageTodoList] = false;
    }
    allowTools[toolNames_1.ToolName.EditFilesPlaceholder] = false;
    if (request.tools.get(toolNames_1.ContributedToolName.EditFilesPlaceholder) === false) {
        allowTools[toolNames_1.ToolName.ApplyPatch] = false;
        allowTools[toolNames_1.ToolName.EditFile] = false;
        allowTools[toolNames_1.ToolName.ReplaceString] = false;
        allowTools[toolNames_1.ToolName.MultiReplaceString] = false;
    }
    const tools = toolsService.getEnabledTools(request, model, tool => {
        if (typeof allowTools[tool.name] === 'boolean') {
            return allowTools[tool.name];
        }
        // Must return undefined to fall back to other checks
        return undefined;
    });
    if (await (0, chatModelCapabilities_1.modelSupportsSimplifiedApplyPatchInstructions)(model) && configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.Gpt5AlternativePatch, experimentationService)) {
        const ap = tools.findIndex(t => t.name === toolNames_1.ToolName.ApplyPatch);
        if (ap !== -1) {
            tools[ap] = { ...tools[ap], description: applyPatchTool_1.applyPatch5Description };
        }
    }
    return tools;
});
exports.getAgentTools = getAgentTools;
let AgentIntent = class AgentIntent extends editCodeIntent_1.EditCodeIntent {
    static { AgentIntent_1 = this; }
    static { this.ID = "editAgent" /* Intent.Agent */; }
    constructor(instantiationService, endpointProvider, configurationService, expService, codeMapperService, workspaceService, _toolGroupingService) {
        super(instantiationService, endpointProvider, configurationService, expService, codeMapperService, workspaceService, { intentInvocation: AgentIntentInvocation, processCodeblocks: false });
        this._toolGroupingService = _toolGroupingService;
        this.id = AgentIntent_1.ID;
    }
    async handleRequest(conversation, request, stream, token, documentContext, agentName, location, chatTelemetry, onPaused) {
        if (request.command === 'list') {
            await this.listTools(conversation, request, stream, token);
            return {};
        }
        return super.handleRequest(conversation, request, stream, token, documentContext, agentName, location, chatTelemetry, onPaused);
    }
    async listTools(conversation, request, stream, token) {
        const editingTools = await (0, exports.getAgentTools)(this.instantiationService, request);
        const grouping = this._toolGroupingService.create(conversation.sessionId, editingTools);
        let str = 'Available tools:\n';
        function printTool(tool, indent = 0) {
            const prefix = '  '.repeat(indent * 2);
            str += `${prefix}- ${tool.name}`;
            if (tool instanceof virtualTool_1.VirtualTool) {
                if (tool.isExpanded) {
                    str += ` (expanded):`;
                }
                else {
                    str += ': ' + tool.description.split('\n\n').map((chunk, i) => i > 0 ? prefix + '  ' + chunk : chunk).join('\n\n');
                }
            }
            str += '\n';
            if (tool instanceof virtualTool_1.VirtualTool && tool.contents.length > 0) {
                for (const child of tool.contents) {
                    printTool(child, indent + 1);
                }
            }
        }
        const tools = await grouping.computeAll(request.prompt, token);
        tools.forEach(t => printTool(t));
        stream.markdown(str);
        return {};
    }
    getIntentHandlerOptions(request) {
        return {
            maxToolCallIterations: (0, specialRequestTypes_1.getRequestedToolCallIterationLimit)(request) ??
                this.configurationService.getNonExtensionConfig('chat.agent.maxRequests') ??
                200, // Fallback for simulation tests
            temperature: this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.AgentTemperature) ?? 0,
            overrideRequestLocation: commonTypes_1.ChatLocation.Agent,
            hideRateLimitTimeEstimate: true
        };
    }
};
exports.AgentIntent = AgentIntent;
exports.AgentIntent = AgentIntent = AgentIntent_1 = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, nullExperimentationService_1.IExperimentationService),
    __param(4, codeMapperService_1.ICodeMapperService),
    __param(5, workspaceService_1.IWorkspaceService),
    __param(6, virtualToolTypes_1.IToolGroupingService)
], AgentIntent);
let AgentIntentInvocation = class AgentIntentInvocation extends editCodeIntent_1.EditCodeIntentInvocation {
    constructor(intent, location, endpoint, request, intentOptions, instantiationService, codeMapperService, envService, promptPathRepresentationService, endpointProvider, workspaceService, toolsService, configurationService, editLogService, commandService, telemetryService, notebookService, logService) {
        super(intent, location, endpoint, request, intentOptions, instantiationService, codeMapperService, envService, promptPathRepresentationService, endpointProvider, workspaceService, toolsService, configurationService, editLogService, commandService, telemetryService, notebookService);
        this.logService = logService;
        this.codeblocksRepresentEdits = false;
        this.prompt = agentPrompt_1.AgentPrompt;
        this.processResponse = undefined;
    }
    getAvailableTools() {
        return (0, exports.getAgentTools)(this.instantiationService, this.request);
    }
    async buildPrompt(promptContext, progress, token) {
        // Add any references from the codebase invocation to the request
        const codebase = await this._getCodebaseReferences(promptContext, token);
        let variables = promptContext.chatVariables;
        let toolReferences = [];
        if (codebase) {
            toolReferences = (0, editCodeIntent_1.toNewChatReferences)(variables, codebase.references);
            variables = new chatVariablesCollection_1.ChatVariablesCollection([...this.request.references, ...toolReferences]);
        }
        const tools = await this.getAvailableTools();
        const toolTokens = tools?.length ? await this.endpoint.acquireTokenizer().countToolTokens(tools) : 0;
        const summarizeThresholdOverride = this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.SummarizeAgentConversationHistoryThreshold);
        if (typeof summarizeThresholdOverride === 'number' && summarizeThresholdOverride < 100) {
            throw new Error(`Setting puku.${configurationService_1.ConfigKey.AdvancedExperimental.SummarizeAgentConversationHistoryThreshold.id} is too low`);
        }
        // Reserve extra space when tools are involved due to token counting issues
        const baseBudget = Math.min(this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.SummarizeAgentConversationHistoryThreshold) ?? this.endpoint.modelMaxPromptTokens, this.endpoint.modelMaxPromptTokens);
        const useTruncation = this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.UseResponsesApiTruncation);
        const safeBudget = useTruncation ?
            Number.MAX_SAFE_INTEGER :
            Math.floor((baseBudget - toolTokens) * 0.85);
        const endpoint = toolTokens > 0 ? this.endpoint.cloneWithTokenOverride(safeBudget) : this.endpoint;
        const summarizationEnabled = this.configurationService.getConfig(configurationService_1.ConfigKey.SummarizeAgentConversationHistory) && this.prompt === agentPrompt_1.AgentPrompt;
        this.logService.debug(`AgentIntent: rendering with budget=${safeBudget} (baseBudget: ${baseBudget}, toolTokens: ${toolTokens}), summarizationEnabled=${summarizationEnabled}`);
        let result;
        const props = {
            endpoint,
            promptContext: {
                ...promptContext,
                tools: promptContext.tools && {
                    ...promptContext.tools,
                    toolReferences: this.stableToolReferences.filter((r) => r.name !== toolNames_1.ToolName.Codebase),
                }
            },
            location: this.location,
            enableCacheBreakpoints: summarizationEnabled,
            ...this.extraPromptProps
        };
        try {
            const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, this.prompt, props);
            result = await renderer.render(progress, token);
        }
        catch (e) {
            if (e instanceof materialized_1.BudgetExceededError && summarizationEnabled) {
                this.logService.debug(`[Agent] budget exceeded, triggering summarization (${e.message})`);
                if (!promptContext.toolCallResults) {
                    promptContext = {
                        ...promptContext,
                        toolCallResults: {}
                    };
                }
                e.metadata.getAll(toolCalling_1.ToolResultMetadata).forEach((metadata) => {
                    promptContext.toolCallResults[metadata.toolCallId] = metadata.result;
                });
                try {
                    const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, this.prompt, {
                        ...props,
                        triggerSummarize: true,
                    });
                    result = await renderer.render(progress, token);
                }
                catch (e) {
                    this.logService.error(e, `[Agent] summarization failed`);
                    const errorKind = e instanceof materialized_1.BudgetExceededError ? 'budgetExceeded' : 'error';
                    /* __GDPR__
                        "triggerSummarizeFailed" : {
                            "owner": "roblourens",
                            "comment": "Tracks when triggering summarization failed - for example, a summary was created but not applied successfully.",
                            "errorKind": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The success state or failure reason of the summarization." },
                            "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model ID used for the summarization." }
                        }
                    */
                    this.telemetryService.sendMSFTTelemetryEvent('triggerSummarizeFailed', { errorKind, model: props.endpoint.model });
                    // Something else went wrong, eg summarization failed, so render the prompt with no cache breakpoints, summarization, endpoint not reduced in size for tools or safety buffer
                    const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, this.endpoint, this.prompt, {
                        ...props,
                        endpoint: this.endpoint,
                        enableCacheBreakpoints: false
                    });
                    try {
                        result = await renderer.render(progress, token);
                    }
                    catch (e) {
                        if (e instanceof materialized_1.BudgetExceededError) {
                            this.logService.error(e, `[Agent] final render fallback failed due to budget exceeded`);
                            const maxTokens = this.endpoint.modelMaxPromptTokens;
                            throw new Error(`Unable to build prompt, modelMaxPromptTokens=${maxTokens} (${e.message})`);
                        }
                        throw e;
                    }
                }
            }
            else {
                throw e;
            }
        }
        const lastMessage = result.messages.at(-1);
        if (lastMessage?.role === prompt_tsx_1.Raw.ChatRole.User) {
            const currentTurn = promptContext.conversation?.getLatestTurn();
            if (currentTurn && !currentTurn.getMetadata(conversation_1.RenderedUserMessageMetadata)) {
                currentTurn.setMetadata(new conversation_1.RenderedUserMessageMetadata(lastMessage.content));
            }
        }
        (0, cacheBreakpoints_1.addCacheBreakpoints)(result.messages);
        if (this.request.command === 'error') {
            // Should trigger a 400
            result.messages.push({
                role: prompt_tsx_1.Raw.ChatRole.Assistant,
                content: [],
                toolCalls: [{ type: 'function', id: '', function: { name: 'tool', arguments: '{' } }]
            });
        }
        return {
            ...result,
            // The codebase tool is not actually called/referenced in the edit prompt, so we ned to
            // merge its metadata so that its output is not lost and it's not called repeatedly every turn
            // todo@connor4312/joycerhl: this seems a bit janky
            metadata: codebase ? (0, editCodeIntent_1.mergeMetadata)(result.metadata, codebase.metadatas) : result.metadata,
            // Don't report file references that came in via chat variables in an editing session, unless they have warnings,
            // because they are already displayed as part of the working set
            // references: result.references.filter((ref) => this.shouldKeepReference(editCodeStep, ref, toolReferences, chatVariables)),
        };
    }
    modifyErrorDetails(errorDetails, response) {
        if (!errorDetails.responseIsFiltered) {
            errorDetails.confirmationButtons = [
                { data: { copilotContinueOnError: true }, label: l10n.t('Try Again') },
            ];
        }
        return errorDetails;
    }
    getAdditionalVariables(promptContext) {
        const lastTurn = promptContext.conversation?.turns.at(-1);
        if (!lastTurn) {
            return;
        }
        // Search backwards to find the first real request and return those variables too.
        // Variables aren't re-attached to requests from confirmations.
        // TODO https://github.com/microsoft/vscode/issues/262858, more to do here
        if (lastTurn.acceptedConfirmationData) {
            const turns = promptContext.conversation.turns.slice(0, -1);
            for (const turn of iterator_1.Iterable.reverse(turns)) {
                if (!turn.acceptedConfirmationData) {
                    return turn.promptVariables;
                }
            }
        }
    }
};
exports.AgentIntentInvocation = AgentIntentInvocation;
exports.AgentIntentInvocation = AgentIntentInvocation = __decorate([
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
], AgentIntentInvocation);
//# sourceMappingURL=agentIntent.js.map