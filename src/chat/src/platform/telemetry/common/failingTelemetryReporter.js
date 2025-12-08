"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailingTelemetryReporter = void 0;
class FailingTelemetryReporter {
    sendEventData(eventName, data) {
        throw new Error('Telemetry disabled');
    }
    sendErrorData(error, data) {
        throw new Error('Telemetry disabled');
    }
    flush() {
        return Promise.resolve();
    }
}
exports.FailingTelemetryReporter = FailingTelemetryReporter;
//# sourceMappingURL=failingTelemetryReporter.js.map