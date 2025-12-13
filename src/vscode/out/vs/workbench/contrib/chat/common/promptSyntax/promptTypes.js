/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Documentation link for the reusable prompts feature.
 */
export const PROMPT_DOCUMENTATION_URL = 'https://aka.ms/vscode-ghcp-prompt-snippets';
export const INSTRUCTIONS_DOCUMENTATION_URL = 'https://aka.ms/vscode-ghcp-custom-instructions';
export const AGENT_DOCUMENTATION_URL = 'https://aka.ms/vscode-ghcp-custom-chat-modes'; // todo
/**
 * Language ID for the reusable prompt syntax.
 */
export const PROMPT_LANGUAGE_ID = 'prompt';
/**
 * Language ID for instructions syntax.
 */
export const INSTRUCTIONS_LANGUAGE_ID = 'instructions';
/**
 * Language ID for agent syntax.
 */
export const AGENT_LANGUAGE_ID = 'chatagent';
/**
 * Prompt and instructions files language selector.
 */
export const ALL_PROMPTS_LANGUAGE_SELECTOR = [PROMPT_LANGUAGE_ID, INSTRUCTIONS_LANGUAGE_ID, AGENT_LANGUAGE_ID];
/**
 * The language id for for a prompts type.
 */
export function getLanguageIdForPromptsType(type) {
    switch (type) {
        case PromptsType.prompt:
            return PROMPT_LANGUAGE_ID;
        case PromptsType.instructions:
            return INSTRUCTIONS_LANGUAGE_ID;
        case PromptsType.agent:
            return AGENT_LANGUAGE_ID;
        default:
            throw new Error(`Unknown prompt type: ${type}`);
    }
}
export function getPromptsTypeForLanguageId(languageId) {
    switch (languageId) {
        case PROMPT_LANGUAGE_ID:
            return PromptsType.prompt;
        case INSTRUCTIONS_LANGUAGE_ID:
            return PromptsType.instructions;
        case AGENT_LANGUAGE_ID:
            return PromptsType.agent;
        default:
            return undefined;
    }
}
/**
 * What the prompt is used for.
 */
export var PromptsType;
(function (PromptsType) {
    PromptsType["instructions"] = "instructions";
    PromptsType["prompt"] = "prompt";
    PromptsType["agent"] = "agent";
})(PromptsType || (PromptsType = {}));
export function isValidPromptType(type) {
    return Object.values(PromptsType).includes(type);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcHJvbXB0VHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEc7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyw0Q0FBNEMsQ0FBQztBQUNyRixNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxnREFBZ0QsQ0FBQztBQUMvRixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyw4Q0FBOEMsQ0FBQyxDQUFDLE9BQU87QUFFOUY7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUM7QUFFM0M7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxjQUFjLENBQUM7QUFFdkQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUM7QUFFN0M7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBcUIsQ0FBQyxrQkFBa0IsRUFBRSx3QkFBd0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0FBRWpJOztHQUVHO0FBQ0gsTUFBTSxVQUFVLDJCQUEyQixDQUFDLElBQWlCO0lBQzVELFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDZCxLQUFLLFdBQVcsQ0FBQyxNQUFNO1lBQ3RCLE9BQU8sa0JBQWtCLENBQUM7UUFDM0IsS0FBSyxXQUFXLENBQUMsWUFBWTtZQUM1QixPQUFPLHdCQUF3QixDQUFDO1FBQ2pDLEtBQUssV0FBVyxDQUFDLEtBQUs7WUFDckIsT0FBTyxpQkFBaUIsQ0FBQztRQUMxQjtZQUNDLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLElBQUksRUFBRSxDQUFDLENBQUM7SUFDbEQsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsMkJBQTJCLENBQUMsVUFBa0I7SUFDN0QsUUFBUSxVQUFVLEVBQUUsQ0FBQztRQUNwQixLQUFLLGtCQUFrQjtZQUN0QixPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUM7UUFDM0IsS0FBSyx3QkFBd0I7WUFDNUIsT0FBTyxXQUFXLENBQUMsWUFBWSxDQUFDO1FBQ2pDLEtBQUssaUJBQWlCO1lBQ3JCLE9BQU8sV0FBVyxDQUFDLEtBQUssQ0FBQztRQUMxQjtZQUNDLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7QUFDRixDQUFDO0FBR0Q7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxXQUlYO0FBSkQsV0FBWSxXQUFXO0lBQ3RCLDRDQUE2QixDQUFBO0lBQzdCLGdDQUFpQixDQUFBO0lBQ2pCLDhCQUFlLENBQUE7QUFDaEIsQ0FBQyxFQUpXLFdBQVcsS0FBWCxXQUFXLFFBSXRCO0FBQ0QsTUFBTSxVQUFVLGlCQUFpQixDQUFDLElBQVk7SUFDN0MsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFtQixDQUFDLENBQUM7QUFDakUsQ0FBQyJ9