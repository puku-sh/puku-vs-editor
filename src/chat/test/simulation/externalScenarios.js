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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalSimulationTestRuntime = void 0;
exports.discoverTests = discoverTests;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert_1 = __importDefault(require("assert"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const languageFeaturesService_1 = require("../../src/platform/languages/common/languageFeaturesService");
const testProvider_1 = require("../../src/platform/testing/common/testProvider");
const types_1 = require("../../src/util/vs/base/common/types");
const uri_1 = require("../../src/util/vs/base/common/uri");
const descriptors_1 = require("../../src/util/vs/platform/instantiation/common/descriptors");
const vscodeTypes_1 = require("../../src/vscodeTypes");
const stest_1 = require("../base/stest");
const scenarioLoader_1 = require("../e2e/scenarioLoader");
const scenarioTest_1 = require("../e2e/scenarioTest");
const inlineChatSimulator_1 = require("./inlineChatSimulator");
const lsifLanguageFeatureService_1 = require("./language/lsifLanguageFeatureService");
const panelCodeMapperSimulator_1 = require("./panelCodeMapperSimulator");
const sharedTypes_1 = require("./shared/sharedTypes");
const simulationTestProvider_1 = require("./simulationTestProvider");
/**
 * Discovers test scenarios in a given root folder.
 *
 * This function recursively searches through the root folder and its subfolders to find any '.conversation.json' files.
 * If a '.conversation.json' file is found in a folder, a simulation suite is created for that folder.
 * If no '.conversation.json' file is found, the function will recursively search through the subfolders.
 *
 * @param rootFolder - The root folder to start the search from.
 * @param chatKind - The type of chat to be simulated, either 'inline' or 'panel'.
 *
 * @returns A promise that resolves to an array of SimulationSuite objects, each representing a test scenario.
 */
async function discoverTests(rootFolder, options) {
    const rootFolderContents = await fs.promises.readdir(rootFolder, { withFileTypes: true });
    const containsConversationFile = rootFolderContents.some(f => f.isFile() && f.name.endsWith('.conversation.json'));
    if (containsConversationFile) {
        return [createSimulationSuite(rootFolder, options)];
    }
    else {
        const foldersWithScenarios = rootFolderContents.filter(f => f.isDirectory()).map(f => path.join(rootFolder, f.name));
        if (foldersWithScenarios.length === 0) {
            return [];
        }
        const scenarios = await Promise.all(foldersWithScenarios.map(f => discoverTests(f, options)));
        return scenarios.flat();
    }
}
function createSimulationSuite(folderWithScenarios, options) {
    const suiteName = path.basename(folderWithScenarios);
    const chatKind = options.chatKind ?? 'panel';
    const suite = new stest_1.SimulationSuite({ title: suiteName, location: chatKind });
    const scenarios = (0, scenarioLoader_1.fetchConversationScenarios)(folderWithScenarios);
    for (const scenario of scenarios) {
        if (chatKind === 'inline') {
            for (const conversation of scenario) {
                const runner = generateInlineScenarioTestRunner(conversation);
                const testName = conversation.name.replace(/.conversation\.json$/, '');
                const conversationPath = path.join(conversation.scenarioFolderPath, conversation.name);
                suite.tests.push(new stest_1.SimulationTest({ description: testName }, { conversationPath, scenarioFolderPath: conversation.scenarioFolderPath, stateFile: conversation.stateFile }, suite, runner));
            }
        }
        else {
            const isSlashEdit = scenario[0].question.startsWith(`/${"edit" /* Intent.Edit */}`) || scenario[0].question.startsWith(`/${"editAgent" /* Intent.Agent */}`);
            const testName = scenario[0].name.replace(/.conversation\.json$/, '');
            const conversationPath = path.join(scenario[0].scenarioFolderPath, scenario[0].name);
            let runner;
            for (const conversation of scenario) {
                if (options.applyChatCodeBlocks) {
                    conversation.applyChatCodeBlocks = true;
                }
            }
            if (isSlashEdit) {
                // /edit in the sidebar needs more special handling
                runner = generateSlashEditScenarioTestRunner(scenario);
            }
            else {
                runner = (0, scenarioTest_1.generateScenarioTestRunner)(scenario, async (accessor, question, userVisibleAnswer, rawResponse) => {
                    accessor.get(stest_1.ISimulationTestRuntime).writeFile(`${testName}.md`, rawResponse, sharedTypes_1.SIDEBAR_RAW_RESPONSE_TAG);
                    return { success: true };
                });
            }
            suite.tests.push(new stest_1.SimulationTest({ description: testName }, { conversationPath, scenarioFolderPath: scenario[0].scenarioFolderPath, stateFile: scenario[0].stateFile, }, suite, runner));
        }
    }
    return suite;
}
function generateSlashEditScenarioTestRunner(scenario) {
    return async (testingServiceCollection) => {
        (0, assert_1.default)(scenario.length > 0, 'Expected at least 1 conversation in the scenario');
        (0, types_1.assertType)(scenario[0].getState !== undefined, 'Expected state to be defined in the first conversation test case');
        for (let i = 1; i < scenario.length; i++) {
            (0, types_1.assertType)(scenario[i].getState === undefined, 'Expected state to be undefined in subsequent conversations');
        }
        const state = scenario[0].getState();
        const scenario2 = {
            workspaceState: state,
            scenarioFolderPath: scenario[0].scenarioFolderPath,
            queries: scenario.map((conversation, index) => {
                return {
                    query: conversation.question,
                    expectedIntent: undefined,
                    validate: async (outcome, workspace, accessor) => assert_1.default.ok(true),
                };
            }),
            extraWorkspaceSetup: (workspace) => extraWorkspaceSetup(testingServiceCollection, state, workspace),
        };
        await (0, panelCodeMapperSimulator_1.simulatePanelCodeMapper)(testingServiceCollection, scenario2, 0 /* EditTestStrategy.Edits */);
    };
}
function generateInlineScenarioTestRunner(conversation) {
    return async (testingServiceCollection) => {
        (0, types_1.assertType)(conversation.getState !== undefined, 'Expected state to be defined in conversation test case');
        const state = conversation.getState();
        const scenario = {
            workspaceState: state,
            scenarioFolderPath: conversation.scenarioFolderPath,
            queries: [{
                    query: conversation.question,
                    expectedIntent: undefined,
                    validate: async (outcome, workspace, accessor) => assert_1.default.ok(true),
                }],
            extraWorkspaceSetup: (workspace) => extraWorkspaceSetup(testingServiceCollection, state, workspace),
            onBeforeStart: async (accessor) => {
                const testContext = accessor.get(stest_1.ISimulationTestRuntime);
                const dataToLog = [
                    `The conversation input contained the following data.`,
                    `Name: ${conversation.name}`,
                    `Query: ${conversation.question}`,
                    `State: \n${JSON.stringify(state)}`
                ].join('\n');
                testContext.log(dataToLog);
            }
        };
        await (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, scenario);
    };
}
function extraWorkspaceSetup(testingServiceCollection, state, workspace) {
    if (state.lsifIndex) {
        testingServiceCollection.define(languageFeaturesService_1.ILanguageFeaturesService, new descriptors_1.SyncDescriptor(lsifLanguageFeatureService_1.LSIFLanguageFeaturesService, [
            workspace,
            path.join(state.workspaceFolders[0].fsPath, state.lsifIndex),
        ]));
    }
    if (state.testFailures && state.workspaceFolders) {
        testingServiceCollection.define(testProvider_1.ITestProvider, new simulationTestProvider_1.SimulationTestProvider(state.testFailures.map(f => ({
            message: f.message,
            testRange: new vscodeTypes_1.Range(f.line, f.column, f.line, f.column),
            uri: uri_1.URI.file(path.join(state.workspaceFolders[0].fsPath, f.file_path))
        }))));
    }
}
class ExternalSimulationTestRuntime extends stest_1.SimulationTestRuntime {
    constructor(baseDir, testOutcomeDir, runNumber) {
        super(baseDir, testOutcomeDir, runNumber);
    }
    async writeFile(filename, contents, tag) {
        if (tag === sharedTypes_1.INLINE_CHANGED_DOC_TAG) {
            // This is a write file for a workspace file, we'll rename it to <basename>.post.<ext>
            const ext = path.extname(filename);
            const basename = path.basename(filename, ext);
            filename = `${basename}.post${ext}`;
        }
        return super.writeFile(filename, contents, tag);
    }
    massageFilename(filename) {
        const ext = path.extname(filename);
        const basename = path.basename(filename, ext);
        return `${basename}-${this.runNumber}${ext}`;
    }
}
exports.ExternalSimulationTestRuntime = ExternalSimulationTestRuntime;
//# sourceMappingURL=externalScenarios.js.map