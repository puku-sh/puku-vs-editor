"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const vscode_1 = require("vscode");
class NotificationService {
    async showInformationMessage(message, optionsOrItem, ...items) {
        if (typeof optionsOrItem === 'object' && optionsOrItem !== null && !Array.isArray(optionsOrItem)) {
            return vscode_1.window.showInformationMessage(message, optionsOrItem, ...items);
        }
        return vscode_1.window.showInformationMessage(message, optionsOrItem, ...items);
    }
    async withProgress(options, task) {
        return vscode_1.window.withProgress(options, task);
    }
    async showWarningMessage(message, ...items) {
        return vscode_1.window.showWarningMessage(message, ...items);
    }
    async showQuotaExceededDialog(options) {
        return vscode_1.commands.executeCommand(options.isNoAuthUser ? 'workbench.action.chat.triggerSetup' : 'workbench.action.chat.openQuotaExceededDialog');
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notificationServiceImpl.js.map