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
import { dirname, extUri } from '../../../../../../base/common/resources.js';
import { getPromptsTypeForLanguageId, PromptsType } from '../promptTypes.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { getWordAtText } from '../../../../../../editor/common/core/wordHelper.js';
import { chatVariableLeader } from '../../chatParserTypes.js';
import { ILanguageModelToolsService } from '../../languageModelToolsService.js';
/**
 * Provides autocompletion for the variables inside prompt bodies.
 * - #file: paths to files and folders in the workspace
 * - # tool names
 */
let PromptBodyAutocompletion = class PromptBodyAutocompletion {
    constructor(fileService, languageModelToolsService) {
        this.fileService = fileService;
        this.languageModelToolsService = languageModelToolsService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptBodyAutocompletion';
        /**
         * List of trigger characters handled by this provider.
         */
        this.triggerCharacters = [':', '.', '/', '\\'];
    }
    /**
     * The main function of this provider that calculates
     * completion items based on the provided arguments.
     */
    async provideCompletionItems(model, position, context, token) {
        const promptsType = getPromptsTypeForLanguageId(model.getLanguageId());
        if (!promptsType) {
            return undefined;
        }
        const reference = await this.findVariableReference(model, position, token);
        if (!reference) {
            return undefined;
        }
        const suggestions = [];
        switch (reference.type) {
            case 'file':
                if (reference.contentRange.containsPosition(position)) {
                    // inside the link range
                    await this.collectFilePathCompletions(model, position, reference.contentRange, suggestions);
                }
                else {
                    await this.collectDefaultCompletions(model, reference.range, promptsType, suggestions);
                }
                break;
            case 'tool':
                if (reference.contentRange.containsPosition(position)) {
                    if (promptsType === PromptsType.agent || promptsType === PromptsType.prompt) {
                        await this.collectToolCompletions(model, position, reference.contentRange, suggestions);
                    }
                }
                else {
                    await this.collectDefaultCompletions(model, reference.range, promptsType, suggestions);
                }
                break;
            default:
                await this.collectDefaultCompletions(model, reference.range, promptsType, suggestions);
        }
        return { suggestions };
    }
    async collectToolCompletions(model, position, toolRange, suggestions) {
        for (const toolName of this.languageModelToolsService.getQualifiedToolNames()) {
            suggestions.push({
                label: toolName,
                kind: 13 /* CompletionItemKind.Value */,
                filterText: toolName,
                insertText: toolName,
                range: toolRange,
            });
        }
    }
    async collectFilePathCompletions(model, position, pathRange, suggestions) {
        const pathUntilPosition = model.getValueInRange(pathRange.setEndPosition(position.lineNumber, position.column));
        const pathSeparator = pathUntilPosition.includes('/') || !pathUntilPosition.includes('\\') ? '/' : '\\';
        let parentFolderPath;
        if (pathUntilPosition.match(/[^\/]\.\.$/i)) { // ends with `..`
            parentFolderPath = pathUntilPosition + pathSeparator;
        }
        else {
            let i = pathUntilPosition.length - 1;
            while (i >= 0 && ![47 /* CharCode.Slash */, 92 /* CharCode.Backslash */].includes(pathUntilPosition.charCodeAt(i))) {
                i--;
            }
            parentFolderPath = pathUntilPosition.substring(0, i + 1); // the segment up to the `/` or `\` before the position
        }
        const retriggerCommand = { id: 'editor.action.triggerSuggest', title: 'Suggest' };
        try {
            const currentFolder = extUri.resolvePath(dirname(model.uri), parentFolderPath);
            const { children } = await this.fileService.resolve(currentFolder);
            if (children) {
                for (const child of children) {
                    const insertText = (parentFolderPath || ('.' + pathSeparator)) + child.name;
                    suggestions.push({
                        label: child.name + (child.isDirectory ? pathSeparator : ''),
                        kind: child.isDirectory ? 23 /* CompletionItemKind.Folder */ : 20 /* CompletionItemKind.File */,
                        range: pathRange,
                        insertText: insertText + (child.isDirectory ? pathSeparator : ''),
                        filterText: insertText,
                        command: child.isDirectory ? retriggerCommand : undefined
                    });
                }
            }
        }
        catch (e) {
            // ignore errors accessing the folder location
        }
        suggestions.push({
            label: '..',
            kind: 23 /* CompletionItemKind.Folder */,
            insertText: parentFolderPath + '..' + pathSeparator,
            range: pathRange,
            filterText: parentFolderPath + '..',
            command: retriggerCommand
        });
    }
    /**
     * Finds a file reference that suites the provided `position`.
     */
    async findVariableReference(model, position, token) {
        if (model.getLineContent(1).trimEnd() === '---') {
            let i = 2;
            while (i <= model.getLineCount() && model.getLineContent(i).trimEnd() !== '---') {
                i++;
            }
            if (i >= position.lineNumber) {
                // inside front matter
                return undefined;
            }
        }
        const reg = new RegExp(`${chatVariableLeader}[^\\s#]*`, 'g');
        const varWord = getWordAtText(position.column, reg, model.getLineContent(position.lineNumber), 0);
        if (!varWord) {
            return undefined;
        }
        const range = new Range(position.lineNumber, varWord.startColumn + 1, position.lineNumber, varWord.endColumn);
        const nameMatch = varWord.word.match(/^#(\w+:)?/);
        if (nameMatch) {
            const contentCol = varWord.startColumn + nameMatch[0].length;
            if (nameMatch[1] === 'file:') {
                return { type: 'file', contentRange: new Range(position.lineNumber, contentCol, position.lineNumber, varWord.endColumn), range };
            }
            else if (nameMatch[1] === 'tool:') {
                return { type: 'tool', contentRange: new Range(position.lineNumber, contentCol, position.lineNumber, varWord.endColumn), range };
            }
        }
        return { type: '', contentRange: range, range };
    }
    async collectDefaultCompletions(model, range, promptFileType, suggestions) {
        const labels = promptFileType === PromptsType.instructions ? ['file'] : ['file', 'tool'];
        labels.forEach(label => {
            suggestions.push({
                label: `${label}:`,
                kind: 17 /* CompletionItemKind.Keyword */,
                insertText: `${label}:`,
                range: range,
                command: { id: 'editor.action.triggerSuggest', title: 'Suggest' }
            });
        });
    }
};
PromptBodyAutocompletion = __decorate([
    __param(0, IFileService),
    __param(1, ILanguageModelToolsService)
], PromptBodyAutocompletion);
export { PromptBodyAutocompletion };
//# sourceMappingURL=promptBodyAutocompletion.js.map