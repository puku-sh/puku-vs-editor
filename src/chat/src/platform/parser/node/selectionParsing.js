"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports._getNodeMatchingSelection = _getNodeMatchingSelection;
const arrays_1 = require("../../../util/common/arrays");
const nodes_1 = require("./nodes");
const util_1 = require("./util");
/**
 * This function is used to find the most relevant node to document in a parse tree.
 * It traverses the parse tree and keeps track of documentable nodes that could be used to generate documentation.
 * The relevance of a node is determined by its intersection with a given range (containerRange).
 * The function rewards nodes for which the overlap size constitutes a large part of the node and penalizes nodes for non-overlapping range.
 *
 * @remarks Exported for testing purposes only.
 *
 * @param parseTree - The parse tree to search for the most relevant node.
 * @param containerRange - The range to intersect with the nodes of the parse tree.
 * @param language - The language identifier used to determine if a node is documentable.
 * @returns The most relevant node to document or undefined if no such node is found.
 */
function _getNodeMatchingSelection(parseTree, containerRange, language, match = util_1.isDocumentableNode) {
    // nodes to explore
    let frontier = [parseTree.rootNode];
    // keeps documentable nodes that could be used to generate documentation for
    const documentableNodes = [];
    while (true) {
        // nodes that intersect with `containerRange`
        const candidates = frontier
            .map((node) => [node, nodes_1.TreeSitterOffsetRange.intersectionSize(node, containerRange)])
            .filter(([_, s]) => s > 0)
            .sort(([_, s0], [__, s1]) => s1 - s0);
        if (candidates.length === 0) {
            return documentableNodes.length === 0
                ? undefined
                : (0, arrays_1.max)(documentableNodes, ([_, s0], [__, s1]) => s0 - s1)[0];
        }
        else {
            const reweighedCandidates = candidates
                .map(([n, overlapSize]) => {
                const nLen = nodes_1.TreeSitterOffsetRange.len(n);
                const nonOverlappingSize = Math.abs(nodes_1.TreeSitterOffsetRange.len(containerRange) - overlapSize);
                // reward overlap size but penalize for non-overlapping range
                const penalizedWeigth = overlapSize - nonOverlappingSize;
                const normalizedPenalizedWeight = penalizedWeigth / nLen;
                return [n, normalizedPenalizedWeight];
            });
            documentableNodes.push(...reweighedCandidates.filter(([node, _]) => match(node, language)));
            frontier = [];
            frontier.push(...reweighedCandidates.flatMap(([n, s]) => n.children));
        }
    }
}
//# sourceMappingURL=selectionParsing.js.map