"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingGrammar = void 0;
const iterator_1 = require("../../../util/vs/base/common/iterator");
/**
 * Defines a grammar that moves the streaming response between states (S).
 * You give it an initial state and then a map of states the grammar is in, to
 * substrings that it looks for to move into a different state.
 */
class StreamingGrammar {
    constructor(initialState, grammar) {
        this.grammar = grammar;
        this.accumulator = '';
        this.currentEntries = [];
        /**
         * A list of tokens seen so far. "tokens" are substrings of the `deltaText`.
         * 'transitionTo' is set for tokens seen in the grammar when a state transiton happens.
         */
        this.tokens = [];
        this.state = initialState;
        this.currentEntries = Object.entries(grammar[initialState] || {});
    }
    /**
     * Gets whether the given state was visited.
     */
    visited(state) {
        return this.tokens.some(token => token.state === state);
    }
    /**
     * Convenience function that accumulates the string of tokens between
     * the given indices, optionally only for tokens in the given state.
     */
    accumulate(fromIndex = 0, toIndex = this.tokens.length, whenState) {
        let str = '';
        for (let i = fromIndex; i < toIndex && i < this.tokens.length; i++) {
            const token = this.tokens[i];
            if (whenState !== undefined) {
                if (token.state === whenState && !token.transitionTo) {
                    str += token.token;
                }
            }
            else {
                str += token.token;
            }
        }
        return str;
    }
    /** Appends text, returns the tokens that were added as a convenience. */
    append(deltaText) {
        let maxLength = 0;
        let found;
        const startIndex = this.tokens.length;
        this.accumulator += deltaText;
        for (const [key, toState] of this.currentEntries) {
            const index = this.accumulator.indexOf(key);
            if (index !== -1 && (!found || index < found.index)) {
                found = { index, toState, length: key.length };
            }
            maxLength = Math.max(maxLength, key.length);
        }
        if (found) {
            if (found.index > 0) {
                this.tokens.push({ state: this.state, token: this.accumulator.slice(0, found.index) });
            }
            this.tokens.push({ state: this.state, token: this.accumulator.slice(found.index, found.index + found.length), transitionTo: found.toState });
            const remainder = this.accumulator.slice(found.index + found.length);
            this.state = found.toState;
            this.currentEntries = Object.entries(this.grammar[found.toState] || {});
            this.accumulator = '';
            this.append(remainder);
        }
        else if (this.accumulator.length > maxLength) {
            // todo: we could use a boyer-moore-horspool lookup table to reduce
            // the amoung of accumulated text we need to keep
            this.tokens.push({ state: this.state, token: this.accumulator.slice(0, this.accumulator.length - maxLength) });
            this.accumulator = this.accumulator.slice(this.accumulator.length - maxLength);
        }
        return iterator_1.Iterable.slice(this.tokens, startIndex);
    }
    flush() {
        if (this.accumulator) {
            this.tokens.push({ state: this.state, token: this.accumulator });
            return iterator_1.Iterable.slice(this.tokens, -1);
        }
        return iterator_1.Iterable.empty();
    }
}
exports.StreamingGrammar = StreamingGrammar;
//# sourceMappingURL=streamingGrammar.js.map