"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConcatenatedContextComponent = exports.TraitComponent = exports.BasicPrefixComponent = void 0;
exports.renderWithMetadata = renderWithMetadata;
const tokenization_1 = require("../../../../prompt/src/tokenization");
const cache_1 = require("../../helpers/cache");
const map_1 = require("../../util/map");
const renderNode_1 = require("../render/renderNode");
const utils_1 = require("../render/utils");
/* How many lines of prefix/suffix should have cached token costs */
const NUM_CACHED_LINE_COSTS = 20_000;
let renderId = 0; // Unique across all render calls, used for telemetry
const renderCache = new cache_1.LRUCacheMap();
function renderWithMetadata(component, budget, options, context) {
    renderId++;
    const tokenizerName = options.promptOpts?.tokenizer ?? tokenization_1.TokenizerName.o200k;
    const start = performance.now();
    const { root, mask, statistics } = component.snapshot(options, context);
    const renderEnd = performance.now();
    const maskSet = new Set(mask);
    const cachedRender = renderCache?.get(root.id);
    let renderedText;
    if (cachedRender &&
        cachedRender.budget >= budget &&
        cachedRender.render.cost <= budget &&
        cachedRender.tokenizer === tokenizerName &&
        maskSet.size === cachedRender.mask.size &&
        [...maskSet].every(id => cachedRender.mask.has(id))) {
        // If we have a cached render, use it if we expect the same result
        // (identical masks and tokenizer, cost within budget, and previous budget at least as large as current budget)
        renderedText = cachedRender.render;
    }
    else {
        // Otherwise, render the node
        const tokenizer = (0, tokenization_1.getTokenizer)(tokenizerName);
        const costFunction = (text) => tokenizer.tokenLength(text);
        renderedText = (0, renderNode_1.render)(root, { budget, mask, costFunction });
        renderCache.set(root.id, {
            budget,
            mask: maskSet,
            tokenizer: tokenizerName,
            render: renderedText,
        });
    }
    const { text, cost, renderedNodes } = renderedText;
    const elisionEnd = performance.now();
    for (const [id, stat] of statistics?.entries() ?? []) {
        // Note that we are currently only recording the cost of the node itself, not the costs of its children.
        // This is enough for existing telemetry, since we put CodeSnippets and Traits in their own nodes.
        stat.actualTokens = renderedNodes.get(id)?.cost ?? 0;
    }
    const metadata = {
        renderId: renderId,
        rendererName: 'renderNode',
        tokenizer: tokenizerName,
        elisionTimeMs: elisionEnd - renderEnd,
        renderTimeMs: renderEnd - start,
        updateDataTimeMs: 0,
        componentStatistics: [{ componentPath: component.name, actualTokens: cost }],
    };
    return { root, renderedNodes, text, cost, metadata };
}
function cachedLineCostFunction(tokenizer, cache) {
    return (node) => {
        const key = node.text.join('') + '\n';
        // since actual token costs aren't known until we concatenate the lines,
        // we slightly overestimate the cost to increase likelihood of respecting budget on first try
        return (0, map_1.setDefault)(cache, key, () => tokenizer.tokenLength(key) + 1);
    };
}
function getLinewiseNode(raw, costFunction, reversed) {
    const lines = raw.split('\n');
    const children = lines.map(line => ({ id: (0, utils_1.getAvailableNodeId)(), text: [line], children: [], canMerge: true }));
    const seps = [''];
    if (children.length >= 1) {
        seps.push(...Array(children.length - 1).fill('\n'), '');
    }
    const virtualNode = { id: (0, utils_1.getAvailableNodeId)(), text: seps, children, canMerge: true };
    // Don't include elision marker in node cost, since there will be at most one such marker
    const nodeCostFunction = (node) => (node.id === virtualNode.id ? 0 : costFunction(node));
    const root = (0, renderNode_1.snapshot)(virtualNode, nodeCostFunction);
    // Weight lines so that each line is has less value than the following one
    // (Or more value, if reversed)
    let valueTarget = reversed ? children.length : 1;
    for (const child of root.children) {
        child.weight = valueTarget * Math.max(1, child.cost);
        valueTarget += reversed ? -1 : 1;
    }
    return root;
}
class BasicPrefixComponent {
    constructor() {
        this.name = 'basicPrefix';
        this.costCache = new cache_1.LRUCacheMap(NUM_CACHED_LINE_COSTS);
    }
    snapshot(options) {
        const { completionState, promptOpts } = options;
        const rawPrefix = completionState.textDocument.getText({
            start: { line: 0, character: 0 },
            end: completionState.position,
        });
        const tokenizer = (0, tokenization_1.getTokenizer)(promptOpts?.tokenizer);
        const costFunction = cachedLineCostFunction(tokenizer, this.costCache);
        const root = getLinewiseNode(rawPrefix, costFunction, false);
        return { root };
    }
}
exports.BasicPrefixComponent = BasicPrefixComponent;
class TraitComponent {
    constructor() {
        this.name = 'traitProvider';
    }
    snapshot(options, context) {
        const { promptOpts } = options;
        const tokenizer = (0, tokenization_1.getTokenizer)(promptOpts?.tokenizer);
        if (!context || context.traits.length === 0) {
            return { root: renderNode_1.EMPTY_NODE };
        }
        const weights = new Map();
        let totalWeight = 0;
        const children = [];
        const statistics = new Map();
        for (const trait of context.traits) {
            const id = (0, utils_1.getAvailableNodeId)();
            const text = `${trait.name}: ${trait.value}`;
            const child = {
                id,
                text: [text],
                children: [],
                cost: tokenizer.tokenLength(text),
                weight: 0,
                elisionMarker: '',
                canMerge: true,
                requireRenderedChild: true,
            };
            children.push(child);
            statistics.set(id, {
                componentPath: trait.id,
                source: trait,
                expectedTokens: child.cost,
            });
            weights.set(id, trait.importance ?? 0);
            totalWeight += trait.importance ?? 0;
        }
        totalWeight = Math.max(totalWeight, 1);
        const header = `Related context:\n`;
        const text = [header, ...new Array(children.length).fill('\n')];
        const root = {
            id: (0, utils_1.getAvailableNodeId)(),
            text,
            children,
            cost: 0,
            weight: 0,
            elisionMarker: '',
            canMerge: true,
            requireRenderedChild: true,
        };
        (0, renderNode_1.rectifyWeights)(root, node => (weights.get(node.id) ?? 0) / totalWeight);
        return { root, statistics };
    }
}
exports.TraitComponent = TraitComponent;
class ConcatenatedContextComponent {
    constructor(name, components) {
        this.name = name;
        this.components = components;
    }
    snapshot(options, context) {
        const snapshots = this.components.map(component => component.snapshot(options, context));
        const children = snapshots.map(s => s.root).filter(n => n.id !== renderNode_1.EMPTY_NODE.id);
        if (children.length === 0) {
            return { root: renderNode_1.EMPTY_NODE };
        }
        const text = ['', ...Array(children.length - 1).fill('\n'), ''];
        const root = {
            id: (0, utils_1.getAvailableNodeId)(),
            text,
            children,
            cost: 0,
            weight: 0,
            elisionMarker: '',
            canMerge: true,
            requireRenderedChild: false,
        };
        const mask = [];
        const statistics = new Map();
        for (const s of snapshots) {
            for (const [id, stat] of s.statistics?.entries() ?? []) {
                statistics.set(id, stat);
            }
            if (s.mask) {
                mask.push(...s.mask);
            }
        }
        return { root, mask, statistics };
    }
}
exports.ConcatenatedContextComponent = ConcatenatedContextComponent;
//# sourceMappingURL=virtualComponent.js.map