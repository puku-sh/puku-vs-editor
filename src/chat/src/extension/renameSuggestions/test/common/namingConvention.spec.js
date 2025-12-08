"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const namingConvention_1 = require("../../common/namingConvention");
(0, vitest_1.suite)('guessNamingConvention', () => {
    const testCases = [
        { input: 'camelCaseExample', expected: namingConvention_1.NamingConvention.CamelCase },
        { input: 'PascalCaseExample', expected: namingConvention_1.NamingConvention.PascalCase },
        { input: 'snake_case_example', expected: namingConvention_1.NamingConvention.SnakeCase },
        { input: 'SCREAMING_SNAKE_CASE_EXAMPLE', expected: namingConvention_1.NamingConvention.ScreamingSnakeCase },
        { input: 'Capital_snake_case', expected: namingConvention_1.NamingConvention.CapitalSnakeCase },
        { input: 'kebab-case-example', expected: namingConvention_1.NamingConvention.KebabCase },
        { input: 'Uppercase', expected: namingConvention_1.NamingConvention.Capitalized },
        { input: 'lowercase', expected: namingConvention_1.NamingConvention.LowerCase },
        { input: 'Unknown_Example', expected: namingConvention_1.NamingConvention.Unknown },
    ];
    testCases.forEach(({ input, expected }) => {
        (0, vitest_1.test)(`should return ${expected} for input "${input}"`, () => {
            (0, vitest_1.expect)((0, namingConvention_1.guessNamingConvention)(input)).toBe(expected);
        });
    });
    // Additional tests for edge cases
    const edgeCases = [
        { input: 'foo', expected: namingConvention_1.NamingConvention.LowerCase },
        { input: 'FOO', expected: namingConvention_1.NamingConvention.Uppercase },
        { input: 'Foo', expected: namingConvention_1.NamingConvention.Capitalized },
        { input: 'foo_bar', expected: namingConvention_1.NamingConvention.SnakeCase },
        { input: 'foo-bar', expected: namingConvention_1.NamingConvention.KebabCase },
        { input: 'FOO_BAR', expected: namingConvention_1.NamingConvention.ScreamingSnakeCase },
        { input: 'Foo_Bar', expected: namingConvention_1.NamingConvention.Unknown },
        { input: '', expected: namingConvention_1.NamingConvention.Unknown },
        { input: '123', expected: namingConvention_1.NamingConvention.Unknown },
        { input: 'foo123', expected: namingConvention_1.NamingConvention.LowerCase },
        { input: 'foo_123', expected: namingConvention_1.NamingConvention.SnakeCase },
        { input: 'foo-bar-123', expected: namingConvention_1.NamingConvention.KebabCase },
    ];
    edgeCases.forEach(({ input, expected }) => {
        (0, vitest_1.test)(`should return ${expected} for edge case input "${input}"`, () => {
            (0, vitest_1.expect)((0, namingConvention_1.guessNamingConvention)(input)).toBe(expected);
        });
    });
});
(0, vitest_1.suite)('chunkByNamingConvention', () => {
    const testCases = [
        { input: 'camelCaseExample', convention: namingConvention_1.NamingConvention.CamelCase, expected: ['camel', 'Case', 'Example'] },
        { input: 'PascalCaseExample', convention: namingConvention_1.NamingConvention.PascalCase, expected: ['Pascal', 'Case', 'Example'] },
        { input: 'snake_case_example', convention: namingConvention_1.NamingConvention.SnakeCase, expected: ['snake', 'case', 'example'] },
        { input: 'SCREAMING_SNAKE_CASE_EXAMPLE', convention: namingConvention_1.NamingConvention.ScreamingSnakeCase, expected: ['screaming', 'snake', 'case', 'example'] },
        { input: 'Capital_snake_case', convention: namingConvention_1.NamingConvention.CapitalSnakeCase, expected: ['capital', 'snake', 'case'] },
        { input: 'kebab-case-example', convention: namingConvention_1.NamingConvention.KebabCase, expected: ['kebab', 'case', 'example'] },
        { input: 'Uppercase', convention: namingConvention_1.NamingConvention.Uppercase, expected: ['Uppercase'] },
        { input: 'lowercase', convention: namingConvention_1.NamingConvention.LowerCase, expected: ['lowercase'] },
        { input: 'Unknown_Example', convention: namingConvention_1.NamingConvention.Unknown, expected: ['Unknown_Example'] },
    ];
    testCases.forEach(({ input, convention, expected }) => {
        (0, vitest_1.test)(`should return ${expected} for input "${input}" with convention "${convention}"`, () => {
            (0, vitest_1.expect)((0, namingConvention_1.chunkUpIdentByConvention)(input, convention)).toEqual(expected);
        });
    });
});
(0, vitest_1.suite)('enforceNamingConvention', () => {
    const testCases = [
        { givenIdent: 'snake_case_example', targetConvention: namingConvention_1.NamingConvention.CamelCase, expected: 'snakeCaseExample' },
        { givenIdent: 'camelCaseExample', targetConvention: namingConvention_1.NamingConvention.SnakeCase, expected: 'camel_case_example' },
        { givenIdent: 'PascalCaseExample', targetConvention: namingConvention_1.NamingConvention.SnakeCase, expected: 'pascal_case_example' },
        { givenIdent: 'camelCaseExample', targetConvention: namingConvention_1.NamingConvention.PascalCase, expected: 'CamelCaseExample' },
        { givenIdent: 'snake_case_example', targetConvention: namingConvention_1.NamingConvention.ScreamingSnakeCase, expected: 'SNAKE_CASE_EXAMPLE' },
        { givenIdent: 'SCREAMING_SNAKE_CASE_EXAMPLE', targetConvention: namingConvention_1.NamingConvention.CapitalSnakeCase, expected: 'Screaming_snake_case_example' },
        { givenIdent: 'Capital_snake_case', targetConvention: namingConvention_1.NamingConvention.KebabCase, expected: 'capital-snake-case' },
        { givenIdent: 'kebab-case-example', targetConvention: namingConvention_1.NamingConvention.Uppercase, expected: 'KEBAB-CASE-EXAMPLE' },
        { givenIdent: 'Uppercase', targetConvention: namingConvention_1.NamingConvention.LowerCase, expected: 'uppercase' },
        { givenIdent: 'lowercase', targetConvention: namingConvention_1.NamingConvention.Unknown, expected: 'lowercase' },
        { givenIdent: 'Unknown_Example', targetConvention: namingConvention_1.NamingConvention.CamelCase, expected: 'unknown_example' /* TODO@ulugbekna: improve unknown convention handling */ },
    ];
    testCases.forEach(({ givenIdent, targetConvention, expected }) => {
        (0, vitest_1.test)(`should enforce ${targetConvention} convention for "${givenIdent}"`, () => {
            (0, vitest_1.expect)((0, namingConvention_1.enforceNamingConvention)(givenIdent, targetConvention)).toBe(expected);
        });
    });
});
//# sourceMappingURL=namingConvention.spec.js.map