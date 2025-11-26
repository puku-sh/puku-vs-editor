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
var ChatContinueInSessionActionItem_1;
import { Codicon } from '../../../../../base/common/codicons.js';
import { basename } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { isITextModel } from '../../../../../editor/common/model.js';
import { localize, localize2 } from '../../../../../nls.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { Action2, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatRequestParser } from '../../common/chatRequestParser.js';
import { IChatService } from '../../common/chatService.js';
import { IChatSessionsService } from '../../common/chatSessionsService.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { AgentSessionProviders, getAgentSessionProviderIcon, getAgentSessionProviderName } from '../agentSessions/agentSessions.js';
import { IChatWidgetService } from '../chat.js';
import { CHAT_SETUP_ACTION_ID } from './chatActions.js';
export class ContinueChatInSessionAction extends Action2 {
    static { this.ID = 'workbench.action.chat.continueChatInSession'; }
    constructor() {
        super({
            id: ContinueChatInSessionAction.ID,
            title: localize2(5154, "Continue Chat in..."),
            tooltip: localize(5148, null),
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.requestInProgress.negate(), ChatContextKeys.remoteJobCreating.negate()),
            menu: {
                id: MenuId.ChatExecute,
                group: 'navigation',
                order: 3.4,
                when: ChatContextKeys.lockedToCodingAgent.negate(),
            }
        });
    }
    async run() {
        // Handled by a custom action item
    }
}
let ChatContinueInSessionActionItem = ChatContinueInSessionActionItem_1 = class ChatContinueInSessionActionItem extends ActionWidgetDropdownActionViewItem {
    constructor(action, actionWidgetService, contextKeyService, keybindingService, chatSessionsService, instantiationService, openerService) {
        super(action, {
            actionProvider: ChatContinueInSessionActionItem_1.actionProvider(chatSessionsService, instantiationService),
            actionBarActions: ChatContinueInSessionActionItem_1.getActionBarActions(openerService)
        }, actionWidgetService, keybindingService, contextKeyService);
        this.contextKeyService = contextKeyService;
    }
    static getActionBarActions(openerService) {
        const learnMoreUrl = 'https://aka.ms/vscode-continue-chat-in';
        return [{
                id: 'workbench.action.chat.continueChatInSession.learnMore',
                label: localize(5149, null),
                tooltip: localize(5150, null),
                class: undefined,
                enabled: true,
                run: async () => {
                    await openerService.open(URI.parse(learnMoreUrl));
                }
            }];
    }
    static actionProvider(chatSessionsService, instantiationService) {
        return {
            getActions: () => {
                const actions = [];
                const contributions = chatSessionsService.getAllChatSessionContributions();
                // Continue in Background
                const backgroundContrib = contributions.find(contrib => contrib.type === AgentSessionProviders.Background);
                if (backgroundContrib && backgroundContrib.canDelegate !== false) {
                    actions.push(this.toAction(AgentSessionProviders.Background, backgroundContrib, instantiationService));
                }
                // Continue in Cloud
                const cloudContrib = contributions.find(contrib => contrib.type === AgentSessionProviders.Cloud);
                if (cloudContrib && cloudContrib.canDelegate !== false) {
                    actions.push(this.toAction(AgentSessionProviders.Cloud, cloudContrib, instantiationService));
                }
                // Offer actions to enter setup if we have no contributions
                if (actions.length === 0) {
                    actions.push(this.toSetupAction(AgentSessionProviders.Background, instantiationService));
                    actions.push(this.toSetupAction(AgentSessionProviders.Cloud, instantiationService));
                }
                return actions;
            }
        };
    }
    static toAction(provider, contrib, instantiationService) {
        return {
            id: contrib.type,
            enabled: true,
            icon: getAgentSessionProviderIcon(provider),
            class: undefined,
            description: `@${contrib.name}`,
            label: localize(5151, null, getAgentSessionProviderName(provider)),
            tooltip: contrib.displayName,
            run: () => instantiationService.invokeFunction(accessor => new CreateRemoteAgentJobAction().run(accessor, contrib))
        };
    }
    static toSetupAction(provider, instantiationService) {
        return {
            id: provider,
            enabled: true,
            icon: getAgentSessionProviderIcon(provider),
            class: undefined,
            label: localize(5152, null, getAgentSessionProviderName(provider)),
            tooltip: localize(5153, null, getAgentSessionProviderName(provider)),
            run: () => instantiationService.invokeFunction(accessor => {
                const commandService = accessor.get(ICommandService);
                return commandService.executeCommand(CHAT_SETUP_ACTION_ID);
            })
        };
    }
    renderLabel(element) {
        const icon = this.contextKeyService.contextMatchesRules(ChatContextKeys.remoteJobCreating) ? Codicon.sync : Codicon.forward;
        element.classList.add(...ThemeIcon.asClassNameArray(icon));
        return super.renderLabel(element);
    }
};
ChatContinueInSessionActionItem = ChatContinueInSessionActionItem_1 = __decorate([
    __param(1, IActionWidgetService),
    __param(2, IContextKeyService),
    __param(3, IKeybindingService),
    __param(4, IChatSessionsService),
    __param(5, IInstantiationService),
    __param(6, IOpenerService)
], ChatContinueInSessionActionItem);
export { ChatContinueInSessionActionItem };
class CreateRemoteAgentJobAction {
    constructor() { }
    async run(accessor, continuationTarget) {
        const contextKeyService = accessor.get(IContextKeyService);
        const remoteJobCreatingKey = ChatContextKeys.remoteJobCreating.bindTo(contextKeyService);
        try {
            remoteJobCreatingKey.set(true);
            const widgetService = accessor.get(IChatWidgetService);
            const chatAgentService = accessor.get(IChatAgentService);
            const chatService = accessor.get(IChatService);
            const editorService = accessor.get(IEditorService);
            const widget = widgetService.lastFocusedWidget;
            if (!widget) {
                return;
            }
            if (!widget.viewModel) {
                return;
            }
            // todo@connor4312: remove 'as' cast
            const chatModel = widget.viewModel.model;
            if (!chatModel) {
                return;
            }
            const sessionResource = widget.viewModel.sessionResource;
            const chatRequests = chatModel.getRequests();
            let userPrompt = widget.getInput();
            if (!userPrompt) {
                if (!chatRequests.length) {
                    // Nothing to do
                    return;
                }
                userPrompt = 'implement this.';
            }
            const attachedContext = widget.input.getAttachedAndImplicitContext(sessionResource);
            widget.input.acceptInput(true);
            // For inline editor mode, add selection or cursor information
            if (widget.location === ChatAgentLocation.EditorInline) {
                const activeEditor = editorService.activeTextEditorControl;
                if (activeEditor) {
                    const model = activeEditor.getModel();
                    let activeEditorUri = undefined;
                    if (model && isITextModel(model)) {
                        activeEditorUri = model.uri;
                    }
                    const selection = activeEditor.getSelection();
                    if (activeEditorUri && selection) {
                        attachedContext.add({
                            kind: 'file',
                            id: 'vscode.implicit.selection',
                            name: basename(activeEditorUri),
                            value: {
                                uri: activeEditorUri,
                                range: selection
                            },
                        });
                    }
                }
            }
            const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Chat);
            const instantiationService = accessor.get(IInstantiationService);
            const requestParser = instantiationService.createInstance(ChatRequestParser);
            const continuationTargetType = continuationTarget.type;
            // Add the request to the model first
            const parsedRequest = requestParser.parseChatRequest(sessionResource, userPrompt, ChatAgentLocation.Chat);
            const addedRequest = chatModel.addRequest(parsedRequest, { variables: attachedContext.asArray() }, 0, undefined, defaultAgent);
            await chatService.removeRequest(sessionResource, addedRequest.id);
            await chatService.sendRequest(sessionResource, userPrompt, {
                agentIdSilent: continuationTargetType,
                attachedContext: attachedContext.asArray(),
            });
        }
        catch (e) {
            console.error('Error creating remote coding agent job', e);
            throw e;
        }
        finally {
            remoteJobCreatingKey.set(false);
        }
    }
}
//# sourceMappingURL=chatContinueInAction.js.map