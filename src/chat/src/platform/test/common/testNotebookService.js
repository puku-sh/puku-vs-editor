"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockNotebookService = void 0;
exports.mockNotebookService = new class {
    async getVariables(notebook) {
        return [];
    }
    async getPipPackages(notebook) {
        return [];
    }
    setVariables(notebook, variables) {
    }
    getCellExecutions(notebook) {
        return [];
    }
    runCells(notebook, range, autoreveal) {
        return Promise.resolve();
    }
    ensureKernelSelected(notebook) {
        return Promise.resolve();
    }
    populateNotebookProviders() {
        return;
    }
    hasSupportedNotebooks(uri) {
        return false;
    }
    trackAgentUsage() { }
    setFollowState(state) { }
    getFollowState() {
        return false;
    }
}();
//# sourceMappingURL=testNotebookService.js.map