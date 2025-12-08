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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const sinon_1 = __importDefault(require("sinon"));
const completionsTelemetryServiceBridge_1 = require("../../../bridge/src/completionsTelemetryServiceBridge");
const telemetry_1 = require("../telemetry");
const userConfig_1 = require("../telemetry/userConfig");
const promiseQueue_1 = require("../util/promiseQueue");
const context_1 = require("./context");
const noopTelemetry_1 = require("./noopTelemetry");
const telemetry_2 = require("./telemetry");
suite('Telemetry unit tests', function () {
    const accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
    let clock;
    setup(function () {
        clock = sinon_1.default.useFakeTimers();
    });
    teardown(function () {
        clock.restore();
    });
    test('Adds additional fields', async function () {
        const telemetry = telemetry_1.TelemetryData.createAndMarkAsIssued();
        await telemetry.makeReadyForSending(accessor, telemetry_1.TelemetryStore.Standard, 'SkipExp', 2000);
        assert.ok(telemetry.properties.copilot_build);
        assert.ok(telemetry.properties.copilot_buildType);
        // assert.ok(telemetry.properties.copilot_trackingId);
        assert.ok(telemetry.properties.editor_version);
        assert.ok(telemetry.properties.editor_plugin_version);
        assert.ok(telemetry.properties.client_machineid);
        assert.ok(telemetry.properties.client_sessionid);
        assert.ok(telemetry.properties.copilot_version);
        assert.ok(telemetry.properties.runtime_version);
        assert.ok(telemetry.properties.common_extname);
        assert.ok(telemetry.properties.common_extversion);
        assert.ok(telemetry.properties.common_vscodeversion);
        // assert.ok(telemetry.properties.proxy_enabled);
        // assert.ok(telemetry.properties.proxy_auth);
        // assert.ok(telemetry.properties.proxy_kerberos_spn);
        // assert.ok(telemetry.properties.reject_unauthorized);
        assert.ok(telemetry.properties.unique_id);
    });
    test('Telemetry user config has undefined tracking id', function () {
        const accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
        const config = accessor.get(userConfig_1.ICompletionsTelemetryUserConfigService);
        assert.strictEqual(config.trackingId, undefined);
    });
    test('Test for multiplexProperties with only short values', function () {
        const properties = {
            key1: 'short value',
            key2: 'another short value',
        };
        const result = telemetry_1.TelemetryData.multiplexProperties(properties);
        assert.deepEqual(result, properties);
    });
    test('Test for multiplexProperties with a long value', function () {
        const longValue = 'a'.repeat(19000) + 'b';
        const properties = {
            key1: longValue,
        };
        const result = telemetry_1.TelemetryData.multiplexProperties(properties);
        assert.strictEqual(Object.keys(result).length, 3);
        assert.strictEqual(result.key1.length, 8192);
        assert.strictEqual(result.key1_02.length, 8192);
        assert.strictEqual(result.key1_03.length, 19001 - 16384);
        // The last character should be 'b' if we sliced correctly
        assert.strictEqual(result.key1_03.slice(-1), 'b');
    });
    test('telemetryCatch', async function () {
        const { enhancedReporter } = await (0, telemetry_2.withInMemoryTelemetry)(accessor, accessor => {
            (0, telemetry_1.telemetryCatch)(accessor.get(completionsTelemetryServiceBridge_1.ICompletionsTelemetryService), accessor.get(promiseQueue_1.ICompletionsPromiseQueueService), () => {
                throw new Error('boom!');
            }, 'exceptionTest')();
        });
        // Chat has no Telemetry Store.
        // const standardEvent = reporter.events[0];
        // assert.ok(standardEvent);
        const enhancedEvent = enhancedReporter.events[0];
        assert.ok(enhancedEvent);
        // assert.deepStrictEqual(standardEvent.properties.message, 'boom!');
        assert.deepStrictEqual(enhancedEvent.properties.message, 'boom!');
        // assert.ok(standardEvent.properties.restricted_unique_id);
        // assert.deepStrictEqual(enhancedEvent.properties.unique_id, standardEvent.properties.restricted_unique_id);
    });
});
suite('TelemetryReporters unit tests', function () {
    test('deactivate is safe to call synchronously', async function () {
        const accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
        const oldRepoter = new noopTelemetry_1.NoopCopilotTelemetryReporter();
        const oldRestrictedReporter = new noopTelemetry_1.NoopCopilotTelemetryReporter();
        const reporters = accessor.get(telemetry_1.ICompletionsTelemetryReporters);
        reporters.setReporter(oldRepoter);
        reporters.setEnhancedReporter(oldRestrictedReporter);
        const asyncWork = reporters.deactivate();
        const updatedReporter = reporters.getReporter(accessor); // snapshot these before awaiting the result
        const updatedEnhancedReporter = reporters.getEnhancedReporter(accessor);
        await asyncWork;
        assert.strictEqual(updatedReporter, undefined);
        assert.strictEqual(updatedEnhancedReporter, undefined);
    });
});
//# sourceMappingURL=telemetry.test.js.map