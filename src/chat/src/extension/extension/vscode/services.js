"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerServices = registerServices;
const vscode_1 = require("vscode");
const copilotTokenStore_1 = require("../../../platform/authentication/common/copilotTokenStore");
const authenticationUpgrade_1 = require("../../../platform/authentication/common/authenticationUpgrade");
const blockedExtensionService_1 = require("../../../platform/chat/common/blockedExtensionService");
const chatQuotaService_1 = require("../../../platform/chat/common/chatQuotaService");
const chatQuotaServiceImpl_1 = require("../../../platform/chat/common/chatQuotaServiceImpl");
const chatSessionService_1 = require("../../../platform/chat/common/chatSessionService");
const conversationOptions_1 = require("../../../platform/chat/common/conversationOptions");
const interactionService_1 = require("../../../platform/chat/common/interactionService");
const chatSessionService_2 = require("../../../platform/chat/vscode/chatSessionService");
const runCommandExecutionService_1 = require("../../../platform/commands/common/runCommandExecutionService");
const runCommandExecutionServiceImpl_1 = require("../../../platform/commands/vscode/runCommandExecutionServiceImpl");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const configurationServiceImpl_1 = require("../../../platform/configuration/vscode/configurationServiceImpl");
const customInstructionsService_1 = require("../../../platform/customInstructions/common/customInstructionsService");
const debugOutputService_1 = require("../../../platform/debug/common/debugOutputService");
const debugOutputServiceImpl_1 = require("../../../platform/debug/vscode/debugOutputServiceImpl");
const dialogService_1 = require("../../../platform/dialog/common/dialogService");
const dialogServiceImpl_1 = require("../../../platform/dialog/vscode/dialogServiceImpl");
const editSurvivalTrackerService_1 = require("../../../platform/editSurvivalTracking/common/editSurvivalTrackerService");
const embeddingsComputer_1 = require("../../../platform/embeddings/common/embeddingsComputer");
const remoteEmbeddingsComputer_1 = require("../../../platform/embeddings/common/remoteEmbeddingsComputer");
const vscodeIndex_1 = require("../../../platform/embeddings/common/vscodeIndex");
const envService_1 = require("../../../platform/env/common/envService");
const envServiceImpl_1 = require("../../../platform/env/vscode/envServiceImpl");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const extensionsService_1 = require("../../../platform/extensions/common/extensionsService");
const extensionsService_2 = require("../../../platform/extensions/vscode/extensionsService");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const fileSystemServiceImpl_1 = require("../../../platform/filesystem/vscode/fileSystemServiceImpl");
const gitExtensionService_1 = require("../../../platform/git/common/gitExtensionService");
const gitService_1 = require("../../../platform/git/common/gitService");
const gitExtensionServiceImpl_1 = require("../../../platform/git/vscode/gitExtensionServiceImpl");
const gitServiceImpl_1 = require("../../../platform/git/vscode/gitServiceImpl");
const githubService_1 = require("../../../platform/github/common/githubService");
const nullOctokitServiceImpl_1 = require("../../../platform/github/common/nullOctokitServiceImpl");
const octoKitServiceImpl_1 = require("../../../platform/github/common/octoKitServiceImpl");
const interactiveSessionService_1 = require("../../../platform/interactive/common/interactiveSessionService");
const interactiveSessionServiceImpl_1 = require("../../../platform/interactive/vscode/interactiveSessionServiceImpl");
const languageDiagnosticsService_1 = require("../../../platform/languages/common/languageDiagnosticsService");
const languageFeaturesService_1 = require("../../../platform/languages/common/languageFeaturesService");
const languageDiagnosticsServiceImpl_1 = require("../../../platform/languages/vscode/languageDiagnosticsServiceImpl");
const languageFeaturesServicesImpl_1 = require("../../../platform/languages/vscode/languageFeaturesServicesImpl");
const logService_1 = require("../../../platform/log/common/logService");
const outputChannelLogTarget_1 = require("../../../platform/log/vscode/outputChannelLogTarget");
const editLogService_1 = require("../../../platform/multiFileEdit/common/editLogService");
const multiFileEditQualityTelemetry_1 = require("../../../platform/multiFileEdit/common/multiFileEditQualityTelemetry");
const networking_1 = require("../../../platform/networking/common/networking");
const alternativeContent_1 = require("../../../platform/notebook/common/alternativeContent");
const alternativeContentEditGenerator_1 = require("../../../platform/notebook/common/alternativeContentEditGenerator");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const notebookSummaryTracker_1 = require("../../../platform/notebook/common/notebookSummaryTracker");
const notebookServiceImpl_1 = require("../../../platform/notebook/vscode/notebookServiceImpl");
const notebookSummaryTrackerImpl_1 = require("../../../platform/notebook/vscode/notebookSummaryTrackerImpl");
const notificationService_1 = require("../../../platform/notification/common/notificationService");
const notificationServiceImpl_1 = require("../../../platform/notification/vscode/notificationServiceImpl");
const opener_1 = require("../../../platform/open/common/opener");
const opener_2 = require("../../../platform/open/vscode/opener");
const projectTemplatesIndex_1 = require("../../../platform/projectTemplatesIndex/common/projectTemplatesIndex");
const promptsService_1 = require("../../../platform/promptFiles/common/promptsService");
const promptsServiceImpl_1 = require("../../../platform/promptFiles/common/promptsServiceImpl");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const releaseNotesService_1 = require("../../../platform/releaseNotes/common/releaseNotesService");
const releaseNotesServiceImpl_1 = require("../../../platform/releaseNotes/vscode/releaseNotesServiceImpl");
const remoteRepositories_1 = require("../../../platform/remoteRepositories/vscode/remoteRepositories");
const reviewService_1 = require("../../../platform/review/common/reviewService");
const reviewServiceImpl_1 = require("../../../platform/review/vscode/reviewServiceImpl");
const simulationTestContext_1 = require("../../../platform/simulationTestContext/common/simulationTestContext");
const snippyService_1 = require("../../../platform/snippy/common/snippyService");
const snippyServiceImpl_1 = require("../../../platform/snippy/common/snippyServiceImpl");
const surveyService_1 = require("../../../platform/survey/common/surveyService");
const surveyServiceImpl_1 = require("../../../platform/survey/vscode/surveyServiceImpl");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const tabsAndEditorsServiceImpl_1 = require("../../../platform/tabs/vscode/tabsAndEditorsServiceImpl");
const tasksService_1 = require("../../../platform/tasks/common/tasksService");
const tasksService_2 = require("../../../platform/tasks/vscode/tasksService");
const terminalService_1 = require("../../../platform/terminal/common/terminalService");
const terminalServiceImpl_1 = require("../../../platform/terminal/vscode/terminalServiceImpl");
const testProvider_1 = require("../../../platform/testing/common/testProvider");
const testProviderImpl_1 = require("../../../platform/testing/vscode/testProviderImpl");
const workbenchService_1 = require("../../../platform/workbench/common/workbenchService");
const workbenchServiceImpt_1 = require("../../../platform/workbench/vscode/workbenchServiceImpt");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const workspaceServiceImpl_1 = require("../../../platform/workspace/vscode/workspaceServiceImpl");
const descriptors_1 = require("../../../util/vs/platform/instantiation/common/descriptors");
const mergeConflictService_1 = require("../../git/common/mergeConflictService");
const mergeConflictServiceImpl_1 = require("../../git/vscode/mergeConflictServiceImpl");
const launchConfigService_1 = require("../../onboardDebug/common/launchConfigService");
const launchConfigService_2 = require("../../onboardDebug/vscode/launchConfigService");
const editToolLearningService_1 = require("../../tools/common/editToolLearningService");
const toolEmbeddingsComputer_1 = require("../../tools/common/virtualTools/toolEmbeddingsComputer");
const toolGroupingService_1 = require("../../tools/common/virtualTools/toolGroupingService");
const virtualToolGroupCache_1 = require("../../tools/common/virtualTools/virtualToolGroupCache");
const virtualToolTypes_1 = require("../../tools/common/virtualTools/virtualToolTypes");
// ##########################################################################
// ###                                                                    ###
// ###      Services that run in both web and node.js extension host.     ###
// ###                                                                    ###
// ### !!! Prefer to list services in HERE to support them anywhere !!!   ###
// ###                                                                    ###
// ##########################################################################
function registerServices(builder, extensionContext) {
    const isTestMode = extensionContext.extensionMode === vscode_1.ExtensionMode.Test;
    builder.define(interactionService_1.IInteractionService, new descriptors_1.SyncDescriptor(interactionService_1.InteractionService));
    builder.define(copilotTokenStore_1.ICopilotTokenStore, new copilotTokenStore_1.CopilotTokenStore());
    builder.define(debugOutputService_1.IDebugOutputService, new debugOutputServiceImpl_1.DebugOutputServiceImpl());
    builder.define(dialogService_1.IDialogService, new dialogServiceImpl_1.DialogServiceImpl());
    builder.define(envService_1.IEnvService, new envServiceImpl_1.EnvServiceImpl());
    builder.define(fileSystemService_1.IFileSystemService, new fileSystemServiceImpl_1.VSCodeFileSystemService());
    builder.define(networking_1.IHeaderContributors, new networking_1.HeaderContributors());
    builder.define(notebookService_1.INotebookService, new descriptors_1.SyncDescriptor(notebookServiceImpl_1.NotebookService));
    builder.define(notebookSummaryTracker_1.INotebookSummaryTracker, new descriptors_1.SyncDescriptor(notebookSummaryTrackerImpl_1.NotebookSummaryTrackerImpl));
    builder.define(alternativeContent_1.IAlternativeNotebookContentService, new descriptors_1.SyncDescriptor(alternativeContent_1.AlternativeNotebookContentService));
    builder.define(alternativeContentEditGenerator_1.IAlternativeNotebookContentEditGenerator, new descriptors_1.SyncDescriptor(alternativeContentEditGenerator_1.AlternativeNotebookContentEditGenerator));
    builder.define(remoteRepositories_1.IRemoteRepositoriesService, new remoteRepositories_1.RemoteRepositoriesService());
    builder.define(tabsAndEditorsService_1.ITabsAndEditorsService, new tabsAndEditorsServiceImpl_1.TabsAndEditorsServiceImpl());
    builder.define(terminalService_1.ITerminalService, new descriptors_1.SyncDescriptor(terminalServiceImpl_1.TerminalServiceImpl));
    builder.define(testProvider_1.ITestProvider, new descriptors_1.SyncDescriptor(testProviderImpl_1.TestProvider));
    builder.define(opener_1.IUrlOpener, isTestMode && !envService_1.isScenarioAutomation ? new opener_1.NullUrlOpener() : new opener_2.RealUrlOpener());
    builder.define(notificationService_1.INotificationService, isTestMode && !envService_1.isScenarioAutomation ? new notificationService_1.NullNotificationService() : new notificationServiceImpl_1.NotificationService());
    builder.define(extensionContext_1.IVSCodeExtensionContext, /*force _serviceBrand*/ extensionContext);
    builder.define(workbenchService_1.IWorkbenchService, new workbenchServiceImpt_1.WorkbenchServiceImpl());
    builder.define(conversationOptions_1.IConversationOptions, {
        _serviceBrand: undefined,
        maxResponseTokens: undefined,
        temperature: 0.1,
        topP: 1,
        rejectionMessage: vscode_1.l10n.t('Sorry, but I can only assist with programming related questions.'),
    });
    builder.define(chatSessionService_1.IChatSessionService, new descriptors_1.SyncDescriptor(chatSessionService_2.ChatSessionService));
    builder.define(configurationService_1.IConfigurationService, new descriptors_1.SyncDescriptor(configurationServiceImpl_1.ConfigurationServiceImpl));
    builder.define(logService_1.ILogService, new descriptors_1.SyncDescriptor(logService_1.LogServiceImpl, [[new outputChannelLogTarget_1.NewOutputChannelLogTarget(extensionContext)]]));
    builder.define(chatQuotaService_1.IChatQuotaService, new descriptors_1.SyncDescriptor(chatQuotaServiceImpl_1.ChatQuotaService));
    builder.define(tasksService_1.ITasksService, new descriptors_1.SyncDescriptor(tasksService_2.TasksService));
    builder.define(gitExtensionService_1.IGitExtensionService, new descriptors_1.SyncDescriptor(gitExtensionServiceImpl_1.GitExtensionServiceImpl));
    builder.define(gitService_1.IGitService, new descriptors_1.SyncDescriptor(gitServiceImpl_1.GitServiceImpl));
    builder.define(githubService_1.IOctoKitService, envService_1.isScenarioAutomation ? new descriptors_1.SyncDescriptor(nullOctokitServiceImpl_1.NullBaseOctoKitService) : new descriptors_1.SyncDescriptor(octoKitServiceImpl_1.OctoKitService));
    builder.define(reviewService_1.IReviewService, new descriptors_1.SyncDescriptor(reviewServiceImpl_1.ReviewServiceImpl));
    builder.define(languageDiagnosticsService_1.ILanguageDiagnosticsService, new descriptors_1.SyncDescriptor(languageDiagnosticsServiceImpl_1.LanguageDiagnosticsServiceImpl));
    builder.define(languageFeaturesService_1.ILanguageFeaturesService, new descriptors_1.SyncDescriptor(languageFeaturesServicesImpl_1.LanguageFeaturesServiceImpl));
    builder.define(runCommandExecutionService_1.IRunCommandExecutionService, new descriptors_1.SyncDescriptor(runCommandExecutionServiceImpl_1.RunCommandExecutionServiceImpl));
    builder.define(simulationTestContext_1.ISimulationTestContext, new descriptors_1.SyncDescriptor(simulationTestContext_1.NulSimulationTestContext));
    builder.define(workspaceService_1.IWorkspaceService, new descriptors_1.SyncDescriptor(workspaceServiceImpl_1.ExtensionTextDocumentManager));
    builder.define(extensionsService_1.IExtensionsService, new descriptors_1.SyncDescriptor(extensionsService_2.VSCodeExtensionsService));
    builder.define(vscodeIndex_1.ICombinedEmbeddingIndex, new descriptors_1.SyncDescriptor(vscodeIndex_1.VSCodeCombinedIndexImpl, [/*useRemoteCache*/ true]));
    builder.define(projectTemplatesIndex_1.IProjectTemplatesIndex, new descriptors_1.SyncDescriptor(projectTemplatesIndex_1.ProjectTemplatesIndex, [/*useRemoteCache*/ true]));
    builder.define(blockedExtensionService_1.IBlockedExtensionService, new descriptors_1.SyncDescriptor(blockedExtensionService_1.BlockedExtensionService));
    builder.define(editLogService_1.IEditLogService, new descriptors_1.SyncDescriptor(editLogService_1.EditLogService));
    builder.define(multiFileEditQualityTelemetry_1.IMultiFileEditInternalTelemetryService, new descriptors_1.SyncDescriptor(multiFileEditQualityTelemetry_1.MultiFileEditInternalTelemetryService));
    builder.define(customInstructionsService_1.ICustomInstructionsService, new descriptors_1.SyncDescriptor(customInstructionsService_1.CustomInstructionsService));
    builder.define(launchConfigService_1.ILaunchConfigService, new descriptors_1.SyncDescriptor(launchConfigService_2.LaunchConfigService));
    builder.define(surveyService_1.ISurveyService, new descriptors_1.SyncDescriptor(surveyServiceImpl_1.SurveyService));
    builder.define(editSurvivalTrackerService_1.IEditSurvivalTrackerService, new descriptors_1.SyncDescriptor(editSurvivalTrackerService_1.EditSurvivalTrackerService));
    builder.define(promptPathRepresentationService_1.IPromptPathRepresentationService, new descriptors_1.SyncDescriptor(promptPathRepresentationService_1.PromptPathRepresentationService));
    builder.define(promptsService_1.IPromptsService, new descriptors_1.SyncDescriptor(promptsServiceImpl_1.PromptsServiceImpl));
    builder.define(releaseNotesService_1.IReleaseNotesService, new descriptors_1.SyncDescriptor(releaseNotesServiceImpl_1.ReleaseNotesService));
    builder.define(snippyService_1.ISnippyService, new descriptors_1.SyncDescriptor(snippyServiceImpl_1.SnippyService));
    builder.define(interactiveSessionService_1.IInteractiveSessionService, new interactiveSessionServiceImpl_1.InteractiveSessionServiceImpl());
    builder.define(authenticationUpgrade_1.IAuthenticationChatUpgradeService, new descriptors_1.SyncDescriptor(authenticationUpgrade_1.AuthenticationChatUpgradeService));
    builder.define(embeddingsComputer_1.IEmbeddingsComputer, new descriptors_1.SyncDescriptor(remoteEmbeddingsComputer_1.RemoteEmbeddingsComputer));
    builder.define(virtualToolTypes_1.IToolGroupingService, new descriptors_1.SyncDescriptor(toolGroupingService_1.ToolGroupingService));
    builder.define(toolEmbeddingsComputer_1.IToolEmbeddingsComputer, new descriptors_1.SyncDescriptor(toolEmbeddingsComputer_1.ToolEmbeddingsComputer));
    builder.define(virtualToolTypes_1.IToolGroupingCache, new descriptors_1.SyncDescriptor(virtualToolGroupCache_1.ToolGroupingCache));
    builder.define(mergeConflictService_1.IMergeConflictService, new descriptors_1.SyncDescriptor(mergeConflictServiceImpl_1.MergeConflictServiceImpl));
    builder.define(editToolLearningService_1.IEditToolLearningService, new descriptors_1.SyncDescriptor(editToolLearningService_1.EditToolLearningService));
}
//# sourceMappingURL=services.js.map