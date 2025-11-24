/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Commands ending with "Client" refer to the command ID used in the legacy Copilot extension.
// - These IDs should not appear in the package.json file
// - These IDs should be registered to support all functionality (except if this command needs to be supported when both extensions are loaded/active).
// Commands ending with "Chat" refer to the command ID used in the Copilot Chat extension.
// - These IDs should be used in package.json
// - These IDs should only be registered if they appear in the package.json (meaning the command palette) or if the command needs to be supported when both extensions are loaded/active.

export const CMDOpenPanelClient = 'puku.generate';
export const CMDOpenPanelChat = 'puku.chat.openSuggestionsPanel'; // "puku.chat.generate" is already being used

export const CMDAcceptCursorPanelSolutionClient = 'puku.acceptCursorPanelSolution';
export const CMDNavigatePreviousPanelSolutionClient = 'puku.previousPanelSolution';
export const CMDNavigateNextPanelSolutionClient = 'puku.nextPanelSolution';

export const CMDToggleStatusMenuClient = 'puku.toggleStatusMenu';
export const CMDToggleStatusMenuChat = 'puku.chat.toggleStatusMenu';

// Needs to be supported in both extensions when they are loaded/active. Requires a different ID.
export const CMDSendCompletionsFeedbackChat = 'puku.chat.sendCompletionFeedback';

export const CMDEnableCompletionsChat = 'puku.chat.completions.enable';
export const CMDDisableCompletionsChat = 'puku.chat.completions.disable';
export const CMDToggleCompletionsChat = 'puku.chat.completions.toggle';
export const CMDEnableCompletionsClient = 'puku.completions.enable';
export const CMDDisableCompletionsClient = 'puku.completions.disable';
export const CMDToggleCompletionsClient = 'puku.completions.toggle';

export const CMDOpenLogsClient = 'puku.openLogs';
export const CMDOpenDocumentationClient = 'puku.openDocs';

// Existing chat command reused for diagnostics
export const CMDCollectDiagnosticsChat = 'puku.debug.collectDiagnostics';

// Context variable that enable/disable panel-specific commands
export const CopilotPanelVisible = 'puku.panelVisible';
export const ComparisonPanelVisible = 'puku.comparisonPanelVisible';

export const CMDOpenModelPickerClient = 'puku.openModelPicker';
export const CMDOpenModelPickerChat = 'puku.chat.openModelPicker';