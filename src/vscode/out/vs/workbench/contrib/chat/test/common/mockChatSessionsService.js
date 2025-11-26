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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0NoYXRTZXNzaW9uc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL21vY2tDaGF0U2Vzc2lvbnNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBTXBFLE1BQU0sT0FBTyx1QkFBdUI7SUFBcEM7UUFHa0IsK0JBQTBCLEdBQUcsSUFBSSxPQUFPLEVBQTRCLENBQUM7UUFDN0UsOEJBQXlCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQztRQUUxRCw2QkFBd0IsR0FBRyxJQUFJLE9BQU8sRUFBVSxDQUFDO1FBQ3pELDRCQUF1QixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUM7UUFFdEQsNkJBQXdCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUN2RCw0QkFBdUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDO1FBRXRELDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDckQsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQztRQUVsRCx1Q0FBa0MsR0FBRyxJQUFJLE9BQU8sRUFBNEQsQ0FBQztRQUNySCxzQ0FBaUMsR0FBRyxJQUFJLENBQUMsa0NBQWtDLENBQUMsS0FBSyxDQUFDO1FBRW5GLHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUFvQyxDQUFDO1FBQ25FLHFC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