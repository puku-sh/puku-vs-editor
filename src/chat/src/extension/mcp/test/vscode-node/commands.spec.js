"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const logService_1 = require("../../../../platform/log/common/logService");
const services_1 = require("../../../test/node/services");
const commands_1 = require("../../vscode-node/commands");
const util_1 = require("./util");
(0, vitest_1.describe)('get MCP server info', { timeout: 30_000 }, () => {
    let testingServiceCollection;
    let accessor;
    let logService;
    let emptyFetcherService;
    (0, vitest_1.beforeEach)(() => {
        testingServiceCollection = (0, services_1.createExtensionUnitTestingServices)();
        accessor = testingServiceCollection.createTestingAccessor();
        logService = accessor.get(logService_1.ILogService);
        emptyFetcherService = new util_1.FixtureFetcherService();
    });
    (0, vitest_1.it)('npm returns package metadata', async () => {
        const fetcherService = new util_1.FixtureFetcherService(new Map([
            ['https://registry.npmjs.org/%40modelcontextprotocol%2Fserver-everything', {
                    fileName: 'npm-modelcontextprotocol-server-everything.json',
                    status: 200
                }]
        ]));
        const result = await commands_1.McpSetupCommands.validatePackageRegistry({ type: 'npm', name: '@modelcontextprotocol/server-everything' }, logService, fetcherService);
        (0, vitest_1.expect)(result.state).toBe('ok');
        if (result.state === 'ok') {
            (0, vitest_1.expect)(result.name).toBe('@modelcontextprotocol/server-everything');
            (0, vitest_1.expect)(result.version).toBeDefined();
            (0, vitest_1.expect)(result.publisher).toContain('jspahrsummers');
        }
        else {
            vitest_1.expect.fail();
        }
    });
    (0, vitest_1.it)('npm handles missing package', async () => {
        const result = await commands_1.McpSetupCommands.validatePackageRegistry({ type: 'npm', name: '@modelcontextprotocol/does-not-exist' }, logService, emptyFetcherService);
        (0, vitest_1.expect)(emptyFetcherService.urls[0]).toBe('https://registry.npmjs.org/%40modelcontextprotocol%2Fdoes-not-exist');
        (0, vitest_1.expect)(result.state).toBe('error');
        if (result.state === 'error') {
            (0, vitest_1.expect)(result.error).toBeDefined();
            (0, vitest_1.expect)(result.errorType).toBe('NotFound');
        }
        else {
            vitest_1.expect.fail();
        }
    });
    (0, vitest_1.it)('pip returns package metadata', async () => {
        const fetcherService = new util_1.FixtureFetcherService(new Map([
            ['https://pypi.org/pypi/mcp-server-fetch/json', {
                    fileName: 'pip-mcp-server-fetch.json',
                    status: 200
                }]
        ]));
        const result = await commands_1.McpSetupCommands.validatePackageRegistry({ type: 'pip', name: 'mcp-server-fetch' }, logService, fetcherService);
        (0, vitest_1.expect)(result.state).toBe('ok');
        if (result.state === 'ok') {
            (0, vitest_1.expect)(result.name).toBe('mcp-server-fetch');
            (0, vitest_1.expect)(result.version).toBeDefined();
            (0, vitest_1.expect)(result.publisher).toContain('Anthropic');
        }
        else {
            vitest_1.expect.fail();
        }
    });
    (0, vitest_1.it)('pip handles missing package', async () => {
        const result = await commands_1.McpSetupCommands.validatePackageRegistry({ type: 'pip', name: 'mcp-server-that-does-not-exist' }, logService, emptyFetcherService);
        (0, vitest_1.expect)(emptyFetcherService.urls[0]).toBe('https://pypi.org/pypi/mcp-server-that-does-not-exist/json');
        (0, vitest_1.expect)(result.state).toBe('error');
        if (result.state === 'error') {
            (0, vitest_1.expect)(result.error).toBeDefined();
            (0, vitest_1.expect)(result.errorType).toBe('NotFound');
        }
        else {
            vitest_1.expect.fail();
        }
    });
    (0, vitest_1.it)('docker returns package metadata', async () => {
        const fetcherService = new util_1.FixtureFetcherService(new Map([
            ['https://hub.docker.com/v2/repositories/mcp/node-code-sandbox', {
                    fileName: 'docker-mcp-node-code-sandbox.json',
                    status: 200
                }]
        ]));
        const result = await commands_1.McpSetupCommands.validatePackageRegistry({ type: 'docker', name: 'mcp/node-code-sandbox' }, logService, fetcherService);
        (0, vitest_1.expect)(result.state).toBe('ok');
        if (result.state === 'ok') {
            (0, vitest_1.expect)(result.name).toBe('mcp/node-code-sandbox');
            (0, vitest_1.expect)(result.version).toBeUndefined(); // currently not populated
            (0, vitest_1.expect)(result.publisher).toBe("mcp");
        }
        else {
            vitest_1.expect.fail();
        }
    });
    (0, vitest_1.it)('docker handles missing package', async () => {
        const result = await commands_1.McpSetupCommands.validatePackageRegistry({ type: 'docker', name: 'mcp/server-that-does-not-exist' }, logService, emptyFetcherService);
        (0, vitest_1.expect)(emptyFetcherService.urls[0]).toBe('https://hub.docker.com/v2/repositories/mcp/server-that-does-not-exist');
        (0, vitest_1.expect)(result.state).toBe('error');
        if (result.state === 'error') {
            (0, vitest_1.expect)(result.error).toBeDefined();
            (0, vitest_1.expect)(result.errorType).toBe('NotFound');
        }
        else {
            vitest_1.expect.fail();
        }
    });
});
//# sourceMappingURL=commands.spec.js.map