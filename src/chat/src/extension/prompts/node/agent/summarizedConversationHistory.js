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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarizedConversationHistoryPropsBuilder = exports.SummarizedConversationHistory = exports.SummarizedConversationHistoryMetadata = exports.ConversationHistorySummarizationPrompt = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const materialized_1 = require("@vscode/prompt-tsx/dist/base/materialized");
const commonTypes_1 = require("../../../../platform/chat/common/commonTypes");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../../platform/log/common/logService");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const errors_1 = require("../../../../util/vs/base/common/errors");
const iterator_1 = require("../../../../util/vs/base/common/iterator");
const stopwatch_1 = require("../../../../util/vs/base/common/stopwatch");
const uuid_1 = require("../../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const cacheBreakpoints_1 = require("../../../intents/node/cacheBreakpoints");
const toolCallingLoop_1 = require("../../../intents/node/toolCallingLoop");
const toolNames_1 = require("../../../tools/common/toolNames");
const toolSchemaNormalizer_1 = require("../../../tools/common/toolSchemaNormalizer");
const notebookSummaryTool_1 = require("../../../tools/node/notebookSummaryTool");
const promptRenderer_1 = require("../base/promptRenderer");
const tag_1 = require("../base/tag");
const toolCalling_1 = require("../panel/toolCalling");
const agentPrompt_1 = require("./agentPrompt");
const simpleSummarizedHistoryPrompt_1 = require("./simpleSummarizedHistoryPrompt");
const SummaryPrompt = vscpp(vscppf, null,
    "Your task is to create a comprehensive, detailed summary of the entire conversation that captures all essential information needed to seamlessly continue the work without any loss of context. This summary will be used to compact the conversation while preserving critical technical details, decisions, and progress.",
    vscpp("br", null),
    "## Recent Context Analysis",
    vscpp("br", null),
    "Pay special attention to the most recent agent commands and tool executions that led to this summarization being triggered. Include:",
    vscpp("br", null),
    "- **Last Agent Commands**: What specific actions/tools were just executed",
    vscpp("br", null),
    "- **Tool Results**: Key outcomes from recent tool calls (truncate if very long, but preserve essential information)",
    vscpp("br", null),
    "- **Immediate State**: What was the system doing right before summarization",
    vscpp("br", null),
    "- **Triggering Context**: What caused the token budget to be exceeded",
    vscpp("br", null),
    "## Analysis Process",
    vscpp("br", null),
    "Before providing your final summary, wrap your analysis in `<analysis>` tags to organize your thoughts systematically:",
    vscpp("br", null),
    "1. **Chronological Review**: Go through the conversation chronologically, identifying key phases and transitions",
    vscpp("br", null),
    "2. **Intent Mapping**: Extract all explicit and implicit user requests, goals, and expectations",
    vscpp("br", null),
    "3. **Technical Inventory**: Catalog all technical concepts, tools, frameworks, and architectural decisions",
    vscpp("br", null),
    "4. **Code Archaeology**: Document all files, functions, and code patterns that were discussed or modified",
    vscpp("br", null),
    "5. **Progress Assessment**: Evaluate what has been completed vs. what remains pending",
    vscpp("br", null),
    "6. **Context Validation**: Ensure all critical information for continuation is captured",
    vscpp("br", null),
    "7. **Recent Commands Analysis**: Document the specific agent commands and tool results from the most recent operations",
    vscpp("br", null),
    "## Summary Structure",
    vscpp("br", null),
    "Your summary must include these sections in order, following the exact format below:",
    vscpp("br", null),
    vscpp(tag_1.Tag, { name: 'analysis' },
        "[Chronological Review: Walk through conversation phases: initial request \u2192 exploration \u2192 implementation \u2192 debugging \u2192 current state]",
        vscpp("br", null),
        "[Intent Mapping: List each explicit user request with message context]",
        vscpp("br", null),
        "[Technical Inventory: Catalog all technologies, patterns, and decisions mentioned]",
        vscpp("br", null),
        "[Code Archaeology: Document every file, function, and code change discussed]",
        vscpp("br", null),
        "[Progress Assessment: What's done vs. pending with specific status]",
        vscpp("br", null),
        "[Context Validation: Verify all continuation context is captured]",
        vscpp("br", null),
        "[Recent Commands Analysis: Last agent commands executed, tool results (truncated if long), immediate pre-summarization state]",
        vscpp("br", null)),
    vscpp("br", null),
    vscpp(tag_1.Tag, { name: 'summary' },
        "1. Conversation Overview:",
        vscpp("br", null),
        "- Primary Objectives: [All explicit user requests and overarching goals with exact quotes]",
        vscpp("br", null),
        "- Session Context: [High-level narrative of conversation flow and key phases]",
        vscpp("br", null),
        "- User Intent Evolution: [How user's needs or direction changed throughout conversation]",
        vscpp("br", null),
        "2. Technical Foundation:",
        vscpp("br", null),
        "- [Core Technology 1]: [Version/details and purpose]",
        vscpp("br", null),
        "- [Framework/Library 2]: [Configuration and usage context]",
        vscpp("br", null),
        "- [Architectural Pattern 3]: [Implementation approach and reasoning]",
        vscpp("br", null),
        "- [Environment Detail 4]: [Setup specifics and constraints]",
        vscpp("br", null),
        "3. Codebase Status:",
        vscpp("br", null),
        "- [File Name 1]:",
        vscpp("br", null),
        "- Purpose: [Why this file is important to the project]",
        vscpp("br", null),
        "- Current State: [Summary of recent changes or modifications]",
        vscpp("br", null),
        "- Key Code Segments: [Important functions/classes with brief explanations]",
        vscpp("br", null),
        "- Dependencies: [How this relates to other components]",
        vscpp("br", null),
        "- [File Name 2]:",
        vscpp("br", null),
        "- Purpose: [Role in the project]",
        vscpp("br", null),
        "- Current State: [Modification status]",
        vscpp("br", null),
        "- Key Code Segments: [Critical code blocks]",
        vscpp("br", null),
        "- [Additional files as needed]",
        vscpp("br", null),
        "4. Problem Resolution:",
        vscpp("br", null),
        "- Issues Encountered: [Technical problems, bugs, or challenges faced]",
        vscpp("br", null),
        "- Solutions Implemented: [How problems were resolved and reasoning]",
        vscpp("br", null),
        "- Debugging Context: [Ongoing troubleshooting efforts or known issues]",
        vscpp("br", null),
        "- Lessons Learned: [Important insights or patterns discovered]",
        vscpp("br", null),
        "5. Progress Tracking:",
        vscpp("br", null),
        "- Completed Tasks: [What has been successfully implemented with status indicators]",
        vscpp("br", null),
        "- Partially Complete Work: [Tasks in progress with current completion status]",
        vscpp("br", null),
        "- Validated Outcomes: [Features or code confirmed working through testing]",
        vscpp("br", null),
        "6. Active Work State:",
        vscpp("br", null),
        "- Current Focus: [Precisely what was being worked on in most recent messages]",
        vscpp("br", null),
        "- Recent Context: [Detailed description of last few conversation exchanges]",
        vscpp("br", null),
        "- Working Code: [Code snippets being modified or discussed recently]",
        vscpp("br", null),
        "- Immediate Context: [Specific problem or feature being addressed before summary]",
        vscpp("br", null),
        "7. Recent Operations:",
        vscpp("br", null),
        "- Last Agent Commands: [Specific tools/actions executed just before summarization with exact command names]",
        vscpp("br", null),
        "- Tool Results Summary: [Key outcomes from recent tool executions - truncate long results but keep essential info]",
        vscpp("br", null),
        "- Pre-Summary State: [What the agent was actively doing when token budget was exceeded]",
        vscpp("br", null),
        "- Operation Context: [Why these specific commands were executed and their relationship to user goals]",
        vscpp("br", null),
        "8. Continuation Plan:",
        vscpp("br", null),
        "- [Pending Task 1]: [Details and specific next steps with verbatim quotes]",
        vscpp("br", null),
        "- [Pending Task 2]: [Requirements and continuation context]",
        vscpp("br", null),
        "- [Priority Information]: [Which tasks are most urgent or logically sequential]",
        vscpp("br", null),
        "- [Next Action]: [Immediate next step with direct quotes from recent messages]",
        vscpp("br", null)),
    vscpp("br", null),
    "## Quality Guidelines",
    vscpp("br", null),
    "- **Precision**: Include exact filenames, function names, variable names, and technical terms",
    vscpp("br", null),
    "- **Completeness**: Capture all context needed to continue without re-reading the full conversation",
    vscpp("br", null),
    "- **Clarity**: Write for someone who needs to pick up exactly where the conversation left off",
    vscpp("br", null),
    "- **Verbatim Accuracy**: Use direct quotes for task specifications and recent work context",
    vscpp("br", null),
    "- **Technical Depth**: Include enough detail for complex technical decisions and code patterns",
    vscpp("br", null),
    "- **Logical Flow**: Present information in a way that builds understanding progressively",
    vscpp("br", null),
    "This summary should serve as a comprehensive handoff document that enables seamless continuation of all active work streams while preserving the full technical and contextual richness of the original conversation.",
    vscpp("br", null));
/**
 * Prompt used to summarize conversation history when the context window is exceeded.
 */
class ConversationHistorySummarizationPrompt extends prompt_tsx_1.PromptElement {
    async render(state, sizing) {
        const history = this.props.simpleMode ?
            vscpp(simpleSummarizedHistoryPrompt_1.SimpleSummarizedHistory, { priority: 1, promptContext: this.props.promptContext, location: this.props.location, endpoint: this.props.endpoint, maxToolResultLength: this.props.maxToolResultLength }) :
            vscpp(ConversationHistory, { priority: 1, promptContext: this.props.promptContext, location: this.props.location, endpoint: this.props.endpoint, maxToolResultLength: this.props.maxToolResultLength, enableCacheBreakpoints: this.props.enableCacheBreakpoints });
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: this.props.priority }, SummaryPrompt),
            history,
            this.props.workingNotebook && vscpp(WorkingNotebookSummary, { priority: this.props.priority - 2, notebook: this.props.workingNotebook }),
            vscpp(prompt_tsx_1.UserMessage, null,
                "Summarize the conversation history so far, paying special attention to the most recent agent commands and tool results that triggered this summarization. Structure your summary using the enhanced format provided in the system message.",
                vscpp("br", null),
                "Focus particularly on:",
                vscpp("br", null),
                "- The specific agent commands/tools that were just executed",
                vscpp("br", null),
                "- The results returned from these recent tool calls (truncate if very long but preserve key information)",
                vscpp("br", null),
                "- What the agent was actively working on when the token budget was exceeded",
                vscpp("br", null),
                "- How these recent operations connect to the overall user goals",
                vscpp("br", null),
                "Include all important tool calls and their results as part of the appropriate sections, with special emphasis on the most recent operations.")));
    }
}
exports.ConversationHistorySummarizationPrompt = ConversationHistorySummarizationPrompt;
class WorkingNotebookSummary extends prompt_tsx_1.PromptElement {
    async render(state, sizing) {
        return (vscpp(prompt_tsx_1.UserMessage, null,
            "This is the current state of the notebook that you have been working on:",
            vscpp("br", null),
            vscpp(notebookSummaryTool_1.NotebookSummary, { notebook: this.props.notebook, includeCellLines: false, altDoc: undefined })));
    }
}
/**
 * Conversation history rendered with tool calls and summaries.
 */
class ConversationHistory extends prompt_tsx_1.PromptElement {
    async render(state, sizing) {
        // Iterate over the turns in reverse order until we find a turn with a tool call round that was summarized
        const history = [];
        // Handle the possibility that we summarized partway through the current turn (e.g. if we accumulated many tool call rounds)
        let summaryForCurrentTurn = undefined;
        if (this.props.promptContext.toolCallRounds?.length) {
            const toolCallRounds = [];
            for (let i = this.props.promptContext.toolCallRounds.length - 1; i >= 0; i--) {
                const toolCallRound = this.props.promptContext.toolCallRounds[i];
                if (toolCallRound.summary) {
                    // This tool call round was summarized
                    summaryForCurrentTurn = toolCallRound.summary;
                    break;
                }
                toolCallRounds.push(toolCallRound);
            }
            // Reverse the tool call rounds so they are in chronological order
            toolCallRounds.reverse();
            history.push(vscpp(toolCalling_1.ChatToolCalls, { priority: 899, flexGrow: 2, promptContext: this.props.promptContext, toolCallRounds: toolCallRounds, toolCallResults: this.props.promptContext.toolCallResults, enableCacheBreakpoints: this.props.enableCacheBreakpoints, truncateAt: this.props.maxToolResultLength }));
        }
        if (summaryForCurrentTurn) {
            history.push(vscpp(SummaryMessageElement, { endpoint: this.props.endpoint, summaryText: summaryForCurrentTurn }));
            return (vscpp(prompt_tsx_1.PrioritizedList, { priority: this.props.priority, descending: false, passPriority: true }, history.reverse()));
        }
        if (!this.props.promptContext.isContinuation) {
            history.push(vscpp(agentPrompt_1.AgentUserMessage, { flexGrow: 2, priority: 900, ...(0, agentPrompt_1.getUserMessagePropsFromAgentProps)(this.props) }));
        }
        // We may have a summary from earlier in the conversation, but skip history if we have a new summary
        for (const [i, turn] of [...this.props.promptContext.history.entries()].reverse()) {
            const metadata = turn.resultMetadata;
            // Build this list in chronological order
            const turnComponents = [];
            // Turn anatomy
            // ______________
            // |            |
            // |    USER    |
            // |            |
            // |  ASSISTANT |
            // |            |
            // |    TOOL    | <-- { summary: ..., toolCallRoundId: ... }
            // |  ASSISTANT |
            // |____________|
            let summaryForTurn;
            // If a tool call limit is exceeded, the tool call from this turn will
            // have been aborted and any result should be found in the next turn.
            const toolCallResultInNextTurn = metadata?.maxToolCallsExceeded;
            let toolCallResults = metadata?.toolCallResults;
            if (toolCallResultInNextTurn) {
                const nextMetadata = this.props.promptContext.history.at(i + 1)?.responseChatResult?.metadata;
                const mergeFrom = i === this.props.promptContext.history.length - 1 ? this.props.promptContext.toolCallResults : nextMetadata?.toolCallResults;
                toolCallResults = { ...toolCallResults, ...mergeFrom };
            }
            // Find the latest tool call round that was summarized
            const toolCallRounds = [];
            for (let i = turn.rounds.length - 1; i >= 0; i--) {
                const round = turn.rounds[i];
                summaryForTurn = round.summary ? new SummarizedConversationHistoryMetadata(round.id, round.summary) : undefined;
                if (summaryForTurn) {
                    break;
                }
                toolCallRounds.push(round);
            }
            if (summaryForTurn) {
                // We have a summary for a tool call round that was part of this turn
                turnComponents.push(vscpp(SummaryMessageElement, { endpoint: this.props.endpoint, summaryText: summaryForTurn.text }));
            }
            else if (!turn.isContinuation) {
                turnComponents.push(vscpp(agentPrompt_1.AgentUserMessage, { flexGrow: 1, ...(0, agentPrompt_1.getUserMessagePropsFromTurn)(turn, this.props.endpoint) }));
            }
            // Reverse the tool call rounds so they are in chronological order
            toolCallRounds.reverse();
            turnComponents.push(vscpp(toolCalling_1.ChatToolCalls, { flexGrow: 1, promptContext: this.props.promptContext, toolCallRounds: toolCallRounds, toolCallResults: toolCallResults, isHistorical: !(toolCallResultInNextTurn && i === this.props.promptContext.history.length - 1), truncateAt: this.props.maxToolResultLength }));
            history.push(...turnComponents.reverse());
            if (summaryForTurn) {
                // All preceding turns are covered by the summary and shouldn't be included verbatim
                break;
            }
        }
        return (vscpp(prompt_tsx_1.PrioritizedList, { priority: this.props.priority, descending: false, passPriority: true }, history.reverse()));
    }
}
class SummarizedConversationHistoryMetadata extends prompt_tsx_1.PromptMetadata {
    constructor(toolCallRoundId, text) {
        super();
        this.toolCallRoundId = toolCallRoundId;
        this.text = text;
    }
}
exports.SummarizedConversationHistoryMetadata = SummarizedConversationHistoryMetadata;
/**
 * Renders conversation history with tool calls and summaries, triggering summarization while rendering if necessary.
 */
let SummarizedConversationHistory = class SummarizedConversationHistory extends prompt_tsx_1.PromptElement {
    constructor(props, instantiationService) {
        super(props);
        this.instantiationService = instantiationService;
    }
    async render(state, sizing, progress, token) {
        const promptContext = { ...this.props.promptContext };
        let historyMetadata;
        if (this.props.triggerSummarize) {
            const summarizer = this.instantiationService.createInstance(ConversationHistorySummarizer, this.props, sizing, progress, token);
            const summResult = await summarizer.summarizeHistory();
            if (summResult) {
                historyMetadata = new SummarizedConversationHistoryMetadata(summResult.toolCallRoundId, summResult.summary);
                this.addSummaryToHistory(summResult.summary, summResult.toolCallRoundId);
            }
        }
        return vscpp(vscppf, null,
            historyMetadata && vscpp("meta", { value: historyMetadata }),
            vscpp(ConversationHistory, { ...this.props, promptContext: promptContext, enableCacheBreakpoints: this.props.enableCacheBreakpoints }));
    }
    addSummaryToHistory(summary, toolCallRoundId) {
        const round = this.props.promptContext.toolCallRounds?.find(round => round.id === toolCallRoundId);
        if (round) {
            round.summary = summary;
            return;
        }
        // Adding summaries to rounds in previous turns will only be persisted during the current session.
        // For the next turn, need to restore them from metadata (see normalizeSummariesOnRounds).
        for (const turn of [...this.props.promptContext.history].reverse()) {
            const round = turn.rounds.find(round => round.id === toolCallRoundId);
            if (round) {
                round.summary = summary;
                break;
            }
        }
    }
};
exports.SummarizedConversationHistory = SummarizedConversationHistory;
exports.SummarizedConversationHistory = SummarizedConversationHistory = __decorate([
    __param(1, instantiation_1.IInstantiationService)
], SummarizedConversationHistory);
var SummaryMode;
(function (SummaryMode) {
    SummaryMode["Simple"] = "simple";
    SummaryMode["Full"] = "full";
})(SummaryMode || (SummaryMode = {}));
let ConversationHistorySummarizer = class ConversationHistorySummarizer {
    constructor(props, sizing, progress, token, telemetryService, logService, instantiationService, configurationService, experimentationService, endpointProvider) {
        this.props = props;
        this.sizing = sizing;
        this.progress = progress;
        this.token = token;
        this.telemetryService = telemetryService;
        this.logService = logService;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.experimentationService = experimentationService;
        this.endpointProvider = endpointProvider;
        this.summarizationId = (0, uuid_1.generateUuid)();
    }
    async summarizeHistory() {
        // Just a function for test to create props and call this
        const propsInfo = this.instantiationService.createInstance(SummarizedConversationHistoryPropsBuilder).getProps(this.props);
        const summaryPromise = this.getSummaryWithFallback(propsInfo);
        this.progress?.report(new vscodeTypes_1.ChatResponseProgressPart2(l10n.t('Summarizing conversation history...'), async () => {
            try {
                await summaryPromise;
            }
            catch { }
            return l10n.t('Summarized conversation history');
        }));
        const summary = await summaryPromise;
        return {
            summary: summary.value,
            toolCallRoundId: propsInfo.summarizedToolCallRoundId
        };
    }
    async getSummaryWithFallback(propsInfo) {
        const forceMode = this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.AgentHistorySummarizationMode);
        if (forceMode === SummaryMode.Simple) {
            return await this.getSummary(SummaryMode.Simple, propsInfo);
        }
        else {
            try {
                return await this.getSummary(SummaryMode.Full, propsInfo);
            }
            catch (e) {
                if ((0, errors_1.isCancellationError)(e)) {
                    throw e;
                }
                return await this.getSummary(SummaryMode.Simple, propsInfo);
            }
        }
    }
    logInfo(message, mode) {
        this.logService.info(`[ConversationHistorySummarizer] [${mode}] ${message}`);
    }
    async getSummary(mode, propsInfo) {
        const stopwatch = new stopwatch_1.StopWatch(false);
        const forceGpt41 = this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.AgentHistorySummarizationForceGpt41, this.experimentationService);
        const gpt41Endpoint = await this.endpointProvider.getChatEndpoint('gpt-4.1');
        const endpoint = forceGpt41 && (gpt41Endpoint.modelMaxPromptTokens >= this.props.endpoint.modelMaxPromptTokens) ?
            gpt41Endpoint :
            this.props.endpoint;
        let summarizationPrompt;
        const associatedRequestId = this.props.promptContext.conversation?.getLatestTurn().id;
        const promptCacheMode = this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.AgentHistorySummarizationWithPromptCache, this.experimentationService);
        try {
            if (mode === SummaryMode.Full && promptCacheMode) {
                const props = {
                    ...propsInfo.props,
                    triggerSummarize: false
                };
                const expandedEndpoint = endpoint.cloneWithTokenOverride(endpoint.modelMaxPromptTokens * 1.05);
                summarizationPrompt = (await (0, promptRenderer_1.renderPromptElement)(this.instantiationService, expandedEndpoint, AgentPromptWithSummaryPrompt, props, undefined, this.token)).messages;
            }
            else {
                summarizationPrompt = (await (0, promptRenderer_1.renderPromptElement)(this.instantiationService, endpoint, ConversationHistorySummarizationPrompt, { ...propsInfo.props, simpleMode: mode === SummaryMode.Simple }, undefined, this.token)).messages;
            }
            this.logInfo(`summarization prompt rendered in ${stopwatch.elapsed()}ms.`, mode);
        }
        catch (e) {
            const budgetExceeded = e instanceof materialized_1.BudgetExceededError;
            const outcome = budgetExceeded ? 'budget_exceeded' : 'renderError';
            this.logInfo(`Error rendering summarization prompt in mode: ${mode}. ${e.stack}`, mode);
            this.sendSummarizationTelemetry(outcome, '', this.props.endpoint.model, mode, stopwatch.elapsed(), undefined);
            throw e;
        }
        let summaryResponse;
        try {
            const toolOpts = mode === SummaryMode.Full ? {
                tool_choice: 'none',
                tools: (0, toolSchemaNormalizer_1.normalizeToolSchema)(endpoint.family, this.props.tools?.map(tool => ({
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.inputSchema && Object.keys(tool.inputSchema).length ? tool.inputSchema : undefined
                    }, type: 'function'
                })), (tool, rule) => {
                    this.logService.warn(`Tool ${tool} failed validation: ${rule}`);
                }),
            } : undefined;
            if (promptCacheMode) {
                (0, cacheBreakpoints_1.addCacheBreakpoints)(summarizationPrompt);
            }
            else {
                stripCacheBreakpoints(summarizationPrompt);
            }
            summaryResponse = await endpoint.makeChatRequest2({
                debugName: `summarizeConversationHistory-${mode}`,
                messages: toolCallingLoop_1.ToolCallingLoop.stripInternalToolCallIds(summarizationPrompt),
                finishedCb: undefined,
                location: commonTypes_1.ChatLocation.Other,
                requestOptions: {
                    temperature: 0,
                    stream: false,
                    ...toolOpts
                },
                telemetryProperties: associatedRequestId ? { associatedRequestId } : undefined,
                enableRetryOnFilter: true
            }, this.token ?? cancellation_1.CancellationToken.None);
        }
        catch (e) {
            this.logInfo(`Error from summarization request. ${e.message}`, mode);
            this.sendSummarizationTelemetry('requestThrow', '', this.props.endpoint.model, mode, stopwatch.elapsed(), undefined);
            throw e;
        }
        return this.handleSummarizationResponse(summaryResponse, mode, stopwatch.elapsed());
    }
    async handleSummarizationResponse(response, mode, elapsedTime) {
        if (response.type !== commonTypes_1.ChatFetchResponseType.Success) {
            const outcome = response.type;
            this.sendSummarizationTelemetry(outcome, response.requestId, this.props.endpoint.model, mode, elapsedTime, undefined, response.reason);
            this.logInfo(`Summarization request failed. ${response.type} ${response.reason}`, mode);
            if (response.type === commonTypes_1.ChatFetchResponseType.Canceled) {
                throw new errors_1.CancellationError();
            }
            throw new Error('Summarization request failed');
        }
        const summarySize = await this.sizing.countTokens(response.value);
        const effectiveBudget = !!this.props.maxSummaryTokens
            ? Math.min(this.sizing.tokenBudget, this.props.maxSummaryTokens)
            : this.sizing.tokenBudget;
        if (summarySize > effectiveBudget) {
            this.sendSummarizationTelemetry('too_large', response.requestId, this.props.endpoint.model, mode, elapsedTime, response.usage);
            this.logInfo(`Summary too large: ${summarySize} tokens (effective budget ${effectiveBudget})`, mode);
            throw new Error('Summary too large');
        }
        this.sendSummarizationTelemetry('success', response.requestId, this.props.endpoint.model, mode, elapsedTime, response.usage);
        return response;
    }
    /**
     * Send telemetry for conversation summarization.
     * @param success Whether the summarization was successful
     */
    sendSummarizationTelemetry(outcome, requestId, model, mode, elapsedTime, usage, detailedOutcome) {
        const numRoundsInHistory = this.props.promptContext.history
            .map(turn => turn.rounds.length)
            .reduce((a, b) => a + b, 0);
        const numRoundsInCurrentTurn = this.props.promptContext.toolCallRounds?.length ?? 0;
        const numRounds = numRoundsInHistory + numRoundsInCurrentTurn;
        const reversedCurrentRounds = [...(this.props.promptContext.toolCallRounds ?? [])].reverse();
        let numRoundsSinceLastSummarization = reversedCurrentRounds.findIndex(round => round.summary) ?? -1;
        if (numRoundsSinceLastSummarization === -1) {
            let count = numRoundsInCurrentTurn;
            outer: for (const turn of iterator_1.Iterable.reverse(Array.from(this.props.promptContext.history))) {
                for (const round of iterator_1.Iterable.reverse(Array.from(turn.rounds ?? []))) {
                    if (round.summary) {
                        numRoundsSinceLastSummarization = count;
                        break outer;
                    }
                    count++;
                }
            }
        }
        const turnIndex = this.props.promptContext.history.length;
        const curTurnRoundIndex = this.props.promptContext.toolCallRounds?.length ?? 0;
        const lastUsedTool = this.props.promptContext.toolCallRounds?.at(-1)?.toolCalls?.at(-1)?.name ??
            this.props.promptContext.history?.at(-1)?.rounds.at(-1)?.toolCalls?.at(-1)?.name ?? 'none';
        const isDuringToolCalling = !!this.props.promptContext.toolCallRounds?.length ? 1 : 0;
        const conversationId = this.props.promptContext.conversation?.sessionId;
        const hasWorkingNotebook = this.props.workingNotebook ? 1 : 0;
        /* __GDPR__
            "summarizedConversationHistory" : {
                "owner": "roblourens",
                "comment": "Tracks when summarization happens and what the outcome was",
                "summarizationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "An ID to join all attempts of this summarization task." },
                "outcome": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The success state or failure reason of the summarization." },
                "detailedOutcome": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "A more detailed error message." },
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model ID used for the summarization." },
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The request ID from the summarization call." },
                "chatRequestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The chat request ID that this summarization ran during." },
                "numRounds": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of tool call rounds before this summarization was triggered." },
                "numRoundsSinceLastSummarization": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of tool call rounds since the last summarization." },
                "turnIndex": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The index of the current turn." },
                "curTurnRoundIndex": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The index of the current round within the current turn" },
                "lastUsedTool": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The name of the last tool used before summarization." },
                "isDuringToolCalling": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether this summarization was triggered during a tool calling loop." },
                "conversationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id for the current chat conversation." },
                "hasWorkingNotebook": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the conversation summary includes a working notebook." },
                "mode": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The mode of the conversation summary." },
                "summarizationMode": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The mode of the conversation summary." },
                "duration": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The duration of the summarization attempt in ms." },
                "promptTokenCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of prompt tokens, server side counted", "isMeasurement": true },
                "promptCacheTokenCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of prompt tokens hitting cache as reported by server", "isMeasurement": true },
                "responseTokenCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of generated tokens", "isMeasurement": true }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('summarizedConversationHistory', {
            summarizationId: this.summarizationId,
            outcome,
            detailedOutcome,
            requestId,
            chatRequestId: this.props.promptContext.conversation?.getLatestTurn().id,
            model,
            lastUsedTool,
            conversationId,
            mode,
            summarizationMode: mode, // Try to unstick GDPR
        }, {
            numRounds,
            numRoundsSinceLastSummarization,
            turnIndex,
            curTurnRoundIndex,
            isDuringToolCalling,
            hasWorkingNotebook,
            duration: elapsedTime,
            promptTokenCount: usage?.prompt_tokens,
            promptCacheTokenCount: usage?.prompt_tokens_details?.cached_tokens,
            responseTokenCount: usage?.completion_tokens,
        });
    }
};
ConversationHistorySummarizer = __decorate([
    __param(4, telemetry_1.ITelemetryService),
    __param(5, logService_1.ILogService),
    __param(6, instantiation_1.IInstantiationService),
    __param(7, configurationService_1.IConfigurationService),
    __param(8, nullExperimentationService_1.IExperimentationService),
    __param(9, endpointProvider_1.IEndpointProvider)
], ConversationHistorySummarizer);
class AgentPromptWithSummaryPrompt extends prompt_tsx_1.PromptElement {
    async render(state, sizing) {
        return vscpp(vscppf, null,
            vscpp(agentPrompt_1.AgentPrompt, { ...this.props }),
            vscpp(prompt_tsx_1.UserMessage, null, SummaryPrompt));
    }
}
function stripCacheBreakpoints(messages) {
    messages.forEach(message => {
        message.content = message.content.filter(part => {
            return part.type !== prompt_tsx_1.Raw.ChatCompletionContentPartKind.CacheBreakpoint;
        });
    });
}
/**
 * Exported for test
 */
let SummarizedConversationHistoryPropsBuilder = class SummarizedConversationHistoryPropsBuilder {
    constructor(_promptPathRepresentationService, _workspaceService) {
        this._promptPathRepresentationService = _promptPathRepresentationService;
        this._workspaceService = _workspaceService;
    }
    getProps(props) {
        let toolCallRounds = props.promptContext.toolCallRounds;
        let isContinuation = props.promptContext.isContinuation;
        let summarizedToolCallRoundId = '';
        if (toolCallRounds && toolCallRounds.length > 1) {
            // If there are multiple tool call rounds, exclude the last one, because it must have put us over the limit.
            // Summarize from the previous round in this turn.
            toolCallRounds = toolCallRounds.slice(0, -1);
            summarizedToolCallRoundId = toolCallRounds.at(-1).id;
        }
        else if (props.promptContext.history.length > 0) {
            // If there is only one tool call round, then summarize from the last round of the last turn.
            // Or if there are no tool call rounds, then the new user message put us over the limit. (or the last assistant message?)
            // This flag excludes the last user message from the summary.
            isContinuation = true;
            toolCallRounds = [];
            summarizedToolCallRoundId = props.promptContext.history.at(-1).rounds.at(-1).id;
        }
        else {
            throw new Error('Nothing to summarize');
        }
        const promptContext = {
            ...props.promptContext,
            toolCallRounds,
            isContinuation,
        };
        return {
            props: {
                ...props,
                workingNotebook: this.getWorkingNotebook(props),
                promptContext
            },
            summarizedToolCallRoundId
        };
    }
    getWorkingNotebook(props) {
        const toolCallRound = props.promptContext.toolCallRounds && [...props.promptContext.toolCallRounds].reverse().find(round => round.toolCalls.some(call => call.name === toolNames_1.ToolName.RunNotebookCell));
        const toolCall = toolCallRound?.toolCalls.find(call => call.name === toolNames_1.ToolName.RunNotebookCell);
        if (toolCall && toolCall.arguments) {
            try {
                const args = JSON.parse(toolCall.arguments);
                if (typeof args.filePath === 'string') {
                    const uri = this._promptPathRepresentationService.resolveFilePath(args.filePath);
                    if (!uri) {
                        return undefined;
                    }
                    return this._workspaceService.notebookDocuments.find(doc => doc.uri.toString() === uri.toString());
                }
            }
            catch (e) {
                // Ignore parsing errors
            }
        }
        return undefined;
    }
};
exports.SummarizedConversationHistoryPropsBuilder = SummarizedConversationHistoryPropsBuilder;
exports.SummarizedConversationHistoryPropsBuilder = SummarizedConversationHistoryPropsBuilder = __decorate([
    __param(0, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(1, workspaceService_1.IWorkspaceService)
], SummarizedConversationHistoryPropsBuilder);
class SummaryMessageElement extends prompt_tsx_1.PromptElement {
    async render(state, sizing) {
        return vscpp(prompt_tsx_1.UserMessage, null,
            vscpp(tag_1.Tag, { name: 'conversation-summary' }, this.props.summaryText),
            this.props.endpoint.family === 'gpt-4.1' && vscpp(tag_1.Tag, { name: 'reminderInstructions' },
                vscpp(agentPrompt_1.KeepGoingReminder, { modelFamily: this.props.endpoint.family })));
    }
}
//# sourceMappingURL=summarizedConversationHistory.js.map