"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const stest_1 = require("../base/stest");
const validate_1 = require("../base/validate");
const scenarioLoader_1 = require("./scenarioLoader");
const scenarioTest_1 = require("./scenarioTest");
(0, stest_1.ssuite)({ title: 'workspace', subtitle: 'e2e', location: 'panel' }, (inputPath) => {
    // No default cases checked in at the moment
    if (!inputPath) {
        return;
    }
    const scenariosFolder = inputPath;
    const scenarios = (0, scenarioLoader_1.discoverScenarios)(scenariosFolder);
    for (const scenario of scenarios) {
        const fileName = scenario[0].name;
        const testName = fileName.substring(0, fileName.indexOf('.'));
        stest_1.stest.optional(scenarioTest_1.shouldSkip.bind(undefined, scenario), { description: testName }, (0, scenarioTest_1.generateScenarioTestRunner)(scenario, async (accessor, question, answer) => {
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
//# sourceMappingURL=workspace-e2e.stest.js.map