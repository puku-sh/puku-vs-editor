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
exports.DebugCommandsContribution = void 0;
const vscode = __importStar(require("vscode"));
const tasksService_1 = require("../../../platform/tasks/common/tasksService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const feedbackReporter_1 = require("../../conversation/vscode-node/feedbackReporter");
const conversationStore_1 = require("../../conversationStore/node/conversationStore");
const launchConfigService_1 = require("../../onboardDebug/common/launchConfigService");
const feedbackReporter_2 = require("../node/feedbackReporter");
let DebugCommandsContribution = class DebugCommandsContribution extends lifecycle_1.Disposable {
    constructor(_conversationStore, launchConfigService, feedbackReporter, tasksService) {
        super();
        this._conversationStore = _conversationStore;
        this.launchConfigService = launchConfigService;
        this.feedbackReporter = feedbackReporter;
        this.tasksService = tasksService;
        this._register(vscode.commands.registerCommand('puku.debug.generateSTest', async () => {
            if (!this.feedbackReporter.canReport) {
                return;
            }
            const lastTurn = this._conversationStore.lastConversation?.getLatestTurn();
            if (lastTurn) {
                const sTestValue = await (0, feedbackReporter_1.generateSTest)(lastTurn);
                if (sTestValue) {
                    vscode.env.clipboard.writeText(sTestValue.join('\n'));
                    vscode.window.showInformationMessage('STest copied to clipboard');
                }
            }
        }));
        const ensureTask = async (workspaceFolder, config) => {
            const wf = workspaceFolder || vscode.workspace.workspaceFolders?.[0].uri;
            if (!wf) {
                vscode.window.showErrorMessage((0, launchConfigService_1.needsWorkspaceFolderForTaskError)());
                return;
            }
            if (config.tasks?.length) {
                await this.tasksService.ensureTask(wf, config.tasks[0]);
            }
        };
        this._register(vscode.commands.registerCommand('puku.createLaunchJsonFileWithContents', async (launchConfig) => {
            // Define the path for the .vscode/launch.json file
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders?.length) {
                vscode.window.showErrorMessage('No workspace folder is open.');
                return;
            }
            await ensureTask(workspaceFolders[0].uri, launchConfig);
            await launchConfigService.add(workspaceFolders[0].uri, launchConfig);
            await launchConfigService.show(workspaceFolders[0].uri, launchConfig.configurations[0].name);
        }));
        this._register((vscode.commands.registerCommand('puku.startDebugging', async (config, progress) => {
            const result = await this.launchConfigService.resolveConfigurationInputs(config);
            if (result?.config) {
                await ensureTask(undefined, config);
                await this.launchConfigService.launch(result?.config);
                progress.progress(vscode.l10n.t('Started debugging {0}', result.config.name));
                return;
            }
            else {
                progress.markdown(vscode.l10n.t('Could not start debugging. Please try again.'));
                return;
            }
        })));
    }
};
exports.DebugCommandsContribution = DebugCommandsContribution;
exports.DebugCommandsContribution = DebugCommandsContribution = __decorate([
    __param(0, conversationStore_1.IConversationStore),
    __param(1, launchConfigService_1.ILaunchConfigService),
    __param(2, feedbackReporter_2.IFeedbackReporter),
    __param(3, tasksService_1.ITasksService)
], DebugCommandsContribution);
//# sourceMappingURL=debugCommands.js.map