"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const os_1 = require("os");
const vitest_1 = require("vitest");
const defaultsOnlyConfigurationService_1 = require("../../../../platform/configuration/common/defaultsOnlyConfigurationService");
const inMemoryConfigurationService_1 = require("../../../../platform/configuration/test/common/inMemoryConfigurationService");
const mockAlternativeContentService_1 = require("../../../../platform/notebook/common/mockAlternativeContentService");
const testWorkspaceService_1 = require("../../../../platform/test/node/testWorkspaceService");
const editing_1 = require("../../../../util/common/test/shims/editing");
const textDocument_1 = require("../../../../util/common/test/shims/textDocument");
const platform_1 = require("../../../../util/vs/base/common/platform");
const uri_1 = require("../../../../util/vs/base/common/uri");
const intents_1 = require("../../../prompt/node/intents");
const editFileToolUtils_1 = require("../editFileToolUtils");
(0, vitest_1.describe)('replace_string_in_file - applyEdit', () => {
    let workspaceEdit;
    let workspaceService;
    let notebookService;
    let alternatveContentService;
    let doc;
    async function doApplyEdit(oldString, newString, uri = doc.document.uri) {
        const r = await (0, editFileToolUtils_1.applyEdit)(uri, oldString, newString, workspaceService, notebookService, alternatveContentService, undefined);
        workspaceEdit.set(uri, r.edits);
        return r;
    }
    function setText(value) {
        (0, textDocument_1.setDocText)(doc, value);
    }
    (0, vitest_1.beforeEach)(() => {
        doc = (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('/my/file.ts'), '', 'ts');
        workspaceEdit = new editing_1.WorkspaceEdit();
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([], [doc.document]);
        notebookService = { hasSupportedNotebooks: () => false };
        alternatveContentService = new mockAlternativeContentService_1.MockAlternativeNotebookContentService();
    });
    (0, vitest_1.test)('simple verbatim', async () => {
        setText('this is an oldString!');
        const result = await doApplyEdit('oldString', 'newString');
        (0, vitest_1.expect)(result.updatedFile).toBe('this is an newString!');
    });
    (0, vitest_1.test)('exact match - single occurrence', async () => {
        setText('function hello() {\n\tconsole.log("world");\n}');
        const result = await doApplyEdit('console.log("world");', 'console.log("hello world");');
        (0, vitest_1.expect)(result.updatedFile).toBe('function hello() {\n\tconsole.log("hello world");\n}');
    });
    (0, vitest_1.test)('exact match - with newlines', async () => {
        setText('line1\nline2\nline3');
        const result = await doApplyEdit('line1\nline2', 'newline1\nnewline2');
        (0, vitest_1.expect)(result.updatedFile).toBe('newline1\nnewline2\nline3');
    });
    (0, vitest_1.test)('multiple exact matches - should throw error', async () => {
        setText('test\ntest\nother');
        await (0, vitest_1.expect)(doApplyEdit('test', 'replacement')).rejects.toThrow(editFileToolUtils_1.MultipleMatchesError);
    });
    (0, vitest_1.test)('whitespace flexible matching - different indentation', async () => {
        setText('function test() {\n    console.log("hello");\n}');
        // Use the exact text from the file for this test
        const result = await doApplyEdit('    console.log("hello");', '\tconsole.log("hi");');
        (0, vitest_1.expect)(result.updatedFile).toBe('function test() {\n\tconsole.log("hi");\n}');
    });
    (0, vitest_1.test)('whitespace flexible matching - trailing spaces', async () => {
        setText('line1   \nline2\nline3');
        const result = await doApplyEdit('line1\nline2', 'newline1\nnewline2');
        (0, vitest_1.expect)(result.updatedFile).toBe('newline1\nnewline2\nline3');
    });
    (0, vitest_1.test)('fuzzy matching - with trailing whitespace variations', async () => {
        setText('if (condition) {\n\treturn true; \n}');
        const result = await doApplyEdit('if (condition) {\n\treturn true;\n}', 'if (condition) {\n\treturn false;\n}');
        (0, vitest_1.expect)(result.updatedFile).toBe('if (condition) {\n\treturn false;\n}');
    });
    (0, vitest_1.test)('no match found - should throw error', async () => {
        setText('some text here');
        await (0, vitest_1.expect)(doApplyEdit('nonexistent', 'replacement')).rejects.toThrow(editFileToolUtils_1.NoMatchError);
    });
    (0, vitest_1.test)('empty old string - create new file', async () => {
        setText('');
        const result = await doApplyEdit('', 'new content');
        (0, vitest_1.expect)(result.updatedFile).toBe('new content');
    });
    (0, vitest_1.test)('empty old string on existing file - should throw error', async () => {
        setText('existing content');
        await (0, vitest_1.expect)(doApplyEdit('', 'new content')).rejects.toThrow(editFileToolUtils_1.ContentFormatError);
    });
    (0, vitest_1.test)('delete text - empty new string', async () => {
        setText('before\nto delete\nafter');
        const result = await doApplyEdit('to delete\n', '');
        (0, vitest_1.expect)(result.updatedFile).toBe('before\nafter');
    });
    (0, vitest_1.test)('delete text - exact match without newline', async () => {
        setText('before to delete after');
        const result = await doApplyEdit('to delete ', '');
        (0, vitest_1.expect)(result.updatedFile).toBe('before after');
    });
    (0, vitest_1.test)('no change - identical strings should throw error', async () => {
        setText('unchanged text');
        await (0, vitest_1.expect)(doApplyEdit('unchanged text', 'unchanged text')).rejects.toThrow(editFileToolUtils_1.NoChangeError);
    });
    (0, vitest_1.test)('replace entire content', async () => {
        setText('old content\nwith multiple lines');
        const result = await doApplyEdit('old content\nwith multiple lines', 'completely new content');
        (0, vitest_1.expect)(result.updatedFile).toBe('completely new content');
    });
    (0, vitest_1.test)('replace with multiline content', async () => {
        setText('single line');
        const result = await doApplyEdit('single line', 'line1\nline2\nline3');
        (0, vitest_1.expect)(result.updatedFile).toBe('line1\nline2\nline3');
    });
    (0, vitest_1.test)('case sensitive matching', async () => {
        setText('Hello World');
        await (0, vitest_1.expect)(doApplyEdit('hello world', 'Hi World')).rejects.toThrow(editFileToolUtils_1.NoMatchError);
    });
    (0, vitest_1.test)('special regex characters in search string', async () => {
        setText('price is $10.99 (discount)');
        const result = await doApplyEdit('$10.99 (discount)', '$9.99 (sale)');
        (0, vitest_1.expect)(result.updatedFile).toBe('price is $9.99 (sale)');
    });
    (0, vitest_1.test)('unicode characters', async () => {
        setText('Hello 世界! 🌍');
        const result = await doApplyEdit('世界! 🌍', '世界! 🌎');
        (0, vitest_1.expect)(result.updatedFile).toBe('Hello 世界! 🌎');
    });
    (0, vitest_1.test)('very long strings', async () => {
        const longText = 'a'.repeat(1000) + 'middle' + 'b'.repeat(1000);
        setText(longText);
        const result = await doApplyEdit('middle', 'CENTER');
        (0, vitest_1.expect)(result.updatedFile).toBe('a'.repeat(1000) + 'CENTER' + 'b'.repeat(1000));
    });
    (0, vitest_1.test)('newline variations - CRLF to LF', async () => {
        setText('line1\r\nline2\r\nline3');
        const result = await doApplyEdit('line1\nline2', 'newline1\nnewline2');
        (0, vitest_1.expect)(result.updatedFile).toBe('newline1\nnewline2\nline3');
    });
    (0, vitest_1.test)('trailing newline handling', async () => {
        setText('content\nwith\nnewlines\n');
        const result = await doApplyEdit('content\nwith\n', 'new\ncontent\n');
        (0, vitest_1.expect)(result.updatedFile).toBe('new\ncontent\nnewlines\n');
    });
    (0, vitest_1.test)('similarity matching - high similarity content', async () => {
        // This tests the similarity matching as a fallback
        setText('function calculateTotal(items) {\n\tlet sum = 0;\n\tfor (let i = 0; i < items.length; i++) {\n\t\tsum += items[i].price;\n\t}\n\treturn sum;\n}');
        const result = await doApplyEdit('function calculateTotal(items) {\n\tlet sum = 0;\n\tfor (let i = 0; i < items.length; i++) {\n\t\tsum += items[i].price;\n\t}\n\treturn sum;\n}', 'function calculateTotal(items) {\n\treturn items.reduce((sum, item) => sum + item.price, 0);\n}');
        (0, vitest_1.expect)(result.updatedFile).toBe('function calculateTotal(items) {\n\treturn items.reduce((sum, item) => sum + item.price, 0);\n}');
    });
    (0, vitest_1.test)('whitespace only differences', async () => {
        setText('function test() {\n    return true;\n}');
        // Use exact text from the file to test whitespace handling
        const result = await doApplyEdit('    return true;', '\treturn false;');
        (0, vitest_1.expect)(result.updatedFile).toBe('function test() {\n\treturn false;\n}');
    });
    (0, vitest_1.test)('mixed whitespace and content changes', async () => {
        setText('if (condition)   {\n  console.log("test");   \n}');
        // Use exact text matching the file content
        const result = await doApplyEdit('  console.log("test");   ', '\tconsole.log("updated");');
        (0, vitest_1.expect)(result.updatedFile).toBe('if (condition)   {\n\tconsole.log("updated");\n}');
    });
    (0, vitest_1.test)('empty lines handling', async () => {
        setText('line1\n\n\nline4');
        const result = await doApplyEdit('line1\n\n\nline4', 'line1\n\nline3\nline4');
        (0, vitest_1.expect)(result.updatedFile).toBe('line1\n\nline3\nline4');
    });
    (0, vitest_1.test)('partial line replacement', async () => {
        setText('const name = "old value";');
        const result = await doApplyEdit('"old value"', '"new value"');
        (0, vitest_1.expect)(result.updatedFile).toBe('const name = "new value";');
    });
    (0, vitest_1.test)('multiple line partial replacement', async () => {
        setText('function test() {\n\tconsole.log("debug");\n\treturn value;\n}');
        const result = await doApplyEdit('console.log("debug");\n\treturn value;', 'return newValue;');
        (0, vitest_1.expect)(result.updatedFile).toBe('function test() {\n\treturn newValue;\n}');
    });
    // Edge cases and error conditions
    (0, vitest_1.test)('error properties - NoMatchError', async () => {
        setText('some text');
        try {
            await doApplyEdit('missing', 'replacement');
        }
        catch (error) {
            (0, vitest_1.expect)(error).toBeInstanceOf(editFileToolUtils_1.NoMatchError);
            (0, vitest_1.expect)(error.kindForTelemetry).toBe('noMatchFound');
            (0, vitest_1.expect)(error.file).toBe('file:///my/file.ts');
        }
    });
    (0, vitest_1.test)('error properties - MultipleMatchesError', async () => {
        setText('same\nsame\nother');
        try {
            await doApplyEdit('same', 'different');
        }
        catch (error) {
            (0, vitest_1.expect)(error).toBeInstanceOf(editFileToolUtils_1.MultipleMatchesError);
            (0, vitest_1.expect)(error.kindForTelemetry).toBe('multipleMatchesFound');
            (0, vitest_1.expect)(error.file).toBe('file:///my/file.ts');
        }
    });
    (0, vitest_1.test)('error properties - NoChangeError', async () => {
        setText('test content');
        try {
            await doApplyEdit('test content', 'test content');
        }
        catch (error) {
            (0, vitest_1.expect)(error).toBeInstanceOf(editFileToolUtils_1.NoChangeError);
            (0, vitest_1.expect)(error.kindForTelemetry).toBe('noChange');
            (0, vitest_1.expect)(error.file).toBe('file:///my/file.ts');
        }
    });
    (0, vitest_1.test)('error properties - ContentFormatError', async () => {
        setText('existing content');
        try {
            await doApplyEdit('', 'new content');
        }
        catch (error) {
            (0, vitest_1.expect)(error).toBeInstanceOf(editFileToolUtils_1.ContentFormatError);
            (0, vitest_1.expect)(error.kindForTelemetry).toBe('contentFormatError');
            (0, vitest_1.expect)(error.file).toBe('file:///my/file.ts');
        }
    });
    (0, vitest_1.test)('very small strings', async () => {
        setText('a');
        const result = await doApplyEdit('a', 'b');
        (0, vitest_1.expect)(result.updatedFile).toBe('b');
    });
    (0, vitest_1.test)('empty file with empty replacement', async () => {
        setText('');
        const result = await doApplyEdit('', '');
        (0, vitest_1.expect)(result.updatedFile).toBe('');
    });
    (0, vitest_1.test)('single character replacement', async () => {
        setText('hello unique');
        const result = await doApplyEdit('unique', 'special');
        (0, vitest_1.expect)(result.updatedFile).toBe('hello special');
    });
    (0, vitest_1.test)('multiple single character matches - should throw error', async () => {
        setText('hello world');
        await (0, vitest_1.expect)(doApplyEdit('l', 'L')).rejects.toThrow(editFileToolUtils_1.MultipleMatchesError);
    });
    (0, vitest_1.test)('replacement with same length', async () => {
        setText('old text here');
        const result = await doApplyEdit('old', 'new');
        (0, vitest_1.expect)(result.updatedFile).toBe('new text here');
    });
    (0, vitest_1.test)('replacement with longer text', async () => {
        setText('short');
        const result = await doApplyEdit('short', 'much longer text');
        (0, vitest_1.expect)(result.updatedFile).toBe('much longer text');
    });
    (0, vitest_1.test)('replacement with shorter text', async () => {
        setText('very long text here');
        const result = await doApplyEdit('very long text', 'short');
        (0, vitest_1.expect)(result.updatedFile).toBe('short here');
    });
    (0, vitest_1.test)('beginning of file replacement', async () => {
        setText('start of file\nrest of content');
        const result = await doApplyEdit('start of file', 'beginning');
        (0, vitest_1.expect)(result.updatedFile).toBe('beginning\nrest of content');
    });
    (0, vitest_1.test)('end of file replacement', async () => {
        setText('content here\nend of file');
        const result = await doApplyEdit('end of file', 'conclusion');
        (0, vitest_1.expect)(result.updatedFile).toBe('content here\nconclusion');
    });
    (0, vitest_1.test)('middle of line replacement', async () => {
        setText('prefix MIDDLE suffix');
        const result = await doApplyEdit('MIDDLE', 'center');
        (0, vitest_1.expect)(result.updatedFile).toBe('prefix center suffix');
    });
    (0, vitest_1.test)('multiple spaces preservation', async () => {
        setText('word1     word2');
        const result = await doApplyEdit('word1     word2', 'word1 word2');
        (0, vitest_1.expect)(result.updatedFile).toBe('word1 word2');
    });
    (0, vitest_1.test)('tab character replacement', async () => {
        setText('before\tafter');
        const result = await doApplyEdit('\t', '    ');
        (0, vitest_1.expect)(result.updatedFile).toBe('before    after');
    });
    (0, vitest_1.test)('mixed tabs and spaces', async () => {
        setText('function() {\n\t    mixed indentation\n}');
        const result = await doApplyEdit('\t    mixed indentation', '    proper indentation');
        (0, vitest_1.expect)(result.updatedFile).toBe('function() {\n    proper indentation\n}');
    });
    (0, vitest_1.test)('return value structure', async () => {
        setText('old content');
        const result = await doApplyEdit('old', 'new');
        (0, vitest_1.expect)(result).toHaveProperty('patch');
        (0, vitest_1.expect)(result).toHaveProperty('updatedFile');
        (0, vitest_1.expect)(Array.isArray(result.patch)).toBe(true);
        (0, vitest_1.expect)(typeof result.updatedFile).toBe('string');
    });
    (0, vitest_1.test)('fixes bad newlines in issue #9753', async () => {
        const input = JSON.parse(fs.readFileSync(__dirname + '/editFileToolUtilsFixtures/crlf-input.json', 'utf8'));
        const output = JSON.parse(fs.readFileSync(__dirname + '/editFileToolUtilsFixtures/crlf-output.json', 'utf8')).join('\r\n');
        const toolCall = JSON.parse(fs.readFileSync(__dirname + '/editFileToolUtilsFixtures/crlf-tool-call.json', 'utf8'));
        const crlfDoc = (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('/my/file2.ts'), input.join('\r\n'), 'ts', '\r\n');
        workspaceService.textDocuments.push(crlfDoc.document);
        const result = await doApplyEdit(toolCall.oldString, toolCall.newString, crlfDoc.document.uri);
        (0, vitest_1.expect)(result.updatedFile).toBe(output);
        (0, vitest_1.expect)((0, intents_1.applyEdits)(input.join('\r\n'), workspaceEdit.entries()[0][1])).toBe(output);
    });
    // Whitespace-flexible matching strategy tests
    // Note: Whitespace-flexible matching only triggers when:
    // 1. No exact match exists
    // 2. No fuzzy match exists (fuzzy allows trailing spaces but not leading/different indentation)
    // 3. Trimmed lines match exactly AND there's an empty line after the match
    (0, vitest_1.describe)('whitespace-flexible matching', () => {
        (0, vitest_1.test)('matches when file has empty line after content', async () => {
            // File has content followed by empty line, with varying indentation
            setText('function test() {\n  \tconsole.log("hello");\n\treturn true;\n\n}');
            // Search for content with trailing newline - the empty line in file will match the empty needle element
            const result = await doApplyEdit('console.log("hello");\nreturn true;\n', 'console.log("updated");\nreturn false;\n');
            (0, vitest_1.expect)(result.updatedFile).toContain('console.log("updated");');
            (0, vitest_1.expect)(result.updatedFile).toContain('return false;');
        });
        (0, vitest_1.test)('matches when indentation varies and empty line follows', async () => {
            setText('if (x) {\n\t\t  if (y) {\n    \t\tcode();\n\t  \t}\n\n}');
            // Empty line in file matches empty string in needle
            const result = await doApplyEdit('if (y) {\ncode();\n}\n', 'if (y) {\nupdated();\n}\n');
            (0, vitest_1.expect)(result.updatedFile).toContain('updated();');
        });
        (0, vitest_1.test)('throws error on multiple matches with empty lines', async () => {
            setText('function a() {\n  \treturn 1;\n\n}\nfunction b() {\n\t return 1;\n\n}');
            // Both functions have same content when trimmed, followed by empty lines
            await (0, vitest_1.expect)(doApplyEdit('return 1;\n', 'return 2;\n')).rejects.toThrow(editFileToolUtils_1.MultipleMatchesError);
        });
        (0, vitest_1.test)('matches block with trailing empty line preserving structure', async () => {
            setText('class Test {\n\t  method() {\n  \t\tconst x = 1;\n\t    const y = 2;\n\n  \t}\n}');
            // Search with trailing newline to match the empty line
            const result = await doApplyEdit('const x = 1;\nconst y = 2;\n', 'const z = 3;\n');
            (0, vitest_1.expect)(result.updatedFile).toContain('const z = 3;');
            (0, vitest_1.expect)(result.updatedFile).toContain('class Test');
        });
        (0, vitest_1.test)('whitespace-flexible match minimizes edits with empty line', async () => {
            setText('function test() {\n  \tconst a = 1;\n\t  const b = 2;\n\n}');
            const result = await doApplyEdit('const a = 1;\nconst b = 2;\n', 'const a = 1;\nconst b = 3;\n');
            // Should preserve identical first line
            (0, vitest_1.expect)(result.edits.length).toBe(1);
            (0, vitest_1.expect)(result.updatedFile).toContain('const b = 3;');
        });
        (0, vitest_1.test)('empty line in haystack required for whitespace-flexible match', async () => {
            setText('line1\n  \tline2\n\n\t  line3');
            // Search with trailing newline - empty line in haystack matches empty needle element
            const result = await doApplyEdit('line1\nline2\n', 'new1\nnew2\n');
            (0, vitest_1.expect)(result.updatedFile).toContain('new1');
            (0, vitest_1.expect)(result.updatedFile).toContain('new2');
            (0, vitest_1.expect)(result.updatedFile).toContain('line3');
        });
    });
    // Similarity-based matching strategy tests
    (0, vitest_1.describe)('similarity matching', () => {
        (0, vitest_1.test)('matches highly similar content with minor differences', async () => {
            setText('function calculate(items) {\n\tlet total = 0;\n\tfor (let i = 0; i < items.length; i++) {\n\t\ttotal += items[i].price;\n\t}\n\treturn total;\n}');
            // Search string has slightly different variable name - 1 char diff in one place
            const result = await doApplyEdit('function calculate(items) {\n\tlet total = 0;\n\tfor (let i = 0; i < items.length; i++) {\n\t\ttotal += items[i].pric;\n\t}\n\treturn total;\n}', 'function calculate(items) {\n\treturn items.reduce((acc, item) => acc + item.price, 0);\n}');
            (0, vitest_1.expect)(result.updatedFile).toBe('function calculate(items) {\n\treturn items.reduce((acc, item) => acc + item.price, 0);\n}');
        });
        (0, vitest_1.test)('similarity match with small typos in search string', async () => {
            setText('const message = "Hello, World!";\nconsole.log(message);');
            // Search has a typo but high similarity (95%+)
            const result = await doApplyEdit('const mesage = "Hello, World!";\nconsole.log(message);', 'const greeting = "Hi there!";\nconsole.log(greeting);');
            // Should find a match and replace
            (0, vitest_1.expect)(result.updatedFile).toContain('greeting');
        });
        (0, vitest_1.test)('similarity match does not trigger for low similarity', async () => {
            setText('function test() {\n\treturn true;\n}');
            // Very different content should not match
            await (0, vitest_1.expect)(doApplyEdit('completely different text here with no similarity at all to the original', 'replacement')).rejects.toThrow(editFileToolUtils_1.NoMatchError);
        });
        (0, vitest_1.test)('similarity match prefers best match among candidates', async () => {
            setText('function a() {\n\tconst x = 1;\n\tconst y = 2;\n}\nfunction b() {\n\tconst x = 1;\n\tconst z = 3;\n}');
            // Should match function a (higher similarity with y vs z)
            const result = await doApplyEdit('function a() {\nconst x = 1;\nconst y = 2;\n}', 'function a() {\nconst result = 3;\n}');
            (0, vitest_1.expect)(result.updatedFile).toContain('const result = 3');
            (0, vitest_1.expect)(result.updatedFile).toContain('function b()'); // Second function unchanged
        });
        (0, vitest_1.test)('similarity match skips very large strings', async () => {
            // Similarity matching should skip strings > 1000 chars or > 20 lines
            const largeText = 'line\n'.repeat(50) + 'target line\n' + 'line\n'.repeat(50);
            setText(largeText);
            // Should fall back to exact/fuzzy matching instead of similarity
            const result = await doApplyEdit('target line', 'replaced line');
            (0, vitest_1.expect)(result.updatedFile).toContain('replaced line');
        });
        (0, vitest_1.test)('similarity match minimizes edits - preserves identical lines', async () => {
            setText('function test() {\n\tconst a = 1;\n\tconst b = 2;\n\tconst c = 3;\n}');
            const result = await doApplyEdit('function test() {\n\tconst a = 1;\n\tconst x = 2;\n\tconst c = 3;\n}', 'function test() {\n\tconst a = 1;\n\tconst y = 4;\n\tconst c = 3;\n}');
            // Should preserve identical first and last lines
            (0, vitest_1.expect)(result.updatedFile).toContain('const a = 1');
            (0, vitest_1.expect)(result.updatedFile).toContain('const y = 4');
            (0, vitest_1.expect)(result.updatedFile).toContain('const c = 3');
        });
        (0, vitest_1.test)('similarity match with small content blocks', async () => {
            setText('const x = 1;\nconst y = 2;\nconst z = 3;');
            // Small similar block should match via similarity
            const result = await doApplyEdit('const x = 1;\nconst w = 2;', 'const a = 10;\nconst b = 20;');
            // Should match first two lines and replace them
            (0, vitest_1.expect)(result.updatedFile).toContain('const a = 10');
            (0, vitest_1.expect)(result.updatedFile).toContain('const b = 20');
        });
        (0, vitest_1.describe)('similarity match - edge cases for slice calculations', () => {
            let prev;
            (0, vitest_1.beforeEach)(() => {
                prev = (0, editFileToolUtils_1.setSimilarityMatchThresholdForTests)(0.6);
            });
            (0, vitest_1.afterEach)(() => {
                (0, editFileToolUtils_1.setSimilarityMatchThresholdForTests)(prev);
            });
            (0, vitest_1.test)('similarity match preserves lines after replacement when there are identical trailing lines', async () => {
                // This test checks for off-by-one errors in the slice calculation
                setText('function test() {\n\tconst a = 1;\n\tconst b = 2;\n\tconst c = 3;\n\tconst d = 4;\n}');
                // Search has identical first and last lines, different middle
                const result = await doApplyEdit('function test() {\n\tconst a = 1;\n\tconst x = 2;\n\tconst y = 3;\n\tconst d = 4;\n}', 'function test() {\n\tconst a = 1;\n\tconst newB = 20;\n\tconst newC = 30;\n\tconst d = 4;\n}');
                // Should preserve the closing brace
                (0, vitest_1.expect)(result.updatedFile).toBe('function test() {\n\tconst a = 1;\n\tconst newB = 20;\n\tconst newC = 30;\n\tconst d = 4;\n}');
            });
            (0, vitest_1.test)('similarity match with multiple identical trailing lines', async () => {
                // Edge case that tests the slice calculation for multiple trailing lines
                // Use similar strings to meet the 60% threshold while ensuring window i=0 has best match
                setText('EXACT_START\nchange_me_1\nchange_me_2\nEXACT_END1\nEXACT_END2');
                // Window at i=0: EXACT_START (100%) + change_me_1 vs modify_1 (~70%) + change_me_2 vs modify_2 (~70%) + EXACT_END1 (100%) + EXACT_END2 (100%) = ~88%
                const result = await doApplyEdit('EXACT_START\nmodify_1\nmodify_2\nEXACT_END1\nEXACT_END2', 'EXACT_START\nNEW_1\nNEW_2\nEXACT_END1\nEXACT_END2');
                // Should match window at i=0 and replace the middle 2 lines
                (0, vitest_1.expect)(result.updatedFile).toBe('EXACT_START\nNEW_1\nNEW_2\nEXACT_END1\nEXACT_END2');
            });
            (0, vitest_1.test)('similarity match boundary: no identical lines', async () => {
                setText('aaa\nbbb\nccc');
                // With low similarity, should not match
                await (0, vitest_1.expect)(doApplyEdit('xxx\nyyy\nzzz', 'new1\nnew2\nnew3')).rejects.toThrow(editFileToolUtils_1.NoMatchError);
            });
            (0, vitest_1.test)('similarity match edge case: all identical lines except middle', async () => {
                // This tests the slice calculation with identical leading and trailing lines
                // File has 5 lines, search differs in 1 line = 80% similarity, above 60% threshold
                setText('Alpha\nBravo\nCharlie\nDelta\nEcho');
                // Search has identical first 2 and last 2, different middle
                // identical.leading = 2, identical.trailing = 2
                const result = await doApplyEdit('Alpha\nBravo\nXray\nDelta\nEcho', 'Alpha\nBravo\nNEW\nDelta\nEcho');
                // Should replace only line Charlie with NEW, preserving all other lines
                (0, vitest_1.expect)(result.updatedFile).toBe('Alpha\nBravo\nNEW\nDelta\nEcho');
            });
            (0, vitest_1.test)('similarity match edge case: only last line differs', async () => {
                // Tests the slice calculation when identical.trailing = 0
                // 3/4 lines match = 75% similarity > 60% threshold
                setText('start_line\nmiddle_one\nmiddle_two\nold_ending');
                // Search matches first 3 lines, last is different
                // identical.leading = 3, identical.trailing = 0
                const result = await doApplyEdit('start_line\nmiddle_one\nmiddle_two\nwrong_ending', 'start_line\nmiddle_one\nmiddle_two\nnew_ending');
                // Should preserve first 3 lines and replace only last line
                (0, vitest_1.expect)(result.updatedFile).toBe('start_line\nmiddle_one\nmiddle_two\nnew_ending');
            });
            (0, vitest_1.test)('similarity match edge case: only first line differs', async () => {
                // Tests the slice calculation when identical.leading = 0
                // 3/4 lines match = 75% similarity > 60% threshold
                setText('old_beginning\nmiddle_one\nmiddle_two\nending_line');
                // Search matches last 3 lines, first is different
                // identical.leading = 0, identical.trailing = 3
                const result = await doApplyEdit('wrong_beginning\nmiddle_one\nmiddle_two\nending_line', 'new_beginning\nmiddle_one\nmiddle_two\nending_line');
                // Should replace only first line, preserve last 3
                (0, vitest_1.expect)(result.updatedFile).toBe('new_beginning\nmiddle_one\nmiddle_two\nending_line');
            });
        });
    });
    // Edit minimization tests across all strategies
    (0, vitest_1.describe)('edit minimization', () => {
        (0, vitest_1.test)('exact match minimizes edits - preserves identical prefix/suffix', async () => {
            setText('prefix unchanged middle changed suffix unchanged');
            const result = await doApplyEdit('prefix unchanged middle changed suffix unchanged', 'prefix unchanged middle updated suffix unchanged');
            // Should only edit the "changed" -> "updated" part
            (0, vitest_1.expect)(result.edits.length).toBe(1);
            (0, vitest_1.expect)(result.edits[0].newText).toBe('updat');
        });
        (0, vitest_1.test)('fuzzy match only replaces different content', async () => {
            setText('line1\nline2\nline3\n');
            const result = await doApplyEdit('line1\nline2\nline3', 'line1\nmodified\nline3');
            // Should edit the content
            (0, vitest_1.expect)(result.updatedFile).toBe('line1\nmodified\nline3\n');
        });
        (0, vitest_1.test)('edits array contains correct positions', async () => {
            setText('start\ntarget line to change\nend');
            const result = await doApplyEdit('target line to change', 'modified line');
            (0, vitest_1.expect)(result.edits.length).toBe(1);
            const edit = result.edits[0];
            // Verify the edit has the right text
            (0, vitest_1.expect)(edit.newText).toBe('modified lin');
            // Verify it's on the correct line
            (0, vitest_1.expect)(edit.range.start.line).toBe(1); // 0-indexed, so line 2
        });
        (0, vitest_1.test)('exact match with partial change minimizes edited text', async () => {
            setText('const a = 1;\nconst b = 2;\nconst c = 3;');
            const result = await doApplyEdit('const a = 1;\nconst b = 2;\nconst c = 3;', 'const a = 10;\nconst b = 2;\nconst c = 30;');
            // Should have minimized the edits
            (0, vitest_1.expect)(result.updatedFile).toBe('const a = 10;\nconst b = 2;\nconst c = 30;');
        });
    });
});
(0, vitest_1.describe)('assertPathIsSafe (Windows scenarios)', () => {
    // Force Windows checks by passing true for _isWindows
    (0, vitest_1.test)('accepts normal path', () => {
        (0, vitest_1.expect)(() => (0, editFileToolUtils_1.assertPathIsSafe)('C:\\Users\\me\\project\\file.txt', true)).not.toThrow();
    });
    (0, vitest_1.test)('rejects null byte', () => {
        (0, vitest_1.expect)(() => (0, editFileToolUtils_1.assertPathIsSafe)('C:\\Users\\me\\proje\0ct\\file.txt', true)).toThrow();
    });
    (0, vitest_1.test)('rejects ADS suffix', () => {
        (0, vitest_1.expect)(() => (0, editFileToolUtils_1.assertPathIsSafe)('C:\\Users\\me\\project\\file.txt:$I30:$INDEX_ALLOCATION', true)).toThrow();
    });
    (0, vitest_1.test)('rejects additional colon in component', () => {
        (0, vitest_1.expect)(() => (0, editFileToolUtils_1.assertPathIsSafe)('C:\\Users\\me\\file:name.txt', true)).toThrow();
    });
    (0, vitest_1.test)('rejects invalid characters', () => {
        (0, vitest_1.expect)(() => (0, editFileToolUtils_1.assertPathIsSafe)('C:\\Users\\me\\proj>ect\\file.txt', true)).toThrow();
    });
    (0, vitest_1.test)('rejects device path prefix \\?\\', () => {
        // This should be treated as reserved device path
        (0, vitest_1.expect)(() => (0, editFileToolUtils_1.assertPathIsSafe)('\\\\?\\C:\\Users\\me\\file.txt', true)).toThrow();
    });
    (0, vitest_1.test)('rejects reserved device name component', () => {
        (0, vitest_1.expect)(() => (0, editFileToolUtils_1.assertPathIsSafe)('C:\\Users\\me\\CON\\file.txt', true)).toThrow();
    });
    (0, vitest_1.test)('rejects trailing dot in component', () => {
        (0, vitest_1.expect)(() => (0, editFileToolUtils_1.assertPathIsSafe)('C:\\Users\\me\\folder.\\file.txt', true)).toThrow();
    });
    (0, vitest_1.test)('rejects trailing space in component', () => {
        (0, vitest_1.expect)(() => (0, editFileToolUtils_1.assertPathIsSafe)('C:\\Users\\me\\folder \\file.txt', true)).toThrow();
    });
    (0, vitest_1.test)('rejects 8.3 short filename pattern', () => {
        (0, vitest_1.expect)(() => (0, editFileToolUtils_1.assertPathIsSafe)('C:\\Users\\me\\VSCODE~1\\settings.json', true)).toThrow();
    });
    (0, vitest_1.test)('allows tilde without digit', () => {
        (0, vitest_1.expect)(() => (0, editFileToolUtils_1.assertPathIsSafe)('C:\\Users\\me\\my~folder\\file.txt', true)).not.toThrow();
    });
});
(0, vitest_1.describe)('makeUriConfirmationChecker', async () => {
    // Mock custom instructions service
    class MockCustomInstructionsService {
        constructor() {
            this.externalFiles = new Set();
        }
        setExternalFiles(uris) {
            this.externalFiles.clear();
            uris.forEach(uri => this.externalFiles.add(uri.toString()));
        }
        isExternalInstructionsFile(uri) {
            return this.externalFiles.has(uri.toString());
        }
        fetchInstructionsFromSetting() {
            return Promise.resolve([]);
        }
        fetchInstructionsFromFile() {
            return Promise.resolve(undefined);
        }
        getAgentInstructions() {
            return Promise.resolve([]);
        }
    }
    let configService;
    let workspaceService;
    let customInstructionsService;
    (0, vitest_1.beforeEach)(() => {
        configService = new inMemoryConfigurationService_1.InMemoryConfigurationService(new defaultsOnlyConfigurationService_1.DefaultsOnlyConfigurationService());
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([], []);
        customInstructionsService = new MockCustomInstructionsService();
    });
    (0, vitest_1.test)('allows files within workspace folder', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        const fileInWorkspace = uri_1.URI.file('/workspace/src/file.ts');
        const result = await checker(fileInWorkspace);
        (0, vitest_1.expect)(result).toBe(0 /* ConfirmationCheckResult.NoConfirmation */);
    });
    (0, vitest_1.test)('rejects files outside workspace', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        const fileOutsideWorkspace = uri_1.URI.file('/other/file.ts');
        const result = await checker(fileOutsideWorkspace);
        (0, vitest_1.expect)(result).toBe(4 /* ConfirmationCheckResult.OutsideWorkspace */); // OutsideWorkspace
    });
    (0, vitest_1.test)('allows untitled files', async () => {
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([], []);
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        const untitledFile = uri_1.URI.parse('untitled:Untitled-1');
        const result = await checker(untitledFile);
        (0, vitest_1.expect)(result).toBe(0 /* ConfirmationCheckResult.NoConfirmation */);
    });
    (0, vitest_1.test)('allows external instructions files', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        const externalInstruction = uri_1.URI.file('/external/instruction.md');
        customInstructionsService.setExternalFiles([externalInstruction]);
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        const result = await checker(externalInstruction);
        (0, vitest_1.expect)(result).toBe(0 /* ConfirmationCheckResult.NoConfirmation */);
    });
    (0, vitest_1.test)('respects autoApprove patterns - allows matching files', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        await configService.setNonExtensionConfig('chat.tools.edits.autoApprove', {
            '**/*.test.ts': true,
        });
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        const testFile = uri_1.URI.file('/workspace/src/app.test.ts');
        const result = await checker(testFile);
        (0, vitest_1.expect)(result).toBe(0 /* ConfirmationCheckResult.NoConfirmation */);
    });
    (0, vitest_1.test)('respects autoApprove patterns - allows non-matching files by default', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        await configService.setNonExtensionConfig('chat.tools.edits.autoApprove', {
            '**/*.test.ts': true,
        });
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        const prodFile = uri_1.URI.file('/workspace/src/app.ts');
        const result = await checker(prodFile);
        // Files in workspace are allowed by default unless explicitly blocked
        (0, vitest_1.expect)(result).toBe(0 /* ConfirmationCheckResult.NoConfirmation */);
    });
    (0, vitest_1.test)('respects autoApprove patterns - blocks explicitly denied files', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        await configService.setNonExtensionConfig('chat.tools.edits.autoApprove', {
            '**/*.env': false,
        });
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        const envFile = uri_1.URI.file('/workspace/.env');
        const result = await checker(envFile);
        (0, vitest_1.expect)(result).toBe(2 /* ConfirmationCheckResult.Sensitive */); // Sensitive
    });
    (0, vitest_1.test)('always checks .vscode/*.json files', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        const settingsFile = uri_1.URI.file('/workspace/.vscode/settings.json');
        const result = await checker(settingsFile);
        (0, vitest_1.expect)(result).toBe(2 /* ConfirmationCheckResult.Sensitive */); // Sensitive - always requires confirmation
    });
    (0, vitest_1.test)('pattern precedence - later patterns override earlier ones', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        await configService.setNonExtensionConfig('chat.tools.edits.autoApprove', {
            '**/*.ts': true,
            '**/secret.ts': false, // More specific pattern should win
        });
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        const secretFile = uri_1.URI.file('/workspace/src/secret.ts');
        const result = await checker(secretFile);
        (0, vitest_1.expect)(result).toBe(2 /* ConfirmationCheckResult.Sensitive */); // Sensitive - specific pattern blocks
    });
    (0, vitest_1.test)('handles invalid paths with security checks', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        const invalidFile = uri_1.URI.file('/workspace/file\0.ts');
        await (0, vitest_1.expect)(checker(invalidFile)).rejects.toThrow();
    });
    (0, vitest_1.test)('multiple workspace folders - allows files in any folder', async () => {
        const workspace1 = uri_1.URI.file('/workspace1');
        const workspace2 = uri_1.URI.file('/workspace2');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspace1, workspace2], []);
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        const fileInWorkspace1 = uri_1.URI.file('/workspace1/file.ts');
        const fileInWorkspace2 = uri_1.URI.file('/workspace2/file.ts');
        (0, vitest_1.expect)(await checker(fileInWorkspace1)).toBe(0 /* ConfirmationCheckResult.NoConfirmation */);
        (0, vitest_1.expect)(await checker(fileInWorkspace2)).toBe(0 /* ConfirmationCheckResult.NoConfirmation */);
    });
    (0, vitest_1.test)('caches patterns per workspace folder', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        await configService.setNonExtensionConfig('chat.tools.edits.autoApprove', {
            '**/*.test.ts': true,
        });
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        // First call should compute patterns
        const file1 = uri_1.URI.file('/workspace/test1.test.ts');
        const result1 = await checker(file1);
        (0, vitest_1.expect)(result1).toBe(0 /* ConfirmationCheckResult.NoConfirmation */);
        // Second call should use cached patterns
        const file2 = uri_1.URI.file('/workspace/test2.test.ts');
        const result2 = await checker(file2);
        (0, vitest_1.expect)(result2).toBe(0 /* ConfirmationCheckResult.NoConfirmation */);
    });
    (0, vitest_1.test)('case sensitivity handling', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        await configService.setNonExtensionConfig('chat.tools.edits.autoApprove', {
            '**/Test.ts': true,
        });
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        // Case handling should depend on platform
        const testFile = uri_1.URI.file('/workspace/Test.ts');
        const result = await checker(testFile);
        (0, vitest_1.expect)(result).toBe(0 /* ConfirmationCheckResult.NoConfirmation */);
    });
    (0, vitest_1.test)('empty autoApprove config - blocks all non-workspace files', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        // No autoApprove config set
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        const file = uri_1.URI.file('/workspace/src/file.ts');
        const result = await checker(file);
        // Without explicit approval, files should still be allowed if not sensitive
        (0, vitest_1.expect)(result).toBe(0 /* ConfirmationCheckResult.NoConfirmation */);
    });
    (0, vitest_1.test)('workspace folder excluded by pattern - still allows workspace edits', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        await configService.setNonExtensionConfig('chat.tools.edits.autoApprove', {
            '/workspace/**': false,
        });
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        // Pattern matching the workspace folder itself should not be included
        const file = uri_1.URI.file('/workspace/file.ts');
        const result = await checker(file);
        // The pattern should be ignored because it matches the workspace root
        (0, vitest_1.expect)(result).toBe(0 /* ConfirmationCheckResult.NoConfirmation */);
    });
    if (platform_1.isMacintosh) {
        (0, vitest_1.test)('pattern matching macOS Library path', async () => {
            // Simulate a workspace opened in ~/Library (which is normally restricted)
            const workspaceFolder = uri_1.URI.file('/');
            workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
            await configService.setNonExtensionConfig('chat.tools.edits.autoApprove', {});
            const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
            const normalFile = uri_1.URI.file(`${(0, os_1.homedir)()}/Library/MyApp/src/app.ts`);
            (0, vitest_1.expect)(await checker(normalFile)).toBe(3 /* ConfirmationCheckResult.SystemFile */);
        });
        (0, vitest_1.test)('pattern matching workspace folder on macOS Library path', async () => {
            // Simulate a workspace opened in ~/Library (which is normally restricted)
            const libraryWorkspace = uri_1.URI.file(`${(0, os_1.homedir)()}/Library/MyApp`);
            workspaceService = new testWorkspaceService_1.TestWorkspaceService([libraryWorkspace], []);
            await configService.setNonExtensionConfig('chat.tools.edits.autoApprove', {
                '**/*.config': false,
            });
            const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
            const normalFile = uri_1.URI.file(`${(0, os_1.homedir)()}/Library/MyApp/src/app.ts`);
            const configFile = uri_1.URI.file(`${(0, os_1.homedir)()}/Library/MyApp/settings.config`);
            (0, vitest_1.expect)(await checker(normalFile)).toBe(0 /* ConfirmationCheckResult.NoConfirmation */);
            (0, vitest_1.expect)(await checker(configFile)).toBe(2 /* ConfirmationCheckResult.Sensitive */);
        });
    }
    (0, vitest_1.test)('nested pattern matching', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        await configService.setNonExtensionConfig('chat.tools.edits.autoApprove', {
            '**/config/**': false,
            '**/config/test/**': true, // More specific pattern
        });
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        // More specific pattern should override the general one
        const testConfigFile = uri_1.URI.file('/workspace/config/test/settings.json');
        const result = await checker(testConfigFile);
        (0, vitest_1.expect)(result).toBe(0 /* ConfirmationCheckResult.NoConfirmation */); // allowed by more specific pattern
    });
    (0, vitest_1.test)('handles relative workspace patterns correctly', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        await configService.setNonExtensionConfig('chat.tools.edits.autoApprove', {
            'src/**/*.ts': true,
            'dist/**': false,
        });
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        const srcFile = uri_1.URI.file('/workspace/src/app.ts');
        const distFile = uri_1.URI.file('/workspace/dist/app.js');
        (0, vitest_1.expect)(await checker(srcFile)).toBe(0 /* ConfirmationCheckResult.NoConfirmation */);
        (0, vitest_1.expect)(await checker(distFile)).toBe(2 /* ConfirmationCheckResult.Sensitive */); // Sensitive - explicitly blocked
    });
    (0, vitest_1.test)('pattern matching is workspace-relative', async () => {
        const workspace1 = uri_1.URI.file('/workspace1');
        const workspace2 = uri_1.URI.file('/workspace2');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspace1, workspace2], []);
        await configService.setNonExtensionConfig('chat.tools.edits.autoApprove', {
            'secrets/**': false,
        });
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        const secretsInWorkspace1 = uri_1.URI.file('/workspace1/secrets/api-key.txt');
        const secretsInWorkspace2 = uri_1.URI.file('/workspace2/secrets/token.txt');
        // Pattern should apply to both workspaces
        (0, vitest_1.expect)(await checker(secretsInWorkspace1)).toBe(2 /* ConfirmationCheckResult.Sensitive */); // Sensitive
        (0, vitest_1.expect)(await checker(secretsInWorkspace2)).toBe(2 /* ConfirmationCheckResult.Sensitive */); // Sensitive
    });
    (0, vitest_1.test)('complex glob patterns', async () => {
        const workspaceFolder = uri_1.URI.file('/workspace');
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolder], []);
        await configService.setNonExtensionConfig('chat.tools.edits.autoApprove', {
            '**/*.{env,secret,key}': false,
            '**/test/**/*.env': true, // Exception for test env files
        });
        const checker = (0, editFileToolUtils_1.makeUriConfirmationChecker)(configService, workspaceService, customInstructionsService);
        const prodEnv = uri_1.URI.file('/workspace/.env');
        const testEnv = uri_1.URI.file('/workspace/test/integration.env');
        const apiKey = uri_1.URI.file('/workspace/config/api.key');
        (0, vitest_1.expect)(await checker(prodEnv)).toBe(2 /* ConfirmationCheckResult.Sensitive */); // Sensitive - matches block pattern
        (0, vitest_1.expect)(await checker(testEnv)).toBe(0 /* ConfirmationCheckResult.NoConfirmation */); // exception pattern
        (0, vitest_1.expect)(await checker(apiKey)).toBe(2 /* ConfirmationCheckResult.Sensitive */); // Sensitive - matches block pattern
    });
});
//# sourceMappingURL=editFileToolUtils.spec.js.map