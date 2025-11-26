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
import { SequencerByKey } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ChatEntitlement, IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { ChatContextKeys } from './chatContextKeys.js';
export var ChatMessageRole;
(function (ChatMessageRole) {
    ChatMessageRole[ChatMessageRole["System"] = 0] = "System";
    ChatMessageRole[ChatMessageRole["User"] = 1] = "User";
    ChatMessageRole[ChatMessageRole["Assistant"] = 2] = "Assistant";
})(ChatMessageRole || (ChatMessageRole = {}));
export var LanguageModelPartAudience;
(function (LanguageModelPartAudience) {
    LanguageModelPartAudience[LanguageModelPartAudience["Assistant"] = 0] = "Assistant";
    LanguageModelPartAudience[LanguageModelPartAudience["User"] = 1] = "User";
    LanguageModelPartAudience[LanguageModelPartAudience["Extension"] = 2] = "Extension";
})(LanguageModelPartAudience || (LanguageModelPartAudience = {}));
/**
 * Enum for supported image MIME types.
 */
export var ChatImageMimeType;
(function (ChatImageMimeType) {
    ChatImageMimeType["PNG"] = "image/png";
    ChatImageMimeType["JPEG"] = "image/jpeg";
    ChatImageMimeType["GIF"] = "image/gif";
    ChatImageMimeType["WEBP"] = "image/webp";
    ChatImageMimeType["BMP"] = "image/bmp";
})(ChatImageMimeType || (ChatImageMimeType = {}));
/**
 * Specifies the detail level of the image.
 */
export var ImageDetailLevel;
(function (ImageDetailLevel) {
    ImageDetailLevel["Low"] = "low";
    ImageDetailLevel["High"] = "high";
})(ImageDetailLevel || (ImageDetailLevel = {}));
export var ILanguageModelChatMetadata;
(function (ILanguageModelChatMetadata) {
    function suitableForAgentMode(metadata) {
        const supportsToolsAgent = typeof metadata.capabilities?.agentMode === 'undefined' || metadata.capabilities.agentMode;
        return supportsToolsAgent && !!metadata.capabilities?.toolCalling;
    }
    ILanguageModelChatMetadata.suitableForAgentMode = suitableForAgentMode;
    function asQualifiedName(metadata) {
        return `${metadata.name} (${metadata.vendor})`;
    }
    ILanguageModelChatMetadata.asQualifiedName = asQualifiedName;
    function matchesQualifiedName(name, metadata) {
        if (metadata.vendor === 'copilot' && name === metadata.name) {
            return true;
        }
        return name === asQualifiedName(metadata);
    }
    ILanguageModelChatMetadata.matchesQualifiedName = matchesQualifiedName;
})(ILanguageModelChatMetadata || (ILanguageModelChatMetadata = {}));
export const ILanguageModelsService = createDecorator('ILanguageModelsService');
const languageModelChatProviderType = {
    type: 'object',
    required: ['vendor', 'displayName'],
    properties: {
        vendor: {
            type: 'string',
            description: localize(6442, null)
        },
        displayName: {
            type: 'string',
            description: localize(6443, null)
        },
        managementCommand: {
            type: 'string',
            description: localize(6444, null)
        },
        when: {
            type: 'string',
            description: localize(6445, null)
        }
    }
};
export const languageModelChatProviderExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'languageModelChatProviders',
    jsonSchema: {
        description: localize(6446, null),
        oneOf: [
            languageModelChatProviderType,
            {
                type: 'array',
                items: languageModelChatProviderType
            }
        ]
    },
    activationEventsGenerator: function* (contribs) {
        for (const contrib of contribs) {
            yield `onLanguageModelChatProvider:${contrib.vendor}`;
        }
    }
});
let LanguageModelsService = class LanguageModelsService {
    constructor(_extensionService, _logService, _storageService, _contextKeyService, _configurationService, _chatEntitlementService) {
        this._extensionService = _extensionService;
        this._logService = _logService;
        this._storageService = _storageService;
        this._configurationService = _configurationService;
        this._chatEntitlementService = _chatEntitlementService;
        this._store = new DisposableStore();
        this._providers = new Map();
        this._modelCache = new Map();
        this._vendors = new Map();
        this._resolveLMSequencer = new SequencerByKey();
        this._modelPickerUserPreferences = {};
        this._onLanguageModelChange = this._store.add(new Emitter());
        this.onDidChangeLanguageModels = this._onLanguageModelChange.event;
        this._hasUserSelectableModels = ChatContextKeys.languageModelsAreUserSelectable.bindTo(_contextKeyService);
        this._contextKeyService = _contextKeyService;
        this._modelPickerUserPreferences = this._storageService.getObject('chatModelPickerPreferences', 0 /* StorageScope.PROFILE */, this._modelPickerUserPreferences);
        // TODO @lramos15 - Remove after a few releases, as this is just cleaning a bad storage state
        const entitlementChangeHandler = () => {
            if ((this._chatEntitlementService.entitlement === ChatEntitlement.Business || this._chatEntitlementService.entitlement === ChatEntitlement.Enterprise) && !this._chatEntitlementService.isInternal) {
                this._modelPickerUserPreferences = {};
                this._storageService.store('chatModelPickerPreferences', this._modelPickerUserPreferences, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            }
        };
        entitlementChangeHandler();
        this._store.add(this._chatEntitlementService.onDidChangeEntitlement(entitlementChangeHandler));
        this._store.add(this.onDidChangeLanguageModels(() => {
            this._hasUserSelectableModels.set(this._modelCache.size > 0 && Array.from(this._modelCache.values()).some(model => model.isUserSelectable));
        }));
        this._store.add(languageModelChatProviderExtensionPoint.setHandler((extensions) => {
            this._vendors.clear();
            for (const extension of extensions) {
                for (const item of Iterable.wrap(extension.value)) {
                    if (this._vendors.has(item.vendor)) {
                        extension.collector.error(localize(6447, null, item.vendor));
                        continue;
                    }
                    if (isFalsyOrWhitespace(item.vendor)) {
                        extension.collector.error(localize(6448, null));
                        continue;
                    }
                    if (item.vendor.trim() !== item.vendor) {
                        extension.collector.error(localize(6449, null));
                        continue;
                    }
                    this._vendors.set(item.vendor, item);
                    // Have some models we want from this vendor, so activate the extension
                    if (this._hasStoredModelForVendor(item.vendor)) {
                        this._extensionService.activateByEvent(`onLanguageModelChatProvider:${item.vendor}`);
                    }
                }
            }
            for (const [vendor, _] of this._providers) {
                if (!this._vendors.has(vendor)) {
                    this._providers.delete(vendor);
                }
            }
        }));
    }
    _hasStoredModelForVendor(vendor) {
        return Object.keys(this._modelPickerUserPreferences).some(modelId => {
            return modelId.startsWith(vendor);
        });
    }
    dispose() {
        this._store.dispose();
        this._providers.clear();
    }
    updateModelPickerPreference(modelIdentifier, showInModelPicker) {
        const model = this._modelCache.get(modelIdentifier);
        if (!model) {
            this._logService.warn(`[LM] Cannot update model picker preference for unknown model ${modelIdentifier}`);
            return;
        }
        this._modelPickerUserPreferences[modelIdentifier] = showInModelPicker;
        if (showInModelPicker === model.isUserSelectable) {
            delete this._modelPickerUserPreferences[modelIdentifier];
            this._storageService.store('chatModelPickerPreferences', this._modelPickerUserPreferences, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
        else if (model.isUserSelectable !== showInModelPicker) {
            this._storageService.store('chatModelPickerPreferences', this._modelPickerUserPreferences, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
        this._onLanguageModelChange.fire(model.vendor);
        this._logService.trace(`[LM] Updated model picker preference for ${modelIdentifier} to ${showInModelPicker}`);
    }
    getVendors() {
        return Array.from(this._vendors.values()).filter(vendor => {
            if (!vendor.when) {
                return true; // No when clause means always visible
            }
            const whenClause = ContextKeyExpr.deserialize(vendor.when);
            return whenClause ? this._contextKeyService.contextMatchesRules(whenClause) : false;
        });
    }
    getLanguageModelIds() {
        return Array.from(this._modelCache.keys());
    }
    lookupLanguageModel(modelIdentifier) {
        const model = this._modelCache.get(modelIdentifier);
        if (model && this._configurationService.getValue('chat.experimentalShowAllModels')) {
            return { ...model, isUserSelectable: true };
        }
        if (model && this._modelPickerUserPreferences[modelIdentifier] !== undefined) {
            return { ...model, isUserSelectable: this._modelPickerUserPreferences[modelIdentifier] };
        }
        return model;
    }
    _clearModelCache(vendor) {
        for (const [id, model] of this._modelCache.entries()) {
            if (model.vendor === vendor) {
                this._modelCache.delete(id);
            }
        }
    }
    async _resolveLanguageModels(vendor, silent) {
        // Activate extensions before requesting to resolve the models
        await this._extensionService.activateByEvent(`onLanguageModelChatProvider:${vendor}`);
        const provider = this._providers.get(vendor);
        if (!provider) {
            this._logService.warn(`[LM] No provider registered for vendor ${vendor}`);
            return;
        }
        return this._resolveLMSequencer.queue(vendor, async () => {
            try {
                let modelsAndIdentifiers = await provider.provideLanguageModelChatInfo({ silent }, CancellationToken.None);
                // This is a bit of a hack, when prompting user if the provider returns any models that are user selectable then we only want to show those and not the entire model list
                if (!silent && modelsAndIdentifiers.some(m => m.metadata.isUserSelectable)) {
                    modelsAndIdentifiers = modelsAndIdentifiers.filter(m => m.metadata.isUserSelectable || this._modelPickerUserPreferences[m.identifier] === true);
                }
                this._clearModelCache(vendor);
                for (const modelAndIdentifier of modelsAndIdentifiers) {
                    if (this._modelCache.has(modelAndIdentifier.identifier)) {
                        this._logService.warn(`[LM] Model ${modelAndIdentifier.identifier} is already registered. Skipping.`);
                        continue;
                    }
                    this._modelCache.set(modelAndIdentifier.identifier, modelAndIdentifier.metadata);
                }
                this._logService.trace(`[LM] Resolved language models for vendor ${vendor}`, modelsAndIdentifiers);
            }
            catch (error) {
                this._logService.error(`[LM] Error resolving language models for vendor ${vendor}:`, error);
            }
            this._onLanguageModelChange.fire(vendor);
        });
    }
    async selectLanguageModels(selector, allowPromptingUser) {
        if (selector.vendor) {
            await this._resolveLanguageModels(selector.vendor, !allowPromptingUser);
        }
        else {
            const allVendors = Array.from(this._vendors.keys());
            await Promise.all(allVendors.map(vendor => this._resolveLanguageModels(vendor, !allowPromptingUser)));
        }
        const result = [];
        for (const [internalModelIdentifier, model] of this._modelCache) {
            if ((selector.vendor === undefined || model.vendor === selector.vendor)
                && (selector.family === undefined || model.family === selector.family)
                && (selector.version === undefined || model.version === selector.version)
                && (selector.id === undefined || model.id === selector.id)) {
                result.push(internalModelIdentifier);
            }
        }
        this._logService.trace('[LM] selected language models', selector, result);
        return result;
    }
    registerLanguageModelProvider(vendor, provider) {
        this._logService.trace('[LM] registering language model provider', vendor, provider);
        if (!this._vendors.has(vendor)) {
            throw new Error(`Chat model provider uses UNKNOWN vendor ${vendor}.`);
        }
        if (this._providers.has(vendor)) {
            throw new Error(`Chat model provider for vendor ${vendor} is already registered.`);
        }
        this._providers.set(vendor, provider);
        if (this._hasStoredModelForVendor(vendor)) {
            this._resolveLanguageModels(vendor, true);
        }
        const modelChangeListener = provider.onDidChange(async () => {
            await this._resolveLanguageModels(vendor, true);
        });
        return toDisposable(() => {
            this._logService.trace('[LM] UNregistered language model provider', vendor);
            this._clearModelCache(vendor);
            this._providers.delete(vendor);
            modelChangeListener.dispose();
        });
    }
    async sendChatRequest(modelId, from, messages, options, token) {
        const provider = this._providers.get(this._modelCache.get(modelId)?.vendor || '');
        if (!provider) {
            throw new Error(`Chat provider for model ${modelId} is not registered.`);
        }
        return provider.sendChatRequest(modelId, messages, from, options, token);
    }
    computeTokenLength(modelId, message, token) {
        const model = this._modelCache.get(modelId);
        if (!model) {
            throw new Error(`Chat model ${modelId} could not be found.`);
        }
        const provider = this._providers.get(model.vendor);
        if (!provider) {
            throw new Error(`Chat provider for model ${modelId} is not registered.`);
        }
        return provider.provideTokenCount(modelId, message, token);
    }
};
LanguageModelsService = __decorate([
    __param(0, IExtensionService),
    __param(1, ILogService),
    __param(2, IStorageService),
    __param(3, IContextKeyService),
    __param(4, IConfigurationService),
    __param(5, IChatEntitlementService)
], LanguageModelsService);
export { LanguageModelsService };
//# sourceMappingURL=languageModels.js.map