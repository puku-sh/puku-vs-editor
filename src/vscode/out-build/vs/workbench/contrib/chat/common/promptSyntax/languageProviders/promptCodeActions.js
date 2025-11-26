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
import { Range } from '../../../../../../editor/common/core/range.js';
import { localize } from '../../../../../../nls.js';
import { ILanguageModelToolsService } from '../../languageModelToolsService.js';
import { getPromptsTypeForLanguageId, PromptsType } from '../promptTypes.js';
import { IPromptsService } from '../service/promptsService.js';
import { PromptHeaderAttributes } from '../promptFileParser.js';
import { Lazy } from '../../../../../../base/common/lazy.js';
import { LEGACY_MODE_FILE_EXTENSION } from '../config/promptFileLocations.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { isGithubTarget } from './promptValidator.js';
let PromptCodeActionProvider = class PromptCodeActionProvider {
    constructor(promptsService, languageModelToolsService, fileService) {
        this.promptsService = promptsService;
        this.languageModelToolsService = languageModelToolsService;
        this.fileService = fileService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptCodeActionProvider';
    }
    async provideCodeActions(model, range, context, token) {
        const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
        if (!promptType || promptType === PromptsType.instructions) {
            // if the model is not a prompt, we don't provide any code actions
            return undefined;
        }
        const result = [];
        const promptAST = this.promptsService.getParsedPromptFile(model);
        switch (promptType) {
            case PromptsType.agent:
                this.getUpdateToolsCodeActions(promptAST, promptType, model, range, result);
                await this.getMigrateModeFileCodeActions(model.uri, result);
                break;
            case PromptsType.prompt:
                this.getUpdateModeCodeActions(promptAST, model, range, result);
                this.getUpdateToolsCodeActions(promptAST, promptType, model, range, result);
                break;
        }
        if (result.length === 0) {
            return undefined;
        }
        return {
            actions: result,
            dispose: () => { }
        };
    }
    getUpdateModeCodeActions(promptFile, model, range, result) {
        const modeAttr = promptFile.header?.getAttribute(PromptHeaderAttributes.mode);
        if (!modeAttr?.range.containsRange(range)) {
            return;
        }
        const keyRange = new Range(modeAttr.range.startLineNumber, modeAttr.range.startColumn, modeAttr.range.startLineNumber, modeAttr.range.startColumn + modeAttr.key.length);
        result.push({
            title: localize(6473, null),
            edit: {
                edits: [asWorkspaceTextEdit(model, { range: keyRange, text: 'agent' })]
            }
        });
    }
    async getMigrateModeFileCodeActions(uri, result) {
        if (uri.path.endsWith(LEGACY_MODE_FILE_EXTENSION)) {
            const location = this.promptsService.getAgentFileURIFromModeFile(uri);
            if (location && await this.fileService.canMove(uri, location)) {
                const edit = { oldResource: uri, newResource: location, options: { overwrite: false, copy: false } };
                result.push({
                    title: localize(6474, null),
                    edit: {
                        edits: [edit]
                    }
                });
            }
        }
    }
    getUpdateToolsCodeActions(promptFile, promptType, model, range, result) {
        const toolsAttr = promptFile.header?.getAttribute(PromptHeaderAttributes.tools);
        if (toolsAttr?.value.type !== 'array' || !toolsAttr.value.range.containsRange(range)) {
            return;
        }
        if (isGithubTarget(promptType, promptFile.header?.target)) {
            // Puku AI custom agents use a fixed set of tool names that are not deprecated
            return;
        }
        const values = toolsAttr.value.items;
        const deprecatedNames = new Lazy(() => this.languageModelToolsService.getDeprecatedQualifiedToolNames());
        const edits = [];
        for (const item of values) {
            if (item.type !== 'string') {
                continue;
            }
            const newNames = deprecatedNames.value.get(item.value);
            if (newNames && newNames.size > 0) {
                const quote = model.getValueInRange(new Range(item.range.startLineNumber, item.range.startColumn, item.range.endLineNumber, item.range.startColumn + 1));
                if (newNames.size === 1) {
                    const newName = Array.from(newNames)[0];
                    const text = (quote === `'` || quote === '"') ? (quote + newName + quote) : newName;
                    const edit = { range: item.range, text };
                    edits.push(edit);
                    if (item.range.containsRange(range)) {
                        result.push({
                            title: localize(6475, null, newName),
                            edit: {
                                edits: [asWorkspaceTextEdit(model, edit)]
                            }
                        });
                    }
                }
                else {
                    // Multiple new names - expand to include all of them
                    const newNamesArray = Array.from(newNames).sort((a, b) => a.localeCompare(b));
                    const separator = model.getValueInRange(new Range(item.range.startLineNumber, item.range.endColumn, item.range.endLineNumber, item.range.endColumn + 2));
                    const useCommaSpace = separator.includes(',');
                    const delimiterText = useCommaSpace ? ', ' : ',';
                    const newNamesText = newNamesArray.map(name => (quote === `'` || quote === '"') ? (quote + name + quote) : name).join(delimiterText);
                    const edit = { range: item.range, text: newNamesText };
                    edits.push(edit);
                    if (item.range.containsRange(range)) {
                        result.push({
                            title: localize(6476, null, newNames.size),
                            edit: {
                                edits: [asWorkspaceTextEdit(model, edit)]
                            }
                        });
                    }
                }
            }
        }
        if (edits.length && result.length === 0 || edits.length > 1) {
            result.push({
                title: localize(6477, null),
                edit: {
                    edits: edits.map(edit => asWorkspaceTextEdit(model, edit))
                }
            });
        }
    }
};
PromptCodeActionProvider = __decorate([
    __param(0, IPromptsService),
    __param(1, ILanguageModelToolsService),
    __param(2, IFileService)
], PromptCodeActionProvider);
export { PromptCodeActionProvider };
function asWorkspaceTextEdit(model, textEdit) {
    return {
        versionId: model.getVersionId(),
        resource: model.uri,
        textEdit
    };
}
//# sourceMappingURL=promptCodeActions.js.map