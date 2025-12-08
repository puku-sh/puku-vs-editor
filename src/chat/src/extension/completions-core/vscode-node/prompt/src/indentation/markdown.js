"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMarkdown = processMarkdown;
const classes_1 = require("./classes");
const parsing_1 = require("./parsing");
/**

 */
const _MarkdownLabelRules = {
    heading: /^# /,
    subheading: /^## /,
    subsubheading: /### /,
};
const MarkdownLabelRules = (0, parsing_1.buildLabelRules)(_MarkdownLabelRules);
/**
 * processMarkdown(parseRaw(text)) is supposed to serve as a superior alternative to parseTree(text, "generic")
 */
function processMarkdown(originalTree) {
    let tree = originalTree;
    (0, parsing_1.labelLines)(tree, MarkdownLabelRules);
    // We'll want to refer to the tree's subs, so let the type checker know it won't be blank
    if ((0, classes_1.isBlank)(tree)) {
        return tree;
    }
    // the top level is ordered according to headings / subheadings / subsubheadings
    function headingLevel(sub) {
        // 0 is the tree itself, so we start at 1
        if (sub.label === 'heading') {
            return 1;
        }
        if (sub.label === 'subheading') {
            return 2;
        }
        if (sub.label === 'subsubheading') {
            return 3;
        }
        return undefined;
    }
    const currentHierarchy = [tree];
    const oldTreeSubs = [...tree.subs];
    tree.subs = [];
    for (const sub of oldTreeSubs) {
        const level = headingLevel(sub);
        if (level === undefined || (0, classes_1.isBlank)(sub)) {
            currentHierarchy[currentHierarchy.length - 1].subs.push(sub);
        }
        else {
            // take care of "dangling" levels, e.g. if we have a subsubheading after a heading
            while (currentHierarchy.length < level) {
                currentHierarchy.push(currentHierarchy[currentHierarchy.length - 1]);
            }
            // add this to the parent
            currentHierarchy[level - 1].subs.push(sub);
            // make this the tip of the hierarchy
            currentHierarchy[level] = sub;
            // delete all higher levels
            while (currentHierarchy.length > level + 1) {
                currentHierarchy.pop();
            }
        }
    }
    // now group paragraphs
    tree = (0, parsing_1.groupBlocks)(tree);
    tree = (0, parsing_1.flattenVirtual)(tree);
    (0, parsing_1.labelVirtualInherited)(tree);
    return tree;
}
//# sourceMappingURL=markdown.js.map