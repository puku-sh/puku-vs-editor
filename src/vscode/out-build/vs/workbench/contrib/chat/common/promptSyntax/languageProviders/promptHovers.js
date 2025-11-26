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
                            return this.createHover(localize(6479, null), attribute.range);
                        case PromptHeaderAttributes.description:
                            return this.createHover(localize(6480, null), attribute.range);
                        case PromptHeaderAttributes.applyTo:
                            return this.createHover(localize(6481, null), attribute.range);
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
                            return this.createHover(localize(6482, null), attribute.range);
                        case PromptHeaderAttributes.description:
                            return this.createHover(localize(6483, null), attribute.range);
                        case PromptHeaderAttributes.argumentHint:
                            return this.createHover(localize(6484, null), attribute.range);
                        case PromptHeaderAttributes.model:
                            return this.getModelHover(attribute, attribute.range, localize(6485, null), isGitHubTarget);
                        case PromptHeaderAttributes.tools:
                            return this.getToolHover(attribute, position, localize(6486, null), header.target);
                        case PromptHeaderAttributes.handOffs:
                            return this.getHandsOffHover(attribute, position, isGitHubTarget);
                        case PromptHeaderAttributes.target:
                            return this.createHover(localize(6487, null), attribute.range);
                    }
                }
            }
        }
        else {
            for (const attribute of header.attributes) {
                if (attribute.range.containsPosition(position)) {
                    switch (attribute.key) {
                        case PromptHeaderAttributes.name:
                            return this.createHover(localize(6488, null), attribute.range);
                        case PromptHeaderAttributes.description:
                            return this.createHover(localize(6489, null), attribute.range);
                        case PromptHeaderAttributes.argumentHint:
                            return this.createHover(localize(6490, null), attribute.range);
                        case PromptHeaderAttributes.model:
                            return this.getModelHover(attribute, attribute.range, localize(6491, null), false);
                        case PromptHeaderAttributes.tools:
                            return this.getToolHover(attribute, position, localize(6492, null), Target.VSCode);
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
        lines.push(localize(6493, null, toolSet.referenceName));
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
            return this.createHover(baseMessage + '\n\n' + localize(6494, null), range);
        }
        if (node.value.type === 'string') {
            for (const id of this.languageModelsService.getLanguageModelIds()) {
                const meta = this.languageModelsService.lookupLanguageModel(id);
                if (meta && ILanguageModelChatMetadata.matchesQualifiedName(node.value.value, meta)) {
                    const lines = [];
                    lines.push(baseMessage + '\n');
                    lines.push(localize(6495, null, meta.name));
                    lines.push(localize(6496, null, meta.family));
                    lines.push(localize(6497, null, meta.vendor));
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
                const description = agent.description.get() || (isBuiltinChatMode(agent) ? localize(6498, null) : localize(6499, null));
                lines.push(`\`${agent.name.get()}\`: ${description}`);
            }
        }
        else {
            const agents = this.chatModeService.getModes();
            lines.push(localize(6500, null));
            lines.push('');
            // Built-in agents
            lines.push(localize(6501, null));
            for (const agent of agents.builtin) {
                lines.push(`- \`${agent.name.get()}\`: ${agent.description.get() || agent.label.get()}`);
            }
            // Custom agents
            if (agents.custom.length > 0) {
                lines.push('');
                lines.push(localize(6502, null));
                for (const agent of agents.custom) {
                    const description = agent.description.get();
                    lines.push(`- \`${agent.name.get()}\`: ${description || localize(6503, null)}`);
                }
            }
        }
        return this.createHover(lines.join('\n'), agentAttribute.range);
    }
    getHandsOffHover(attribute, position, isGitHubTarget) {
        const handoffsBaseMessage = localize(6504, null);
        if (isGitHubTarget) {
            return this.createHover(handoffsBaseMessage + '\n\n' + localize(6505, null), attribute.range);
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
//# sourceMappingURL=promptHovers.js.map