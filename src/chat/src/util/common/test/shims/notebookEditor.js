"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtHostNotebookEditor = void 0;
class ExtHostNotebookEditor {
    constructor(notebookData, selections) {
        this.notebookData = notebookData;
        this._selections = [];
        this._selections = selections;
    }
    get apiEditor() {
        if (!this._editor) {
            const that = this;
            this._editor = {
                get notebook() {
                    return that.notebookData.document;
                },
                get selection() {
                    return that._selections[0];
                },
                set selection(selection) {
                    this.selections = [selection];
                },
                get selections() {
                    return that._selections;
                },
                set selections(value) {
                    that._selections = value;
                },
                get visibleRanges() {
                    return [];
                },
                revealRange(range, revealType) {
                    // no-op
                },
                get viewColumn() {
                    return that._viewColumn;
                },
            };
        }
        return this._editor;
    }
}
exports.ExtHostNotebookEditor = ExtHostNotebookEditor;
//# sourceMappingURL=notebookEditor.js.map