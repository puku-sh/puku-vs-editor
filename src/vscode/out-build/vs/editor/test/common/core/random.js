/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { numberComparator } from '../../../../base/common/arrays.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { StringEdit, StringReplacement } from '../../../common/core/edits/stringEdit.js';
import { OffsetRange } from '../../../common/core/ranges/offsetRange.js';
import { PositionOffsetTransformer } from '../../../common/core/text/positionToOffset.js';
import { Range } from '../../../common/core/range.js';
import { TextReplacement, TextEdit } from '../../../common/core/edits/textEdit.js';
export class Random {
    static { this.alphabetSmallLowercase = 'abcdefgh'; }
    static { this.alphabetSmallUppercase = 'ABCDEFGH'; }
    static { this.alphabetLowercase = 'abcdefghijklmnopqrstuvwxyz'; }
    static { this.alphabetUppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; }
    static { this.basicAlphabet = '      abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; }
    static { this.basicAlphabetMultiline = '      \n\n\nabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; }
    static create(seed) {
        return new MersenneTwister(seed);
    }
    stringGenerator(alphabet) {
        return {
            next: () => {
                const characterIndex = this.nextIntRange(0, alphabet.length);
                return alphabet.charAt(characterIndex);
            }
        };
    }
    nextString(length, alphabet = this.stringGenerator(Random.basicAlphabet)) {
        let randomText = '';
        for (let i = 0; i < length; i++) {
            randomText += alphabet.next();
        }
        return randomText;
    }
    nextMultiLineString(lineCount, lineLengthRange, alphabet = this.stringGenerator(Random.basicAlphabet)) {
        const lines = [];
        for (let i = 0; i < lineCount; i++) {
            const lineLength = this.nextIntRange(lineLengthRange.start, lineLengthRange.endExclusive);
            lines.push(this.nextString(lineLength, alphabet));
        }
        return lines.join('\n');
    }
    nextConsecutiveOffsets(range, count) {
        const offsets = OffsetRange.ofLength(count).map(() => this.nextIntRange(range.start, range.endExclusive));
        offsets.sort(numberComparator);
        return offsets;
    }
    nextConsecutivePositions(source, count) {
        const t = new PositionOffsetTransformer(source.getValue());
        const offsets = this.nextConsecutiveOffsets(new OffsetRange(0, t.text.length), count);
        return offsets.map(offset => t.getPosition(offset));
    }
    nextRange(source) {
        const [start, end] = this.nextConsecutivePositions(source, 2);
        return Range.fromPositions(start, end);
    }
    nextTextEdit(target, singleTextEditCount) {
        const singleTextEdits = [];
        const positions = this.nextConsecutivePositions(target, singleTextEditCount * 2);
        for (let i = 0; i < singleTextEditCount; i++) {
            const start = positions[i * 2];
            const end = positions[i * 2 + 1];
            const newText = this.nextString(end.column - start.column, this.stringGenerator(Random.basicAlphabetMultiline));
            singleTextEdits.push(new TextReplacement(Range.fromPositions(start, end), newText));
        }
        return new TextEdit(singleTextEdits).normalize();
    }
    nextStringEdit(target, singleTextEditCount, newTextAlphabet = Random.basicAlphabetMultiline) {
        const singleTextEdits = [];
        const positions = this.nextConsecutiveOffsets(new OffsetRange(0, target.length), singleTextEditCount * 2);
        for (let i = 0; i < singleTextEditCount; i++) {
            const start = positions[i * 2];
            const end = positions[i * 2 + 1];
            const range = new OffsetRange(start, end);
            const newTextLen = this.nextIntRange(range.isEmpty ? 1 : 0, 10);
            const newText = this.nextString(newTextLen, this.stringGenerator(newTextAlphabet));
            singleTextEdits.push(new StringReplacement(range, newText));
        }
        return new StringEdit(singleTextEdits).normalize();
    }
    nextSingleStringEdit(target, newTextAlphabet = Random.basicAlphabetMultiline) {
        const edit = this.nextStringEdit(target, 1, newTextAlphabet);
        return edit.replacements[0];
    }
    /**
     * Fills the given array with random data.
    */
    nextRandomValues(data) {
        for (let i = 0; i < data.length; i++) {
            data[i] = this.nextIntRange(0, 256);
        }
    }
    nextUuid() {
        if (!this._data) {
            this._data = new Uint8Array(16);
        }
        if (!this._hex) {
            this._hex = [];
            for (let i = 0; i < 256; i++) {
                this._hex.push(i.toString(16).padStart(2, '0'));
            }
        }
        this.nextRandomValues(this._data);
        // set version bits
        this._data[6] = (this._data[6] & 0x0f) | 0x40;
        this._data[8] = (this._data[8] & 0x3f) | 0x80;
        let i = 0;
        let result = '';
        result += this._hex[this._data[i++]];
        result += this._hex[this._data[i++]];
        result += this._hex[this._data[i++]];
        result += this._hex[this._data[i++]];
        result += '-';
        result += this._hex[this._data[i++]];
        result += this._hex[this._data[i++]];
        result += '-';
        result += this._hex[this._data[i++]];
        result += this._hex[this._data[i++]];
        result += '-';
        result += this._hex[this._data[i++]];
        result += this._hex[this._data[i++]];
        result += '-';
        result += this._hex[this._data[i++]];
        result += this._hex[this._data[i++]];
        result += this._hex[this._data[i++]];
        result += this._hex[this._data[i++]];
        result += this._hex[this._data[i++]];
        result += this._hex[this._data[i++]];
        return result;
    }
}
export function sequenceGenerator(sequence) {
    let index = 0;
    return {
        next: () => {
            if (index >= sequence.length) {
                throw new BugIndicatingError('End of sequence');
            }
            const element = sequence[index];
            index++;
            return element;
        }
    };
}
class MersenneTwister extends Random {
    constructor(seed) {
        super();
        this.mt = new Array(624);
        this.index = 0;
        this.mt[0] = seed >>> 0;
        for (let i = 1; i < 624; i++) {
            const s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
            this.mt[i] = (((((s & 0xffff0000) >>> 16) * 0x6c078965) << 16) + (s & 0x0000ffff) * 0x6c078965 + i) >>> 0;
        }
    }
    _nextInt() {
        if (this.index === 0) {
            this.generateNumbers();
        }
        let y = this.mt[this.index];
        y = y ^ (y >>> 11);
        y = y ^ ((y << 7) & 0x9d2c5680);
        y = y ^ ((y << 15) & 0xefc60000);
        y = y ^ (y >>> 18);
        this.index = (this.index + 1) % 624;
        return y >>> 0;
    }
    nextIntRange(start, endExclusive) {
        const range = endExclusive - start;
        return Math.floor(this._nextInt() / (0x100000000 / range)) + start;
    }
    generateNumbers() {
        for (let i = 0; i < 624; i++) {
            const y = (this.mt[i] & 0x80000000) + (this.mt[(i + 1) % 624] & 0x7fffffff);
            this.mt[i] = this.mt[(i + 397) % 624] ^ (y >>> 1);
            if ((y % 2) !== 0) {
                this.mt[i] = this.mt[i] ^ 0x9908b0df;
            }
        }
    }
}
//# sourceMappingURL=random.js.map