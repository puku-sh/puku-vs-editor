"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverlayNode = exports.TreeSitterChunkHeaderInfo = exports.Node = exports.TreeSitterPointRange = exports.TreeSitterPoint = exports.TreeSitterOffsetRange = void 0;
const errors_1 = require("../../../util/vs/base/common/errors");
/** Util functions to deal with `TreeSitterOffsetRange` type */
exports.TreeSitterOffsetRange = {
    /** check if `container` contains `containee` (non-strict, ie [0, 3] contains [0, 3] */
    doesContain: (container, containee) => container.startIndex <= containee.startIndex && containee.endIndex <= container.endIndex,
    ofSyntaxNode: (n) => ({ startIndex: n.startIndex, endIndex: n.endIndex }),
    /** sort by `node.startIndex`, break ties by `node.endIndex` (so that nodes with same start index are sorted in descending order) */
    compare: (a, b) => a.startIndex - b.startIndex || b.endIndex - a.endIndex,
    isEqual: (a, b) => exports.TreeSitterOffsetRange.compare(a, b) === 0,
    doIntersect: (a, b) => {
        const start = Math.max(a.startIndex, b.startIndex);
        const end = Math.min(a.endIndex, b.endIndex);
        return start < end;
    },
    len: (n) => n.endIndex - n.startIndex,
    /** Given offset ranges [a0, a1] and [b0, b1], returns overlap size */
    intersectionSize: (a, b) => {
        const start = Math.max(a.startIndex, b.startIndex);
        const end = Math.min(a.endIndex, b.endIndex);
        return Math.max(end - start, 0);
    },
    /** Check the given object extends TreeSitterOffsetRange  */
    isTreeSitterOffsetRange(obj) {
        return typeof obj.startIndex === 'number' && typeof obj.endIndex === 'number';
    },
};
exports.TreeSitterPoint = {
    isEqual(n, other) {
        return n.row === other.row && n.column === other.column;
    },
    isBefore(n, other) {
        if (n.row < other.row || (n.row === other.row && n.column < other.column)) {
            return true;
        }
        return false;
    },
    isAfter(n, other) {
        return exports.TreeSitterPoint.isBefore(other, n);
    },
    isBeforeOrEqual(n, other) {
        const isBefore = exports.TreeSitterPoint.isBefore(n, other);
        const isEqual = exports.TreeSitterPoint.isEqual(n, other);
        if (isBefore || isEqual) {
            return true;
        }
        return false;
    },
    equals(n, other) {
        return n.column === other.column && n.row === other.row;
    },
    isAfterOrEqual(n, other) {
        return exports.TreeSitterPoint.isBeforeOrEqual(other, n);
    },
    ofPoint: (n) => ({
        row: n.row,
        column: n.column
    }),
};
exports.TreeSitterPointRange = {
    /** check if `container` contains `containee` (non-strict) */
    doesContain: (container, containee) => {
        return exports.TreeSitterPoint.isBeforeOrEqual(container.startPosition, containee.startPosition) && exports.TreeSitterPoint.isAfterOrEqual(container.endPosition, containee.endPosition);
    },
    equals: (a, b) => {
        return exports.TreeSitterPoint.equals(a.startPosition, b.startPosition) && exports.TreeSitterPoint.equals(a.endPosition, b.endPosition);
    },
    ofSyntaxNode: (n) => ({
        startPosition: n.startPosition,
        endPosition: n.endPosition
    }),
};
exports.Node = {
    ofSyntaxNode: (n) => ({
        type: n.type,
        startIndex: n.startIndex,
        endIndex: n.endIndex,
    }),
};
exports.TreeSitterChunkHeaderInfo = {
    ofSyntaxNode: (n) => ({
        range: exports.TreeSitterPointRange.ofSyntaxNode(n),
        startIndex: n.startIndex,
        text: n.text,
        endIndex: n.endIndex,
    }),
};
/**
 * Represents a node in the overlay tree.
 */
class OverlayNode {
    constructor(startIndex, endIndex, 
    /**
     * @example `class_declaration`
     */
    kind, // TODO@ulugbekna: come up with more generic kinds so that these aren't per-language, then use enum?
    children) {
        this.startIndex = startIndex;
        this.endIndex = endIndex;
        this.kind = kind;
        this.children = children;
        if (startIndex > endIndex) {
            throw new errors_1.BugIndicatingError('startIndex must be less than endIndex');
        }
        let minStartIndex = startIndex;
        for (const child of children) {
            if (child.startIndex < minStartIndex) {
                throw new errors_1.BugIndicatingError('Invalid child startIndex');
            }
            if (child.endIndex > endIndex) {
                throw new errors_1.BugIndicatingError('Invalid child endIndex');
            }
            minStartIndex = Math.max(child.endIndex, minStartIndex);
        }
    }
    toString() {
        const printedNodes = [];
        function toString(node, indent = '') {
            printedNodes.push(`${indent}${node.kind} [${node.startIndex}, ${node.endIndex}]`);
            node.children.forEach(child => toString(child, indent + '    '));
        }
        toString(this);
        return printedNodes.join('\n');
    }
}
exports.OverlayNode = OverlayNode;
//# sourceMappingURL=nodes.js.map