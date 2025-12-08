"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.deparseLine = deparseLine;
exports.deparseTree = deparseTree;
exports.deparseAndCutTree = deparseAndCutTree;
exports.describeTree = describeTree;
exports.encodeTree = encodeTree;
exports.firstLineOf = firstLineOf;
exports.lastLineOf = lastLineOf;
const classes_1 = require("./classes");
const manipulation_1 = require("./manipulation");
/**
 * Format only the given line node, and *NOT* its subnodes.
 * This essentially comprise indentation and a trailing newline.
 */
function deparseLine(node) {
    return ' '.repeat(node.indentation) + node.sourceLine + '\n';
}
/**
 * Return a flat string representation of the indentation tree.
 */
function deparseTree(tree) {
    function accumulator(tree, accum) {
        let str = '';
        if ((0, classes_1.isLine)(tree)) {
            str = deparseLine(tree);
        }
        else if ((0, classes_1.isBlank)(tree)) {
            str = '\n';
        }
        return accum + str;
    }
    return (0, manipulation_1.foldTree)(tree, '', accumulator, 'topDown');
}
/**
 * Return a list of flat strings whose concatenation equals `deparseTree`.
 * The source is cut at the lines whose labels appear in `cutAt`. In other
 * words, if a node has a labelled `A` that appears in `cutAt`, then there will
 * be at least three strings in the result: the concatenation of lines before
 * the node `A`, the lines covered by node `A`, and lines after the node `A`.
 *
 * FIXME: The cuts are *not* applied recursively: If e.g. node `A` has a
 * sub-node labelled `B` which is also in `cutAt`, then the result will still
 * contain only a single string for node `A`.
 *
 */
function deparseAndCutTree(tree, cutAt) {
    const cutAtSet = new Set(cutAt);
    const cuts = [];
    let curUndef = '';
    // Reimplement visitTree to avoid descending into cut nodes.
    function visit(tree) {
        if (tree.label !== undefined && cutAtSet.has(tree.label)) {
            if (curUndef !== '') {
                cuts.push({ label: undefined, source: curUndef });
            }
            cuts.push({
                label: tree.label,
                source: deparseTree(tree),
            });
            curUndef = '';
        }
        else {
            if ((0, classes_1.isLine)(tree)) {
                curUndef += deparseLine(tree);
            }
            tree.subs.forEach(visit);
        }
    }
    visit(tree);
    if (curUndef !== '') {
        cuts.push({ label: undefined, source: curUndef });
    }
    return cuts;
}
/**
 * Return a readable string representation of the tree.
 *
 * The output is closely related to building trees using the helper functions in
 * `indentation.test.ts`.
 */
function describeTree(tree, indent = 0) {
    const ind = ' '.repeat(indent);
    if (tree === undefined) {
        return 'UNDEFINED NODE';
    }
    let children;
    if (tree.subs === undefined) {
        children = 'UNDEFINED SUBS';
    }
    else {
        children = tree.subs.map(child => describeTree(child, indent + 2)).join(',\n');
    }
    if (children === '') {
        children = '[]';
    }
    else {
        children = `[\n${children}\n      ${ind}]`;
    }
    const prefix = ((0, classes_1.isVirtual)(tree) || (0, classes_1.isTop)(tree) ? '   ' : String(tree.lineNumber).padStart(3, ' ')) + `:  ${ind}`;
    const labelString = tree.label === undefined ? '' : JSON.stringify(tree.label);
    if ((0, classes_1.isVirtual)(tree) || (0, classes_1.isTop)(tree)) {
        return `${prefix}vnode(${tree.indentation}, ${labelString}, ${children})`;
    }
    else if ((0, classes_1.isBlank)(tree)) {
        return `${prefix}blank(${labelString ?? ''})`;
    }
    else {
        return `${prefix}lnode(${tree.indentation}, ${labelString}, ${JSON.stringify(tree.sourceLine)}, ${children})`;
    }
}
/**
 * Return a string that mimics the call that would construct the tree
 * This is less readable than describeTree, but useful to write code.
 */
function encodeTree(tree, indent = '') {
    const labelString = tree.label === undefined ? '' : `, ${JSON.stringify(tree.label)}`;
    const subString = !(0, classes_1.isBlank)(tree) && tree.subs.length > 0
        ? `[\n${tree.subs.map(node => encodeTree(node, indent + '  ')).join(', \n')}\n${indent}]`
        : '[]';
    switch (tree.type) {
        case 'blank':
            return `${indent}blankNode(${tree.lineNumber}${labelString})`;
        case 'top':
            return `topNode(${subString}${labelString})`;
        case 'virtual':
            return `${indent}virtualNode(${tree.indentation}, ${subString}${labelString})`;
        case 'line':
            return `${indent}lineNode(${tree.indentation}, ${tree.lineNumber}, "${tree.sourceLine}", ${subString}${labelString})`;
    }
}
/**
 * Return the first line number of the given tree.
 */
function firstLineOf(tree) {
    if ((0, classes_1.isLine)(tree) || (0, classes_1.isBlank)(tree)) {
        return tree.lineNumber;
    }
    for (const sub of tree.subs) {
        const firstLine = firstLineOf(sub);
        if (firstLine !== undefined) {
            return firstLine;
        }
    }
    return undefined;
}
/**
 * Return the last line number of the given tree.
 */
function lastLineOf(tree) {
    let lastLine = undefined;
    let i = tree.subs.length - 1;
    while (i >= 0 && lastLine === undefined) {
        lastLine = lastLineOf(tree.subs[i]);
        i--;
    }
    if (lastLine === undefined && !(0, classes_1.isVirtual)(tree) && !(0, classes_1.isTop)(tree)) {
        return tree.lineNumber;
    }
    else {
        return lastLine;
    }
}
//# sourceMappingURL=description.js.map