/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename, dirname } from '../../../../../../base/common/path.js';
import { PromptsType } from '../promptTypes.js';
/**
 * File extension for the reusable prompt files.
 */
export const PROMPT_FILE_EXTENSION = '.prompt.md';
/**
 * File extension for the reusable instruction files.
 */
export const INSTRUCTION_FILE_EXTENSION = '.instructions.md';
/**
 * File extension for the modes files.
 */
export const LEGACY_MODE_FILE_EXTENSION = '.chatmode.md';
/**
 * File extension for the agent files.
 */
export const AGENT_FILE_EXTENSION = '.agent.md';
/**
 * Copilot custom instructions file name.
 */
export const COPILOT_CUSTOM_INSTRUCTIONS_FILENAME = 'copilot-instructions.md';
/**
 * Default reusable prompt files source folder.
 */
export const PROMPT_DEFAULT_SOURCE_FOLDER = '.github/prompts';
/**
 * Default reusable instructions files source folder.
 */
export const INSTRUCTIONS_DEFAULT_SOURCE_FOLDER = '.github/instructions';
/**
 * Default modes source folder.
 */
export const LEGACY_MODE_DEFAULT_SOURCE_FOLDER = '.github/chatmodes';
/**
 * Agents folder.
 */
export const AGENTS_SOURCE_FOLDER = '.github/agents';
/**
 * Helper function to check if a file is directly in the .github/agents/ folder (not in subfolders).
 */
function isInAgentsFolder(fileUri) {
    const dir = dirname(fileUri.path);
    return dir.endsWith('/' + AGENTS_SOURCE_FOLDER) || dir === AGENTS_SOURCE_FOLDER;
}
/**
 * Gets the prompt file type from the provided path.
 */
export function getPromptFileType(fileUri) {
    const filename = basename(fileUri.path);
    if (filename.endsWith(PROMPT_FILE_EXTENSION)) {
        return PromptsType.prompt;
    }
    if (filename.endsWith(INSTRUCTION_FILE_EXTENSION) || (filename === COPILOT_CUSTOM_INSTRUCTIONS_FILENAME)) {
        return PromptsType.instructions;
    }
    if (filename.endsWith(LEGACY_MODE_FILE_EXTENSION) || filename.endsWith(AGENT_FILE_EXTENSION)) {
        return PromptsType.agent;
    }
    // Check if it's a .md file in the .github/agents/ folder
    if (filename.endsWith('.md') && isInAgentsFolder(fileUri)) {
        return PromptsType.agent;
    }
    return undefined;
}
/**
 * Check if provided URI points to a file that with prompt file extension.
 */
export function isPromptOrInstructionsFile(fileUri) {
    return getPromptFileType(fileUri) !== undefined;
}
export function getPromptFileExtension(type) {
    switch (type) {
        case PromptsType.instructions:
            return INSTRUCTION_FILE_EXTENSION;
        case PromptsType.prompt:
            return PROMPT_FILE_EXTENSION;
        case PromptsType.agent:
            return AGENT_FILE_EXTENSION;
        default:
            throw new Error('Unknown prompt type');
    }
}
export function getPromptFileDefaultLocation(type) {
    switch (type) {
        case PromptsType.instructions:
            return INSTRUCTIONS_DEFAULT_SOURCE_FOLDER;
        case PromptsType.prompt:
            return PROMPT_DEFAULT_SOURCE_FOLDER;
        case PromptsType.agent:
            return AGENTS_SOURCE_FOLDER;
        default:
            throw new Error('Unknown prompt type');
    }
}
/**
 * Gets clean prompt name without file extension.
 */
export function getCleanPromptName(fileUri) {
    const fileName = basename(fileUri.path);
    const extensions = [
        PROMPT_FILE_EXTENSION,
        INSTRUCTION_FILE_EXTENSION,
        LEGACY_MODE_FILE_EXTENSION,
        AGENT_FILE_EXTENSION,
    ];
    for (const ext of extensions) {
        if (fileName.endsWith(ext)) {
            return basename(fileUri.path, ext);
        }
    }
    if (fileName === COPILOT_CUSTOM_INSTRUCTIONS_FILENAME) {
        return basename(fileUri.path, '.md');
    }
    // For .md files in .github/agents/ folder, treat them as agent files
    if (fileName.endsWith('.md') && isInAgentsFolder(fileUri)) {
        return basename(fileUri.path, '.md');
    }
    // because we now rely on the `prompt` language ID that can be explicitly
    // set for any document in the editor, any file can be a "prompt" file, so
    // to account for that, we return the full file name including the file
    // extension for all other cases
    return basename(fileUri.path);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZUxvY2F0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb25maWcvcHJvbXB0RmlsZUxvY2F0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUVoRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLFlBQVksQ0FBQztBQUVsRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGtCQUFrQixDQUFDO0FBRTdEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsY0FBYyxDQUFDO0FBRXpEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsV0FBVyxDQUFDO0FBRWhEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcseUJBQXlCLENBQUM7QUFHOUU7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxpQkFBaUIsQ0FBQztBQUU5RDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFHLHNCQUFzQixDQUFDO0FBRXpFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0saUNBQWlDLEdBQUcsbUJBQW1CLENBQUM7QUFFckU7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxnQkFBZ0IsQ0FBQztBQUVyRDs7R0FFRztBQUNILFNBQVMsZ0JBQWdCLENBQUMsT0FBWTtJQUNyQyxN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