"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const outdent_1 = require("outdent");
const vitest_1 = require("vitest");
const parserWithCaching_1 = require("../../../node/parserWithCaching");
const treeSitterLanguages_1 = require("../../../node/treeSitterLanguages");
const util_1 = require("./util");
(0, vitest_1.suite)('findLastTest - ts', () => {
    (0, vitest_1.afterAll)(() => (0, parserWithCaching_1._dispose)());
    function run(annotatedSrc) {
        return (0, util_1.srcWithAnnotatedLastTest)(treeSitterLanguages_1.WASMLanguage.TypeScript, annotatedSrc);
    }
    (0, vitest_1.test)('one test in suite', async () => {
        const result = await run((0, outdent_1.outdent) `
			suite(() => {
				test('foo', () => {
					expect(1).toBe(1);
				});
			})
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"suite(() => {
				<TEST>test('foo', () => {
					expect(1).toBe(1);
				});</TEST>
			})"
		`);
    });
    (0, vitest_1.test)('two tests in suite', async () => {
        const result = await run((0, outdent_1.outdent) `
			suite(() => {
				test('foo', () => {
					expect(1).toBe(1);
				});

				test('bar', () => {
					expect(1).toBe(1);
				});
			})
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"suite(() => {
				test('foo', () => {
					expect(1).toBe(1);
				});

				<TEST>test('bar', () => {
					expect(1).toBe(1);
				});</TEST>
			})"
		`);
    });
    (0, vitest_1.test)('one test', async () => {
        const result = await run((0, outdent_1.outdent) `
			test('foo', () => {
				expect(1).toBe(1);
			});
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"<TEST>test('foo', () => {
				expect(1).toBe(1);
			});</TEST>"
		`);
    });
    (0, vitest_1.test)('two tests', async () => {
        const result = await run((0, outdent_1.outdent) `
			test('foo', () => {
				expect(1).toBe(1);
			});

			test('bar', () => {
				expect(1).toBe(1);
			});
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"test('foo', () => {
				expect(1).toBe(1);
			});

			<TEST>test('bar', () => {
				expect(1).toBe(1);
			});</TEST>"
		`);
    });
    (0, vitest_1.test)('FIXME: test within not file and not suite should not be captured', async () => {
        const result = await run((0, outdent_1.outdent) `
			for (const i of [1, 2, 3]) {
				test('foo', () => {
					expect(1).toBe(1);
				});
			}
			`);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			"for (const i of [1, 2, 3]) {
				<TEST>test('foo', () => {
					expect(1).toBe(1);
				});</TEST>
			}"
		`);
    });
});
//# sourceMappingURL=ts.spec.js.map