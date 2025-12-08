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
const simulationWorkspace_1 = require("../../../src/platform/test/node/simulationWorkspace");
const network_1 = require("../../../src/util/vs/base/common/network");
const stest_1 = require("../../base/stest");
const inlineChatSimulator_1 = require("../inlineChatSimulator");
const outcomeValidators_1 = require("../outcomeValidators");
const stestUtil_1 = require("../stestUtil");
(0, inlineChatSimulator_1.forInline)((strategy, nonExtensionConfigurations, suffix) => {
    (0, stest_1.ssuite)({ title: `/tests${suffix}`, location: 'inline', language: 'csharp', nonExtensionConfigurations }, () => {
        (0, stest_1.stest)({ description: 'creates new test file with some assertions and uses correct file name', }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('tests/cs-newtest/', 'src/services/Model.cs'),
                ],
                queries: [{
                        file: 'src/services/Model.cs',
                        selection: [4, 8, 4, 8],
                        query: '/tests',
                        expectedIntent: "tests" /* Intent.Tests */,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert.strictEqual(outcome.files.length, 1);
                            const [first] = outcome.files;
                            (0, stestUtil_1.assertSomeStrings)((0, outcomeValidators_1.getFileContent)(first), ['Assert', 'Test', 'MyObject', 'MyMethod']);
                            if ((0, simulationWorkspace_1.isQualifiedFile)(first)) {
                                assert.strictEqual(first.uri.scheme, network_1.Schemas.untitled);
                                assert.ok(first.uri.path.endsWith('ModelTest.cs'));
                            }
                            else if ((0, simulationWorkspace_1.isRelativeFile)(first)) {
                                assert.ok(first.fileName.endsWith('ModelTest.cs'));
                            }
                        }
                    }]
            });
        });
    });
});
//# sourceMappingURL=testGen.csharp.stest.js.map