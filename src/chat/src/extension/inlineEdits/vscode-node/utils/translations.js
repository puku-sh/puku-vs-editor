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
exports.toInternalRange = toInternalRange;
exports.toExternalRange = toExternalRange;
exports.toInternalPosition = toInternalPosition;
exports.toExternalPosition = toExternalPosition;
exports.toInternalTextEdit = toInternalTextEdit;
exports.toExternalTextEdit = toExternalTextEdit;
const vscode = __importStar(require("vscode"));
const range_1 = require("../../../../util/vs/editor/common/core/range");
const position_1 = require("../../../../util/vs/editor/common/core/position");
const textEdit_1 = require("../../../../util/vs/editor/common/core/edits/textEdit");
function toInternalRange(range) {
    return new range_1.Range(range.start.line + 1, range.start.character + 1, range.end.line + 1, range.end.character + 1);
}
function toExternalRange(range) {
    return new vscode.Range(toExternalPosition(range.getStartPosition()), toExternalPosition(range.getEndPosition()));
}
function toInternalPosition(position) {
    return new position_1.Position(position.line + 1, position.character + 1);
}
function toExternalPosition(position) {
    return new vscode.Position(position.lineNumber - 1, position.column - 1);
}
function toInternalTextEdit(range, newText) {
    return new textEdit_1.TextReplacement(toInternalRange(range), newText);
}
function toExternalTextEdit(edit) {
    return new vscode.TextEdit(toExternalRange(edit.range), edit.text);
}
//# sourceMappingURL=translations.js.map