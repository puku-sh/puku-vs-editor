"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsTrackedEditData = exports.ArcTracker = void 0;
const nesHistoryContextProvider_1 = require("../../inlineEdits/common/workspaceEditTracker/nesHistoryContextProvider");
/**
 * The ARC (accepted and retained characters) counts how many characters inserted by the initial suggestion (trackedEdit)
 * stay unmodified after a certain amount of time after acceptance.
*/
class ArcTracker {
    constructor(originalText, _trackedEdit) {
        this.originalText = originalText;
        this._trackedEdit = _trackedEdit;
        const eNormalized = _trackedEdit.removeCommonSuffixPrefix(originalText);
        this._updatedTrackedEdit = eNormalized.mapData(() => new IsTrackedEditData(true));
    }
    handleEdits(edit) {
        const e = edit.mapData(_d => new IsTrackedEditData(false));
        const composedEdit = this._updatedTrackedEdit.compose(e);
        const onlyTrackedEdit = composedEdit.decomposeSplit(e => !e.data.isTrackedEdit).e2;
        this._updatedTrackedEdit = onlyTrackedEdit;
    }
    getAcceptedRestrainedCharactersCount() {
        const s = (0, nesHistoryContextProvider_1.sum)(this._updatedTrackedEdit.replacements, e => e.getNewLength());
        return s;
    }
    getOriginalCharacterCount() {
        return (0, nesHistoryContextProvider_1.sum)(this._trackedEdit.replacements, e => e.getNewLength());
    }
    getDebugState() {
        return {
            edits: this._updatedTrackedEdit.replacements.map(e => ({
                range: e.replaceRange.toString(),
                newText: e.newText,
                isTrackedEdit: e.data.isTrackedEdit,
            }))
        };
    }
}
exports.ArcTracker = ArcTracker;
class IsTrackedEditData {
    constructor(isTrackedEdit) {
        this.isTrackedEdit = isTrackedEdit;
    }
    join(data) {
        if (this.isTrackedEdit !== data.isTrackedEdit) {
            return undefined;
        }
        return this;
    }
}
exports.IsTrackedEditData = IsTrackedEditData;
//# sourceMappingURL=arcTracker.js.map