"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const copilotToken_1 = require("../../../authentication/common/copilotToken");
const configurationService_1 = require("../../../configuration/common/configurationService");
const domainService_1 = require("../../../endpoint/common/domainService");
const envService_1 = require("../../../env/common/envService");
const services_1 = require("../../../test/node/services");
const ghTelemetrySender_1 = require("../../common/ghTelemetrySender");
const msftTelemetrySender_1 = require("../../common/msftTelemetrySender");
const telemetry_1 = require("../../common/telemetry");
(0, vitest_1.suite)('Microsoft Telemetry Sender', function () {
    let mockExternalReporter;
    let mockInternalReporter;
    let mockTokenStore;
    let mockToken;
    let sender;
    (0, vitest_1.beforeEach)(() => {
        mockExternalReporter = {
            sendRawTelemetryEvent: vitest_1.vi.fn(),
            sendTelemetryEvent: vitest_1.vi.fn(),
            sendTelemetryErrorEvent: vitest_1.vi.fn(),
            dispose: vitest_1.vi.fn(),
        };
        mockInternalReporter = {
            sendRawTelemetryEvent: vitest_1.vi.fn(),
            sendTelemetryEvent: vitest_1.vi.fn(),
            sendTelemetryErrorEvent: vitest_1.vi.fn(),
            dispose: vitest_1.vi.fn(),
        };
        mockToken = new copilotToken_1.CopilotToken({
            token: 'tid=testTid',
            sku: 'testSku',
            expires_at: 9999999999,
            refresh_in: 180000,
            chat_enabled: true,
            // Make the token part of the GH org so it works for internal people
            organization_list: ['4535c7beffc844b46bb1ed4aa04d759a'],
            isVscodeTeamMember: true,
            username: 'testUser',
            copilot_plan: 'unknown',
        });
        mockTokenStore = {
            _serviceBrand: undefined,
            copilotToken: mockToken,
            onDidStoreUpdate: vitest_1.vi.fn((callback) => {
                callback();
                return { dispose: vitest_1.vi.fn() };
            }),
        };
        const mockReporterFactory = (internal) => {
            if (internal) {
                return mockInternalReporter;
            }
            else {
                return mockExternalReporter;
            }
        };
        sender = new msftTelemetrySender_1.BaseMsftTelemetrySender(mockTokenStore, mockReporterFactory);
    });
    (0, vitest_1.afterEach)(() => {
        sender.dispose();
    });
    (0, vitest_1.test)('should send telemetry event', () => {
        sender.sendTelemetryEvent('testEvent', { foo: 'bar' });
        (0, vitest_1.expect)(mockExternalReporter.sendTelemetryEvent).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(mockExternalReporter.sendTelemetryEvent).toHaveBeenCalledWith('testEvent', { foo: 'bar', 'common.tid': 'testTid', 'common.sku': "testSku" }, { 'common.internal': 1 });
    });
    (0, vitest_1.test)('should send telemetry error event', () => {
        sender.sendTelemetryErrorEvent('testErrorEvent', { stack: 'testStack' }, { statusCode: 502 });
        (0, vitest_1.expect)(mockExternalReporter.sendTelemetryErrorEvent).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(mockExternalReporter.sendTelemetryErrorEvent).toHaveBeenCalledWith('testErrorEvent', { stack: 'testStack', 'common.tid': 'testTid', 'common.sku': "testSku" }, { statusCode: 502, 'common.internal': 1 });
    });
    (0, vitest_1.test)('should send internal telemetry event', () => {
        sender.sendInternalTelemetryEvent('testInternalEvent', { foo: 'bar' }, { 'testMeasure': 1 });
        (0, vitest_1.expect)(mockInternalReporter.sendRawTelemetryEvent).toHaveBeenCalledTimes(2);
        (0, vitest_1.expect)(mockInternalReporter.sendRawTelemetryEvent).toHaveBeenCalledWith('testInternalEvent', { foo: 'bar', 'common.tid': 'testTid', 'common.userName': 'testUser' }, { 'common.isVscodeTeamMember': 1, 'testMeasure': 1 });
    });
    (0, vitest_1.test)('should dispose reporters', () => {
        sender.dispose();
        (0, vitest_1.expect)(mockExternalReporter.dispose).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(mockInternalReporter.dispose).toHaveBeenCalledOnce();
    });
});
(0, vitest_1.suite)('GitHub Telemetry Sender', function () {
    let accessor;
    let sender;
    let mockLogger;
    let mockTokenStore;
    let mockToken;
    let mockEnhancedLogger;
    // These are all common properties & measurements that the telemetry sender will add to every event
    const commonTelemetryData = {
        properties: {
            copilot_build: new telemetry_1.TelemetryTrustedValue("1"),
            copilot_buildType: new telemetry_1.TelemetryTrustedValue("dev"),
            copilot_trackingId: new telemetry_1.TelemetryTrustedValue("testId"),
            editor_plugin_version: new telemetry_1.TelemetryTrustedValue("simulation-tests-plugin/2"),
            client_machineid: new telemetry_1.TelemetryTrustedValue("test-machine"),
            client_sessionid: new telemetry_1.TelemetryTrustedValue("test-session"),
            common_extname: new telemetry_1.TelemetryTrustedValue("simulation-tests-plugin"),
            common_extversion: new telemetry_1.TelemetryTrustedValue("2"),
        },
        measurements: {},
    };
    (0, vitest_1.beforeEach)(() => {
        accessor = (0, services_1.createPlatformServices)().createTestingAccessor();
        mockToken = new copilotToken_1.CopilotToken({
            token: 'rt=1;tid=test',
            sku: 'testSku',
            expires_at: 9999999999,
            refresh_in: 180000,
            chat_enabled: true,
            // Make the token part of the GH org so it works for internal people
            organization_list: ['4535c7beffc844b46bb1ed4aa04d759a'],
            isVscodeTeamMember: true,
            username: 'testUser',
            copilot_plan: 'unknown',
        });
        mockTokenStore = {
            _serviceBrand: undefined,
            copilotToken: mockToken,
            onDidStoreUpdate: vitest_1.vi.fn((callback) => {
                callback();
                return { dispose: vitest_1.vi.fn() };
            }),
        };
        mockLogger = {
            isUsageEnabled: true,
            isErrorsEnabled: true,
            logUsage: vitest_1.vi.fn(),
            logError: vitest_1.vi.fn(),
            onDidChangeEnableStates: vitest_1.vi.fn((callback) => {
                callback();
                return { dispose: vitest_1.vi.fn() };
            }),
            dispose: vitest_1.vi.fn()
        };
        mockEnhancedLogger = {
            isUsageEnabled: true,
            isErrorsEnabled: true,
            logUsage: vitest_1.vi.fn(),
            logError: vitest_1.vi.fn(),
            onDidChangeEnableStates: vitest_1.vi.fn((callback) => {
                callback();
                return { dispose: vitest_1.vi.fn() };
            }),
            dispose: vitest_1.vi.fn()
        };
        const telemetryConfig = {
            _serviceBrand: undefined,
            optedIn: true,
            organizationsList: undefined,
            trackingId: 'testId'
        };
        const mockLoggerFactory = (enhanced) => {
            if (enhanced) {
                return mockEnhancedLogger;
            }
            else {
                return mockLogger;
            }
        };
        sender = new ghTelemetrySender_1.BaseGHTelemetrySender(mockTokenStore, mockLoggerFactory, accessor.get(configurationService_1.IConfigurationService), telemetryConfig, accessor.get(envService_1.IEnvService), accessor.get(domainService_1.IDomainService));
    });
    (0, vitest_1.afterEach)(() => {
        accessor.dispose();
        sender.dispose();
    });
    (0, vitest_1.test)('should send telemetry event', () => {
        sender.sendTelemetryEvent('testEvent', { foo: 'bar' }, { 'testMeasure': 2 });
        (0, vitest_1.expect)(mockLogger.logUsage).toHaveBeenCalledOnce();
        const lastCall = mockLogger.logUsage.mock.lastCall;
        (0, vitest_1.expect)(lastCall).toBeDefined();
        (0, vitest_1.expect)(mockLogger.logUsage).toHaveBeenCalledWith('testEvent', {
            properties: {
                ...commonTelemetryData.properties,
                unique_id: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.unique_id.value),
                copilot_version: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.copilot_version.value),
                editor_version: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.editor_version.value),
                common_vscodeversion: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.common_vscodeversion.value),
                foo: new telemetry_1.TelemetryTrustedValue('bar'),
            },
            measurements: {
                ...commonTelemetryData.measurements,
                timeSinceIssuedMs: lastCall[1].measurements.timeSinceIssuedMs,
                'testMeasure': 2,
            }
        });
    });
    (0, vitest_1.test)('should send telemetry error event', () => {
        sender.sendTelemetryErrorEvent('testErrorEvent', { stack: 'testStack' }, { statusCode: 502 });
        (0, vitest_1.expect)(mockLogger.logError).toHaveBeenCalledOnce();
        const lastCall = mockLogger.logError.mock.lastCall;
        (0, vitest_1.expect)(lastCall).toBeDefined();
        (0, vitest_1.expect)(mockLogger.logError).toHaveBeenCalledWith('testErrorEvent', {
            properties: {
                ...commonTelemetryData.properties,
                unique_id: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.unique_id.value),
                copilot_version: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.copilot_version.value),
                editor_version: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.editor_version.value),
                common_vscodeversion: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.common_vscodeversion.value),
                stack: new telemetry_1.TelemetryTrustedValue('testStack'),
            },
            measurements: {
                ...commonTelemetryData.measurements,
                timeSinceIssuedMs: lastCall[1].measurements.timeSinceIssuedMs,
                statusCode: 502,
            }
        });
    });
    (0, vitest_1.test)('should send enhanced telemetry event', () => {
        sender.sendEnhancedTelemetryEvent('testEnhancedEvent', { foo: 'bar' }, { 'testMeasure': 2 });
        (0, vitest_1.expect)(mockEnhancedLogger.logUsage).toHaveBeenCalledOnce();
        const lastCall = mockEnhancedLogger.logUsage.mock.lastCall;
        (0, vitest_1.expect)(lastCall).toBeDefined();
        (0, vitest_1.expect)(mockEnhancedLogger.logUsage).toHaveBeenCalledWith('testEnhancedEvent', {
            properties: {
                ...commonTelemetryData.properties,
                unique_id: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.unique_id.value),
                copilot_version: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.copilot_version.value),
                editor_version: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.editor_version.value),
                common_vscodeversion: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.common_vscodeversion.value),
                foo: new telemetry_1.TelemetryTrustedValue('bar'),
            },
            measurements: {
                ...commonTelemetryData.measurements,
                timeSinceIssuedMs: lastCall[1].measurements.timeSinceIssuedMs,
                'testMeasure': 2,
            }
        });
    });
    (0, vitest_1.test)('should send enhanced telemetry error event', () => {
        sender.sendEnhancedTelemetryErrorEvent('testEnhancedErrorEvent', { stack: 'testStack' }, { statusCode: 502 });
        (0, vitest_1.expect)(mockEnhancedLogger.logError).toHaveBeenCalledOnce();
        const lastCall = mockEnhancedLogger.logError.mock.lastCall;
        (0, vitest_1.expect)(lastCall).toBeDefined();
        (0, vitest_1.expect)(mockEnhancedLogger.logError).toHaveBeenCalledWith('testEnhancedErrorEvent', {
            properties: {
                ...commonTelemetryData.properties,
                unique_id: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.unique_id.value),
                copilot_version: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.copilot_version.value),
                editor_version: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.editor_version.value),
                common_vscodeversion: new telemetry_1.TelemetryTrustedValue(lastCall[1].properties.common_vscodeversion.value),
                stack: new telemetry_1.TelemetryTrustedValue('testStack'),
            },
            measurements: {
                ...commonTelemetryData.measurements,
                timeSinceIssuedMs: lastCall[1].measurements.timeSinceIssuedMs,
                statusCode: 502,
            }
        });
    });
    (0, vitest_1.test)('should send exception telemetry', () => {
        const error = new Error('testError');
        sender.sendExceptionTelemetry(error, 'testOrigin');
        (0, vitest_1.expect)(mockLogger.logUsage).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(mockEnhancedLogger.logError).toHaveBeenCalledOnce();
    });
    (0, vitest_1.test)('should dispose loggers and disposables', () => {
        sender.dispose();
        (0, vitest_1.expect)(mockLogger.dispose).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(mockEnhancedLogger.dispose).toHaveBeenCalledOnce();
    });
});
//# sourceMappingURL=telemetry.spec.js.map