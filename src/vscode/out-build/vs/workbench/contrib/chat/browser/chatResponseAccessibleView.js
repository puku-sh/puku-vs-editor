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
                    responseContent += localize(5944, null, toolInvocation.toolId) + toolContentToA11yString(state.contentForModel) + '\n';
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
//# sourceMappingURL=chatResponseAccessibleView.js.map