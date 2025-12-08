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
(0, vitest_1.suite)('getNodeToDocument - java', () => {
    (0, vitest_1.afterAll)(() => (0, parserImpl_1._dispose)());
    async function run(annotatedSrc) {
        return (0, getNodeToDocument_util_1.srcWithAnnotatedNodeToDoc)(treeSitterLanguages_1.WASMLanguage.Java, annotatedSrc);
    }
    (0, vitest_1.test)('should return root node for empty source', async () => {
        const result = await run('<<>>');
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`"<PROGRAM></PROGRAM>"`);
    });
    (0, vitest_1.test)('use correct identifier name for a method', async () => {
        const result = await run((0, outdent_1.outdent) `
				package com.mycompany.app;

				public class MyMath
				{
					public String check<<>>Sign(int number) {
						if ( number > 0 ) {
							return "positive";
						} else if ( number < 0 ) {
							return "negative";
						} else {
							throw new IllegalArgumentException("Number had no sign");
						}
					}

					/**
					 * Reverses the sign of a given number
					 * @param number the input number
					 * @return a number with reversed sign
					 */
					public int reverseNumber(int number) {
						return -number;
					}
				}
				`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"package com.mycompany.app;

			public class MyMath
			{
				<METHOD_DECLARATION>public String <IDENT>checkSign</IDENT>(int number) {
					if ( number > 0 ) {
						return "positive";
					} else if ( number < 0 ) {
						return "negative";
					} else {
						throw new IllegalArgumentException("Number had no sign");
					}
				}</METHOD_DECLARATION>

				/**
				 * Reverses the sign of a given number
				 * @param number the input number
				 * @return a number with reversed sign
				 */
				public int reverseNumber(int number) {
					return -number;
				}
			}"
		`);
    });
});
//# sourceMappingURL=getNodeToDocument.java.spec.js.map