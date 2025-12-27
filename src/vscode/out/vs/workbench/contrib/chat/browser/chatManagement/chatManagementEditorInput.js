/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import * as nls from '../../../../../nls.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
const ChatManagementEditorIcon = registerIcon('ai-management-editor-label-icon', Codicon.copilot, nls.localize('aiManagementEditorLabelIcon', 'Icon of the AI Management editor label.'));
const ModelsManagementEditorIcon = registerIcon('models-management-editor-label-icon', Codicon.settings, nls.localize('modelsManagementEditorLabelIcon', 'Icon of the Models Management editor label.'));
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
        return nls.localize('aiManagementEditorInputName', "Manage Copilot");
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
        return nls.localize('modelsManagementEditorInputName', "Language Models");
    }
    getIcon() {
        return ModelsManagementEditorIcon;
    }
    async resolve() {
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hbmFnZW1lbnRFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0TWFuYWdlbWVudC9jaGF0TWFuYWdlbWVudEVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFDO0FBQzdDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVwRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFdkUsTUFBTSx3QkFBd0IsR0FBRyxZQUFZLENBQUMsaUNBQWlDLEVBQUUsT0FBTyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDZCQUE2QixFQUFFLHlDQUF5QyxDQUFDLENBQUMsQ0FBQztBQUMxTCxNQUFNLDBCQUEwQixHQUFHLFlBQVksQ0FBQyxxQ0FBcUMsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsNkNBQTZDLENBQUMsQ0FBQyxDQUFDO0FBRXpNLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLE9BQU8sQ0FBQztBQUNyRCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxRQUFRLENBQUM7QUFFdkQsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFdBQVc7YUFFekMsT0FBRSxHQUFXLGdDQUFnQyxBQUEzQyxDQUE0QztJQUk5RDtRQUNDLEtBQUssRUFBRSxDQUFDO1FBSEEsYUFBUSxHQUFHLFNBQVMsQ0FBQztJQUk5QixDQUFDO0lBRVEsT0FBTyxDQUFDLFVBQTZDO1FBQzdELE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxVQUFVLFlBQVkseUJBQXlCLENBQUM7SUFDckYsQ0FBQztJQUVELElBQWEsTUFBTTtRQUNsQixPQUFPLHlCQUF5QixDQUFDLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyx3QkFBd0IsQ0FBQztJQUNqQyxDQUFDO0lBRVEsS0FBSyxDQUFDLE9BQU87UUFDckIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDOztBQUdGLE1BQU0sT0FBTywyQkFBNEIsU0FBUSxXQUFXO2FBRTNDLE9BQUUsR0FBVyxrQ0FBa0MsQUFBN0MsQ0FBOEM7SUFJaEU7UUFDQyxLQUFLLEVBQUUsQ0FBQztRQUhBLGFBQVEsR0FBRyxTQUFTLENBQUM7SUFJOUIsQ0FBQztJQUVRLE9BQU8sQ0FBQyxVQUE2QztRQUM3RCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksVUFBVSxZQUFZLDJCQUEyQixDQUFDO0lBQ3ZGLENBQUM7SUFFRCxJQUFhLE1BQU07UUFDbEIsT0FBTywyQkFBMkIsQ0FBQyxFQUFFLENBQUM7SUFDdkMsQ0FBQztJQUVRLE9BQU87UUFDZixPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8sMEJBQTBCLENBQUM7SUFDbkMsQ0FBQztJQUVRLEtBQUssQ0FBQyxPQUFPO1FBQ3JCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQyJ9