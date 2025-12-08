"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestingServicesAccessor = exports.TestingServiceCollection = void 0;
exports._createBaselineServices = _createBaselineServices;
exports.createPlatformServices = createPlatformServices;
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const descriptors_1 = require("../../../util/vs/platform/instantiation/common/descriptors");
const instantiationService_1 = require("../../../util/vs/platform/instantiation/common/instantiationService");
const serviceCollection_1 = require("../../../util/vs/platform/instantiation/common/serviceCollection");
const authentication_1 = require("../../authentication/common/authentication");
const authenticationUpgrade_1 = require("../../authentication/common/authenticationUpgrade");
const copilotTokenManager_1 = require("../../authentication/common/copilotTokenManager");
const copilotTokenStore_1 = require("../../authentication/common/copilotTokenStore");
const copilotTokenManager_2 = require("../../authentication/node/copilotTokenManager");
const chatAgents_1 = require("../../chat/common/chatAgents");
const chatQuotaService_1 = require("../../chat/common/chatQuotaService");
const chatQuotaServiceImpl_1 = require("../../chat/common/chatQuotaServiceImpl");
const chatSessionService_1 = require("../../chat/common/chatSessionService");
const conversationOptions_1 = require("../../chat/common/conversationOptions");
const interactionService_1 = require("../../chat/common/interactionService");
const testChatSessionService_1 = require("../../chat/test/common/testChatSessionService");
const naiveChunkerService_1 = require("../../chunking/node/naiveChunkerService");
const mockRunCommandExecutionService_1 = require("../../commands/common/mockRunCommandExecutionService");
const runCommandExecutionService_1 = require("../../commands/common/runCommandExecutionService");
const configurationService_1 = require("../../configuration/common/configurationService");
const defaultsOnlyConfigurationService_1 = require("../../configuration/common/defaultsOnlyConfigurationService");
const inMemoryConfigurationService_1 = require("../../configuration/test/common/inMemoryConfigurationService");
const customInstructionsService_1 = require("../../customInstructions/common/customInstructionsService");
const dialogService_1 = require("../../dialog/common/dialogService");
const diffService_1 = require("../../diff/common/diffService");
const diffServiceImpl_1 = require("../../diff/node/diffServiceImpl");
const editSurvivalTrackerService_1 = require("../../editSurvivalTracking/common/editSurvivalTrackerService");
const capiClient_1 = require("../../endpoint/common/capiClient");
const domainService_1 = require("../../endpoint/common/domainService");
const capiClientImpl_1 = require("../../endpoint/node/capiClientImpl");
const domainServiceImpl_1 = require("../../endpoint/node/domainServiceImpl");
const envService_1 = require("../../env/common/envService");
const nullEnvService_1 = require("../../env/common/nullEnvService");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const extensionsService_1 = require("../../extensions/common/extensionsService");
const fileSystemService_1 = require("../../filesystem/common/fileSystemService");
const mockFileSystemService_1 = require("../../filesystem/node/test/mockFileSystemService");
const gitService_1 = require("../../git/common/gitService");
const nullGitExtensionService_1 = require("../../git/common/nullGitExtensionService");
const githubService_1 = require("../../github/common/githubService");
const octoKitServiceImpl_1 = require("../../github/common/octoKitServiceImpl");
const githubRepositoryService_1 = require("../../github/node/githubRepositoryService");
const ignoreService_1 = require("../../ignore/common/ignoreService");
const imageService_1 = require("../../image/common/imageService");
const interactiveSessionService_1 = require("../../interactive/common/interactiveSessionService");
const languageContextProviderService_1 = require("../../languageContextProvider/common/languageContextProviderService");
const nullLanguageContextProviderService_1 = require("../../languageContextProvider/common/nullLanguageContextProviderService");
const languageDiagnosticsService_1 = require("../../languages/common/languageDiagnosticsService");
const languageFeaturesService_1 = require("../../languages/common/languageFeaturesService");
const testLanguageDiagnosticsService_1 = require("../../languages/common/testLanguageDiagnosticsService");
const languageContextService_1 = require("../../languageServer/common/languageContextService");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const networking_1 = require("../../networking/common/networking");
const nodeFetcherService_1 = require("../../networking/node/test/nodeFetcherService");
const notificationService_1 = require("../../notification/common/notificationService");
const opener_1 = require("../../open/common/opener");
const parserService_1 = require("../../parser/node/parserService");
const parserServiceImpl_1 = require("../../parser/node/parserServiceImpl");
const promptPathRepresentationService_1 = require("../../prompts/common/promptPathRepresentationService");
const codeSearchRepoAuth_1 = require("../../remoteCodeSearch/node/codeSearchRepoAuth");
const nullRequestLogger_1 = require("../../requestLogger/node/nullRequestLogger");
const requestLogger_1 = require("../../requestLogger/node/requestLogger");
const scopeSelection_1 = require("../../scopeSelection/common/scopeSelection");
const searchService_1 = require("../../search/common/searchService");
const simulationTestContext_1 = require("../../simulationTestContext/common/simulationTestContext");
const snippyService_1 = require("../../snippy/common/snippyService");
const surveyService_1 = require("../../survey/common/surveyService");
const tabsAndEditorsService_1 = require("../../tabs/common/tabsAndEditorsService");
const tasksService_1 = require("../../tasks/common/tasksService");
const testTasksService_1 = require("../../tasks/common/testTasksService");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const nullTelemetryService_1 = require("../../telemetry/common/nullTelemetryService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const terminalService_1 = require("../../terminal/common/terminalService");
const tokenizer_1 = require("../../tokenizer/node/tokenizer");
const workbenchService_1 = require("../../workbench/common/workbenchService");
const workspaceService_1 = require("../../workspace/common/workspaceService");
const workspaceChunkSearchService_1 = require("../../workspaceChunkSearch/node/workspaceChunkSearchService");
const testExtensionsService_1 = require("../common/testExtensionsService");
const extensionContext_2 = require("./extensionContext");
const simulationWorkspaceServices_1 = require("./simulationWorkspaceServices");
const testChatAgentService_1 = require("./testChatAgentService");
const testWorkbenchService_1 = require("./testWorkbenchService");
const testWorkspaceService_1 = require("./testWorkspaceService");
/**
 * Collects descriptors for services to use in testing.
 */
class TestingServiceCollection {
    constructor() {
        this._services = new Map();
        this._accessor = null;
    }
    clone() {
        const cloned = new TestingServiceCollection();
        for (const [id, descOrInstance] of this._services) {
            cloned.define(id, descOrInstance);
        }
        return cloned;
    }
    set(id, instance) {
        this.define(id, instance);
        return instance;
    }
    define(id, descOrInstance) {
        if (this._accessor) {
            throw new Error(`Accessor already created`);
        }
        this._services.set(id, descOrInstance);
    }
    createTestingAccessor() {
        if (this._accessor) {
            throw new Error(`Accessor already created`);
        }
        return new TestingServicesAccessor(this.seal());
    }
    seal() {
        return this._accessor ??= new instantiationService_1.InstantiationService(new serviceCollection_1.ServiceCollection(...this._services), true);
    }
    dispose() {
        this._accessor?.dispose();
    }
}
exports.TestingServiceCollection = TestingServiceCollection;
class TestingServicesAccessor {
    constructor(_instaService) {
        this._instaService = _instaService;
    }
    dispose() {
        this._instaService.dispose();
    }
    get(id) {
        return this._instaService.invokeFunction(accessor => accessor.get(id));
    }
    getIfExists(id) {
        return this._instaService.invokeFunction(accessor => accessor.getIfExists(id));
    }
}
exports.TestingServicesAccessor = TestingServicesAccessor;
/**
 * Baseline for an accessor. Tests should prefer the specific variants outlined below.
 *
 * @see createPlatformServices
 * @see createExtensionTestingServices
 */
function _createBaselineServices() {
    const testingServiceCollection = new TestingServiceCollection();
    testingServiceCollection.define(chatQuotaService_1.IChatQuotaService, new descriptors_1.SyncDescriptor(chatQuotaServiceImpl_1.ChatQuotaService));
    testingServiceCollection.define(copilotTokenStore_1.ICopilotTokenStore, new descriptors_1.SyncDescriptor(copilotTokenStore_1.CopilotTokenStore));
    testingServiceCollection.define(nullExperimentationService_1.IExperimentationService, new descriptors_1.SyncDescriptor(nullExperimentationService_1.NullExperimentationService));
    testingServiceCollection.define(diffService_1.IDiffService, new descriptors_1.SyncDescriptor(diffServiceImpl_1.DiffServiceImpl));
    testingServiceCollection.define(simulationTestContext_1.ISimulationTestContext, new descriptors_1.SyncDescriptor(simulationTestContext_1.NulSimulationTestContext));
    testingServiceCollection.define(logService_1.ILogService, new descriptors_1.SyncDescriptor(logService_1.LogServiceImpl, [[new logService_1.ConsoleLog()]]));
    testingServiceCollection.define(parserService_1.IParserService, new descriptors_1.SyncDescriptor(parserServiceImpl_1.ParserServiceImpl, [/*useWorker*/ false]));
    testingServiceCollection.define(fetcherService_1.IFetcherService, new descriptors_1.SyncDescriptor(nodeFetcherService_1.NodeFetcherService));
    testingServiceCollection.define(telemetry_1.ITelemetryUserConfig, new descriptors_1.SyncDescriptor(telemetry_1.TelemetryUserConfigImpl, ['tid=test', true]));
    // Notifications from the monolith when fetching a token can trigger behaviour that require these objects.
    testingServiceCollection.define(opener_1.IUrlOpener, new descriptors_1.SyncDescriptor(opener_1.NullUrlOpener));
    testingServiceCollection.define(copilotTokenManager_1.ICopilotTokenManager, new descriptors_1.SyncDescriptor(SimulationTestCopilotTokenManager));
    testingServiceCollection.define(authentication_1.IAuthenticationService, new descriptors_1.SyncDescriptor(StaticGitHubAuthenticationService, [(0, copilotTokenManager_2.createStaticGitHubTokenProvider)()]));
    testingServiceCollection.define(networking_1.IHeaderContributors, new descriptors_1.SyncDescriptor(networking_1.HeaderContributors));
    testingServiceCollection.define(conversationOptions_1.IConversationOptions, new descriptors_1.SyncDescriptor(class {
        constructor() {
            this.temperature = 0.1;
            this.topP = 1;
            this.rejectionMessage = 'Sorry, but I can only assist with programming related questions.';
        }
    }));
    testingServiceCollection.define(chatAgents_1.IChatAgentService, new descriptors_1.SyncDescriptor(testChatAgentService_1.TestChatAgentService));
    testingServiceCollection.define(fileSystemService_1.IFileSystemService, new descriptors_1.SyncDescriptor(mockFileSystemService_1.MockFileSystemService));
    testingServiceCollection.define(githubService_1.IGithubRepositoryService, new descriptors_1.SyncDescriptor(githubRepositoryService_1.GithubRepositoryService));
    testingServiceCollection.define(gitService_1.IGitService, new descriptors_1.SyncDescriptor(nullGitExtensionService_1.NullGitExtensionService));
    testingServiceCollection.define(authenticationUpgrade_1.IAuthenticationChatUpgradeService, new descriptors_1.SyncDescriptor(authenticationUpgrade_1.AuthenticationChatUpgradeService));
    testingServiceCollection.define(githubService_1.IOctoKitService, new descriptors_1.SyncDescriptor(octoKitServiceImpl_1.OctoKitService));
    testingServiceCollection.define(interactionService_1.IInteractionService, new descriptors_1.SyncDescriptor(interactionService_1.InteractionService));
    testingServiceCollection.define(workbenchService_1.IWorkbenchService, new descriptors_1.SyncDescriptor(testWorkbenchService_1.TestWorkbenchService));
    testingServiceCollection.define(customInstructionsService_1.ICustomInstructionsService, new descriptors_1.SyncDescriptor(customInstructionsService_1.CustomInstructionsService));
    testingServiceCollection.define(surveyService_1.ISurveyService, new descriptors_1.SyncDescriptor(surveyService_1.NullSurveyService));
    testingServiceCollection.define(editSurvivalTrackerService_1.IEditSurvivalTrackerService, new descriptors_1.SyncDescriptor(editSurvivalTrackerService_1.NullEditSurvivalTrackerService));
    testingServiceCollection.define(workspaceChunkSearchService_1.IWorkspaceChunkSearchService, new descriptors_1.SyncDescriptor(workspaceChunkSearchService_1.NullWorkspaceChunkSearchService));
    testingServiceCollection.define(codeSearchRepoAuth_1.ICodeSearchAuthenticationService, new descriptors_1.SyncDescriptor(codeSearchRepoAuth_1.BasicCodeSearchAuthenticationService));
    return testingServiceCollection;
}
/**
 * @returns an accessor suitable for simulation and unit tests.
 */
function createPlatformServices(disposables = new lifecycle_1.DisposableStore()) {
    const testingServiceCollection = _createBaselineServices();
    testingServiceCollection.define(configurationService_1.IConfigurationService, new descriptors_1.SyncDescriptor(inMemoryConfigurationService_1.InMemoryConfigurationService, [disposables.add(new defaultsOnlyConfigurationService_1.DefaultsOnlyConfigurationService())]));
    testingServiceCollection.define(envService_1.IEnvService, new descriptors_1.SyncDescriptor(nullEnvService_1.NullEnvService));
    testingServiceCollection.define(envService_1.INativeEnvService, new descriptors_1.SyncDescriptor(nullEnvService_1.NullNativeEnvService));
    testingServiceCollection.define(telemetry_1.ITelemetryService, new descriptors_1.SyncDescriptor(nullTelemetryService_1.NullTelemetryService));
    testingServiceCollection.define(editSurvivalTrackerService_1.IEditSurvivalTrackerService, new descriptors_1.SyncDescriptor(editSurvivalTrackerService_1.NullEditSurvivalTrackerService));
    testingServiceCollection.define(nullExperimentationService_1.IExperimentationService, new descriptors_1.SyncDescriptor(nullExperimentationService_1.NullExperimentationService));
    testingServiceCollection.define(workspaceService_1.IWorkspaceService, new descriptors_1.SyncDescriptor(testWorkspaceService_1.TestWorkspaceService));
    testingServiceCollection.define(extensionsService_1.IExtensionsService, new descriptors_1.SyncDescriptor(testExtensionsService_1.TestExtensionsService));
    testingServiceCollection.define(searchService_1.ISearchService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SnapshotSearchService));
    testingServiceCollection.define(tokenizer_1.ITokenizerProvider, new descriptors_1.SyncDescriptor(tokenizer_1.TokenizerProvider, [false]));
    testingServiceCollection.define(domainService_1.IDomainService, new descriptors_1.SyncDescriptor(domainServiceImpl_1.DomainService));
    testingServiceCollection.define(capiClient_1.ICAPIClientService, new descriptors_1.SyncDescriptor(capiClientImpl_1.CAPIClientImpl));
    testingServiceCollection.define(notificationService_1.INotificationService, new descriptors_1.SyncDescriptor(notificationService_1.NullNotificationService));
    testingServiceCollection.define(extensionContext_1.IVSCodeExtensionContext, new descriptors_1.SyncDescriptor(extensionContext_2.MockExtensionContext));
    testingServiceCollection.define(ignoreService_1.IIgnoreService, new descriptors_1.SyncDescriptor(ignoreService_1.NullIgnoreService));
    testingServiceCollection.define(terminalService_1.ITerminalService, new descriptors_1.SyncDescriptor(terminalService_1.NullTerminalService));
    testingServiceCollection.define(dialogService_1.IDialogService, new descriptors_1.SyncDescriptor(class {
        showQuickPick(items, options, token) {
            throw new Error('Method not implemented.');
        }
        showOpenDialog(options) {
            throw new Error('Method not implemented.');
        }
    }));
    testingServiceCollection.define(languageFeaturesService_1.ILanguageFeaturesService, new descriptors_1.SyncDescriptor(languageFeaturesService_1.NoopLanguageFeaturesService));
    testingServiceCollection.define(runCommandExecutionService_1.IRunCommandExecutionService, new descriptors_1.SyncDescriptor(mockRunCommandExecutionService_1.MockRunCommandExecutionService));
    testingServiceCollection.define(naiveChunkerService_1.INaiveChunkingService, new descriptors_1.SyncDescriptor(naiveChunkerService_1.NaiveChunkingService));
    testingServiceCollection.define(imageService_1.IImageService, imageService_1.nullImageService);
    testingServiceCollection.define(languageContextService_1.ILanguageContextService, languageContextService_1.NullLanguageContextService);
    testingServiceCollection.define(languageContextProviderService_1.ILanguageContextProviderService, new descriptors_1.SyncDescriptor(nullLanguageContextProviderService_1.NullLanguageContextProviderService));
    testingServiceCollection.define(languageDiagnosticsService_1.ILanguageDiagnosticsService, new descriptors_1.SyncDescriptor(testLanguageDiagnosticsService_1.TestLanguageDiagnosticsService));
    testingServiceCollection.define(promptPathRepresentationService_1.IPromptPathRepresentationService, new descriptors_1.SyncDescriptor(promptPathRepresentationService_1.TestPromptPathRepresentationService));
    testingServiceCollection.define(requestLogger_1.IRequestLogger, new descriptors_1.SyncDescriptor(nullRequestLogger_1.NullRequestLogger));
    testingServiceCollection.define(chatSessionService_1.IChatSessionService, new descriptors_1.SyncDescriptor(testChatSessionService_1.TestChatSessionService));
    testingServiceCollection.define(scopeSelection_1.IScopeSelector, new descriptors_1.SyncDescriptor(class {
        async selectEnclosingScope(editor, options) {
            return undefined;
        }
    }));
    testingServiceCollection.define(snippyService_1.ISnippyService, new descriptors_1.SyncDescriptor(snippyService_1.NullSnippyService));
    testingServiceCollection.define(interactiveSessionService_1.IInteractiveSessionService, new descriptors_1.SyncDescriptor(class {
        transferActiveChat(workspaceUri) {
            throw new Error('Method not implemented.');
        }
    }));
    testingServiceCollection.define(tabsAndEditorsService_1.ITabsAndEditorsService, new simulationWorkspaceServices_1.TestingTabsAndEditorsService({
        getActiveTextEditor: () => undefined,
        getVisibleTextEditors: () => [],
        getActiveNotebookEditor: () => undefined
    }));
    testingServiceCollection.define(tasksService_1.ITasksService, new descriptors_1.SyncDescriptor(testTasksService_1.TestTasksService));
    return testingServiceCollection;
}
//# sourceMappingURL=services.js.map