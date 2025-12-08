"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotebookSummaryChange = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const notebookSummaryTracker_1 = require("../../../../platform/notebook/common/notebookSummaryTracker");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const toolNames_1 = require("../../../tools/common/toolNames");
let NotebookSummaryChange = class NotebookSummaryChange extends prompt_tsx_1.PromptElement {
    constructor(props, promptPathRepresentationService, notebookStateTracker) {
        super(props);
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.notebookStateTracker = notebookStateTracker;
    }
    render(_state, _sizing) {
        const changedNotebooks = this.notebookStateTracker.listNotebooksWithChanges();
        if (!changedNotebooks.length) {
            return vscpp(vscppf, null);
        }
        changedNotebooks.forEach(nb => this.notebookStateTracker.clearState(nb));
        return (vscpp(vscppf, null,
            "The user has potentially added/removed/reordered or executed some of the cells of the following notebooks between the last request and now.",
            vscpp("br", null),
            "Ignore previous summary of all these notebooks returned by the tool ",
            toolNames_1.ToolName.GetNotebookSummary,
            ".",
            vscpp("br", null),
            changedNotebooks.map(nb => vscpp(vscppf, null,
                "- ",
                this.promptPathRepresentationService.getFilePath(nb.uri),
                ".",
                vscpp("br", null))),
            "So be sure to use the ",
            toolNames_1.ToolName.GetNotebookSummary,
            " to get the latest summary of the above notebooks.",
            vscpp("br", null)));
    }
};
exports.NotebookSummaryChange = NotebookSummaryChange;
exports.NotebookSummaryChange = NotebookSummaryChange = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(2, notebookSummaryTracker_1.INotebookSummaryTracker)
], NotebookSummaryChange);
//# sourceMappingURL=notebookSummaryChangePrompt.js.map