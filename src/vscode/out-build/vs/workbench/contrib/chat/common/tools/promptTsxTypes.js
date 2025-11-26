/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function stringifyPromptElementJSON(element) {
    const strs = [];
    stringifyPromptNodeJSON(element.node, strs);
    return strs.join('');
}
function stringifyPromptNodeJSON(node, strs) {
    if (node.type === 2 /* PromptNodeType.Text */) {
        if (node.lineBreakBefore) {
            strs.push('\n');
        }
        if (typeof node.text === 'string') {
            strs.push(node.text);
        }
    }
    else if (node.ctor === 3 /* PieceCtorKind.ImageChatMessage */) {
        // This case currently can't be hit by prompt-tsx
        strs.push('<image>');
    }
    else if (node.ctor === 1 /* PieceCtorKind.BaseChatMessage */ || node.ctor === 2 /* PieceCtorKind.Other */) {
        for (const child of node.children) {
            stringifyPromptNodeJSON(child, strs);
        }
    }
}
//# sourceMappingURL=promptTsxTypes.js.map