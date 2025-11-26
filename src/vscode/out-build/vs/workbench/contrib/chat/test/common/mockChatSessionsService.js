/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
export class MockChatSessionsService {
    constructor() {
        this._onDidChangeItemsProviders = new Emitter();
        this.onDidChangeItemsProviders = this._onDidChangeItemsProviders.event;
        this._onDidChangeSessionItems = new Emitter();
        this.onDidChangeSessionItems = this._onDidChangeSessionItems.event;
        this._onDidChangeAvailability = new Emitter();
        this.onDidChangeAvailability = this._onDidChangeAvailability.event;
        this._onDidChangeInProgress = new Emitter();
        this.onDidChangeInProgress = this._onDidChangeInProgress.event;
        this._onDidChangeContentProviderSchemes = new Emitter();
        this.onDidChangeContentProviderSchemes = this._onDidChangeContentProviderSchemes.event;
        this.sessionItemProviders = new Map();
        this.contentProviders = new Map();
        this.contributions = [];
        this.optionGroups = new Map();
        this.sessionOptions = new ResourceMap();
        this.editableData = new ResourceMap();
        this.inProgress = new Map();
    }
    // For testing: allow triggering events
    fireDidChangeItemsProviders(provider) {
        this._onDidChangeItemsProviders.fire(provider);
    }
    fireDidChangeSessionItems(chatSessionType) {
        this._onDidChangeSessionItems.fire(chatSessionType);
    }
    fireDidChangeAvailability() {
        this._onDidChangeAvailability.fire();
    }
    fireDidChangeInProgress() {
        this._onDidChangeInProgress.fire();
    }
    registerChatSessionItemProvider(provider) {
        this.sessionItemProviders.set(provider.chatSessionType, provider);
        return {
            dispose: () => {
                this.sessionItemProviders.delete(provider.chatSessionType);
            }
        };
    }
    getAllChatSessionContributions() {
        return this.contributions;
    }
    setContributions(contributions) {
        this.contributions = contributions;
    }
    async activateChatSessionItemProvider(chatSessionType) {
        return this.sessionItemProviders.get(chatSessionType);
    }
    getAllChatSessionItemProviders() {
        return Array.from(this.sessionItemProviders.values());
    }
    getIconForSessionType(chatSessionType) {
        const contribution = this.contributions.find(c => c.type === chatSessionType);
        return contribution?.icon && typeof contribution.icon === 'string' ? ThemeIcon.fromId(contribution.icon) : undefined;
    }
    getWelcomeTitleForSessionType(chatSessionType) {
        return this.contributions.find(c => c.type === chatSessionType)?.welcomeTitle;
    }
    getWelcomeMessageForSessionType(chatSessionType) {
        return this.contributions.find(c => c.type === chatSessionType)?.welcomeMessage;
    }
    getInputPlaceholderForSessionType(chatSessionType) {
        return this.contributions.find(c => c.type === chatSessionType)?.inputPlaceholder;
    }
    async getNewChatSessionItem(chatSessionType, options, token) {
        const provider = this.sessionItemProviders.get(chatSessionType);
        if (!provider?.provideNewChatSessionItem) {
            throw new Error(`No provider for ${chatSessionType}`);
        }
        return provider.provideNewChatSessionItem(options, token);
    }
    getAllChatSessionItems(token) {
        return Promise.all(Array.from(this.sessionItemProviders.values(), async (provider) => {
            return {
                chatSessionType: provider.chatSessionType,
                items: await provider.provideChatSessionItems(token),
            };
        }));
    }
    reportInProgress(chatSessionType, count) {
        this.inProgress.set(chatSessionType, count);
        this._onDidChangeInProgress.fire();
    }
    getInProgress() {
        return Array.from(this.inProgress.entries()).map(([displayName, count]) => ({ displayName, count }));
    }
    registerChatSessionContentProvider(chatSessionType, provider) {
        this.contentProviders.set(chatSessionType, provider);
        this._onDidChangeContentProviderSchemes.fire({ added: [chatSessionType], removed: [] });
        return {
            dispose: () => {
                this.contentProviders.delete(chatSessionType);
            }
        };
    }
    async canResolveContentProvider(chatSessionType) {
        return this.contentProviders.has(chatSessionType);
    }
    async getOrCreateChatSession(sessionResource, token) {
        const provider = this.contentProviders.get(sessionResource.scheme);
        if (!provider) {
            throw new Error(`No content provider for ${sessionResource.scheme}`);
        }
        return provider.provideChatSessionContent(sessionResource, token);
    }
    async canResolveChatSession(chatSessionResource) {
        return this.contentProviders.has(chatSessionResource.scheme);
    }
    getOptionGroupsForSessionType(chatSessionType) {
        return this.optionGroups.get(chatSessionType);
    }
    setOptionGroupsForSessionType(chatSessionType, handle, optionGroups) {
        if (optionGroups) {
            this.optionGroups.set(chatSessionType, optionGroups);
        }
        else {
            this.optionGroups.delete(chatSessionType);
        }
    }
    setOptionsChangeCallback(callback) {
        this.optionsChangeCallback = callback;
    }
    async notifySessionOptionsChange(sessionResource, updates) {
        await this.optionsChangeCallback?.(sessionResource, updates);
    }
    async setEditableSession(sessionResource, data) {
        if (data) {
            this.editableData.set(sessionResource, data);
        }
        else {
            this.editableData.delete(sessionResource);
        }
    }
    getEditableData(sessionResource) {
        return this.editableData.get(sessionResource);
    }
    isEditable(sessionResource) {
        return this.editableData.has(sessionResource);
    }
    notifySessionItemsChanged(chatSessionType) {
        this._onDidChangeSessionItems.fire(chatSessionType);
    }
    getSessionOption(sessionResource, optionId) {
        return this.sessionOptions.get(sessionResource)?.get(optionId);
    }
    setSessionOption(sessionResource, optionId, value) {
        if (!this.sessionOptions.has(sessionResource)) {
            this.sessionOptions.set(sessionResource, new Map());
        }
        this.sessionOptions.get(sessionResource).set(optionId, value);
        return true;
    }
    hasAnySessionOptions(resource) {
        return this.sessionOptions.has(resource) && this.sessionOptions.get(resource).size > 0;
    }
    getCapabilitiesForSessionType(chatSessionType) {
        return this.contributions.find(c => c.type === chatSessionType)?.capabilities;
    }
    getContentProviderSchemes() {
        return Array.from(this.contentProviders.keys());
    }
}
//# sourceMappingURL=mockChatSessionsService.js.map