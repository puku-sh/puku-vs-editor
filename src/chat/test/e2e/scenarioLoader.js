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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchConversationScenarios = fetchConversationScenarios;
exports.discoverScenarios = discoverScenarios;
exports.discoverToolsCalls = discoverToolsCalls;
const assert_1 = __importDefault(require("assert"));
const fs = __importStar(require("fs"));
const jsoncParser = __importStar(require("jsonc-parser"));
const path = __importStar(require("path"));
const promptContextModel_1 = require("../../src/platform/test/node/promptContextModel");
function createTestNameFromPath(folderName, fileName) {
    // Test file is <number>.conversation.json
    if (/^\d+\.conversation\.json$/.test(fileName)) {
        return `${folderName}.${fileName}`;
    }
    // Test file contains scenario information
    return fileName;
}
function fetchConversationScenarios(scenarioFolderPath) {
    // Test files are only in the root so don't have to worry about nested folders
    const testFiles = fs.readdirSync(scenarioFolderPath).filter(f => f.endsWith('.conversation.json'));
    const scenarios = [];
    for (const testFile of testFiles) {
        const fileContents = fs.readFileSync(path.join(scenarioFolderPath, testFile), 'utf8');
        const parsedFile = jsoncParser.parse(fileContents);
        (0, assert_1.default)(parsedFile instanceof Array, 'Expected an array of test cases');
        (0, assert_1.default)(parsedFile.every((testCase) => typeof testCase === 'object' && typeof testCase.question === 'string'), 'Expected an array of objects with a question property');
        (0, assert_1.default)(parsedFile.every((testCase) => !testCase.stateFile || typeof testCase.stateFile === 'string'), 'Expected an array of objects with a stateFile property of type string');
        (0, assert_1.default)(parsedFile.every((testCase) => !testCase.applyChatCodeBlocks || typeof testCase.applyChatCodeBlocks === 'boolean'), 'Expected an array of objects with a applyChatCodeBlocks property of type boolean');
        const scenario = [];
        for (const testCase of parsedFile) {
            scenario.push({
                question: testCase.question,
                name: createTestNameFromPath(path.basename(scenarioFolderPath), testFile),
                json: testCase,
                scenarioFolderPath,
                stateFile: testCase.stateFile,
                applyChatCodeBlocks: testCase.applyChatCodeBlocks,
                getState: testCase.stateFile
                    ? () => (0, promptContextModel_1.deserializeWorkbenchState)(scenarioFolderPath, path.join(scenarioFolderPath, testCase.stateFile))
                    : undefined,
            });
        }
        scenarios.push(scenario);
    }
    return scenarios;
}
function discoverScenarios(rootFolder) {
    const rootFolderContents = fs.readdirSync(rootFolder, { withFileTypes: true });
    const containsConversationFile = rootFolderContents.some(f => f.isFile() && f.name.endsWith('.conversation.json'));
    if (containsConversationFile) {
        return fetchConversationScenarios(rootFolder);
    }
    else {
        const foldersWithScenarios = rootFolderContents.filter(f => f.isDirectory()).map(f => path.join(rootFolder, f.name));
        if (foldersWithScenarios.length === 0) {
            return [];
        }
        const scenarios = foldersWithScenarios.map(f => discoverScenarios(f));
        return scenarios.flat();
    }
}
function fetchToolCallScenarios(scenarioFolderPath) {
    const testFiles = fs.readdirSync(scenarioFolderPath).filter(f => f.endsWith('.toolcall.json'));
    const scenarios = [];
    for (const testFile of testFiles) {
        const fileContents = fs.readFileSync(path.join(scenarioFolderPath, testFile), 'utf8');
        const testCase = jsoncParser.parse(fileContents);
        (0, assert_1.default)(testCase instanceof Object, 'Expected an object with toolArgs property');
        (0, assert_1.default)(typeof testCase.toolArgs === 'object', 'Expected toolArgs to be an object');
        (0, assert_1.default)(typeof testCase.name === 'string', 'Expected name to be a string');
        (0, assert_1.default)(testCase.toolArgs.tool, 'Expected toolArgs to have a tool property');
        (0, assert_1.default)(typeof testCase.toolArgs.tool === 'string', 'Expected toolArgs.tool to be a string');
        let stateFile = testCase.stateFile;
        if (testCase.stateFile) {
            (0, assert_1.default)(typeof testCase.stateFile === 'string', 'Expected stateFile to be a string');
            stateFile = path.join(scenarioFolderPath, testCase.stateFile);
        }
        scenarios.push({
            name: createTestNameFromPath(path.basename(scenarioFolderPath), testFile),
            json: testCase,
            scenarioFolderPath,
            getState: stateFile
                ? () => (0, promptContextModel_1.deserializeWorkbenchState)(scenarioFolderPath, stateFile)
                : undefined,
            stateFilePath: stateFile,
        });
    }
    return scenarios;
}
function discoverToolsCalls(rootFolder) {
    const rootFolderContents = fs.readdirSync(rootFolder, { withFileTypes: true });
    const containsToolArgsFile = rootFolderContents.some(f => f.isFile() && f.name.endsWith('.toolcall.json'));
    if (containsToolArgsFile) {
        return fetchToolCallScenarios(rootFolder);
    }
    return [];
}
//# sourceMappingURL=scenarioLoader.js.map