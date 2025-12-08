"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryCorrelationId = exports.CallTracker = void 0;
const uuid_1 = require("../vs/base/common/uuid");
/**
 * Tracks a chain of calls for telemetry purposes.
 *
 * The list of callers is printed in reverse order, so the most recent caller is at the start.
 */
class CallTracker {
    static { this.joiner = ' <- '; }
    constructor(...parts) {
        this.value = parts.join(CallTracker.joiner);
    }
    toString() {
        return this.value;
    }
    toAscii() {
        return this.value.replace(/[\u{0080}-\u{FFFF}]/gu, '');
    }
    add(...parts) {
        return new CallTracker(...parts, this.value);
    }
}
exports.CallTracker = CallTracker;
class TelemetryCorrelationId {
    constructor(caller, correlationId) {
        if (caller instanceof CallTracker) {
            this.callTracker = caller;
        }
        else {
            this.callTracker = typeof caller === 'string' ? new CallTracker(caller) : new CallTracker(...caller);
        }
        this.correlationId = correlationId || (0, uuid_1.generateUuid)();
    }
    addCaller(...parts) {
        return new TelemetryCorrelationId(this.callTracker.add(...parts), this.correlationId);
    }
}
exports.TelemetryCorrelationId = TelemetryCorrelationId;
//# sourceMappingURL=telemetryCorrelationId.js.map