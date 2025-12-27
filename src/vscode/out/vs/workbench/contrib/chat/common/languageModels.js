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
            description: localize('vscode.extension.contributes.languageModels.vendor', "A globally unique vendor of language model chat provider.")
        },
        displayName: {
            type: 'string',
            description: localize('vscode.extension.contributes.languageModels.displayName', "The display name of the language model chat provider.")
        },
        managementCommand: {
            type: 'string',
            description: localize('vscode.extension.contributes.languageModels.managementCommand', "A command to manage the language model chat provider, e.g. 'Manage Copilot models'. This is used in the chat model picker. If not provided, a gear icon is not rendered during vendor selection.")
        },
        when: {
            type: 'string',
            description: localize('vscode.extension.contributes.languageModels.when', "Condition which must be true to show this language model chat provider in the Manage Models list.")
        }
    }
};
export const languageModelChatProviderExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'languageModelChatProviders',
    jsonSchema: {
        description: localize('vscode.extension.contributes.languageModelChatProviders', "Contribute language model chat providers of a specific vendor."),
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
                        extension.collector.error(localize('vscode.extension.contributes.languageModels.vendorAlreadyRegistered', "The vendor '{0}' is already registered and cannot be registered twice", item.vendor));
                        continue;
                    }
                    if (isFalsyOrWhitespace(item.vendor)) {
                        extension.collector.error(localize('vscode.extension.contributes.languageModels.emptyVendor', "The vendor field cannot be empty."));
                        continue;
                    }
                    if (item.vendor.trim() !== item.vendor) {
                        extension.collector.error(localize('vscode.extension.contributes.languageModels.whitespaceVendor', "The vendor field cannot start or end with whitespace."));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9sYW5ndWFnZU1vZGVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBR3pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFdkgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxlQUFlLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNuSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVB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