"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentSnapshot = exports.WorkingCopyOriginalDocument = exports.WorkingCopyDerivedDocument = void 0;
exports.toOffsetEdits = toOffsetEdits;
exports.fromOffsetEdits = fromOffsetEdits;
const positionOffsetTransformer_1 = require("../../../../platform/editing/common/positionOffsetTransformer");
const chatResponseStreamImpl_1 = require("../../../../util/common/chatResponseStreamImpl");
const stringEdit_1 = require("../../../../util/vs/editor/common/core/edits/stringEdit");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const summarizeDocument_1 = require("./summarizedDocument/summarizeDocument");
class WorkingCopyDerivedDocument {
    get originalText() {
        return this._workingCopyOriginalDocument.text;
    }
    get text() {
        return this._derivedDocument.text;
    }
    get languageId() {
        return this._derivedDocument.languageId;
    }
    get derivedDocumentTransformer() {
        return this._derivedDocument.positionOffsetTransformer;
    }
    get originalDocumentTransformer() {
        return this._workingCopyOriginalDocument.transformer;
    }
    /**
     * All the edits reported through the progress reporter (combined into a single OffsetEdits object).
     */
    get allReportedEdits() {
        return this._workingCopyOriginalDocument.appliedEdits;
    }
    constructor(_derivedDocument) {
        this._derivedDocument = _derivedDocument;
        this._workingCopyOriginalDocument = new WorkingCopyOriginalDocument(this._derivedDocument.originalText);
    }
    createDerivedDocumentChatResponseStream(outputStream) {
        return new chatResponseStreamImpl_1.ChatResponseStreamImpl((_value) => {
            const value = this.applyAndTransformProgressItem(_value);
            outputStream.push(value);
        }, (reason) => {
            outputStream.clearToPreviousToolInvocation(reason);
        });
    }
    applyAndTransformProgressItem(value) {
        if (!(value instanceof vscodeTypes_1.ChatResponseTextEditPart)) {
            return value;
        }
        //           e_sum
        //   d0 ---------------> s0
        //   |                   |
        //   |                   |
        //   | e_ai_r            | e_ai
        //   |                   |
        //   |                   |
        //   v       e_sum_r     v
        ///  d1 ---------------> s1
        //
        // d0 - document
        // s0 - summarized document
        // e_sum - summarization edits
        // e_ai - AI edits
        //
        // The incoming AI edits `e_ai` are based on the derived summarized document `s0`.
        // But we need to apply them on the original document `d0`.
        // We can compute `e_ai_r` by rebasing `e_ai` against `inverse(e_sum)`
        // We can then compute `e_sum_r` by rebasing `e_sum` against `e_ai_r`.
        const d0 = this._workingCopyOriginalDocument;
        const s0 = this._derivedDocument;
        const e_sum = s0.edits;
        const e_ai = toOffsetEdits(s0.positionOffsetTransformer, value.edits);
        const e_ai_r = e_ai.rebaseSkipConflicting(e_sum.inverse(d0.text));
        const e_sum_r = e_sum.rebaseSkipConflicting(e_ai_r);
        const transformedProgressItem = new vscodeTypes_1.ChatResponseTextEditPart(value.uri, fromOffsetEdits(d0.transformer, e_ai_r));
        this._workingCopyOriginalDocument.applyOffsetEdits(e_ai_r);
        this._derivedDocument = new summarizeDocument_1.ProjectedDocument(this._workingCopyOriginalDocument.text, e_sum_r, this._derivedDocument.languageId);
        return transformedProgressItem;
    }
    rebaseEdits(edits) {
        // See comment from above explaining the rebasing
        const d0 = this._workingCopyOriginalDocument;
        const s0 = this._derivedDocument;
        const e_sum = s0.edits;
        const e_ai = toOffsetEdits(s0.positionOffsetTransformer, edits);
        const e_ai_r = e_ai.rebaseSkipConflicting(e_sum.inverse(d0.text));
        return fromOffsetEdits(d0.transformer, e_ai_r);
    }
    convertPostEditsOffsetToOriginalOffset(postEditsOffset) {
        return this._derivedDocument.projectBack(postEditsOffset);
    }
}
exports.WorkingCopyDerivedDocument = WorkingCopyDerivedDocument;
/**
 * Keeps track of the current document with edits applied immediately.
 * This simulates the EOL sequence behavior of VS Code, namely it keeps the EOL sequence
 * of the original document and it does not allow for mixed EOL sequences.
 */
class WorkingCopyOriginalDocument {
    get text() {
        return this._text;
    }
    get transformer() {
        if (!this._transformer) {
            this._transformer = new positionOffsetTransformer_1.PositionOffsetTransformer(this._text);
        }
        return this._transformer;
    }
    get appliedEdits() {
        return this._appliedEdits;
    }
    constructor(_text) {
        this._text = _text;
        this._transformer = null;
        this._appliedEdits = new stringEdit_1.StringEdit([]);
        // VS Code doesn't allow mixed EOL sequences, so the presence of one \r\n
        // indicates that the document uses \r\n as EOL sequence.
        this._eol = _text.includes('\r\n') ? '\r\n' : '\n';
    }
    /**
     * Checks if the edit would produce no changes when applied to the current document.
     */
    isNoop(offsetEdits) {
        return offsetEdits.isNeutralOn(this._text);
    }
    applyOffsetEdits(_offsetEdits) {
        const offsetEdits = _offsetEdits.normalizeEOL(this._eol);
        const edits = offsetEdits.replacements;
        let text = this._text;
        for (let i = edits.length - 1; i >= 0; i--) {
            const edit = edits[i];
            text = text.substring(0, edit.replaceRange.start) + edit.newText + text.substring(edit.replaceRange.endExclusive);
        }
        this._text = text;
        if (this._transformer) {
            this._transformer.applyOffsetEdits(offsetEdits);
        }
        this._appliedEdits = this._appliedEdits.compose(offsetEdits);
    }
}
exports.WorkingCopyOriginalDocument = WorkingCopyOriginalDocument;
class DocumentSnapshot {
    get text() {
        return this._text;
    }
    get transformer() {
        if (!this._transformer) {
            this._transformer = new positionOffsetTransformer_1.PositionOffsetTransformer(this._text);
        }
        return this._transformer;
    }
    constructor(_text) {
        this._text = _text;
        this._transformer = null;
    }
}
exports.DocumentSnapshot = DocumentSnapshot;
function toOffsetEdits(transformer, edits) {
    return transformer.toOffsetEdit(edits);
}
function fromOffsetEdits(transformer, edit) {
    return transformer.toTextEdits(edit);
}
//# sourceMappingURL=workingCopies.js.map