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
import { toAction } from '../../../../base/common/actions.js';
import { CopyPasteController, pasteAsPreferenceConfig } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { DropIntoEditorController, dropAsPreferenceConfig } from '../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import { localize } from '../../../../nls.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
let DropOrPasteIntoCommands = class DropOrPasteIntoCommands {
    static { this.ID = 'workbench.contrib.dropOrPasteInto'; }
    constructor(_preferencesService) {
        this._preferencesService = _preferencesService;
        CopyPasteController.setConfigureDefaultAction(toAction({
            id: 'workbench.action.configurePreferredPasteAction',
            label: localize(7778, null),
            run: () => this.configurePreferredPasteAction()
        }));
        DropIntoEditorController.setConfigureDefaultAction(toAction({
            id: 'workbench.action.configurePreferredDropAction',
            label: localize(7779, null),
            run: () => this.configurePreferredDropAction()
        }));
    }
    configurePreferredPasteAction() {
        return this._preferencesService.openUserSettings({
            jsonEditor: true,
            revealSetting: { key: pasteAsPreferenceConfig, edit: true }
        });
    }
    configurePreferredDropAction() {
        return this._preferencesService.openUserSettings({
            jsonEditor: true,
            revealSetting: { key: dropAsPreferenceConfig, edit: true }
        });
    }
};
DropOrPasteIntoCommands = __decorate([
    __param(0, IPreferencesService)
], DropOrPasteIntoCommands);
export { DropOrPasteIntoCommands };
//# sourceMappingURL=commands.js.map