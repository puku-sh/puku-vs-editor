"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseMsftTelemetrySender = void 0;
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
class BaseMsftTelemetrySender {
    constructor(copilotTokenStore, _createTelemetryReporter) {
        this._createTelemetryReporter = _createTelemetryReporter;
        this._disposables = new lifecycle_1.DisposableStore();
        this._vscodeTeamMember = false;
        this._isInternal = false;
        this._externalTelemetryReporter = this._createTelemetryReporter(false, false);
        this.processToken(copilotTokenStore.copilotToken);
        this._disposables.add(copilotTokenStore.onDidStoreUpdate(() => this.processToken(copilotTokenStore.copilotToken)));
    }
    /**
     * **NOTE**: Do not call directly
     * This is just used by the experimentation service to log events to the scorecards
     * @param eventName
     * @param props
     */
    postEvent(eventName, props) {
        const event = {};
        for (const [key, value] of props) {
            event[key] = value;
        }
        if (this._isInternal) {
            this.sendInternalTelemetryEvent(eventName, event);
        }
        this.sendTelemetryEvent(eventName, event);
    }
    /**
     * Sends a telemetry event regarding internal Microsoft staff only. Will be dropped if telemetry level is below Usage
     * @param eventName The name of the event to send
     * @param properties The properties to send
     * @param measurements The measurements (numerical values)
     * @returns
     */
    sendInternalTelemetryEvent(eventName, properties, measurements) {
        if (!this._internalTelemetryReporter) {
            return;
        }
        properties = { ...properties, 'common.tid': this._tid, 'common.userName': this._username ?? 'undefined' };
        measurements = { ...measurements, 'common.isVscodeTeamMember': this._vscodeTeamMember ? 1 : 0 };
        this._internalTelemetryReporter.sendRawTelemetryEvent(eventName, properties, measurements);
        if (this._internalLargeEventTelemetryReporter) { // Also duplicate events to the large data store for testing of the pipeline
            this._internalLargeEventTelemetryReporter.sendRawTelemetryEvent(eventName, properties, measurements);
        }
    }
    /**
     * Sends a telemetry event regarding external customers. Will be dropped if telemetry level is below Usage
     * @param eventName The name of the event to send
     * @param properties The properties to send
     * @param measurements The measurements (numerical values)
     */
    sendTelemetryEvent(eventName, properties, measurements) {
        // __GDPR__COMMON__ "common.tid" : { "endPoint": "GoogleAnalyticsId", "classification": "EndUserPseudonymizedInformation", "purpose": "BusinessInsight" }
        // __GDPR__COMMON__ "common.sku" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
        // __GDPR__COMMON__ "common.internal" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        properties = { ...properties, 'common.tid': this._tid ?? '', 'common.sku': this._sku ?? 'undefined' };
        if (this._isInternal) {
            measurements = { ...measurements, 'common.internal': 1 };
        }
        this._externalTelemetryReporter.sendTelemetryEvent(eventName, properties, measurements);
    }
    /**
     * Sends an error event as telemetry. Will be dropped if telemetry level is below Error
     * @param eventName The name of the event to send
     * @param properties The properties to send
     * @param measurements The measurements (numerical values)
     */
    sendTelemetryErrorEvent(eventName, properties, measurements) {
        // __GDPR__COMMON__ "common.tid" : { "endPoint": "GoogleAnalyticsID", "classification": "EndUserPseudonymizedInformation", "purpose": "BusinessInsight" }
        // __GDPR__COMMON__ "common.sku" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
        // __GDPR__COMMON__ "common.internal" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        properties = { ...properties, 'common.tid': this._tid ?? '', 'common.sku': this._sku ?? 'undefined' };
        if (this._isInternal) {
            measurements = { ...measurements, 'common.internal': 1 };
        }
        this._externalTelemetryReporter.sendTelemetryErrorEvent(eventName, properties, measurements);
    }
    dispose() {
        this._externalTelemetryReporter.dispose();
        this._internalTelemetryReporter?.dispose();
    }
    processToken(token) {
        this._username = token?.username;
        this._vscodeTeamMember = !!token?.isVscodeTeamMember;
        this._tid = token?.getTokenValue('tid');
        this._sku = token?.sku;
        this._isInternal = !!token?.isInternal;
        if (this._isInternal) {
            this._internalTelemetryReporter ??= this._createTelemetryReporter(true, false);
            this._internalLargeEventTelemetryReporter ??= this._createTelemetryReporter(true, true);
        }
        if (!token || !this._isInternal || !token.isChatEnabled()) {
            this._internalTelemetryReporter?.dispose();
            this._internalTelemetryReporter = undefined;
            this._internalLargeEventTelemetryReporter?.dispose();
            this._internalLargeEventTelemetryReporter = undefined;
            return;
        }
    }
}
exports.BaseMsftTelemetrySender = BaseMsftTelemetrySender;
//# sourceMappingURL=msftTelemetrySender.js.map