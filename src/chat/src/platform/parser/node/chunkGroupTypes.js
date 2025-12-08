"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryMatchTree = void 0;
const nodes_1 = require("./nodes");
/**
 * This tree is like the `Parser.SyntaxTree` that we have when we use TreeSitter to parse,
 * but it only has the `MatchGroups` that get passed into the constructor.
 *
 * It sorts the `MatchGroups` into its own hierarchy.
 *
 * This assumes that the constructor's `blockInfos` are a part of the same syntax tree.
 */
class QueryMatchTree {
    /**
     * @remark mutates the passed `groups`
     */
    constructor(groups, syntaxTreeRoot) {
        this.syntaxTreeRoot = syntaxTreeRoot;
        this.roots = [];
        this.formTree(groups);
    }
    /**
     * This assumes that overlapping blocks imply that one fully overlaps another.
     * Runs with the same assumptions as `removeOverlapping`.
     * @param groups to use as node content in the tree
     */
    formTree(groups) {
        groups
            .sort((a, b) => a.mainBlock.startIndex - b.mainBlock.startIndex || a.mainBlock.endIndex - b.mainBlock.endIndex);
        const recentParentStack = [];
        const peekParent = () => {
            return recentParentStack[recentParentStack.length - 1];
        };
        const hasEqualRange = (a, b) => {
            return (a.mainBlock.startIndex === b.mainBlock.startIndex &&
                a.mainBlock.endIndex === b.mainBlock.endIndex);
        };
        for (const group of groups) {
            const matchNode = {
                info: group,
                children: []
            };
            let currParent = peekParent();
            if (!currParent) {
                this.roots.push(matchNode);
                recentParentStack.push(matchNode);
                continue;
            }
            if (hasEqualRange(currParent.info, group)) {
                // any duplicate nodes will always be one after another
                continue;
            }
            while (currParent && !nodes_1.TreeSitterOffsetRange.doesContain(currParent.info.mainBlock, group.mainBlock)) {
                recentParentStack.pop();
                currParent = peekParent();
            }
            if (currParent) {
                currParent.children.push(matchNode);
            }
            else {
                this.roots.push(matchNode);
            }
            recentParentStack.push(matchNode);
        }
    }
}
exports.QueryMatchTree = QueryMatchTree;
//# sourceMappingURL=chunkGroupTypes.js.map