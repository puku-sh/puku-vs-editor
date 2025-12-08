"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactPaths = redactPaths;
/**
 * Redacts all things that look like a file path from a given input string.
 */
function redactPaths(input) {
    return input
        .replace(/([\s|(]|file:\/\/)(\/[^\s]+)/g, '$1[redacted]') // unix path
        .replace(/([\s|(]|file:\/\/)([a-zA-Z]:[(\\|/){1,2}][^\s]+)/gi, '$1[redacted]') // windows path
        .replace(/([\s|(]|file:\/\/)(\\[^\s]+)/gi, '$1[redacted]'); // unc path
}
//# sourceMappingURL=pathRedaction.js.map