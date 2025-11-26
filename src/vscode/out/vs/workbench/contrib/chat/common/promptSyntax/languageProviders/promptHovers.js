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
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { localize } from '../../../../../../nls.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../../languageModels.js';
import { ILanguageModelToolsService, ToolSet } from '../../languageModelToolsService.js';
import { IChatModeService, isBuiltinChatMode } from '../../chatModes.js';
import { getPromptsTypeForLanguageId, PromptsType } from '../promptTypes.js';
import { IPromptsService } from '../service/promptsService.js';
import { PromptHeaderAttributes, Target } from '../promptFileParser.js';
import { isGithubTarget, knownGithubCopilotTools } from './promptValidator.js';
let PromptHoverProvider = class PromptHoverProvider {
    constructor(promptsService, languageModelToolsService, languageModelsService, chatModeService) {
        this.promptsService = promptsService;
        this.languageModelToolsService = languageModelToolsService;
        this.languageModelsService = languageModelsService;
        this.chatModeService = chatModeService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptHoverProvider';
    }
    createHover(contents, range) {
        return {
            contents: [new MarkdownString(contents)],
            range
        };
    }
    async provideHover(model, position, token, _context) {
        const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
        if (!promptType) {
            // if the model is not a prompt, we don't provide any hovers
            return undefined;
        }
        const promptAST = this.promptsService.getParsedPromptFile(model);
        if (promptAST.header?.range.containsPosition(position)) {
            return this.provideHeaderHover(position, promptType, promptAST.header);
        }
        if (promptAST.body?.range.containsPosition(position)) {
            return this.provideBodyHover(position, promptAST.body);
        }
        return undefined;
    }
    async provideBodyHover(position, body) {
        for (const ref of body.variableReferences) {
            if (ref.range.containsPosition(position)) {
                const toolName = ref.name;
                return this.getToolHoverByName(toolName, ref.range);
            }
        }
        return undefined;
    }
    async provideHeaderHover(position, promptType, header) {
        if (promptType === PromptsType.instructions) {
            for (const attribute of header.attributes) {
                if (attribute.range.containsPosition(position)) {
                    switch (attribute.key) {
                        case PromptHeaderAttributes.name:
                            return this.createHover(localize('promptHeader.instructions.name', 'The name of the instruction file as shown in the UI. If not set, the name is derived from the file name.'), attribute.range);
                        case PromptHeaderAttributes.description:
                            return this.createHover(localize('promptHeader.instructions.description', 'The description of the instruction file. It can be used to provide additional context or information about the instructions and is passed to the language model as part of the prompt.'), attribute.range);
                        case PromptHeaderAttributes.applyTo:
                            return this.createHover(localize('promptHeader.instructions.applyToRange', 'One or more glob pattern (separated by comma) that describe for which files the instructions apply to. Based on these patterns, the file is automatically included in the prompt, when the context contains a file that matches one or more of these patterns. Use `**` when you want this file to always be added.\nExample: `**/*.ts`, `**/*.js`, `client/**`'), attribute.range);
                    }
                }
            }
        }
        else if (promptType === PromptsType.agent) {
            const isGitHubTarget = isGithubTarget(promptType, header.target);
            for (const attribute of header.attributes) {
                if (attribute.range.containsPosition(position)) {
                    switch (attribute.key) {
                        case PromptHeaderAttributes.name:
                            return this.createHover(localize('promptHeader.agent.name', 'The name of the agent as shown in the UI.'), attribute.range);
                        case PromptHeaderAttributes.description:
                            return this.createHover(localize('promptHeader.agent.description', 'The description of the custom agent, what it does and when to use it.'), attribute.range);
                        case PromptHeaderAttributes.argumentHint:
                            return this.createHover(localize('promptHeader.agent.argumentHint', 'The argument-hint describes what inputs the custom agent expects or supports.'), attribute.range);
                        case PromptHeaderAttributes.model:
                            return this.getModelHover(attribute, attribute.range, localize('promptHeader.agent.model', 'Specify the model that runs this custom agent.'), isGitHubTarget);
                        case PromptHeaderAttributes.tools:
                            return this.getToolHover(attribute, position, localize('promptHeader.agent.tools', 'The set of tools that the custom agent has access to.'), header.target);
                        case PromptHeaderAttributes.handOffs:
                            return this.getHandsOffHover(attribute, position, isGitHubTarget);
                        case PromptHeaderAttributes.target:
                            return this.createHover(localize('promptHeader.agent.target', 'The target to which the header attributes like tools apply to. Possible values are `github-copilot` and `vscode`.'), attribute.range);
                    }
                }
            }
        }
        else {
            for (const attribute of header.attributes) {
                if (attribute.range.containsPosition(position)) {
                    switch (attribute.key) {
                        case PromptHeaderAttributes.name:
                            return this.createHover(localize('promptHeader.prompt.name', 'The name of the prompt. This is also the name of the slash command that will run this prompt.'), attribute.range);
                        case PromptHeaderAttributes.description:
                            return this.createHover(localize('promptHeader.prompt.description', 'The description of the reusable prompt, what it does and when to use it.'), attribute.range);
                        case PromptHeaderAttributes.argumentHint:
                            return this.createHover(localize('promptHeader.prompt.argumentHint', 'The argument-hint describes what inputs the prompt expects or supports.'), attribute.range);
                        case PromptHeaderAttributes.model:
                            return this.getModelHover(attribute, attribute.range, localize('promptHeader.prompt.model', 'The model to use in this prompt.'), false);
                        case PromptHeaderAttributes.tools:
                            return this.getToolHover(attribute, position, localize('promptHeader.prompt.tools', 'The tools to use in this prompt.'), Target.VSCode);
                        case PromptHeaderAttributes.agent:
                        case PromptHeaderAttributes.mode:
                            return this.getAgentHover(attribute, position);
                    }
                }
            }
        }
        return undefined;
    }
    getToolHover(node, position, baseMessage, target) {
        if (node.value.type === 'array') {
            for (const toolName of node.value.items) {
                if (toolName.type === 'string' && toolName.range.containsPosition(position)) {
                    let toolNameValue = toolName.value;
                    if (target === undefined) {
                        toolNameValue = this.languageModelToolsService.mapGithubToolName(toolNameValue);
                    }
                    if (target === Target.VSCode || target === undefined) {
                        const description = this.getToolHoverByName(toolNameValue, toolName.range);
                        if (description) {
                            return description;
                        }
                    }
                    if (target === Target.GitHubCopilot || target === undefined) {
                        const description = knownGithubCopilotTools[toolNameValue];
                        if (description) {
                            return this.createHover(description, toolName.range);
                        }
                    }
                }
            }
        }
        return this.createHover(baseMessage, node.range);
    }
    getToolHoverByName(toolName, range) {
        const tool = this.languageModelToolsService.getToolByQualifiedName(toolName);
        if (tool !== undefined) {
            if (tool instanceof ToolSet) {
                return this.getToolsetHover(tool, range);
            }
            else {
                return this.createHover(tool.userDescription ?? tool.modelDescription, range);
            }
        }
        return undefined;
    }
    getToolsetHover(toolSet, range) {
        const lines = [];
        lines.push(localize('toolSetName', 'ToolSet: {0}\n\n', toolSet.referenceName));
        if (toolSet.description) {
            lines.push(toolSet.description);
        }
        for (const tool of toolSet.getTools()) {
            lines.push(`- ${tool.toolReferenceName ?? tool.displayName}`);
        }
        return this.createHover(lines.join('\n'), range);
    }
    getModelHover(node, range, baseMessage, isGitHubTarget) {
        if (isGitHubTarget) {
            return this.createHover(baseMessage + '\n\n' + localize('promptHeader.agent.model.githubCopilot', 'Note: This attribute is not used when target is github-copilot.'), range);
        }
        if (node.value.type === 'string') {
            for (const id of this.languageModelsService.getLanguageModelIds()) {
                const meta = this.languageModelsService.lookupLanguageModel(id);
                if (meta && ILanguageModelChatMetadata.matchesQualifiedName(node.value.value, meta)) {
                    const lines = [];
                    lines.push(baseMessage + '\n');
                    lines.push(localize('modelName', '- Name: {0}', meta.name));
                    lines.push(localize('modelFamily', '- Family: {0}', meta.family));
                    lines.push(localize('modelVendor', '- Vendor: {0}', meta.vendor));
                    if (meta.tooltip) {
                        lines.push('', '', meta.tooltip);
                    }
                    return this.createHover(lines.join('\n'), range);
                }
            }
        }
        return this.createHover(baseMessage, range);
    }
    getAgentHover(agentAttribute, position) {
        const lines = [];
        const value = agentAttribute.value;
        if (value.type === 'string' && value.range.containsPosition(position)) {
            const agent = this.chatModeService.findModeByName(value.value);
            if (agent) {
                const description = agent.description.get() || (isBuiltinChatMode(agent) ? localize('promptHeader.prompt.agent.builtInDesc', 'Built-in agent') : localize('promptHeader.prompt.agent.customDesc', 'Custom agent'));
                lines.push(`\`${agent.name.get()}\`: ${description}`);
            }
        }
        else {
            const agents = this.chatModeService.getModes();
            lines.push(localize('promptHeader.prompt.agent.description', 'The agent to use when running this prompt.'));
            lines.push('');
            // Built-in agents
            lines.push(localize('promptHeader.prompt.agent.builtin', '**Built-in agents:**'));
            for (const agent of agents.builtin) {
                lines.push(`- \`${agent.name.get()}\`: ${agent.description.get() || agent.label.get()}`);
            }
            // Custom agents
            if (agents.custom.length > 0) {
                lines.push('');
                lines.push(localize('promptHeader.prompt.agent.custom', '**Custom agents:**'));
                for (const agent of agents.custom) {
                    const description = agent.description.get();
                    lines.push(`- \`${agent.name.get()}\`: ${description || localize('promptHeader.prompt.agent.customDesc', 'Custom agent')}`);
                }
            }
        }
        return this.createHover(lines.join('\n'), agentAttribute.range);
    }
    getHandsOffHover(attribute, position, isGitHubTarget) {
        const handoffsBaseMessage = localize('promptHeader.agent.handoffs', 'Possible handoff actions when the agent has completed its task.');
        if (isGitHubTarget) {
            return this.createHover(handoffsBaseMessage + '\n\n' + localize('promptHeader.agent.handoffs.githubCopilot', 'Note: This attribute is not used when target is github-copilot.'), attribute.range);
        }
        return this.createHover(handoffsBaseMessage, attribute.range);
    }
};
PromptHoverProvider = __decorate([
    __param(0, IPromptsService),
    __param(1, ILanguageModelToolsService),
    __param(2, ILanguageModelsService),
    __param(3, IChatModeService)
], PromptHoverProvider);
export { PromptHoverProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SG92ZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlUHJvdmlkZXJzL3Byb21wdEhvdmVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFLOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzdGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN6RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBOEMsc0JBQXNCLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDcEgsT0FBTyxFQUFFLGNBQWMsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRXhFLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1CO0lBTS9CLFlBQ2tCLGNBQWdELEVBQ3JDLHlCQUFzRSxFQUMxRSxxQkFBOEQsRUFDcEUsZUFBa0Q7UUFIbEMsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ3BCLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBNEI7UUFDekQsMEJBQXFCLEdBQXJC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