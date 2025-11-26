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
            displayName: localize('tool.runSubagent.displayName', 'Run Subagent'),
            userDescription: localize('tool.runSubagent.userDescription', 'Run a task within an isolated subagent context to enable efficient organization of tasks and context window management.'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuU3ViYWdlbnRUb29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vdG9vbHMvcnVuU3ViYWdlbnRUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUV4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNuRCxPQUFPLEVBQWlCLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNyRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUMxRixPQUFPLEVBRU4sMEJBQTBCLEVBTzFCLGNBQWMsRUFFZCxPQUFPLEVBQ1AsbUJBQW1CLEVBQ25CLE1BQU0saUNBQWlDLENBQUM7QUFDekMsT0FBTyxF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