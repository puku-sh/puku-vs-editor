"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotStatusBar = void 0;
const vscode_1 = require("vscode");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const constants_1 = require("../../lib/src/constants");
const fetch_1 = require("../../lib/src/openai/fetch");
const progress_1 = require("../../lib/src/progress");
const config_1 = require("./config");
const constants_2 = require("./constants");
const extensionStatus_1 = require("./extensionStatus");
const icon_1 = require("./icon");
let CopilotStatusBar = class CopilotStatusBar extends progress_1.StatusReporter {
    constructor(id, extensionStatusService, instantiationService) {
        super();
        this.extensionStatusService = extensionStatusService;
        this.instantiationService = instantiationService;
        this.showingMessage = false;
        this.disposables = [];
        this.item = vscode_1.languages.createLanguageStatusItem(id, '*');
        this.disposables.push(this.item);
        this.updateStatusBarIndicator();
        this.disposables.push(vscode_1.window.onDidChangeActiveTextEditor(() => {
            this.updateStatusBarIndicator();
        }));
        this.disposables.push(vscode_1.workspace.onDidCloseTextDocument(() => {
            this.updateStatusBarIndicator();
        }));
        this.disposables.push(vscode_1.workspace.onDidOpenTextDocument(() => {
            this.updateStatusBarIndicator();
        }));
        this.disposables.push(vscode_1.workspace.onDidChangeConfiguration(e => {
            if (!e.affectsConfiguration(constants_1.CopilotConfigPrefix)) {
                return;
            }
            this.updateStatusBarIndicator();
        }));
    }
    didChange(event) {
        this.extensionStatusService.kind = event.kind;
        this.extensionStatusService.message = event.message;
        this.extensionStatusService.command = event.command;
        this.updateStatusBarIndicator();
    }
    checkEnabledForLanguage() {
        return this.instantiationService.invokeFunction(config_1.isCompletionEnabled) ?? true;
    }
    updateStatusBarIndicator() {
        if (this.isDisposed()) {
            return;
        }
        void vscode_1.commands.executeCommand('setContext', 'puku.completions.quotaExceeded', this.extensionStatusService.command?.command === fetch_1.CMDQuotaExceeded);
        const enabled = this.checkEnabledForLanguage();
        void vscode_1.commands.executeCommand('setContext', 'puku.completions.enabled', enabled);
        this.item.command = { command: constants_2.CMDToggleStatusMenuChat, title: 'View Details' };
        switch (this.extensionStatusService.kind) {
            case 'Error':
                this.item.severity = vscode_1.LanguageStatusSeverity.Error;
                this.item.text = `${icon_1.Icon.Warning} Completions`;
                this.item.detail = 'Error';
                break;
            case 'Warning':
                this.item.severity = vscode_1.LanguageStatusSeverity.Warning;
                this.item.text = `${icon_1.Icon.Warning} Completions`;
                this.item.detail = 'Temporary issues';
                break;
            case 'Inactive':
                this.item.severity = vscode_1.LanguageStatusSeverity.Information;
                this.item.text = `${icon_1.Icon.Blocked} Completions`;
                this.item.detail = 'Inactive';
                break;
            case 'Normal':
                this.item.severity = vscode_1.LanguageStatusSeverity.Information;
                if (!(0, config_1.isInlineSuggestEnabled)()) {
                    this.item.text = `${icon_1.Icon.NotConnected} Completions`;
                    this.item.detail = 'VS Code inline suggestions disabled';
                }
                else if (!enabled) {
                    this.item.text = `${icon_1.Icon.NotConnected} Completions`;
                    this.item.detail = 'Disabled';
                }
                else {
                    this.item.text = `${icon_1.Icon.Logo} Completions`;
                    this.item.detail = '';
                }
                this.item.command.title = 'Open Menu';
                break;
        }
        this.item.accessibilityInformation = {
            label: 'Inline Suggestions',
        };
        if (this.extensionStatusService.command) {
            this.item.command = this.extensionStatusService.command;
            this.item.detail = this.extensionStatusService.message;
        }
    }
    dispose() {
        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables = [];
    }
    isDisposed() {
        return this.disposables.length === 0;
    }
};
exports.CopilotStatusBar = CopilotStatusBar;
exports.CopilotStatusBar = CopilotStatusBar = __decorate([
    __param(1, extensionStatus_1.ICompletionsExtensionStatus),
    __param(2, instantiation_1.IInstantiationService)
], CopilotStatusBar);
//# sourceMappingURL=statusBar.js.map