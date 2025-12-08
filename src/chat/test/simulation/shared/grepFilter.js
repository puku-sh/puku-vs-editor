"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.grepStrToRegex = grepStrToRegex;
const strings_1 = require("../../../src/util/vs/base/common/strings");
function grepStrToRegex(grep) {
    const trimmedGrep = grep.trim();
    if (trimmedGrep.length > 2 && trimmedGrep[0] === '/' && trimmedGrep[trimmedGrep.length - 1] === '/') {
        try {
            return new RegExp(trimmedGrep.substring(1, trimmedGrep.length - 1), 'i');
        }
        catch {
            console.error(`Malformed grep regex: ${grep}`);
        }
    }
    return new RegExp((0, strings_1.convertSimple2RegExpPattern)(grep), 'i');
}
//# sourceMappingURL=grepFilter.js.map