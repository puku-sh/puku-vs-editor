"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertFileTreeToChatResponseFileTree = convertFileTreeToChatResponseFileTree;
exports.listFilesInResponseFileTree = listFilesInResponseFileTree;
const vscodeTypes_1 = require("../../../vscodeTypes");
/**
 * Converts a markdown-style file tree into a ChatResponseFileTreePart.
 * @param fileStructure Markdown-style file tree
 * @param generatePreviewURI Factory that converts a filename to a preview URI
 */
function convertFileTreeToChatResponseFileTree(fileStructure, generatePreviewURI) {
    const lines = fileStructure.trim().split('\n');
    const fileTree = [];
    let baseUri;
    const root = { name: '', children: [] };
    fileTree[0] = root;
    for (const line of lines) {
        let depth = calculateDepth(line);
        const index = line.lastIndexOf('── ');
        const name = index >= 0 ? line.substring(index + 3) : line;
        const fileNode = { name };
        if (depth === 0) {
            baseUri = generatePreviewURI(name);
            root.name = name;
            continue;
        }
        else {
            while (depth > 0 && fileTree[depth - 1] === undefined) {
                depth--;
            }
            if (fileTree[depth - 1].children === undefined) {
                fileTree[depth - 1].children = [fileNode];
            }
            else {
                fileTree[depth - 1].children?.push(fileNode);
            }
            fileTree[depth] = fileNode;
        }
    }
    if (baseUri === undefined) {
        throw new Error('Base URI is undefined');
    }
    const filteredTree = filterChatResponseFileTree(root.children);
    root.children = filteredTree.sort((a, b) => (a.children && !b.children) ? -1 : 1);
    return {
        chatResponseTree: new vscodeTypes_1.ChatResponseFileTreePart([root], baseUri),
        projectName: root.name
    };
}
/**
 * List filenames in the tree, separated by forward-slashes.
 */
function listFilesInResponseFileTree(tree) {
    const queue = tree.map(node => ({ node, path: node.name }));
    const result = [];
    while (queue.length > 0) {
        const { node, path } = queue.shift();
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                queue.push({ node: child, path: `${path}/${child.name}` });
            }
        }
        else {
            result.push(path);
        }
    }
    return result;
}
function calculateDepth(inputString) {
    let depth = (inputString.match(/│   /g) || []).length;
    depth += (inputString.match(/\|   /g) || []).length;
    depth += (inputString.match(/    /g) || []).length;
    depth += (inputString.match(/├── /g) || []).length;
    depth += (inputString.match(/└── /g) || []).length;
    return depth;
}
const filterList = [
    /* compile/runtime files */ 'node_modules', 'out', 'bin', 'debug', 'obj', 'lib', '.dll', '.pdb', '.lib',
    /* image assets */ '.jpg', '.png', '.ico', '.gif', '.svg', '.jpeg', '.tiff', '.bmp', '.webp', '.jpeg',
    /* other files we should not be included in a new project */ '.gitignore', 'LICENSE.txt', 'yarn.lock', 'package-lock.json'
];
function filterChatResponseFileTree(fileTree) {
    const filteredTree = [];
    for (const node of fileTree) {
        if (!isNodeInFilterList(node)) {
            if (node.children) {
                node.children = filterChatResponseFileTree(node.children);
            }
            filteredTree.push(node);
        }
    }
    return filteredTree;
}
function isNodeInFilterList(node) {
    if (filterList.includes(node.name)) {
        return true;
    }
    return false;
}
//# sourceMappingURL=fileTreeParser.js.map