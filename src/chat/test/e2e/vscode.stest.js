"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const stest_1 = require("../base/stest");
const validate_1 = require("../base/validate");
const scenarioLoader_1 = require("./scenarioLoader");
const scenarioTest_1 = require("./scenarioTest");
(0, stest_1.ssuite)({ title: '@vscode', location: 'panel' }, (inputPath) => {
    if (!inputPath) {
        return;
    }
    const scenarios = (0, scenarioLoader_1.discoverScenarios)(inputPath);
    for (const scenario of scenarios) {
        const fileName = scenario[0].name;
        const testName = inputPath ? fileName.substring(0, fileName.indexOf('.')) : scenario[0].question.replace('@vscode', '');
        (0, stest_1.stest)({ description: testName }, (0, scenarioTest_1.generateScenarioTestRunner)(scenario, async (accessor, question, answer, rawResponse, turn, scenarioIndex, commands) => {
            if (scenario[0].json.keywords !== undefined) {
                const err = (0, validate_1.validate)(rawResponse, scenario[0].json.keywords);
                if (err) {
                    return { success: false, errorMessage: err };
                }
                const showCommands = scenario[0].json.showCommand ?? true;
                if (showCommands && commands.length === 0) {
                    return { success: false, errorMessage: 'Response is missing required commands.' };
                }
                else if (!showCommands && commands.length > 0) {
                    return { success: false, errorMessage: 'Response includes commands that should not be present.' };
                }
                return { success: true, errorMessage: answer };
            }
            return { success: true, errorMessage: 'No requirements set for test.' };
        }));
    }
});
//# sourceMappingURL=vscode.stest.js.map