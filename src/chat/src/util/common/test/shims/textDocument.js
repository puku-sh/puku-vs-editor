"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTextDocumentData = createTextDocumentData;
exports.setDocText = setDocText;
const strings_1 = require("../../../vs/base/common/strings");
const extHostDocumentData_1 = require("../../../vs/workbench/api/common/extHostDocumentData");
const textEdit_1 = require("../../../vs/workbench/api/common/extHostTypes/textEdit");
function createTextDocumentData(uri, contents, languageId, eol = undefined) {
    const lines = (0, strings_1.splitLines)(contents);
    eol = eol ?? (contents.indexOf('\r\n') !== -1 ? '\r\n' : '\n');
    const delegate = {
        $trySaveDocument: function (uri) {
            throw new Error('Not implemented.');
        }
    };
    return new extHostDocumentData_1.ExtHostDocumentData(delegate, uri, lines, eol, 1, languageId, false, 'utf8', false);
}
function setDocText(doc, text) {
    doc.onEvents({
        changes: [
            {
                range: {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: doc.document.lineCount,
                    endColumn: doc.document.lineAt(doc.document.lineCount - 1).text.length + 1,
                },
                rangeOffset: 0,
                rangeLength: doc.document.getText().length,
                text: text,
            },
        ],
        versionId: doc.document.version + 1,
        eol: (doc.document.eol === textEdit_1.EndOfLine.LF ? '\n' : '\r\n'),
        isUndoing: false,
        isRedoing: false,
    });
}
//# sourceMappingURL=textDocument.js.map