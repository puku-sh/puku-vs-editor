"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectedText = void 0;
const positionOffsetTransformer_1 = require("../../../../../platform/editing/common/positionOffsetTransformer");
const lazy_1 = require("../../../../../util/vs/base/common/lazy");
class ProjectedText {
    constructor(originalText, edits) {
        this.originalText = originalText;
        this.edits = edits;
        this._positionOffsetTransformer = new lazy_1.Lazy(() => new positionOffsetTransformer_1.PositionOffsetTransformer(this.text));
        this._originalPositionOffsetTransformer = new lazy_1.Lazy(() => new positionOffsetTransformer_1.PositionOffsetTransformer(this.originalText));
        this._text = new lazy_1.Lazy(() => this.edits.apply(this.originalText));
    }
    get positionOffsetTransformer() { return this._positionOffsetTransformer.value; }
    get originalPositionOffsetTransformer() { return this._originalPositionOffsetTransformer.value; }
    get text() { return this._text.value; }
    get lineCount() { return this.positionOffsetTransformer.getLineCount(); }
    get isOriginal() { return this.edits.isEmpty() || this.edits.isNeutralOn(this.originalText); }
    project(originalOffset) {
        return this.edits.applyToOffset(originalOffset);
    }
    projectOffsetRange(originalRange) {
        return this.edits.applyToOffsetRange(originalRange);
    }
    projectRange(originalRange) {
        const offsetRange = this.originalPositionOffsetTransformer.toOffsetRange(originalRange);
        const projectedRange = this.projectOffsetRange(offsetRange);
        return this.positionOffsetTransformer.toRange(projectedRange);
    }
    projectOffsetEdit(edit) {
        return edit.rebaseSkipConflicting(this.edits);
    }
    tryRebase(originalEdit) {
        const edit = originalEdit.tryRebase(this.edits);
        if (!edit) {
            return undefined;
        }
        const newEdits = this.edits.tryRebase(originalEdit);
        if (!newEdits) {
            return undefined;
        }
        return {
            edit,
            text: new ProjectedText(originalEdit.apply(this.originalText), newEdits),
        };
    }
    projectBack(projectedOffset) {
        return this.edits.applyInverseToOffset(projectedOffset);
    }
    projectBackOffsetEdit(edit) {
        return edit.rebaseSkipConflicting(this.edits.inverse(this.originalText));
    }
    projectBackTextEdit(edits) {
        const offsetEdit = this.positionOffsetTransformer.toOffsetEdit(edits);
        const back = this.projectBackOffsetEdit(offsetEdit);
        return this.originalPositionOffsetTransformer.toTextEdits(back);
    }
}
exports.ProjectedText = ProjectedText;
//# sourceMappingURL=projectedText.js.map