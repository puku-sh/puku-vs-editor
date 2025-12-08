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
const path = __importStar(require("path"));
const util_1 = require("util");
const newIntent_1 = require("../../src/extension/intents/node/newIntent");
const simulationWorkspace_1 = require("../../src/platform/test/node/simulationWorkspace");
const fileSystem_1 = require("../../src/util/common/fileSystem");
const vscodeTypes_1 = require("../../src/vscodeTypes");
const stest_1 = require("../base/stest");
const validate_1 = require("../base/validate");
const tsc_1 = require("../simulation/diagnosticProviders/tsc");
const stestUtil_1 = require("../simulation/stestUtil");
const scenarioLoader_1 = require("./scenarioLoader");
const scenarioTest_1 = require("./scenarioTest");
(function () {
    stest_1.ssuite.skip({ title: 'newWorkspace', subtitle: 'e2e', location: 'panel' }, (inputPath) => {
        const scenarioFolder = inputPath ?? path.join(__dirname, '..', 'test/scenarios/test-new-workspace');
        const scenarios = (0, scenarioLoader_1.fetchConversationScenarios)(scenarioFolder);
        for (const scenario of scenarios) {
            (0, stest_1.stest)({ description: scenario[0].question.replace('/new ', '') }, (0, scenarioTest_1.generateScenarioTestRunner)(scenario, async (accessor, question, answer, _rawResponse, _index, _turn, commands) => {
                const files = [];
                for (const command of commands) {
                    if (command.command === 'github.copilot.createProject') {
                        // validate project structure and contents in files
                        const projectItems = command.arguments?.[0];
                        if (!projectItems || projectItems.value?.length === 0) {
                            return Promise.resolve({ success: false, errorMessage: 'Invalid projectItems' });
                        }
                        if (scenario[0].json.keywords) {
                            const err = (0, validate_1.validate)(_rawResponse, scenario[0].json.keywords);
                            if (err) {
                                return { success: false, errorMessage: err };
                            }
                        }
                        const contentManager = accessor.get(newIntent_1.INewWorkspacePreviewContentManager);
                        async function traverseFileTree(parentPath, fileTree, baseUri) {
                            const itemPath = path.posix.join(parentPath, fileTree.name);
                            if (fileTree.children?.length || !(0, fileSystem_1.looksLikeDirectory)(fileTree.name)) {
                                files.push({ kind: 'qualifiedFile', uri: vscodeTypes_1.Uri.joinPath(baseUri, itemPath), fileContents: 'DIR' });
                                for (const item of fileTree.children ?? []) {
                                    await traverseFileTree(itemPath, item, baseUri);
                                }
                            }
                            else {
                                const result = await contentManager.get(vscodeTypes_1.Uri.joinPath(baseUri, itemPath))?.content;
                                const decoder = new util_1.TextDecoder();
                                const decodedString = decoder.decode(result);
                                if (!decodedString) {
                                    return { success: false, errorMessage: `Content not found for ${itemPath}` };
                                }
                                files.push({ kind: 'qualifiedFile', uri: vscodeTypes_1.Uri.joinPath(baseUri, itemPath), fileContents: decodedString });
                            }
                            return;
                        }
                        for (const projectItem of projectItems.value) {
                            await traverseFileTree('', projectItem, projectItems.baseUri);
                        }
                        const tempDirPath = await (0, stestUtil_1.createTempDir)();
                        const projectRoot = path.join(tempDirPath, projectItems.baseUri.path);
                        await createTempWorkspace(tempDirPath, files);
                        const result = await compileWorkspace(accessor, projectRoot, files);
                        await (0, stestUtil_1.cleanTempDir)(tempDirPath);
                        return result;
                    }
                }
                return Promise.resolve({ success: false, errorMessage: 'Failed to parse new response' });
            }));
        }
    });
})();
// TODO @aiday-mar add possibility to execute python files and find the diagnostics or errors upon execution
async function compileWorkspace(accessor, projectRoot, files) {
    for (const file of files) {
        const language = (0, simulationWorkspace_1.getLanguageForFile)(file);
        switch (language.languageId) {
            case 'typescript':
                {
                    // compute diagnostics
                    const tsDiagnostics = await (0, tsc_1.compileTSWorkspace)(accessor, projectRoot);
                    if (tsDiagnostics.length === 0) {
                        return { success: true };
                    }
                    const errors = tsDiagnostics.map(diagnostic => diagnostic.file + ' ' + diagnostic.code + ' : ' + diagnostic.message).join('\n');
                    return { success: false, errorMessage: 'Typescript diagnostics errors: \n' + errors };
                }
        }
    }
    return { success: true };
}
async function createTempWorkspace(tempDirPath, files) {
    await fs.promises.rm(tempDirPath, { recursive: true, force: true });
    await fs.promises.mkdir(tempDirPath, { recursive: true });
    for (const file of files) {
        const tmpPath = path.join(tempDirPath, file.uri.path);
        if (file.fileContents !== 'DIR') {
            await fs.promises.writeFile(tmpPath, file.fileContents);
        }
        else {
            await fs.promises.mkdir(tmpPath, { recursive: true });
        }
    }
}
//# sourceMappingURL=newWorkspace.stest.js.map