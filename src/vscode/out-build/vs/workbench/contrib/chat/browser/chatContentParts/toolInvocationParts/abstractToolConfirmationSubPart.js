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
import { Codicon } from '../../../../../../base/common/codicons.js';
import { toDisposable } from '../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../nls.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { ChatContextKeys } from '../../../common/chatContextKeys.js';
import { IChatToolInvocation } from '../../../common/chatService.js';
import { ILanguageModelToolsService } from '../../../common/languageModelToolsService.js';
import { IChatWidgetService } from '../../chat.js';
import { ChatCustomConfirmationWidget } from '../chatConfirmationWidget.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
/**
 * Base class for a tool confirmation.
 *
 * note that implementors MUST call render() after they construct.
 */
let AbstractToolConfirmationSubPart = class AbstractToolConfirmationSubPart extends BaseChatToolInvocationSubPart {
    constructor(toolInvocation, context, instantiationService, keybindingService, contextKeyService, chatWidgetService, languageModelToolsService) {
        super(toolInvocation);
        this.toolInvocation = toolInvocation;
        this.context = context;
        this.instantiationService = instantiationService;
        this.keybindingService = keybindingService;
        this.contextKeyService = contextKeyService;
        this.chatWidgetService = chatWidgetService;
        this.languageModelToolsService = languageModelToolsService;
        if (toolInvocation.kind !== 'toolInvocation') {
            throw new Error('Confirmation only works with live tool invocations');
        }
    }
    render(config) {
        const { keybindingService, languageModelToolsService, toolInvocation } = this;
        const allowKeybinding = keybindingService.lookupKeybinding(config.allowActionId)?.getLabel();
        const allowTooltip = allowKeybinding ? `${config.allowLabel} (${allowKeybinding})` : config.allowLabel;
        const skipKeybinding = keybindingService.lookupKeybinding(config.skipActionId)?.getLabel();
        const skipTooltip = skipKeybinding ? `${config.skipLabel} (${skipKeybinding})` : config.skipLabel;
        const additionalActions = this.additionalPrimaryActions();
        const buttons = [
            {
                label: config.allowLabel,
                tooltip: allowTooltip,
                data: () => {
                    this.confirmWith(toolInvocation, { type: 4 /* ToolConfirmKind.UserAction */ });
                },
                moreActions: additionalActions.length > 0 ? additionalActions : undefined,
            },
            {
                label: localize(5605, null),
                tooltip: skipTooltip,
                data: () => {
                    this.confirmWith(toolInvocation, { type: 5 /* ToolConfirmKind.Skipped */ });
                },
                isSecondary: true,
            }
        ];
        const contentElement = this.createContentElement();
        const tool = languageModelToolsService.getTool(toolInvocation.toolId);
        const confirmWidget = this._register(this.instantiationService.createInstance((ChatCustomConfirmationWidget), this.context, {
            title: this.getTitle(),
            icon: tool?.icon && 'id' in tool.icon ? tool.icon : Codicon.tools,
            subtitle: config.subtitle,
            buttons,
            message: contentElement,
            toolbarData: {
                arg: toolInvocation,
                partType: config.partType,
                partSource: toolInvocation.source.type
            }
        }));
        const hasToolConfirmation = ChatContextKeys.Editing.hasToolConfirmation.bindTo(this.contextKeyService);
        hasToolConfirmation.set(true);
        this._register(confirmWidget.onDidClick(button => {
            button.data();
            this.chatWidgetService.getWidgetBySessionResource(this.context.element.sessionResource)?.focusInput();
        }));
        this._register(confirmWidget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this._register(toDisposable(() => hasToolConfirmation.reset()));
        this.domNode = confirmWidget.domNode;
    }
    confirmWith(toolInvocation, reason) {
        IChatToolInvocation.confirmWith(toolInvocation, reason);
    }
    additionalPrimaryActions() {
        return [];
    }
};
AbstractToolConfirmationSubPart = __decorate([
    __param(2, IInstantiationService),
    __param(3, IKeybindingService),
    __param(4, IContextKeyService),
    __param(5, IChatWidgetService),
    __param(6, ILanguageModelToolsService)
], AbstractToolConfirmationSubPart);
export { AbstractToolConfirmationSubPart };
//# sourceMappingURL=abstractToolConfirmationSubPart.js.map