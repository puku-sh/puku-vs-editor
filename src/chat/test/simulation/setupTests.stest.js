"use strict";
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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("assert"));
const path = __importStar(require("path"));
const textDocument_1 = require("../../src/util/common/test/shims/textDocument");
const uri_1 = require("../../src/util/vs/base/common/uri");
const rubric_1 = require("../base/rubric");
const stest_1 = require("../base/stest");
const validate_1 = require("../base/validate");
const scenarioLoader_1 = require("../e2e/scenarioLoader");
const scenarioTest_1 = require("../e2e/scenarioTest");
(0, stest_1.ssuite)({ title: 'setupTests - recommend', location: 'panel' }, () => {
    const scenarioFolder = path.join(__dirname, '..', 'test/scenarios/test-setupTestRecommend');
    const scenarios = (0, scenarioLoader_1.discoverScenarios)(scenarioFolder);
    for (const scenario of scenarios) {
        (0, stest_1.stest)({ description: scenario[0].json.name }, collection => {
            const runner = (0, scenarioTest_1.generateScenarioTestRunner)(scenario.map(tcase => ({
                ...tcase,
                setupCase(accessor, workspace) {
                    const files = tcase.json.files || [];
                    for (const file of files) {
                        workspace.addDocument((0, textDocument_1.createTextDocumentData)(uri_1.URI.joinPath(workspace.workspaceFolders[0], file), '', ''));
                    }
                },
            })), async (accessor, question, answer, rawResponse, turn, scenarioIndex, commands, confirmations) => {
                assert.ok(scenario[0].json.keywords, 'expected test case to have keywords');
                assert.ok(confirmations.length, 'expected to have a confirmation part');
                const err = (0, validate_1.validate)(confirmations[0].buttons.join(' ').toLowerCase(), scenario[0].json.keywords);
                if (err) {
                    return { success: false, errorMessage: err };
                }
                return { success: true, errorMessage: answer };
            });
            return runner(collection);
        });
    }
});
(0, stest_1.ssuite)({ title: 'setupTests - invoke', location: 'panel' }, () => {
    const scenarioFolder = path.join(__dirname, '..', 'test/scenarios/test-setupTest');
    const scenarios = (0, scenarioLoader_1.discoverScenarios)(scenarioFolder);
    for (const scenario of scenarios) {
        (0, stest_1.stest)({ description: scenario[0].json.name }, collection => {
            const runner = (0, scenarioTest_1.generateScenarioTestRunner)(scenario.map(tcase => ({
                ...tcase,
                setupCase(accessor, workspace) {
                    const files = tcase.json.files || [];
                    for (const file of files) {
                        workspace.addDocument((0, textDocument_1.createTextDocumentData)(uri_1.URI.joinPath(workspace.workspaceFolders[0], file), '', ''));
                    }
                },
            })), async (accessor, question, answer, rawResponse, turn, scenarioIndex, commands, confirmations, fileTree) => {
                const e = scenario[0].json.expectations;
                const files = [];
                const serializeFileTree = (node, path = '') => {
                    if (node.children) {
                        node.children.forEach(child => serializeFileTree(child, `${path}${node.name}/`));
                    }
                    else {
                        files.push(path + node.name);
                    }
                };
                fileTree[0].value.forEach(v => serializeFileTree(v));
                (0, rubric_1.rubric)(accessor, () => {
                    for (const pattern of e.filePatterns) {
                        assert.ok(files.some(f => f.match(pattern)), `expected file to match ${pattern}`);
                    }
                }, () => assert.ok(rawResponse.match(e.installCommandPattern), 'expected to have an install command pattern'), () => assert.ok(rawResponse.match(e.runCommandPattern), 'expected to have a run command pattern'));
                return { success: true };
            });
            return runner(collection);
        });
    }
});
//# sourceMappingURL=setupTests.stest.js.map