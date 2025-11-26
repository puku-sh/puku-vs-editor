/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalCommandGuideSettingId;
(function (TerminalCommandGuideSettingId) {
    TerminalCommandGuideSettingId["ShowCommandGuide"] = "terminal.integrated.shellIntegration.showCommandGuide";
})(TerminalCommandGuideSettingId || (TerminalCommandGuideSettingId = {}));
export const terminalCommandGuideConfigSection = 'terminal.integrated.shellIntegration';
export const terminalCommandGuideConfiguration = {
    ["terminal.integrated.shellIntegration.showCommandGuide" /* TerminalCommandGuideSettingId.ShowCommandGuide */]: {
        restricted: true,
        markdownDescription: localize(13250, null),
        type: 'boolean',
        default: true,
    },
};
//# sourceMappingURL=terminalCommandGuideConfiguration.js.map