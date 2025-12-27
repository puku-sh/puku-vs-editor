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
import { coalesce, isNonEmptyArray } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Event } from '../../../../base/common/event.js';
import { createCommandUri, MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
import { localize, localize2 } from '../../../../nls.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Extensions as ViewExtensions } from '../../../common/views.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import * as extensionsRegistry from '../../../services/extensions/common/extensionsRegistry.js';
import { showExtensionsWithIdsCommandId } from '../../extensions/browser/extensionsActions.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatAgentLocation, ChatModeKind } from '../common/constants.js';
import { ChatViewId } from './chat.js';
import { CHAT_SIDEBAR_PANEL_ID, ChatViewPane } from './chatViewPane.js';
// --- Chat Container &  View Registration
const chatViewContainer = Registry.as(ViewExtensions.ViewContainersRegistry).registerViewContainer({
    id: CHAT_SIDEBAR_PANEL_ID,
    title: localize2('chat.viewContainer.label', "Chat"),
    icon: Codicon.chatSparkle,
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CHAT_SIDEBAR_PANEL_ID, { mergeViewWithContainerWhenSingleView: true }]),
    storageId: CHAT_SIDEBAR_PANEL_ID,
    hideIfEmpty: true,
    order: 1,
}, 2 /* ViewContainerLocation.AuxiliaryBar */, { isDefault: true, doNotRegisterOpenCommand: true });
const chatViewDescriptor = {
    id: ChatViewId,
    containerIcon: chatViewContainer.icon,
    containerTitle: chatViewContainer.title.value,
    singleViewPaneContainerTitle: chatViewContainer.title.value,
    name: localize2('chat.viewContainer.label', "Chat"),
    canToggleVisibility: false,
    canMoveView: true,
    openCommandActionDescriptor: {
        id: CHAT_SIDEBAR_PANEL_ID,
        title: chatViewContainer.title,
        mnemonicTitle: localize({ key: 'miToggleChat', comment: ['&& denotes a mnemonic'] }, "&&Chat"),
        keybindings: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 39 /* KeyCode.KeyI */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 39 /* KeyCode.KeyI */
            }
        },
        order: 1
    },
    ctorDescriptor: new SyncDescriptor(ChatViewPane, [{ location: ChatAgentLocation.Chat }]),
    when: ContextKeyExpr.or(ContextKeyExpr.or(ChatContextKeys.Setup.hidden, ChatContextKeys.Setup.disabled)?.negate(), ChatContextKeys.panelParticipantRegistered, ChatContextKeys.extensionInvalid)
};
Registry.as(ViewExtensions.ViewsRegistry).registerViews([chatViewDescriptor], chatViewContainer);
const chatParticipantExtensionPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'chatParticipants',
    jsonSchema: {
        description: localize('vscode.extension.contributes.chatParticipant', 'Contributes a chat participant'),
        type: 'array',
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{ body: { name: '', description: '' } }],
            required: ['name', 'id'],
            properties: {
                id: {
                    description: localize('chatParticipantId', "A unique id for this chat participant."),
                    type: 'string'
                },
                name: {
                    description: localize('chatParticipantName', "User-facing name for this chat participant. The user will use '@' with this name to invoke the participant. Name must not contain whitespace."),
                    type: 'string',
                    pattern: '^[\\w-]+$'
                },
                fullName: {
                    markdownDescription: localize('chatParticipantFullName', "The full name of this chat participant, which is shown as the label for responses coming from this participant. If not provided, {0} is used.", '`name`'),
                    type: 'string'
                },
                description: {
                    description: localize('chatParticipantDescription', "A description of this chat participant, shown in the UI."),
                    type: 'string'
                },
                isSticky: {
                    description: localize('chatCommandSticky', "Whether invoking the command puts the chat into a persistent mode, where the command is automatically added to the chat input for the next message."),
                    type: 'boolean'
                },
                sampleRequest: {
                    description: localize('chatSampleRequest', "When the user clicks this participant in `/help`, this text will be submitted to the participant."),
                    type: 'string'
                },
                when: {
                    description: localize('chatParticipantWhen', "A condition which must be true to enable this participant."),
                    type: 'string'
                },
                disambiguation: {
                    description: localize('chatParticipantDisambiguation', "Metadata to help with automatically routing user questions to this chat participant."),
                    type: 'array',
                    items: {
                        additionalProperties: false,
                        type: 'object',
                        defaultSnippets: [{ body: { category: '', description: '', examples: [] } }],
                        required: ['category', 'description', 'examples'],
                        properties: {
                            category: {
                                markdownDescription: localize('chatParticipantDisambiguationCategory', "A detailed name for this category, e.g. `workspace_questions` or `web_questions`."),
                                type: 'string'
                            },
                            description: {
                                description: localize('chatParticipantDisambiguationDescription', "A detailed description of the kinds of questions that are suitable for this chat participant."),
                                type: 'string'
                            },
                            examples: {
                                description: localize('chatParticipantDisambiguationExamples', "A list of representative example questions that are suitable for this chat participant."),
                                type: 'array'
                            },
                        }
                    }
                },
                commands: {
                    markdownDescription: localize('chatCommandsDescription', "Commands available for this chat participant, which the user can invoke with a `/`."),
                    type: 'array',
                    items: {
                        additionalProperties: false,
                        type: 'object',
                        defaultSnippets: [{ body: { name: '', description: '' } }],
                        required: ['name'],
                        properties: {
                            name: {
                                description: localize('chatCommand', "A short name by which this command is referred to in the UI, e.g. `fix` or `explain` for commands that fix an issue or explain code. The name should be unique among the commands provided by this participant."),
                                type: 'string'
                            },
                            description: {
                                description: localize('chatCommandDescription', "A description of this command."),
                                type: 'string'
                            },
                            when: {
                                description: localize('chatCommandWhen', "A condition which must be true to enable this command."),
                                type: 'string'
                            },
                            sampleRequest: {
                                description: localize('chatCommandSampleRequest', "When the user clicks this command in `/help`, this text will be submitted to the participant."),
                                type: 'string'
                            },
                            isSticky: {
                                description: localize('chatCommandSticky', "Whether invoking the command puts the chat into a persistent mode, where the command is automatically added to the chat input for the next message."),
                                type: 'boolean'
                            },
                            disambiguation: {
                                description: localize('chatCommandDisambiguation', "Metadata to help with automatically routing user questions to this chat command."),
                                type: 'array',
                                items: {
                                    additionalProperties: false,
                                    type: 'object',
                                    defaultSnippets: [{ body: { category: '', description: '', examples: [] } }],
                                    required: ['category', 'description', 'examples'],
                                    properties: {
                                        category: {
                                            markdownDescription: localize('chatCommandDisambiguationCategory', "A detailed name for this category, e.g. `workspace_questions` or `web_questions`."),
                                            type: 'string'
                                        },
                                        description: {
                                            description: localize('chatCommandDisambiguationDescription', "A detailed description of the kinds of questions that are suitable for this chat command."),
                                            type: 'string'
                                        },
                                        examples: {
                                            description: localize('chatCommandDisambiguationExamples', "A list of representative example questions that are suitable for this chat command."),
                                            type: 'array'
                                        },
                                    }
                                }
                            }
                        }
                    }
                },
            }
        }
    },
    activationEventsGenerator: function* (contributions) {
        for (const contrib of contributions) {
            yield `onChatParticipant:${contrib.id}`;
        }
    },
});
let ChatExtensionPointHandler = class ChatExtensionPointHandler {
    static { this.ID = 'workbench.contrib.chatExtensionPointHandler'; }
    constructor(_chatAgentService) {
        this._chatAgentService = _chatAgentService;
        this._participantRegistrationDisposables = new DisposableMap();
        this.handleAndRegisterChatExtensions();
    }
    handleAndRegisterChatExtensions() {
        chatParticipantExtensionPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                for (const providerDescriptor of extension.value) {
                    if (!providerDescriptor.name?.match(/^[\w-]+$/)) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register participant with invalid name: ${providerDescriptor.name}. Name must match /^[\\w-]+$/.`);
                        continue;
                    }
                    if (providerDescriptor.fullName && strings.AmbiguousCharacters.getInstance(new Set()).containsAmbiguousCharacter(providerDescriptor.fullName)) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register participant with fullName that contains ambiguous characters: ${providerDescriptor.fullName}.`);
                        continue;
                    }
                    // Spaces are allowed but considered "invisible"
                    if (providerDescriptor.fullName && strings.InvisibleCharacters.containsInvisibleCharacter(providerDescriptor.fullName.replace(/ /g, ''))) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register participant with fullName that contains invisible characters: ${providerDescriptor.fullName}.`);
                        continue;
                    }
                    if ((providerDescriptor.isDefault || providerDescriptor.modes) && !isProposedApiEnabled(extension.description, 'defaultChatParticipant')) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT use API proposal: defaultChatParticipant.`);
                        continue;
                    }
                    if (providerDescriptor.locations && !isProposedApiEnabled(extension.description, 'chatParticipantAdditions')) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT use API proposal: chatParticipantAdditions.`);
                        continue;
                    }
                    if (!providerDescriptor.id || !providerDescriptor.name) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register participant without both id and name.`);
                        continue;
                    }
                    const participantsDisambiguation = [];
                    if (providerDescriptor.disambiguation?.length) {
                        participantsDisambiguation.push(...providerDescriptor.disambiguation.map((d) => ({
                            ...d, category: d.category ?? d.categoryName
                        })));
                    }
                    try {
                        const store = new DisposableStore();
                        store.add(this._chatAgentService.registerAgent(providerDescriptor.id, {
                            extensionId: extension.description.identifier,
                            extensionVersion: extension.description.version,
                            publisherDisplayName: extension.description.publisherDisplayName ?? extension.description.publisher, // May not be present in OSS
                            extensionPublisherId: extension.description.publisher,
                            extensionDisplayName: extension.description.displayName ?? extension.description.name,
                            id: providerDescriptor.id,
                            description: providerDescriptor.description,
                            when: providerDescriptor.when,
                            metadata: {
                                isSticky: providerDescriptor.isSticky,
                                sampleRequest: providerDescriptor.sampleRequest,
                            },
                            name: providerDescriptor.name,
                            fullName: providerDescriptor.fullName,
                            isDefault: providerDescriptor.isDefault,
                            locations: isNonEmptyArray(providerDescriptor.locations) ?
                                providerDescriptor.locations.map(ChatAgentLocation.fromRaw) :
                                [ChatAgentLocation.Chat],
                            modes: providerDescriptor.isDefault ? (providerDescriptor.modes ?? [ChatModeKind.Ask]) : [ChatModeKind.Agent, ChatModeKind.Ask, ChatModeKind.Edit],
                            slashCommands: providerDescriptor.commands ?? [],
                            disambiguation: coalesce(participantsDisambiguation.flat()),
                        }));
                        this._participantRegistrationDisposables.set(getParticipantKey(extension.description.identifier, providerDescriptor.id), store);
                    }
                    catch (e) {
                        extension.collector.error(`Failed to register participant ${providerDescriptor.id}: ${toErrorMessage(e, true)}`);
                    }
                }
            }
            for (const extension of delta.removed) {
                for (const providerDescriptor of extension.value) {
                    this._participantRegistrationDisposables.deleteAndDispose(getParticipantKey(extension.description.identifier, providerDescriptor.id));
                }
            }
        });
    }
};
ChatExtensionPointHandler = __decorate([
    __param(0, IChatAgentService)
], ChatExtensionPointHandler);
export { ChatExtensionPointHandler };
function getParticipantKey(extensionId, participantName) {
    return `${extensionId.value}_${participantName}`;
}
let ChatCompatibilityNotifier = class ChatCompatibilityNotifier extends Disposable {
    static { this.ID = 'workbench.contrib.chatCompatNotifier'; }
    constructor(extensionsWorkbenchService, contextKeyService, productService) {
        super();
        this.productService = productService;
        this.registeredWelcomeView = false;
        // It may be better to have some generic UI for this, for any extension that is incompatible,
        // but this is only enabled for Chat now and it needs to be obvious.
        const isInvalid = ChatContextKeys.extensionInvalid.bindTo(contextKeyService);
        this._register(Event.runAndSubscribe(extensionsWorkbenchService.onDidChangeExtensionsNotification, () => {
            const notification = extensionsWorkbenchService.getExtensionsNotification();
            const chatExtension = notification?.extensions.find(ext => ExtensionIdentifier.equals(ext.identifier.id, this.productService.defaultChatAgent?.chatExtensionId));
            if (chatExtension) {
                isInvalid.set(true);
                this.registerWelcomeView(chatExtension);
            }
            else {
                isInvalid.set(false);
            }
        }));
    }
    registerWelcomeView(chatExtension) {
        if (this.registeredWelcomeView) {
            return;
        }
        this.registeredWelcomeView = true;
        const showExtensionLabel = localize('showExtension', "Show Extension");
        const mainMessage = localize('chatFailErrorMessage', "Chat failed to load because the installed version of the Copilot Chat extension is not compatible with this version of {0}. Please ensure that the Copilot Chat extension is up to date.", this.productService.nameLong);
        const commandButton = `[${showExtensionLabel}](${createCommandUri(showExtensionsWithIdsCommandId, [this.productService.defaultChatAgent?.chatExtensionId])})`;
        const versionMessage = `Copilot Chat version: ${chatExtension.version}`;
        const viewsRegistry = Registry.as(ViewExtensions.ViewsRegistry);
        this._register(viewsRegistry.registerViewWelcomeContent(ChatViewId, {
            content: [mainMessage, commandButton, versionMessage].join('\n\n'),
            when: ChatContextKeys.extensionInvalid,
        }));
    }
};
ChatCompatibilityNotifier = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IContextKeyService),
    __param(2, IProductService)
], ChatCompatibilityNotifier);
export { ChatCompatibilityNotifier };
class ChatParticipantDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.chatParticipants;
    }
    render(manifest) {
        const nonDefaultContributions = manifest.contributes?.chatParticipants?.filter(c => !c.isDefault) ?? [];
        if (!nonDefaultContributions.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('participantName', "Name"),
            localize('participantFullName', "Full Name"),
            localize('participantDescription', "Description"),
            localize('participantCommands', "Commands"),
        ];
        const rows = nonDefaultContributions.map(d => {
            return [
                '@' + d.name,
                d.fullName,
                d.description ?? '-',
                d.commands?.length ? new MarkdownString(d.commands.map(c => `- /` + c.name).join('\n')) : '-'
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'chatParticipants',
    label: localize('chatParticipants', "Chat Participants"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ChatParticipantDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhcnRpY2lwYW50LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0UGFydGljaXBhbnQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUcsT0FBTyxFQUFFLG1CQUFtQixFQUFzQixNQUFNLHNEQUFzRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxpQkFB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