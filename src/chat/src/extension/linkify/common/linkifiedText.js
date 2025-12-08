"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkifySymbolAnchor = exports.LinkifyLocationAnchor = void 0;
exports.coalesceParts = coalesceParts;
class LinkifyLocationAnchor {
    constructor(value, title) {
        this.value = value;
        this.title = title;
    }
}
exports.LinkifyLocationAnchor = LinkifyLocationAnchor;
class LinkifySymbolAnchor {
    constructor(symbolInformation, resolve) {
        this.symbolInformation = symbolInformation;
        this.resolve = resolve;
    }
}
exports.LinkifySymbolAnchor = LinkifySymbolAnchor;
/**
 * Coalesces adjacent string parts into a single string part.
 */
function coalesceParts(parts) {
    const out = [];
    for (const part of parts) {
        const previous = out.at(-1);
        if (typeof part === 'string' && typeof previous === 'string') {
            out[out.length - 1] = previous + part;
        }
        else {
            out.push(part);
        }
    }
    return out;
}
//# sourceMappingURL=linkifiedText.js.map