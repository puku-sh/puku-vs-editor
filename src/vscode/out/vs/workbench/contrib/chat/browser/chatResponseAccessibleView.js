/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { renderAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { isMarkdownString, MarkdownString } from '../../../../base/common/htmlContent.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { migrateLegacyTerminalToolSpecificData } from '../common/chat.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { IChatToolInvocation } from '../common/chatService.js';
import { isResponseVM } from '../common/chatViewModel.js';
import { toolContentToA11yString } from '../common/languageModelToolsService.js';
import { IChatWidgetService } from './chat.js';
export class ChatResponseAccessibleView {
    constructor() {
        this.priority = 100;
        this.name = 'panelChat';
        this.type = "view" /* AccessibleViewType.View */;
        this.when = ChatContextKeys.inChatSession;
    }
    getProvider(accessor) {
        const widgetService = accessor.get(IChatWidgetService);
        const widget = widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const chatInputFocused = widget.hasInputFocus();
        if (chatInputFocused) {
            widget.focusResponseItem();
        }
        const verifiedWidget = widget;
        const focusedItem = verifiedWidget.getFocus();
        if (!focusedItem) {
            return;
        }
        return new ChatResponseAccessibleProvider(verifiedWidget, focusedItem, chatInputFocused);
    }
}
class ChatResponseAccessibleProvider extends Disposable {
    constructor(_widget, item, _wasOpenedFromInput) {
        super();
        this._widget = _widget;
        this._wasOpenedFromInput = _wasOpenedFromInput;
        this.id = "panelChat" /* AccessibleViewProviderId.PanelChat */;
        this.verbositySettingKey = "accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */;
        this.options = { type: "view" /* AccessibleViewType.View */ };
        this._focusedItem = item;
    }
    provideContent() {
        return this._getContent(this._focusedItem);
    }
    _getContent(item) {
        let responseContent = isResponseVM(item) ? item.response.toString() : '';
        if (!responseContent && 'errorDetails' in item && item.errorDetails) {
            responseContent = item.errorDetails.message;
        }
        if (isResponseVM(item)) {
            item.response.value.filter(item => item.kind === 'elicitation2' || item.kind === 'elicitationSerialized').forEach(elicitation => {
                const title = elicitation.title;
                if (typeof title === 'string') {
                    responseContent += `${title}\n`;
                }
                else if (isMarkdownString(title)) {
                    responseContent += renderAsPlaintext(title, { includeCodeBlocksFences: true }) + '\n';
                }
                const message = elicitation.message;
                if (isMarkdownString(message)) {
                    responseContent += renderAsPlaintext(message, { includeCodeBlocksFences: true });
                }
                else {
                    responseContent += message;
                }
            });
            const toolInvocations = item.response.value.filter(item => item.kind === 'toolInvocation');
            for (const toolInvocation of toolInvocations) {
                const state = toolInvocation.state.get();
                if (toolInvocation.confirmationMessages?.title && state.type === 0 /* IChatToolInvocation.StateKind.WaitingForConfirmation */) {
                    const title = typeof toolInvocation.confirmationMessages.title === 'string' ? toolInvocation.confirmationMessages.title : toolInvocation.confirmationMessages.title.value;
                    const message = typeof toolInvocation.confirmationMessages.message === 'string' ? toolInvocation.confirmationMessages.message : stripIcons(renderAsPlaintext(toolInvocation.confirmationMessages.message));
                    let input = '';
                    if (toolInvocation.toolSpecificData) {
                        if (toolInvocation.toolSpecificData?.kind === 'terminal') {
                            const terminalData = migrateLegacyTerminalToolSpecificData(toolInvocation.toolSpecificData);
                            input = terminalData.commandLine.userEdited ?? terminalData.commandLine.toolEdited ?? terminalData.commandLine.original;
                        }
                        else {
                            input = toolInvocation.toolSpecificData?.kind === 'extensions'
                                ? JSON.stringify(toolInvocation.toolSpecificData.extensions)
                                : toolInvocation.toolSpecificData?.kind === 'todoList'
                                    ? JSON.stringify(toolInvocation.toolSpecificData.todoList)
                                    : toolInvocation.toolSpecificData?.kind === 'pullRequest'
                                        ? JSON.stringify(toolInvocation.toolSpecificData)
                                        : JSON.stringify(toolInvocation.toolSpecificData.rawInput);
                        }
                    }
                    responseContent += `${title}`;
                    if (input) {
                        responseContent += `: ${input}`;
                    }
                    responseContent += `\n${message}\n`;
                }
                else if (state.type === 2 /* IChatToolInvocation.StateKind.WaitingForPostApproval */) {
                    responseContent += localize('toolPostApprovalA11yView', "Approve results of {0}? Result: ", toolInvocation.toolId) + toolContentToA11yString(state.contentForModel) + '\n';
                }
                else {
                    const resultDetails = IChatToolInvocation.resultDetails(toolInvocation);
                    if (resultDetails && 'input' in resultDetails) {
                        responseContent += '\n' + (resultDetails.isError ? 'Errored ' : 'Completed ');
                        responseContent += `${`${typeof toolInvocation.invocationMessage === 'string' ? toolInvocation.invocationMessage : stripIcons(renderAsPlaintext(toolInvocation.invocationMessage))} with input: ${resultDetails.input}`}\n`;
                    }
                }
            }
            const pastConfirmations = item.response.value.filter(item => item.kind === 'toolInvocationSerialized');
            for (const pastConfirmation of pastConfirmations) {
                if (pastConfirmation.isComplete && pastConfirmation.resultDetails && 'input' in pastConfirmation.resultDetails) {
                    if (pastConfirmation.pastTenseMessage) {
                        responseContent += `\n${`${typeof pastConfirmation.pastTenseMessage === 'string' ? pastConfirmation.pastTenseMessage : stripIcons(renderAsPlaintext(pastConfirmation.pastTenseMessage))} with input: ${pastConfirmation.resultDetails.input}`}\n`;
                    }
                }
            }
        }
        return renderAsPlaintext(new MarkdownString(responseContent), { includeCodeBlocksFences: true });
    }
    onClose() {
        this._widget.reveal(this._focusedItem);
        if (this._wasOpenedFromInput) {
            this._widget.focusInput();
        }
        else {
            this._widget.focus(this._focusedItem);
        }
    }
    provideNextContent() {
        const next = this._widget.getSibling(this._focusedItem, 'next');
        if (next) {
            this._focusedItem = next;
            return this._getContent(next);
        }
        return;
    }
    providePreviousContent() {
        const previous = this._widget.getSibling(this._focusedItem, 'previous');
        if (previous) {
            this._focusedItem = previous;
            return this._getContent(previous);
        }
        return;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFJlc3BvbnNlQWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFJlc3BvbnNlQWNjZXNzaWJsZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDakYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBSzlDLE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDMUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakYsT0FBTyxFQUE2QixrQkFBa0IsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUUxRSxNQUFNLE9BQU8sMEJBQTBCO0lBQXZDO1FBQ1UsYUFBUSxHQUFHLEdBQUcsQ0FBQztRQUNmLFNBQUksR0FBRyxXQUFXLENBQUM7UUFDbkIsU0FBSSx3Q0FBMkI7UUFDL0IsU0FBSSxHQUFHLGVBQWUsQ0FBQyxhQUFhLENBQUM7SUFvQi9DLENBQUM7SUFuQkEs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