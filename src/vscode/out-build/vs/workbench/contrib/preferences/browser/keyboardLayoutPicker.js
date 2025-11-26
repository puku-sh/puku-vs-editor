/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as nls from '../../../../nls.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { parseKeyboardLayoutDescription, areKeyboardLayoutsEqual, getKeyboardLayoutId, IKeyboardLayoutService } from '../../../../platform/keyboardLayout/common/keyboardLayout.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { KEYBOARD_LAYOUT_OPEN_PICKER } from '../common/preferences.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
let KeyboardLayoutPickerContribution = class KeyboardLayoutPickerContribution extends Disposable {
    static { this.ID = 'workbench.contrib.keyboardLayoutPicker'; }
    constructor(keyboardLayoutService, statusbarService) {
        super();
        this.keyboardLayoutService = keyboardLayoutService;
        this.statusbarService = statusbarService;
        this.pickerElement = this._register(new MutableDisposable());
        const name = nls.localize(10780, null);
        const layout = this.keyboardLayoutService.getCurrentKeyboardLayout();
        if (layout) {
            const layoutInfo = parseKeyboardLayoutDescription(layout);
            const text = nls.localize(10781, null, layoutInfo.label);
            this.pickerElement.value = this.statusbarService.addEntry({
                name,
                text,
                ariaLabel: text,
                command: KEYBOARD_LAYOUT_OPEN_PICKER
            }, 'status.workbench.keyboardLayout', 1 /* StatusbarAlignment.RIGHT */);
        }
        this._register(this.keyboardLayoutService.onDidChangeKeyboardLayout(() => {
            const layout = this.keyboardLayoutService.getCurrentKeyboardLayout();
            const layoutInfo = parseKeyboardLayoutDescription(layout);
            if (this.pickerElement.value) {
                const text = nls.localize(10782, null, layoutInfo.label);
                this.pickerElement.value.update({
                    name,
                    text,
                    ariaLabel: text,
                    command: KEYBOARD_LAYOUT_OPEN_PICKER
                });
            }
            else {
                const text = nls.localize(10783, null, layoutInfo.label);
                this.pickerElement.value = this.statusbarService.addEntry({
                    name,
                    text,
                    ariaLabel: text,
                    command: KEYBOARD_LAYOUT_OPEN_PICKER
                }, 'status.workbench.keyboardLayout', 1 /* StatusbarAlignment.RIGHT */);
            }
        }));
    }
};
KeyboardLayoutPickerContribution = __decorate([
    __param(0, IKeyboardLayoutService),
    __param(1, IStatusbarService)
], KeyboardLayoutPickerContribution);
export { KeyboardLayoutPickerContribution };
registerWorkbenchContribution2(KeyboardLayoutPickerContribution.ID, KeyboardLayoutPickerContribution, 1 /* WorkbenchPhase.BlockStartup */);
const DEFAULT_CONTENT = [
    `// ${nls.localize(10784, null)}`,
    `// ${nls.localize(10785, null)}`,
    ``,
    `// Once you have the keyboard layout info, please paste it below.`,
    '\n'
].join('\n');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: KEYBOARD_LAYOUT_OPEN_PICKER,
            title: nls.localize2(10791, "Change Keyboard Layout"),
            f1: true
        });
    }
    async run(accessor) {
        const keyboardLayoutService = accessor.get(IKeyboardLayoutService);
        const quickInputService = accessor.get(IQuickInputService);
        const configurationService = accessor.get(IConfigurationService);
        const environmentService = accessor.get(IEnvironmentService);
        const editorService = accessor.get(IEditorService);
        const fileService = accessor.get(IFileService);
        const layouts = keyboardLayoutService.getAllKeyboardLayouts();
        const currentLayout = keyboardLayoutService.getCurrentKeyboardLayout();
        const layoutConfig = configurationService.getValue('keyboard.layout');
        const isAutoDetect = layoutConfig === 'autodetect';
        const picks = layouts.map(layout => {
            const picked = !isAutoDetect && areKeyboardLayoutsEqual(currentLayout, layout);
            const layoutInfo = parseKeyboardLayoutDescription(layout);
            return {
                layout: layout,
                label: [layoutInfo.label, (layout && layout.isUserKeyboardLayout) ? '(User configured layout)' : ''].join(' '),
                id: layout.text || layout.lang || layout.layout,
                description: layoutInfo.description + (picked ? ' (Current layout)' : ''),
                picked: !isAutoDetect && areKeyboardLayoutsEqual(currentLayout, layout)
            };
        }).sort((a, b) => {
            return a.label < b.label ? -1 : (a.label > b.label ? 1 : 0);
        });
        if (picks.length > 0) {
            const platform = isMacintosh ? 'Mac' : isWindows ? 'Win' : 'Linux';
            picks.unshift({ type: 'separator', label: nls.localize(10786, null, platform) });
        }
        const configureKeyboardLayout = { label: nls.localize(10787, null) };
        picks.unshift(configureKeyboardLayout);
        // Offer to "Auto Detect"
        const autoDetectMode = {
            label: nls.localize(10788, null),
            description: isAutoDetect ? `Current: ${parseKeyboardLayoutDescription(currentLayout).label}` : undefined,
            picked: isAutoDetect ? true : undefined
        };
        picks.unshift(autoDetectMode);
        const pick = await quickInputService.pick(picks, { placeHolder: nls.localize(10789, null), matchOnDescription: true });
        if (!pick) {
            return;
        }
        if (pick === autoDetectMode) {
            // set keymap service to auto mode
            configurationService.updateValue('keyboard.layout', 'autodetect');
            return;
        }
        if (pick === configureKeyboardLayout) {
            const file = environmentService.keyboardLayoutResource;
            await fileService.stat(file).then(undefined, () => {
                return fileService.createFile(file, VSBuffer.fromString(DEFAULT_CONTENT));
            }).then((stat) => {
                if (!stat) {
                    return undefined;
                }
                return editorService.openEditor({
                    resource: stat.resource,
                    languageId: 'jsonc',
                    options: { pinned: true }
                });
            }, (error) => {
                throw new Error(nls.localize(10790, null, file.toString(), error));
            });
            return Promise.resolve();
        }
        configurationService.updateValue('keyboard.layout', getKeyboardLayoutId(pick.layout));
    }
});
//# sourceMappingURL=keyboardLayoutPicker.js.map