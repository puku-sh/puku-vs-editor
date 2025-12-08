"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const assert_1 = require("../../../../../util/vs/base/common/assert");
const lifecycle_1 = require("../../../../../util/vs/base/common/lifecycle");
const services_1 = require("../../../../test/node/services");
const toolNames_1 = require("../../../../tools/common/toolNames");
const permissionHelpers_1 = require("../permissionHelpers");
(0, vitest_1.describe)('CopilotCLI permissionHelpers', () => {
    const disposables = new lifecycle_1.DisposableStore();
    let instaService;
    (0, vitest_1.beforeEach)(() => {
        const services = disposables.add((0, services_1.createExtensionUnitTestingServices)());
        instaService = services.seal();
    });
    (0, vitest_1.afterEach)(() => {
        disposables.clear();
    });
    (0, vitest_1.describe)('getConfirmationToolParams', () => {
        (0, vitest_1.it)('shell: uses intention over command text and sets terminal confirmation tool', async () => {
            const req = { kind: 'shell', intention: 'List workspace files', fullCommandText: 'ls -la' };
            const result = await (0, permissionHelpers_1.getConfirmationToolParams)(instaService, req);
            (0, assert_1.assert)(!!result);
            if (result.tool !== toolNames_1.ToolName.CoreTerminalConfirmationTool) {
                vitest_1.expect.fail('Expected CoreTerminalConfirmationTool');
            }
            (0, vitest_1.expect)(result.tool).toBe(toolNames_1.ToolName.CoreTerminalConfirmationTool);
            (0, vitest_1.expect)(result.input.message).toBe('List workspace files');
            (0, vitest_1.expect)(result.input.command).toBe('ls -la');
            (0, vitest_1.expect)(result.input.isBackground).toBe(false);
        });
        (0, vitest_1.it)('shell: falls back to fullCommandText when no intention', async () => {
            const req = { kind: 'shell', fullCommandText: 'echo "hi"' };
            const result = await (0, permissionHelpers_1.getConfirmationToolParams)(instaService, req);
            (0, assert_1.assert)(!!result);
            if (result.tool !== toolNames_1.ToolName.CoreTerminalConfirmationTool) {
                vitest_1.expect.fail('Expected CoreTerminalConfirmationTool');
            }
            (0, vitest_1.expect)(result.tool).toBe(toolNames_1.ToolName.CoreTerminalConfirmationTool);
            (0, vitest_1.expect)(result.input.message).toBe('echo "hi"');
            (0, vitest_1.expect)(result.input.command).toBe('echo "hi"');
        });
        (0, vitest_1.it)('shell: falls back to codeBlock when neither intention nor command text provided', async () => {
            const req = { kind: 'shell' };
            const result = await (0, permissionHelpers_1.getConfirmationToolParams)(instaService, req);
            (0, assert_1.assert)(!!result);
            if (result.tool !== toolNames_1.ToolName.CoreTerminalConfirmationTool) {
                vitest_1.expect.fail('Expected CoreTerminalConfirmationTool');
            }
            (0, vitest_1.expect)(result.tool).toBe(toolNames_1.ToolName.CoreTerminalConfirmationTool);
            // codeBlock starts with two newlines then ```
            (0, vitest_1.expect)(result.input.message).toMatch(/^\n\n```/);
        });
        (0, vitest_1.it)('write: uses intention as title and fileName for message', async () => {
            const req = { kind: 'write', intention: 'Modify configuration', fileName: 'config.json' };
            const result = await (0, permissionHelpers_1.getConfirmationToolParams)(instaService, req);
            (0, assert_1.assert)(!!result);
            if (result.tool !== toolNames_1.ToolName.CoreConfirmationTool) {
                vitest_1.expect.fail('Expected CoreConfirmationTool');
            }
            (0, vitest_1.expect)(result.tool).toBe(toolNames_1.ToolName.CoreConfirmationTool);
            (0, vitest_1.expect)(result.input.title).toBe('Allow edits to sensitive files?');
            (0, vitest_1.expect)(result.input.message).toContain(`The model wants to edit`);
            (0, vitest_1.expect)(result.input.confirmationType).toBe('basic');
        });
        (0, vitest_1.it)('write: falls back to default title and codeBlock message when no intention and no fileName', async () => {
            const req = { kind: 'write' };
            const result = await (0, permissionHelpers_1.getConfirmationToolParams)(instaService, req);
            (0, vitest_1.expect)(result).toBeUndefined();
        });
        (0, vitest_1.it)('mcp: formats with serverName, toolTitle and args JSON', async () => {
            const req = { kind: 'mcp', serverName: 'files', toolTitle: 'List Files', toolName: 'list', args: { path: '/tmp' } };
            const result = await (0, permissionHelpers_1.getConfirmationToolParams)(instaService, req);
            (0, assert_1.assert)(!!result);
            (0, vitest_1.expect)(result.tool).toBe(toolNames_1.ToolName.CoreConfirmationTool);
            if (result.tool !== toolNames_1.ToolName.CoreConfirmationTool) {
                vitest_1.expect.fail('Expected CoreConfirmationTool');
            }
            (0, vitest_1.expect)(result.input.title).toBe('List Files');
            (0, vitest_1.expect)(result.input.message).toContain('Server: files');
            (0, vitest_1.expect)(result.input.message).toContain('"path": "/tmp"');
        });
        (0, vitest_1.it)('mcp: falls back to generated title and full JSON when no serverName', async () => {
            const req = { kind: 'mcp', toolName: 'info', args: { detail: true } };
            const result = await (0, permissionHelpers_1.getConfirmationToolParams)(instaService, req);
            (0, assert_1.assert)(!!result);
            if (result.tool !== toolNames_1.ToolName.CoreConfirmationTool) {
                vitest_1.expect.fail('Expected CoreConfirmationTool');
            }
            (0, vitest_1.expect)(result.input.title).toBe('MCP Tool: info');
            (0, vitest_1.expect)(result.input.message).toMatch(/```json/);
            (0, vitest_1.expect)(result.input.message).toContain('"detail": true');
        });
        (0, vitest_1.it)('mcp: uses Unknown when neither toolTitle nor toolName provided', async () => {
            const req = { kind: 'mcp', args: {} };
            const result = await (0, permissionHelpers_1.getConfirmationToolParams)(instaService, req);
            (0, assert_1.assert)(!!result);
            if (result.tool !== toolNames_1.ToolName.CoreConfirmationTool) {
                vitest_1.expect.fail('Expected CoreConfirmationTool');
            }
            (0, vitest_1.expect)(result.input.title).toBe('MCP Tool: Unknown');
        });
        (0, vitest_1.it)('read: returns specialized title and intention message', async () => {
            const req = { kind: 'read', intention: 'Read 2 files', path: '/tmp/a' };
            const result = await (0, permissionHelpers_1.getConfirmationToolParams)(instaService, req);
            (0, assert_1.assert)(!!result);
            (0, vitest_1.expect)(result.tool).toBe(toolNames_1.ToolName.CoreConfirmationTool);
            if (result.tool !== toolNames_1.ToolName.CoreConfirmationTool) {
                vitest_1.expect.fail('Expected CoreConfirmationTool');
            }
            (0, vitest_1.expect)(result.input.title).toBe('Read file(s)');
            (0, vitest_1.expect)(result.input.message).toBe('Read 2 files');
        });
        (0, vitest_1.it)('read: falls through to default when intention empty string', async () => {
            const req = { kind: 'read', intention: '', path: '/tmp/a' };
            const result = await (0, permissionHelpers_1.getConfirmationToolParams)(instaService, req);
            (0, assert_1.assert)(!!result);
            if (result.tool !== toolNames_1.ToolName.CoreConfirmationTool) {
                vitest_1.expect.fail('Expected CoreConfirmationTool');
            }
            (0, vitest_1.expect)(result.input.title).toBe('Copilot CLI Permission Request');
            (0, vitest_1.expect)(result.input.message).toMatch(/"kind": "read"/);
        });
        (0, vitest_1.it)('default: unknown kind uses generic confirmation and wraps JSON in code block', async () => {
            const req = { kind: 'some_new_kind', extra: 1 };
            const result = await (0, permissionHelpers_1.getConfirmationToolParams)(instaService, req);
            (0, assert_1.assert)(!!result);
            if (result.tool !== toolNames_1.ToolName.CoreConfirmationTool) {
                vitest_1.expect.fail('Expected CoreConfirmationTool');
            }
            (0, vitest_1.expect)(result.tool).toBe(toolNames_1.ToolName.CoreConfirmationTool);
            (0, vitest_1.expect)(result.input.title).toBe('Copilot CLI Permission Request');
            (0, vitest_1.expect)(result.input.message).toMatch(/^\n\n```/);
            (0, vitest_1.expect)(result.input.message).toContain('"some_new_kind"');
        });
    });
    (0, vitest_1.describe)('getConfirmationToolParams', () => {
        (0, vitest_1.it)('maps shell requests to terminal confirmation tool', async () => {
            const result = await (0, permissionHelpers_1.getConfirmationToolParams)(instaService, { kind: 'shell', fullCommandText: 'rm -rf /tmp/test', canOfferSessionApproval: true, commands: [], hasWriteFileRedirection: true, intention: '', possiblePaths: [] });
            (0, assert_1.assert)(!!result);
            (0, vitest_1.expect)(result.tool).toBe(toolNames_1.ToolName.CoreTerminalConfirmationTool);
        });
        (0, vitest_1.it)('maps write requests with filename', async () => {
            const result = await (0, permissionHelpers_1.getConfirmationToolParams)(instaService, { kind: 'write', fileName: 'foo.ts', diff: '', intention: '' });
            (0, assert_1.assert)(!!result);
            (0, vitest_1.expect)(result.tool).toBe(toolNames_1.ToolName.CoreConfirmationTool);
            const input = result.input;
            (0, vitest_1.expect)(input.message).toContain('The model wants to edit');
        });
        (0, vitest_1.it)('maps mcp requests', async () => {
            const result = await (0, permissionHelpers_1.getConfirmationToolParams)(instaService, { kind: 'mcp', serverName: 'srv', toolTitle: 'Tool', toolName: 'run', args: { a: 1 }, readOnly: false });
            (0, assert_1.assert)(!!result);
            (0, vitest_1.expect)(result.tool).toBe(toolNames_1.ToolName.CoreConfirmationTool);
        });
    });
});
//# sourceMappingURL=permissionHelpers.spec.js.map