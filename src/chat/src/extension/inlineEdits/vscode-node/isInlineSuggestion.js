"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInlineSuggestion = isInlineSuggestion;
exports.isSubword = isSubword;
const offsetRange_1 = require("../../../util/vs/editor/common/core/ranges/offsetRange");
function isInlineSuggestion(cursorPos, doc, range, newText) {
    // If multi line insertion starts on the next line
    // All new lines have to be newly created lines
    if (range.isEmpty && cursorPos.line + 1 === range.start.line && range.start.character === 0
        && doc.lineAt(cursorPos.line).text.length === cursorPos.character // cursor is at the end of the line
        && newText.endsWith('\n') // next line should not have content
    ) {
        return true;
    }
    if (range.start.line !== range.end.line || range.start.line !== cursorPos.line) {
        return false;
    }
    const cursorOffset = doc.offsetAt(cursorPos);
    const offsetRange = new offsetRange_1.OffsetRange(doc.offsetAt(range.start), doc.offsetAt(range.end));
    const replacedText = offsetRange.substring(doc.getText());
    const cursorOffsetInReplacedText = cursorOffset - offsetRange.start;
    if (cursorOffsetInReplacedText < 0) {
        return false;
    }
    const textBeforeCursorIsEqual = replacedText.substring(0, cursorOffsetInReplacedText) === newText.substring(0, cursorOffsetInReplacedText);
    if (!textBeforeCursorIsEqual) {
        return false;
    }
    return isSubword(replacedText, newText);
}
/**
 * a is subword of b if a can be obtained by removing characters from b
*/
function isSubword(a, b) {
    for (let aIdx = 0, bIdx = 0; aIdx < a.length; bIdx++) {
        if (bIdx >= b.length) {
            return false;
        }
        if (a[aIdx] === b[bIdx]) {
            aIdx++;
        }
    }
    return true;
}
//# sourceMappingURL=isInlineSuggestion.js.map