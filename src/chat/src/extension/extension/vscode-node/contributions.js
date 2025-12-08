"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vscodeNodeChatContributions = exports.vscodeNodeContributions = void 0;
const authentication_contribution_1 = require("../../authentication/vscode-node/authentication.contribution");
const chatQuota_contribution_1 = require("../../chat/vscode-node/chatQuota.contribution");
const chatSessions_1 = require("../../chatSessions/vscode-node/chatSessions");
const pukuaiContribution_1 = require("../../pukuai/vscode-node/pukuaiContribution");
const chatBlockLanguageContribution = __importStar(require("../../codeBlocks/vscode-node/chatBlockLanguageFeatures.contribution"));
const contributions_1 = require("../../common/contributions");
const completionsCoreContribution_1 = require("../../completions/vscode-node/completionsCoreContribution");
const completionsUnificationContribution_1 = require("../../completions/vscode-node/completionsUnificationContribution");
const configurationMigration_1 = require("../../configuration/vscode-node/configurationMigration");
const contextKeys_contribution_1 = require("../../contextKeys/vscode-node/contextKeys.contribution");
const placeholderView_contribution_1 = require("../../contextKeys/vscode-node/placeholderView.contribution");
const aiMappedEditsContrib_1 = require("../../conversation/vscode-node/aiMappedEditsContrib");
const conversationFeature_1 = require("../../conversation/vscode-node/conversationFeature");
const feedbackContribution_1 = require("../../conversation/vscode-node/feedbackContribution");
const languageModelAccess_1 = require("../../conversation/vscode-node/languageModelAccess");
const logWorkspaceState_1 = require("../../conversation/vscode-node/logWorkspaceState");
const remoteAgents_1 = require("../../conversation/vscode-node/remoteAgents");
const diagnosticsContextProvider_1 = require("../../diagnosticsContext/vscode/diagnosticsContextProvider");
const lmProxyContrib_1 = require("../../externalAgents/vscode-node/lmProxyContrib");
const commands_1 = require("../../getting-started/vscode-node/commands");
const newWorkspaceContribution = __importStar(require("../../getting-started/vscode-node/newWorkspace.contribution"));
const ignoreProvider_1 = require("../../ignore/vscode-node/ignoreProvider");
const inlineEditProviderFeature_1 = require("../../inlineEdits/vscode-node/inlineEditProviderFeature");
const fixTestFailureContributions_1 = require("../../intents/vscode-node/fixTestFailureContributions");
const testGenLens_1 = require("../../intents/vscode-node/testGenLens");
const loggingActions_1 = require("../../log/vscode-node/loggingActions");
const requestLogTree_1 = require("../../log/vscode-node/requestLogTree");
const commands_2 = require("../../mcp/vscode-node/commands");
const followActions_1 = require("../../notebook/vscode-node/followActions");
const copilotDebugCommandContribution_1 = require("../../onboardDebug/vscode-node/copilotDebugCommandContribution");
const onboardTerminalTestsContribution_1 = require("../../onboardDebug/vscode-node/onboardTerminalTestsContribution");
const debugCommands_1 = require("../../prompt/vscode-node/debugCommands");
const renameSuggestions_1 = require("../../prompt/vscode-node/renameSuggestions");
const promptFileContextService_1 = require("../../promptFileContext/vscode-node/promptFileContextService");
const relatedFiles_contribution_1 = require("../../relatedFiles/vscode-node/relatedFiles.contribution");
const chatReplayContrib_1 = require("../../replay/vscode-node/chatReplayContrib");
const commands_3 = require("../../search/vscode-node/commands");
const settingsSchemaFeature_1 = require("../../settingsSchema/vscode-node/settingsSchemaFeature");
const surveyCommands_1 = require("../../survey/vscode-node/surveyCommands");
const setupTestContributions_1 = require("../../testing/vscode/setupTestContributions");
const tools_1 = require("../../tools/vscode-node/tools");
const languageContextService_1 = require("../../typescriptContext/vscode-node/languageContextService");
const workspaceChunkSearchContribution = __importStar(require("../../workspaceChunkSearch/node/workspaceChunkSearch.contribution"));
const workspaceIndexingContribution = __importStar(require("../../workspaceChunkSearch/vscode-node/workspaceChunkSearch.contribution"));
const workspaceRecorderFeature_1 = require("../../workspaceRecorder/vscode-node/workspaceRecorderFeature");
const pukuIndexing_contribution_1 = require("../../pukuIndexing/vscode-node/pukuIndexing.contribution");
const pukuSemanticContextProvider_1 = require("../../pukuIndexing/vscode-node/pukuSemanticContextProvider");
const pukuChat_contribution_1 = require("../../pukuChat/vscode-node/pukuChat.contribution");
const pukuAuth_contribution_1 = require("../../pukuAuth/vscode-node/pukuAuth.contribution");
const contributions_2 = __importDefault(require("../vscode/contributions"));
// ###################################################################################################
// ###                                                                                             ###
// ###                   Node contributions run ONLY in node.js extension host.                    ###
// ###                                                                                             ###
// ### !!! Prefer to list contributions in ../vscode/contributions.ts to support them anywhere !!! ###
// ###                                                                                             ###
// ###################################################################################################
exports.vscodeNodeContributions = [
    ...contributions_2.default,
    (0, contributions_1.asContributionFactory)(conversationFeature_1.ConversationFeature),
    workspaceChunkSearchContribution,
    (0, contributions_1.asContributionFactory)(authentication_contribution_1.AuthenticationContrib),
    (0, contributions_1.asContributionFactory)(pukuAuth_contribution_1.PukuAuthContribution),
    chatBlockLanguageContribution,
    (0, contributions_1.asContributionFactory)(loggingActions_1.LoggingActionsContrib),
    (0, contributions_1.asContributionFactory)(contextKeys_contribution_1.ContextKeysContribution),
    (0, contributions_1.asContributionFactory)(placeholderView_contribution_1.PlaceholderViewContribution),
    (0, contributions_1.asContributionFactory)(copilotDebugCommandContribution_1.CopilotDebugCommandContribution),
    (0, contributions_1.asContributionFactory)(debugCommands_1.DebugCommandsContribution),
    (0, contributions_1.asContributionFactory)(pukuaiContribution_1.PukuAIContribution),
    (0, contributions_1.asContributionFactory)(languageModelAccess_1.LanguageModelAccess),
    (0, contributions_1.asContributionFactory)(commands_1.WalkthroughCommandContribution),
    (0, contributions_1.asContributionFactory)(inlineEditProviderFeature_1.InlineEditProviderFeature),
    (0, contributions_1.asContributionFactory)(settingsSchemaFeature_1.SettingsSchemaFeature),
    (0, contributions_1.asContributionFactory)(workspaceRecorderFeature_1.WorkspaceRecorderFeature),
    (0, contributions_1.asContributionFactory)(surveyCommands_1.SurveyCommandContribution),
    (0, contributions_1.asContributionFactory)(feedbackContribution_1.FeedbackCommandContribution),
    (0, contributions_1.asContributionFactory)(languageContextService_1.InlineCompletionContribution),
    (0, contributions_1.asContributionFactory)(commands_3.SearchPanelCommands),
    (0, contributions_1.asContributionFactory)(chatQuota_contribution_1.ChatQuotaContribution),
    (0, contributions_1.asContributionFactory)(followActions_1.NotebookFollowCommands),
    (0, contributions_1.asContributionFactory)(promptFileContextService_1.PromptFileContextContribution),
    (0, contributions_1.asContributionFactory)(diagnosticsContextProvider_1.DiagnosticsContextContribution),
    (0, contributions_1.asContributionFactory)(chatReplayContrib_1.ChatReplayContribution),
    (0, contributions_1.asContributionFactory)(completionsCoreContribution_1.CompletionsCoreContribution),
    (0, contributions_1.asContributionFactory)(completionsUnificationContribution_1.CompletionsUnificationContribution),
    workspaceIndexingContribution,
    (0, contributions_1.asContributionFactory)(chatSessions_1.ChatSessionsContrib),
    (0, contributions_1.asContributionFactory)(pukuIndexing_contribution_1.PukuIndexingContribution),
    (0, contributions_1.asContributionFactory)(pukuSemanticContextProvider_1.PukuSemanticContextProvider),
    (0, contributions_1.asContributionFactory)(pukuChat_contribution_1.PukuChatContribution),
];
/**
 * These contributions are special in that they are only instantiated
 * when the user is logged in and chat is enabled.
 * Anything that contributes a copilot chat feature that doesn't need
 * to run when chat is not enabled should be added here.
*/
exports.vscodeNodeChatContributions = [
    (0, contributions_1.asContributionFactory)(configurationMigration_1.ConfigurationMigrationContribution),
    (0, contributions_1.asContributionFactory)(testGenLens_1.TestGenLensContribution),
    (0, contributions_1.asContributionFactory)(requestLogTree_1.RequestLogTree),
    (0, contributions_1.asContributionFactory)(onboardTerminalTestsContribution_1.OnboardTerminalTestsContribution),
    (0, contributions_1.asContributionFactory)(tools_1.ToolsContribution),
    (0, contributions_1.asContributionFactory)(remoteAgents_1.RemoteAgentContribution),
    (0, contributions_1.asContributionFactory)(aiMappedEditsContrib_1.AiMappedEditsContrib),
    (0, contributions_1.asContributionFactory)(renameSuggestions_1.RenameSuggestionsContrib),
    (0, contributions_1.asContributionFactory)(logWorkspaceState_1.LogWorkspaceStateContribution),
    (0, contributions_1.asContributionFactory)(setupTestContributions_1.SetupTestsContribution),
    (0, contributions_1.asContributionFactory)(fixTestFailureContributions_1.FixTestFailureContribution),
    (0, contributions_1.asContributionFactory)(ignoreProvider_1.IgnoredFileProviderContribution),
    (0, contributions_1.asContributionFactory)(relatedFiles_contribution_1.RelatedFilesProviderContribution),
    // Puku Editor: BYOKContrib moved to main contributions to support Ollama without auth
    (0, contributions_1.asContributionFactory)(commands_2.McpSetupCommands),
    (0, contributions_1.asContributionFactory)(lmProxyContrib_1.LanguageModelProxyContrib),
    newWorkspaceContribution,
];
//# sourceMappingURL=contributions.js.map