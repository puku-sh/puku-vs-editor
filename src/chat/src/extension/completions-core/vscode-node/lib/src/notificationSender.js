"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionNotificationSender = exports.ICompletionsNotificationSender = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_1 = require("vscode");
const services_1 = require("../../../../../util/common/services");
exports.ICompletionsNotificationSender = (0, services_1.createServiceIdentifier)('ICompletionsNotificationSender');
class ExtensionNotificationSender {
    async showWarningMessage(message, ...actions) {
        const response = await vscode_1.window.showWarningMessage(message, ...actions.map(action => action.title));
        if (response === undefined) {
            return;
        }
        return { title: response };
    }
}
exports.ExtensionNotificationSender = ExtensionNotificationSender;
//# sourceMappingURL=notificationSender.js.map