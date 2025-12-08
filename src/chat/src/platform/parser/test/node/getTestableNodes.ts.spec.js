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
const getTestableNodes_util_1 = require("./getTestableNodes.util");
(0, vitest_1.suite)('getTestableNodes - ts', () => {
    (0, vitest_1.afterAll)(() => (0, parserWithCaching_1._dispose)());
    function run(annotatedSrc) {
        return (0, getTestableNodes_util_1.annotTestableNodes)(treeSitterLanguages_1.WASMLanguage.TypeScript, annotatedSrc);
    }
    (0, vitest_1.test)('function declaration', async () => {
        const result = await run((0, outdent_1.outdent) `
			function add(a: number, b: number): number {
				return a + b;
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"<NODE>function <IDENT>add</IDENT>(a: number, b: number): number {
				return a + b;
			}</NODE>"
		`);
    });
    (0, vitest_1.test)('method', async () => {
        const result = await run((0, outdent_1.outdent) `
			class Foo {
				method(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"<NODE>class <IDENT>Foo</IDENT> {
				<NODE-1><IDENT-1>method</IDENT-1>(a: number, b: number): number {
					return a + b;
				}</NODE-1>
			}</NODE>"
		`);
    });
    (0, vitest_1.test)('public method', async () => {
        const result = await run((0, outdent_1.outdent) `
			class Foo {
				method(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"<NODE>class <IDENT>Foo</IDENT> {
				<NODE-1><IDENT-1>method</IDENT-1>(a: number, b: number): number {
					return a + b;
				}</NODE-1>
			}</NODE>"
		`);
    });
    (0, vitest_1.test)('several public methods', async () => {
        const result = await run((0, outdent_1.outdent) `
			class Foo {
				method(a: number, b: number): number {
					return a + b;
				}

				method2(a: number, b: number): number {
					return a + b;
				}

				method3(a: number, b: number): number {
					return a + b;
				}

				method4(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"<NODE>class <IDENT>Foo</IDENT> {
				<NODE-1><IDENT-1>method</IDENT-1>(a: number, b: number): number {
					return a + b;
				}</NODE-1>

				<NODE-2><IDENT-2>method2</IDENT-2>(a: number, b: number): number {
					return a + b;
				}</NODE-2>

				<NODE-3><IDENT-3>method3</IDENT-3>(a: number, b: number): number {
					return a + b;
				}</NODE-3>

				<NODE-4><IDENT-4>method4</IDENT-4>(a: number, b: number): number {
					return a + b;
				}</NODE-4>
			}</NODE>"
		`);
    });
    (0, vitest_1.test)('captures mix', async () => {
        const result = await run((0, outdent_1.outdent) `
			class Foo {
				methodPub() {
				}

				private method(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"<NODE>class <IDENT>Foo</IDENT> {
				<NODE-1><IDENT-1>methodPub</IDENT-1>() {
				}</NODE-1>

				private method(a: number, b: number): number {
					return a + b;
				}
			}</NODE>"
		`);
    });
    (0, vitest_1.test)('does NOT capture private method', async () => {
        const result = await run((0, outdent_1.outdent) `
			class Foo {
				private method(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"class Foo {
				private method(a: number, b: number): number {
					return a + b;
				}
			}"
		`);
    });
    (0, vitest_1.test)('static method', async () => {
        const result = await run((0, outdent_1.outdent) `
			class Foo {
				static method(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"<NODE>class <IDENT>Foo</IDENT> {
				<NODE-1>static <IDENT-1>method</IDENT-1>(a: number, b: number): number {
					return a + b;
				}</NODE-1>
			}</NODE>"
		`);
    });
    (0, vitest_1.test)('private static method', async () => {
        const result = await run((0, outdent_1.outdent) `
			class Foo {
				private static method(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"class Foo {
				private static method(a: number, b: number): number {
					return a + b;
				}
			}"
		`);
    });
    (0, vitest_1.test)('public static method', async () => {
        const result = await run((0, outdent_1.outdent) `
			class Foo {
				public static method(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"<NODE>class <IDENT>Foo</IDENT> {
				<NODE-1>public static <IDENT-1>method</IDENT-1>(a: number, b: number): number {
					return a + b;
				}</NODE-1>
			}</NODE>"
		`);
    });
    (0, vitest_1.test)('class declaration', async () => {
        const result = await run((0, outdent_1.outdent) `
			export class Foo {
				method(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"export <NODE>class <IDENT>Foo</IDENT> {
				<NODE-1><IDENT-1>method</IDENT-1>(a: number, b: number): number {
					return a + b;
				}</NODE-1>
			}</NODE>"
		`);
    });
    (0, vitest_1.test)('class declaration with prop and method', async () => {
        const result = await run((0, outdent_1.outdent) `
			export class Foo {
				bar = 1;

				method(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"export <NODE>class <IDENT>Foo</IDENT> {
				bar = 1;

				<NODE-1><IDENT-1>method</IDENT-1>(a: number, b: number): number {
					return a + b;
				}</NODE-1>
			}</NODE>"
		`);
    });
    (0, vitest_1.test)('class declaration with prop and static method', async () => {
        const result = await run((0, outdent_1.outdent) `
			export class Foo {
				bar = 1;

				static method(a: number, b: number): number {
					return a + b;
				}
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"export <NODE>class <IDENT>Foo</IDENT> {
				bar = 1;

				<NODE-1>static <IDENT-1>method</IDENT-1>(a: number, b: number): number {
					return a + b;
				}</NODE-1>
			}</NODE>"
		`);
    });
});
//# sourceMappingURL=getTestableNodes.ts.spec.js.map