"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolGrouping = void 0;
exports.computeToolGroupingMinThreshold = computeToolGroupingMinThreshold;
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const arrays_1 = require("../../../../util/vs/base/common/arrays");
const iterator_1 = require("../../../../util/vs/base/common/iterator");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const virtualTool_1 = require("./virtualTool");
const virtualToolGrouper_1 = require("./virtualToolGrouper");
const Constant = __importStar(require("./virtualToolsConstants"));
function computeToolGroupingMinThreshold(experimentationService, configurationService) {
    return configurationService.getExperimentBasedConfigObservable(configurationService_1.ConfigKey.VirtualToolThreshold, experimentationService).map(configured => {
        const value = configured ?? configurationService_1.HARD_TOOL_LIMIT;
        return value <= 0 ? Infinity : value;
    });
}
let ToolGrouping = class ToolGrouping {
    get tools() {
        return this._tools;
    }
    set tools(tools) {
        if (!(0, arrays_1.equals)(this._tools, tools, (a, b) => a.name === b.name)) {
            this._tools = tools;
            // Keep the root so that we can still expand any in-flight requests.
            this._didToolsChange = true;
        }
    }
    constructor(_tools, _instantiationService, _telemetryService) {
        this._tools = _tools;
        this._instantiationService = _instantiationService;
        this._telemetryService = _telemetryService;
        this._root = new virtualTool_1.VirtualTool(virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX, '', Infinity, { wasExpandedByDefault: true });
        this._grouper = this._instantiationService.createInstance(virtualToolGrouper_1.VirtualToolGrouper);
        this._didToolsChange = true;
        this._turnNo = 0;
        this._trimOnNextCompute = false;
        this._root.isExpanded = true;
    }
    didCall(localTurnNumber, toolCallName) {
        const result = this._root.find(toolCallName);
        if (!result) {
            return;
        }
        const { path, tool } = result;
        for (const part of path) {
            part.lastUsedOnTurn = this._turnNo;
        }
        if (path.length > 1) { // only for tools in groups under the root
            /* __GDPR__
                "virtualTools.called" : {
                    "owner": "connor4312",
                    "comment": "Reports information about the usage of virtual tools.",
                    "callName": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Name of the categorized group (MCP or extension)" },
                    "isVirtual": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether this called a virtual tool", "isMeasurement": true },
                    "turnNo": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of turns into the loop when this expansion was made", "isMeasurement": true },
                    "depth": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Nesting depth of the tool", "isMeasurement": true },
                    "preExpanded": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the tool was pre-expanded or expanded on demand", "isMeasurement": true },
                    "wasEmbedding": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the tool was pre-expanded due to an embedding", "isMeasurement": true },
                    "totalTools": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Total number of tools available when this tool was called", "isMeasurement": true }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('virtualTools.called', {
                callName: tool.name,
            }, {
                turnNo: localTurnNumber,
                isVirtual: tool instanceof virtualTool_1.VirtualTool ? 1 : 0,
                depth: path.length - 1,
                preExpanded: path.every(p => p.metadata.wasExpandedByDefault) ? 1 : 0,
                wasEmbedding: path.some(p => p.name === virtualTool_1.EMBEDDINGS_GROUP_NAME) ? 1 : 0,
                totalTools: this._tools.length,
            });
        }
        if (!(tool instanceof virtualTool_1.VirtualTool)) {
            return;
        }
        tool.isExpanded = true;
        return new vscodeTypes_1.LanguageModelToolResult([
            new vscodeTypes_1.LanguageModelTextPart(`Tools activated: ${[...tool.tools()].map(t => t.name).join(', ')}`),
        ]);
    }
    getContainerFor(tool) {
        const result = this._root.find(tool);
        const last = result?.path.at(-1);
        return last === this._root ? undefined : last;
    }
    didTakeTurn() {
        this._turnNo++;
    }
    didInvalidateCache() {
        this._trimOnNextCompute = true;
    }
    ensureExpanded(toolName) {
        this._expandOnNext ??= new Set();
        this._expandOnNext.add(toolName);
    }
    async compute(query, token) {
        await this._doCompute(query, token);
        return [...this._root.tools()].filter((0, arrays_1.uniqueFilter)(t => t.name));
    }
    async computeAll(query, token) {
        await this._doCompute(query, token);
        return this._root.contents;
    }
    async _doCompute(query, token) {
        if (this._didToolsChange) {
            await this._grouper.addGroups(query, this._root, this._tools.slice(), token);
            this._didToolsChange = false;
        }
        if (this._expandOnNext) {
            for (const toolName of this._expandOnNext) {
                this._root.find(toolName)?.path.forEach(p => {
                    p.isExpanded = true;
                    p.lastUsedOnTurn = this._turnNo;
                });
            }
            this._expandOnNext = undefined;
        }
        let trimDownTo = configurationService_1.HARD_TOOL_LIMIT;
        if (this._trimOnNextCompute) {
            await this._grouper.recomputeEmbeddingRankings(query, this._root, token);
            trimDownTo = Constant.TRIM_THRESHOLD;
            this._trimOnNextCompute = false;
        }
        this._root.lastUsedOnTurn = Infinity; // ensure the root doesn't get trimmed out
        while (iterator_1.Iterable.length(this._root.tools()) > trimDownTo) {
            const lowest = this._root.getLowestExpandedTool();
            if (!lowest || !isFinite(lowest.lastUsedOnTurn)) {
                break; // No more tools to trim.
            }
            if (lowest.metadata.canBeCollapsed === false) {
                lowest.lastUsedOnTurn = Infinity;
                continue;
            }
            lowest.isExpanded = false;
            lowest.metadata.wasExpandedByDefault = false;
        }
        this._trimOnNextCompute = false;
    }
};
exports.ToolGrouping = ToolGrouping;
exports.ToolGrouping = ToolGrouping = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, telemetry_1.ITelemetryService)
], ToolGrouping);
//# sourceMappingURL=toolGrouping.js.map