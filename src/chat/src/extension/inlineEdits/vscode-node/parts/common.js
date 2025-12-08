"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringValueFromDoc = stringValueFromDoc;
exports.editFromTextDocumentContentChangeEvents = editFromTextDocumentContentChangeEvents;
const stringEdit_1 = require("../../../../util/vs/editor/common/core/edits/stringEdit");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const abstractText_1 = require("../../../../util/vs/editor/common/core/text/abstractText");
function stringValueFromDoc(doc) {
    return new abstractText_1.StringText(doc.getText());
}
function editFromTextDocumentContentChangeEvents(events) {
    const replacementsInApplicationOrder = events.map(e => stringEdit_1.StringReplacement.replace(offsetRange_1.OffsetRange.ofStartAndLength(e.rangeOffset, e.rangeLength), e.text));
    return stringEdit_1.StringEdit.composeSequentialReplacements(replacementsInApplicationOrder);
}
//# sourceMappingURL=common.js.map