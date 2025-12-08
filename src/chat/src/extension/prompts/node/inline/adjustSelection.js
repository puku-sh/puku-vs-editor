"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedOverlayNode = void 0;
exports.getAdjustedSelection = getAdjustedSelection;
const nodes_1 = require("../../../../platform/parser/node/nodes");
const arrays_1 = require("../../../../util/vs/base/common/arrays");
const errors_1 = require("../../../../util/vs/base/common/errors");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
function getAdjustedSelection(ast, document, userSelection) {
    const documentText = document.getText();
    const astWithoutWs = alignOverlayNodesToNonWsText(ast, documentText);
    const root = LinkedOverlayNode.convertToLinkedTree(documentText, astWithoutWs ?? ast);
    const start = document.getOffsetAtPosition(userSelection.start);
    const end = document.getOffsetAtPosition(userSelection.end);
    const adjustedSelection = markSelectedNodes(root, start, end);
    return { adjusted: adjustedSelection, original: new offsetRange_1.OffsetRange(start, end) };
}
function alignOverlayNodesToNonWsText(ast, text) {
    const newStartIndex = alignToNonWsTextRight(ast.startIndex, text);
    const newEndIndex = Math.max(newStartIndex, alignToNonWsTextLeft(ast.endIndex, text));
    if (newStartIndex === newEndIndex) { // indentation-based structure can include nodes which can just contain newlines
        return undefined;
    }
    const arr = ast.children.map(child => alignOverlayNodesToNonWsText(child, text)).filter(s => s !== undefined);
    if (newStartIndex === ast.startIndex && newEndIndex === ast.endIndex && (0, arrays_1.equals)(arr, ast.children)) {
        return ast;
    }
    return new nodes_1.OverlayNode(newStartIndex, newEndIndex, ast.kind, arr);
}
function alignToNonWsTextRight(idx, str) {
    while (idx < str.length) {
        const ch = str.charCodeAt(idx);
        if (ch !== 32 /* CharCode.Space */ && ch !== 9 /* CharCode.Tab */ && ch !== 10 /* CharCode.LineFeed */ && ch !== 13 /* CharCode.CarriageReturn */) {
            return idx;
        }
        idx++;
    }
    return idx;
}
function alignToNonWsTextLeft(idx, str) {
    while (idx > 0) {
        const ch = str.charCodeAt(idx - 1);
        if (ch !== 32 /* CharCode.Space */ && ch !== 9 /* CharCode.Tab */ && ch !== 10 /* CharCode.LineFeed */ && ch !== 13 /* CharCode.CarriageReturn */) {
            return idx;
        }
        idx--;
    }
    return idx;
}
function markSelectedNodes(root, start, end) {
    [start, end] = moveTowardsContent(root, start, end);
    return adjustSelection(root, start, end);
}
/**
 * If the selection sits on whitespace, move it towards the closest content
 */
function moveTowardsContent(root, initialStart, initialEnd) {
    const selectedText = root.text.substring(initialStart, initialEnd);
    const selectedTextIsEmptyOrWhitespace = /^\s*$/.test(selectedText);
    if (!selectedTextIsEmptyOrWhitespace) {
        return [initialStart, initialEnd];
    }
    let start = initialStart;
    let end = initialEnd;
    let goLeft = true;
    let goRight = true;
    do {
        if (goRight && end >= root.text.length) {
            // can't go right anymore
            goRight = false;
        }
        if (goRight) {
            const nextCharCode = root.text.charCodeAt(end);
            if (nextCharCode === 13 /* CharCode.CarriageReturn */ || nextCharCode === 10 /* CharCode.LineFeed */) {
                // Hit the EOL
                goRight = false;
            }
            else if (nextCharCode !== 32 /* CharCode.Space */ && nextCharCode !== 9 /* CharCode.Tab */) {
                // Hit real content
                return [end, end + 1];
            }
            else {
                end++;
            }
        }
        if (goLeft && start === 0) {
            // can't go left anymore
            goLeft = false;
        }
        if (goLeft) {
            const prevCharCode = root.text.charCodeAt(start - 1);
            if (prevCharCode === 13 /* CharCode.CarriageReturn */ || prevCharCode === 10 /* CharCode.LineFeed */) {
                // Hit the EOL
                goLeft = false;
            }
            else if (prevCharCode !== 32 /* CharCode.Space */ && prevCharCode !== 9 /* CharCode.Tab */) {
                // Hit real content
                return [start - 1, start];
            }
            else {
                start--;
            }
        }
    } while (goLeft || goRight);
    // Couldn't find real content
    return [initialStart, initialEnd];
}
function adjustSelection(root, start, end) {
    // If the selection starts at the end of a line with content, move over the line feed
    if (start > 0 && start < end && root.text.charCodeAt(start - 1) !== 10 /* CharCode.LineFeed */ && root.text.charCodeAt(start) === 10 /* CharCode.LineFeed */) {
        start++;
    }
    start = moveToStartOfLineOverWhitespace(root, start);
    end = moveToEndOfLineOverWhitespace(root, end);
    let startNode = root.findLeaf2(start);
    let endNode = root.findLeaf2(end);
    let hasChanged = false;
    const extendStart = (newStart) => {
        if (newStart < start) {
            start = moveToStartOfLineOverWhitespace(root, newStart);
            hasChanged = true;
            startNode = root.findLeaf2(start);
        }
    };
    const extendEnd = (newEnd) => {
        if (newEnd > end) {
            end = moveToEndOfLineOverWhitespace(root, newEnd);
            hasChanged = true;
            endNode = root.findLeaf2(end);
        }
    };
    do {
        hasChanged = false;
        if (startNode instanceof LinkedOverlayNodeGap) {
            const matchingGap = (startNode.isFirstGapInParent ? startNode.parent.lastGap : null);
            const hasSelectedContentInGap = startNode.hasSelectedContent(start, end);
            const hasSelectedContentInMatchingGap = (matchingGap && matchingGap.hasSelectedContent(start, end));
            const extendSelection = (hasSelectedContentInGap || hasSelectedContentInMatchingGap);
            if (extendSelection) {
                extendStart(startNode.firstNonWhitespaceIndex);
            }
            if (extendSelection && matchingGap) {
                extendEnd(matchingGap.lastNonWhitespaceIndex + 1);
            }
        }
        if (endNode instanceof LinkedOverlayNodeGap) {
            const matchingFirstGap = (endNode.isLastGapInParent ? endNode.parent.firstGap : null);
            const hasSelectedContentInGap = endNode.hasSelectedContent(start, end);
            const hasSelectedContentInFirstGap = (matchingFirstGap && matchingFirstGap.hasSelectedContent(start, end));
            const extendSelection = (hasSelectedContentInGap || hasSelectedContentInFirstGap);
            if (extendSelection && endNode.lastNonWhitespaceIndex + 1 > end) {
                extendEnd(endNode.lastNonWhitespaceIndex + 1);
            }
            if (extendSelection && matchingFirstGap) {
                extendStart(matchingFirstGap.firstNonWhitespaceIndex);
            }
        }
        if (startNode instanceof LinkedOverlayNode && root.hasContentInRange(new offsetRange_1.OffsetRange(start, end))) {
            // Hit a leaf!
            if (startNode.startIndex < start) {
                extendStart(startNode.startIndex);
            }
        }
        if (endNode instanceof LinkedOverlayNode && root.hasContentInRange(new offsetRange_1.OffsetRange(start, end))) {
            // Hit a leaf!
            if (endNode.endIndex > end) {
                extendEnd(endNode.endIndex);
            }
        }
    } while (hasChanged);
    return new offsetRange_1.OffsetRange(start, end);
}
function moveToStartOfLineOverWhitespace(root, start) {
    // Move start to the start of the line if it only goes over whitespace
    while (start > 0) {
        const charCodeBeforeSelection = root.text.charCodeAt(start - 1);
        if (charCodeBeforeSelection !== 32 /* CharCode.Space */ && charCodeBeforeSelection !== 9 /* CharCode.Tab */) {
            break;
        }
        start--;
    }
    return start;
}
function moveToEndOfLineOverWhitespace(root, end) {
    const charCodeBefore = end > 0 ? root.text.charCodeAt(end - 1) : 0 /* CharCode.Null */;
    if (charCodeBefore === 10 /* CharCode.LineFeed */) {
        // Do not leave first character of the line
        return end;
    }
    // Move end to the end of the line if it only goes over whitespace
    while (end < root.text.length) {
        const charCodeAfterSelection = root.text.charCodeAt(end);
        if (charCodeAfterSelection !== 32 /* CharCode.Space */ && charCodeAfterSelection !== 9 /* CharCode.Tab */) {
            break;
        }
        end++;
    }
    return end;
}
function debugstr(str) {
    return str.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
}
/**
 * A tree datastructure which has parent pointers and markers if a node will survive or not.
 */
class LinkedOverlayNode {
    static convertToLinkedTree(text, root) {
        const linkedRoot = new LinkedOverlayNode(text, null, root.startIndex, root.endIndex, root.kind, [], 0); // parentChildIndex
        LinkedOverlayNode._convertChildrenToLinkedTree(text, root, linkedRoot); // Start with depth 1
        return linkedRoot;
    }
    static _convertChildrenToLinkedTree(text, overlayNode, linkedNode) {
        for (let i = 0; i < overlayNode.children.length; i++) {
            const child = overlayNode.children[i];
            const linkedChild = new LinkedOverlayNode(text, linkedNode, child.startIndex, child.endIndex, child.kind, [], i);
            linkedNode.children.push(linkedChild);
            LinkedOverlayNode._convertChildrenToLinkedTree(text, child, linkedChild);
        }
    }
    constructor(_originalText, parent, startIndex, endIndex, kind, // TODO@ulugbekna: come up with more generic kinds so that these aren't per-language, then use enum?
    children, myIndex) {
        this._originalText = _originalText;
        this.parent = parent;
        this.startIndex = startIndex;
        this.endIndex = endIndex;
        this.kind = kind;
        this.children = children;
        this.myIndex = myIndex;
    }
    get text() {
        return this._originalText.substring(this.startIndex, this.endIndex);
    }
    textAt(range) {
        return range.substring(this._originalText);
    }
    /**
     * Intersects the selection with this node's range to check if there is any non-whitespace text selected from this gap.
     */
    hasContentInRange(range) {
        const content = this.textAt(range);
        return !/^\s*$/s.test(content);
    }
    toString() {
        return `Node (${this.startIndex}-${this.endIndex}) ${debugstr(this._originalText.substring(this.startIndex, this.endIndex))}`;
    }
    gapBeforeChild(childIndex) {
        const startIndex = (childIndex === 0 ? this.startIndex : this.children[childIndex - 1].endIndex);
        const endIndex = (childIndex === this.children.length ? this.endIndex : this.children[childIndex].startIndex);
        return new LinkedOverlayNodeGap(this._originalText, this, startIndex, endIndex, childIndex);
    }
    childAt(childIndex) {
        return this.children[childIndex] ?? null;
    }
    get firstGap() {
        if (this.children.length === 0) {
            // there are no gaps
            return null;
        }
        return this.gapBeforeChild(0);
    }
    get lastGap() {
        if (this.children.length === 0) {
            // there are no gaps
            return null;
        }
        return this.gapBeforeChild(this.children.length);
    }
    /**
     * @return The deepest node which contains the offset. If the node is a leaf, the second pair result is 0.
     *   If the node is not a leaf, the second pair result will be -(n+1) (or ~n, using bitwise notation),
     *   where n is the index of the child before which the offset lies. (i.e. offset lies between children n-1 and n)
     */
    findLeaf(offset) {
        if (this.children.length === 0) {
            return [this, 0];
        }
        const index = (0, arrays_1.binarySearch2)(this.children.length, (index) => {
            const child = this.children[index];
            if (offset >= child.startIndex && offset <= child.endIndex) {
                return 0;
            }
            else if (offset < child.startIndex) {
                return 1;
            }
            else {
                return -1;
            }
        });
        if (index < 0) {
            return [this, index];
        }
        return this.children[index].findLeaf(offset);
    }
    findLeaf2(offset) {
        const [leaf, leafChildGapIndex] = this.findLeaf(offset);
        if (leafChildGapIndex < 0) {
            return leaf.gapBeforeChild(~leafChildGapIndex);
        }
        return leaf;
    }
    get nextLeaf() {
        let currentNode = this;
        do {
            const nextSibling = currentNode.nextSibling;
            if (nextSibling) {
                return nextSibling.leftMostLeafChild;
            }
            // go up until finding a next sibling
            currentNode = currentNode.parent;
        } while (currentNode);
        return null;
    }
    get leftMostLeafChild() {
        let currentNode = this;
        while (currentNode.children.length > 0) {
            currentNode = currentNode.children[0];
        }
        return currentNode;
    }
    get prevSibling() {
        const parent = this.parent;
        const prevIndex = this.myIndex - 1;
        return (parent && prevIndex >= 0) ? parent.children[prevIndex] : null;
    }
    get nextSibling() {
        const parent = this.parent;
        const nextIndex = this.myIndex + 1;
        return (parent && nextIndex < parent.children.length) ? parent.children[nextIndex] : null;
    }
}
exports.LinkedOverlayNode = LinkedOverlayNode;
/**
 * Represents a gap (before the first child, between two children, or after the last child) in a `LinkedOverlayNode`.
 */
class LinkedOverlayNodeGap {
    constructor(_originalText, parent, startIndex, endIndex, gapIndex) {
        this._originalText = _originalText;
        this.parent = parent;
        this.startIndex = startIndex;
        this.endIndex = endIndex;
        this.gapIndex = gapIndex;
        if (this.startIndex > this.endIndex) {
            throw new errors_1.BugIndicatingError('Invalid gap');
        }
    }
    get range() {
        return new offsetRange_1.OffsetRange(this.startIndex, this.endIndex);
    }
    get isFirstGapInParent() {
        return this.gapIndex === 0;
    }
    get isLastGapInParent() {
        return this.gapIndex === this.parent.children.length;
    }
    toString() {
        return `NodeGap (${this.startIndex}-${this.endIndex}) ${debugstr(this._originalText.substring(this.startIndex, this.endIndex))}`;
    }
    get text() {
        return this._originalText.substring(this.startIndex, this.endIndex);
    }
    /**
     * Intersects the selection with this node's range to check if there is any non-whitespace text selected from this gap.
     */
    hasSelectedContent(start, end) {
        const selectedGapRange = this.range.intersect(new offsetRange_1.OffsetRange(start, end));
        const selectedGapText = selectedGapRange ? this._originalText.substring(selectedGapRange.start, selectedGapRange.endExclusive) : '';
        return !/^\s*$/s.test(selectedGapText);
    }
    get firstNonWhitespaceIndex() {
        let index = this.startIndex;
        while (index < this.endIndex) {
            const charCode = this._originalText.charCodeAt(index);
            if (charCode !== 9 /* CharCode.Tab */ && charCode !== 32 /* CharCode.Space */ && charCode !== 10 /* CharCode.LineFeed */) {
                return index;
            }
            index++;
        }
        return this.endIndex;
    }
    get lastNonWhitespaceIndex() {
        let index = this.endIndex - 1;
        while (index >= this.startIndex) {
            const charCode = this._originalText.charCodeAt(index);
            if (charCode !== 9 /* CharCode.Tab */ && charCode !== 32 /* CharCode.Space */ && charCode !== 10 /* CharCode.LineFeed */) {
                return index;
            }
            index--;
        }
        return this.startIndex - 1;
    }
    get nextLeaf() {
        const nextSibling = this.parent.childAt(this.gapIndex);
        return nextSibling ? nextSibling.leftMostLeafChild : this.parent.nextLeaf;
    }
}
//# sourceMappingURL=adjustSelection.js.map