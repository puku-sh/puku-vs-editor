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
        description: localize(5945, null),
        type: 'array',
        items: {
            type: 'object',
            additionalProperties: false,
            properties: {
                type: {
                    description: localize(5946, null),
                    type: 'string',
                },
                name: {
                    description: localize(5947, null),
                    type: 'string',
                    pattern: '^[\\w-]+$'
                },
                displayName: {
                    description: localize(5948, null),
                    type: 'string',
                },
                description: {
                    description: localize(5949, null),
                    type: 'string'
                },
                when: {
                    description: localize(5950, null),
                    type: 'string'
                },
                icon: {
                    description: localize(5951, null),
                    anyOf: [{
                            type: 'string'
                        },
                        {
                            type: 'object',
                            properties: {
                                light: {
                                    description: localize(5952, null),
                                    type: 'string'
                                },
                                dark: {
                                    description: localize(5953, null),
                                    type: 'string'
                                }
                            }
                        }]
                },
                order: {
                    description: localize(5954, null),
                    type: 'integer'
                },
                alternativeIds: {
                    description: localize(5955, null),
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                welcomeTitle: {
                    description: localize(5956, null),
                    type: 'string'
                },
                welcomeMessage: {
                    description: localize(5957, null),
                    type: 'string'
                },
                welcomeTips: {
                    description: localize(5958, null),
                    type: 'string'
                },
                inputPlaceholder: {
                    description: localize(5959, null),
                    type: 'string'
                },
                capabilities: {
                    description: localize(5960, null),
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        supportsFileAttachments: {
                            description: localize(5961, null),
                            type: 'boolean'
                        },
                        supportsToolAttachments: {
                            description: localize(5962, null),
                            type: 'boolean'
                        },
                        supportsMCPAttachments: {
                            description: localize(5963, null),
                            type: 'boolean'
                        },
                        supportsImageAttachments: {
                            description: localize(5964, null),
                            type: 'boolean'
                        },
                        supportsSearchResultAttachments: {
                            description: localize(5965, null),
                            type: 'boolean'
                        },
                        supportsInstructionAttachments: {
                            description: localize(5966, null),
                            type: 'boolean'
                        },
                        supportsSourceControlAttachments: {
                            description: localize(5967, null),
                            type: 'boolean'
                        },
                        supportsProblemAttachments: {
                            description: localize(5968, null),
                            type: 'boolean'
                        },
                        supportsSymbolAttachments: {
                            description: localize(5969, null),
                            type: 'boolean'
                        }
                    }
                },
                commands: {
                    markdownDescription: localize(5970, null),
                    type: 'array',
                    items: {
                        additionalProperties: false,
                        type: 'object',
                        defaultSnippets: [{ body: { name: '', description: '' } }],
                        required: ['name'],
                        properties: {
                            name: {
                                description: localize(5971, null),
                                type: 'string'
                            },
                            description: {
                                description: localize(5972, null),
                                type: 'string'
                            },
                            when: {
                                description: localize(5973, null),
                                type: 'string'
                            },
                        }
                    }
                },
                canDelegate: {
                    description: localize(5974, null),
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
                title: localize(5975, null),
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
                    title: localize(5976, null, contribution.displayName),
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
                    title: localize2(5978, "New {0}", contribution.displayName),
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
                            fallback: localize(5977, null, contribution.displayName),
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
//# sourceMappingURL=chatSessions.contribution.js.map