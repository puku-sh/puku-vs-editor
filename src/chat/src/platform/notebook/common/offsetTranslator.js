"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrLfOffsetTranslator = void 0;
const vscodeTypes_1 = require("../../../vscodeTypes");
/**
 * Translates offsets from a string with CRLF to the equivalent offset in a string with only LF.
 * Does not store the original or transformed string, only the CRLF positions.
 */
class CrLfOffsetTranslator {
    constructor(original, originalEol) {
        this.originalEol = originalEol;
        // Stores the offsets (indices) of each '\r' in a '\r\n' sequence
        this.crlfOffsets = [];
        if (originalEol === vscodeTypes_1.EndOfLine.CRLF) {
            for (let i = 0; i < original.length - 1; i++) {
                if (original[i] === '\r' && original[i + 1] === '\n') {
                    this.crlfOffsets.push(i);
                    i++; // Skip the '\n'
                }
            }
        }
    }
    /**
     * Translates an offset from the original string (with CRLF) to the transformed string (with LF).
     * @param originalOffset Offset in the original string
     * @returns Offset in the transformed string
     */
    translate(originalOffset) {
        if (this.originalEol === vscodeTypes_1.EndOfLine.LF) {
            return originalOffset; // No translation needed if already LF
        }
        // Count how many CRLF pairs are before or at originalOffset
        let left = 0, right = this.crlfOffsets.length;
        while (left < right) {
            const mid = (left + right) >> 1;
            if (this.crlfOffsets[mid] < originalOffset) {
                left = mid + 1;
            }
            else {
                right = mid;
            }
        }
        // Each CRLF before originalOffset reduces the offset by 1
        return originalOffset - left;
    }
}
exports.CrLfOffsetTranslator = CrLfOffsetTranslator;
//# sourceMappingURL=offsetTranslator.js.map