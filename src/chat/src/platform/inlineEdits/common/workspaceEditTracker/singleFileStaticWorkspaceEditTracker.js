"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleFileStaticWorkspaceTracker = void 0;
const edit_1 = require("../dataTypes/edit");
const languageId_1 = require("../dataTypes/languageId");
const historyContextProvider_1 = require("./historyContextProvider");
class SingleFileStaticWorkspaceTracker {
    constructor(recentEdit) {
        this.recentEdit = recentEdit;
    }
    getHistoryContext(docId) {
        return new historyContextProvider_1.HistoryContext([
            new historyContextProvider_1.DocumentHistory(docId, languageId_1.LanguageId.PlainText, this.recentEdit.base, edit_1.Edits.single(this.recentEdit.edit), undefined)
        ]);
    }
}
exports.SingleFileStaticWorkspaceTracker = SingleFileStaticWorkspaceTracker;
//# sourceMappingURL=singleFileStaticWorkspaceEditTracker.js.map