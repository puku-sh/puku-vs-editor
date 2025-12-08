"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vitest_1 = require("vitest");
const slashDoc_py_stest_1 = require("../slashDoc.py.stest");
(0, vitest_1.suite)('hasCorrectlyFormattedDocstring Tests', function () {
    (0, vitest_1.test)('Correctly formatted docstring', function () {
        const fileContents = `
def my_function(param1, param2):
	"""
	This is a docstring for my_function.
	"""
	pass
`;
        const targetLineString = "def my_function(param1, param2):";
        (0, slashDoc_py_stest_1.validateDocstringFormat)(fileContents, targetLineString);
    });
    (0, vitest_1.test)('error: not indented', function () {
        const fileContents = `
def my_function(param1, param2):
"""
This is a wrongly indented docstring for my_function.
"""
	pass
`;
        const targetLineString = "def my_function(param1, param2):";
        (0, vitest_1.expect)(() => (0, slashDoc_py_stest_1.validateDocstringFormat)(fileContents, targetLineString)).toThrowErrorMatchingInlineSnapshot(`[Error: Incorrect docstring indentation. Expected: '	', but got: '']`);
    });
    (0, vitest_1.test)('error: no docstring', function () {
        const fileContents = `
def my_function(param1, param2):
	pass
`;
        const targetLineString = "def my_function(param1, param2):";
        (0, vitest_1.expect)(() => (0, slashDoc_py_stest_1.validateDocstringFormat)(fileContents, targetLineString)).toThrowErrorMatchingInlineSnapshot(`[Error: No docstring found after the target line.]`);
    });
    (0, vitest_1.test)('Docstring with correct indentation using tabs', function () {
        const fileContents = `
	def my_function(param1, param2):
        """
        This is a docstring for my_function with tabs.
        """
`;
        const targetLineString = "def my_function(param1, param2):";
        (0, vitest_1.expect)(() => (0, slashDoc_py_stest_1.validateDocstringFormat)(fileContents, targetLineString)).toThrowErrorMatchingInlineSnapshot(`[Error: Incorrect docstring indentation. Expected: '	········', but got: '········']`);
    });
});
//# sourceMappingURL=assertPyDocstring.spec.js.map