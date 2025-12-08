"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const fileTypes_1 = require("../../../../platform/filesystem/common/fileTypes");
const searchService_1 = require("../../../../platform/search/common/searchService");
const testWorkspaceService_1 = require("../../../../platform/test/node/testWorkspaceService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const platform_1 = require("../../../../util/vs/base/common/platform");
const uri_1 = require("../../../../util/vs/base/common/uri");
const descriptors_1 = require("../../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const services_1 = require("../../../test/node/services");
const toolsRegistry_1 = require("../../common/toolsRegistry");
const findFilesTool_1 = require("../findFilesTool");
const searchToolTestUtils_1 = require("./searchToolTestUtils");
(0, vitest_1.suite)('FindFiles', () => {
    let accessor;
    let collection;
    const workspaceFolder = platform_1.isWindows ? 'c:\\test\\workspace' : '/test/workspace';
    (0, vitest_1.beforeEach)(() => {
        collection = (0, services_1.createExtensionUnitTestingServices)();
        collection.define(workspaceService_1.IWorkspaceService, new descriptors_1.SyncDescriptor(testWorkspaceService_1.TestWorkspaceService, [[uri_1.URI.file(workspaceFolder)]]));
    });
    (0, vitest_1.afterEach)(() => {
        accessor.dispose();
    });
    function setup(expected, includeExtraPattern = true, modelFamily) {
        if (modelFamily) {
            collection.define(endpointProvider_1.IEndpointProvider, (0, searchToolTestUtils_1.createMockEndpointProvider)(modelFamily));
        }
        const patterns = [expected];
        if (includeExtraPattern) {
            if (typeof expected === 'string' && !expected.endsWith('/**')) {
                patterns.push(expected + '/**');
            }
            else if (typeof expected !== 'string' && !expected.pattern.endsWith('/**')) {
                patterns.push(new fileTypes_1.RelativePattern(expected.baseUri, expected.pattern + '/**'));
            }
        }
        collection.define(searchService_1.ISearchService, new TestSearchService(patterns));
        accessor = collection.createTestingAccessor();
    }
    (0, vitest_1.test)('passes through simple query', async () => {
        setup('test/**/*.ts', false);
        const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findFilesTool_1.FindFilesTool);
        await tool.invoke({ input: { query: 'test/**/*.ts' }, toolInvocationToken: null, }, cancellation_1.CancellationToken.None);
    });
    (0, vitest_1.test)('handles absolute path with glob', async () => {
        setup(new fileTypes_1.RelativePattern(uri_1.URI.file(workspaceFolder), 'test/**/*.ts'), false);
        const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findFilesTool_1.FindFilesTool);
        await tool.invoke({ input: { query: `${workspaceFolder}/test/**/*.ts` }, toolInvocationToken: null, }, cancellation_1.CancellationToken.None);
    });
    (0, vitest_1.test)('handles absolute path to folder', async () => {
        setup(new fileTypes_1.RelativePattern(uri_1.URI.file(workspaceFolder), ''), false);
        const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findFilesTool_1.FindFilesTool);
        await tool.invoke({ input: { query: workspaceFolder }, toolInvocationToken: null, }, cancellation_1.CancellationToken.None);
    });
    (0, vitest_1.suite)('gpt-4.1 model glob pattern', () => {
        (0, vitest_1.test)('adds extra pattern for gpt-4.1 model with simple query', async () => {
            setup('src', true, 'gpt-4.1');
            const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findFilesTool_1.FindFilesTool);
            const result = await tool.invoke({ input: { query: 'src' }, toolInvocationToken: null, model: searchToolTestUtils_1.mockLanguageModelChat }, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result).toBeDefined();
        });
        (0, vitest_1.test)('adds extra pattern for gpt-4.1 with string query ending in /**', async () => {
            setup('src/**', true, 'gpt-4.1');
            const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findFilesTool_1.FindFilesTool);
            const result = await tool.invoke({ input: { query: 'src/**' }, toolInvocationToken: null, model: searchToolTestUtils_1.mockLanguageModelChat }, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result).toBeDefined();
        });
        (0, vitest_1.test)('adds extra pattern for gpt-4.1 with RelativePattern', async () => {
            setup(new fileTypes_1.RelativePattern(uri_1.URI.file(workspaceFolder), 'src'), true, 'gpt-4.1');
            const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findFilesTool_1.FindFilesTool);
            const result = await tool.invoke({ input: { query: `${workspaceFolder}/src` }, toolInvocationToken: null, model: searchToolTestUtils_1.mockLanguageModelChat }, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result).toBeDefined();
        });
        (0, vitest_1.test)('does not duplicate extra pattern when RelativePattern already ends with /**', async () => {
            setup(new fileTypes_1.RelativePattern(uri_1.URI.file(workspaceFolder), 'src/**'), true, 'gpt-4.1');
            const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findFilesTool_1.FindFilesTool);
            const result = await tool.invoke({ input: { query: `${workspaceFolder}/src/**` }, toolInvocationToken: null, model: searchToolTestUtils_1.mockLanguageModelChat }, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result).toBeDefined();
        });
    });
    (0, vitest_1.suite)('resolveInput', () => {
        (0, vitest_1.beforeEach)(() => {
            setup('hello');
        });
        async function testIt(input, context) {
            const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findFilesTool_1.FindFilesTool);
            const resolved = await tool.resolveInput(input, null, context);
            (0, vitest_1.expect)(resolved).toMatchSnapshot();
        }
        (0, vitest_1.test)('resolveInput with FullContext and no maxResults', async () => {
            await testIt({ query: 'hello' }, toolsRegistry_1.CopilotToolMode.FullContext);
        });
        (0, vitest_1.test)('resolveInput with FullContext and maxResults < 200', async () => {
            await testIt({ query: 'hello', maxResults: 50 }, toolsRegistry_1.CopilotToolMode.FullContext);
        });
        (0, vitest_1.test)('resolveInput with FullContext and maxResults > 200', async () => {
            await testIt({ query: 'hello', maxResults: 300 }, toolsRegistry_1.CopilotToolMode.FullContext);
        });
        (0, vitest_1.test)('resolveInput with PartialContext and no maxResults', async () => {
            await testIt({ query: 'hello' }, toolsRegistry_1.CopilotToolMode.PartialContext);
        });
        (0, vitest_1.test)('resolveInput with PartialContext and maxResults defined', async () => {
            await testIt({ query: 'hello', maxResults: 123 }, toolsRegistry_1.CopilotToolMode.PartialContext);
        });
    });
});
class TestSearchService extends searchService_1.AbstractSearchService {
    constructor(expectedPattern) {
        super();
        this.expectedPattern = expectedPattern;
    }
    async findTextInFiles(query, options, progress, token) {
        throw new Error('Method not implemented.');
    }
    findTextInFiles2(query, options, token) {
        throw new Error('Method not implemented.');
    }
    async findFiles(filePattern, options, token) {
        (0, vitest_1.expect)(filePattern).toEqual(this.expectedPattern);
        return [];
    }
}
//# sourceMappingURL=findFiles.spec.js.map