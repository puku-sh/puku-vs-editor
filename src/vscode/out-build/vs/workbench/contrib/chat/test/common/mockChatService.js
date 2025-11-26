/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { observableValue } from '../../../../../base/common/observable.js';
export class MockChatService {
    constructor() {
        this.requestInProgressObs = observableValue('name', false);
        this.edits2Enabled = false;
        this.editingSessions = [];
        this.onDidSubmitRequest = Event.None;
        this.sessions = new ResourceMap();
        this.onDidPerformUserAction = undefined;
        this.onDidDisposeSession = undefined;
    }
    isEnabled(location) {
        throw new Error('Method not implemented.');
    }
    hasSessions() {
        throw new Error('Method not implemented.');
    }
    getProviderInfos() {
        throw new Error('Method not implemented.');
    }
    startSession(location, token) {
        throw new Error('Method not implemented.');
    }
    addSession(session) {
        this.sessions.set(session.sessionResource, session);
    }
    getSession(sessionResource) {
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return this.sessions.get(sessionResource) ?? {};
    }
    async getOrRestoreSession(sessionResource) {
        throw new Error('Method not implemented.');
    }
    getPersistedSessionTitle(sessionResource) {
        throw new Error('Method not implemented.');
    }
    loadSessionFromContent(data) {
        throw new Error('Method not implemented.');
    }
    loadSessionForResource(resource, position, token) {
        throw new Error('Method not implemented.');
    }
    setTitle(sessionResource, title) {
        throw new Error('Method not implemented.');
    }
    appendProgress(request, progress) {
    }
    /**
     * Returns whether the request was accepted.
     */
    sendRequest(sessionResource, message) {
        throw new Error('Method not implemented.');
    }
    resendRequest(request, options) {
        throw new Error('Method not implemented.');
    }
    adoptRequest(sessionResource, request) {
        throw new Error('Method not implemented.');
    }
    removeRequest(sessionResource, requestId) {
        throw new Error('Method not implemented.');
    }
    cancelCurrentRequestForSession(sessionResource) {
        throw new Error('Method not implemented.');
    }
    clearSession(sessionResource) {
        throw new Error('Method not implemented.');
    }
    addCompleteRequest(sessionResource, message, variableData, attempt, response) {
        throw new Error('Method not implemented.');
    }
    async getLocalSessionHistory() {
        throw new Error('Method not implemented.');
    }
    async clearAllHistoryEntries() {
        throw new Error('Method not implemented.');
    }
    async removeHistoryEntry(resource) {
        throw new Error('Method not implemented.');
    }
    notifyUserAction(event) {
        throw new Error('Method not implemented.');
    }
    transferChatSession(transferredSessionData, toWorkspace) {
        throw new Error('Method not implemented.');
    }
    setChatSessionTitle(sessionResource, title) {
        throw new Error('Method not implemented.');
    }
    isEditingLocation(location) {
        throw new Error('Method not implemented.');
    }
    getChatStorageFolder() {
        throw new Error('Method not implemented.');
    }
    logChatIndex() {
        throw new Error('Method not implemented.');
    }
    isPersistedSessionEmpty(sessionResource) {
        throw new Error('Method not implemented.');
    }
    activateDefaultAgent(location) {
        throw new Error('Method not implemented.');
    }
    getChatSessionFromInternalUri(sessionResource) {
        throw new Error('Method not implemented.');
    }
    getLiveSessionItems() {
        throw new Error('Method not implemented.');
    }
    getHistorySessionItems() {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=mockChatService.js.map