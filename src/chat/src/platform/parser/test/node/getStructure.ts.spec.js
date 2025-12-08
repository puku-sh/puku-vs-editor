"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const outdent_1 = require("outdent");
const vitest_1 = require("vitest");
const path_1 = require("../../../../util/vs/base/common/path");
const parserImpl_1 = require("../../node/parserImpl");
const treeSitterLanguages_1 = require("../../node/treeSitterLanguages");
const getStructure_util_1 = require("./getStructure.util");
(0, vitest_1.describe)('getStructure - typescript', () => {
    (0, vitest_1.afterAll)(() => (0, parserImpl_1._dispose)());
    function tsSrcWithStructure(source) {
        return (0, getStructure_util_1.srcWithAnnotatedStructure)(treeSitterLanguages_1.WASMLanguage.TypeScript, source);
    }
    (0, vitest_1.it)('`export` keyword should not be visible', async () => {
        const source = (0, outdent_1.outdent) `
				export function add(a, b) {
					return a + b;
				}

				function subtract(a, b) {
					return a - b;
				}
				`;
        (0, vitest_1.expect)(await tsSrcWithStructure(source)).toMatchInlineSnapshot(`
			"<FUNCTION_DECLARATION>export function add(a, b) {
			<RETURN_STATEMENT>	return a + b;
			</RETURN_STATEMENT>}
			</FUNCTION_DECLARATION><FUNCTION_DECLARATION-1>
			function subtract(a, b) {
			<RETURN_STATEMENT-1>	return a - b;
			</RETURN_STATEMENT-1>}</FUNCTION_DECLARATION-1>"
		`);
    });
    (0, vitest_1.it)('declarations with comments', async () => {
        const source = (0, outdent_1.outdent) `
				class C {
					foo: string; // my comment
				}`;
        (0, vitest_1.expect)(await tsSrcWithStructure(source)).toMatchInlineSnapshot(`
			"<CLASS_DECLARATION>class C {
			<PUBLIC_FIELD_DEFINITION>	foo: string; // my comment
			</PUBLIC_FIELD_DEFINITION>}</CLASS_DECLARATION>"
		`);
    });
    (0, vitest_1.it)('handling line comments', async () => {
        const source = (0, outdent_1.outdent) `
			// Example usage
			console.log(farewell("Alice")); // Output: Hello, Alice!
			console.log(farewell("Bob", "Hi")); // Output: Hi, Bob!
			console.log(multiply(5, 1, 3)); // Output: 15
			// Updated identity function to accept only string type
			console.log(identityString("Hello")); // Output: Hello
			// Removed the previous identity function call for number type
			// console.log(identity<number>(42)); // Output: 42
			console.log(identityString("TypeScript")); // Output: TypeScript
			`;
        (0, vitest_1.expect)(await tsSrcWithStructure(source)).toMatchInlineSnapshot(`
			"<COMMENT>// Example usage
			</COMMENT><EXPRESSION_STATEMENT>console.log(farewell("Alice")); // Output: Hello, Alice!
			</EXPRESSION_STATEMENT><EXPRESSION_STATEMENT-1>console.log(farewell("Bob", "Hi")); // Output: Hi, Bob!
			</EXPRESSION_STATEMENT-1><EXPRESSION_STATEMENT-2>console.log(multiply(5, 1, 3)); // Output: 15
			</EXPRESSION_STATEMENT-2><COMMENT-1>// Updated identity function to accept only string type
			</COMMENT-1><EXPRESSION_STATEMENT-3>console.log(identityString("Hello")); // Output: Hello
			</EXPRESSION_STATEMENT-3><COMMENT-2>// Removed the previous identity function call for number type
			</COMMENT-2><COMMENT-3>// console.log(identity<number>(42)); // Output: 42
			</COMMENT-3><EXPRESSION_STATEMENT-4>console.log(identityString("TypeScript")); // Output: TypeScript</EXPRESSION_STATEMENT-4>"
		`);
    });
    (0, vitest_1.describe)('if-else statements', () => {
        (0, vitest_1.it)(`capture within statement blocks`, async () => {
            const source = (0, outdent_1.outdent) `
					if (true) {
						foo;
					} else {
						bar;
					}
					`;
            (0, vitest_1.expect)(await tsSrcWithStructure(source)).toMatchInlineSnapshot(`
				"<IF_STATEMENT>if (true) {
				<EXPRESSION_STATEMENT>	foo;
				</EXPRESSION_STATEMENT>} else {
				<EXPRESSION_STATEMENT-1>	bar;
				</EXPRESSION_STATEMENT-1>}</IF_STATEMENT>"
			`);
        });
        (0, vitest_1.it)(`don't capture consequence in: if (cond) statement`, async () => {
            const source = (0, outdent_1.outdent) `
					if (true)
						foo;
					else
						bar;
					`;
            (0, vitest_1.expect)(await tsSrcWithStructure(source)).toMatchInlineSnapshot(`
				"<IF_STATEMENT>if (true)
					foo;
				else
					bar;</IF_STATEMENT>"
			`);
        });
    });
    (0, vitest_1.it)('class declarations', async () => {
        const source = (0, outdent_1.outdent) `
				abstract class Animal {
					abstract makeSound(): void;
					move(): void {
						console.log("roaming the earth...");
					}
				}
				class Bear extends Animal {
					constructor(){
						super();
					}
					override makeSound(): void {
						console.log("roar");
					}
				}
				`;
        (0, vitest_1.expect)(await tsSrcWithStructure(source)).toMatchInlineSnapshot(`
			"<ABSTRACT_CLASS_DECLARATION>abstract class Animal {
			<ABSTRACT_METHOD_SIGNATURE>	abstract makeSound(): void;
			</ABSTRACT_METHOD_SIGNATURE><METHOD_DEFINITION>	move(): void {
			<EXPRESSION_STATEMENT>		console.log("roaming the earth...");
			</EXPRESSION_STATEMENT>	}
			</METHOD_DEFINITION>}
			</ABSTRACT_CLASS_DECLARATION><CLASS_DECLARATION>class Bear extends Animal {
			<CONSTRUCTOR>	constructor(){
			<EXPRESSION_STATEMENT-1>		super();
			</EXPRESSION_STATEMENT-1>	}
			</CONSTRUCTOR><METHOD_DEFINITION-1>	override makeSound(): void {
			<EXPRESSION_STATEMENT-2>		console.log("roar");
			</EXPRESSION_STATEMENT-2>	}
			</METHOD_DEFINITION-1>}</CLASS_DECLARATION>"
		`);
    });
    (0, vitest_1.it)('from tree-sitter repo', async () => {
        const source = (0, outdent_1.outdent) `
			declare module Foo {
				break;
				continue;
				debugger;
				do { } while (true);
				for (x in null) { }
				for (;;) { }
				if (true) { } else { }
				1;
				return;
				switch (x) {
					case 1:
						break;
					default:
						break;
				}
				throw "hello";
				try { }
				catch (e) { }
				finally { }
			}
			`;
        (0, vitest_1.expect)(await tsSrcWithStructure(source)).toMatchInlineSnapshot(`
			"<MODULE>declare module Foo {
			<BREAK_STATEMENT>	break;
			</BREAK_STATEMENT><CONTINUE_STATEMENT>	continue;
			</CONTINUE_STATEMENT><DEBUGGER_STATEMENT>	debugger;
			</DEBUGGER_STATEMENT><DO_STATEMENT>	do { } while (true);
			</DO_STATEMENT><FOR_IN_STATEMENT>	for (x in null) { }
			</FOR_IN_STATEMENT><FOR_STATEMENT>	for (;;) { }
			</FOR_STATEMENT><IF_STATEMENT>	if (true) { } else { }
			</IF_STATEMENT><EXPRESSION_STATEMENT>	1;
			</EXPRESSION_STATEMENT><RETURN_STATEMENT>	return;
			</RETURN_STATEMENT><SWITCH_STATEMENT>	switch (x) {
			<SWITCH_CASE>		case 1:
			<BREAK_STATEMENT-1>			break;</BREAK_STATEMENT-1>
			</SWITCH_CASE>		default:
			<BREAK_STATEMENT-2>			break;</BREAK_STATEMENT-2>
				}
			</SWITCH_STATEMENT><THROW_STATEMENT>	throw "hello";
			</THROW_STATEMENT><TRY_STATEMENT>	try { }
				catch (e) { }
				finally { }
			</TRY_STATEMENT>}</MODULE>"
		`);
    });
    (0, vitest_1.it)('issue #5755: inline edits go outside the selection', async () => {
        const source = await (0, getStructure_util_1.fromFixture)('vscode.proposed.chatParticipantAdditions.d.ts');
        const fileSnapshot = (0, path_1.resolve)(__dirname, 'fixtures', `vscode.proposed.chatParticipantAdditions-annotated.d.ts.txt`);
        await (0, vitest_1.expect)(await tsSrcWithStructure(source)).toMatchFileSnapshot(fileSnapshot);
    });
    (0, vitest_1.it)('issue #5755: inline interfaces', async () => {
        const source = (0, outdent_1.outdent) `
			interface X {
				doIt(): { x: boolean };
				y: { make(): void };
			}
			`;
        (0, vitest_1.expect)(await tsSrcWithStructure(source)).toMatchInlineSnapshot(`
			"<INTERFACE_DECLARATION>interface X {
			<METHOD_SIGNATURE>	doIt(): { x: boolean };
			</METHOD_SIGNATURE><PROPERTY_SIGNATURE>	y: { make(): void };
			</PROPERTY_SIGNATURE>}</INTERFACE_DECLARATION>"
		`);
    });
    (0, vitest_1.describe)('handling braces correctly', () => {
        (0, vitest_1.it)('if-else chain', async () => {
            const source = (0, outdent_1.outdent) `
	function getFirstBracketBefore(node: AstNode, nodeOffsetStart: Length, nodeOffsetEnd: Length, position: Length): IFoundBracket | null {
		if (node.kind === AstNodeKind.List || node.kind === AstNodeKind.Pair) {
			const lengths: { nodeOffsetStart: Length; nodeOffsetEnd: Length }[] = [];
			for (const child of node.children) {
				nodeOffsetEnd = lengthAdd(nodeOffsetStart, child.length);
				lengths.push({ nodeOffsetStart, nodeOffsetEnd });
				nodeOffsetStart = nodeOffsetEnd;
			}
			for (let i = lengths.length - 1; i >= 0; i--) {
				const { nodeOffsetStart, nodeOffsetEnd } = lengths[i];
				if (lengthLessThan(nodeOffsetStart, position)) {
					const result = getFirstBracketBefore(node.children[i], nodeOffsetStart, nodeOffsetEnd, position);
					if (result) {
						return result;
					}
				}
			}
			return null;
		} else if (node.kind === AstNodeKind.UnexpectedClosingBracket) {
			return null;
		} else if (node.kind === AstNodeKind.Bracket) {
			const range = lengthsToRange(nodeOffsetStart, nodeOffsetEnd);
			return {
				bracketInfo: node.bracketInfo,
				range
			};
		}
		return null;
	}
			`;
            (0, vitest_1.expect)(await tsSrcWithStructure(source)).toMatchSnapshot();
        });
    });
});
//# sourceMappingURL=getStructure.ts.spec.js.map