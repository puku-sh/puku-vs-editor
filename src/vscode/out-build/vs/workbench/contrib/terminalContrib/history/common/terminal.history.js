/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalHistoryCommandId;
(function (TerminalHistoryCommandId) {
    TerminalHistoryCommandId["ClearPreviousSessionHistory"] = "workbench.action.terminal.clearPreviousSessionHistory";
    TerminalHistoryCommandId["GoToRecentDirectory"] = "workbench.action.terminal.goToRecentDirectory";
    TerminalHistoryCommandId["RunRecentCommand"] = "workbench.action.terminal.runRecentCommand";
})(TerminalHistoryCommandId || (TerminalHistoryCommandId = {}));
export const defaultTerminalHistoryCommandsToSkipShell = [
    "workbench.action.terminal.goToRecentDirectory" /* TerminalHistoryCommandId.GoToRecentDirectory */,
    "workbench.action.terminal.runRecentCommand" /* TerminalHistoryCommandId.RunRecentCommand */
];
export var TerminalHistorySettingId;
(function (TerminalHistorySettingId) {
    TerminalHistorySettingId["ShellIntegrationCommandHistory"] = "terminal.integrated.shellIntegration.history";
})(TerminalHistorySettingId || (TerminalHistorySettingId = {}));
export const terminalHistoryConfiguration = {
    ["terminal.integrated.shellIntegration.history" /* TerminalHistorySettingId.ShellIntegrationCommandHistory */]: {
        restricted: true,
        markdownDescription: localize(13281, null),
        type: 'number',
        default: 100
    },
};
//# sourceMappingURL=terminal.history.js.map