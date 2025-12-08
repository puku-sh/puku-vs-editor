"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtHostTextEditor = void 0;
const errors_1 = require("../../../vs/base/common/errors");
const position_1 = require("../../../vs/workbench/api/common/extHostTypes/position");
const range_1 = require("../../../vs/workbench/api/common/extHostTypes/range");
const selection_1 = require("../../../vs/workbench/api/common/extHostTypes/selection");
const textEdit_1 = require("../../../vs/workbench/api/common/extHostTypes/textEdit");
class TextEditorEdit {
    constructor(document, options) {
        this._collectedEdits = [];
        this._setEndOfLine = undefined;
        this._finalized = false;
        this._document = document;
        this._documentVersionId = document.version;
        this._undoStopBefore = options.undoStopBefore;
        this._undoStopAfter = options.undoStopAfter;
    }
    finalize() {
        this._finalized = true;
        return {
            documentVersionId: this._documentVersionId,
            edits: this._collectedEdits,
            setEndOfLine: this._setEndOfLine,
            undoStopBefore: this._undoStopBefore,
            undoStopAfter: this._undoStopAfter
        };
    }
    _throwIfFinalized() {
        if (this._finalized) {
            throw new Error('Edit is only valid while callback runs');
        }
    }
    replace(location, value) {
        this._throwIfFinalized();
        let range = null;
        if (location instanceof position_1.Position) {
            range = new range_1.Range(location, location);
        }
        else if (location instanceof range_1.Range) {
            range = location;
        }
        else {
            throw new Error('Unrecognized location');
        }
        this._pushEdit(range, value, false);
    }
    insert(location, value) {
        this._throwIfFinalized();
        this._pushEdit(new range_1.Range(location, location), value, true);
    }
    delete(location) {
        this._throwIfFinalized();
        let range = null;
        if (location instanceof range_1.Range) {
            range = location;
        }
        else {
            throw new Error('Unrecognized location');
        }
        this._pushEdit(range, null, true);
    }
    _pushEdit(range, text, forceMoveMarkers) {
        const validRange = this._document.validateRange(range);
        this._collectedEdits.push({
            range: validRange,
            text: text,
            forceMoveMarkers: forceMoveMarkers
        });
    }
    setEndOfLine(endOfLine) {
        this._throwIfFinalized();
        if (endOfLine !== textEdit_1.EndOfLine.LF && endOfLine !== textEdit_1.EndOfLine.CRLF) {
            throw (0, errors_1.illegalArgument)('endOfLine');
        }
        this._setEndOfLine = endOfLine;
    }
}
class ExtHostTextEditor {
    constructor(document, selections, options, visibleRanges, viewColumn) {
        this._selections = selections;
        this._options = options;
        this._visibleRanges = visibleRanges;
        this._viewColumn = viewColumn;
        const that = this;
        this.value = Object.freeze({
            get document() {
                return document;
            },
            set document(_value) {
                throw new errors_1.ReadonlyError('document');
            },
            // --- selection
            get selection() {
                return that._selections && that._selections[0];
            },
            set selection(value) {
                if (!(value instanceof selection_1.Selection)) {
                    throw (0, errors_1.illegalArgument)('selection');
                }
                that._selections = [value];
            },
            get selections() {
                return that._selections;
            },
            set selections(value) {
                if (!Array.isArray(value) || value.some(a => !(a instanceof selection_1.Selection))) {
                    throw (0, errors_1.illegalArgument)('selections');
                }
                that._selections = value;
            },
            // --- visible ranges
            get visibleRanges() {
                return that._visibleRanges;
            },
            set visibleRanges(_value) {
                throw new errors_1.ReadonlyError('visibleRanges');
            },
            // --- options
            get options() {
                return that._options;
            },
            set options(value) {
                throw new Error('Not implemented');
            },
            // --- view column
            get viewColumn() {
                return that._viewColumn;
            },
            set viewColumn(_value) {
                throw new errors_1.ReadonlyError('viewColumn');
            },
            // --- edit
            edit(callback, options = { undoStopBefore: true, undoStopAfter: true }) {
                throw new Error('Not implemented');
            },
            // --- snippet edit
            insertSnippet(snippet, where, options = { undoStopBefore: true, undoStopAfter: true }) {
                throw new Error('Not implemented');
            },
            setDecorations(decorationType, ranges) {
                throw new Error('Not implemented');
            },
            revealRange(range, revealType) {
                throw new Error('Not implemented');
            },
            show(column) {
                throw new Error('Not implemented');
            },
            hide() {
                throw new Error('Not implemented');
            }
        });
    }
    _acceptOptions(options) {
        this._options = options;
    }
    _acceptVisibleRanges(value) {
        this._visibleRanges = value.slice(0);
    }
    _acceptViewColumn(value) {
        this._viewColumn = value;
    }
    _acceptSelections(selections) {
        this._selections = selections;
    }
}
exports.ExtHostTextEditor = ExtHostTextEditor;
//# sourceMappingURL=textEditor.js.map