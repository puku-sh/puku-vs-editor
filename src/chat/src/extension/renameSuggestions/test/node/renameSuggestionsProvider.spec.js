"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const outdent_1 = require("outdent");
const vitest_1 = require("vitest");
const renameSuggestionsProvider_1 = require("../../node/renameSuggestionsProvider");
(0, vitest_1.suite)('processReply', () => {
    (0, vitest_1.test)('should handle JSON array of strings', () => {
        const input = `["Hello", "world", "howAreYou?"]`;
        const output = renameSuggestionsProvider_1.RenameSuggestionsProvider.parseResponse(input);
        (0, vitest_1.expect)(output).toMatchInlineSnapshot(`
		{
		  "redundantCharCount": 0,
		  "replyFormat": "jsonStringArray",
		  "symbolNames": [
		    "Hello",
		    "world",
		    "howAreYou?",
		  ],
		}
	`);
    });
    (0, vitest_1.test)('should handle ordered list with .', () => {
        const input = `
		1. Hello
		2. world
		3. howAreYou?
		`;
        const output = renameSuggestionsProvider_1.RenameSuggestionsProvider.parseResponse(input);
        (0, vitest_1.expect)(output).toMatchInlineSnapshot(`
		{
		  "redundantCharCount": 21,
		  "replyFormat": "list",
		  "symbolNames": [
		    "Hello",
		    "world",
		    "howAreYou?",
		  ],
		}
	`);
    });
    (0, vitest_1.test)('should handle ordered list with )', () => {
        const input = `
		1) Hello
		2) world
		3) howAreYou?
		`;
        const output = renameSuggestionsProvider_1.RenameSuggestionsProvider.parseResponse(input);
        (0, vitest_1.expect)(output).toMatchInlineSnapshot(`
		{
		  "redundantCharCount": 21,
		  "replyFormat": "list",
		  "symbolNames": [
		    "Hello",
		    "world",
		    "howAreYou?",
		  ],
		}
	`);
    });
    (0, vitest_1.test)('should handle unordered list with *', () => {
        const input = `
		* Hello
		* world
		* howAreYou?
		`;
        const output = renameSuggestionsProvider_1.RenameSuggestionsProvider.parseResponse(input);
        (0, vitest_1.expect)(output).toMatchInlineSnapshot(`
		{
		  "redundantCharCount": 18,
		  "replyFormat": "list",
		  "symbolNames": [
		    "Hello",
		    "world",
		    "howAreYou?",
		  ],
		}
	`);
    });
    (0, vitest_1.test)('should handle unordered list with -', () => {
        const input = `
		- Hello
		- world
		- howAreYou?
		`;
        const output = renameSuggestionsProvider_1.RenameSuggestionsProvider.parseResponse(input);
        (0, vitest_1.expect)(output).toMatchInlineSnapshot(`
		{
		  "redundantCharCount": 18,
		  "replyFormat": "list",
		  "symbolNames": [
		    "Hello",
		    "world",
		    "howAreYou?",
		  ],
		}
	`);
    });
    (0, vitest_1.test)('should handle invalid input', () => {
        const input = 'Hello world howAreYou?';
        const output = renameSuggestionsProvider_1.RenameSuggestionsProvider.parseResponse(input);
        (0, vitest_1.expect)(output).toMatchInlineSnapshot(`
		{
		  "redundantCharCount": 22,
		  "replyFormat": "unknown",
		  "symbolNames": [],
		}
	`);
    });
    (0, vitest_1.test)('should handle empty input', () => {
        const input = '';
        const output = renameSuggestionsProvider_1.RenameSuggestionsProvider.parseResponse(input);
        (0, vitest_1.expect)(output).toMatchInlineSnapshot(`
		{
		  "redundantCharCount": 0,
		  "replyFormat": "unknown",
		  "symbolNames": [],
		}
	`);
    });
    (0, vitest_1.test)('should handle free response', () => {
        const input = (0, outdent_1.outdent) `
		\`\`\`
		// FILEPATH: /Users/foo/bar.ts

		private static _determinePrefix(name: string): string | undefined {
			const prefix = name.match(/^([\\.\$\\_]+)/)?.[0];
			return prefix;
		}
		\`\`\`

		The purpose of the \`_determinePrefix\` function is to extract the prefix from a given name string. It uses a regular expression to match any characters at the beginning of the string that are either a dot (.), dollar sign ($), or underscore (_), and returns that matched prefix.

		Here are some new names that reflect the purpose of the \`_determinePrefix\` function:

		\`\`\`json
		[
			"_extractPrefix",
			"_findPrefix",
			"_getPrefix",
			"_identifyPrefix",
			"_parsePrefix"
		]
		\`\`\`
		`;
        const output = renameSuggestionsProvider_1.RenameSuggestionsProvider.parseResponse(input);
        (0, vitest_1.expect)(output).toMatchInlineSnapshot(`
		{
		  "redundantCharCount": 552,
		  "replyFormat": "multiJsonStringArray",
		  "symbolNames": [
		    "_extractPrefix",
		    "_findPrefix",
		    "_getPrefix",
		    "_identifyPrefix",
		    "_parsePrefix",
		  ],
		}
	`);
    });
    // TODO@ulugbekna: handle this case
    (0, vitest_1.test)('JSON object', () => {
        const input = (0, outdent_1.outdent) `
		{
			"1": "fooBar",
			"2": "bazQux",
			"3": "steamBear",
		}
		`;
        const output = renameSuggestionsProvider_1.RenameSuggestionsProvider.parseResponse(input);
        (0, vitest_1.expect)(output).toMatchInlineSnapshot(`
		{
		  "redundantCharCount": 54,
		  "replyFormat": "unknown",
		  "symbolNames": [],
		}
	`);
    });
    (0, vitest_1.test)('handle free form + ordered list', () => {
        const input = (0, outdent_1.outdent) `
		Based on the name and the role it plays in the code, \`Baz\` is likely a class responsible for initializing or setting up the baz service.

		Here are a few alternative names that could reflect the purpose and functionality of \`Baz\`:

		1. \`FooBar\`
		2. \`FooBarBaz\`
		3. \`BarBazBear\`
		`;
        const output = renameSuggestionsProvider_1.RenameSuggestionsProvider.parseResponse(input);
        (0, vitest_1.expect)(output).toMatchInlineSnapshot(`
		{
		  "redundantCharCount": 248,
		  "replyFormat": "list",
		  "symbolNames": [
		    "FooBar",
		    "FooBarBaz",
		    "BarBazBear",
		  ],
		}
	`);
    });
});
(0, vitest_1.suite)('preprocessSymbolNames', () => {
    (0, vitest_1.test)('to camelCase', () => {
        const result = renameSuggestionsProvider_1.RenameSuggestionsProvider.preprocessSymbolNames({
            currentSymbolName: 'camelCase',
            newSymbolNames: ['snake_case', 'kebab-case', 'PascalCase', 'UPPER_SNAKE_CASE', 'lower-kebab-case'],
            languageId: 'javascript',
        });
        (0, vitest_1.expect)(result).toEqual(['snakeCase', 'kebabCase', 'pascalCase', 'upperSnakeCase', 'lowerKebabCase']);
    });
    (0, vitest_1.test)('to snake_case', () => {
        const result = renameSuggestionsProvider_1.RenameSuggestionsProvider.preprocessSymbolNames({
            currentSymbolName: 'snake_case',
            newSymbolNames: ['camelCase', 'kebab-case', 'PascalCase', 'UPPER_SNAKE_CASE', 'lower-kebab-case'],
            languageId: 'python',
        });
        (0, vitest_1.expect)(result).toEqual(['camel_case', 'kebab_case', 'pascal_case', 'upper_snake_case', 'lower_kebab_case']);
    });
    (0, vitest_1.test)('to PascalCase', () => {
        const result = renameSuggestionsProvider_1.RenameSuggestionsProvider.preprocessSymbolNames({
            currentSymbolName: 'PascalCase',
            newSymbolNames: ['camelCase', 'kebab-case', 'snake_case', 'UPPER_SNAKE_CASE', 'lower-kebab-case'],
            languageId: 'javascript',
        });
        (0, vitest_1.expect)(result).toEqual(['CamelCase', 'KebabCase', 'SnakeCase', 'UpperSnakeCase', 'LowerKebabCase']);
    });
    (0, vitest_1.test)('to kebab-case', () => {
        const result = renameSuggestionsProvider_1.RenameSuggestionsProvider.preprocessSymbolNames({
            currentSymbolName: 'kebab-case',
            newSymbolNames: ['camelCase', 'snake_case', 'PascalCase', 'UPPER_SNAKE_CASE', 'lower-kebab-case'],
            languageId: 'javascript',
        });
        (0, vitest_1.expect)(result).toEqual(['camel-case', 'snake-case', 'pascal-case', 'upper-snake-case', 'lower-kebab-case']);
    });
    (0, vitest_1.test)('as is', () => {
        const result = renameSuggestionsProvider_1.RenameSuggestionsProvider.preprocessSymbolNames({
            currentSymbolName: 'Unknown_Format',
            newSymbolNames: ['camelCase', 'snake_case', 'PascalCase', 'UPPER_SNAKE_CASE', 'lower-kebab-case'],
            languageId: 'javascript',
        });
        (0, vitest_1.expect)(result).toEqual(['camelCase', 'snake_case', 'PascalCase', 'UPPER_SNAKE_CASE', 'lower-kebab-case']);
    });
});
//# sourceMappingURL=renameSuggestionsProvider.spec.js.map