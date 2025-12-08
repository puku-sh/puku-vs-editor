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
const vitest_1 = require("vitest");
const configurationService_1 = require("../../../../../platform/configuration/common/configurationService");
const telemetry_1 = require("../../../../../platform/telemetry/common/telemetry");
const arrays_1 = require("../../../../../util/vs/base/common/arrays");
const cancellation_1 = require("../../../../../util/vs/base/common/cancellation");
const collections_1 = require("../../../../../util/vs/base/common/collections");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const services_1 = require("../../../../test/node/services");
const toolGrouping_1 = require("../../../common/virtualTools/toolGrouping");
const virtualTool_1 = require("../../../common/virtualTools/virtualTool");
const virtualToolsConstants_1 = require("../../../common/virtualTools/virtualToolsConstants");
(0, vitest_1.describe)('Virtual Tools - Grouping', () => {
    let accessor;
    let grouping;
    let mockGrouper;
    let TestToolGrouping = class TestToolGrouping extends toolGrouping_1.ToolGrouping {
        constructor(_tools, _instantiationService, _telemetryService) {
            super(_tools, _instantiationService, _telemetryService);
            this._grouper = mockGrouper;
        }
        // Expose protected member for testing
        get grouper() {
            return this._grouper;
        }
    };
    TestToolGrouping = __decorate([
        __param(1, instantiation_1.IInstantiationService),
        __param(2, telemetry_1.ITelemetryService)
    ], TestToolGrouping);
    function makeTool(name, tags = []) {
        return {
            name,
            description: `Tool for ${name}`,
            inputSchema: undefined,
            source: undefined,
            tags,
        };
    }
    function createGroupingGrouper() {
        return {
            recomputeEmbeddingRankings() {
                return Promise.resolve();
            },
            addGroups(query, root, tools, token) {
                const groups = (0, collections_1.groupBy)(tools, t => t.name.split('_')[0]);
                root.contents = [];
                for (const [groupName, groupTools] of Object.entries(groups)) {
                    if (groupTools.length < 3) {
                        root.contents.push(...groupTools);
                        continue;
                    }
                    const groupTool = new virtualTool_1.VirtualTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}${groupName}`, `Group of tools: ${groupName}`, 0, { wasExpandedByDefault: true });
                    groupTool.contents = groupTools;
                    root.contents.push(groupTool);
                }
                return Promise.resolve();
            },
        };
    }
    function createSimpleGrouper() {
        return {
            recomputeEmbeddingRankings: (query, root, token) => Promise.resolve(),
            addGroups(query, root, tools, token) {
                root.contents = [...tools];
                return Promise.resolve();
            },
        };
    }
    (0, vitest_1.beforeEach)(() => {
        const testingServiceCollection = (0, services_1.createExtensionUnitTestingServices)();
        accessor = testingServiceCollection.createTestingAccessor();
        mockGrouper = createSimpleGrouper();
        grouping = accessor.get(instantiation_1.IInstantiationService).createInstance(TestToolGrouping, []);
    });
    (0, vitest_1.afterEach)(() => {
        accessor.dispose();
    });
    (0, vitest_1.describe)('constructor and initialization', () => {
        (0, vitest_1.it)('should initialize with empty tools array', () => {
            (0, vitest_1.expect)(grouping.tools).toEqual([]);
        });
        (0, vitest_1.it)('should initialize with provided tools', () => {
            const tools = [makeTool('test1'), makeTool('test2')];
            const newGrouping = accessor.get(instantiation_1.IInstantiationService).createInstance(TestToolGrouping, tools);
            (0, vitest_1.expect)(newGrouping.tools).toEqual(tools);
        });
    });
    (0, vitest_1.describe)('tools property', () => {
        (0, vitest_1.it)('should get current tools', () => {
            const tools = [makeTool('test1'), makeTool('test2')];
            grouping.tools = tools;
            (0, vitest_1.expect)(grouping.tools).toEqual(tools);
        });
        (0, vitest_1.it)('should set new tools and mark as outdated when tools differ', () => {
            const initialTools = [makeTool('test1')];
            const newTools = [makeTool('test2')];
            grouping.tools = initialTools;
            grouping.tools = newTools;
            (0, vitest_1.expect)(grouping.tools).toEqual(newTools);
        });
        (0, vitest_1.it)('should not mark as outdated when setting identical tools', () => {
            const tools = [makeTool('test1'), makeTool('test2')];
            grouping.tools = tools;
            // Setting same tools should not trigger recompute
            grouping.tools = tools;
            (0, vitest_1.expect)(grouping.tools).toEqual(tools);
        });
        (0, vitest_1.it)('should detect tool differences by name', () => {
            const tools1 = [makeTool('test1')];
            const tools2 = [makeTool('test1')]; // Same name, different object
            grouping.tools = tools1;
            grouping.tools = tools2;
            // Should not be marked as outdated since names are the same
            (0, vitest_1.expect)(grouping.tools).toEqual(tools2);
        });
    });
    (0, vitest_1.describe)('compute()', () => {
        (0, vitest_1.it)('should return empty array for no tools', async () => {
            const result = await grouping.compute('', cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result).toEqual([]);
        });
        (0, vitest_1.it)('should return ungrouped tools when grouper adds them directly', async () => {
            const tools = [makeTool('test1'), makeTool('test2')];
            grouping.tools = tools;
            const result = await grouping.compute('', cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result).toEqual(tools);
        });
        (0, vitest_1.it)('should return virtual tool when tools are grouped', async () => {
            mockGrouper = createGroupingGrouper();
            grouping = accessor.get(instantiation_1.IInstantiationService).createInstance(TestToolGrouping, []);
            const tools = [
                makeTool('file_read'),
                makeTool('file_write'),
                makeTool('file_delete')
            ];
            grouping.tools = tools;
            const result = await grouping.compute('', cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0].name).toBe(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}file`);
            (0, vitest_1.expect)(result[0].description).toBe('Group of tools: file');
        });
        (0, vitest_1.it)('should handle mixed grouped and ungrouped tools', async () => {
            mockGrouper = createGroupingGrouper();
            grouping = accessor.get(instantiation_1.IInstantiationService).createInstance(TestToolGrouping, []);
            const tools = [
                makeTool('file_read'),
                makeTool('file_write'),
                makeTool('file_delete'),
                makeTool('single1'),
                makeTool('single2')
            ];
            grouping.tools = tools;
            const result = await grouping.compute('', cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result).toHaveLength(3); // 1 group + 2 singles
            const groupTool = result.find(t => t.name.startsWith(virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX));
            (0, vitest_1.expect)(groupTool).toBeDefined();
            (0, vitest_1.expect)(groupTool.name).toBe(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}file`);
            const singleTools = result.filter(t => !t.name.startsWith(virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX));
            (0, vitest_1.expect)(singleTools).toHaveLength(2);
            (0, vitest_1.expect)(singleTools.map(t => t.name)).toEqual(['single1', 'single2']);
        });
    });
    (0, vitest_1.describe)('computeAll()', () => {
        (0, vitest_1.it)('should return complete tree including virtual tools', async () => {
            mockGrouper = createGroupingGrouper();
            grouping = accessor.get(instantiation_1.IInstantiationService).createInstance(TestToolGrouping, []);
            const tools = [
                makeTool('file_read'),
                makeTool('file_write'),
                makeTool('file_delete')
            ];
            grouping.tools = tools;
            const result = await grouping.computeAll('', cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0]).toBeInstanceOf(virtualTool_1.VirtualTool);
            const virtualTool = result[0];
            (0, vitest_1.expect)(virtualTool.contents).toEqual(tools);
        });
    });
    (0, vitest_1.describe)('didCall()', () => {
        (0, vitest_1.it)('should return undefined for non-virtual tool calls', () => {
            const result = grouping.didCall(0, 'regular_tool');
            (0, vitest_1.expect)(result).toBeUndefined();
        });
        (0, vitest_1.it)('should expand virtual tool and return result when called', async () => {
            mockGrouper = createGroupingGrouper();
            grouping = accessor.get(instantiation_1.IInstantiationService).createInstance(TestToolGrouping, []);
            const tools = [
                makeTool('file_read'),
                makeTool('file_write'),
                makeTool('file_delete')
            ];
            grouping.tools = tools;
            // First compute to create the virtual tool
            await grouping.compute('', cancellation_1.CancellationToken.None);
            const result = grouping.didCall(0, `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}file`);
            (0, vitest_1.expect)(result).toBeDefined();
            // The constructor takes an array of parts, check that text is present
            const resultString = result?.content[0];
            (0, vitest_1.expect)(resultString.value).toMatchInlineSnapshot(`"Tools activated: file_read, file_write, file_delete"`);
        });
        (0, vitest_1.it)('should expand virtual tool and make its contents available in subsequent compute', async () => {
            mockGrouper = createGroupingGrouper();
            grouping = accessor.get(instantiation_1.IInstantiationService).createInstance(TestToolGrouping, []);
            const tools = [
                makeTool('file_read'),
                makeTool('file_write'),
                makeTool('file_delete')
            ];
            grouping.tools = tools;
            // First compute - should return virtual tool
            let result = await grouping.compute('', cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0].name).toBe(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}file`);
            // Call the virtual tool to expand it
            grouping.didCall(0, `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}file`);
            // Second compute - should now return the expanded tools
            result = await grouping.compute('', cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result).toEqual(tools);
        });
    });
    (0, vitest_1.describe)('re-collapsing behavior', () => {
        (0, vitest_1.it)('should re-collapse least recently used tools when exceeding TRIM_THRESHOLD after cache invalidation', async () => {
            mockGrouper = createGroupingGrouper();
            grouping = accessor.get(instantiation_1.IInstantiationService).createInstance(TestToolGrouping, []);
            // Create enough tools to exceed TRIM_THRESHOLD
            const toolGroups = [];
            const groupNumbers = [];
            for (let i = 0; i < configurationService_1.HARD_TOOL_LIMIT / 2; i++) {
                groupNumbers.push(i);
                toolGroups.push(makeTool(`group${i}_tool1`));
                toolGroups.push(makeTool(`group${i}_tool2`));
                toolGroups.push(makeTool(`group${i}_tool3`));
            }
            grouping.tools = toolGroups;
            (0, arrays_1.shuffle)(groupNumbers);
            // Initial compute - should create virtual tools for groups
            let result = await grouping.compute('', cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result.length).toBeLessThan(toolGroups.length); // Should be grouped
            // Expand some virtual tools by calling them at different turns
            // call and expand until we hit the first trim
            let i = 0;
            for (; i < groupNumbers.length && result.length < virtualToolsConstants_1.TRIM_THRESHOLD; i++) {
                grouping.didCall(0, `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}group${groupNumbers[i]}`);
                grouping.didTakeTurn();
                result = await grouping.compute('', cancellation_1.CancellationToken.None);
            }
            grouping.didInvalidateCache();
            result = await grouping.compute('', cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result.length).toBeLessThanOrEqual(virtualToolsConstants_1.TRIM_THRESHOLD);
            for (let k = i - 1; k > i - 3; k--) {
                (0, vitest_1.expect)(result.map(r => r.name)).toContain(`group${groupNumbers[k]}_tool1`);
            }
        });
        (0, vitest_1.it)('should prioritize keeping recently used tools when re-collapsing', async () => {
            mockGrouper = createGroupingGrouper();
            grouping = accessor.get(instantiation_1.IInstantiationService).createInstance(TestToolGrouping, []);
            // Create tools that will form groups
            const tools = [];
            for (let i = 0; i < 40; i++) {
                tools.push(makeTool(`group${i}_tool1`));
                tools.push(makeTool(`group${i}_tool2`));
                tools.push(makeTool(`group${i}_tool3`));
            }
            grouping.tools = tools;
            await grouping.compute('', cancellation_1.CancellationToken.None);
            // Expand tools in different order - later calls are more recent
            grouping.didCall(0, `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}group0`); // Oldest usage
            grouping.didTakeTurn();
            grouping.didCall(0, `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}group1`);
            grouping.didTakeTurn();
            grouping.didCall(0, `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}group2`); // Most recent usage
            grouping.didTakeTurn();
            // Force trimming
            grouping.didInvalidateCache();
            const result = await grouping.compute('', cancellation_1.CancellationToken.None);
            // group2 tools should still be expanded (most recent)
            // group0 tools should be collapsed first (least recent)
            const expandedTools = result.filter(tool => tool.name.includes('group2_tool') && !tool.name.startsWith(virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX));
            (0, vitest_1.expect)(expandedTools.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should handle multiple cache invalidations correctly', async () => {
            mockGrouper = createGroupingGrouper();
            grouping = accessor.get(instantiation_1.IInstantiationService).createInstance(TestToolGrouping, []);
            const tools = [];
            for (let i = 0; i < 40; i++) {
                tools.push(makeTool(`group${i}_tool1`));
                tools.push(makeTool(`group${i}_tool2`));
                tools.push(makeTool(`group${i}_tool3`));
            }
            grouping.tools = tools;
            await grouping.compute('', cancellation_1.CancellationToken.None);
            // Expand some tools
            grouping.didCall(0, `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}group0`);
            grouping.didCall(0, `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}group1`);
            grouping.didTakeTurn();
            // First cache invalidation
            grouping.didInvalidateCache();
            let result = await grouping.compute('', cancellation_1.CancellationToken.None);
            const firstTrimCount = result.length;
            (0, vitest_1.expect)(firstTrimCount).toBeLessThanOrEqual(virtualToolsConstants_1.TRIM_THRESHOLD);
            // Expand more tools
            grouping.didCall(0, `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}group2`);
            grouping.didCall(0, `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}group3`);
            grouping.didTakeTurn();
            // Second cache invalidation
            grouping.didInvalidateCache();
            result = await grouping.compute('', cancellation_1.CancellationToken.None);
            // Should still respect TRIM_THRESHOLD
            (0, vitest_1.expect)(result.length).toBeLessThanOrEqual(virtualToolsConstants_1.TRIM_THRESHOLD);
        });
        (0, vitest_1.it)('should stop trimming when no more virtual tools can be collapsed', async () => {
            mockGrouper = createSimpleGrouper(); // No grouping - all tools individual
            grouping = accessor.get(instantiation_1.IInstantiationService).createInstance(TestToolGrouping, []);
            // Create many individual tools (no groups)
            const tools = [];
            for (let i = 0; i < 150; i++) {
                tools.push(makeTool(`individual_tool_${i}`));
            }
            grouping.tools = tools;
            // Invalidate cache to trigger trimming
            grouping.didInvalidateCache();
            const result = await grouping.compute('', cancellation_1.CancellationToken.None);
            // Since there are no virtual tools to collapse, should keep all tools
            // even if exceeding TRIM_THRESHOLD
            (0, vitest_1.expect)(result.length).toBe(150);
        });
    });
    (0, vitest_1.describe)('cache invalidation integration', () => {
        (0, vitest_1.it)('should trigger recomputeEmbeddingRankings during cache invalidation', async () => {
            mockGrouper = createSimpleGrouper();
            grouping = accessor.get(instantiation_1.IInstantiationService).createInstance(TestToolGrouping, []);
            const spy = vitest_1.vi.spyOn(mockGrouper, 'recomputeEmbeddingRankings');
            const tools = [makeTool('test1'), makeTool('test2')];
            grouping.tools = tools;
            // Initial compute should not call recomputeEmbeddingRankings
            await grouping.compute('query', cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(spy).not.toHaveBeenCalled();
            // Cache invalidation should trigger recomputeEmbeddingRankings
            grouping.didInvalidateCache();
            await grouping.compute('query', cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(spy).toHaveBeenCalledWith('query', grouping['_root'], cancellation_1.CancellationToken.None);
        });
    });
    (0, vitest_1.describe)('canBeCollapsed metadata', () => {
        (0, vitest_1.it)('should respect canBeCollapsed=false during trimming', async () => {
            mockGrouper = {
                recomputeEmbeddingRankings() {
                    return Promise.resolve();
                },
                addGroups(query, root, tools, token) {
                    // Create some virtual tools with different canBeCollapsed settings
                    const collapsibleGroup = new virtualTool_1.VirtualTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}collapsible`, 'Collapsible group', 0, { canBeCollapsed: true, wasExpandedByDefault: true });
                    collapsibleGroup.contents = tools.slice(0, 2);
                    collapsibleGroup.isExpanded = true;
                    const nonCollapsibleGroup = new virtualTool_1.VirtualTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}noncollapsible`, 'Non-collapsible group', 0, { canBeCollapsed: false, wasExpandedByDefault: true });
                    nonCollapsibleGroup.contents = tools.slice(2, 4);
                    nonCollapsibleGroup.isExpanded = true;
                    root.contents = [collapsibleGroup, nonCollapsibleGroup, ...tools.slice(4)];
                    return Promise.resolve();
                },
            };
            grouping = accessor.get(instantiation_1.IInstantiationService).createInstance(TestToolGrouping, []);
            // Create many tools to trigger trimming
            const manyTools = [];
            for (let i = 0; i < virtualToolsConstants_1.TRIM_THRESHOLD + 10; i++) {
                manyTools.push(makeTool(`tool_${i}`));
            }
            grouping.tools = manyTools;
            // Initial compute
            await grouping.compute('', cancellation_1.CancellationToken.None);
            // Force trimming
            grouping.didInvalidateCache();
            await grouping.compute('', cancellation_1.CancellationToken.None);
            // Non-collapsible group should still be expanded
            const allResult = await grouping.computeAll('', cancellation_1.CancellationToken.None);
            const nonCollapsibleGroup = allResult.find(tool => tool instanceof virtualTool_1.VirtualTool && tool.name === `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}noncollapsible`);
            (0, vitest_1.expect)(nonCollapsibleGroup?.isExpanded).toBe(true);
            // Collapsible group may have been collapsed - just verify it exists
            const collapsibleGroup = allResult.find(tool => tool instanceof virtualTool_1.VirtualTool && tool.name === `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}collapsible`);
            (0, vitest_1.expect)(collapsibleGroup).toBeDefined();
        });
        (0, vitest_1.it)('should set lastUsedOnTurn to Infinity for non-collapsible tools during trimming attempts', async () => {
            mockGrouper = {
                recomputeEmbeddingRankings() {
                    return Promise.resolve();
                },
                addGroups(query, root, tools, token) {
                    const nonCollapsibleGroup = new virtualTool_1.VirtualTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}noncollapsible`, 'Non-collapsible group', 5, // Initial lastUsedOnTurn
                    { canBeCollapsed: false, wasExpandedByDefault: true });
                    nonCollapsibleGroup.contents = tools.slice(0, 3);
                    nonCollapsibleGroup.isExpanded = true;
                    root.contents = [nonCollapsibleGroup, ...tools.slice(3)];
                    return Promise.resolve();
                },
            };
            grouping = accessor.get(instantiation_1.IInstantiationService).createInstance(TestToolGrouping, []);
            // Create many tools to trigger trimming
            const manyTools = [];
            for (let i = 0; i < virtualToolsConstants_1.TRIM_THRESHOLD + 10; i++) {
                manyTools.push(makeTool(`tool_${i}`));
            }
            grouping.tools = manyTools;
            // Initial compute
            await grouping.compute('', cancellation_1.CancellationToken.None);
            // Force trimming
            grouping.didInvalidateCache();
            await grouping.compute('', cancellation_1.CancellationToken.None);
            // Check that non-collapsible tool's lastUsedOnTurn was set to Infinity
            const allResult = await grouping.computeAll('', cancellation_1.CancellationToken.None);
            const nonCollapsibleGroup = allResult.find(tool => tool instanceof virtualTool_1.VirtualTool && tool.name === `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}noncollapsible`);
            (0, vitest_1.expect)(nonCollapsibleGroup?.lastUsedOnTurn).toBe(Infinity);
            (0, vitest_1.expect)(nonCollapsibleGroup?.isExpanded).toBe(true);
        });
    });
    (0, vitest_1.describe)('tool limit handling', () => {
        (0, vitest_1.it)('should handle tool trimming when exceeding limits', async () => {
            mockGrouper = createGroupingGrouper();
            grouping = accessor.get(instantiation_1.IInstantiationService).createInstance(TestToolGrouping, []);
            // Create a large number of tools to test trimming behavior
            const manyTools = [];
            for (let i = 0; i < 10; i++) {
                for (let k = 0; k < 20; k++) {
                    manyTools.push(makeTool(`cat${i}_tool_${k}`));
                }
            }
            grouping.tools = manyTools;
            const result = await grouping.compute('', cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result.length).toBeLessThanOrEqual(configurationService_1.HARD_TOOL_LIMIT);
            for (let i = 0; i < 10; i++) {
                grouping.didCall(0, `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}cat${i}`);
            }
            (0, vitest_1.expect)(result.length).toBeLessThanOrEqual(configurationService_1.HARD_TOOL_LIMIT);
        });
    });
});
//# sourceMappingURL=virtualToolGrouping.spec.js.map