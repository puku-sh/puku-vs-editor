"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseGHTelemetrySender = void 0;
const pathRedaction_1 = require("../../../util/common/pathRedaction");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const telemetry_1 = require("../common/telemetry");
const telemetryData_1 = require("../common/telemetryData");
class BaseGHTelemetrySender {
    constructor(tokenStore, _createTelemetryLogger, _configService, _telemetryConfig, _envService, _domainService) {
        this._createTelemetryLogger = _createTelemetryLogger;
        this._configService = _configService;
        this._telemetryConfig = _telemetryConfig;
        this._envService = _envService;
        this._domainService = _domainService;
        this._disposables = new lifecycle_1.DisposableStore();
        this._processToken(tokenStore.copilotToken);
        this._standardTelemetryLogger = this._createTelemetryLogger(false);
        this._disposables.add(tokenStore.onDidStoreUpdate(() => {
            const token = tokenStore.copilotToken;
            this._processToken(token);
        }));
        // Rebuild the loggers when the domains change as they need to send to new endpoints
        this._disposables.add(this._domainService.onDidChangeDomains(() => {
            this._standardTelemetryLogger.dispose();
            this._standardTelemetryLogger = this._createTelemetryLogger(false);
            if (this._enhancedTelemetryLogger) {
                this._enhancedTelemetryLogger.dispose();
                this._enhancedTelemetryLogger = this._createTelemetryLogger(true);
            }
        }));
    }
    _processToken(token) {
        if (!token) {
            if (this._enhancedTelemetryLogger) {
                this._enhancedTelemetryLogger.dispose();
                this._enhancedTelemetryLogger = undefined;
            }
        }
        if (token?.getTokenValue('rt') === '1') {
            this._enhancedTelemetryLogger = this._createTelemetryLogger(true);
        }
        else {
            if (this._enhancedTelemetryLogger) {
                this._enhancedTelemetryLogger.dispose();
            }
            this._enhancedTelemetryLogger = undefined;
        }
    }
    sendTelemetryEvent(eventName, properties, measurements) {
        this._standardTelemetryLogger.logUsage(eventName, this.markAsIssuedAndMakeReadyForSending(properties, measurements));
    }
    sendTelemetryErrorEvent(eventName, properties, measurements) {
        this._standardTelemetryLogger.logError(eventName, this.markAsIssuedAndMakeReadyForSending(properties, measurements));
    }
    sendEnhancedTelemetryEvent(eventName, properties, measurements) {
        if (this._enhancedTelemetryLogger) {
            this._enhancedTelemetryLogger?.logUsage(eventName, this.markAsIssuedAndMakeReadyForSending(properties, measurements));
        }
    }
    sendEnhancedTelemetryErrorEvent(eventName, properties, measurements) {
        if (this._enhancedTelemetryLogger) {
            this._enhancedTelemetryLogger?.logError(eventName, this.markAsIssuedAndMakeReadyForSending(properties, measurements));
        }
    }
    sendExceptionTelemetry(maybeError, origin) {
        const error = maybeError instanceof Error ? maybeError : new Error('Non-error thrown: ' + maybeError);
        const definedTelemetryDataStub = telemetryData_1.TelemetryData.createAndMarkAsIssued({
            origin: (0, pathRedaction_1.redactPaths)(origin),
            reason: this._enhancedTelemetryLogger ? 'Exception logged to enhanced telemetry' : 'Exception, not logged due to opt-out',
        });
        definedTelemetryDataStub.makeReadyForSending(this._configService, this._envService, this._telemetryConfig);
        // send a placeholder to standard ("insecure") telemetry
        this.sendTelemetryEvent('exception', definedTelemetryDataStub.properties, definedTelemetryDataStub.measurements);
        if (!this._enhancedTelemetryLogger) {
            return;
        }
        const definedTelemetryDataSecure = telemetryData_1.TelemetryData.createAndMarkAsIssued({ origin });
        definedTelemetryDataSecure.makeReadyForSending(this._configService, this._envService, this._telemetryConfig);
        // and the real error, which might contain arbitrary data, to enhanced telemetry.
        this._enhancedTelemetryLogger.logError(error, definedTelemetryDataSecure);
    }
    markAsIssuedAndMakeReadyForSending(properties, measurements) {
        const telemetryData = telemetryData_1.TelemetryData.createAndMarkAsIssued((0, telemetryData_1.eventPropertiesToSimpleObject)(properties), measurements);
        telemetryData.makeReadyForSending(this._configService, this._envService, this._telemetryConfig);
        const newPropeties = {};
        // This disables VS Code's default sanitization
        for (const key in telemetryData.properties) {
            newPropeties[key] = new telemetry_1.TelemetryTrustedValue(telemetryData.properties[key]);
        }
        return { properties: newPropeties, measurements: telemetryData.measurements };
    }
    dispose() {
        this._standardTelemetryLogger.dispose();
        this._disposables.dispose();
        if (this._enhancedTelemetryLogger) {
            this._enhancedTelemetryLogger.dispose();
        }
    }
}
exports.BaseGHTelemetrySender = BaseGHTelemetrySender;
//# sourceMappingURL=ghTelemetrySender.js.map