"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("assert"));
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const indentation_1 = require("../indentation");
const testHelpers_1 = require("./testHelpers");
function doParseTest(source, expectedTree) {
    const tree = (0, indentation_1.clearLabels)((0, indentation_1.parseTree)(source, 'python'));
    (0, testHelpers_1.compareTreeWithSpec)(tree, expectedTree);
}
const SOURCE = {
    source: (0, ts_dedent_1.default) `
f1:
    a1
f2:
    a2
    a3
`,
    name: '',
};
suite('Test compareTreeWithSpec', function () {
    const SOURCE_MISSING_CHILD = {
        source: (0, ts_dedent_1.default) `
f1:
    a1
f2:
    a2
`,
        name: 'missing child',
    };
    const SOURCE_EXTRA_CHILD = {
        source: (0, ts_dedent_1.default) `
f1:
    a1
f2:
    a2
    a3
    a4
`,
        name: 'extra_child',
    };
    const SOURCE_MISSING_SIBLING = {
        source: (0, ts_dedent_1.default) `
f1:
    a1
`,
        name: 'missing sibling',
    };
    const SOURCE_EXTRA_SIBLING = {
        source: (0, ts_dedent_1.default) `
f1:
    a1
f2:
    a2
    a3
f3:
    a4
`,
        name: 'extra_sibling',
    };
    const SOURCE_EXTRA_MIDDLE_BLANK_LINE = {
        source: (0, ts_dedent_1.default) `
f1:
    a1

f2:
    a2
    a3
`,
        name: 'extra middle blank line',
    };
    const SOURCE_EXTRA_TRAILING_BLANK_LINE = {
        source: (0, ts_dedent_1.default) `
f1:
    a1
f2:
    a2
    a3

`,
        name: 'extra trailing blank line',
    };
    const SOURCE_EXTRA_INDENTATION = {
        source: (0, ts_dedent_1.default) `
f1:
        a1
f2:
    a2
        a3
`,
        name: 'extra indentation',
    };
    const expected = (0, indentation_1.topNode)([
        (0, indentation_1.lineNode)(0, 0, 'f1:', [(0, indentation_1.lineNode)(4, 1, 'a1', [])]),
        (0, indentation_1.lineNode)(0, 2, 'f2:', [(0, indentation_1.lineNode)(4, 3, 'a2', []), (0, indentation_1.lineNode)(4, 4, 'a3', [])]),
    ]);
    test('Test compareTreeWithSpec with good input', function () {
        doParseTest(SOURCE.source, expected);
    });
    // Loop over all bad inputs where we expect a failure from compareTreeWithSpec
    for (const badInput of [
        SOURCE_MISSING_CHILD,
        SOURCE_EXTRA_CHILD,
        SOURCE_MISSING_SIBLING,
        SOURCE_EXTRA_SIBLING,
        SOURCE_EXTRA_INDENTATION,
        SOURCE_EXTRA_TRAILING_BLANK_LINE,
    ]) {
        test(`Test compareTreeWithSpec with bad input ${badInput.name}`, function () {
            assert.throws(() => doParseTest(badInput.source, expected), assert.AssertionError, `Expected to fail with ${JSON.stringify(badInput)}`);
        });
    }
    // Do we want extra blank lines to be children?
    test('Test compareTreeWithSpec with extra blank line input', function () {
        assert.throws(() => doParseTest(SOURCE_EXTRA_MIDDLE_BLANK_LINE.source, expected), assert.AssertionError, 'Expected to fail with extra blank line, actually fails with extra child');
    });
});
suite('Tree core functions: label manipulation', function () {
    function setOfLabels(tree) {
        const labels = new Set();
        (0, indentation_1.visitTree)(tree, node => {
            labels.add(node.label ?? 'undefined');
        }, 'topDown');
        return labels;
    }
    test('Remove labels from tree', function () {
        const tree = (0, indentation_1.parseTree)(SOURCE.source, 'python');
        setOfLabels(tree);
        (0, indentation_1.visitTree)(tree, node => {
            node.label = node.type === 'line' && node.lineNumber % 2 === 0 ? 'foo' : 'bar';
        }, 'topDown');
        setOfLabels(tree);
        assert.notDeepStrictEqual([...setOfLabels(tree)], ['undefined'], 'Tree never had labels');
        (0, indentation_1.clearLabels)(tree);
        assert.deepStrictEqual([...setOfLabels(tree)], ['undefined'], 'Tree still has labels');
    });
    test('Remove certain labels from tree', function () {
        const tree = (0, indentation_1.parseRaw)(SOURCE.source);
        (0, indentation_1.visitTree)(tree, node => {
            node.label = node.type === 'line' && node.lineNumber % 2 === 0 ? 'foo' : 'bar';
        }, 'topDown');
        assert.deepStrictEqual([...setOfLabels(tree)], ['bar', 'foo'], 'Did not prepare tree as expected');
        (0, indentation_1.clearLabelsIf)(tree, 
        // type predicate of form arg is 'bar':
        (arg) => arg === 'bar');
        assert.deepStrictEqual([...setOfLabels(tree)], ['undefined', 'foo'], 'Did not remove bar labels');
    });
    test('Test mapLabels', function () {
        const tree = (0, indentation_1.parseTree)(SOURCE.source + '\n\nprint("bye")', 'python');
        (0, indentation_1.visitTree)(tree, node => {
            node.label = node.type === 'line' && node.lineNumber % 2 === 0 ? 'foo' : 'bar';
        }, 'topDown');
        assert.deepStrictEqual([...setOfLabels(tree)], ['bar', 'foo'], 'Did not prepare tree as expected');
        const labelsBefore = (0, indentation_1.foldTree)(tree, [], (node, acc) => [...acc, node.label ?? ''], 'topDown');
        const mapfct = (label) => (label === 'foo' ? 1 : 2);
        const treeWithNumbers = (0, indentation_1.mapLabels)(tree, mapfct);
        const labelsAfter = (0, indentation_1.foldTree)(treeWithNumbers, [], (node, acc) => [...acc, node.label ?? ''], 'topDown');
        assert.deepStrictEqual([...setOfLabels(treeWithNumbers)], [2, 1], 'Did not map labels');
        assert.deepStrictEqual(labelsBefore.map(mapfct), labelsAfter, 'Did not map labels right');
    });
});
suite('Tree core functions: line numbers', function () {
    const tree = (0, indentation_1.parseTree)(SOURCE.source, 'python');
    test('First line of source tree is 0', function () {
        assert.strictEqual((0, indentation_1.firstLineOf)(tree), 0);
    });
    test('First line of source tree + two newlines is 2', function () {
        const offsetTree = (0, indentation_1.parseTree)(`\n\n${SOURCE.source}`, 'python');
        const originalTree = offsetTree.subs[2];
        assert.strictEqual((0, indentation_1.firstLineOf)(originalTree), 2);
    });
    test('Last line of source tree is 4', function () {
        assert.strictEqual((0, indentation_1.lastLineOf)(tree), 4);
    });
    test('firstLineOf', function () {
        const firstLine = (0, indentation_1.firstLineOf)((0, indentation_1.topNode)([(0, indentation_1.virtualNode)(0, []), (0, indentation_1.virtualNode)(0, [(0, indentation_1.lineNode)(0, 5, 'zero', [])]), (0, indentation_1.lineNode)(0, 6, 'one', [])]));
        assert.ok(firstLine !== undefined);
        assert.strictEqual(firstLine, 5);
    });
    test('firstLineOf undefined', function () {
        const firstLine = (0, indentation_1.firstLineOf)((0, indentation_1.topNode)([(0, indentation_1.virtualNode)(0, []), (0, indentation_1.virtualNode)(0, [(0, indentation_1.virtualNode)(0, [])])]));
        assert.ok(firstLine === undefined);
    });
    test('firstLineOf blank', function () {
        const firstLine = (0, indentation_1.firstLineOf)((0, indentation_1.topNode)([(0, indentation_1.blankNode)(1), (0, indentation_1.lineNode)(0, 2, 'line', [])]));
        assert.ok(firstLine === 1);
    });
    test('lastLineOf', function () {
        const line = (0, indentation_1.lastLineOf)((0, indentation_1.topNode)([
            (0, indentation_1.virtualNode)(0, []),
            (0, indentation_1.virtualNode)(0, [(0, indentation_1.lineNode)(0, 1, 'first', [])]),
            (0, indentation_1.lineNode)(0, 2, 'second', [(0, indentation_1.lineNode)(0, 3, 'third', []), (0, indentation_1.lineNode)(0, 4, 'fourth', [])]),
        ]));
        assert.ok(line !== undefined);
        assert.strictEqual(line, 4);
    });
    test('lastLineOf take by tree order, not registered line numbers', function () {
        const line = (0, indentation_1.lastLineOf)((0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 5, 'parent', [(0, indentation_1.lineNode)(0, 4, 'child 1', []), (0, indentation_1.lineNode)(0, 3, 'child 2', []), (0, indentation_1.lineNode)(0, 2, 'child 3', [])], 5),
        ]));
        assert.ok(line !== undefined);
        assert.strictEqual(line, 2);
    });
    test('lastLineOf undefined', function () {
        const line = (0, indentation_1.lastLineOf)((0, indentation_1.topNode)([(0, indentation_1.virtualNode)(0, []), (0, indentation_1.virtualNode)(0, [(0, indentation_1.virtualNode)(0, [])])]));
        assert.ok(line === undefined);
    });
    test('lastLineOf blank', function () {
        const line = (0, indentation_1.lastLineOf)((0, indentation_1.topNode)([(0, indentation_1.lineNode)(0, 1, 'line', []), (0, indentation_1.blankNode)(2)]));
        assert.ok(line === 2);
    });
    test('Reset line numbers for tree', function () {
        const duplicatedTree = (0, indentation_1.duplicateTree)(tree);
        (0, indentation_1.visitTree)(duplicatedTree, node => {
            if ((0, indentation_1.isLine)(node)) {
                node.lineNumber = -1;
            }
        }, 'topDown');
        assert.strictEqual((0, indentation_1.firstLineOf)(duplicatedTree), -1);
        assert.strictEqual((0, indentation_1.lastLineOf)(duplicatedTree), -1);
        (0, indentation_1.resetLineNumbers)(duplicatedTree);
        let counter = 0;
        (0, indentation_1.visitTree)(duplicatedTree, node => {
            if ((0, indentation_1.isLine)(node) || (0, indentation_1.isBlank)(node)) {
                assert.strictEqual(node.lineNumber, counter);
                counter++;
            }
        }, 'topDown');
    });
});
suite('Test core functions: other', function () {
    const tree = (0, indentation_1.parseTree)(SOURCE.source, 'python');
    test('deparseTree should give same output as source input', function () {
        // Assert that the tree is the same as the source, ignoring trailing newlines
        assert.strictEqual((0, indentation_1.deparseTree)(tree).replace(/\n*$/, ''), SOURCE.source.replace(/\n*$/, ''));
    });
    test('deparseTree should give same output as source input with an extra blank line', function () {
        const treeLonger = (0, indentation_1.parseTree)(`${SOURCE.source}\n`, 'python');
        // Assert that the tree is the same as the source, ignoring trailing newlines
        assert.strictEqual((0, indentation_1.deparseTree)(treeLonger).replace(/\n*$/, ''), SOURCE.source.replace(/\n*$/, ''));
    });
    test('deparseAndCutTree cuts at labels', function () {
        const source = (0, ts_dedent_1.default) `
1
    2
    3
4
    5
    6
7
    8
    9`;
        const tree = (0, indentation_1.parseRaw)(source);
        tree.subs[0].subs[1].label = 'cut';
        tree.subs[1].subs[0].label = 'cut';
        const cuts = (0, indentation_1.deparseAndCutTree)(tree, ['cut']);
        // since there were two cuts, it's cut in 5 bits:
        assert.strictEqual(cuts.length, 5);
        // it's cut at the lines labeled 'cut'
        assert.strictEqual(cuts[1].source, (0, indentation_1.deparseLine)(tree.subs[0].subs[1]));
        assert.strictEqual(cuts[3].source, (0, indentation_1.deparseLine)(tree.subs[1].subs[0]));
        // all together give the original source (ignoring trailing newlines -- _all_ cuts are newline ended)
        assert.strictEqual(cuts.map(x => x.source).join(''), source + '\n');
    });
    /* test('encodeTree should give an expression coding the tree', function () {
        const source = dedent`
        1
            2
            3

        4 (
            5
            6
        )


        7
            8
            9
        )`;
        const tree = groupBlocks(parseTree(source));
        // to eval, need to make several imports explicit
        const functions = [topNode, virtualNode, lineNode, blankNode];
        assert.notStrictEqual(functions, []); // make functions used
        const treeAfterRoundTrip = <IndentationTree<string>>eval(`
            const topNode = functions[0];
            const virtualNode = functions[1];
            const lineNode = functions[2];
            const blankNode = functions[3];
            ${encodeTree(tree)}`);
        compareTreeWithSpec(treeAfterRoundTrip, tree);
    }); */
    test('Cutting tree correctly', function () {
        const cutTree = (0, indentation_1.parseTree)(SOURCE.source, 'python');
        (0, indentation_1.cutTreeAfterLine)(cutTree, 2);
        assert.strictEqual((0, indentation_1.lastLineOf)(cutTree), 2);
    });
    test('VisitTreeConditionally', function () {
        const tree = (0, indentation_1.parseRaw)((0, ts_dedent_1.default) `
1
    2
    3
4
    5
    6
7
    8
    9`);
        const traceTopDownAll = [];
        (0, indentation_1.visitTree)(tree, node => {
            if (node.type === 'line') {
                traceTopDownAll.push(node.sourceLine.trim());
            }
            return node.type === 'top';
        }, 'topDown');
        assert.deepStrictEqual(traceTopDownAll, ['1', '2', '3', '4', '5', '6', '7', '8', '9'], 'visit all in order: top to down');
        const traceButtonUpAll = [];
        (0, indentation_1.visitTree)(tree, node => {
            if (node.type === 'line') {
                traceButtonUpAll.push(node.sourceLine.trim());
            }
            return node.type === 'top';
        }, 'bottomUp');
        assert.deepStrictEqual(traceButtonUpAll, ['2', '3', '1', '5', '6', '4', '8', '9', '7'], 'visit all in order: first leaves, then parents');
        const traceTopDown = [];
        (0, indentation_1.visitTreeConditionally)(tree, node => {
            if (node.type === 'line') {
                traceTopDown.push(node.sourceLine.trim());
            }
            return traceTopDown.length < 4;
        }, 'topDown');
        assert.deepStrictEqual(traceTopDown, ['1', '2', '3', '4'], 'should stop after four lines');
        const traceButtomUp = [];
        (0, indentation_1.visitTreeConditionally)(tree, node => {
            if (node.type === 'line') {
                traceButtomUp.push(node.sourceLine.trim());
            }
            return traceButtomUp.length < 4;
        }, 'bottomUp');
        assert.deepStrictEqual(traceButtomUp, ['2', '3', '1', '5'], 'should stop after four nodes');
    });
});
//# sourceMappingURL=indentation.test.js.map