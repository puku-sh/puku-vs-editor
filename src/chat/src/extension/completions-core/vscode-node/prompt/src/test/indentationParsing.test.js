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
/**
 * Parse a tree according to indentation, where lines
 * with content "-> virtual" are translated into virtual nodes
 * E.g.
 * A
 *   -> virtual
 *      B
 *      C
 * Will be parsed as: A having a virtual child, whose children are B and C
 * @param sourceParsedAsIf
 * @returns
 */
function parseAsIfVirtual(sourceParsedAsIf) {
    const treeExpected = (0, indentation_1.parseRaw)(sourceParsedAsIf);
    (0, indentation_1.visitTree)(treeExpected, node => {
        if ((0, indentation_1.isLine)(node) && node.sourceLine.trim() === '-> virtual') {
            node = node;
            node.type = 'virtual';
        }
    }, 'topDown');
    return treeExpected;
}
suite('Test core parsing elements', function () {
    test('flattenVirtual 1', function () {
        const before = (0, indentation_1.topNode)([(0, indentation_1.virtualNode)(0, []), (0, indentation_1.virtualNode)(0, [(0, indentation_1.lineNode)(0, 0, 'lonely node', [])])]);
        const after = (0, indentation_1.topNode)([(0, indentation_1.lineNode)(0, 0, 'lonely node', [])]);
        (0, testHelpers_1.compareTreeWithSpec)((0, indentation_1.flattenVirtual)(before), after);
    });
    test('flattenVirtual 2', function () {
        const before = (0, indentation_1.topNode)([(0, indentation_1.lineNode)(0, 0, 'A', [(0, indentation_1.virtualNode)(2, [(0, indentation_1.lineNode)(2, 1, 'lonely node', [])])])]);
        const after = (0, indentation_1.topNode)([(0, indentation_1.lineNode)(0, 0, 'A', [(0, indentation_1.lineNode)(2, 1, 'lonely node', [])])]);
        (0, testHelpers_1.compareTreeWithSpec)((0, indentation_1.flattenVirtual)(before), after);
    });
    test('groupBlocks basic cases', function () {
        const source = (0, ts_dedent_1.default) `
A

B
C
D

E
F

G
H`;
        const tree = (0, indentation_1.parseRaw)(source);
        const blockTree = (0, indentation_1.groupBlocks)(tree);
        function assertChildrenAreTheFollowingLines(tree, children, message = '') {
            assert.deepStrictEqual(tree.subs.map((node) => ((0, indentation_1.isVirtual)(node) ? 'v' : node.lineNumber)), children, message);
        }
        assertChildrenAreTheFollowingLines(blockTree, ['v', 'v', 'v', 'v'], 'wrong topline blocks');
        assertChildrenAreTheFollowingLines(blockTree.subs[0], [0, 1], 'wrong zeroth block');
        assertChildrenAreTheFollowingLines(blockTree.subs[1], [2, 3, 4, 5], 'wrong first block');
        assertChildrenAreTheFollowingLines(blockTree.subs[2], [6, 7, 8], 'wrong second block');
        assertChildrenAreTheFollowingLines(blockTree.subs[3], [9, 10], 'wrong fourth block');
    });
    test('groupBlocks advanced cases', function () {
        // tests consecutive blank lines, first child blank lines,
        // blank lines after last child, lone blank lines,
        // consecutive lone blank lines, offside blocks
        let tree = (0, indentation_1.parseRaw)((0, ts_dedent_1.default) `
A

  B
  C
    D

  E


  F

G
    H
    I
  J

  K
`);
        tree = (0, indentation_1.groupBlocks)(tree);
        (0, testHelpers_1.compareTreeWithSpec)(tree, (0, indentation_1.topNode)([
            (0, indentation_1.virtualNode)(0, [
                (0, indentation_1.lineNode)(0, 0, 'A', [
                    (0, indentation_1.blankNode)(1),
                    (0, indentation_1.virtualNode)(2, [
                        (0, indentation_1.lineNode)(2, 2, 'B', []),
                        (0, indentation_1.lineNode)(2, 3, 'C', [(0, indentation_1.lineNode)(4, 4, 'D', [])]),
                        (0, indentation_1.blankNode)(5),
                    ]),
                    (0, indentation_1.virtualNode)(2, [(0, indentation_1.lineNode)(2, 6, 'E', []), (0, indentation_1.blankNode)(7), (0, indentation_1.blankNode)(8)]),
                    (0, indentation_1.virtualNode)(2, [(0, indentation_1.lineNode)(2, 9, 'F', [])]),
                ]),
                (0, indentation_1.blankNode)(10),
            ]),
            (0, indentation_1.virtualNode)(0, [
                (0, indentation_1.lineNode)(0, 11, 'G', [
                    (0, indentation_1.virtualNode)(4, [
                        (0, indentation_1.lineNode)(4, 12, 'H', []),
                        (0, indentation_1.lineNode)(4, 13, 'I', []),
                        (0, indentation_1.lineNode)(2, 14, 'J', []),
                        (0, indentation_1.blankNode)(15),
                    ]),
                    (0, indentation_1.virtualNode)(4, [(0, indentation_1.lineNode)(2, 16, 'K', [])]),
                ]),
            ]),
        ]));
    });
    test('groupBlocks consecutive blanks as oldest children', function () {
        let tree = (0, indentation_1.parseRaw)((0, ts_dedent_1.default) `
A


    B1
    B2
C
`);
        tree = (0, indentation_1.groupBlocks)(tree);
        (0, testHelpers_1.compareTreeWithSpec)(tree, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'A', [
                (0, indentation_1.blankNode)(1),
                (0, indentation_1.blankNode)(2),
                (0, indentation_1.virtualNode)(4, [(0, indentation_1.lineNode)(4, 3, 'B1', []), (0, indentation_1.lineNode)(4, 4, 'B2', [])]),
            ]),
            (0, indentation_1.lineNode)(0, 5, 'C', []),
        ]));
    });
    test('groupBlocks subs ending with a blank line', function () {
        const baseTree = (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'A', [(0, indentation_1.blankNode)(1)]),
            (0, indentation_1.lineNode)(0, 2, 'B', [(0, indentation_1.blankNode)(3), (0, indentation_1.blankNode)(4)]),
            (0, indentation_1.blankNode)(5),
            (0, indentation_1.lineNode)(0, 6, 'C', []),
        ]);
        const tree = (0, indentation_1.groupBlocks)(baseTree);
        (0, testHelpers_1.compareTreeWithSpec)(tree, (0, indentation_1.topNode)([
            (0, indentation_1.virtualNode)(0, [
                (0, indentation_1.lineNode)(0, 0, 'A', [(0, indentation_1.blankNode)(1)]),
                (0, indentation_1.lineNode)(0, 2, 'B', [(0, indentation_1.blankNode)(3), (0, indentation_1.blankNode)(4)]),
                (0, indentation_1.blankNode)(5),
            ]),
            (0, indentation_1.virtualNode)(0, [(0, indentation_1.lineNode)(0, 6, 'C', [])]),
        ]));
    });
    test('groupBlocks with different delimiter', function () {
        let tree = (0, indentation_1.parseRaw)((0, ts_dedent_1.default) `
A
B
C
D
E
`);
        const isDelimiter = (node) => (0, indentation_1.isLine)(node) && (node.sourceLine.trim() === 'B' || node.sourceLine.trim() === 'D');
        tree = (0, indentation_1.groupBlocks)(tree, isDelimiter);
        (0, testHelpers_1.compareTreeWithSpec)(tree, (0, indentation_1.topNode)([
            (0, indentation_1.virtualNode)(0, [(0, indentation_1.lineNode)(0, 0, 'A', []), (0, indentation_1.lineNode)(0, 1, 'B', [])]),
            (0, indentation_1.virtualNode)(0, [(0, indentation_1.lineNode)(0, 2, 'C', []), (0, indentation_1.lineNode)(0, 3, 'D', [])]),
            (0, indentation_1.virtualNode)(0, [(0, indentation_1.lineNode)(0, 4, 'E ', [])]),
        ]));
    });
});
suite('Raw parsing', function () {
    test('parseRaw', function () {
        (0, testHelpers_1.compareTreeWithSpec)((0, indentation_1.parseRaw)((0, ts_dedent_1.default) `
A
  a
B
  b1
  b2
C
    c1
    c2
  c3
D
  d1
    d2
`), (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'A', [(0, indentation_1.lineNode)(2, 1, 'a', [])]),
            (0, indentation_1.lineNode)(0, 2, 'B', [(0, indentation_1.lineNode)(2, 3, 'b1', []), (0, indentation_1.lineNode)(2, 4, 'b2', [])]),
            (0, indentation_1.lineNode)(0, 5, 'C', [(0, indentation_1.lineNode)(4, 6, 'c1', []), (0, indentation_1.lineNode)(4, 7, 'c2', []), (0, indentation_1.lineNode)(2, 8, 'c3', [])]),
            (0, indentation_1.lineNode)(0, 9, 'D', [(0, indentation_1.lineNode)(2, 10, 'd1', [(0, indentation_1.lineNode)(4, 11, 'd2', [])])]),
        ]));
    });
    test('parseRaw blanks', function () {
        (0, testHelpers_1.compareTreeWithSpec)((0, indentation_1.parseRaw)((0, ts_dedent_1.default) `
E
  e1

  e2
F

  f1
G
  g1

H

`), (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'E', [(0, indentation_1.lineNode)(2, 1, 'e1', []), (0, indentation_1.blankNode)(2), (0, indentation_1.lineNode)(2, 3, 'e2', [])]),
            (0, indentation_1.lineNode)(0, 4, 'F', [(0, indentation_1.blankNode)(5), (0, indentation_1.lineNode)(2, 6, 'f1', [])]),
            (0, indentation_1.lineNode)(0, 7, 'G', [(0, indentation_1.lineNode)(2, 8, 'g1', [])]),
            (0, indentation_1.blankNode)(9),
            (0, indentation_1.lineNode)(0, 10, 'H', []),
            (0, indentation_1.blankNode)(11),
        ]));
    });
    test('combineBraces', function () {
        const tree = (0, indentation_1.parseTree)((0, ts_dedent_1.default) `
A {
}
B
  b1 {
    bb1
  }
  b2 {
    bb2

  }
}
C {
    c1
    c2
  c3
  c4
}
`);
        (0, testHelpers_1.compareTreeWithSpec)(tree, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'A {', [(0, indentation_1.lineNode)(0, 1, '}', [], 'closer')]),
            (0, indentation_1.lineNode)(0, 2, 'B', [
                (0, indentation_1.lineNode)(2, 3, 'b1 {', [(0, indentation_1.lineNode)(4, 4, 'bb1', []), (0, indentation_1.lineNode)(2, 5, '}', [], 'closer')]),
                (0, indentation_1.lineNode)(2, 6, 'b2 {', [
                    (0, indentation_1.lineNode)(4, 7, 'bb2', []),
                    (0, indentation_1.blankNode)(8),
                    (0, indentation_1.lineNode)(2, 9, '}', [], 'closer'),
                ]),
                (0, indentation_1.lineNode)(0, 10, '}', [], 'closer'),
            ]),
            (0, indentation_1.lineNode)(0, 11, 'C {', [
                (0, indentation_1.lineNode)(4, 12, 'c1', []),
                (0, indentation_1.lineNode)(4, 13, 'c2', []),
                (0, indentation_1.lineNode)(2, 14, 'c3', []),
                (0, indentation_1.lineNode)(2, 15, 'c4', []),
                (0, indentation_1.lineNode)(0, 16, '}', [], 'closer'),
            ]),
        ]));
        // Running the optimisation twice doesn't change the result
        let newTree = JSON.parse(JSON.stringify(tree));
        newTree = (0, indentation_1.combineClosersAndOpeners)(newTree);
        (0, testHelpers_1.compareTreeWithSpec)(newTree, tree);
    });
});
/**
 * Many examples in this suite are taken from
 * https://docs.google.com/document/d/1WxjTDzx8Qbf4Bklrp9KwiQsB4-kTOloAR5h86np3_OM/edit#
 */
suite('Test bracket indentation spec', function () {
    test('Opener merged to older sibling', function () {
        const source = (0, ts_dedent_1.default) `
A
(
    B
    C`;
        const treeRaw = (0, indentation_1.parseRaw)(source);
        const treeCode = (0, indentation_1.parseTree)(source, '');
        // the raw indentation indicates line 1 is the parent of the following lines
        (0, testHelpers_1.compareTreeWithSpec)(treeRaw, (0, indentation_1.topNode)([(0, indentation_1.lineNode)(0, 0, 'A', []), (0, indentation_1.lineNode)(0, 1, '(', [(0, indentation_1.lineNode)(4, 2, 'B', []), (0, indentation_1.lineNode)(4, 3, 'C', [])])]));
        // the bracket parsing indicates line 0 is the parent
        (0, testHelpers_1.compareTreeWithSpec)(treeCode, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'A', [
                (0, indentation_1.lineNode)(0, 1, '(', [], 'opener'),
                (0, indentation_1.lineNode)(4, 2, 'B', []),
                (0, indentation_1.lineNode)(4, 3, 'C', []),
            ]),
        ]));
    });
    test('Closer merged, simplest case', function () {
        const source = (0, ts_dedent_1.default) `
A
    B
)`;
        const treeRaw = (0, indentation_1.parseRaw)(source);
        const treeCode = (0, indentation_1.parseTree)(source, '');
        // the raw indentation indicates line 2 is the sibling of 0
        (0, testHelpers_1.compareTreeWithSpec)(treeRaw, (0, indentation_1.topNode)([(0, indentation_1.lineNode)(0, 0, 'A', [(0, indentation_1.lineNode)(4, 1, 'B', [])]), (0, indentation_1.lineNode)(0, 2, ')', [])]));
        // the bracket parsing indicates line 2 actually another child
        (0, testHelpers_1.compareTreeWithSpec)(treeCode, (0, indentation_1.topNode)([(0, indentation_1.lineNode)(0, 0, 'A', [(0, indentation_1.lineNode)(4, 1, 'B', []), (0, indentation_1.lineNode)(0, 2, ')', [], 'closer')])]));
    });
    test('Closer merged, multi-body case', function () {
        const source = (0, ts_dedent_1.default) `
A
    B
    C
) + (
    D
    E
)`;
        const treeRaw = (0, indentation_1.parseRaw)(source);
        const treeCode = (0, indentation_1.parseTree)(source, '');
        // before bracket parsing, A had two children, B and C
        assert.strictEqual(treeRaw.subs[0].subs.map(x => (x.type === 'line' ? x.sourceLine.trim() : 'v')).join(), 'B,C');
        // after, it had three children, a virtual node, line node 3 and the closer 6
        assert.strictEqual(treeCode.subs[0].subs.map(x => (x.type === 'line' ? x.sourceLine.trim() : 'v')).join(), 'v,) + (,)');
    });
    test('closer starting their next subblock, ifelse', function () {
        const source = (0, ts_dedent_1.default) `
            if (new) {
                print(“hello”)
                print(“world”)
            } else {
                print(“goodbye”)
            }`;
        const sourceParsedAsIf = (0, ts_dedent_1.default) `
            if (new) {
                -> virtual
                    print(“hello”)
                    print(“world”)
                } else {
                    print(“goodbye”)
                }`;
        const treeRaw = (0, indentation_1.parseRaw)(source);
        const treeCode = (0, indentation_1.parseTree)(source, '');
        const treeExpected = parseAsIfVirtual(sourceParsedAsIf);
        (0, testHelpers_1.compareTreeWithSpec)(treeRaw, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'if (new) {', [
                (0, indentation_1.lineNode)(4, 1, 'print(“hello”)', []),
                (0, indentation_1.lineNode)(4, 2, 'print(“world”)', []),
            ]),
            (0, indentation_1.lineNode)(0, 3, '} else {', [(0, indentation_1.lineNode)(4, 4, 'print(“goodbye”)', [])]),
            (0, indentation_1.lineNode)(0, 5, '}', []),
        ]));
        (0, testHelpers_1.compareTreeWithSpec)(treeCode, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'if (new) {', [
                (0, indentation_1.virtualNode)(0, [(0, indentation_1.lineNode)(4, 1, 'print(“hello”)', []), (0, indentation_1.lineNode)(4, 2, 'print(“world”)', [])]),
                (0, indentation_1.lineNode)(0, 3, '} else {', [(0, indentation_1.lineNode)(4, 4, 'print(“goodbye”)', [])]),
                (0, indentation_1.lineNode)(0, 5, '}', []),
            ]),
        ]));
        (0, testHelpers_1.compareTreeWithSpec)(treeCode, treeExpected, 'structure');
    });
});
suite('Special indentation styles', function () {
    test('Allman style example (function)', function () {
        const source = (0, ts_dedent_1.default) `
        function test()
        {
            print(“hello”)
            print(“world”)
        }`;
        const treeRaw = (0, indentation_1.parseRaw)(source);
        const treeCode = (0, indentation_1.parseTree)(source, '');
        // the bracket parsing indicates line 0 is the parent
        (0, testHelpers_1.compareTreeWithSpec)(treeCode, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'function test()', [
                (0, indentation_1.lineNode)(0, 1, '{', [], 'opener'),
                (0, indentation_1.lineNode)(4, 2, 'print(“hello”)', []),
                (0, indentation_1.lineNode)(4, 3, 'print(“world”)', []),
                (0, indentation_1.lineNode)(0, 4, '}', [], 'closer'),
            ]),
        ]));
        // the next line is also moved, but by the closing partof the spec, so not tested here
        (0, testHelpers_1.compareTreeWithSpec)(treeRaw, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'function test()', []),
            (0, indentation_1.lineNode)(0, 1, '{', [(0, indentation_1.lineNode)(4, 2, 'print(“hello”)', []), (0, indentation_1.lineNode)(4, 3, 'print(“world”)', [])]),
            (0, indentation_1.lineNode)(0, 4, '}', []),
        ]));
    });
    /** This test is a case where our parsing isn't yet optimal */
    test('Allman style example (if-then-else)', function () {
        const source = (0, ts_dedent_1.default) `
        if (condition)
        {
            print(“hello”)
            print(“world”)
        }
        else
        {
            print(“goodbye”)
            print(“phone”)
        }
        `;
        const treeCode = (0, indentation_1.parseTree)(source, '');
        // Currently, this is parsed the same as two consecutive if-statements,
        // Because generic languages do not understand `else` should continue.
        (0, testHelpers_1.compareTreeWithSpec)(treeCode, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'if (condition)', [
                (0, indentation_1.lineNode)(0, 1, '{', [], 'opener'),
                (0, indentation_1.lineNode)(4, 2, 'print(“hello”)', []),
                (0, indentation_1.lineNode)(4, 3, 'print(“world”)', []),
                (0, indentation_1.lineNode)(0, 4, '}', [], 'closer'),
            ]),
            (0, indentation_1.lineNode)(0, 5, 'else ', [
                (0, indentation_1.lineNode)(0, 6, '{', [], 'opener'),
                (0, indentation_1.lineNode)(4, 7, 'print(“goodbye”)', []),
                (0, indentation_1.lineNode)(4, 8, 'print(“phone”)', []),
                (0, indentation_1.lineNode)(0, 9, '}', [], 'closer'),
            ]),
        ]));
    });
    test('K&R style example (if-then-else)', function () {
        const source = (0, ts_dedent_1.default) `
        if (condition) {
            print(“hello”)
            print(“world”)
        } else {
            print(“goodbye”)
            print(“phone”)
        }
        `;
        const treeCode = (0, indentation_1.parseTree)(source, '');
        // Currently, this is parsed the same as two consecutive if-statements,
        // Because generic languages do not understand `else` should continue.
        (0, testHelpers_1.compareTreeWithSpec)(treeCode, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'if (condition) {', [
                (0, indentation_1.virtualNode)(0, [(0, indentation_1.lineNode)(4, 2, 'print(“hello”)', []), (0, indentation_1.lineNode)(4, 3, 'print(“world”)', [])]),
                (0, indentation_1.lineNode)(0, 4, '} else {', [(0, indentation_1.lineNode)(4, 5, 'print(“goodbye”)', []), (0, indentation_1.lineNode)(4, 6, 'print(“phone”)', [])], 'closer'),
                (0, indentation_1.lineNode)(0, 7, '}', [], 'closer'),
            ]),
        ]));
    });
    test('combineBraces GNU style indentation 1', function () {
        let tree = (0, indentation_1.parseRaw)((0, ts_dedent_1.default) `
A
  {
    stmt
  }
`);
        (0, indentation_1.labelLines)(tree, (0, indentation_1.buildLabelRules)({ opener: /^{$/, closer: /^}$/ }));
        tree = (0, indentation_1.combineClosersAndOpeners)(tree);
        (0, testHelpers_1.compareTreeWithSpec)(tree, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'A', [
                (0, indentation_1.lineNode)(2, 1, '{', [(0, indentation_1.lineNode)(4, 2, 'stmt', []), (0, indentation_1.lineNode)(2, 3, '}', [], 'closer')], 'opener'),
            ]),
        ]));
    });
    test('combineBraces GNU style indentation 2', function () {
        let tree = (0, indentation_1.parseRaw)((0, ts_dedent_1.default) `
B
{
    stmt

}


end
`);
        (0, indentation_1.labelLines)(tree, (0, indentation_1.buildLabelRules)({ opener: /^{$/, closer: /^}$/ }));
        tree = (0, indentation_1.combineClosersAndOpeners)(tree);
        tree = (0, indentation_1.flattenVirtual)(tree);
        (0, testHelpers_1.compareTreeWithSpec)(tree, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'B', [
                (0, indentation_1.lineNode)(0, 1, '{', [], 'opener'),
                (0, indentation_1.lineNode)(4, 2, 'stmt', []),
                (0, indentation_1.blankNode)(3),
                (0, indentation_1.lineNode)(0, 4, '}', [], 'closer'),
            ]),
            (0, indentation_1.blankNode)(5),
            (0, indentation_1.blankNode)(6),
            (0, indentation_1.lineNode)(0, 7, 'end', []),
        ]));
    });
    test('combineBraces GNU style indentation 3', function () {
        let tree = (0, indentation_1.parseRaw)((0, ts_dedent_1.default) `
C
{

}
`);
        (0, indentation_1.labelLines)(tree, (0, indentation_1.buildLabelRules)({ opener: /^{$/, closer: /^}$/ }));
        tree = (0, indentation_1.combineClosersAndOpeners)(tree);
        tree = (0, indentation_1.flattenVirtual)(tree);
        (0, testHelpers_1.compareTreeWithSpec)(tree, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'C', [
                (0, indentation_1.lineNode)(0, 1, '{', [], 'opener'),
                (0, indentation_1.blankNode)(2),
                (0, indentation_1.lineNode)(0, 3, '}', [], 'closer'),
            ]),
        ]));
    });
    test('combineBraces GNU style indentation 4', function () {
        let tree = (0, indentation_1.parseRaw)((0, ts_dedent_1.default) `
D
{
    d
    {
        stmt

    }
}
`);
        (0, indentation_1.labelLines)(tree, (0, indentation_1.buildLabelRules)({ opener: /^{$/, closer: /^}$/ }));
        tree = (0, indentation_1.combineClosersAndOpeners)(tree);
        tree = (0, indentation_1.flattenVirtual)(tree);
        (0, testHelpers_1.compareTreeWithSpec)(tree, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'D', [
                (0, indentation_1.lineNode)(0, 1, '{', [], 'opener'),
                (0, indentation_1.lineNode)(4, 2, 'd', [
                    (0, indentation_1.lineNode)(4, 3, '{', [], 'opener'),
                    (0, indentation_1.lineNode)(8, 4, 'stmt', []),
                    (0, indentation_1.blankNode)(5),
                    (0, indentation_1.lineNode)(4, 6, '}', [], 'closer'),
                ]),
                (0, indentation_1.lineNode)(0, 7, '}', [], 'closer'),
            ]),
        ]));
    });
});
//# sourceMappingURL=indentationParsing.test.js.map