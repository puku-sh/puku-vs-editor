"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const stest_1 = require("../base/stest");
const scenarioLoader_1 = require("./scenarioLoader");
const scenarioTest_1 = require("./scenarioTest");
function getFiles(answer) {
    const regex = /\#\#\s+(.*)\n/g;
    let match;
    const titles = [];
    while ((match = regex.exec(answer)) !== null) {
        titles.push(match[1].trim());
    }
    return [...new Set(titles)];
}
function expectedFileDoesMatch(files, target) {
    return files.some(e => {
        return e.trim().endsWith(target);
    });
}
function assertFilesMatch(expected, actual) {
    expected.forEach(e => {
        if (!expectedFileDoesMatch(actual, e)) {
            throw Error(`Cannot find match for expected file: ${e}. Instead got the following: \n-${actual.join('\n')}`);
        }
    });
}
(0, stest_1.ssuite)({ title: 'semanticSearch', location: 'panel' }, (inputPath) => {
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
            if (scenario[0].json.expectedRetrieval !== undefined) {
                const expected = scenario[0].json.expectedRetrieval;
                const actual = getFiles(answer);
                try {
                    assertFilesMatch(expected, actual);
                    return { success: true, errorMessage: answer };
                }
                catch (e) {
                    return { success: false, errorMessage: e.message };
                }
                // TODO: incorporate `keywords` into the test.
                // They should already be on the tests, but to test solely file retrieval first, we can ignore them for now.
            }
            return { success: false, errorMessage: 'expectedRetrieval not defined' };
        }));
    }
});
//# sourceMappingURL=semanticSearch.stest.js.map