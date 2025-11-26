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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vZGVsc1ZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0TWFuYWdlbWVudC9jaGF0TW9kZWxzVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFFLE9BQU8sRUFBbUIsRUFBRSxFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzVJLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdkUsT0FBTyxFQUFFLHNCQUFzQixFQUEwRCxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hJLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRXJHLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLHNCQUFzQixDQUFDO0FBQzlELE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLHVCQUF1QixDQUFDO0FBRWhFLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyw4QkFBOEIsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUNwRSxNQUFNLGdCQUFnQixHQUFHLDJCQUEyQixDQUFDO0FBQ3JELE1BQU0sYUFBYSxHQUFHLDJCQUEyQixDQUFDO0FBQ2xELE1BQU0sY0FBYyxHQUFHLG1DQUFtQyxDQUFDO0FBRTNELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHO0lBQ2pDLFlBQVksRUFBRTtRQUNiLFlBQVk7UUFDWixjQUFjO1FBQ2QsV0FB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RUFBRSxpQkFBMEIsRUFBRSxLQUFlO1FBQ2xILElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDL0UsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDM0UsQ0FBQztRQUNELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVPLFlBQVksQ0FBQyxLQUFlLEVBQUUsa0JBQTBCLEVBQUUsaUJBQTBCO1FBQzNGLElBQUksT0FBTyxHQUFvQixFQUFFLENBQUM7UUFDbEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixNQUFNLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUNoRSxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNqQixPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUM7WUFDaEQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sR0FBRyxJQUFJLENBQUM7Z0JBQ2YsTUFBTTtZQUNQLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVPLGFBQWEsQ0FBQyxPQUFpQjtRQUN0QyxPQUFPLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNwRCxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUssS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDeEksSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDckMsQ0FBQztDQUNEIn0=