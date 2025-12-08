"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnyDiagnosticCompletionProvider = exports.AnyDiagnosticCompletionItem = void 0;
const textEdit_1 = require("../../../../../util/vs/editor/common/core/edits/textEdit");
const diagnosticsCompletions_1 = require("./diagnosticsCompletions");
class AnyDiagnosticCompletionItem extends diagnosticsCompletions_1.DiagnosticCompletionItem {
    constructor(codeAction, diagnostic, _nextEditDisplayLabel, workspaceDocument) {
        super(codeAction.type, diagnostic, codeAction.edit, workspaceDocument);
        this._nextEditDisplayLabel = _nextEditDisplayLabel;
        this.providerName = 'any';
    }
    _getDisplayLocation() {
        if (!this._nextEditDisplayLabel) {
            return undefined;
        }
        const transformer = this._workspaceDocument.value.get().getTransformer();
        return { range: transformer.getRange(this.diagnostic.range), label: this._nextEditDisplayLabel };
    }
}
exports.AnyDiagnosticCompletionItem = AnyDiagnosticCompletionItem;
class AnyDiagnosticCompletionProvider {
    static { this.SupportedLanguages = new Set(['*']); }
    constructor(_tracer) {
        this._tracer = _tracer;
        this.providerName = 'any';
    }
    providesCompletionsForDiagnostic(workspaceDocument, diagnostic, language, pos) {
        return (0, diagnosticsCompletions_1.isDiagnosticWithinDistance)(workspaceDocument, diagnostic, pos, 5);
    }
    async provideDiagnosticCompletionItem(workspaceDocument, sortedDiagnostics, pos, logContext, token) {
        for (const diagnostic of sortedDiagnostics) {
            const availableCodeActions = await workspaceDocument.getCodeActions(diagnostic.range, 3, token);
            if (availableCodeActions === undefined) {
                (0, diagnosticsCompletions_1.log)(`Fetching code actions likely timed out for \`${diagnostic.message}\``, logContext, this._tracer);
                continue;
            }
            const codeActionsFixingCodeAction = availableCodeActions.filter(action => doesCodeActionFixDiagnostics(action, diagnostic));
            if (codeActionsFixingCodeAction.length === 0) {
                continue;
            }
            (0, diagnosticsCompletions_1.logList)(`Found the following code action which fix \`${diagnostic.message}\``, codeActionsFixingCodeAction, logContext, this._tracer);
            const filteredCodeActionsWithEdit = filterCodeActions(codeActionsFixingCodeAction);
            if (filteredCodeActionsWithEdit.length === 0) {
                continue;
            }
            const codeAction = filteredCodeActionsWithEdit[0];
            if (!codeAction.edits) {
                continue;
            }
            const joinedEdit = textEdit_1.TextReplacement.joinReplacements(codeAction.edits, workspaceDocument.value.get());
            const anyCodeAction = {
                edit: joinedEdit,
                type: getSanitizedCodeActionTitle(codeAction)
            };
            let displayLocationLabel;
            const editDistance = Math.abs(joinedEdit.range.startLineNumber - pos.lineNumber);
            if (editDistance > 12) {
                displayLocationLabel = codeAction.title;
            }
            const item = new AnyDiagnosticCompletionItem(anyCodeAction, diagnostic, displayLocationLabel, workspaceDocument);
            (0, diagnosticsCompletions_1.log)(`Created Completion Item for diagnostic: ${diagnostic.message}: ${item.toLineEdit().toString()}`);
            return item;
        }
        return null;
    }
    completionItemRejected(item) { }
}
exports.AnyDiagnosticCompletionProvider = AnyDiagnosticCompletionProvider;
function doesCodeActionFixDiagnostics(action, diagnostic) {
    return action.diagnostics.some(d => diagnostic.data.message === d.message && diagnostic.data.range.equals(d.range));
}
function getSanitizedCodeActionTitle(action) {
    return action.title.replace(/(["'])(.*?)\1/g, '$1...$1');
}
function filterCodeActions(codeActionsWithEdit) {
    return codeActionsWithEdit.filter(action => {
        const edit = action.edits;
        if (!edit) {
            return false;
        }
        if (action.title === 'Infer parameter types from usage') {
            if (edit.length === 0) {
                return false;
            }
            if (edit.length === 1 && ['any', 'unknown', 'undefined'].some(e => edit[0].text.includes(e))) {
                return false;
            }
        }
        return true;
    });
}
//# sourceMappingURL=anyDiagnosticsCompletionProvider.js.map