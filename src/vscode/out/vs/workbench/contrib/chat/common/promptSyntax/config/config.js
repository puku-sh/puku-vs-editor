/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptsType } from '../promptTypes.js';
import { getPromptFileDefaultLocation } from './promptFileLocations.js';
/**
 * Configuration helper for the `reusable prompts` feature.
 * @see {@link PromptsConfig.PROMPT_LOCATIONS_KEY}, {@link PromptsConfig.INSTRUCTIONS_LOCATION_KEY}, {@link PromptsConfig.MODE_LOCATION_KEY}, or {@link PromptsConfig.PROMPT_FILES_SUGGEST_KEY}.
 *
 * ### Functions
 *
 * - {@link getLocationsValue} allows to current read configuration value
 * - {@link promptSourceFolders} gets list of source folders for prompt files
 * - {@link getPromptFilesRecommendationsValue} gets prompt file recommendation configuration
 *
 * ### File Paths Resolution
 *
 * We resolve only `*.prompt.md` files inside the resulting source folders. Relative paths are resolved
 * relative to:
 *
 * - the current workspace `root`, if applicable, in other words one of the workspace folders
 *   can be used as a prompt files source folder
 * - root of each top-level folder in the workspace (if there are multiple workspace folders)
 * - current root folder (if a single folder is open)
 *
 * ### Prompt File Suggestions
 *
 * The `chat.promptFilesRecommendations` setting allows configuring which prompt files to suggest in different contexts:
 *
 * ```json
 * {
 *   "chat.promptFilesRecommendations": {
 *     "plan": true,                            // Always suggest
 *     "new-page": "resourceExtname == .js",    // Suggest for JavaScript files
 *     "draft-blog": "resourceLangId == markdown", // Suggest for Markdown files
 *     "debug": false                           // Never suggest
 *   }
 * }
 * ```
 */
export var PromptsConfig;
(function (PromptsConfig) {
    /**
     * Configuration key for the locations of reusable prompt files.
     */
    PromptsConfig.PROMPT_LOCATIONS_KEY = 'chat.promptFilesLocations';
    /**
     * Configuration key for the locations of instructions files.
     */
    PromptsConfig.INSTRUCTIONS_LOCATION_KEY = 'chat.instructionsFilesLocations';
    /**
     * Configuration key for the locations of mode files.
     */
    PromptsConfig.MODE_LOCATION_KEY = 'chat.modeFilesLocations';
    /**
     * Configuration key for prompt file suggestions.
     */
    PromptsConfig.PROMPT_FILES_SUGGEST_KEY = 'chat.promptFilesRecommendations';
    /**
     * Configuration key for use of the copilot instructions file.
     */
    PromptsConfig.USE_COPILOT_INSTRUCTION_FILES = 'github.copilot.chat.codeGeneration.useInstructionFiles';
    /**
     * Configuration key for the AGENTS.md.
     */
    PromptsConfig.USE_AGENT_MD = 'chat.useAgentsMdFile';
    /**
     * Configuration key for nested AGENTS.md files.
     */
    PromptsConfig.USE_NESTED_AGENT_MD = 'chat.useNestedAgentsMdFiles';
    /**
     * Configuration key for claude skills usage.
     */
    PromptsConfig.USE_CLAUDE_SKILLS = 'chat.useClaudeSkills';
    /**
     * Get value of the `reusable prompt locations` configuration setting.
     * @see {@link PROMPT_LOCATIONS_CONFIG_KEY}, {@link INSTRUCTIONS_LOCATIONS_CONFIG_KEY}, {@link MODE_LOCATIONS_CONFIG_KEY}.
     */
    function getLocationsValue(configService, type) {
        const key = getPromptFileLocationsConfigKey(type);
        const configValue = configService.getValue(key);
        if (configValue === undefined || configValue === null || Array.isArray(configValue)) {
            return undefined;
        }
        // note! this would be also true for `null` and `array`,
        // 		 but those cases are already handled above
        if (typeof configValue === 'object') {
            const paths = {};
            for (const [path, value] of Object.entries(configValue)) {
                const cleanPath = path.trim();
                const booleanValue = asBoolean(value);
                // if value can be mapped to a boolean, and the clean
                // path is not empty, add it to the map
                if ((booleanValue !== undefined) && cleanPath) {
                    paths[cleanPath] = booleanValue;
                }
            }
            return paths;
        }
        return undefined;
    }
    PromptsConfig.getLocationsValue = getLocationsValue;
    /**
     * Gets list of source folders for prompt files.
     * Defaults to {@link PROMPT_DEFAULT_SOURCE_FOLDER}, {@link INSTRUCTIONS_DEFAULT_SOURCE_FOLDER} or {@link MODE_DEFAULT_SOURCE_FOLDER}.
     */
    function promptSourceFolders(configService, type) {
        const value = getLocationsValue(configService, type);
        const defaultSourceFolder = getPromptFileDefaultLocation(type);
        // note! the `value &&` part handles the `undefined`, `null`, and `false` cases
        if (value && (typeof value === 'object')) {
            const paths = [];
            // if the default source folder is not explicitly disabled, add it
            if (value[defaultSourceFolder] !== false) {
                paths.push(defaultSourceFolder);
            }
            // copy all the enabled paths to the result list
            for (const [path, enabledValue] of Object.entries(value)) {
                // we already added the default source folder, so skip it
                if ((enabledValue === false) || (path === defaultSourceFolder)) {
                    continue;
                }
                paths.push(path);
            }
            return paths;
        }
        // `undefined`, `null`, and `false` cases
        return [];
    }
    PromptsConfig.promptSourceFolders = promptSourceFolders;
    /**
     * Get value of the prompt file recommendations configuration setting.
     * @param configService Configuration service instance
     * @param resource Optional resource URI to get workspace folder-specific settings
     * @see {@link PROMPT_FILES_SUGGEST_KEY}.
     */
    function getPromptFilesRecommendationsValue(configService, resource) {
        // Get the merged configuration value (VS Code automatically merges all levels: default → user → workspace → folder)
        const configValue = configService.getValue(PromptsConfig.PROMPT_FILES_SUGGEST_KEY, { resource });
        if (!configValue || typeof configValue !== 'object' || Array.isArray(configValue)) {
            return undefined;
        }
        const suggestions = {};
        for (const [promptName, value] of Object.entries(configValue)) {
            const cleanPromptName = promptName.trim();
            // Skip empty prompt names
            if (!cleanPromptName) {
                continue;
            }
            // Accept boolean values directly
            if (typeof value === 'boolean') {
                suggestions[cleanPromptName] = value;
                continue;
            }
            // Accept string values as when clauses
            if (typeof value === 'string') {
                const cleanValue = value.trim();
                if (cleanValue) {
                    suggestions[cleanPromptName] = cleanValue;
                }
                continue;
            }
            // Convert other truthy/falsy values to boolean
            const booleanValue = asBoolean(value);
            if (booleanValue !== undefined) {
                suggestions[cleanPromptName] = booleanValue;
            }
        }
        // Return undefined if no valid suggestions were found
        return Object.keys(suggestions).length > 0 ? suggestions : undefined;
    }
    PromptsConfig.getPromptFilesRecommendationsValue = getPromptFilesRecommendationsValue;
})(PromptsConfig || (PromptsConfig = {}));
export function getPromptFileLocationsConfigKey(type) {
    switch (type) {
        case PromptsType.instructions:
            return PromptsConfig.INSTRUCTIONS_LOCATION_KEY;
        case PromptsType.prompt:
            return PromptsConfig.PROMPT_LOCATIONS_KEY;
        case PromptsType.agent:
            return PromptsConfig.MODE_LOCATION_KEY;
        default:
            throw new Error('Unknown prompt type');
    }
}
/**
 * Helper to parse an input value of `any` type into a boolean.
 *
 * @param value - input value to parse
 * @returns `true` if the value is the boolean `true` value or a string that can
 * 			be clearly mapped to a boolean (e.g., `"true"`, `"TRUE"`, `"FaLSe"`, etc.),
 * 			`undefined` for rest of the values
 */
export function asBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const cleanValue = value.trim().toLowerCase();
        if (cleanValue === 'true') {
            return true;
        }
        if (cleanValue === 'false') {
            return false;
        }
        return undefined;
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvbmZpZy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBb0UsNEJBQTRCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUUxSTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtDRztBQUNILE1BQU0sS0FBVyxhQUFhLENBOEo3QjtBQTlKRCxXQUFpQixhQUFhO0lBQzdCOztPQUVHO0lBQ1Usa0NBQW9CLEdBQUcsMkJBQTJCLENBQUM7SUFFaEU7O09BRUc7SUFDVSx1Q0FBeUIsR0FBRyxpQ0FBaUMsQ0FBQztJQUMzRTs7T0FFRztJQUNVLCtCQUFpQixHQUFHLHlCQUF5QixDQUFDO0lBRTNEOztPQUVHO0lBQ1Usc0NBQXdCLEdBQUcsaUNBQWlDLENBQUM7SUFFMUU7O09BRUc7SUFDVSwyQ0FBNkIsR0FBRyx3REFBd0QsQ0FBQztJQUV0Rzs7T0FFRztJQUNVLDBCQUFZLEdBQUcsc0JBQXNCLENBQUM7SUFFbkQ7O09BRUc7SUFDVSxpQ0FBbUIsR0FBRyw2QkFBNkIsQ0FBQztJQUVqRTs7T0FFRztJQUNVLCtCQUFpQixHQUFHLHNCQUFzQixDQUFDO0lBRXhEOzs7T0FHRztJQUNILFNBQWdCLGlCQUFpQixDQUFDLGFBQW9DLEVBQUUsSUFBaUI7UUFDeEYsTUFBTSxHQUFHLEdBQUcsK0JBQStCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEQsTUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVoRCxJQUFJLFdBQVcsS0FBSyxTQUFTLElBQUksV0FBVyxLQUFLLElBQUksSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDckYsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELHdEQUF3RDtRQUN4RCwrQ0FBK0M7UUFDL0MsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNyQyxNQUFNLEtBQUssR0FBNEIsRUFBRSxDQUFDO1lBRTFDLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUV0QyxxREFBcUQ7Z0JBQ3JELHVDQUF1QztnQkFDdkMsSUFBSSxDQUFDLFlBQVksS0FBSyxTQUFTLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDL0MsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLFlBQVksQ0FBQztnQkFDakMsQ0FBQztZQUNGLENBQUM7WUFFRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBNUJlLCtCQUFpQixvQkE0QmhDLENBQUE7SUFFRDs7O09BR0c7SUFDSCxTQUFnQixtQkFBbUIsQ0FBQyxhQUFvQyxFQUFFLElBQWlCO1FBQzFGLE1BQU0sS0FBSyxHQUFHLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNyRCxNQUFNLG1CQUFtQixHQUFHLDRCQUE0QixDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9ELCtFQUErRTtRQUMvRSxJQUFJLEtBQUssSUFBSSxDQUFDLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDMUMsTUFBTSxLQUFLLEdBQWEsRUFBRSxDQUFDO1lBRTNCLGtFQUFrRTtZQUNsRSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUMxQyxLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFDakMsQ0FBQztZQUVELGdEQUFnRDtZQUNoRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMxRCx5REFBeUQ7Z0JBQ3pELElBQUksQ0FBQyxZQUFZLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssbUJBQW1CLENBQUMsRUFBRSxDQUFDO29CQUNoRSxTQUFTO2dCQUNWLENBQUM7Z0JBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQixDQUFDO1lBRUQsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQseUNBQXlDO1FBQ3pDLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQTVCZSxpQ0FBbUIsc0JBNEJsQyxDQUFBO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFnQixrQ0FBa0MsQ0FBQyxhQUFvQyxFQUFFLFFBQWM7UUFDdEcsb0hBQW9IO1FBQ3BILE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLHdCQUF3QixFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUVqRyxJQUFJLENBQUMsV0FBVyxJQUFJLE9BQU8sV0FBVyxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDbkYsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFxQyxFQUFFLENBQUM7UUFFekQsS0FBSyxNQUFNLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUMvRCxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFMUMsMEJBQTBCO1lBQzFCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDdEIsU0FBUztZQUNWLENBQUM7WUFFRCxpQ0FBaUM7WUFDakMsSUFBSSxPQUFPLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDaEMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxHQUFHLEtBQUssQ0FBQztnQkFDckMsU0FBUztZQUNWLENBQUM7WUFFRCx1Q0FBdUM7WUFDdkMsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDL0IsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNoQyxJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUNoQixXQUFXLENBQUMsZUFBZSxDQUFDLEdBQUcsVUFBVSxDQUFDO2dCQUMzQyxDQUFDO2dCQUNELFNBQVM7WUFDVixDQUFDO1lBRUQsK0NBQStDO1lBQy9DLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN0QyxJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDaEMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxHQUFHLFlBQVksQ0FBQztZQUM3QyxDQUFDO1FBQ0YsQ0FBQztRQUVELHNEQUFzRDtRQUN0RCxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDdEUsQ0FBQztJQTFDZSxnREFBa0MscUNBMENqRCxDQUFBO0FBRUYsQ0FBQyxFQTlKZ0IsYUFBYSxLQUFiLGFBQWEsUUE4SjdCO0FBRUQsTUFBTSxVQUFVLCtCQUErQixDQUFDLElBQWlCO0lBQ2hFLFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDZCxLQUFLLFdBQVcsQ0FBQyxZQUFZO1lBQzVCLE9BQU8sYUFBYSxDQUFDLHlCQUF5QixDQUFDO1FBQ2hELEtBQUssV0FBVyxDQUFDLE1BQU07WUFDdEIsT0FBTyxhQUFhLENBQUMsb0JBQW9CLENBQUM7UUFDM0MsS0FBSyxXQUFXLENBQUMsS0FBSztZQUNyQixPQUFPLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztRQUN4QztZQUNDLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUN6QyxDQUFDO0FBQ0YsQ0FBQztBQUVEOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLFVBQVUsU0FBUyxDQUFDLEtBQWM7SUFDdkMsSUFBSSxPQUFPLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUNoQyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQy9CLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM5QyxJQUFJLFVBQVUsS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUMzQixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxJQUFJLFVBQVUsS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUM1QixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQyJ9