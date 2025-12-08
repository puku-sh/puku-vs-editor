"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const logService_1 = require("../../../../platform/log/common/logService");
const services_1 = require("../../../test/node/services");
const nuget_1 = require("../../vscode-node/nuget");
const util_1 = require("./util");
(0, vitest_1.describe)('get nuget MCP server info using fake CLI', { timeout: 30_000 }, () => {
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
        fetcherService = new util_1.FixtureFetcherService(new Map([
            ['https://api.nuget.org/v3/index.json', { fileName: 'nuget-service-index.json', status: 200 }],
            ['https://api.nuget.org/v3-flatcontainer/basetestpackage.dotnettool/1.0.0/readme', { fileName: 'nuget-readme.md', status: 200 }],
        ]));
        commandExecutor = new util_1.FixtureCommandExecutor(new Map([
            ['dotnet --version', { stdout: '10.0.100-preview.7.25358.102', exitCode: 0 }]
        ]));
        nuget = new nuget_1.NuGetMcpSetup(logService, fetcherService, commandExecutor);
    });
    (0, vitest_1.it)('converts legacy schema version', async () => {
        const manifest = {
            "$schema": "https://modelcontextprotocol.io/schemas/draft/2025-07-09/server.json",
            packages: [{ registry_name: 'nuget', name: 'MismatchId', version: '0.1.0' }]
        };
        const expected = {
            name: 'CorrectId',
            version: '0.2.0',
            description: 'CorrectId',
            "$schema": "https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json",
            packages: [{ registry_name: 'nuget', name: 'CorrectId', version: '0.2.0' }]
        };
        const actual = nuget.prepareServerJson(manifest, "CorrectId", "0.2.0");
        (0, vitest_1.expect)(actual).toEqual(expected);
    });
    (0, vitest_1.it)('handles original 2025-07-09 schema version', async () => {
        const manifest = {
            "$schema": "https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json",
            packages: [{ registry_name: 'nuget', name: 'MismatchId', version: '0.1.0' }]
        };
        const expected = {
            "$schema": "https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json",
            name: 'CorrectId',
            version: '0.2.0',
            description: 'CorrectId',
            packages: [{ registry_name: 'nuget', name: 'CorrectId', version: '0.2.0' }],
        };
        const actual = nuget.prepareServerJson(manifest, "CorrectId", "0.2.0");
        (0, vitest_1.expect)(actual).toEqual(expected);
    });
    (0, vitest_1.it)('handles latest 2025-07-09 schema version', async () => {
        const manifest = {
            "$schema": "https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json",
            packages: [{ registry_type: 'nuget', name: 'MismatchId', version: '0.1.0' }]
        };
        const expected = {
            "$schema": "https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json",
            name: 'CorrectId',
            version: '0.2.0',
            description: 'CorrectId',
            packages: [{ registry_type: 'nuget', name: 'CorrectId', version: '0.2.0' }],
        };
        const actual = nuget.prepareServerJson(manifest, "CorrectId", "0.2.0");
        (0, vitest_1.expect)(actual).toEqual(expected);
    });
    (0, vitest_1.it)('handles latest 2025-09-29 schema version', async () => {
        const manifest = {
            "$schema": "https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json",
            packages: [{ registryType: 'nuget', name: 'MismatchId', version: '0.1.0' }]
        };
        const expected = {
            "$schema": "https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json",
            name: 'CorrectId',
            version: '0.2.0',
            description: 'CorrectId',
            packages: [{ registryType: 'nuget', name: 'CorrectId', version: '0.2.0' }],
        };
        const actual = nuget.prepareServerJson(manifest, "CorrectId", "0.2.0");
        (0, vitest_1.expect)(actual).toEqual(expected);
    });
    (0, vitest_1.it)('returns package metadata', async () => {
        commandExecutor.fullCommandToResultMap.set('dotnet package search basetestpackage.DOTNETTOOL --source https://api.nuget.org/v3/index.json --prerelease --format json', { fileName: 'dotnet-package-search-exists.json', exitCode: 0 });
        const result = await nuget.getNuGetPackageMetadata('basetestpackage.DOTNETTOOL');
        (0, vitest_1.expect)(result.state).toBe('ok');
        if (result.state === 'ok') {
            (0, vitest_1.expect)(result.name).toBe('BaseTestPackage.DotnetTool');
            (0, vitest_1.expect)(result.version).toBe('1.0.0');
            (0, vitest_1.expect)(result.publisher).toBe('NuGetTestData');
            await (0, vitest_1.expect)(result.readme).toMatchFileSnapshot('fixtures/snapshots/nuget-readme.md');
        }
        else {
            vitest_1.expect.fail();
        }
    });
    (0, vitest_1.it)('handles missing package', async () => {
        commandExecutor.fullCommandToResultMap.set('dotnet package search basetestpackage.dotnettool --source https://api.nuget.org/v3/index.json --prerelease --format json', { fileName: 'dotnet-package-search-does-not-exist.json', exitCode: 0 });
        const result = await nuget.getNuGetPackageMetadata('basetestpackage.dotnettool');
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
(0, vitest_1.describe)('mapServerJsonToMcpServer', () => {
    (0, vitest_1.it)('handles 2025-07-09 schema version', async () => {
        const manifest = {
            "$schema": "https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json",
            name: "test",
            description: "test",
            version: "1.0.0",
            packages: [{ registry_type: 'nuget', name: 'SomeId', version: '0.1.0' }]
        };
        const expected = {
            config: {
                type: "stdio" /* McpServerType.LOCAL */,
                command: "dnx",
                args: ["SomeId@0.1.0", "--yes"]
            }
        };
        const actual = (0, nuget_1.mapServerJsonToMcpServer)(manifest, "nuget" /* RegistryType.NUGET */);
        (0, vitest_1.expect)(actual).toEqual(expected);
    });
    (0, vitest_1.it)('handles 2025-09-29 schema version', async () => {
        const manifest = {
            "$schema": "https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json",
            name: "test",
            description: "test",
            version: "1.0.0",
            packages: [{ registryType: 'nuget', identifier: 'SomeId', version: '0.1.0' }]
        };
        const expected = {
            config: {
                type: "stdio" /* McpServerType.LOCAL */,
                command: "dnx",
                args: ["SomeId@0.1.0", "--yes"]
            }
        };
        const actual = (0, nuget_1.mapServerJsonToMcpServer)(manifest, "nuget" /* RegistryType.NUGET */);
        (0, vitest_1.expect)(actual).toEqual(expected);
    });
    (0, vitest_1.it)('defaults to first package without matching type', async () => {
        const manifest = {
            "$schema": "https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json",
            name: "test",
            description: "test",
            version: "1.0.0",
            packages: [{ registryType: 'npm', identifier: 'SomeId', version: '0.1.0' }]
        };
        const expected = {
            config: {
                type: "stdio" /* McpServerType.LOCAL */,
                command: "npx",
                args: ["SomeId@0.1.0"]
            }
        };
        const actual = (0, nuget_1.mapServerJsonToMcpServer)(manifest, "nuget" /* RegistryType.NUGET */);
        (0, vitest_1.expect)(actual).toEqual(expected);
    });
});
//# sourceMappingURL=nuget.stub.spec.js.map