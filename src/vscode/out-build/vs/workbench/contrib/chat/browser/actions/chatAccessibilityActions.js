/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { alert } from '../../../../../base/browser/ui/aria/aria.js';
import { localize } from '../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IChatWidgetService } from '../chat.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { isResponseVM } from '../../common/chatViewModel.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../../platform/accessibility/common/accessibility.js';
export const ACTION_ID_FOCUS_CHAT_CONFIRMATION = 'workbench.action.chat.focusConfirmation';
class AnnounceChatConfirmationAction extends Action2 {
    constructor() {
        super({
            id: ACTION_ID_FOCUS_CHAT_CONFIRMATION,
            title: { value: localize(4991, null), original: 'Focus Chat Confirmation' },
            category: { value: localize(4992, null), original: 'Chat' },
            precondition: ChatContextKeys.enabled,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */ | 1024 /* KeyMod.Shift */,
                when: CONTEXT_ACCESSIBILITY_MODE_ENABLED
            }
        });
    }
    async run(accessor) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const lastFocusedWidget = chatWidgetService.lastFocusedWidget;
        if (!lastFocusedWidget) {
            alert(localize(4993, null));
            return;
        }
        const viewModel = lastFocusedWidget.viewModel;
        if (!viewModel) {
            alert(localize(4994, null));
            return;
        }
        // Check for active confirmations in the chat responses
        let firstConfirmationElement;
        const lastResponse = viewModel.getItems()[viewModel.getItems().length - 1];
        if (isResponseVM(lastResponse)) {
            // eslint-disable-next-line no-restricted-syntax
            const confirmationWidgets = lastFocusedWidget.domNode.querySelectorAll('.chat-confirmation-widget-container');
            if (confirmationWidgets.length > 0) {
                firstConfirmationElement = confirmationWidgets[0];
            }
        }
        if (firstConfirmationElement) {
            firstConfirmationElement.focus();
        }
        else {
            alert(localize(4995, null));
        }
    }
}
export function registerChatAccessibilityActions() {
    registerAction2(AnnounceChatConfirmationAction);
}
//# sourceMappingURL=chatAccessibilityActions.js.map