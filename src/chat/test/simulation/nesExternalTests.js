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
exports.discoverNesTests = discoverNesTests;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const editUtils_1 = require("../../src/platform/inlineEdits/common/dataTypes/editUtils");
const assert_1 = require("../../src/util/vs/base/common/assert");
const stest_1 = require("../base/stest");
const fileLoading_1 = require("./inlineEdit/fileLoading");
const inlineEditTester_1 = require("./inlineEdit/inlineEditTester");
const nesOptionsToConfigurations_1 = require("./nesOptionsToConfigurations");
const RECORDING_BASENAME = 'recording.w.json';
const RECORDING_FILE_SUFFIX = '.recording.w.json';
async function discoverRecordingFiles(rootPath) {
    const recordings = [];
    async function dfs(root) {
        const contents = await fs.promises.readdir(root, { withFileTypes: true });
        await Promise.all(contents.map(entry => {
            if (entry.isFile() && entry.name.includes(RECORDING_BASENAME)) {
                recordings.push(entry);
                return;
            }
            if (entry.isDirectory()) {
                return dfs(path.join(entry.parentPath, entry.name));
            }
        }));
    }
    await dfs(rootPath);
    return recordings;
}
async function discoverNesTests(rootFolder, options) {
    const recordingFiles = await discoverRecordingFiles(rootFolder);
    const tester = new inlineEditTester_1.InlineEditTester();
    const configurations = (0, nesOptionsToConfigurations_1.nesOptionsToConfigurations)(options);
    const rootSuite = new stest_1.SimulationSuite({ title: 'NES', location: 'external' });
    let tests = recordingFiles.map((file) => generateExternalStestFromRecording(file, rootSuite, tester, configurations));
    tests = tests.sort((a, b) => a.fullName.localeCompare(b.fullName));
    rootSuite.tests.push(...tests);
    return rootSuite;
}
function generateExternalStestFromRecording(file, containingSuite, tester, configurations) {
    const fileDir = file.parentPath;
    const basename = file.name;
    const testName = computeTestNameFromFile(file);
    const stest = new stest_1.SimulationTest({ description: testName, configurations }, {}, containingSuite, async (collection) => {
        const accessor = collection.createTestingAccessor();
        const { isScored, result, scoredEditsFilePath } = await tester.runAndScoreFromRecording(accessor, (0, fileLoading_1.loadFile)({ filePath: path.join(fileDir, basename) }));
        accessor.get(stest_1.ISimulationTestRuntime).writeFile(`${testName}.textAfterAiEdit.txt`, result.textAfterAiEdit?.value ?? '<NO AI EDIT>', 'textAfterAiEdit');
        accessor.get(stest_1.ISimulationTestRuntime).writeFile(`${testName}.aiEdit.json`, result.nextEdit === undefined ? '<NO AI EDIT>' : JSON.stringify(result.nextEdit ? (0, editUtils_1.serializeSingleEdit)(result.nextEdit) : undefined), 'nextEdit');
        if (!isScored) {
            throw new inlineEditTester_1.EditNotScoredError(scoredEditsFilePath);
        }
    });
    return stest;
}
function computeTestNameFromFile(file) {
    const basename = file.name;
    // if ends with recording file suffix, remove suffix
    if (basename.endsWith(RECORDING_FILE_SUFFIX)) {
        return basename.slice(0, -RECORDING_FILE_SUFFIX.length);
    }
    // if basename is just the recording file name, use parent directory name as test name
    if (basename === RECORDING_BASENAME) {
        const fileDir = file.parentPath;
        const pathChunks = fileDir.split(path.sep);
        const parentBasename = pathChunks.at(-1);
        (0, assert_1.assert)(parentBasename !== undefined, `Expected recording's ${path.join(file.parentPath, file.name)} parent directory name to be defined`);
        if (pathChunks.at(-2)?.[0].match(/^[A-Z]/)) { // if the recording is at `path/to/MustHave/MyAwesomeTest/recording.w.json` - test name should be `[MustHave] MyAwesomeTest`
            return `[${pathChunks.at(-2)}] ${parentBasename}`;
        }
        return parentBasename;
    }
    throw new Error('Unexpected file name format');
}
//# sourceMappingURL=nesExternalTests.js.map