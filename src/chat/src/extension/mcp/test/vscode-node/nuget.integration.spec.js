"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const vitest_1 = require("vitest");
const logService_1 = require("../../../../platform/log/common/logService");
const services_1 = require("../../../test/node/services");
const nuget_1 = require("../../vscode-node/nuget");
const util_1 = require("../../vscode-node/util");
const util_2 = require("./util");
const RUN_DOTNET_CLI_TESTS = !!process.env['CI'] && !process.env['BUILD_ARTIFACTSTAGINGDIRECTORY'];
vitest_1.describe.runIf(RUN_DOTNET_CLI_TESTS)('get nuget MCP server info using dotnet CLI', { timeout: 30_000 }, () => {
    let testingServiceCollection;
    let accessor;
    let logService;
    let fetcherService;
    let commandExecutor;
    let nuget;
    (0, vitest_1.beforeEach)(() => {
        testingServiceCollection = (0, services_1.createExtensionUnitTestingServices)();
        accessor = testingServiceCollection.createTestingAccessor();
        logService = accessor.get(logService_1.ILogService);
        fetcherService = new util_2.FixtureFetcherService();
        commandExecutor = new util_1.CommandExecutor();
        nuget = new nuget_1.NuGetMcpSetup(logService, fetcherService, commandExecutor, { command: 'dotnet', args: [] }, // allow dotnet command to be overridden for testing
        path_1.default.join(__dirname, 'fixtures', 'nuget') // file based package source for testing
        );
    });
    (0, vitest_1.it)('returns mapped server.json for original schema', async () => {
        const result = await nuget.getNuGetPackageMetadata('Knapcode.SampleMcpServer');
        (0, vitest_1.expect)(result.state).toBe('ok');
        if (result.state === 'ok') {
            (0, vitest_1.expect)(result.getMcpServer).toBeDefined();
            if (result.getMcpServer) {
                const mcpServer = await result.getMcpServer(Promise.resolve());
                (0, vitest_1.expect)(mcpServer).toBeDefined();
                const config = mcpServer.config;
                (0, vitest_1.expect)(config.command).toBe('dnx');
                (0, vitest_1.expect)(config.env).toEqual({ 'WEATHER_CHOICES': '${input:weather_choices}' });
                (0, vitest_1.expect)(config.args).toEqual(['Knapcode.SampleMcpServer@0.6.0-beta', '--yes', '--', 'mcp', 'start']);
            }
            else {
                vitest_1.expect.fail();
            }
        }
        else {
            vitest_1.expect.fail();
        }
    });
    (0, vitest_1.it)('returns mapped server.json for 2025-09-29 schema', async () => {
        const result = await nuget.getNuGetPackageMetadata('BaseTestPackage.McpServer');
        (0, vitest_1.expect)(result.state).toBe('ok');
        if (result.state === 'ok') {
            (0, vitest_1.expect)(result.getMcpServer).toBeDefined();
            if (result.getMcpServer) {
                const mcpServer = await result.getMcpServer(Promise.resolve());
                (0, vitest_1.expect)(mcpServer).toBeDefined();
                const config = mcpServer.config;
                (0, vitest_1.expect)(config.command).toBe('dnx');
                (0, vitest_1.expect)(config.env).toEqual({ 'WEATHER_CHOICES': '${input:weather_choices}' });
                (0, vitest_1.expect)(config.args).toEqual(['BaseTestPackage.McpServer@0.1.0-beta', '--yes', '--', 'mcp', 'start']);
            }
            else {
                vitest_1.expect.fail();
            }
        }
        else {
            vitest_1.expect.fail();
        }
    });
    (0, vitest_1.it)('returns package metadata', async () => {
        const result = await nuget.getNuGetPackageMetadata('basetestpackage.dotnettool');
        (0, vitest_1.expect)(result.state).toBe('ok');
        if (result.state === 'ok') {
            (0, vitest_1.expect)(result.name).toBe('BaseTestPackage.DotnetTool');
            (0, vitest_1.expect)(result.version).toBe('1.0.0');
        }
        else {
            vitest_1.expect.fail();
        }
    });
    (0, vitest_1.it)('handles missing package', async () => {
        const result = await nuget.getNuGetPackageMetadata('BaseTestPackage.DoesNotExist');
        (0, vitest_1.expect)(result.state).toBe('error');
        if (result.state === 'error') {
            (0, vitest_1.expect)(result.error).toBeDefined();
            (0, vitest_1.expect)(result.errorType).toBe('NotFound');
        }
        else {
            vitest_1.expect.fail();
        }
    });
    (0, vitest_1.it)('handles missing dotnet', async () => {
        nuget.dotnet.command = 'dotnet-missing';
        const result = await nuget.getNuGetPackageMetadata('Knapcode.SampleMcpServer');
        (0, vitest_1.expect)(result.state).toBe('error');
        if (result.state === 'error') {
            (0, vitest_1.expect)(result.errorType).toBe('MissingCommand');
            (0, vitest_1.expect)(result.helpUriLabel).toBe('Install .NET SDK');
            (0, vitest_1.expect)(result.helpUri).toBe('https://aka.ms/vscode-mcp-install/dotnet');
        }
        else {
            vitest_1.expect.fail();
        }
    });
    (0, vitest_1.it)('handles old dotnet version', async () => {
        nuget.dotnet.command = 'node';
        nuget.dotnet.args = ['-e', 'console.log("9.0.0")', '--'];
        const result = await nuget.getNuGetPackageMetadata('Knapcode.SampleMcpServer');
        (0, vitest_1.expect)(result.state).toBe('error');
        if (result.state === 'error') {
            (0, vitest_1.expect)(result.errorType).toBe('BadCommandVersion');
            (0, vitest_1.expect)(result.helpUriLabel).toBe('Update .NET SDK');
            (0, vitest_1.expect)(result.helpUri).toBe('https://aka.ms/vscode-mcp-install/dotnet');
        }
        else {
            vitest_1.expect.fail();
        }
    });
});
//# sourceMappingURL=nuget.integration.spec.js.map