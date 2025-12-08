"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TsExpr = void 0;
class TsExpr {
    static str(strings, ...values) {
        if (typeof strings === 'string') {
            return new TsExpr([strings]);
        }
        else {
            const parts = [];
            for (let i = 0; i < strings.length; i++) {
                parts.push(strings[i]);
                if (i < values.length) {
                    parts.push({ value: values[i] });
                }
            }
            // TODO remove indentation
            return new TsExpr(parts);
        }
    }
    constructor(parts) {
        this.parts = parts;
    }
    toString() {
        return _serializeToTs(this, 0);
    }
}
exports.TsExpr = TsExpr;
function _serializeToTs(data, newLineIndentation) {
    if (data && typeof data === 'object') {
        if (data instanceof TsExpr) {
            let lastIndentation = 0;
            const result = data.parts.map(p => {
                if (typeof p === 'string') {
                    lastIndentation = getIndentOfLastLine(p);
                    return p;
                }
                else {
                    return _serializeToTs(p.value, lastIndentation);
                }
            }).join('');
            return indentNonFirstLines(result, newLineIndentation);
        }
        if (Array.isArray(data)) {
            const entries = [];
            for (const value of data) {
                entries.push(_serializeToTs(value, newLineIndentation + 1));
            }
            return `[\n`
                + entries.map(e => indentLine(e, newLineIndentation + 1) + ',\n').join('')
                + indentLine(`]`, newLineIndentation);
        }
        const entries = [];
        for (const [key, value] of Object.entries(data)) {
            entries.push(`${serializeObjectKey(key)}: ${_serializeToTs(value, newLineIndentation + 1)},\n`);
        }
        return `{\n`
            + entries.map(e => indentLine(e, newLineIndentation + 1)).join('')
            + indentLine(`}`, newLineIndentation);
    }
    if (data === undefined) {
        return indentNonFirstLines('undefined', newLineIndentation);
    }
    return indentNonFirstLines(JSON.stringify(data, undefined, '\t'), newLineIndentation);
}
function getIndentOfLastLine(str) {
    const lines = str.split('\n');
    const lastLine = lines[lines.length - 1];
    return lastLine.length - lastLine.trimStart().length;
}
function indentNonFirstLines(str, indentation) {
    const lines = str.split('\n');
    return lines.map((line, i) => i === 0 ? line : indentLine(line, indentation)).join('\n');
}
function indentLine(str, indentation) {
    return '\t'.repeat(indentation) + str;
}
function serializeObjectKey(key) {
    if (/^[a-zA-Z_]\w*$/.test(key)) {
        return key;
    }
    return JSON.stringify(key);
}
//# sourceMappingURL=tsExpr.js.map