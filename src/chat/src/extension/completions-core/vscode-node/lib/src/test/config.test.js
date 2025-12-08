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
const config_1 = require("../config");
suite('getConfig', function () {
    for (const key of Object.values(config_1.ConfigKey)) {
        test(`has default for ${key}`, function () {
            // No news is good news
            (0, config_1.getConfigDefaultForKey)(key);
        });
    }
});
suite('getConfigKeyRecursively', function () {
    test('handles arbitrary dots', function () {
        const config = {
            'a.b.c': { 'd.e': 'value' },
        };
        assert.strictEqual((0, config_1.getConfigKeyRecursively)(config, 'a.b.c.d.e'), 'value');
    });
});
suite('InMemoryConfigProvider', function () {
    test('allows setting and getting config values', function () {
        const configProvider = new config_1.InMemoryConfigProvider(new config_1.DefaultsOnlyConfigProvider());
        configProvider.setConfig(config_1.ConfigKey.DebugOverrideEngine, 'test');
        assert.strictEqual(configProvider.getConfig(config_1.ConfigKey.DebugOverrideEngine), 'test');
    });
});
//# sourceMappingURL=config.test.js.map