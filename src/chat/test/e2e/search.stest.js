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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert_1 = __importDefault(require("assert"));
const fs = __importStar(require("fs"));
const glob = __importStar(require("glob"));
const path = __importStar(require("path"));
const stest_1 = require("../base/stest");
const scenarioTest_1 = require("./scenarioTest");
const NUM_SCENARIOS = 26;
const scenarioFolder = path.join(__dirname, '..', 'test/scenarios/test-scenario-search/');
const exampleFolder = path.join(scenarioFolder, 'example-files');
const replaceSamples = path.join(scenarioFolder, 'replace-samples');
(function () {
    (0, stest_1.ssuite)({ title: 'search', location: 'panel' }, () => {
        // Dynamically create a test case per each entry
        for (let i = 0; i < NUM_SCENARIOS; i++) {
            const testCase = getTestInfoFromFile(`search${i}.testArgs.json`);
            const testName = testCase.question;
            (0, stest_1.stest)({ description: testName }, (0, scenarioTest_1.generateScenarioTestRunner)([{ question: '@vscode /search ' + testCase.question, name: testName, scenarioFolderPath: scenarioFolder }], generateEvaluate(testCase)));
        }
    });
})();
function getTestInfoFromFile(fileName) {
    const file = path.join(scenarioFolder, fileName);
    const fileContents = fs.readFileSync(file, 'utf8');
    const json = JSON.parse(fileContents);
    if (!json.queryShouldFind && !json.shouldFail) {
        throw Error('Missing queryShouldFind field');
    }
    json.queryShouldFind = new Map(json.queryShouldFind);
    if (json.replaceResult) {
        json.replaceResult = new Map(json.replaceResult);
    }
    return json;
}
function generateEvaluate(testInfo) {
    return async function evaluate(accessor, question, answer, _rawResponse, turn, _scenarioIndex, commands) {
        try {
            let args;
            try {
                args = createSimplifiedSearchArgs(await testArgs(commands));
            }
            catch (e) {
                if (testInfo.shouldFail) {
                    return Promise.resolve({ success: true, errorMessage: '' });
                }
                else {
                    return Promise.resolve({ success: false, errorMessage: 'Parsing the search query failed.' });
                }
            }
            if (testInfo.shouldFail) {
                return Promise.resolve({ success: false, errorMessage: 'Parsing the search query should have failed.' });
            }
            (0, assert_1.default)(testInfo.isRegex === undefined || args.isRegex === testInfo.isRegex);
            if (testInfo.onlyOpenEditors !== undefined) {
                (0, assert_1.default)(args.onlyOpenEditors === testInfo.onlyOpenEditors);
            }
            if (!testInfo.replaceResult || testInfo.replaceResult.size === 0) {
                (0, assert_1.default)(!args.replace);
            }
            const actualTargets = getTargetFiles(args.filesToInclude, args.filesToExclude);
            const expectedTargets = getTargetFiles(testInfo.exampleIncludeGlobs ?? ["*"], testInfo.exampleExcludeGlobs ?? []);
            assert_1.default.deepEqual(actualTargets, expectedTargets);
            if (!args?.query) {
                return Promise.resolve({ success: false, errorMessage: 'No query field on args' });
            }
            const query = args.query;
            const preserveCase = args.preserveCase;
            const replace = args.replace;
            testInfo.queryShouldFind.forEach((expected, fileName) => {
                const file = path.join(exampleFolder, fileName);
                const results = testOnlyQueryOnFiles(file, query, preserveCase);
                (0, assert_1.default)(resultMatchesQuery(results, expected));
            });
            testInfo.replaceResult?.forEach((fileNameExpected, fileName) => {
                const file = path.join(exampleFolder, fileName);
                const result = getStringFromReplace(file, query, replace, preserveCase);
                const expected = fs.readFileSync(path.join(replaceSamples, fileNameExpected), 'utf8');
                (0, assert_1.default)(result === expected);
            });
        }
        catch (e) {
            const msg = e.message ?? 'Error: ' + e;
            return Promise.resolve({ success: false, errorMessage: msg });
        }
        return Promise.resolve({ success: true, errorMessage: '' });
    };
}
function getTargetFiles(fileGlobs, ignoreGlobs) {
    if (!Array.isArray(fileGlobs)) {
        fileGlobs = (fileGlobs.length === 0) ? ["*"] : fileGlobs.split(',');
    }
    if (!Array.isArray(ignoreGlobs)) {
        ignoreGlobs = (ignoreGlobs.length === 0) ? [] : ignoreGlobs.split(',');
    }
    const included = [];
    fileGlobs.forEach((fileGlob) => {
        const matches = glob.sync(fileGlob, { cwd: exampleFolder, ignore: ignoreGlobs }).filter((file) => (!included.includes(file)));
        included.push(...matches);
    });
    return included;
}
function createSimplifiedSearchArgs(args) {
    return {
        filesToInclude: args.filesToInclude ?? '',
        filesToExclude: args.filesToExclude ?? '',
        query: args.query,
        replace: args.replace ?? '',
        isRegex: args.isRegex ?? false,
        preserveCase: args.preserveCase ?? false,
        onlyOpenEditors: args.onlyOpenEditors ?? false
    };
}
async function testArgs(commands) {
    for (const c of commands) {
        if (c.command === 'github.copilot.executeSearch') {
            (0, assert_1.default)(c.title === "Search");
            return c.arguments?.[0];
        }
    }
    throw Error('No search command found');
}
function getFunctionFromQuery(query, isCaseSensitive) {
    const flags = isCaseSensitive ? 'gm' : 'gmi';
    return new RegExp(query, flags);
}
function testOnlyQueryOnFiles(fileName, query, isCaseSensitive) {
    const file = fs.readFileSync(fileName, 'utf8');
    const re = getFunctionFromQuery(query, isCaseSensitive);
    const results = file.match(re)?.values();
    return results ? Array.from(results) : [];
}
function getStringFromReplace(fileName, query, replace, isCaseSensitive) {
    const file = fs.readFileSync(fileName, 'utf8');
    const re = getFunctionFromQuery(query, isCaseSensitive);
    const str = file.replace(re, replace);
    return str;
}
function resultMatchesQuery(actual, expected) {
    if (expected.length === 0) {
        return (actual.length === 0);
    }
    const possibilitiesOfExpected = (Array.isArray(expected[0]) ? expected : [expected]);
    const resultMatchesQuerySingle = (possibleExpected) => {
        if (actual.length !== possibleExpected.length) {
            return false;
        }
        for (let i = 0; i < actual.length; i++) {
            if (!actual[i].includes(possibleExpected[i])) {
                return false;
            }
        }
        return true;
    };
    for (const expected of possibilitiesOfExpected) {
        if (resultMatchesQuerySingle(expected)) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=search.stest.js.map