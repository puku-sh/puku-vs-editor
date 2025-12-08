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
exports.EditToolLearningService = exports.IEditToolLearningService = void 0;
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const services_1 = require("../../../util/common/services");
const map_1 = require("../../../util/vs/base/common/map");
const objects_1 = require("../../../util/vs/base/common/objects");
const types_1 = require("../../../util/vs/base/common/types");
const editToolLearningStates_1 = require("./editToolLearningStates");
const toolNames_1 = require("./toolNames");
const CACHE_STORAGE_KEY = 'editToolLearning_cache';
function mapToolsRecord(record, fn) {
    return (0, objects_1.mapValues)(record, (value, key) => fn(value, key));
}
exports.IEditToolLearningService = (0, services_1.createServiceIdentifier)('IEditToolLearningService');
function addToWindow(window, bit) {
    // Shift left to make room for new bit, add the bit, then mask to WINDOW_SIZE
    const mask = (1n << BigInt(100 /* LearningConfig.WINDOW_SIZE */)) - 1n;
    return ((window << 1n) | bit) & mask;
}
let EditToolLearningService = class EditToolLearningService {
    constructor(_context, _endpointProvider, _telemetryService) {
        this._context = _context;
        this._endpointProvider = _endpointProvider;
        this._telemetryService = _telemetryService;
    }
    async getPreferredEditTool(model) {
        const endpoint = await this._endpointProvider.getChatEndpoint(model);
        return this.getPreferredEndpointEditTool(endpoint);
    }
    getPreferredEndpointEditTool(endpoint) {
        if (!endpoint.isExtensionContributed) {
            return undefined;
        }
        const fromEndpoint = endpoint.supportedEditTools
            ?.map(e => toolNames_1.byokEditToolNamesToToolNames.hasOwnProperty(e) ? toolNames_1.byokEditToolNamesToToolNames[e] : undefined)
            .filter(types_1.isDefined);
        if (fromEndpoint?.length) {
            return fromEndpoint;
        }
        // Note: looking at the 'name' rather than 'model' is intentional, 'model' is the user-
        // provided model ID whereas the 'name' is the name of the model on the BYOK provider.
        const hardcoded = this._getHardcodedPreferences(endpoint.name);
        if (hardcoded) {
            return hardcoded;
        }
        const learningData = this._getModelLearningData(endpoint.model);
        return this._computePreferences(learningData);
    }
    async didMakeEdit(model, tool, success) {
        const endpoint = await this._endpointProvider.getChatEndpoint(model);
        if (!endpoint.isExtensionContributed || this._getHardcodedPreferences(endpoint.family)) {
            return;
        }
        const learningData = this._getModelLearningData(model.id);
        this._recordEdit(model.id, learningData, tool, success);
        await this._saveModelLearningData(model.id, learningData);
    }
    _getHardcodedPreferences(family) {
        const lowerFamily = family.toLowerCase();
        if (lowerFamily.includes('gpt') || lowerFamily.includes('openai')) {
            return [toolNames_1.ToolName.ApplyPatch];
        }
        if (lowerFamily.includes('sonnet')) {
            return [toolNames_1.ToolName.ReplaceString, toolNames_1.ToolName.MultiReplaceString];
        }
        return undefined;
    }
    _computePreferences(data) {
        return editToolLearningStates_1.EDIT_TOOL_LEARNING_STATES[data.state].allowedTools;
    }
    _checkStateTransitions(modelId, data) {
        const currentConfig = editToolLearningStates_1.EDIT_TOOL_LEARNING_STATES[data.state];
        if (!currentConfig.transitions) {
            return data.state;
        }
        for (const [targetState, condition] of Object.entries(currentConfig.transitions)) {
            if (!condition(data)) {
                continue;
            }
            const target = Number(targetState);
            /* __GDPR__
                "editToolLearning.transition" : {
                    "owner": "connor4312",
                    "comment": "Tracks state transitions in the edit tool learning system.",
                    "modelId": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Model ID" },
                    "state": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "State the model transitioned to", "isMeasurement": true }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('editToolLearning.transition', { modelId }, {
                state: target,
            });
            return target;
        }
        return data.state; // No transition
    }
    _recordEdit(modelId, data, tool, success) {
        const successBit = success ? 1n : 0n;
        const toolData = (data.tools[tool] ??= { successBitset: 0n, attempts: 0 });
        toolData.successBitset = addToWindow(toolData.successBitset, successBit);
        toolData.attempts++;
        const newState = this._checkStateTransitions(modelId, data);
        if (newState !== data.state) {
            data.state = newState;
            data.tools = {};
        }
    }
    _getCache() {
        if (!this._cache) {
            this._cache = this._loadCacheFromStorage();
        }
        return this._cache;
    }
    _loadCacheFromStorage() {
        const cache = new map_1.LRUCache(50 /* LearningConfig.CACHE_SIZE */);
        const storedCacheData = this._context.globalState.get(CACHE_STORAGE_KEY);
        if (!storedCacheData?.entries) {
            return cache;
        }
        for (const [modelId, storedData] of storedCacheData.entries) {
            const data = {
                state: storedData.state,
                tools: mapToolsRecord(storedData.tools, r => ({
                    successBitset: BigInt(r.successBitset),
                    attempts: r.attempts,
                })),
            };
            cache.set(modelId, data);
        }
        return cache;
    }
    async _saveCacheToStorage() {
        if (!this._cache) {
            return;
        }
        const entries = Array.from(this._cache.entries(), ([modelId, data]) => {
            const storedData = {
                state: data.state,
                tools: mapToolsRecord(data.tools, r => ({
                    successBitset: '0x' + r.successBitset.toString(16),
                    attempts: r.attempts
                })),
            };
            return [modelId, storedData];
        });
        await this._context.globalState.update(CACHE_STORAGE_KEY, { entries });
    }
    async _saveModelLearningData(modelId, data) {
        const cache = this._getCache();
        cache.set(modelId, data);
        await this._saveCacheToStorage();
    }
    _getModelLearningData(modelId) {
        const cache = this._getCache();
        let data = cache.get(modelId);
        if (!data) {
            data = { state: 0 /* State.Initial */, tools: {} };
            cache.set(modelId, data);
        }
        return data;
    }
};
exports.EditToolLearningService = EditToolLearningService;
exports.EditToolLearningService = EditToolLearningService = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, telemetry_1.ITelemetryService)
], EditToolLearningService);
//# sourceMappingURL=editToolLearningService.js.map