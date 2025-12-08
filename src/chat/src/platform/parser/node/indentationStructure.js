"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStructureUsingIndentation = getStructureUsingIndentation;
const errors_1 = require("../../../util/vs/base/common/errors");
const vscodeTypes_1 = require("../../../vscodeTypes");
const nodes_1 = require("./nodes");
function getStructureUsingIndentation(document, languageId, formattingOptions) {
    const lines = document.getText().split(/\r\n|\r|\n/g);
    const opts = formattingOptions || { tabSize: 4 };
    const simpleModel = {
        getLineCount: () => lines.length,
        getLineContent: (lineNumber) => lines[lineNumber - 1],
        getOptions: () => opts
    };
    try {
        const regions = generateFoldingRegions(simpleModel, languageId);
        const [foldingRanges,] = createFoldingRangeTree(document, regions, undefined);
        foldingRanges.adjust(document, isOffSide(languageId));
        return foldingRanges.toOverlayNode(document, true);
    }
    catch (err) {
        const foldingRanges = new FoldingRangeNode(1, document.getLineCount(), []);
        return foldingRanges.toOverlayNode(document, true);
    }
}
function createFoldingRangeTree(doc, regions, regionIndex) {
    if (typeof regionIndex !== 'undefined' && regionIndex >= regions.length) {
        throw new Error(`Invalid region index ${regionIndex}`);
    }
    const regionStartLineNumber = (typeof regionIndex === 'undefined' ? 1 : regions.getStartLineNumber(regionIndex));
    const regionEndLineNumber = (typeof regionIndex === 'undefined' ? doc.getLineCount() : regions.getEndLineNumber(regionIndex));
    const children = [];
    let childNode = null;
    regionIndex = (typeof regionIndex === 'undefined' ? 0 : regionIndex + 1);
    while (regionIndex < regions.length) {
        const startLineNumber = regions.getStartLineNumber(regionIndex);
        const endLineNumber = regions.getEndLineNumber(regionIndex);
        if (startLineNumber > regionEndLineNumber || endLineNumber > regionEndLineNumber) {
            // We are done with children of this region
            break;
        }
        const prevChildNode = childNode;
        [childNode, regionIndex] = createFoldingRangeTree(doc, regions, regionIndex);
        if (prevChildNode && childNode.startLineNumber <= prevChildNode.endLineNumber) {
            throw new errors_1.BugIndicatingError('Invalid Folding Ranges: overlapping children');
        }
        if (childNode.startLineNumber < regionStartLineNumber) {
            throw new errors_1.BugIndicatingError('Invalid Folding Ranges: child starts before parent');
        }
        children.push(childNode);
    }
    return [
        new FoldingRangeNode(regionStartLineNumber, regionEndLineNumber, children),
        regionIndex,
    ];
}
class FoldingRangeNode {
    constructor(startLineNumber, endLineNumber, children) {
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
        this.children = children;
        if (startLineNumber > endLineNumber) {
            throw new errors_1.BugIndicatingError('Invalid Folding Ranges: startLineNumber > endLineNumber');
        }
    }
    adjust(document, isOffside) {
        if (isOffside) {
            this._adjustOffside();
        }
        else {
            this._adjustRegular(document, document.getLineCount());
        }
    }
    _adjustOffside() {
        this.startLineNumber++;
        for (const child of this.children) {
            child._adjustOffside();
        }
    }
    _adjustRegular(document, maxEndLineNumber) {
        if (this.endLineNumber < maxEndLineNumber) {
            const nextLine = document.getLineText(this.endLineNumber).trim();
            const isClosingBracket = /^[\}\]\)];?$/.test(nextLine);
            const isClosingTag = /^<\/\w/.test(nextLine);
            if (isClosingBracket || isClosingTag) {
                this.endLineNumber++;
            }
        }
        for (let i = this.children.length - 1; i >= 0; i--) {
            const child = this.children[i];
            const childMaxEndLineNumber = (i + 1 < this.children.length ? this.children[i + 1].startLineNumber - 1 : maxEndLineNumber);
            child._adjustRegular(document, childMaxEndLineNumber);
        }
    }
    toOverlayNode(document, isRoot) {
        const children = [];
        let nextLineNumber = (isRoot && this.startLineNumber === 1 ? 1 : this.startLineNumber + 1);
        // for (let lineNumber = this.startLineNumber + 1;)
        for (const child of this.children) {
            // Generate a node for each skipped line
            for (let lineNumber = nextLineNumber; lineNumber < child.startLineNumber; lineNumber++) {
                const node = createOverlayNode(document, lineNumber, lineNumber, 'LINE', []);
                if (node) {
                    children.push(node);
                }
            }
            children.push(child.toOverlayNode(document, false));
            nextLineNumber = child.endLineNumber + 1;
        }
        // Generate a node for each skipped line
        for (let lineNumber = nextLineNumber; lineNumber < this.endLineNumber; lineNumber++) {
            const node = createOverlayNode(document, lineNumber, lineNumber, 'LINE', []);
            if (node) {
                children.push(node);
            }
        }
        return createOverlayNode(document, this.startLineNumber, this.endLineNumber, 'FOLD', children);
    }
}
function createOverlayNode(doc, startLineNumber, endLineNumber, kind, children) {
    const startOffset = doc.getOffsetAtPosition(new vscodeTypes_1.Position(startLineNumber - 1, 0));
    const endPosition = (endLineNumber < doc.getLineCount()
        ? new vscodeTypes_1.Position(endLineNumber, 0)
        : new vscodeTypes_1.Position(endLineNumber - 1, doc.getLineLength(endLineNumber - 1)));
    const endOffset = doc.getOffsetAtPosition(endPosition);
    return new nodes_1.OverlayNode(startOffset, endOffset, kind, children);
}
function generateFoldingRegions(model, languageId) {
    return _computeRanges(model, isOffSide(languageId));
}
function isOffSide(languageId) {
    return ['clojure', 'coffeescript', 'fsharp', 'latex', 'markdown', 'pug', 'python', 'sql', 'yaml'].includes(languageId);
}
function _computeRanges(model, offSide) {
    const tabSize = model.getOptions().tabSize;
    const result = new RangesCollector();
    const previousRegions = [];
    const line = model.getLineCount() + 1;
    previousRegions.push({ indent: -1, endAbove: line, line }); // sentinel, to make sure there's at least one entry
    for (let line = model.getLineCount(); line > 0; line--) {
        const lineContent = model.getLineContent(line);
        const indent = computeIndentLevel(lineContent, tabSize);
        let previous = previousRegions[previousRegions.length - 1];
        if (indent === -1) {
            if (offSide) {
                // for offSide languages, empty lines are associated to the previous block
                // note: the next block is already written to the results, so this only
                // impacts the end position of the block before
                previous.endAbove = line;
            }
            continue; // only whitespace
        }
        if (previous.indent > indent) {
            // discard all regions with larger indent
            do {
                previousRegions.pop();
                previous = previousRegions[previousRegions.length - 1];
            } while (previous.indent > indent);
            // new folding range
            const endLineNumber = previous.endAbove - 1;
            if (endLineNumber - line >= 1) { // needs at east size 1
                result.insertFirst(line, endLineNumber, indent);
            }
        }
        if (previous.indent === indent) {
            previous.endAbove = line;
        }
        else { // previous.indent < indent
            // new region with a bigger indent
            previousRegions.push({ indent, endAbove: line, line });
        }
    }
    return result.toIndentRanges();
}
const MAX_FOLDING_REGIONS = 0xFFFF;
const MAX_LINE_NUMBER = 0xFFFFFF;
const MASK_INDENT = 0xFF000000;
class RangesCollector {
    constructor() {
        this._startIndexes = [];
        this._endIndexes = [];
        this._indentOccurrences = [];
        this._length = 0;
    }
    insertFirst(startLineNumber, endLineNumber, indent) {
        if (startLineNumber > MAX_LINE_NUMBER || endLineNumber > MAX_LINE_NUMBER) {
            return;
        }
        const index = this._length;
        this._startIndexes[index] = startLineNumber;
        this._endIndexes[index] = endLineNumber;
        this._length++;
        if (indent < 1000) {
            this._indentOccurrences[indent] = (this._indentOccurrences[indent] || 0) + 1;
        }
    }
    toIndentRanges() {
        // reverse and create arrays of the exact length
        const startIndexes = new Uint32Array(this._length);
        const endIndexes = new Uint32Array(this._length);
        for (let i = this._length - 1, k = 0; i >= 0; i--, k++) {
            startIndexes[k] = this._startIndexes[i];
            endIndexes[k] = this._endIndexes[i];
        }
        return new FoldingRegions(startIndexes, endIndexes);
    }
}
/**
 * Returns:
 *  - -1 => the line consists of whitespace
 *  - otherwise => the indent level is returned value
 */
function computeIndentLevel(line, tabSize) {
    let indent = 0;
    let i = 0;
    const len = line.length;
    while (i < len) {
        const chCode = line.charCodeAt(i);
        if (chCode === 32 /* CharCode.Space */) {
            indent++;
        }
        else if (chCode === 9 /* CharCode.Tab */) {
            indent = indent - indent % tabSize + tabSize;
        }
        else {
            break;
        }
        i++;
    }
    if (i === len) {
        return -1; // line only consists of whitespace
    }
    return indent;
}
class FoldingRegions {
    constructor(startIndexes, endIndexes) {
        this._startIndexes = startIndexes;
        this._endIndexes = endIndexes;
        this._parentsComputed = false;
        // this.ensureParentIndices();
    }
    ensureParentIndices() {
        if (!this._parentsComputed) {
            this._parentsComputed = true;
            const parentIndexes = [];
            const isInsideLast = (startLineNumber, endLineNumber) => {
                const index = parentIndexes[parentIndexes.length - 1];
                return this.getStartLineNumber(index) <= startLineNumber && this.getEndLineNumber(index) >= endLineNumber;
            };
            for (let i = 0, len = this._startIndexes.length; i < len; i++) {
                const startLineNumber = this._startIndexes[i];
                const endLineNumber = this._endIndexes[i];
                if (startLineNumber > MAX_LINE_NUMBER || endLineNumber > MAX_LINE_NUMBER) {
                    throw new Error('startLineNumber or endLineNumber must not exceed ' + MAX_LINE_NUMBER);
                }
                while (parentIndexes.length > 0 && !isInsideLast(startLineNumber, endLineNumber)) {
                    parentIndexes.pop();
                }
                const parentIndex = parentIndexes.length > 0 ? parentIndexes[parentIndexes.length - 1] : -1;
                parentIndexes.push(i);
                this._startIndexes[i] = startLineNumber + ((parentIndex & 0xFF) << 24);
                this._endIndexes[i] = endLineNumber + ((parentIndex & 0xFF00) << 16);
            }
        }
    }
    get length() {
        return this._startIndexes.length;
    }
    getStartLineNumber(index) {
        return this._startIndexes[index] & MAX_LINE_NUMBER;
    }
    getEndLineNumber(index) {
        return this._endIndexes[index] & MAX_LINE_NUMBER;
    }
    getParentIndex(index) {
        this.ensureParentIndices();
        const parent = ((this._startIndexes[index] & MASK_INDENT) >>> 24) + ((this._endIndexes[index] & MASK_INDENT) >>> 16);
        if (parent === MAX_FOLDING_REGIONS) {
            return -1;
        }
        return parent;
    }
    contains(index, line) {
        return this.getStartLineNumber(index) <= line && this.getEndLineNumber(index) >= line;
    }
    findIndex(line) {
        let low = 0, high = this._startIndexes.length;
        if (high === 0) {
            return -1; // no children
        }
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (line < this.getStartLineNumber(mid)) {
                high = mid;
            }
            else {
                low = mid + 1;
            }
        }
        return low - 1;
    }
    findRange(line) {
        let index = this.findIndex(line);
        if (index >= 0) {
            const endLineNumber = this.getEndLineNumber(index);
            if (endLineNumber >= line) {
                return index;
            }
            index = this.getParentIndex(index);
            while (index !== -1) {
                if (this.contains(index, line)) {
                    return index;
                }
                index = this.getParentIndex(index);
            }
        }
        return -1;
    }
}
//# sourceMappingURL=indentationStructure.js.map