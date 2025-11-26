/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh } from '../../../../../base/common/platform.js';
import { localize } from '../../../../../nls.js';
export var TerminalZoomCommandId;
(function (TerminalZoomCommandId) {
    TerminalZoomCommandId["FontZoomIn"] = "workbench.action.terminal.fontZoomIn";
    TerminalZoomCommandId["FontZoomOut"] = "workbench.action.terminal.fontZoomOut";
    TerminalZoomCommandId["FontZoomReset"] = "workbench.action.terminal.fontZoomReset";
})(TerminalZoomCommandId || (TerminalZoomCommandId = {}));
export var TerminalZoomSettingId;
(function (TerminalZoomSettingId) {
    TerminalZoomSettingId["MouseWheelZoom"] = "terminal.integrated.mouseWheelZoom";
})(TerminalZoomSettingId || (TerminalZoomSettingId = {}));
export const terminalZoomConfiguration = {
    ["terminal.integrated.mouseWheelZoom" /* TerminalZoomSettingId.MouseWheelZoom */]: {
        markdownDescription: isMacintosh
            ? localize(13480, null)
            : localize(13481, null),
        type: 'boolean',
        default: false
    },
};
//# sourceMappingURL=terminal.zoom.js.map