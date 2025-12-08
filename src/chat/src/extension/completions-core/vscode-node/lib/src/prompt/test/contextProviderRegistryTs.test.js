"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const telemetry_1 = require("../../telemetry");
const context_1 = require("../../test/context");
const contextProviderRegistryTs_1 = require("../contextProviderRegistryTs");
suite('contextProviderRegistryTs', function () {
    let accessor;
    let activeExperiments;
    let telemetryData;
    setup(function () {
        accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
        activeExperiments = new Map();
        telemetryData = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
        telemetryData.filtersAndExp.exp.variables['copilottscontextproviderparams'] = JSON.stringify({
            booleanProperty: true,
        });
    });
    test('does not add active experiments if no provider is active', function () {
        (0, contextProviderRegistryTs_1.fillInTsActiveExperiments)(accessor, [], activeExperiments, telemetryData);
        assert_1.default.ok(activeExperiments.size === 0);
    });
    test('adds active experiments if TS provider is active', function () {
        (0, contextProviderRegistryTs_1.fillInTsActiveExperiments)(accessor, [contextProviderRegistryTs_1.TS_CONTEXT_PROVIDER_ID], activeExperiments, telemetryData);
        assert_1.default.ok(activeExperiments.has('booleanProperty'));
        assert_1.default.strictEqual(activeExperiments.get('booleanProperty'), true);
    });
    test('adds active experiments in debug mode', function () {
        (0, contextProviderRegistryTs_1.fillInTsActiveExperiments)(accessor, ['*'], activeExperiments, telemetryData);
        assert_1.default.ok(activeExperiments.has('booleanProperty'));
        assert_1.default.strictEqual(activeExperiments.get('booleanProperty'), true);
    });
    test('bad JSON is ignored', function () {
        telemetryData.filtersAndExp.exp.variables['copilottscontextproviderparams'] = '{"badJSON": true';
        (0, contextProviderRegistryTs_1.fillInTsActiveExperiments)(accessor, [contextProviderRegistryTs_1.TS_CONTEXT_PROVIDER_ID], activeExperiments, telemetryData);
        assert_1.default.ok(activeExperiments.size === 0);
    });
});
//# sourceMappingURL=contextProviderRegistryTs.test.js.map