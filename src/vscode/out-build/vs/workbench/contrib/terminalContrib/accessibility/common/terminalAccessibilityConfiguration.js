/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalAccessibilitySettingId;
(function (TerminalAccessibilitySettingId) {
    TerminalAccessibilitySettingId["AccessibleViewPreserveCursorPosition"] = "terminal.integrated.accessibleViewPreserveCursorPosition";
    TerminalAccessibilitySettingId["AccessibleViewFocusOnCommandExecution"] = "terminal.integrated.accessibleViewFocusOnCommandExecution";
})(TerminalAccessibilitySettingId || (TerminalAccessibilitySettingId = {}));
export const terminalAccessibilityConfiguration = {
    ["terminal.integrated.accessibleViewPreserveCursorPosition" /* TerminalAccessibilitySettingId.AccessibleViewPreserveCursorPosition */]: {
        markdownDescription: localize(13052, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.accessibleViewFocusOnCommandExecution" /* TerminalAccessibilitySettingId.AccessibleViewFocusOnCommandExecution */]: {
        markdownDescription: localize(13053, null),
        type: 'boolean',
        default: false
    },
};
//# sourceMappingURL=terminalAccessibilityConfiguration.js.map