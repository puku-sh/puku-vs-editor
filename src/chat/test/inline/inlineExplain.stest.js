"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert_1 = __importDefault(require("assert"));
const stest_1 = require("../base/stest");
const inlineChatSimulator_1 = require("../simulation/inlineChatSimulator");
const stestUtil_1 = require("../simulation/stestUtil");
(0, stest_1.ssuite)({ title: 'explain', location: 'inline' }, () => {
    (0, stest_1.stest)({ description: 'is not distracted by project context', language: 'css' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [
                (0, stestUtil_1.fromFixture)('explain-project-context/inlineChat.css'),
                (0, stestUtil_1.fromFixture)('explain-project-context/package.json'),
                (0, stestUtil_1.fromFixture)('explain-project-context/tsconfig.json'),
            ],
            queries: [
                {
                    file: 'inlineChat.css',
                    selection: [152, 0, 158, 1],
                    query: 'explain',
                    expectedIntent: "explain" /* Intent.Explain */,
                    validate: async (outcome, workspace, accessor) => {
                        (0, stestUtil_1.assertConversationalOutcome)(outcome);
                        const css = outcome.chatResponseMarkdown.indexOf('CSS');
                        assert_1.default.ok(css >= 0, "Explanation did not mention CSS");
                    }
                }
            ],
        });
    });
});
//# sourceMappingURL=inlineExplain.stest.js.map