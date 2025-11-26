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
import * as dom from '../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { toDisposable } from '../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../nls.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IExtensionManagementService } from '../../../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { ChatContextKeys } from '../../../common/chatContextKeys.js';
import { IChatToolInvocation } from '../../../common/chatService.js';
import { CancelChatActionId } from '../../actions/chatExecuteActions.js';
import { AcceptToolConfirmationActionId } from '../../actions/chatToolActions.js';
import { IChatWidgetService } from '../../chat.js';
import { ChatConfirmationWidget } from '../chatConfirmationWidget.js';
import { ChatExtensionsContentPart } from '../chatExtensionsContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
let ExtensionsInstallConfirmationWidgetSubPart = class ExtensionsInstallConfirmationWidgetSubPart extends BaseChatToolInvocationSubPart {
    get codeblocks() {
        return this._confirmWidget?.codeblocks || [];
    }
    get codeblocksPartId() {
        return this._confirmWidget?.codeblocksPartId || '<none>';
    }
    constructor(toolInvocation, context, keybindingService, contextKeyService, chatWidgetService, extensionManagementService, instantiationService) {
        super(toolInvocation);
        if (toolInvocation.toolSpecificData?.kind !== 'extensions') {
            throw new Error('Tool specific data is missing or not of kind extensions');
        }
        const extensionsContent = toolInvocation.toolSpecificData;
        this.domNode = dom.$('');
        const chatExtensionsContentPart = this._register(instantiationService.createInstance(ChatExtensionsContentPart, extensionsContent));
        this._register(chatExtensionsContentPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        dom.append(this.domNode, chatExtensionsContentPart.domNode);
        if (toolInvocation.state.get().type === 0 /* IChatToolInvocation.StateKind.WaitingForConfirmation */) {
            const allowLabel = localize(5606, null);
            const allowKeybinding = keybindingService.lookupKeybinding(AcceptToolConfirmationActionId)?.getLabel();
            const allowTooltip = allowKeybinding ? `${allowLabel} (${allowKeybinding})` : allowLabel;
            const cancelLabel = localize(5607, null);
            const cancelKeybinding = keybindingService.lookupKeybinding(CancelChatActionId)?.getLabel();
            const cancelTooltip = cancelKeybinding ? `${cancelLabel} (${cancelKeybinding})` : cancelLabel;
            const enableAllowButtonEvent = this._register(new Emitter());
            const buttons = [
                {
                    label: allowLabel,
                    data: { type: 4 /* ToolConfirmKind.UserAction */ },
                    tooltip: allowTooltip,
                    disabled: true,
                    onDidChangeDisablement: enableAllowButtonEvent.event
                },
                {
                    label: cancelLabel,
                    data: { type: 0 /* ToolConfirmKind.Denied */ },
                    isSecondary: true,
                    tooltip: cancelTooltip
                }
            ];
            const confirmWidget = this._register(instantiationService.createInstance((ChatConfirmationWidget), context, {
                title: toolInvocation.confirmationMessages?.title ?? localize(5608, null),
                message: toolInvocation.confirmationMessages?.message ?? localize(5609, null),
                buttons,
            }));
            this._confirmWidget = confirmWidget;
            this._register(confirmWidget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
            dom.append(this.domNode, confirmWidget.domNode);
            this._register(confirmWidget.onDidClick(button => {
                IChatToolInvocation.confirmWith(toolInvocation, button.data);
                chatWidgetService.getWidgetBySessionResource(context.element.sessionResource)?.focusInput();
            }));
            const hasToolConfirmationKey = ChatContextKeys.Editing.hasToolConfirmation.bindTo(contextKeyService);
            hasToolConfirmationKey.set(true);
            this._register(toDisposable(() => hasToolConfirmationKey.reset()));
            const disposable = this._register(extensionManagementService.onInstallExtension(e => {
                if (extensionsContent.extensions.some(id => areSameExtensions({ id }, e.identifier))) {
                    disposable.dispose();
                    enableAllowButtonEvent.fire(false);
                }
            }));
        }
    }
};
ExtensionsInstallConfirmationWidgetSubPart = __decorate([
    __param(2, IKeybindingService),
    __param(3, IContextKeyService),
    __param(4, IChatWidgetService),
    __param(5, IExtensionManagementService),
    __param(6, IInstantiationService)
], ExtensionsInstallConfirmationWidgetSubPart);
export { ExtensionsInstallConfirmationWidgetSubPart };
//# sourceMappingURL=chatExtensionsInstallToolSubPart.js.map