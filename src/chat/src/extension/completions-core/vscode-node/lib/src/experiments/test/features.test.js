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
const assert = __importStar(require("assert"));
const repository_1 = require("../../prompt/repository");
const telemetry_1 = require("../../telemetry");
const context_1 = require("../../test/context");
const uri_1 = require("../../util/uri");
const featuresService_1 = require("../featuresService");
suite('updateExPValuesAndAssignments', function () {
    let accessor;
    const filenameUri = (0, uri_1.makeFsUri)(__filename);
    setup(async function () {
        accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
        // Trigger extractRepoInfoInBackground early + add a sleep to force repo info to be available
        (0, repository_1.extractRepoInfoInBackground)(accessor, filenameUri);
        await new Promise(resolve => setTimeout(resolve, 100));
    });
    test('If no options are provided, repo filters should be empty and there should be no telemetry properties or measurements', async function () {
        const featuresService = accessor.get(featuresService_1.ICompletionsFeaturesService);
        const telemetry = await featuresService.updateExPValuesAndAssignments();
        assert.deepStrictEqual(telemetry.properties, {});
        assert.deepStrictEqual(telemetry.measurements, {});
        const filters = telemetry.filtersAndExp.filters.toHeaders();
        assert.deepStrictEqual(filters['X-Copilot-Repository'], undefined);
        assert.deepStrictEqual(filters['X-Copilot-FileType'], undefined);
    });
    test('If telemetry data is passed as a parameter, it should be used in the resulting telemetry object', async function () {
        const telemetryData = telemetry_1.TelemetryData.createAndMarkAsIssued({ foo: 'bar' }, { baz: 42 });
        const featuresService = accessor.get(featuresService_1.ICompletionsFeaturesService);
        const telemetry = await featuresService.updateExPValuesAndAssignments(undefined, telemetryData);
        assert.deepStrictEqual(telemetry.properties, { foo: 'bar' });
        assert.deepStrictEqual(telemetry.measurements, { baz: 42 });
        const filters = telemetry.filtersAndExp.filters.toHeaders();
        assert.deepStrictEqual(filters['X-Copilot-Repository'], undefined);
        assert.deepStrictEqual(filters['X-Copilot-FileType'], undefined);
    });
});
//# sourceMappingURL=features.test.js.map