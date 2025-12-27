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
import * as dom from '../../../../base/browser/dom.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { raceCancellationError } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import * as nls from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { editorBackground, editorForeground, inputBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { EDITOR_DRAG_AND_DROP_BACKGROUND } from '../../../common/theme.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { IChatService } from '../common/chatService.js';
import { IChatSessionsService, localChatSessionType } from '../common/chatSessionsService.js';
import { ChatAgentLocation, ChatModeKind } from '../common/constants.js';
import { clearChatEditor } from './actions/chatClear.js';
import { ChatEditorInput } from './chatEditorInput.js';
import { ChatWidget } from './chatWidget.js';
let ChatEditor = class ChatEditor extends EditorPane {
    get widget() {
        return this._widget;
    }
    get scopedContextKeyService() {
        return this._scopedContextKeyService;
    }
    constructor(group, telemetryService, themeService, instantiationService, storageService, chatSessionsService, contextKeyService, chatService) {
        super(ChatEditorInput.EditorID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.chatSessionsService = chatSessionsService;
        this.contextKeyService = contextKeyService;
        this.chatService = chatService;
        this.dimension = new dom.Dimension(0, 0);
    }
    async clear() {
        if (this.input) {
            return this.instantiationService.invokeFunction(clearChatEditor, this.input);
        }
    }
    createEditor(parent) {
        this._editorContainer = parent;
        // Ensure the container has position relative for the loading overlay
        parent.classList.add('chat-editor-relative');
        this._scopedContextKeyService = this._register(this.contextKeyService.createScoped(parent));
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        ChatContextKeys.inChatEditor.bindTo(this._scopedContextKeyService).set(true);
        this._widget = this._register(scopedInstantiationService.createInstance(ChatWidget, ChatAgentLocation.Chat, undefined, {
            autoScroll: mode => mode !== ChatModeKind.Ask,
            renderFollowups: true,
            supportsFileReferences: true,
            clear: () => this.clear(),
            rendererOptions: {
                renderTextEditsAsSummary: (uri) => {
                    return true;
                },
                referencesExpandedWhenEmptyResponse: false,
                progressMessageAtBottomOfResponse: mode => mode !== ChatModeKind.Ask,
            },
            enableImplicitContext: true,
            enableWorkingSet: 'explicit',
            supportsChangingModes: true,
        }, {
            listForeground: editorForeground,
            listBackground: editorBackground,
            overlayBackground: EDITOR_DRAG_AND_DROP_BACKGROUND,
            inputEditorBackground: inputBackground,
            resultEditorBackground: editorBackground
        }));
        this.widget.render(parent);
        this.widget.setVisible(true);
    }
    setEditorVisible(visible) {
        super.setEditorVisible(visible);
        this.widget?.setVisible(visible);
        if (visible && this.widget) {
            this.widget.layout(this.dimension.height, this.dimension.width);
        }
    }
    focus() {
        super.focus();
        this.widget?.focusInput();
    }
    clearInput() {
        this.saveState();
        super.clearInput();
    }
    showLoadingInChatWidget(message) {
        if (!this._editorContainer) {
            return;
        }
        // If already showing, just update text
        if (this._loadingContainer) {
            // eslint-disable-next-line no-restricted-syntax
            const existingText = this._loadingContainer.querySelector('.chat-loading-content span');
            if (existingText) {
                existingText.textContent = message;
                return; // aria-live will announce the text change
            }
            this.hideLoadingInChatWidget(); // unexpected structure
        }
        // Mark container busy for assistive technologies
        this._editorContainer.setAttribute('aria-busy', 'true');
        this._loadingContainer = dom.append(this._editorContainer, dom.$('.chat-loading-overlay'));
        // Accessibility: announce loading state politely without stealing focus
        this._loadingContainer.setAttribute('role', 'status');
        this._loadingContainer.setAttribute('aria-live', 'polite');
        // Rely on live region text content instead of aria-label to avoid duplicate announcements
        this._loadingContainer.tabIndex = -1; // ensure it isn't focusable
        const loadingContent = dom.append(this._loadingContainer, dom.$('.chat-loading-content'));
        const spinner = renderIcon(ThemeIcon.modify(Codicon.loading, 'spin'));
        spinner.setAttribute('aria-hidden', 'true');
        loadingContent.appendChild(spinner);
        const text = dom.append(loadingContent, dom.$('span'));
        text.textContent = message;
    }
    hideLoadingInChatWidget() {
        if (this._loadingContainer) {
            this._loadingContainer.remove();
            this._loadingContainer = undefined;
        }
        if (this._editorContainer) {
            this._editorContainer.removeAttribute('aria-busy');
        }
    }
    async setInput(input, options, context, token) {
        // Show loading indicator early for non-local sessions to prevent layout shifts
        let isContributedChatSession = false;
        const chatSessionType = input.getSessionType();
        if (chatSessionType !== localChatSessionType) {
            const loadingMessage = nls.localize('chatEditor.loadingSession', "Loading...");
            this.showLoadingInChatWidget(loadingMessage);
        }
        await super.setInput(input, options, context, token);
        if (token.isCancellationRequested) {
            this.hideLoadingInChatWidget();
            return;
        }
        if (!this.widget) {
            throw new Error('ChatEditor lifecycle issue: no editor widget');
        }
        if (chatSessionType !== localChatSessionType) {
            try {
                await raceCancellationError(this.chatSessionsService.canResolveChatSession(input.resource), token);
                const contributions = this.chatSessionsService.getAllChatSessionContributions();
                const contribution = contributions.find(c => c.type === chatSessionType);
                if (contribution) {
                    this.widget.lockToCodingAgent(contribution.name, contribution.displayName, contribution.type);
                    isContributedChatSession = true;
                }
                else {
                    this.widget.unlockFromCodingAgent();
                }
            }
            catch (error) {
                this.hideLoadingInChatWidget();
                throw error;
            }
        }
        else {
            this.widget.unlockFromCodingAgent();
        }
        try {
            const editorModel = await raceCancellationError(input.resolve(), token);
            if (!editorModel) {
                throw new Error(`Failed to get model for chat editor. resource: ${input.sessionResource}`);
            }
            // Hide loading state before updating model
            if (chatSessionType !== localChatSessionType) {
                this.hideLoadingInChatWidget();
            }
            if (options?.modelInputState) {
                editorModel.model.inputModel.setState(options.modelInputState);
            }
            this.updateModel(editorModel.model);
            if (isContributedChatSession && options?.title?.preferred && input.sessionResource) {
                this.chatService.setChatSessionTitle(input.sessionResource, options.title.preferred);
            }
        }
        catch (error) {
            this.hideLoadingInChatWidget();
            throw error;
        }
    }
    updateModel(model) {
        this.widget.setModel(model);
    }
    layout(dimension, position) {
        this.dimension = dimension;
        if (this.widget) {
            this.widget.layout(dimension.height, dimension.width);
        }
    }
};
ChatEditor = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IInstantiationService),
    __param(4, IStorageService),
    __param(5, IChatSessionsService),
    __param(6, IContextKeyService),
    __param(7, IChatService)
], ChatEditor);
export { ChatEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsa0JBQWtCLEVBQTRCLE1BQU0sc0RBQXNELENBQUM7QUFFcEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDbkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN6SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXpFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRTNF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