"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONL = void 0;
class JSONL {
    static parse(input) {
        const result = [];
        const lines = input.split('\n');
        let i = 0;
        for (const line of lines) {
            i++;
            if (line.trim().length === 0) {
                continue;
            }
            result.push(JSON.parse(line));
        }
        return result;
    }
    static toString(data) {
        const lines = [];
        for (const item of data) {
            lines.push(JSON.stringify(item));
        }
        return lines.join('\n');
    }
}
exports.JSONL = JSONL;
//# sourceMappingURL=jsonlUtil.js.map