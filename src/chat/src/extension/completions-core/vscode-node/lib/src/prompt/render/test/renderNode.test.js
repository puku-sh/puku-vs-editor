"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const renderNode_1 = require("../renderNode");
const utils_1 = require("../utils");
suite('RenderNode', function () {
    test('constructs node without children', function () {
        const node = (0, renderNode_1.createRenderNode)({ text: ['a'], cost: 0, weight: 5 });
        assert_1.default.deepEqual(node.text, ['a']);
        assert_1.default.deepEqual(node.children, []);
        assert_1.default.deepStrictEqual(node.cost, 0);
        assert_1.default.deepStrictEqual(node.weight, 5);
        assert_1.default.deepStrictEqual(node.elisionMarker, utils_1.DEFAULT_ELISION_MARKER);
    });
    test('constructs node with children', function () {
        const child = (0, renderNode_1.createRenderNode)({ text: ['c'], cost: 1, weight: 3 });
        const node = (0, renderNode_1.createRenderNode)({ text: ['a', 'b'], children: [child], cost: 2, weight: 5 });
        assert_1.default.deepEqual(node.children.length, 1);
    });
    test('should check that text is children + 1', function () {
        assert_1.default.throws(() => (0, renderNode_1.createRenderNode)({ text: ['a', 'b'], children: [], cost: 2, weight: 5 }));
    });
    test('renders all nodes without budget', function () {
        const child = (0, renderNode_1.createRenderNode)({ text: ['b'], cost: 1, weight: 2 });
        const node = (0, renderNode_1.createRenderNode)({ text: ['a', 'c'], children: [child], cost: 2, weight: 5 });
        const result = (0, renderNode_1.render)(node);
        assert_1.default.deepStrictEqual(result.text, 'abc');
        assert_1.default.deepStrictEqual(result.cost, 3);
    });
    test('renders with budget, elides child if over budget', function () {
        const child = (0, renderNode_1.createRenderNode)({ text: ['bb'], cost: 2, weight: 2 });
        const node = (0, renderNode_1.createRenderNode)({ text: ['aa', 'cc'], children: [child], cost: 4, weight: 5 });
        // Budget only enough for parent
        const result = (0, renderNode_1.render)(node, { budget: 5 });
        assert_1.default.deepStrictEqual(result.text, `aa${child.elisionMarker}cc`);
        assert_1.default.deepStrictEqual(result.cost, 4);
    });
    test('renders with exclude', function () {
        const child = (0, renderNode_1.createRenderNode)({ text: ['bb'], cost: 2, weight: 2 });
        const node = (0, renderNode_1.createRenderNode)({ text: ['aa', 'cc'], children: [child], cost: 4, weight: 5 });
        assert_1.default.deepStrictEqual((0, renderNode_1.render)(node, { mask: node.id }).text, node.elisionMarker);
        assert_1.default.deepStrictEqual((0, renderNode_1.render)(node, { mask: child.id }).text, `aa${child.elisionMarker}cc`);
    });
    test('canMerge merges adjacent elided children into a single elision marker', function () {
        // Create child nodes, some of which will be excluded (elided)
        const child1 = (0, renderNode_1.createRenderNode)({ text: ['A'], cost: 1, weight: 1 });
        const child2 = (0, renderNode_1.createRenderNode)({ text: ['B'], cost: 1, weight: 1 });
        const child2Merge = (0, renderNode_1.createRenderNode)({ text: ['B'], cost: 1, weight: 1, canMerge: true });
        const child3 = (0, renderNode_1.createRenderNode)({ text: ['C'], cost: 1, weight: 1 });
        const nodeWithoutMerge = (0, renderNode_1.createRenderNode)({
            text: ['(', ',', ',', ')'],
            children: [child1, child2, child3],
            cost: 1,
            weight: 1,
        });
        const nodeWithMerge = (0, renderNode_1.createRenderNode)({
            text: ['(', ',', ',', ')'],
            children: [child1, child2Merge, child3],
            cost: 1,
            weight: 1,
        });
        assert_1.default.deepStrictEqual((0, renderNode_1.render)(nodeWithoutMerge, { mask: [child1.id, child2.id] }).text, '([...],[...],C)');
        assert_1.default.deepStrictEqual((0, renderNode_1.render)(nodeWithMerge, { mask: [child1.id, child2Merge.id] }).text, '([...],C)');
    });
    test('renders with multiple children, one over budget', function () {
        const child1 = (0, renderNode_1.createRenderNode)({ text: ['bb'], cost: 2, weight: 3 });
        const child2 = (0, renderNode_1.createRenderNode)({ text: ['dd'], cost: 2, weight: 2 });
        const node = (0, renderNode_1.createRenderNode)({ text: ['aa', 'cc', 'ee'], children: [child1, child2], cost: 6, weight: 6 });
        // Budget only enough for parent and one child
        assert_1.default.deepStrictEqual((0, renderNode_1.render)(node, { budget: 8 }).text, `aabbcc${child2.elisionMarker}ee`);
    });
    test('renders with custom costFunction', function () {
        // Use a custom elision marker since it's now counted in the cost
        const child1 = (0, renderNode_1.createRenderNode)({ text: ['bb'], cost: 2, weight: 2, elisionMarker: '.' });
        const child2 = (0, renderNode_1.createRenderNode)({ text: ['dd'], cost: 2, weight: 3, elisionMarker: '.' });
        const node = (0, renderNode_1.createRenderNode)({
            text: ['aa', 'cc', 'ee'],
            children: [child1, child2],
            cost: 6,
            weight: 6,
            elisionMarker: '.',
        });
        // The second child doesn't fit anymore, since now the cost is based on length
        // and so the markers also have a cost.
        assert_1.default.deepStrictEqual((0, renderNode_1.render)(node, { budget: 8, costFunction: t => t.length }).text, 'aa.cc.ee');
    });
    test('infeasible budget returns elision marker', function () {
        const node = (0, renderNode_1.createRenderNode)({ text: ['aa'], cost: 2, weight: 5 });
        const result = (0, renderNode_1.render)(node, { budget: 1 });
        assert_1.default.deepStrictEqual(result.text, node.elisionMarker);
        assert_1.default.deepStrictEqual(result.cost, 5);
    });
    test('redistributes weights (default weighter)', function () {
        const child1 = (0, renderNode_1.createRenderNode)({ text: ['d'], cost: 1, weight: 5 });
        const child2 = (0, renderNode_1.createRenderNode)({ text: ['e'], cost: 1, weight: 5 });
        const root = (0, renderNode_1.createRenderNode)({ text: ['a', 'b', 'c'], children: [child1, child2], cost: 3, weight: 2 });
        (0, renderNode_1.rectifyWeights)(root);
        assert_1.default.ok(root.children.every(child => (0, renderNode_1.rectifiedValue)(child) <= (0, renderNode_1.rectifiedValue)(root)));
    });
    test('requireRenderedChild after redestributing weight', function () {
        const child1 = (0, renderNode_1.createRenderNode)({ text: ['d'], cost: 1, weight: 5 });
        const child2 = (0, renderNode_1.createRenderNode)({ text: ['e'], cost: 1, weight: 5 });
        const root = (0, renderNode_1.createRenderNode)({ text: ['a', 'b', 'c'], children: [child1, child2], cost: 3, weight: 2 });
        assert_1.default.deepStrictEqual((0, renderNode_1.render)(root, { budget: 3 }).text, 'a[...]b[...]c');
        (0, renderNode_1.rectifyWeights)(root);
        assert_1.default.deepStrictEqual((0, renderNode_1.render)(root, { budget: 3 }).text, '[...]');
    });
});
//# sourceMappingURL=renderNode.test.js.map