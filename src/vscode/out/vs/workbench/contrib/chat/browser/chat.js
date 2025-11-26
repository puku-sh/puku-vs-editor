/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { CHAT_PROVIDER_ID } from '../common/chatParticipantContribTypes.js';
export const IChatWidgetService = createDecorator('chatWidgetService');
export const ChatViewPaneTarget = Symbol('ChatViewPaneTarget');
export const IQuickChatService = createDecorator('quickChatService');
export const IChatAccessibilityService = createDecorator('chatAccessibilityService');
export function isIChatViewViewContext(context) {
    return typeof context.viewId === 'string';
}
export function isIChatResourceViewContext(context) {
    return !isIChatViewViewContext(context);
}
export const IChatCodeBlockContextProviderService = createDecorator('chatCodeBlockContextProviderService');
export const ChatViewId = `workbench.panel.chat.view.${CHAT_PROVIDER_ID}`;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBV2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQU03RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQVU1RSxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLG1CQUFtQixDQUFDLENBQUM7QUF1QzNGLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBRS9ELE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLGVBQWUsQ0FBb0Isa0JBQWtCLENBQUMsQ0FBQztBQThCeEYsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsZUFBZSxDQUE0QiwwQkFBMEIsQ0FBQyxDQUFDO0FBZ0ZoSCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsT0FBK0I7SUFDckUsT0FBTyxPQUFRLE9BQWdDLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQztBQUNyRSxDQUFDO0FBT0QsTUFBTSxVQUFVLDBCQUEwQixDQUFDLE9BQStCO0lBQ3pFLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBNEVELE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLGVBQWUsQ0FBdUMscUNBQXFDLENBQUMsQ0FBQztBQU9qSixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsNkJBQTZCLGdCQUFnQixFQUFFLENBQUMifQ==