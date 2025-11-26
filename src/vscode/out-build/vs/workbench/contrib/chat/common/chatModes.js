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
var ChatModeService_1;
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { constObservable, observableValue, transaction } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IChatAgentService } from './chatAgents.js';
import { ChatContextKeys } from './chatContextKeys.js';
import { ChatModeKind } from './constants.js';
import { IPromptsService, PromptsStorage } from './promptSyntax/service/promptsService.js';
export const IChatModeService = createDecorator('chatModeService');
let ChatModeService = class ChatModeService extends Disposable {
    static { ChatModeService_1 = this; }
    static { this.CUSTOM_MODES_STORAGE_KEY = 'chat.customModes'; }
    constructor(promptsService, chatAgentService, contextKeyService, logService, storageService) {
        super();
        this.promptsService = promptsService;
        this.chatAgentService = chatAgentService;
        this.logService = logService;
        this.storageService = storageService;
        this._customModeInstances = new Map();
        this._onDidChangeChatModes = new Emitter();
        this.onDidChangeChatModes = this._onDidChangeChatModes.event;
        this.hasCustomModes = ChatContextKeys.Modes.hasCustomChatModes.bindTo(contextKeyService);
        // Load cached modes from storage first
        this.loadCachedModes();
        void this.refreshCustomPromptModes(true);
        this._register(this.promptsService.onDidChangeCustomAgents(() => {
            void this.refreshCustomPromptModes(true);
        }));
        this._register(this.storageService.onWillSaveState(() => this.saveCachedModes()));
        // Ideally we can get rid of the setting to disable agent mode?
        let didHaveToolsAgent = this.chatAgentService.hasToolsAgent;
        this._register(this.chatAgentService.onDidChangeAgents(() => {
            if (didHaveToolsAgent !== this.chatAgentService.hasToolsAgent) {
                didHaveToolsAgent = this.chatAgentService.hasToolsAgent;
                this._onDidChangeChatModes.fire();
            }
        }));
    }
    loadCachedModes() {
        try {
            const cachedCustomModes = this.storageService.getObject(ChatModeService_1.CUSTOM_MODES_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
            if (cachedCustomModes) {
                this.deserializeCachedModes(cachedCustomModes);
            }
        }
        catch (error) {
            this.logService.error(error, 'Failed to load cached custom agents');
        }
    }
    deserializeCachedModes(cachedCustomModes) {
        if (!Array.isArray(cachedCustomModes)) {
            this.logService.error('Invalid cached custom modes data: expected array');
            return;
        }
        for (const cachedMode of cachedCustomModes) {
            if (isCachedChatModeData(cachedMode) && cachedMode.uri) {
                try {
                    const uri = URI.revive(cachedMode.uri);
                    const customChatMode = {
                        uri,
                        name: cachedMode.name,
                        description: cachedMode.description,
                        tools: cachedMode.customTools,
                        model: cachedMode.model,
                        argumentHint: cachedMode.argumentHint,
                        agentInstructions: cachedMode.modeInstructions ?? { content: cachedMode.body ?? '', toolReferences: [] },
                        handOffs: cachedMode.handOffs,
                        target: cachedMode.target,
                        source: reviveChatModeSource(cachedMode.source) ?? { storage: PromptsStorage.local }
                    };
                    const instance = new CustomChatMode(customChatMode);
                    this._customModeInstances.set(uri.toString(), instance);
                }
                catch (error) {
                    this.logService.error(error, 'Failed to revive cached custom agent');
                }
            }
        }
        this.hasCustomModes.set(this._customModeInstances.size > 0);
    }
    saveCachedModes() {
        try {
            const modesToCache = Array.from(this._customModeInstances.values());
            this.storageService.store(ChatModeService_1.CUSTOM_MODES_STORAGE_KEY, modesToCache, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        catch (error) {
            this.logService.warn('Failed to save cached custom agents', error);
        }
    }
    async refreshCustomPromptModes(fireChangeEvent) {
        try {
            const customModes = await this.promptsService.getCustomAgents(CancellationToken.None);
            // Create a new set of mode instances, reusing existing ones where possible
            const seenUris = new Set();
            for (const customMode of customModes) {
                const uriString = customMode.uri.toString();
                seenUris.add(uriString);
                let modeInstance = this._customModeInstances.get(uriString);
                if (modeInstance) {
                    // Update existing instance with new data
                    modeInstance.updateData(customMode);
                }
                else {
                    // Create new instance
                    modeInstance = new CustomChatMode(customMode);
                    this._customModeInstances.set(uriString, modeInstance);
                }
            }
            // Clean up instances for modes that no longer exist
            for (const [uriString] of this._customModeInstances.entries()) {
                if (!seenUris.has(uriString)) {
                    this._customModeInstances.delete(uriString);
                }
            }
            this.hasCustomModes.set(this._customModeInstances.size > 0);
        }
        catch (error) {
            this.logService.error(error, 'Failed to load custom agents');
            this._customModeInstances.clear();
            this.hasCustomModes.set(false);
        }
        if (fireChangeEvent) {
            this._onDidChangeChatModes.fire();
        }
    }
    getModes() {
        return {
            builtin: this.getBuiltinModes(),
            custom: this.getCustomModes(),
        };
    }
    findModeById(id) {
        return this.getBuiltinModes().find(mode => mode.id === id) ?? this._customModeInstances.get(id);
    }
    findModeByName(name) {
        return this.getBuiltinModes().find(mode => mode.name.get() === name) ?? this.getCustomModes().find(mode => mode.name.get() === name);
    }
    getBuiltinModes() {
        const builtinModes = [
            ChatMode.Ask,
        ];
        if (this.chatAgentService.hasToolsAgent) {
            builtinModes.unshift(ChatMode.Agent);
        }
        builtinModes.push(ChatMode.Edit);
        return builtinModes;
    }
    getCustomModes() {
        return this.chatAgentService.hasToolsAgent ? Array.from(this._customModeInstances.values()) : [];
    }
};
ChatModeService = ChatModeService_1 = __decorate([
    __param(0, IPromptsService),
    __param(1, IChatAgentService),
    __param(2, IContextKeyService),
    __param(3, ILogService),
    __param(4, IStorageService)
], ChatModeService);
export { ChatModeService };
function isCachedChatModeData(data) {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    const mode = data;
    return typeof mode.id === 'string' &&
        typeof mode.name === 'string' &&
        typeof mode.kind === 'string' &&
        (mode.description === undefined || typeof mode.description === 'string') &&
        (mode.customTools === undefined || Array.isArray(mode.customTools)) &&
        (mode.modeInstructions === undefined || (typeof mode.modeInstructions === 'object' && mode.modeInstructions !== null)) &&
        (mode.model === undefined || typeof mode.model === 'string') &&
        (mode.argumentHint === undefined || typeof mode.argumentHint === 'string') &&
        (mode.handOffs === undefined || Array.isArray(mode.handOffs)) &&
        (mode.uri === undefined || (typeof mode.uri === 'object' && mode.uri !== null)) &&
        (mode.source === undefined || isChatModeSourceData(mode.source)) &&
        (mode.target === undefined || typeof mode.target === 'string');
}
export class CustomChatMode {
    get name() {
        return this._nameObservable;
    }
    get description() {
        return this._descriptionObservable;
    }
    get isBuiltin() {
        return isBuiltinChatMode(this);
    }
    get customTools() {
        return this._customToolsObservable;
    }
    get model() {
        return this._modelObservable;
    }
    get argumentHint() {
        return this._argumentHintObservable;
    }
    get modeInstructions() {
        return this._modeInstructions;
    }
    get uri() {
        return this._uriObservable;
    }
    get label() {
        return this.name;
    }
    get handOffs() {
        return this._handoffsObservable;
    }
    get source() {
        return this._source;
    }
    get target() {
        return this._targetObservable;
    }
    constructor(customChatMode) {
        this.kind = ChatModeKind.Agent;
        this.id = customChatMode.uri.toString();
        this._nameObservable = observableValue('name', customChatMode.name);
        this._descriptionObservable = observableValue('description', customChatMode.description);
        this._customToolsObservable = observableValue('customTools', customChatMode.tools);
        this._modelObservable = observableValue('model', customChatMode.model);
        this._argumentHintObservable = observableValue('argumentHint', customChatMode.argumentHint);
        this._handoffsObservable = observableValue('handOffs', customChatMode.handOffs);
        this._targetObservable = observableValue('target', customChatMode.target);
        this._modeInstructions = observableValue('_modeInstructions', customChatMode.agentInstructions);
        this._uriObservable = observableValue('uri', customChatMode.uri);
        this._source = customChatMode.source;
    }
    /**
     * Updates the underlying data and triggers observable changes
     */
    updateData(newData) {
        transaction(tx => {
            this._nameObservable.set(newData.name, tx);
            this._descriptionObservable.set(newData.description, tx);
            this._customToolsObservable.set(newData.tools, tx);
            this._modelObservable.set(newData.model, tx);
            this._argumentHintObservable.set(newData.argumentHint, tx);
            this._handoffsObservable.set(newData.handOffs, tx);
            this._targetObservable.set(newData.target, tx);
            this._modeInstructions.set(newData.agentInstructions, tx);
            this._uriObservable.set(newData.uri, tx);
            this._source = newData.source;
        });
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name.get(),
            description: this.description.get(),
            kind: this.kind,
            customTools: this.customTools.get(),
            model: this.model.get(),
            argumentHint: this.argumentHint.get(),
            modeInstructions: this.modeInstructions.get(),
            uri: this.uri.get(),
            handOffs: this.handOffs.get(),
            source: serializeChatModeSource(this._source),
            target: this.target.get()
        };
    }
}
function isChatModeSourceData(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const data = value;
    if (data.storage === PromptsStorage.extension) {
        return typeof data.extensionId === 'string';
    }
    return data.storage === PromptsStorage.local || data.storage === PromptsStorage.user;
}
function serializeChatModeSource(source) {
    if (!source) {
        return undefined;
    }
    if (source.storage === PromptsStorage.extension) {
        return { storage: PromptsStorage.extension, extensionId: source.extensionId.value };
    }
    return { storage: source.storage };
}
function reviveChatModeSource(data) {
    if (!data) {
        return undefined;
    }
    if (data.storage === PromptsStorage.extension) {
        return { storage: PromptsStorage.extension, extensionId: new ExtensionIdentifier(data.extensionId) };
    }
    return { storage: data.storage };
}
export class BuiltinChatMode {
    constructor(kind, label, description) {
        this.kind = kind;
        this.name = constObservable(kind);
        this.label = constObservable(label);
        this.description = observableValue('description', description);
    }
    get isBuiltin() {
        return isBuiltinChatMode(this);
    }
    get id() {
        // Need a differentiator?
        return this.kind;
    }
    get target() {
        return observableValue('target', undefined);
    }
    /**
     * Getters are not json-stringified
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name.get(),
            description: this.description.get(),
            kind: this.kind
        };
    }
}
export var ChatMode;
(function (ChatMode) {
    ChatMode.Ask = new BuiltinChatMode(ChatModeKind.Ask, 'Ask', localize(6416, null));
    ChatMode.Edit = new BuiltinChatMode(ChatModeKind.Edit, 'Edit', localize(6417, null));
    ChatMode.Agent = new BuiltinChatMode(ChatModeKind.Agent, 'Agent', localize(6418, null));
})(ChatMode || (ChatMode = {}));
export function isBuiltinChatMode(mode) {
    return mode.id === ChatMode.Ask.id ||
        mode.id === ChatMode.Edit.id ||
        mode.id === ChatMode.Agent.id;
}
//# sourceMappingURL=chatModes.js.map