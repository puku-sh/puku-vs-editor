"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMDOpenModelPickerChat = exports.CMDOpenModelPickerClient = exports.ComparisonPanelVisible = exports.CopilotPanelVisible = exports.CMDCollectDiagnosticsChat = exports.CMDOpenDocumentationClient = exports.CMDOpenLogsClient = exports.CMDToggleCompletionsClient = exports.CMDDisableCompletionsClient = exports.CMDEnableCompletionsClient = exports.CMDToggleCompletionsChat = exports.CMDDisableCompletionsChat = exports.CMDEnableCompletionsChat = exports.CMDSendCompletionsFeedbackChat = exports.CMDToggleStatusMenuChat = exports.CMDToggleStatusMenuClient = exports.CMDNavigateNextPanelSolutionClient = exports.CMDNavigatePreviousPanelSolutionClient = exports.CMDAcceptCursorPanelSolutionClient = exports.CMDOpenPanelChat = exports.CMDOpenPanelClient = void 0;
// Commands ending with "Client" refer to the command ID used in the legacy Copilot extension.
// - These IDs should not appear in the package.json file
// - These IDs should be registered to support all functionality (except if this command needs to be supported when both extensions are loaded/active).
// Commands ending with "Chat" refer to the command ID used in the Copilot Chat extension.
// - These IDs should be used in package.json
// - These IDs should only be registered if they appear in the package.json (meaning the command palette) or if the command needs to be supported when both extensions are loaded/active.
exports.CMDOpenPanelClient = 'puku.generate';
exports.CMDOpenPanelChat = 'puku.chat.openSuggestionsPanel'; // "puku.chat.generate" is already being used
exports.CMDAcceptCursorPanelSolutionClient = 'puku.acceptCursorPanelSolution';
exports.CMDNavigatePreviousPanelSolutionClient = 'puku.previousPanelSolution';
exports.CMDNavigateNextPanelSolutionClient = 'puku.nextPanelSolution';
exports.CMDToggleStatusMenuClient = 'puku.toggleStatusMenu';
exports.CMDToggleStatusMenuChat = 'puku.chat.toggleStatusMenu';
// Needs to be supported in both extensions when they are loaded/active. Requires a different ID.
exports.CMDSendCompletionsFeedbackChat = 'puku.chat.sendCompletionFeedback';
exports.CMDEnableCompletionsChat = 'puku.chat.completions.enable';
exports.CMDDisableCompletionsChat = 'puku.chat.completions.disable';
exports.CMDToggleCompletionsChat = 'puku.chat.completions.toggle';
exports.CMDEnableCompletionsClient = 'puku.completions.enable';
exports.CMDDisableCompletionsClient = 'puku.completions.disable';
exports.CMDToggleCompletionsClient = 'puku.completions.toggle';
exports.CMDOpenLogsClient = 'puku.openLogs';
exports.CMDOpenDocumentationClient = 'puku.openDocs';
// Existing chat command reused for diagnostics
exports.CMDCollectDiagnosticsChat = 'puku.debug.collectDiagnostics';
// Context variable that enable/disable panel-specific commands
exports.CopilotPanelVisible = 'puku.panelVisible';
exports.ComparisonPanelVisible = 'puku.comparisonPanelVisible';
exports.CMDOpenModelPickerClient = 'puku.openModelPicker';
exports.CMDOpenModelPickerChat = 'puku.chat.openModelPicker';
//# sourceMappingURL=constants.js.map