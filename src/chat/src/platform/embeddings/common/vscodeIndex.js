"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VSCodeCombinedIndexImpl = exports.ICombinedEmbeddingIndex = void 0;
exports.settingItemToContext = settingItemToContext;
const services_1 = require("../../../util/common/services");
const telemetryCorrelationId_1 = require("../../../util/common/telemetryCorrelationId");
const vscodeVersion_1 = require("../../../util/common/vscodeVersion");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const envService_1 = require("../../env/common/envService");
const logService_1 = require("../../log/common/logService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const workbenchService_1 = require("../../workbench/common/workbenchService");
const embeddingsComputer_1 = require("./embeddingsComputer");
const embeddingsIndex_1 = require("./embeddingsIndex");
function settingItemToContext(item) {
    let result = `Setting Id: ${item.key}\n`;
    result += `Type: ${item.type}\n`;
    result += `Description: ${item.description ?? item.markdownDescription ?? ''}\n`;
    if (item.enum) {
        result += `Possible values:\n`;
        for (let i = 0; i < item.enum.length; i++) {
            result += ` - ${item.enum[i]} - ${item.enumDescriptions?.[i] ?? ''}\n`;
        }
    }
    result += '\n';
    return result;
}
// Lifted from proposed API
// TODO @lramos15 where should things like this go?
var RelatedInformationType;
(function (RelatedInformationType) {
    RelatedInformationType[RelatedInformationType["SymbolInformation"] = 1] = "SymbolInformation";
    RelatedInformationType[RelatedInformationType["CommandInformation"] = 2] = "CommandInformation";
    RelatedInformationType[RelatedInformationType["SearchInformation"] = 3] = "SearchInformation";
    RelatedInformationType[RelatedInformationType["SettingInformation"] = 4] = "SettingInformation";
})(RelatedInformationType || (RelatedInformationType = {}));
class RelatedInformationProviderEmbeddingsIndex extends embeddingsIndex_1.BaseEmbeddingsIndex {
    constructor(loggerContext, embeddingType, cacheKey, embeddingsComputer, embeddingsCache, relatedInformationConfig, _logService, telemetryService) {
        super(loggerContext, embeddingType, cacheKey, embeddingsCache, embeddingsComputer, _logService);
        this.relatedInformationConfig = relatedInformationConfig;
        this._logService = _logService;
        this.telemetryService = telemetryService;
        this.isIndexLoaded = false;
    }
    /**
     * Returns related information for the given query
     * @param query The base string which will be compared against indexed items
     * @param types The types of related information to return
     * @param token A cancellation token to cancel the request
     * @returns An array of RelatedInformationResult objects
     */
    async provideRelatedInformation(query, token) {
        const similarityStart = Date.now();
        if (!this.isIndexLoaded) {
            // Queue off the calculation, but don't await as the user doesn't need to wait for it
            this.calculateEmbeddings();
            this._logService.debug(`Related Information: Index not loaded yet triggering background calculation, returning ${Date.now() - similarityStart}ms`);
            return [];
        }
        if (token.isCancellationRequested) {
            // return an array of 0s the same length as comparisons
            this._logService.debug(`Related Information: Request cancelled, returning ${Date.now() - similarityStart}ms`);
            return [];
        }
        const startOfEmbeddingRequest = Date.now();
        const embeddingResult = await this.embeddingsComputer.computeEmbeddings(embeddingsComputer_1.EmbeddingType.text3small_512, [query], {}, new telemetryCorrelationId_1.TelemetryCorrelationId('RelatedInformationProviderEmbeddingsIndex::provideRelatedInformation'), token);
        this._logService.debug(`Related Information: Remote similarly request took ${Date.now() - startOfEmbeddingRequest}ms`);
        if (token.isCancellationRequested) {
            // return an array of 0s the same length as comparisons
            this._logService.debug(`Related Information: Request cancelled or no embeddings computed, returning ${Date.now() - similarityStart}ms`);
            return [];
        }
        const results = [];
        for (const item of this._items.values()) {
            if (token.isCancellationRequested) {
                this._logService.debug(`Related Information: Request cancelled, returning ${Date.now() - similarityStart}ms`);
                break;
            }
            if (item.embedding) {
                const score = (0, embeddingsComputer_1.distance)(embeddingResult.values[0], { value: item.embedding, type: embeddingsComputer_1.EmbeddingType.text3small_512 }).value;
                if (score > this.relatedInformationConfig.threshold) {
                    results.push(this.toRelatedInformation(item, score));
                }
            }
        }
        this.logService.debug(`Related Information: Successfully Calculated, returning ${Date.now() - similarityStart}ms`);
        // Only log non-cancelled settings related information queries
        if (this.relatedInformationConfig.type === RelatedInformationType.SettingInformation) {
            this.telemetryService.sendInternalMSFTTelemetryEvent('relatedInformationSettings', { query });
        }
        const returnthis = results
            .sort((a, b) => b.weight - a.weight)
            .slice(0, this.relatedInformationConfig.maxResults);
        return returnthis;
    }
}
let CommandIdIndex = class CommandIdIndex extends RelatedInformationProviderEmbeddingsIndex {
    constructor(embeddingscache, embeddingsFetcher, logService, telemetryService, workbenchService) {
        super('CommandIdIndex', embeddingsComputer_1.EmbeddingType.text3small_512, 'commandEmbeddings', embeddingsFetcher, embeddingscache, {
            type: RelatedInformationType.CommandInformation,
            threshold: /* min threshold of 0 for text-3-small*/ 0,
            maxResults: 100,
        }, logService, telemetryService);
        this.workbenchService = workbenchService;
    }
    async getLatestItems() {
        const allCommands = await this.workbenchService.getAllCommands();
        // This isn't in the command palette, but it's a useful command to suggest
        allCommands.push({
            label: 'Extensions: Search the marketplace for extensions',
            command: 'workbench.extensions.search',
            keybinding: 'Not set',
        });
        allCommands.push({
            label: 'Extensions: Install extension from marketplace',
            command: 'workbench.extensions.installExtension',
            keybinding: 'Not set',
        });
        return allCommands.map(c => {
            return {
                key: c.command,
                label: c.label.replace('View: Toggle', 'View: Toggle or Show or Hide'),
                originalLabel: c.label,
                keybinding: c.keybinding ?? 'Not set',
            };
        });
    }
    getEmbeddingQueryString(value) {
        return `${value.label} - ${value.key}`;
    }
    toRelatedInformation(value, score) {
        return {
            type: RelatedInformationType.CommandInformation,
            weight: score,
            command: value.key,
        };
    }
};
CommandIdIndex = __decorate([
    __param(1, embeddingsComputer_1.IEmbeddingsComputer),
    __param(2, logService_1.ILogService),
    __param(3, telemetry_1.ITelemetryService),
    __param(4, workbenchService_1.IWorkbenchService)
], CommandIdIndex);
let SettingsIndex = class SettingsIndex extends RelatedInformationProviderEmbeddingsIndex {
    constructor(embeddingsCache, embeddingsFetcher, logService, telemetryService, workbenchService) {
        super('SettingsIndex', embeddingsComputer_1.EmbeddingType.text3small_512, 'settingEmbeddings', embeddingsFetcher, embeddingsCache, {
            type: RelatedInformationType.SettingInformation,
            threshold: /* min threshold of 0 for text-3-small*/ 0,
            maxResults: 100,
        }, logService, telemetryService);
        this.workbenchService = workbenchService;
    }
    async getLatestItems() {
        const settings = await this.workbenchService.getAllSettings();
        const settingsList = [];
        for (const settingId of Object.keys(settings)) {
            const setting = settings[settingId];
            if (setting.deprecationMessage || setting.markdownDeprecationMessage) {
                continue;
            }
            settingsList.push({ ...setting, key: settingId });
        }
        return settingsList;
    }
    getEmbeddingQueryString(value) {
        return settingItemToContext(value);
    }
    toRelatedInformation(value, score) {
        return {
            type: RelatedInformationType.SettingInformation,
            weight: score,
            setting: value.key,
        };
    }
};
SettingsIndex = __decorate([
    __param(1, embeddingsComputer_1.IEmbeddingsComputer),
    __param(2, logService_1.ILogService),
    __param(3, telemetry_1.ITelemetryService),
    __param(4, workbenchService_1.IWorkbenchService)
], SettingsIndex);
exports.ICombinedEmbeddingIndex = (0, services_1.createServiceIdentifier)('ICombinedEmbeddingIndex');
/**
 * Combines the settings and command indexes into a single index. This is what is consumed externally
 * If necessary, the individual indices can be accessed
 */
let VSCodeCombinedIndexImpl = class VSCodeCombinedIndexImpl {
    constructor(useRemoteCache = true, instantiationService, envService) {
        // Local embeddings cache version is locked to 1.98
        const settingsEmbeddingsCache = useRemoteCache ?
            instantiationService.createInstance(embeddingsIndex_1.RemoteEmbeddingsExtensionCache, embeddingsIndex_1.EmbeddingCacheType.GLOBAL, 'settingEmbeddings', (0, vscodeVersion_1.sanitizeVSCodeVersion)(envService.getEditorInfo().version), embeddingsComputer_1.EmbeddingType.text3small_512, embeddingsIndex_1.RemoteCacheType.Settings) :
            instantiationService.createInstance(embeddingsIndex_1.LocalEmbeddingsCache, embeddingsIndex_1.EmbeddingCacheType.GLOBAL, 'settingEmbeddings', '1.98', embeddingsComputer_1.EmbeddingType.text3small_512);
        const commandsEmbeddingsCache = useRemoteCache ?
            instantiationService.createInstance(embeddingsIndex_1.RemoteEmbeddingsExtensionCache, embeddingsIndex_1.EmbeddingCacheType.GLOBAL, 'commandEmbeddings', (0, vscodeVersion_1.sanitizeVSCodeVersion)(envService.getEditorInfo().version), embeddingsComputer_1.EmbeddingType.text3small_512, embeddingsIndex_1.RemoteCacheType.Commands) :
            instantiationService.createInstance(embeddingsIndex_1.LocalEmbeddingsCache, embeddingsIndex_1.EmbeddingCacheType.GLOBAL, 'commandEmbeddings', '1.98', embeddingsComputer_1.EmbeddingType.text3small_512);
        this.settingsIndex = instantiationService.createInstance(SettingsIndex, settingsEmbeddingsCache);
        this.commandIdIndex = instantiationService.createInstance(CommandIdIndex, commandsEmbeddingsCache);
    }
    async loadIndexes() {
        await Promise.all([
            this.commandIdIndex.isIndexLoaded ? Promise.resolve() : this.commandIdIndex.calculateEmbeddings(),
            this.settingsIndex.isIndexLoaded ? Promise.resolve() : this.settingsIndex.calculateEmbeddings(),
        ]);
    }
    async nClosestValues(embedding, n) {
        await this.loadIndexes();
        return {
            commands: this.commandIdIndex.nClosestValues(embedding, n),
            settings: this.settingsIndex.nClosestValues(embedding, n),
        };
    }
    hasSetting(settingId) {
        return this.settingsIndex.hasItem(settingId);
    }
    hasCommand(commandId) {
        return this.commandIdIndex.hasItem(commandId);
    }
    getSetting(settingId) {
        return this.settingsIndex.getItem(settingId);
    }
    getCommand(commandId) {
        return this.commandIdIndex.getItem(commandId);
    }
};
exports.VSCodeCombinedIndexImpl = VSCodeCombinedIndexImpl;
exports.VSCodeCombinedIndexImpl = VSCodeCombinedIndexImpl = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, envService_1.IEnvService)
], VSCodeCombinedIndexImpl);
//# sourceMappingURL=vscodeIndex.js.map