"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_NODE = void 0;
exports.createRenderNode = createRenderNode;
exports.rectifiedValue = rectifiedValue;
exports.rectifyWeights = rectifyWeights;
exports.render = render;
exports.snapshot = snapshot;
const priorityQueue_1 = require("../../util/priorityQueue");
const utils_1 = require("./utils");
function createRenderNode(partial) {
    const node = {
        id: partial.id ?? (0, utils_1.getAvailableNodeId)(),
        text: partial.text ?? new Array((partial.children?.length ?? 0) + 1).fill(''),
        children: partial.children ?? [],
        cost: partial.cost ?? 1,
        weight: partial.weight ?? 0,
        rectifiedWeight: partial.rectifiedWeight,
        canMerge: partial.canMerge ?? false,
        elisionMarker: partial.elisionMarker ?? utils_1.DEFAULT_ELISION_MARKER,
        requireRenderedChild: partial.requireRenderedChild ?? false,
    };
    if (node.text.length !== node.children.length + 1) {
        throw new Error(`RenderNode text length (${node.text.length}) must be children length + 1 (${node.children.length + 1})`);
    }
    return node;
}
function isRenderedChildRequired(node) {
    return node.requireRenderedChild || (node.rectifiedWeight ?? node.weight) > node.weight;
}
function rectifiedValue(node) {
    return (node.rectifiedWeight ?? node.weight) / Math.max(node.cost, 1);
}
/**
 * Assign weights to nodes, while recursively minimally redistributing weights from children to ancestors
 * so that the rectified value (rectifiedWeight / cost) of each node is no greater than the value of its parent.
 * If no `weighter` is specified, uses the existing node weights a just redistributes from children to ancestors.
 */
function rectifyWeights(node, weighter) {
    const rectificationQueue = recursivelyRectifyWeights(node, weighter);
    for (const { item, priority } of rectificationQueue.clear()) {
        for (const node of item.nodes) {
            node.rectifiedWeight = priority * Math.max(node.cost, 1);
        }
    }
}
function recursivelyRectifyWeights(node, weighter) {
    const childQueues = node.children.map(child => recursivelyRectifyWeights(child, weighter));
    node.weight = Math.max(0, weighter ? weighter(node) : node.weight);
    if (node.weight === 0 && childQueues.reduce((sum, q) => sum + q.size, 0) === 0) {
        return new priorityQueue_1.PriorityQueue([]);
    }
    const merged = new priorityQueue_1.PriorityQueue(childQueues.flatMap(queue => queue.clear()));
    const group = {
        nodes: [node],
        totalCost: node.cost,
        totalWeight: node.weight,
    };
    // Combine with descendants until the combined average value is greater than or equal to the next item in the queue
    while ((merged.peek()?.priority ?? 0) > group.totalWeight / Math.max(group.totalCost, 1)) {
        const { item } = merged.pop();
        group.nodes.push(...item.nodes);
        group.totalCost += item.totalCost;
        group.totalWeight += item.totalWeight;
    }
    merged.insert(group, group.totalWeight / Math.max(group.totalCost, 1));
    return merged;
}
/**
 * Recursively render this node and its children
 *
 * @return An object containing the rendered text and its cost, which will either be the length of the text
 * or the result of the cost function if provided.
 */
function render(node, options = {}) {
    const { budget, mask, costFunction } = options;
    const exclude = mask ?? [];
    const exclusionSet = new Set(Array.isArray(exclude) ? exclude : [exclude]);
    if ((budget ?? node.cost) < node.cost || exclusionSet.has(node.id)) {
        return {
            text: node.elisionMarker,
            cost: costFunction ? costFunction(node.elisionMarker) : node.elisionMarker.length,
            renderedNodes: new Map(),
        };
    }
    if (budget === undefined) {
        // just elide any excluded nodes (and their descendants)
        const elider = (node) => exclusionSet.has(node.id);
        const renderParts = [];
        const renderedNodes = new Map();
        recursivelyRender(node, renderParts, elider, renderedNodes);
        if (renderParts.length === 0) {
            return renderEmpty(node, costFunction);
        }
        const text = renderParts.join('');
        const cost = costFunction
            ? costFunction(text)
            : [...renderedNodes.values()].reduce((sum, n) => sum + n.cost, 0);
        return { text, cost, renderedNodes };
    }
    // Elide nodes that are not in the rendered set
    let targetNodes = new Map();
    // With the additional cost function, we keep track of the order in which we select nodes for rendering
    // This is used to remove nodes that are marginally valuable if the final true cost exceeds the budget
    const marginalNodes = [];
    // Include highest-value non-excluded nodes up to the budget
    const explorationQueue = new priorityQueue_1.PriorityQueue([{ item: node, priority: rectifiedValue(node) }]);
    let remainingBudget = budget;
    while (remainingBudget > 0 && explorationQueue.size > 0) {
        const { item } = explorationQueue.pop();
        if (exclusionSet.has(item.id)) {
            continue;
        }
        if (item.cost <= remainingBudget) {
            remainingBudget -= item.cost;
            targetNodes.set(item.id, item);
            marginalNodes.push(item);
            // Add children to the queue, prioritizing those with higher value
            for (const child of item.children) {
                explorationQueue.insert(child, rectifiedValue(child));
            }
        }
    }
    // We have a rendering plan that is projected to be within budget, but actual cost of the combined text may differ
    // If we have a cost function, we may still need to iteratively remove nodes until the true cost is within budget
    while (targetNodes.size > 0) {
        const renderParts = [];
        const elider = (node) => !targetNodes.has(node.id);
        // `renderedNodes` will be a subset of `targetNodes`; some additional nodes may be elided due to
        // the requirement to render at least one child
        const renderedNodes = new Map();
        recursivelyRender(node, renderParts, elider, renderedNodes);
        if (renderParts.length === 0) {
            // If we didn't render anything, we can return the elision marker
            return renderEmpty(node, costFunction);
        }
        const text = renderParts.join('');
        if (costFunction === undefined) {
            // Within budget by construction
            const cost = [...renderedNodes.values()].reduce((sum, n) => sum + n.cost, 0);
            return { text, cost, renderedNodes };
        }
        let cost = costFunction(text);
        if (cost <= budget) {
            // If the cost of the rendered text is within budget, return it
            return { text, cost, renderedNodes };
        }
        // Otherwise, we will elide additional nodes and try again
        targetNodes = renderedNodes;
        while (marginalNodes.length > 0 && cost > budget) {
            const node = marginalNodes.pop();
            if (targetNodes.has(node.id)) {
                cost -= node.cost; // Use nodewise cost to *estimate* change in overall cost
                targetNodes.delete(node.id);
            } // Otherwise, we didn't render it because of requireRenderedChild
        }
        if (marginalNodes.length === 0) {
            // infeasible budget
            break;
        }
    }
    return renderEmpty(node, costFunction);
}
function renderEmpty(node, costFunction) {
    return {
        text: node.elisionMarker,
        cost: costFunction ? costFunction(node.elisionMarker) : node.elisionMarker.length,
        renderedNodes: new Map(),
    };
}
function recursivelyRender(node, parts, elider, renderedNodes, mergeElision = false) {
    const numParts = parts.length;
    if (elider(node)) {
        if (numParts >= 2) {
            if (mergeElision ||
                (parts[numParts - 2] === node.elisionMarker && parts[numParts - 1].trim().length === 0)) {
                parts.pop(); // elide by removing separator from previous elision
                return false;
            }
        }
        parts.push(node.elisionMarker);
        return false;
    }
    // Combine text fragments and rendered children
    let requiresChild = isRenderedChildRequired(node);
    let didRender = true;
    for (const [i, child] of node.children.entries()) {
        parts.push(node.text[i] ?? '');
        didRender = recursivelyRender(child, parts, elider, renderedNodes, child.canMerge && !didRender);
        requiresChild &&= !didRender;
    }
    if (requiresChild) {
        // We did not render any child, but are required to render one
        // Revert `parts` to its state before this node's text fragments
        while (parts.length > numParts) {
            parts.pop();
        }
        return false;
    }
    // Finish rendering this node with the last text fragment
    parts.push(node.text[node.text.length - 1] ?? '');
    renderedNodes.set(node.id, node);
    return true;
}
/**
 * Freeze a tree of virtual nodes into RenderNodes, using a given cost function and elision marker.
 *
 * Optionally, make use a cache (such as an LRUCacheMap) mapping IDs to RenderNodes. When we encounter a cached ID,
 * we return the cached RenderNode without recursing further. For this to behave as expected, the IVirtualNodes
 * *must* change their ID whenever their subtree changes.
 */
function snapshot(node, costFunction, elisionMarker = utils_1.DEFAULT_ELISION_MARKER) {
    const children = node.children.map(child => snapshot(child, costFunction, elisionMarker));
    elisionMarker = node.elisionMarker ?? elisionMarker;
    const cost = costFunction(node);
    const renderNode = createRenderNode({
        ...node,
        children,
        cost,
        weight: 0,
        elisionMarker: node.elisionMarker ?? elisionMarker,
    });
    return renderNode;
}
exports.EMPTY_NODE = {
    id: (0, utils_1.getAvailableNodeId)(),
    text: [''],
    children: [],
    cost: 0,
    weight: 0,
    elisionMarker: '',
    canMerge: true,
    requireRenderedChild: false,
};
//# sourceMappingURL=renderNode.js.map