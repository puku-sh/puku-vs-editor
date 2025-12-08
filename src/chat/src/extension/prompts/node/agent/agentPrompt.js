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
exports.EditedFileEvents = exports.KeepGoingReminder = exports.AgentTasksInstructions = exports.AgentUserMessage = exports.AgentPrompt = void 0;
exports.getUserMessagePropsFromTurn = getUserMessagePropsFromTurn;
exports.getUserMessagePropsFromAgentProps = getUserMessagePropsFromAgentProps;
exports.renderedMessageToTsxChildren = renderedMessageToTsxChildren;
exports.getEditingReminder = getEditingReminder;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const chatModelCapabilities_1 = require("../../../../platform/endpoint/common/chatModelCapabilities");
const endpointTypes_1 = require("../../../../platform/endpoint/common/endpointTypes");
const envService_1 = require("../../../../platform/env/common/envService");
const gitService_1 = require("../../../../platform/git/common/gitService");
const logService_1 = require("../../../../platform/log/common/logService");
const alternativeContent_1 = require("../../../../platform/notebook/common/alternativeContent");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const tabsAndEditorsService_1 = require("../../../../platform/tabs/common/tabsAndEditorsService");
const tasksService_1 = require("../../../../platform/tasks/common/tasksService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const types_1 = require("../../../../util/vs/base/common/types");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const githubPullRequestProviders_1 = require("../../../conversation/node/githubPullRequestProviders");
const chatVariablesCollection_1 = require("../../../prompt/common/chatVariablesCollection");
const conversation_1 = require("../../../prompt/common/conversation");
const promptVariablesService_1 = require("../../../prompt/node/promptVariablesService");
const toolNames_1 = require("../../../tools/common/toolNames");
const todoListContextPrompt_1 = require("../../../tools/node/todoListContextPrompt");
const copilotIdentity_1 = require("../base/copilotIdentity");
const promptRenderer_1 = require("../base/promptRenderer");
const safetyRules_1 = require("../base/safetyRules");
const tag_1 = require("../base/tag");
const terminalState_1 = require("../base/terminalState");
const chatVariables_1 = require("../panel/chatVariables");
const codeBlockFormattingRules_1 = require("../panel/codeBlockFormattingRules");
const customInstructions_1 = require("../panel/customInstructions");
const notebookEditCodePrompt_1 = require("../panel/notebookEditCodePrompt");
const notebookSummaryChangePrompt_1 = require("../panel/notebookSummaryChangePrompt");
const preferences_1 = require("../panel/preferences");
const toolCalling_1 = require("../panel/toolCalling");
const workspaceStructure_1 = require("../panel/workspace/workspaceStructure");
const agentConversationHistory_1 = require("./agentConversationHistory");
require("./allAgentPrompts");
const defaultAgentInstructions_1 = require("./defaultAgentInstructions");
const promptRegistry_1 = require("./promptRegistry");
const summarizedConversationHistory_1 = require("./summarizedConversationHistory");
/** Proportion of the prompt token budget any singular textual tool result is allowed to use. */
const MAX_TOOL_RESPONSE_PCT = 0.5;
/**
 * The agent mode prompt, rendered on each request
 */
let AgentPrompt = class AgentPrompt extends prompt_tsx_1.PromptElement {
    constructor(props, configurationService, instantiationService, experimentationService, promptVariablesService, promptEndpoint) {
        super(props);
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.experimentationService = experimentationService;
        this.promptVariablesService = promptVariablesService;
        this.promptEndpoint = promptEndpoint;
    }
    async render(state, sizing) {
        const instructions = await this.getInstructions();
        const omitBaseAgentInstructions = this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.OmitBaseAgentInstructions);
        const baseAgentInstructions = vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, null,
                "You are an expert AI programming assistant, working with a user in the VS Code editor.",
                vscpp("br", null),
                (0, chatModelCapabilities_1.isGpt5PlusFamily)(this.props.endpoint.family) ? (vscpp(vscppf, null,
                    vscpp(copilotIdentity_1.GPT5CopilotIdentityRule, null),
                    vscpp(safetyRules_1.Gpt5SafetyRule, null))) : (vscpp(vscppf, null,
                    vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                    vscpp(safetyRules_1.SafetyRules, null)))),
            instructions);
        const baseInstructions = vscpp(vscppf, null,
            !omitBaseAgentInstructions && baseAgentInstructions,
            await this.getAgentCustomInstructions(),
            vscpp(prompt_tsx_1.UserMessage, null, await this.getOrCreateGlobalAgentContext(this.props.endpoint)));
        const maxToolResultLength = Math.floor(this.promptEndpoint.modelMaxPromptTokens * MAX_TOOL_RESPONSE_PCT);
        if (this.props.enableCacheBreakpoints) {
            return vscpp(vscppf, null,
                baseInstructions,
                vscpp(summarizedConversationHistory_1.SummarizedConversationHistory, { flexGrow: 1, triggerSummarize: this.props.triggerSummarize, priority: 900, promptContext: this.props.promptContext, location: this.props.location, maxToolResultLength: maxToolResultLength, endpoint: this.props.endpoint, tools: this.props.promptContext.tools?.availableTools, enableCacheBreakpoints: this.props.enableCacheBreakpoints }));
        }
        else {
            return vscpp(vscppf, null,
                baseInstructions,
                vscpp(agentConversationHistory_1.AgentConversationHistory, { flexGrow: 1, priority: 700, promptContext: this.props.promptContext }),
                vscpp(AgentUserMessage, { flexGrow: 2, priority: 900, ...getUserMessagePropsFromAgentProps(this.props) }),
                vscpp(toolCalling_1.ChatToolCalls, { priority: 899, flexGrow: 2, promptContext: this.props.promptContext, toolCallRounds: this.props.promptContext.toolCallRounds, toolCallResults: this.props.promptContext.toolCallResults, truncateAt: maxToolResultLength, enableCacheBreakpoints: false }));
        }
    }
    async getInstructions() {
        const modelFamily = this.props.endpoint.family ?? 'unknown';
        if (this.props.endpoint.family.startsWith('gpt-') && this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.EnableAlternateGptPrompt, this.experimentationService)) {
            return vscpp(defaultAgentInstructions_1.AlternateGPTPrompt, { availableTools: this.props.promptContext.tools?.availableTools, modelFamily: this.props.endpoint.family, codesearchMode: this.props.codesearchMode });
        }
        const agentPromptResolver = await promptRegistry_1.PromptRegistry.getPrompt(this.props.endpoint);
        if (agentPromptResolver) {
            const resolver = this.instantiationService.createInstance(agentPromptResolver);
            const PromptClass = resolver.resolvePrompt(this.props.endpoint);
            if (PromptClass) {
                return vscpp(PromptClass, { availableTools: this.props.promptContext.tools?.availableTools, modelFamily: modelFamily, codesearchMode: this.props.codesearchMode });
            }
        }
        return vscpp(defaultAgentInstructions_1.DefaultAgentPrompt, { availableTools: this.props.promptContext.tools?.availableTools, modelFamily: modelFamily, codesearchMode: this.props.codesearchMode });
    }
    async getAgentCustomInstructions() {
        const putCustomInstructionsInSystemMessage = this.configurationService.getConfig(configurationService_1.ConfigKey.CustomInstructionsInSystemMessage);
        const customInstructionsBodyParts = [];
        customInstructionsBodyParts.push(vscpp(customInstructions_1.CustomInstructions, { languageId: undefined, chatVariables: this.props.promptContext.chatVariables, includeSystemMessageConflictWarning: !putCustomInstructionsInSystemMessage, customIntroduction: putCustomInstructionsInSystemMessage ? '' : undefined }));
        if (this.props.promptContext.modeInstructions) {
            const { name, content, toolReferences } = this.props.promptContext.modeInstructions;
            const resolvedContent = toolReferences && toolReferences.length > 0 ? await this.promptVariablesService.resolveToolReferencesInPrompt(content, toolReferences) : content;
            customInstructionsBodyParts.push(vscpp(tag_1.Tag, { name: 'modeInstructions' },
                "You are currently running in \"",
                name,
                "\" mode. Below are your instructions for this mode, they must take precedence over any instructions above.",
                vscpp("br", null),
                vscpp("br", null),
                resolvedContent));
        }
        return putCustomInstructionsInSystemMessage ?
            vscpp(prompt_tsx_1.SystemMessage, null, customInstructionsBodyParts) :
            vscpp(prompt_tsx_1.UserMessage, null, customInstructionsBodyParts);
    }
    async getOrCreateGlobalAgentContext(endpoint) {
        const globalContext = await this.getOrCreateGlobalAgentContextContent(endpoint);
        return globalContext ?
            renderedMessageToTsxChildren(globalContext, !!this.props.enableCacheBreakpoints) :
            vscpp(GlobalAgentContext, { enableCacheBreakpoints: !!this.props.enableCacheBreakpoints, availableTools: this.props.promptContext.tools?.availableTools });
    }
    async getOrCreateGlobalAgentContextContent(endpoint) {
        const firstTurn = this.props.promptContext.conversation?.turns.at(0);
        if (firstTurn) {
            const metadata = firstTurn.getMetadata(conversation_1.GlobalContextMessageMetadata);
            if (metadata) {
                const currentCacheKey = this.instantiationService.invokeFunction(conversation_1.getGlobalContextCacheKey);
                if (metadata.cacheKey === currentCacheKey) {
                    return metadata.renderedGlobalContext;
                }
            }
        }
        const rendered = await (0, promptRenderer_1.renderPromptElement)(this.instantiationService, endpoint, GlobalAgentContext, { enableCacheBreakpoints: this.props.enableCacheBreakpoints, availableTools: this.props.promptContext.tools?.availableTools }, undefined, undefined);
        const msg = rendered.messages.at(0)?.content;
        if (msg) {
            firstTurn?.setMetadata(new conversation_1.GlobalContextMessageMetadata(msg, this.instantiationService.invokeFunction(conversation_1.getGlobalContextCacheKey)));
            return msg;
        }
    }
};
exports.AgentPrompt = AgentPrompt;
exports.AgentPrompt = AgentPrompt = __decorate([
    __param(1, configurationService_1.IConfigurationService),
    __param(2, instantiation_1.IInstantiationService),
    __param(3, nullExperimentationService_1.IExperimentationService),
    __param(4, promptVariablesService_1.IPromptVariablesService),
    __param(5, promptRenderer_1.IPromptEndpoint)
], AgentPrompt);
/**
 * The "global agent context" is a static prompt at the start of a conversation containing user environment info, initial workspace structure, anything else that is a useful beginning
 * hint for the agent but is not updated during the conversation.
 */
class GlobalAgentContext extends prompt_tsx_1.PromptElement {
    render() {
        return vscpp(prompt_tsx_1.UserMessage, null,
            vscpp(tag_1.Tag, { name: 'environment_info' },
                vscpp(UserOSPrompt, null)),
            vscpp(tag_1.Tag, { name: 'workspace_info' },
                vscpp(AgentTasksInstructions, { availableTools: this.props.availableTools }),
                vscpp(WorkspaceFoldersHint, null),
                vscpp(workspaceStructure_1.MultirootWorkspaceStructure, { maxSize: 2000, excludeDotFiles: true }),
                vscpp("br", null),
                "This is the state of the context at this point in the conversation. The view of the workspace structure may be truncated. You can use tools to collect more context if needed."),
            vscpp(preferences_1.UserPreferences, { flexGrow: 7, priority: 800 }),
            this.props.enableCacheBreakpoints && vscpp("cacheBreakpoint", { type: endpointTypes_1.CacheType }));
    }
}
function getUserMessagePropsFromTurn(turn, endpoint) {
    return {
        isHistorical: true,
        request: turn.request.message,
        turn,
        endpoint,
        toolReferences: turn.toolReferences,
        chatVariables: turn.promptVariables ?? new chatVariablesCollection_1.ChatVariablesCollection(),
        editedFileEvents: turn.editedFileEvents,
        enableCacheBreakpoints: false // Should only be added to the current turn - some user messages may get them in Agent post-processing
    };
}
function getUserMessagePropsFromAgentProps(agentProps) {
    return {
        request: agentProps.promptContext.query,
        // Will pull frozenContent off the Turn if available
        turn: agentProps.promptContext.conversation?.getLatestTurn(),
        endpoint: agentProps.endpoint,
        toolReferences: agentProps.promptContext.tools?.toolReferences ?? [],
        availableTools: agentProps.promptContext.tools?.availableTools,
        chatVariables: agentProps.promptContext.chatVariables,
        enableCacheBreakpoints: agentProps.enableCacheBreakpoints,
        editedFileEvents: agentProps.promptContext.editedFileEvents,
        // TODO:@roblourens
        sessionId: agentProps.promptContext.tools?.toolInvocationToken?.sessionId,
    };
}
/**
 * Is sent with each user message. Includes the user message and also any ambient context that we want to update with each request.
 * Uses frozen content if available, for prompt caching and to avoid being updated by any agent action below this point in the conversation.
 */
let AgentUserMessage = class AgentUserMessage extends prompt_tsx_1.PromptElement {
    constructor(props, promptVariablesService, logService) {
        super(props);
        this.promptVariablesService = promptVariablesService;
        this.logService = logService;
    }
    async render(state, sizing) {
        const frozenContent = this.props.turn?.getMetadata(conversation_1.RenderedUserMessageMetadata)?.renderedUserMessage;
        if (frozenContent) {
            return vscpp(FrozenContentUserMessage, { frozenContent: frozenContent, enableCacheBreakpoints: this.props.enableCacheBreakpoints });
        }
        if (this.props.isHistorical) {
            this.logService.trace('Re-rendering historical user message');
        }
        const shouldIncludePreamble = await (0, chatModelCapabilities_1.isVSCModelA)(this.props.endpoint);
        const query = await this.promptVariablesService.resolveToolReferencesInPrompt(this.props.request, this.props.toolReferences ?? []);
        const hasReplaceStringTool = !!this.props.availableTools?.find(tool => tool.name === toolNames_1.ToolName.ReplaceString);
        const hasMultiReplaceStringTool = !!this.props.availableTools?.find(tool => tool.name === toolNames_1.ToolName.MultiReplaceString);
        const hasApplyPatchTool = !!this.props.availableTools?.find(tool => tool.name === toolNames_1.ToolName.ApplyPatch);
        const hasCreateFileTool = !!this.props.availableTools?.find(tool => tool.name === toolNames_1.ToolName.CreateFile);
        const hasEditFileTool = !!this.props.availableTools?.find(tool => tool.name === toolNames_1.ToolName.EditFile);
        const hasEditNotebookTool = !!this.props.availableTools?.find(tool => tool.name === toolNames_1.ToolName.EditNotebook);
        const hasTerminalTool = !!this.props.availableTools?.find(tool => tool.name === toolNames_1.ToolName.CoreRunInTerminal);
        const needsAttachmentHint = this.props.endpoint.family === 'gpt-4.1' || this.props.endpoint.family === 'gpt-5' || this.props.endpoint.family === 'gpt-5-mini';
        const attachmentHint = needsAttachmentHint && this.props.chatVariables.hasVariables() ?
            ' (See <attachments> above for file contents. You may not need to search or read the file again.)'
            : '';
        const hasToolsToEditNotebook = hasCreateFileTool || hasEditNotebookTool || hasReplaceStringTool || hasApplyPatchTool || hasEditFileTool;
        const hasTodoTool = !!this.props.availableTools?.find(tool => tool.name === toolNames_1.ToolName.CoreManageTodoList);
        const shouldUseUserQuery = this.props.endpoint.family.startsWith('grok-code');
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.UserMessage, null,
                hasToolsToEditNotebook && vscpp(notebookEditCodePrompt_1.NotebookFormat, { flexGrow: 5, priority: 810, chatVariables: this.props.chatVariables, query: query }),
                vscpp(prompt_tsx_1.TokenLimit, { max: sizing.tokenBudget / 6, flexGrow: 3, priority: 898 },
                    vscpp(chatVariables_1.ChatVariables, { chatVariables: this.props.chatVariables, isAgent: true, omitReferences: true })),
                vscpp(ToolReferencesHint, { toolReferences: this.props.toolReferences, modelFamily: this.props.endpoint.family }),
                vscpp(tag_1.Tag, { name: 'context' },
                    vscpp(CurrentDatePrompt, null),
                    vscpp(EditedFileEvents, { editedFileEvents: this.props.editedFileEvents }),
                    vscpp(notebookSummaryChangePrompt_1.NotebookSummaryChange, null),
                    hasTerminalTool && vscpp(terminalState_1.TerminalStatePromptElement, { sessionId: this.props.sessionId }),
                    hasTodoTool && vscpp(todoListContextPrompt_1.TodoListContextPrompt, { sessionId: this.props.sessionId })),
                vscpp(CurrentEditorContext, { endpoint: this.props.endpoint }),
                vscpp(RepoContext, null),
                vscpp(tag_1.Tag, { name: 'reminderInstructions' },
                    vscpp(KeepGoingReminder, { modelFamily: this.props.endpoint.family }),
                    getEditingReminder(hasEditFileTool, hasReplaceStringTool, (0, chatModelCapabilities_1.modelNeedsStrongReplaceStringHint)(this.props.endpoint), hasMultiReplaceStringTool),
                    vscpp(notebookEditCodePrompt_1.NotebookReminderInstructions, { chatVariables: this.props.chatVariables, query: this.props.request }),
                    getFileCreationReminder(this.props.endpoint.family),
                    await getExplanationReminder(this.props.endpoint.family, hasTodoTool),
                    getVSCModelReminder(shouldIncludePreamble)),
                query && vscpp(tag_1.Tag, { name: shouldUseUserQuery ? 'user_query' : 'userRequest', priority: 900, flexGrow: 7 }, query + attachmentHint),
                this.props.enableCacheBreakpoints && vscpp("cacheBreakpoint", { type: endpointTypes_1.CacheType }))));
    }
};
exports.AgentUserMessage = AgentUserMessage;
exports.AgentUserMessage = AgentUserMessage = __decorate([
    __param(1, promptVariablesService_1.IPromptVariablesService),
    __param(2, logService_1.ILogService)
], AgentUserMessage);
class FrozenContentUserMessage extends prompt_tsx_1.PromptElement {
    async render(state, sizing) {
        return vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority },
            vscpp(prompt_tsx_1.Chunk, null, renderedMessageToTsxChildren(this.props.frozenContent, false)),
            this.props.enableCacheBreakpoints && vscpp("cacheBreakpoint", { type: endpointTypes_1.CacheType }));
    }
}
/**
 * `#` tool references included in the request are a strong hint to the model that the tool is relevant, but we don't force a tool call.
 */
class ToolReferencesHint extends prompt_tsx_1.PromptElement {
    async render() {
        if (!this.props.toolReferences.length) {
            return;
        }
        return vscpp(vscppf, null,
            vscpp(tag_1.Tag, { name: 'toolReferences' },
                "The user attached the following tools to this message. The userRequest may refer to them using the tool name with \"#\". These tools are likely relevant to the user's query:",
                vscpp("br", null),
                this.props.toolReferences.map(tool => `- ${tool.name}`).join('\n'),
                " ",
                vscpp("br", null),
                ((0, chatModelCapabilities_1.isGpt5Family)(this.props.modelFamily)) && vscpp(vscppf, null,
                    "Start by using the most relevant tool attached to this message\u2014the user expects you to act with it first.",
                    vscpp("br", null))));
    }
}
function renderedMessageToTsxChildren(message, enableCacheBreakpoints) {
    if (typeof message === 'string') {
        return [message];
    }
    return message.map(part => {
        if (part.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text) {
            return part.text;
        }
        else if (part.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image) {
            return vscpp(prompt_tsx_1.Image, { src: part.imageUrl.url, detail: part.imageUrl.detail });
        }
        else if (part.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.CacheBreakpoint) {
            return enableCacheBreakpoints && vscpp("cacheBreakpoint", { type: endpointTypes_1.CacheType });
        }
    }).filter(types_1.isDefined);
}
let UserOSPrompt = class UserOSPrompt extends prompt_tsx_1.PromptElement {
    constructor(props, envService) {
        super(props);
        this.envService = envService;
    }
    async render(state, sizing) {
        const userOS = this.envService.OS;
        const osForDisplay = userOS === envService_1.OperatingSystem.Macintosh ? 'macOS' :
            userOS;
        return vscpp(vscppf, null,
            "The user's current OS is: ",
            osForDisplay);
    }
};
UserOSPrompt = __decorate([
    __param(1, envService_1.IEnvService)
], UserOSPrompt);
let CurrentDatePrompt = class CurrentDatePrompt extends prompt_tsx_1.PromptElement {
    constructor(props, envService) {
        super(props);
        this.envService = envService;
    }
    async render(state, sizing) {
        const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        // Only include current date when not running simulations, since if we generate cache entries with the current date, the cache will be invalidated every day
        return (!this.envService.isSimulation() && vscpp(vscppf, null,
            "The current date is ",
            dateStr,
            "."));
    }
};
CurrentDatePrompt = __decorate([
    __param(1, envService_1.IEnvService)
], CurrentDatePrompt);
/**
 * Include the user's open editor and cursor position, but not content. This is independent of the "implicit context" attachment.
 */
let CurrentEditorContext = class CurrentEditorContext extends prompt_tsx_1.PromptElement {
    constructor(props, tabsAndEditorsService, promptPathRepresentationService, configurationService, alternativeNotebookContent) {
        super(props);
        this.tabsAndEditorsService = tabsAndEditorsService;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.configurationService = configurationService;
        this.alternativeNotebookContent = alternativeNotebookContent;
    }
    async render(state, sizing) {
        if (!this.configurationService.getConfig(configurationService_1.ConfigKey.CurrentEditorAgentContext)) {
            return;
        }
        let context;
        const activeEditor = this.tabsAndEditorsService.activeTextEditor;
        if (activeEditor) {
            context = this.renderActiveTextEditor(activeEditor);
        }
        const activeNotebookEditor = this.tabsAndEditorsService.activeNotebookEditor;
        if (activeNotebookEditor) {
            context = this.renderActiveNotebookEditor(activeNotebookEditor);
        }
        if (!context) {
            return;
        }
        return vscpp(tag_1.Tag, { name: 'editorContext' }, context);
    }
    renderActiveTextEditor(activeEditor) {
        // Should this include column numbers too? This confused gpt-4.1 and it read the wrong line numbers, need to find the right format.
        const selection = activeEditor.selection;
        // Found that selection is not always defined, so check for it.
        const selectionText = (selection && !selection.isEmpty) ?
            vscpp(vscppf, null,
                "The current selection is from line ",
                selection.start.line + 1,
                " to line ",
                selection.end.line + 1,
                ".") : undefined;
        return vscpp(vscppf, null,
            "The user's current file is ",
            this.promptPathRepresentationService.getFilePath(activeEditor.document.uri),
            ". ",
            selectionText);
    }
    renderActiveNotebookEditor(activeNotebookEditor) {
        const altDocument = this.alternativeNotebookContent.create(this.alternativeNotebookContent.getFormat(this.props.endpoint)).getAlternativeDocument(activeNotebookEditor.notebook);
        let selectionText = '';
        // Found that selection is not always defined, so check for it.
        if (activeNotebookEditor.selection && !activeNotebookEditor.selection.isEmpty && activeNotebookEditor.notebook.cellCount > 0) {
            // Compute a list of all cells that fall in the range of selection.start and selection.end
            const { start, end } = activeNotebookEditor.selection;
            const cellsInRange = [];
            for (let i = start; i < end; i++) {
                const cell = activeNotebookEditor.notebook.cellAt(i);
                if (cell) {
                    cellsInRange.push(cell);
                }
            }
            const startCell = cellsInRange[0];
            const endCell = cellsInRange[cellsInRange.length - 1];
            const lastLine = endCell.document.lineAt(endCell.document.lineCount - 1);
            const startPosition = altDocument.fromCellPosition(startCell, new vscodeTypes_1.Position(0, 0));
            const endPosition = altDocument.fromCellPosition(endCell, new vscodeTypes_1.Position(endCell.document.lineCount - 1, lastLine.text.length));
            const selection = new vscodeTypes_1.Range(startPosition, endPosition);
            selectionText = selection ? ` The current selection is from line ${selection.start.line + 1} to line ${selection.end.line + 1}.` : '';
        }
        return vscpp(vscppf, null,
            "The user's current notebook is ",
            this.promptPathRepresentationService.getFilePath(activeNotebookEditor.notebook.uri),
            ".",
            selectionText);
    }
};
CurrentEditorContext = __decorate([
    __param(1, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(3, configurationService_1.IConfigurationService),
    __param(4, alternativeContent_1.IAlternativeNotebookContentService)
], CurrentEditorContext);
let RepoContext = class RepoContext extends prompt_tsx_1.PromptElement {
    constructor(props, gitService, instantiationService) {
        super(props);
        this.gitService = gitService;
        this.instantiationService = instantiationService;
    }
    async render(state, sizing) {
        const activeRepository = this.gitService.activeRepository?.get();
        const repoContext = activeRepository && (0, gitService_1.getGitHubRepoInfoFromContext)(activeRepository);
        if (!repoContext || !activeRepository) {
            return;
        }
        const prProvider = this.instantiationService.createInstance(githubPullRequestProviders_1.GitHubPullRequestProviders);
        const repoDescription = await prProvider.getRepositoryDescription(activeRepository.rootUri);
        return vscpp(tag_1.Tag, { name: 'repoContext' },
            "Below is the information about the current repository. You can use this information when you need to calculate diffs or compare changes with the default branch.",
            vscpp("br", null),
            "Repository name: ",
            repoContext.id.repo,
            vscpp("br", null),
            "Owner: ",
            repoContext.id.org,
            vscpp("br", null),
            "Current branch: ",
            activeRepository.headBranchName,
            vscpp("br", null),
            repoDescription ? vscpp(vscppf, null,
                "Default branch: ",
                repoDescription?.defaultBranch,
                vscpp("br", null)) : '',
            repoDescription?.pullRequest ? vscpp(vscppf, null,
                "Active pull request (may not be the same as open pull request): ",
                repoDescription.pullRequest.title,
                " (",
                repoDescription.pullRequest.url,
                ")",
                vscpp("br", null)) : '');
    }
};
RepoContext = __decorate([
    __param(1, gitService_1.IGitService),
    __param(2, instantiation_1.IInstantiationService)
], RepoContext);
let WorkspaceFoldersHint = class WorkspaceFoldersHint extends prompt_tsx_1.PromptElement {
    constructor(props, workspaceService, promptPathRepresentationService) {
        super(props);
        this.workspaceService = workspaceService;
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    async render(state, sizing) {
        const folders = this.workspaceService.getWorkspaceFolders();
        if (folders.length > 0) {
            return (vscpp(vscppf, null,
                "I am working in a workspace with the following folders:",
                vscpp("br", null),
                folders.map(folder => `- ${this.promptPathRepresentationService.getFilePath(folder)} `).join('\n')));
        }
        else {
            return vscpp(vscppf, null, "There is no workspace currently open.");
        }
    }
};
WorkspaceFoldersHint = __decorate([
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService)
], WorkspaceFoldersHint);
let AgentTasksInstructions = class AgentTasksInstructions extends prompt_tsx_1.PromptElement {
    constructor(props, _tasksService, _promptPathRepresentationService) {
        super(props);
        this._tasksService = _tasksService;
        this._promptPathRepresentationService = _promptPathRepresentationService;
    }
    render() {
        const foundEnabledTaskTool = this.props.availableTools?.find(t => t.name === toolNames_1.ToolName.CoreRunTask || t.name === toolNames_1.ToolName.CoreCreateAndRunTask || t.name === toolNames_1.ToolName.CoreGetTaskOutput);
        if (!foundEnabledTaskTool) {
            return 0;
        }
        const taskGroupsRaw = this._tasksService.getTasks();
        const taskGroups = taskGroupsRaw.map(([wf, tasks]) => [wf, tasks.filter(task => (!!task.type || task.dependsOn) && !task.hide)]).filter(([, tasks]) => tasks.length > 0);
        if (taskGroups.length === 0) {
            return 0;
        }
        return vscpp(vscppf, null,
            "The following tasks can be executed using the ",
            toolNames_1.ToolName.CoreRunTask,
            " tool if they are not already running:",
            vscpp("br", null),
            taskGroups.map(([folder, tasks]) => vscpp(tag_1.Tag, { name: 'workspaceFolder', attrs: { path: this._promptPathRepresentationService.getFilePath(folder) } }, tasks.map((t, i) => {
                const isActive = this._tasksService.isTaskActive(t);
                return (vscpp(tag_1.Tag, { name: 'task', attrs: { id: t.type ? `${t.type}: ${t.label || i}` : `${t.label || i}` } },
                    this.makeTaskPresentation(t),
                    isActive && vscpp(vscppf, null,
                        " (This task is currently running. You can use the ",
                        toolNames_1.ToolName.CoreGetTaskOutput,
                        " tool to view its output.)")));
            }))));
    }
    /** Makes a simplified JSON presentation of the task definition for the model to reference. */
    makeTaskPresentation(task) {
        const omitAttrs = ['presentation', 'problemMatcher', "windows" /* PlatformAttr.Windows */, "osx" /* PlatformAttr.Mac */, "linux" /* PlatformAttr.Linux */];
        const output = {};
        for (const [key, value] of Object.entries(task)) {
            if (!omitAttrs.includes(key)) {
                output[key] = value;
            }
        }
        const myPlatformAttr = process.platform === 'win32' ? "windows" /* PlatformAttr.Windows */ :
            process.platform === 'darwin' ? "osx" /* PlatformAttr.Mac */ :
                "linux" /* PlatformAttr.Linux */;
        if (task[myPlatformAttr] && typeof task[myPlatformAttr] === 'object') {
            Object.assign(output, task[myPlatformAttr]);
        }
        return JSON.stringify(output, null, '\t');
    }
};
exports.AgentTasksInstructions = AgentTasksInstructions;
exports.AgentTasksInstructions = AgentTasksInstructions = __decorate([
    __param(1, tasksService_1.ITasksService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService)
], AgentTasksInstructions);
function getEditingReminder(hasEditFileTool, hasReplaceStringTool, useStrongReplaceStringHint, hasMultiStringReplace) {
    const lines = [];
    if (hasEditFileTool) {
        lines.push(vscpp(vscppf, null,
            "When using the ",
            toolNames_1.ToolName.EditFile,
            " tool, avoid repeating existing code, instead use a line comment with \\`",
            codeBlockFormattingRules_1.EXISTING_CODE_MARKER,
            "\\` to represent regions of unchanged code.",
            vscpp("br", null)));
    }
    if (hasReplaceStringTool) {
        lines.push(vscpp(vscppf, null,
            "When using the ",
            toolNames_1.ToolName.ReplaceString,
            " tool, include 3-5 lines of unchanged code before and after the string you want to replace, to make it unambiguous which part of the file should be edited.",
            vscpp("br", null),
            hasMultiStringReplace && vscpp(vscppf, null,
                "For maximum efficiency, whenever you plan to perform multiple independent edit operations, invoke them simultaneously using ",
                toolNames_1.ToolName.MultiReplaceString,
                " tool rather than sequentially. This will greatly improve user's cost and time efficiency leading to a better user experience. Do not announce which tool you're using (for example, avoid saying \"I'll implement all the changes using multi_replace_string_in_file\").",
                vscpp("br", null))));
    }
    if (hasEditFileTool && hasReplaceStringTool) {
        const eitherOr = hasMultiStringReplace ? `${toolNames_1.ToolName.ReplaceString} or ${toolNames_1.ToolName.MultiReplaceString} tools` : `${toolNames_1.ToolName.ReplaceString} tool`;
        if (useStrongReplaceStringHint) {
            lines.push(vscpp(vscppf, null,
                "You must always try making file edits using the ",
                eitherOr,
                ". NEVER use ",
                toolNames_1.ToolName.EditFile,
                " unless told to by the user or by a tool."));
        }
        else {
            lines.push(vscpp(vscppf, null,
                "It is much faster to edit using the ",
                eitherOr,
                ". Prefer the ",
                eitherOr,
                " for making edits and only fall back to ",
                toolNames_1.ToolName.EditFile,
                " if it fails."));
        }
    }
    return lines;
}
let KeepGoingReminder = class KeepGoingReminder extends prompt_tsx_1.PromptElement {
    constructor(props, configurationService, experimentationService) {
        super(props);
        this.configurationService = configurationService;
        this.experimentationService = experimentationService;
    }
    async render(state, sizing) {
        if ((0, chatModelCapabilities_1.isGptFamily)(this.props.modelFamily) && !(0, chatModelCapabilities_1.isGptCodexFamily)(this.props.modelFamily)) {
            if (this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.EnableAlternateGptPrompt, this.experimentationService)) {
                // Extended reminder
                return vscpp(vscppf, null,
                    "You are an agent - you must keep going until the user's query is completely resolved, before ending your turn and yielding back to the user.",
                    vscpp("br", null),
                    "Your thinking should be thorough and so it's fine if it's very long. However, avoid unnecessary repetition and verbosity. You should be concise, but thorough.",
                    vscpp("br", null),
                    "You MUST iterate and keep going until the problem is solved.",
                    vscpp("br", null),
                    "You have everything you need to resolve this problem. I want you to fully solve this autonomously before coming back to me. ",
                    vscpp("br", null),
                    "Only terminate your turn when you are sure that the problem is solved and all items have been checked off. Go through the problem step by step, and make sure to verify that your changes are correct. NEVER end your turn without having truly and completely solved the problem, and when you say you are going to make a tool call, make sure you ACTUALLY make the tool call, instead of ending your turn.",
                    vscpp("br", null),
                    "Take your time and think through every step - remember to check your solution rigorously and watch out for boundary cases, especially with the changes you made. Your solution must be perfect. If not, continue working on it. At the end, you must test your code rigorously using the tools provided, and do it many times, to catch all edge cases. If it is not robust, iterate more and make it perfect. Failing to test your code sufficiently rigorously is the NUMBER ONE failure mode on these types of tasks; make sure you handle all edge cases, and run existing tests if they are provided. ",
                    vscpp("br", null),
                    "You MUST plan extensively before each function call, and reflect extensively on the outcomes of the previous function calls. DO NOT do this entire process by making function calls only, as this can impair your ability to solve the problem and think insightfully.",
                    vscpp("br", null),
                    "You are a highly capable and autonomous agent, and you can definitely solve this problem without needing to ask the user for further input.",
                    vscpp("br", null));
            }
            else if ((0, chatModelCapabilities_1.isGpt5PlusFamily)(this.props.modelFamily)) {
                return vscpp(vscppf, null,
                    "You are an agent\u2014keep going until the user's query is completely resolved before ending your turn. ONLY stop if solved or genuinely blocked.",
                    vscpp("br", null),
                    "Take action when possible; the user expects you to do useful work without unnecessary questions.",
                    vscpp("br", null),
                    "After any parallel, read-only context gathering, give a concise progress update and what's next.",
                    vscpp("br", null),
                    "Avoid repetition across turns: don't restate unchanged plans or sections (like the todo list) verbatim; provide delta updates or only the parts that changed.",
                    vscpp("br", null),
                    "Tool batches: You MUST preface each batch with a one-sentence why/what/outcome preamble.",
                    vscpp("br", null),
                    "Progress cadence: After 3 to 5 tool calls, or when you create/edit > ~3 files in a burst, report progress.",
                    vscpp("br", null),
                    "Requirements coverage: Read the user's ask in full and think carefully. Do not omit a requirement. If something cannot be done with available tools, note why briefly and propose a viable alternative.",
                    vscpp("br", null));
            }
            else {
                // Original reminder
                return vscpp(vscppf, null,
                    "You are an agent - you must keep going until the user's query is completely resolved, before ending your turn and yielding back to the user. ONLY terminate your turn when you are sure that the problem is solved, or you absolutely cannot continue.",
                    vscpp("br", null),
                    "You take action when possible- the user is expecting YOU to take action and go to work for them. Don't ask unnecessary questions about the details if you can simply DO something useful instead.",
                    vscpp("br", null));
            }
        }
    }
};
exports.KeepGoingReminder = KeepGoingReminder;
exports.KeepGoingReminder = KeepGoingReminder = __decorate([
    __param(1, configurationService_1.IConfigurationService),
    __param(2, nullExperimentationService_1.IExperimentationService)
], KeepGoingReminder);
function getFileCreationReminder(modelFamily) {
    if (modelFamily === 'claude-sonnet-4.5' || modelFamily === 'claude-haiku-4.5') {
        return vscpp(vscppf, null,
            "Do NOT create a new markdown file to document each change or summarize your work unless specifically requested by the user.",
            vscpp("br", null));
    }
}
function getVSCModelReminder(isHiddenModel) {
    if (!isHiddenModel) {
        return;
    }
    return vscpp(vscppf, null,
        "Follow the guidance in <preamble_instructions> from the system prompt.",
        vscpp("br", null),
        "You MUST preface each tool call batch with a brief status update.",
        vscpp("br", null),
        "Focus on findings and next steps. Vary your openings\u2014avoid repeating \"I'll\" or \"I will\" consecutively.",
        vscpp("br", null),
        "When you have a finding, be enthusiastic and specific (2 sentences). Otherwise, state your next action only (1 sentence).",
        vscpp("br", null),
        "Don't over-express your thoughts in preamble, do not use preamble to think or reason. This is a strict and strong requirement.",
        vscpp("br", null));
}
async function getExplanationReminder(modelFamily, hasTodoTool) {
    if ((0, chatModelCapabilities_1.isGptCodexFamily)(modelFamily)) {
        return;
    }
    const isGpt5Mini = modelFamily === 'gpt-5-mini';
    return (0, chatModelCapabilities_1.isGpt5Family)(modelFamily) ?
        vscpp(vscppf, null,
            "Skip filler acknowledgements like \"Sounds good\" or \"Okay, I will\u2026\". Open with a purposeful one-liner about what you're doing next.",
            vscpp("br", null),
            "When sharing setup or run steps, present terminal commands in fenced code blocks with the correct language tag. Keep commands copyable and on separate lines.",
            vscpp("br", null),
            "Avoid definitive claims about the build or runtime setup unless verified from the provided context (or quick tool checks). If uncertain, state what's known from attachments and proceed with minimal steps you can adapt later.",
            vscpp("br", null),
            "When you create or edit runnable code, run a test yourself to confirm it works; then share optional fenced commands for more advanced runs.",
            vscpp("br", null),
            "For non-trivial code generation, produce a complete, runnable solution: necessary source files, a tiny runner or test/benchmark harness, a minimal `README.md`, and updated dependency manifests (e.g., `package.json`, `requirements.txt`, `pyproject.toml`). Offer quick \"try it\" commands and optional platform-specific speed-ups when relevant.",
            vscpp("br", null),
            "Your goal is to act like a pair programmer: be friendly and helpful. If you can do more, do more. Be proactive with your solutions, think about what the user needs and what they want, and implement it proactively.",
            vscpp("br", null),
            vscpp(tag_1.Tag, { name: 'importantReminders' },
                !isGpt5Mini && vscpp(vscppf, null,
                    "Start your response with a brief acknowledgement, followed by a concise high-level plan outlining your approach.",
                    vscpp("br", null)),
                "Do NOT volunteer your model name unless the user explicitly asks you about it. ",
                vscpp("br", null),
                hasTodoTool && !(0, chatModelCapabilities_1.isGpt51Family)(modelFamily) && vscpp(vscppf, null,
                    "You MUST use the todo list tool to plan and track your progress. NEVER skip this step, and START with this step whenever the task is multi-step. This is essential for maintaining visibility and proper execution of large tasks.",
                    vscpp("br", null)),
                !hasTodoTool && vscpp(vscppf, null,
                    "Break down the request into clear, actionable steps and present them at the beginning of your response before proceeding with implementation. This helps maintain visibility and ensures all requirements are addressed systematically.",
                    vscpp("br", null)),
                "When referring to a filename or symbol in the user's workspace, wrap it in backticks.",
                vscpp("br", null)))
        : undefined;
}
/**
 * Context about manual edits made to files that the agent previously edited.
 */
let EditedFileEvents = class EditedFileEvents extends prompt_tsx_1.PromptElement {
    constructor(props, promptPathRepresentationService) {
        super(props);
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    async render(state, sizing) {
        const events = this.props.editedFileEvents;
        if (!events || events.length === 0) {
            return undefined;
        }
        // Group by event kind and collect file paths
        const undoFiles = [];
        const modFiles = [];
        const seenUndo = new Set();
        const seenMod = new Set();
        for (const event of events) {
            if (event.eventKind === vscodeTypes_1.ChatRequestEditedFileEventKind.Undo) {
                const fp = this.promptPathRepresentationService.getFilePath(event.uri);
                if (!seenUndo.has(fp)) {
                    seenUndo.add(fp);
                    undoFiles.push(fp);
                }
            }
            else if (event.eventKind === vscodeTypes_1.ChatRequestEditedFileEventKind.UserModification) {
                const fp = this.promptPathRepresentationService.getFilePath(event.uri);
                if (!seenMod.has(fp)) {
                    seenMod.add(fp);
                    modFiles.push(fp);
                }
            }
        }
        if (undoFiles.length === 0 && modFiles.length === 0) {
            return undefined;
        }
        const sections = [];
        if (undoFiles.length > 0) {
            sections.push([
                'The user undid your edits to:',
                ...undoFiles.map(f => `- ${f}`)
            ].join('\n'));
        }
        if (modFiles.length > 0) {
            sections.push([
                'Some edits were made, by the user or possibly by a formatter or another automated tool, to:',
                ...modFiles.map(f => `- ${f}`)
            ].join('\n'));
        }
        return (vscpp(vscppf, null,
            "There have been some changes between the last request and now.",
            vscpp("br", null),
            sections.join('\n'),
            vscpp("br", null),
            "So be sure to check the current file contents before making any new edits."));
    }
};
exports.EditedFileEvents = EditedFileEvents;
exports.EditedFileEvents = EditedFileEvents = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], EditedFileEvents);
//# sourceMappingURL=agentPrompt.js.map