"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDocstringFormat = validateDocstringFormat;
const indentationGuesser_1 = require("../../src/extension/prompt/node/indentationGuesser");
function validateDocstringFormat(fileContents, targetLineString) {
    const lines = fileContents.split('\n');
    const targetLineIndex = lines.findIndex(line => line.includes(targetLineString));
    if (targetLineIndex === -1) {
        throw new Error("Target line not found in the file contents.");
    }
    if (targetLineIndex === lines.length - 1) {
        throw new Error("Target line is the last line of the file. No space for a docstring.");
    }
    const indentation = (0, indentationGuesser_1.guessIndentation)(lines, 4, true);
    const tabSize = indentation.tabSize;
    const insertSpaces = indentation.insertSpaces;
    const targetLine = lines[targetLineIndex];
    const targetIndentation = targetLine.match(/^\s*/)?.[0] || '';
    // Check the next line for a docstring start
    const nextLine = lines[targetLineIndex + 1];
    const docstringStart = nextLine.trim().match(/^('''|""")/);
    if (!docstringStart) {
        throw new Error("No docstring found after the target line.");
    }
    const docstringIndentation = nextLine.match(/^\s*/)?.[0] || '';
    // Calculate the expected indentation
    let expectedIndentation;
    if (insertSpaces) {
        expectedIndentation = targetIndentation + ' '.repeat(tabSize);
    }
    else {
        expectedIndentation = targetIndentation + '\t';
    }
    // The docstring should have the expected indentation
    if (docstringIndentation !== expectedIndentation) {
        throw new Error(`Incorrect docstring indentation. Expected: '${expectedIndentation.replace(/ /g, '·')}', but got: '${docstringIndentation.replace(/ /g, '·')}'`);
    }
}
//# sourceMappingURL=slashDoc.py.stest.js.map