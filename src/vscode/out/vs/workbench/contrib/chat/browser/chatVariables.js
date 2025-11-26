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
import { IChatWidgetService } from './chat.js';
import { ChatDynamicVariableModel } from './contrib/chatDynamicVariables.js';
import { Range } from '../../../../editor/common/core/range.js';
let ChatVariablesService = class ChatVariablesService {
    constructor(chatWidgetService) {
        this.chatWidgetService = chatWidgetService;
    }
    getDynamicVariables(sessionResource) {
        // This is slightly wrong... the parser pulls dynamic references from the input widget, but there is no guarantee that message came from the input here.
        // Need to ...
        // - Parser takes list of dynamic references (annoying)
        // - Or the parser is known to implicitly act on the input widget, and we need to call it before calling the chat service (maybe incompatible with the future, but easy)
        const widget = this.chatWidgetService.getWidgetBySessionResource(sessionResource);
        if (!widget || !widget.viewModel || !widget.supportsFileReferences) {
            return [];
        }
        const model = widget.getContrib(ChatDynamicVariableModel.ID);
        if (!model) {
            return [];
        }
        if (widget.input.attachmentModel.attachments.length > 0 && widget.viewModel.editing) {
            const references = [];
            for (const attachment of widget.input.attachmentModel.attachments) {
                // If the attachment has a range, it is a dynamic variable
                if (attachment.range) {
                    const referenceObj = {
                        id: attachment.id,
                        fullName: attachment.name,
                        modelDescription: attachment.modelDescription,
                        range: new Range(1, attachment.range.start + 1, 1, attachment.range.endExclusive + 1),
                        icon: attachment.icon,
                        isFile: attachment.kind === 'file',
                        isDirectory: attachment.kind === 'directory',
                        data: attachment.value
                    };
                    references.push(referenceObj);
                }
            }
            return [...model.variables, ...references];
        }
        return model.variables;
    }
    getSelectedToolAndToolSets(sessionResource) {
        const widget = this.chatWidgetService.getWidgetBySessionResource(sessionResource);
        if (!widget) {
            return new Map();
        }
        return widget.input.selectedToolsModel.entriesMap.get();
    }
};
ChatVariablesService = __decorate([
    __param(0, IChatWidgetService)
], ChatVariablesService);
export { ChatVariablesService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZhcmlhYmxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0VmFyaWFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUMvQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHekQsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBb0I7SUFHaEMsWUFDc0MsaUJBQXFDO1FBQXJDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7SUFDdkUsQ0FBQztJQUVMLG1CQUFtQixDQUFDLGVBQW9CO1FBQ3ZDLHdKQUF3SjtRQUN4SixjQUFjO1FBQ2QsdURBQXVEO1FBQ3ZELHdLQUF3SztRQUN4SyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsMEJBQTBCLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbEYsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLElBQUksQ0FBQyxNQUFNLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUNwRSxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsVUFBVSxDQUEyQix3QkFBd0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN2RixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDckYsTUFBTSxVQUFVLEdBQXVCLEVBQUUsQ0FBQztZQUMxQyxLQUFLLE1BQU0sVUFBVSxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNuRSwwREFBMEQ7Z0JBQzFELElBQUksVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUN0QixNQUFNLFlBQVksR0FBcUI7d0JBQ3RDLEVBQUUsRUFBRSxVQUFVLENBQUMsRUFBRTt3QkFDakIsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO3dCQUN6QixnQkFBZ0IsRUFBRSxVQUFVLENBQUMsZ0JBQWdCO3dCQUM3QyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO3dCQUNyRixJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUk7d0JBQ3JCLE1BQU0sRUFBRSxVQUFVLENBQUMsSUFBSSxLQUFLLE1BQU07d0JBQ2xDLFdBQVcsRUFBRSxVQUFVLENBQUMsSUFBSSxLQUFLLFdBQVc7d0JBQzVDLElBQUksRUFBRSxVQUFVLENBQUMsS0FBSztxQkFDdEIsQ0FBQztvQkFDRixVQUFVLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUMvQixDQUFDO1lBQ0YsQ0FBQztZQUVELE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxVQUFVLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDO0lBQ3hCLENBQUM7SUFFRCwwQkFBMEIsQ0FBQyxlQUFvQjtRQUM5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsMEJBQTBCLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbEYsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBRXpELENBQUM7Q0FDRCxDQUFBO0FBdkRZLG9CQUFvQjtJQUk5QixXQUFBLGtCQUFrQixDQUFBO0dBSlIsb0JBQW9CLENBdURoQyJ9