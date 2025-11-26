/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var TerminalAccessibilityCommandId;
(function (TerminalAccessibilityCommandId) {
    TerminalAccessibilityCommandId["FocusAccessibleBuffer"] = "workbench.action.terminal.focusAccessibleBuffer";
    TerminalAccessibilityCommandId["AccessibleBufferGoToNextCommand"] = "workbench.action.terminal.accessibleBufferGoToNextCommand";
    TerminalAccessibilityCommandId["AccessibleBufferGoToPreviousCommand"] = "workbench.action.terminal.accessibleBufferGoToPreviousCommand";
    TerminalAccessibilityCommandId["ScrollToBottomAccessibleView"] = "workbench.action.terminal.scrollToBottomAccessibleView";
    TerminalAccessibilityCommandId["ScrollToTopAccessibleView"] = "workbench.action.terminal.scrollToTopAccessibleView";
})(TerminalAccessibilityCommandId || (TerminalAccessibilityCommandId = {}));
export const defaultTerminalAccessibilityCommandsToSkipShell = [
    "workbench.action.terminal.focusAccessibleBuffer" /* TerminalAccessibilityCommandId.FocusAccessibleBuffer */
];
//# sourceMappingURL=terminal.accessibility.js.map