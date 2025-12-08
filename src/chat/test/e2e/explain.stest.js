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
const path = __importStar(require("path"));
const languages_1 = require("../../src/util/common/languages");
const stest_1 = require("../base/stest");
const validate_1 = require("../base/validate");
const scenarioLoader_1 = require("./scenarioLoader");
const scenarioTest_1 = require("./scenarioTest");
(0, stest_1.ssuite)({ title: 'explain', subtitle: 'expanded context', location: 'panel' }, (inputPath) => {
    const scenarioFolder = inputPath ?? path.join(__dirname, '..', 'test/scenarios/test-explain');
    const scenarios = (0, scenarioLoader_1.fetchConversationScenarios)(scenarioFolder);
    for (const scenario of scenarios) {
        const language = scenario[0].getState?.().activeTextEditor?.document.languageId;
        (0, stest_1.stest)({ description: scenario[0].json.description ?? scenario[0].question.replace('/explain', ''), language: language ? (0, languages_1.getLanguage)(language).languageId : undefined }, (0, scenarioTest_1.generateScenarioTestRunner)(scenario, async (accessor, question, answer) => {
            // Answers should not contain speculation
            const containsSpeculation = (0, validate_1.validate)(answer, [{ not: [{ anyOf: ['presumably', 'unclear'] }] }]);
            if (containsSpeculation) {
                return { success: false, errorMessage: 'Answer contained speculation about current selection' };
            }
            if (scenario[0].json.keywords !== undefined) {
                const err = (0, validate_1.validate)(answer, scenario[0].json.keywords);
                if (err) {
                    return { success: false, errorMessage: err };
                }
                return { success: true, errorMessage: answer };
            }
            return { success: true, errorMessage: 'No requirements set for test.' };
        }));
    }
});
//# sourceMappingURL=explain.stest.js.map