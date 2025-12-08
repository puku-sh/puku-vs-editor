"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotStatusBarPickMenu = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_1 = require("vscode");
const platform_1 = require("../../../../../util/vs/base/common/platform");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const config_1 = require("./config");
const constants_1 = require("./constants");
const extensionStatus_1 = require("./extensionStatus");
const icon_1 = require("./icon");
let CopilotStatusBarPickMenu = class CopilotStatusBarPickMenu {
    constructor(instantiationService, extensionStatusService) {
        this.instantiationService = instantiationService;
        this.extensionStatusService = extensionStatusService;
    }
    showStatusMenu() {
        const quickpickList = vscode_1.window.createQuickPick();
        quickpickList.placeholder = 'Select an option';
        quickpickList.title = 'Configure Inline Suggestions';
        quickpickList.items = this.collectQuickPickItems();
        quickpickList.onDidAccept(() => this.handleItemSelection(quickpickList));
        quickpickList.show();
        return quickpickList;
    }
    async handleItemSelection(quickpickList) {
        const selection = quickpickList.selectedItems[0];
        if (selection === undefined) {
            return;
        }
        if ('command' in selection) {
            const commandSelection = selection;
            await vscode_1.commands.executeCommand(commandSelection.command, ...commandSelection.commandArgs);
            quickpickList.hide();
        }
        else {
            throw new Error('Unexpected Copilot quick picker selection');
        }
    }
    collectQuickPickItems() {
        return [
            this.newStatusItem(),
            this.newSeparator(),
            ...this.collectLanguageSpecificItems(),
            this.newKeyboardItem(),
            this.newSettingsItem(),
            ...this.collectDiagnosticsItems(),
            this.newOpenLogsItem(),
            this.newSeparator(),
            this.newDocsItem(),
            //this.newForumItem(),
        ];
    }
    collectLanguageSpecificItems() {
        const items = [];
        if (!this.hasActiveStatus()) {
            return items;
        }
        const editor = vscode_1.window.activeTextEditor;
        if (!platform_1.isWeb && editor) {
            items.push(this.newPanelItem());
        }
        // Always show the model picker even if only one model is available
        if (!platform_1.isWeb) {
            items.push(this.newChangeModelItem());
        }
        if (editor) {
            items.push(...this.newEnableLanguageItem());
        }
        if (items.length) {
            items.push(this.newSeparator());
        }
        return items;
    }
    hasActiveStatus() {
        return ['Normal'].includes(this.extensionStatusService.kind);
    }
    isCompletionEnabled() {
        return (0, config_1.isInlineSuggestEnabled)() && this.instantiationService.invokeFunction(config_1.isCompletionEnabled);
    }
    newEnableLanguageItem() {
        const isEnabled = this.isCompletionEnabled();
        if (isEnabled) {
            return [this.newCommandItem('Disable Inline Suggestions', constants_1.CMDDisableCompletionsChat)];
        }
        else if (isEnabled === false) {
            return [this.newCommandItem('Enable Inline Suggestions', constants_1.CMDEnableCompletionsChat)];
        }
        else {
            return [];
        }
    }
    newStatusItem() {
        let statusText;
        let statusIcon = icon_1.Icon.Logo;
        switch (this.extensionStatusService.kind) {
            case 'Normal':
                statusText = 'Ready';
                if ((0, config_1.isInlineSuggestEnabled)() === false) {
                    statusText += ' (VS Code inline suggestions disabled)';
                }
                else if (this.instantiationService.invokeFunction(config_1.isCompletionEnabled) === false) {
                    statusText += ' (Disabled)';
                }
                break;
            case 'Inactive':
                statusText = this.extensionStatusService.message || 'Copilot is currently inactive';
                statusIcon = icon_1.Icon.Blocked;
                break;
            default:
                statusText = this.extensionStatusService.message || 'Copilot has encountered an error';
                statusIcon = icon_1.Icon.NotConnected;
                break;
        }
        return this.newCommandItem(`${statusIcon} Status: ${statusText}`, constants_1.CMDOpenLogsClient);
    }
    newOpenLogsItem() {
        return this.newCommandItem('Open Logs...', constants_1.CMDOpenLogsClient);
    }
    collectDiagnosticsItems() {
        if (platform_1.isWeb) {
            return [];
        }
        return [this.newCommandItem('Show Diagnostics...', constants_1.CMDCollectDiagnosticsChat)];
    }
    newKeyboardItem() {
        return this.newCommandItem('$(keyboard) Edit Keyboard Shortcuts...', 'workbench.action.openGlobalKeybindings', [
            'copilot',
        ]);
    }
    newSettingsItem() {
        return this.newCommandItem('$(settings-gear) Edit Settings...', 'workbench.action.openSettings', [
            'GitHub Copilot',
        ]);
    }
    newPanelItem() {
        return this.newCommandItem('Open Completions Panel...', constants_1.CMDOpenPanelClient);
    }
    newChangeModelItem() {
        return this.newCommandItem('Change Completions Model...', constants_1.CMDOpenModelPickerClient);
    }
    newDocsItem() {
        return this.newCommandItem('$(remote-explorer-documentation) View Copilot Documentation...', constants_1.CMDOpenDocumentationClient);
    }
    newCommandItem(label, command, commandArgs) {
        return new CommandQuickItem(label, command, commandArgs || []);
    }
    newSeparator() {
        return {
            label: '',
            kind: vscode_1.QuickPickItemKind.Separator,
        };
    }
};
exports.CopilotStatusBarPickMenu = CopilotStatusBarPickMenu;
exports.CopilotStatusBarPickMenu = CopilotStatusBarPickMenu = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, extensionStatus_1.ICompletionsExtensionStatus)
], CopilotStatusBarPickMenu);
class CommandQuickItem {
    constructor(label, command, commandArgs) {
        this.label = label;
        this.command = command;
        this.commandArgs = commandArgs;
    }
}
//# sourceMappingURL=statusBarPicker.js.map