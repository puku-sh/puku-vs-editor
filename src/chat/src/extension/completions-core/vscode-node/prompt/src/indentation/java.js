"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.processJava = processJava;
const classes_1 = require("./classes");
const manipulation_1 = require("./manipulation");
const parsing_1 = require("./parsing");
/**
 * Java labels.
 *
 *  * package: A package declaration;
 *  * import: An import stament
 *  * comment_single: Single-line comments starting with //
 *  * comment_multi: Multi-line comments starting with /*, or a vnode of
 *    multiple single-line comments.
 *  * annotation: A line starting with "@". Note that fields are habitually
 *    declared on one line, even if they have an annotation. In this case, the
 *    field will have the label "annotation" rather than "member".
 *  * closeBrace: A closing brace alone on a line.
 *  * member: Anything inside a class or interface that does not have a more
 *    specific label.
 */
const _javaLabelRules = {
    package: /^package /,
    import: /^import /,
    class: /\bclass /,
    interface: /\binterface /,
    javadoc: /^\/\*\*/,
    comment_multi: /^\/\*[^*]/,
    comment_single: /^\/\//,
    annotation: /^@/,
    opener: /^[[({]/,
    closer: /^[\])}]/,
};
const javaLabelRules = (0, parsing_1.buildLabelRules)(_javaLabelRules);
/**
 * processJava(parseRaw(text)) is supposed to serve as superior alternative to alternative parseTree(text, "generic")
 */
function processJava(originalTree) {
    let tree = originalTree;
    (0, parsing_1.labelLines)(tree, javaLabelRules);
    tree = (0, parsing_1.combineClosersAndOpeners)(tree);
    tree = (0, parsing_1.flattenVirtual)(tree);
    (0, parsing_1.labelVirtualInherited)(tree);
    // Label all non-labelled subs of class and interface as member.
    // We also relabel annotations that are direct subs of class or interface as
    // member.
    (0, manipulation_1.visitTree)(tree, (tree) => {
        if (tree.label === 'class' || tree.label === 'interface') {
            for (const sub of tree.subs) {
                if (!(0, classes_1.isBlank)(sub) && (sub.label === undefined || sub.label === 'annotation')) {
                    sub.label = 'member';
                }
            }
        }
    }, 'bottomUp');
    return tree;
}
//# sourceMappingURL=java.js.map