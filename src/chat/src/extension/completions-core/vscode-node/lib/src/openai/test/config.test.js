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
const expConfig_1 = require("../../experiments/expConfig");
const telemetry_1 = require("../../telemetry");
const context_1 = require("../../test/context");
const config_1 = require("../config");
suite('OpenAI Config Tests', function () {
    let accessor;
    setup(function () {
        accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
    });
    test('getEngineRequestInfo() returns the model from AvailableModelManager', function () {
        const telem = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
        telem.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.CustomEngine] = 'model.override';
        const info = (0, config_1.getEngineRequestInfo)(accessor, telem);
        assert.strictEqual(info.modelId, 'model.override');
        assert.deepStrictEqual(info.headers, {});
    });
});
//# sourceMappingURL=config.test.js.map