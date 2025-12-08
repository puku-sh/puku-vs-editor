"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports._getNodeToDocument = _getNodeToDocument;
exports._getDocumentableNodeIfOnIdentifier = _getDocumentableNodeIfOnIdentifier;
const nodes_1 = require("./nodes");
const parserWithCaching_1 = require("./parserWithCaching");
const selectionParsing_1 = require("./selectionParsing");
const util_1 = require("./util");
/**
 * Starting from the smallest AST node that wraps `selection` and climbs up the AST until it sees a "documentable" node.
 * See {@link isDocumentableNode} for definition of a "documentable" node.
 *
 * @param language The language ID of the source code.
 * @param source The source code to parse.
 * @param selection The range to document.
 * @returns An object containing the smallest node containing the selection range, its parent node, the node to document, and the number of nodes climbed up to reach the documentable node.
 * 			Returns undefined if the language ID is not supported.
 */
async function _getNodeToDocument(language, source, selection) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        // if selection is non-empty, try identify a documentable AST node that most matches the selection
        // otherwise, try to find the smallest documentable AST node that wraps the selection
        const isSelectionEmpty = selection.startIndex === selection.endIndex;
        const selectionMatchedNode = isSelectionEmpty ? undefined : (0, selectionParsing_1._getNodeMatchingSelection)(treeRef.tree, selection, language);
        if (selectionMatchedNode) {
            const nodeIdentifier = (0, util_1.extractIdentifier)(selectionMatchedNode, language);
            return {
                nodeIdentifier,
                nodeToDocument: nodes_1.Node.ofSyntaxNode(selectionMatchedNode),
                nodeSelectionBy: 'matchingSelection'
            };
        }
        const nodeContainingCursor = treeRef.tree.rootNode.descendantForIndex(selection.startIndex, selection.endIndex);
        let nodeToDocument = nodeContainingCursor;
        let nNodesClimbedUp = 0;
        // ascend the parse tree until we find a declaration/definition (documentable) node or reach the root node
        while (!(0, util_1.isDocumentableNode)(nodeToDocument, language) && nodeToDocument.parent !== null) {
            nodeToDocument = nodeToDocument.parent;
            ++nNodesClimbedUp;
        }
        const nodeIdentifier = (0, util_1.extractIdentifier)(nodeToDocument, language);
        return {
            nodeIdentifier,
            nodeToDocument: nodes_1.Node.ofSyntaxNode(nodeToDocument),
            nodeSelectionBy: 'expanding',
        };
    }
    finally {
        treeRef.dispose();
    }
}
async function _getDocumentableNodeIfOnIdentifier(language, source, range) {
    const treeRef = await (0, parserWithCaching_1._parse)(language, source);
    try {
        const smallestNodeContainingRange = treeRef.tree.rootNode.descendantForIndex(range.startIndex, range.endIndex);
        if (smallestNodeContainingRange.type.match(/identifier/) &&
            (smallestNodeContainingRange.parent === null || (0, util_1.isDocumentableNode)(smallestNodeContainingRange.parent, language))) {
            const parent = smallestNodeContainingRange.parent;
            const parentNodeRange = parent === null
                ? undefined
                : { startIndex: parent.startIndex, endIndex: parent.endIndex };
            return {
                identifier: smallestNodeContainingRange.text,
                nodeRange: parentNodeRange
            };
        }
    }
    finally {
        treeRef.dispose();
    }
}
//# sourceMappingURL=docGenParsing.js.map