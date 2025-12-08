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
exports.discoverCoffeTests = discoverCoffeTests;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const workspaceLog_1 = require("../../src/platform/workspaceRecorder/common/workspaceLog");
const assert_1 = require("../../src/util/vs/base/common/assert");
const types_1 = require("../../src/util/vs/base/common/types");
const stringEdit_1 = require("../../src/util/vs/editor/common/core/edits/stringEdit");
const offsetRange_1 = require("../../src/util/vs/editor/common/core/ranges/offsetRange");
const stest_1 = require("../base/stest");
const inlineEditTester_1 = require("./inlineEdit/inlineEditTester");
const nesCoffeTestsTypes_1 = require("./nesCoffeTestsTypes");
const nesOptionsToConfigurations_1 = require("./nesOptionsToConfigurations");
const TEST_FILE_SUFFIX = '.completion.yml';
const RESULT_FILE_SUFFIX = '.response.json';
async function discoverCoffeTests(rootFolder, options) {
    const rootFolderContents = await fs.promises.readdir(rootFolder, { withFileTypes: true });
    const recordingFiles = rootFolderContents.filter(fileEntry => fileEntry.isFile() && fileEntry.name.endsWith(TEST_FILE_SUFFIX));
    const tester = new inlineEditTester_1.InlineEditTester();
    const configurations = (0, nesOptionsToConfigurations_1.nesOptionsToConfigurations)(options);
    const rootSuite = new stest_1.SimulationSuite({ title: 'NES', location: 'external' });
    let tests = recordingFiles.map((file) => generateExternalStestFromRecording(file, rootSuite, tester, configurations));
    tests = tests.sort((a, b) => a.fullName.localeCompare(b.fullName));
    rootSuite.tests.push(...tests);
    return rootSuite;
}
function generateExternalStestFromRecording(file, containingSuite, tester, configurations) {
    const basename = file.name;
    const testName = basename.slice(0, -TEST_FILE_SUFFIX.length); // strip suffix
    const filePath = path.join(file.parentPath, basename);
    const stest = new stest_1.SimulationTest({ description: testName, configurations }, {}, containingSuite, async (collection) => {
        const accessor = collection.createTestingAccessor();
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const testInput = nesCoffeTestsTypes_1.CompletionStests.parseTestInput(fileContents);
        const recordingLog = [
            {
                documentType: 'workspaceRecording@1.0',
                kind: 'header',
                repoRootUri: 'file:///Users/john/myProject/',
                time: Date.now(),
                uuid: 'random-uuid-1234',
            },
        ];
        const filesWithoutTargetFile = testInput.state.openFiles.filter(f => f.uri !== testInput.completion.uri);
        const targetFile = testInput.state.openFiles.find(f => f.uri === testInput.completion.uri);
        (0, types_1.assertDefined)(targetFile, `Target file ${testInput.completion.uri} not found in open files.`);
        const targetFileId = filesWithoutTargetFile.length; // careful: needs to be in sync with loop logic
        const { targetFileBeforeEdit, edit } = computeTargetFileBeforeEditAndEdit(targetFile);
        let id = 0;
        for (const openFile of [...filesWithoutTargetFile, targetFile]) {
            const currentFileId = id++;
            const date = Date.now();
            recordingLog.push({
                kind: 'documentEncountered',
                id: currentFileId,
                relativePath: openFile.uri,
                time: date,
            });
            recordingLog.push({
                kind: 'setContent',
                id: currentFileId,
                v: 1,
                content: openFile === targetFile ? targetFileBeforeEdit : openFile.text,
                time: date,
            });
            recordingLog.push({
                kind: 'opened',
                id: currentFileId,
                time: date,
            });
        }
        recordingLog.push({
            kind: 'changed',
            id: targetFileId,
            time: Date.now(),
            v: 2,
            edit: (0, workspaceLog_1.serializeEdit)(edit)
        });
        const recording = {
            log: recordingLog,
        };
        const r = await tester.runTestFromRecording(accessor, recording);
        const completions = [];
        if (r.aiRootedEdit && r.aiRootedEdit.edit.replacements.length > 0) {
            const rootedEdit = r.aiRootedEdit;
            const singleEdit = rootedEdit.edit.replacements[0];
            const baseTrans = rootedEdit.base.getTransformer();
            const start = baseTrans.getPosition(singleEdit.replaceRange.start);
            const end = baseTrans.getPosition(singleEdit.replaceRange.endExclusive);
            const trimmedEdit = rootedEdit.edit.removeCommonSuffixAndPrefix(rootedEdit.base.value);
            completions.push({
                insertText: singleEdit.newText,
                displayText: trimmedEdit.replacements.at(0)?.newText ?? '<edits disappeared during trimming>',
                range: {
                    start: {
                        line: start.lineNumber - 1,
                        character: start.column - 1,
                    },
                    end: {
                        line: end.lineNumber - 1,
                        character: end.column - 1
                    }
                },
            });
        }
        const completionsOutput = {
            completions,
        };
        const resultFilePath = path.join(file.parentPath, `${testName}${RESULT_FILE_SUFFIX}`);
        await fs.promises.writeFile(resultFilePath, JSON.stringify(completionsOutput, null, 2));
    });
    return stest;
}
function computeTargetFileBeforeEditAndEdit(targetFile) {
    const cursorOffset = targetFile.text.indexOf('⮑');
    (0, assert_1.assert)(cursorOffset !== -1, 'Cursor marker ⮑ not found in target file text.');
    const targetFileWithoutCursor = targetFile.text.replace('⮑', '');
    let wordAtCursorStartOffset = cursorOffset - 1;
    while (wordAtCursorStartOffset > 0 && /(\w|\.)/.test(targetFileWithoutCursor[wordAtCursorStartOffset - 1])) {
        wordAtCursorStartOffset--;
    }
    const editToRemoveWordAtCursor = stringEdit_1.StringEdit.create([stringEdit_1.StringReplacement.delete(new offsetRange_1.OffsetRange(wordAtCursorStartOffset, cursorOffset))]);
    const editToInsertWordAtCursor = editToRemoveWordAtCursor.inverse(targetFileWithoutCursor);
    const targetFileBeforeEdit = editToRemoveWordAtCursor.apply(targetFileWithoutCursor);
    return { targetFileBeforeEdit, edit: editToInsertWordAtCursor };
}
//# sourceMappingURL=nesCoffeTests.js.map