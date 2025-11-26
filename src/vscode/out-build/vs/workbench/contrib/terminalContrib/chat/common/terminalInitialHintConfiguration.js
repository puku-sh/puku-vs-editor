/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalInitialHintSettingId;
(function (TerminalInitialHintSettingId) {
    TerminalInitialHintSettingId["Enabled"] = "terminal.integrated.initialHint";
})(TerminalInitialHintSettingId || (TerminalInitialHintSettingId = {}));
export const terminalInitialHintConfiguration = {
    ["terminal.integrated.initialHint" /* TerminalInitialHintSettingId.Enabled */]: {
        restricted: true,
        markdownDescription: localize(13106, null),
        type: 'boolean',
        default: true
    }
};
//# sourceMappingURL=terminalInitialHintConfiguration.js.map