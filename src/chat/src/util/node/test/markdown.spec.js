"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const markdown_1 = require("../../common/markdown");
(0, vitest_1.suite)('markdown', () => {
    (0, vitest_1.suite)('extractCodeBlocks', () => {
        (0, vitest_1.test)('should extract single code block', () => {
            {
                const result = (0, markdown_1.extractCodeBlocks)([
                    '```',
                    'single',
                    '```',
                ].join('\n'));
                assert_1.default.strictEqual(result.length, 1);
                assert_1.default.deepStrictEqual(result[0].code, 'single');
            }
            {
                const result = (0, markdown_1.extractCodeBlocks)([
                    '```ts',
                    'single',
                    '```',
                ].join('\n'));
                assert_1.default.strictEqual(result.length, 1);
                assert_1.default.deepStrictEqual(result[0].code, 'single');
                assert_1.default.deepStrictEqual(result[0].language, 'ts');
            }
        });
        (0, vitest_1.test)('should extract multiple code blocks', () => {
            const result = (0, markdown_1.extractCodeBlocks)([
                '```',
                'one',
                '```',
                '',
                'code',
                '',
                '```php',
                'two',
                '```',
            ].join('\n'));
            assert_1.default.strictEqual(result.length, 2);
            assert_1.default.deepStrictEqual(result[0].code, 'one');
            assert_1.default.deepStrictEqual(result[0].language, '');
            assert_1.default.deepStrictEqual(result[1].code, 'two');
            assert_1.default.deepStrictEqual(result[1].language, 'php');
        });
        (0, vitest_1.test)('should detect nested code blocks', () => {
            const result = (0, markdown_1.extractCodeBlocks)([
                '```',
                'one',
                '```',
                '',
                '- code',
                '  ',
                '  ```php',
                '  two',
                '  ```',
            ].join('\n'));
            assert_1.default.strictEqual(result.length, 2);
            assert_1.default.deepStrictEqual(result[0].code, 'one');
            assert_1.default.deepStrictEqual(result[0].language, '');
            assert_1.default.deepStrictEqual(result[1].code, 'two');
            assert_1.default.deepStrictEqual(result[1].language, 'php');
        });
    });
    (0, vitest_1.suite)('createFilepathRegexp', () => {
        (0, vitest_1.test)('should match filepath comment with //', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('typescript');
            const result = regexp.exec('// filepath: /path/to/file');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file');
        });
        (0, vitest_1.test)('should match filepath comment with // with newline', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('typescript');
            const result = regexp.exec('// filepath: /path/to/file\n');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file');
        });
        (0, vitest_1.test)('should match filepath comment with // with newline \r\n', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('typescript');
            const result = regexp.exec('// filepath: /path/to/file\r\n');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file');
        });
        (0, vitest_1.test)('should match filepath comment with #', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('python');
            const result = regexp.exec('# filepath: /path/to/file');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file');
        });
        (0, vitest_1.test)('should match filepath comment with <!--', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('html');
            const result = regexp.exec('<!-- filepath: /path/to/file -->');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file');
        });
        (0, vitest_1.test)('should match filepath comment with <!-- but no -->', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('html');
            const result = regexp.exec('<!-- filepath: /path/to/file');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file');
        });
        (0, vitest_1.test)('should match filepath comment with <!-- and spaces in path', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('html');
            const result = regexp.exec('<!-- filepath: /path/to/file with spaces -->');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file with spaces');
        });
        (0, vitest_1.test)('should match filepath comment with <!-- and spaces in path no spaces at end', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('html');
            const result = regexp.exec('<!-- filepath: /path/to/file with spaces-->');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file with spaces');
        });
        (0, vitest_1.test)('should match filepath comment with <!-- and spaces in path no spaces at end with newline', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('html');
            const result = regexp.exec('<!-- filepath: /path/to/file with spaces-->\n');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file with spaces');
        });
        (0, vitest_1.test)('should match alternative BAT line comments', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('bat');
            const result = regexp.exec(':: filepath: /path/to/file');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file');
        });
        (0, vitest_1.test)('should match BAT line comments', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('bat');
            const result = regexp.exec('REM filepath: /path/to/file');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file');
        });
        (0, vitest_1.test)('should always match #', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('html');
            const result = regexp.exec('# filepath: /path/to/file');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file');
        });
        (0, vitest_1.test)('should always match //', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('html');
            const result = regexp.exec('// filepath: /path/to/file');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file');
        });
        (0, vitest_1.test)('should accept extra whitespaces', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('html');
            const result = regexp.exec(' //   filepath:/path/to/file   ');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file');
        });
        (0, vitest_1.test)('should accept extra whitespaces in path', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('html');
            const result = regexp.exec(' //   filepath:/path/to/file with spaces.py   ');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file with spaces.py');
        });
        (0, vitest_1.test)('should accept extra whitespaces in path and newline', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)('html');
            const result = regexp.exec(' //   filepath:/path/to/file with spaces.py   \n');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file with spaces.py');
        });
        (0, vitest_1.test)('should accept empty language', () => {
            const regexp = (0, markdown_1.createFilepathRegexp)();
            const result = regexp.exec(' //   filepath:    /path/to/file   ');
            assert_1.default.ok(result);
            assert_1.default.strictEqual(result[1], '/path/to/file');
        });
    });
    (0, vitest_1.suite)('mdCodeBlockLangToLanguageId', () => {
        (0, vitest_1.test)('ts is typescript', () => {
            const result = (0, markdown_1.mdCodeBlockLangToLanguageId)('ts');
            assert_1.default.strictEqual(result, 'typescript');
        });
        (0, vitest_1.test)('tsreact is typescriptreact', () => {
            const result = (0, markdown_1.mdCodeBlockLangToLanguageId)('tsx');
            assert_1.default.strictEqual(result, 'typescriptreact');
        });
        (0, vitest_1.test)('python is python', () => {
            const result = (0, markdown_1.mdCodeBlockLangToLanguageId)('python');
            assert_1.default.strictEqual(result, 'python');
        });
    });
});
//# sourceMappingURL=markdown.spec.js.map