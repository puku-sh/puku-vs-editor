"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.notify = notify;
const vscode_1 = require("vscode");
const extensionContext_1 = require("../../../../../../platform/extContext/common/extensionContext");
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const notificationSender_1 = require("../../../lib/src/notificationSender");
const constants_1 = require("../../../lib/src/snippy/constants");
const telemetryHandlers_1 = require("../../../lib/src/snippy/telemetryHandlers");
const matchCodeMessage = 'We found a reference to public code in a recent suggestion. To learn more about public code references, review the [documentation](https://aka.ms/github-copilot-match-public-code).';
const MatchAction = 'View reference';
const SettingAction = 'Change setting';
const CodeReferenceKey = 'codeReference.notified';
/**
 * Displays a toast notification when the first code reference is found.
 * The user will only ever see a single notification of this behavior.
 * Displays the output panel on notification ack.
 */
function notify(accessor) {
    const extension = accessor.get(extensionContext_1.IVSCodeExtensionContext);
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    const didNotify = extension.globalState.get(CodeReferenceKey);
    if (didNotify) {
        return;
    }
    const notificationSender = accessor.get(notificationSender_1.ICompletionsNotificationSender);
    const messageItems = [{ title: MatchAction }, { title: SettingAction }];
    void notificationSender.showWarningMessage(matchCodeMessage, ...messageItems).then(async (action) => {
        const event = { instantiationService, actor: 'user' };
        switch (action?.title) {
            case MatchAction: {
                telemetryHandlers_1.matchNotificationTelemetry.handleDoAction(event);
                await vscode_1.commands.executeCommand(constants_1.OutputPaneShowCommand);
                break;
            }
            case SettingAction: {
                await vscode_1.env.openExternal(vscode_1.Uri.parse('https://aka.ms/github-copilot-settings'));
                break;
            }
            case undefined: {
                telemetryHandlers_1.matchNotificationTelemetry.handleDismiss(event);
                break;
            }
        }
    });
    return extension.globalState.update(CodeReferenceKey, true);
}
//# sourceMappingURL=matchNotifier.js.map