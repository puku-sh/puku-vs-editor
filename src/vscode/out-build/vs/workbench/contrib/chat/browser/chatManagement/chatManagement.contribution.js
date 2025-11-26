/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isObject, isString } from '../../../../../base/common/types.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ProductQualityContext } from '../../../../../platform/contextkey/common/contextkeys.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../../browser/editor.js';
import { EditorExtensions } from '../../../../common/editor.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { CONTEXT_MODELS_EDITOR, CONTEXT_MODELS_SEARCH_FOCUS, MANAGE_CHAT_COMMAND_ID } from '../../common/constants.js';
import { CHAT_CATEGORY } from '../actions/chatActions.js';
import { ChatManagementEditor, ModelsManagementEditor } from './chatManagementEditor.js';
import { ChatManagementEditorInput, ModelsManagementEditorInput } from './chatManagementEditorInput.js';
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(ChatManagementEditor, ChatManagementEditor.ID, localize(5824, null)), [
    new SyncDescriptor(ChatManagementEditorInput)
]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(ModelsManagementEditor, ModelsManagementEditor.ID, localize(5825, null)), [
    new SyncDescriptor(ModelsManagementEditorInput)
]);
class ChatManagementEditorInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(input) {
        return '';
    }
    deserialize(instantiationService) {
        return instantiationService.createInstance(ChatManagementEditorInput);
    }
}
class ModelsManagementEditorInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(input) {
        return '';
    }
    deserialize(instantiationService) {
        return instantiationService.createInstance(ModelsManagementEditorInput);
    }
}
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(ChatManagementEditorInput.ID, ChatManagementEditorInputSerializer);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(ModelsManagementEditorInput.ID, ModelsManagementEditorInputSerializer);
function sanitizeString(arg) {
    return isString(arg) ? arg : undefined;
}
function sanitizeOpenManageCopilotEditorArgs(input) {
    if (!isObject(input)) {
        input = {};
    }
    const args = input;
    return {
        query: sanitizeString(args?.query),
        section: sanitizeString(args?.section)
    };
}
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: MANAGE_CHAT_COMMAND_ID,
            title: localize2(5826, "Manage Language Models"),
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(ProductQualityContext.notEqualsTo('stable'), ChatContextKeys.enabled, ContextKeyExpr.or(ChatContextKeys.Entitlement.planFree, ChatContextKeys.Entitlement.planPro, ChatContextKeys.Entitlement.planProPlus, ChatContextKeys.Entitlement.internal)),
            f1: true,
        });
    }
    async run(accessor, args) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        args = sanitizeOpenManageCopilotEditorArgs(args);
        return editorGroupsService.activeGroup.openEditor(new ModelsManagementEditorInput(), { pinned: true });
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'chat.models.action.clearSearchResults',
            precondition: CONTEXT_MODELS_EDITOR,
            keybinding: {
                primary: 9 /* KeyCode.Escape */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: CONTEXT_MODELS_SEARCH_FOCUS
            },
            title: localize2(5827, "Clear Models Search Results")
        });
    }
    run(accessor) {
        const activeEditorPane = accessor.get(IEditorService).activeEditorPane;
        if (activeEditorPane instanceof ModelsManagementEditor) {
            activeEditorPane.clearSearch();
        }
        return null;
    }
});
//# sourceMappingURL=chatManagement.contribution.js.map