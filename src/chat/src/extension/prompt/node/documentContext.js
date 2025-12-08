"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDocumentContext = void 0;
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const languages_1 = require("../../../util/common/languages");
const arraysFind_1 = require("../../../util/vs/base/common/arraysFind");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptCraftingTypes_1 = require("../../inlineChat/node/promptCraftingTypes");
var IDocumentContext;
(function (IDocumentContext) {
    function fromEditor(editor, wholeRange) {
        const { options, document, selection, visibleRanges } = editor;
        const docSnapshot = textDocumentSnapshot_1.TextDocumentSnapshot.create(document);
        const fileIndentInfo = {
            insertSpaces: options.insertSpaces,
            tabSize: options.tabSize,
        };
        const language = (0, languages_1.getLanguage)(docSnapshot);
        if (!wholeRange) {
            if (visibleRanges.length === 1) {
                wholeRange = visibleRanges[0];
            }
            else if (visibleRanges.length > 1) {
                wholeRange = visibleRanges[0].union(visibleRanges[visibleRanges.length - 1]);
            }
            else {
                wholeRange = selection;
            }
        }
        return {
            document: docSnapshot, fileIndentInfo, language, selection, wholeRange
        };
    }
    IDocumentContext.fromEditor = fromEditor;
    function fromTextDocument(document, selection, wholeRange) {
        const docSnapshot = textDocumentSnapshot_1.TextDocumentSnapshot.create(document);
        const language = (0, languages_1.getLanguage)(docSnapshot);
        if (!wholeRange) {
            wholeRange = selection;
        }
        return {
            document: docSnapshot, fileIndentInfo: undefined, language, selection, wholeRange
        };
    }
    IDocumentContext.fromTextDocument = fromTextDocument;
    function inferDocumentContext(request, activeEditor, previousTurns) {
        let result;
        if (request.location2 instanceof vscodeTypes_1.ChatRequestEditorData) {
            const { document, wholeRange, selection } = request.location2;
            const docSnapshot = textDocumentSnapshot_1.TextDocumentSnapshot.create(document);
            result = {
                document: docSnapshot,
                language: (0, languages_1.getLanguage)(document),
                wholeRange,
                selection,
                fileIndentInfo: undefined
            };
        }
        else if (request.location2 instanceof vscodeTypes_1.ChatRequestNotebookData) {
            const { cell } = request.location2;
            const cellSnapshot = textDocumentSnapshot_1.TextDocumentSnapshot.create(cell);
            result = {
                document: cellSnapshot,
                language: (0, languages_1.getLanguage)(cell),
                wholeRange: new vscodeTypes_1.Range(0, 0, 0, 0),
                selection: new vscodeTypes_1.Selection(0, 0, 0, 0),
                fileIndentInfo: undefined
            };
        }
        else if (activeEditor) {
            result = IDocumentContext.fromEditor(activeEditor);
        }
        if (result) {
            const lastTurnWithInlineResponse = (0, arraysFind_1.findLast)(previousTurns, turn => Boolean(turn.getMetadata(promptCraftingTypes_1.CopilotInteractiveEditorResponse)));
            const data = lastTurnWithInlineResponse?.getMetadata(promptCraftingTypes_1.CopilotInteractiveEditorResponse);
            if (data && data.store && data.store.lastDocumentContent === result.document.getText()) {
                result.wholeRange = data.store.lastWholeRange;
            }
        }
        // DEFAULT - use the active editor's indent settings if none are set yet and if the editor and context document match
        if (activeEditor && activeEditor?.document.uri.toString() === result?.document.uri.toString() && !result.fileIndentInfo) {
            result.fileIndentInfo = {
                insertSpaces: activeEditor.options.insertSpaces,
                tabSize: activeEditor.options.tabSize,
            };
        }
        return result;
    }
    IDocumentContext.inferDocumentContext = inferDocumentContext;
})(IDocumentContext || (exports.IDocumentContext = IDocumentContext = {}));
//# sourceMappingURL=documentContext.js.map