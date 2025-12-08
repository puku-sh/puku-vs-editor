"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.visualFileTree = visualFileTree;
exports.workspaceVisualFileTree = workspaceVisualFileTree;
const fileSystemService_1 = require("../../../../../platform/filesystem/common/fileSystemService");
const fileTypes_1 = require("../../../../../platform/filesystem/common/fileTypes");
const ignoreService_1 = require("../../../../../platform/ignore/common/ignoreService");
const workspaceFileIndex_1 = require("../../../../../platform/workspaceChunkSearch/node/workspaceFileIndex");
const types_1 = require("../../../../../util/vs/base/common/types");
const uri_1 = require("../../../../../util/vs/base/common/uri");
function partsLength(parts) {
    const len = parts.reduce((p, c) => p + c.value.length, 0);
    return len + Math.max(0, parts.length - 1); // Account for new lines between parts
}
/**
 * Converts a file tree into a nicely formatted multi-line string representation.
 *
 * This attempts to smartly truncate the string to fit within `maxLength` characters. It does this by doing
 * breadth-first expansion of the file nodes and adding in `...` when we run out of space.
 */
async function visualFileTree(files, maxLength = Infinity, token) {
    let parts = toParts(0, files, maxLength);
    let remainingSpace = maxLength - partsLength(parts);
    while (true) {
        let didExpand = false;
        const newParts = [];
        for (const part of parts) {
            if (part.type === 'text') {
                newParts.push(part);
            }
            else if (part.type === 'dir') {
                newParts.push({ type: 'text', uri: part.uri, value: part.value });
                const children = await part.getChildren();
                if (token?.isCancellationRequested) {
                    return emptyTree();
                }
                const subParts = toParts(part.level + 1, children, remainingSpace - 1);
                if (subParts.length) {
                    didExpand = true;
                    remainingSpace -= partsLength(subParts) + 1;
                    newParts.push(...subParts);
                }
            }
        }
        parts = newParts;
        if (!didExpand) {
            break;
        }
    }
    return {
        files: parts.map(p => p.uri).filter(types_1.isDefined),
        tree: parts.map(x => x.value).join('\n'),
    };
}
function toParts(level, files, maxLength) {
    const indent = '\t'.repeat(level);
    const parts = [];
    let remainingSpace = maxLength;
    for (let i = 0; i < files.length; ++i) {
        const item = files[i];
        const str = indent + item.name + (item.type === fileTypes_1.FileType.Directory ? '/' : '');
        if (str.length > remainingSpace) {
            // Not enough space for item. Try adding `...` as a placeholder
            const placeholder = indent + '...';
            // Remove previous segments until there's space for the placeholder
            while (placeholder.length > remainingSpace && parts.length > 0) {
                remainingSpace += parts.pop().value.length + 1; // Account for newline
            }
            // Finally check to see if there's space for our placeholder
            if (placeholder.length <= remainingSpace) {
                parts.push({ type: 'text', uri: undefined, value: placeholder });
            }
            break;
        }
        if (item.type === fileTypes_1.FileType.Directory) {
            parts.push({ type: 'dir', uri: item.uri, level, value: str, getChildren: item.getChildren });
        }
        else {
            parts.push({ type: 'text', uri: item.uri, value: str });
        }
        remainingSpace -= str.length;
        if (i !== files.length - 1) {
            remainingSpace -= 1; // Account for newline
        }
    }
    return parts;
}
async function workspaceVisualFileTree(accessor, root, options, token) {
    const fs = accessor.get(fileSystemService_1.IFileSystemService);
    const ignoreService = accessor.get(ignoreService_1.IIgnoreService);
    async function buildFileList(root) {
        let rootNodes;
        try {
            rootNodes = await fs.readDirectory(root);
        }
        catch (err) {
            return [];
        }
        if (token.isCancellationRequested) {
            return [];
        }
        // Ensure files are listed in a consistent order across platforms
        rootNodes.sort((a, b) => {
            if (a[1] === b[1]) {
                return a[0].localeCompare(b[0]);
            }
            return a[1] === fileTypes_1.FileType.Directory ? 1 : -1;
        });
        return Promise.all(rootNodes.map(async (x) => {
            const uri = uri_1.URI.joinPath(root, x[0]);
            return !(options.excludeDotFiles && x[0].startsWith('.')) && !(0, workspaceFileIndex_1.shouldAlwaysIgnoreFile)(uri) && !await ignoreService.isCopilotIgnored(uri) ? x : null;
        })).then(entries => entries.filter((entry) => !!entry)
            .map((entry) => {
            const uri = uri_1.URI.joinPath(root, entry[0]);
            if (entry[1] === fileTypes_1.FileType.Directory) {
                return { type: fileTypes_1.FileType.Directory, uri, name: entry[0], getChildren: () => buildFileList(uri) };
            }
            else {
                return { type: fileTypes_1.FileType.File, uri, name: entry[0] };
            }
        }));
    }
    await ignoreService.init();
    if (token.isCancellationRequested) {
        return emptyTree();
    }
    const rootFiles = await buildFileList(root);
    if (token.isCancellationRequested) {
        return emptyTree();
    }
    return visualFileTree(rootFiles, options.maxLength, token);
}
const emptyTree = () => ({ tree: '', files: [] });
//# sourceMappingURL=visualFileTree.js.map