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
(0, vitest_1.suite)('getNodeToDocument - cpp', () => {
    (0, vitest_1.afterAll)(() => (0, parserImpl_1._dispose)());
    async function run(annotatedSrc, includeSelection = false) {
        return (0, getNodeToDocument_util_1.srcWithAnnotatedNodeToDoc)(treeSitterLanguages_1.WASMLanguage.Cpp, annotatedSrc, includeSelection);
    }
    (0, vitest_1.test)('basic function', async () => {
        const result = await run((0, outdent_1.outdent) `
			void foo() {
				<<>>
			}
			`, true);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"<FUNCTION_DEFINITION>void <IDENT>foo</IDENT>() {
				<SELECTION></SELECTION>
			}</FUNCTION_DEFINITION>"
		`);
    });
    (0, vitest_1.test)('function with qualified identifier and qualified return type - selection in body', async () => {
        const result = await run((0, outdent_1.outdent) `
			Foo::Bar baz::foo() {
				<<>>
			}
			`, true);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"<FUNCTION_DEFINITION>Foo::Bar <IDENT>baz::foo</IDENT>() {
				<SELECTION></SELECTION>
			}</FUNCTION_DEFINITION>"
		`);
    });
    (0, vitest_1.test)('function with qualified identifier and qualified return type - selection on return type', async () => {
        const result = await run((0, outdent_1.outdent) `
			<<Foo::Bar>> baz::foo() {

			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"<FUNCTION_DEFINITION>Foo::Bar <IDENT>baz::foo</IDENT>() {

			}</FUNCTION_DEFINITION>"
		`);
    });
    (0, vitest_1.test)('function with qualified identifier and qualified return type - selection on function qualified identifier', async () => {
        const result = await run((0, outdent_1.outdent) `
			Foo::Bar baz<<>>::foo() {

			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"<FUNCTION_DEFINITION>Foo::Bar <IDENT>baz::foo</IDENT>() {

			}</FUNCTION_DEFINITION>"
		`);
    });
});
//# sourceMappingURL=getNodeToDocument.cpp.spec.js.map