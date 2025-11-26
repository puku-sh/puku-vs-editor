/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { decodeKeybinding } from '../../../../base/common/keybindings.js';
import { USLayoutResolvedKeybinding } from '../../common/usLayoutResolvedKeybinding.js';
export function createUSLayoutResolvedKeybinding(encodedKeybinding, OS) {
    if (encodedKeybinding === 0) {
        return undefined;
    }
    const keybinding = decodeKeybinding(encodedKeybinding, OS);
    if (!keybinding) {
        return undefined;
    }
    const result = USLayoutResolvedKeybinding.resolveKeybinding(keybinding, OS);
    if (result.length > 0) {
        return result[0];
    }
    return undefined;
}
//# sourceMappingURL=keybindingsTestUtils.js.map