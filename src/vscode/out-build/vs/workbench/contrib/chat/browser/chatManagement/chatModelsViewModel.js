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
var ChatModelsViewModel_1;
import { distinct, coalesce } from '../../../../../base/common/arrays.js';
import { or, matchesCamelCase, matchesWords, matchesBaseContiguousSubString } from '../../../../../base/common/filters.js';
import { Emitter } from '../../../../../base/common/event.js';
import { EditorModel } from '../../../../common/editor/editorModel.js';
import { ILanguageModelsService } from '../../../chat/common/languageModels.js';
import { IChatEntitlementService } from '../../../../services/chat/common/chatEntitlementService.js';
export const MODEL_ENTRY_TEMPLATE_ID = 'model.entry.template';
export const VENDOR_ENTRY_TEMPLATE_ID = 'vendor.entry.template';
const wordFilter = or(matchesBaseContiguousSubString, matchesWords);
const CAPABILITY_REGEX = /@capability:\s*([^\s]+)/gi;
const VISIBLE_REGEX = /@visible:\s*(true|false)/i;
const PROVIDER_REGEX = /@provider:\s*((".+?")|([^\s]+))/gi;
export const SEARCH_SUGGESTIONS = {
    FILTER_TYPES: [
        '@provider:',
        '@capability:',
        '@visible:'
    ],
    CAPABILITIES: [
        '@capability:tools',
        '@capability:vision',
        '@capability:agent'
    ],
    VISIBILITY: [
        '@visible:true',
        '@visible:false'
    ]
};
export function isVendorEntry(entry) {
    return entry.type === 'vendor';
}
let ChatModelsViewModel = ChatModelsViewModel_1 = class ChatModelsViewModel extends EditorModel {
    constructor(languageModelsService, chatEntitlementService) {
        super();
        this.languageModelsService = languageModelsService;
        this.chatEntitlementService = chatEntitlementService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.collapsedVendors = new Set();
        this.searchValue = '';
        this._viewModelEntries = [];
        this.modelEntries = [];
        this._register(this.chatEntitlementService.onDidChangeEntitlement(() => this.refresh()));
    }
    get viewModelEntries() {
        return this._viewModelEntries;
    }
    splice(at, removed, added) {
        this._viewModelEntries.splice(at, removed, ...added);
        if (this.selectedEntry) {
            this.selectedEntry = this._viewModelEntries.find(entry => entry.id === this.selectedEntry?.id);
        }
        this._onDidChange.fire({ at, removed, added });
    }
    filter(searchValue) {
        this.searchValue = searchValue;
        const filtered = this.filterModels(this.modelEntries, searchValue);
        this.splice(0, this._viewModelEntries.length, filtered);
        return this.viewModelEntries;
    }
    filterModels(modelEntries, searchValue) {
        let visible;
        const visibleMatches = VISIBLE_REGEX.exec(searchValue);
        if (visibleMatches && visibleMatches[1]) {
            visible = visibleMatches[1].toLowerCase() === 'true';
            searchValue = searchValue.replace(VISIBLE_REGEX, '');
        }
        const providerNames = [];
        let providerMatch;
        PROVIDER_REGEX.lastIndex = 0;
        while ((providerMatch = PROVIDER_REGEX.exec(searchValue)) !== null) {
            const providerName = providerMatch[2] ? providerMatch[2].substring(1, providerMatch[2].length - 1) : providerMatch[3];
            providerNames.push(providerName);
        }
        if (providerNames.length > 0) {
            searchValue = searchValue.replace(PROVIDER_REGEX, '');
        }
        const capabilities = [];
        let capabilityMatch;
        CAPABILITY_REGEX.lastIndex = 0;
        while ((capabilityMatch = CAPABILITY_REGEX.exec(searchValue)) !== null) {
            capabilities.push(capabilityMatch[1].toLowerCase());
        }
        if (capabilities.length > 0) {
            searchValue = searchValue.replace(CAPABILITY_REGEX, '');
        }
        const quoteAtFirstChar = searchValue.charAt(0) === '"';
        const quoteAtLastChar = searchValue.charAt(searchValue.length - 1) === '"';
        const completeMatch = quoteAtFirstChar && quoteAtLastChar;
        if (quoteAtFirstChar) {
            searchValue = searchValue.substring(1);
        }
        if (quoteAtLastChar) {
            searchValue = searchValue.substring(0, searchValue.length - 1);
        }
        searchValue = searchValue.trim();
        const isFiltering = searchValue !== '' || capabilities.length > 0 || providerNames.length > 0 || visible !== undefined;
        const result = [];
        const words = searchValue.split(' ');
        const allVendors = new Set(this.modelEntries.map(m => m.vendor));
        const showHeaders = allVendors.size > 1;
        const addedVendors = new Set();
        const lowerProviders = providerNames.map(p => p.toLowerCase().trim());
        for (const modelEntry of modelEntries) {
            if (!isFiltering && showHeaders && this.collapsedVendors.has(modelEntry.vendor)) {
                if (!addedVendors.has(modelEntry.vendor)) {
                    const vendorInfo = this.languageModelsService.getVendors().find(v => v.vendor === modelEntry.vendor);
                    result.push({
                        type: 'vendor',
                        id: `vendor-${modelEntry.vendor}`,
                        vendorEntry: {
                            vendor: modelEntry.vendor,
                            vendorDisplayName: modelEntry.vendorDisplayName,
                            managementCommand: vendorInfo?.managementCommand
                        },
                        templateId: VENDOR_ENTRY_TEMPLATE_ID,
                        collapsed: true
                    });
                    addedVendors.add(modelEntry.vendor);
                }
                continue;
            }
            if (visible !== undefined) {
                if ((modelEntry.metadata.isUserSelectable ?? false) !== visible) {
                    continue;
                }
            }
            if (lowerProviders.length > 0) {
                const matchesProvider = lowerProviders.some(provider => modelEntry.vendor.toLowerCase() === provider ||
                    modelEntry.vendorDisplayName.toLowerCase() === provider);
                if (!matchesProvider) {
                    continue;
                }
            }
            // Filter by capabilities
            let matchedCapabilities = [];
            if (capabilities.length > 0) {
                if (!modelEntry.metadata.capabilities) {
                    continue;
                }
                let matchesAll = true;
                for (const capability of capabilities) {
                    const matchedForThisCapability = this.getMatchingCapabilities(modelEntry, capability);
                    if (matchedForThisCapability.length === 0) {
                        matchesAll = false;
                        break;
                    }
                    matchedCapabilities.push(...matchedForThisCapability);
                }
                if (!matchesAll) {
                    continue;
                }
                matchedCapabilities = distinct(matchedCapabilities);
            }
            // Filter by text
            let modelMatches;
            if (searchValue) {
                modelMatches = new ModelItemMatches(modelEntry, searchValue, words, completeMatch);
                if (!modelMatches.modelNameMatches && !modelMatches.modelIdMatches && !modelMatches.providerMatches && !modelMatches.capabilityMatches) {
                    continue;
                }
            }
            if (showHeaders && !addedVendors.has(modelEntry.vendor)) {
                const vendorInfo = this.languageModelsService.getVendors().find(v => v.vendor === modelEntry.vendor);
                result.push({
                    type: 'vendor',
                    id: `vendor-${modelEntry.vendor}`,
                    vendorEntry: {
                        vendor: modelEntry.vendor,
                        vendorDisplayName: modelEntry.vendorDisplayName,
                        managementCommand: vendorInfo?.managementCommand
                    },
                    templateId: VENDOR_ENTRY_TEMPLATE_ID,
                    collapsed: false
                });
                addedVendors.add(modelEntry.vendor);
            }
            const modelId = ChatModelsViewModel_1.getId(modelEntry);
            result.push({
                type: 'model',
                id: modelId,
                templateId: MODEL_ENTRY_TEMPLATE_ID,
                modelEntry,
                modelNameMatches: modelMatches?.modelNameMatches || undefined,
                modelIdMatches: modelMatches?.modelIdMatches || undefined,
                providerMatches: modelMatches?.providerMatches || undefined,
                capabilityMatches: matchedCapabilities.length ? matchedCapabilities : undefined,
            });
        }
        return result;
    }
    getMatchingCapabilities(modelEntry, capability) {
        const matchedCapabilities = [];
        if (!modelEntry.metadata.capabilities) {
            return matchedCapabilities;
        }
        switch (capability) {
            case 'tools':
            case 'toolcalling':
                if (modelEntry.metadata.capabilities.toolCalling === true) {
                    matchedCapabilities.push('toolCalling');
                }
                break;
            case 'vision':
                if (modelEntry.metadata.capabilities.vision === true) {
                    matchedCapabilities.push('vision');
                }
                break;
            case 'agent':
            case 'agentmode':
                if (modelEntry.metadata.capabilities.agentMode === true) {
                    matchedCapabilities.push('agentMode');
                }
                break;
            default:
                // Check edit tools
                if (modelEntry.metadata.capabilities.editTools) {
                    for (const tool of modelEntry.metadata.capabilities.editTools) {
                        if (tool.toLowerCase().includes(capability)) {
                            matchedCapabilities.push(tool);
                        }
                    }
                }
                break;
        }
        return matchedCapabilities;
    }
    getVendors() {
        return [...this.languageModelsService.getVendors()].sort((a, b) => {
            if (a.vendor === 'copilot') {
                return -1;
            }
            if (b.vendor === 'copilot') {
                return 1;
            }
            return a.displayName.localeCompare(b.displayName);
        });
    }
    async resolve() {
        await this.refresh();
        return super.resolve();
    }
    async refresh() {
        this.modelEntries = [];
        for (const vendor of this.getVendors()) {
            const modelIdentifiers = await this.languageModelsService.selectLanguageModels({ vendor: vendor.vendor }, vendor.vendor === 'copilot');
            const models = coalesce(modelIdentifiers.map(identifier => {
                const metadata = this.languageModelsService.lookupLanguageModel(identifier);
                if (!metadata) {
                    return undefined;
                }
                if (vendor.vendor === 'copilot' && metadata.id === 'auto') {
                    return undefined;
                }
                return {
                    vendor: vendor.vendor,
                    vendorDisplayName: vendor.displayName,
                    identifier,
                    metadata
                };
            }));
            this.modelEntries.push(...models.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name)));
        }
        this.modelEntries = distinct(this.modelEntries, modelEntry => ChatModelsViewModel_1.getId(modelEntry));
        this.filter(this.searchValue);
    }
    toggleVisibility(model) {
        const isVisible = model.modelEntry.metadata.isUserSelectable ?? false;
        const newVisibility = !isVisible;
        this.languageModelsService.updateModelPickerPreference(model.modelEntry.identifier, newVisibility);
        const metadata = this.languageModelsService.lookupLanguageModel(model.modelEntry.identifier);
        const index = this.viewModelEntries.indexOf(model);
        if (metadata) {
            model.id = ChatModelsViewModel_1.getId(model.modelEntry);
            model.modelEntry.metadata = metadata;
            this.splice(index, 1, [model]);
        }
    }
    static getId(modelEntry) {
        return `${modelEntry.identifier}.${modelEntry.metadata.version}-visible:${modelEntry.metadata.isUserSelectable}`;
    }
    toggleVendorCollapsed(vendorEntry) {
        this.selectedEntry = vendorEntry;
        if (this.collapsedVendors.has(vendorEntry.vendorEntry.vendor)) {
            this.collapsedVendors.delete(vendorEntry.vendorEntry.vendor);
        }
        else {
            this.collapsedVendors.add(vendorEntry.vendorEntry.vendor);
        }
        this.filter(this.searchValue);
    }
    getConfiguredVendors() {
        const result = [];
        const seenVendors = new Set();
        for (const modelEntry of this.modelEntries) {
            if (!seenVendors.has(modelEntry.vendor)) {
                seenVendors.add(modelEntry.vendor);
                const vendorInfo = this.languageModelsService.getVendors().find(v => v.vendor === modelEntry.vendor);
                result.push({
                    vendor: modelEntry.vendor,
                    vendorDisplayName: modelEntry.vendorDisplayName,
                    managementCommand: vendorInfo?.managementCommand
                });
            }
        }
        return result;
    }
};
ChatModelsViewModel = ChatModelsViewModel_1 = __decorate([
    __param(0, ILanguageModelsService),
    __param(1, IChatEntitlementService)
], ChatModelsViewModel);
export { ChatModelsViewModel };
class ModelItemMatches {
    constructor(modelEntry, searchValue, words, completeMatch) {
        this.modelNameMatches = null;
        this.modelIdMatches = null;
        this.providerMatches = null;
        this.capabilityMatches = null;
        if (!completeMatch) {
            // Match against model name
            this.modelNameMatches = modelEntry.metadata.name ?
                this.matches(searchValue, modelEntry.metadata.name, (word, wordToMatchAgainst) => matchesWords(word, wordToMatchAgainst, true), words) :
                null;
            this.modelIdMatches = this.matches(searchValue, modelEntry.identifier, or(matchesWords, matchesCamelCase), words);
            // Match against vendor display name
            this.providerMatches = this.matches(searchValue, modelEntry.vendorDisplayName, (word, wordToMatchAgainst) => matchesWords(word, wordToMatchAgainst, true), words);
            // Match against capabilities
            if (modelEntry.metadata.capabilities) {
                const capabilityStrings = [];
                if (modelEntry.metadata.capabilities.toolCalling) {
                    capabilityStrings.push('tools', 'toolCalling');
                }
                if (modelEntry.metadata.capabilities.vision) {
                    capabilityStrings.push('vision');
                }
                if (modelEntry.metadata.capabilities.agentMode) {
                    capabilityStrings.push('agent', 'agentMode');
                }
                if (modelEntry.metadata.capabilities.editTools) {
                    capabilityStrings.push(...modelEntry.metadata.capabilities.editTools);
                }
                const capabilityString = capabilityStrings.join(' ');
                if (capabilityString) {
                    this.capabilityMatches = this.matches(searchValue, capabilityString, or(matchesWords, matchesCamelCase), words);
                }
            }
        }
    }
    matches(searchValue, wordToMatchAgainst, wordMatchesFilter, words) {
        let matches = searchValue ? wordFilter(searchValue, wordToMatchAgainst) : null;
        if (!matches) {
            matches = this.matchesWords(words, wordToMatchAgainst, wordMatchesFilter);
        }
        if (matches) {
            matches = this.filterAndSort(matches);
        }
        return matches;
    }
    matchesWords(words, wordToMatchAgainst, wordMatchesFilter) {
        let matches = [];
        for (const word of words) {
            const wordMatches = wordMatchesFilter(word, wordToMatchAgainst);
            if (wordMatches) {
                matches = [...(matches || []), ...wordMatches];
            }
            else {
                matches = null;
                break;
            }
        }
        return matches;
    }
    filterAndSort(matches) {
        return distinct(matches, (a => a.start + '.' + a.end))
            .filter(match => !matches.some(m => !(m.start === match.start && m.end === match.end) && (m.start <= match.start && m.end >= match.end)))
            .sort((a, b) => a.start - b.start);
    }
}
//# sourceMappingURL=chatModelsViewModel.js.map