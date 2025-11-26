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
import { Emitter } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Memento } from '../../../common/memento.js';
import { CHAT_PROVIDER_ID } from './chatParticipantContribTypes.js';
import { ChatAgentLocation, ChatModeKind } from './constants.js';
export const IChatWidgetHistoryService = createDecorator('IChatWidgetHistoryService');
export const ChatInputHistoryMaxEntries = 40;
let ChatWidgetHistoryService = class ChatWidgetHistoryService {
    constructor(storageService) {
        this._onDidClearHistory = new Emitter();
        this.onDidClearHistory = this._onDidClearHistory.event;
        this.memento = new Memento('interactive-session', storageService);
        const loadedState = this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        this.viewState = loadedState;
    }
    getHistory(location) {
        const key = this.getKey(location);
        const history = this.viewState.history?.[key] ?? [];
        // Migrate old IChatHistoryEntry format to IChatModelInputState
        return history.map(entry => this.migrateHistoryEntry(entry));
    }
    migrateHistoryEntry(entry) {
        // If it's already in the new format (has 'inputText' property), return as-is
        if (entry.inputText !== undefined) {
            return entry;
        }
        // Otherwise, it's an old IChatHistoryEntry with 'text' and 'state' properties
        const oldEntry = entry;
        const oldState = oldEntry.state ?? {};
        // Migrate chatMode to the new mode structure
        let modeId;
        let modeKind;
        if (oldState.chatMode) {
            if (typeof oldState.chatMode === 'string') {
                modeId = oldState.chatMode;
                modeKind = Object.values(ChatModeKind).includes(oldState.chatMode)
                    ? oldState.chatMode
                    : undefined;
            }
            else if (typeof oldState.chatMode === 'object' && oldState.chatMode !== null) {
                // Old format: { id: string }
                const oldMode = oldState.chatMode;
                modeId = oldMode.id ?? ChatModeKind.Ask;
                modeKind = oldMode.id && Object.values(ChatModeKind).includes(oldMode.id)
                    ? oldMode.id
                    : undefined;
            }
            else {
                modeId = ChatModeKind.Ask;
                modeKind = ChatModeKind.Ask;
            }
        }
        else {
            modeId = ChatModeKind.Ask;
            modeKind = ChatModeKind.Ask;
        }
        return {
            inputText: oldEntry.text ?? '',
            attachments: oldState.chatContextAttachments ?? [],
            mode: {
                id: modeId,
                kind: modeKind
            },
            contrib: oldEntry.state || {},
            selectedModel: undefined,
            selections: []
        };
    }
    getKey(location) {
        // Preserve history for panel by continuing to use the same old provider id. Use the location as a key for other chat locations.
        return location === ChatAgentLocation.Chat ? CHAT_PROVIDER_ID : location;
    }
    saveHistory(location, history) {
        if (!this.viewState.history) {
            this.viewState.history = {};
        }
        const key = this.getKey(location);
        this.viewState.history[key] = history.slice(-ChatInputHistoryMaxEntries);
        this.memento.saveMemento();
    }
    clearHistory() {
        this.viewState.history = {};
        this.memento.saveMemento();
        this._onDidClearHistory.fire();
    }
};
ChatWidgetHistoryService = __decorate([
    __param(0, IStorageService)
], ChatWidgetHistoryService);
export { ChatWidgetHistoryService };
//# sourceMappingURL=chatWidgetHistoryService.js.map