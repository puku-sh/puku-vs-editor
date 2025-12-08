"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const outdent_1 = require("outdent");
const vitest_1 = require("vitest");
const parserWithCaching_1 = require("../../node/parserWithCaching");
const treeSitterLanguages_1 = require("../../node/treeSitterLanguages");
const getTestableNode_util_1 = require("./getTestableNode.util");
(0, vitest_1.suite)('getTestableNode - js', () => {
    (0, vitest_1.afterAll)(() => (0, parserWithCaching_1._dispose)());
    function run(annotatedSrc) {
        return (0, getTestableNode_util_1.srcWithAnnotatedTestableNode)(treeSitterLanguages_1.WASMLanguage.JavaScript, annotatedSrc);
    }
    (0, vitest_1.test)('function declaration', async () => {
        const result = await run((0, outdent_1.outdent) `
			function <<add>>(a: number, b: number): number {
				return a + b;
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"<NODE(function_declaration)>function <IDENT>add</IDENT>(a: number, b: number): number {
				return a + b;
			}</NODE(function_declaration)>"
		`);
    });
    (0, vitest_1.test)('method', async () => {
        const result = await run((0, outdent_1.outdent) `
			class Foo {
				<<method>>(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"class Foo {
				<NODE(method_definition)><IDENT>method</IDENT>(a: number, b: number): number {
					return a + b;
				}</NODE(method_definition)>
			}"
		`);
    });
    (0, vitest_1.test)('public method', async () => {
        const result = await run((0, outdent_1.outdent) `
			class Foo {
				<<method>>(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"class Foo {
				<NODE(method_definition)><IDENT>method</IDENT>(a: number, b: number): number {
					return a + b;
				}</NODE(method_definition)>
			}"
		`);
    });
    (0, vitest_1.test)('does not capture private method', async () => {
        const result = await run((0, outdent_1.outdent) `
			class Foo {
				private <<#method>>(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`"testable node NOT found"`);
    });
    (0, vitest_1.test)('static method', async () => {
        const result = await run((0, outdent_1.outdent) `
			class Foo {
				static <<method>>(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"class Foo {
				<NODE(method_definition)>static <IDENT>method</IDENT>(a: number, b: number): number {
					return a + b;
				}</NODE(method_definition)>
			}"
		`);
    });
    (0, vitest_1.test)('private static method', async () => {
        const result = await run((0, outdent_1.outdent) `
			class Foo {
				static <<#method>>(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`"testable node NOT found"`);
    });
    (0, vitest_1.test)('public static method', async () => {
        const result = await run((0, outdent_1.outdent) `
			class Foo {
				public static <<method>>(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"class Foo {
				public <NODE(method_definition)>static <IDENT>method</IDENT>(a: number, b: number): number {
					return a + b;
				}</NODE(method_definition)>
			}"
		`);
    });
});
//# sourceMappingURL=getTestableNode.js.spec.js.map