"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const streamingGrammar_1 = require("../../common/streamingGrammar");
(0, vitest_1.describe)('StreamingGrammar', () => {
    (0, vitest_1.it)('should initialize with the correct state', () => {
        const grammar = new streamingGrammar_1.StreamingGrammar(0 /* State.Initial */, {
            [0 /* State.Initial */]: { 'token1': 1 /* State.State1 */ },
            [1 /* State.State1 */]: { 'token2': 2 /* State.State2 */ },
        });
        (0, vitest_1.expect)(grammar.state).to.equal(0 /* State.Initial */);
    });
    (0, vitest_1.it)('should transition states correctly', () => {
        const grammar = new streamingGrammar_1.StreamingGrammar(0 /* State.Initial */, {
            [0 /* State.Initial */]: { 'token1': 1 /* State.State1 */ },
            [1 /* State.State1 */]: { 'token2': 2 /* State.State2 */ },
        });
        grammar.append('token1');
        (0, vitest_1.expect)(grammar.state).to.equal(1 /* State.State1 */);
        (0, vitest_1.expect)(grammar.tokens).to.deep.equal([
            { state: 0 /* State.Initial */, token: 'token1', transitionTo: 1 /* State.State1 */ }
        ]);
        grammar.append('token2');
        (0, vitest_1.expect)(grammar.state).to.equal(2 /* State.State2 */);
        (0, vitest_1.expect)(grammar.tokens).to.deep.equal([
            { state: 0 /* State.Initial */, token: 'token1', transitionTo: 1 /* State.State1 */ },
            { state: 1 /* State.State1 */, token: 'token2', transitionTo: 2 /* State.State2 */ }
        ]);
    });
    (0, vitest_1.it)('should accumulate text correctly', () => {
        const grammar = new streamingGrammar_1.StreamingGrammar(0 /* State.Initial */, {
            [0 /* State.Initial */]: { 'token1': 1 /* State.State1 */ },
            [1 /* State.State1 */]: { 'token2': 2 /* State.State2 */ },
        });
        grammar.append('some text');
        grammar.append(' to');
        grammar.append('ken1');
        (0, vitest_1.expect)(grammar.state).to.equal(1 /* State.State1 */);
        (0, vitest_1.expect)(grammar.tokens).to.deep.equal([
            { state: 0 /* State.Initial */, token: 'som' },
            { state: 0 /* State.Initial */, token: 'e t' },
            { state: 0 /* State.Initial */, token: 'ext ' },
            { state: 0 /* State.Initial */, token: 'token1', transitionTo: 1 /* State.State1 */ }
        ]);
    });
    (0, vitest_1.it)('should handle multiple transitions', () => {
        const grammar = new streamingGrammar_1.StreamingGrammar(0 /* State.Initial */, {
            [0 /* State.Initial */]: { 'token1': 1 /* State.State1 */ },
            [1 /* State.State1 */]: { 'token2': 2 /* State.State2 */ },
            [2 /* State.State2 */]: { 'token3': 3 /* State.State3 */ },
        });
        grammar.append('token1token2token3');
        (0, vitest_1.expect)(grammar.state).to.equal(3 /* State.State3 */);
        (0, vitest_1.expect)(grammar.tokens).to.deep.equal([
            { state: 0 /* State.Initial */, token: 'token1', transitionTo: 1 /* State.State1 */ },
            { state: 1 /* State.State1 */, token: 'token2', transitionTo: 2 /* State.State2 */ },
            { state: 2 /* State.State2 */, token: 'token3', transitionTo: 3 /* State.State3 */ }
        ]);
    });
    (0, vitest_1.it)('should flush remaining text', () => {
        const grammar = new streamingGrammar_1.StreamingGrammar(0 /* State.Initial */, {
            [0 /* State.Initial */]: { 'token1': 1 /* State.State1 */ },
            [1 /* State.State1 */]: { 'token2': 2 /* State.State2 */ },
        });
        grammar.append('some text');
        grammar.flush();
        (0, vitest_1.expect)(grammar.tokens).to.deep.equal([
            { state: 0 /* State.Initial */, token: 'som' },
            { state: 0 /* State.Initial */, token: 'e text' },
        ]);
    });
    (0, vitest_1.it)('should accumulate tokens correctly', () => {
        const grammar = new streamingGrammar_1.StreamingGrammar(0 /* State.Initial */, {
            [0 /* State.Initial */]: { 'token1': 1 /* State.State1 */ },
            [1 /* State.State1 */]: { 'token2': 2 /* State.State2 */ },
        });
        grammar.append('atoken1btoken2c');
        (0, vitest_1.expect)(grammar.accumulate(0, 2)).to.equal('atoken1');
        (0, vitest_1.expect)(grammar.accumulate(0, 2, 0 /* State.Initial */)).to.equal('a');
    });
});
//# sourceMappingURL=streamingGrammar.spec.js.map