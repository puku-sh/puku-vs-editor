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
        const title = widget?.viewModel?.model.title ? localize(5522, null, widget.viewModel.model.title) : localize(5523, null);
        const notification = await dom.triggerNotification(title, {
            detail: localize(5524, null)
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
    container.setAttribute('aria-label', localize(5525, null, titleAsString, messageAsString));
    container.classList.add('chat-confirmation-widget-container');
}
//# sourceMappingURL=chatConfirmationWidget.js.map