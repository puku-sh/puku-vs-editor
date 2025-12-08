"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldSkipAgentTests = shouldSkipAgentTests;
const path_1 = __importDefault(require("path"));
const stest_1 = require("../base/stest");
const toolSimTest_1 = require("./toolSimTest");
function shouldSkipAgentTests() {
    return process.env.AGENT_TESTS !== '1';
}
stest_1.ssuite.optional(shouldSkipAgentTests, { title: 'toolCalling', location: 'panel' }, (inputPath) => {
    const scenarioFolder = inputPath ?? path_1.default.join(__dirname, '..', 'test/scenarios/test-tools');
    const scenarios = (0, toolSimTest_1.fetchToolScenarios)(scenarioFolder);
    for (const scenario of scenarios) {
        (0, stest_1.stest)(scenario[0].question, (0, toolSimTest_1.generateToolTestRunner)(scenario));
    }
});
//# sourceMappingURL=tools.stest.js.map