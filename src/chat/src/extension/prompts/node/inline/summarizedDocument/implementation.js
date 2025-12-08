"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarizedDocumentLineNumberStyle = exports.ProjectedDocument = exports.RemovableNode = void 0;
exports.summarizeDocumentsSyncImpl = summarizeDocumentsSyncImpl;
const arrays_1 = require("../../../../../util/common/arrays");
const arrays_2 = require("../../../../../util/vs/base/common/arrays");
const cache_1 = require("../../../../../util/vs/base/common/cache");
const stringEdit_1 = require("../../../../../util/vs/editor/common/core/edits/stringEdit");
const position_1 = require("../../../../../util/vs/editor/common/core/position");
const offsetRange_1 = require("../../../../../util/vs/editor/common/core/ranges/offsetRange");
const positionToOffset_1 = require("../../../../../util/vs/editor/common/core/text/positionToOffset");
const textLength_1 = require("../../../../../util/vs/editor/common/core/text/textLength");
const visualization_1 = require("../visualization");
const fragments_1 = require("./fragments");
const projectedText_1 = require("./projectedText");
class RemovableNode {
    constructor(parent, overlayNode, range, children, _document) {
        this.parent = parent;
        this.overlayNode = overlayNode;
        this.range = range;
        this.children = children;
        this._document = _document;
    }
    get kind() {
        return this.overlayNode.kind;
    }
    get text() {
        return this._document.getTextInOffsetRange(this.range);
    }
}
exports.RemovableNode = RemovableNode;
class ProjectedDocument extends projectedText_1.ProjectedText {
    constructor(baseDocument, edits) {
        super(baseDocument.getText(), edits);
        this.baseDocument = baseDocument;
    }
    getLanguageId() {
        return this.baseDocument.languageId;
    }
}
exports.ProjectedDocument = ProjectedDocument;
function summarizeDocumentsSyncImpl(charLimit, settings, docs) {
    const rootMarkedNodes = [];
    const bestSummarizationResultsPerDocIdx = [];
    const allNodesWithScores = [];
    for (let i = 0; i < docs.length; i++) {
        const { document, overlayNodeRoot, selection } = docs[i];
        const text = document.getText();
        const offsetSelection = selection ? document.rangeToOffsetRange(selection) : undefined;
        const removableNodeRoot = createRemovableNodeFromOverlayNode(overlayNodeRoot, document);
        const rootTextNode = TextNode.fromRootNode(removableNodeRoot, document);
        const rootMarkedNode = SurvivingTextNode.fromNode(rootTextNode, !!settings.tryPreserveTypeChecking, !!settings.alwaysUseEllipsisForElisions, settings.lineNumberStyle ?? SummarizedDocumentLineNumberStyle.None);
        if (offsetSelection) {
            // mark all leaf nodes that intersect userSelection
            rootMarkedNode.visitAll(node => {
                if (!node.node.range.intersectsOrTouches(offsetSelection)) {
                    return false;
                }
                if (node.node.children.length === 0) {
                    node.markAsSurviving();
                }
                return true;
            });
        }
        rootMarkedNodes.push(rootMarkedNode);
        bestSummarizationResultsPerDocIdx.push(rootMarkedNode.getTextFragment());
        const distanceScoreToSelection = (node) => {
            if (!offsetSelection) {
                return 0;
            }
            if (node.range.endExclusive < offsetSelection.start) {
                // this node is above
                return offsetSelection.start - node.range.endExclusive;
            }
            if (node.range.start > offsetSelection.endExclusive) {
                // this node is below
                return 3 * (node.range.start - offsetSelection.endExclusive); // we will punish code that is below
            }
            // this node is intersecting
            return 0;
        };
        const scopeDistanceDown = new cache_1.CachedFunction(node => {
            if (!offsetSelection) {
                return 0;
            }
            if (node.children.length === 0) {
                return node.range.intersectsOrTouches(offsetSelection) ? 0 : Number.MAX_SAFE_INTEGER;
            }
            else {
                return (0, arrays_1.min)(node.children.map(n => scopeDistanceDown.get(n))) + 1;
            }
        });
        const scopeDistance = new cache_1.CachedFunction(node => {
            const parentScopeDistance = node.parent ? scopeDistance.get(node.parent) : Number.MAX_SAFE_INTEGER;
            const nodeScopeDistanceDown = scopeDistanceDown.get(node);
            return Math.min(parentScopeDistance, nodeScopeDistanceDown);
        });
        const tryPreserveTypeChecking = !!settings.tryPreserveTypeChecking;
        let costFn = node => {
            if (tryPreserveTypeChecking && node.node?.kind === 'import_statement') {
                return 0;
            }
            return 100 * scopeDistance.get(node)
                + node.depth
                + 10 * (distanceScoreToSelection(node) / text.length);
        };
        const costFnOverride = typeof settings.costFnOverride === 'object' ? settings.costFnOverride.createCostFn(document) : settings.costFnOverride;
        if (costFnOverride !== undefined) {
            const oldCostFn = costFn;
            costFn = (n) => {
                const currentScore = oldCostFn(n);
                if (currentScore === false) {
                    return false;
                }
                if (!n.node) {
                    return currentScore;
                }
                return costFnOverride(n.node, currentScore, document);
            };
        }
        const allNodes = rootMarkedNode.getDescendantsAndSelf();
        for (const node of allNodes) {
            if (!node.node.node) {
                continue;
            }
            const cost = costFn(node.node);
            if (cost === false) {
                continue;
            }
            allNodesWithScores.push({
                docIdx: i,
                node,
                cost
            });
        }
    }
    allNodesWithScores.sort((0, arrays_2.compareBy)(n => n.cost, arrays_2.numberComparator));
    const getLineNumberText = (lineNumber) => {
        return `${lineNumber}: `;
    };
    for (const { node, docIdx } of allNodesWithScores) {
        node.markAsSurviving();
        // total length of all nodes
        let totalLength = (0, arrays_2.sumBy)(rootMarkedNodes, c => c.getTextFragment().length);
        if (settings.lineNumberStyle === SummarizedDocumentLineNumberStyle.Full) {
            const textLen = textLength_1.TextLength.sum(rootMarkedNodes, c => c.getTextFragment().textLength);
            const maxLineNumber = docs[docIdx].document.getLineCount();
            const totalLineNumberChars = textLen.lineCount * getLineNumberText(maxLineNumber).length; // This is an upper bound approximation.
            totalLength += totalLineNumberChars;
        }
        if (totalLength > charLimit) {
            break;
        }
        bestSummarizationResultsPerDocIdx[docIdx] = rootMarkedNodes[docIdx].getTextFragment();
    }
    const result = [];
    for (let i = 0; i < bestSummarizationResultsPerDocIdx.length; i++) {
        const bestSummarizationResult = bestSummarizationResultsPerDocIdx[i];
        const { document } = docs[i];
        let e = bestSummarizationResult.toEditFromOriginal(document.getText().length);
        if (settings.lineNumberStyle === SummarizedDocumentLineNumberStyle.Full) {
            const summarizedDoc = e.apply(document.getText());
            const t = new positionToOffset_1.PositionOffsetTransformer(summarizedDoc);
            const lineNumberReplacements = [];
            const lineCount = t.textLength.lineCount;
            for (let curLine = 1; curLine <= lineCount; curLine++) {
                const offset = t.getOffset(new position_1.Position(curLine, 1));
                const offsetBefore = e.applyInverseToOffset(offset);
                const pos = document.getPositionAtOffset(offsetBefore);
                lineNumberReplacements.push(new stringEdit_1.StringReplacement(offsetRange_1.OffsetRange.emptyAt(offset), getLineNumberText(pos.line + 1)));
            }
            e = e.compose(new stringEdit_1.StringEdit(lineNumberReplacements));
        }
        const projectedDoc = new ProjectedDocument(document, e);
        const r = projectedDoc;
        const rootMarkedNode = rootMarkedNodes[i];
        r.getVisualization = () => ({
            ...{ $fileExtension: 'ast.w' },
            source: {
                value: projectedDoc.originalText,
                decorations: (0, visualization_1.subtractRange)(offsetRange_1.OffsetRange.ofLength(projectedDoc.originalText.length), projectedDoc.edits.replacements.map(e => e.replaceRange)).map(r => ({
                    range: [r.start, r.endExclusive],
                    color: 'lime',
                }))
            },
            root: (0, visualization_1.toAstNode)(rootMarkedNode, n => ({
                label: (n.node.node?.kind || 'unknown') + ` (${allNodesWithScores.find(nws => nws.node === n)?.cost})`,
                range: n.node.range,
                children: n.childNodes,
                isMarked: n['_surviving'],
            }))
        });
        result.push(projectedDoc);
    }
    return result;
}
function createRemovableNodeFromOverlayNode(node, document, parent = undefined) {
    const range = new offsetRange_1.OffsetRange(node.startIndex, node.endIndex);
    const children = [];
    const result = new RemovableNode(parent, node, range, children, document);
    for (const n of node.children) {
        children.push(createRemovableNodeFromOverlayNode(n, document, result));
    }
    return result;
}
/**
 * A dense representation of the text in a document.
 * Based on overlay nodes.
 *
 * **Dense**: every character is contained by some leaf node.
*/
class TextNode {
    static fromRootNode(node, document) {
        const fullRange = new offsetRange_1.OffsetRange(0, document.length);
        if (node.range.equals(fullRange)) {
            return TextNode.fromNode(node, document);
        }
        // The root node does not cover the entire document!
        // So we have to create a virtual root that actually does cover the entire document.
        const startGap = new offsetRange_1.OffsetRange(0, node.range.start);
        const endGap = new offsetRange_1.OffsetRange(node.range.endExclusive, document.length);
        const children = [];
        const rootNode = new TextNode(undefined, fullRange, children, 0, null, document);
        if (!startGap.isEmpty) {
            children.push(new TextNode(undefined, startGap, [], 0, rootNode, document));
        }
        children.push(TextNode.fromNode(node, document, 1, null));
        if (!endGap.isEmpty) {
            children.push(new TextNode(undefined, endGap, [], 0, rootNode, document));
        }
        return rootNode;
    }
    static fromNode(node, document, depth = 0, parent = null) {
        const children = [];
        const result = new TextNode(node, node.range, children, depth, parent, document);
        if (node.children.length > 0) {
            let lastEnd = node.range.start;
            for (const n of node.children) {
                const gap = new offsetRange_1.OffsetRange(lastEnd, n.range.start);
                if (!gap.isEmpty) {
                    children.push(new TextNode(undefined, gap, [], depth, result, document));
                }
                children.push(TextNode.fromNode(n, document, depth + 1, result));
                lastEnd = n.range.endExclusive;
            }
            const gap = new offsetRange_1.OffsetRange(lastEnd, node.range.endExclusive);
            if (!gap.isEmpty) {
                children.push(new TextNode(undefined, gap, [], depth, result, document));
            }
        }
        return result;
    }
    constructor(node, range, children, depth, parent, document) {
        this.node = node;
        this.range = range;
        this.children = children;
        this.depth = depth;
        this.parent = parent;
        this.document = document;
    }
    getLeadingWs() {
        return getLeadingWs(this.document.getText(), this.range);
    }
    getIndentation() {
        let indentation = this.getLeadingWs();
        const lastNewLineIdx = indentation.lastIndexOf('\n');
        if (lastNewLineIdx !== -1) {
            indentation = indentation.substring(lastNewLineIdx + 1);
        }
        return indentation;
    }
    getTrailingWs() {
        return getTrailingWs(this.document.getText(), this.range);
    }
}
function getLeadingWs(str, range) {
    const val = range.substring(str);
    const trimmed = val.length - val.trimStart().length;
    const ws = val.substring(0, trimmed);
    return ws;
}
function getTrailingWs(str, range) {
    const val = range.substring(str);
    const trimmed = val.length - val.trimEnd().length;
    const ws = val.substring(val.length - trimmed);
    return ws;
}
var SummarizedDocumentLineNumberStyle;
(function (SummarizedDocumentLineNumberStyle) {
    SummarizedDocumentLineNumberStyle[SummarizedDocumentLineNumberStyle["None"] = 0] = "None";
    SummarizedDocumentLineNumberStyle[SummarizedDocumentLineNumberStyle["OmittedRanges"] = 1] = "OmittedRanges";
    SummarizedDocumentLineNumberStyle[SummarizedDocumentLineNumberStyle["Full"] = 2] = "Full";
})(SummarizedDocumentLineNumberStyle || (exports.SummarizedDocumentLineNumberStyle = SummarizedDocumentLineNumberStyle = {}));
class SurvivingTextNode {
    static fromNode(node, tryPreserveTypeChecking, alwaysUseEllipsisForElisions, lineNumberStyle) {
        return SurvivingTextNode.fromNodeParent(node, null, tryPreserveTypeChecking, alwaysUseEllipsisForElisions, lineNumberStyle);
    }
    static fromNodeParent(node, parent, tryPreserveTypeChecking, alwaysUseEllipsisForElisions, lineNumberStyle) {
        const children = [];
        const result = new SurvivingTextNode(node, parent, children, tryPreserveTypeChecking, alwaysUseEllipsisForElisions, lineNumberStyle);
        for (const child of node.children) {
            const childNode = SurvivingTextNode.fromNodeParent(child, result, tryPreserveTypeChecking, alwaysUseEllipsisForElisions, lineNumberStyle);
            children.push(childNode);
        }
        return result;
    }
    constructor(node, parent, childNodes, _tryPreserveTypeChecking, _alwaysUseEllipsisForElisions, _lineNumberStyle) {
        this.node = node;
        this.parent = parent;
        this.childNodes = childNodes;
        this._tryPreserveTypeChecking = _tryPreserveTypeChecking;
        this._alwaysUseEllipsisForElisions = _alwaysUseEllipsisForElisions;
        this._lineNumberStyle = _lineNumberStyle;
        this._surviving = false;
        this._textFragment = null;
    }
    visitAll(fn) {
        if (!fn(this)) {
            return;
        }
        for (const child of this.childNodes) {
            child.visitAll(fn);
        }
    }
    markAsSurviving() {
        if (this._surviving) {
            return;
        }
        this._surviving = true;
        if (this.parent) {
            this.parent.markAsSurviving();
        }
        this.invalidate();
    }
    invalidate() {
        if (!this._textFragment) {
            return;
        }
        this._textFragment = null;
        if (this.parent) {
            this.parent.invalidate();
        }
    }
    getTextFragment() {
        if (!this._textFragment) {
            this._textFragment = this._computeSummarization();
        }
        return this._textFragment;
    }
    _computeSummarization() {
        if (this.childNodes.length === 0 && (this._surviving || !this.node.node)) {
            return new fragments_1.OriginalStringFragment(this.node.range, this.node.document.getText());
        }
        if (!this._surviving) {
            return new fragments_1.LiteralStringFragment('');
        }
        const groups = Array.from((0, arrays_2.groupAdjacentBy)(this.childNodes.map(n => ({ node: n, fragment: n.getTextFragment() })), (f1, f2) => (f1.fragment.length === 0) === (f2.fragment.length === 0)));
        const getOmittedMessage = (omittedRange) => {
            if (this._lineNumberStyle === SummarizedDocumentLineNumberStyle.OmittedRanges) {
                const range = this.node.document.getPositionOffsetTransformer().getRange(omittedRange);
                if (range.startLineNumber !== range.endLineNumber) {
                    return `/* Lines ${range.startLineNumber}-${range.endLineNumber} omitted */`;
                }
                return `/* Line ${range.startLineNumber} omitted */`;
            }
            return this._tryPreserveTypeChecking ? '/* ... */' : '…';
        };
        for (let i = 0; i < groups.length; i++) {
            // in one group, all elements either are all empty or non-empty. Also, no group is empty.
            const g = groups[i];
            const isEmpty = g[0].fragment.length === 0;
            if (isEmpty && i > 0 && i < groups.length - 1) {
                // All our fragments are empty.
                const prev = groups[i - 1].at(-1); // Non-empty before us
                const next = groups[i + 1].at(0); // Non-empty after us
                const fullRange = g.at(0).node.node.range.join(g.at(-1).node.node.range);
                if (prev.fragment instanceof fragments_1.OriginalStringFragment && next.fragment instanceof fragments_1.OriginalStringFragment) {
                    const startTrimmed = prev.fragment.trimEnd();
                    const endTrimmed = next.fragment.trimStart();
                    if (startTrimmed.endsWith('{') && endTrimmed.startsWith('}')) {
                        groups[i - 1][groups[i - 1].length - 1].fragment = startTrimmed;
                        g.length = 1;
                        g[0].fragment = new fragments_1.LiteralStringFragment(getOmittedMessage(fullRange));
                        groups[i + 1][0].fragment = endTrimmed;
                        continue;
                    }
                }
                if (this._alwaysUseEllipsisForElisions || this._lineNumberStyle === SummarizedDocumentLineNumberStyle.OmittedRanges) {
                    const indentation = g.at(0).node.node.getIndentation();
                    const end = g.at(-1).node.node.getTrailingWs();
                    g.length = 1;
                    g[0].fragment = new fragments_1.LiteralStringFragment(indentation + getOmittedMessage(fullRange) + end);
                }
            }
        }
        const result = [];
        for (const group of groups) {
            for (const g of group) {
                (0, fragments_1.pushFragment)(result, g.fragment);
            }
        }
        return fragments_1.ConcatenatedStringFragment.from(result);
    }
    getDescendantsAndSelf() {
        const result = [];
        this._getDescendantsAndSelf(result);
        return result;
    }
    _getDescendantsAndSelf(result) {
        result.push(this);
        for (const child of this.childNodes) {
            child._getDescendantsAndSelf(result);
        }
    }
}
//# sourceMappingURL=implementation.js.map