"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpyingTelemetryService = void 0;
class SpyingTelemetryService {
    constructor() {
        this.telemetryServiceEvents = [];
        this.telemetrySenderEvents = [];
    }
    dispose() {
        return;
    }
    sendInternalMSFTTelemetryEvent(eventName, properties, measurements) {
        this.addEvent("internal" /* TelemetryServiceEventType.internal */, eventName, properties, measurements);
    }
    sendMSFTTelemetryEvent(eventName, properties, measurements) {
        this.addEvent("default" /* TelemetryServiceEventType.default */, eventName, properties, measurements);
    }
    sendMSFTTelemetryErrorEvent(eventName, properties, measurements) {
        this.addEvent("error" /* TelemetryServiceEventType.error */, eventName, properties, measurements);
    }
    sendGHTelemetryEvent(eventName, properties, measurements) {
        this.addEvent("default" /* TelemetryServiceEventType.default */, eventName, properties, measurements);
    }
    sendEnhancedGHTelemetryEvent(eventName, properties, measurements) {
        this.addEvent("internal" /* TelemetryServiceEventType.internal */, eventName, properties, measurements);
    }
    sendEnhancedGHTelemetryErrorEvent(eventName, properties, measurements) {
        this.addEvent("internal" /* TelemetryServiceEventType.internal */, eventName, properties, measurements);
    }
    sendGHTelemetryErrorEvent(eventName, properties, measurements) {
        this.addEvent("error" /* TelemetryServiceEventType.error */, eventName, properties, measurements);
    }
    sendGHTelemetryException(maybeError, origin) {
        this.addEvent("error" /* TelemetryServiceEventType.error */, 'exception', { origin, error: String(maybeError) });
    }
    sendInternalTelemetryEvent(eventName, properties, measurements) {
        this.addEvent("internal" /* TelemetryServiceEventType.internal */, eventName, properties, measurements);
    }
    postEvent(eventName, props) {
        // Do nothing
    }
    setSharedProperty(name, value) {
        // Do nothing
    }
    setAdditionalExpAssignments(expAssignments) {
        // Do nothing
    }
    sendTelemetryErrorEvent(eventName, destination, properties, measurements) {
        this.addEvent("error" /* TelemetryServiceEventType.error */, eventName, properties, measurements);
    }
    sendTelemetryEvent(eventName, destination, properties, measurements) {
        this.addEvent("default" /* TelemetryServiceEventType.default */, eventName, properties, measurements);
    }
    addEvent(eventType, eventName, properties, measurements) {
        {
            // create a copy, in case the caller modifies the object after calling this method
            this.telemetryServiceEvents.push({
                eventType,
                eventName,
                properties: properties ? { ...properties } : undefined,
                measurements: measurements ? { ...measurements } : undefined
            });
        }
    }
    installSpyingSenders(ghTelemetry) {
        const senderEvents = this.telemetrySenderEvents;
        const getSender = (eventType) => ({
            sendEventData(eventName, data) {
                senderEvents.push({ eventType, eventName, data: { ...data } });
            },
            sendErrorData(error, data) {
                senderEvents.push({ eventType, eventName: error.message || error.toString(), data });
            }
        });
        ghTelemetry.setReporter(getSender("insecure" /* TelemetrySenderEventType.insecure */));
        ghTelemetry.setSecureReporter(getSender("secure" /* TelemetrySenderEventType.secure */));
    }
    getEvents() {
        return {
            telemetryServiceEvents: this.telemetryServiceEvents,
            telemetrySenderEvents: this.telemetrySenderEvents
        };
    }
    getFilteredEvents(eventNames) {
        const set = new Set(Object.keys(eventNames));
        return this.telemetryServiceEvents.filter(e => set.has(e.eventName));
    }
}
exports.SpyingTelemetryService = SpyingTelemetryService;
//# sourceMappingURL=spyingTelemetryService.js.map