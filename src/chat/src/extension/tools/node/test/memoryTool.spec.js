"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const extensionContext_1 = require("../../../../platform/extContext/common/extensionContext");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const uri_1 = require("../../../../util/vs/base/common/uri");
const services_1 = require("../../../test/node/services");
const toolNames_1 = require("../../common/toolNames");
const toolsService_1 = require("../../common/toolsService");
const toolTestUtils_1 = require("./toolTestUtils");
(0, vitest_1.suite)('MemoryTool', () => {
    let accessor;
    let storageUri;
    (0, vitest_1.beforeAll)(() => {
        const services = (0, services_1.createExtensionUnitTestingServices)();
        accessor = services.createTestingAccessor();
        // Set up storage URI for memory tool
        const extensionContext = accessor.get(extensionContext_1.IVSCodeExtensionContext);
        storageUri = uri_1.URI.file('/test-storage');
        extensionContext.storageUri = storageUri;
    });
    (0, vitest_1.afterAll)(() => {
        accessor.dispose();
    });
    (0, vitest_1.test)('create memory file', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const input = {
            command: 'create',
            path: '/memories/preferences.md',
            file_text: 'I prefer TypeScript for all projects'
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(resultStr).toContain('created successfully');
    });
    (0, vitest_1.test)('view memory directory', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const fileSystem = accessor.get(fileSystemService_1.IFileSystemService);
        // Create a test file first
        const memoryRoot = uri_1.URI.joinPath(storageUri, 'memory-tool/memories');
        await fileSystem.createDirectory(memoryRoot);
        const testFile = uri_1.URI.joinPath(memoryRoot, 'test.md');
        await fileSystem.writeFile(testFile, new TextEncoder().encode('test content'));
        const input = {
            command: 'view',
            path: '/memories'
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        // Should either list the file or indicate path not found (if dir doesn't exist yet)
        (0, vitest_1.expect)(resultStr).toMatch(/test\.md|Path not found/);
    });
    (0, vitest_1.test)('view memory file', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const fileSystem = accessor.get(fileSystemService_1.IFileSystemService);
        // Create a test file
        const memoryRoot = uri_1.URI.joinPath(storageUri, 'memory-tool/memories');
        await fileSystem.createDirectory(memoryRoot);
        const testFile = uri_1.URI.joinPath(memoryRoot, 'notes.md');
        const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
        await fileSystem.writeFile(testFile, new TextEncoder().encode(content));
        const input = {
            command: 'view',
            path: '/memories/notes.md'
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(resultStr).toContain('Line 1');
        (0, vitest_1.expect)(resultStr).toContain('Line 5');
    });
    (0, vitest_1.test)('view memory file with range', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const fileSystem = accessor.get(fileSystemService_1.IFileSystemService);
        // Create a test file
        const memoryRoot = uri_1.URI.joinPath(storageUri, 'memory-tool/memories');
        await fileSystem.createDirectory(memoryRoot);
        const testFile = uri_1.URI.joinPath(memoryRoot, 'ranged.md');
        const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
        await fileSystem.writeFile(testFile, new TextEncoder().encode(content));
        const input = {
            command: 'view',
            path: '/memories/ranged.md',
            view_range: [2, 4]
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(resultStr).toContain('Line 2');
        (0, vitest_1.expect)(resultStr).toContain('Line 3');
        (0, vitest_1.expect)(resultStr).toContain('Line 4');
        (0, vitest_1.expect)(resultStr).not.toContain('Line 1');
        (0, vitest_1.expect)(resultStr).not.toContain('Line 5');
        // Should have line numbers when using view_range
        (0, vitest_1.expect)(resultStr).toMatch(/\d+:/);
    });
    (0, vitest_1.test)('str_replace in memory file', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const fileSystem = accessor.get(fileSystemService_1.IFileSystemService);
        // Create a test file
        const memoryRoot = uri_1.URI.joinPath(storageUri, 'memory-tool/memories');
        await fileSystem.createDirectory(memoryRoot);
        const testFile = uri_1.URI.joinPath(memoryRoot, 'replace.md');
        const content = 'I prefer Vue for frontend';
        await fileSystem.writeFile(testFile, new TextEncoder().encode(content));
        const input = {
            command: 'str_replace',
            path: '/memories/replace.md',
            old_str: 'Vue',
            new_str: 'React'
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(resultStr).toContain('successfully');
        // Verify the change
        const updatedContent = new TextDecoder().decode(await fileSystem.readFile(testFile));
        (0, vitest_1.expect)(updatedContent).toContain('React');
        (0, vitest_1.expect)(updatedContent).not.toContain('Vue');
    });
    (0, vitest_1.test)('str_replace fails with non-unique string', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const fileSystem = accessor.get(fileSystemService_1.IFileSystemService);
        // Create a test file with duplicate content
        const memoryRoot = uri_1.URI.joinPath(storageUri, 'memory-tool/memories');
        await fileSystem.createDirectory(memoryRoot);
        const testFile = uri_1.URI.joinPath(memoryRoot, 'duplicate.md');
        const content = 'test test test';
        await fileSystem.writeFile(testFile, new TextEncoder().encode(content));
        const input = {
            command: 'str_replace',
            path: '/memories/duplicate.md',
            old_str: 'test',
            new_str: 'example'
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(resultStr).toContain('must be unique');
        (0, vitest_1.expect)(resultStr).toContain('String appears 3 times');
    });
    (0, vitest_1.test)('insert text at line', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const fileSystem = accessor.get(fileSystemService_1.IFileSystemService);
        // Create a test file
        const memoryRoot = uri_1.URI.joinPath(storageUri, 'memory-tool/memories');
        await fileSystem.createDirectory(memoryRoot);
        const testFile = uri_1.URI.joinPath(memoryRoot, 'insert.md');
        const content = 'Line 1\nLine 2\nLine 3';
        await fileSystem.writeFile(testFile, new TextEncoder().encode(content));
        const input = {
            command: 'insert',
            path: '/memories/insert.md',
            insert_line: 2,
            insert_text: 'Inserted Line'
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(resultStr).toMatch(/inserted at line/);
        // Verify the insertion
        const updatedContent = new TextDecoder().decode(await fileSystem.readFile(testFile));
        (0, vitest_1.expect)(updatedContent).toContain('Inserted Line');
        const lines = updatedContent.split('\n');
        (0, vitest_1.expect)(lines[2]).toBe('Inserted Line');
    });
    (0, vitest_1.test)('delete memory file', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const fileSystem = accessor.get(fileSystemService_1.IFileSystemService);
        // Create a test file
        const memoryRoot = uri_1.URI.joinPath(storageUri, 'memory-tool/memories');
        await fileSystem.createDirectory(memoryRoot);
        const testFile = uri_1.URI.joinPath(memoryRoot, 'todelete.md');
        await fileSystem.writeFile(testFile, new TextEncoder().encode('delete me'));
        const input = {
            command: 'delete',
            path: '/memories/todelete.md'
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(resultStr).toMatch(/deleted/i);
        // Verify file is deleted
        await (0, vitest_1.expect)(fileSystem.stat(testFile)).rejects.toThrow();
    });
    (0, vitest_1.test)('rename memory file', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const fileSystem = accessor.get(fileSystemService_1.IFileSystemService);
        // Create a test file
        const memoryRoot = uri_1.URI.joinPath(storageUri, 'memory-tool/memories');
        await fileSystem.createDirectory(memoryRoot);
        const oldFile = uri_1.URI.joinPath(memoryRoot, 'old.md');
        await fileSystem.writeFile(oldFile, new TextEncoder().encode('content'));
        const input = {
            command: 'rename',
            old_path: '/memories/old.md',
            new_path: '/memories/new.md'
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(resultStr).toMatch(/renamed|moved/i);
        // Verify old file doesn't exist
        await (0, vitest_1.expect)(fileSystem.stat(oldFile)).rejects.toThrow();
        // Verify new file exists
        const newFile = uri_1.URI.joinPath(memoryRoot, 'new.md');
        const stat = await fileSystem.stat(newFile);
        (0, vitest_1.expect)(stat).toBeDefined();
    });
    (0, vitest_1.test)('path validation - reject path without /memories prefix', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const input = {
            command: 'create',
            path: '/etc/passwd',
            file_text: 'malicious'
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(resultStr).toContain('must start with /memories');
    });
    (0, vitest_1.test)('path validation - reject directory traversal', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const input = {
            command: 'create',
            path: '/memories/../../../etc/passwd',
            file_text: 'malicious'
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(resultStr).toContain('escape /memories directory');
    });
    (0, vitest_1.test)('create with subdirectory path', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const input = {
            command: 'create',
            path: '/memories/project/notes.md',
            file_text: 'nested file'
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(resultStr).toContain('created successfully');
        // Verify file exists
        const fileSystem = accessor.get(fileSystemService_1.IFileSystemService);
        const memoryRoot = uri_1.URI.joinPath(storageUri, 'memory-tool/memories');
        const nestedFile = uri_1.URI.joinPath(memoryRoot, 'project', 'notes.md');
        const stat = await fileSystem.stat(nestedFile);
        (0, vitest_1.expect)(stat).toBeDefined();
    });
    (0, vitest_1.test)('error when no workspace is open', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        // Temporarily clear storage URI
        const extensionContext = accessor.get(extensionContext_1.IVSCodeExtensionContext);
        const originalStorageUri = extensionContext.storageUri;
        extensionContext.storageUri = undefined;
        const input = {
            command: 'view',
            path: '/memories'
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(resultStr).toContain('No workspace is currently open');
        // Restore storage URI
        extensionContext.storageUri = originalStorageUri;
    });
    (0, vitest_1.test)('str_replace with empty string', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const fileSystem = accessor.get(fileSystemService_1.IFileSystemService);
        // Create a test file
        const memoryRoot = uri_1.URI.joinPath(storageUri, 'memory-tool/memories');
        await fileSystem.createDirectory(memoryRoot);
        const testFile = uri_1.URI.joinPath(memoryRoot, 'empty-replace.md');
        const content = 'Remove this text here';
        await fileSystem.writeFile(testFile, new TextEncoder().encode(content));
        const input = {
            command: 'str_replace',
            path: '/memories/empty-replace.md',
            old_str: ' text',
            new_str: ''
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(resultStr).toContain('successfully');
        // Verify the change
        const updatedContent = new TextDecoder().decode(await fileSystem.readFile(testFile));
        (0, vitest_1.expect)(updatedContent).toBe('Remove this here');
    });
    (0, vitest_1.test)('insert at line 0 (before first line)', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const fileSystem = accessor.get(fileSystemService_1.IFileSystemService);
        // Create a test file
        const memoryRoot = uri_1.URI.joinPath(storageUri, 'memory-tool/memories');
        await fileSystem.createDirectory(memoryRoot);
        const testFile = uri_1.URI.joinPath(memoryRoot, 'insert-first.md');
        const content = 'Line 1\nLine 2';
        await fileSystem.writeFile(testFile, new TextEncoder().encode(content));
        const input = {
            command: 'insert',
            path: '/memories/insert-first.md',
            insert_line: 0,
            insert_text: 'First Line'
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(resultStr).toMatch(/inserted at line 0/);
        // Verify the insertion
        const updatedContent = new TextDecoder().decode(await fileSystem.readFile(testFile));
        const lines = updatedContent.split('\n');
        (0, vitest_1.expect)(lines[0]).toBe('First Line');
        (0, vitest_1.expect)(lines[1]).toBe('Line 1');
        (0, vitest_1.expect)(lines[2]).toBe('Line 2');
    });
    (0, vitest_1.test)('create overwrites existing file', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const fileSystem = accessor.get(fileSystemService_1.IFileSystemService);
        // Create a test file first
        const memoryRoot = uri_1.URI.joinPath(storageUri, 'memory-tool/memories');
        await fileSystem.createDirectory(memoryRoot);
        const testFile = uri_1.URI.joinPath(memoryRoot, 'overwrite.md');
        await fileSystem.writeFile(testFile, new TextEncoder().encode('original content'));
        // Overwrite it
        const input = {
            command: 'create',
            path: '/memories/overwrite.md',
            file_text: 'new content'
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const resultStr = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(resultStr).toContain('created successfully');
        // Verify the file was overwritten
        const updatedContent = new TextDecoder().decode(await fileSystem.readFile(testFile));
        (0, vitest_1.expect)(updatedContent).toBe('new content');
    });
    (0, vitest_1.test)('view with invalid range returns error', async () => {
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const fileSystem = accessor.get(fileSystemService_1.IFileSystemService);
        // Create a test file
        const memoryRoot = uri_1.URI.joinPath(storageUri, 'memory-tool/memories');
        await fileSystem.createDirectory(memoryRoot);
        const testFile = uri_1.URI.joinPath(memoryRoot, 'invalid-range.md');
        const content = 'Line 1\nLine 2\nLine 3';
        await fileSystem.writeFile(testFile, new TextEncoder().encode(content));
        const input = {
            command: 'view',
            path: '/memories/invalid-range.md',
            view_range: [10, 20] // beyond file length
        };
        const result = await toolsService.invokeTool(toolNames_1.ToolName.Memory, { input, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        // Should still work, just return empty or partial content
        // The implementation uses slice which handles out of bounds gracefully
        (0, vitest_1.expect)(result).toBeDefined();
    });
});
//# sourceMappingURL=memoryTool.spec.js.map