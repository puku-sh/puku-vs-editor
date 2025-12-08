"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const testWorkspaceService_1 = require("../../../../platform/test/node/testWorkspaceService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const textDocument_1 = require("../../../../util/common/test/shims/textDocument");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const uri_1 = require("../../../../util/vs/base/common/uri");
const descriptors_1 = require("../../../../util/vs/platform/instantiation/common/descriptors");
const services_1 = require("../../../test/node/services");
const toolNames_1 = require("../../common/toolNames");
const toolsService_1 = require("../../common/toolsService");
const toolTestUtils_1 = require("./toolTestUtils");
(0, vitest_1.suite)('ReadFile', () => {
    let accessor;
    (0, vitest_1.beforeAll)(() => {
        const testDoc = (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('/workspace/file.ts'), 'line 1\nline 2\n\nline 4\nline 5', 'ts').document;
        const emptyDoc = (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('/workspace/empty.ts'), '', 'ts').document;
        const whitespaceDoc = (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('/workspace/whitespace.ts'), ' \t\n', 'ts').document;
        // Create a large document for testing truncation (3000 lines to exceed MAX_LINES_PER_READ)
        const largeContent = Array.from({ length: 3000 }, (_, i) => `line ${i + 1}`).join('\n');
        const largeDoc = (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('/workspace/large.ts'), largeContent, 'ts').document;
        const services = (0, services_1.createExtensionUnitTestingServices)();
        services.define(workspaceService_1.IWorkspaceService, new descriptors_1.SyncDescriptor(testWorkspaceService_1.TestWorkspaceService, [
            [uri_1.URI.file('/workspace')],
            [testDoc, emptyDoc, whitespaceDoc, largeDoc],
        ]));
        accessor = services.createTestingAccessor();
    });
    (0, vitest_1.afterAll)(() => {
        accessor.dispose();
    });
    (0, vitest_1.test)('read simple file', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const input = {
            filePath: '/workspace/file.ts',
            startLine: 2,
            endLine: 6
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.ReadFile, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(await (0, toolTestUtils_1.toolResultToString)(accessor, result)).toMatchInlineSnapshot(`
			"\`\`\`ts
			line 2

			line 4
			line 5
			\`\`\`"
		`);
    });
    (0, vitest_1.test)('read empty file', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const input = {
            filePath: '/workspace/empty.ts',
            startLine: 2,
            endLine: 6
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.ReadFile, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(await (0, toolTestUtils_1.toolResultToString)(accessor, result)).toMatchInlineSnapshot(`"(The file \`/workspace/empty.ts\` exists, but is empty)"`);
    });
    (0, vitest_1.test)('read whitespace file', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const input = {
            filePath: '/workspace/whitespace.ts',
            startLine: 2,
            endLine: 6
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.ReadFile, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(await (0, toolTestUtils_1.toolResultToString)(accessor, result)).toMatchInlineSnapshot(`"(The file \`/workspace/whitespace.ts\` exists, but contains only whitespace)"`);
    });
    (0, vitest_1.suite)('IReadFileParamsV2', () => {
        (0, vitest_1.test)('read simple file with offset and limit', async () => {
            const toolsService = accessor.get(toolsService_1.IToolsService);
            const input = {
                filePath: '/workspace/file.ts',
                offset: 2,
                limit: 4
            };
            const result = await toolsService.invokeTool(toolNames_1.ToolName.ReadFile, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(await (0, toolTestUtils_1.toolResultToString)(accessor, result)).toMatchInlineSnapshot(`
				"\`\`\`ts
				line 2

				line 4
				line 5
				\`\`\`"
			`);
        });
        (0, vitest_1.test)('read simple file with only offset', async () => {
            const toolsService = accessor.get(toolsService_1.IToolsService);
            const input = {
                filePath: '/workspace/file.ts',
                offset: 3
            };
            const result = await toolsService.invokeTool(toolNames_1.ToolName.ReadFile, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(await (0, toolTestUtils_1.toolResultToString)(accessor, result)).toMatchInlineSnapshot(`
				"\`\`\`ts

				line 4
				line 5
				\`\`\`"
			`);
        });
        (0, vitest_1.test)('read simple file without offset or limit', async () => {
            const toolsService = accessor.get(toolsService_1.IToolsService);
            const input = {
                filePath: '/workspace/file.ts'
            };
            const result = await toolsService.invokeTool(toolNames_1.ToolName.ReadFile, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(await (0, toolTestUtils_1.toolResultToString)(accessor, result)).toMatchInlineSnapshot(`
				"\`\`\`ts
				line 1
				line 2

				line 4
				line 5
				\`\`\`"
			`);
        });
        (0, vitest_1.test)('read empty file', async () => {
            const toolsService = accessor.get(toolsService_1.IToolsService);
            const input = {
                filePath: '/workspace/empty.ts',
                offset: 1,
                limit: 4
            };
            const result = await toolsService.invokeTool(toolNames_1.ToolName.ReadFile, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(await (0, toolTestUtils_1.toolResultToString)(accessor, result)).toMatchInlineSnapshot(`"(The file \`/workspace/empty.ts\` exists, but is empty)"`);
        });
        (0, vitest_1.test)('read whitespace file', async () => {
            const toolsService = accessor.get(toolsService_1.IToolsService);
            const input = {
                filePath: '/workspace/whitespace.ts',
                offset: 1,
                limit: 2
            };
            const result = await toolsService.invokeTool(toolNames_1.ToolName.ReadFile, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(await (0, toolTestUtils_1.toolResultToString)(accessor, result)).toMatchInlineSnapshot(`"(The file \`/workspace/whitespace.ts\` exists, but contains only whitespace)"`);
        });
        (0, vitest_1.test)('read file with limit larger than MAX_LINES_PER_READ should truncate', async () => {
            const toolsService = accessor.get(toolsService_1.IToolsService);
            const input = {
                filePath: '/workspace/large.ts',
                offset: 1,
                limit: 3000 // This exceeds MAX_LINES_PER_READ (2000)
            };
            const result = await toolsService.invokeTool(toolNames_1.ToolName.ReadFile, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
            // Should be truncated to MAX_LINES_PER_READ (2000) and show truncation message
            const resultString = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
            (0, vitest_1.expect)(resultString).toContain('line 1');
            (0, vitest_1.expect)(resultString).toContain('line 2000');
            (0, vitest_1.expect)(resultString).toContain('[File content truncated at line 2000. Use read_file with offset/limit parameters to view more.]');
            (0, vitest_1.expect)(resultString).not.toContain('line 2001');
        });
        (0, vitest_1.test)('read file with offset beyond file line count should throw error', async () => {
            const toolsService = accessor.get(toolsService_1.IToolsService);
            const input = {
                filePath: '/workspace/file.ts',
                offset: 535 // file only has 5 lines
            };
            await (0, vitest_1.expect)(toolsService.invokeTool(toolNames_1.ToolName.ReadFile, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None))
                .rejects.toThrow('Invalid offset 535: file only has 5 lines. Line numbers are 1-indexed.');
        });
        (0, vitest_1.test)('read file with offset beyond single-line file should throw error', async () => {
            const toolsService = accessor.get(toolsService_1.IToolsService);
            const input = {
                filePath: '/workspace/whitespace.ts', // 2 line file (has a newline)
                offset: 10
            };
            await (0, vitest_1.expect)(toolsService.invokeTool(toolNames_1.ToolName.ReadFile, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None))
                .rejects.toThrow('Invalid offset 10: file only has 2 lines. Line numbers are 1-indexed.');
        });
        (0, vitest_1.test)('read file with offset exactly at line count should succeed', async () => {
            const toolsService = accessor.get(toolsService_1.IToolsService);
            const input = {
                filePath: '/workspace/file.ts',
                offset: 5, // file has exactly 5 lines
                limit: 1
            };
            const result = await toolsService.invokeTool(toolNames_1.ToolName.ReadFile, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
            const resultString = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
            (0, vitest_1.expect)(resultString).toContain('line 5');
        });
        (0, vitest_1.test)('read empty file with offset beyond bounds should throw error', async () => {
            const toolsService = accessor.get(toolsService_1.IToolsService);
            const input = {
                filePath: '/workspace/empty.ts',
                offset: 2
            };
            await (0, vitest_1.expect)(toolsService.invokeTool(toolNames_1.ToolName.ReadFile, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None))
                .rejects.toThrow('Invalid offset 2: file only has 1 line. Line numbers are 1-indexed.');
        });
        (0, vitest_1.test)('read file with offset 0 should clamp to line 1', async () => {
            const toolsService = accessor.get(toolsService_1.IToolsService);
            const input = {
                filePath: '/workspace/file.ts',
                offset: 0,
                limit: 2
            };
            const result = await toolsService.invokeTool(toolNames_1.ToolName.ReadFile, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
            const resultString = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
            // Should start from line 1 (offset clamped to 1)
            (0, vitest_1.expect)(resultString).toContain('line 1');
            (0, vitest_1.expect)(resultString).toContain('line 2');
        });
    });
});
//# sourceMappingURL=readFile.spec.js.map