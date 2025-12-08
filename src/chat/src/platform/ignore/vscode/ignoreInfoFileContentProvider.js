"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotIgnoreInfoFileContentProvider = void 0;
class CopilotIgnoreInfoFileContentProvider {
    constructor(contentProvider) {
        this.contentProvider = contentProvider;
    }
    async provideTextDocumentContent(uri, token) {
        return this.contentProvider();
    }
}
exports.CopilotIgnoreInfoFileContentProvider = CopilotIgnoreInfoFileContentProvider;
//# sourceMappingURL=ignoreInfoFileContentProvider.js.map