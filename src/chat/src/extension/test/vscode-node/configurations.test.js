"use strict";
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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("assert"));
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const configurationServiceImpl_1 = require("../../../platform/configuration/vscode/configurationServiceImpl");
const event_1 = require("../../../util/vs/base/common/event");
suite('Configuration Defaults', () => {
    let testObject;
    setup(() => {
        testObject = new configurationServiceImpl_1.ConfigurationServiceImpl({
            _serviceBrand: undefined,
            copilotToken: undefined,
            onDidStoreUpdate: event_1.Event.None
        });
    });
    teardown(() => testObject.dispose());
    test('default values of all advanced settings should match default values', () => {
        const advancedSettings = [
            ...Object.values(configurationService_1.ConfigKey.AdvancedExperimental),
            ...Object.values(configurationService_1.ConfigKey.AdvancedExperimentalExperiments)
        ];
        for (const setting of advancedSettings) {
            const actual = testObject.getConfig(setting);
            const expected = testObject.getDefaultValue(setting);
            assert.strictEqual(actual, expected, `Default value for ${setting.fullyQualifiedId} did not match`);
        }
    });
    test('default values of all internal settings', () => {
        const internalSettings = Object.values(configurationService_1.ConfigKey.Internal);
        for (const setting of internalSettings) {
            const actual = testObject.getConfig(setting);
            const expected = testObject.getDefaultValue(setting);
            assert.strictEqual(actual, expected, `Default value for ${setting.fullyQualifiedId} did not match`);
        }
    });
});
//# sourceMappingURL=configurations.test.js.map