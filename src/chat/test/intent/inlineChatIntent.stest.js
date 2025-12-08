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
const fs = __importStar(require("fs"));
const path_1 = require("path");
const docIntent_1 = require("../../src/extension/intents/node/docIntent");
const editCodeIntent_1 = require("../../src/extension/intents/node/editCodeIntent");
const generateCodeIntent_1 = require("../../src/extension/intents/node/generateCodeIntent");
const commonTypes_1 = require("../../src/platform/chat/common/commonTypes");
const stest_1 = require("../base/stest");
const inlineChatSimulator_1 = require("../simulation/inlineChatSimulator");
const stestUtil_1 = require("../simulation/stestUtil");
const intentTest_1 = require("./intentTest");
(0, stest_1.ssuite)({ title: 'intent', location: 'inline' }, () => {
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'convert',
        query: 'convert private property to lowercase',
        expectedIntent: editCodeIntent_1.EditCodeIntent.ID,
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'log to console',
        query: 'log to console in case the action is missing',
        // Actually gives Explain
        expectedIntent: [editCodeIntent_1.EditCodeIntent.ID, generateCodeIntent_1.GenerateCodeIntent.ID],
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'add a cat',
        query: 'Add a cat to this comment',
        // Actually gives Unknown
        expectedIntent: [editCodeIntent_1.EditCodeIntent.ID, generateCodeIntent_1.GenerateCodeIntent.ID],
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'make simpler',
        query: 'make simpler',
        expectedIntent: [editCodeIntent_1.EditCodeIntent.ID, "fix" /* Intent.Fix */],
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'add comment',
        query: 'add comment',
        expectedIntent: docIntent_1.InlineDocIntent.ID,
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'generate',
        query: 'generate a nodejs server that responds with "Hello World"',
        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'rewrite',
        query: 'Rewrite the selection to use async/await',
        expectedIntent: editCodeIntent_1.EditCodeIntent.ID,
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'write jsdoc',
        query: 'write a jsdoc comment',
        expectedIntent: docIntent_1.InlineDocIntent.ID,
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'print',
        query: 'print seconds in a week',
        expectedIntent: [editCodeIntent_1.EditCodeIntent.ID, generateCodeIntent_1.GenerateCodeIntent.ID],
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'add a column to dataframe',
        query: 'add a new column called adjusted to the dataframe and set it to the value of the activity column minus 2',
        expectedIntent: [editCodeIntent_1.EditCodeIntent.ID, generateCodeIntent_1.GenerateCodeIntent.ID],
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'plot dataframe',
        query: 'plot the data frame',
        expectedIntent: [editCodeIntent_1.EditCodeIntent.ID, generateCodeIntent_1.GenerateCodeIntent.ID],
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'add test',
        query: 'add another test for containsUppercaseCharacter with other non latin chars',
        expectedIntent: 'tests',
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'add types',
        query: 'Add types to `reviewRequiredCheck`',
        expectedIntent: [editCodeIntent_1.EditCodeIntent.ID, generateCodeIntent_1.GenerateCodeIntent.ID],
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'issue #1126: expand comments',
        query: 'Expand comments to a full paragraph`',
        expectedIntent: [editCodeIntent_1.EditCodeIntent.ID, generateCodeIntent_1.GenerateCodeIntent.ID],
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'issue #1126: change to GDPR',
        query: 'change to GDPR documentation`',
        expectedIntent: [editCodeIntent_1.EditCodeIntent.ID, generateCodeIntent_1.GenerateCodeIntent.ID],
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: `create a vscode launch task`,
        query: `create a launch task that invokes MOCHA_GREP='Edit Generation' make test-extension`,
        expectedIntent: [editCodeIntent_1.EditCodeIntent.ID, generateCodeIntent_1.GenerateCodeIntent.ID],
    });
    (0, intentTest_1.generateIntentTest)({
        location: commonTypes_1.ChatLocation.Editor,
        name: 'create basic jest config',
        query: 'create basic jest config',
        expectedIntent: [generateCodeIntent_1.GenerateCodeIntent.ID],
    });
    const additionalCases = JSON.parse(fs.readFileSync((0, path_1.join)(__dirname, '../test/intent/inline-chat.json'), { encoding: 'utf8' }));
    if (additionalCases && Array.isArray(additionalCases)) {
        additionalCases.forEach((testCase) => {
            if (typeof testCase === 'object' && !!testCase && testCase['Location'] === 'inline') {
                const query = testCase['Request'];
                (0, intentTest_1.generateIntentTest)({ location: commonTypes_1.ChatLocation.Editor, name: query.split('\n')[0], query, expectedIntent: testCase['Intent'] });
            }
        });
    }
    (0, stest_1.stest)('/tests cannot be intent-detected', (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fibonacci.ipynb')],
            queries: [
                {
                    file: 'fibonacci.ipynb',
                    activeCell: 0,
                    selection: [0, 9],
                    query: 'generate tests',
                    expectedIntent: 'generate',
                    validate: async (outcome, workspace, accessor) => {
                        // @ulugbekna: left empty on purpose
                    }
                }
            ]
        });
    });
});
//# sourceMappingURL=inlineChatIntent.stest.js.map