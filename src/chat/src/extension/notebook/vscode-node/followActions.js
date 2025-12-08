"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotebookFollowCommands = void 0;
const vscode = __importStar(require("vscode"));
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const NOTEBOOK_FOLLOW_IN_SESSION_KEY = 'puku.notebookFollowInSessionEnabled';
let NotebookFollowCommands = class NotebookFollowCommands extends lifecycle_1.Disposable {
    constructor(_configurationService, _notebookService) {
        super();
        this._configurationService = _configurationService;
        this._notebookService = _notebookService;
        // get setting and set initial follower context state
        this.followSettingEnabled = this._configurationService.getConfig(configurationService_1.ConfigKey.NotebookFollowCellExecution);
        this.updateFollowContext(this.followSettingEnabled);
        // config listener to disable if the setting changes
        this._register(event_1.Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, e => {
            if (!e || e.affectsConfiguration(configurationService_1.ConfigKey.NotebookFollowCellExecution.fullyQualifiedId)) {
                this.followSettingEnabled = this._configurationService.getConfig(configurationService_1.ConfigKey.NotebookFollowCellExecution);
                this.updateFollowContext(this.followSettingEnabled);
            }
        }));
        // commands to change context state
        this._register(vscode.commands.registerCommand('puku.chat.notebook.enableFollowCellExecution', () => {
            this.updateFollowContext(true);
        }));
        this._register(vscode.commands.registerCommand('puku.chat.notebook.disableFollowCellExecution', () => {
            this.updateFollowContext(false);
        }));
    }
    updateFollowContext(value) {
        vscode.commands.executeCommand('setContext', NOTEBOOK_FOLLOW_IN_SESSION_KEY, value);
        this._notebookService.setFollowState(value);
    }
};
exports.NotebookFollowCommands = NotebookFollowCommands;
exports.NotebookFollowCommands = NotebookFollowCommands = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, notebookService_1.INotebookService)
], NotebookFollowCommands);
//# sourceMappingURL=followActions.js.map