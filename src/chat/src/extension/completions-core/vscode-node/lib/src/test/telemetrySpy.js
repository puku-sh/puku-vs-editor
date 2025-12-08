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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetrySpy = void 0;
const assert = __importStar(require("assert"));
class TelemetrySpy {
    constructor() {
        this.events = [];
        this.errors = [];
    }
    sendTelemetryEvent(eventName, properties = {}, measurements = {}) {
        this.events.push({
            name: eventName,
            properties,
            measurements,
        });
    }
    sendTelemetryErrorEvent(eventName, properties = {}, measurements = {}, errorProps) {
        this.errors.push({
            name: eventName,
            properties,
            measurements,
            errorProps,
        });
    }
    sendTelemetryException(error, properties = {}, measurements = {}) {
        this.events.push({
            name: 'error.exception',
            properties: { message: error.message, ...properties },
            measurements,
        });
    }
    dispose() {
        return Promise.resolve();
    }
    get hasEvent() {
        return this.events.length > 0;
    }
    get hasError() {
        return this.errors.length > 0;
    }
    get exceptions() {
        return this.events.filter(e => e.name === 'error.exception');
    }
    get hasException() {
        return this.exceptions.length > 0;
    }
    get firstEvent() {
        return this.events[0];
    }
    get firstError() {
        return this.errors[0];
    }
    get firstException() {
        return this.exceptions[0];
    }
    eventsMatching(filter) {
        return this.events.filter(filter);
    }
    eventByName(name) {
        const candidates = this.events.filter(e => e.name === name);
        assert.strictEqual(candidates.length, 1, `Expected exactly one event with name ${name}`);
        return candidates[0];
    }
    errorsMatching(filter) {
        return this.errors.filter(filter);
    }
    exceptionsMatching(filter) {
        return this.exceptions.filter(filter);
    }
    // equivalent of assertHasProperty in testing/telemetry.ts
    assertHasProperty(assertion) {
        assert.ok(this.eventsMatching(e => e.name !== 'ghostText.produced').every(e => assertion(e.properties)));
    }
}
exports.TelemetrySpy = TelemetrySpy;
//# sourceMappingURL=telemetrySpy.js.map