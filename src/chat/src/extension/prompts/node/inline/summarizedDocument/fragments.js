"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConcatenatedStringFragment = exports.OriginalStringFragment = exports.LiteralStringFragment = exports.StringFragment = void 0;
exports.pushFragment = pushFragment;
const lazy_1 = require("../../../../../util/vs/base/common/lazy");
const stringEdit_1 = require("../../../../../util/vs/editor/common/core/edits/stringEdit");
const offsetRange_1 = require("../../../../../util/vs/editor/common/core/ranges/offsetRange");
const textLength_1 = require("../../../../../util/vs/editor/common/core/text/textLength");
class StringFragment {
    toString() { return this.text; }
    toEditFromOriginal(originalLength) {
        const replacements = [];
        let lastOriginalIdx = 0;
        let text = '';
        function emit(originalPos) {
            if (lastOriginalIdx !== originalPos || text.length > 0) {
                replacements.push(new stringEdit_1.StringReplacement(new offsetRange_1.OffsetRange(lastOriginalIdx, originalPos), text));
                text = '';
            }
        }
        function process(fragment) {
            if (fragment instanceof ConcatenatedStringFragment) {
                for (const f of fragment.fragments) {
                    process(f);
                }
            }
            else if (fragment instanceof LiteralStringFragment) {
                text += fragment.text;
            }
            else if (fragment instanceof OriginalStringFragment) {
                emit(fragment.range.start);
                lastOriginalIdx = fragment.range.endExclusive;
            }
        }
        process(this);
        emit(originalLength);
        return new stringEdit_1.StringEdit(replacements);
    }
}
exports.StringFragment = StringFragment;
class LiteralStringFragment extends StringFragment {
    constructor(text) {
        super();
        this.text = text;
        this._textLength = new lazy_1.Lazy(() => textLength_1.TextLength.ofText(this.text));
    }
    get length() { return this.text.length; }
    get textLength() { return this._textLength.value; }
}
exports.LiteralStringFragment = LiteralStringFragment;
class OriginalStringFragment extends StringFragment {
    constructor(range, originalText) {
        super();
        this.range = range;
        this.originalText = originalText;
        this._textLength = new lazy_1.Lazy(() => textLength_1.TextLength.ofSubstr(this.originalText, this.range));
    }
    get length() { return this.range.length; }
    get text() { return this.range.substring(this.originalText); }
    trimStart() {
        const trimmed = this.text.trimStart();
        if (trimmed.length === this.length) {
            return this;
        }
        return new OriginalStringFragment(new offsetRange_1.OffsetRange(this.range.endExclusive - trimmed.length, this.range.endExclusive), this.originalText);
    }
    trimEnd() {
        const trimmed = this.text.trimEnd();
        if (trimmed.length === this.length) {
            return this;
        }
        return new OriginalStringFragment(new offsetRange_1.OffsetRange(this.range.start, this.range.start + trimmed.length), this.originalText);
    }
    startsWith(str) { return this.text.startsWith(str); }
    endsWith(str) { return this.text.endsWith(str); }
    tryJoin(other) {
        if (this.range.endExclusive === other.range.start) {
            return new OriginalStringFragment(new offsetRange_1.OffsetRange(this.range.start, other.range.endExclusive), this.originalText);
        }
        return null;
    }
    get textLength() { return this._textLength.value; }
}
exports.OriginalStringFragment = OriginalStringFragment;
class ConcatenatedStringFragment extends StringFragment {
    static from(result) {
        if (result.length === 0) {
            return new LiteralStringFragment('');
        }
        if (result.length === 1) {
            return result[0];
        }
        return new ConcatenatedStringFragment(result);
    }
    constructor(fragments) {
        super();
        this.fragments = fragments;
        this.length = this.fragments.reduce((prev, cur) => prev + cur.length, 0);
        this._textLength = new lazy_1.Lazy(() => textLength_1.TextLength.sum(this.fragments, f => f.textLength));
    }
    get text() {
        return this.fragments.map(f => f.text).join('');
    }
    get textLength() { return this._textLength.value; }
}
exports.ConcatenatedStringFragment = ConcatenatedStringFragment;
function pushFragment(fragments, fragment) {
    if (fragment.length === 0) {
        return;
    }
    const last = fragments[fragments.length - 1];
    if (last && last instanceof OriginalStringFragment && fragment instanceof OriginalStringFragment) {
        const joined = last.tryJoin(fragment);
        if (joined) {
            fragments[fragments.length - 1] = joined;
            return;
        }
    }
    fragments.push(fragment);
}
//# sourceMappingURL=fragments.js.map