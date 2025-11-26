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
import { sep } from '../../../../base/common/path.js';
import { raceCancellationError } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import * as resources from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, IMenuService, MenuId, MenuItemAction, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isDark } from '../../../../platform/theme/common/theme.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { ChatEditorInput } from '../browser/chatEditorInput.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { IChatSessionsService, localChatSessionType } from '../common/chatSessionsService.js';
import { LEGACY_AGENT_SESSIONS_VIEW_ID, ChatAgentLocation, ChatModeKind } from '../common/constants.js';
import { CHAT_CATEGORY } from './actions/chatActions.js';
import { NEW_CHAT_SESSION_ACTION_ID } from './chatSessions/common.js';
const extensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'chatSessions',
    jsonSchema: {
        description: localize('chatSessionsExtPoint', 'Contributes chat session integrations to the chat widget.'),
        type: 'array',
        items: {
            type: 'object',
            additionalProperties: false,
            properties: {
                type: {
                    description: localize('chatSessionsExtPoint.chatSessionType', 'Unique identifier for the type of chat session.'),
                    type: 'string',
                },
                name: {
                    description: localize('chatSessionsExtPoint.name', 'Name of the dynamically registered chat participant (eg: @agent). Must not contain whitespace.'),
                    type: 'string',
                    pattern: '^[\\w-]+$'
                },
                displayName: {
                    description: localize('chatSessionsExtPoint.displayName', 'A longer name for this item which is used for display in menus.'),
                    type: 'string',
                },
                description: {
                    description: localize('chatSessionsExtPoint.description', 'Description of the chat session for use in menus and tooltips.'),
                    type: 'string'
                },
                when: {
                    description: localize('chatSessionsExtPoint.when', 'Condition which must be true to show this item.'),
                    type: 'string'
                },
                icon: {
                    description: localize('chatSessionsExtPoint.icon', 'Icon identifier (codicon ID) for the chat session editor tab. For example, "$(github)" or "$(cloud)".'),
                    anyOf: [{
                            type: 'string'
                        },
                        {
                            type: 'object',
                            properties: {
                                light: {
                                    description: localize('icon.light', 'Icon path when a light theme is used'),
                                    type: 'string'
                                },
                                dark: {
                                    description: localize('icon.dark', 'Icon path when a dark theme is used'),
                                    type: 'string'
                                }
                            }
                        }]
                },
                order: {
                    description: localize('chatSessionsExtPoint.order', 'Order in which this item should be displayed.'),
                    type: 'integer'
                },
                alternativeIds: {
                    description: localize('chatSessionsExtPoint.alternativeIds', 'Alternative identifiers for backward compatibility.'),
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                welcomeTitle: {
                    description: localize('chatSessionsExtPoint.welcomeTitle', 'Title text to display in the chat welcome view for this session type.'),
                    type: 'string'
                },
                welcomeMessage: {
                    description: localize('chatSessionsExtPoint.welcomeMessage', 'Message text (supports markdown) to display in the chat welcome view for this session type.'),
                    type: 'string'
                },
                welcomeTips: {
                    description: localize('chatSessionsExtPoint.welcomeTips', 'Tips text (supports markdown and theme icons) to display in the chat welcome view for this session type.'),
                    type: 'string'
                },
                inputPlaceholder: {
                    description: localize('chatSessionsExtPoint.inputPlaceholder', 'Placeholder text to display in the chat input box for this session type.'),
                    type: 'string'
                },
                capabilities: {
                    description: localize('chatSessionsExtPoint.capabilities', 'Optional capabilities for this chat session.'),
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        supportsFileAttachments: {
                            description: localize('chatSessionsExtPoint.supportsFileAttachments', 'Whether this chat session supports attaching files or file references.'),
                            type: 'boolean'
                        },
                        supportsToolAttachments: {
                            description: localize('chatSessionsExtPoint.supportsToolAttachments', 'Whether this chat session supports attaching tools or tool references.'),
                            type: 'boolean'
                        },
                        supportsMCPAttachments: {
                            description: localize('chatSessionsExtPoint.supportsMCPAttachments', 'Whether this chat session supports attaching MCP resources.'),
                            type: 'boolean'
                        },
                        supportsImageAttachments: {
                            description: localize('chatSessionsExtPoint.supportsImageAttachments', 'Whether this chat session supports attaching images.'),
                            type: 'boolean'
                        },
                        supportsSearchResultAttachments: {
                            description: localize('chatSessionsExtPoint.supportsSearchResultAttachments', 'Whether this chat session supports attaching search results.'),
                            type: 'boolean'
                        },
                        supportsInstructionAttachments: {
                            description: localize('chatSessionsExtPoint.supportsInstructionAttachments', 'Whether this chat session supports attaching instructions.'),
                            type: 'boolean'
                        },
                        supportsSourceControlAttachments: {
                            description: localize('chatSessionsExtPoint.supportsSourceControlAttachments', 'Whether this chat session supports attaching source control changes.'),
                            type: 'boolean'
                        },
                        supportsProblemAttachments: {
                            description: localize('chatSessionsExtPoint.supportsProblemAttachments', 'Whether this chat session supports attaching problems.'),
                            type: 'boolean'
                        },
                        supportsSymbolAttachments: {
                            description: localize('chatSessionsExtPoint.supportsSymbolAttachments', 'Whether this chat session supports attaching symbols.'),
                            type: 'boolean'
                        }
                    }
                },
                commands: {
                    markdownDescription: localize('chatCommandsDescription', "Commands available for this chat session, which the user can invoke with a `/`."),
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
                        }
                    }
                },
                canDelegate: {
                    description: localize('chatSessionsExtPoint.canDelegate', 'Whether delegation is supported. Defaults to true.'),
                    type: 'boolean',
                    default: true
                }
            },
            required: ['type', 'name', 'displayName', 'description'],
        }
    },
    activationEventsGenerator: function* (contribs) {
        for (const contrib of contribs) {
            yield `onChatSession:${contrib.type}`;
        }
    }
});
class ContributedChatSessionData extends Disposable {
    getOption(optionId) {
        return this._optionsCache.get(optionId);
    }
    setOption(optionId, value) {
        this._optionsCache.set(optionId, value);
    }
    constructor(session, chatSessionType, resource, options, onWillDispose) {
        super();
        this.session = session;
        this.chatSessionType = chatSessionType;
        this.resource = resource;
        this.options = options;
        this.onWillDispose = onWillDispose;
        this._optionsCache = new Map();
        if (options) {
            for (const [key, value] of Object.entries(options)) {
                this._optionsCache.set(key, value);
            }
        }
        this._register(this.session.onWillDispose(() => {
            this.onWillDispose(this.resource);
        }));
    }
}
let ChatSessionsService = class ChatSessionsService extends Disposable {
    get onDidChangeInProgress() { return this._onDidChangeInProgress.event; }
    get onDidChangeContentProviderSchemes() { return this._onDidChangeContentProviderSchemes.event; }
    constructor(_logService, _chatAgentService, _extensionService, _contextKeyService, _menuService, _themeService, _labelService) {
        super();
        this._logService = _logService;
        this._chatAgentService = _chatAgentService;
        this._extensionService = _extensionService;
        this._contextKeyService = _contextKeyService;
        this._menuService = _menuService;
        this._themeService = _themeService;
        this._labelService = _labelService;
        this._itemsProviders = new Map();
        this._contributions = new Map();
        this._contributionDisposables = this._register(new DisposableMap());
        this._contentProviders = new Map();
        this._alternativeIdMap = new Map();
        this._contextKeys = new Set();
        this._onDidChangeItemsProviders = this._register(new Emitter());
        this.onDidChangeItemsProviders = this._onDidChangeItemsProviders.event;
        this._onDidChangeSessionItems = this._register(new Emitter());
        this.onDidChangeSessionItems = this._onDidChangeSessionItems.event;
        this._onDidChangeAvailability = this._register(new Emitter());
        this.onDidChangeAvailability = this._onDidChangeAvailability.event;
        this._onDidChangeInProgress = this._register(new Emitter());
        this._onDidChangeContentProviderSchemes = this._register(new Emitter());
        this.inProgressMap = new Map();
        this._sessionTypeOptions = new Map();
        this._sessionTypeIcons = new Map();
        this._sessionTypeWelcomeTitles = new Map();
        this._sessionTypeWelcomeMessages = new Map();
        this._sessionTypeWelcomeTips = new Map();
        this._sessionTypeInputPlaceholders = new Map();
        this._sessions = new ResourceMap();
        this._editableSessions = new ResourceMap();
        this._register(extensionPoint.setHandler(extensions => {
            for (const ext of extensions) {
                if (!isProposedApiEnabled(ext.description, 'chatSessionsProvider')) {
                    continue;
                }
                if (!Array.isArray(ext.value)) {
                    continue;
                }
                for (const contribution of ext.value) {
                    this._register(this.registerContribution(contribution, ext.description));
                }
            }
        }));
        // Listen for context changes and re-evaluate contributions
        this._register(Event.filter(this._contextKeyService.onDidChangeContext, e => e.affectsSome(this._contextKeys))(() => {
            this._evaluateAvailability();
        }));
        this._register(this.onDidChangeSessionItems(chatSessionType => {
            this.updateInProgressStatus(chatSessionType).catch(error => {
                this._logService.warn(`Failed to update progress status for '${chatSessionType}':`, error);
            });
        }));
        this._register(this._labelService.registerFormatter({
            scheme: Schemas.copilotPr,
            formatting: {
                label: '${authority}${path}',
                separator: sep,
                stripPathStartingSeparator: true,
            }
        }));
    }
    reportInProgress(chatSessionType, count) {
        let displayName;
        if (chatSessionType === localChatSessionType) {
            displayName = 'Local Chat Agent';
        }
        else {
            displayName = this._contributions.get(chatSessionType)?.contribution.displayName;
        }
        if (displayName) {
            this.inProgressMap.set(displayName, count);
        }
        this._onDidChangeInProgress.fire();
    }
    getInProgress() {
        return Array.from(this.inProgressMap.entries()).map(([displayName, count]) => ({ displayName, count }));
    }
    async updateInProgressStatus(chatSessionType) {
        try {
            const items = await this.getChatSessionItems(chatSessionType, CancellationToken.None);
            const inProgress = items.filter(item => item.status === 2 /* ChatSessionStatus.InProgress */);
            this.reportInProgress(chatSessionType, inProgress.length);
        }
        catch (error) {
            this._logService.warn(`Failed to update in-progress status for chat session type '${chatSessionType}':`, error);
        }
    }
    registerContribution(contribution, ext) {
        if (this._contributions.has(contribution.type)) {
            return { dispose: () => { } };
        }
        // Track context keys from the when condition
        if (contribution.when) {
            const whenExpr = ContextKeyExpr.deserialize(contribution.when);
            if (whenExpr) {
                for (const key of whenExpr.keys()) {
                    this._contextKeys.add(key);
                }
            }
        }
        this._contributions.set(contribution.type, { contribution, extension: ext });
        // Register alternative IDs if provided
        if (contribution.alternativeIds) {
            for (const altId of contribution.alternativeIds) {
                if (this._alternativeIdMap.has(altId)) {
                    this._logService.warn(`Alternative ID '${altId}' is already mapped to '${this._alternativeIdMap.get(altId)}'. Remapping to '${contribution.type}'.`);
                }
                this._alternativeIdMap.set(altId, contribution.type);
            }
        }
        // Store icon mapping if provided
        let icon;
        if (contribution.icon) {
            // Parse icon string - support ThemeIcon format or file path from extension
            if (typeof contribution.icon === 'string') {
                icon = contribution.icon.startsWith('$(') && contribution.icon.endsWith(')')
                    ? ThemeIcon.fromString(contribution.icon)
                    : ThemeIcon.fromId(contribution.icon);
            }
            else {
                icon = {
                    dark: resources.joinPath(ext.extensionLocation, contribution.icon.dark),
                    light: resources.joinPath(ext.extensionLocation, contribution.icon.light)
                };
            }
        }
        if (icon) {
            this._sessionTypeIcons.set(contribution.type, icon);
        }
        // Store welcome title, message, tips, and input placeholder if provided
        if (contribution.welcomeTitle) {
            this._sessionTypeWelcomeTitles.set(contribution.type, contribution.welcomeTitle);
        }
        if (contribution.welcomeMessage) {
            this._sessionTypeWelcomeMessages.set(contribution.type, contribution.welcomeMessage);
        }
        if (contribution.welcomeTips) {
            this._sessionTypeWelcomeTips.set(contribution.type, contribution.welcomeTips);
        }
        if (contribution.inputPlaceholder) {
            this._sessionTypeInputPlaceholders.set(contribution.type, contribution.inputPlaceholder);
        }
        this._evaluateAvailability();
        return {
            dispose: () => {
                this._contributions.delete(contribution.type);
                // Remove alternative ID mappings
                if (contribution.alternativeIds) {
                    for (const altId of contribution.alternativeIds) {
                        if (this._alternativeIdMap.get(altId) === contribution.type) {
                            this._alternativeIdMap.delete(altId);
                        }
                    }
                }
                this._sessionTypeIcons.delete(contribution.type);
                this._sessionTypeWelcomeTitles.delete(contribution.type);
                this._sessionTypeWelcomeMessages.delete(contribution.type);
                this._sessionTypeWelcomeTips.delete(contribution.type);
                this._sessionTypeInputPlaceholders.delete(contribution.type);
                this._contributionDisposables.deleteAndDispose(contribution.type);
            }
        };
    }
    _isContributionAvailable(contribution) {
        if (!contribution.when) {
            return true;
        }
        const whenExpr = ContextKeyExpr.deserialize(contribution.when);
        return !whenExpr || this._contextKeyService.contextMatchesRules(whenExpr);
    }
    /**
     * Resolves a session type to its primary type, checking for alternative IDs.
     * @param sessionType The session type or alternative ID to resolve
     * @returns The primary session type, or undefined if not found or not available
     */
    _resolveToPrimaryType(sessionType) {
        // Try to find the primary type first
        const contribution = this._contributions.get(sessionType)?.contribution;
        if (contribution) {
            // If the contribution is available, use it
            if (this._isContributionAvailable(contribution)) {
                return sessionType;
            }
            // If not available, fall through to check for alternatives
        }
        // Check if this is an alternative ID, or if the primary type is not available
        const primaryType = this._alternativeIdMap.get(sessionType);
        if (primaryType) {
            const altContribution = this._contributions.get(primaryType)?.contribution;
            if (altContribution && this._isContributionAvailable(altContribution)) {
                this._logService.trace(`Resolving chat session type '${sessionType}' to alternative type '${primaryType}'`);
                return primaryType;
            }
        }
        return undefined;
    }
    _registerMenuItems(contribution, extensionDescription) {
        // If provider registers anything for the create submenu, let it fully control the creation
        const contextKeyService = this._contextKeyService.createOverlay([
            ['chatSessionType', contribution.type]
        ]);
        const rawMenuActions = this._menuService.getMenuActions(MenuId.ChatSessionsCreateSubMenu, contextKeyService);
        const menuActions = rawMenuActions.map(value => value[1]).flat();
        const whenClause = ContextKeyExpr.and(ContextKeyExpr.equals('view', `${LEGACY_AGENT_SESSIONS_VIEW_ID}.${contribution.type}`));
        // If there's exactly one action, inline it
        if (menuActions.length === 1) {
            const first = menuActions[0];
            if (first instanceof MenuItemAction) {
                return MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
                    group: 'navigation',
                    title: first.label,
                    icon: Codicon.plus,
                    order: 1,
                    when: whenClause,
                    command: first.item,
                });
            }
        }
        if (menuActions.length) {
            return MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
                group: 'navigation',
                title: localize('interactiveSession.chatSessionSubMenuTitle', "Create chat session"),
                icon: Codicon.plus,
                order: 1,
                when: whenClause,
                submenu: MenuId.ChatSessionsCreateSubMenu,
                isSplitButton: menuActions.length > 1
            });
        }
        else {
            // We control creation instead
            return MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
                command: {
                    id: `${NEW_CHAT_SESSION_ACTION_ID}.${contribution.type}`,
                    title: localize('interactiveSession.openNewSessionEditor', "New {0}", contribution.displayName),
                    icon: Codicon.plus,
                    source: {
                        id: extensionDescription.identifier.value,
                        title: extensionDescription.displayName || extensionDescription.name,
                    }
                },
                group: 'navigation',
                order: 1,
                when: whenClause,
            });
        }
    }
    _registerCommands(contribution) {
        return registerAction2(class OpenNewChatSessionEditorAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.chat.openNewSessionEditor.${contribution.type}`,
                    title: localize2('interactiveSession.openNewSessionEditor', "New {0}", contribution.displayName),
                    category: CHAT_CATEGORY,
                    icon: Codicon.plus,
                    f1: true, // Show in command palette
                    precondition: ChatContextKeys.enabled
                });
            }
            async run(accessor) {
                const editorService = accessor.get(IEditorService);
                const logService = accessor.get(ILogService);
                const { type } = contribution;
                try {
                    const options = {
                        override: ChatEditorInput.EditorID,
                        pinned: true,
                        title: {
                            fallback: localize('chatEditorContributionName', "{0}", contribution.displayName),
                        }
                    };
                    const resource = URI.from({
                        scheme: type,
                        path: `/untitled-${generateUuid()}`,
                    });
                    await editorService.openEditor({ resource, options });
                }
                catch (e) {
                    logService.error(`Failed to open new '${type}' chat session editor`, e);
                }
            }
        });
    }
    _evaluateAvailability() {
        let hasChanges = false;
        for (const { contribution, extension } of this._contributions.values()) {
            const isCurrentlyRegistered = this._contributionDisposables.has(contribution.type);
            const shouldBeRegistered = this._isContributionAvailable(contribution);
            if (isCurrentlyRegistered && !shouldBeRegistered) {
                // Disable the contribution by disposing its disposable store
                this._contributionDisposables.deleteAndDispose(contribution.type);
                // Also dispose any cached sessions for this contribution
                this._disposeSessionsForContribution(contribution.type);
                hasChanges = true;
            }
            else if (!isCurrentlyRegistered && shouldBeRegistered) {
                // Enable the contribution by registering it
                this._enableContribution(contribution, extension);
                hasChanges = true;
            }
        }
        if (hasChanges) {
            this._onDidChangeAvailability.fire();
            for (const provider of this._itemsProviders.values()) {
                this._onDidChangeItemsProviders.fire(provider);
            }
            for (const { contribution } of this._contributions.values()) {
                this._onDidChangeSessionItems.fire(contribution.type);
            }
        }
    }
    _enableContribution(contribution, ext) {
        const disposableStore = new DisposableStore();
        this._contributionDisposables.set(contribution.type, disposableStore);
        disposableStore.add(this._registerAgent(contribution, ext));
        disposableStore.add(this._registerCommands(contribution));
        disposableStore.add(this._registerMenuItems(contribution, ext));
    }
    _disposeSessionsForContribution(contributionId) {
        // Find and dispose all sessions that belong to this contribution
        const sessionsToDispose = [];
        for (const [sessionResource, sessionData] of this._sessions) {
            if (sessionData.chatSessionType === contributionId) {
                sessionsToDispose.push(sessionResource);
            }
        }
        if (sessionsToDispose.length > 0) {
            this._logService.info(`Disposing ${sessionsToDispose.length} cached sessions for contribution '${contributionId}' due to when clause change`);
        }
        for (const sessionKey of sessionsToDispose) {
            const sessionData = this._sessions.get(sessionKey);
            if (sessionData) {
                sessionData.dispose(); // This will call _onWillDisposeSession and clean up
            }
        }
    }
    _registerAgent(contribution, ext) {
        const { type: id, name, displayName, description } = contribution;
        const agentData = {
            id,
            name,
            fullName: displayName,
            description: description,
            isDefault: false,
            isCore: false,
            isDynamic: true,
            slashCommands: contribution.commands ?? [],
            locations: [ChatAgentLocation.Chat],
            modes: [ChatModeKind.Agent, ChatModeKind.Ask],
            disambiguation: [],
            metadata: {
                themeIcon: Codicon.sendToRemoteAgent,
                isSticky: false,
            },
            capabilities: contribution.capabilities,
            canAccessPreviousChatHistory: true,
            extensionId: ext.identifier,
            extensionVersion: ext.version,
            extensionDisplayName: ext.displayName || ext.name,
            extensionPublisherId: ext.publisher,
        };
        return this._chatAgentService.registerAgent(id, agentData);
    }
    getAllChatSessionContributions() {
        return Array.from(this._contributions.values(), x => x.contribution)
            .filter(contribution => this._isContributionAvailable(contribution));
    }
    getAllChatSessionItemProviders() {
        return [...this._itemsProviders.values()].filter(provider => {
            // Check if the provider's corresponding contribution is available
            const contribution = this._contributions.get(provider.chatSessionType)?.contribution;
            return !contribution || this._isContributionAvailable(contribution);
        });
    }
    async activateChatSessionItemProvider(chatViewType) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const resolvedType = this._resolveToPrimaryType(chatViewType);
        if (resolvedType) {
            chatViewType = resolvedType;
        }
        const contribution = this._contributions.get(chatViewType)?.contribution;
        if (contribution && !this._isContributionAvailable(contribution)) {
            return undefined;
        }
        if (this._itemsProviders.has(chatViewType)) {
            return this._itemsProviders.get(chatViewType);
        }
        await this._extensionService.activateByEvent(`onChatSession:${chatViewType}`);
        return this._itemsProviders.get(chatViewType);
    }
    async canResolveChatSession(chatSessionResource) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const resolvedType = this._resolveToPrimaryType(chatSessionResource.scheme) || chatSessionResource.scheme;
        const contribution = this._contributions.get(resolvedType)?.contribution;
        if (contribution && !this._isContributionAvailable(contribution)) {
            return false;
        }
        if (this._contentProviders.has(chatSessionResource.scheme)) {
            return true;
        }
        await this._extensionService.activateByEvent(`onChatSession:${chatSessionResource.scheme}`);
        return this._contentProviders.has(chatSessionResource.scheme);
    }
    async getAllChatSessionItems(token) {
        return Promise.all(Array.from(this.getAllChatSessionContributions(), async (contrib) => {
            return {
                chatSessionType: contrib.type,
                items: await this.getChatSessionItems(contrib.type, token)
            };
        }));
    }
    async getChatSessionItems(chatSessionType, token) {
        if (!(await this.activateChatSessionItemProvider(chatSessionType))) {
            return [];
        }
        const resolvedType = this._resolveToPrimaryType(chatSessionType);
        if (resolvedType) {
            chatSessionType = resolvedType;
        }
        const provider = this._itemsProviders.get(chatSessionType);
        if (provider?.provideChatSessionItems) {
            const sessions = await provider.provideChatSessionItems(token);
            return sessions;
        }
        return [];
    }
    registerChatSessionItemProvider(provider) {
        const chatSessionType = provider.chatSessionType;
        this._itemsProviders.set(chatSessionType, provider);
        this._onDidChangeItemsProviders.fire(provider);
        const disposables = new DisposableStore();
        disposables.add(provider.onDidChangeChatSessionItems(() => {
            this._onDidChangeSessionItems.fire(chatSessionType);
        }));
        this.updateInProgressStatus(chatSessionType).catch(error => {
            this._logService.warn(`Failed to update initial progress status for '${chatSessionType}':`, error);
        });
        return {
            dispose: () => {
                disposables.dispose();
                const provider = this._itemsProviders.get(chatSessionType);
                if (provider) {
                    this._itemsProviders.delete(chatSessionType);
                    this._onDidChangeItemsProviders.fire(provider);
                }
            }
        };
    }
    registerChatSessionContentProvider(chatSessionType, provider) {
        if (this._contentProviders.has(chatSessionType)) {
            throw new Error(`Content provider for ${chatSessionType} is already registered.`);
        }
        this._contentProviders.set(chatSessionType, provider);
        this._onDidChangeContentProviderSchemes.fire({ added: [chatSessionType], removed: [] });
        return {
            dispose: () => {
                this._contentProviders.delete(chatSessionType);
                this._onDidChangeContentProviderSchemes.fire({ added: [], removed: [chatSessionType] });
                // Remove all sessions that were created by this provider
                for (const [key, session] of this._sessions) {
                    if (session.chatSessionType === chatSessionType) {
                        session.dispose();
                        this._sessions.delete(key);
                    }
                }
            }
        };
    }
    /**
     * Creates a new chat session by delegating to the appropriate provider
     * @param chatSessionType The type of chat session provider to use
     * @param options Options for the new session including the request
     * @param token A cancellation token
     * @returns A session ID for the newly created session
     */
    async getNewChatSessionItem(chatSessionType, options, token) {
        if (!(await this.activateChatSessionItemProvider(chatSessionType))) {
            throw Error(`Cannot find provider for ${chatSessionType}`);
        }
        const resolvedType = this._resolveToPrimaryType(chatSessionType);
        if (resolvedType) {
            chatSessionType = resolvedType;
        }
        const provider = this._itemsProviders.get(chatSessionType);
        if (!provider?.provideNewChatSessionItem) {
            throw Error(`Provider for ${chatSessionType} does not support creating sessions`);
        }
        const chatSessionItem = await provider.provideNewChatSessionItem(options, token);
        this._onDidChangeSessionItems.fire(chatSessionType);
        return chatSessionItem;
    }
    async getOrCreateChatSession(sessionResource, token) {
        const existingSessionData = this._sessions.get(sessionResource);
        if (existingSessionData) {
            return existingSessionData.session;
        }
        if (!(await raceCancellationError(this.canResolveChatSession(sessionResource), token))) {
            throw Error(`Can not find provider for ${sessionResource}`);
        }
        const resolvedType = this._resolveToPrimaryType(sessionResource.scheme) || sessionResource.scheme;
        const provider = this._contentProviders.get(resolvedType);
        if (!provider) {
            throw Error(`Can not find provider for ${sessionResource}`);
        }
        const session = await raceCancellationError(provider.provideChatSessionContent(sessionResource, token), token);
        const sessionData = new ContributedChatSessionData(session, sessionResource.scheme, sessionResource, session.options, resource => {
            sessionData.dispose();
            this._sessions.delete(resource);
        });
        this._sessions.set(sessionResource, sessionData);
        return session;
    }
    hasAnySessionOptions(sessionResource) {
        const session = this._sessions.get(sessionResource);
        return !!session && !!session.options && Object.keys(session.options).length > 0;
    }
    getSessionOption(sessionResource, optionId) {
        const session = this._sessions.get(sessionResource);
        return session?.getOption(optionId);
    }
    setSessionOption(sessionResource, optionId, value) {
        const session = this._sessions.get(sessionResource);
        return !!session?.setOption(optionId, value);
    }
    // Implementation of editable session methods
    async setEditableSession(sessionResource, data) {
        if (!data) {
            this._editableSessions.delete(sessionResource);
        }
        else {
            this._editableSessions.set(sessionResource, data);
        }
        // Trigger refresh of the session views that might need to update their rendering
        this._onDidChangeSessionItems.fire(localChatSessionType);
    }
    getEditableData(sessionResource) {
        return this._editableSessions.get(sessionResource);
    }
    isEditable(sessionResource) {
        return this._editableSessions.has(sessionResource);
    }
    notifySessionItemsChanged(chatSessionType) {
        this._onDidChangeSessionItems.fire(chatSessionType);
    }
    /**
     * Store option groups for a session type
     */
    setOptionGroupsForSessionType(chatSessionType, handle, optionGroups) {
        if (optionGroups) {
            this._sessionTypeOptions.set(chatSessionType, optionGroups);
        }
        else {
            this._sessionTypeOptions.delete(chatSessionType);
        }
    }
    /**
     * Get available option groups for a session type
     */
    getOptionGroupsForSessionType(chatSessionType) {
        return this._sessionTypeOptions.get(chatSessionType);
    }
    /**
     * Set the callback for notifying extensions about option changes
     */
    setOptionsChangeCallback(callback) {
        this._optionsChangeCallback = callback;
    }
    /**
     * Notify extension about option changes for a session
     */
    async notifySessionOptionsChange(sessionResource, updates) {
        if (!updates.length) {
            return;
        }
        if (this._optionsChangeCallback) {
            await this._optionsChangeCallback(sessionResource, updates);
        }
        for (const u of updates) {
            this.setSessionOption(sessionResource, u.optionId, u.value);
        }
    }
    /**
     * Get the icon for a specific session type
     */
    getIconForSessionType(chatSessionType) {
        const sessionTypeIcon = this._sessionTypeIcons.get(chatSessionType);
        if (ThemeIcon.isThemeIcon(sessionTypeIcon)) {
            return sessionTypeIcon;
        }
        if (isDark(this._themeService.getColorTheme().type)) {
            return sessionTypeIcon?.dark;
        }
        else {
            return sessionTypeIcon?.light;
        }
    }
    /**
     * Get the welcome title for a specific session type
     */
    getWelcomeTitleForSessionType(chatSessionType) {
        return this._sessionTypeWelcomeTitles.get(chatSessionType);
    }
    /**
     * Get the welcome message for a specific session type
     */
    getWelcomeMessageForSessionType(chatSessionType) {
        return this._sessionTypeWelcomeMessages.get(chatSessionType);
    }
    /**
     * Get the input placeholder for a specific session type
     */
    getInputPlaceholderForSessionType(chatSessionType) {
        return this._sessionTypeInputPlaceholders.get(chatSessionType);
    }
    /**
     * Get the capabilities for a specific session type
     */
    getCapabilitiesForSessionType(chatSessionType) {
        const contribution = this._contributions.get(chatSessionType)?.contribution;
        return contribution?.capabilities;
    }
    getContentProviderSchemes() {
        return Array.from(this._contentProviders.keys());
    }
};
ChatSessionsService = __decorate([
    __param(0, ILogService),
    __param(1, IChatAgentService),
    __param(2, IExtensionService),
    __param(3, IContextKeyService),
    __param(4, IMenuService),
    __param(5, IThemeService),
    __param(6, ILabelService)
], ChatSessionsService);
export { ChatSessionsService };
registerSingleton(IChatSessionsService, ChatSessionsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25zLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0U2Vzc2lvbnMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN0RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFN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