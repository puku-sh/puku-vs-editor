"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertLooksLikeJSDoc = assertLooksLikeJSDoc;
exports.assertContainsAllSnippets = assertContainsAllSnippets;
exports.findTextBetweenMarkersFromTop = findTextBetweenMarkersFromTop;
exports.findTextBetweenMarkersFromBottom = findTextBetweenMarkersFromBottom;
exports.assertNoDiagnosticsAsync = assertNoDiagnosticsAsync;
exports.assertNoSyntacticDiagnosticsAsync = assertNoSyntacticDiagnosticsAsync;
exports.assertLessDiagnosticsAsync = assertLessDiagnosticsAsync;
exports.getWorkspaceDiagnostics = getWorkspaceDiagnostics;
exports.assertFileContent = assertFileContent;
exports.assertJSON = assertJSON;
exports.getFileContent = getFileContent;
exports.assertNoElidedCodeComments = assertNoElidedCodeComments;
exports.assertCriteriaMetAsync = assertCriteriaMetAsync;
exports.validateConsistentIndentation = validateConsistentIndentation;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert_1 = __importDefault(require("assert"));
const codeBlockFormattingRules_1 = require("../../src/extension/prompts/node/panel/codeBlockFormattingRules");
const aiEvaluationService_1 = require("../../src/extension/testing/node/aiEvaluationService");
const cancellation_1 = require("../../src/util/vs/base/common/cancellation");
const resources_1 = require("../../src/util/vs/base/common/resources");
const strings_1 = require("../../src/util/vs/base/common/strings");
const uri_1 = require("../../src/util/vs/base/common/uri");
const diagnosticProviders_1 = require("./diagnosticProviders");
function assertLooksLikeJSDoc(text) {
    text = text.trim();
    (0, assert_1.default)(text.startsWith('/**') && text.endsWith('*/'), `expected jsdoc, but got:\n${text}`);
}
function assertContainsAllSnippets(text, snippets, dbgMsg = '') {
    for (let i = 0, len = snippets.length; i < len; ++i) {
        const snippet = snippets[i];
        (0, assert_1.default)(text.indexOf(snippet) !== -1, `${dbgMsg} (contains snippet "${snippet}")`);
    }
}
/**
 * Searches for `marker1`, and then for `marker2` after `marker1`.
 */
function findTextBetweenMarkersFromTop(text, marker1, marker2) {
    const index1 = text.indexOf(marker1);
    if (index1 === -1) {
        return null;
    }
    const index2 = text.indexOf(marker2, index1 + 1);
    if (index2 === -1) {
        return null;
    }
    return text.substring(index1 + marker1.length, index2);
}
/**
 * Searches for `marker2`, and then for `marker1` before `marker2`.
 */
function findTextBetweenMarkersFromBottom(text, marker1, marker2) {
    const index2 = text.indexOf(marker2);
    if (index2 === -1) {
        return null;
    }
    const index1 = text.lastIndexOf(marker1, index2);
    if (index1 === -1) {
        return null;
    }
    return text.substring(index1 + marker1.length, index2);
}
/**
 * This method validates the outcome by finding if after the edit, there remain errors
 */
async function assertNoDiagnosticsAsync(accessor, outcome, workspace, method) {
    assert_1.default.strictEqual(outcome.type, 'inlineEdit');
    const diagnostics = await getWorkspaceDiagnostics(accessor, workspace, method);
    if (diagnostics.length > 0) {
        for (const diagnostic of diagnostics) {
            if (diagnostic.message.indexOf('indent') !== -1) {
                outcome.annotations.push({ label: 'indentation', message: diagnostic.message, severity: 'warning' });
            }
        }
    }
    assert_1.default.deepStrictEqual(diagnostics.length, 0, JSON.stringify(diagnostics, undefined, 2));
}
/**
 * This method validates the outcome by finding if after the edit, there remain errors
 */
async function assertNoSyntacticDiagnosticsAsync(accessor, outcome, workspace, method) {
    assert_1.default.strictEqual(outcome.type, 'inlineEdit');
    const diagnostics = await getWorkspaceDiagnostics(accessor, workspace, method);
    const syntacticDiagnostics = diagnostics.filter(d => d.kind === 'syntactic');
    assert_1.default.strictEqual(syntacticDiagnostics.length, 0, JSON.stringify(syntacticDiagnostics, undefined, 2));
}
/**
 * This method validates the outcome by comparing the number of errors before and after
 */
async function assertLessDiagnosticsAsync(accessor, outcome, workspace, method) {
    assert_1.default.strictEqual(outcome.type, 'inlineEdit');
    const initialDiagnostics = outcome.initialDiagnostics;
    assert_1.default.ok(initialDiagnostics);
    let numberOfDiagnosticsInitially = 0;
    for (const diagnostics of initialDiagnostics.values()) {
        numberOfDiagnosticsInitially += diagnostics.length;
    }
    const diagnostics = await getWorkspaceDiagnostics(accessor, workspace, method);
    const numberOfDiagnosticsAfter = diagnostics.length;
    assert_1.default.ok(numberOfDiagnosticsAfter < numberOfDiagnosticsInitially);
}
/**
 * Returns the diagnostics in all workspace files
 */
async function getWorkspaceDiagnostics(accessor, workspace, method) {
    const files = workspace.documents.map(doc => ({ fileName: workspace.getFilePath(doc.document.uri), fileContents: doc.document.getText() }));
    if (typeof method === 'string') {
        return await (0, diagnosticProviders_1.getDiagnostics)(accessor, files, method);
    }
    else {
        return await method.getDiagnostics(accessor, files);
    }
}
function assertFileContent(files, fileName) {
    const existing = [];
    for (const file of files) {
        // Handle new format
        if ('srcUri' in file && 'post' in file) {
            // Convert string to URI if needed
            const uri = typeof file.srcUri === 'string'
                ? uri_1.URI.parse(file.srcUri)
                : file.srcUri;
            const name = (0, resources_1.basename)(uri);
            if (name === fileName) {
                return file.post;
            }
            existing.push(name);
        }
        // Handle old format
        else {
            const name = file.kind === 'relativeFile' ? file.fileName : (0, resources_1.basename)(file.uri);
            if (name === fileName) {
                return file.fileContents;
            }
            existing.push(name);
        }
    }
    assert_1.default.fail(`Expected to find file ${fileName}. Files available: ${existing.join(', ')}`);
}
function assertJSON(content) {
    try {
        return JSON.parse(content);
    }
    catch (e) {
        assert_1.default.fail(`Expected JSON, but got: ${e.message}, ${content}`);
    }
}
/**
 * Helper function to get file content regardless of file format (old or new)
 */
function getFileContent(file) {
    if ('srcUri' in file && 'post' in file) {
        // New format
        return file.post;
    }
    else if ('kind' in file && (file.kind === 'relativeFile' || file.kind === 'qualifiedFile')) {
        // Old format
        return file.fileContents;
    }
    else {
        throw new Error(`Unknown file format: ${JSON.stringify(file)}`);
    }
}
function assertNoElidedCodeComments(outcome) {
    if (typeof outcome === 'string') {
        assert_1.default.ok(outcome.indexOf(codeBlockFormattingRules_1.EXISTING_CODE_MARKER) === -1, 'Expected no elided code comments');
    }
    else if (outcome.type === 'inlineEdit') {
        assertNoElidedCodeComments(outcome.fileContents);
    }
    else if (outcome.type === 'workspaceEdit') {
        for (const file of outcome.files) {
            // Use the helper function
            assertNoElidedCodeComments(getFileContent(file));
        }
    }
}
async function assertCriteriaMetAsync(accessor, response, criteria) {
    const evaluationService = accessor.get(aiEvaluationService_1.IAIEvaluationService);
    const result = await evaluationService.evaluate(response, criteria, cancellation_1.CancellationToken.None);
    assert_1.default.ok(result.errorMessage === undefined, `Error: ${result.errorMessage}`);
}
function validateConsistentIndentation(newText, insertSpaces, annotations) {
    const indentationRegex = insertSpaces ? /^[ ]*[\S$]/ : /^\t*(\S|$|( \*))/; // special handling for Doc comments that start with ` *
    const lines = (0, strings_1.splitLines)(newText);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length > 0 && !indentationRegex.test(line)) {
            const message = `Expected line ${i} to start with ${insertSpaces ? 'spaces' : 'tabs'}: ${line}`;
            annotations.push({ label: 'indentation', message, severity: 'warning' });
            //assert.fail(message);
        }
    }
}
//# sourceMappingURL=outcomeValidators.js.map