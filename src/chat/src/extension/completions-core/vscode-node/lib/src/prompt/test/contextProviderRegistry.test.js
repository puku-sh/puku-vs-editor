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
const sinon_1 = __importDefault(require("sinon"));
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const descriptors_1 = require("../../../../../../../util/vs/platform/instantiation/common/descriptors");
const config_1 = require("../../config");
const logger_1 = require("../../logger");
const telemetry_1 = require("../../telemetry");
const context_1 = require("../../test/context");
const loggerHelpers_1 = require("../../test/loggerHelpers");
const async_1 = require("../../util/async");
const runtimeMode_1 = require("../../util/runtimeMode");
const contextProviderRegistry_1 = require("../contextProviderRegistry");
const contextProviderStatistics_1 = require("../contextProviderStatistics");
const contextProviderStatistics_2 = require("../test/contextProviderStatistics");
const featuresService_1 = require("../../experiments/featuresService");
suite('ContextProviderRegistry', function () {
    let accessor;
    let serviceCollection;
    let registry;
    let statistics;
    let testLogTarget;
    let telemetryData;
    let clock;
    const defaultDocumentContext = {
        uri: 'file:///test.txt',
        languageId: 'md',
        version: 1,
        offset: 0,
        position: { line: 0, character: 0 },
    };
    const traitProvider = {
        id: 'traitProvider',
        selector: ['*'],
        resolver: {
            resolve: () => {
                return Promise.resolve([
                    {
                        name: 'trait1',
                        value: 'value1',
                        id: 'id1',
                    },
                ]);
            },
        },
    };
    setup(function () {
        serviceCollection = (0, context_1.createLibTestingContext)();
        testLogTarget = new loggerHelpers_1.TestLogTarget();
        serviceCollection.define(logger_1.ICompletionsLogTargetService, testLogTarget);
        statistics = new contextProviderStatistics_2.TestContextProviderStatistics();
        serviceCollection.define(contextProviderStatistics_1.ICompletionsContextProviderService, new contextProviderStatistics_1.ContextProviderStatistics(() => statistics));
        accessor = serviceCollection.createTestingAccessor();
        telemetryData = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
        registry = accessor.get(contextProviderRegistry_1.ICompletionsContextProviderRegistryService);
        // Enable all context providers for the suite.
        telemetryData.filtersAndExp.exp.variables.copilotcontextproviders = '*';
        clock = sinon_1.default.useFakeTimers();
    });
    teardown(function () {
        clock.restore();
        sinon_1.default.restore();
    });
    test('should register a context provider', function () {
        registry.registerContextProvider(traitProvider);
        assert_1.default.deepStrictEqual(registry.providers.length, 1);
        assert_1.default.deepStrictEqual(registry.providers[0].id, 'traitProvider');
    });
    test('should not register a context provider with invalid name', function () {
        const invalidProvider = {
            id: 'in,validProvider',
            selector: ['*'],
            resolver: {
                resolve: () => Promise.resolve([]),
            },
        };
        assert_1.default.throws(() => registry.registerContextProvider(invalidProvider));
    });
    test('should not register a duplicate context provider (by id)', function () {
        registry.registerContextProvider(traitProvider);
        assert_1.default.throws(() => registry.registerContextProvider(traitProvider));
    });
    test('should unregister a context provider', function () {
        registry.registerContextProvider(traitProvider);
        assert_1.default.deepStrictEqual(registry.providers.length, 1);
        registry.unregisterContextProvider(traitProvider.id);
        assert_1.default.deepStrictEqual(registry.providers.length, 0);
    });
    test('resolving without providers should return an empty array', async function () {
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems, []);
    });
    test('negative matching providers should have none resolution', async function () {
        const unmatchedProvider = {
            id: 'unmatchedProvider',
            selector: [{ language: 'typescript' }],
            resolver: {
                resolve: () => Promise.resolve([{ name: 'trait', value: 'value' }]),
            },
        };
        registry.registerContextProvider(unmatchedProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems, [
            {
                providerId: 'unmatchedProvider',
                matchScore: 0,
                resolution: 'none',
                resolutionTimeMs: 0,
                data: [],
            },
        ]);
    });
    for (const method of ['feature_flag', 'config']) {
        for (const provider of ['enabledProvider', '*']) {
            test(`enable ${provider} provider(s) via ${method}`, async function () {
                if (method === 'feature_flag') {
                    telemetryData.filtersAndExp.exp.variables.copilotcontextproviders = provider;
                }
                else {
                    telemetryData.filtersAndExp.exp.variables.copilotcontextproviders = '';
                    const configProvider = accessor.get(config_1.ICompletionsConfigProvider);
                    configProvider.setConfig(config_1.ConfigKey.ContextProviders, [provider]);
                }
                const notEnabledProvider = {
                    id: 'notEnabledProvider',
                    selector: ['*'],
                    resolver: {
                        resolve: () => Promise.resolve([
                            {
                                name: 'anothertrait',
                                value: 'anothervalue',
                                id: 'id1',
                            },
                        ]),
                    },
                };
                const enabledProvider = {
                    id: 'enabledProvider',
                    selector: ['*'],
                    resolver: {
                        resolve: () => Promise.resolve([
                            {
                                name: 'trait',
                                value: 'value',
                                id: 'id2',
                            },
                        ]),
                    },
                };
                registry.registerContextProvider(notEnabledProvider);
                registry.registerContextProvider(enabledProvider);
                const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
                if (provider === '*') {
                    assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
                        {
                            providerId: 'notEnabledProvider',
                            matchScore: 1,
                            resolution: 'full',
                            resolutionTimeMs: -1,
                            data: [{ name: 'anothertrait', value: 'anothervalue', id: 'id1', type: 'Trait' }],
                        },
                        {
                            providerId: 'enabledProvider',
                            matchScore: 1,
                            resolution: 'full',
                            resolutionTimeMs: -1,
                            data: [{ name: 'trait', value: 'value', id: 'id2', type: 'Trait' }],
                        },
                    ]);
                }
                else {
                    assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
                        {
                            providerId: 'enabledProvider',
                            matchScore: 1,
                            resolution: 'full',
                            resolutionTimeMs: -1,
                            data: [{ name: 'trait', value: 'value', id: 'id2', type: 'Trait' }],
                        },
                        {
                            providerId: 'notEnabledProvider',
                            matchScore: 0,
                            resolution: 'none',
                            resolutionTimeMs: -1,
                            data: [],
                        },
                    ]);
                }
            });
        }
    }
    test('can resolve all providers', async function () {
        const anotherTraitProvider = {
            id: 'anotherTraitProvider',
            selector: ['*'],
            resolver: {
                resolve: () => Promise.resolve([
                    {
                        name: 'anotherTrait1',
                        value: 'anotherValue1',
                        id: 'id2',
                    },
                ]),
            },
        };
        registry.registerContextProvider(traitProvider);
        registry.registerContextProvider(anotherTraitProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 2);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'traitProvider',
                matchScore: 1,
                resolution: 'full',
                resolutionTimeMs: -1,
                data: [{ name: 'trait1', value: 'value1', id: 'id1', type: 'Trait' }],
            },
            {
                providerId: 'anotherTraitProvider',
                matchScore: 1,
                resolution: 'full',
                resolutionTimeMs: -1,
                data: [{ name: 'anotherTrait1', value: 'anotherValue1', id: 'id2', type: 'Trait' }],
            },
        ]);
    });
    test('providers that return no data are still considered resolved', async function () {
        const noDataProvider = {
            id: 'noDataProvider',
            selector: ['*'],
            resolver: {
                resolve: () => Promise.resolve([]),
            },
        };
        registry.registerContextProvider(noDataProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems, [
            {
                providerId: 'noDataProvider',
                matchScore: 1,
                resolution: 'full',
                resolutionTimeMs: 0,
                data: [],
            },
        ]);
    });
    test('measures the resolution time', async function () {
        const slowProvider = {
            id: 'slowProvider',
            selector: ['*'],
            resolver: {
                resolve: async () => {
                    await clock.tickAsync(10);
                    return [{ name: 'trait1', value: 'value1' }];
                },
            },
        };
        registry.registerContextProvider(slowProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.ok(resolvedContextItems[0].resolutionTimeMs >= 10);
    });
    test('should use passed IDs or assign one', async function () {
        const traitProviderWithoutId = {
            id: 'traitProviderWithoutId',
            selector: ['*'],
            resolver: {
                resolve: () => Promise.resolve([
                    {
                        name: 'traitWithoutId',
                        value: 'value',
                    },
                ]),
            },
        };
        registry.registerContextProvider(traitProvider);
        registry.registerContextProvider(traitProviderWithoutId);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 2);
        const [itemsWithId, itemsWithoutId] = resolvedContextItems;
        assert_1.default.ok(itemsWithoutId.data[0].id.length > 0);
        assert_1.default.deepStrictEqual(itemsWithId.data[0].id, 'id1');
    });
    test('context items with invalid IDs are replaced', async function () {
        const traitProviderWithBadId = {
            id: 'traitProviderWithBadId',
            selector: ['*'],
            resolver: {
                resolve: () => Promise.resolve([
                    {
                        name: 'traitWithBadId',
                        value: 'value',
                        id: 'in.valid',
                    },
                ]),
            },
        };
        registry.registerContextProvider(traitProviderWithBadId);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        const { data, resolutionTimeMs, ...rest } = resolvedContextItems[0];
        assert_1.default.deepStrictEqual(rest, {
            providerId: 'traitProviderWithBadId',
            matchScore: 1,
            resolution: 'full',
        });
        assert_1.default.ok(resolutionTimeMs >= 0);
        assert_1.default.deepStrictEqual(data.length, 1);
        assert_1.default.ok(data[0].id.length > 0);
        assert_1.default.notDeepStrictEqual(data[0].id, 'in.valid');
    });
    test('context items with invalid importance are dropped', async function () {
        const importances = [
            -1, // Out of range
            101, // Out of range
            99.9, // non-integer
            0.1, // non-integer
            50, // valid,
            0, // valid,
            100, // valid,
            undefined, // valid
        ];
        const items = [];
        for (const [ix, importance] of importances.entries()) {
            items.push({ name: `trait${ix}`, value: `value${ix}`, importance, id: `${ix}`, type: 'Trait' });
        }
        const traitProviderWithBadId = {
            id: 'traitProviderWithBadId',
            selector: ['*'],
            resolver: {
                resolve: () => Promise.resolve(items),
            },
        };
        registry.registerContextProvider(traitProviderWithBadId);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', {
            uri: 'file:///test.txt',
            languageId: 'md',
            version: 1,
            offset: 0,
            position: { line: 0, character: 0 },
        }, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        const { data } = resolvedContextItems[0];
        assert_1.default.deepStrictEqual(data.map(d => d.importance), [50, 0, 100, undefined]);
    });
    test('context items with unsupported schema are dropped', async function () {
        const traitProviderWithBadId = {
            id: 'traitProviderWithBadId',
            selector: ['*'],
            resolver: {
                resolve: () => Promise.resolve([
                    'hello',
                    { name: 'trait1', value: 'value1', id: '1', type: 'Trait' },
                    { name: 'trait2', value: 'value2', id: '2', type: 'Trait' },
                ]),
            },
        };
        registry.registerContextProvider(traitProviderWithBadId);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', {
            uri: 'file:///test.txt',
            languageId: 'md',
            version: 1,
            offset: 0,
            position: { line: 0, character: 0 },
        }, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        const { data } = resolvedContextItems[0];
        assert_1.default.deepStrictEqual(data.length, 2);
    });
    test('context items with duplicate IDs are replaced', async function () {
        const traitProviderWithDupeId = {
            id: 'traitProviderWithDupeId',
            selector: ['*'],
            resolver: {
                resolve: () => Promise.resolve([
                    {
                        name: 'traitWithBadId1',
                        value: 'value',
                        id: 'id1',
                    },
                    {
                        name: 'traitWithBadId2',
                        value: 'value',
                        id: 'id1',
                    },
                ]),
            },
        };
        registry.registerContextProvider(traitProviderWithDupeId);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        const { data, resolutionTimeMs, ...rest } = resolvedContextItems[0];
        assert_1.default.deepStrictEqual(rest, {
            providerId: 'traitProviderWithDupeId',
            matchScore: 1,
            resolution: 'full',
        });
        assert_1.default.ok(resolutionTimeMs >= 0);
        assert_1.default.deepStrictEqual(data.length, 2);
        assert_1.default.deepStrictEqual(data[0].id, 'id1');
        assert_1.default.notDeepStrictEqual(data[1].id, 'id1');
        assert_1.default.ok(data[1].id.length > 0);
    });
    test('all providers are enabled in debug mode', async function () {
        const serviceCollectionClone = serviceCollection.clone();
        // Feature flag doesn't matter in debug mode
        telemetryData.filtersAndExp.exp.variables.copilotcontextproviders = '';
        serviceCollectionClone.define(runtimeMode_1.ICompletionsRuntimeModeService, runtimeMode_1.RuntimeMode.fromEnvironment(false, [], { GITHUB_COPILOT_DEBUG: 'true' }));
        const accessor = serviceCollectionClone.createTestingAccessor();
        const registry = accessor.get(contextProviderRegistry_1.ICompletionsContextProviderRegistryService);
        const anotherTraitProvider = {
            id: 'anotherTraitProvider',
            selector: ['*'],
            resolver: {
                resolve: () => Promise.resolve([
                    {
                        name: 'anotherTrait1',
                        value: 'anotherValue1',
                        id: '1234',
                    },
                ]),
            },
        };
        registry.registerContextProvider(traitProvider);
        registry.registerContextProvider(anotherTraitProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 2);
    });
    test('does not resolve providers if already cancelled', async function () {
        registry.registerContextProvider(traitProvider);
        const cts = new vscode_languageserver_protocol_1.CancellationTokenSource();
        cts.cancel();
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData, cts.token);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 0);
    });
    test('supports non-array providers', async function () {
        const flatTraitProvider = {
            id: 'flatTraitProvider',
            selector: ['*'],
            resolver: {
                resolve: () => Promise.resolve({
                    name: 'flatTrait1',
                    value: 'flatValue1',
                    id: 'id',
                }),
            },
        };
        registry.registerContextProvider(flatTraitProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'flatTraitProvider',
                matchScore: 1,
                resolution: 'full',
                resolutionTimeMs: -1,
                data: [{ name: 'flatTrait1', value: 'flatValue1', id: 'id', type: 'Trait' }],
            },
        ]);
    });
    test('provider rejects', async function () {
        testLogTarget = new loggerHelpers_1.TestLogTarget();
        const serviceCollectionClone = serviceCollection.clone();
        serviceCollectionClone.define(logger_1.ICompletionsLogTargetService, testLogTarget);
        const accessor = serviceCollectionClone.createTestingAccessor();
        const registry = accessor.get(contextProviderRegistry_1.ICompletionsContextProviderRegistryService);
        const errorProvider = {
            id: 'errorProvider',
            selector: ['*'],
            resolver: {
                resolve: (_, token) => {
                    return Promise.reject(new Error('Intentional error'));
                },
            },
        };
        registry.registerContextProvider(errorProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'errorProvider',
                matchScore: 1,
                resolution: 'error',
                resolutionTimeMs: -1,
                data: [],
            },
        ]);
        // Logs the error
        testLogTarget.assertHasMessageMatching(logger_1.LogLevel.ERROR, /Error resolving context/);
    });
    test('provider cancels', async function () {
        testLogTarget = new loggerHelpers_1.TestLogTarget();
        const serviceCollectionClone = serviceCollection.clone();
        serviceCollectionClone.define(logger_1.ICompletionsLogTargetService, testLogTarget);
        const accessor = serviceCollectionClone.createTestingAccessor();
        const registry = accessor.get(contextProviderRegistry_1.ICompletionsContextProviderRegistryService);
        const errorProvider = {
            id: 'errorProvider',
            selector: ['*'],
            resolver: {
                resolve: (_, token) => {
                    return Promise.reject(new CancellationError());
                },
            },
        };
        registry.registerContextProvider(errorProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'errorProvider',
                matchScore: 1,
                resolution: 'error',
                resolutionTimeMs: -1,
                data: [],
            },
        ]);
        // In this case, no error is expected
        assert_1.default.ok(testLogTarget.isEmpty());
    });
    test('asynciterable provider rejects', async function () {
        const errorProvider = {
            id: 'errorAsyncIterableProvider',
            selector: ['*'],
            resolver: {
                async *resolve(_, token) {
                    // Return something, which will be ignored
                    yield { name: 'trait', value: 'value' };
                    // Return promise that rejects
                    return Promise.reject(new Error('Intentional error'));
                },
            },
        };
        registry.registerContextProvider(errorProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'errorAsyncIterableProvider',
                matchScore: 1,
                resolution: 'error',
                resolutionTimeMs: -1,
                data: [],
            },
        ]);
        // Logs the error
        testLogTarget.assertHasMessageMatching(logger_1.LogLevel.ERROR, /Error resolving context/);
    });
    test('asynciterable provider cancels', async function () {
        const errorProvider = {
            id: 'errorAsyncIterableProvider',
            selector: ['*'],
            resolver: {
                async *resolve(_, token) {
                    // Return something, which will be ignored
                    yield { name: 'trait', value: 'value' };
                    return Promise.reject(new CancellationError());
                },
            },
        };
        registry.registerContextProvider(errorProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'errorAsyncIterableProvider',
                matchScore: 1,
                resolution: 'error',
                resolutionTimeMs: -1,
                data: [],
            },
        ]);
        // In this case, no error is expected
        assert_1.default.ok(testLogTarget.isEmpty());
    });
    test('sets resolution status of providers', async function () {
        registry.registerContextProvider(traitProvider);
        await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(statistics.lastResolution.get('traitProvider'), 'full');
    });
    test('times out when a (promise-based) provider takes too long', async function () {
        const slowProvider = {
            id: 'slowProvider',
            selector: ['*'],
            resolver: {
                resolve: async () => {
                    await clock.tickAsync(1000);
                    return [{ name: 'trait1', value: 'value1' }];
                },
            },
        };
        registry.registerContextProvider(slowProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'slowProvider',
                matchScore: 1,
                resolution: 'none',
                resolutionTimeMs: -1,
                data: [],
            },
        ]);
        assert_1.default.deepStrictEqual(statistics.lastResolution.get('slowProvider'), 'none');
    });
    test('timeout is passed correctly', async function () {
        clock.tick(1000);
        const configProvider = accessor.get(config_1.ICompletionsConfigProvider);
        configProvider.setConfig(config_1.ConfigKey.ContextProviderTimeBudget, 100);
        let providerRequest;
        const logOnlyProvider = {
            id: 'logOnlyProvider',
            selector: ['*'],
            resolver: {
                resolve: r => {
                    providerRequest = r;
                    return Promise.resolve([]);
                },
            },
        };
        registry.registerContextProvider(logOnlyProvider);
        await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.ok(providerRequest);
        assert_1.default.deepStrictEqual(providerRequest.timeoutEnd, 1100);
        assert_1.default.deepEqual(providerRequest.timeBudget, 100);
    });
    test('infinite timeout is passed correctly', async function () {
        clock.tick(1000);
        const configProvider = accessor.get(config_1.ICompletionsConfigProvider);
        configProvider.setConfig(config_1.ConfigKey.ContextProviderTimeBudget, 0);
        let providerRequest;
        const logOnlyProvider = {
            id: 'logOnlyProvider',
            selector: ['*'],
            resolver: {
                resolve: r => {
                    providerRequest = r;
                    return Promise.resolve([]);
                },
            },
        };
        registry.registerContextProvider(logOnlyProvider);
        await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.ok(providerRequest);
        assert_1.default.deepStrictEqual(providerRequest.timeoutEnd, Number.MAX_SAFE_INTEGER);
        assert_1.default.deepEqual(providerRequest.timeBudget, 0);
    });
    test('does not timeout when time budget set to 0', async function () {
        const serviceCollectionClone = serviceCollection.clone();
        const slowProvider = {
            id: 'slowProvider',
            selector: ['*'],
            resolver: {
                resolve: () => Promise.resolve([{ name: 'trait1', value: 'value1', id: 'id' }]),
            },
        };
        serviceCollectionClone.define(runtimeMode_1.ICompletionsRuntimeModeService, runtimeMode_1.RuntimeMode.fromEnvironment(false, [], { GITHUB_COPILOT_DEBUG: 'true' }));
        const accessor = serviceCollectionClone.createTestingAccessor();
        const configProvider = accessor.get(config_1.ICompletionsConfigProvider);
        configProvider.setConfig(config_1.ConfigKey.ContextProviderTimeBudget, 0);
        const registry = accessor.get(contextProviderRegistry_1.ICompletionsContextProviderRegistryService);
        registry.registerContextProvider(slowProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'slowProvider',
                matchScore: 1,
                resolution: 'full',
                resolutionTimeMs: -1,
                data: [{ name: 'trait1', value: 'value1', id: 'id', type: 'Trait' }],
            },
        ]);
        assert_1.default.deepStrictEqual(statistics.lastResolution.get('slowProvider'), 'full');
    });
    test('timeout cancels request to the provider (default)', async function () {
        let interceptedCancellation;
        let interceptedRequest;
        const slowProvider = {
            id: 'slowProvider',
            selector: ['*'],
            resolver: {
                resolve: async (request, token) => {
                    interceptedCancellation = token;
                    interceptedRequest = request;
                    await clock.tickAsync(1000);
                    return [{ name: 'trait1', value: 'value1' }];
                },
            },
        };
        registry.registerContextProvider(slowProvider);
        await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.ok(interceptedCancellation);
        assert_1.default.ok(interceptedCancellation.isCancellationRequested);
        assert_1.default.deepStrictEqual(interceptedRequest?.timeBudget, 150);
    });
    test('timeout can be specified via EXP', async function () {
        let interceptedCancellation;
        let interceptedRequest;
        const featuresService = accessor.get(featuresService_1.ICompletionsFeaturesService);
        featuresService.contextProviderTimeBudget = () => 10;
        const slowProvider = {
            id: 'slowProvider',
            selector: ['*'],
            resolver: {
                async *resolve(request, token) {
                    interceptedCancellation = token;
                    interceptedRequest = request;
                    await clock.tickAsync(5);
                    yield { name: 'asynctrait1', value: 'value1', id: 'id1' };
                    await clock.tickAsync(4);
                    yield { name: 'asynctrait2', value: 'value2', id: 'id2' };
                    await clock.tickAsync(5);
                    yield { name: 'asynctrait3', value: 'value3', id: 'id3' };
                },
            },
        };
        registry.registerContextProvider(slowProvider);
        const result = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.ok(interceptedCancellation);
        assert_1.default.ok(interceptedCancellation.isCancellationRequested);
        assert_1.default.ok(result.length === 1);
        assert_1.default.deepStrictEqual(result[0].data.length, 2);
        assert_1.default.deepStrictEqual(interceptedRequest?.timeBudget, 10);
    });
    test('config timeout is preferred to EXP', async function () {
        let interceptedCancellation;
        let interceptedRequest;
        const featuresService = accessor.get(featuresService_1.ICompletionsFeaturesService);
        featuresService.contextProviderTimeBudget = () => 10;
        const configProvider = accessor.get(config_1.ICompletionsConfigProvider);
        configProvider.setConfig(config_1.ConfigKey.ContextProviderTimeBudget, 20);
        const slowProvider = {
            id: 'slowProvider',
            selector: ['*'],
            resolver: {
                async *resolve(request, token) {
                    interceptedCancellation = token;
                    interceptedRequest = request;
                    await clock.tickAsync(10);
                    yield { name: 'asynctrait1', value: 'value1', id: 'id1' };
                    await clock.tickAsync(9);
                    yield { name: 'asynctrait2', value: 'value2', id: 'id2' };
                    await clock.tickAsync(10);
                    yield { name: 'asynctrait3', value: 'value3', id: 'id3' };
                },
            },
        };
        registry.registerContextProvider(slowProvider);
        const result = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.ok(interceptedCancellation);
        assert_1.default.ok(interceptedCancellation.isCancellationRequested);
        assert_1.default.ok(result.length === 1);
        assert_1.default.deepStrictEqual(result[0].data.length, 2);
        assert_1.default.deepStrictEqual(interceptedRequest?.timeBudget, 20);
    });
    test('(matching) providers run concurrently', async function () {
        const firstProvider = {
            id: 'firstProvider',
            selector: ['*'],
            resolver: {
                async *resolve() {
                    await (0, async_1.delay)(140);
                    yield { name: 'trait1', value: 'value1', id: 'id1' };
                    yield { name: 'trait2', value: 'value2', id: 'id2' };
                },
            },
        };
        // Items from this provider will be processed first.
        const secondProvider = {
            id: 'secondProvider',
            selector: [{ language: 'md' }],
            resolver: {
                async *resolve() {
                    await (0, async_1.delay)(20);
                    yield { name: 'trait3', value: 'value3', id: 'id3' }; // Will make it
                    await (0, async_1.delay)(120);
                    yield { name: 'trait4', value: 'value4', id: 'id4' }; // Will make it
                    await (0, async_1.delay)(20);
                    yield { name: 'trait5', value: 'value5', id: 'id5' }; // Will not make it
                },
            },
        };
        // This provider will be ignored because it doesn't match
        const thirdProvider = {
            id: 'thirdProvider',
            selector: [{ language: 'typescript' }],
            resolver: {
                async *resolve() {
                    await (0, async_1.delay)(75);
                    yield { name: 'trait6', value: 'value6', id: 'id6' };
                },
            },
        };
        registry.registerContextProvider(firstProvider);
        registry.registerContextProvider(secondProvider);
        registry.registerContextProvider(thirdProvider);
        const resolvedContextItemsPromise = registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        await clock.runAllAsync();
        const resolvedContextItems = await resolvedContextItemsPromise;
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 3);
        assert_1.default.deepStrictEqual(resolvedContextItems.map(c => c.providerId), ['secondProvider', 'firstProvider', 'thirdProvider']);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'secondProvider',
                matchScore: 10,
                resolution: 'partial',
                resolutionTimeMs: -1,
                data: [
                    { name: 'trait3', value: 'value3', id: 'id3', type: 'Trait' },
                    { name: 'trait4', value: 'value4', id: 'id4', type: 'Trait' },
                ],
            },
            {
                providerId: 'firstProvider',
                matchScore: 1,
                resolution: 'full',
                resolutionTimeMs: -1,
                data: [
                    { name: 'trait1', value: 'value1', id: 'id1', type: 'Trait' },
                    { name: 'trait2', value: 'value2', id: 'id2', type: 'Trait' },
                ],
            },
            {
                providerId: 'thirdProvider',
                matchScore: 0,
                resolution: 'none',
                resolutionTimeMs: -1,
                data: [],
            },
        ]);
        assert_1.default.deepStrictEqual(statistics.lastResolution.get('firstProvider'), 'full');
        assert_1.default.deepStrictEqual(statistics.lastResolution.get('secondProvider'), 'partial');
    });
    test('supports asynciterable resolvers', async function () {
        const asyncIterableProvider = {
            id: 'asyncIterableProvider',
            selector: ['*'],
            resolver: {
                async *resolve() {
                    yield Promise.resolve({ name: 'asynctrait1', value: 'value1', id: 'id1' });
                    yield Promise.resolve({ name: 'asynctrait2', value: 'value2', id: 'id2' });
                    yield Promise.resolve({ name: 'asynctrait3', value: 'value3', id: 'id3' });
                },
            },
        };
        registry.registerContextProvider(asyncIterableProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'asyncIterableProvider',
                matchScore: 1,
                resolution: 'full',
                resolutionTimeMs: -1,
                data: [
                    { name: 'asynctrait1', value: 'value1', id: 'id1', type: 'Trait' },
                    { name: 'asynctrait2', value: 'value2', id: 'id2', type: 'Trait' },
                    { name: 'asynctrait3', value: 'value3', id: 'id3', type: 'Trait' },
                ],
            },
        ]);
    });
    test('fallback context items are included if iterable timeout is hit', async function () {
        let called = false;
        const asyncIterableProvider = {
            id: 'asyncIterableProvider',
            selector: ['*'],
            resolver: {
                async *resolve() {
                    yield Promise.resolve({ name: 'asynctrait1', value: 'value1', id: 'id1' });
                    yield Promise.resolve({ name: 'asynctrait2', value: 'value2', id: 'id2' });
                    await clock.tickAsync(1000); // Timeout
                    yield Promise.resolve({ name: 'asynctrait3', value: 'value3', id: 'id3' });
                },
                resolveOnTimeout() {
                    called = true;
                    return [{ name: 'fallbacktrait', value: 'fallbackvalue', id: 'id4' }];
                },
            },
        };
        registry.registerContextProvider(asyncIterableProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.ok(called);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'asyncIterableProvider',
                matchScore: 1,
                resolution: 'partial',
                resolutionTimeMs: -1,
                data: [
                    { name: 'asynctrait1', value: 'value1', id: 'id1', type: 'Trait' },
                    { name: 'asynctrait2', value: 'value2', id: 'id2', type: 'Trait' },
                    { name: 'fallbacktrait', value: 'fallbackvalue', id: 'id4', type: 'Trait' },
                ],
            },
        ]);
    });
    test('fallback context items are included if promise timeout is hit', async function () {
        let called = false;
        const slowProvider = {
            id: 'slowProvider',
            selector: ['*'],
            resolver: {
                async resolve() {
                    await clock.tickAsync(1000); // Timeout
                    return { name: 'trait', value: 'value', id: 'id1' };
                },
                resolveOnTimeout() {
                    called = true;
                    return [{ name: 'fallbacktrait', value: 'fallbackvalue', id: 'id2' }];
                },
            },
        };
        registry.registerContextProvider(slowProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.ok(called);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'slowProvider',
                matchScore: 1,
                resolution: 'partial',
                resolutionTimeMs: -1,
                data: [{ name: 'fallbacktrait', value: 'fallbackvalue', id: 'id2', type: 'Trait' }],
            },
        ]);
    });
    test('resolution remains none if no fallback items are provided', async function () {
        const slowProvider = {
            id: 'slowProvider',
            selector: ['*'],
            resolver: {
                async resolve() {
                    await clock.tickAsync(1000); // Timeout
                    return { name: 'trait', value: 'value', id: 'id1' };
                },
                resolveOnTimeout() {
                    return undefined;
                },
            },
        };
        registry.registerContextProvider(slowProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'slowProvider',
                matchScore: 1,
                resolution: 'none',
                resolutionTimeMs: -1,
                data: [],
            },
        ]);
    });
    test('fallback context items are not included if no timeout is hit', async function () {
        let called = false;
        const asyncIterableProvider = {
            id: 'asyncIterableProvider',
            selector: ['*'],
            resolver: {
                async *resolve() {
                    yield Promise.resolve({ name: 'asynctrait1', value: 'value1', id: 'id1' });
                    yield Promise.resolve({ name: 'asynctrait2', value: 'value2', id: 'id2' });
                },
                resolveOnTimeout() {
                    called = true;
                    return [{ name: 'fallbacktrait', value: 'fallbackvalue', id: 'id4' }];
                },
            },
        };
        registry.registerContextProvider(asyncIterableProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.ok(!called);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'asyncIterableProvider',
                matchScore: 1,
                resolution: 'full',
                resolutionTimeMs: -1,
                data: [
                    { name: 'asynctrait1', value: 'value1', id: 'id1', type: 'Trait' },
                    { name: 'asynctrait2', value: 'value2', id: 'id2', type: 'Trait' },
                ],
            },
        ]);
    });
    test('fallback context items are not included if no timeout is hit and no results', async function () {
        let called = false;
        const asyncIterableProvider = {
            id: 'asyncIterableProvider',
            selector: ['*'],
            resolver: {
                resolve: () => Promise.resolve([]),
                resolveOnTimeout() {
                    called = true;
                    return [{ name: 'fallbacktrait', value: 'fallbackvalue', id: 'id4' }];
                },
            },
        };
        registry.registerContextProvider(asyncIterableProvider);
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.ok(!called);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'asyncIterableProvider',
                matchScore: 1,
                resolution: 'full',
                resolutionTimeMs: -1,
                data: [],
            },
        ]);
    });
    test('times out when the first element of an (asynciterable-based) provider takes too long', async function () {
        const slowProvider = {
            id: 'slowAsyncIterableProvider',
            selector: ['*'],
            resolver: {
                async *resolve() {
                    await clock.tickAsync(1000);
                    yield { name: 'asynctrait1', value: 'value1' };
                },
            },
        };
        registry.registerContextProvider(slowProvider);
        const startTime = Date.now();
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        // Allowing for a small error, even though we're using fake timers
        assert_1.default.ok(Date.now() - startTime < 151);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'slowAsyncIterableProvider',
                matchScore: 1,
                resolution: 'none',
                resolutionTimeMs: -1,
                data: [],
            },
        ]);
        assert_1.default.deepStrictEqual(statistics.lastResolution.get('slowAsyncIterableProvider'), 'none');
    });
    test('times out when an (asynciterable-based) provider takes too long', async function () {
        const slowProvider = {
            id: 'slowAsyncIterableProvider',
            selector: ['*'],
            resolver: {
                async *resolve() {
                    yield { name: 'asynctrait1', value: 'value1', id: 'id1' };
                    yield { name: 'asynctrait2', value: 'value2', id: 'id2' };
                    await clock.tickAsync(1000);
                    yield { name: 'asynctrait3', value: 'value3', id: 'id3' };
                },
            },
        };
        registry.registerContextProvider(slowProvider);
        const startTime = Date.now();
        const resolvedContextItems = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        // Allowing for a small error, even though we're using fake timers
        assert_1.default.ok(Date.now() - startTime < 151);
        assert_1.default.deepStrictEqual(resolvedContextItems.length, 1);
        assert_1.default.deepStrictEqual(removeResolutionTime(resolvedContextItems), [
            {
                providerId: 'slowAsyncIterableProvider',
                matchScore: 1,
                resolution: 'partial',
                resolutionTimeMs: -1,
                data: [
                    { name: 'asynctrait1', value: 'value1', id: 'id1', type: 'Trait' },
                    { name: 'asynctrait2', value: 'value2', id: 'id2', type: 'Trait' },
                ],
            },
        ]);
        testLogTarget.assertHasMessageMatching(logger_1.LogLevel.INFO, /Context provider slowAsyncIterableProvider exceeded time budget/);
        assert_1.default.deepStrictEqual(statistics.lastResolution.get('slowAsyncIterableProvider'), 'partial');
    });
    test('timeout cancels request to the (asynciterable-based) provider', async function () {
        let interceptedCancellation;
        const slowProvider = {
            id: 'slowAsyncIterableProvider',
            selector: ['*'],
            resolver: {
                async *resolve(_, token) {
                    interceptedCancellation = token;
                    yield { name: 'asynctrait1', value: 'value1' };
                    yield { name: 'asynctrait2', value: 'value2' };
                    await clock.tickAsync(1000);
                    yield { name: 'asynctrait3', value: 'value3' };
                },
            },
        };
        registry.registerContextProvider(slowProvider);
        await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.ok(interceptedCancellation);
        assert_1.default.ok(interceptedCancellation.isCancellationRequested);
    });
    test('cancels requests when completion token is cancelled', async function () {
        const cts = new vscode_languageserver_protocol_1.CancellationTokenSource();
        let interceptedCancellation;
        let providerEndTime = Date.now() - 1000;
        let resolverEndTime = Date.now() + 1000;
        const slowProvider = {
            id: 'slowProvider',
            selector: ['*'],
            resolver: {
                resolve: async (_, token) => {
                    interceptedCancellation = token;
                    await (0, async_1.delay)(15);
                    providerEndTime = Date.now();
                    return Promise.resolve([{ name: 'trait1', value: 'value1' }]);
                },
            },
        };
        registry.registerContextProvider(slowProvider);
        // record the time that resolution finishes
        void registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData, cts.token).then(() => {
            resolverEndTime = Date.now();
        });
        // trigger the cancellation token after 5ms
        void (0, async_1.delay)(2).then(() => {
            cts.cancel();
        });
        await clock.runAllAsync();
        // the provider should have received the cancellation request
        assert_1.default.ok(interceptedCancellation);
        assert_1.default.ok(interceptedCancellation.isCancellationRequested);
        // regardless of the provider's behavior, we end promptly when we receive the cancellation token
        // In particular, resolution finishes before the provider
        assert_1.default.ok(resolverEndTime < providerEndTime);
    });
    test('adds completion id to request', async function () {
        registry.registerContextProvider(traitProvider);
        const resolverSpy = sinon_1.default.spy(traitProvider.resolver, 'resolve');
        await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.ok(resolverSpy.calledOnce);
        assert_1.default.deepStrictEqual(resolverSpy.lastCall.args[0].completionId, '1234');
    });
    test('passes data when resolving', async function () {
        const data = { foo: 'bar' };
        registry.registerContextProvider(traitProvider);
        const resolverSpy = sinon_1.default.spy(traitProvider.resolver, 'resolve');
        await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData, undefined, data);
        assert_1.default.ok(resolverSpy.calledOnce);
        assert_1.default.deepStrictEqual(resolverSpy.lastCall.args[0].data, data);
    });
    test('does not add statistics to the context on the first resolution', async function () {
        registry.registerContextProvider(traitProvider);
        const resolverSpy = sinon_1.default.spy(traitProvider.resolver, 'resolve');
        await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.ok(resolverSpy.calledOnce);
        assert_1.default.deepStrictEqual(resolverSpy.lastCall.args[0].previousUsageStatistics, undefined);
    });
    test('augments provider context with statistics from last round', async function () {
        const serviceCollectionClone = serviceCollection.clone();
        const resolverSpy = sinon_1.default.spy(traitProvider.resolver, 'resolve');
        serviceCollectionClone.define(contextProviderStatistics_1.ICompletionsContextProviderService, new descriptors_1.SyncDescriptor(contextProviderStatistics_1.ContextProviderStatistics, [() => new contextProviderStatistics_2.TestContextProviderStatistics()]));
        const accessor = serviceCollectionClone.createTestingAccessor();
        const registry = accessor.get(contextProviderRegistry_1.ICompletionsContextProviderRegistryService);
        registry.registerContextProvider(traitProvider);
        const statistics = accessor.get(contextProviderStatistics_1.ICompletionsContextProviderService);
        const previousStatistics = { usage: 'partial', resolution: 'full' };
        statistics.getStatisticsForCompletion('previous_id').statistics.set(traitProvider.id, previousStatistics);
        await registry.resolveAllProviders('previous_id', 'opId', defaultDocumentContext, telemetryData);
        statistics.getStatisticsForCompletion('current_id').statistics.set(traitProvider.id, { usage: 'none', resolution: 'none' });
        await registry.resolveAllProviders('current_id', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.deepStrictEqual(resolverSpy.firstCall.args[0].previousUsageStatistics, undefined);
        assert_1.default.deepStrictEqual(resolverSpy.lastCall.args[0].previousUsageStatistics, previousStatistics);
    });
    test('caches results', async function () {
        const resolverSpy = sinon_1.default.spy(traitProvider.resolver, 'resolve');
        const anotherTraitProvider = {
            id: 'anotherTraitProvider',
            selector: ['*'],
            resolver: {
                resolve: () => Promise.resolve([
                    {
                        name: 'anotherTrait1',
                        value: 'anotherValue1',
                    },
                ]),
            },
        };
        const anotherResolverSpy = sinon_1.default.spy(anotherTraitProvider.resolver, 'resolve');
        registry.registerContextProvider(traitProvider);
        const firstCall = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.ok(resolverSpy.calledOnce);
        assert_1.default.ok(anotherResolverSpy.notCalled);
        assert_1.default.deepStrictEqual(firstCall.length, 1);
        // Register another provider between calls to ensure more items are added.
        registry.registerContextProvider(anotherTraitProvider);
        const secondCall = await registry.resolveAllProviders('1234', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.ok(resolverSpy.calledOnce);
        assert_1.default.ok(anotherResolverSpy.notCalled);
        assert_1.default.deepStrictEqual(secondCall.length, 1);
        assert_1.default.deepStrictEqual(firstCall, secondCall);
        const thirdCall = await registry.resolveAllProviders('5678', 'opId', defaultDocumentContext, telemetryData);
        assert_1.default.ok(resolverSpy.calledTwice);
        assert_1.default.ok(anotherResolverSpy.calledOnce);
        assert_1.default.deepStrictEqual(thirdCall.length, 2);
    });
});
// Utility function to test context items without worrying about non-deterministic fields
function removeResolutionTime(resolvedContextItems) {
    return resolvedContextItems.map(i => {
        i.resolutionTimeMs = -1;
        return i;
    });
}
class CancellationError extends Error {
    constructor() {
        super('Canceled');
        this.name = this.message;
    }
}
//# sourceMappingURL=contextProviderRegistry.test.js.map