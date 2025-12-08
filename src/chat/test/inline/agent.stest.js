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
const stest_1 = require("../base/stest");
const outcomeValidators_1 = require("../simulation/outcomeValidators");
const panelCodeMapperSimulator_1 = require("../simulation/panelCodeMapperSimulator");
const stestUtil_1 = require("../simulation/stestUtil");
function executeEditTest(strategy, testingServiceCollection, scenario) {
    return (0, panelCodeMapperSimulator_1.simulatePanelCodeMapper)(testingServiceCollection, scenario, strategy);
}
function forAgent(callback) {
    callback(undefined);
    callback("claude-3.5-sonnet" /* CHAT_MODEL.CLAUDE_SONNET */);
}
const skipAgentTests = true;
forAgent((model) => {
    const title = model ? `edit-agent-${model}` : 'edit-agent';
    stest_1.ssuite.optional(() => skipAgentTests, { title, location: 'panel' }, () => {
        (0, stest_1.stest)({ description: 'issue #8098: extract function to unseen file', language: 'typescript', model }, (testingServiceCollection) => {
            return executeEditTest(4 /* EditTestStrategy.Agent */, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('multiFileEdit/issue-8098/debugUtils.ts'),
                    (0, stestUtil_1.fromFixture)('multiFileEdit/issue-8098/debugTelemetry.ts'),
                ],
                queries: [
                    {
                        query: 'Extract filterExceptionsFromTelemetry to debugTelemetry.ts',
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert.ok(outcome.files.length === 2, 'Expected two files to be edited');
                            const utilsTs = (0, outcomeValidators_1.assertFileContent)(outcome.files, 'debugUtils.ts');
                            assert.ok(!utilsTs.includes('function filterExceptionsFromTelemetry'), 'Expected filterExceptionsFromTelemetry to be extracted');
                            const telemetryFile = (0, outcomeValidators_1.assertFileContent)(outcome.files, 'debugTelemetry.ts');
                            assert.ok(telemetryFile.includes('filterExceptionsFromTelemetry'), 'Expected filterExceptionsFromTelemetry to be extracted');
                            assert.strictEqual((await (0, outcomeValidators_1.getWorkspaceDiagnostics)(accessor, workspace, 'tsc')).filter(d => d.kind === 'syntactic').length, 0);
                            (0, outcomeValidators_1.assertNoElidedCodeComments)(outcome);
                        }
                    }
                ]
            });
        });
    });
});
//# sourceMappingURL=agent.stest.js.map