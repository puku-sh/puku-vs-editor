"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectCapturedTelemetry = collectCapturedTelemetry;
exports.isStandardTelemetryMessage = isStandardTelemetryMessage;
exports.isEnhancedTelemetryMessage = isEnhancedTelemetryMessage;
exports.isEvent = isEvent;
exports.isException = isException;
exports.allEvents = allEvents;
exports.withTelemetryCapture = withTelemetryCapture;
exports.assertHasProperty = assertHasProperty;
const assert_1 = __importDefault(require("assert"));
const configurationService_1 = require("../../configuration/common/configurationService");
const capiClient_1 = require("../../endpoint/common/capiClient");
const envService_1 = require("../../env/common/envService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const ghTelemetryService_1 = require("../../telemetry/common/ghTelemetryService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const azureInsights_1 = require("../../telemetry/node/azureInsights");
const telemetryFake_1 = require("./telemetryFake");
const copilotTokenStore_1 = require("../../authentication/common/copilotTokenStore");
async function collectCapturedTelemetry(capiClientService, fetcherService) {
    const url = capiClientService.copilotTelemetryURL;
    const response = await fetcherService.fetch(url, {});
    const messages = (await response.json()).messages ?? [];
    for (const message of messages) {
        assert_1.default.strictEqual(message.tags['ai.cloud.roleInstance'], 'REDACTED');
    }
    return messages;
}
function isStandardTelemetryMessage(message) {
    return message.iKey === azureInsights_1.APP_INSIGHTS_KEY_STANDARD;
}
function isEnhancedTelemetryMessage(message) {
    return message.iKey === azureInsights_1.APP_INSIGHTS_KEY_ENHANCED;
}
function isEvent(message) {
    return message.data.baseType === 'EventData';
}
function isException(message) {
    return message.data.baseType === 'ExceptionData';
}
function allEvents(messages) {
    for (const message of messages) {
        if (!isEvent(message)) {
            return false;
        }
    }
    return true;
}
async function withTelemetryCapture(testingServiceCollection, work) {
    return _withTelemetryCapture(testingServiceCollection, true, work);
}
async function _withTelemetryCapture(_testingServiceCollection, forceTelemetry, work) {
    const fakeTelemetryServer = await (0, telemetryFake_1.startFakeTelemetryServerIfNecessary)();
    const extensionId = 'copilot-test';
    // Using a random endpoint URL avoids collisions with other tests.
    // At present the tests run serially and _should_ flush the captured messages after each call,
    // so this shouldn't be strictly necessary, but it makes things more robust.
    const endpoint = Math.floor(Math.random() * 100000).toString();
    // ensure we don't have a proxy setup in place from other tests
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    const telemetryUrl = `http://localhost:${fakeTelemetryServer.port}/${endpoint}`;
    const testingServiceCollection = _testingServiceCollection.clone();
    testingServiceCollection.define(capiClient_1.ICAPIClientService, {
        copilotTelemetryURL: telemetryUrl,
        _serviceBrand: undefined,
        _domainService: undefined,
        _fetcherService: undefined,
        updateDomains: function (copilotToken, enterpriseUrlConfig) {
            throw new Error('Function not implemented.');
        },
        makeRequest: function (request, requestMetadata) {
            throw new Error('Function not implemented.');
        }
    });
    const accessor = testingServiceCollection.createTestingAccessor();
    const ghTelemetry = new ghTelemetryService_1.GHTelemetryService(true, accessor.get(configurationService_1.IConfigurationService), accessor.get(envService_1.IEnvService), accessor.get(telemetry_1.ITelemetryUserConfig));
    await ghTelemetry.enablePromiseTracking(true);
    await (0, azureInsights_1.setupGHTelemetry)(ghTelemetry, accessor.get(capiClient_1.ICAPIClientService), accessor.get(envService_1.IEnvService), accessor.get(copilotTokenStore_1.ICopilotTokenStore), extensionId, forceTelemetry);
    try {
        const result = await work(accessor);
        await ghTelemetry.deactivate(); // awaits all open promises and flushes the events
        const messages = await collectMessagesWithRetry(accessor.get(capiClient_1.ICAPIClientService), accessor.get(fetcherService_1.IFetcherService));
        return [messages, result];
    }
    finally {
        fakeTelemetryServer.stop();
    }
}
async function collectMessagesWithRetry(capiClientService, fetcherService) {
    for (let waitTimeMultiplier = 0; waitTimeMultiplier < 3; waitTimeMultiplier++) {
        // race condition between test and telemetry server, wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, waitTimeMultiplier * 1000));
        const messages = await collectCapturedTelemetry(capiClientService, fetcherService);
        if (messages.length > 0) {
            return messages;
        }
        console.warn('Retrying to collect telemetry messages #' + waitTimeMultiplier + 1);
    }
    return [];
}
function assertHasProperty(messages, assertion) {
    assert_1.default.ok(messages
        .filter(message => message.data.baseData.name.split('/')[1] !== 'ghostText.produced')
        .every(message => {
        const props = message.data.baseData.properties;
        return assertion.call(props, props);
    }));
}
//# sourceMappingURL=telemetry.js.map