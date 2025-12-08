"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncDiagnosticCompletionProvider = void 0;
const textEdit_1 = require("../../../../../util/vs/editor/common/core/edits/textEdit");
const diagnosticsCompletions_1 = require("./diagnosticsCompletions");
class AsyncDiagnosticCompletionItem extends diagnosticsCompletions_1.DiagnosticCompletionItem {
    static { this.type = 'async'; }
    constructor(diagnostic, edit, workspaceDocument) {
        super(AsyncDiagnosticCompletionItem.type, diagnostic, edit, workspaceDocument);
        this.providerName = 'async';
    }
}
class AsyncDiagnosticCompletionProvider {
    static { this.SupportedLanguages = new Set(['typescript', 'javascript', 'typescriptreact', 'javascriptreact']); }
    constructor(_tracer) {
        this._tracer = _tracer;
        this.providerName = 'async';
    }
    providesCompletionsForDiagnostic(workspaceDocument, diagnostic, language, pos) {
        if (!AsyncDiagnosticCompletionProvider.SupportedLanguages.has(language)) {
            return false;
        }
        if (!(0, diagnosticsCompletions_1.isDiagnosticWithinDistance)(workspaceDocument, diagnostic, pos, 3)) {
            return false;
        }
        return isAsyncDiagnostics(diagnostic);
    }
    async provideDiagnosticCompletionItem(workspaceDocument, sortedDiagnostics, pos, logContext, token) {
        const missingAsyncDiagnostic = sortedDiagnostics.find(diagnostic => this.providesCompletionsForDiagnostic(workspaceDocument, diagnostic, workspaceDocument.languageId.get(), pos));
        if (missingAsyncDiagnostic === undefined) {
            return null;
        }
        // fetch code actions for missing async
        const availableCodeActions = await workspaceDocument.getCodeActions(missingAsyncDiagnostic.range, 3, token);
        if (availableCodeActions === undefined) {
            (0, diagnosticsCompletions_1.log)(`Fetching code actions likely timed out for \`${missingAsyncDiagnostic.message}\``, logContext, this._tracer);
            return null;
        }
        const asyncCodeActions = getAsyncCodeActions(availableCodeActions, workspaceDocument);
        if (asyncCodeActions.length === 0) {
            (0, diagnosticsCompletions_1.log)('No async code actions found in the available code actions', logContext, this._tracer);
            return null;
        }
        const asyncCodeActionToShow = asyncCodeActions[0];
        const item = new AsyncDiagnosticCompletionItem(missingAsyncDiagnostic, asyncCodeActionToShow.edit, workspaceDocument);
        (0, diagnosticsCompletions_1.log)(`Created async completion item for: \`${missingAsyncDiagnostic.toString()}\``, logContext, this._tracer);
        return item;
    }
}
exports.AsyncDiagnosticCompletionProvider = AsyncDiagnosticCompletionProvider;
function isAsyncDiagnostics(diagnostic) {
    return diagnostic.data.code === 1308;
}
const CODE_ACTION_ASYNC_TITLE_PREFIXES = ['Add async', 'Update async'];
function getAsyncCodeActions(codeActions, workspaceDocument) {
    const asyncCodeActions = [];
    for (const codeAction of codeActions) {
        const asyncTitlePrefix = CODE_ACTION_ASYNC_TITLE_PREFIXES.find(prefix => codeAction.title.startsWith(prefix));
        const isAsyncCodeAction = !!asyncTitlePrefix;
        if (!isAsyncCodeAction) {
            continue;
        }
        if (!codeAction.edits) {
            continue;
        }
        const joinedEdit = textEdit_1.TextReplacement.joinReplacements(codeAction.edits, workspaceDocument.value.get());
        asyncCodeActions.push({
            ...codeAction,
            edit: joinedEdit,
        });
    }
    return asyncCodeActions;
}
//# sourceMappingURL=asyncDiagnosticsCompletionProvider.js.map