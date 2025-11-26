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
import * as dom from '../../../../../base/browser/dom.js';
import { Button, ButtonWithDropdown } from '../../../../../base/browser/ui/button/button.js';
import { Action, Separator } from '../../../../../base/common/actions.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IMarkdownRendererService } from '../../../../../platform/markdown/browser/markdownRenderer.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IChatWidgetService } from '../chat.js';
import { renderFileWidgets } from '../chatInlineAnchorWidget.js';
import { IChatMarkdownAnchorService } from './chatMarkdownAnchorService.js';
import { ChatMarkdownContentPart } from './chatMarkdownContentPart.js';
import './media/chatConfirmationWidget.css';
let ChatQueryTitlePart = class ChatQueryTitlePart extends Disposable {
    get title() {
        return this._title;
    }
    set title(value) {
        this._title = value;
        const next = this._renderer.render(this.toMdString(value), {
            asyncRenderCallback: () => this._onDidChangeHeight.fire(),
        });
        const previousEl = this._renderedTitle.value?.element;
        if (previousEl?.parentElement) {
            previousEl.replaceWith(next.element);
        }
        else {
            this.element.appendChild(next.element); // unreachable?
        }
        this._renderedTitle.value = next;
    }
    constructor(element, _title, subtitle, _renderer) {
        super();
        this.element = element;
        this._title = _title;
        this._renderer = _renderer;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._renderedTitle = this._register(new MutableDisposable());
        element.classList.add('chat-query-title-part');
        this._renderedTitle.value = _renderer.render(this.toMdString(_title), {
            asyncRenderCallback: () => this._onDidChangeHeight.fire(),
        });
        element.append(this._renderedTitle.value.element);
        if (subtitle) {
            const str = this.toMdString(subtitle);
            const renderedTitle = this._register(_renderer.render(str, {
                asyncRenderCallback: () => this._onDidChangeHeight.fire(),
            }));
            const wrapper = document.createElement('small');
            wrapper.appendChild(renderedTitle.element);
            element.append(wrapper);
        }
    }
    toMdString(value) {
        if (typeof value === 'string') {
            return new MarkdownString('', { supportThemeIcons: true }).appendText(value);
        }
        else {
            return new MarkdownString(value.value, { supportThemeIcons: true, isTrusted: value.isTrusted });
        }
    }
};
ChatQueryTitlePart = __decorate([
    __param(3, IMarkdownRendererService)
], ChatQueryTitlePart);
export { ChatQueryTitlePart };
let ChatConfirmationNotifier = class ChatConfirmationNotifier extends Disposable {
    constructor(_hostService, _chatWidgetService) {
        super();
        this._hostService = _hostService;
        this._chatWidgetService = _chatWidgetService;
        this.disposables = this._register(new MutableDisposable());
    }
    async notify(targetWindow, sessionResource) {
        // Focus Window
        this._hostService.focus(targetWindow, { mode: 1 /* FocusMode.Notify */ });
        // Notify
        const widget = this._chatWidgetService.getWidgetBySessionResource(sessionResource);
        const title = widget?.viewModel?.model.title ? localize('chatTitle', "Chat: {0}", widget.viewModel.model.title) : localize('chat.untitledChat', "Untitled Chat");
        const notification = await dom.triggerNotification(title, {
            detail: localize('notificationDetail', "Approval needed to continue.")
        });
        if (notification) {
            const disposables = this.disposables.value = new DisposableStore();
            disposables.add(notification);
            disposables.add(Event.once(notification.onClick)(async () => {
                await this._hostService.focus(targetWindow, { mode: 2 /* FocusMode.Force */ });
                if (widget) {
                    await this._chatWidgetService.reveal(widget);
                    widget.focusInput();
                }
                disposables.dispose();
            }));
            disposables.add(this._hostService.onDidChangeFocus(focus => {
                if (focus) {
                    disposables.dispose();
                }
            }));
        }
    }
};
ChatConfirmationNotifier = __decorate([
    __param(0, IHostService),
    __param(1, IChatWidgetService)
], ChatConfirmationNotifier);
let BaseSimpleChatConfirmationWidget = class BaseSimpleChatConfirmationWidget extends Disposable {
    get onDidClick() { return this._onDidClick.event; }
    get onDidChangeHeight() { return this._onDidChangeHeight.event; }
    get domNode() {
        return this._domNode;
    }
    get showingButtons() {
        return !this.domNode.classList.contains('hideButtons');
    }
    setShowButtons(showButton) {
        this.domNode.classList.toggle('hideButtons', !showButton);
    }
    constructor(context, options, instantiationService, _markdownRendererService, contextMenuService, _configurationService, contextKeyService) {
        super();
        this.context = context;
        this.instantiationService = instantiationService;
        this._markdownRendererService = _markdownRendererService;
        this._configurationService = _configurationService;
        this._onDidClick = this._register(new Emitter());
        this._onDidChangeHeight = this._register(new Emitter());
        const { title, subtitle, message, buttons, silent } = options;
        this.silent = !!silent;
        this.notificationManager = this._register(instantiationService.createInstance(ChatConfirmationNotifier));
        const elements = dom.h('.chat-confirmation-widget-container@container', [
            dom.h('.chat-confirmation-widget@root', [
                dom.h('.chat-confirmation-widget-title@title'),
                dom.h('.chat-confirmation-widget-message@message'),
                dom.h('.chat-buttons-container@buttonsContainer', [
                    dom.h('.chat-buttons@buttons'),
                    dom.h('.chat-toolbar@toolbar'),
                ]),
            ]),
        ]);
        configureAccessibilityContainer(elements.container, title, message);
        this._domNode = elements.root;
        const titlePart = this._register(instantiationService.createInstance(ChatQueryTitlePart, elements.title, title, subtitle));
        this._register(titlePart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this.messageElement = elements.message;
        // Create buttons
        buttons.forEach(buttonData => {
            const buttonOptions = { ...defaultButtonStyles, secondary: buttonData.isSecondary, title: buttonData.tooltip, disabled: buttonData.disabled };
            let button;
            if (buttonData.moreActions) {
                button = new ButtonWithDropdown(elements.buttons, {
                    ...buttonOptions,
                    contextMenuProvider: contextMenuService,
                    addPrimaryActionToDropdown: false,
                    actions: buttonData.moreActions.map(action => {
                        if (action instanceof Separator) {
                            return action;
                        }
                        return this._register(new Action(action.label, action.label, undefined, !action.disabled, () => {
                            this._onDidClick.fire(action);
                            return Promise.resolve();
                        }));
                    }),
                });
            }
            else {
                button = new Button(elements.buttons, buttonOptions);
            }
            this._register(button);
            button.label = buttonData.label;
            this._register(button.onDidClick(() => this._onDidClick.fire(buttonData)));
            if (buttonData.onDidChangeDisablement) {
                this._register(buttonData.onDidChangeDisablement(disabled => button.enabled = !disabled));
            }
        });
        // Create toolbar if actions are provided
        if (options?.toolbarData) {
            const overlay = contextKeyService.createOverlay([
                ['chatConfirmationPartType', options.toolbarData.partType],
                ['chatConfirmationPartSource', options.toolbarData.partSource],
            ]);
            const nestedInsta = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, overlay])));
            this._register(nestedInsta.createInstance(MenuWorkbenchToolBar, elements.toolbar, MenuId.ChatConfirmationMenu, {
                // buttonConfigProvider: () => ({ showLabel: false, showIcon: true }),
                menuOptions: {
                    arg: options.toolbarData.arg,
                    shouldForwardArgs: true,
                }
            }));
        }
    }
    renderMessage(element, listContainer) {
        this.messageElement.append(element);
        if (this.showingButtons && this._configurationService.getValue('chat.notifyWindowOnConfirmation') && !this.silent) {
            const targetWindow = dom.getWindow(listContainer);
            if (!targetWindow.document.hasFocus()) {
                this.notificationManager.notify(targetWindow, this.context.element.sessionResource);
            }
        }
    }
};
BaseSimpleChatConfirmationWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IMarkdownRendererService),
    __param(4, IContextMenuService),
    __param(5, IConfigurationService),
    __param(6, IContextKeyService)
], BaseSimpleChatConfirmationWidget);
/** @deprecated Use ChatConfirmationWidget instead */
let SimpleChatConfirmationWidget = class SimpleChatConfirmationWidget extends BaseSimpleChatConfirmationWidget {
    constructor(context, options, instantiationService, markdownRendererService, contextMenuService, configurationService, contextKeyService) {
        super(context, options, instantiationService, markdownRendererService, contextMenuService, configurationService, contextKeyService);
        this.updateMessage(options.message);
    }
    updateMessage(message) {
        this._renderedMessage?.remove();
        const renderedMessage = this._register(this._markdownRendererService.render(typeof message === 'string' ? new MarkdownString(message) : message, { asyncRenderCallback: () => this._onDidChangeHeight.fire() }));
        this.renderMessage(renderedMessage.element, this.context.container);
        this._renderedMessage = renderedMessage.element;
    }
};
SimpleChatConfirmationWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IMarkdownRendererService),
    __param(4, IContextMenuService),
    __param(5, IConfigurationService),
    __param(6, IContextKeyService)
], SimpleChatConfirmationWidget);
export { SimpleChatConfirmationWidget };
let BaseChatConfirmationWidget = class BaseChatConfirmationWidget extends Disposable {
    get onDidClick() { return this._onDidClick.event; }
    get onDidChangeHeight() { return this._onDidChangeHeight.event; }
    get domNode() {
        return this._domNode;
    }
    get showingButtons() {
        return !this.domNode.classList.contains('hideButtons');
    }
    setShowButtons(showButton) {
        this.domNode.classList.toggle('hideButtons', !showButton);
    }
    get codeblocksPartId() {
        return this.markdownContentPart.value?.codeblocksPartId;
    }
    get codeblocks() {
        return this.markdownContentPart.value?.codeblocks;
    }
    constructor(_context, options, instantiationService, markdownRendererService, contextMenuService, _configurationService, contextKeyService, chatMarkdownAnchorService) {
        super();
        this._context = _context;
        this.instantiationService = instantiationService;
        this.markdownRendererService = markdownRendererService;
        this.contextMenuService = contextMenuService;
        this._configurationService = _configurationService;
        this.chatMarkdownAnchorService = chatMarkdownAnchorService;
        this._onDidClick = this._register(new Emitter());
        this._onDidChangeHeight = this._register(new Emitter());
        this.markdownContentPart = this._register(new MutableDisposable());
        const { title, subtitle, message, buttons, icon } = options;
        this.notificationManager = this._register(instantiationService.createInstance(ChatConfirmationNotifier));
        const elements = dom.h('.chat-confirmation-widget-container@container', [
            dom.h('.chat-confirmation-widget2@root', [
                dom.h('.chat-confirmation-widget-title', [
                    dom.h('.chat-title@title'),
                    dom.h('.chat-toolbar-container@buttonsContainer', [
                        dom.h('.chat-toolbar@toolbar'),
                    ]),
                ]),
                dom.h('.chat-confirmation-widget-message@message'),
                dom.h('.chat-confirmation-widget-buttons', [
                    dom.h('.chat-buttons@buttons'),
                ]),
            ]),
        ]);
        configureAccessibilityContainer(elements.container, title, message);
        this._domNode = elements.root;
        this._buttonsDomNode = elements.buttons;
        const titlePart = this._register(instantiationService.createInstance(ChatQueryTitlePart, elements.title, new MarkdownString(icon ? `$(${icon.id}) ${typeof title === 'string' ? title : title.value}` : typeof title === 'string' ? title : title.value), subtitle));
        this._register(titlePart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this.messageElement = elements.message;
        this.updateButtons(buttons);
        // Create toolbar if actions are provided
        if (options?.toolbarData) {
            const overlay = contextKeyService.createOverlay([
                ['chatConfirmationPartType', options.toolbarData.partType],
                ['chatConfirmationPartSource', options.toolbarData.partSource],
            ]);
            const nestedInsta = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, overlay])));
            this._register(nestedInsta.createInstance(MenuWorkbenchToolBar, elements.toolbar, MenuId.ChatConfirmationMenu, {
                // buttonConfigProvider: () => ({ showLabel: false, showIcon: true }),
                menuOptions: {
                    arg: options.toolbarData.arg,
                    shouldForwardArgs: true,
                }
            }));
        }
    }
    updateButtons(buttons) {
        while (this._buttonsDomNode.children.length > 0) {
            this._buttonsDomNode.children[0].remove();
        }
        for (const buttonData of buttons) {
            const buttonOptions = { ...defaultButtonStyles, secondary: buttonData.isSecondary, title: buttonData.tooltip, disabled: buttonData.disabled };
            let button;
            if (buttonData.moreActions) {
                button = new ButtonWithDropdown(this._buttonsDomNode, {
                    ...buttonOptions,
                    contextMenuProvider: this.contextMenuService,
                    addPrimaryActionToDropdown: false,
                    actions: buttonData.moreActions.map(action => {
                        if (action instanceof Separator) {
                            return action;
                        }
                        return this._register(new Action(action.label, action.label, undefined, !action.disabled, () => {
                            this._onDidClick.fire(action);
                            return Promise.resolve();
                        }));
                    }),
                });
            }
            else {
                button = new Button(this._buttonsDomNode, buttonOptions);
            }
            this._register(button);
            button.label = buttonData.label;
            this._register(button.onDidClick(() => this._onDidClick.fire(buttonData)));
            if (buttonData.onDidChangeDisablement) {
                this._register(buttonData.onDidChangeDisablement(disabled => button.enabled = !disabled));
            }
        }
    }
    renderMessage(element, listContainer) {
        this.markdownContentPart.clear();
        if (!dom.isHTMLElement(element)) {
            const part = this._register(this.instantiationService.createInstance(ChatMarkdownContentPart, {
                kind: 'markdownContent',
                content: typeof element === 'string' ? new MarkdownString().appendMarkdown(element) : element
            }, this._context, this._context.editorPool, false, this._context.codeBlockStartIndex, this.markdownRendererService, undefined, this._context.currentWidth(), this._context.codeBlockModelCollection, {
                allowInlineDiffs: true,
                horizontalPadding: 6,
            }));
            renderFileWidgets(part.domNode, this.instantiationService, this.chatMarkdownAnchorService, this._store);
            this._register(part.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
            this.markdownContentPart.value = part;
            element = part.domNode;
        }
        for (const child of this.messageElement.children) {
            child.remove();
        }
        this.messageElement.append(element);
        if (this.showingButtons && this._configurationService.getValue('chat.notifyWindowOnConfirmation')) {
            const targetWindow = dom.getWindow(listContainer);
            if (!targetWindow.document.hasFocus()) {
                this.notificationManager.notify(targetWindow, this._context.element.sessionResource);
            }
        }
    }
};
BaseChatConfirmationWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IMarkdownRendererService),
    __param(4, IContextMenuService),
    __param(5, IConfigurationService),
    __param(6, IContextKeyService),
    __param(7, IChatMarkdownAnchorService)
], BaseChatConfirmationWidget);
let ChatConfirmationWidget = class ChatConfirmationWidget extends BaseChatConfirmationWidget {
    constructor(context, options, instantiationService, markdownRendererService, contextMenuService, configurationService, contextKeyService, chatMarkdownAnchorService) {
        super(context, options, instantiationService, markdownRendererService, contextMenuService, configurationService, contextKeyService, chatMarkdownAnchorService);
        this.renderMessage(options.message, context.container);
    }
    updateMessage(message) {
        this._renderedMessage?.remove();
        const renderedMessage = this._register(this.markdownRendererService.render(typeof message === 'string' ? new MarkdownString(message) : message, { asyncRenderCallback: () => this._onDidChangeHeight.fire() }));
        this.renderMessage(renderedMessage.element, this._context.container);
        this._renderedMessage = renderedMessage.element;
    }
};
ChatConfirmationWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IMarkdownRendererService),
    __param(4, IContextMenuService),
    __param(5, IConfigurationService),
    __param(6, IContextKeyService),
    __param(7, IChatMarkdownAnchorService)
], ChatConfirmationWidget);
export { ChatConfirmationWidget };
let ChatCustomConfirmationWidget = class ChatCustomConfirmationWidget extends BaseChatConfirmationWidget {
    constructor(context, options, instantiationService, markdownRendererService, contextMenuService, configurationService, contextKeyService, chatMarkdownAnchorService) {
        super(context, options, instantiationService, markdownRendererService, contextMenuService, configurationService, contextKeyService, chatMarkdownAnchorService);
        this.renderMessage(options.message, context.container);
    }
};
ChatCustomConfirmationWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IMarkdownRendererService),
    __param(4, IContextMenuService),
    __param(5, IConfigurationService),
    __param(6, IContextKeyService),
    __param(7, IChatMarkdownAnchorService)
], ChatCustomConfirmationWidget);
export { ChatCustomConfirmationWidget };
function configureAccessibilityContainer(container, title, message) {
    container.tabIndex = 0;
    const titleAsString = typeof title === 'string' ? title : title.value;
    const messageAsString = typeof message === 'string' ? message : message && 'value' in message ? message.value : message && 'textContent' in message ? message.textContent : '';
    container.setAttribute('aria-label', localize('chat.confirmationWidget.ariaLabel', "Chat Confirmation Dialog {0} {1}", titleAsString, messageAsString));
    container.classList.add('chat-confirmation-widget-container');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbmZpcm1hdGlvbldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRDb25maXJtYXRpb25XaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUUxRCxPQUFPLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixFQUEyQixNQUFNLGlEQUFpRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHekcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUV4RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDekUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ2hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRWpFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSx1QkFBdUIsRUFBbUMsTUFBTSw4QkFBOEIsQ0FBQztBQUN4RyxPQUFPLG9DQUFvQyxDQUFDO0FBcUJyQyxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFLakQsSUFBVyxLQUFLO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxJQUFXLEtBQUssQ0FBQyxLQUErQjtRQUMvQyxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUVwQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQzFELG1CQUFtQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUU7U0FDekQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDO1FBQ3RELElBQUksVUFBVSxFQUFFLGFBQWEsRUFBRSxDQUFDO1lBQy9CLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTtRQUN4RCxDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBQ2xDLENBQUM7SUFFRCxZQUNrQixPQUFvQixFQUM3QixNQUFnQyxFQUN4QyxRQUE4QyxFQUNwQixTQUFvRDtRQUU5RSxLQUFLLEVBQUUsQ0FBQztRQUxTLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDN0IsV0FBTSxHQUFOLE1BQU0sQ0FBMEI7UUFFRyxjQUFTLEdBQVQsU0FBUyxDQUEwQjtRQTdCOUQsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDMUQsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztRQUNqRCxtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBcUIsQ0FBQyxDQUFDO1FBK0I1RixPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBRS9DLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNyRSxtQkFBbUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFO1NBQ3pELENBQUMsQ0FBQztRQUNILE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRTtnQkFDMUQsbUJBQW1CLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRTthQUN6RCxDQUFDLENBQUMsQ0FBQztZQUNKLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDaEQsT0FBTyxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDM0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVPLFVBQVUsQ0FBQyxLQUErQjtRQUNqRCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQy9CLE9BQU8sSUFBSSxjQUFjLENBQUMsRUFBRSxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUUsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLElBQUksY0FBYyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ2pHLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTFEWSxrQkFBa0I7SUE4QjVCLFdBQUEsd0JBQXdCLENBQUE7R0E5QmQsa0JBQWtCLENBMEQ5Qjs7QUFFRCxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFJaEQsWUFDZSxZQUEyQyxFQUNyQyxrQkFBdUQ7UUFFM0UsS0FBSyxFQUFFLENBQUM7UUFIdUIsaUJBQVksR0FBWixZQUFZLENBQWM7UUFDcEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUozRCxnQkFBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBbUIsQ0FBQyxDQUFDO0lBT3hGLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLFlBQW9CLEVBQUUsZUFBb0I7UUFFdEQsZUFBZTtRQUNmLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksMEJBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBRWxFLFNBQVM7UUFDVCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsMEJBQTBCLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbkYsTUFBTSxLQUFLLEdBQUcsTUFBTSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ2pLLE1BQU0sWUFBWSxHQUFHLE1BQU0sR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFDdkQ7WUFDQyxNQUFNLEVBQUUsUUFBUSxDQUFDLG9CQUFvQixFQUFFLDhCQUE4QixDQUFDO1NBQ3RFLENBQ0QsQ0FBQztRQUNGLElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNuRSxXQUFXLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBRTlCLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBQzNELE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSx5QkFBaUIsRUFBRSxDQUFDLENBQUM7Z0JBRXZFLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1osTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUM3QyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3JCLENBQUM7Z0JBQ0QsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFSixXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQzFELElBQUksS0FBSyxFQUFFLENBQUM7b0JBQ1gsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN2QixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTdDSyx3QkFBd0I7SUFLM0IsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGtCQUFrQixDQUFBO0dBTmYsd0JBQXdCLENBNkM3QjtBQUVELElBQWUsZ0NBQWdDLEdBQS9DLE1BQWUsZ0NBQW9DLFNBQVEsVUFBVTtJQUVwRSxJQUFJLFVBQVUsS0FBd0MsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFHdEYsSUFBSSxpQkFBaUIsS0FBa0IsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUc5RSxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdEIsQ0FBQztJQUVELElBQVksY0FBYztRQUN6QixPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxjQUFjLENBQUMsVUFBbUI7UUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFPRCxZQUNvQixPQUFzQyxFQUN6RCxPQUEwQyxFQUNuQixvQkFBOEQsRUFDM0Qsd0JBQXFFLEVBQzFFLGtCQUF1QyxFQUNyQyxxQkFBNkQsRUFDaEUsaUJBQXFDO1FBRXpELEtBQUssRUFBRSxDQUFDO1FBUlcsWUFBTyxHQUFQLE9BQU8sQ0FBK0I7UUFFZix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ3hDLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMEI7UUFFdkQsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQTlCN0UsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUE4QixDQUFDLENBQUM7UUFHdEUsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFnQ2xFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDO1FBQzlELElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUV2QixJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBRXpHLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsK0NBQStDLEVBQUU7WUFDdkUsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsRUFBRTtnQkFDdkMsR0FBRyxDQUFDLENBQUMsQ0FBQyx1Q0FBdUMsQ0FBQztnQkFDOUMsR0FBRyxDQUFDLENBQUMsQ0FBQywyQ0FBMkMsQ0FBQztnQkFDbEQsR0FBRyxDQUFDLENBQUMsQ0FBQywwQ0FBMEMsRUFBRTtvQkFDakQsR0FBRyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQztvQkFDOUIsR0FBRyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQztpQkFDOUIsQ0FBQzthQUNGLENBQUM7U0FDRixDQUFDLENBQUM7UUFDSCwrQkFBK0IsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNwRSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFFOUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ25FLGtCQUFrQixFQUNsQixRQUFRLENBQUMsS0FBSyxFQUNkLEtBQUssRUFDTCxRQUFRLENBQ1IsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVsRixJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7UUFFdkMsaUJBQWlCO1FBQ2pCLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDNUIsTUFBTSxhQUFhLEdBQW1CLEVBQUUsR0FBRyxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBRTlKLElBQUksTUFBZSxDQUFDO1lBQ3BCLElBQUksVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUM1QixNQUFNLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFO29CQUNqRCxHQUFHLGFBQWE7b0JBQ2hCLG1CQUFtQixFQUFFLGtCQUFrQjtvQkFDdkMsMEJBQTBCLEVBQUUsS0FBSztvQkFDakMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO3dCQUM1QyxJQUFJLE1BQU0sWUFBWSxTQUFTLEVBQUUsQ0FBQzs0QkFDakMsT0FBTyxNQUFNLENBQUM7d0JBQ2YsQ0FBQzt3QkFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQy9CLE1BQU0sQ0FBQyxLQUFLLEVBQ1osTUFBTSxDQUFDLEtBQUssRUFDWixTQUFTLEVBQ1QsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUNoQixHQUFHLEVBQUU7NEJBQ0osSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7NEJBQzlCLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUMxQixDQUFDLENBQ0QsQ0FBQyxDQUFDO29CQUNKLENBQUMsQ0FBQztpQkFDRixDQUFDLENBQUM7WUFDSixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDdEQsQ0FBQztZQUVELElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkIsTUFBTSxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0UsSUFBSSxVQUFVLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUMzRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCx5Q0FBeUM7UUFDekMsSUFBSSxPQUFPLEVBQUUsV0FBVyxFQUFFLENBQUM7WUFDMUIsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsYUFBYSxDQUFDO2dCQUMvQyxDQUFDLDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDO2dCQUMxRCxDQUFDLDRCQUE0QixFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDO2FBQzlELENBQUMsQ0FBQztZQUNILE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLElBQUksaUJBQWlCLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzSCxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQ3hDLG9CQUFvQixFQUNwQixRQUFRLENBQUMsT0FBTyxFQUNoQixNQUFNLENBQUMsb0JBQW9CLEVBQzNCO2dCQUNDLHNFQUFzRTtnQkFDdEUsV0FBVyxFQUFFO29CQUNaLEdBQUcsRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUc7b0JBQzVCLGlCQUFpQixFQUFFLElBQUk7aUJBQ3ZCO2FBQ0QsQ0FDRCxDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQztJQUVTLGFBQWEsQ0FBQyxPQUFvQixFQUFFLGFBQTBCO1FBQ3ZFLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXBDLElBQUksSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFVLGlDQUFpQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDNUgsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNsRCxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2dCQUN2QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNyRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBdkljLGdDQUFnQztJQTRCNUMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0dBaENOLGdDQUFnQyxDQXVJOUM7QUFFRCxxREFBcUQ7QUFDOUMsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBZ0MsU0FBUSxnQ0FBbUM7SUFHdkYsWUFDQyxPQUFzQyxFQUN0QyxPQUEwQyxFQUNuQixvQkFBMkMsRUFDeEMsdUJBQWlELEVBQ3RELGtCQUF1QyxFQUNyQyxvQkFBMkMsRUFDOUMsaUJBQXFDO1FBRXpELEtBQUssQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLHVCQUF1QixFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDcEksSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVNLGFBQWEsQ0FBQyxPQUFpQztRQUNyRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDaEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUMxRSxPQUFPLE9BQU8sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQ25FLEVBQUUsbUJBQW1CLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxFQUFFLENBQzdELENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3BFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDO0lBQ2pELENBQUM7Q0FDRCxDQUFBO0FBekJZLDRCQUE0QjtJQU10QyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7R0FWUiw0QkFBNEIsQ0F5QnhDOztBQVdELElBQWUsMEJBQTBCLEdBQXpDLE1BQWUsMEJBQThCLFNBQVEsVUFBVTtJQUU5RCxJQUFJLFVBQVUsS0FBd0MsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFHdEYsSUFBSSxpQkFBaUIsS0FBa0IsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUc5RSxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdEIsQ0FBQztJQUlELElBQVksY0FBYztRQUN6QixPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxjQUFjLENBQUMsVUFBbUI7UUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFNRCxJQUFXLGdCQUFnQjtRQUMxQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUM7SUFDekQsQ0FBQztJQUVELElBQVcsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDO0lBQ25ELENBQUM7SUFFRCxZQUNvQixRQUF1QyxFQUMxRCxPQUEyQyxFQUNwQixvQkFBOEQsRUFDM0QsdUJBQW9FLEVBQ3pFLGtCQUF3RCxFQUN0RCxxQkFBNkQsRUFDaEUsaUJBQXFDLEVBQzdCLHlCQUFzRTtRQUVsRyxLQUFLLEVBQUUsQ0FBQztRQVRXLGFBQVEsR0FBUixRQUFRLENBQStCO1FBRWhCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDeEMsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtRQUN4RCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3JDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFFdkMsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUE0QjtRQXpDM0YsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUE4QixDQUFDLENBQUM7UUFHdEUsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFtQmxELHdCQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBMkIsQ0FBQyxDQUFDO1FBdUJ2RyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUU1RCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBRXpHLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsK0NBQStDLEVBQUU7WUFDdkUsR0FBRyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsRUFBRTtnQkFDeEMsR0FBRyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsRUFBRTtvQkFDeEMsR0FBRyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQztvQkFDMUIsR0FBRyxDQUFDLENBQUMsQ0FBQywwQ0FBMEMsRUFBRTt3QkFDakQsR0FBRyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQztxQkFDOUIsQ0FBQztpQkFDRixDQUFDO2dCQUNGLEdBQUcsQ0FBQyxDQUFDLENBQUMsMkNBQTJDLENBQUM7Z0JBQ2xELEdBQUcsQ0FBQyxDQUFDLENBQUMsbUNBQW1DLEVBQUU7b0JBQzFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUM7aUJBQzlCLENBQUM7YUFDRixDQUFDO1NBQUUsQ0FBQyxDQUFDO1FBRVAsK0JBQStCLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQzlCLElBQUksQ0FBQyxlQUFlLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztRQUV4QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDbkUsa0JBQWtCLEVBQ2xCLFFBQVEsQ0FBQyxLQUFLLEVBQ2QsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxFQUFFLEtBQUssT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFDL0ksUUFBUSxDQUNSLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFbEYsSUFBSSxDQUFDLGNBQWMsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO1FBRXZDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFNUIseUNBQXlDO1FBQ3pDLElBQUksT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDO1lBQzFCLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUFDLGFBQWEsQ0FBQztnQkFDL0MsQ0FBQywwQkFBMEIsRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQztnQkFDMUQsQ0FBQyw0QkFBNEIsRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQzthQUM5RCxDQUFDLENBQUM7WUFDSCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUN4QyxvQkFBb0IsRUFDcEIsUUFBUSxDQUFDLE9BQU8sRUFDaEIsTUFBTSxDQUFDLG9CQUFvQixFQUMzQjtnQkFDQyxzRUFBc0U7Z0JBQ3RFLFdBQVcsRUFBRTtvQkFDWixHQUFHLEVBQUUsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHO29CQUM1QixpQkFBaUIsRUFBRSxJQUFJO2lCQUN2QjthQUNELENBQ0QsQ0FBQyxDQUFDO1FBQ0osQ0FBQztJQUNGLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBcUM7UUFDbEQsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDakQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDM0MsQ0FBQztRQUNELEtBQUssTUFBTSxVQUFVLElBQUksT0FBTyxFQUFFLENBQUM7WUFDbEMsTUFBTSxhQUFhLEdBQW1CLEVBQUUsR0FBRyxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBRTlKLElBQUksTUFBZSxDQUFDO1lBQ3BCLElBQUksVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUM1QixNQUFNLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFO29CQUNyRCxHQUFHLGFBQWE7b0JBQ2hCLG1CQUFtQixFQUFFLElBQUksQ0FBQyxrQkFBa0I7b0JBQzVDLDBCQUEwQixFQUFFLEtBQUs7b0JBQ2pDLE9BQU8sRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTt3QkFDNUMsSUFBSSxNQUFNLFlBQVksU0FBUyxFQUFFLENBQUM7NEJBQ2pDLE9BQU8sTUFBTSxDQUFDO3dCQUNmLENBQUM7d0JBQ0QsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUMvQixNQUFNLENBQUMsS0FBSyxFQUNaLE1BQU0sQ0FBQyxLQUFLLEVBQ1osU0FBUyxFQUNULENBQUMsTUFBTSxDQUFDLFFBQVEsRUFDaEIsR0FBRyxFQUFFOzRCQUNKLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDOzRCQUM5QixPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDMUIsQ0FBQyxDQUNELENBQUMsQ0FBQztvQkFDSixDQUFDLENBQUM7aUJBQ0YsQ0FBQyxDQUFDO1lBQ0osQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQzFELENBQUM7WUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZCLE1BQU0sQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQztZQUNoQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNFLElBQUksVUFBVSxDQUFDLHNCQUFzQixFQUFFLENBQUM7Z0JBQ3ZDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDM0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRVMsYUFBYSxDQUFDLE9BQStDLEVBQUUsYUFBMEI7UUFDbEcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWpDLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUMzRjtnQkFDQyxJQUFJLEVBQUUsaUJBQWlCO2dCQUN2QixPQUFPLEVBQUUsT0FBTyxPQUFPLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTzthQUM3RixFQUNELElBQUksQ0FBQyxRQUFRLEVBQ2IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQ3hCLEtBQUssRUFDTCxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUNqQyxJQUFJLENBQUMsdUJBQXVCLEVBQzVCLFNBQVMsRUFDVCxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxFQUM1QixJQUFJLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUN0QztnQkFDQyxnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixpQkFBaUIsRUFBRSxDQUFDO2FBQ3NCLENBQzNDLENBQUMsQ0FBQztZQUNILGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDeEcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUU3RSxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztZQUN0QyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN4QixDQUFDO1FBRUQsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2xELEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNoQixDQUFDO1FBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFcEMsSUFBSSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQVUsaUNBQWlDLENBQUMsRUFBRSxDQUFDO1lBQzVHLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDdEYsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTFMYywwQkFBMEI7SUFxQ3RDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLDBCQUEwQixDQUFBO0dBMUNkLDBCQUEwQixDQTBMeEM7QUFDTSxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUEwQixTQUFRLDBCQUE2QjtJQUczRSxZQUNDLE9BQXNDLEVBQ3RDLE9BQTJDLEVBQ3BCLG9CQUEyQyxFQUN4Qyx1QkFBaUQsRUFDdEQsa0JBQXVDLEVBQ3JDLG9CQUEyQyxFQUM5QyxpQkFBcUMsRUFDN0IseUJBQXFEO1FBRWpGLEtBQUssQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLHVCQUF1QixFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixDQUFDLENBQUM7UUFDL0osSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRU0sYUFBYSxDQUFDLE9BQWlDO1FBQ3JELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUNoQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQ3pFLE9BQU8sT0FBTyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFDbkUsRUFBRSxtQkFBbUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FDN0QsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDckUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUM7SUFDakQsQ0FBQztDQUNELENBQUE7QUExQlksc0JBQXNCO0lBTWhDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLDBCQUEwQixDQUFBO0dBWGhCLHNCQUFzQixDQTBCbEM7O0FBQ00sSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBZ0MsU0FBUSwwQkFBNkI7SUFDakYsWUFDQyxPQUFzQyxFQUN0QyxPQUEyQyxFQUNwQixvQkFBMkMsRUFDeEMsdUJBQWlELEVBQ3RELGtCQUF1QyxFQUNyQyxvQkFBMkMsRUFDOUMsaUJBQXFDLEVBQzdCLHlCQUFxRDtRQUVqRixLQUFLLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSx1QkFBdUIsRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxpQkFBaUIsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO1FBQy9KLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDeEQsQ0FBQztDQUNELENBQUE7QUFkWSw0QkFBNEI7SUFJdEMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsMEJBQTBCLENBQUE7R0FUaEIsNEJBQTRCLENBY3hDOztBQUVELFNBQVMsK0JBQStCLENBQUMsU0FBc0IsRUFBRSxLQUErQixFQUFFLE9BQWdEO0lBQ2pKLFNBQVMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZCLE1BQU0sYUFBYSxHQUFHLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO0lBQ3RFLE1BQU0sZUFBZSxHQUFHLE9BQU8sT0FBTyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLGFBQWEsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUMvSyxTQUFTLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsbUNBQW1DLEVBQUUsa0NBQWtDLEVBQUUsYUFBYSxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDeEosU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQztBQUMvRCxDQUFDIn0=