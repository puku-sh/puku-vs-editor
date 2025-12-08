"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringEditFromDiff = stringEditFromDiff;
exports.stringEditFromTextContentChange = stringEditFromTextContentChange;
const stringEdit_1 = require("../../../util/vs/editor/common/core/edits/stringEdit");
const offsetRange_1 = require("../../../util/vs/editor/common/core/ranges/offsetRange");
const offsetLineColumnConverter_1 = require("./offsetLineColumnConverter");
async function stringEditFromDiff(original, modified, diffService, timeoutMs = 5000) {
    const diff = await diffService.computeDiff(original, modified, { maxComputationTimeMs: timeoutMs, computeMoves: false, ignoreTrimWhitespace: false });
    const origConverter = new offsetLineColumnConverter_1.OffsetLineColumnConverter(original);
    const modConverter = new offsetLineColumnConverter_1.OffsetLineColumnConverter(modified);
    const edits = [];
    for (const c of diff.changes) {
        for (const i of c.innerChanges ?? []) {
            const startMod = modConverter.positionToOffset(i.modifiedRange.getStartPosition());
            const endExMod = modConverter.positionToOffset(i.modifiedRange.getEndPosition());
            const newText = modified.substring(startMod, endExMod);
            const startOrig = origConverter.positionToOffset(i.originalRange.getStartPosition());
            const endExOrig = origConverter.positionToOffset(i.originalRange.getEndPosition());
            const origRange = new offsetRange_1.OffsetRange(startOrig, endExOrig);
            edits.push(new stringEdit_1.StringReplacement(origRange, newText));
        }
    }
    return new stringEdit_1.StringEdit(edits);
}
function stringEditFromTextContentChange(contentChanges) {
    const editsArr = contentChanges.map(c => new stringEdit_1.StringReplacement(offsetRange_1.OffsetRange.ofStartAndLength(c.rangeOffset, c.rangeLength), c.text));
    editsArr.reverse();
    const edits = new stringEdit_1.StringEdit(editsArr);
    return edits;
}
//# sourceMappingURL=edit.js.map