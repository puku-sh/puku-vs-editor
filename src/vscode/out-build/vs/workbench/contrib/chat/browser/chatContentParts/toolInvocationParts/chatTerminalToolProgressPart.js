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
import { h } from '../../../../../../base/browser/dom.js';
import { ActionBar } from '../../../../../../base/browser/ui/actionbar/actionbar.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { isMarkdownString, MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IPreferencesService } from '../../../../../services/preferences/common/preferences.js';
import { migrateLegacyTerminalToolSpecificData } from '../../../common/chat.js';
import { IChatWidgetService } from '../../chat.js';
import { ChatQueryTitlePart } from '../chatConfirmationWidget.js';
import { ChatMarkdownContentPart } from '../chatMarkdownContentPart.js';
import { ChatProgressSubPart } from '../chatProgressContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
import '../media/chatTerminalToolProgressPart.css';
import { ChatConfiguration, CHAT_TERMINAL_OUTPUT_MAX_PREVIEW_LINES } from '../../../common/constants.js';
import { CommandsRegistry } from '../../../../../../platform/commands/common/commands.js';
import { MenuId, MenuRegistry } from '../../../../../../platform/actions/common/actions.js';
import { ITerminalChatService, ITerminalEditorService, ITerminalGroupService, ITerminalService } from '../../../../terminal/browser/terminal.js';
import { Action } from '../../../../../../base/common/actions.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { getTerminalCommandDecorationState, getTerminalCommandDecorationTooltip } from '../../../../terminal/browser/xterm/decorationStyles.js';
import * as dom from '../../../../../../base/browser/dom.js';
import { DomScrollableElement } from '../../../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { localize } from '../../../../../../nls.js';
import { TerminalLocation } from '../../../../../../platform/terminal/common/terminal.js';
import { URI } from '../../../../../../base/common/uri.js';
import * as domSanitize from '../../../../../../base/browser/domSanitize.js';
import { allowedMarkdownHtmlAttributes } from '../../../../../../base/browser/markdownRenderer.js';
import { stripIcons } from '../../../../../../base/common/iconLabels.js';
import { IAccessibleViewService } from '../../../../../../platform/accessibility/browser/accessibleView.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { ChatContextKeys } from '../../../common/chatContextKeys.js';
import { KeybindingsRegistry } from '../../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
const MAX_TERMINAL_OUTPUT_PREVIEW_HEIGHT = 200;
const sanitizerConfig = Object.freeze({
    allowedTags: {
        augment: ['b', 'i', 'u', 'code', 'span', 'div', 'body', 'pre'],
    },
    allowedAttributes: {
        augment: [...allowedMarkdownHtmlAttributes, 'style']
    }
});
/**
 * Remembers whether a tool invocation was last expanded so state survives virtualization re-renders.
 */
const expandedStateByInvocation = new WeakMap();
class TerminalCommandDecoration extends Disposable {
    constructor(_options) {
        super();
        this._options = _options;
        const decorationElements = h('span.chat-terminal-command-decoration@decoration', { role: 'img', tabIndex: 0 });
        this._element = decorationElements.decoration;
        this._hoverListener = this._register(new MutableDisposable());
        this._focusListener = this._register(new MutableDisposable());
        this._attachElementToContainer();
    }
    _attachElementToContainer() {
        const container = this._options.getCommandBlock();
        if (!container) {
            return;
        }
        const decoration = this._element;
        if (!decoration.isConnected || decoration.parentElement !== container) {
            const icon = this._options.getIconElement();
            if (icon && icon.parentElement === container) {
                icon.insertAdjacentElement('afterend', decoration);
            }
            else {
                container.insertBefore(decoration, container.firstElementChild ?? null);
            }
        }
        this._attachInteractionHandlers(decoration);
    }
    update(command) {
        this._attachElementToContainer();
        const decoration = this._element;
        const resolvedCommand = command ?? this._options.getResolvedCommand();
        this._apply(decoration, resolvedCommand);
    }
    _apply(decoration, command) {
        const terminalData = this._options.terminalData;
        let storedState = terminalData.terminalCommandState;
        if (command) {
            const existingState = terminalData.terminalCommandState ?? {};
            terminalData.terminalCommandState = {
                ...existingState,
                exitCode: command.exitCode,
                timestamp: command.timestamp ?? existingState.timestamp,
                duration: command.duration ?? existingState.duration
            };
            storedState = terminalData.terminalCommandState;
        }
        else if (!this._options.terminalData.terminalCommandOutput) {
            if (!storedState) {
                const now = Date.now();
                terminalData.terminalCommandState = { exitCode: undefined, timestamp: now };
                storedState = terminalData.terminalCommandState;
            }
        }
        const decorationState = getTerminalCommandDecorationState(command, storedState);
        const tooltip = getTerminalCommandDecorationTooltip(command, storedState);
        decoration.className = `chat-terminal-command-decoration ${"terminal-command-decoration" /* DecorationSelector.CommandDecoration */}`;
        decoration.classList.add("codicon" /* DecorationSelector.Codicon */);
        for (const className of decorationState.classNames) {
            decoration.classList.add(className);
        }
        decoration.classList.add(...ThemeIcon.asClassNameArray(decorationState.icon));
        const isInteractive = !decoration.classList.contains("default" /* DecorationSelector.Default */);
        decoration.tabIndex = isInteractive ? 0 : -1;
        if (isInteractive) {
            decoration.removeAttribute('aria-disabled');
        }
        else {
            decoration.setAttribute('aria-disabled', 'true');
        }
        const hoverText = tooltip || decorationState.hoverMessage;
        if (hoverText) {
            decoration.setAttribute('title', hoverText);
            decoration.setAttribute('aria-label', hoverText);
        }
        else {
            decoration.removeAttribute('title');
            decoration.removeAttribute('aria-label');
        }
    }
    _attachInteractionHandlers(decoration) {
        if (this._interactionElement === decoration) {
            return;
        }
        this._interactionElement = decoration;
        this._hoverListener.value = dom.addDisposableListener(decoration, dom.EventType.MOUSE_ENTER, () => {
            if (!decoration.isConnected) {
                return;
            }
            this._apply(decoration, this._options.getResolvedCommand());
        });
        this._focusListener.value = dom.addDisposableListener(decoration, dom.EventType.FOCUS_IN, () => {
            if (!decoration.isConnected) {
                return;
            }
            this._apply(decoration, this._options.getResolvedCommand());
        });
    }
}
let ChatTerminalToolProgressPart = class ChatTerminalToolProgressPart extends BaseChatToolInvocationSubPart {
    get codeblocks() {
        return this.markdownPart?.codeblocks ?? [];
    }
    get elementIndex() {
        return this._elementIndex;
    }
    get contentIndex() {
        return this._contentIndex;
    }
    constructor(toolInvocation, terminalData, context, renderer, editorPool, currentWidthDelegate, codeBlockStartIndex, codeBlockModelCollection, _instantiationService, _terminalChatService, _terminalService, _contextKeyService, _chatWidgetService, _accessibleViewService, _keybindingService) {
        super(toolInvocation);
        this._instantiationService = _instantiationService;
        this._terminalChatService = _terminalChatService;
        this._terminalService = _terminalService;
        this._contextKeyService = _contextKeyService;
        this._chatWidgetService = _chatWidgetService;
        this._accessibleViewService = _accessibleViewService;
        this._keybindingService = _keybindingService;
        this._showOutputAction = this._register(new MutableDisposable());
        this._showOutputActionAdded = false;
        this._focusAction = this._register(new MutableDisposable());
        this._elementIndex = context.elementIndex;
        this._contentIndex = context.contentIndex;
        this._sessionResource = context.element.sessionResource;
        terminalData = migrateLegacyTerminalToolSpecificData(terminalData);
        this._terminalData = terminalData;
        this._terminalCommandUri = terminalData.terminalCommandUri ? URI.revive(terminalData.terminalCommandUri) : undefined;
        this._storedCommandId = this._terminalCommandUri ? new URLSearchParams(this._terminalCommandUri.query ?? '').get('command') ?? undefined : undefined;
        this._isSerializedInvocation = (toolInvocation.kind === 'toolInvocationSerialized');
        const elements = h('.chat-terminal-content-part@container', [
            h('.chat-terminal-content-title@title', [
                h('.chat-terminal-command-block@commandBlock')
            ]),
            h('.chat-terminal-content-message@message'),
            h('.chat-terminal-output-container@output')
        ]);
        this._decoration = this._register(new TerminalCommandDecoration({
            terminalData: this._terminalData,
            getCommandBlock: () => elements.commandBlock,
            getIconElement: () => undefined,
            getResolvedCommand: () => this._getResolvedCommand()
        }));
        const command = terminalData.commandLine.userEdited ?? terminalData.commandLine.toolEdited ?? terminalData.commandLine.original;
        const displayCommand = stripIcons(command);
        this._terminalOutputContextKey = ChatContextKeys.inChatTerminalToolOutput.bindTo(this._contextKeyService);
        const titlePart = this._register(_instantiationService.createInstance(ChatQueryTitlePart, elements.commandBlock, new MarkdownString([
            `\`\`\`${terminalData.language}`,
            `${command.replaceAll('```', '\\`\\`\\`')}`,
            `\`\`\``
        ].join('\n'), { supportThemeIcons: true }), undefined));
        this._register(titlePart.onDidChangeHeight(() => {
            this._decoration.update();
            this._onDidChangeHeight.fire();
        }));
        const outputViewOptions = {
            container: elements.output,
            title: elements.title,
            displayCommand,
            terminalData: this._terminalData,
            accessibleViewService: this._accessibleViewService,
            onDidChangeHeight: () => this._onDidChangeHeight.fire(),
            ensureTerminalInstance: () => this._ensureTerminalInstance(),
            resolveCommand: () => this._getResolvedCommand(),
            getTerminalTheme: () => this._terminalInstance?.xterm?.getXtermTheme() ?? this._terminalData.terminalTheme,
            getStoredCommandId: () => this._storedCommandId
        };
        this._outputView = this._register(new ChatTerminalToolOutputSection(outputViewOptions));
        this._register(this._outputView.onDidFocus(() => this._handleOutputFocus()));
        this._register(this._outputView.onDidBlur(e => this._handleOutputBlur(e)));
        this._register(toDisposable(() => this._handleDispose()));
        this._register(this._keybindingService.onDidUpdateKeybindings(() => {
            this._focusAction.value?.refreshKeybindingTooltip();
            this._showOutputAction.value?.refreshKeybindingTooltip();
        }));
        const actionBarEl = h('.chat-terminal-action-bar@actionBar');
        elements.title.append(actionBarEl.root);
        this._actionBar = this._register(new ActionBar(actionBarEl.actionBar, {}));
        this._initializeTerminalActions();
        this._terminalService.whenConnected.then(() => this._initializeTerminalActions());
        let pastTenseMessage;
        if (toolInvocation.pastTenseMessage) {
            pastTenseMessage = `${typeof toolInvocation.pastTenseMessage === 'string' ? toolInvocation.pastTenseMessage : toolInvocation.pastTenseMessage.value}`;
        }
        const markdownContent = new MarkdownString(pastTenseMessage, {
            supportThemeIcons: true,
            isTrusted: isMarkdownString(toolInvocation.pastTenseMessage) ? toolInvocation.pastTenseMessage.isTrusted : false,
        });
        const chatMarkdownContent = {
            kind: 'markdownContent',
            content: markdownContent,
        };
        const codeBlockRenderOptions = {
            hideToolbar: true,
            reserveWidth: 19,
            verticalPadding: 5,
            editorOptions: {
                wordWrap: 'on'
            }
        };
        const markdownOptions = {
            codeBlockRenderOptions,
            accessibilityOptions: pastTenseMessage ? {
                statusMessage: localize(5628, null, stripIcons(pastTenseMessage))
            } : undefined
        };
        this.markdownPart = this._register(_instantiationService.createInstance(ChatMarkdownContentPart, chatMarkdownContent, context, editorPool, false, codeBlockStartIndex, renderer, {}, currentWidthDelegate(), codeBlockModelCollection, markdownOptions));
        this._register(this.markdownPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        elements.message.append(this.markdownPart.domNode);
        const progressPart = this._register(_instantiationService.createInstance(ChatProgressSubPart, elements.container, this.getIcon(), terminalData.autoApproveInfo));
        this.domNode = progressPart.domNode;
        this._decoration.update();
        if (expandedStateByInvocation.get(toolInvocation)) {
            void this._toggleOutput(true);
        }
        this._register(this._terminalChatService.registerProgressPart(this));
    }
    async _initializeTerminalActions() {
        if (this._store.isDisposed) {
            return;
        }
        const terminalToolSessionId = this._terminalData.terminalToolSessionId;
        if (!terminalToolSessionId) {
            this._addActions();
            return;
        }
        // Ensure stored output surfaces immediately even if no terminal instance is available yet.
        if (this._terminalData.terminalCommandOutput) {
            this._addActions(undefined, terminalToolSessionId);
        }
        const attachInstance = async (instance) => {
            if (this._store.isDisposed) {
                return;
            }
            if (!instance) {
                if (this._isSerializedInvocation) {
                    this._clearCommandAssociation();
                }
                this._addActions(undefined, terminalToolSessionId);
                return;
            }
            const isNewInstance = this._terminalInstance !== instance;
            if (isNewInstance) {
                this._terminalInstance = instance;
                this._registerInstanceListener(instance);
            }
            // Always call _addActions to ensure actions are added, even if instance was set earlier
            // (e.g., by the output view during expanded state restoration)
            this._addActions(instance, terminalToolSessionId);
        };
        const initialInstance = await this._terminalChatService.getTerminalInstanceByToolSessionId(terminalToolSessionId);
        await attachInstance(initialInstance);
        if (!initialInstance) {
            this._addActions(undefined, terminalToolSessionId);
        }
        if (this._store.isDisposed) {
            return;
        }
        if (!this._terminalSessionRegistration) {
            const listener = this._terminalChatService.onDidRegisterTerminalInstanceWithToolSession(async (instance) => {
                const registeredInstance = await this._terminalChatService.getTerminalInstanceByToolSessionId(terminalToolSessionId);
                if (instance !== registeredInstance) {
                    return;
                }
                this._terminalSessionRegistration?.dispose();
                this._terminalSessionRegistration = undefined;
                await attachInstance(instance);
            });
            this._terminalSessionRegistration = this._store.add(listener);
        }
    }
    _addActions(terminalInstance, terminalToolSessionId) {
        if (this._store.isDisposed) {
            return;
        }
        const actionBar = this._actionBar;
        this._removeFocusAction();
        const resolvedCommand = this._getResolvedCommand(terminalInstance);
        if (terminalInstance) {
            const isTerminalHidden = terminalInstance && terminalToolSessionId ? this._terminalChatService.isBackgroundTerminal(terminalToolSessionId) : false;
            const focusAction = this._instantiationService.createInstance(FocusChatInstanceAction, terminalInstance, resolvedCommand, this._terminalCommandUri, this._storedCommandId, isTerminalHidden);
            this._focusAction.value = focusAction;
            actionBar.push(focusAction, { icon: true, label: false, index: 0 });
        }
        this._ensureShowOutputAction(resolvedCommand);
        this._decoration.update(resolvedCommand);
    }
    _getResolvedCommand(instance) {
        const target = instance ?? this._terminalInstance;
        if (!target) {
            return undefined;
        }
        return this._resolveCommand(target);
    }
    _ensureShowOutputAction(command) {
        if (this._store.isDisposed) {
            return;
        }
        let resolvedCommand = command;
        if (!resolvedCommand) {
            resolvedCommand = this._getResolvedCommand();
        }
        const hasStoredOutput = !!this._terminalData.terminalCommandOutput;
        if (!resolvedCommand && !hasStoredOutput) {
            return;
        }
        let showOutputAction = this._showOutputAction.value;
        if (!showOutputAction) {
            showOutputAction = this._instantiationService.createInstance(ToggleChatTerminalOutputAction, () => this._toggleOutputFromAction());
            this._showOutputAction.value = showOutputAction;
            if (resolvedCommand?.exitCode) {
                this._toggleOutput(true);
            }
        }
        showOutputAction.syncPresentation(this._outputView.isExpanded);
        const actionBar = this._actionBar;
        if (this._showOutputActionAdded) {
            const existingIndex = actionBar.viewItems.findIndex(item => item.action === showOutputAction);
            if (existingIndex >= 0 && existingIndex !== actionBar.length() - 1) {
                actionBar.pull(existingIndex);
                this._showOutputActionAdded = false;
            }
            else if (existingIndex >= 0) {
                return;
            }
        }
        if (this._showOutputActionAdded) {
            return;
        }
        actionBar.push([showOutputAction], { icon: true, label: false });
        this._showOutputActionAdded = true;
    }
    _clearCommandAssociation() {
        this._terminalCommandUri = undefined;
        this._storedCommandId = undefined;
        if (this._terminalData.terminalCommandUri) {
            delete this._terminalData.terminalCommandUri;
        }
        if (this._terminalData.terminalToolSessionId) {
            delete this._terminalData.terminalToolSessionId;
        }
        this._decoration.update();
    }
    _registerInstanceListener(terminalInstance) {
        const commandDetectionListener = this._register(new MutableDisposable());
        const tryResolveCommand = async () => {
            const resolvedCommand = this._resolveCommand(terminalInstance);
            this._addActions(terminalInstance, this._terminalData.terminalToolSessionId);
            return resolvedCommand;
        };
        const attachCommandDetection = async (commandDetection) => {
            commandDetectionListener.clear();
            if (!commandDetection) {
                await tryResolveCommand();
                return;
            }
            commandDetectionListener.value = commandDetection.onCommandFinished(() => {
                this._addActions(terminalInstance, this._terminalData.terminalToolSessionId);
                commandDetectionListener.clear();
            });
            const resolvedImmediately = await tryResolveCommand();
            if (resolvedImmediately?.endMarker) {
                return;
            }
        };
        attachCommandDetection(terminalInstance.capabilities.get(2 /* TerminalCapability.CommandDetection */));
        this._register(terminalInstance.capabilities.onDidAddCommandDetectionCapability(cd => attachCommandDetection(cd)));
        const instanceListener = this._register(terminalInstance.onDisposed(() => {
            if (this._terminalInstance === terminalInstance) {
                this._terminalInstance = undefined;
            }
            this._clearCommandAssociation();
            commandDetectionListener.clear();
            if (!this._store.isDisposed) {
                this._actionBar.clear();
            }
            this._removeFocusAction();
            this._showOutputActionAdded = false;
            this._showOutputAction.clear();
            this._addActions(undefined, this._terminalData.terminalToolSessionId);
            instanceListener.dispose();
        }));
    }
    _removeFocusAction() {
        if (this._store.isDisposed) {
            return;
        }
        const actionBar = this._actionBar;
        const focusAction = this._focusAction.value;
        if (actionBar && focusAction) {
            const existingIndex = actionBar.viewItems.findIndex(item => item.action === focusAction);
            if (existingIndex >= 0) {
                actionBar.pull(existingIndex);
            }
        }
        this._focusAction.clear();
    }
    async _toggleOutput(expanded) {
        const didChange = await this._outputView.toggle(expanded);
        this._showOutputAction.value?.syncPresentation(this._outputView.isExpanded);
        if (didChange) {
            expandedStateByInvocation.set(this.toolInvocation, this._outputView.isExpanded);
        }
        return didChange;
    }
    async _ensureTerminalInstance() {
        if (!this._terminalInstance && this._terminalData.terminalToolSessionId) {
            this._terminalInstance = await this._terminalChatService.getTerminalInstanceByToolSessionId(this._terminalData.terminalToolSessionId);
        }
        return this._terminalInstance;
    }
    _handleOutputFocus() {
        this._terminalOutputContextKey.set(true);
        this._terminalChatService.setFocusedProgressPart(this);
        this._outputView.updateAriaLabel();
    }
    _handleOutputBlur(event) {
        const nextTarget = event.relatedTarget;
        if (this._outputView.containsElement(nextTarget)) {
            return;
        }
        this._terminalOutputContextKey.reset();
        this._terminalChatService.clearFocusedProgressPart(this);
    }
    _handleDispose() {
        this._terminalOutputContextKey.reset();
        this._terminalChatService.clearFocusedProgressPart(this);
    }
    getCommandAndOutputAsText() {
        return this._outputView.getCommandAndOutputAsText();
    }
    focusOutput() {
        this._outputView.focus();
    }
    _focusChatInput() {
        const widget = this._chatWidgetService.getWidgetBySessionResource(this._sessionResource);
        widget?.focusInput();
    }
    async focusTerminal() {
        if (this._focusAction.value) {
            await this._focusAction.value.run();
            return;
        }
        if (this._terminalCommandUri) {
            this._terminalService.openResource(this._terminalCommandUri);
        }
    }
    async toggleOutputFromKeyboard() {
        if (!this._outputView.isExpanded) {
            await this._toggleOutput(true);
            this.focusOutput();
            return;
        }
        await this._collapseOutputAndFocusInput();
    }
    async _toggleOutputFromAction() {
        if (!this._outputView.isExpanded) {
            await this._toggleOutput(true);
            return;
        }
        await this._toggleOutput(false);
    }
    async _collapseOutputAndFocusInput() {
        if (this._outputView.isExpanded) {
            await this._toggleOutput(false);
        }
        this._focusChatInput();
    }
    _resolveCommand(instance) {
        const commandDetection = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const commands = commandDetection?.commands;
        if (!commands || commands.length === 0) {
            return undefined;
        }
        return commands.find(c => c.id === this._terminalData.terminalCommandId);
    }
};
ChatTerminalToolProgressPart = __decorate([
    __param(8, IInstantiationService),
    __param(9, ITerminalChatService),
    __param(10, ITerminalService),
    __param(11, IContextKeyService),
    __param(12, IChatWidgetService),
    __param(13, IAccessibleViewService),
    __param(14, IKeybindingService)
], ChatTerminalToolProgressPart);
export { ChatTerminalToolProgressPart };
class ChatTerminalToolOutputSection extends Disposable {
    get isExpanded() {
        return this._container.classList.contains('expanded');
    }
    constructor(options) {
        super();
        this._lastOutputTruncated = false;
        this._onDidFocusEmitter = new Emitter();
        this._onDidBlurEmitter = new Emitter();
        this._container = options.container;
        this._title = options.title;
        this._displayCommand = options.displayCommand;
        this._terminalData = options.terminalData;
        this._accessibleViewService = options.accessibleViewService;
        this._onDidChangeHeight = options.onDidChangeHeight;
        this._ensureTerminalInstance = options.ensureTerminalInstance;
        this._resolveCommand = options.resolveCommand;
        this._getTerminalTheme = options.getTerminalTheme;
        this._getStoredCommandId = options.getStoredCommandId;
        this._outputAriaLabelBase = localize(5629, null, this._displayCommand);
        this._container.classList.add('collapsed');
        this._outputBody = dom.$('.chat-terminal-output-body');
        this.onDidFocus = this._onDidFocusEmitter.event;
        this.onDidBlur = this._onDidBlurEmitter.event;
        this._register(this._onDidFocusEmitter);
        this._register(this._onDidBlurEmitter);
        this._register(dom.addDisposableListener(this._container, dom.EventType.FOCUS_IN, () => this._onDidFocusEmitter.fire()));
        this._register(dom.addDisposableListener(this._container, dom.EventType.FOCUS_OUT, event => this._onDidBlurEmitter.fire(event)));
    }
    async toggle(expanded) {
        const currentlyExpanded = this.isExpanded;
        if (expanded === currentlyExpanded) {
            return false;
        }
        this._setExpanded(expanded);
        if (!expanded) {
            this._renderedOutputHeight = undefined;
            this._onDidChangeHeight();
            return true;
        }
        const didCreate = await this._renderOutputIfNeeded();
        this._layoutOutput();
        this._scrollOutputToBottom();
        if (didCreate) {
            this._scheduleOutputRelayout();
        }
        return true;
    }
    async ensureRendered() {
        await this._renderOutputIfNeeded();
        if (this.isExpanded) {
            this._layoutOutput();
            this._scrollOutputToBottom();
        }
    }
    focus() {
        this._outputScrollbar?.getDomNode().focus();
    }
    containsElement(element) {
        return !!element && this._container.contains(element);
    }
    updateAriaLabel() {
        if (!this._outputScrollbar) {
            return;
        }
        const scrollableDomNode = this._outputScrollbar.getDomNode();
        scrollableDomNode.setAttribute('role', 'region');
        const accessibleViewHint = this._accessibleViewService.getOpenAriaHint("accessibility.verbosity.terminalChatOutput" /* AccessibilityVerbositySettingId.TerminalChatOutput */);
        const label = accessibleViewHint
            ? this._outputAriaLabelBase + ', ' + accessibleViewHint
            : this._outputAriaLabelBase;
        scrollableDomNode.setAttribute('aria-label', label);
    }
    getCommandAndOutputAsText() {
        const commandHeader = localize(5630, null, this._displayCommand);
        const command = this._resolveCommand();
        const output = command?.getOutput()?.trimEnd();
        if (!output) {
            return `${commandHeader}\n${localize(5631, null)}`;
        }
        let result = `${commandHeader}\n${output}`;
        if (this._lastOutputTruncated) {
            result += `\n\n${localize(5632, null, CHAT_TERMINAL_OUTPUT_MAX_PREVIEW_LINES)}`;
        }
        return result;
    }
    _setExpanded(expanded) {
        this._container.classList.toggle('expanded', expanded);
        this._container.classList.toggle('collapsed', !expanded);
        this._title.classList.toggle('expanded', expanded);
    }
    async _renderOutputIfNeeded() {
        if (this._outputContent) {
            this._ensureOutputResizeObserver();
            return false;
        }
        const terminalInstance = await this._ensureTerminalInstance();
        const output = await this._collectOutput(terminalInstance);
        const serializedOutput = output ?? this._getStoredCommandOutput();
        if (!serializedOutput) {
            return false;
        }
        const content = this._renderOutput(serializedOutput).element;
        const theme = this._getTerminalTheme();
        if (theme && !content.classList.contains('chat-terminal-output-content-empty')) {
            // eslint-disable-next-line no-restricted-syntax
            const inlineTerminal = content.querySelector('div');
            if (inlineTerminal) {
                inlineTerminal.style.setProperty('background-color', theme.background || 'transparent');
                inlineTerminal.style.setProperty('color', theme.foreground || 'inherit');
            }
        }
        this._outputBody.replaceChildren(content);
        this._outputContent = content;
        if (!this._outputScrollbar) {
            this._outputScrollbar = this._register(new DomScrollableElement(this._outputBody, {
                vertical: 1 /* ScrollbarVisibility.Auto */,
                horizontal: 1 /* ScrollbarVisibility.Auto */,
                handleMouseWheel: true
            }));
            const scrollableDomNode = this._outputScrollbar.getDomNode();
            scrollableDomNode.tabIndex = 0;
            scrollableDomNode.style.maxHeight = `${MAX_TERMINAL_OUTPUT_PREVIEW_HEIGHT}px`;
            this._container.appendChild(scrollableDomNode);
            this._ensureOutputResizeObserver();
            this._outputContent = undefined;
            this._renderedOutputHeight = undefined;
        }
        else {
            this._ensureOutputResizeObserver();
        }
        this.updateAriaLabel();
        return true;
    }
    async _collectOutput(terminalInstance) {
        const commandDetection = terminalInstance?.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const commands = commandDetection?.commands;
        const xterm = await terminalInstance?.xtermReadyPromise;
        if (!commands || commands.length === 0 || !terminalInstance || !xterm) {
            return;
        }
        const commandId = this._terminalData.terminalCommandId ?? this._getStoredCommandId();
        if (!commandId) {
            return;
        }
        const command = commands.find(c => c.id === commandId);
        if (!command?.endMarker) {
            return;
        }
        const result = await xterm.getCommandOutputAsHtml(command, CHAT_TERMINAL_OUTPUT_MAX_PREVIEW_LINES);
        return { text: result.text, truncated: result.truncated ?? false };
    }
    _getStoredCommandOutput() {
        const stored = this._terminalData.terminalCommandOutput;
        if (!stored?.text) {
            return;
        }
        return {
            text: stored.text,
            truncated: stored.truncated ?? false
        };
    }
    _renderOutput(result) {
        this._lastOutputTruncated = result.truncated;
        const { content } = h('div.chat-terminal-output-content@content');
        let inlineOutput;
        let preElement;
        if (result.text.trim() === '') {
            content.classList.add('chat-terminal-output-content-empty');
            const { empty } = h('div.chat-terminal-output-empty@empty');
            empty.textContent = localize(5633, null);
            content.appendChild(empty);
        }
        else {
            const { pre } = h('pre.chat-terminal-output@pre');
            preElement = pre;
            domSanitize.safeSetInnerHtml(pre, result.text, sanitizerConfig);
            const firstChild = pre.firstElementChild;
            if (dom.isHTMLElement(firstChild)) {
                inlineOutput = firstChild;
            }
            content.appendChild(pre);
        }
        if (result.truncated) {
            const { info } = h('div.chat-terminal-output-info@info');
            info.textContent = localize(5634, null, CHAT_TERMINAL_OUTPUT_MAX_PREVIEW_LINES);
            content.appendChild(info);
        }
        return { element: content, inlineOutput, pre: preElement };
    }
    _scheduleOutputRelayout() {
        dom.getActiveWindow().requestAnimationFrame(() => {
            this._layoutOutput();
            this._scrollOutputToBottom();
        });
    }
    _layoutOutput() {
        if (!this._outputScrollbar || !this.isExpanded) {
            return;
        }
        const scrollableDomNode = this._outputScrollbar.getDomNode();
        const viewportHeight = Math.min(this._getOutputContentHeight(), MAX_TERMINAL_OUTPUT_PREVIEW_HEIGHT);
        scrollableDomNode.style.height = `${viewportHeight}px`;
        this._outputScrollbar.scanDomNode();
        if (this._renderedOutputHeight !== viewportHeight) {
            this._renderedOutputHeight = viewportHeight;
            this._onDidChangeHeight();
        }
    }
    _scrollOutputToBottom() {
        if (!this._outputScrollbar) {
            return;
        }
        const dimensions = this._outputScrollbar.getScrollDimensions();
        this._outputScrollbar.setScrollPosition({ scrollTop: dimensions.scrollHeight });
    }
    _getOutputContentHeight() {
        const firstChild = this._outputBody.firstElementChild;
        if (!firstChild) {
            return this._outputBody.scrollHeight;
        }
        const style = dom.getComputedStyle(this._outputBody);
        const paddingTop = Number.parseFloat(style.paddingTop || '0');
        const paddingBottom = Number.parseFloat(style.paddingBottom || '0');
        const padding = paddingTop + paddingBottom;
        return firstChild.scrollHeight + padding;
    }
    _ensureOutputResizeObserver() {
        if (this._outputResizeObserver || !this._outputScrollbar) {
            return;
        }
        const observer = new ResizeObserver(() => this._layoutOutput());
        observer.observe(this._container);
        this._outputResizeObserver = observer;
        this._register(toDisposable(() => {
            observer.disconnect();
            this._outputResizeObserver = undefined;
        }));
    }
}
export const focusMostRecentChatTerminalCommandId = 'workbench.action.chat.focusMostRecentChatTerminal';
export const focusMostRecentChatTerminalOutputCommandId = 'workbench.action.chat.focusMostRecentChatTerminalOutput';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: focusMostRecentChatTerminalCommandId,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ChatContextKeys.inChatSession,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 50 /* KeyCode.KeyT */,
    handler: async (accessor) => {
        const terminalChatService = accessor.get(ITerminalChatService);
        const part = terminalChatService.getMostRecentProgressPart();
        if (!part) {
            return;
        }
        await part.focusTerminal();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: focusMostRecentChatTerminalOutputCommandId,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ChatContextKeys.inChatSession,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 45 /* KeyCode.KeyO */,
    handler: async (accessor) => {
        const terminalChatService = accessor.get(ITerminalChatService);
        const part = terminalChatService.getMostRecentProgressPart();
        if (!part) {
            return;
        }
        await part.toggleOutputFromKeyboard();
    }
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: focusMostRecentChatTerminalCommandId,
        title: localize(5635, null),
    },
    when: ChatContextKeys.inChatSession
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: focusMostRecentChatTerminalOutputCommandId,
        title: localize(5636, null),
    },
    when: ChatContextKeys.inChatSession
});
export const openTerminalSettingsLinkCommandId = '_chat.openTerminalSettingsLink';
export const disableSessionAutoApprovalCommandId = '_chat.disableSessionAutoApproval';
CommandsRegistry.registerCommand(openTerminalSettingsLinkCommandId, async (accessor, scopeRaw) => {
    const preferencesService = accessor.get(IPreferencesService);
    if (scopeRaw === 'global') {
        preferencesService.openSettings({
            query: `@id:${ChatConfiguration.GlobalAutoApprove}`
        });
    }
    else {
        const scope = parseInt(scopeRaw);
        const target = !isNaN(scope) ? scope : undefined;
        const options = {
            jsonEditor: true,
            revealSetting: {
                key: "chat.tools.terminal.autoApprove" /* TerminalContribSettingId.AutoApprove */
            }
        };
        switch (target) {
            case 1 /* ConfigurationTarget.APPLICATION */:
                preferencesService.openApplicationSettings(options);
                break;
            case 2 /* ConfigurationTarget.USER */:
            case 3 /* ConfigurationTarget.USER_LOCAL */:
                preferencesService.openUserSettings(options);
                break;
            case 4 /* ConfigurationTarget.USER_REMOTE */:
                preferencesService.openRemoteSettings(options);
                break;
            case 5 /* ConfigurationTarget.WORKSPACE */:
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                preferencesService.openWorkspaceSettings(options);
                break;
            default: {
                // Fallback if something goes wrong
                preferencesService.openSettings({
                    target: 2 /* ConfigurationTarget.USER */,
                    query: `@id:${"chat.tools.terminal.autoApprove" /* TerminalContribSettingId.AutoApprove */}`,
                });
                break;
            }
        }
    }
});
CommandsRegistry.registerCommand(disableSessionAutoApprovalCommandId, async (accessor, chatSessionId) => {
    const terminalChatService = accessor.get(ITerminalChatService);
    terminalChatService.setChatSessionAutoApproval(chatSessionId, false);
});
let ToggleChatTerminalOutputAction = class ToggleChatTerminalOutputAction extends Action {
    constructor(_toggle, _keybindingService) {
        super('chat.showTerminalOutput', localize(5637, null), ThemeIcon.asClassName(Codicon.chevronRight), true);
        this._toggle = _toggle;
        this._keybindingService = _keybindingService;
        this._expanded = false;
        this._updateTooltip();
    }
    async run() {
        await this._toggle();
    }
    syncPresentation(expanded) {
        this._expanded = expanded;
        this._updatePresentation();
        this._updateTooltip();
    }
    refreshKeybindingTooltip() {
        this._updateTooltip();
    }
    _updatePresentation() {
        if (this._expanded) {
            this.label = localize(5638, null);
            this.class = ThemeIcon.asClassName(Codicon.chevronDown);
        }
        else {
            this.label = localize(5639, null);
            this.class = ThemeIcon.asClassName(Codicon.chevronRight);
        }
    }
    _updateTooltip() {
        const keybinding = this._keybindingService.lookupKeybinding(focusMostRecentChatTerminalOutputCommandId);
        const label = keybinding?.getLabel();
        this.tooltip = label ? `${this.label} (${label})` : this.label;
    }
};
ToggleChatTerminalOutputAction = __decorate([
    __param(1, IKeybindingService)
], ToggleChatTerminalOutputAction);
let FocusChatInstanceAction = class FocusChatInstanceAction extends Action {
    constructor(_instance, _command, _commandUri, _commandId, isTerminalHidden, _terminalService, _terminalEditorService, _terminalGroupService, _keybindingService) {
        super('chat.focusTerminalInstance', isTerminalHidden ? localize(5640, null) : localize(5641, null), ThemeIcon.asClassName(Codicon.openInProduct), true);
        this._instance = _instance;
        this._command = _command;
        this._commandUri = _commandUri;
        this._commandId = _commandId;
        this._terminalService = _terminalService;
        this._terminalEditorService = _terminalEditorService;
        this._terminalGroupService = _terminalGroupService;
        this._keybindingService = _keybindingService;
        this._updateTooltip();
    }
    async run() {
        this.label = localize(5642, null);
        this._updateTooltip();
        if (this._instance) {
            this._terminalService.setActiveInstance(this._instance);
            if (this._instance.target === TerminalLocation.Editor) {
                this._terminalEditorService.openEditor(this._instance);
            }
            else {
                await this._terminalGroupService.showPanel(true);
            }
            this._terminalService.setActiveInstance(this._instance);
            await this._instance.focusWhenReady(true);
            const command = this._resolveCommand();
            if (command) {
                this._instance.xterm?.markTracker.revealCommand(command);
            }
            return;
        }
        if (this._commandUri) {
            this._terminalService.openResource(this._commandUri);
        }
    }
    refreshKeybindingTooltip() {
        this._updateTooltip();
    }
    _resolveCommand() {
        if (this._command && !this._command.endMarker?.isDisposed) {
            return this._command;
        }
        if (!this._instance || !this._commandId) {
            return this._command;
        }
        const commandDetection = this._instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const resolved = commandDetection?.commands.find(c => c.id === this._commandId);
        if (resolved) {
            this._command = resolved;
        }
        return this._command;
    }
    _updateTooltip() {
        const keybinding = this._keybindingService.lookupKeybinding(focusMostRecentChatTerminalCommandId);
        const label = keybinding?.getLabel();
        this.tooltip = label ? `${this.label} (${label})` : this.label;
    }
};
FocusChatInstanceAction = __decorate([
    __param(5, ITerminalService),
    __param(6, ITerminalEditorService),
    __param(7, ITerminalGroupService),
    __param(8, IKeybindingService)
], FocusChatInstanceAction);
export { FocusChatInstanceAction };
//# sourceMappingURL=chatTerminalToolProgressPart.js.map