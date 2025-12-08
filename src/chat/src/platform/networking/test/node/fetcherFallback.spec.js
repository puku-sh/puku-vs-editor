"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const stream_1 = require("stream");
const vitest_1 = require("vitest");
const fetcher_1 = require("../../../test/node/fetcher");
const testLogService_1 = require("../../../testing/common/testLogService");
const fetcherService_1 = require("../../common/fetcherService");
const fetcherFallback_1 = require("../../node/fetcherFallback");
const defaultsOnlyConfigurationService_1 = require("../../../configuration/common/defaultsOnlyConfigurationService");
const inMemoryConfigurationService_1 = require("../../../configuration/test/common/inMemoryConfigurationService");
const configurationService_1 = require("../../../configuration/common/configurationService");
(0, vitest_1.suite)('FetcherFallback Test Suite', function () {
    const knownBadFetchers = new Set();
    const logService = new testLogService_1.TestLogService();
    const configurationService = new defaultsOnlyConfigurationService_1.DefaultsOnlyConfigurationService();
    const someHTML = '<html>...</html>';
    const someJSON = '{"key": "value"}';
    (0, vitest_1.test)('first fetcher succeeds', async function () {
        const fetcherSpec = [
            { name: 'fetcher1', response: createFakeResponse(200, someJSON) },
            { name: 'fetcher2', response: createFakeResponse(200, someJSON) },
        ];
        const testFetchers = createTestFetchers(fetcherSpec);
        const { response, updatedFetchers, updatedKnownBadFetchers } = await (0, fetcherFallback_1.fetchWithFallbacks)(testFetchers.fetchers, 'https://example.com', { expectJSON: true, retryFallbacks: true }, knownBadFetchers, configurationService, logService);
        assert_1.default.deepStrictEqual(testFetchers.calls.map(c => c.name), fetcherSpec.slice(0, 1).map(f => f.name)); // only first fetcher called
        assert_1.default.strictEqual(updatedFetchers, undefined);
        assert_1.default.strictEqual(updatedKnownBadFetchers, undefined);
        assert_1.default.strictEqual(response.status, 200);
        const json = await response.json();
        assert_1.default.deepStrictEqual(json, JSON.parse(someJSON));
    });
    (0, vitest_1.test)('first fetcher is retried to confirm failure', async function () {
        const fetcherSpec = [
            { name: 'fetcher1', response: createFakeResponse(200, someHTML) },
            { name: 'fetcher2', response: createFakeResponse(200, someJSON) },
            { name: 'fetcher1', response: createFakeResponse(200, someHTML) },
        ];
        const testFetchers = createTestFetchers(fetcherSpec);
        const { response, updatedFetchers, updatedKnownBadFetchers } = await (0, fetcherFallback_1.fetchWithFallbacks)(testFetchers.fetchers, 'https://example.com', { expectJSON: true, retryFallbacks: true }, knownBadFetchers, configurationService, logService);
        assert_1.default.deepStrictEqual(testFetchers.calls.map(c => c.name), fetcherSpec.map(f => f.name));
        assert_1.default.ok(updatedFetchers);
        assert_1.default.strictEqual(updatedFetchers[0], testFetchers.fetchers[1]);
        assert_1.default.strictEqual(updatedFetchers[1], testFetchers.fetchers[0]);
        assert_1.default.ok(updatedKnownBadFetchers);
        assert_1.default.strictEqual(updatedKnownBadFetchers.size, 1);
        assert_1.default.strictEqual(updatedKnownBadFetchers.has('fetcher1'), true);
        assert_1.default.strictEqual(response.status, 200);
        const json = await response.json();
        assert_1.default.deepStrictEqual(json, JSON.parse(someJSON));
    });
    (0, vitest_1.test)('no fetcher succeeds', async function () {
        const fetcherSpec = [
            { name: 'fetcher1', response: createFakeResponse(407, someHTML) },
            { name: 'fetcher2', response: createFakeResponse(401, someJSON) },
        ];
        const testFetchers = createTestFetchers(fetcherSpec);
        const { response, updatedFetchers, updatedKnownBadFetchers } = await (0, fetcherFallback_1.fetchWithFallbacks)(testFetchers.fetchers, 'https://example.com', { expectJSON: true, retryFallbacks: true }, knownBadFetchers, configurationService, logService);
        assert_1.default.deepStrictEqual(testFetchers.calls.map(c => c.name), fetcherSpec.map(f => f.name));
        assert_1.default.strictEqual(updatedFetchers, undefined);
        assert_1.default.strictEqual(updatedKnownBadFetchers, undefined);
        assert_1.default.strictEqual(response.status, 407);
        const text = await response.text();
        assert_1.default.deepStrictEqual(text, someHTML);
    });
    (0, vitest_1.test)('all fetchers throw', async function () {
        const fetcherSpec = [
            { name: 'fetcher1', response: new Error('fetcher1 error') },
            { name: 'fetcher2', response: new Error('fetcher2 error') },
        ];
        const testFetchers = createTestFetchers(fetcherSpec);
        try {
            await (0, fetcherFallback_1.fetchWithFallbacks)(testFetchers.fetchers, 'https://example.com', { expectJSON: true, retryFallbacks: true }, knownBadFetchers, configurationService, logService);
            assert_1.default.fail('Expected to throw');
        }
        catch (err) {
            assert_1.default.ok(err instanceof Error);
            assert_1.default.strictEqual(err.message, 'fetcher1 error');
            assert_1.default.deepStrictEqual(testFetchers.calls.map(c => c.name), fetcherSpec.map(f => f.name));
        }
    });
    (0, vitest_1.test)('useFetcher option selects second fetcher', async function () {
        const fetcherSpec = [
            { name: 'electron-fetch', response: createFakeResponse(200, someJSON) },
            { name: 'node-fetch', response: createFakeResponse(200, someJSON) },
        ];
        const testFetchers = createTestFetchers(fetcherSpec);
        const { response, updatedFetchers, updatedKnownBadFetchers } = await (0, fetcherFallback_1.fetchWithFallbacks)(testFetchers.fetchers, 'https://example.com', { useFetcher: 'node-fetch' }, knownBadFetchers, configurationService, logService);
        assert_1.default.deepStrictEqual(testFetchers.calls.map(c => c.name), ['node-fetch']); // only second fetcher called
        assert_1.default.strictEqual(updatedFetchers, undefined);
        assert_1.default.strictEqual(updatedKnownBadFetchers, undefined);
        assert_1.default.strictEqual(response.status, 200);
        const json = await response.json();
        assert_1.default.deepStrictEqual(json, JSON.parse(someJSON));
    });
    (0, vitest_1.test)('useFetcher option falls back to first fetcher when requested fetcher is disabled', async function () {
        const fetcherSpec = [
            { name: 'electron-fetch', response: createFakeResponse(200, someJSON) },
            { name: 'node-fetch', response: createFakeResponse(200, someJSON) },
        ];
        const testFetchers = createTestFetchers(fetcherSpec);
        const configServiceWithDisabledNodeFetch = new inMemoryConfigurationService_1.InMemoryConfigurationService(configurationService, new Map([[configurationService_1.ConfigKey.Shared.DebugUseNodeFetchFetcher, false]]));
        const { response, updatedFetchers, updatedKnownBadFetchers } = await (0, fetcherFallback_1.fetchWithFallbacks)(testFetchers.fetchers, 'https://example.com', { useFetcher: 'node-fetch' }, knownBadFetchers, configServiceWithDisabledNodeFetch, logService);
        assert_1.default.deepStrictEqual(testFetchers.calls.map(c => c.name), ['electron-fetch']); // first fetcher used instead
        assert_1.default.strictEqual(updatedFetchers, undefined);
        assert_1.default.strictEqual(updatedKnownBadFetchers, undefined);
        assert_1.default.strictEqual(response.status, 200);
        const json = await response.json();
        assert_1.default.deepStrictEqual(json, JSON.parse(someJSON));
    });
    (0, vitest_1.test)('useFetcher option falls back to first fetcher when requested fetcher is known bad', async function () {
        const fetcherSpec = [
            { name: 'electron-fetch', response: createFakeResponse(200, someJSON) },
            { name: 'node-fetch', response: createFakeResponse(200, someJSON) },
        ];
        const testFetchers = createTestFetchers(fetcherSpec);
        const knownBadFetchersWithNodeFetch = new Set(['node-fetch']);
        const { response, updatedFetchers, updatedKnownBadFetchers } = await (0, fetcherFallback_1.fetchWithFallbacks)(testFetchers.fetchers, 'https://example.com', { useFetcher: 'node-fetch' }, knownBadFetchersWithNodeFetch, configurationService, logService);
        assert_1.default.deepStrictEqual(testFetchers.calls.map(c => c.name), ['electron-fetch']); // first fetcher used instead
        assert_1.default.strictEqual(updatedFetchers, undefined);
        assert_1.default.strictEqual(updatedKnownBadFetchers, undefined);
        assert_1.default.strictEqual(response.status, 200);
        const json = await response.json();
        assert_1.default.deepStrictEqual(json, JSON.parse(someJSON));
    });
});
function createTestFetchers(fetcherSpecs) {
    const calls = [];
    const responseQueues = new Map();
    const order = [];
    for (const spec of fetcherSpecs) {
        let list = responseQueues.get(spec.name);
        if (!list) {
            list = [];
            responseQueues.set(spec.name, list);
            order.push(spec.name); // record first appearance order
        }
        list.push(spec.response);
    }
    const fetchers = [];
    for (const name of order) {
        const queue = responseQueues.get(name);
        fetchers.push({
            getUserAgentLibrary: () => name,
            fetch: async (url, options) => {
                calls.push({ name, url, options });
                const next = queue.shift();
                if (!next) {
                    throw new Error('No more queued responses for ' + name);
                }
                if (next instanceof Error) {
                    throw next;
                }
                return next;
            },
            disconnectAll: async () => { },
            makeAbortController: () => { throw new Error('Method not implemented.'); },
            isAbortError: () => false,
            isInternetDisconnectedError: () => false,
            isFetcherError: () => false,
            getUserMessageForFetcherError: () => 'error'
        });
    }
    return { fetchers, calls };
}
function createFakeResponse(statusCode, content) {
    return new fetcherService_1.Response(statusCode, 'status text', new fetcher_1.FakeHeaders(), () => Promise.resolve(content), () => Promise.resolve(JSON.parse(content)), async () => stream_1.Readable.from([content]));
}
//# sourceMappingURL=fetcherFallback.spec.js.map