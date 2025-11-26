/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
export const NullHoverService = {
    _serviceBrand: undefined,
    hideHover: () => undefined,
    showInstantHover: () => undefined,
    showDelayedHover: () => undefined,
    setupDelayedHover: () => Disposable.None,
    setupDelayedHoverAtMouse: () => Disposable.None,
    setupManagedHover: () => ({
        dispose: () => { },
        show: (focus) => { },
        hide: () => { },
        update: (tooltip, options) => { }
    }),
    showAndFocusLastHover: () => undefined,
    showManagedHover: () => undefined
};
//# sourceMappingURL=nullHoverService.js.map