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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdpZGdldEhpc3RvcnlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFdpZGdldEhpc3RvcnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFckQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBbUJqRSxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQTRCLDJCQUEyQixDQUFDLENBQUM7QUFlakgsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsRUFBRSxDQUFDO0FBRXRDLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXdCO0lBU3BDLFlBQ2tCLGNBQStCO1FBSmhDLHVCQUFrQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDakQsc0JBQWlCLEdBQWdCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7UUFLdkUsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBZSxxQkFBcUIsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNoRixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsK0RBQStDLENBQUM7UUFD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