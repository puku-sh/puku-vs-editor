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
var VirtualToolGrouper_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualToolGrouper = void 0;
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const embeddingsComputer_1 = require("../../../../platform/embeddings/common/embeddingsComputer");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../../platform/log/common/logService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const telemetryCorrelationId_1 = require("../../../../util/common/telemetryCorrelationId");
const collections_1 = require("../../../../util/vs/base/common/collections");
const stopwatch_1 = require("../../../../util/vs/base/common/stopwatch");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const builtInToolGroupHandler_1 = require("./builtInToolGroupHandler");
const preComputedToolEmbeddingsCache_1 = require("./preComputedToolEmbeddingsCache");
const toolEmbeddingsComputer_1 = require("./toolEmbeddingsComputer");
const virtualTool_1 = require("./virtualTool");
const Constant = __importStar(require("./virtualToolsConstants"));
const virtualToolsConstants_1 = require("./virtualToolsConstants");
const virtualToolSummarizer_1 = require("./virtualToolSummarizer");
const virtualToolTypes_1 = require("./virtualToolTypes");
const CATEGORIZATION_ENDPOINT = 'copilot-fast';
const SUMMARY_PREFIX = 'Call this tool when you need access to a new category of tools. The category of tools is described as follows:\n\n';
const SUMMARY_SUFFIX = '\n\nBe sure to call this tool if you need a capability related to the above.';
let VirtualToolGrouper = VirtualToolGrouper_1 = class VirtualToolGrouper {
    constructor(_endpointProvider, _cache, _telemetryService, _logService, embeddingsComputer, _configurationService, _expService, _toolEmbeddingsComputer, _instantiationService) {
        this._endpointProvider = _endpointProvider;
        this._cache = _cache;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this.embeddingsComputer = embeddingsComputer;
        this._configurationService = _configurationService;
        this._expService = _expService;
        this._toolEmbeddingsComputer = _toolEmbeddingsComputer;
        this.builtInToolGroupHandler = new builtInToolGroupHandler_1.BuiltInToolGroupHandler();
    }
    /**
     * Determines if built-in tool grouping should be triggered based on configuration and tool count
     */
    shouldTriggerBuiltInGrouping(tools) {
        const defaultToolGroupingEnabled = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.DefaultToolsGrouped, this._expService);
        return tools.length > Constant.START_BUILTIN_GROUPING_AFTER_TOOL_COUNT && defaultToolGroupingEnabled;
    }
    async addGroups(query, root, tools, token) {
        // If there's no need to group tools, just add them all directly;
        // if there are more than START_BUILTIN_GROUPING_AFTER_TOOL_COUNT tools, we should group built-in tools
        // otherwise, follow the existing logic of grouping all tools together
        const shouldGroup = this.shouldTriggerBuiltInGrouping(tools);
        if (!shouldGroup && tools.length < Constant.START_GROUPING_AFTER_TOOL_COUNT) {
            root.contents = tools;
            return;
        }
        const byToolset = (0, collections_1.groupBy)(tools, t => {
            if (t.source instanceof vscodeTypes_1.LanguageModelToolExtensionSource) {
                return 'ext_' + t.source.id;
            }
            else if (t.source instanceof vscodeTypes_1.LanguageModelToolMCPSource) {
                return 'mcp_' + t.source.label;
            }
            else {
                return builtInToolGroupHandler_1.BuiltInToolGroupHandler.BUILT_IN_GROUP_KEY;
            }
        });
        const previousGroups = new Map();
        for (const tool of root.all()) {
            if (tool instanceof virtualTool_1.VirtualTool) {
                previousGroups.set(tool.name, tool);
            }
        }
        const predictedToolsSw = new stopwatch_1.StopWatch();
        const predictedToolsPromise = this._getPredictedTools(query, tools, token).then(tools => ({ tools, durationMs: predictedToolsSw.elapsed() }));
        // Separate builtin tools from extension/MCP tools
        const builtinTools = byToolset[builtInToolGroupHandler_1.BuiltInToolGroupHandler.BUILT_IN_GROUP_KEY] || [];
        const toolsetEntries = Object.entries(byToolset).filter(([key]) => key !== builtInToolGroupHandler_1.BuiltInToolGroupHandler.BUILT_IN_GROUP_KEY);
        const groupedResults = [];
        // Handle built-in tools - apply grouping logic if needed
        const shouldGroupBuiltin = this.shouldTriggerBuiltInGrouping(builtinTools);
        if (shouldGroupBuiltin) {
            const builtinGroups = this.builtInToolGroupHandler.createBuiltInToolGroups(builtinTools);
            groupedResults.push(...builtinGroups);
        }
        else {
            // Add builtin tools directly without grouping
            groupedResults.push(...builtinTools);
        }
        // Process extension/MCP tools per-toolset with proportional slot allocation
        if (toolsetEntries.length > 0) {
            // Calculate available slots after accounting for builtin tools/groups
            const builtinSlotCount = groupedResults.length;
            const availableSlots = virtualToolsConstants_1.TOOLS_AND_GROUPS_LIMIT - builtinSlotCount;
            const slotAllocation = this._allocateSlots(toolsetEntries, availableSlots);
            // Process each toolset individually
            const toolsetGrouped = await Promise.all([...toolsetEntries].map(async ([toolsetKey, tools]) => {
                const allocatedSlots = slotAllocation.get(toolsetKey) || 0;
                return allocatedSlots > 0 ? await this._processToolset(tools, allocatedSlots, token) : [];
            }));
            groupedResults.push(...toolsetGrouped.flat());
        }
        this._cache.flush();
        root.contents = VirtualToolGrouper_1.deduplicateGroups(groupedResults);
        // Send telemetry for per-toolset processing
        if (toolsetEntries.length > 0) {
            const totalToolsToGroup = toolsetEntries.reduce((sum, [, tools]) => sum + tools.length, 0);
            const totalGroupsCreated = groupedResults.filter(item => item instanceof virtualTool_1.VirtualTool).length;
            /* __GDPR__
                "virtualTools.perToolsetGenerate" : {
                    "owner": "connor4312",
                    "comment": "Reports information about the per-toolset generation of virtual tools.",
                    "toolsetsProcessed": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of toolsets processed", "isMeasurement": true },
                    "toolsBefore": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of tools before categorization", "isMeasurement": true },
                    "groupsAfter": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of groups after categorization", "isMeasurement": true },
                    "builtinTools": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of builtin tools added directly", "isMeasurement": true }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('virtualTools.perToolsetGenerate', {}, {
                toolsetsProcessed: toolsetEntries.length,
                toolsBefore: totalToolsToGroup,
                groupsAfter: totalGroupsCreated,
                builtinTools: builtinTools.length,
            });
        }
        for (const tool of root.all()) {
            if (tool instanceof virtualTool_1.VirtualTool) {
                const prev = previousGroups.get(tool.name);
                if (prev) {
                    tool.copyStateFrom(prev);
                }
            }
        }
        await this._addEmbeddingMatchedTools(root, predictedToolsPromise);
    }
    /** Recomputes and updates the embedding-matched tools on the `root` based on the user query. */
    async recomputeEmbeddingRankings(query, root, token) {
        const predictedToolsSw = new stopwatch_1.StopWatch();
        const actualTools = [...root.all()].filter((t) => !(t instanceof virtualTool_1.VirtualTool));
        const matchedTools = this._getPredictedTools(query, actualTools, token).then(tools => ({
            tools,
            durationMs: predictedToolsSw.elapsed()
        }));
        await this._addEmbeddingMatchedTools(root, matchedTools);
    }
    _addPredictedToolsGroup(root, predictedTools) {
        const newGroup = new virtualTool_1.VirtualTool(virtualTool_1.EMBEDDINGS_GROUP_NAME, 'Tools with high predicted relevancy for this query', Infinity, {
            wasEmbeddingsMatched: true,
            wasExpandedByDefault: true,
            canBeCollapsed: false,
        });
        newGroup.isExpanded = true;
        for (const tool of predictedTools) {
            newGroup.contents.push(tool);
        }
        const idx = root.contents.findIndex(t => t.name === virtualTool_1.EMBEDDINGS_GROUP_NAME);
        if (idx >= 0) {
            root.contents[idx] = newGroup;
        }
        else {
            root.contents.push(newGroup);
        }
    }
    async _addEmbeddingMatchedTools(root, predictedToolsPromise) {
        // Aggressively expand groups with predicted tools up to hard limit
        const sw = new stopwatch_1.StopWatch();
        let error;
        let computeMs;
        try {
            const { tools, durationMs } = await predictedToolsPromise;
            computeMs = durationMs;
            this._addPredictedToolsGroup(root, tools);
        }
        catch (e) {
            error = e;
        }
        finally {
            // Telemetry for predicted tool re-expansion
            /* __GDPR__
                "virtualTools.expandEmbedding" : {
                    "owner": "connor4312",
                    "comment": "Expansion of virtual tool groups using embedding-based ranking.",
                    "error": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth", "comment": "Error message if expansion failed" },
                    "blockingMs": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Blocking duration of the expansion operation in milliseconds", "isMeasurement": true },
                    "computeMs": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Duration of the expansion operation in milliseconds", "isMeasurement": true },
                    "hadError": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether the operation had an error", "isMeasurement": true }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('virtualTools.expandEmbedding', { error: error ? error.message : undefined }, {
                blockingMs: sw.elapsed(),
                computeMs,
                hadError: error ? 1 : 0,
            });
        }
    }
    static deduplicateGroups(grouped) {
        const seen = new Set();
        const result = [];
        for (const item of grouped) {
            let name = item.name;
            let counter = 1;
            // Find a unique name by adding numeric suffix if needed
            while (seen.has(name)) {
                counter++;
                name = `${item.name}_${counter}`;
            }
            // Create new virtual tool with unique name if needed
            if (item instanceof virtualTool_1.VirtualTool && name !== item.name) {
                const renamedTool = item.cloneWithNewName(name);
                seen.add(name);
                result.push(renamedTool);
            }
            else {
                seen.add(name);
                result.push(item);
            }
        }
        return result;
    }
    /**
     * Allocate slots proportionally to each toolset based on tool count, ensuring every toolset gets at least one slot
     */
    _allocateSlots(toolsetEntries, availableSlots) {
        const allocation = new Map();
        // If we have more toolsets than slots, give each one slot
        if (toolsetEntries.length >= availableSlots) {
            for (let i = 0; i < toolsetEntries.length; i++) {
                allocation.set(toolsetEntries[i][0], i < availableSlots ? 1 : 0);
            }
            return allocation;
        }
        // Calculate total tools to group
        const totalTools = toolsetEntries.reduce((sum, [, tools]) => sum + tools.length, 0);
        // Give each toolset at least one slot
        let remainingSlots = availableSlots - toolsetEntries.length;
        for (const [toolsetKey] of toolsetEntries) {
            allocation.set(toolsetKey, 1);
        }
        // Distribute remaining slots proportionally
        if (remainingSlots > 0) {
            const proportions = toolsetEntries.map(([toolsetKey, tools]) => ({
                toolsetKey,
                proportion: tools.length / totalTools,
                toolCount: tools.length
            }));
            // Sort by proportion descending to handle rounding better
            proportions.sort((a, b) => b.proportion - a.proportion);
            // Allocate additional slots based on proportion
            for (const { toolsetKey, proportion } of proportions) {
                const additionalSlots = Math.round(proportion * remainingSlots);
                const slotsToAdd = Math.min(additionalSlots, remainingSlots);
                allocation.set(toolsetKey, allocation.get(toolsetKey) + slotsToAdd);
                remainingSlots -= slotsToAdd;
            }
            // Distribute any remaining slots to toolsets with the most tools
            while (remainingSlots > 0) {
                for (const { toolsetKey } of proportions) {
                    if (remainingSlots <= 0) {
                        break;
                    }
                    allocation.set(toolsetKey, allocation.get(toolsetKey) + 1);
                    remainingSlots--;
                }
            }
        }
        return allocation;
    }
    /**
     * Process a single toolset based on allocated slots
     */
    async _processToolset(tools, allocatedSlots, token) {
        // If allocated slots >= tool count, return all tools individually
        if (allocatedSlots >= tools.length) {
            return tools;
        }
        // If only one slot allocated, return all tools in a single group with LLM-generated summary
        if (allocatedSlots === 1) {
            const groupDescriptions = await this._generateBulkGroupDescriptions([tools], token);
            const group = groupDescriptions.groups[0];
            return [new virtualTool_1.VirtualTool(virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX + group.name, SUMMARY_PREFIX + group.summary + SUMMARY_SUFFIX, 0, {}, group.tools)];
        }
        // Otherwise, use embedding-based grouping with the allocated slot limit
        return await this._generateEmbeddingBasedGroups(tools, allocatedSlots, token);
    }
    async _getPredictedTools(query, tools, token) {
        if (!query) {
            return [];
        }
        // compute the embeddings for the query
        const queryEmbedding = await this.embeddingsComputer.computeEmbeddings(preComputedToolEmbeddingsCache_1.EMBEDDING_TYPE_FOR_TOOL_GROUPING, [query], {}, new telemetryCorrelationId_1.TelemetryCorrelationId('VirtualToolGrouper::_getPredictedTools'), token);
        if (!queryEmbedding || queryEmbedding.values.length === 0) {
            return [];
        }
        const queryEmbeddingVector = queryEmbedding.values[0];
        // Filter out built-in tools. Only consider extension and MCP tools for similarity computation
        const nonBuiltInTools = tools.filter(tool => tool.source instanceof vscodeTypes_1.LanguageModelToolExtensionSource ||
            tool.source instanceof vscodeTypes_1.LanguageModelToolMCPSource);
        // Get the top 10 tool embeddings for the non-built-in tools
        const toolEmbeddings = await this._toolEmbeddingsComputer.retrieveSimilarEmbeddingsForAvailableTools(queryEmbeddingVector, nonBuiltInTools, 10, token);
        if (!toolEmbeddings) {
            return [];
        }
        // Filter the tools by the top 10 tool embeddings, maintaining order
        const toolNameToTool = new Map(tools.map(tool => [tool.name, tool]));
        const predictedTools = toolEmbeddings
            .map((toolName) => toolNameToTool.get(toolName))
            .filter((tool) => tool !== undefined);
        return predictedTools;
    }
    /**
     * Generate embedding-based groups for tools with a specific limit
     */
    async _generateEmbeddingBasedGroups(tools, limit, token) {
        if (tools.length <= Constant.MIN_TOOLSET_SIZE_TO_GROUP) {
            // If too few tools, return them as individual tools instead of creating groups
            return [];
        }
        let embeddingGroups = [];
        try {
            // Use the provided limit for embedding-based clustering
            embeddingGroups = await this._toolEmbeddingsComputer.computeToolGroupings(tools, limit, token);
            this._logService.trace(`[virtual-tools] Embedding-based grouping created ${embeddingGroups.length} groups from ${tools.length} tools`);
        }
        catch (e) {
            this._logService.error(`Failed to create embedding-based groups: ${e}`);
            // Let the error bubble up as requested - no fallback
            throw e;
        }
        const singles = embeddingGroups.filter(g => g.length === 1).map(g => g[0]);
        const grouped = embeddingGroups.filter(g => g.length > 1);
        // Generate descriptions for the groups using LLM in bulk
        const groupDescriptions = await this._generateBulkGroupDescriptions(grouped, token);
        this._logService.trace(`[virtual-tools] Embedding-based grouping created ${groupDescriptions.groups.length} groups from ${tools.length} tools`);
        return groupDescriptions.groups
            .map((v) => new virtualTool_1.VirtualTool(virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX + v.name, SUMMARY_PREFIX + v.summary + SUMMARY_SUFFIX, 0, {}, v.tools))
            .concat(singles);
    }
    /**
     * Generate descriptions for embedding-based tool groups using LLM in bulk
     */
    async _generateBulkGroupDescriptions(embeddingGroups, token) {
        const cached = await Promise.all(embeddingGroups.map(group => this._cache.getDescription(group)));
        const missing = [];
        const output = [];
        for (const entry of cached) {
            if (entry.category) {
                output.push(entry.category);
            }
            else {
                missing.push(entry);
            }
        }
        const endpoint = await this._endpointProvider.getChatEndpoint(CATEGORIZATION_ENDPOINT);
        const described = await (0, virtualToolSummarizer_1.describeBulkToolGroups)(endpoint, missing.map(m => m.tools), token);
        let missed = 0;
        for (let i = 0; i < described.length; i++) {
            const d = described[i];
            const m = missing[i];
            if (d) {
                m.update(d);
                output.push(d);
            }
            else {
                missed++;
                output.push({ name: `group_${i}`, summary: `Contains the tools: ${m.tools.map(t => t.name).join(', ')}`, tools: m.tools });
            }
        }
        return { groups: output, missed };
    }
};
exports.VirtualToolGrouper = VirtualToolGrouper;
exports.VirtualToolGrouper = VirtualToolGrouper = VirtualToolGrouper_1 = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, virtualToolTypes_1.IToolGroupingCache),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, logService_1.ILogService),
    __param(4, embeddingsComputer_1.IEmbeddingsComputer),
    __param(5, configurationService_1.IConfigurationService),
    __param(6, nullExperimentationService_1.IExperimentationService),
    __param(7, toolEmbeddingsComputer_1.IToolEmbeddingsComputer),
    __param(8, instantiation_1.IInstantiationService)
], VirtualToolGrouper);
//# sourceMappingURL=virtualToolGrouper.js.map