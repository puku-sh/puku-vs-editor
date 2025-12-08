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
exports.assertDocLines = assertDocLines;
exports.assertDocLinesForInlineComments = assertDocLinesForInlineComments;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("assert"));
function assertDocLines(fileContents, line, lineAssertion = (line) => { }) {
    const fileLines = (Array.isArray(fileContents)) ? fileContents : fileContents.split('\n');
    const lineNum = fileLines.findIndex(s => s.startsWith(line));
    assert.ok(lineNum >= 0, 'missing or unterminated doc comment');
    assert.strictEqual(fileLines[lineNum - 1].trim(), '*/', 'has closing */');
    for (let i = lineNum - 2; i >= 0; --i) {
        const line = fileLines[i];
        if (line.trimStart().startsWith('/**')) {
            return;
        }
        assert.ok(line.trimStart().startsWith('*'), 'has middle *');
        lineAssertion(line);
    }
}
/**
 * Golang & Ruby use inline comments for doc comments, ie golang uses `//` both for implementation & doc comments
 */
function assertDocLinesForInlineComments(fileContents, line, docCommentPrefix) {
    const fileLines = (Array.isArray(fileContents)) ? fileContents : fileContents.split('\n');
    const lineNum = fileLines.lastIndexOf(line);
    if (lineNum === -1) {
        throw new Error(`given line cannot be found: either original line was changed or test was incorrectly created`);
    }
    const indentation = fileLines[lineNum].match(/^\s+/)?.[0] ?? '';
    const expectedPrefix = `${indentation}${docCommentPrefix}`;
    let hadDoc = false;
    for (let i = lineNum - 1; i >= 0; --i) {
        const line = fileLines[i];
        if (line.startsWith(expectedPrefix)) {
            hadDoc = true;
        }
        else {
            break;
        }
    }
    assert.ok(hadDoc, 'did not see comments');
}
//# sourceMappingURL=slashDoc.util.js.map