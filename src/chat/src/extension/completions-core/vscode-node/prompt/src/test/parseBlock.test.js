"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("assert"));
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const parseBlock_1 = require("../parseBlock");
/**
 * Trimming modes for IsEmptyBlockStartTestCase below.
 */
var TrimMode;
(function (TrimMode) {
    TrimMode[TrimMode["NO_TRIM"] = 0] = "NO_TRIM";
    TrimMode[TrimMode["TRIM_TO_END_OF_LINE"] = 1] = "TRIM_TO_END_OF_LINE";
    TrimMode[TrimMode["TRIM_TO_END_OF_INPUT"] = 2] = "TRIM_TO_END_OF_INPUT";
})(TrimMode || (TrimMode = {}));
/**
 * A convenience class for testing BlockParser.isEmptyBlockStart.
 *
 * To use this, pass a string containing a snippet of source code, and use
 * 🟢 for cursor positions at which isEmptyBlockStart should return true,
 * and ❌ for cursor positions where it should return false.  Then call
 * .test() to run the tests.
 *
 * By default, for each cursor position it trims the line from the cursor
 * to the end (i.e., the cursor is always at the end of the line) before
 * executing the test.  Set the trimMode property to change this.
 */
class IsEmptyBlockStartTestCase {
    constructor(languageId, testCase) {
        this.languageId = languageId;
        this.trimMode = TrimMode.TRIM_TO_END_OF_INPUT;
        let text = '';
        const expectTrueOffsets = [];
        const expectFalseOffsets = [];
        let i = 0;
        // Must use for...of loop to avoid surrogate pair/UTF-16 weirdness
        for (const char of testCase) {
            switch (char) {
                case '🟢':
                    expectTrueOffsets.push(i);
                    break;
                case '❌':
                    expectFalseOffsets.push(i);
                    break;
                default:
                    text += char;
                    i++;
                    break;
            }
        }
        if (expectTrueOffsets.length === 0 && expectFalseOffsets.length === 0) {
            throw new Error('Test case must have at least one cursor');
        }
        this.text = text;
        this.expectTrueOffsets = expectTrueOffsets;
        this.expectFalseOffsets = expectFalseOffsets;
    }
    trimText(offset) {
        switch (this.trimMode) {
            case TrimMode.NO_TRIM:
                return this.text;
            case TrimMode.TRIM_TO_END_OF_LINE: {
                const nextNewline = this.text.indexOf('\n', offset);
                const fromNewline = nextNewline >= 0 ? this.text.slice(nextNewline) : '';
                return this.text.slice(0, offset) + fromNewline;
            }
            case TrimMode.TRIM_TO_END_OF_INPUT:
                return this.text.slice(0, offset);
        }
    }
    // TODO(eaftan): It would be nice if this could test arbitrary functions.
    async test() {
        const blockParser = (0, parseBlock_1.getBlockParser)(this.languageId);
        for (const offset of this.expectTrueOffsets) {
            const text = this.trimText(offset);
            const msg = `${this.text.slice(0, offset)}█${this.text.slice(offset)}`;
            // common helper to all breaks
            assert.strictEqual(await blockParser.isEmptyBlockStart(text, offset), true, msg);
        }
        for (const offset of this.expectFalseOffsets) {
            const text = this.trimText(offset);
            const msg = `${this.text.slice(0, offset)}█${this.text.slice(offset)}`;
            assert.strictEqual(await blockParser.isEmptyBlockStart(text, offset), false, msg);
        }
    }
    setTrimMode(mode) {
        this.trimMode = mode;
        return this;
    }
    static python(testCase) {
        return new IsEmptyBlockStartTestCase('python', testCase);
    }
    static javascript(testCase) {
        return new IsEmptyBlockStartTestCase('javascript', testCase);
    }
    static typescript(testCase) {
        return new IsEmptyBlockStartTestCase('typescript', testCase);
    }
    static ruby(testCase) {
        return new IsEmptyBlockStartTestCase('ruby', testCase);
    }
    static go(testCase) {
        return new IsEmptyBlockStartTestCase('go', testCase);
    }
}
function runTestCase(languageId, testCase) {
    const bodyWithAfter = (testCase.body || '') + (testCase.after || '');
    const text = testCase.before + bodyWithAfter;
    const blockParser = (0, parseBlock_1.getBlockParser)(languageId);
    // block is expected to be empty if no body
    const expectedEmpty = !testCase.body;
    // block is expected to be finished after body, if there is a body and an after
    const expectedFinish = testCase.body && testCase.after ? testCase.body.length : undefined;
    // cursor position is after the before text
    const offset = testCase.before.length;
    // print the text with a cursor indicator on failure
    const prettyPrint = ('\n' + testCase.before + '█' + bodyWithAfter).split('\n').join('\n\t| ');
    test(`empty block start:${expectedEmpty}`, async function () {
        const isEmpty = await blockParser.isEmptyBlockStart(text, offset);
        // test isEmpty matched expectation
        assert.strictEqual(isEmpty, expectedEmpty, prettyPrint);
    });
    test(`block finish:${expectedFinish}`, async function () {
        const isFinished = await blockParser.isBlockBodyFinished(testCase.before, bodyWithAfter, offset);
        // test isFinished matched expectation
        assert.strictEqual(isFinished, expectedFinish, prettyPrint);
    });
}
function runTestCases(languageId, testCases) {
    for (const testCase of testCases) {
        runTestCase(languageId, testCase);
    }
}
function getNodeStartTestCase(testCase) {
    let text = '';
    let i = 0;
    let expectedResult = 0;
    const positiveTests = [];
    const rejectedTests = [];
    // Must use for...of loop to avoid surrogate pair/UTF-16 weirdness
    for (const char of testCase) {
        switch (char) {
            //Test cases that should pass the test
            case '🟢':
                positiveTests.push(i);
                break;
            //Test cases that should fail the test
            case '❌':
                rejectedTests.push(i);
                break;
            //Location used for the assertions (begining of the node we want to detect)
            case '🔵':
                expectedResult = i;
                break;
            default:
                text += char;
                i++;
                break;
        }
    }
    return [text, positiveTests, rejectedTests, expectedResult];
}
/**
 * Helper function for testing `getNodeStart`
 *
 * To use this, pass a language ID and a string containing a snippet of source code, and use
 * 🔵 for a location that's used for assertion ( begining of the node we want to detect)
 * 🟢 for cursor positions at which `getNodeStart` should return the position 🔵,
 * and ❌ for cursor positions where it shouldn't.
 */
async function testGetNodeStart(languageId, testCase) {
    const blockParser = (0, parseBlock_1.getBlockParser)(languageId);
    const [code, positiveOffsets, rejectedOffsets, expected_result] = getNodeStartTestCase(testCase);
    for (const offset of positiveOffsets) {
        const start = await blockParser.getNodeStart(code, offset);
        assert.strictEqual(start, expected_result, 'Should get beginning of the scope');
    }
    for (const offset of rejectedOffsets) {
        const start = await blockParser.getNodeStart(code, offset);
        assert.notStrictEqual(start, expected_result, `Should not get begining of the scope - tested offset: ${offset}`);
    }
}
suite('parseBlock Tests', function () {
    suite('getBlockParser tests', function () {
        test('Supported and unsupported languages', function () {
            const supportedLanguages = ['python', 'javascript', 'typescript', 'go', 'ruby'];
            for (const language of supportedLanguages) {
                assert.ok((0, parseBlock_1.getBlockParser)(language));
            }
            // Taken from https://insights.stackoverflow.com/survey/2020#most-popular-technologies and
            // https://code.visualstudio.com/docs/languages/identifiers
            const unsupportedLanguages = ['sql', 'java', 'shellscript', 'php', 'cpp', 'c', 'kotlin'];
            for (const language of unsupportedLanguages) {
                assert.throws(() => (0, parseBlock_1.getBlockParser)(language));
            }
        });
    });
    suite('Python isEmptyBlockStart tests', function () {
        test('Invalid positions', async function () {
            const text = (0, ts_dedent_1.default) `
                def foo():
                    pass
            `;
            const blockParser = (0, parseBlock_1.getBlockParser)('python');
            await assert.rejects(blockParser.isEmptyBlockStart(text, text.length + 1));
        });
        test('simple examples', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    ❌d❌e❌f🟢 🟢f🟢o🟢o🟢(🟢)🟢:🟢
                        🟢p❌a❌s❌s❌
                `),
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    ❌i❌f🟢 🟢f🟢o🟢o🟢:🟢
                        🟢p❌a❌s❌s❌
                    ❌e❌l❌i❌f🟢 🟢b🟢a🟢r🟢:🟢
                        🟢p❌a❌s❌s❌
                    e❌l❌s❌e🟢:🟢
                        🟢p❌a❌ss❌
                `),
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    ❌i❌f🟢 🟢f🟢o🟢o🟢:🟢
                        🟢p❌a❌s❌s❌
                    e❌l❌s❌e🟢:🟢
                        🟢p❌a❌s❌s❌
                    `),
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    ❌t❌r❌y🟢:🟢
                        🟢p❌a❌s❌s❌
                    ❌e❌x❌c❌e❌p❌t🟢 🟢E🟢:🟢
                        🟢p❌a❌s❌s❌
                    ❌f❌i❌n❌a❌l❌l❌y🟢:🟢
                        🟢p❌a❌s❌s❌
                    `),
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    ❌t❌r❌y🟢:🟢
                        🟢p❌a❌s❌s❌
                    ❌f❌i❌n❌a❌l❌l❌y🟢:🟢
                        🟢p❌a❌s❌s❌
                `),
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    ❌f❌o❌r🟢 🟢f🟢o🟢o🟢 🟢i🟢n🟢 🟢b🟢a🟢r🟢:🟢
                        🟢p❌a❌s❌s❌
                    `),
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    ❌w❌h❌i❌l❌e🟢 🟢f🟢o🟢o🟢:🟢
                        🟢p❌a❌s❌s❌
                    `),
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    ❌w❌i❌t❌h🟢 🟢o🟢p🟢e🟢n🟢(🟢)🟢 🟢a🟢s🟢 🟢f🟢:🟢
                        🟢p❌a❌s❌s❌
                    `),
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    ❌c❌l❌a❌s❌s🟢 🟢F🟢o🟢o🟢:🟢
                        🟢p❌a❌s❌s❌
                    `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('func_decl', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.python('❌d❌e❌f🟢 🟢f🟢o🟢o🟢(🟢)🟢:🟢'),
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    ❌d❌e❌f🟢 🟢f🟢o🟢o🟢(🟢)🟢:🟢
                    🟢 🟢 🟢 🟢 🟢
                    🟢
                    `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('multiline_func_decl', async function () {
            const testCase = IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                     ❌d❌e❌f🟢 🟢f🟢o🟢o🟢(🟢a🟢,🟢
                             🟢b🟢,🟢
                             🟢c🟢)🟢:🟢
                         🟢
                     `);
            await testCase.test();
        });
        test('func_decl_in_middle_of_file', async function () {
            // Trailing whitespace is intentional, do not remove!
            const testCase = IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    """This is a module."""
                    import foo

                    ❌d❌e❌f🟢 🟢f🟢u🟢n🟢c🟢1🟢(🟢)🟢:🟢 🟢 🟢

                    print("Running at toplevel")
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE);
            // break 1
            await testCase.test();
        });
        test('func_decl_with_type_hints', async function () {
            const testCase = IsEmptyBlockStartTestCase.python('❌d❌e❌f🟢 🟢s🟢u🟢m🟢(🟢a🟢:🟢 🟢i🟢n🟢t🟢,🟢 🟢b🟢:🟢 🟢i🟢n🟢t🟢)🟢 🟢-🟢>🟢 🟢I🟢n🟢t🟢:🟢');
            await testCase.test();
        });
        test('block not empty', async function () {
            const testCase = IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                def func1():
                    ❌
                    pass❌
                    ❌
            `).setTrimMode(TrimMode.NO_TRIM);
            await testCase.test();
        });
        test('docstring', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    def my_func():
                    🟢 🟢 🟢 🟢 🟢"🟢"🟢"🟢T🟢h🟢i🟢s🟢 🟢i🟢s🟢 🟢a🟢 🟢d🟢o🟢c🟢s🟢t🟢r🟢i🟢n🟢g🟢.🟢"🟢"🟢"🟢
                `),
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    def my_func():
                    🟢 🟢 🟢 🟢 🟢'🟢'🟢'🟢T🟢h🟢i🟢s🟢 🟢i🟢s🟢 🟢a🟢 🟢d🟢o🟢c🟢s🟢t🟢r🟢i🟢n🟢g🟢.🟢'🟢'🟢'🟢
                `),
            ];
            for (const testCase of testCases) {
                // break 2
                await testCase.test();
            }
        });
        test('multiline docstring', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    def my_func():
                        """🟢T🟢h🟢i🟢s🟢 🟢i🟢s🟢 🟢a🟢 🟢m🟢u🟢l🟢t🟢i🟢l🟢i🟢n🟢e🟢 🟢d🟢o🟢c🟢s🟢t🟢r🟢i🟢n🟢g🟢.🟢
                        🟢
                        🟢H🟢e🟢r🟢e🟢'🟢s🟢 🟢a🟢n🟢o🟢t🟢h🟢e🟢r🟢 🟢l🟢i🟢n🟢e🟢.🟢"🟢"🟢"🟢
                `),
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    def my_func():
                        '''🟢T🟢h🟢i🟢s🟢 🟢i🟢s🟢 🟢a🟢 🟢m🟢u🟢l🟢t🟢i🟢l🟢i🟢n🟢e🟢 🟢d🟢o🟢c🟢s🟢t🟢r🟢i🟢n🟢g🟢.🟢
                        🟢
                        🟢H🟢e🟢r🟢e🟢'🟢s🟢 🟢a🟢n🟢o🟢t🟢h🟢e🟢r🟢 🟢l🟢i🟢n🟢e🟢.🟢'🟢'🟢'🟢
                `),
            ];
            for (const testCase of testCases) {
                // break 2
                await testCase.test();
            }
        });
        // TODO(eaftan): Ideally this test should pass, but the parse tree for unclosed docstrings
        // is very odd, and I can't think of a way to distinuish between a broken parse tree without
        // a block body and one with a block body.  In practice in the extension, the check for
        // isBlockBodyFinished prevents a multline suggestion from being given in this situation,
        // because the block isn't finished until after the pass statement.
        test.skip('docstring with body', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    def my_func():❌
                        "❌"❌"❌T❌h❌i❌s❌ ❌i❌s❌ ❌a❌ ❌d❌o❌c❌s❌t❌r❌i❌n❌g❌.❌"❌"❌"❌
                        pass
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    def my_func():❌
                        "❌"❌"❌T❌h❌i❌s❌ ❌i❌s❌ ❌a❌ ❌d❌o❌c❌s❌t❌r❌i❌n❌g❌.❌

                        ❌H❌e❌r❌e❌'❌s❌ ❌a❌n❌o❌t❌h❌e❌r❌ ❌l❌i❌n❌e❌.❌"❌"❌"❌
                        pass
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('Not EOL', async function () {
            const testCase = IsEmptyBlockStartTestCase.python('def my_❌func():').setTrimMode(TrimMode.NO_TRIM);
            await testCase.test();
        });
        test('if-elif-else', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    ❌i❌f🟢 🟢f🟢o🟢o🟢:🟢
                        🟢pass❌
                    ❌e❌l❌i❌f🟢 🟢b🟢a🟢r🟢:🟢
                        🟢pass❌
                    ❌e❌l❌s❌e🟢:
                        🟢pass❌
                    `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        // regression tests for #466
        test('block in error state', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    def create_tables(conn):🟢
                        """Create the tables students, courses and enrolled🟢"""🟢
                        conn = sqlite3.connect(results_db_path)❌
                        c = conn.cursor()❌
                        c.execute('''CREATE TABLE students (❌
                    ❌
                `),
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    if True:🟢
                        conn = sqlite3.connect(results_db_path)❌
                        c = conn.cursor()❌
                        c.execute('''CREATE TABLE students (❌
                    ❌
                `),
                IsEmptyBlockStartTestCase.python((0, ts_dedent_1.default) `
                    try:🟢
                        conn = sqlite3.connect(results_db_path)❌
                        c = conn.cursor()❌
                        c.execute('''CREATE TABLE students (❌
                    ❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
    });
    suite('JavaScript isEmptyBlockStart tests', function () {
        test('arrow_function', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌(❌a❌)❌ ❌=❌>🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌a❌ ❌=❌>🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                // Note: We don't try to give a multline-suggestion immediately after "async".
                // "async" is a keyword but not a reserved one, so it may be used as an
                // identifier.  Therefore when you have a partially written async function declaration,
                // tree-sitter often parses it as a completed node of some other type (e.g. "async (a)"
                // is parsed as a call of a function named "async" with arguments "a"). We'd have to do
                // very hacky things to support this.
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌a❌s❌y❌n❌c❌ ❌(❌a❌)❌ ❌=❌>🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌a❌s❌y❌n❌c❌ ❌a❌ ❌=❌>🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('try_statement, catch_clause, finally_clause', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌t❌r❌y🟢 🟢{🟢
                        🟢;❌
                    ❌}❌ ❌c❌a❌t❌c❌h🟢 🟢(🟢e🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌t❌r❌y🟢 🟢{🟢
                        🟢;❌
                    ❌}❌ ❌f❌i❌n❌a❌l❌l❌y🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌t❌r❌y🟢 🟢{🟢
                        🟢;❌
                    ❌}❌ ❌c❌a❌t❌c❌h🟢 🟢(🟢e🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌ ❌f❌i❌n❌a❌l❌l❌y🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('do_statement', async function () {
            const testCase = IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                ❌d❌o🟢 🟢{🟢
                    🟢;❌
                ❌}❌ ❌w❌h❌i❌l❌e❌ ❌(❌t❌r❌u❌e❌)❌;❌
            `);
            await testCase.test();
        });
        // tree-sitter's "for_in_statement" includes both for...in and for...of.
        test('for_in_statement', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌f❌o❌r🟢 🟢(🟢l🟢e🟢t🟢 🟢v🟢a🟢r🟢 🟢i🟢n🟢 🟢o🟢b🟢j🟢e🟢c🟢t🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌f❌o❌r🟢 🟢(🟢l🟢e🟢t🟢 🟢v🟢a🟢r🟢 🟢o🟢f🟢 🟢o🟢b🟢j🟢e🟢c🟢t🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('for_statement', async function () {
            const testCase = IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                ❌f❌o❌r🟢 🟢(🟢l🟢e🟢t🟢 🟢i🟢 🟢=🟢 🟢0🟢;🟢 🟢i🟢 🟢<🟢 🟢5🟢;🟢 🟢i🟢+🟢+🟢)🟢 {🟢
                    ;❌
                ❌}❌
            `);
            await testCase.test();
        });
        test('if_statement', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌i❌f🟢 🟢(🟢f🟢o🟢o🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌i❌f🟢 🟢(🟢f🟢o🟢o🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌ ❌e❌l❌s❌e🟢 🟢i❌f🟢 🟢(🟢b🟢a🟢r🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌i❌f🟢 🟢(🟢f🟢o🟢o🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌ ❌e❌l❌s❌e🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('method_definition', async function () {
            const testCase = IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                class Foo {
                    🟢b❌a❌r❌(❌)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                }
            `);
            await testCase.test();
        });
        test('switch_case, switch_default', async function () {
            // We don't give multline suggestions for switch_case and switch_default
            // because they are almost never blocks.
            const testCase = IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                switch (foo) {
                    ❌c❌a❌s❌e❌ ❌b❌a❌r❌:❌
                        ❌b❌r❌e❌a❌k❌;❌
                    ❌d❌e❌f❌a❌u❌l❌t❌:❌
                        ❌b❌r❌e❌a❌k❌;❌
                }
            `);
            await testCase.test();
        });
        test('while_statement', async function () {
            const testCase = IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                ❌w❌h❌i❌l❌e🟢 🟢(🟢t🟢r🟢u🟢e🟢)🟢 🟢{🟢
                    🟢;❌
                ❌}❌
            `);
            await testCase.test();
        });
        test('with_statement', async function () {
            const testCase = IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                ❌w❌i❌t❌h🟢 🟢(🟢o🟢)🟢 🟢{🟢
                    🟢;❌
                ❌}❌
            `);
            await testCase.test();
        });
        // For the remaining node types (e.g. "function", "generator_function"), tree-sitter
        // uses different node types to distinguish between ones used as declarations/statements
        // and ones used as expressions.  For example, "function_declaration" is a function declaration
        // used as a declaration/statement, and "function" is the same thing used as an expression.
        test('function', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌l❌e❌t❌ ❌f❌ ❌=❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌l❌e❌t❌ ❌f❌ ❌=❌ ❌a❌s❌y❌n❌c❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('function_declaration', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌a❌s❌y❌n❌c❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢(🟢)🟢 🟢{🟢
                    🟢 🟢 🟢 🟢 🟢
                    🟢}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('generator_function', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌l❌e❌t❌ ❌g❌ ❌=❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢*🟢 🟢g🟢e🟢n🟢e🟢r🟢a🟢t🟢o🟢r🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌l❌e❌t❌ ❌g❌ ❌=❌ ❌a❌s❌y❌n❌c❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢*🟢 🟢g🟢e🟢n🟢e🟢r🟢a🟢t🟢o🟢r🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('generator_function_declaration', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n🟢*🟢 🟢g🟢e🟢n🟢e🟢r🟢a🟢t🟢o🟢r🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌a❌s❌y❌n❌c❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢*🟢 🟢g🟢e🟢n🟢e🟢r🟢a🟢t🟢o🟢r🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('class', async function () {
            const testCase = IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                ❌l❌e❌t❌ ❌c❌ ❌=❌ ❌c❌l❌a❌s❌s🟢 🟢C🟢 🟢{🟢
                    🟢;❌
                ❌}❌
            `);
            await testCase.test();
        });
        test('class_declaration', async function () {
            const testCase = IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                ❌c❌l❌a❌s❌s🟢 🟢C🟢 🟢{🟢
                    🟢;❌
                ❌}❌
            `);
            await testCase.test();
        });
        // In JS/TS, when the code doesn't parse, it can be ambiguous whether
        // two functions are siblings or one is a local function under the other
        // (meaning the block is not empty and we should return false).
        //
        // TODO(eaftan): fix this and enable the test
        test.skip('local or siblings', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢o🟢o🟢(🟢)🟢 🟢{🟢
                        🟢
                    function bar() {}
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n❌ ❌f❌o❌o❌(❌)❌ ❌{❌
                        ❌
                        function bar() {}
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢o🟢o🟢(🟢)🟢 🟢{🟢
                    🟢
                    let a = 10;
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n❌ ❌f❌o❌o❌(❌)❌ ❌{❌
                        ❌
                        let a = 10;
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('regression test for #526', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    () => doIt(❌
                        ❌f❌o❌o❌.❌f❌o❌o❌,❌
                        ❌b❌a❌r❌.❌b❌a❌z❌,❌
                        ❌b❌a❌z❌.❌b❌a❌z❌
                    );
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    () => doIt(❌
                        ❌'❌a❌'❌,❌
                        ❌'❌a❌'❌,❌
                        ❌'❌a❌'❌
                    );
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.javascript((0, ts_dedent_1.default) `
                    () => doIt(❌
                        ❌'❌a❌'❌,❌
                        ❌'❌a❌'❌,❌
                        ❌'❌a❌'❌
                    );
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
    });
    suite('TypeScript isEmptyBlockStart tests', function () {
        // "declare" is a contextual keyword, so we don't try to give a multiline
        // suggestion until after "global," when it transitions from an identifer to a keyword.
        test('ambient_declaration', async function () {
            const testCase = IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                ❌d❌e❌c❌l❌a❌r❌e❌ ❌g❌l❌o❌b❌a❌l🟢 🟢{🟢
                    🟢;❌
                ❌}❌
            `);
            await testCase.test();
        });
        // "namespace" is a contextual keyword, so we don't try to give a multiline
        // suggestion until the open quote, when it transitions from an identifer to a keyword.
        test('internal_module', async function () {
            const testCase = IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                ❌n❌a❌m❌e❌s❌p❌a❌c❌e❌ ❌"🟢f🟢o🟢o🟢"🟢 🟢{🟢
                    🟢;❌
                ❌}❌
            `);
            await testCase.test();
        });
        // "module" is a contextual keyword, so we don't try to give a multiline
        // suggestion until the open quote, when it transitions from an identifer to a keyword.
        test('module', async function () {
            const testCase = IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                ❌m❌o❌d❌u❌l❌e❌ ❌"🟢f🟢o🟢o🟢"🟢 🟢{🟢
                    ;❌
                ❌}❌
            `);
            await testCase.test();
        });
        test('arrow_function', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌(❌a❌)❌ ❌=❌>🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌(❌a❌:❌ ❌s❌t❌r❌i❌n❌g❌)❌:❌ ❌v❌o❌i❌d❌ ❌=❌>🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌a❌ ❌=❌>🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌a❌s❌y❌n❌c❌ ❌(❌a❌)❌ ❌=❌>🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌a❌s❌y❌n❌c❌ ❌(❌a❌:❌ ❌s❌t❌r❌i❌n❌g❌)❌:❌ ❌v❌o❌i❌d❌ ❌=❌>🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌a❌s❌y❌n❌c❌ ❌a❌ ❌=❌>🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        // TODO(eaftan): a catch variable may have a type annotation of "any" or "unknown",
        // but the version of tree-sitter we're using doesn't support it yet.  Add
        // a test case when it's ready.  See https://github.com/tree-sitter/tree-sitter-typescript/commit/cad2b85fd1136a5e12d3e089030b81d9fe4a0a08
        test('try_statement, catch_clause, finally_clause', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌t❌r❌y🟢 🟢{🟢
                        🟢;❌
                    ❌}❌ ❌c❌a❌t❌c❌h🟢 🟢(🟢e🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌t❌r❌y🟢 🟢{🟢
                        🟢;❌
                    ❌}❌ ❌f❌i❌n❌a❌l❌l❌y🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌t❌r❌y🟢 🟢{🟢
                        🟢;❌
                    ❌}❌ ❌c❌a❌t❌c❌h🟢 🟢(🟢e🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌ ❌f❌i❌n❌a❌l❌l❌y🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('do_statement', async function () {
            const testCase = IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                ❌d❌o🟢 🟢{🟢
                    🟢;❌
                ❌}❌ ❌w❌h❌i❌l❌e❌ ❌(❌t❌r❌u❌e❌)❌;❌
            `);
            await testCase.test();
        });
        // tree-sitter's "for_in_statement" includes both for...in and for...of.
        test('for_in_statement', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌o❌r🟢 🟢(🟢l🟢e🟢t🟢 🟢v🟢a🟢r🟢 🟢i🟢n🟢 🟢o🟢b🟢j🟢e🟢c🟢t🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌o❌r🟢 🟢(🟢l🟢e🟢t🟢 🟢v🟢a🟢r🟢 🟢o🟢f🟢 🟢o🟢b🟢j🟢e🟢c🟢t🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('for_statement', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌o❌r🟢 🟢(🟢l🟢e🟢t🟢 🟢i🟢 🟢=🟢 🟢0🟢;🟢 🟢i🟢 🟢<🟢 🟢5🟢;🟢 🟢i🟢+🟢+🟢)🟢 {🟢
                        ;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌o❌r🟢 🟢(🟢l🟢e🟢t🟢 🟢i🟢:🟢 🟢i🟢n🟢t🟢 🟢=🟢 🟢0🟢;🟢 🟢i🟢 🟢<🟢 🟢5🟢;🟢 🟢i🟢+🟢+🟢)🟢 {🟢
                        ;❌
                    ❌}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('if_statement', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌i❌f🟢 🟢(🟢f🟢o🟢o🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌i❌f🟢 🟢(🟢f🟢o🟢o🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌ ❌e❌l❌s❌e🟢 🟢i❌f🟢 🟢(🟢b🟢a🟢r🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌i❌f🟢 🟢(🟢f🟢o🟢o🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌ ❌e❌l❌s❌e🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('method_definition', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    class Foo {
                        🟢b❌a❌r❌(❌)🟢 🟢{🟢
                            🟢;❌
                        ❌}❌
                    }
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    class Foo {
                        🟢b❌a❌r❌(❌i❌:❌ ❌i❌n❌t❌)🟢:❌ ❌v🟢o🟢i🟢d🟢 🟢{🟢
                            🟢;❌
                        ❌}❌
                    }
                `),
                // TODO(eaftan): fix sibling function issue and enable this test
                // IsEmptyBlockStartTestCase.typescript(dedent`
                //     class Foo {
                //         f❌o❌o❌(❌)🟢 🟢{🟢
                //         🟢}❌
                //         ❌b❌a❌r❌(❌)🟢 🟢{🟢
                //         🟢}❌
                //     }
                // `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('method_signature', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    class Foo {
                        🟢b❌a❌r❌(❌)🟢;❌
                    }
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    class Foo {
                        🟢b❌a❌r❌(❌i❌:❌ ❌i❌n❌t❌)🟢:❌ ❌v🟢o🟢i🟢d🟢;❌
                    }
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('switch_case, switch_default', async function () {
            // We don't give multline suggestions for switch_case and switch_default
            // because they are almost never blocks.
            const testCase = IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                switch (foo) {
                    ❌c❌a❌s❌e❌ ❌b❌a❌r❌:❌
                        ❌b❌r❌e❌a❌k❌;❌
                    ❌d❌e❌f❌a❌u❌l❌t❌:❌
                        ❌b❌r❌e❌a❌k❌;❌
                }
            `);
            await testCase.test();
        });
        test('while_statement', async function () {
            const testCase = IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                ❌w❌h❌i❌l❌e🟢 🟢(🟢t🟢r🟢u🟢e🟢)🟢 🟢{🟢
                    🟢;❌
                ❌}❌
            `);
            await testCase.test();
        });
        // For the remaining node types (e.g. "function", "generator_function"), tree-sitter
        // uses different node types to distinguish between ones used as declarations/statements
        // and ones used as expressions.  For example, "function_declaration" is a function declaration
        // used as a declaration/statement, and "function" is the same thing used as an expression.
        test('function', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌l❌e❌t❌ ❌f❌ ❌=❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌l❌e❌t❌ ❌f❌ ❌=❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢(🟢i🟢:🟢 🟢i🟢n🟢t🟢)🟢:🟢 🟢v🟢o🟢i🟢d🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌l❌e❌t❌ ❌f❌ ❌=❌ ❌a❌s❌y❌n❌c❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌l❌e❌t❌ ❌f❌ ❌=❌ ❌a❌s❌y❌n❌c❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢(i🟢:🟢 🟢i🟢n🟢t🟢)🟢:🟢 🟢v🟢o🟢i🟢d🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('function_declaration', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢(i🟢:🟢 🟢i🟢n🟢t🟢)🟢:🟢 🟢v🟢o🟢i🟢d🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌a❌s❌y❌n❌c❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌a❌s❌y❌n❌c❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢(🟢i🟢:🟢 🟢i🟢n🟢t🟢)🟢:🟢 🟢v🟢o🟢i🟢d🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢(🟢)🟢 🟢{🟢
                    🟢 🟢 🟢 🟢 🟢
                    🟢}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢(🟢i🟢:🟢 🟢i🟢n🟢t🟢)🟢:🟢 🟢v🟢o🟢i🟢d🟢 🟢{🟢
                    🟢 🟢 🟢 🟢 🟢
                    🟢}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢(❌x❌ ❌:❌ ❌n❌u❌m❌b❌e❌r❌,❌
                        🟢y🟢 🟢:🟢 🟢n🟢u🟢m🟢b🟢e🟢r🟢)🟢 🟢:🟢 🟢n🟢u🟢m🟢b🟢e🟢r🟢;❌
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢(🟢
                        🟢
                    let x = 0;
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    function f(❌
                    /** first parameter */
                    x: number,
                    /** second parameter */
                    y: number);
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    function getPosition() : {❌
                        start: number,❌
                        end: number❌
                    };
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('generator_function', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌l❌e❌t❌ ❌g❌ ❌=❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢*🟢 🟢g🟢e🟢n🟢e🟢r🟢a🟢t🟢o🟢r🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌l❌e❌t❌ ❌g❌ ❌=❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢*🟢 🟢g🟢e🟢n🟢e🟢r🟢a🟢t🟢o🟢r🟢(🟢i🟢:🟢 🟢i🟢n🟢t🟢)🟢:🟢 🟢v🟢o🟢i🟢d🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌l❌e❌t❌ ❌g❌ ❌=❌ ❌a❌s❌y❌n❌c❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢*🟢 🟢g🟢e🟢n🟢e🟢r🟢a🟢t🟢o🟢r🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌l❌e❌t❌ ❌g❌ ❌=❌ ❌a❌s❌y❌n❌c❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢*🟢 🟢g🟢e🟢n🟢e🟢r🟢a🟢t🟢o🟢r🟢(🟢i🟢:🟢 🟢i🟢n🟢t🟢)🟢:🟢 🟢v🟢o🟢i🟢d🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('generator_function_declaration', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n🟢*🟢 🟢g🟢e🟢n🟢e🟢r🟢a🟢t🟢o🟢r🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n🟢*🟢 🟢g🟢e🟢n🟢e🟢r🟢a🟢t🟢o🟢r🟢(🟢i🟢:🟢 🟢i🟢n🟢t🟢)🟢:🟢 🟢v🟢o🟢i🟢d🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌a❌s❌y❌n❌c❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢*🟢 🟢g🟢e🟢n🟢e🟢r🟢a🟢t🟢o🟢r🟢(🟢)🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌a❌s❌y❌n❌c❌ ❌f❌u❌n❌c❌t❌i❌o❌n🟢*🟢 🟢g🟢e🟢n🟢e🟢r🟢a🟢t🟢o🟢r🟢(🟢i🟢:🟢 🟢i🟢n🟢t🟢)🟢:🟢 🟢v🟢o🟢i🟢d🟢 🟢{🟢
                        🟢;❌
                    ❌}❌
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('class', async function () {
            const testCase = IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                ❌l❌e❌t❌ ❌c❌ ❌=❌ ❌c❌l❌a❌s❌s🟢 🟢C🟢 🟢{🟢
                    🟢;❌
                ❌}❌
            `);
            await testCase.test();
        });
        test('class_declaration', async function () {
            const testCase = IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                ❌c❌l❌a❌s❌s🟢 🟢C🟢 🟢{🟢
                    🟢;❌
                ❌}❌
            `);
            await testCase.test();
        });
        test('abstract_class_declaration', async function () {
            const testCase = IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
            ❌a❌b❌s❌t❌r❌a❌c❌t❌ ❌c❌l❌a❌s❌s🟢 🟢C🟢 🟢{🟢
                    🟢;❌
                ❌}❌
            `);
            await testCase.test();
        });
        // In JS/TS, when the code doesn't parse, it can be ambiguous whether
        // two functions are siblings or one is a local function under the other
        // (meaning the block is not empty and we should return false).
        //
        // TODO(eaftan): fix this and enable the test
        test.skip('local or siblings', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢o🟢o🟢(🟢)🟢 🟢{🟢
                        🟢
                    function bar() {}
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n❌ ❌f❌o❌o❌(❌)❌ ❌{❌
                        ❌
                        function bar() {}
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢o🟢o🟢(🟢)🟢 🟢{🟢
                    🟢
                    let a = 10;
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    ❌f❌u❌n❌c❌t❌i❌o❌n❌ ❌f❌o❌o❌(❌)❌ ❌{❌
                        ❌
                        let a = 10;
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('regression test for #526', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    () => doIt(❌
                        ❌f❌o❌o❌.❌f❌o❌o❌,❌
                        ❌b❌a❌r❌.❌b❌a❌z❌,❌
                        ❌b❌a❌z❌.❌b❌a❌z❌
                    );
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    () => doIt(❌
                        ❌'❌a❌'❌,❌
                        ❌'❌a❌'❌,❌
                        ❌'❌a❌'❌
                    );
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                    () => doIt(❌
                        ❌'❌a❌'❌,❌
                        ❌'❌a❌'❌,❌
                        ❌'❌a❌'❌
                    );
                `),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
        test('function type', async function () {
            const testCase = IsEmptyBlockStartTestCase.typescript((0, ts_dedent_1.default) `
                ❌f❌u❌n❌c❌t❌i❌o❌n🟢 🟢f🟢(🟢c🟢b🟢:🟢 🟢(🟢)🟢 🟢=🟢>🟢 🟢v🟢o🟢i🟢d🟢)🟢 🟢{🟢
                    🟢c❌b❌(❌)❌;❌
                ❌}❌
            `);
            await testCase.test();
        });
    });
    suite('Ruby isEmptyBlockStart tests', function () {
        test('simple examples', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.ruby((0, ts_dedent_1.default) `
                    def 🟢greet🟢
                        🟢puts "Hello"❌
                        ❌puts "Bye"❌
                    end
                `),
                IsEmptyBlockStartTestCase.ruby((0, ts_dedent_1.default) `
                    def 🟢greet❌
                        🟢puts "Hello"❌
                    end
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.ruby((0, ts_dedent_1.default) `
                    def 🟢greet❌
                        ❌puts "Hello"❌
                        ❌puts "Bye"❌
                    end
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
    });
    suite('Go isEmptyBlockStart tests', function () {
        test('simple examples', async function () {
            const testCases = [
                IsEmptyBlockStartTestCase.go((0, ts_dedent_1.default) `
                    func 🟢greet🟢()🟢 {🟢
                        🟢fmt.Println("Hello")❌
                        ❌fmt.Println("Bye")❌
                    }
                `),
                IsEmptyBlockStartTestCase.go((0, ts_dedent_1.default) `
                    func 🟢greet🟢()🟢 {❌
                        🟢fmt.Println("Hello")❌
                    }
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
                IsEmptyBlockStartTestCase.go((0, ts_dedent_1.default) `
                    func 🟢greet🟢()🟢 {❌
                        ❌fmt.Println("Hello")❌
                        ❌fmt.Println("Bye")❌
                    }
                `).setTrimMode(TrimMode.TRIM_TO_END_OF_LINE),
            ];
            for (const testCase of testCases) {
                await testCase.test();
            }
        });
    });
    suite('python block body tests', function () {
        const pythonBlockTests = [
            { before: 'def foo():', body: '\n\tpass' },
            { before: 'def foo', body: '():\n\tpass', after: '\npass' },
            { before: 'def foo():', body: '\n\tpass', after: '\npass' },
            { before: 'def foo():', body: '\n\tpass', after: '\n\t\npass' },
            { before: 'def foo(arg1', body: '):\n\tpass', after: '\npass' },
            { before: 'def foo(arg1', body: '\n\t\t):\n\tpass', after: '\npass' },
            { before: 'def foo(arg1,', body: ' arg2):\n\tpass', after: '\npass' },
            { before: 'def foo', body: '():\n\tpass', after: '\n\npass' },
            { before: 'def foo' },
            { before: 'def foo', body: '():\n\t1+1\n\t# comment' },
            { before: 'def foo', body: '():\n\t1+1\n\t# comment1', after: '\n# comment2' },
            { before: 'def foo', body: '():\n\t# comment' },
            { before: 'def foo', body: '():\n\t1+1 # comment1', after: '\n# comment2' },
            { before: 'def foo', body: '():\n\t# comment1\n\t1+1', after: '\n# comment2' },
            { before: 'def foo', body: '():\n\t# comment1\n\t# comment2' },
            { before: 'def foo', body: '():\n\t# comment1\n\t# comment2', after: '\n# comment3' },
            { before: 'def foo', body: '(): #comment1' },
            { before: 'def foo', body: '():#comment1' },
            { before: 'try:', after: '\nexcept: pass' },
            { before: 'try:', body: '\n\t1+1', after: '\nexcept: pass' },
            { before: 'try:\n\tpass\nfinally:\n\tif 1:', body: '\n\t\tpass', after: '\npass' },
            { before: 'try:\n\tpass\nfinally:\n\tif 1:', after: '\npass' },
            { before: 'if 1:\n\tpass\nelse:\n\tif 2:', after: '\npass' },
            { before: 'if 1:\n\tpass\nelse:\n\tif 2:', after: '\n\tpass' },
            { before: 'if 1:\n\tpass\nelse:\n\tif 2:', after: '\n\n\tpass' },
            {
                before: 'class C:\n\t"""docstring"""\n',
                body: '\tdef foo():\n\t\tpass\n\tdef bar():\n\t\tpass',
                after: '\npass',
            },
            { before: 'class C:\n', body: '\tdef foo():\n\tpass\n\tdef bar():\n\t\tpass', after: '\npass' },
            {
                before: 'for ',
                body: " record in records:\n\taccount_id = record'actor_id']\n\trecord['account_tier'] = account_tiers[account_id]",
                after: '\n\nprint(records)',
            },
        ];
        runTestCases('python', pythonBlockTests);
    });
    suite('Python getBlockStart tests', function () {
        test('class_definition', async function () {
            const code = (0, ts_dedent_1.default) `
                🔵class MyClass:🟢
                    🟢"""A simple🟢 example class"""🟢
                    🟢i = 12🟢345🟢
                    🟢
                    ❌def❌ f(self):❌
                        ❌return❌ 'hello❌ world'❌

                `;
            await testGetNodeStart('python', code);
        });
        test('elif_clause', async function () {
            const code = (0, ts_dedent_1.default) `
                def ❌sample():❌
                    ❌if 1❌:
                        ❌pass❌
                    🔵elif🟢 2🟢:🟢
                        🟢p🟢a🟢s🟢s
                    ❌else:❌
                        ❌pass❌
                `;
            await testGetNodeStart('python', code);
        });
        test('else_clause', async function () {
            const code = (0, ts_dedent_1.default) `
                ❌def ❌sample():❌
                    ❌if 1:❌
                        ❌pass❌
                    ❌elif 2:❌
                        ❌pass❌
                    🔵else🟢:🟢
                        🟢p🟢a🟢s🟢s
                `;
            await testGetNodeStart('python', code);
        });
        test('except_clause', async function () {
            const code = (0, ts_dedent_1.default) `
                ❌def❌ ❌sample❌()❌:❌
                    ❌try:❌
                        ❌pass❌
                    🔵except🟢:🟢
                        🟢p🟢a🟢s🟢s
                `;
            await testGetNodeStart('python', code);
        });
        test('finally_clause', async function () {
            const code = (0, ts_dedent_1.default) `
                ❌def❌ sa❌mple❌()❌:❌
                    ❌try:
                        ❌pass❌
                    🔵finally🟢:🟢
                        🟢p🟢a🟢s🟢s
                `;
            await testGetNodeStart('python', code);
        });
        test('for_statement', async function () {
            const code = (0, ts_dedent_1.default) `
                ❌def❌ ❌sample(❌):❌
                    ❌fruits❌ = ❌["apple", "banana", "cherry"]❌
                    🔵for🟢 x in🟢 fr🟢uits🟢:🟢
                        🟢p🟢a🟢s🟢s
                `;
            await testGetNodeStart('python', code);
        });
        test('function_definition', async function () {
            const code = (0, ts_dedent_1.default) `
                🔵def🟢 sam🟢ple🟢(🟢)🟢:
                    🟢"""Sample 🟢comment"""🟢
                    🟢fruits🟢 = 🟢["apple", 🟢"banana",🟢 "cherry"]🟢
                    ❌for❌ x❌ in❌ fruits❌:❌
                        ❌p❌a❌s❌s❌
                `;
            await testGetNodeStart('python', code);
        });
        test('if_statement', async function () {
            const code = (0, ts_dedent_1.default) `
                ❌def ❌sample❌(❌)❌:❌
                    🔵if 🟢1🟢:🟢
                        🟢p🟢a🟢s🟢s
                    ❌elif❌ 2:❌
                        ❌pass
                    ❌else:❌
                        ❌pass
                `;
            await testGetNodeStart('python', code);
        });
        test('try_statement', async function () {
            const code = (0, ts_dedent_1.default) `
                ❌def❌ ❌sample❌(❌)❌:❌
                    🔵try🟢:🟢
                        🟢p🟢a🟢s🟢s
                    ❌fin❌all❌y:❌
                        ❌pass❌
                `;
            await testGetNodeStart('python', code);
        });
        test('while_statement', async function () {
            const code = (0, ts_dedent_1.default) `
                ❌def❌ sa❌mple(❌)❌:❌
                    🔵while🟢 🟢Tr🟢ue🟢:🟢
                        🟢p🟢a🟢s🟢s
                `;
            await testGetNodeStart('python', code);
        });
        test('with_statement', async function () {
            const code = (0, ts_dedent_1.default) `
                ❌def❌ ❌sa❌mple❌(❌)❌:❌
                    🔵with🟢 🟢open🟢(🟢'fil🟢e_pa🟢th'🟢, 🟢'w')🟢 🟢as🟢 🟢f🟢i🟢l🟢e🟢:🟢
                        🟢p🟢a🟢s🟢s
                `;
            await testGetNodeStart('python', code);
        });
    });
    // tests for JavaScript and TypeScript: `⦃...⦄` delineates the body, `〚...〛` the type annotations,
    // which are stripped off for JavaScript
    const test1 = (0, ts_dedent_1.default) `
        function getTextOrNull(document〚: doc | null〛) {
            if (document === null)
            ⦃    return null;
            return document.getText();
        }⦄

        // this is a comment`;
    const test2 = (0, ts_dedent_1.default) `
        function getB(capital〚: boolean〛) {
            if (capital) {
                return "B";
            } else {⦃
                return "b";
            }⦄
        }`;
    function mkTestCase(src, stripTypes) {
        if (stripTypes) {
            src = src.replace(/〚.*?〛/g, '');
        }
        const bodyStart = src.indexOf('⦃');
        const bodyEnd = src.indexOf('⦄');
        return {
            before: src.slice(0, bodyStart),
            body: src.slice(bodyStart + 1, bodyEnd),
            after: src.slice(bodyEnd + 1),
        };
    }
    suite('JavaScript isBlockBodyFinished tests', function () {
        runTestCases('javascript', [mkTestCase(test1, true), mkTestCase(test2, true)]);
    });
    suite('TypeScript isBlockBodyFinished tests', function () {
        runTestCases('typescript', [mkTestCase(test1, false), mkTestCase(test2, false)]);
    });
});
//# sourceMappingURL=parseBlock.test.js.map