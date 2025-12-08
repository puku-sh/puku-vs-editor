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
const assert = __importStar(require("assert"));
const docIntent_1 = require("../../src/extension/intents/node/docIntent");
const stest_1 = require("../base/stest");
const inlineChatSimulator_1 = require("../simulation/inlineChatSimulator");
const stestUtil_1 = require("../simulation/stestUtil");
const slashDoc_util_1 = require("./slashDoc.util");
(0, inlineChatSimulator_1.forInline)((strategy, nonExtensionConfigurations, suffix) => {
    (0, stest_1.ssuite)({ title: `/doc${suffix}`, language: 'java', location: 'inline' }, () => {
        (0, stest_1.stest)({ description: 'class', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('tlaplus/toolbox/org.lamport.tla.toolbox.doc/src/org/lamport/tla/toolbox/doc/HelpActivator.java'),
                ],
                queries: [
                    {
                        file: 'HelpActivator.java',
                        selection: [30, 21],
                        query: '/doc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            const fileContents = outcome.fileContents;
                            // no duplication of declaration
                            assert.strictEqual([...fileContents.matchAll(/class HelpActivator/g)].length, 1);
                            // no block bodies with a single comment
                            assert.strictEqual([...fileContents.matchAll(/\/\/ \.\.\./g)].length, 0, 'no // ...');
                            assert.strictEqual([...fileContents.matchAll(/details|implementation/g)].length, 1);
                            // assert it contains doc comments above
                            const lineWithCursor = 'public class HelpActivator';
                            (0, slashDoc_util_1.assertDocLines)(fileContents, lineWithCursor);
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'method', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('tlaplus/toolbox/org.lamport.tla.toolbox.doc/src/org/lamport/tla/toolbox/doc/HelpActivator.java'),
                ],
                queries: [
                    {
                        file: 'HelpActivator.java',
                        selection: [40, 0, 43, 1],
                        query: '/doc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            const fileContents = outcome.fileContents;
                            // assert it contains doc comments above
                            const lineWithCursor = '	public void start(BundleContext context) throws Exception {';
                            (0, slashDoc_util_1.assertDocLines)(fileContents, lineWithCursor);
                        }
                    }
                ],
            });
        });
    });
});
//# sourceMappingURL=slashDoc.java.stest.js.map