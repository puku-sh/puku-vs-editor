/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var FocusMode;
(function (FocusMode) {
    /**
     * (Default) Transfer focus to the target window
     * when the editor is focused.
     */
    FocusMode[FocusMode["Transfer"] = 0] = "Transfer";
    /**
     * Transfer focus to the target window when the
     * editor is focused, otherwise notify the user that
     * the app has activity (macOS/Windows only).
     */
    FocusMode[FocusMode["Notify"] = 1] = "Notify";
    /**
     * Force the window to be focused, even if the editor
     * is not currently focused.
     */
    FocusMode[FocusMode["Force"] = 2] = "Force";
})(FocusMode || (FocusMode = {}));
export const INativeHostService = createDecorator('nativeHostService');
//# sourceMappingURL=native.js.map