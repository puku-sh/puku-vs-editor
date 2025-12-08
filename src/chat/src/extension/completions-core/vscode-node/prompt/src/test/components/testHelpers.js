"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractNodesWitPath = extractNodesWitPath;
exports.isString = isString;
exports.isNumber = isNumber;
function extractNodesWitPath(node) {
    if (node.children === undefined || node.children.length === 0) {
        return [node.path];
    }
    return [node.path, ...(node.children?.flatMap(extractNodesWitPath) ?? [])];
}
function isString(value) {
    return typeof value === 'string';
}
function isNumber(value) {
    return typeof value === 'number';
}
//# sourceMappingURL=testHelpers.js.map