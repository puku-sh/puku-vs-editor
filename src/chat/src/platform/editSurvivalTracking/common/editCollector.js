"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffsetBasedTextDocument = exports.EditCollector = void 0;
const stringEdit_1 = require("../../../util/vs/editor/common/core/edits/stringEdit");
const offsetRange_1 = require("../../../util/vs/editor/common/core/ranges/offsetRange");
const diffService_1 = require("../../diff/common/diffService");
const edit_1 = require("../../editing/common/edit");
const offsetLineColumnConverter_1 = require("../../editing/common/offsetLineColumnConverter");
let EditCollector = class EditCollector {
    constructor(initialText, _diffService) {
        this.initialText = initialText;
        this._diffService = _diffService;
        this._document = new OffsetBasedTextDocument(initialText);
    }
    addEdits(edits) {
        this._document.applyTextEdits(edits);
    }
    getText() {
        return this._document.getValue();
    }
    async getEdits() {
        const newText = this.getText();
        const edits = await (0, edit_1.stringEditFromDiff)(this.initialText, newText, this._diffService);
        return edits;
    }
};
exports.EditCollector = EditCollector;
exports.EditCollector = EditCollector = __decorate([
    __param(1, diffService_1.IDiffService)
], EditCollector);
class OffsetBasedTextDocument {
    constructor(initialValue = '') {
        this._converter = undefined;
        this._value = '';
        this._value = initialValue;
    }
    getValue() {
        return this._value;
    }
    applyTextEdits(edits) {
        const offsetEdit = new stringEdit_1.StringEdit(edits.map(e => {
            const start = this.positionToOffset(e.range.start);
            const end = this.positionToOffset(e.range.end);
            return new stringEdit_1.StringReplacement(new offsetRange_1.OffsetRange(start, end), e.newText);
        }));
        this.applyOffsetEdit(offsetEdit);
    }
    applyOffsetEdit(edit) {
        this._value = edit.apply(this._value);
        this._converter = undefined;
    }
    positionToOffset(position) {
        if (!this._converter) {
            this._converter = new offsetLineColumnConverter_1.OffsetLineColumnConverter(this._value);
        }
        const line = position.line;
        if (line < 0) {
            return 0;
        }
        else if (line >= this._converter.lines) {
            return this._value.length;
        }
        const character = position.character;
        const lineOffet = this._converter.lineOffset(line + 1);
        if (character <= 0) {
            return lineOffet;
        }
        let endLineOffest;
        if (line + 1 < this._converter.lines) {
            endLineOffest = this._converter.lineOffset(line + 2);
            if (endLineOffest > lineOffet) {
                const ch = this._value.charCodeAt(endLineOffest - 1);
                if (ch === 13 /* CharCode.CarriageReturn */ || ch === 10 /* CharCode.LineFeed */) {
                    endLineOffest--;
                }
                if (ch === 10 /* CharCode.LineFeed */ && endLineOffest > lineOffet && this._value.charCodeAt(endLineOffest - 1) === 13 /* CharCode.CarriageReturn */) {
                    endLineOffest--;
                }
            }
            else {
                endLineOffest = lineOffet;
            }
        }
        else {
            endLineOffest = this._value.length;
        }
        if (character > endLineOffest - lineOffet) {
            return endLineOffest;
        }
        return lineOffet + character;
    }
}
exports.OffsetBasedTextDocument = OffsetBasedTextDocument;
//# sourceMappingURL=editCollector.js.map