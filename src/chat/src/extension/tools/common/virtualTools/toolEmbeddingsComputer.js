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
exports.ToolEmbeddingsComputer = exports.IToolEmbeddingsComputer = void 0;
const embeddingsComputer_1 = require("../../../../platform/embeddings/common/embeddingsComputer");
const embeddingsGrouper_1 = require("../../../../platform/embeddings/common/embeddingsGrouper");
const logService_1 = require("../../../../platform/log/common/logService");
const services_1 = require("../../../../util/common/services");
const telemetryCorrelationId_1 = require("../../../../util/common/telemetryCorrelationId");
const lazy_1 = require("../../../../util/vs/base/common/lazy");
const stopwatch_1 = require("../../../../util/vs/base/common/stopwatch");
const types_1 = require("../../../../util/vs/base/common/types");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const preComputedToolEmbeddingsCache_1 = require("./preComputedToolEmbeddingsCache");
const toolEmbeddingsLocalCache_1 = require("./toolEmbeddingsLocalCache");
const virtualToolsConstants_1 = require("./virtualToolsConstants");
exports.IToolEmbeddingsComputer = (0, services_1.createServiceIdentifier)('IToolEmbeddingsComputer');
/**
 * Manages tool embeddings from both pre-computed cache and runtime computation
 */
let ToolEmbeddingsComputer = class ToolEmbeddingsComputer {
    constructor(_embeddingsComputer, _logService, instantiationService) {
        this._embeddingsComputer = _embeddingsComputer;
        this._logService = _logService;
        this.embeddingsStore = new Map();
        this._initialized = new lazy_1.Lazy(() => this.ensureInitialized());
        const { caches, embeddingType } = this.getCaches(instantiationService);
        this._caches = caches;
        this._embeddingType = embeddingType;
    }
    getCaches(instantiationService) {
        const precomputed = instantiationService.createInstance(preComputedToolEmbeddingsCache_1.PreComputedToolEmbeddingsCache);
        const embeddingType = precomputed.embeddingType;
        return {
            embeddingType,
            caches: [
                precomputed,
                instantiationService.createInstance(toolEmbeddingsLocalCache_1.ToolEmbeddingLocalCache, embeddingType),
            ],
        };
    }
    /**
     * Legacy method name for backward compatibility
     */
    async retrieveSimilarEmbeddingsForAvailableTools(queryEmbedding, availableToolNames, count, token) {
        await this._initialized.value;
        if (token.isCancellationRequested) {
            return [];
        }
        const availableEmbeddings = await this.getAvailableToolEmbeddings(availableToolNames, token);
        if (availableEmbeddings.length === 0) {
            return [];
        }
        const rankedEmbeddings = this.rankEmbeddings(queryEmbedding, availableEmbeddings, count);
        const matched = rankedEmbeddings.map(x => x.value);
        this._logService.trace(`[virtual-tools] Matched ${JSON.stringify(matched)} against the query.`);
        return matched;
    }
    rankEmbeddings(queryEmbedding, availableEmbeddings, count) {
        return (0, embeddingsComputer_1.rankEmbeddings)(queryEmbedding, availableEmbeddings, count);
    }
    /**
     * Ensures pre-computed embeddings are loaded into the store
     */
    async ensureInitialized() {
        await Promise.all(this._caches.map(c => c.initialize()));
    }
    /**
     * Computes embeddings for missing tools and stores them
     */
    computeMissingEmbeddings(missingTools, token) {
        if (token.isCancellationRequested || missingTools.length === 0) {
            return;
        }
        const computedEmbeddings = this.computeEmbeddingsForTools(missingTools, token).catch(e => {
            this._logService.error('Failed to compute embeddings for tools', e);
            return undefined;
        });
        for (const tool of missingTools) {
            const promise = computedEmbeddings.then(async (c) => {
                const found = c?.find(([name]) => name === tool.name)?.[1];
                if (found === undefined) {
                    this.embeddingsStore.delete(tool.name);
                }
                else {
                    for (const cache of this._caches) {
                        cache.set(tool, found);
                    }
                }
                return found;
            });
            this.embeddingsStore.set(tool.name, promise);
        }
    }
    /**
     * Computes embeddings for a list of tool names
     */
    async computeEmbeddingsForTools(tools, token) {
        if (token.isCancellationRequested) {
            return undefined;
        }
        const toolNames = tools.map(t => t.name + '\n\n' + t.description);
        const start = new stopwatch_1.StopWatch();
        const embeddings = await this._embeddingsComputer.computeEmbeddings(this._embeddingType, toolNames, {}, new telemetryCorrelationId_1.TelemetryCorrelationId('ToolEmbeddingsComputer::computeEmbeddingsForTools'), token);
        this._logService.trace(`[virtual-tools] Computed embeddings for ${toolNames.length} tools in ${start.elapsed()}ms`);
        if (embeddings?.values.length === 0 || embeddings?.values.length !== toolNames.length) {
            return undefined;
        }
        return toolNames.map((name, index) => [tools[index].name, embeddings.values[index]]);
    }
    /**
     * Gets embeddings for available tools as an array suitable for ranking
     */
    async getAvailableToolEmbeddings(tools, token) {
        const fromCaches = new Map(tools.map(t => {
            for (const cache of this._caches) {
                const embedding = cache.get(t);
                if (embedding) {
                    return [t.name, embedding];
                }
            }
        }).filter(types_1.isDefined));
        const missingTools = tools.filter(t => !this.embeddingsStore.has(t.name) && !fromCaches.has(t.name));
        this.computeMissingEmbeddings(missingTools, token);
        const result = [];
        for (const { name } of tools) {
            if (token.isCancellationRequested) {
                return result;
            }
            const cached = fromCaches.get(name);
            if (cached) {
                result.push([name, cached]);
                continue;
            }
            const embedding = await this.embeddingsStore.get(name);
            if (embedding) {
                result.push([name, embedding]);
            }
        }
        return result;
    }
    /**
     * Groups tools using embedding-based clustering to optimize for target cluster count
     */
    async computeToolGroupings(tools, limit, token) {
        await this._initialized.value;
        if (token.isCancellationRequested || tools.length === 0) {
            return [];
        }
        // Get embeddings for all tools
        const toolEmbeddings = await this.getAvailableToolEmbeddings(tools, token);
        if (toolEmbeddings.length === 0) {
            this._logService.trace('[virtual-tools] No embeddings available for tools, returning empty groups');
            return [];
        }
        // Create nodes for the EmbeddingsGrouper
        const nodes = [];
        const toolMap = new Map(tools.map(tool => [tool.name, tool]));
        for (const [toolName, embedding] of toolEmbeddings) {
            const tool = toolMap.get(toolName);
            if (tool) {
                nodes.push({
                    value: tool,
                    embedding
                });
            }
        }
        if (nodes.length === 0) {
            this._logService.trace('[virtual-tools] No valid nodes created for clustering');
            return [];
        }
        // Create EmbeddingsGrouper and add all nodes
        const grouper = new embeddingsGrouper_1.EmbeddingsGrouper();
        grouper.addNodes(nodes);
        // Optimize clustering to hit target cluster count
        // Target: average of 4 tools per group, but not more than the limit
        const targetClusters = Math.min(limit, Math.ceil(nodes.length / 4));
        if (targetClusters >= nodes.length) {
            // If we need as many clusters as tools, just return individual tools
            this._logService.trace(`[virtual-tools] Target clusters (${targetClusters}) >= tool count (${nodes.length}), returning individual tools`);
            return tools.map(tool => [tool]);
        }
        const tuneResult = grouper.tuneThresholdForTargetClusters(targetClusters);
        this._logService.trace(`[virtual-tools] Tuned clustering: ${tuneResult.clusterCount} clusters with threshold ${tuneResult.threshold} (percentile ${tuneResult.percentile})`);
        // Apply the optimized percentile and get clusters
        grouper.applyPercentileAndRecluster(tuneResult.percentile);
        const clusters = grouper.getClusters();
        // Convert clusters to tool arrays, filtering out small groups
        const groups = [];
        const singletons = [];
        for (const cluster of clusters) {
            const toolsInCluster = cluster.nodes.map(node => node.value);
            if (toolsInCluster.length >= virtualToolsConstants_1.MIN_TOOLSET_SIZE_TO_GROUP) {
                groups.push(toolsInCluster);
            }
            else {
                // Small groups become singletons unless expanding would exceed limit
                singletons.push(...toolsInCluster);
            }
        }
        // Check if adding singletons as individual groups would exceed limit
        const totalGroupsAndSingletons = groups.length + singletons.length;
        if (totalGroupsAndSingletons <= limit) {
            // We have room, add singletons as individual groups
            for (const singleton of singletons) {
                groups.push([singleton]);
            }
        }
        else {
            // Try to merge singletons into existing groups if possible
            // If we can't, keep them as individual groups up to the limit
            const remainingSlots = limit - groups.length;
            for (let i = 0; i < Math.min(singletons.length, remainingSlots); i++) {
                groups.push([singletons[i]]);
            }
            // Log if we had to drop some tools
            if (singletons.length > remainingSlots) {
                this._logService.warn(`[virtual-tools] Had to drop ${singletons.length - remainingSlots} tools due to limit constraints`);
            }
        }
        this._logService.trace(`[virtual-tools] Created ${groups.length} groups from ${tools.length} tools`);
        return groups;
    }
};
exports.ToolEmbeddingsComputer = ToolEmbeddingsComputer;
exports.ToolEmbeddingsComputer = ToolEmbeddingsComputer = __decorate([
    __param(0, embeddingsComputer_1.IEmbeddingsComputer),
    __param(1, logService_1.ILogService),
    __param(2, instantiation_1.IInstantiationService)
], ToolEmbeddingsComputer);
//# sourceMappingURL=toolEmbeddingsComputer.js.map