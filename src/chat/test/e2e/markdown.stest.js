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
const path = __importStar(require("path"));
const markdown_1 = require("../../src/util/common/markdown");
const stest_1 = require("../base/stest");
const scenarioLoader_1 = require("./scenarioLoader");
const scenarioTest_1 = require("./scenarioTest");
(function () {
    (0, stest_1.ssuite)({ title: 'generate', subtitle: 'markdown', location: 'panel' }, (inputPath) => {
        const scenarioFolder = inputPath ?? path.join(__dirname, '..', 'test/scenarios/test-generate-markdown');
        const scenarios = (0, scenarioLoader_1.fetchConversationScenarios)(scenarioFolder);
        // Dynamically create a test case per each entry in the scenarios array
        for (let i = 0; i < scenarios.length; i++) {
            const scenario = scenarios[i][0];
            (0, stest_1.stest)({ description: scenario.name, language: 'markdown' }, (0, scenarioTest_1.generateScenarioTestRunner)(scenarios[i], async (accessor, question, response) => {
                const codeBlock = (0, markdown_1.extractCodeBlocks)(response).at(0);
                if (!codeBlock || codeBlock.language !== 'markdown') {
                    return { success: false, errorMessage: 'No markdown code block found in response' };
                }
                if (codeBlock.startMarkup !== '````') {
                    return { success: false, errorMessage: 'Did not use 4 backticks' };
                }
                return { success: true };
            }));
        }
    });
})();
//# sourceMappingURL=markdown.stest.js.map