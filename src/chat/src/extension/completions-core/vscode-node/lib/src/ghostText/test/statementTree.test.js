"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// WARNING: the file needs to keep space for some of the tests. So please don;t reformat.
const assert_1 = __importDefault(require("assert"));
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const statementTree_1 = require("../statementTree");
suite('StatementTree', function () {
    test('tree with offsets includes the enclosing statements but no other statements outside the range', async function () {
        await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
			const ignoredStatement = 1;

			▶️function fibonacci(n: number): number ▶️{
				if (n <= 1) {
					return n;
				}
				▶️return❚ fibonacci(n - 1) + fibonacci(n - 2);◀️
			}◀️◀️
			`);
    });
    // Test for types of statements we want to match in supported languages and
    // document the behavior of the current grammar:
    // MARK: JavaScript / TypeScript
    suite('JavaScript / Typescript', function () {
        ['javascript', 'javascriptreact', 'jsx', 'typescript', 'typescriptreact'].forEach(language => {
            test(`${language} is supported`, function () {
                assert_1.default.strictEqual(statementTree_1.StatementTree.isSupported(language), true);
            });
        });
        test('recognizes simple expression statements', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️x = 1;◀️
				▶️y = 2;◀️
				`);
        });
        test('ignores comments', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️x = 1;◀️
				// comment
				▶️y = 2;◀️
				`);
        });
        test('recognizes export statements', async function () {
            await testStatementBuilding('typescript', `▶️export ▶️const x = 1;◀️◀️`);
        });
        test('recognizes import statements', async function () {
            await testStatementBuilding('typescript', `▶️import assert from 'assert';◀️`);
        });
        test('recognizes debugger statements', async function () {
            await testStatementBuilding('typescript', `▶️debugger;◀️`);
        });
        test('recognizes var declarations', async function () {
            await testStatementBuilding('typescript', `▶️var x = 1;◀️`);
        });
        test('recognizes lexical declarations', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️const x = 1;◀️
				▶️let y = 2;◀️
				`);
        });
        test('recognizes single-expression if statements as', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️if (x)
					▶️y = 1;◀️◀️
				`);
        });
        test('recognizes single-expression if statements on a single line as single statements', async function () {
            await testStatementBuilding('typescript', `▶️if (x) y = 1;◀️`);
        });
        test('recognizes single-expression if / else statements', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️if (x)
					▶️y = 1;◀️
				else
					▶️y = 2;◀️◀️
				`);
        });
        test('recognizes single-expression if / else statements on a single line as single statements', async function () {
            await testStatementBuilding('typescript', `▶️if (x) y = 1; else y = 2;◀️`);
            // Since TS and JS are different grammars and the else property changed to alternative ensure we are good in JS as well.
            await testStatementBuilding('javascript', `▶️if (x) y = 1; else y = 2;◀️`);
        });
        test('recognizes if statements with blocks', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️if (x) ▶️{
					▶️y = 1;◀️
				}◀️◀️
				`);
        });
        test('recognizes if / else statements with blocks', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️if (x) ▶️{
					▶️y = 1;◀️
				}◀️ else ▶️{
					▶️y = 2;◀️
				}◀️◀️
				`);
        });
        test('recognizes switch statements', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️switch (x) {
					case 1:
						▶️y = true;◀️
					default:
						▶️y = false;◀️
				}◀️
				`);
        });
        test('recognizes for statements', async function () {
            // The termination expression is not it's own statement anymore.
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️for (let i = 0; i < 10; i++) ▶️{
					▶️str += ' ';◀️
				}◀️◀️
				`);
        });
        test('recognizes for...in statements', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️for (const prop in object) ▶️{
					▶️console.log(prop, object[prop]);◀️
				}◀️◀️
				`);
        });
        test('recognizes for...of statements', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️for (const item of [1, 2, 3]) ▶️{
					▶️console.log(item);◀️
				}◀️◀️
				`);
        });
        test('recognizes while statements', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️while (true) ▶️{
					▶️break;◀️
				}◀️◀️
				`);
        });
        test('recognizes do statements', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️do ▶️{
					▶️break;◀️
				}◀️ while (true);◀️
				`);
        });
        test('recognizes try / catch / finally statements', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️try ▶️{
					▶️throw new Error('oops!');◀️
				}◀️ catch (e) ▶️{
					▶️console.error(e.message);◀️
				}◀️ finally ▶️{
					▶️console.log('done!');◀️
				}◀️◀️
				`);
        });
        test('recognizes with statements', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️with ({x: 1}) ▶️{
					▶️console.log(x);◀️ // 1
				}◀️◀️
				`);
        });
        test('recognizes continue statements', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️while (false) ▶️{
					▶️continue;◀️
				}◀️◀️
				`);
        });
        test('recognizes return statements', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️function foo() ▶️{
					▶️return;◀️
				}◀️◀️
				`);
        });
        test('recognizes labeled statements', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️outer: ▶️for await (chunk of stream) ▶️{
					▶️for (const char of chunk) ▶️{
						▶️if (char === '\n')
							▶️break outer;◀️◀️
					}◀️◀️
				}◀️◀️◀️
				`);
        });
        test('recognizes statements with ternary expressions as single statements', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️let i = featureFlag ? 0 : 1;◀️
				`);
        });
        test('recognizes function declarations', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️function noop() ▶️{
					// empty
				}◀️◀️
				`);
        });
        test('recognizes generator function declarations', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️function* values() ▶️{
					▶️yield 1;◀️
					▶️yield 2;◀️
				}◀️◀️
				`);
        });
        test('recognizes class declarations', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️class Empty {
					// empty
				}◀️
				`);
        });
        test('recognizes class field declarations', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️class ConstantIdentifier {
					▶️readonly id = 1◀️;
				}◀️
				`);
        });
        test('recognizes class method declarations', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️class Example {
					▶️constructor() ▶️{
						▶️this.value = Math.random();◀️
					}◀️◀️

					▶️getValue() ▶️{
						▶️return this.value;◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes class getter and setter declarations', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️class Example {
					▶️set value(newValue) ▶️{
						▶️this.value = newValue;◀️
					}◀️◀️

					▶️get value() ▶️{
						▶️return this.value;◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes type alias declarations', async function () {
            await testStatementBuilding('typescript', `▶️type OptionalIdentifier = number | undefined;◀️`);
        });
        test('recognizes interface declarations', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️interface Vector {
					x: number;
					y: number;
				}◀️
				`);
        });
        test('recognizes enum declarations', async function () {
            await testStatementBuilding('typescript', (0, ts_dedent_1.default) `
				▶️enum Direction {
					North,
					South,
					East,
					West
				}◀️
				`);
        });
        test('node.isCompoundStatementType is true for splittable statements that may contain other statements', async function () {
            const env_1 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = 'if (x) { y = 1; }';
                const tree = __addDisposableResource(env_1, statementTree_1.StatementTree.create('typescript', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(1);
                assert_1.default.ok(statement);
                assert_1.default.strictEqual(statement.isCompoundStatementType, true);
            }
            catch (e_1) {
                env_1.error = e_1;
                env_1.hasError = true;
            }
            finally {
                __disposeResources(env_1);
            }
        });
        test('node.isCompoundStatementType is false for un-splittable statements', async function () {
            const env_2 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = 'const y = 1;';
                const tree = __addDisposableResource(env_2, statementTree_1.StatementTree.create('typescript', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(1);
                assert_1.default.ok(statement);
                assert_1.default.strictEqual(statement.isCompoundStatementType, false);
            }
            catch (e_2) {
                env_2.error = e_2;
                env_2.hasError = true;
            }
            finally {
                __disposeResources(env_2);
            }
        });
    });
    // MARK: Python
    suite('Python', function () {
        test('python is supported', function () {
            assert_1.default.strictEqual(statementTree_1.StatementTree.isSupported('python'), true);
        });
        test('recognizes simple expression statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️x = 1◀️
				▶️y = 2◀️
				`);
        });
        test('ignores comments', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️x = 1◀️
				# comment
				▶️y = 2◀️
				`);
        });
        test('recognizes import statements', async function () {
            await testStatementBuilding('python', `▶️import assert◀️`);
        });
        test('recognizes from import statements', async function () {
            await testStatementBuilding('python', `▶️from assert import strict◀️`);
        });
        test('recognizes from future import statements', async function () {
            await testStatementBuilding('python', `▶️from __future__ import annotations◀️`);
        });
        test('recognizes print statements', async function () {
            await testStatementBuilding('python', `▶️print a◀️`);
        });
        test('recognizes assert statements', async function () {
            await testStatementBuilding('python', `▶️assert x◀️`);
        });
        test('recognizes return statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️def example():
					▶️▶️return 1◀️◀️◀️
				`);
        });
        test('recognizes delete statements', async function () {
            await testStatementBuilding('python', `▶️del x◀️`);
        });
        test('recognizes raise statements', async function () {
            await testStatementBuilding('python', `▶️raise ValueError◀️`);
        });
        test('recognizes pass statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️def example():
					▶️▶️pass◀️◀️◀️`);
        });
        test('recognizes break statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️while True:
					▶️▶️break◀️◀️◀️
				`);
        });
        test('recognizes continue statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️while True:
					▶️▶️continue◀️◀️◀️
				`);
        });
        test('recognizes global statements', async function () {
            await testStatementBuilding('python', `▶️global x◀️`);
        });
        test('recognizes nonlocal statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️def example():
					▶️▶️nonlocal x◀️◀️◀️`);
        });
        test('recognizes exec statements', async function () {
            await testStatementBuilding('python', `▶️exec 'x+=1' in None◀️`);
        });
        test('recognizes statements with list comprehensions as single statements', async function () {
            await testStatementBuilding('python', `▶️some_powers_of_two = [2**n for in range(1,6) if n != 5]◀️`);
        });
        test('recognizes statements with lamba expressions as single statements', async function () {
            await testStatementBuilding('python', `▶️fn = lambda x: x+1◀️`);
        });
        test('recognizes if statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️if x:
					▶️▶️y = 1◀️◀️◀️
				`);
        });
        test('recognizes if statements on a single line as single statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️if x: y = 1◀️
				`);
        });
        test('recognizes if / else statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️if x:
					▶️▶️y = 1◀️◀️
				else:
					▶️▶️y = 2◀️◀️◀️
				`);
        });
        test('recognizes compact if / else statements as compound statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️if x: ▶️▶️y = 1◀️◀️
				else: ▶️▶️y = 2◀️◀️◀️
				`);
        });
        test('recognizes if / elif / else statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️if x:
					▶️▶️y = 1◀️◀️
				elif y:
					▶️▶️y = 2◀️◀️
				else:
					▶️▶️y = 3◀️◀️◀️
				`);
        });
        test('recognizes statements with conditional expressions as single statements', async function () {
            await testStatementBuilding('python', `▶️result = x if y else z◀️`);
        });
        test('recognizes for statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️for i in range(10):
					▶️▶️y = 1◀️◀️◀️
				`);
        });
        test('recognizes for / else statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️for line in lines:
					▶️▶️print line◀️◀️
				else:
					▶️▶️print x◀️◀️◀️
				`);
        });
        test('recognizes while statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️while x:
					▶️▶️print y◀️◀️◀️
				`);
        });
        test('recognizes while / else statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️while x:
					▶️▶️print y◀️◀️
				else:
					▶️▶️print z◀️◀️◀️
				`);
        });
        test('recognizes try / except / finally statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️try:
					▶️▶️x = 1◀️◀️
				except:
					▶️▶️x = 2◀️◀️
				finally:
					▶️▶️x = 3◀️◀️◀️
				`);
        });
        test('recognizes with statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️with open('file.txt') as f:
					▶️▶️x = f.read()◀️◀️◀️
				`);
        });
        test('recognizes function definitions', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️def add(x, y):
					▶️▶️return x + y◀️◀️◀️
				`);
        });
        test('recognizes docstrings as expressions', async function () {
            // this is slightly odd that the grammar gives these an expression type,
            // but it is ok for the purposes of completion trimming and block
            // position determination
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️def example():
					▶️▶️"""
					This is a docstring.
					"""◀️
					▶️pass◀️◀️◀️
				`);
        });
        test('recognizes class definitions', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️class Example:
						▶️▶️pass◀️◀️◀️
				`);
        });
        test('recognizes class method definitions', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️class Example:
					▶️▶️def method(self):
						▶️▶️pass◀️◀️◀️◀️◀️
				`);
        });
        test('recognizes decorated definitions', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️@decorator1
				@decorator2
				▶️def example():
					▶️▶️pass◀️◀️◀️◀️
				`);
        });
        test('recognizes match statements', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️match x:▶️
					case 1:
						▶️▶️y = 1◀️◀️
					case 2:
						▶️▶️y = 2◀️◀️
					case _:
						▶️▶️y = 3◀️◀️◀️◀️
				`);
        });
        test('permits type annotations on variable assignments', async function () {
            await testStatementBuilding('python', `▶️x: list[int] = []◀️`);
        });
        test('permits type annotations on functions', async function () {
            await testStatementBuilding('python', (0, ts_dedent_1.default) `
				▶️def example(x: int) -> int:
					▶️▶️return x + 1◀️◀️◀️
				`);
        });
        test('permits type aliases but omits the type keyword from the statement', async function () {
            // this is to document the behavior of the current grammar
            // type alias is not supported in 0.23 Python grammar. Results in no statement.
            await testStatementBuilding('python', `type Vector = list[float]`);
        });
        test('node.isCompoundStatementType is false for un-splittable statements', async function () {
            const env_3 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = 'y = 1';
                const tree = __addDisposableResource(env_3, statementTree_1.StatementTree.create('python', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(1);
                assert_1.default.ok(statement);
                assert_1.default.strictEqual(statement.isCompoundStatementType, false);
            }
            catch (e_3) {
                env_3.error = e_3;
                env_3.hasError = true;
            }
            finally {
                __disposeResources(env_3);
            }
        });
        test('node.isCompoundStatementType is true for if statements', async function () {
            const env_4 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = 'if x:\n\tpass';
                const tree = __addDisposableResource(env_4, statementTree_1.StatementTree.create('python', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(1);
                assert_1.default.ok(statement);
                assert_1.default.strictEqual(statement.isCompoundStatementType, true);
            }
            catch (e_4) {
                env_4.error = e_4;
                env_4.hasError = true;
            }
            finally {
                __disposeResources(env_4);
            }
        });
        test('node.isCompoundStatementType is true for for statements', async function () {
            const env_5 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = 'for i in range(10):\n\tpass';
                const tree = __addDisposableResource(env_5, statementTree_1.StatementTree.create('python', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(1);
                assert_1.default.ok(statement);
                assert_1.default.strictEqual(statement.isCompoundStatementType, true);
            }
            catch (e_5) {
                env_5.error = e_5;
                env_5.hasError = true;
            }
            finally {
                __disposeResources(env_5);
            }
        });
        test('node.isCompoundStatementType is true for while statements', async function () {
            const env_6 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = 'while x:\n\tpass';
                const tree = __addDisposableResource(env_6, statementTree_1.StatementTree.create('python', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(1);
                assert_1.default.ok(statement);
                assert_1.default.strictEqual(statement.isCompoundStatementType, true);
            }
            catch (e_6) {
                env_6.error = e_6;
                env_6.hasError = true;
            }
            finally {
                __disposeResources(env_6);
            }
        });
        test('node.isCompoundStatementType is true for try statements', async function () {
            const env_7 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = 'try:\n\tpass\nexcept:\n\tpass';
                const tree = __addDisposableResource(env_7, statementTree_1.StatementTree.create('python', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(1);
                assert_1.default.ok(statement);
                assert_1.default.strictEqual(statement.isCompoundStatementType, true);
            }
            catch (e_7) {
                env_7.error = e_7;
                env_7.hasError = true;
            }
            finally {
                __disposeResources(env_7);
            }
        });
        test('node.isCompoundStatementType is true for with statements', async function () {
            const env_8 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = 'with open("file.txt") as f:\n\tpass';
                const tree = __addDisposableResource(env_8, statementTree_1.StatementTree.create('python', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(1);
                assert_1.default.ok(statement);
                assert_1.default.strictEqual(statement.isCompoundStatementType, true);
            }
            catch (e_8) {
                env_8.error = e_8;
                env_8.hasError = true;
            }
            finally {
                __disposeResources(env_8);
            }
        });
        test('node.isCompoundStatementType is true for function definition statements', async function () {
            const env_9 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = 'def example():\n\tpass';
                const tree = __addDisposableResource(env_9, statementTree_1.StatementTree.create('python', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(1);
                assert_1.default.ok(statement);
                assert_1.default.strictEqual(statement.isCompoundStatementType, true);
            }
            catch (e_9) {
                env_9.error = e_9;
                env_9.hasError = true;
            }
            finally {
                __disposeResources(env_9);
            }
        });
        test('node.isCompoundStatementType is true for class definition statements', async function () {
            const env_10 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = 'class Example:\n\tpass';
                const tree = __addDisposableResource(env_10, statementTree_1.StatementTree.create('python', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(1);
                assert_1.default.ok(statement);
                assert_1.default.strictEqual(statement.isCompoundStatementType, true);
            }
            catch (e_10) {
                env_10.error = e_10;
                env_10.hasError = true;
            }
            finally {
                __disposeResources(env_10);
            }
        });
        test('node.isCompoundStatementType is true for decorated definition statements', async function () {
            const env_11 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = '@decorator\ndef example():\n\tpass';
                const tree = __addDisposableResource(env_11, statementTree_1.StatementTree.create('python', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(1);
                assert_1.default.ok(statement);
                assert_1.default.strictEqual(statement.isCompoundStatementType, true);
            }
            catch (e_11) {
                env_11.error = e_11;
                env_11.hasError = true;
            }
            finally {
                __disposeResources(env_11);
            }
        });
        test('node.isCompoundStatementType is true for match statements', async function () {
            const env_12 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = 'match x:\n\tcase 1:\n\t\tpass';
                const tree = __addDisposableResource(env_12, statementTree_1.StatementTree.create('python', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(1);
                assert_1.default.ok(statement);
                assert_1.default.strictEqual(statement.isCompoundStatementType, true);
            }
            catch (e_12) {
                env_12.error = e_12;
                env_12.hasError = true;
            }
            finally {
                __disposeResources(env_12);
            }
        });
    });
    // MARK: Go
    suite('Go', function () {
        test('go is supported', function () {
            assert_1.default.strictEqual(statementTree_1.StatementTree.isSupported('go'), true);
        });
        test('recognizes package clauses', async function () {
            await testStatementBuilding('go', `▶️package main◀️`);
        });
        test('recognizes function declarations', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func example() ▶️{}◀️◀️
				`);
        });
        test('recognizes method declarations', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func (self Document) GetLine(n int) ▶️{}◀️◀️
				`);
        });
        test('recognizes import declarations', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️import "fmt"◀️
				`);
        });
        test('recognizes grouped import declarations', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️import (
					"fmt"
					"os
				)◀️
				`);
        });
        test('ignores comments', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func main() ▶️{
					// comment
				}◀️◀️
				`);
        });
        test('ignores block comments', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				/*
				 * Comment
				 */
				▶️func main() ▶️{}◀️◀️
				`);
        });
        test('recognizes single constant declarations', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️const zero = 0◀️
				`);
        });
        test('recognizes grouped constant declarations', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️const (
					zero = 0
					one = 1
				)◀️
				`);
        });
        test('recognizes var declarations', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️var counter = 0◀️
				`);
        });
        test('recognizes type declarations', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️type a b◀️
				`);
        });
        test('recognizes simple expression statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func main() ▶️{
					▶️x := 1◀️
				}◀️◀️
				`);
        });
        test('recognizes return statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func main() ▶️{
					▶️return◀️
				}◀️◀️
				`);
        });
        test('recognizes go statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func main() ▶️{
					▶️go f()◀️
				}◀️◀️
				`);
        });
        test('recognizes defer statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func main() ▶️{
					▶️defer f()◀️
				}◀️◀️
				`);
        });
        test('recognizes if statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func main() ▶️{
					▶️if a ▶️{
						▶️b◀️
					}◀️◀️
				}◀️◀️
				`);
        });
        test('recognizes if statements with an initializer', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func main() ▶️{
					▶️if b := a(); b < 0 ▶️{
						▶️b *= -1◀️
					}◀️◀️
				}◀️◀️
				`);
        });
        test('recognizes if / else statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func main() ▶️{
					▶️if a ▶️{
						▶️b()◀️
					}◀️ else ▶️{
						▶️c()◀️
					}◀️◀️
				}◀️◀️
				`);
        });
        test('recognizes simple for statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func main() ▶️{
					▶️for ▶️{
						▶️a()◀️
					}◀️◀️
				}◀️◀️
				`);
        });
        test('recognizes for statements with conditions', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️
				▶️import "fmt"◀️

				▶️func main() ▶️{
					▶️for i:= 0; i < 10; i++ ▶️{
						▶️fmt.Println(i)◀️
					}◀️◀️
				}◀️◀️
				`);
        });
        test('recognizes expression switch statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️
				▶️import "fmt"◀️

				▶️func main() ▶️{
					▶️switch a {
						case 1:
							▶️b◀️
						case 2:
							▶️c◀️
						default:
							▶️d◀️
					}◀️
				}◀️◀️
				`);
        });
        test('recognizes type switch statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func debug(i interface{}) ▶️{
					▶️switch v := i.(type) {
						case int:
							▶️fmt.Printf("%v is an integer", v)◀️
						case string:
							▶️fmt.Printf("%q is a string", v)◀️
						default:
							▶️fmt.Printf("%T is unknown", v)◀️
					}◀️
				}◀️◀️
				`);
        });
        test('recognizes select statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func demux(a chan string, b chan string) ▶️{
					▶️select {
						case msg := <-a:
							▶️dispatch(msg)◀️
						case msg := <-b:
							▶️dispatch(msg)◀️
					}◀️
				}◀️◀️
				`);
        });
        test('recognizes labeled statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func main() ▶️{
				▶️start:
					▶️a()◀️◀️
					▶️b()◀️
				}◀️◀️
				`);
        });
        test('recognizes fallthrough statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func main() ▶️{
					▶️switch i {
						case 0:
							▶️fallthrough◀️
						default:
							▶️f(i)◀️
					}◀️
				}◀️◀️
				`);
        });
        test('recognizes break statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func main() ▶️{
					▶️switch i {
						case 0:
							▶️break◀️
						default:
							▶️f(i)◀️
					}◀️
				}◀️◀️
				`);
        });
        test('recognizes continue statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func main() ▶️{
					▶️for i := 0; i < 10; i++ ▶️{
						▶️if i == 0 ▶️{
							▶️continue◀️
						}◀️◀️
						▶️f(i)◀️
					}◀️◀️
				}◀️◀️
				`);
        });
        test('recognizes goto statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func main() ▶️{
					▶️goto end◀️
				▶️end:
					▶️return◀️◀️
				}◀️◀️
				`);
        });
        test('recognizes nested blocks', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func main() ▶️{
					▶️{
						▶️a()◀️
					}◀️
				}◀️◀️
				`);
        });
        test('recognizes empty statements', async function () {
            await testStatementBuilding('go', (0, ts_dedent_1.default) `
				▶️package main◀️

				▶️func noop() ▶️{
					▶️;◀️
				}◀️◀️
				`);
        });
        test('node.isCompoundStatementType is false for un-splittable statements', async function () {
            await assertStatementIsNotCompoundType((0, ts_dedent_1.default) `
				package main

				func main() {
					❚x := 1
				}
			`);
        });
        test('node.isCompoundStatementType is true for function declarations', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				package main

				❚func main() {}
			`);
        });
        test('node.isCompoundStatementType is true for method declarations', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				package main

				❚func (self Document) GetLine (n int) {}
			`);
        });
        test('node.isCompoundStatementType is true for if statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				package main

				func main() {
					❚if a {
						b
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for for statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				package main

				func main() {
					❚for i := 0; i < 10; i++ {
						a()
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for expression switch statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				package main

				func main() {
					❚switch a {
						case 1:
							b
						default:
							c
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for type switch statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				package main

				func f(i interface{}) {
					❚switch v := i.(type) {
						case int:
							b
						default:
							c
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for select statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				package main

				func demux(a chan string, b chan string) {
					❚select {
						case msg := <-a:
							dispatch(msg)
						case msg := <-b:
							dispatch(msg)
					}
				}
			`);
        });
        async function testStatementIsCompoundType(text, expectedResult) {
            const env_13 = { stack: [], error: void 0, hasError: false };
            try {
                const posIndicator = '❚';
                const offset = text.indexOf(posIndicator);
                const doc = text.replace(posIndicator, '');
                const tree = __addDisposableResource(env_13, statementTree_1.StatementTree.create('go', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(offset + 1);
                assert_1.default.ok(statement, `Statement not found at offset ${offset}`);
                assert_1.default.strictEqual(statement.isCompoundStatementType, expectedResult);
            }
            catch (e_13) {
                env_13.error = e_13;
                env_13.hasError = true;
            }
            finally {
                __disposeResources(env_13);
            }
        }
        async function assertStatementIsCompoundType(text) {
            await testStatementIsCompoundType(text, true);
        }
        async function assertStatementIsNotCompoundType(text) {
            await testStatementIsCompoundType(text, false);
        }
    });
    // MARK: Php
    suite('PHP', function () {
        test('Php is supported', function () {
            assert_1.default.strictEqual(statementTree_1.StatementTree.isSupported('php'), true);
        });
        test('recognizes simple expressions', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️echo "hello";◀️
				▶️$b = $a = 5;◀️
				?>
				`);
        });
        test('recognizes named if statements', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️if (1 == 2) ▶️{
					▶️echo "hello";◀️
				}◀️◀️
				?>
				`);
        });
        test('recognizes if statements with else', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️if (1 == 2) ▶️{
					▶️echo "hello";◀️
				}◀️ else ▶️{
					▶️echo "world";◀️
				}◀️◀️
				?>
				`);
        });
        test('recognizes if statements with else if', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️if (1 == 2) ▶️{
					▶️echo "hello";◀️
				}◀️ elseif (1 == 3) ▶️{
					▶️echo "world";◀️
				}◀️ else ▶️{
					▶️echo "foo";◀️
				}◀️◀️
				?>
				`);
        });
        test('recognizes switch statements', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️switch ($a) {
					case 1:
						▶️echo "hello";◀️
						▶️break;◀️
					case 2:
						▶️echo "world";◀️
						▶️break;◀️
					default:
						▶️echo "foo";◀️
				}◀️
				?>
				`);
        });
        test('recognizes while statements', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️while (true) ▶️{
					▶️break;◀️
				}◀️◀️
				?>
				`);
        });
        test('recognizes do statements', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️do ▶️{
					▶️break;◀️
				}◀️ while (true);◀️
				?>
				`);
        });
        test('recognizes for statements', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️for ($i = 0; $i < 10; $i++) ▶️{
					▶️$str += ' ';◀️
				}◀️◀️
				?>
				`);
        });
        test('recognizes foreach statements', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️foreach ($arr as $key => $value) ▶️{
					▶️echo $key;◀️
				}◀️◀️
				?>
				`);
        });
        test('recognizes try statements', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️try ▶️{
					▶️throw new Exception();◀️
				}◀️ catch (Exception $e) ▶️{
					▶️echo $e;◀️
				}◀️ finally ▶️{
					▶️echo "done";◀️
				}◀️◀️
				?>
				`);
        });
        test('recognizes function declarations', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️function example($arg_1) ▶️{
					▶️echo "hello";◀️
					▶️return $retval;◀️
				}◀️◀️
				?>
				`);
        });
        test('recognizes class declarations', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️class Example {
				}◀️
				?>
				`);
        });
        test('recognizes class method declarations', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️class Example {
					▶️public function example($arg_1) ▶️{
						▶️echo "hello";◀️
						▶️return $retval;◀️
					}◀️◀️
				}◀️
				?>
				`);
        });
        test('recognizes class field declarations', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️class Example {
					▶️public $field_1;◀️
					▶️private $field_2;◀️
				}◀️
				?>
				`);
        });
        test('recognizes class constant declarations', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️class Example {
					▶️const EXAMPLE = 1;◀️
				}◀️
				?>
				`);
        });
        test('recognizes class interface and trait uses', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️class Example extends BaseClass implements Interface1, Interface2 {
					▶️use Trait1, Trait2;◀️
				}◀️
				?>
				`);
        });
        test('recognizes interface declarations', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️interface Example {
					▶️public function example($arg_1);◀️
				}◀️
				?>
				`);
        });
        test('recognizes trait declarations', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️trait Example {
					▶️public function example($arg_1) ▶️{
						▶️echo "hello";◀️
					}◀️◀️
				}◀️
				?>
				`);
        });
        test('recognizes namespace declarations', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️namespace Example;◀️
				?>
				`);
        });
        test('recognizes namespace use declarations', async function () {
            await testStatementBuilding('php', (0, ts_dedent_1.default) `
				<?php
				▶️use Example\\ExampleClass;◀️
				?>
				`);
        });
        test('node.isCompoundStatementType is true for splittable statements that may contain other statements', async function () {
            const env_14 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = (0, ts_dedent_1.default) `<?php
			if (true)
			{
				$foo = 1;
			}
			?>`;
                const tree = __addDisposableResource(env_14, statementTree_1.StatementTree.create('php', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(6);
                assert_1.default.ok(statement);
                assert_1.default.strictEqual(statement.isCompoundStatementType, true);
            }
            catch (e_14) {
                env_14.error = e_14;
                env_14.hasError = true;
            }
            finally {
                __disposeResources(env_14);
            }
        });
        test('node.isCompoundStatementType is false for un-splittable statements', async function () {
            const env_15 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = (0, ts_dedent_1.default) `<?php
			$foo = 1;
			?>`;
                const tree = __addDisposableResource(env_15, statementTree_1.StatementTree.create('php', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(6);
                assert_1.default.ok(statement);
                assert_1.default.strictEqual(statement.isCompoundStatementType, false);
            }
            catch (e_15) {
                env_15.error = e_15;
                env_15.hasError = true;
            }
            finally {
                __disposeResources(env_15);
            }
        });
    });
    // MARK: Ruby
    suite('Ruby', function () {
        test('ruby is supported', function () {
            assert_1.default.strictEqual(statementTree_1.StatementTree.isSupported('ruby'), true);
        });
        test('recognizes simple expression statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️x = 1◀️
				▶️y = 2◀️
				`);
        });
        test('ignores comments', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️x = 1◀️
				# comment
				▶️y = 2◀️
				`);
        });
        test('recognizes if statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️if ▶️x◀️
					▶️y = 1◀️
				end◀️
				`);
        });
        test('recognizes if / else statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️if ▶️x◀️
					▶️y = 1◀️
				else
					▶️y = 2◀️
				end◀️
				`);
        });
        test('recognizes if / elsif / else statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️if ▶️x◀️
					▶️y = 1◀️
				elsif ▶️y◀️
					▶️y = 2◀️
				else
					▶️y = 3◀️
				end◀️
				`);
        });
        test('recognizes unless statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️unless ▶️x◀️
					▶️y = 1◀️
				end◀️
				`);
        });
        test('recognizes unless / else statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️unless ▶️x◀️
					▶️y = 1◀️
				else
					▶️y = 2◀️
				end◀️
				`);
        });
        test('recognizes unless / elsif / else statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️unless ▶️x◀️
					▶️y = 1◀️
				elsif ▶️y◀️
					▶️y = 2◀️
				else
					▶️y = 3◀️
				end◀️
				`);
        });
        test('recognizes if modifier statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️▶️x = 1◀️ if y◀️
				`);
        });
        test('recognizes unless modifier statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️▶️x = 1◀️ unless y◀️
				`);
        });
        test('recognizes range statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️x = 1..10◀️
				`);
        });
        test('recognizes case statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️case ▶️x◀️
					▶️when 1
						▶️y = 1◀️◀️
					▶️when 2
						▶️y = 2◀️◀️
					else
						▶️y = 3◀️
				end◀️
				`);
        });
        test('recognizes for statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️for i in 1..10 do
					▶️y = 1◀️
				end◀️
				`);
        });
        test('recognizes while statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️while ▶️x◀️
					▶️y = 1◀️
				end◀️
				`);
        });
        test('recognizes until statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️until ▶️x◀️
					▶️y = 1◀️
				end◀️
				`);
        });
        test('recognizes loop modifier statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️▶️sleep◀️ while idle◀️
				▶️▶️sleep◀️ until idle◀️
				`);
        });
        test('recognizes begin / rescue / else / ensure statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️begin
					▶️x = 1◀️
				rescue
					▶️x = 2◀️
				else
					▶️x = 3◀️
				ensure
					▶️x = 4◀️
				end◀️
				`);
        });
        test('recognizes begin statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️BEGIN {
					▶️x = 1◀️
				}◀️
				`);
        });
        test('recognizes end statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️END {
					▶️x = 1◀️
				}◀️
				`);
        });
        test('recognizes class definitions', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️class Example < Base
					▶️x = 1◀️
				end◀️
				`);
        });
        test('recognizes class definitions with methods', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️class Example < Base
					▶️def method
						▶️x = 1◀️
					end◀️
				end◀️
				`);
        });
        test('recognizes module definitions', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️module Example
					▶️x = 1◀️
				end◀️
				`);
        });
        test('recognizes module definitions with methods', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️module Example
					▶️def method
						▶️x = 1◀️
					end◀️
				end◀️
				`);
        });
        test('recognizes def statements', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️def example
					▶️x = 1◀️
				end◀️
				`);
        });
        test('recognizes method invocation with a block argument,', async function () {
            await testStatementBuilding('ruby', (0, ts_dedent_1.default) `
				▶️someArray.select do |item|
					▶️item %2 == 0◀️
				end◀️
				`);
        });
        test('node.isCompoundStatementType is true for splittable statements that may contain other statements', async function () {
            const env_16 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = (0, ts_dedent_1.default) `
			if x
			    y = 1
			end

			case x
			when x
			    y = 1
			end

			while x
			    y = 1
			end

			until x
			    y = 1
			end

			for x in y
			    y = 1
			end

			begin
			    y = 1
			rescue
			    y = 1
			else
			    y = 1
			ensure
			    y = 1
			end

			class X
			    y = 1
			end

			module X
			    y = 1
			end

			def x
			    y = 1
			end
			`;
                const tree = __addDisposableResource(env_16, statementTree_1.StatementTree.create('ruby', doc, 0, doc.length), false);
                await tree.build();
                const if_statement = tree.statementAt(1);
                const case_statement = tree.statementAt(20);
                const while_statement = tree.statementAt(68);
                const until_statement = tree.statementAt(107);
                const for_statement = tree.statementAt(146);
                const begin_statement = tree.statementAt(145);
                const class_statement = tree.statementAt(191);
                const module_statement = tree.statementAt(214);
                const def_statement = tree.statementAt(238);
                assert_1.default.ok(if_statement);
                assert_1.default.strictEqual(if_statement.isCompoundStatementType, true);
                assert_1.default.ok(case_statement);
                assert_1.default.strictEqual(case_statement.isCompoundStatementType, true);
                assert_1.default.ok(while_statement);
                assert_1.default.strictEqual(while_statement.isCompoundStatementType, true);
                assert_1.default.ok(until_statement);
                assert_1.default.strictEqual(until_statement.isCompoundStatementType, true);
                assert_1.default.ok(for_statement);
                assert_1.default.strictEqual(for_statement.isCompoundStatementType, true);
                assert_1.default.ok(begin_statement);
                assert_1.default.strictEqual(begin_statement.isCompoundStatementType, true);
                assert_1.default.ok(class_statement);
                assert_1.default.strictEqual(class_statement.isCompoundStatementType, true);
                assert_1.default.ok(module_statement);
                assert_1.default.strictEqual(module_statement.isCompoundStatementType, true);
                assert_1.default.ok(def_statement);
                assert_1.default.strictEqual(def_statement.isCompoundStatementType, true);
            }
            catch (e_16) {
                env_16.error = e_16;
                env_16.hasError = true;
            }
            finally {
                __disposeResources(env_16);
            }
        });
        test('node.isCompoundStatementType is false for un-splittable statements', async function () {
            const env_17 = { stack: [], error: void 0, hasError: false };
            try {
                const doc = 'x = 1';
                const tree = __addDisposableResource(env_17, statementTree_1.StatementTree.create('ruby', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(1);
                assert_1.default.ok(statement);
                assert_1.default.strictEqual(statement.isCompoundStatementType, false);
            }
            catch (e_17) {
                env_17.error = e_17;
                env_17.hasError = true;
            }
            finally {
                __disposeResources(env_17);
            }
        });
    });
    // MARK: Java
    suite('Java', function () {
        test('java is supported', function () {
            assert_1.default.strictEqual(statementTree_1.StatementTree.isSupported('java'), true);
        });
        test('recognizes blocks', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class BlockSample {
					▶️public static void main(String[] args) ▶️{
						▶️{}◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes assert statements', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class AssertSample {
					▶️public static void main(String[] args) ▶️{
						▶️int x = 10;◀️
						▶️assert x > 0 : "x should be positive";◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes break statements', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class BreakSample {
					▶️public static void main(String[] args) ▶️{
						▶️for (int i = 0; i < 10; i++) ▶️{
							▶️if (i == 5) ▶️{
								▶️break;◀️
							}◀️◀️
						}◀️◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes continue statements', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class ContinueSample {
					▶️public static void main(String[] args) ▶️{
						▶️for (int i = 0; i < 10; i++) ▶️{
							▶️if (i == 5) ▶️{
								▶️continue;◀️
							}◀️◀️
						}◀️◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes do statements', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class DoWhileSample {
					▶️public static void main(String[] args) ▶️{
						▶️int i = 0;◀️
						▶️do ▶️{
							▶️if (i == 5) ▶️{
								▶️continue;◀️
							}◀️◀️
							▶️i++;◀️
						}◀️ while (i < 10);◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes for-each (enhanced_for) statements', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class ForEachSample {
					▶️public static void main(String[] args) ▶️{
						▶️int[] numbers = {1, 2, 3, 4, 5};◀️
						▶️for (int n : numbers) ▶️{
							▶️if (n == 5) ▶️{
								▶️continue;◀️
							}◀️◀️️
						}◀️◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes simple expression statements', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class SimpleExpressionSample {
					▶️public static void main(String[] args) ▶️{
						▶️int x = 1;◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes for statements', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class ForSample {
					▶️public static void main(String[] args) ▶️{
						▶️for (int i = 0; i < 10; i++) ▶️{
							▶️int x = i;◀️
						}◀️◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes if statements', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class IfSample {
					▶️public static void main(String[] args) ▶️{
						▶️int number = 1;◀️
						▶️if (number > 0) ▶️{
							▶️number++;◀️
						}◀️◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes labeled statements', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class LabelSample {
					▶️public static void main(String[] args) ▶️{
						▶️myLabel: ▶️{
							▶️int x = 1;◀️
						}◀️◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes local variable declarations', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class LocalVariableSample {
					▶️public static void main(String[] args) ▶️{
						▶️int x = 1;◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes return statement', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class ReturnSample {
					▶️public static void main(String[] args) ▶️{
						▶️int number = ReturnSample.add(5, 10);◀️
					}◀️◀️
					▶️public static int add(int a, int b) ▶️{
						▶️return a + b;◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes switch statements', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class SwitchSample {
					▶️public static void main(String[] args) ▶️{
						▶️int test = 1;◀️
						▶️switch (test) {
							case 0:
								▶️System.out.println("The number is one.");◀️
								▶️break;◀️
							case 1:
								▶️System.out.println("The number is zero.");◀️
								▶️break;◀️
							default:
								▶️System.out.println("The number is not zero or one.");◀️
								▶️break;◀️
						}◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes synchronized statements', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class SynchronizedSample {
					▶️public static void main(String[] args) ▶️{
						▶️int counter = 0;◀️
						▶️synchronized (ReturnSample.class) ▶️{
							▶️counter++;◀️
						}◀️◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes throw statements', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class ThrowSample {
					▶️public static void main(String[] args) ▶️{
						▶️throw new RuntimeException("This is a runtime exception");◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes try statements', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class TrySample {
					▶️public static void main(String[] args) ▶️{
						▶️try ▶️{
							▶️int result = 10 / 0;◀️
						}◀️ catch (ArithmeticException e) ▶️{
							▶️System.out.println("Cannot divide by zero");◀️
						}◀️◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes try with resources statements', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class TrySample {
					▶️public static void main(String[] args) ▶️{
						▶️try (BufferedReader br = new BufferedReader()) ▶️{
							▶️int result = 10 / 0;◀️
						}◀️ catch (ArithmeticException e) ▶️{
							▶️System.out.println("Cannot divide by zero");◀️
						}◀️◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes enum declarations', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class EnumSample {
					▶️public static void main(String[] args) ▶️{
						▶️public enum Day {
							MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
						}◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes import declarations', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️import java.util.List;◀️
				▶️public class ImportSample {
					▶️public static void main(String[] args) ▶️{
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes interface declarations', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public interface Animal {
					▶️void makeSound();◀️
				}◀️
				▶️public class InterfaceSample {
					▶️public static void main(String[] args) ▶️{
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes method declarations', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class MethodSample {
					▶️public static void main(String[] args) ▶️{
					}◀️◀️
					▶️public static void add(int a, int b) ▶️{
						▶️int sum = a + b;◀️
						▶️System.out.println("Sum: " + sum);◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes field declarations', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class InterfaceSample {
					▶️public static void main(String[] args) ▶️{
					}◀️◀️
					▶️public static int x = 0;◀️
				}◀️
				`);
        });
        test('recognizes compact constructor declarations', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public record Person(String firstName, String lastName) {
					▶️public Person ▶️{
						▶️firstName = firstName;◀️
						▶️lastName = lastName;◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes class declaration inside a class body', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class OuterSample {
					▶️public static void main(String[] args) ▶️{
					}◀️◀️
					▶️public class InnerSample {
						▶️public static void innerMethod() ▶️{
							▶️int x = 0;◀️
						}◀️◀️
					}◀️
				}◀️
				`);
        });
        test('recognizes interface declaration inside a class body', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class OuterSample {
					▶️public static void main(String[] args) ▶️{
					}◀️◀️
					▶️public interface InnerInterface {
						▶️void innerMethod();◀️
					}◀️
				}◀️
				`);
        });
        test('recognizes annotation type declaration inside a class body', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class AnnotateSample {
					▶️public static void main(String[] args) ▶️{
					}◀️◀️
					▶️public @interface MyAnnotation {
					}◀️
				}◀️
				`);
        });
        test('recognizes enum declarations inside a class body', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class EnumClassSample {
					▶️public static void main(String[] args) ▶️{
					}◀️◀️
					▶️public enum Day {
						MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
					}◀️
				}◀️
				`);
        });
        test('recognizes static initializer inside a class body', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class StaticInitClassSample {
					▶️static int count;◀️
					▶️static ▶️{
						▶️count = 100;◀️
					}◀️◀️
					▶️public static void main(String[] args) ▶️{
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes constructor declarations', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class ConstructorSample {
					▶️public static void main(String[] args) ▶️{
					}◀️◀️
				}◀️
				▶️public class MyClass {
					▶️public MyClass() {
						▶️int x = 0;◀️
					}◀️
				}◀️
				`);
        });
        test('recognizes record declarations', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public record Point(int x, int y) {}◀️
				▶️public class RecordSample {
					▶️public static void main(String[] args) ▶️{
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes ternary statements as one line', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class RecordSample {
					▶️public static void main(String[] args) ▶️{
						▶️int x = 5;◀️
						▶️int y = (x == 5) ? 0 : 1;◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes single line if statements as one statement', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class SingleLineIfSample {
					▶️public static void main(String[] args) ▶️{
						▶️int x = 5;◀️
						▶️int y = 10;◀️
						▶️if (x == 5) y = 0;◀️
					}◀️◀️
				}◀️
				`);
        });
        test('recognizes single line if else statements with blocks as multiple statements', async function () {
            await testStatementBuilding('java', (0, ts_dedent_1.default) `
				▶️public class SingleLineIfSample {
					▶️public static void main(String[] args) ▶️{
						▶️int x = 5;◀️
						▶️int y = 10;◀️
						▶️if (x == 5) ▶️{ ▶️y = 0;◀️ }◀️◀️
					}◀️◀️
				}◀️
				`);
        });
        test('node.isCompoundStatementType is true for splittable block statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
						{
							int x = 1;
						}`);
        });
        test('node.isCompoundStatementType is true for splittable do statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
						do {
							int x = 1;
						} while (true);`);
        });
        test('node.isCompoundStatementType is true for splittable enhanced for statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				for (int n : numbers) {
					int x = 1;
				}`);
        });
        test('node.isCompoundStatementType is true for splittable for statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				for (int i = 0; i < 10; i++) {
					int x = 1;
				}`);
        });
        test('node.isCompoundStatementType is true for splittable labeled statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				myLabel: {
					int x = 1;
				}`);
        });
        test('node.isCompoundStatementType is true for splittable switch expression', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				switch (test) {
					case 0:
						System.out.println("The number is one.");
						break;
				}`);
        });
        test('node.isCompoundStatementType is true for splittable synchronized statement', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				synchronized (ReturnSample.class) {
					int x = 1;
				}`);
        });
        test('node.isCompoundStatementType is true for splittable try statement', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				try {
					int result = 10 / 0;
				} catch (ArithmeticException e) {
					System.out.println("Cannot divide by zero");
				}`);
        });
        test('node.isCompoundStatementType is true for splittable try with resources statement', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				try (BufferedReader br = new BufferedReader(new FileReader("file.txt"))) {
					int result = 10 / 0;
				} catch (ArithmeticException e) {
					System.out.println("Cannot divide by zero");
				}`);
        });
        test('node.isCompoundStatementType is true for splittable while statement', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				while (true) {
					int x = 1;
				}`);
        });
        test('node.isCompoundStatementType is true for splittable interface declaration', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				public interface InnerInterface {
					void innerMethod();
				}`);
        });
        test('node.isCompoundStatementType is true for splittable method declaration', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				public static void add(int a, int b) {
					int sum = a + b;
				}`);
        });
        test('node.isCompoundStatementType is true for splittable constructor declaration', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class MyClass {
					 ❚public MyClass() {
						int x = 0;
					}
				}`);
        });
        test('node.isCompoundStatementType is true for splittable compact constructor declaration', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				public record Person(String firstName, String lastName) {
					❚public Person {
						firstName = firstName;
						lastName = lastName;
					}
				}`);
        });
        test('node.isCompoundStatementType is true for splittable class declaration', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class MyClass {
					 public MyClass() {
						int x = 0;
					}
				}`);
        });
        test('node.isCompoundStatementType is true for splittable annotation type declaration', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				public @interface MyAnnotation {
					void myMethod();
				}`);
        });
        test('node.isCompoundStatementType is true for splittable static initializer', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				public class StaticInitClassSample {
					static int count
					❚static
					{
						count = 100;
					}
				}`);
        });
        test('node.isCompoundStatementType is true for splittable if statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
						if (true) {
							int x = 1;
						}`);
        });
        test('node.isCompoundStatementType is false for un-splittable statements', async function () {
            await assertStatementIsNotCompoundType('int x = 1;');
        });
        async function testStatementIsCompoundType(text, expectedResult) {
            const env_18 = { stack: [], error: void 0, hasError: false };
            try {
                const posIndicator = '❚';
                const offset = text.indexOf(posIndicator);
                const doc = text.replace(posIndicator, '');
                const tree = __addDisposableResource(env_18, statementTree_1.StatementTree.create('java', doc, 0, doc.length), false);
                await tree.build();
                const statement = tree.statementAt(offset + 1);
                assert_1.default.ok(statement, `Statement not found at offset ${offset}`);
                assert_1.default.strictEqual(statement.isCompoundStatementType, expectedResult);
            }
            catch (e_18) {
                env_18.error = e_18;
                env_18.hasError = true;
            }
            finally {
                __disposeResources(env_18);
            }
        }
        async function assertStatementIsCompoundType(text) {
            await testStatementIsCompoundType(text, true);
        }
        async function assertStatementIsNotCompoundType(text) {
            await testStatementIsCompoundType(text, false);
        }
    });
    // MARK: C#
    suite('C#', function () {
        test('csharp is supported', function () {
            assert_1.default.strictEqual(statementTree_1.StatementTree.isSupported('csharp'), true);
        });
        test('recognizes extern alias directives', async function () {
            await testStatementBuilding('csharp', `▶️extern alias Example;◀️`);
        });
        test('recognizes using directives', async function () {
            await testStatementBuilding('csharp', `▶️using System;◀️`);
        });
        test('recognizes global attributes', async function () {
            await testStatementBuilding('csharp', `▶️[assembly: AssemblyTitle("Example")]◀️`);
        });
        test('recognizes top-level pre-processor directives', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️#if WIN32
						▶️string os = "Win32";◀️
					#elif MACOS
						▶️string os = "MacOS";◀️
					#else
						▶️string os = "Linux";◀️
					#endif◀️
				`);
        });
        test('recognizes file-scoped namespace declarations', async function () {
            await testStatementBuilding('csharp', `▶️namespace Example;◀️`);
        });
        test('recognizes namespace declarations', async function () {
            await testStatementBuilding('csharp', `▶️namespace Example { }◀️`);
        });
        test('recognizes top-level statements', async function () {
            await testStatementBuilding('csharp', `▶️Console.WriteLine("example");◀️`);
        });
        test('recognizes enum declarations', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️enum Direction
					{
						North,
						South,
						East,
						West
					}◀️
				`);
        });
        test('recognizes class declarations', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
					}◀️
				`);
        });
        test('recognizes struct declarations', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️struct Example
					{
					}◀️
				`);
        });
        test('recognizes record declarations', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️record Example
					{
					}◀️
				`);
        });
        test('recognizes interface declarations', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️interface Example
					{
					}◀️
				`);
        });
        test('recognizes fields', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️bool flag = true;◀️
					}◀️
				`);
        });
        test('recognizes event fields', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️event EventHandler onEvent;◀️
					}◀️
				`);
        });
        test('recognizes properties', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️int Len
						{
							▶️get ▶️{ ▶️return _len;◀️ }◀️◀️
							▶️set ▶️{ ▶️_len = value;◀️ }◀️◀️
						}◀️
					}◀️
				`);
        });
        test('recognizes automatic properties', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️int Len { ▶️get;◀️ ▶️set;◀️ }◀️
						▶️int Capacity { ▶️get;◀️ ▶️init;◀️ }◀️
					}◀️
				`);
        });
        test('recognizes properties with initial values', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️int Len { ▶️get;◀️ } = 0;◀️
					}◀️
				`);
        });
        test('recognizes properties with an arrow expression', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️int Area => _width * _height;◀️
					}◀️
				`);
        });
        test('recognizes event declarations with add / remove functions', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️event EventHandler onEvent
						{
							▶️add ▶️{ ▶️someWork();◀️ }◀️◀️
						}◀️
					}◀️
				`);
        });
        test('recognizes methods', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes constructors', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️Example()
						▶️{
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes destructors', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️~Example()
						▶️{
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes indexers', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️int this[int index]()
						{
							▶️get ▶️{ ▶️return _items[index];◀️ }◀️◀️
							▶️set ▶️{ ▶️_items[index] = value;◀️ }◀️◀️
						}◀️
					}◀️
				`);
        });
        test('recognizes operators', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️Example operator +(Example e) ▶️{ ▶️return new Example();◀️ }◀️◀️
					}◀️
				`);
        });
        test('recognizes conversion operators', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️explicit operator int(Example e) ▶️{ ▶️return 0;◀️ }◀️◀️
					}◀️
				`);
        });
        test('recognizes delegates', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️delegate void Action();◀️
					}◀️
				`);
        });
        test('recognizes block statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️{
								▶️Console.WriteLine("example");◀️
							}◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes break statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️for (;;) ▶️{
								▶️break;◀️
							}◀️◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes expression statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️x = y * 4 + 2;◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes checked statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️uint i = uint.MaxValue;◀️
							▶️checked
							▶️{
								▶️i += 10;◀️
							}◀️◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes do statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️int i = 0;◀️
							▶️do
							▶️{
								▶️Console.WriteLine(i);◀️
								▶️i++;◀️
							}◀️ while (i < 10);◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes empty statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️;◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes unsafe statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️unsafe
							▶️{
								▶️int numbers = [1, 2, 3];◀️
								▶️int* p = numbers;◀️
							}◀️◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes fixed statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️unsafe
							▶️{
								▶️int numbers = [1, 2, 3];◀️
								▶️fixed (int* p = numbers)
								▶️{
									▶️Console.WriteLine(*p);◀️
								}◀️◀️
							}◀️◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes for statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️for (int i = 0; i < 5; i++)
							▶️{
								▶️Console.WriteLine(i);◀️
							}◀️◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes return statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️return;◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes lock statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️lock (x)
							▶️{
								// do work
							}◀️◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes yield statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️IEnumerable<int> Odds(int through)
						▶️{
							▶️for (int i = 1; i <= through; i += 2)
							▶️{
								▶️yield return i;◀️
							}◀️◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes switch statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Diagnostics(int a, int b)
						▶️{
							▶️switch ((a, b))
							{
								case (> 0, > 0) when a == b:
									▶️Console.WriteLine("Values are equal");◀️
									▶️break;◀️
								case (> 0, > 0):
									▶️Console.WriteLine("Both values are positive");◀️
									▶️break;◀️
								default:
									▶️Console.WriteLine("One or more values are not positive");◀️
									▶️break;◀️
							}◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes throw statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️throw new Exception("Error occurred");◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes try / catch / finally statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️try
							▶️{
								▶️throw new Exception("Error occurred");◀️
							}◀️
							catch (Exception e)
							▶️{
								▶️Console.WriteLine(e.Message);◀️
							}◀️
							finally
							▶️{
								▶️Console.WriteLine("Done");◀️
							}◀️◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes using statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void ReadFile(string path)
						▶️{
							▶️using var file = new StreamReader(path);◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes foreach statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void PrintAll(List<int> numbers)
						▶️{
							▶️foreach (var number in numbers)
							▶️{
								▶️Console.WriteLine(number);◀️
							}◀️◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes goto and labeled statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️goto End;◀️

						▶️End:
							▶️return;◀️◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes if / else statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️bool IsEven(int number)
						▶️{
							▶️if (number % 2 == 0)
							▶️{
								▶️return true;◀️
							}◀️
							else
							▶️{
								▶️return false;◀️
							}◀️◀️
						}◀️◀️
					}◀️
				`);
        });
        test('collapses single-line if statements without braces', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run(bool flag)
						▶️{
							▶️if (flag) return;◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes while statements', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void PrintTimes(string message, int times)
						▶️{
							▶️int i = 0;◀️
							▶️while (i < times)
							▶️{
								▶️Console.WriteLine(message);◀️
								▶️i++;◀️
							}◀️◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes local variable declarations', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️int x = 10;◀️
						}◀️◀️
					}◀️
				`);
        });
        test('recognizes local function declarations', async function () {
            await testStatementBuilding('csharp', (0, ts_dedent_1.default) `
					▶️class Example
					{
						▶️void Run()
						▶️{
							▶️void LocalFunction() ▶️{ ▶️Console.WriteLine("Hello from local function!");◀️ }◀️◀️
							▶️LocalFunction();◀️
						}◀️◀️
					}◀️
				`);
        });
        test('node.isCompoundStatementType is false for un-splittable statements', async function () {
            await assertStatementIsNotCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					static void Main()
					{
						❚int x = 1;
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for class declarations', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				❚class Example
				{
				}
			`);
        });
        test('node.isCompoundStatementType is true for struct declarations', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				❚struct Example
				{
				}
			`);
        });
        test('node.isCompoundStatementType is true for interface declarations', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				❚interface Example
				{
				}
			`);
        });
        test('node.isCompoundStatementType is true for method declarations', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					❚void Run()
					{
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for constructor declarations', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					❚Example()
					{
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for destructor declarations', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					❚~Example()
					{
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for blocks', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					void Run()
					{
						❚{
						}
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for checked statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					void Run()
					{
						❚checked
						{
						}
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for do statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					void Run()
					{
						❚do
						{
						} while (false);
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for fixed statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					void Run()
					{
						❚fixed
						{
						}
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for for statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					void Run()
					{
						❚for (;;)
						{
						}
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for lock statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					void Run()
					{
						❚lock (x)
						{
						}
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for switch statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					void Run()
					{
						❚switch (x)
						{
						}
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for try statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					void Run()
					{
						❚try
						{
						}
						finally
						{
						}
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for unsafe statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					void Run()
					{
						❚unsafe
						{
						}
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for foreach statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					void Run()
					{
						❚foreach (var item in items)
						{
						}
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for uncollapsed if statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					void Run()
					{
						❚if (x)
						{
						}
					}
				}
			`);
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					void Run()
					{
						❚if (x) {}
					}
				}
			`);
        });
        test('node.isCompoundStatementType is false for collapsed if statements', async function () {
            await assertStatementIsNotCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					void Run()
					{
						❚if (x) return;
					}
				}
			`);
        });
        test('node.isCompoundStatementType is true for while statements', async function () {
            await assertStatementIsCompoundType((0, ts_dedent_1.default) `
				class Example
				{
					void Run()
					{
						❚while (false)
						{
						}
					}
				}
			`);
        });
        async function assertStatementIsCompoundType(text) {
            await testStatementIsCompoundType('csharp', text, true);
        }
        async function assertStatementIsNotCompoundType(text) {
            await testStatementIsCompoundType('csharp', text, false);
        }
    });
    // MARK: C, C++
    suite('C, C++', function () {
        const languages = ['c', 'cpp'];
        languages.forEach(lang => {
            test(`${lang} is supported`, function () {
                assert_1.default.strictEqual(statementTree_1.StatementTree.isSupported(lang), true);
            });
        });
        suite('Statement identification (C, C++)', function () {
            test('recognizes extern declarations', async function () {
                await testStatementBuilding('c', `▶️extern int foo();◀️`);
            });
            test('recognizes typedef declarations', async function () {
                await testStatementBuilding('c', `▶️typedef int myInt;◀️`);
            });
            test('recognizes struct declarations', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️typedef struct Obj
					▶️{
						▶️int x;◀️
						▶️float y;◀️
					}◀️ obj;◀️
				`);
            });
            test('recognizes union declarations', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️union Example
					▶️{
						▶️int x;◀️
						▶️float y;◀️
					}◀️ example◀️
				`);
            });
            test('recognizes enum declarations', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️enum Color
					{
						RED,
						GREEN,
						BLUE
					}◀️
				`);
            });
            test('recognizes function declarations', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️int add(int a, int b)
					▶️{
						▶️return a + b;◀️
					}◀️◀️
				`);
            });
            test('recognizes old style function declarations', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️int add(a, b)◀️
					▶️int a;◀️
					▶️int b;◀️
					▶️{
						▶️return a + b;◀️
					}◀️
				`);
            });
            test('recognizes variable declarations', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️int x = 10;◀️
				`);
            });
            test('recognizes compound statements', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️{
						▶️int x = 10;◀️
						▶️int y = 20;◀️
					}◀️
				`);
            });
            test('recognizes if statements', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️void example()
					▶️{
						▶️if (x > 0)
						▶️{
							▶️printf("Positive");◀️
						}◀️◀️
					}◀️◀️
				`);
            });
            test('recognizes else and else if statements', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️void example()
					▶️{
						▶️if (x > 0)
						▶️{
							▶️printf("Positive");◀️
						}◀️else ▶️if (x < 0)
						▶️{
							▶️printf("Negative");◀️
						}◀️
						else
						▶️{
							▶️printf("Zero");◀️
						}◀️◀️◀️
					}◀️◀️
				`);
            });
            test('recognizes switch statements', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️void example()
					▶️{
						▶️switch (x)
						▶️{
							▶️case 1:
								▶️printf("One");◀️
								▶️break;◀️◀️
							▶️case 2:
								▶️printf("Two");◀️
								▶️break;◀️◀️
							▶️default:
								▶️printf("Default");◀️
								▶️break;◀️◀️
						}◀️◀️
					}◀️◀️
				`);
            });
            test('recognizes while statements', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️void example()
					▶️{
						▶️while (x < 10)
						▶️{
							▶️printf("%d", x);◀️
							▶️x++;◀️
							▶️continue;◀️
						}◀️◀️
					}◀️◀️
				`);
            });
            test('recognizes for statements', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️void example()
					▶️{
						▶️for (▶️int i = 0;◀️ i < 10; i++)
						▶️{
							▶️printf("%d", i);◀️
						}◀️◀️
					}◀️◀️
				`);
            });
            test('recognizes do while statements', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️void example()
					▶️{
						▶️do
						▶️{
							▶️printf("%d", x);◀️
						}◀️ while (x < 10);◀️
					}◀️◀️
				`);
            });
            test('recognizes goto statements', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️goto label;◀️
					▶️label:
						▶️printf("Label reached");◀️◀️
				`);
            });
            test('recognizes preprocessor if statements', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️#if DEBUG
						▶️#define STACK 0
					◀️#elif RELEASE
						▶️#define STACK 100
					◀️#else
						▶️printf("Unknown mode");◀️
					#endif◀️
				`);
            });
            test('recognizes ifdef statements', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️#ifdef DEBUG
						▶️printf("Debug mode");◀️
					#endif◀️
				`);
            });
            test('recognizes include statements', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️#include <stdio.h>
					◀️▶️#include "myheader.h"◀️
				`);
            });
            test('recognizes preprocessor call statements', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️#import "..\\file"
					◀️▶️#line 10
					◀️▶️#pragma once
					◀️▶️#using "using_assembly_A.dll"
					◀️▶️#undef ADD
					◀️▶️#error C++ compiler required.◀️
				`);
            });
            test('recognizes preprocessor functions', async function () {
                await testStatementBuilding('c', (0, ts_dedent_1.default) `
					▶️#define SQUARE(x) ((x) * (x))
					◀️▶️#define MAX(a, b) (\\
						(a) > (b) ? (a) : (b) \\
					)◀️
				`);
            });
        });
        suite('Statement identification (C++)', function () {
            test('recognizes namespace statements', async function () {
                await testStatementBuilding('cpp', (0, ts_dedent_1.default) `
					▶️namespace MyNamespace
					{
						▶️int x;◀️
					}◀️
				`);
            });
            test('recognizes class definitions', async function () {
                await testStatementBuilding('cpp', (0, ts_dedent_1.default) `
					▶️class MyClass
					▶️{
						▶️int x;◀️
						▶️void m() ▶️{
							▶️x = 1;◀️
						}◀️◀️
					}◀️◀️
				`);
            });
            test('recognizes template declarations', async function () {
                await testStatementBuilding('cpp', (0, ts_dedent_1.default) `
					▶️template <typename T> ▶️T myMax(T x, T y) ▶️{
						▶️return (x > y) ? x : y;◀️
					}◀️◀️◀️
				`);
            });
            test('recognizes concept definitions', async function () {
                await testStatementBuilding('cpp', (0, ts_dedent_1.default) `
					▶️template<typename T>
					▶️concept MyConcept = requires(T t)
					{
						▶️{ t.foo() } -> std::same_as<int>;◀️
					}◀️◀️
				`);
            });
            test('recognizes using statements', async function () {
                await testStatementBuilding('cpp', (0, ts_dedent_1.default) `
					▶️using MyType = int;◀️
				`);
            });
            test('recognizes alias declarations', async function () {
                await testStatementBuilding('cpp', (0, ts_dedent_1.default) `
					▶️using MyAlias = int;◀️
				`);
            });
            test('recognizes static assertions', async function () {
                await testStatementBuilding('cpp', (0, ts_dedent_1.default) `
					▶️static_assert(sizeof(int) == 4, "int is not 4 bytes");◀️
				`);
            });
        });
        suite('Compound Statement Identification (C, C++)', function () {
            test('node.isCompoundStatementType is true for struct declarations', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					❚struct Obj
					{
						int x;
						float y;
					} obj;
				`);
            });
            test('node.isCompoundStatementType is true for union declarations', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					❚union Obj
					{
						int x;
						float y;
					} obj;
				`);
            });
            test('node.isCompoundStatementType is true for enum declarations', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					❚enum Color
					{
						RED,
						GREEN,
						BLUE
					} obj;
				`);
            });
            test('node.isCompoundStatementType is true for empty blocks', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					❚{
					}
				`);
            });
            test('node.isCompoundStatementType is true for function declarations', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					void example()
					{
						❚int add(int a, int b)
						{
							return a + b;
						}
					}
				`);
            });
            test('node.isCompoundStatementType is true for compound statements', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					❚{
						int x = 10;
						int y = 20;
					}
				`);
            });
            test('node.isCompoundStatementType is true for if statements', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					void example()
					{
						❚if (x > 0)
						{
							printf("Positive");
						}
					}
				`);
            });
            test('node.isCompoundStatementType is true for type definitions', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					❚typedef struct Obj
					{
						int x;
						float y;
					} obj;
				`);
            });
            test('node.isCompoundStatementType is true for for statements', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					void example()
					{
						❚for (int i = 0; i < 10; i++)
						{
							printf("%d", i);
						}
					}
				`);
            });
            test('node.isCompoundStatementType is true for while statements', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					void example()
					{
						❚while (x < 10)
						{
							printf("%d", x);
							x++;
						}
					}
				`);
            });
            test('node.isCompoundStatementType is true for do while statements', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					void example()
					{
						❚do
						{
							printf("%d", x);
						} while (x < 10);
					}
				`);
            });
            test('node.isCompoundStatementType is true for switch statements', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					void example()
					{
						❚switch (x)
						{
							default:
								printf("Default");
								break;
						}
					}
				`);
            });
            test('node.isCompoundStatementType is true for preprocessor if statements', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					❚#if DEBUG
						#define STACK 0
					#elif RELEASE
						#define STACK 100
					#else
						printf("Unknown mode");
					#endif
				`);
            });
            test('node.isCompoundStatementType is true for preprocessor ifdef statements', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					❚#ifdef DEBUG
						printf("Debug mode");
					#endif
				`);
            });
            test('node.isCompoundStatementType is false for declaration statements', async function () {
                await assertStatementIsNotCompoundType((0, ts_dedent_1.default) `
					int foo() {
						❚int x = 10;
					}
				`);
            });
            test('node.isCompoundStatementType is false for return statements', async function () {
                await assertStatementIsNotCompoundType((0, ts_dedent_1.default) `
					int foo() {
						❚return 1;
					}
				`);
            });
            test('node.isCompoundStatementType is false for goto statements', async function () {
                await assertStatementIsNotCompoundType((0, ts_dedent_1.default) `
					❚goto label;
				`);
            });
            test('node.isCompoundStatementType is false for label statements', async function () {
                await assertStatementIsNotCompoundType((0, ts_dedent_1.default) `
					❚label:
						printf("Label reached");
				`);
            });
            test('node.isCompoundStatementType is false for preprocessor include statements', async function () {
                await assertStatementIsNotCompoundType((0, ts_dedent_1.default) `
					❚#include <stdio.h>
				`);
            });
            test('node.isCompoundStatementType is false for preprocessor functions', async function () {
                await assertStatementIsNotCompoundType((0, ts_dedent_1.default) `
					❚#define SQUARE(x) ((x) * (x))
				`);
            });
            async function assertStatementIsCompoundType(text) {
                await testStatementIsCompoundType('c', text, true);
            }
            async function assertStatementIsNotCompoundType(text) {
                await testStatementIsCompoundType('c', text, false);
            }
        });
        suite('Compound Statement Identification (C++)', function () {
            test('node.isCompoundStatementType is true for namespace definitions', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					❚namespace MyNamespace
					{
						int x;
					}
				`);
            });
            test('node.isCompoundStatementType is true for template declaratations', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					❚template<typename T>
					class MyClass
					{
						T value;
					}
				`);
            });
            test('node.isCompoundStatementType is true for concept definitions', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					❚concept MyConcept = requires(T t)
					{
						{ t.foo() } -> std::same_as<int>;
					};
				`);
            });
            test('node.isCompoundStatementType is true for class declarations', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					❚class MyClass
					{
						int x;
						float y;
					};
				`);
            });
            test('node.isCompoundStatementType is true for class declarations with template', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					❚template<typename T>
					class MyClass
					{
						T value;
					};
				`);
            });
            test('node.isCompoundStatementType is true for field declaration lists', async function () {
                await assertStatementIsCompoundType((0, ts_dedent_1.default) `
					class MyClass
					❚{
						int x;
						float y;
						double z;
					};
				`);
            });
            test('node.isCompoundStatementType is false for field declarations', async function () {
                await assertStatementIsNotCompoundType((0, ts_dedent_1.default) `
					class MyClass
					{
						❚int x;
						float y;
					};
				`);
            });
            test('node.isCompoundStatementType is false for single-line concept definitions', async function () {
                await assertStatementIsNotCompoundType((0, ts_dedent_1.default) `
					template<class T, class U>
					❚concept Derived = std::is_base_of<U, T>::value;
				`);
            });
            test('node.isCompoundStatementType is false for using statements', async function () {
                await assertStatementIsNotCompoundType((0, ts_dedent_1.default) `
					❚using MyType = int;
				`);
            });
            test('node.isCompoundStatementType is false for alias declarations', async function () {
                await assertStatementIsNotCompoundType((0, ts_dedent_1.default) `
					❚using MyAlias = int;
				`);
            });
            test('node.isCompoundStatementType is false for static assertions', async function () {
                await assertStatementIsNotCompoundType((0, ts_dedent_1.default) `
					❚static_assert(sizeof(int) == 4, "int is not 4 bytes");
				`);
            });
            async function assertStatementIsCompoundType(text) {
                await testStatementIsCompoundType('cpp', text, true);
            }
            async function assertStatementIsNotCompoundType(text) {
                await testStatementIsCompoundType('cpp', text, false);
            }
        });
    });
    /**
     * Use `▶️` and `◀️` to mark the beginning and end of statements in the test text.
     *
     * If `❚` (`'\u275A'`) is present in the text, it represents the cursor, and the region
     * between the cursor and end of the text is passed as the offsets for tree building
     * (otherwise, the full text region is used).
     */
    async function testStatementBuilding(language, text) {
        const env_19 = { stack: [], error: void 0, hasError: false };
        try {
            const delim = /▶️|◀️|❚/;
            const statements = [];
            let doc = '';
            let remainder = text;
            let s;
            let match = remainder.match(delim);
            let startOffset = 0;
            while (match) {
                doc += remainder.slice(0, match.index);
                if (match[0] === '▶️') {
                    const newS = {
                        startOffset: doc.length,
                        parent: s,
                        children: [],
                    };
                    if (s) {
                        s.children.push(newS);
                    }
                    else {
                        statements.push(newS);
                    }
                    s = newS;
                }
                else if (match[0] === '❚') {
                    startOffset = doc.length;
                }
                else {
                    if (s) {
                        s.endOffset = doc.length;
                        s = s.parent;
                    }
                    else {
                        throw new Error(`Unmatched statement end at offset ${doc.length} (at ${JSON.stringify(remainder.slice(match.index + match[0].length))})`);
                    }
                }
                remainder = remainder.slice(match.index + match[0].length);
                match = remainder.match(delim);
            }
            doc += remainder;
            if (s) {
                throw new Error(`Unmatched statement start beginning at offset ${s.startOffset} (at ${JSON.stringify(doc.substring(s.startOffset))})`);
            }
            const tree = __addDisposableResource(env_19, statementTree_1.StatementTree.create(language, doc, startOffset, doc.length), false);
            await tree.build();
            function expectNodeLike(node, spec, prefix = '') {
                const pad = ' '.repeat(prefix.length);
                const path = node.dumpPath(prefix, pad);
                assert_1.default.strictEqual(node.node.startIndex, spec.startOffset, `At:\n\n${path}\n\nExpected statement to begin at offset ${spec.startOffset}, but begins at ${node.node.startIndex}`);
                assert_1.default.strictEqual(node.node.endIndex, spec.endOffset, `At:\n\n${path}\n\nExpected statement to end at offset ${spec.endOffset}, but ends at ${node.node.endIndex}`);
                assert_1.default.strictEqual(node.children.length, spec.children.length, `At:\n\n${path}\n\nExpected node to have ${spec.children.length} children, but got ${node.children.length}`);
                for (let i = 0; i < spec.children.length; i++) {
                    expectNodeLike(node.children[i], spec.children[i], prefix);
                }
            }
            assert_1.default.strictEqual(tree.statements.length, statements.length, `Expected a tree with ${statements.length} statements, but got ${tree.statements.length}:\n${tree.dump()}`);
            for (let i = 0; i < statements.length; i++) {
                expectNodeLike(tree.statements[i], statements[i], ` [${i}] `);
            }
        }
        catch (e_19) {
            env_19.error = e_19;
            env_19.hasError = true;
        }
        finally {
            __disposeResources(env_19);
        }
    }
    async function testStatementIsCompoundType(languageId, text, expectedResult) {
        const env_20 = { stack: [], error: void 0, hasError: false };
        try {
            const posIndicator = '❚';
            const offset = text.indexOf(posIndicator);
            const doc = text.replace(posIndicator, '');
            const tree = __addDisposableResource(env_20, statementTree_1.StatementTree.create(languageId, doc, 0, doc.length), false);
            await tree.build();
            const statement = tree.statementAt(offset + 1);
            assert_1.default.ok(statement, `Statement not found at offset ${offset}`);
            assert_1.default.strictEqual(statement.isCompoundStatementType, expectedResult, `Expected .isCompoundStatementType to be ${expectedResult ? 'true' : 'false'} for ${statement.node.type} but got ${statement.isCompoundStatementType ? 'true' : 'false'}`);
        }
        catch (e_20) {
            env_20.error = e_20;
            env_20.hasError = true;
        }
        finally {
            __disposeResources(env_20);
        }
    }
});
//# sourceMappingURL=statementTree.test.js.map