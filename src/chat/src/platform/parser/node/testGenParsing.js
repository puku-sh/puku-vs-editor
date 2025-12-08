"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports._getTestableNode = _getTestableNode;
exports._getTestableNodes = _getTestableNodes;
exports._findLastTest = _findLastTest;
const arrays_1 = require("../../../util/vs/base/common/arrays");
const types_1 = require("../../../util/vs/base/common/types");
const nodes_1 = require("./nodes");
const parserWithCaching_1 = require("./parserWithCaching");
const querying_1 = require("./querying");
const treeSitterQueries_1 = require("./treeSitterQueries");
async function _getTestableNode(language, source, range) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const queryCaptures = (0, querying_1.runQueries)(treeSitterQueries_1.testableNodeQueries[language], treeRef.tree.rootNode).flatMap(({ captures }) => captures); // @ulugbekna: keep in mind: there's duplication of captures
        const symbolKindToIdents = new Map();
        for (const capture of queryCaptures) {
            const [symbolKind, name] = capture.name.split('.');
            if (name !== 'identifier') {
                continue;
            }
            const idents = symbolKindToIdents.get(symbolKind) || [];
            idents.push(capture);
            symbolKindToIdents.set(symbolKind, idents);
        }
        let minimalTestableNode = null;
        for (const capture of queryCaptures) {
            const [symbolKind, name] = capture.name.split('.');
            if (name !== undefined || // ensure we traverse only declarations (and child nodes such as `method.identifier` or `method.accessibility_modifier`)
                !nodes_1.TreeSitterOffsetRange.doesContain(capture.node, range) // ensure this declaration contains our range of interest
            ) {
                continue;
            }
            // ensure we pick range-wise minimal testable node
            if (minimalTestableNode !== null &&
                nodes_1.TreeSitterOffsetRange.len(minimalTestableNode.node) < nodes_1.TreeSitterOffsetRange.len(capture.node)) {
                continue;
            }
            const idents = symbolKindToIdents.get(symbolKind);
            (0, types_1.assertType)(idents !== undefined, `must have seen identifier for symbol kind '${symbolKind}' (lang: ${language})`);
            const nodeIdent = idents.find(ident => nodes_1.TreeSitterOffsetRange.doesContain(capture.node, ident.node));
            (0, types_1.assertType)(nodeIdent !== undefined, `must have seen identifier for symbol '${symbolKind}' (lang: ${language})`);
            minimalTestableNode = {
                identifier: {
                    name: nodeIdent.node.text,
                    range: nodes_1.TreeSitterOffsetRange.ofSyntaxNode(nodeIdent.node),
                },
                node: nodes_1.Node.ofSyntaxNode(capture.node),
            };
        }
        return minimalTestableNode;
    }
    catch (e) {
        console.error('getTestableNode: Unexpected error', e);
        return null;
    }
    finally {
        treeRef.dispose();
    }
}
async function _getTestableNodes(language, source) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const queryCaptures = (0, querying_1.runQueries)(treeSitterQueries_1.testableNodeQueries[language], treeRef.tree.rootNode)
            .flatMap(({ captures }) => captures)
            .filter((0, arrays_1.uniqueFilter)((c) => [c.node.startIndex, c.node.endIndex].toString()));
        const symbolKindToIdents = new Map();
        for (const capture of queryCaptures) {
            const [symbolKind, name] = capture.name.split('.');
            if (name !== 'identifier') {
                continue;
            }
            const idents = symbolKindToIdents.get(symbolKind) || [];
            idents.push(capture);
            symbolKindToIdents.set(symbolKind, idents);
        }
        const testableNodes = [];
        for (const capture of queryCaptures) {
            if (capture.name.includes('.')) {
                continue;
            }
            const symbolKind = capture.name;
            const idents = symbolKindToIdents.get(symbolKind);
            (0, types_1.assertType)(idents !== undefined, `must have seen identifier for symbol kind '${symbolKind}' (lang: ${language})`);
            const nodeIdent = idents.find(ident => nodes_1.TreeSitterOffsetRange.doesContain(capture.node, ident.node));
            (0, types_1.assertType)(nodeIdent !== undefined, `must have seen identifier for symbol '${symbolKind}' (lang: ${language})`);
            testableNodes.push({
                identifier: {
                    name: nodeIdent.node.text,
                    range: nodes_1.TreeSitterOffsetRange.ofSyntaxNode(nodeIdent.node),
                },
                node: nodes_1.Node.ofSyntaxNode(capture.node),
            });
        }
        return testableNodes;
    }
    catch (e) {
        console.error('getTestableNodes: Unexpected error', e);
        return null;
    }
    finally {
        treeRef.dispose();
    }
}
async function _findLastTest(lang, src) {
    const treeRef = await (0, parserWithCaching_1._parse)(lang, src);
    try {
        const queryResults = (0, querying_1.runQueries)(treeSitterQueries_1.testInSuiteQueries[lang], treeRef.tree.rootNode);
        const captures = queryResults
            .flatMap(e => e.captures).sort((a, b) => a.node.endIndex - b.node.endIndex)
            .filter(c => c.name === 'test');
        if (captures.length === 0) {
            return null;
        }
        const lastTest = captures[captures.length - 1].node;
        return {
            startIndex: lastTest.startIndex,
            endIndex: lastTest.endIndex
        };
    }
    finally {
        treeRef.dispose();
    }
}
//# sourceMappingURL=testGenParsing.js.map