"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const outdent_1 = require("outdent");
const vitest_1 = require("vitest");
const parserImpl_1 = require("../../node/parserImpl");
const treeSitterLanguages_1 = require("../../node/treeSitterLanguages");
const getNodeToDocument_util_1 = require("./getNodeToDocument.util");
(0, vitest_1.suite)('getNodeToDocument - typescript', () => {
    (0, vitest_1.afterAll)(() => (0, parserImpl_1._dispose)());
    async function run(annotatedSrc) {
        return (0, getNodeToDocument_util_1.srcWithAnnotatedNodeToDoc)(treeSitterLanguages_1.WASMLanguage.TypeScript, annotatedSrc);
    }
    (0, vitest_1.test)('should return root node for invalid range', async () => {
        const result = await (0, parserImpl_1._getNodeToDocument)(treeSitterLanguages_1.WASMLanguage.TypeScript, 'const a = 1;', {
            startIndex: 100,
            endIndex: 200,
        });
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
		{
		  "nodeIdentifier": undefined,
		  "nodeSelectionBy": "expanding",
		  "nodeToDocument": {
		    "endIndex": 12,
		    "startIndex": 0,
		    "type": "program",
		  },
		}
	`);
    });
    (0, vitest_1.test)('should return root node for empty source', async () => {
        const result = await run('<<>>');
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`"<PROGRAM></PROGRAM>"`);
    });
    (0, vitest_1.test)('should return node position for a variable declaration', async () => {
        const result = await run('<<const>> a = 1;');
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`"<LEXICAL_DECLARATION>const <IDENT>a</IDENT> = 1;</LEXICAL_DECLARATION>"`);
    });
    (0, vitest_1.test)('should return node position for a function declaration', async () => {
        const result = await (0, getNodeToDocument_util_1.srcWithAnnotatedNodeToDoc)(treeSitterLanguages_1.WASMLanguage.TypeScript, '<<function>> add(a: number, b: number): number { return a + b; }');
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`"<FUNCTION_DECLARATION>function <IDENT>add</IDENT>(a: number, b: number): number { return a + b; }</FUNCTION_DECLARATION>"`);
    });
    (0, vitest_1.test)('should return node position for a class declaration', async () => {
        const result = await run('<<class>> MyClass { constructor() {} }');
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`"<CLASS_DECLARATION>class <IDENT>MyClass</IDENT> { constructor() {} }</CLASS_DECLARATION>"`);
    });
    (0, vitest_1.test)('should return the whole program', async () => {
        const result = await run((0, outdent_1.outdent) `
			/**
			* This is a comment
			*/
			<<const>> foo = 1;
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"/**
			* This is a comment
			*/
			<LEXICAL_DECLARATION>const <IDENT>foo</IDENT> = 1;</LEXICAL_DECLARATION>"
		`);
    });
    (0, vitest_1.test)('should return the whole program - function', async () => {
        const result = await run((0, outdent_1.outdent) `
			/**
			* This is a comment
			*/
			<<function>> add(a: number, b: number): number {
				return a + b;
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"/**
			* This is a comment
			*/
			<FUNCTION_DECLARATION>function <IDENT>add</IDENT>(a: number, b: number): number {
				return a + b;
			}</FUNCTION_DECLARATION>"
		`);
    });
    (0, vitest_1.test)('should return the whole program - class', async () => {
        const result = await run((0, outdent_1.outdent) `
				/**
				* This is a comment
				*/
				<<class>> MyClass {
					constructor() {}
				}
				`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"/**
			* This is a comment
			*/
			<CLASS_DECLARATION>class <IDENT>MyClass</IDENT> {
				constructor() {}
			}</CLASS_DECLARATION>"
		`);
    });
});
//# sourceMappingURL=getNodeToDocument.ts.spec.js.map