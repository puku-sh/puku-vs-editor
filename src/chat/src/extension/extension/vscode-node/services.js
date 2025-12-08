"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerServices = registerServices;
const vscode_1 = require("vscode");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const copilotTokenManager_1 = require("../../../platform/authentication/common/copilotTokenManager");
const copilotTokenManager_2 = require("../../../platform/authentication/node/copilotTokenManager");
const authenticationService_1 = require("../../../platform/authentication/vscode-node/authenticationService");
const pukuTokenManager_1 = require("../../../platform/authentication/vscode-node/pukuTokenManager");
const chatAgents_1 = require("../../../platform/chat/common/chatAgents");
const chatMLFetcher_1 = require("../../../platform/chat/common/chatMLFetcher");
const chunkingEndpointClient_1 = require("../../../platform/chunking/common/chunkingEndpointClient");
const chunkingEndpointClientImpl_1 = require("../../../platform/chunking/common/chunkingEndpointClientImpl");
const naiveChunkerService_1 = require("../../../platform/chunking/node/naiveChunkerService");
const devContainerConfigurationService_1 = require("../../../platform/devcontainer/common/devContainerConfigurationService");
const diffService_1 = require("../../../platform/diff/common/diffService");
const diffServiceImpl_1 = require("../../../platform/diff/node/diffServiceImpl");
const capiClient_1 = require("../../../platform/endpoint/common/capiClient");
const domainService_1 = require("../../../platform/endpoint/common/domainService");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const automodeService_1 = require("../../../platform/endpoint/node/automodeService");
const capiClientImpl_1 = require("../../../platform/endpoint/node/capiClientImpl");
const domainServiceImpl_1 = require("../../../platform/endpoint/node/domainServiceImpl");
const envService_1 = require("../../../platform/env/common/envService");
const nativeEnvServiceImpl_1 = require("../../../platform/env/vscode-node/nativeEnvServiceImpl");
const gitCommitMessageService_1 = require("../../../platform/git/common/gitCommitMessageService");
const gitDiffService_1 = require("../../../platform/git/common/gitDiffService");
const githubService_1 = require("../../../platform/github/common/githubService");
const githubRepositoryService_1 = require("../../../platform/github/node/githubRepositoryService");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const ignoreService_2 = require("../../../platform/ignore/vscode-node/ignoreService");
const imageService_1 = require("../../../platform/image/common/imageService");
const imageServiceImpl_1 = require("../../../platform/image/node/imageServiceImpl");
const languageContextProviderService_1 = require("../../../platform/languageContextProvider/common/languageContextProviderService");
const languageContextService_1 = require("../../../platform/languageServer/common/languageContextService");
const completionsFetchService_1 = require("../../../platform/nesFetch/common/completionsFetchService");
const completionsFetchServiceImpl_1 = require("../../../platform/nesFetch/node/completionsFetchServiceImpl");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const fetcherServiceImpl_1 = require("../../../platform/networking/vscode-node/fetcherServiceImpl");
const parserService_1 = require("../../../platform/parser/node/parserService");
const parserServiceImpl_1 = require("../../../platform/parser/node/parserServiceImpl");
const adoCodeSearchService_1 = require("../../../platform/remoteCodeSearch/common/adoCodeSearchService");
const githubCodeSearchService_1 = require("../../../platform/remoteCodeSearch/common/githubCodeSearchService");
const codeSearchRepoAuth_1 = require("../../../platform/remoteCodeSearch/node/codeSearchRepoAuth");
const codeSearchRepoAuth_2 = require("../../../platform/remoteCodeSearch/vscode-node/codeSearchRepoAuth");
const codeOrDocsSearchClient_1 = require("../../../platform/remoteSearch/common/codeOrDocsSearchClient");
const codeOrDocsSearchClientImpl_1 = require("../../../platform/remoteSearch/node/codeOrDocsSearchClientImpl");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const scopeSelection_1 = require("../../../platform/scopeSelection/common/scopeSelection");
const scopeSelectionImpl_1 = require("../../../platform/scopeSelection/vscode-node/scopeSelectionImpl");
const searchService_1 = require("../../../platform/search/common/searchService");
const searchServiceImpl_1 = require("../../../platform/search/vscode-node/searchServiceImpl");
const settingsEditorSearchService_1 = require("../../../platform/settingsEditor/common/settingsEditorSearchService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const nullTelemetryService_1 = require("../../../platform/telemetry/common/nullTelemetryService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const azureInsights_1 = require("../../../platform/telemetry/node/azureInsights");
const microsoftExperimentationService_1 = require("../../../platform/telemetry/vscode-node/microsoftExperimentationService");
const telemetryServiceImpl_1 = require("../../../platform/telemetry/vscode-node/telemetryServiceImpl");
const workspaceMutationManager_1 = require("../../../platform/testing/common/workspaceMutationManager");
const setupTestDetector_1 = require("../../../platform/testing/node/setupTestDetector");
const testDepsResolver_1 = require("../../../platform/testing/node/testDepsResolver");
const tokenizer_1 = require("../../../platform/tokenizer/node/tokenizer");
const githubAvailableEmbeddingTypes_1 = require("../../../platform/workspaceChunkSearch/common/githubAvailableEmbeddingTypes");
const rerankerService_1 = require("../../../platform/workspaceChunkSearch/common/rerankerService");
const workspaceChunkSearchService_1 = require("../../../platform/workspaceChunkSearch/node/workspaceChunkSearchService");
const workspaceFileIndex_1 = require("../../../platform/workspaceChunkSearch/node/workspaceFileIndex");
const descriptors_1 = require("../../../util/vs/platform/instantiation/common/descriptors");
const commandService_1 = require("../../commands/node/commandService");
const extensionApi_1 = require("../../context/node/resolvers/extensionApi");
const promptWorkspaceLabels_1 = require("../../context/node/resolvers/promptWorkspaceLabels");
const chatParticipants_1 = require("../../conversation/vscode-node/chatParticipants");
const feedbackReporter_1 = require("../../conversation/vscode-node/feedbackReporter");
const userActions_1 = require("../../conversation/vscode-node/userActions");
const conversationStore_1 = require("../../conversationStore/node/conversationStore");
const intentService_1 = require("../../intents/node/intentService");
const newIntent_1 = require("../../intents/node/newIntent");
const testInfoStorage_1 = require("../../intents/node/testIntent/testInfoStorage");
const languageContextProviderService_2 = require("../../languageContextProvider/vscode-node/languageContextProviderService");
const linkifyService_1 = require("../../linkify/common/linkifyService");
const loggingActions_1 = require("../../log/vscode-node/loggingActions");
const commandToConfigConverter_1 = require("../../onboardDebug/node/commandToConfigConverter");
const debuggableCommandIdentifier_1 = require("../../onboardDebug/node/debuggableCommandIdentifier");
const languageToolsProvider_1 = require("../../onboardDebug/node/languageToolsProvider");
const chatMLFetcher_2 = require("../../prompt/node/chatMLFetcher");
const feedbackReporter_2 = require("../../prompt/node/feedbackReporter");
const promptVariablesService_1 = require("../../prompt/node/promptVariablesService");
const todoListContextProvider_1 = require("../../prompt/node/todoListContextProvider");
const devContainerConfigurationServiceImpl_1 = require("../../prompt/vscode-node/devContainerConfigurationServiceImpl");
const endpointProviderImpl_1 = require("../../prompt/vscode-node/endpointProviderImpl");
const gitCommitMessageServiceImpl_1 = require("../../prompt/vscode-node/gitCommitMessageServiceImpl");
const gitDiffService_2 = require("../../prompt/vscode-node/gitDiffService");
const promptVariablesService_2 = require("../../prompt/vscode-node/promptVariablesService");
const requestLoggerImpl_1 = require("../../prompt/vscode-node/requestLoggerImpl");
const scenarioAutomationEndpointProviderImpl_1 = require("../../prompt/vscode-node/scenarioAutomationEndpointProviderImpl");
const settingsEditorSearchServiceImpl_1 = require("../../prompt/vscode-node/settingsEditorSearchServiceImpl");
const codeMapperService_1 = require("../../prompts/node/codeMapper/codeMapperService");
const fixCookbookService_1 = require("../../prompts/node/inline/fixCookbookService");
const setupTestsFileManager_1 = require("../../testing/node/setupTestsFileManager");
const toolsService_1 = require("../../tools/common/toolsService");
const toolsService_2 = require("../../tools/vscode-node/toolsService");
const languageContextService_2 = require("../../typescriptContext/vscode-node/languageContextService");
const workspaceListenerService_1 = require("../../workspaceRecorder/common/workspaceListenerService");
const workspaceListenerService_2 = require("../../workspaceRecorder/vscode-node/workspaceListenerService");
const services_1 = require("../vscode/services");
const embeddingsComputer_1 = require("../../../platform/embeddings/common/embeddingsComputer");
const conditionalEmbeddingsComputer_1 = require("./conditionalEmbeddingsComputer");
const pukuAuth_1 = require("../../pukuIndexing/common/pukuAuth");
const vscodePukuAuthService_1 = require("../../pukuIndexing/vscode-node/vscodePukuAuthService");
const pukuIndexingService_1 = require("../../pukuIndexing/node/pukuIndexingService");
const pukuConfig_1 = require("../../pukuIndexing/common/pukuConfig");
const vscodePukuConfigService_1 = require("../../pukuIndexing/vscode-node/vscodePukuConfigService");
const pukuChatService_1 = require("../../pukuChat/common/pukuChatService");
const pukuChatService_2 = require("../../pukuChat/node/pukuChatService");
// ###########################################################################################
// ###                                                                                     ###
// ###               Node services that run ONLY in node.js extension host.                ###
// ###                                                                                     ###
// ###  !!! Prefer to list services in ../vscode/services.ts to support them anywhere !!!  ###
// ###                                                                                     ###
// ###########################################################################################
function registerServices(builder, extensionContext) {
    const isTestMode = extensionContext.extensionMode === vscode_1.ExtensionMode.Test;
    (0, services_1.registerServices)(builder, extensionContext);
    builder.define(automodeService_1.IAutomodeService, new descriptors_1.SyncDescriptor(automodeService_1.AutomodeService));
    builder.define(conversationStore_1.IConversationStore, new conversationStore_1.ConversationStore());
    builder.define(diffService_1.IDiffService, new diffServiceImpl_1.DiffServiceImpl());
    builder.define(tokenizer_1.ITokenizerProvider, new descriptors_1.SyncDescriptor(tokenizer_1.TokenizerProvider, [true]));
    builder.define(toolsService_1.IToolsService, new descriptors_1.SyncDescriptor(toolsService_2.ToolsService));
    builder.define(requestLogger_1.IRequestLogger, new descriptors_1.SyncDescriptor(requestLoggerImpl_1.RequestLogger));
    builder.define(envService_1.INativeEnvService, new descriptors_1.SyncDescriptor(nativeEnvServiceImpl_1.NativeEnvServiceImpl));
    builder.define(fetcherService_1.IFetcherService, new descriptors_1.SyncDescriptor(fetcherServiceImpl_1.FetcherService, [undefined]));
    builder.define(domainService_1.IDomainService, new descriptors_1.SyncDescriptor(domainServiceImpl_1.DomainService));
    builder.define(capiClient_1.ICAPIClientService, new descriptors_1.SyncDescriptor(capiClientImpl_1.CAPIClientImpl));
    builder.define(imageService_1.IImageService, new descriptors_1.SyncDescriptor(imageServiceImpl_1.ImageServiceImpl));
    builder.define(telemetry_1.ITelemetryUserConfig, new descriptors_1.SyncDescriptor(telemetry_1.TelemetryUserConfigImpl, [undefined, undefined]));
    const internalAIKey = extensionContext.extension.packageJSON.internalAIKey ?? '';
    const internalLargeEventAIKey = extensionContext.extension.packageJSON.internalLargeStorageAriaKey ?? '';
    const ariaKey = extensionContext.extension.packageJSON.ariaKey ?? '';
    if (isTestMode || envService_1.isScenarioAutomation) {
        setupTelemetry(builder, extensionContext, internalAIKey, internalLargeEventAIKey, ariaKey);
        // If we're in testing mode, then most code will be called from an actual test,
        // and not from here. However, some objects will capture the `accessor` we pass
        // here and then re-use it later. This is particularly the case for those objects
        // which implement VSCode interfaces so can't be changed to take `accessor` in their
        // method parameters.
        builder.define(copilotTokenManager_1.ICopilotTokenManager, (0, copilotTokenManager_2.getOrCreateTestingCopilotTokenManager)(vscode_1.env.devDeviceId));
    }
    else {
        setupTelemetry(builder, extensionContext, internalAIKey, internalLargeEventAIKey, ariaKey);
        // Puku Editor: Use PukuTokenManager instead of VSCodeCopilotTokenManager
        builder.define(copilotTokenManager_1.ICopilotTokenManager, new descriptors_1.SyncDescriptor(pukuTokenManager_1.PukuTokenManager));
    }
    if (envService_1.isScenarioAutomation) {
        // GitHub auth removed - use regular authentication service
        builder.define(authentication_1.IAuthenticationService, new descriptors_1.SyncDescriptor(authenticationService_1.AuthenticationService));
        builder.define(endpointProvider_1.IEndpointProvider, new descriptors_1.SyncDescriptor(scenarioAutomationEndpointProviderImpl_1.ScenarioAutomationEndpointProviderImpl, [loggingActions_1.collectFetcherTelemetry]));
        builder.define(ignoreService_1.IIgnoreService, new descriptors_1.SyncDescriptor(ignoreService_1.NullIgnoreService));
    }
    else {
        builder.define(authentication_1.IAuthenticationService, new descriptors_1.SyncDescriptor(authenticationService_1.AuthenticationService));
        builder.define(endpointProvider_1.IEndpointProvider, new descriptors_1.SyncDescriptor(endpointProviderImpl_1.ProductionEndpointProvider, [loggingActions_1.collectFetcherTelemetry]));
        builder.define(ignoreService_1.IIgnoreService, new descriptors_1.SyncDescriptor(ignoreService_2.VsCodeIgnoreService));
    }
    builder.define(testInfoStorage_1.ITestGenInfoStorage, new descriptors_1.SyncDescriptor(testInfoStorage_1.TestGenInfoStorage)); // Used for test generation (/tests intent)
    builder.define(parserService_1.IParserService, new descriptors_1.SyncDescriptor(parserServiceImpl_1.ParserServiceImpl, [/*useWorker*/ true]));
    builder.define(intentService_1.IIntentService, new descriptors_1.SyncDescriptor(intentService_1.IntentService));
    builder.define(naiveChunkerService_1.INaiveChunkingService, new descriptors_1.SyncDescriptor(naiveChunkerService_1.NaiveChunkingService));
    builder.define(workspaceFileIndex_1.IWorkspaceFileIndex, new descriptors_1.SyncDescriptor(workspaceFileIndex_1.WorkspaceFileIndex));
    builder.define(chunkingEndpointClient_1.IChunkingEndpointClient, new descriptors_1.SyncDescriptor(chunkingEndpointClientImpl_1.ChunkingEndpointClientImpl));
    builder.define(commandService_1.ICommandService, new descriptors_1.SyncDescriptor(commandService_1.CommandServiceImpl));
    builder.define(codeOrDocsSearchClient_1.IDocsSearchClient, new descriptors_1.SyncDescriptor(codeOrDocsSearchClientImpl_1.DocsSearchClient));
    builder.define(searchService_1.ISearchService, new descriptors_1.SyncDescriptor(searchServiceImpl_1.SearchServiceImpl));
    builder.define(testDepsResolver_1.ITestDepsResolver, new descriptors_1.SyncDescriptor(testDepsResolver_1.TestDepsResolver));
    builder.define(setupTestDetector_1.ISetupTestsDetector, new descriptors_1.SyncDescriptor(setupTestDetector_1.SetupTestsDetector));
    builder.define(workspaceMutationManager_1.IWorkspaceMutationManager, new descriptors_1.SyncDescriptor(setupTestsFileManager_1.WorkspaceMutationManager));
    builder.define(scopeSelection_1.IScopeSelector, new descriptors_1.SyncDescriptor(scopeSelectionImpl_1.ScopeSelectorImpl));
    builder.define(gitDiffService_1.IGitDiffService, new descriptors_1.SyncDescriptor(gitDiffService_2.GitDiffService));
    builder.define(gitCommitMessageService_1.IGitCommitMessageService, new descriptors_1.SyncDescriptor(gitCommitMessageServiceImpl_1.GitCommitMessageServiceImpl));
    builder.define(githubService_1.IGithubRepositoryService, new descriptors_1.SyncDescriptor(githubRepositoryService_1.GithubRepositoryService));
    builder.define(devContainerConfigurationService_1.IDevContainerConfigurationService, new descriptors_1.SyncDescriptor(devContainerConfigurationServiceImpl_1.DevContainerConfigurationServiceImpl));
    builder.define(chatAgents_1.IChatAgentService, new descriptors_1.SyncDescriptor(chatParticipants_1.ChatAgentService));
    builder.define(linkifyService_1.ILinkifyService, new descriptors_1.SyncDescriptor(linkifyService_1.LinkifyService));
    builder.define(chatMLFetcher_1.IChatMLFetcher, new descriptors_1.SyncDescriptor(chatMLFetcher_2.ChatMLFetcherImpl));
    builder.define(feedbackReporter_2.IFeedbackReporter, new descriptors_1.SyncDescriptor(feedbackReporter_1.FeedbackReporter));
    builder.define(extensionApi_1.IApiEmbeddingsIndex, new descriptors_1.SyncDescriptor(extensionApi_1.ApiEmbeddingsIndex, [/*useRemoteCache*/ true]));
    builder.define(githubCodeSearchService_1.IGithubCodeSearchService, new descriptors_1.SyncDescriptor(githubCodeSearchService_1.GithubCodeSearchService));
    builder.define(adoCodeSearchService_1.IAdoCodeSearchService, new descriptors_1.SyncDescriptor(adoCodeSearchService_1.AdoCodeSearchService));
    builder.define(workspaceChunkSearchService_1.IWorkspaceChunkSearchService, new descriptors_1.SyncDescriptor(workspaceChunkSearchService_1.WorkspaceChunkSearchService));
    builder.define(settingsEditorSearchService_1.ISettingsEditorSearchService, new descriptors_1.SyncDescriptor(settingsEditorSearchServiceImpl_1.SettingsEditorSearchServiceImpl));
    builder.define(newIntent_1.INewWorkspacePreviewContentManager, new descriptors_1.SyncDescriptor(newIntent_1.NewWorkspacePreviewContentManagerImpl));
    builder.define(promptVariablesService_1.IPromptVariablesService, new descriptors_1.SyncDescriptor(promptVariablesService_2.PromptVariablesServiceImpl));
    builder.define(promptWorkspaceLabels_1.IPromptWorkspaceLabels, new descriptors_1.SyncDescriptor(promptWorkspaceLabels_1.PromptWorkspaceLabels));
    builder.define(userActions_1.IUserFeedbackService, new descriptors_1.SyncDescriptor(userActions_1.UserFeedbackService));
    builder.define(commandToConfigConverter_1.IDebugCommandToConfigConverter, new descriptors_1.SyncDescriptor(commandToConfigConverter_1.DebugCommandToConfigConverter));
    builder.define(debuggableCommandIdentifier_1.IDebuggableCommandIdentifier, new descriptors_1.SyncDescriptor(debuggableCommandIdentifier_1.DebuggableCommandIdentifier));
    builder.define(languageToolsProvider_1.ILanguageToolsProvider, new descriptors_1.SyncDescriptor(languageToolsProvider_1.LanguageToolsProvider));
    builder.define(codeMapperService_1.ICodeMapperService, new descriptors_1.SyncDescriptor(codeMapperService_1.CodeMapperService));
    builder.define(completionsFetchService_1.ICompletionsFetchService, new descriptors_1.SyncDescriptor(completionsFetchServiceImpl_1.CompletionsFetchService));
    builder.define(fixCookbookService_1.IFixCookbookService, new descriptors_1.SyncDescriptor(fixCookbookService_1.FixCookbookService));
    builder.define(languageContextService_1.ILanguageContextService, new descriptors_1.SyncDescriptor(languageContextService_2.LanguageContextServiceImpl));
    builder.define(languageContextProviderService_1.ILanguageContextProviderService, new descriptors_1.SyncDescriptor(languageContextProviderService_2.LanguageContextProviderService));
    builder.define(workspaceListenerService_1.IWorkspaceListenerService, new descriptors_1.SyncDescriptor(workspaceListenerService_2.WorkspacListenerService));
    builder.define(codeSearchRepoAuth_1.ICodeSearchAuthenticationService, new descriptors_1.SyncDescriptor(codeSearchRepoAuth_2.VsCodeCodeSearchAuthenticationService));
    builder.define(todoListContextProvider_1.ITodoListContextProvider, new descriptors_1.SyncDescriptor(todoListContextProvider_1.TodoListContextProvider));
    builder.define(githubAvailableEmbeddingTypes_1.IGithubAvailableEmbeddingTypesService, new descriptors_1.SyncDescriptor(githubAvailableEmbeddingTypes_1.GithubAvailableEmbeddingTypesService));
    builder.define(rerankerService_1.IRerankerService, new descriptors_1.SyncDescriptor(rerankerService_1.RerankerService));
    // Override IEmbeddingsComputer to use ConditionalEmbeddingsComputer (which can use PukuEmbeddingsComputer)
    builder.define(embeddingsComputer_1.IEmbeddingsComputer, new descriptors_1.SyncDescriptor(conditionalEmbeddingsComputer_1.ConditionalEmbeddingsComputer));
    // Puku Indexing Services
    // Note: Authentication is bridged from VS Code layer via internal commands
    builder.define(pukuAuth_1.IPukuAuthService, new descriptors_1.SyncDescriptor(vscodePukuAuthService_1.VsCodePukuAuthService));
    builder.define(pukuConfig_1.IPukuConfigService, new descriptors_1.SyncDescriptor(vscodePukuConfigService_1.VsCodePukuConfigService));
    builder.define(pukuIndexingService_1.IPukuIndexingService, new descriptors_1.SyncDescriptor(pukuIndexingService_1.PukuIndexingService));
    // Puku Chat Service
    builder.define(pukuChatService_1.IPukuChatService, new descriptors_1.SyncDescriptor(pukuChatService_2.PukuChatService));
}
function setupMSFTExperimentationService(builder, extensionContext) {
    if (vscode_1.ExtensionMode.Production === extensionContext.extensionMode && !envService_1.isScenarioAutomation) {
        // Intitiate the experimentation service
        builder.define(nullExperimentationService_1.IExperimentationService, new descriptors_1.SyncDescriptor(microsoftExperimentationService_1.MicrosoftExperimentationService));
    }
    else {
        builder.define(nullExperimentationService_1.IExperimentationService, new nullExperimentationService_1.NullExperimentationService());
    }
}
function setupTelemetry(builder, extensionContext, internalAIKey, internalLargeEventAIKey, externalAIKey) {
    if (vscode_1.ExtensionMode.Production === extensionContext.extensionMode && !envService_1.isScenarioAutomation) {
        builder.define(telemetry_1.ITelemetryService, new descriptors_1.SyncDescriptor(telemetryServiceImpl_1.TelemetryService, [
            extensionContext.extension.packageJSON.name,
            internalAIKey,
            internalLargeEventAIKey,
            externalAIKey,
            azureInsights_1.APP_INSIGHTS_KEY_STANDARD,
            azureInsights_1.APP_INSIGHTS_KEY_ENHANCED,
        ]));
    }
    else {
        // If we're developing or testing we don't want telemetry to be sent, so we turn it off
        builder.define(telemetry_1.ITelemetryService, new nullTelemetryService_1.NullTelemetryService());
    }
    setupMSFTExperimentationService(builder, extensionContext);
}
//# sourceMappingURL=services.js.map