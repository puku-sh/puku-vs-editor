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
import { localize } from '../../../../../../nls.js';
import { URI } from '../../../../../../base/common/uri.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { IPromptsService, PromptsStorage } from '../../../common/promptSyntax/service/promptsService.js';
import { dirname, extUri, joinPath } from '../../../../../../base/common/resources.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { getCleanPromptName } from '../../../common/promptSyntax/config/promptFileLocations.js';
import { PromptsType, INSTRUCTIONS_DOCUMENTATION_URL, AGENT_DOCUMENTATION_URL, PROMPT_DOCUMENTATION_URL } from '../../../common/promptSyntax/promptTypes.js';
import { NEW_PROMPT_COMMAND_ID, NEW_INSTRUCTIONS_COMMAND_ID, NEW_AGENT_COMMAND_ID } from '../newPromptFileActions.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { askForPromptFileName } from './askForPromptName.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { CancellationToken, CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { askForPromptSourceFolder } from './askForPromptSourceFolder.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { PromptsConfig } from '../../../common/promptSyntax/config/config.js';
import { ResourceSet } from '../../../../../../base/common/map.js';
import { PromptFileRewriter } from '../promptFileRewriter.js';
/**
 * Button that opens the documentation.
 */
function newHelpButton(type) {
    const iconClass = ThemeIcon.asClassName(Codicon.question);
    switch (type) {
        case PromptsType.prompt:
            return {
                tooltip: localize('help.prompt', "Show help on prompt files"),
                helpURI: URI.parse(PROMPT_DOCUMENTATION_URL),
                iconClass
            };
        case PromptsType.instructions:
            return {
                tooltip: localize('help.instructions', "Show help on instruction files"),
                helpURI: URI.parse(INSTRUCTIONS_DOCUMENTATION_URL),
                iconClass
            };
        case PromptsType.agent:
            return {
                tooltip: localize('help.agent', "Show help on custom agent files"),
                helpURI: URI.parse(AGENT_DOCUMENTATION_URL),
                iconClass
            };
    }
}
function isHelpButton(button) {
    return button.helpURI !== undefined;
}
function isPromptFileItem(item) {
    return item.type === 'item' && !!item.promptFileUri;
}
/**
 * A quick pick item that starts the 'New Prompt File' command.
 */
const NEW_PROMPT_FILE_OPTION = {
    type: 'item',
    label: `$(plus) ${localize('commands.new-promptfile.select-dialog.label', 'New prompt file...')}`,
    pickable: false,
    alwaysShow: true,
    buttons: [newHelpButton(PromptsType.prompt)],
    commandId: NEW_PROMPT_COMMAND_ID,
};
/**
 * A quick pick item that starts the 'New Instructions File' command.
 */
const NEW_INSTRUCTIONS_FILE_OPTION = {
    type: 'item',
    label: `$(plus) ${localize('commands.new-instructionsfile.select-dialog.label', 'New instruction file...')}`,
    pickable: false,
    alwaysShow: true,
    buttons: [newHelpButton(PromptsType.instructions)],
    commandId: NEW_INSTRUCTIONS_COMMAND_ID,
};
/**
 * A quick pick item that starts the 'Update Instructions' command.
 */
const UPDATE_INSTRUCTIONS_OPTION = {
    type: 'item',
    label: `$(refresh) ${localize('commands.update-instructions.select-dialog.label', 'Generate agent instructions...')}`,
    pickable: false,
    alwaysShow: true,
    buttons: [newHelpButton(PromptsType.instructions)],
    commandId: 'workbench.action.chat.generateInstructions',
};
/**
 * A quick pick item that starts the 'New Instructions File' command.
 */
const NEW_AGENT_FILE_OPTION = {
    type: 'item',
    label: `$(plus) ${localize('commands.new-agentfile.select-dialog.label', 'Create new custom agent...')}`,
    pickable: false,
    alwaysShow: true,
    buttons: [newHelpButton(PromptsType.agent)],
    commandId: NEW_AGENT_COMMAND_ID,
};
/**
 * Button that opens a prompt file in the editor.
 */
const EDIT_BUTTON = {
    tooltip: localize('open', "Open in Editor"),
    iconClass: ThemeIcon.asClassName(Codicon.fileCode),
};
/**
 * Button that deletes a prompt file.
 */
const DELETE_BUTTON = {
    tooltip: localize('delete', "Delete"),
    iconClass: ThemeIcon.asClassName(Codicon.trash),
};
/**
 * Button that renames a prompt file.
 */
const RENAME_BUTTON = {
    tooltip: localize('rename', "Move and/or Rename"),
    iconClass: ThemeIcon.asClassName(Codicon.replace),
};
/**
 * Button that copies a prompt file.
 */
const COPY_BUTTON = {
    tooltip: localize('copy', "Copy"),
    iconClass: ThemeIcon.asClassName(Codicon.copy),
};
/**
 * Button that sets a prompt file to be visible.
 */
const MAKE_VISIBLE_BUTTON = {
    tooltip: localize('makeVisible', "Hidden from chat view agent picker. Click to show."),
    iconClass: ThemeIcon.asClassName(Codicon.eyeClosed),
    alwaysVisible: true,
};
/**
 * Button that sets a prompt file to be invisible.
 */
const MAKE_INVISIBLE_BUTTON = {
    tooltip: localize('makeInvisible', "Hide from agent picker"),
    iconClass: ThemeIcon.asClassName(Codicon.eyeClosed),
};
let PromptFilePickers = class PromptFilePickers {
    constructor(_quickInputService, _openerService, _fileService, _dialogService, _commandService, _instaService, _promptsService, _labelService, _configurationService) {
        this._quickInputService = _quickInputService;
        this._openerService = _openerService;
        this._fileService = _fileService;
        this._dialogService = _dialogService;
        this._commandService = _commandService;
        this._instaService = _instaService;
        this._promptsService = _promptsService;
        this._labelService = _labelService;
        this._configurationService = _configurationService;
    }
    /**
     * Shows the prompt file selection dialog to the user that allows to run a prompt file(s).
     *
     * If {@link ISelectOptions.resource resource} is provided, the dialog will have
     * the resource pre-selected in the prompts list.
     */
    async selectPromptFile(options) {
        const cts = new CancellationTokenSource();
        const quickPick = this._quickInputService.createQuickPick({ useSeparators: true });
        quickPick.busy = true;
        quickPick.placeholder = localize('searching', 'Searching file system...');
        try {
            const fileOptions = await this._createPromptPickItems(options, cts.token);
            const activeItem = options.resource && fileOptions.find(f => f.type === 'item' && extUri.isEqual(f.promptFileUri, options.resource));
            if (activeItem) {
                quickPick.activeItems = [activeItem];
            }
            quickPick.placeholder = options.placeholder;
            quickPick.matchOnDescription = true;
            quickPick.items = fileOptions;
        }
        finally {
            quickPick.busy = false;
        }
        return new Promise(resolve => {
            const disposables = new DisposableStore();
            let isResolved = false;
            let isClosed = false;
            disposables.add(quickPick);
            disposables.add(cts);
            const refreshItems = async () => {
                const active = quickPick.activeItems;
                const newItems = await this._createPromptPickItems(options, CancellationToken.None);
                quickPick.items = newItems;
                quickPick.activeItems = active;
            };
            // handle the prompt `accept` event
            disposables.add(quickPick.onDidAccept(async () => {
                const { selectedItems } = quickPick;
                const { keyMods } = quickPick;
                const selectedItem = selectedItems[0];
                if (isPromptFileItem(selectedItem)) {
                    resolve({ promptFile: selectedItem.promptFileUri, keyMods: { ...keyMods } });
                    isResolved = true;
                }
                else {
                    if (selectedItem.commandId) {
                        await this._commandService.executeCommand(selectedItem.commandId);
                        return;
                    }
                }
                quickPick.hide();
            }));
            // handle the `button click` event on a list item (edit, delete, etc.)
            disposables.add(quickPick.onDidTriggerItemButton(async (e) => {
                const shouldRefresh = await this._handleButtonClick(quickPick, e, options);
                if (!isClosed && shouldRefresh) {
                    await refreshItems();
                }
            }));
            disposables.add(quickPick.onDidHide(() => {
                if (!quickPick.ignoreFocusOut) {
                    disposables.dispose();
                    isClosed = true;
                    if (!isResolved) {
                        resolve(undefined);
                        isResolved = true;
                    }
                }
            }));
            // finally, reveal the dialog
            quickPick.show();
        });
    }
    async _createPromptPickItems(options, token) {
        const buttons = [];
        if (options.optionEdit !== false) {
            buttons.push(EDIT_BUTTON);
        }
        if (options.optionCopy !== false) {
            buttons.push(COPY_BUTTON);
        }
        if (options.optionRename !== false) {
            buttons.push(RENAME_BUTTON);
        }
        if (options.optionDelete !== false) {
            buttons.push(DELETE_BUTTON);
        }
        const result = [];
        if (options.optionNew !== false) {
            result.push(...this._getNewItems(options.type));
        }
        let getVisibility = () => undefined;
        if (options.optionVisibility) {
            const disabled = this._promptsService.getDisabledPromptFiles(options.type);
            getVisibility = p => !disabled.has(p.uri);
        }
        const locals = await this._promptsService.listPromptFilesForStorage(options.type, PromptsStorage.local, token);
        if (locals.length) {
            result.push({ type: 'separator', label: localize('separator.workspace', "Workspace") });
            result.push(...await Promise.all(locals.map(l => this._createPromptPickItem(l, buttons, getVisibility(l), token))));
        }
        // Agent instruction files (copilot-instructions.md and AGENTS.md) are added here and not included in the output of
        // listPromptFilesForStorage() because that function only handles *.instructions.md files (under `.github/instructions/`, etc.)
        let agentInstructionFiles = [];
        if (options.type === PromptsType.instructions) {
            const useNestedAgentMD = this._configurationService.getValue(PromptsConfig.USE_NESTED_AGENT_MD);
            const agentInstructionUris = [
                ...await this._promptsService.listCopilotInstructionsMDs(token),
                ...await this._promptsService.listAgentMDs(token, !!useNestedAgentMD)
            ];
            agentInstructionFiles = agentInstructionUris.map(uri => {
                const folderName = this._labelService.getUriLabel(dirname(uri), { relative: true });
                // Don't show the folder path for files under .github folder (namely, copilot-instructions.md) since that is only defined once per repo.
                const shouldShowFolderPath = folderName?.toLowerCase() !== '.github';
                return {
                    uri,
                    description: shouldShowFolderPath ? folderName : undefined,
                    storage: PromptsStorage.local,
                    type: options.type
                };
            });
        }
        if (agentInstructionFiles.length) {
            const agentButtons = buttons.filter(b => b !== RENAME_BUTTON);
            result.push({ type: 'separator', label: localize('separator.workspace-agent-instructions', "Agent Instructions") });
            result.push(...await Promise.all(agentInstructionFiles.map(l => this._createPromptPickItem(l, agentButtons, getVisibility(l), token))));
        }
        const exts = await this._promptsService.listPromptFilesForStorage(options.type, PromptsStorage.extension, token);
        if (exts.length) {
            result.push({ type: 'separator', label: localize('separator.extensions', "Extensions") });
            const extButtons = [];
            if (options.optionEdit !== false) {
                extButtons.push(EDIT_BUTTON);
            }
            if (options.optionCopy !== false) {
                extButtons.push(COPY_BUTTON);
            }
            result.push(...await Promise.all(exts.map(e => this._createPromptPickItem(e, extButtons, getVisibility(e), token))));
        }
        const users = await this._promptsService.listPromptFilesForStorage(options.type, PromptsStorage.user, token);
        if (users.length) {
            result.push({ type: 'separator', label: localize('separator.user', "User Data") });
            result.push(...await Promise.all(users.map(u => this._createPromptPickItem(u, buttons, getVisibility(u), token))));
        }
        return result;
    }
    _getNewItems(type) {
        switch (type) {
            case PromptsType.prompt:
                return [NEW_PROMPT_FILE_OPTION];
            case PromptsType.instructions:
                return [NEW_INSTRUCTIONS_FILE_OPTION, UPDATE_INSTRUCTIONS_OPTION];
            case PromptsType.agent:
                return [NEW_AGENT_FILE_OPTION];
            default:
                throw new Error(`Unknown prompt type '${type}'.`);
        }
    }
    async _createPromptPickItem(promptFile, buttons, visibility, token) {
        const parsedPromptFile = await this._promptsService.parseNew(promptFile.uri, token).catch(() => undefined);
        let promptName = parsedPromptFile?.header?.name ?? promptFile.name ?? getCleanPromptName(promptFile.uri);
        const promptDescription = parsedPromptFile?.header?.description ?? promptFile.description;
        let tooltip;
        switch (promptFile.storage) {
            case PromptsStorage.extension:
                tooltip = promptFile.extension.displayName ?? promptFile.extension.id;
                break;
            case PromptsStorage.local:
                tooltip = this._labelService.getUriLabel(dirname(promptFile.uri), { relative: true });
                break;
            case PromptsStorage.user:
                tooltip = undefined;
                break;
        }
        let iconClass;
        if (visibility === false) {
            buttons = (buttons ?? []).concat(MAKE_VISIBLE_BUTTON);
            promptName = localize('hiddenLabelInfo', "{0} (hidden)", promptName);
            tooltip = localize('hiddenInAgentPicker', "Hidden from chat view agent picker");
            //iconClass = ThemeIcon.asClassName(Codicon.eyeClosed);
        }
        else if (visibility === true) {
            buttons = (buttons ?? []).concat(MAKE_INVISIBLE_BUTTON);
        }
        return {
            id: promptFile.uri.toString(),
            type: 'item',
            label: promptName,
            description: promptDescription,
            iconClass,
            tooltip,
            promptFileUri: promptFile.uri,
            buttons,
        };
    }
    async keepQuickPickOpen(quickPick, work) {
        const previousIgnoreFocusOut = quickPick.ignoreFocusOut;
        quickPick.ignoreFocusOut = true;
        try {
            return await work();
        }
        finally {
            quickPick.ignoreFocusOut = previousIgnoreFocusOut;
            quickPick.show();
        }
    }
    async _handleButtonClick(quickPick, context, options) {
        const { item, button } = context;
        if (!isPromptFileItem(item)) {
            if (isHelpButton(button)) {
                await this._openerService.open(button.helpURI);
                return false;
            }
            throw new Error(`Unknown button '${JSON.stringify(button)}'.`);
        }
        const value = item.promptFileUri;
        // `edit` button was pressed, open the prompt file in editor
        if (button === EDIT_BUTTON) {
            await this._openerService.open(value);
            return false;
        }
        // `copy` button was pressed, make a copy of the prompt file, open the copy in editor
        if (button === RENAME_BUTTON || button === COPY_BUTTON) {
            return await this.keepQuickPickOpen(quickPick, async () => {
                const currentFolder = dirname(value);
                const isMove = button === RENAME_BUTTON && quickPick.keyMods.ctrlCmd;
                const newFolder = await this._instaService.invokeFunction(askForPromptSourceFolder, options.type, currentFolder, isMove);
                if (!newFolder) {
                    return false;
                }
                const newName = await this._instaService.invokeFunction(askForPromptFileName, options.type, newFolder.uri, item.label);
                if (!newName) {
                    return false;
                }
                const newFile = joinPath(newFolder.uri, newName);
                if (isMove) {
                    await this._fileService.move(value, newFile);
                }
                else {
                    await this._fileService.copy(value, newFile);
                }
                await this._openerService.open(newFile);
                await this._instaService.createInstance(PromptFileRewriter).openAndRewriteName(newFile, getCleanPromptName(newFile), CancellationToken.None);
                return true;
            });
        }
        // `delete` button was pressed, delete the prompt file
        if (button === DELETE_BUTTON) {
            // don't close the main prompt selection dialog by the confirmation dialog
            return await this.keepQuickPickOpen(quickPick, async () => {
                const filename = getCleanPromptName(value);
                const message = localize('commands.prompts.use.select-dialog.delete-prompt.confirm.message', "Are you sure you want to delete '{0}'?", filename);
                const { confirmed } = await this._dialogService.confirm({ message });
                // if prompt deletion was not confirmed, nothing to do
                if (!confirmed) {
                    return false;
                }
                // prompt deletion was confirmed so delete the prompt file
                await this._fileService.del(value);
                return true;
            });
        }
        if (button === MAKE_VISIBLE_BUTTON || button === MAKE_INVISIBLE_BUTTON) {
            const disabled = this._promptsService.getDisabledPromptFiles(options.type);
            if (button === MAKE_VISIBLE_BUTTON) {
                disabled.delete(value);
            }
            else {
                disabled.add(value);
            }
            this._promptsService.setDisabledPromptFiles(options.type, disabled);
            return true;
        }
        throw new Error(`Unknown button '${JSON.stringify(button)}'.`);
    }
    // --- Enablement Configuration -------------------------------------------------------
    /**
     * Shows a multi-select (checkbox) quick pick to configure which prompt files of the given
     * type are enabled. Currently only used for agent prompt files.
     */
    async managePromptFiles(type, placeholder) {
        const cts = new CancellationTokenSource();
        const quickPick = this._quickInputService.createQuickPick({ useSeparators: true });
        quickPick.placeholder = placeholder;
        quickPick.canSelectMany = true;
        quickPick.matchOnDescription = true;
        quickPick.sortByLabel = false;
        quickPick.busy = true;
        const options = {
            placeholder: '',
            type,
            optionNew: true,
            optionEdit: true,
            optionDelete: true,
            optionRename: true,
            optionCopy: true,
            optionVisibility: false
        };
        try {
            const disabled = this._promptsService.getDisabledPromptFiles(type);
            const items = await this._createPromptPickItems(options, cts.token);
            quickPick.items = items;
            quickPick.selectedItems = items.filter(i => isPromptFileItem(i)).filter(i => !disabled.has(i.promptFileUri));
        }
        finally {
            quickPick.busy = false;
        }
        return new Promise(resolve => {
            const disposables = new DisposableStore();
            disposables.add(quickPick);
            disposables.add(cts);
            let isClosed = false;
            let isResolved = false;
            const getDisabled = () => {
                const selected = quickPick.selectedItems;
                return new ResourceSet(quickPick.items.filter(i => isPromptFileItem(i)).filter(i => !selected.includes(i)).map(i => i.promptFileUri));
            };
            const refreshItems = async () => {
                const active = quickPick.activeItems;
                const disabled = getDisabled();
                const newItems = await this._createPromptPickItems(options, CancellationToken.None);
                quickPick.items = newItems;
                quickPick.selectedItems = newItems.filter(i => isPromptFileItem(i)).filter(i => !disabled.has(i.promptFileUri));
                quickPick.activeItems = active;
            };
            disposables.add(quickPick.onDidAccept(async () => {
                const clickedItem = quickPick.activeItems;
                if (clickedItem.length === 1 && clickedItem[0].commandId) {
                    const commandId = clickedItem[0].commandId;
                    await this.keepQuickPickOpen(quickPick, async () => {
                        await this._commandService.executeCommand(commandId);
                    });
                    if (!isClosed) {
                        await refreshItems();
                    }
                    return;
                }
                this._promptsService.setDisabledPromptFiles(type, getDisabled());
                isResolved = true;
                resolve(true);
                quickPick.hide();
            }));
            disposables.add(quickPick.onDidTriggerItemButton(async (e) => {
                const shouldRefresh = await this._handleButtonClick(quickPick, e, options);
                if (!isClosed && shouldRefresh) {
                    await refreshItems();
                }
            }));
            disposables.add(quickPick.onDidHide(() => {
                if (!quickPick.ignoreFocusOut) {
                    disposables.dispose();
                    isClosed = true;
                    if (!isResolved) {
                        resolve(false);
                        isResolved = true;
                    }
                }
            }));
            quickPick.show();
        });
    }
};
PromptFilePickers = __decorate([
    __param(0, IQuickInputService),
    __param(1, IOpenerService),
    __param(2, IFileService),
    __param(3, IDialogService),
    __param(4, ICommandService),
    __param(5, IInstantiationService),
    __param(6, IPromptsService),
    __param(7, ILabelService),
    __param(8, IConfigurationService)
], PromptFilePickers);
export { PromptFilePickers };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZVBpY2tlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L3BpY2tlcnMvcHJvbXB0RmlsZVBpY2tlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBZSxlQUFlLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDdEgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLDhCQUE4QixFQUFFLHVCQUF1QixFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDN0os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