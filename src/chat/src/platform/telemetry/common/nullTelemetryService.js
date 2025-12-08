"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullTelemetryService = void 0;
class NullTelemetryService {
    dispose() {
        return;
    }
    sendInternalMSFTTelemetryEvent(eventName, properties, measurements) {
        return;
    }
    sendMSFTTelemetryEvent(eventName, properties, measurements) {
        return;
    }
    sendMSFTTelemetryErrorEvent(eventName, properties, measurements) {
        return;
    }
    sendGHTelemetryEvent(eventName, properties, measurements) {
        return;
    }
    sendGHTelemetryErrorEvent(eventName, properties, measurements) {
        return;
    }
    sendGHTelemetryException(maybeError, origin) {
        return;
    }
    sendTelemetryEvent(eventName, destination, properties, measurements) {
        return;
    }
    sendTelemetryErrorEvent(eventName, destination, properties, measurements) {
        return;
    }
    setSharedProperty(name, value) {
        return;
    }
    setAdditionalExpAssignments(expAssignments) {
        return;
    }
    postEvent(eventName, props) {
        return;
    }
    sendEnhancedGHTelemetryEvent(eventName, properties, measurements) {
        return;
    }
    sendEnhancedGHTelemetryErrorEvent(eventName, properties, measurements) {
        return;
    }
}
exports.NullTelemetryService = NullTelemetryService;
//# sourceMappingURL=nullTelemetryService.js.map