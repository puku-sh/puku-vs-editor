"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GHTelemetryService = void 0;
const pathRedaction_1 = require("../../../util/common/pathRedaction");
const configurationService_1 = require("../../configuration/common/configurationService");
const envService_1 = require("../../env/common/envService");
const failingTelemetryReporter_1 = require("./failingTelemetryReporter");
const telemetry_1 = require("./telemetry");
const telemetryData_1 = require("./telemetryData");
// A container for the secure and insecure reporters
class TelemetryReporters {
    getReporter(telemetryUserConfig, isTest, secure) {
        if (!secure) {
            return this.reporter;
        }
        // Callers should do this check themselves as they may need to behave differently
        // if we are not sending enhanced telemetry. The guard here is a backstop.
        // Note: if the decision about what telemetry to send when the user is opted-out
        // becomes more nuanced, we may need to drop this backstop.
        if (shouldSendEnhancedTelemetry(telemetryUserConfig)) {
            return this.reporterSecure;
        }
        if (isTest) {
            return new failingTelemetryReporter_1.FailingTelemetryReporter();
        }
        return undefined;
    }
    setReporter(reporter) {
        this.reporter = reporter;
    }
    setSecureReporter(reporter) {
        this.reporterSecure = reporter;
    }
    async deactivate() {
        // This will ensure all pending events get flushed
        let disposeReporter = Promise.resolve();
        if (this.reporter) {
            disposeReporter = this.reporter.flush ? this.reporter.flush() : undefined;
            this.reporter = undefined;
        }
        let disposeReporterSecure = Promise.resolve();
        if (this.reporterSecure) {
            disposeReporterSecure = this.reporterSecure.flush ? this.reporterSecure.flush() : undefined;
            this.reporterSecure = undefined;
        }
        await Promise.all([disposeReporter, disposeReporterSecure]);
    }
}
let GHTelemetryService = class GHTelemetryService {
    constructor(_isRunningTests, _configService, _envService, _telemetryUserConfig) {
        this._isRunningTests = _isRunningTests;
        this._configService = _configService;
        this._envService = _envService;
        this._telemetryUserConfig = _telemetryUserConfig;
        this.reporters = new TelemetryReporters();
        this.openPromises = undefined;
    }
    withPromise(promise) {
        if (this.openPromises) {
            this.openPromises.add(promise);
            return promise.then(_ => {
                this.openPromises?.delete(promise);
            });
        }
        return promise;
    }
    async enablePromiseTracking(enable) {
        if (enable) {
            if (!this.openPromises) {
                this.openPromises = new Set();
            }
        }
        else {
            await this.awaitOpenPromises(undefined);
        }
    }
    setSecureReporter(reporterSecure) {
        this.reporters.setSecureReporter(reporterSecure);
    }
    setReporter(reporter) {
        this.reporters.setReporter(reporter);
    }
    async sendTelemetry(name, telemetryData) {
        await this.withPromise(this._sendTelemetry(name, telemetryData, false));
    }
    async sendErrorTelemetry(name, telemetryData) {
        await this.withPromise(this._sendErrorTelemetry(name, telemetryData, false));
    }
    async sendEnhancedTelemetry(name, telemetryData) {
        await this.withPromise(this._sendTelemetry(name, telemetryData, true));
    }
    async sendEnhancedErrorTelemetry(name, telemetryData) {
        await this.withPromise(this._sendErrorTelemetry(name, telemetryData, true));
    }
    async sendExpProblemTelemetry(telemetryProperties) {
        await this.withPromise(this._sendExpProblemTelemetry(telemetryProperties));
    }
    async sendExceptionTelemetry(maybeError, origin) {
        await this.withPromise(this._sendExceptionTelemetry(maybeError, origin));
    }
    async deactivate() {
        await this.awaitOpenPromises(new Set());
        await this.reporters.deactivate();
    }
    async awaitOpenPromises(newValue) {
        if (this.openPromises) {
            const openPromises = [...this.openPromises.values()];
            this.openPromises = newValue;
            await Promise.all(openPromises);
        }
    }
    async _sendTelemetry(name, telemetryData, secure) {
        if (secure && !shouldSendEnhancedTelemetry(this._telemetryUserConfig)) {
            return;
        }
        // if telemetry data isn't given, make a new one to hold at least the config
        const definedTelemetryData = telemetryData || telemetryData_1.TelemetryData.createAndMarkAsIssued({}, {});
        definedTelemetryData.makeReadyForSending(this._configService, this._envService, this._telemetryUserConfig);
        this.sendTelemetryEvent(secure ?? false, name, definedTelemetryData);
    }
    async _sendExpProblemTelemetry(telemetryProperties) {
        const name = 'expProblem';
        const definedTelemetryData = telemetryData_1.TelemetryData.createAndMarkAsIssued(telemetryProperties, {});
        definedTelemetryData.makeReadyForSending(this._configService, this._envService, this._telemetryUserConfig);
        this.sendTelemetryEvent(false /* not secure */, name, definedTelemetryData);
    }
    async _sendExceptionTelemetry(maybeError, origin) {
        const error = maybeError instanceof Error ? maybeError : new Error('Non-error thrown: ' + maybeError);
        const sendEnhanced = shouldSendEnhancedTelemetry(this._telemetryUserConfig);
        const definedTelemetryDataStub = telemetryData_1.TelemetryData.createAndMarkAsIssued({
            origin: (0, pathRedaction_1.redactPaths)(origin),
            reason: sendEnhanced ? 'Exception logged to enhanced telemetry' : 'Exception, not logged due to opt-out',
        });
        definedTelemetryDataStub.makeReadyForSending(this._configService, this._envService, this._telemetryUserConfig);
        // send a placeholder to standard ("insecure") telemetry
        this.sendTelemetryEvent(false /* not secure */, 'exception', definedTelemetryDataStub);
        if (!sendEnhanced) {
            return;
        }
        const definedTelemetryDataSecure = telemetryData_1.TelemetryData.createAndMarkAsIssued({ origin });
        definedTelemetryDataSecure.makeReadyForSending(this._configService, this._envService, this._telemetryUserConfig);
        // and the real error, which might contain arbitrary data, to enhanced telemetry.
        // We have previously observed paths and other potential PII in
        //  - arbitrary unhandled exceptions coming from other extensions in the VSCode extension
        //  - fields inserted into the data sent by `sendTelemetryException` in `vscode-extension-telementry` like `Assembly`,
        this.sendTelemetryException(true /* secure */, error, definedTelemetryDataSecure);
    }
    async _sendErrorTelemetry(name, telemetryData, secure) {
        if (secure && !shouldSendEnhancedTelemetry(this._telemetryUserConfig)) {
            return;
        }
        const definedTelemetryData = telemetryData || telemetryData_1.TelemetryData.createAndMarkAsIssued({}, {});
        definedTelemetryData.makeReadyForSending(this._configService, this._envService, this._telemetryUserConfig);
        this.sendTelemetryErrorEvent(secure ?? false, name, definedTelemetryData);
    }
    // helpers
    sendTelemetryEvent(secure, name, data) {
        const reporter = this.reporters.getReporter(this._telemetryUserConfig, this._isRunningTests, secure);
        if (reporter) {
            const props = telemetryData_1.TelemetryData.maybeRemoveRepoInfoFromPropertiesHack(secure, data.properties);
            reporter.sendEventData(name, { ...props, ...data.measurements });
        }
    }
    sendTelemetryException(secure, error, data) {
        const reporter = this.reporters.getReporter(this._telemetryUserConfig, this._isRunningTests, secure);
        if (reporter) {
            const props = telemetryData_1.TelemetryData.maybeRemoveRepoInfoFromPropertiesHack(secure, data.properties);
            reporter.sendErrorData(error, { ...props, ...data.measurements });
        }
    }
    sendTelemetryErrorEvent(secure, name, data) {
        const reporter = this.reporters.getReporter(this._telemetryUserConfig, this._isRunningTests, secure);
        if (reporter) {
            const props = telemetryData_1.TelemetryData.maybeRemoveRepoInfoFromPropertiesHack(secure, data.properties);
            reporter.sendEventData(name, { ...props, ...data.measurements });
        }
    }
};
exports.GHTelemetryService = GHTelemetryService;
exports.GHTelemetryService = GHTelemetryService = __decorate([
    __param(1, configurationService_1.IConfigurationService),
    __param(2, envService_1.IEnvService),
    __param(3, telemetry_1.ITelemetryUserConfig)
], GHTelemetryService);
function shouldSendEnhancedTelemetry(telemetryUserConfig) {
    return telemetryUserConfig.optedIn;
}
//# sourceMappingURL=ghTelemetryService.js.map