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
import { Codicon } from '../../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IChatAgentService } from '../chatAgents.js';
import { IChatModeService } from '../chatModes.js';
import { IChatService } from '../chatService.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../constants.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../languageModels.js';
import { ILanguageModelToolsService, ToolDataSource, ToolSet, VSCodeToolReference } from '../languageModelToolsService.js';
import { ManageTodoListToolToolId } from './manageTodoListTool.js';
import { createToolSimpleTextResult } from './toolHelpers.js';
export const RunSubagentToolId = 'runSubagent';
const BaseModelDescription = `Launch a new agent to handle complex, multi-step tasks autonomously. This tool is good at researching complex questions, searching for code, and executing multi-step tasks. When you are searching for a keyword or file and are not confident that you will find the right match in the first few tries, use this agent to perform the search for you.

- Agents do not run async or in the background, you will wait for the agent\'s result.
- When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result.
- Each agent invocation is stateless. You will not be able to send additional messages to the agent, nor will the agent be able to communicate with you outside of its final report. Therefore, your prompt should contain a highly detailed task description for the agent to perform autonomously and you should specify exactly what information the agent should return back to you in its final and only message to you.
- The agent's outputs should generally be trusted
- Clearly tell the agent whether you expect it to write code or just to do research (search, file reads, web fetches, etc.), since it is not aware of the user\'s intent`;
let RunSubagentTool = class RunSubagentTool extends Disposable {
    constructor(chatAgentService, chatService, chatModeService, languageModelToolsService, languageModelsService, logService, toolsService, configurationService) {
        super();
        this.chatAgentService = chatAgentService;
        this.chatService = chatService;
        this.chatModeService = chatModeService;
        this.languageModelToolsService = languageModelToolsService;
        this.languageModelsService = languageModelsService;
        this.logService = logService;
        this.toolsService = toolsService;
        this.configurationService = configurationService;
    }
    getToolData() {
        const runSubagentToolData = {
            id: RunSubagentToolId,
            toolReferenceName: VSCodeToolReference.runSubagent,
            legacyToolReferenceFullNames: ['runSubagent'],
            icon: ThemeIcon.fromId(Codicon.organization.id),
            displayName: localize(6602, null),
            userDescription: localize(6603, null),
            modelDescription: BaseModelDescription,
            source: ToolDataSource.Internal,
            inputSchema: {
                type: 'object',
                properties: {
                    prompt: {
                        type: 'string',
                        description: 'A detailed description of the task for the agent to perform'
                    },
                    description: {
                        type: 'string',
                        description: 'A short (3-5 word) description of the task'
                    }
                },
                required: ['prompt', 'description']
            }
        };
        if (this.configurationService.getValue(ChatConfiguration.SubagentToolCustomAgents)) {
            runSubagentToolData.inputSchema.properties['subagentType'] = {
                type: 'string',
                description: 'Optional ID of a specific agent to invoke. If not provided, uses the current agent.'
            };
            runSubagentToolData.modelDescription += `\n- If the user asks for a certain agent by name, you MUST provide that EXACT subagentType (case-sensitive) to invoke that specific agent.`;
        }
        return runSubagentToolData;
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const args = invocation.parameters;
        this.logService.debug(`RunSubagentTool: Invoking with prompt: ${args.prompt.substring(0, 100)}...`);
        if (!invocation.context) {
            throw new Error('toolInvocationToken is required for this tool');
        }
        // Get the chat model and request for writing progress
        const model = this.chatService.getSession(invocation.context.sessionResource);
        if (!model) {
            throw new Error('Chat model not found for session');
        }
        const request = model.getRequests().at(-1);
        try {
            // Get the default agent
            const defaultAgent = this.chatAgentService.getDefaultAgent(ChatAgentLocation.Chat, ChatModeKind.Agent);
            if (!defaultAgent) {
                return createToolSimpleTextResult('Error: No default agent available');
            }
            // Resolve mode-specific configuration if subagentId is provided
            let modeModelId = invocation.modelId;
            let modeTools = invocation.userSelectedTools;
            let modeInstructions;
            if (args.subagentType) {
                const mode = this.chatModeService.findModeByName(args.subagentType);
                if (mode) {
                    // Use mode-specific model if available
                    const modeModelQualifiedName = mode.model?.get();
                    if (modeModelQualifiedName) {
                        // Find the actual model identifier from the qualified name
                        const modelIds = this.languageModelsService.getLanguageModelIds();
                        for (const modelId of modelIds) {
                            const metadata = this.languageModelsService.lookupLanguageModel(modelId);
                            if (metadata && ILanguageModelChatMetadata.matchesQualifiedName(modeModelQualifiedName, metadata)) {
                                modeModelId = modelId;
                                break;
                            }
                        }
                    }
                    // Use mode-specific tools if available
                    const modeCustomTools = mode.customTools?.get();
                    if (modeCustomTools) {
                        // Convert the mode's custom tools (array of qualified names) to UserSelectedTools format
                        const enablementMap = this.languageModelToolsService.toToolAndToolSetEnablementMap(modeCustomTools, mode.target?.get());
                        // Convert enablement map to UserSelectedTools (Record<string, boolean>)
                        modeTools = {};
                        for (const [tool, enabled] of enablementMap) {
                            if (!(tool instanceof ToolSet)) {
                                modeTools[tool.id] = enabled;
                            }
                        }
                    }
                    const instructions = mode.modeInstructions?.get();
                    modeInstructions = instructions && {
                        name: mode.name.get(),
                        content: instructions.content,
                        toolReferences: this.toolsService.toToolReferences(instructions.toolReferences),
                        metadata: instructions.metadata,
                    };
                }
                else {
                    this.logService.warn(`RunSubagentTool: Agent '${args.subagentType}' not found, using current configuration`);
                }
            }
            // Track whether we should collect markdown (after the last prepare tool invocation)
            const markdownParts = [];
            let inEdit = false;
            const progressCallback = (parts) => {
                for (const part of parts) {
                    // Write certain parts immediately to the model
                    if (part.kind === 'prepareToolInvocation' || part.kind === 'textEdit' || part.kind === 'notebookEdit' || part.kind === 'codeblockUri') {
                        if (part.kind === 'codeblockUri' && !inEdit) {
                            inEdit = true;
                            model.acceptResponseProgress(request, { kind: 'markdownContent', content: new MarkdownString('```\n'), fromSubagent: true });
                        }
                        model.acceptResponseProgress(request, part);
                        // When we see a prepare tool invocation, reset markdown collection
                        if (part.kind === 'prepareToolInvocation') {
                            markdownParts.length = 0; // Clear previously collected markdown
                        }
                    }
                    else if (part.kind === 'markdownContent') {
                        if (inEdit) {
                            model.acceptResponseProgress(request, { kind: 'markdownContent', content: new MarkdownString('\n```\n\n'), fromSubagent: true });
                            inEdit = false;
                        }
                        // Collect markdown content for the tool result
                        markdownParts.push(part.content.value);
                    }
                }
            };
            if (modeTools) {
                modeTools[RunSubagentToolId] = false;
                modeTools[ManageTodoListToolToolId] = false;
            }
            // Build the agent request
            const agentRequest = {
                sessionId: invocation.context.sessionId,
                sessionResource: invocation.context.sessionResource,
                requestId: invocation.callId ?? `subagent-${Date.now()}`,
                agentId: defaultAgent.id,
                message: args.prompt,
                variables: { variables: [] },
                location: ChatAgentLocation.Chat,
                isSubagent: true,
                userSelectedModelId: modeModelId,
                userSelectedTools: modeTools,
                modeInstructions,
            };
            // Invoke the agent
            const result = await this.chatAgentService.invokeAgent(defaultAgent.id, agentRequest, progressCallback, [], token);
            // Check for errors
            if (result.errorDetails) {
                return createToolSimpleTextResult(`Agent error: ${result.errorDetails.message}`);
            }
            return createToolSimpleTextResult(markdownParts.join('') || 'Agent completed with no output');
        }
        catch (error) {
            const errorMessage = `Error invoking subagent: ${error instanceof Error ? error.message : 'Unknown error'}`;
            this.logService.error(errorMessage, error);
            return createToolSimpleTextResult(errorMessage);
        }
    }
    async prepareToolInvocation(context, _token) {
        const args = context.parameters;
        return {
            invocationMessage: args.description,
        };
    }
};
RunSubagentTool = __decorate([
    __param(0, IChatAgentService),
    __param(1, IChatService),
    __param(2, IChatModeService),
    __param(3, ILanguageModelToolsService),
    __param(4, ILanguageModelsService),
    __param(5, ILogService),
    __param(6, ILanguageModelToolsService),
    __param(7, IConfigurationService)
], RunSubagentTool);
export { RunSubagentTool };
//# sourceMappingURL=runSubagentTool.js.map