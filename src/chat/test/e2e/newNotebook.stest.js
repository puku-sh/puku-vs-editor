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
const stest_1 = require("../base/stest");
const scenarioLoader_1 = require("./scenarioLoader");
const scenarioTest_1 = require("./scenarioTest");
(function () {
    stest_1.ssuite.skip({ title: 'newNotebook', subtitle: 'e2e', location: 'panel' }, (inputPath) => {
        const scenarioFolder = inputPath ?? path.join(__dirname, '..', 'test/scenarios/test-new-notebooks');
        const scenarios = (0, scenarioLoader_1.fetchConversationScenarios)(scenarioFolder);
        for (const scenario of scenarios) {
            (0, stest_1.stest)({ description: scenario[0].question.replace('/newNotebook ', ''), language: 'python' }, (0, scenarioTest_1.generateScenarioTestRunner)(scenario, (accessor, question, userVisibleAnswer, rawResponse, index, turn, commands) => {
                // TODO@rebornix: test if response contains the outline for notebook in a code block
                for (const command of commands) {
                    if (command.command === 'github.copilot.newNotebook') {
                        return Promise.resolve({ success: true, errorMessage: '' });
                    }
                }
                return Promise.resolve({ success: false, errorMessage: 'Fail to parse newNotebook response' });
            }));
        }
    });
})();
//# sourceMappingURL=newNotebook.stest.js.map