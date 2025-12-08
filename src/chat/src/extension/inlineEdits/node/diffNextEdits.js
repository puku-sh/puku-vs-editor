"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDiffNextEdits = generateDiffNextEdits;
const lineEdit_1 = require("../../../util/vs/editor/common/core/edits/lineEdit");
const codeMapper_1 = require("../../prompts/node/codeMapper/codeMapper");
/**
 * Generates the next edit based on the current lines and the desired lines.
 */
async function generateDiffNextEdits(diffService, currentLines, desiredLines) {
    const adjustedDesiredLines = eliminateTrimEmptyLinesDifference(currentLines, desiredLines);
    const diff = await diffService.computeDiff(currentLines.join('\n'), adjustedDesiredLines.join('\n'), {
        ignoreTrimWhitespace: false,
        maxComputationTimeMs: 1000,
        computeMoves: false
    });
    const lineEdit = createLineEditFromDiff(diff.changes, adjustedDesiredLines);
    return lineEdit;
}
function eliminateTrimEmptyLinesDifference(sourceLines, resultLines) {
    const leadingEmptyLineCount = getLeadingEmptyLineCount(sourceLines);
    const trailingEmptyLineCount = (0, codeMapper_1.getTrailingArrayEmptyLineCount)(sourceLines);
    const leadingResultEmptyLineCount = getLeadingEmptyLineCount(resultLines);
    const trailingResultEmptyLineCount = (0, codeMapper_1.getTrailingArrayEmptyLineCount)(resultLines);
    const trimResultLines = resultLines.slice(leadingResultEmptyLineCount, resultLines.length - trailingResultEmptyLineCount);
    return [
        ...sourceLines.slice(0, leadingEmptyLineCount),
        ...trimResultLines,
        ...sourceLines.slice(sourceLines.length - trailingEmptyLineCount, sourceLines.length)
    ];
}
function getLeadingEmptyLineCount(lines) {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() !== '') {
            return i;
        }
    }
    return lines.length;
}
function createLineEditFromDiff(changes, resultingLines) {
    return new lineEdit_1.LineEdit(changes.map((change) => {
        return createSingleLineEditFromDiff(change, resultingLines);
    }));
}
function createSingleLineEditFromDiff(diff, newLines) {
    return new lineEdit_1.LineReplacement(diff.original, newLines.slice(diff.modified.startLineNumber - 1, diff.modified.endLineNumberExclusive - 1));
}
//# sourceMappingURL=diffNextEdits.js.map