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
import { Position } from '../../../../../../editor/common/core/position.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../../languageModels.js';
import { ILanguageModelToolsService } from '../../languageModelToolsService.js';
import { IChatModeService } from '../../chatModes.js';
import { getPromptsTypeForLanguageId, PromptsType } from '../promptTypes.js';
import { IPromptsService } from '../service/promptsService.js';
import { Iterable } from '../../../../../../base/common/iterator.js';
import { PromptHeaderAttributes } from '../promptFileParser.js';
import { getValidAttributeNames, isGithubTarget, knownGithubCopilotTools } from './promptValidator.js';
import { localize } from '../../../../../../nls.js';
let PromptHeaderAutocompletion = class PromptHeaderAutocompletion {
    constructor(promptsService, languageModelsService, languageModelToolsService, chatModeService) {
        this.promptsService = promptsService;
        this.languageModelsService = languageModelsService;
        this.languageModelToolsService = languageModelToolsService;
        this.chatModeService = chatModeService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptHeaderAutocompletion';
        /**
         * List of trigger characters handled by this provider.
         */
        this.triggerCharacters = [':'];
    }
    /**
     * The main function of this provider that calculates
     * completion items based on the provided arguments.
     */
    async provideCompletionItems(model, position, context, token) {
        const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
        if (!promptType) {
            // if the model is not a prompt, we don't provide any completions
            return undefined;
        }
        const parsedAST = this.promptsService.getParsedPromptFile(model);
        const header = parsedAST.header;
        if (!header) {
            return undefined;
        }
        const headerRange = parsedAST.header.range;
        if (position.lineNumber < headerRange.startLineNumber || position.lineNumber >= headerRange.endLineNumber) {
            // if the position is not inside the header, we don't provide any completions
            return undefined;
        }
        const lineText = model.getLineContent(position.lineNumber);
        const colonIndex = lineText.indexOf(':');
        const colonPosition = colonIndex !== -1 ? new Position(position.lineNumber, colonIndex + 1) : undefined;
        if (!colonPosition || position.isBeforeOrEqual(colonPosition)) {
            return this.provideAttributeNameCompletions(model, position, header, colonPosition, promptType);
        }
        else if (colonPosition && colonPosition.isBefore(position)) {
            return this.provideValueCompletions(model, position, header, colonPosition, promptType);
        }
        return undefined;
    }
    async provideAttributeNameCompletions(model, position, header, colonPosition, promptType) {
        const suggestions = [];
        const isGitHubTarget = isGithubTarget(promptType, header.target);
        const attributesToPropose = new Set(getValidAttributeNames(promptType, false, isGitHubTarget));
        for (const attr of header.attributes) {
            attributesToPropose.delete(attr.key);
        }
        const getInsertText = (key) => {
            if (colonPosition) {
                return key;
            }
            const valueSuggestions = this.getValueSuggestions(promptType, key);
            if (valueSuggestions.length > 0) {
                return `${key}: \${0:${valueSuggestions[0]}}`;
            }
            else {
                return `${key}: \$0`;
            }
        };
        for (const attribute of attributesToPropose) {
            const item = {
                label: attribute,
                kind: 9 /* CompletionItemKind.Property */,
                insertText: getInsertText(attribute),
                insertTextRules: 4 /* CompletionItemInsertTextRule.InsertAsSnippet */,
                range: new Range(position.lineNumber, 1, position.lineNumber, !colonPosition ? model.getLineMaxColumn(position.lineNumber) : colonPosition.column),
            };
            suggestions.push(item);
        }
        return { suggestions };
    }
    async provideValueCompletions(model, position, header, colonPosition, promptType) {
        const suggestions = [];
        const lineContent = model.getLineContent(position.lineNumber);
        const attribute = lineContent.substring(0, colonPosition.column - 1).trim();
        const isGitHubTarget = isGithubTarget(promptType, header.target);
        if (!getValidAttributeNames(promptType, true, isGitHubTarget).includes(attribute)) {
            return undefined;
        }
        if (promptType === PromptsType.prompt || promptType === PromptsType.agent) {
            // if the position is inside the tools metadata, we provide tool name completions
            const result = this.provideToolCompletions(model, position, header, isGitHubTarget);
            if (result) {
                return result;
            }
        }
        const bracketIndex = lineContent.indexOf('[');
        if (bracketIndex !== -1 && bracketIndex <= position.column - 1) {
            // if the value is already inside a bracket, we don't provide value completions
            return undefined;
        }
        const whilespaceAfterColon = (lineContent.substring(colonPosition.column).match(/^\s*/)?.[0].length) ?? 0;
        const values = this.getValueSuggestions(promptType, attribute);
        for (const value of values) {
            const item = {
                label: value,
                kind: 13 /* CompletionItemKind.Value */,
                insertText: whilespaceAfterColon === 0 ? ` ${value}` : value,
                range: new Range(position.lineNumber, colonPosition.column + whilespaceAfterColon + 1, position.lineNumber, model.getLineMaxColumn(position.lineNumber)),
            };
            suggestions.push(item);
        }
        if (attribute === PromptHeaderAttributes.handOffs && (promptType === PromptsType.agent)) {
            const value = [
                '',
                '  - label: Start Implementation',
                '    agent: agent',
                '    prompt: Implement the plan',
                '    send: true'
            ].join('\n');
            const item = {
                label: localize('promptHeaderAutocompletion.handoffsExample', "Handoff Example"),
                kind: 13 /* CompletionItemKind.Value */,
                insertText: whilespaceAfterColon === 0 ? ` ${value}` : value,
                range: new Range(position.lineNumber, colonPosition.column + whilespaceAfterColon + 1, position.lineNumber, model.getLineMaxColumn(position.lineNumber)),
            };
            suggestions.push(item);
        }
        return { suggestions };
    }
    getValueSuggestions(promptType, attribute) {
        switch (attribute) {
            case PromptHeaderAttributes.applyTo:
                if (promptType === PromptsType.instructions) {
                    return [`'**'`, `'**/*.ts, **/*.js'`, `'**/*.php'`, `'**/*.py'`];
                }
                break;
            case PromptHeaderAttributes.agent:
            case PromptHeaderAttributes.mode:
                if (promptType === PromptsType.prompt) {
                    // Get all available agents (builtin + custom)
                    const agents = this.chatModeService.getModes();
                    const suggestions = [];
                    for (const agent of Iterable.concat(agents.builtin, agents.custom)) {
                        suggestions.push(agent.name.get());
                    }
                    return suggestions;
                }
            case PromptHeaderAttributes.target:
                if (promptType === PromptsType.agent) {
                    return ['vscode', 'github-copilot'];
                }
                break;
            case PromptHeaderAttributes.tools:
                if (promptType === PromptsType.prompt || promptType === PromptsType.agent) {
                    return ['[]', `['search', 'edit', 'fetch']`];
                }
                break;
            case PromptHeaderAttributes.model:
                if (promptType === PromptsType.prompt || promptType === PromptsType.agent) {
                    return this.getModelNames(promptType === PromptsType.agent);
                }
        }
        return [];
    }
    getModelNames(agentModeOnly) {
        const result = [];
        for (const model of this.languageModelsService.getLanguageModelIds()) {
            const metadata = this.languageModelsService.lookupLanguageModel(model);
            if (metadata && metadata.isUserSelectable !== false) {
                if (!agentModeOnly || ILanguageModelChatMetadata.suitableForAgentMode(metadata)) {
                    result.push(ILanguageModelChatMetadata.asQualifiedName(metadata));
                }
            }
        }
        return result;
    }
    provideToolCompletions(model, position, header, isGitHubTarget) {
        const toolsAttr = header.getAttribute(PromptHeaderAttributes.tools);
        if (!toolsAttr || toolsAttr.value.type !== 'array' || !toolsAttr.range.containsPosition(position)) {
            return undefined;
        }
        const getSuggestions = (toolRange) => {
            const suggestions = [];
            const toolNames = isGitHubTarget ? Object.keys(knownGithubCopilotTools) : this.languageModelToolsService.getQualifiedToolNames();
            for (const toolName of toolNames) {
                let insertText;
                if (!toolRange.isEmpty()) {
                    const firstChar = model.getValueInRange(toolRange).charCodeAt(0);
                    insertText = firstChar === 39 /* CharCode.SingleQuote */ ? `'${toolName}'` : firstChar === 34 /* CharCode.DoubleQuote */ ? `"${toolName}"` : toolName;
                }
                else {
                    insertText = `'${toolName}'`;
                }
                suggestions.push({
                    label: toolName,
                    kind: 13 /* CompletionItemKind.Value */,
                    filterText: insertText,
                    insertText: insertText,
                    range: toolRange,
                });
            }
            return { suggestions };
        };
        for (const toolNameNode of toolsAttr.value.items) {
            if (toolNameNode.range.containsPosition(position)) {
                // if the position is inside a tool range, we provide tool name completions
                return getSuggestions(toolNameNode.range);
            }
        }
        const prefix = model.getValueInRange(new Range(position.lineNumber, 1, position.lineNumber, position.column));
        if (prefix.match(/[,[]\s*$/)) {
            // if the position is after a comma or bracket
            return getSuggestions(new Range(position.lineNumber, position.column, position.lineNumber, position.column));
        }
        return undefined;
    }
};
PromptHeaderAutocompletion = __decorate([
    __param(0, IPromptsService),
    __param(1, ILanguageModelsService),
    __param(2, ILanguageModelToolsService),
    __param(3, IChatModeService)
], PromptHeaderAutocompletion);
export { PromptHeaderAutocompletion };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SGVhZGVyQXV0b2NvbXBsZXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvbGFuZ3VhZ2VQcm92aWRlcnMvcHJvbXB0SGVhZGVyQXV0b2NvbXBsZXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUd0RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM3RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNyRSxPQUFPLEVBQWdCLHNCQUFzQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDOUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGNBQWMsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUU3QyxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEwQjtJQVd0QyxZQUNrQixjQUFnRCxFQUN6QyxxQkFBOEQsRUFDMUQseUJB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