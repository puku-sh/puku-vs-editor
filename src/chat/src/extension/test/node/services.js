"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExtensionUnitTestingServices = createExtensionUnitTestingServices;
const virtualToolGroupCache_1 = require("../../../extension/tools/common/virtualTools/virtualToolGroupCache");
const virtualToolTypes_1 = require("../../../extension/tools/common/virtualTools/virtualToolTypes");
const chatMLFetcher_1 = require("../../../platform/chat/common/chatMLFetcher");
const mockChatMLFetcher_1 = require("../../../platform/chat/test/common/mockChatMLFetcher");
const diffService_1 = require("../../../platform/diff/common/diffService");
const diffServiceImpl_1 = require("../../../platform/diff/node/diffServiceImpl");
const embeddingsComputer_1 = require("../../../platform/embeddings/common/embeddingsComputer");
const remoteEmbeddingsComputer_1 = require("../../../platform/embeddings/common/remoteEmbeddingsComputer");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const testEndpointProvider_1 = require("../../../platform/endpoint/test/node/testEndpointProvider");
const gitDiffService_1 = require("../../../platform/git/common/gitDiffService");
const gitExtensionService_1 = require("../../../platform/git/common/gitExtensionService");
const gitService_1 = require("../../../platform/git/common/gitService");
const nullGitDiffService_1 = require("../../../platform/git/common/nullGitDiffService");
const nullGitExtensionService_1 = require("../../../platform/git/common/nullGitExtensionService");
const logService_1 = require("../../../platform/log/common/logService");
const editLogService_1 = require("../../../platform/multiFileEdit/common/editLogService");
const multiFileEditQualityTelemetry_1 = require("../../../platform/multiFileEdit/common/multiFileEditQualityTelemetry");
const alternativeContent_1 = require("../../../platform/notebook/common/alternativeContent");
const alternativeContentEditGenerator_1 = require("../../../platform/notebook/common/alternativeContentEditGenerator");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const notebookSummaryTracker_1 = require("../../../platform/notebook/common/notebookSummaryTracker");
const adoCodeSearchService_1 = require("../../../platform/remoteCodeSearch/common/adoCodeSearchService");
const githubCodeSearchService_1 = require("../../../platform/remoteCodeSearch/common/githubCodeSearchService");
const simulationTestContext_1 = require("../../../platform/simulationTestContext/common/simulationTestContext");
const terminalService_1 = require("../../../platform/terminal/common/terminalService");
const services_1 = require("../../../platform/test/node/services");
const simulationWorkspaceServices_1 = require("../../../platform/test/node/simulationWorkspaceServices");
const nullTestProvider_1 = require("../../../platform/testing/common/nullTestProvider");
const testLogService_1 = require("../../../platform/testing/common/testLogService");
const testProvider_1 = require("../../../platform/testing/common/testProvider");
const githubAvailableEmbeddingTypes_1 = require("../../../platform/workspaceChunkSearch/common/githubAvailableEmbeddingTypes");
const workspaceChunkSearchService_1 = require("../../../platform/workspaceChunkSearch/node/workspaceChunkSearchService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const descriptors_1 = require("../../../util/vs/platform/instantiation/common/descriptors");
const claudeCodeSdkService_1 = require("../../agents/claude/node/claudeCodeSdkService");
const mockClaudeCodeSdkService_1 = require("../../agents/claude/node/test/mockClaudeCodeSdkService");
const langModelServer_1 = require("../../agents/node/langModelServer");
const mockLanguageModelServer_1 = require("../../agents/node/test/mockLanguageModelServer");
const commandService_1 = require("../../commands/node/commandService");
const linkifyService_1 = require("../../linkify/common/linkifyService");
const feedbackReporter_1 = require("../../prompt/node/feedbackReporter");
const promptVariablesService_1 = require("../../prompt/node/promptVariablesService");
const todoListContextProvider_1 = require("../../prompt/node/todoListContextProvider");
const codeMapperService_1 = require("../../prompts/node/codeMapper/codeMapperService");
const fixCookbookService_1 = require("../../prompts/node/inline/fixCookbookService");
const editToolLearningService_1 = require("../../tools/common/editToolLearningService");
const toolsService_1 = require("../../tools/common/toolsService");
const toolEmbeddingsComputer_1 = require("../../tools/common/virtualTools/toolEmbeddingsComputer");
const toolGroupingService_1 = require("../../tools/common/virtualTools/toolGroupingService");
require("../../tools/node/allTools");
const testToolsService_1 = require("../../tools/node/test/testToolsService");
const testVirtualTools_1 = require("../../tools/test/node/virtualTools/testVirtualTools");
function createExtensionUnitTestingServices(disposables = new lifecycle_1.DisposableStore(), currentTestRunInfo, modelConfig) {
    const testingServiceCollection = (0, services_1.createPlatformServices)(disposables);
    testingServiceCollection.define(endpointProvider_1.IEndpointProvider, new descriptors_1.SyncDescriptor(testEndpointProvider_1.TestEndpointProvider, [
        modelConfig?.smartChatModel ?? modelConfig?.chatModel,
        modelConfig?.fastChatModel ?? modelConfig?.chatModel,
        modelConfig?.fastRewriteModel,
        currentTestRunInfo,
        !!modelConfig?.skipModelMetadataCache,
        modelConfig?.customModelConfigs,
    ]));
    testingServiceCollection.define(githubCodeSearchService_1.IGithubCodeSearchService, new descriptors_1.SyncDescriptor(githubCodeSearchService_1.GithubCodeSearchService));
    testingServiceCollection.define(testProvider_1.ITestProvider, new nullTestProvider_1.NullTestProvider());
    testingServiceCollection.define(logService_1.ILogService, new descriptors_1.SyncDescriptor(testLogService_1.TestLogService));
    testingServiceCollection.define(adoCodeSearchService_1.IAdoCodeSearchService, new descriptors_1.SyncDescriptor(adoCodeSearchService_1.AdoCodeSearchService));
    testingServiceCollection.define(workspaceChunkSearchService_1.IWorkspaceChunkSearchService, new descriptors_1.SyncDescriptor(workspaceChunkSearchService_1.NullWorkspaceChunkSearchService));
    testingServiceCollection.define(promptVariablesService_1.IPromptVariablesService, new descriptors_1.SyncDescriptor(promptVariablesService_1.NullPromptVariablesService));
    testingServiceCollection.define(linkifyService_1.ILinkifyService, new descriptors_1.SyncDescriptor(linkifyService_1.LinkifyService));
    testingServiceCollection.define(commandService_1.ICommandService, new descriptors_1.SyncDescriptor(commandService_1.CommandServiceImpl));
    testingServiceCollection.define(feedbackReporter_1.IFeedbackReporter, new descriptors_1.SyncDescriptor(feedbackReporter_1.NullFeedbackReporterImpl));
    testingServiceCollection.define(chatMLFetcher_1.IChatMLFetcher, new descriptors_1.SyncDescriptor(mockChatMLFetcher_1.MockChatMLFetcher));
    testingServiceCollection.define(toolsService_1.IToolsService, new descriptors_1.SyncDescriptor(testToolsService_1.TestToolsService, [new Set()]));
    testingServiceCollection.define(claudeCodeSdkService_1.IClaudeCodeSdkService, new descriptors_1.SyncDescriptor(mockClaudeCodeSdkService_1.MockClaudeCodeSdkService));
    testingServiceCollection.define(editLogService_1.IEditLogService, new descriptors_1.SyncDescriptor(editLogService_1.EditLogService));
    testingServiceCollection.define(multiFileEditQualityTelemetry_1.IMultiFileEditInternalTelemetryService, new descriptors_1.SyncDescriptor(multiFileEditQualityTelemetry_1.MultiFileEditInternalTelemetryService));
    testingServiceCollection.define(codeMapperService_1.ICodeMapperService, new descriptors_1.SyncDescriptor(codeMapperService_1.CodeMapperService));
    testingServiceCollection.define(alternativeContent_1.IAlternativeNotebookContentService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SimulationAlternativeNotebookContentService));
    testingServiceCollection.define(alternativeContentEditGenerator_1.IAlternativeNotebookContentEditGenerator, new descriptors_1.SyncDescriptor(alternativeContentEditGenerator_1.AlternativeNotebookContentEditGenerator));
    testingServiceCollection.define(diffService_1.IDiffService, new descriptors_1.SyncDescriptor(diffServiceImpl_1.DiffServiceImpl));
    testingServiceCollection.define(fixCookbookService_1.IFixCookbookService, new descriptors_1.SyncDescriptor(fixCookbookService_1.FixCookbookService));
    testingServiceCollection.define(simulationTestContext_1.ISimulationTestContext, new descriptors_1.SyncDescriptor(simulationTestContext_1.NulSimulationTestContext));
    testingServiceCollection.define(notebookService_1.INotebookService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SimulationNotebookService));
    testingServiceCollection.define(notebookSummaryTracker_1.INotebookSummaryTracker, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SimulationNotebookSummaryTracker));
    testingServiceCollection.define(terminalService_1.ITerminalService, new descriptors_1.SyncDescriptor(terminalService_1.NullTerminalService));
    testingServiceCollection.define(virtualToolTypes_1.IToolGroupingCache, new descriptors_1.SyncDescriptor(virtualToolGroupCache_1.ToolGroupingCache));
    testingServiceCollection.define(virtualToolTypes_1.IToolGroupingService, new descriptors_1.SyncDescriptor(toolGroupingService_1.ToolGroupingService));
    testingServiceCollection.define(toolEmbeddingsComputer_1.IToolEmbeddingsComputer, new descriptors_1.SyncDescriptor(testVirtualTools_1.TestToolEmbeddingsComputer));
    testingServiceCollection.define(embeddingsComputer_1.IEmbeddingsComputer, new descriptors_1.SyncDescriptor(remoteEmbeddingsComputer_1.RemoteEmbeddingsComputer));
    testingServiceCollection.define(todoListContextProvider_1.ITodoListContextProvider, new descriptors_1.SyncDescriptor(todoListContextProvider_1.TodoListContextProvider));
    testingServiceCollection.define(langModelServer_1.ILanguageModelServer, new descriptors_1.SyncDescriptor(mockLanguageModelServer_1.MockLanguageModelServer));
    testingServiceCollection.define(editToolLearningService_1.IEditToolLearningService, new descriptors_1.SyncDescriptor(editToolLearningService_1.EditToolLearningService));
    testingServiceCollection.define(gitService_1.IGitService, new descriptors_1.SyncDescriptor(nullGitExtensionService_1.NullGitExtensionService));
    testingServiceCollection.define(gitExtensionService_1.IGitExtensionService, new descriptors_1.SyncDescriptor(nullGitExtensionService_1.NullGitExtensionService));
    testingServiceCollection.define(gitDiffService_1.IGitDiffService, new descriptors_1.SyncDescriptor(nullGitDiffService_1.NullGitDiffService));
    testingServiceCollection.define(githubAvailableEmbeddingTypes_1.IGithubAvailableEmbeddingTypesService, new descriptors_1.SyncDescriptor(githubAvailableEmbeddingTypes_1.MockGithubAvailableEmbeddingTypesService));
    return testingServiceCollection;
}
//# sourceMappingURL=services.js.map