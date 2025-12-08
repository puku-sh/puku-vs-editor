"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnippyWindowSize = exports.MinTokenLength = void 0;
exports.lexemeLength = lexemeLength;
exports.offsetFirstLexemes = offsetFirstLexemes;
exports.offsetLastLexemes = offsetLastLexemes;
exports.checkInString = checkInString;
exports.hasMinLexemeLength = hasMinLexemeLength;
const SnippyLexemeRegex = new RegExp('[_\\p{L}\\p{Nd}]+|====+|----+|####+|////+|\\*\\*\\*\\*+|[\\p{P}\\p{S}]', 'gu');
exports.MinTokenLength = 65;
exports.SnippyWindowSize = 65;
function lexemeLength(text) {
    let i = 0;
    let m;
    SnippyLexemeRegex.lastIndex = 0;
    do {
        m = SnippyLexemeRegex.exec(text);
        if (m) {
            i += 1;
        }
        if (i >= exports.MinTokenLength) {
            break;
        }
    } while (m);
    return i;
}
/** Return the offset after the first `n` lexemes of `text`, counted in Snippy lexemes */
function offsetFirstLexemes(text, n) {
    let i = 0;
    let m;
    SnippyLexemeRegex.lastIndex = 0;
    do {
        m = SnippyLexemeRegex.exec(text);
        if (m) {
            i += 1;
            if (i >= n) {
                return SnippyLexemeRegex.lastIndex;
            }
        }
    } while (m);
    // The whole text is less than n tokens
    return text.length;
}
/** Return the offset at the beginning of the last `n` lexemes of `text`, counted in Snippy lexemes */
function offsetLastLexemes(text, n) {
    const textRev = text.split('').reverse().join('');
    const offsetRev = offsetFirstLexemes(textRev, n);
    return textRev.length - offsetRev;
}
/**
 * Use Snippy to check for a match in the supplied string around a range of interest.
 * - `text`: The text to check for a match.
 * - `interestRange`: The range of interest in the text. Snippy will check for
 *   any match that overlaps with this range, including an appropriate window both before and
 *   after the range.
 */
function checkInString(text, interestRange) {
    let fromIndex, toIndex;
    if (interestRange === undefined) {
        fromIndex = 0;
        toIndex = text.length;
    }
    else {
        fromIndex = offsetLastLexemes(text.slice(0, interestRange[0]), exports.SnippyWindowSize);
        toIndex = interestRange[1] + offsetFirstLexemes(text.slice(interestRange[1]), exports.SnippyWindowSize);
    }
    return function (newText, snippet) {
        // Try first to match close to the inserted range.
        let matchOffset = newText.slice(fromIndex, toIndex).indexOf(snippet.text);
        if (matchOffset !== -1) {
            matchOffset += fromIndex;
        }
        else {
            // If this fails, do global match
            matchOffset = newText.indexOf(snippet.text);
        }
        return {
            foundAt: matchOffset > -1 ? matchOffset : undefined,
        };
    };
}
function hasMinLexemeLength(text) {
    return lexemeLength(text) >= exports.MinTokenLength;
}
//# sourceMappingURL=snippyCompute.js.map