/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var TerminalFindCommandId;
(function (TerminalFindCommandId) {
    TerminalFindCommandId["FindFocus"] = "workbench.action.terminal.focusFind";
    TerminalFindCommandId["FindHide"] = "workbench.action.terminal.hideFind";
    TerminalFindCommandId["FindNext"] = "workbench.action.terminal.findNext";
    TerminalFindCommandId["FindPrevious"] = "workbench.action.terminal.findPrevious";
    TerminalFindCommandId["ToggleFindRegex"] = "workbench.action.terminal.toggleFindRegex";
    TerminalFindCommandId["ToggleFindWholeWord"] = "workbench.action.terminal.toggleFindWholeWord";
    TerminalFindCommandId["ToggleFindCaseSensitive"] = "workbench.action.terminal.toggleFindCaseSensitive";
    TerminalFindCommandId["SearchWorkspace"] = "workbench.action.terminal.searchWorkspace";
})(TerminalFindCommandId || (TerminalFindCommandId = {}));
export const defaultTerminalFindCommandToSkipShell = [
    "workbench.action.terminal.focusFind" /* TerminalFindCommandId.FindFocus */,
    "workbench.action.terminal.hideFind" /* TerminalFindCommandId.FindHide */,
    "workbench.action.terminal.findNext" /* TerminalFindCommandId.FindNext */,
    "workbench.action.terminal.findPrevious" /* TerminalFindCommandId.FindPrevious */,
    "workbench.action.terminal.toggleFindRegex" /* TerminalFindCommandId.ToggleFindRegex */,
    "workbench.action.terminal.toggleFindWholeWord" /* TerminalFindCommandId.ToggleFindWholeWord */,
    "workbench.action.terminal.toggleFindCaseSensitive" /* TerminalFindCommandId.ToggleFindCaseSensitive */,
    "workbench.action.terminal.searchWorkspace" /* TerminalFindCommandId.SearchWorkspace */,
];
//# sourceMappingURL=terminal.find.js.map