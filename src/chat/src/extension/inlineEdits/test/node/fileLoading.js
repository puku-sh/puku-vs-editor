"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadFile = loadFile;
exports.loadJSON = loadJSON;
exports.relativeFile = relativeFile;
const promises_1 = require("fs/promises");
const path_1 = require("../../../../util/vs/base/common/path");
/**
 * This function allows [tools](https://github.com/microsoft/vscode-ts-file-path-support/tree/main) to inline/extract the file content.
 */
async function loadFile(data) {
    let fileName = undefined;
    let filePath = undefined;
    let fileContents;
    if ('fileContents' in data) {
        fileName = data.fileName;
        fileContents = data.fileContents;
    }
    else {
        if (typeof data.filePath === 'string') {
            filePath = data.filePath;
            filePath = filePath;
        }
        else {
            filePath = data.filePath.fullPath;
        }
        fileContents = await (0, promises_1.readFile)(filePath, 'utf8');
    }
    return { fileContents, fileName, filePath };
}
async function loadJSON(data) {
    const { fileContents } = await loadFile(data);
    return JSON.parse(fileContents);
}
function relativeFile(relativePath) {
    const fullPath = (0, path_1.join)(__dirname, relativePath);
    return { fullPath };
}
//# sourceMappingURL=fileLoading.js.map