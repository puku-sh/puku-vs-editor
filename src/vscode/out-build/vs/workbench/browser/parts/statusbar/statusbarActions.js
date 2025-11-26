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
import { localize, localize2 } from '../../../../nls.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { Action } from '../../../../base/common/actions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { StatusBarFocused } from '../../../common/contextkeys.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
export class ToggleStatusbarEntryVisibilityAction extends Action {
    constructor(id, label, model) {
        super(id, label, undefined, true);
        this.model = model;
        this.checked = !model.isHidden(id);
    }
    async run() {
        if (this.model.isHidden(this.id)) {
            this.model.show(this.id);
        }
        else {
            this.model.hide(this.id);
        }
    }
}
export class HideStatusbarEntryAction extends Action {
    constructor(id, name, model) {
        super(id, localize(4041, null, name), undefined, true);
        this.model = model;
    }
    async run() {
        this.model.hide(this.id);
    }
}
let ManageExtensionAction = class ManageExtensionAction extends Action {
    constructor(extensionId, commandService) {
        super('statusbar.manage.extension', localize(4042, null));
        this.extensionId = extensionId;
        this.commandService = commandService;
    }
    run() {
        return this.commandService.executeCommand('_extensions.manage', this.extensionId);
    }
};
ManageExtensionAction = __decorate([
    __param(1, ICommandService)
], ManageExtensionAction);
export { ManageExtensionAction };
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.statusBar.focusPrevious',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 15 /* KeyCode.LeftArrow */,
    secondary: [16 /* KeyCode.UpArrow */],
    when: StatusBarFocused,
    handler: (accessor) => {
        const statusBarService = accessor.get(IStatusbarService);
        statusBarService.focusPreviousEntry();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.statusBar.focusNext',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 17 /* KeyCode.RightArrow */,
    secondary: [18 /* KeyCode.DownArrow */],
    when: StatusBarFocused,
    handler: (accessor) => {
        const statusBarService = accessor.get(IStatusbarService);
        statusBarService.focusNextEntry();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.statusBar.focusFirst',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 14 /* KeyCode.Home */,
    when: StatusBarFocused,
    handler: (accessor) => {
        const statusBarService = accessor.get(IStatusbarService);
        statusBarService.focus(false);
        statusBarService.focusNextEntry();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.statusBar.focusLast',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 13 /* KeyCode.End */,
    when: StatusBarFocused,
    handler: (accessor) => {
        const statusBarService = accessor.get(IStatusbarService);
        statusBarService.focus(false);
        statusBarService.focusPreviousEntry();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.statusBar.clearFocus',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 9 /* KeyCode.Escape */,
    when: StatusBarFocused,
    handler: (accessor) => {
        const statusBarService = accessor.get(IStatusbarService);
        const editorService = accessor.get(IEditorService);
        if (statusBarService.isEntryFocused()) {
            statusBarService.focus(false);
        }
        else if (editorService.activeEditorPane) {
            editorService.activeEditorPane.focus();
        }
    }
});
class FocusStatusBarAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.focusStatusBar',
            title: localize2(4043, 'Focus Status Bar'),
            category: Categories.View,
            f1: true
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.focusPart("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, getActiveWindow());
    }
}
registerAction2(FocusStatusBarAction);
//# sourceMappingURL=statusbarActions.js.map