"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const outdent_1 = require("outdent");
const vitest_1 = require("vitest");
const parserImpl_1 = require("../../node/parserImpl");
const parserWithCaching_1 = require("../../node/parserWithCaching");
const selectionParsing_1 = require("../../node/selectionParsing");
const treeSitterLanguages_1 = require("../../node/treeSitterLanguages");
(0, vitest_1.suite)('getNodeMatchingSelection', () => {
    function deannotateSrc(annotatedSrc) {
        const startIndex = annotatedSrc.indexOf('<<');
        const endIndex = annotatedSrc.indexOf('>>') - 2;
        return {
            deannotatedSrc: annotatedSrc.replace('<<', '').replace('>>', ''),
            annotatedRange: {
                startIndex,
                endIndex,
            },
        };
    }
    async function getNode(annotatedSrc, languageId = treeSitterLanguages_1.WASMLanguage.TypeScript) {
        const { deannotatedSrc, annotatedRange } = deannotateSrc(annotatedSrc);
        const parseTreeRef = await (0, parserWithCaching_1._parse)(languageId, deannotatedSrc);
        try {
            const r = (0, selectionParsing_1._getNodeMatchingSelection)(parseTreeRef.tree, annotatedRange, languageId);
            return r ? r.text : 'undefined';
        }
        finally {
            parseTreeRef.dispose();
        }
    }
    (0, vitest_1.afterAll)(() => (0, parserImpl_1._dispose)());
    (0, vitest_1.suite)('with function', () => {
        (0, vitest_1.test)('within identifier', async () => {
            const source = (0, outdent_1.outdent) `
				class Foo {

					ba<<>>r() {

					}
				}
				`;
            (0, vitest_1.expect)(await getNode(source)).toMatchInlineSnapshot(`"undefined"`);
        });
        (0, vitest_1.test)('whitespace before', async () => {
            const source = (0, outdent_1.outdent) `
				class Foo {

				<<	bar() {

					}>>
				}
				`;
            (0, vitest_1.expect)(await getNode(source)).toMatchInlineSnapshot(`
				"bar() {

					}"
				`);
        });
        (0, vitest_1.test)('whitespace before & after', async () => {
            const source = (0, outdent_1.outdent) `
				class Foo {

				<<	bar() {

					}
				>>
				}
				`;
            (0, vitest_1.expect)(await getNode(source)).toMatchInlineSnapshot(`
				"bar() {

					}"
				`);
        });
        (0, vitest_1.test)('range misses closes }', async () => {
            const source = (0, outdent_1.outdent) `
				class Foo {

					<<bar() {

					>>}
				}
				`;
            (0, vitest_1.expect)(await getNode(source)).toMatchInlineSnapshot(`
				"bar() {

					}"
			`);
        });
        (0, vitest_1.test)('imprecise selection', async () => {
            const source = (0, outdent_1.outdent) `
				class Foo {

					b<<ar() {

					>>}
				}
				`;
            (0, vitest_1.expect)(await getNode(source)).toMatchInlineSnapshot(`
				"bar() {

					}"
			`);
        });
    });
    (0, vitest_1.suite)('with class', () => {
        (0, vitest_1.test)('precise selection', async () => {
            const source = (0, outdent_1.outdent) `
				<<class Foo {

					bar() {

					}
				}>>
				`;
            (0, vitest_1.expect)(await getNode(source)).toMatchInlineSnapshot(`
				"class Foo {

					bar() {

					}
				}"
			`);
        });
        (0, vitest_1.test)('range misses closing }', async () => {
            const source = (0, outdent_1.outdent) `
				<<class Foo {

					bar() {

					}
				>>}
				`;
            (0, vitest_1.expect)(await getNode(source)).toMatchInlineSnapshot(`
				"class Foo {

					bar() {

					}
				}"
			`);
        });
        (0, vitest_1.test)('imprecise selection', async () => {
            const source = (0, outdent_1.outdent) `
				class Foo << {

					bar() {

					}>>
				}
				`;
            (0, vitest_1.expect)(await getNode(source)).toMatchInlineSnapshot(`
				"class Foo  {

					bar() {

					}
				}"
			`);
        });
    });
    (0, vitest_1.suite)('with interface', () => {
        (0, vitest_1.test)('precise selection', async () => {
            const source = (0, outdent_1.outdent) `
				<<interface Foo {

					bar(): void;

				}>>`;
            (0, vitest_1.expect)(await getNode(source)).toMatchInlineSnapshot(`
			"interface Foo {

				bar(): void;

			}"
		`);
        });
        (0, vitest_1.test)('whitespace before & after', async () => {
            const source = (0, outdent_1.outdent) `
				<<
					interface Foo {

						bar(): void;

					}
				>>`;
            (0, vitest_1.expect)(await getNode(source)).toMatchInlineSnapshot(`
			"interface Foo {

					bar(): void;

				}"
		`);
        });
        (0, vitest_1.test)('within a function', async () => {
            const source = (0, outdent_1.outdent) `
				<<
				function bar() {
					interface Foo {

						bar(): void;

					}

					return 42;
				}
				>>`;
            (0, vitest_1.expect)(await getNode(source)).toMatchInlineSnapshot(`
			"function bar() {
				interface Foo {

					bar(): void;

				}

				return 42;
			}"
		`);
        });
        (0, vitest_1.test)('most of function is selected', async () => {
            const source = (0, outdent_1.outdent) `
				<<
				function bar() {
					interface Foo {

						bar(): void;

					}

					return 42;>>
				}
				`;
            (0, vitest_1.expect)(await getNode(source)).toMatchInlineSnapshot(`
			"function bar() {
				interface Foo {

					bar(): void;

				}

				return 42;
			}"
		`);
        });
    });
});
//# sourceMappingURL=getNodeMatchingSelection.spec.js.map