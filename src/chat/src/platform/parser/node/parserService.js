"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.IParserService = void 0;
exports.vscodeToTreeSitterRange = vscodeToTreeSitterRange;
exports.treeSitterToVSCodeRange = treeSitterToVSCodeRange;
exports.vscodeToTreeSitterOffsetRange = vscodeToTreeSitterOffsetRange;
exports.treeSitterOffsetRangeToVSCodeRange = treeSitterOffsetRangeToVSCodeRange;
const services_1 = require("../../../util/common/services");
const vscodeTypes_1 = require("../../../vscodeTypes");
exports.IParserService = (0, services_1.createServiceIdentifier)('IParserService');
function vscodeToTreeSitterRange(range) {
    return {
        startPosition: { row: range.start.line, column: range.start.character },
        endPosition: { row: range.end.line, column: range.end.character }
    };
}
function treeSitterToVSCodeRange(range) {
    return new vscodeTypes_1.Range(range.startPosition.row, range.startPosition.column, range.endPosition.row, range.endPosition.column);
}
function vscodeToTreeSitterOffsetRange(range, document) {
    return {
        startIndex: document.offsetAt(range.start),
        endIndex: document.offsetAt(range.end)
    };
}
function treeSitterOffsetRangeToVSCodeRange(document, range) {
    return new vscodeTypes_1.Range(document.positionAt(range.startIndex), document.positionAt(range.endIndex));
}
//# sourceMappingURL=parserService.js.map