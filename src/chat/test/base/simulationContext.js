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
exports.NoFetchChatMLFetcher = exports.CacheMode = exports.ICachingResourceFetcher = exports.CacheScope = void 0;
exports.createSimulationChatModelThrottlingTaskLaunchers = createSimulationChatModelThrottlingTaskLaunchers;
exports.createSimulationAccessor = createSimulationAccessor;
const path_1 = __importDefault(require("path"));
const extensionApi_1 = require("../../src/extension/context/node/resolvers/extensionApi");
const conversationStore_1 = require("../../src/extension/conversationStore/node/conversationStore");
const intentService_1 = require("../../src/extension/intents/node/intentService");
const testInfoStorage_1 = require("../../src/extension/intents/node/testIntent/testInfoStorage");
const linkifyService_1 = require("../../src/extension/linkify/common/linkifyService");
const chatMLFetcher_1 = require("../../src/extension/prompt/node/chatMLFetcher");
const services_1 = require("../../src/extension/test/node/services");
const aiEvaluationService_1 = require("../../src/extension/testing/node/aiEvaluationService");
const chatMLFetcher_2 = require("../../src/platform/chat/common/chatMLFetcher");
const commonTypes_1 = require("../../src/platform/chat/common/commonTypes");
const chunkingEndpointClient_1 = require("../../src/platform/chunking/common/chunkingEndpointClient");
const chunkingEndpointClientImpl_1 = require("../../src/platform/chunking/common/chunkingEndpointClientImpl");
const naiveChunkerService_1 = require("../../src/platform/chunking/node/naiveChunkerService");
const configurationService_1 = require("../../src/platform/configuration/common/configurationService");
const defaultsOnlyConfigurationService_1 = require("../../src/platform/configuration/common/defaultsOnlyConfigurationService");
const inMemoryConfigurationService_1 = require("../../src/platform/configuration/test/common/inMemoryConfigurationService");
const embeddingsComputer_1 = require("../../src/platform/embeddings/common/embeddingsComputer");
const remoteEmbeddingsComputer_1 = require("../../src/platform/embeddings/common/remoteEmbeddingsComputer");
const vscodeIndex_1 = require("../../src/platform/embeddings/common/vscodeIndex");
const extensionContext_1 = require("../../src/platform/extContext/common/extensionContext");
const gitExtensionService_1 = require("../../src/platform/git/common/gitExtensionService");
const nullGitExtensionService_1 = require("../../src/platform/git/common/nullGitExtensionService");
const completionsFetchService_1 = require("../../src/platform/nesFetch/common/completionsFetchService");
const completionsFetchServiceImpl_1 = require("../../src/platform/nesFetch/node/completionsFetchServiceImpl");
const projectTemplatesIndex_1 = require("../../src/platform/projectTemplatesIndex/common/projectTemplatesIndex");
const releaseNotesService_1 = require("../../src/platform/releaseNotes/common/releaseNotesService");
const releaseNotesServiceImpl_1 = require("../../src/platform/releaseNotes/vscode/releaseNotesServiceImpl");
const codeOrDocsSearchClient_1 = require("../../src/platform/remoteSearch/common/codeOrDocsSearchClient");
const codeOrDocsSearchClientImpl_1 = require("../../src/platform/remoteSearch/node/codeOrDocsSearchClientImpl");
const reviewService_1 = require("../../src/platform/review/common/reviewService");
const extensionContext_2 = require("../../src/platform/test/node/extensionContext");
const simulationWorkspaceServices_1 = require("../../src/platform/test/node/simulationWorkspaceServices");
const nullTestProvider_1 = require("../../src/platform/testing/common/nullTestProvider");
const testProvider_1 = require("../../src/platform/testing/common/testProvider");
const tokenizer_1 = require("../../src/platform/tokenizer/node/tokenizer");
const githubAvailableEmbeddingTypes_1 = require("../../src/platform/workspaceChunkSearch/common/githubAvailableEmbeddingTypes");
const workspaceChunkSearchService_1 = require("../../src/platform/workspaceChunkSearch/node/workspaceChunkSearchService");
const workspaceFileIndex_1 = require("../../src/platform/workspaceChunkSearch/node/workspaceFileIndex");
const services_2 = require("../../src/util/common/services");
const descriptors_1 = require("../../src/util/vs/platform/instantiation/common/descriptors");
const jsonOutputPrinter_1 = require("../jsonOutputPrinter");
const sharedTypes_1 = require("../simulation/shared/sharedTypes");
const testInformation_1 = require("../simulation/testInformation");
const cachingChatMLFetcher_1 = require("./cachingChatMLFetcher");
const cachingChunksEndpointClient_1 = require("./cachingChunksEndpointClient");
const cachingCodeSearchClient_1 = require("./cachingCodeSearchClient");
const cachingCompletionsFetchService_1 = require("./cachingCompletionsFetchService");
const cachingEmbeddingsFetcher_1 = require("./cachingEmbeddingsFetcher");
const cachingResourceFetcher_1 = require("./cachingResourceFetcher");
const embeddingsCache_1 = require("./embeddingsCache");
const salts_1 = require("./salts");
const simulationEndpointHealth_1 = require("./simulationEndpointHealth");
const simuliationWorkspaceChunkSearch_1 = require("./simuliationWorkspaceChunkSearch");
const spyingChatMLFetcher_1 = require("./spyingChatMLFetcher");
const throttlingChatMLFetcher_1 = require("./throttlingChatMLFetcher");
const throttlingCodeOrDocsSearchClient_1 = require("./throttlingCodeOrDocsSearchClient");
const dotSimulationPath = path_1.default.join(__dirname, `../${sharedTypes_1.SIMULATION_FOLDER_NAME}`);
var CacheScope;
(function (CacheScope) {
    CacheScope["Embeddings"] = "embeddings";
    CacheScope["TSC"] = "tsc";
    CacheScope["Roslyn"] = "roslyn";
    CacheScope["ESLint"] = "eslint";
    CacheScope["Pylint"] = "pylint";
    CacheScope["Ruff"] = "ruff";
    CacheScope["Pyright"] = "pyright";
    CacheScope["Python"] = "python";
    CacheScope["Notebook"] = "notebook";
    CacheScope["DocSearch"] = "docs-search";
    CacheScope["CodeSearch"] = "code-search";
    CacheScope["CPP"] = "cpp";
    CacheScope["Chunks"] = "chunks-endpoint";
})(CacheScope || (exports.CacheScope = CacheScope = {}));
exports.ICachingResourceFetcher = (0, services_2.createServiceIdentifier)('ICachingResourceFetcher');
var CacheMode;
(function (CacheMode) {
    CacheMode["Disable"] = "disable";
    CacheMode["Require"] = "require";
    CacheMode["Default"] = "default";
})(CacheMode || (exports.CacheMode = CacheMode = {}));
class NoFetchChatMLFetcher extends chatMLFetcher_1.ChatMLFetcherImpl {
    fetchMany(...args) {
        return Promise.resolve({
            type: commonTypes_1.ChatFetchResponseType.Success,
            usage: { completion_tokens: 0, prompt_tokens: 0, total_tokens: 0, prompt_tokens_details: { cached_tokens: 0 } },
            value: ['--no-fetch option is provided to simulations -- using a fixed ChatML response'],
            requestId: 'no-fetch-request-id',
            serverRequestId: undefined,
            resolvedModel: ''
        });
    }
}
exports.NoFetchChatMLFetcher = NoFetchChatMLFetcher;
function createSimulationChatModelThrottlingTaskLaunchers(boost) {
    const throttlingLimits = {
        ["gpt-4.1-2025-04-14" /* CHAT_MODEL.GPT41 */]: { limit: 3, type: 'RPS' },
        ["gpt-4o-instant-apply-full-ft-v66" /* CHAT_MODEL.GPT4OPROXY */]: { limit: 1, type: 'RPS' },
        ["experimental-01" /* CHAT_MODEL.EXPERIMENTAL */]: { limit: 3, type: 'RPS' },
        ["gpt-4o-mini" /* CHAT_MODEL.GPT4OMINI */]: { limit: 18, type: 'RPS' },
        ["custom-nes" /* CHAT_MODEL.CUSTOM_NES */]: { limit: 5, type: 'RPS' },
        ["o3-mini" /* CHAT_MODEL.O3MINI */]: { limit: 1, type: 'RPS' },
        ["claude-3.5-sonnet" /* CHAT_MODEL.CLAUDE_SONNET */]: { limit: 3, type: 'RPS' },
        ["claude-3.7-sonnet" /* CHAT_MODEL.CLAUDE_37_SONNET */]: { limit: 4, type: 'RPS' },
        ["o1" /* CHAT_MODEL.O1 */]: { limit: 4, type: 'RPS' },
        ["o1-mini" /* CHAT_MODEL.O1MINI */]: { limit: 5, type: 'RPM' },
        ["gemini-2.0-flash-001" /* CHAT_MODEL.GEMINI_FLASH */]: { limit: 20, type: 'RPM' },
        ["deepseek-chat" /* CHAT_MODEL.DEEPSEEK_CHAT */]: { limit: 1, type: 'RPS' },
        ["xtab-4o-mini-finetuned" /* CHAT_MODEL.XTAB_4O_MINI_FINETUNED */]: { limit: 5, type: 'RPS' }
    };
    if (boost) {
        throttlingLimits["claude-3.5-sonnet" /* CHAT_MODEL.CLAUDE_SONNET */] = { limit: 20, type: 'RPS' };
        throttlingLimits["claude-3.7-sonnet" /* CHAT_MODEL.CLAUDE_37_SONNET */] = { limit: 20, type: 'RPS' };
    }
    return new throttlingChatMLFetcher_1.ChatModelThrottlingTaskLaunchers(throttlingLimits);
}
/**
 * Creates an accessor suitable for running tests.
 * The `IChatMLFetcher` will use caching and the chat endpoint is configurable via the `chatModel` parameter.
 * The `IEmbeddingsComputer` will use caching and the embeddings endpoint is configurable via the `embeddingsModel` parameter.
 */
async function createSimulationAccessor(modelConfig, opts, currentTestRunInfo) {
    const testingServiceCollection = (0, services_1.createExtensionUnitTestingServices)(undefined, currentTestRunInfo, modelConfig);
    if (currentTestRunInfo.isInRealExtensionHost) {
        const { addExtensionHostSimulationServices } = await Promise.resolve().then(() => __importStar(require('./extHostContext/simulationExtHostContext')));
        await addExtensionHostSimulationServices(testingServiceCollection);
    }
    testingServiceCollection.define(testInformation_1.ITestInformation, new descriptors_1.SyncDescriptor(testInformation_1.TestInformation, [currentTestRunInfo.test]));
    try {
        const newLocal = new Map(currentTestRunInfo.test.nonExtensionConfigurations);
        const configs = Object.entries(opts.configs ?? {}).map(([key, value]) => [lookupConfigKey(key), value]);
        testingServiceCollection.define(configurationService_1.IConfigurationService, new descriptors_1.SyncDescriptor(inMemoryConfigurationService_1.InMemoryConfigurationService, [
            new defaultsOnlyConfigurationService_1.DefaultsOnlyConfigurationService(),
            new Map([
                [configurationService_1.ConfigKey.UseProjectTemplates, false],
                [configurationService_1.ConfigKey.SummarizeAgentConversationHistory, opts.summarizeHistory],
                ...currentTestRunInfo.test.configurations?.map(c => [c.key, c.value]) ?? [],
                ...configs,
            ]),
            newLocal,
        ]));
    }
    catch (err) {
        console.log(currentTestRunInfo.test.nonExtensionConfigurations);
        console.error('Error in createSimulationAccessor', err);
        console.error(currentTestRunInfo.test.fullName);
        throw err;
    }
    const globalStoragePath = path_1.default.join(dotSimulationPath, 'cache', 'global-storage');
    const globalStatePath = path_1.default.join(dotSimulationPath, 'cache', 'global-state');
    testingServiceCollection.define(simulationEndpointHealth_1.ISimulationEndpointHealth, new descriptors_1.SyncDescriptor(simulationEndpointHealth_1.SimulationEndpointHealthImpl));
    testingServiceCollection.define(jsonOutputPrinter_1.IJSONOutputPrinter, new descriptors_1.SyncDescriptor(jsonOutputPrinter_1.NoopJSONOutputPrinter));
    testingServiceCollection.define(exports.ICachingResourceFetcher, new descriptors_1.SyncDescriptor(cachingResourceFetcher_1.CachingResourceFetcher, [currentTestRunInfo, opts.resourcesCacheMode]));
    testingServiceCollection.define(extensionContext_1.IVSCodeExtensionContext, new descriptors_1.SyncDescriptor(extensionContext_2.MockExtensionContext, [globalStoragePath, (0, extensionContext_2.constructGlobalStateMemento)(globalStatePath)]));
    testingServiceCollection.define(intentService_1.IIntentService, new descriptors_1.SyncDescriptor(intentService_1.IntentService));
    testingServiceCollection.define(aiEvaluationService_1.IAIEvaluationService, new descriptors_1.SyncDescriptor(aiEvaluationService_1.AIEvaluationService));
    const docsSearchClient = new descriptors_1.SyncDescriptor(throttlingCodeOrDocsSearchClient_1.ThrottlingCodeOrDocsSearchClient, [new descriptors_1.SyncDescriptor(codeOrDocsSearchClientImpl_1.DocsSearchClient)]);
    testingServiceCollection.define(tokenizer_1.ITokenizerProvider, new descriptors_1.SyncDescriptor(tokenizer_1.TokenizerProvider, [false]));
    const cacheTestInfo = new cachingChatMLFetcher_1.CachedTestInfo(currentTestRunInfo.test, currentTestRunInfo.testRunNumber);
    let chatMLFetcher = opts.isNoFetchModeEnabled
        ? new descriptors_1.SyncDescriptor(NoFetchChatMLFetcher)
        : new descriptors_1.SyncDescriptor(throttlingChatMLFetcher_1.ThrottlingChatMLFetcher, [
            new descriptors_1.SyncDescriptor(chatMLFetcher_1.ChatMLFetcherImpl),
            opts.chatModelThrottlingTaskLaunchers
        ]);
    if (opts.createChatMLCache) {
        chatMLFetcher = new descriptors_1.SyncDescriptor(cachingChatMLFetcher_1.CachingChatMLFetcher, [
            chatMLFetcher,
            opts.createChatMLCache(currentTestRunInfo),
            cacheTestInfo,
            { endpointVersion: 'CAPI' },
            opts.languageModelCacheMode ?? CacheMode.Default
        ]);
    }
    if (currentTestRunInfo.fetchRequestCollector) {
        chatMLFetcher = new descriptors_1.SyncDescriptor(spyingChatMLFetcher_1.SpyingChatMLFetcher, [currentTestRunInfo.fetchRequestCollector, chatMLFetcher]);
    }
    testingServiceCollection.define(chatMLFetcher_2.IChatMLFetcher, chatMLFetcher);
    if (opts.createNesFetchCache === undefined || cacheTestInfo === undefined) {
        testingServiceCollection.define(completionsFetchService_1.ICompletionsFetchService, new descriptors_1.SyncDescriptor(completionsFetchServiceImpl_1.CompletionsFetchService));
    }
    else {
        testingServiceCollection.define(completionsFetchService_1.ICompletionsFetchService, new descriptors_1.SyncDescriptor(cachingCompletionsFetchService_1.CachingCompletionsFetchService, [
            opts.createNesFetchCache(currentTestRunInfo),
            cacheTestInfo,
            opts.languageModelCacheMode ?? CacheMode.Default,
            currentTestRunInfo.fetchRequestCollector,
            opts.isNoFetchModeEnabled,
        ]));
    }
    if (opts.languageModelCacheMode === CacheMode.Disable) {
        testingServiceCollection.define(embeddingsComputer_1.IEmbeddingsComputer, new descriptors_1.SyncDescriptor(remoteEmbeddingsComputer_1.RemoteEmbeddingsComputer));
        testingServiceCollection.define(codeOrDocsSearchClient_1.IDocsSearchClient, docsSearchClient);
        testingServiceCollection.define(chunkingEndpointClient_1.IChunkingEndpointClient, new descriptors_1.SyncDescriptor(chunkingEndpointClientImpl_1.ChunkingEndpointClientImpl));
        testingServiceCollection.define(vscodeIndex_1.ICombinedEmbeddingIndex, new descriptors_1.SyncDescriptor(vscodeIndex_1.VSCodeCombinedIndexImpl, [/*useRemoteCache*/ true]));
        testingServiceCollection.define(extensionApi_1.IApiEmbeddingsIndex, new descriptors_1.SyncDescriptor(extensionApi_1.ApiEmbeddingsIndex, [/*useRemoteCache*/ true]));
        testingServiceCollection.define(projectTemplatesIndex_1.IProjectTemplatesIndex, new descriptors_1.SyncDescriptor(projectTemplatesIndex_1.ProjectTemplatesIndex, [/*useRemoteCache*/ true]));
    }
    else {
        const embeddingCache = new embeddingsCache_1.EmbeddingsSQLiteCache(salts_1.TestingCacheSalts.embeddingsCacheSalt, currentTestRunInfo);
        testingServiceCollection.define(embeddingsComputer_1.IEmbeddingsComputer, new descriptors_1.SyncDescriptor(cachingEmbeddingsFetcher_1.CachingEmbeddingsComputer, [embeddingCache]));
        const codeOrDocSearchCache = new cachingCodeSearchClient_1.CodeOrDocSearchSQLiteCache(salts_1.TestingCacheSalts.codeSearchCacheSalt, currentTestRunInfo);
        const chunksEndpointCache = new cachingChunksEndpointClient_1.ChunkingEndpointClientSQLiteCache(salts_1.TestingCacheSalts.chunksEndpointCacheSalt, currentTestRunInfo);
        testingServiceCollection.define(codeOrDocsSearchClient_1.IDocsSearchClient, new descriptors_1.SyncDescriptor(cachingCodeSearchClient_1.CachingCodeOrDocSearchClient, [docsSearchClient, codeOrDocSearchCache]));
        testingServiceCollection.define(vscodeIndex_1.ICombinedEmbeddingIndex, new descriptors_1.SyncDescriptor(vscodeIndex_1.VSCodeCombinedIndexImpl, [/*useRemoteCache*/ false]));
        testingServiceCollection.define(extensionApi_1.IApiEmbeddingsIndex, new descriptors_1.SyncDescriptor(extensionApi_1.ApiEmbeddingsIndex, [/*useRemoteCache*/ false]));
        testingServiceCollection.define(projectTemplatesIndex_1.IProjectTemplatesIndex, new descriptors_1.SyncDescriptor(projectTemplatesIndex_1.ProjectTemplatesIndex, [/*useRemoteCache*/ false]));
        testingServiceCollection.define(chunkingEndpointClient_1.IChunkingEndpointClient, new descriptors_1.SyncDescriptor(cachingChunksEndpointClient_1.CachingChunkingEndpointClient, [chunksEndpointCache]));
    }
    testingServiceCollection.define(naiveChunkerService_1.INaiveChunkingService, new descriptors_1.SyncDescriptor(naiveChunkerService_1.NaiveChunkingService));
    testingServiceCollection.define(linkifyService_1.ILinkifyService, new descriptors_1.SyncDescriptor(linkifyService_1.LinkifyService));
    testingServiceCollection.define(testProvider_1.ITestProvider, new descriptors_1.SyncDescriptor(nullTestProvider_1.NullTestProvider));
    testingServiceCollection.define(testInfoStorage_1.ITestGenInfoStorage, new descriptors_1.SyncDescriptor(testInfoStorage_1.TestGenInfoStorage));
    testingServiceCollection.define(conversationStore_1.IConversationStore, new descriptors_1.SyncDescriptor(conversationStore_1.ConversationStore));
    testingServiceCollection.define(reviewService_1.IReviewService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SimulationReviewService));
    testingServiceCollection.define(gitExtensionService_1.IGitExtensionService, new descriptors_1.SyncDescriptor(nullGitExtensionService_1.NullGitExtensionService));
    testingServiceCollection.define(releaseNotesService_1.IReleaseNotesService, new descriptors_1.SyncDescriptor(releaseNotesServiceImpl_1.ReleaseNotesService));
    testingServiceCollection.define(workspaceFileIndex_1.IWorkspaceFileIndex, new descriptors_1.SyncDescriptor(workspaceFileIndex_1.WorkspaceFileIndex));
    testingServiceCollection.define(githubAvailableEmbeddingTypes_1.IGithubAvailableEmbeddingTypesService, new descriptors_1.SyncDescriptor(githubAvailableEmbeddingTypes_1.MockGithubAvailableEmbeddingTypesService));
    if (opts.useExperimentalCodeSearchService) {
        testingServiceCollection.define(workspaceChunkSearchService_1.IWorkspaceChunkSearchService, new descriptors_1.SyncDescriptor(simuliationWorkspaceChunkSearch_1.SimulationCodeSearchChunkSearchService, []));
    }
    else {
        testingServiceCollection.define(workspaceChunkSearchService_1.IWorkspaceChunkSearchService, new descriptors_1.SyncDescriptor(workspaceChunkSearchService_1.WorkspaceChunkSearchService));
    }
    return testingServiceCollection;
}
function lookupConfigKey(key) {
    const config = configurationService_1.globalConfigRegistry.configs.get(key);
    if (!config) {
        throw new Error(`Configuration '${key}' provided does not exist in product. Double check if the configuration key exists by using it in vscode settings.json.`);
    }
    return config;
}
//# sourceMappingURL=simulationContext.js.map