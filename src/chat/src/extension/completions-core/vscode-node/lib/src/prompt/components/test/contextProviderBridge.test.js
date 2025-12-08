"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const instantiation_1 = require("../../../../../../../../util/vs/platform/instantiation/common/instantiation");
const completionState_1 = require("../../../completionState");
const featuresService_1 = require("../../../experiments/featuresService");
const telemetry_1 = require("../../../telemetry");
const context_1 = require("../../../test/context");
const textDocument_1 = require("../../../test/textDocument");
const textDocument_2 = require("../../../textDocument");
const contextProviderRegistry_1 = require("../../contextProviderRegistry");
const contextProviderBridge_1 = require("./../contextProviderBridge");
suite('Context Provider Bridge', function () {
    let accessor;
    let bridge;
    setup(function () {
        accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
        const featuresService = accessor.get(featuresService_1.ICompletionsFeaturesService);
        accessor.get(contextProviderRegistry_1.ICompletionsContextProviderRegistryService).registerContextProvider(new TestContextProvider());
        featuresService.contextProviders = () => ['testContextProvider'];
        bridge = accessor.get(instantiation_1.IInstantiationService).createInstance(contextProviderBridge_1.ContextProviderBridge);
    });
    test('await context resolution by id', async function () {
        const state = testCompletionState();
        bridge.schedule(state, 'id', 'opId', telemetry_1.TelemetryWithExp.createEmptyConfigForTesting());
        const items = await bridge.resolution('id');
        assert.deepStrictEqual(items.length, 1);
        assert.deepStrictEqual(items[0].providerId, 'testContextProvider');
        assert.deepStrictEqual(items[0].data[0].name, 'test');
        assert.deepStrictEqual(items[0].data[0].value, 'test');
    });
    test('await context resolution by id twice', async function () {
        const state = testCompletionState();
        bridge.schedule(state, 'id', 'opId', telemetry_1.TelemetryWithExp.createEmptyConfigForTesting());
        const items1 = await bridge.resolution('id');
        const items2 = await bridge.resolution('id');
        assert.deepStrictEqual(items1.length, 1);
        assert.deepStrictEqual(items1[0].providerId, 'testContextProvider');
        assert.deepStrictEqual(items1[0].data[0].name, 'test');
        assert.deepStrictEqual(items1[0].data[0].value, 'test');
        assert.deepStrictEqual(items1, items2);
    });
    test('no schedule called returns empty array', async function () {
        const items = await bridge.resolution('unknown-id');
        assert.deepStrictEqual(items, []);
    });
    test('error in context resolution', async function () {
        const featuresService = accessor.get(featuresService_1.ICompletionsFeaturesService);
        accessor.get(contextProviderRegistry_1.ICompletionsContextProviderRegistryService).registerContextProvider(new TestContextProvider({ shouldThrow: true, id: 'errorProvider' }));
        featuresService.contextProviders = () => ['errorProvider'];
        const errorBridge = accessor.get(instantiation_1.IInstantiationService).createInstance(contextProviderBridge_1.ContextProviderBridge);
        const state = testCompletionState();
        errorBridge.schedule(state, 'err-id', 'opId', telemetry_1.TelemetryWithExp.createEmptyConfigForTesting());
        const items = await errorBridge.resolution('err-id');
        const errorItem = items.find(i => i.providerId === 'errorProvider');
        assert.deepStrictEqual(errorItem?.resolution, 'error');
    });
    test('multiple schedules and resolutions', async function () {
        const state1 = testCompletionState();
        const state2 = testCompletionState();
        bridge.schedule(state1, 'id1', 'opId', telemetry_1.TelemetryWithExp.createEmptyConfigForTesting());
        bridge.schedule(state2, 'id2', 'opId', telemetry_1.TelemetryWithExp.createEmptyConfigForTesting());
        const items1 = await bridge.resolution('id1');
        const items2 = await bridge.resolution('id2');
        assert.deepStrictEqual(items1.length, 1);
        assert.deepStrictEqual(items2.length, 1);
    });
    test('empty provider list returns empty array', async function () {
        const featuresService = accessor.get(featuresService_1.ICompletionsFeaturesService);
        featuresService.contextProviders = () => [];
        const instantiationService = (0, context_1.createLibTestingContext)().createTestingAccessor().get(instantiation_1.IInstantiationService);
        bridge = instantiationService.createInstance(contextProviderBridge_1.ContextProviderBridge);
        const state = testCompletionState();
        bridge.schedule(state, 'empty-id', 'opId', telemetry_1.TelemetryWithExp.createEmptyConfigForTesting());
        const items = await bridge.resolution('empty-id');
        assert.deepStrictEqual(items, []);
    });
    function testCompletionState() {
        const doc = (0, textDocument_1.createTextDocument)('file:///fizzbuzz.go', 'go', 1, 'code');
        const position = textDocument_2.LocationFactory.position(3, 0);
        return (0, completionState_1.createCompletionState)(doc, position);
    }
});
class TestContextResolver {
    constructor(opts) {
        this.shouldThrow = opts?.shouldThrow ?? false;
    }
    async *resolve() {
        if (this.shouldThrow) {
            throw new Error('Test error');
        }
        yield Promise.resolve({ name: 'test', value: 'test' });
    }
}
class TestContextProvider {
    constructor(opts) {
        this.id = opts?.id ?? 'testContextProvider';
        this.selector = ['*'];
        this.resolver = new TestContextResolver({ shouldThrow: opts?.shouldThrow });
    }
}
//# sourceMappingURL=contextProviderBridge.test.js.map