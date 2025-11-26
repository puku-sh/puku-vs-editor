/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import * as nls from '../../../../../nls.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
const ChatManagementEditorIcon = registerIcon('ai-management-editor-label-icon', Codicon.copilot, nls.localize(5846, null));
const ModelsManagementEditorIcon = registerIcon('models-management-editor-label-icon', Codicon.settings, nls.localize(5847, null));
export const CHAT_MANAGEMENT_SECTION_USAGE = 'usage';
export const CHAT_MANAGEMENT_SECTION_MODELS = 'models';
export class ChatManagementEditorInput extends EditorInput {
    static { this.ID = 'workbench.input.chatManagement'; }
    constructor() {
        super();
        this.resource = undefined;
    }
    matches(otherInput) {
        return super.matches(otherInput) || otherInput instanceof ChatManagementEditorInput;
    }
    get typeId() {
        return ChatManagementEditorInput.ID;
    }
    getName() {
        return nls.localize(5848, null);
    }
    getIcon() {
        return ChatManagementEditorIcon;
    }
    async resolve() {
        return null;
    }
}
export class ModelsManagementEditorInput extends EditorInput {
    static { this.ID = 'workbench.input.modelsManagement'; }
    constructor() {
        super();
        this.resource = undefined;
    }
    matches(otherInput) {
        return super.matches(otherInput) || otherInput instanceof ModelsManagementEditorInput;
    }
    get typeId() {
        return ModelsManagementEditorInput.ID;
    }
    getName() {
        return nls.localize(5849, null);
    }
    getIcon() {
        return ModelsManagementEditorIcon;
    }
    async resolve() {
        return null;
    }
}
//# sourceMappingURL=chatManagementEditorInput.js.map