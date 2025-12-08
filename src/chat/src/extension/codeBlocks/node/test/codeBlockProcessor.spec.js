"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const vitest_1 = require("vitest");
const uri_1 = require("../../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const codeBlockProcessor_1 = require("../codeBlockProcessor");
(0, vitest_1.suite)('CodeBlockProcessor', () => {
    function newCodeBlockProcessor(reportedCodeblocks = [], reportedMarkdown = [], lineProcessor) {
        return new codeBlockProcessor_1.CodeBlockProcessor((path) => uri_1.URI.file(path), (markdown, codeBlockInfo, vulnerabilities) => reportedMarkdown.push({ markdown: markdown.value, codeBlock: codeBlockInfo, vulnerabilities }), (codeblock) => reportedCodeblocks.push(codeblock), lineProcessor);
    }
    (0, vitest_1.test)('append multi line text', () => {
        const reportedCodeblocks = [];
        const reportedMarkdown = [];
        const tracker = newCodeBlockProcessor(reportedCodeblocks, reportedMarkdown);
        const lines = [
            'hello\n',
            '```ts\n',
            'console.log("Hello, world!");\n',
            '```'
        ].join('');
        tracker.processMarkdown(lines, undefined);
        tracker.flush();
        chai_1.assert.deepEqual(reportedCodeblocks[0], {
            code: 'console.log("Hello, world!");\n',
            markdownBeforeBlock: 'hello\n',
            language: 'ts',
            resource: undefined
        });
        const resource = undefined;
        const language = 'ts';
        chai_1.assert.deepEqual(reportedMarkdown, [
            { markdown: 'hello\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '```ts\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: 'console.log("Hello, world!");\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '```', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
        ]);
    });
    (0, vitest_1.test)('append muliple lines', () => {
        const reportedCodeblocks = [];
        const reportedMarkdown = [];
        const tracker = newCodeBlockProcessor(reportedCodeblocks, reportedMarkdown);
        [
            'hello\n',
            '```ts\n',
            'console.log("Hello!");\n',
            'console.log("World!");\n',
            '```'
        ].forEach(line => tracker.processMarkdown(line, undefined));
        tracker.flush();
        const resource = undefined;
        const language = 'ts';
        chai_1.assert.deepEqual(reportedCodeblocks[0], {
            code: 'console.log("Hello!");\nconsole.log("World!");\n',
            markdownBeforeBlock: 'hello\n',
            language,
            resource
        });
        chai_1.assert.deepEqual(reportedMarkdown, [
            { markdown: 'hello\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '```ts\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: 'console.log("Hello!");\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: 'console.log("World!");\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '```', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
        ]);
    });
    (0, vitest_1.test)('append muliple partial lines', () => {
        const reportedCodeblocks = [];
        const reportedMarkdown = [];
        const tracker = newCodeBlockProcessor(reportedCodeblocks, reportedMarkdown);
        [
            'he', 'llo\n',
            '```', 'ts\n',
            'console', '.log("Hello!");\nconsole',
            '.log("World!");\n',
            '```'
        ].forEach(line => tracker.processMarkdown(line, undefined));
        tracker.flush();
        const resource = undefined;
        const language = 'ts';
        chai_1.assert.deepEqual(reportedCodeblocks[0], {
            code: 'console.log("Hello!");\nconsole.log("World!");\n',
            markdownBeforeBlock: 'hello\n',
            language,
            resource
        });
        chai_1.assert.deepEqual(reportedMarkdown, [
            { markdown: 'he', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: 'llo\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '```ts\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: 'console.log("Hello!");\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: 'console', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '.log("World!");\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '```', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
        ]);
    });
    (0, vitest_1.test)('append partial lines 1', () => {
        const reportedCodeblocks = [];
        const reportedMarkdown = [];
        const tracker = newCodeBlockProcessor(reportedCodeblocks, reportedMarkdown);
        [
            '12', '345\n',
            '`123`', '```456```\n',
            '`', '`', '123\n``\n',
            '`', '`', '`', 'ts\n',
            '# filepath: /project/foo\n',
            '`', '`', '123``',
            '456\n',
            '```'
        ].forEach(line => tracker.processMarkdown(line, undefined));
        tracker.flush();
        const resource = uri_1.URI.file('/project/foo');
        const language = 'ts';
        chai_1.assert.deepEqual(reportedCodeblocks[0], {
            code: '``123``456\n',
            markdownBeforeBlock: '12345\n`123````456```\n``123\n``\n',
            language,
            resource
        });
        chai_1.assert.deepEqual(reportedMarkdown, [
            { markdown: '12', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '345\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '`123`', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '```456```\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '``123\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '``\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '```ts\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '``123``456\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '```', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
        ]);
    });
    (0, vitest_1.test)('multiple code blocks', () => {
        const reportedCodeblocks = [];
        const reportedMarkdown = [];
        const tracker = newCodeBlockProcessor(reportedCodeblocks, reportedMarkdown);
        tracker.processMarkdown([
            'hello\n',
            '```ts\n',
            'console.log("Hello, world!");\n',
            '```\n',
            'more\n',
            'more\n',
            'more\n',
            '```ts\n',
            'console.log("more");\n',
            '```'
        ].join(''));
        tracker.flush();
        const language = 'ts';
        const resource = undefined;
        chai_1.assert.deepEqual(reportedCodeblocks[0], {
            code: 'console.log("Hello, world!");\n',
            markdownBeforeBlock: 'hello\n',
            language,
            resource
        });
        chai_1.assert.deepEqual(reportedCodeblocks[1], {
            code: 'console.log("more");\n',
            markdownBeforeBlock: 'more\nmore\nmore\n',
            language,
            resource
        });
        chai_1.assert.deepEqual(reportedMarkdown, [
            { markdown: 'hello\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '```ts\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: 'console.log("Hello, world!");\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '```\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: 'more\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: 'more\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: 'more\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '```ts\n', codeBlock: { index: 1, resource, language }, vulnerabilities: undefined },
            { markdown: 'console.log("more");\n', codeBlock: { index: 1, resource, language }, vulnerabilities: undefined },
            { markdown: '```', codeBlock: { index: 1, resource, language }, vulnerabilities: undefined },
        ]);
    });
    (0, vitest_1.test)('code blocks with tildes', () => {
        const reportedCodeblocks = [];
        const reportedMarkdown = [];
        const tracker = newCodeBlockProcessor(reportedCodeblocks, reportedMarkdown);
        tracker.processMarkdown([
            '~~~ts\n',
            '// using tilde\n',
            '~~~\n',
            '````ts\n',
            '// using 4 backticks\n',
            '````\n',
        ].join(''));
        tracker.flush();
        const resource = undefined;
        const language = 'ts';
        chai_1.assert.deepEqual(reportedCodeblocks[0], {
            code: '// using tilde\n',
            markdownBeforeBlock: '',
            language,
            resource
        });
        chai_1.assert.deepEqual(reportedCodeblocks[1], {
            code: '// using 4 backticks\n',
            markdownBeforeBlock: '',
            language,
            resource
        });
        chai_1.assert.deepEqual(reportedMarkdown, [
            { markdown: '~~~ts\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '// using tilde\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '~~~\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '````ts\n', codeBlock: { index: 1, resource, language }, vulnerabilities: undefined },
            { markdown: '// using 4 backticks\n', codeBlock: { index: 1, resource, language }, vulnerabilities: undefined },
            { markdown: '````\n', codeBlock: { index: 1, resource, language }, vulnerabilities: undefined },
        ]);
    });
    (0, vitest_1.test)('nested code blocks', () => {
        const reportedCodeblocks = [];
        const reportedMarkdown = [];
        const tracker = newCodeBlockProcessor(reportedCodeblocks, reportedMarkdown);
        tracker.processMarkdown([
            '````ts\n',
            '// using 4 backticks\n',
            '```ts\n',
            '// nested using 3 backticks\n',
            '```\n',
            '````\n',
        ].join(''));
        tracker.flush();
        const resource = undefined;
        const language = 'ts';
        chai_1.assert.deepEqual(reportedCodeblocks[0], {
            code: [
                '// using 4 backticks\n',
                '```ts\n',
                '// nested using 3 backticks\n',
                '```\n',
            ].join(''),
            markdownBeforeBlock: '',
            language,
            resource
        });
        chai_1.assert.deepEqual(reportedMarkdown, [
            { markdown: '````ts\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '// using 4 backticks\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '```ts\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '// nested using 3 backticks\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '```\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '````\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
        ]);
    });
    (0, vitest_1.test)('file marker', () => {
        const reportedCodeblocks = [];
        const reportedMarkdown = [];
        const tracker = newCodeBlockProcessor(reportedCodeblocks, reportedMarkdown);
        tracker.processMarkdown([
            'hello\n',
            '```ts\n',
            '// filepath: /project/foo0\n',
            'console.log("Hello, world!");\n',
            '```\n',
            'more\n',
            'more\n',
            'more\n',
            '```html\n',
            '<!-- filepath: /project/foo1 -->\n',
            '<html>more</html>\n',
            '```'
        ].join(''));
        tracker.flush();
        const resource0 = uri_1.URI.file('/project/foo0');
        const language0 = 'ts';
        const resource1 = uri_1.URI.file('/project/foo1');
        const language1 = 'html';
        chai_1.assert.deepEqual(reportedCodeblocks[0], {
            code: 'console.log("Hello, world!");\n',
            markdownBeforeBlock: 'hello\n',
            language: language0,
            resource: resource0
        });
        chai_1.assert.deepEqual(reportedCodeblocks[1], {
            code: '<html>more</html>\n',
            markdownBeforeBlock: 'more\nmore\nmore\n',
            language: language1,
            resource: resource1
        });
        chai_1.assert.deepEqual(reportedMarkdown, [
            { markdown: 'hello\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '```ts\n', codeBlock: { index: 0, resource: resource0, language: language0 }, vulnerabilities: undefined },
            { markdown: 'console.log("Hello, world!");\n', codeBlock: { index: 0, resource: resource0, language: language0 }, vulnerabilities: undefined },
            { markdown: '```\n', codeBlock: { index: 0, resource: resource0, language: language0 }, vulnerabilities: undefined },
            { markdown: 'more\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: 'more\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: 'more\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '```html\n', codeBlock: { index: 1, resource: resource1, language: language1 }, vulnerabilities: undefined },
            { markdown: '<html>more</html>\n', codeBlock: { index: 1, resource: resource1, language: language1 }, vulnerabilities: undefined },
            { markdown: '```', codeBlock: { index: 1, resource: resource1, language: language1 }, vulnerabilities: undefined },
        ]);
    });
    (0, vitest_1.test)('new line after file marker', () => {
        const reportedCodeblocks = [];
        const reportedMarkdown = [];
        const tracker = newCodeBlockProcessor(reportedCodeblocks, reportedMarkdown);
        tracker.processMarkdown([
            'hello\n',
            '```ts\n',
            '// filepath: /project/foo0\n',
            '\n',
            'console.log("Hello, world!");\n',
            '```\n',
            'more\n',
            'more\n',
            'more\n',
            '```html\n',
            '<!-- filepath: /project/foo1 -->\n',
            '\n',
            '\n',
            '<html>more</html>\n',
            '```'
        ].join(''));
        tracker.flush();
        const resource0 = uri_1.URI.file('/project/foo0');
        const language0 = 'ts';
        const resource1 = uri_1.URI.file('/project/foo1');
        const language1 = 'html';
        chai_1.assert.deepEqual(reportedCodeblocks[0], {
            code: 'console.log("Hello, world!");\n',
            markdownBeforeBlock: 'hello\n',
            language: language0,
            resource: resource0
        });
        chai_1.assert.deepEqual(reportedCodeblocks[1], {
            code: '\n<html>more</html>\n',
            markdownBeforeBlock: 'more\nmore\nmore\n',
            language: language1,
            resource: resource1
        });
        chai_1.assert.deepEqual(reportedMarkdown, [
            { markdown: 'hello\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '```ts\n', codeBlock: { index: 0, resource: resource0, language: language0 }, vulnerabilities: undefined },
            { markdown: 'console.log("Hello, world!");\n', codeBlock: { index: 0, resource: resource0, language: language0 }, vulnerabilities: undefined },
            { markdown: '```\n', codeBlock: { index: 0, resource: resource0, language: language0 }, vulnerabilities: undefined },
            { markdown: 'more\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: 'more\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: 'more\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '```html\n', codeBlock: { index: 1, resource: resource1, language: language1 }, vulnerabilities: undefined },
            { markdown: '\n', codeBlock: { index: 1, resource: resource1, language: language1 }, vulnerabilities: undefined },
            { markdown: '<html>more</html>\n', codeBlock: { index: 1, resource: resource1, language: language1 }, vulnerabilities: undefined },
            { markdown: '```', codeBlock: { index: 1, resource: resource1, language: language1 }, vulnerabilities: undefined },
        ]);
    });
    (0, vitest_1.test)('file marker reported', () => {
        const reportedCodeblocks = [];
        const reportedMarkdown = [];
        const resource = uri_1.URI.file('/project/foo');
        const tracker = newCodeBlockProcessor(reportedCodeblocks, reportedMarkdown);
        tracker.processMarkdown([
            'hello\n',
            '```ts\n',
        ].join(''));
        tracker.processCodeblockUri(resource);
        tracker.processMarkdown([
            'console.log("Hello, world!");\n',
            '```\n',
        ].join(''));
        tracker.flush();
        const language = 'ts';
        chai_1.assert.deepEqual(reportedCodeblocks[0], {
            code: 'console.log("Hello, world!");\n',
            markdownBeforeBlock: 'hello\n',
            language: language,
            resource: resource
        });
        chai_1.assert.deepEqual(reportedMarkdown, [
            { markdown: 'hello\n', codeBlock: undefined, vulnerabilities: undefined },
            { markdown: '```ts\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: 'console.log("Hello, world!");\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
            { markdown: '```\n', codeBlock: { index: 0, resource, language }, vulnerabilities: undefined },
        ]);
    });
    (0, vitest_1.test)('nested codeblocks with the same separator', () => {
        const reportedCodeblocks = [];
        const reportedMarkdown = [];
        const tracker = newCodeBlockProcessor(reportedCodeblocks, reportedMarkdown);
        const lines = [
            "```markdown\n",
            "# Example Markdown Document\n",
            "\n",
            "This is an example of a Markdown document that contains a code block.\n",
            "\n",
            "## Code Block\n",
            "\n",
            "Here is a code block in TypeScript:\n",
            "\n",
            "```typescript\n",
            "// Generated by Copilot\n",
            "class Example {\n",
            "    private _value: number;\n",
            "}\n",
            "```\n",
            "```\n"
        ];
        tracker.processMarkdown(lines.join(''));
        tracker.flush();
        const resource = undefined;
        const language = 'markdown';
        chai_1.assert.deepEqual(reportedCodeblocks[0], {
            code: lines.slice(1, lines.length - 1).join(''),
            markdownBeforeBlock: '',
            language: language,
            resource: resource
        });
        chai_1.assert.deepEqual(reportedMarkdown, lines.map(markdown => ({ markdown, codeBlock: { index: 0, resource, language }, vulnerabilities: undefined })));
    });
    (0, vitest_1.test)('line handler', () => {
        const reportedCodeblocks = [];
        const reportedMarkdown = [];
        const lineProcessor = {
            matchesLineStart(linePart, inCodeBlock) {
                return linePart.startsWith('###'.substring(0, linePart.length));
            },
            process(line, inCodeBlock) {
                return new vscodeTypes_1.MarkdownString(inCodeBlock ? line.value.toLowerCase() : line.value.toUpperCase());
            }
        };
        const tracker = newCodeBlockProcessor(reportedCodeblocks, reportedMarkdown, lineProcessor);
        const lines = [
            "# Big Header\n",
            "### Example Header\n",
            "\n",
            "This is an example of a Markdown document that contains a code block.\n",
            "\n",
            "#### Outside\n",
            "\n",
            "Here is a code block:\n",
            "\n",
            "```markdown\n", // line 9
            "# Unrelated\n",
            "## Unrelated\n",
            "### Inside\n",
            "```\n",
        ];
        // process character by character to simulate streaming
        lines.join('').split('').forEach(s => tracker.processMarkdown(s));
        tracker.flush();
        const resource = undefined;
        const language = 'markdown';
        const expectedLines = [...lines];
        expectedLines[1] = "### EXAMPLE HEADER\n";
        expectedLines[5] = "#### OUTSIDE\n";
        expectedLines[12] = "### inside\n";
        chai_1.assert.deepEqual(reportedCodeblocks[0], {
            code: expectedLines.slice(10, 13).join(''),
            markdownBeforeBlock: expectedLines.slice(0, 9).join(''),
            language: language,
            resource: resource
        });
        chai_1.assert.deepEqual(reportedMarkdown.map(m => m.markdown).join(''), expectedLines.join(''));
    });
});
//# sourceMappingURL=codeBlockProcessor.spec.js.map