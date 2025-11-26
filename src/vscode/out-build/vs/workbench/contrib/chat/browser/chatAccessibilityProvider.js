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
import { marked } from '../../../../base/common/marked/marked.js';
import { isDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IAccessibleViewService } from '../../../../platform/accessibility/browser/accessibleView.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { migrateLegacyTerminalToolSpecificData } from '../common/chat.js';
import { isRequestVM, isResponseVM } from '../common/chatViewModel.js';
import { toolContentToA11yString } from '../common/languageModelToolsService.js';
import { CancelChatActionId } from './actions/chatExecuteActions.js';
import { AcceptToolConfirmationActionId } from './actions/chatToolActions.js';
export const getToolConfirmationAlert = (accessor, toolInvocation) => {
    const keybindingService = accessor.get(IKeybindingService);
    const contextKeyService = accessor.get(IContextKeyService);
    const acceptKb = keybindingService.lookupKeybinding(AcceptToolConfirmationActionId, contextKeyService)?.getAriaLabel();
    const cancelKb = keybindingService.lookupKeybinding(CancelChatActionId, contextKeyService)?.getAriaLabel();
    const text = toolInvocation.map(v => {
        const state = v.state.get();
        if (state.type === 2 /* IChatToolInvocation.StateKind.WaitingForPostApproval */) {
            return {
                title: localize(5456, null),
                detail: toolContentToA11yString(state.contentForModel),
            };
        }
        if (!(v.confirmationMessages?.message && state.type === 0 /* IChatToolInvocation.StateKind.WaitingForConfirmation */)) {
            return;
        }
        let input = '';
        if (v.toolSpecificData) {
            if (v.toolSpecificData.kind === 'terminal') {
                const terminalData = migrateLegacyTerminalToolSpecificData(v.toolSpecificData);
                input = terminalData.commandLine.toolEdited ?? terminalData.commandLine.original;
            }
            else if (v.toolSpecificData.kind === 'extensions') {
                input = JSON.stringify(v.toolSpecificData.extensions);
            }
            else if (v.toolSpecificData.kind === 'input') {
                input = JSON.stringify(v.toolSpecificData.rawInput);
            }
        }
        const titleObj = v.confirmationMessages?.title;
        const title = typeof titleObj === 'string' ? titleObj : titleObj?.value || '';
        return {
            title: (title + (input ? ': ' + input : '')).trim(),
            detail: undefined,
        };
    }).filter(isDefined);
    let message = acceptKb && cancelKb
        ? localize(5457, null, text.map(t => t.title).join(', '), acceptKb, cancelKb)
        : localize(5458, null, text.map(t => t.title).join(', '));
    if (text.some(t => t.detail)) {
        message += ' ' + localize(5459, null, text.map(t => t.detail ? t.detail : '').join(' '));
    }
    return message;
};
let ChatAccessibilityProvider = class ChatAccessibilityProvider {
    constructor(_accessibleViewService, _instantiationService) {
        this._accessibleViewService = _accessibleViewService;
        this._instantiationService = _instantiationService;
    }
    getWidgetRole() {
        return 'list';
    }
    getRole(element) {
        return 'listitem';
    }
    getWidgetAriaLabel() {
        return localize(5460, null);
    }
    getAriaLabel(element) {
        if (isRequestVM(element)) {
            return element.messageText;
        }
        if (isResponseVM(element)) {
            return this._getLabelWithInfo(element);
        }
        return '';
    }
    _getLabelWithInfo(element) {
        const accessibleViewHint = this._accessibleViewService.getOpenAriaHint("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */);
        let label = '';
        const toolInvocation = element.response.value.filter(v => v.kind === 'toolInvocation');
        let toolInvocationHint = '';
        if (toolInvocation.length) {
            const waitingForConfirmation = toolInvocation.filter(v => {
                const state = v.state.get().type;
                return state === 0 /* IChatToolInvocation.StateKind.WaitingForConfirmation */ || state === 2 /* IChatToolInvocation.StateKind.WaitingForPostApproval */;
            });
            if (waitingForConfirmation.length) {
                toolInvocationHint = this._instantiationService.invokeFunction(getToolConfirmationAlert, toolInvocation);
            }
        }
        const tableCount = marked.lexer(element.response.toString()).filter(token => token.type === 'table')?.length ?? 0;
        let tableCountHint = '';
        switch (tableCount) {
            case 0:
                break;
            case 1:
                tableCountHint = localize(5461, null);
                break;
            default:
                tableCountHint = localize(5462, null, tableCount);
                break;
        }
        const fileTreeCount = element.response.value.filter(v => v.kind === 'treeData').length ?? 0;
        let fileTreeCountHint = '';
        switch (fileTreeCount) {
            case 0:
                break;
            case 1:
                fileTreeCountHint = localize(5463, null);
                break;
            default:
                fileTreeCountHint = localize(5464, null, fileTreeCount);
                break;
        }
        const elicitationCount = element.response.value.filter(v => v.kind === 'elicitation2' || v.kind === 'elicitationSerialized');
        let elicitationHint = '';
        for (const elicitation of elicitationCount) {
            const title = typeof elicitation.title === 'string' ? elicitation.title : elicitation.title.value;
            const message = typeof elicitation.message === 'string' ? elicitation.message : elicitation.message.value;
            elicitationHint += title + ' ' + message;
        }
        const codeBlockCount = marked.lexer(element.response.toString()).filter(token => token.type === 'code')?.length ?? 0;
        switch (codeBlockCount) {
            case 0:
                label = accessibleViewHint
                    ? localize(5465, null, toolInvocationHint, fileTreeCountHint, elicitationHint, tableCountHint, element.response.toString(), accessibleViewHint)
                    : localize(5466, null, fileTreeCountHint, elicitationHint, tableCountHint, element.response.toString());
                break;
            case 1:
                label = accessibleViewHint
                    ? localize(5467, null, toolInvocationHint, fileTreeCountHint, elicitationHint, tableCountHint, element.response.toString(), accessibleViewHint)
                    : localize(5468, null, fileTreeCountHint, elicitationHint, tableCountHint, element.response.toString());
                break;
            default:
                label = accessibleViewHint
                    ? localize(5469, null, toolInvocationHint, fileTreeCountHint, elicitationHint, tableCountHint, codeBlockCount, element.response.toString(), accessibleViewHint)
                    : localize(5470, null, fileTreeCountHint, elicitationHint, codeBlockCount, tableCountHint, element.response.toString());
                break;
        }
        return label;
    }
};
ChatAccessibilityProvider = __decorate([
    __param(0, IAccessibleViewService),
    __param(1, IInstantiationService)
], ChatAccessibilityProvider);
export { ChatAccessibilityProvider };
//# sourceMappingURL=chatAccessibilityProvider.js.map