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
const findTextInFilesTool_1 = require("../findTextInFilesTool");
const searchToolTestUtils_1 = require("./searchToolTestUtils");
(0, vitest_1.suite)('FindTextInFiles', () => {
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
        const searchService = new TestSearchService(patterns);
        collection.define(searchService_1.ISearchService, searchService);
        accessor = collection.createTestingAccessor();
        return searchService;
    }
    (0, vitest_1.test)('passes through simple query', async () => {
        setup('*.ts', false);
        const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findTextInFilesTool_1.FindTextInFilesTool);
        await tool.invoke({ input: { query: 'hello', includePattern: '*.ts' }, toolInvocationToken: null, }, cancellation_1.CancellationToken.None);
    });
    (0, vitest_1.test)('using **/ correctly', async () => {
        setup('src/**', false);
        const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findTextInFilesTool_1.FindTextInFilesTool);
        await tool.invoke({ input: { query: 'hello', includePattern: 'src/**' }, toolInvocationToken: null, }, cancellation_1.CancellationToken.None);
    });
    (0, vitest_1.test)('handles absolute path with glob', async () => {
        setup(new fileTypes_1.RelativePattern(uri_1.URI.file(workspaceFolder), 'test/**/*.ts'), false);
        const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findTextInFilesTool_1.FindTextInFilesTool);
        await tool.invoke({ input: { query: 'hello', includePattern: `${workspaceFolder}/test/**/*.ts` }, toolInvocationToken: null, }, cancellation_1.CancellationToken.None);
    });
    (0, vitest_1.test)('handles absolute path to folder', async () => {
        setup(new fileTypes_1.RelativePattern(uri_1.URI.file(workspaceFolder), ''), false);
        const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findTextInFilesTool_1.FindTextInFilesTool);
        await tool.invoke({ input: { query: 'hello', includePattern: workspaceFolder }, toolInvocationToken: null, }, cancellation_1.CancellationToken.None);
    });
    (0, vitest_1.test)('escapes backtick', async () => {
        setup(new fileTypes_1.RelativePattern(uri_1.URI.file(workspaceFolder), ''), false);
        const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findTextInFilesTool_1.FindTextInFilesTool);
        const prepared = await tool.prepareInvocation({ input: { query: 'hello `world`' }, }, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)((prepared?.invocationMessage).value).toMatchInlineSnapshot(`"Searching for regex \`\` hello \`world\` \`\`"`);
    });
    (0, vitest_1.test)('prepares invocation message with text for literal search', async () => {
        setup(new fileTypes_1.RelativePattern(uri_1.URI.file(workspaceFolder), ''), false);
        const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findTextInFilesTool_1.FindTextInFilesTool);
        const prepared = await tool.prepareInvocation({ input: { query: 'hello', isRegexp: false }, }, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)((prepared?.invocationMessage).value).toMatchInlineSnapshot(`"Searching for text \`hello\`"`);
    });
    (0, vitest_1.test)('retries with plain text when regex yields no results', async () => {
        const searchService = setup('*.ts', false);
        const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findTextInFilesTool_1.FindTextInFilesTool);
        await tool.invoke({ input: { query: '(?:hello)', includePattern: '*.ts' }, toolInvocationToken: null, }, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(searchService.calls.map(call => call.isRegExp)).toEqual([true, false]);
        (0, vitest_1.expect)(searchService.calls.every(call => call.pattern === '(?:hello)')).toBe(true);
    });
    (0, vitest_1.test)('does not retry when text pattern is invalid regex', async () => {
        const searchService = setup('*.ts', false);
        const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findTextInFilesTool_1.FindTextInFilesTool);
        await tool.invoke({ input: { query: '[', includePattern: '*.ts', isRegexp: false }, toolInvocationToken: null, }, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(searchService.calls.map(call => call.isRegExp)).toEqual([false]);
    });
    (0, vitest_1.suite)('gpt-4.1 model glob pattern', () => {
        (0, vitest_1.test)('adds extra pattern for gpt-4.1 model with simple query', async () => {
            setup('src', true, 'gpt-4.1');
            const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findTextInFilesTool_1.FindTextInFilesTool);
            const result = await tool.invoke({ input: { query: 'hello', includePattern: 'src' }, toolInvocationToken: null, model: searchToolTestUtils_1.mockLanguageModelChat }, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result).toBeDefined();
        });
        (0, vitest_1.test)('adds extra pattern for gpt-4.1 with string query ending in /**', async () => {
            setup('src/**', true, 'gpt-4.1');
            const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findTextInFilesTool_1.FindTextInFilesTool);
            const result = await tool.invoke({ input: { query: 'hello', includePattern: 'src/**' }, toolInvocationToken: null, model: searchToolTestUtils_1.mockLanguageModelChat }, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result).toBeDefined();
        });
        (0, vitest_1.test)('adds extra pattern for gpt-4.1 with RelativePattern', async () => {
            setup(new fileTypes_1.RelativePattern(uri_1.URI.file(workspaceFolder), 'src'), true, 'gpt-4.1');
            const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findTextInFilesTool_1.FindTextInFilesTool);
            const result = await tool.invoke({ input: { query: 'hello', includePattern: `${workspaceFolder}/src` }, toolInvocationToken: null, model: searchToolTestUtils_1.mockLanguageModelChat }, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result).toBeDefined();
        });
        (0, vitest_1.test)('does not duplicate extra pattern when RelativePattern already ends with /**', async () => {
            setup(new fileTypes_1.RelativePattern(uri_1.URI.file(workspaceFolder), 'src/**'), true, 'gpt-4.1');
            const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(findTextInFilesTool_1.FindTextInFilesTool);
            const result = await tool.invoke({ input: { query: 'hello', includePattern: `${workspaceFolder}/src/**` }, toolInvocationToken: null, model: searchToolTestUtils_1.mockLanguageModelChat }, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result).toBeDefined();
        });
    });
});
class TestSearchService extends searchService_1.AbstractSearchService {
    constructor(expectedIncludePattern) {
        super();
        this.expectedIncludePattern = expectedIncludePattern;
        this.arr1 = [];
        this.arr2 = [];
        this.recordedCalls = [];
    }
    get calls() {
        return this.recordedCalls;
    }
    async findTextInFiles(query, options, progress, token) {
        throw new Error('Method not implemented.');
    }
    findTextInFiles2(query, options, token) {
        (0, vitest_1.expect)(options?.include).toEqual(this.expectedIncludePattern);
        this.recordedCalls.push({
            pattern: query.pattern,
            isRegExp: query.isRegExp,
        });
        return {
            complete: Promise.resolve({}),
            results: (async function* () { })()
        };
    }
    async findFiles(filePattern, options, token) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=findTextInFilesTool.spec.js.map