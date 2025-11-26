/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { InputMode } from '../../../../editor/common/inputMode.js';
export class ToggleOvertypeInsertMode extends Action2 {
    constructor() {
        super({
            id: 'editor.action.toggleOvertypeInsertMode',
            title: {
                ...localize2(6739, "Toggle Overtype/Insert Mode"),
                mnemonicTitle: localize(6738, null),
            },
            metadata: {
                description: localize2(6740, "Toggle between overtype and insert mode"),
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 19 /* KeyCode.Insert */,
                mac: { primary: 512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */ },
            },
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const oldInputMode = InputMode.getInputMode();
        const newInputMode = oldInputMode === 'insert' ? 'overtype' : 'insert';
        InputMode.setInputMode(newInputMode);
    }
}
registerAction2(ToggleOvertypeInsertMode);
//# sourceMappingURL=toggleOvertype.js.map