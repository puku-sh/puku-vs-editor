"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const docIntent_1 = require("../../src/extension/intents/node/docIntent");
const stest_1 = require("../base/stest");
const inlineChatSimulator_1 = require("../simulation/inlineChatSimulator");
const stestUtil_1 = require("../simulation/stestUtil");
const slashDoc_util_1 = require("./slashDoc.util");
function assertRubyDocComments(fileContents, line) {
    (0, slashDoc_util_1.assertDocLinesForInlineComments)(fileContents, line, '#');
}
(0, inlineChatSimulator_1.forInline)((strategy, nonExtensionConfigurations, suffix) => {
    (0, stest_1.ssuite)({ title: `/doc${suffix}`, language: 'ruby', location: 'inline' }, () => {
        (0, stest_1.stest)({ description: 'method', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('doc-ruby/fib.rb'),
                ],
                queries: [
                    {
                        file: 'fib.rb',
                        selection: [14, 26],
                        query: '/doc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            const fileContents = outcome.fileContents;
                            // assert it contains doc comments above
                            const lineWithCursor = '    def self.calculate_nth_number(n)';
                            assertRubyDocComments(fileContents, lineWithCursor);
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'long method', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('doc-ruby/fib.rb'),
                ],
                queries: [
                    {
                        file: 'fib.rb',
                        selection: [30, 33],
                        query: '/doc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            const fileContents = outcome.fileContents;
                            // assert it contains doc comments above
                            const lineWithCursor = '    def self.fibonacci_with_hardcoded_values(n)';
                            assertRubyDocComments(fileContents, lineWithCursor);
                        }
                    }
                ],
            });
        });
    });
});
//# sourceMappingURL=slashDoc.rb.stest.js.map