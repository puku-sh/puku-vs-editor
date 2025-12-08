"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports._getTestableNodes = exports._getTestableNode = exports._findLastTest = exports._getNodeMatchingSelection = exports._dispose = exports._getNodeToDocument = exports._getDocumentableNodeIfOnIdentifier = void 0;
exports._getCallExpressions = _getCallExpressions;
exports._getFunctionDefinitions = _getFunctionDefinitions;
exports._getClassDeclarations = _getClassDeclarations;
exports._getTypeDeclarations = _getTypeDeclarations;
exports._getTypeReferences = _getTypeReferences;
exports._getClassReferences = _getClassReferences;
exports._getSymbols = _getSymbols;
exports._getSemanticChunkTree = _getSemanticChunkTree;
exports._getSemanticChunkNames = _getSemanticChunkNames;
exports._getFunctionBodies = _getFunctionBodies;
exports._getCoarseParentScope = _getCoarseParentScope;
exports._getFixSelectionOfInterest = _getFixSelectionOfInterest;
exports._getFineScopes = _getFineScopes;
exports._getNodeToExplain = _getNodeToExplain;
exports.getBlockNameTree = getBlockNameTree;
exports._getStructure = _getStructure;
exports._getParseErrorCount = _getParseErrorCount;
const arrays_1 = require("../../../util/common/arrays");
const chunkGroupTypes_1 = require("./chunkGroupTypes");
const nodes_1 = require("./nodes");
const parserWithCaching_1 = require("./parserWithCaching");
const querying_1 = require("./querying");
const selectionParsing_1 = require("./selectionParsing");
const structure_1 = require("./structure");
const treeSitterLanguages_1 = require("./treeSitterLanguages");
const treeSitterQueries_1 = require("./treeSitterQueries");
const util_1 = require("./util");
var docGenParsing_1 = require("./docGenParsing");
Object.defineProperty(exports, "_getDocumentableNodeIfOnIdentifier", { enumerable: true, get: function () { return docGenParsing_1._getDocumentableNodeIfOnIdentifier; } });
Object.defineProperty(exports, "_getNodeToDocument", { enumerable: true, get: function () { return docGenParsing_1._getNodeToDocument; } });
var parserWithCaching_2 = require("./parserWithCaching");
Object.defineProperty(exports, "_dispose", { enumerable: true, get: function () { return parserWithCaching_2._dispose; } });
var selectionParsing_2 = require("./selectionParsing");
Object.defineProperty(exports, "_getNodeMatchingSelection", { enumerable: true, get: function () { return selectionParsing_2._getNodeMatchingSelection; } });
var testGenParsing_1 = require("./testGenParsing");
Object.defineProperty(exports, "_findLastTest", { enumerable: true, get: function () { return testGenParsing_1._findLastTest; } });
Object.defineProperty(exports, "_getTestableNode", { enumerable: true, get: function () { return testGenParsing_1._getTestableNode; } });
Object.defineProperty(exports, "_getTestableNodes", { enumerable: true, get: function () { return testGenParsing_1._getTestableNodes; } });
function queryCoarseScopes(language, root) {
    const queries = treeSitterQueries_1.coarseScopesQuery[language];
    return (0, querying_1.runQueries)(queries, root);
}
function queryFunctions(language, root) {
    const queries = treeSitterQueries_1.functionQuery[language];
    return (0, querying_1.runQueries)(queries, root);
}
function queryCallExpressions(language, root) {
    const queries = treeSitterQueries_1.callExpressionQuery[language];
    if (!queries) {
        return [];
    }
    return (0, querying_1.runQueries)(queries, root);
}
function queryClasses(language, root) {
    const queries = treeSitterQueries_1.classDeclarationQuery[language];
    if (!queries) {
        return [];
    }
    return (0, querying_1.runQueries)(queries, root);
}
function queryTypeDeclarations(language, root) {
    const queries = treeSitterQueries_1.typeDeclarationQuery[language];
    if (!queries) {
        return [];
    }
    return (0, querying_1.runQueries)(queries, root);
}
function queryTypeReferences(language, root) {
    const queries = treeSitterQueries_1.typeReferenceQuery[language];
    if (!queries) {
        return [];
    }
    return (0, querying_1.runQueries)(queries, root);
}
function queryClassReferences(language, root) {
    const queries = treeSitterQueries_1.classReferenceQuery[language];
    if (!queries) {
        return [];
    }
    return (0, querying_1.runQueries)(queries, root);
}
function querySemanticTargets(language, root) {
    const queries = treeSitterQueries_1.semanticChunkingTargetQuery[language];
    return (0, querying_1.runQueries)(queries, root);
}
/**
 * Get the positions of all function calls in the given piece of source code.
 */
async function _getCallExpressions(language, source, selection) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const results = queryCallExpressions(language, treeRef.tree.rootNode);
        const positions = results.reduce((acc, res) => {
            const fn = res.captures.find(c => c.name === 'call_expression').node;
            if (nodes_1.TreeSitterOffsetRange.doIntersect(selection, fn)) {
                let identifier;
                let identifierNode;
                if (language === 'ruby') { // strip preceding : from any captured simple symbols
                    identifierNode = res.captures.find(c => c.name === 'symbol')?.node;
                    identifier = identifierNode?.text?.slice(1);
                }
                identifierNode ??= res.captures.find(c => c.name === 'identifier')?.node;
                identifier ??= identifierNode?.text;
                acc.push({
                    identifier: identifier ?? '',
                    text: fn.text,
                    startIndex: (identifierNode ?? fn).startIndex,
                    endIndex: (identifierNode ?? fn).endIndex,
                });
            }
            return acc;
        }, []);
        return positions;
    }
    finally {
        treeRef.dispose();
    }
}
/**
 * Get function definition info for all function definitions in the given piece of source code.
 */
async function _getFunctionDefinitions(language, source) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const results = queryFunctions(language, treeRef.tree.rootNode);
        const positions = results.map(res => {
            const fn = res.captures.find(c => c.name === 'function').node;
            const identifier = res.captures.find(c => c.name === 'identifier')?.node.text;
            return {
                identifier: identifier ?? '',
                text: fn.text,
                startIndex: fn.startIndex,
                endIndex: fn.endIndex,
            };
        });
        return positions;
    }
    finally {
        treeRef.dispose();
    }
}
async function _getClassDeclarations(language, source) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const results = queryClasses(language, treeRef.tree.rootNode);
        const positions = results.map(res => {
            const fn = res.captures.find(c => c.name === 'class_declaration').node;
            const identifier = fn?.children.find(c => c.type === 'type_identifier' // typescript
                || c.type === 'identifier' // python
                || c.type === 'constant' // ruby
            )?.text;
            return {
                identifier: identifier ?? '',
                text: fn.text,
                startIndex: fn.startIndex,
                endIndex: fn.endIndex,
            };
        });
        return positions;
    }
    finally {
        treeRef.dispose();
    }
}
async function _getTypeDeclarations(language, source) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const results = queryTypeDeclarations(language, treeRef.tree.rootNode);
        const positions = results.map(res => {
            const fn = res.captures.find(c => c.name === 'type_declaration').node;
            let identifier = res.captures.find(c => c.name === 'type_identifier')?.node.text;
            if (!identifier) { // TODO@joyceerhl debt: move this into query captures
                identifier = fn?.children.find(c => c.type === 'type_identifier')?.text;
            }
            return {
                identifier: identifier ?? '',
                text: fn.text,
                startIndex: fn.startIndex,
                endIndex: fn.endIndex,
            };
        });
        return positions;
    }
    finally {
        treeRef.dispose();
    }
}
async function _getTypeReferences(language, source, selection) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const results = queryTypeReferences(language, treeRef.tree.rootNode);
        const positions = results.reduce((acc, res) => {
            const typeIdentifier = res.captures.find(c => c.name === 'type_identifier').node;
            if (nodes_1.TreeSitterOffsetRange.doIntersect(selection, typeIdentifier)) {
                acc.push({
                    identifier: typeIdentifier.text,
                    text: typeIdentifier.text,
                    startIndex: typeIdentifier.startIndex,
                    endIndex: typeIdentifier.endIndex,
                });
            }
            return acc;
        }, []);
        return positions;
    }
    finally {
        treeRef.dispose();
    }
}
async function _getClassReferences(language, source, selection) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const results = queryClassReferences(language, treeRef.tree.rootNode);
        const positions = results.reduce((acc, res) => {
            const fn = res.captures.find(c => c.name === 'new_expression').node;
            if (nodes_1.TreeSitterOffsetRange.doIntersect(selection, fn)) {
                acc.push({
                    identifier: fn.text,
                    text: fn.text,
                    startIndex: fn.startIndex,
                    endIndex: fn.endIndex,
                });
            }
            return acc;
        }, []);
        return positions;
    }
    finally {
        treeRef.dispose();
    }
}
async function _getSymbols(language, source, selection) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const queries = treeSitterQueries_1.symbolQueries[language];
        const results = (0, querying_1.runQueries)(queries, treeRef.tree.rootNode);
        const positions = results.reduce((acc, res) => {
            const fn = res.captures.find(c => c.name === 'symbol').node;
            if (nodes_1.TreeSitterOffsetRange.doIntersect(selection, fn)) {
                acc.push({
                    identifier: fn.text,
                    text: fn.text,
                    startIndex: fn.startIndex,
                    endIndex: fn.endIndex,
                });
            }
            return acc;
        }, []);
        return positions;
    }
    finally {
        treeRef.dispose();
    }
}
async function _getSemanticChunkTree(language, source) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const results = querySemanticTargets(language, treeRef.tree.rootNode);
        return getQueryMatchTree(language, results, treeRef.tree.rootNode);
    }
    finally {
        treeRef.dispose();
    }
}
async function _getSemanticChunkNames(language, source) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const results = querySemanticTargets(language, treeRef.tree.rootNode);
        return getBlockNameTree(language, results, treeRef.tree.rootNode);
    }
    finally {
        treeRef.dispose();
    }
}
/**
 * Get the positions of all function bodies nodes in the given piece of source code.
 */
async function _getFunctionBodies(language, source) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const results = queryFunctions(language, treeRef.tree.rootNode);
        const positions = results.map(res => {
            const fn = res.captures.find(c => c.name === 'body').node;
            return {
                startIndex: fn.startIndex,
                endIndex: fn.endIndex,
            };
        });
        return positions;
    }
    finally {
        treeRef.dispose();
    }
}
async function _getCoarseParentScope(language, source, range) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const scopes = queryCoarseScopes(language, treeRef.tree.rootNode);
        let parentNode;
        for (const scope of scopes) {
            const captureNode = scope.captures[0].node;
            const captureNodeRange = nodes_1.TreeSitterPointRange.ofSyntaxNode(captureNode);
            if (nodes_1.TreeSitterPointRange.doesContain(captureNodeRange, range)) {
                parentNode = captureNode;
            }
            if (nodes_1.TreeSitterPoint.isBefore(range.endPosition, captureNodeRange.startPosition)) {
                break;
            }
        }
        if (!parentNode) {
            throw new Error('No parent node found');
        }
        else {
            return nodes_1.TreeSitterPointRange.ofSyntaxNode(parentNode);
        }
    }
    finally {
        treeRef.dispose();
    }
}
/**
 * Find the selection of interest for the /fix command
 */
async function _getFixSelectionOfInterest(language, source, range, maxNumberOfLines) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const smallestNode = treeRef.tree.rootNode.descendantForPosition(range.startPosition, range.endPosition);
        const initialRange = { startPosition: smallestNode.startPosition, endPosition: smallestNode.endPosition };
        const biggestRange = _getBiggestRangeContainingNodeSmallerThan(language, smallestNode, maxNumberOfLines, range, true);
        if (nodes_1.TreeSitterPointRange.equals(initialRange, biggestRange)) {
            return _getSmallestRangeContainingNode(language, smallestNode);
        }
        return biggestRange;
    }
    finally {
        treeRef.dispose();
    }
}
/**
 * Find the smallest range containing the node
 */
function _getSmallestRangeContainingNode(language, node) {
    const parent = node.parent;
    const range = { startPosition: node.startPosition, endPosition: node.endPosition };
    if ((0, treeSitterQueries_1._isScope)(language, node) || !parent) {
        return range;
    }
    const { filteredRanges, indexOfInterest } = _findFilteredRangesAndIndexOfInterest(language, parent.children, range, false);
    if (indexOfInterest - 1 >= 0 && indexOfInterest + 1 <= filteredRanges.length - 1) {
        const siblingAbove = filteredRanges[indexOfInterest - 1];
        const siblingBelow = filteredRanges[indexOfInterest + 1];
        return { startPosition: siblingAbove.startPosition, endPosition: siblingBelow.endPosition };
    }
    return _getSmallestRangeContainingNode(language, parent);
}
/**
 * Get the biggest range containing the node of length smaller than the max number of lines
 */
function _getBiggestRangeContainingNodeSmallerThan(language, node, maxNumberOfLines, range, firstCall) {
    const children = node.children;
    const lengthSpannedByNode = node.endPosition.row - node.startPosition.row + 1;
    if (lengthSpannedByNode <= maxNumberOfLines) {
        const newRange = (0, treeSitterQueries_1._isScope)(language, node) ?
            { startPosition: node.startPosition, endPosition: node.endPosition } :
            _getBiggestRangeContainingNodeAmongNodesSmallerThan(language, children, maxNumberOfLines, range, firstCall);
        const parent = node.parent;
        return parent ? _getBiggestRangeContainingNodeSmallerThan(language, parent, maxNumberOfLines, newRange, false) : newRange;
    }
    return _getBiggestRangeContainingNodeAmongNodesSmallerThan(language, children, maxNumberOfLines, range, firstCall);
}
function _numberOfLinesSpannedByRanges(range1, range2) {
    return range2.endPosition.row - range1.startPosition.row + 1;
}
/**
 * Search the nodes and find the biggest range made of statements or scopes that surrounds the range
 */
function _getBiggestRangeContainingNodeAmongNodesSmallerThan(language, nodes, maxNumberOfLines, lastRange, firstCall) {
    if (nodes.length === 0) {
        return lastRange;
    }
    const { filteredRanges, indexOfInterest } = _findFilteredRangesAndIndexOfInterest(language, nodes, lastRange, firstCall);
    let siblingAboveIndex = 0;
    let siblingBelowIndex = filteredRanges.length - 1;
    let siblingAbove = filteredRanges[siblingAboveIndex];
    let siblingBelow = filteredRanges[siblingBelowIndex];
    while (_numberOfLinesSpannedByRanges(siblingAbove, siblingBelow) > maxNumberOfLines) {
        if (siblingAboveIndex === siblingBelowIndex) {
            // The two indices are equal to the insertion index
            break;
        }
        else if (indexOfInterest - siblingAboveIndex < siblingBelowIndex - indexOfInterest) {
            siblingBelowIndex--;
            siblingBelow = filteredRanges[siblingBelowIndex];
        }
        else {
            siblingAboveIndex++;
            siblingAbove = filteredRanges[siblingAboveIndex];
        }
    }
    if (_numberOfLinesSpannedByRanges(siblingAbove, siblingBelow) <= maxNumberOfLines) {
        return { startPosition: siblingAbove.startPosition, endPosition: siblingBelow.endPosition };
    }
    return lastRange;
}
/**
 * Filter the nodes that are scopes or statements and find the index of the node containing the given range, or append the range to the array
 */
function _findFilteredRangesAndIndexOfInterest(language, nodes, range, firstCall) {
    let filteredRanges;
    let indexOfInterest;
    if (firstCall) {
        filteredRanges = nodes.filter((child) => (0, treeSitterQueries_1._isScope)(language, child) || (0, treeSitterQueries_1._isStatement)(language, child));
        indexOfInterest = (0, arrays_1.findInsertionIndexInSortedArray)(filteredRanges, range, (a, b) => nodes_1.TreeSitterPoint.isBefore(a.startPosition, b.startPosition));
        filteredRanges.splice(indexOfInterest, 0, range);
    }
    else {
        filteredRanges = nodes.filter((child) => nodes_1.TreeSitterPointRange.doesContain(child, range) || (0, treeSitterQueries_1._isScope)(language, child) || (0, treeSitterQueries_1._isStatement)(language, child));
        indexOfInterest = filteredRanges.findIndex(child => nodes_1.TreeSitterPointRange.doesContain(child, range));
    }
    if (indexOfInterest === -1) {
        throw new Error(`Valid index not found`);
    }
    return { filteredRanges, indexOfInterest };
}
async function _getFineScopes(language, source, selection) {
    const blockScopes = [];
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    const syntaxNode = treeRef.tree.rootNode.descendantForIndex(selection.startIndex, selection.endIndex);
    let currentNode = syntaxNode;
    // Ascend the parse tree until we reach the root node, collecting all block scopes that intersect with the provided selection
    while (currentNode !== null) {
        if ((0, treeSitterQueries_1._isFineScope)(language, currentNode)) {
            blockScopes.push({ startIndex: currentNode.startIndex, endIndex: currentNode.endIndex });
        }
        currentNode = currentNode.parent;
    }
    return blockScopes;
}
/**
 *
 * Given a selection around an identifier, returns the definition node.
 */
async function _getNodeToExplain(language, source, selection) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const isSelectionEmpty = selection.startIndex === selection.endIndex;
        if (isSelectionEmpty) {
            return;
        }
        const identifier = isSelectionEmpty ? undefined : (0, selectionParsing_1._getNodeMatchingSelection)(treeRef.tree, selection, language);
        const fullDefinition = isSelectionEmpty ? undefined : (0, selectionParsing_1._getNodeMatchingSelection)(treeRef.tree, selection, language, isExplainableNode);
        if (fullDefinition && identifier) {
            const nodeIdentifier = (0, util_1.extractIdentifier)(identifier, language);
            return {
                nodeIdentifier,
                nodeToExplain: nodes_1.Node.ofSyntaxNode(fullDefinition),
            };
        }
    }
    finally {
        treeRef.dispose();
    }
}
function isExplainableNode(node, language) {
    return node.type.match(/definition/);
}
function getBlockNameTree(language, queryMatches, root) {
    const matches = new Map(); // map nodes to their starting position to ensure that we get rid of duplicates
    queryMatches.forEach(n => {
        const captures = n.captures;
        let definitionNode = captures.find(v => v.name === 'definition')?.node;
        let keyword;
        if (language === treeSitterLanguages_1.WASMLanguage.Cpp && definitionNode?.type === 'function_definition') {
            keyword = definitionNode?.childForFieldName('declarator')?.childForFieldName('declarator');
        }
        else if (language === treeSitterLanguages_1.WASMLanguage.Rust && definitionNode?.type === 'impl_item') {
            keyword = definitionNode?.childForFieldName('trait');
        }
        else {
            keyword = definitionNode?.childForFieldName('name');
        }
        const bodyNode = definitionNode?.childForFieldName('body');
        if (definitionNode && bodyNode) {
            switch (language) {
                case treeSitterLanguages_1.WASMLanguage.TypeScript:
                case treeSitterLanguages_1.WASMLanguage.JavaScript: {
                    const { definition } = getCommentsAndDefFromTSJSDefinition(definitionNode);
                    definitionNode = definition;
                    break;
                }
            }
            const existingMatch = matches.get(definitionNode.id);
            if (!existingMatch) {
                matches.set(definitionNode.id, {
                    mainBlock: nodes_1.TreeSitterChunkHeaderInfo.ofSyntaxNode(definitionNode),
                    detailBlocks: {
                        body: nodes_1.TreeSitterChunkHeaderInfo.ofSyntaxNode(bodyNode),
                        name: keyword?.text,
                    },
                });
            }
        }
    });
    const groups = Array.from(matches.values());
    return new chunkGroupTypes_1.QueryMatchTree(groups, nodes_1.TreeSitterChunkHeaderInfo.ofSyntaxNode(root));
}
/**
 * helper workspace chunker functions
 */
function getQueryMatchTree(language, queryMatches, root) {
    let groups;
    switch (language) {
        case treeSitterLanguages_1.WASMLanguage.Python:
            groups = queryCapturesToPythonSemanticGroup(queryMatches);
            break;
        case treeSitterLanguages_1.WASMLanguage.Ruby:
            groups = queryCapturesToRubySemanticGroup(queryMatches);
            break;
        default: {
            groups = queryCapturesToGenericSemanticGroup(queryMatches, language);
            break;
        }
    }
    const queryTree = new chunkGroupTypes_1.QueryMatchTree(groups, nodes_1.TreeSitterChunkHeaderInfo.ofSyntaxNode(root));
    return queryTree;
}
function queryCapturesToGenericSemanticGroup(queryMatches, wasmLang) {
    const matches = new Map(); // map nodes to their starting position to ensure that we get rid of duplicates
    queryMatches
        .forEach(n => {
        const captures = n.captures;
        let definitionNode = captures.find(v => v.name === 'definition')?.node;
        const bodyNode = definitionNode?.childForFieldName('body');
        if (definitionNode && bodyNode) {
            let commentNodes;
            switch (wasmLang) {
                case treeSitterLanguages_1.WASMLanguage.TypeScript:
                case treeSitterLanguages_1.WASMLanguage.JavaScript: {
                    const { definition, comments } = getCommentsAndDefFromTSJSDefinition(definitionNode);
                    definitionNode = definition;
                    commentNodes = comments;
                    break;
                }
                case treeSitterLanguages_1.WASMLanguage.Java:
                case treeSitterLanguages_1.WASMLanguage.Rust:
                    commentNodes = getCommentsFromJavaRustDefinition(definitionNode);
                    break;
                default: {
                    commentNodes = getCommentsFromDefinition(definitionNode);
                    break;
                }
            }
            const existingMatch = matches.get(definitionNode.id);
            if (!existingMatch) {
                matches.set(definitionNode.id, {
                    mainBlock: nodes_1.TreeSitterChunkHeaderInfo.ofSyntaxNode(definitionNode),
                    detailBlocks: {
                        comments: commentNodes.map(e => nodes_1.TreeSitterChunkHeaderInfo.ofSyntaxNode(e)),
                        body: nodes_1.TreeSitterChunkHeaderInfo.ofSyntaxNode(bodyNode)
                    },
                });
            }
        }
    });
    return Array.from(matches.values());
}
function getFirstBodyParamForRuby(namedNodes) {
    // the children must have at least 2 nodes. The second node is the first potential body node, since the first is the identifier.
    if (namedNodes.length < 2) {
        return undefined;
    }
    for (let i = 1; i < namedNodes.length; i++) {
        const node = namedNodes[i];
        if (!node.type.includes('parameters')) {
            return node;
        }
    }
    return undefined;
}
function queryCapturesToRubySemanticGroup(queryMatches) {
    const matches = new Map(); // map nodes to their starting position to ensure that we get rid of duplicates
    queryMatches
        .forEach(n => {
        const captures = n.captures;
        const definitionNode = captures.find(v => v.name === 'definition')?.node;
        if (definitionNode) {
            const defChildren = definitionNode.namedChildren;
            const startChild = getFirstBodyParamForRuby(defChildren);
            if (startChild) {
                const endChild = defChildren[defChildren.length - 1];
                const childText = definitionNode.text.substring(startChild.startIndex - definitionNode.startIndex, endChild.endIndex - definitionNode.startIndex);
                const commentNodes = getCommentsFromDefinition(definitionNode);
                const existingMatch = matches.get(definitionNode.id);
                if (!existingMatch) {
                    matches.set(definitionNode.id, {
                        mainBlock: nodes_1.TreeSitterChunkHeaderInfo.ofSyntaxNode(definitionNode),
                        detailBlocks: {
                            comments: commentNodes.map(e => nodes_1.TreeSitterChunkHeaderInfo.ofSyntaxNode(e)),
                            body: {
                                range: {
                                    startPosition: { row: startChild.startPosition.row, column: startChild.startPosition.column },
                                    endPosition: { row: endChild.endPosition.row, column: endChild.endPosition.column }
                                },
                                startIndex: startChild.startIndex,
                                text: childText,
                                endIndex: endChild.endIndex,
                            }
                        },
                    });
                }
            }
        }
    });
    return Array.from(matches.values());
}
function queryCapturesToPythonSemanticGroup(queryMatches) {
    const matches = new Map(); // map nodes to their starting position to ensure that we get rid of duplicates
    queryMatches
        .forEach(n => {
        const captures = n.captures;
        const definitionNode = captures.find(v => v.name === 'definition')?.node;
        const bodyNode = definitionNode?.childForFieldName('body');
        if (definitionNode && bodyNode) {
            const docstringNode = getDocstringFromBody(bodyNode);
            const decoratorNode = getDecoratorFromDefinition(definitionNode);
            matches.set(definitionNode.id, {
                mainBlock: nodes_1.TreeSitterChunkHeaderInfo.ofSyntaxNode(definitionNode),
                detailBlocks: {
                    docstring: docstringNode ? nodes_1.TreeSitterChunkHeaderInfo.ofSyntaxNode(docstringNode) : undefined,
                    decorator: decoratorNode ? nodes_1.TreeSitterChunkHeaderInfo.ofSyntaxNode(decoratorNode) : undefined,
                    body: nodes_1.TreeSitterChunkHeaderInfo.ofSyntaxNode(bodyNode),
                },
            });
            return;
        }
    });
    return Array.from(matches.values());
}
/**
 * For Generic (Cpp/Cs/Go) workspace chunks
 */
function getCommentsFromDefinition(definition, commentNodeNames = ['comment']) {
    // there is an issue where the query sometimes returns comments that are at the beginning of the file
    // instead of one that actually close to the declaration.
    // Therefore, we should programatically find comments for more reliability
    const ret = [];
    let prevSibling = definition.previousNamedSibling;
    while (prevSibling && commentNodeNames.some(e => e === prevSibling?.type)) {
        ret.push(prevSibling);
        prevSibling = prevSibling.previousNamedSibling;
    }
    return ret.reverse();
}
/**
 * For TS/JS workspace chunks
 */
function getCommentsAndDefFromTSJSDefinition(definition) {
    const parent = definition.parent;
    if (parent?.type === 'export_statement') {
        return {
            definition: parent,
            comments: getCommentsFromDefinition(parent)
        };
    }
    return {
        definition: definition,
        comments: getCommentsFromDefinition(definition)
    };
}
/**
 * For Java workspace chunks
 */
function getCommentsFromJavaRustDefinition(definition) {
    return getCommentsFromDefinition(definition, ['block_comment', 'line_comment']);
}
/**
 * For Python workspace chunks
 */
function getDecoratorFromDefinition(definition) {
    const prevSibling = definition.previousNamedSibling;
    return prevSibling?.type === 'decorator' ? prevSibling : undefined;
}
function getDocstringFromBody(body) {
    const firstChild = body.firstChild;
    if (!firstChild || firstChild.type !== 'expression_statement') {
        return;
    }
    const potentialDocstring = firstChild.firstChild;
    return potentialDocstring?.type === 'string' ? potentialDocstring : undefined;
}
function _getStructure(lang, source) {
    return structure_1.structureComputer.getStructure(lang, source);
}
async function _getParseErrorCount(language, source) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        if (!treeRef.tree.rootNode.hasError) {
            return 0;
        }
        // Recursively count error nodes
        function countErrors(node) {
            let count = node.type === 'ERROR' ? 1 : 0;
            for (const child of node.children) {
                count += countErrors(child);
            }
            return count;
        }
        return countErrors(treeRef.tree.rootNode);
    }
    finally {
        treeRef.dispose();
    }
}
//# sourceMappingURL=parserImpl.js.map