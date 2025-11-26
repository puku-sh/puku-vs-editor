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
                label: localize('skip', "Skip"),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RUb29sQ29uZmlybWF0aW9uU3ViUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL3Rvb2xJbnZvY2F0aW9uUGFydHMvYWJzdHJhY3RUb29sQ29uZmlybWF0aW9uU3ViUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDckUsT0FBTyxFQUFtQixtQkFBbUIsRUFBbUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN2RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDbkQsT0FBTyxFQUFFLDRCQUE0QixFQUEyQixNQUFNLDhCQUE4QixDQUFDO0FBRXJHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBYS9FOzs7O0dBSUc7QUFDSSxJQUFlLCtCQUErQixHQUE5QyxNQUFlLCtCQUFnQyxTQUFRLDZC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