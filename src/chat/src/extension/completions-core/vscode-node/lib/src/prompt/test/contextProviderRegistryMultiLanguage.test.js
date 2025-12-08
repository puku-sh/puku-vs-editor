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
const contextProviderRegistryMultiLanguage_1 = require("../contextProviderRegistryMultiLanguage");
suite('contextProviderRegistryMultiLanguage', function () {
    let activeExperiments;
    setup(function () {
        activeExperiments = new Map();
    });
    suite('getMultiLanguageContextProviderConfigFromActiveExperiments', function () {
        test('returns default config when no experiments are set', function () {
            const result = (0, contextProviderRegistryMultiLanguage_1.getMultiLanguageContextProviderParamsFromActiveExperiments)(new Map());
            assert.deepStrictEqual(result, contextProviderRegistryMultiLanguage_1.multiLanguageContextProviderParamsDefault);
        });
        test('overrides defaults with experiment values', function () {
            activeExperiments.set('mlcpMaxContextItems', '50');
            activeExperiments.set('mlcpMaxSymbolMatches', 30);
            activeExperiments.set('mlcpEnableImports', true);
            const result = (0, contextProviderRegistryMultiLanguage_1.getMultiLanguageContextProviderParamsFromActiveExperiments)(activeExperiments);
            assert.strictEqual(result.mlcpMaxContextItems, 50);
            assert.strictEqual(result.mlcpMaxSymbolMatches, 30);
            assert.strictEqual(result.mlcpEnableImports, true);
        });
        test('converts string values to appropriate types', function () {
            activeExperiments.set('mlcpMaxContextItems', '25');
            activeExperiments.set('mlcpEnableImports', 'true');
            const result = (0, contextProviderRegistryMultiLanguage_1.getMultiLanguageContextProviderParamsFromActiveExperiments)(activeExperiments);
            assert.strictEqual(result.mlcpMaxContextItems, 25);
            assert.strictEqual(result.mlcpEnableImports, true);
        });
        test('converts string values for false to appropriate types', function () {
            activeExperiments.set('mlcpMaxContextItems', '25');
            activeExperiments.set('mlcpEnableImports', 'false');
            const result = (0, contextProviderRegistryMultiLanguage_1.getMultiLanguageContextProviderParamsFromActiveExperiments)(activeExperiments);
            assert.strictEqual(result.mlcpMaxContextItems, 25);
            assert.strictEqual(result.mlcpEnableImports, false);
        });
        test('handles partial overrides', function () {
            activeExperiments.set('mlcpEnableImports', true);
            const result = (0, contextProviderRegistryMultiLanguage_1.getMultiLanguageContextProviderParamsFromActiveExperiments)(activeExperiments);
            assert.strictEqual(result.mlcpMaxContextItems, contextProviderRegistryMultiLanguage_1.multiLanguageContextProviderParamsDefault.mlcpMaxContextItems);
            assert.strictEqual(result.mlcpMaxSymbolMatches, contextProviderRegistryMultiLanguage_1.multiLanguageContextProviderParamsDefault.mlcpMaxSymbolMatches);
            assert.strictEqual(result.mlcpEnableImports, true);
        });
        test('converts falsy values correctly', function () {
            activeExperiments.set('mlcpMaxContextItems', 0);
            activeExperiments.set('mlcpEnableImports', false);
            const result = (0, contextProviderRegistryMultiLanguage_1.getMultiLanguageContextProviderParamsFromActiveExperiments)(activeExperiments);
            assert.strictEqual(result.mlcpMaxContextItems, 0);
            assert.strictEqual(result.mlcpEnableImports, false);
        });
        test('returns false for imports when not set', function () {
            const result = (0, contextProviderRegistryMultiLanguage_1.getMultiLanguageContextProviderParamsFromActiveExperiments)(activeExperiments);
            assert.strictEqual(result.mlcpEnableImports, false);
        });
    });
});
//# sourceMappingURL=contextProviderRegistryMultiLanguage.test.js.map