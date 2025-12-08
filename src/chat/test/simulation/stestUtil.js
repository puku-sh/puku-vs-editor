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
exports.forEachModel = forEachModel;
exports.toFile = toFile;
exports.getFixturesDir = getFixturesDir;
exports.fromFixture = fromFixture;
exports.fromFixtureDir = fromFixtureDir;
exports.assertOneOf = assertOneOf;
exports.assertInlineEdit = assertInlineEdit;
exports.assertNoErrorOutcome = assertNoErrorOutcome;
exports.assertConversationalOutcome = assertConversationalOutcome;
exports.assertWorkspaceEdit = assertWorkspaceEdit;
exports.extractInlineReplaceEdits = extractInlineReplaceEdits;
exports.assertInlineEditShape = assertInlineEditShape;
exports.assertQualifiedFile = assertQualifiedFile;
exports.assertSomeStrings = assertSomeStrings;
exports.assertNoStrings = assertNoStrings;
exports.assertOccursOnce = assertOccursOnce;
exports.assertNoOccurrence = assertNoOccurrence;
exports.createTempDir = createTempDir;
exports.cleanTempDir = cleanTempDir;
exports.cleanTempDirWithRetry = cleanTempDirWithRetry;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert_1 = __importDefault(require("assert"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const async_1 = require("../../src/util/vs/base/common/async");
const uuid_1 = require("../../src/util/vs/base/common/uuid");
const sharedTypes_1 = require("./shared/sharedTypes");
function forEachModel(models, func) {
    return () => models.forEach(func);
}
/** This function allows [tools](https://github.com/microsoft/vscode-ts-file-path-support/tree/main) to inline/extract the file content. */
function toFile(data) {
    if ('filePath' in data) {
        if (typeof data.filePath === 'string') {
            return fromFixture(data.filePath);
        }
        else {
            return data.filePath;
        }
    }
    else if ('fileName' in data) {
        return {
            kind: 'relativeFile',
            fileName: data.fileName,
            fileContents: data.fileContents,
        };
    }
    else {
        return {
            kind: 'qualifiedFile',
            uri: data.uri,
            fileContents: data.fileContents,
        };
    }
}
let _fixturesDir;
function getFixturesDir() {
    if (!_fixturesDir) {
        _fixturesDir = [
            path.join(__dirname, '../test/simulation/fixtures'), // after bundling with esbuild
            path.join(__dirname, './fixtures'), // when running from sources
        ].filter(p => fs.existsSync(p))[0];
        if (!_fixturesDir) {
            throw new Error('Could not find fixtures directory');
        }
    }
    return _fixturesDir;
}
function fromFixture(pathOrDirnameWithinFixturesDir, relativePathWithinBaseDir) {
    let filePath;
    let baseDirname;
    if (relativePathWithinBaseDir === undefined) {
        filePath = path.join(getFixturesDir(), pathOrDirnameWithinFixturesDir);
        baseDirname = path.dirname(filePath);
    }
    else {
        baseDirname = path.join(getFixturesDir(), pathOrDirnameWithinFixturesDir);
        filePath = path.join(baseDirname, relativePathWithinBaseDir);
    }
    const fileName = path.relative(baseDirname, filePath);
    const fileContents = fs.readFileSync(filePath).toString();
    return { kind: 'relativeFile', fileName, fileContents };
}
function fromFixtureDir(dirnameWithinFixturesDir, dirnameWithinDir) {
    const files = fs.readdirSync(path.join(getFixturesDir(), dirnameWithinFixturesDir, dirnameWithinDir ?? ''), { withFileTypes: true });
    const out = [];
    for (const file of files) {
        const nested = path.join(dirnameWithinDir ?? '', file.name);
        if (file.isFile()) {
            out.push(fromFixture(dirnameWithinFixturesDir, nested));
        }
        else if (file.isDirectory()) {
            out.push(...fromFixtureDir(dirnameWithinFixturesDir, nested));
        }
    }
    return out;
}
/**
 * Asserts that one of the given assertions passes.
 *
 * @template T - The type of the value returned by the assertions.
 * @param assertions - An array of functions that represent the assertions to be checked.
 * @returns - The value returned by the assertion that passes.
 * @throws {assert.AssertionError} - If none of the assertions pass.
 */
function assertOneOf(assertions) {
    for (const assertion of assertions) {
        try {
            return assertion();
        }
        catch (e) {
            if (!(e instanceof assert_1.default.AssertionError)) {
                throw e; // surface unexpected errors
            }
        }
    }
    throw new assert_1.default.AssertionError({ message: 'none of the assertions passed' });
}
function assertInlineEdit(outcome) {
    assert_1.default.strictEqual(outcome.type, 'inlineEdit', `'${outcome.type}' === 'inlineEdit'`);
}
function assertNoErrorOutcome(outcome) {
    assert_1.default.notEqual(outcome.type, 'error', `no error outcome expected`);
}
function assertConversationalOutcome(outcome) {
    assert_1.default.strictEqual(outcome.type, 'conversational', `'${outcome.type}' === 'conversational'`);
}
function assertWorkspaceEdit(outcome) {
    assert_1.default.strictEqual(outcome.type, 'workspaceEdit', `'${outcome.type}' === 'workspaceEdit'`);
}
/**
 * returns null if the files are identical
 */
function extractInlineReplaceEdits(outcome) {
    const originalLines = outcome.originalFileContents.split(/\r\n|\r|\n/g);
    const modifiedLines = outcome.fileContents.split(/\r\n|\r|\n/g);
    let ostart = 0;
    let mstart = 0;
    while (ostart < originalLines.length && mstart < modifiedLines.length && originalLines[ostart] === modifiedLines[mstart]) {
        ostart++;
        mstart++;
    }
    if (ostart === originalLines.length && mstart === modifiedLines.length) {
        // identical files
        return null;
    }
    let ostop = originalLines.length - 1;
    let mstop = modifiedLines.length - 1;
    while (ostop >= ostart && mstop >= mstart && originalLines[ostop] === modifiedLines[mstop]) {
        ostop--;
        mstop--;
    }
    const changedOriginalLines = originalLines.slice(ostart, ostop + 1);
    const changedModifiedLines = modifiedLines.slice(mstart, mstop + 1);
    return {
        kind: 'replaceEdit',
        originalStartLine: ostart,
        originalEndLine: ostop,
        modifiedStartLine: mstart,
        modifiedEndLine: mstop,
        changedOriginalLines,
        changedModifiedLines,
        allOriginalLines: originalLines,
        allModifiedLines: modifiedLines,
    };
}
function assertInlineEditShape(outcome, _expected) {
    assertInlineEdit(outcome);
    const actual = extractInlineReplaceEdits(outcome);
    assert_1.default.ok(actual, 'unexpected identical files');
    const actualLines = {
        line: actual.originalStartLine,
        originalLength: actual.originalEndLine - actual.originalStartLine + 1,
        modifiedLength: actual.modifiedEndLine - actual.modifiedStartLine + 1,
    };
    const originalLineCount = outcome.originalFileContents.split(/\r\n|\r|\n/g).length;
    const _expectedArr = Array.isArray(_expected) ? _expected : [_expected];
    const expectedArr = _expectedArr.map((expected) => {
        const line = (expected.line < 0 ? actual.allOriginalLines.length - ~expected.line : expected.line);
        const originalLength = expected.originalLength;
        const modifiedLength = (typeof expected.modifiedLength === 'undefined'
            ? (actual.allModifiedLines.length + originalLength - originalLineCount)
            : expected.modifiedLength);
        return { line, originalLength, modifiedLength };
    });
    let err;
    for (const expected of expectedArr) {
        try {
            assert_1.default.deepStrictEqual(actualLines, expected);
            return actual;
        }
        catch (e) {
            // Let's try the next one
            err = e;
        }
    }
    // No options matched
    // console.log(`\n`, JSON.stringify(actualLines), '\n', JSON.stringify(expectedArr));
    throw err;
}
function assertQualifiedFile(file) {
    if ('srcUri' in file && 'post' in file) {
        // New format - nothing to assert, it's already a qualified file equivalent
        return;
    }
    // Old format - check the kind
    assert_1.default.strictEqual(file.kind, 'qualifiedFile', `'${file.kind}' === 'qualifiedFile'`);
}
/**
 * Asserts that at least `n` out of `expected.length` strings are present in `actual` string.
 *
 * If `n` is not given, `n = Math.floor(1, expected.length / 2)` is used.
 */
function assertSomeStrings(actual, expected, n) {
    assert_1.default.ok(expected.length > 0, 'Need to expect at least one string');
    if (n === undefined) {
        n = Math.max(1, Math.floor(expected.length / 2));
    }
    let seen = 0;
    for (const item of expected) {
        if (actual.includes(item)) {
            seen++;
        }
    }
    assert_1.default.ok(seen >= n, `Expected to see at least ${n} of ${expected.join(',')}, but only saw ${seen} in ${actual}`);
}
function assertNoStrings(actual, expected) {
    assertSomeStrings(actual, expected, 0);
}
function assertOccursOnce(hay, needle) {
    const firstOccurrence = hay.indexOf(needle);
    (0, assert_1.default)(firstOccurrence > -1, `assertOccursOnce: no occurrence\n${JSON.stringify({ hay, needle }, null, '\t')}`);
    (0, assert_1.default)(hay.indexOf(needle, firstOccurrence + needle.length) === -1, `assertOccursOnce: more than 1 occurrence\n${JSON.stringify({ hay, needle }, null, '\t')}`);
}
function assertNoOccurrence(hay, needles) {
    needles = Array.isArray(needles) ? needles : [needles];
    for (const needle of needles) {
        (0, assert_1.default)(hay.indexOf(needle) === -1, `assertDoesNotOccur: occurrence\n${JSON.stringify({ hay, needle }, null, '\t')}`);
    }
}
function generateTempDirPath() {
    return path.join(__dirname, `../${sharedTypes_1.SIMULATION_FOLDER_NAME}/tmp-${(0, uuid_1.generateUuid)()}`);
}
async function createTempDir() {
    const folderPath = generateTempDirPath();
    await fs.promises.mkdir(folderPath, { recursive: true });
    return folderPath;
}
async function cleanTempDir(folderPath) {
    await fs.promises.rm(folderPath, { recursive: true, force: true });
}
async function cleanTempDirWithRetry(path, retry = 3) {
    // On windows, sometimes the tsc process holds locks on the directory even after it exits.
    // This tries to delete the folder a few times with a delay in between.
    let err = null;
    for (let i = 0; i < retry; i++) {
        try {
            await cleanTempDir(path);
            return;
        }
        catch (e) {
            err = e;
            await (0, async_1.timeout)(1000);
            // Ignore error
        }
    }
    console.error(`Failed to delete ${path} after ${retry} attempts.`, err);
}
//# sourceMappingURL=stestUtil.js.map