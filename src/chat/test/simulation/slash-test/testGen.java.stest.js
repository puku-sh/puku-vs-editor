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
const path = __importStar(require("path"));
const uri_1 = require("../../../src/util/vs/base/common/uri");
const stest_1 = require("../../base/stest");
const inlineChatSimulator_1 = require("../inlineChatSimulator");
const outcomeValidators_1 = require("../outcomeValidators");
const stestUtil_1 = require("../stestUtil");
(0, inlineChatSimulator_1.forInline)((strategy, nonExtensionConfigurations, suffix) => {
    (0, stest_1.ssuite)({ title: `/tests${suffix}`, location: 'inline', language: 'java', nonExtensionConfigurations }, () => {
        (0, stest_1.stest)({ description: 'looks up pom.xml and junit framework info', }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                workspaceFolders: [
                    uri_1.URI.file(path.join(__dirname, '../test/simulation/fixtures/tests/java-example-project'))
                ],
                files: [
                    (0, stestUtil_1.fromFixture)('tests/java-example-project', 'src/main/java/com/example/MyCalculator.java'),
                ],
                queries: [{
                        file: 'src/main/java/com/example/MyCalculator.java',
                        selection: [4, 15],
                        query: '/tests',
                        expectedIntent: "tests" /* Intent.Tests */,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert.strictEqual(outcome.files.length, 1, 'Expected one file to be created');
                            assert.ok((0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes('import org.junit.jupiter.api.Test;') || // JUnit 5 -- TODO@ulugbekna: we can't yet parse versions of test frameworks
                                (0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes('import org.junit.Test;') // JUnit 4
                            );
                        }
                    }],
            });
        });
        (0, stest_1.stest)({ description: 'looks up existing test file', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                workspaceFolders: [
                    uri_1.URI.file(path.join(__dirname, '../test/simulation/fixtures/tests/java-example-project-with-existing-test-file'))
                ],
                files: [
                    (0, stestUtil_1.fromFixture)('tests/java-example-project-with-existing-test-file', 'src/main/java/com/example/MyCalculator.java'),
                ],
                queries: [{
                        file: 'src/main/java/com/example/MyCalculator.java',
                        selection: [4, 15],
                        query: '/tests',
                        expectedIntent: "tests" /* Intent.Tests */,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert.strictEqual(outcome.files.length, 1, 'Expected one file to be created');
                            assert.ok((0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes('test #2'));
                        }
                    }],
            });
        });
    });
});
//# sourceMappingURL=testGen.java.stest.js.map