"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextProviderMatch = contextProviderMatch;
const vscode_1 = require("vscode");
const documentEvaluation_1 = require("../../lib/src/util/documentEvaluation");
async function contextProviderMatch(instantiationService, documentSelector, documentContext) {
    const vscDoc = vscode_1.workspace.textDocuments.find(td => td.uri.toString() === documentContext.uri);
    if (!vscDoc) {
        return 0;
    }
    const result = await instantiationService.invokeFunction(documentEvaluation_1.isDocumentValid, documentContext);
    if (result.status !== 'valid') {
        return 0;
    }
    return vscode_1.languages.match(documentSelector, vscDoc);
}
//# sourceMappingURL=contextProviderMatch.js.map