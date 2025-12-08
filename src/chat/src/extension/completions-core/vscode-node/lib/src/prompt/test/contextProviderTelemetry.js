"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertContextProviderTelemetry = assertContextProviderTelemetry;
const assert_1 = __importDefault(require("assert"));
function assertContextProviderTelemetry(actualContextProviderTelemetryJson, expectedContextProviderTelemetry) {
    const parsedContextProviderTelemetry = JSON.parse(actualContextProviderTelemetryJson);
    // Assert that timing information is present
    parsedContextProviderTelemetry.map(t => {
        assert_1.default.ok(t.resolutionTimeMs >= 0);
    });
    // Assert the rest of the telemetry (without timing) matches
    assert_1.default.deepStrictEqual(parsedContextProviderTelemetry.map(t => {
        const { resolutionTimeMs, ...rest } = t;
        return rest;
    }), expectedContextProviderTelemetry);
}
//# sourceMappingURL=contextProviderTelemetry.js.map