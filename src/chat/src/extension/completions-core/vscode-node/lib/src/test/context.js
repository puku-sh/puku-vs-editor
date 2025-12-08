"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibTestsEditorInfo = void 0;
exports._createBaselineContext = _createBaselineContext;
exports.createLibTestingContext = createLibTestingContext;
const languageContextProviderService_1 = require("../../../../../../platform/languageContextProvider/common/languageContextProviderService");
const nullLanguageContextProviderService_1 = require("../../../../../../platform/languageContextProvider/common/nullLanguageContextProviderService");
const descriptors_1 = require("../../../../../../util/vs/platform/instantiation/common/descriptors");
const services_1 = require("../../../../../test/vscode-node/services");
const completionsTelemetryServiceBridge_1 = require("../../../bridge/src/completionsTelemetryServiceBridge");
const copilotTokenManager_1 = require("../auth/copilotTokenManager");
const citationManager_1 = require("../citationManager");
const completionNotifier_1 = require("../completionNotifier");
const config_1 = require("../config");
const userErrorNotifier_1 = require("../error/userErrorNotifier");
const features_1 = require("../experiments/features");
const featuresService_1 = require("../experiments/featuresService");
const fileReader_1 = require("../fileReader");
const fileSystem_1 = require("../fileSystem");
const asyncCompletions_1 = require("../ghostText/asyncCompletions");
const completionsCache_1 = require("../ghostText/completionsCache");
const configBlockMode_1 = require("../ghostText/configBlockMode");
const current_1 = require("../ghostText/current");
const last_1 = require("../ghostText/last");
const speculativeRequestCache_1 = require("../ghostText/speculativeRequestCache");
const localFileSystem_1 = require("../localFileSystem");
const logger_1 = require("../logger");
const networking_1 = require("../networking");
const notificationSender_1 = require("../notificationSender");
const model_1 = require("../openai/model");
const progress_1 = require("../progress");
const completionsPromptFactory_1 = require("../prompt/completionsPromptFactory/completionsPromptFactory");
const contextProviderBridge_1 = require("../prompt/components/contextProviderBridge");
const contextProviderRegistry_1 = require("../prompt/contextProviderRegistry");
const contextProviderStatistics_1 = require("../prompt/contextProviderStatistics");
const emptyRecentEditsProvider_1 = require("../prompt/recentEdits/emptyRecentEditsProvider");
const recentEditsProvider_1 = require("../prompt/recentEdits/recentEditsProvider");
const telemetry_1 = require("../telemetry");
const userConfig_1 = require("../telemetry/userConfig");
const textDocumentManager_1 = require("../textDocumentManager");
const promiseQueue_1 = require("../util/promiseQueue");
const runtimeMode_1 = require("../util/runtimeMode");
const copilotTokenManager_2 = require("./copilotTokenManager");
const fetcher_1 = require("./fetcher");
const telemetry_2 = require("./telemetry");
const testHelpers_1 = require("./testHelpers");
const textDocument_1 = require("./textDocument");
class NullLog {
    logIt(..._) { }
}
/**
 * Baseline for a context. Tests should prefer the specific variants outlined below.
 *
 * @see createLibTestingContext
 * @see createExtensionTestingContext
 * @see createAgentTestingContext
 */
function _createBaselineContext(serviceCollection, configProvider) {
    serviceCollection.set(languageContextProviderService_1.ILanguageContextProviderService, new nullLanguageContextProviderService_1.NullLanguageContextProviderService());
    serviceCollection.define(logger_1.ICompletionsLogTargetService, new NullLog());
    serviceCollection.define(completionsCache_1.ICompletionsCacheService, new completionsCache_1.CompletionsCache());
    serviceCollection.define(config_1.ICompletionsConfigProvider, configProvider);
    serviceCollection.define(runtimeMode_1.ICompletionsRuntimeModeService, new runtimeMode_1.RuntimeMode({ debug: false, verboseLogging: false, testMode: true, simulation: false }));
    serviceCollection.define(speculativeRequestCache_1.ICompletionsSpeculativeRequestCache, new speculativeRequestCache_1.SpeculativeRequestCache());
    serviceCollection.define(last_1.ICompletionsLastGhostText, new last_1.LastGhostText());
    serviceCollection.define(current_1.ICompletionsCurrentGhostText, new current_1.CurrentGhostText());
    serviceCollection.define(progress_1.ICompletionsStatusReporter, new progress_1.NoOpStatusReporter());
    serviceCollection.define(citationManager_1.ICompletionsCitationManager, new citationManager_1.NoOpCitationManager());
    serviceCollection.define(notificationSender_1.ICompletionsNotificationSender, new testHelpers_1.TestNotificationSender());
    serviceCollection.define(telemetry_1.ICompletionsTelemetryReporters, new telemetry_1.TelemetryReporters());
    serviceCollection.define(copilotTokenManager_1.ICompletionsCopilotTokenManager, new copilotTokenManager_2.FakeCopilotTokenManager());
    serviceCollection.define(featuresService_1.ICompletionsFeaturesService, new descriptors_1.SyncDescriptor(features_1.Features));
    serviceCollection.define(completionsTelemetryServiceBridge_1.ICompletionsTelemetryService, new descriptors_1.SyncDescriptor(completionsTelemetryServiceBridge_1.CompletionsTelemetryServiceBridge));
    serviceCollection.define(completionNotifier_1.ICompletionsNotifierService, new descriptors_1.SyncDescriptor(completionNotifier_1.CompletionNotifier));
    serviceCollection.define(configBlockMode_1.ICompletionsBlockModeConfig, new descriptors_1.SyncDescriptor(configBlockMode_1.ConfigBlockModeConfig));
    serviceCollection.define(recentEditsProvider_1.ICompletionsRecentEditsProviderService, new emptyRecentEditsProvider_1.EmptyRecentEditsProvider());
    serviceCollection.define(userErrorNotifier_1.ICompletionsUserErrorNotifierService, new descriptors_1.SyncDescriptor(userErrorNotifier_1.UserErrorNotifier));
    serviceCollection.define(fileReader_1.ICompletionsFileReaderService, new descriptors_1.SyncDescriptor(fileReader_1.FileReader));
    serviceCollection.define(userConfig_1.ICompletionsTelemetryUserConfigService, new descriptors_1.SyncDescriptor(userConfig_1.TelemetryUserConfig));
    serviceCollection.define(model_1.ICompletionsModelManagerService, new descriptors_1.SyncDescriptor(model_1.AvailableModelsManager, [false]));
    serviceCollection.define(asyncCompletions_1.ICompletionsAsyncManagerService, new descriptors_1.SyncDescriptor(asyncCompletions_1.AsyncCompletionManager));
    serviceCollection.define(contextProviderBridge_1.ICompletionsContextProviderBridgeService, new descriptors_1.SyncDescriptor(contextProviderBridge_1.ContextProviderBridge));
    serviceCollection.define(promiseQueue_1.ICompletionsPromiseQueueService, new telemetry_2.TestPromiseQueue());
    //ctx.set(FileSearch, new TestingFileSearch());
    serviceCollection.define(completionsPromptFactory_1.ICompletionsPromptFactoryService, new descriptors_1.SyncDescriptor(completionsPromptFactory_1.CompletionsPromptFactory));
    serviceCollection.define(contextProviderStatistics_1.ICompletionsContextProviderService, new contextProviderStatistics_1.ContextProviderStatistics());
    serviceCollection.define(contextProviderRegistry_1.ICompletionsContextProviderRegistryService, new descriptors_1.SyncDescriptor(contextProviderRegistry_1.CachedContextProviderRegistry, [contextProviderRegistry_1.MutableContextProviderRegistry, (_, documentSelector, documentContext) => {
            if (documentSelector.find(ds => ds === '*')) {
                return 1;
            }
            return documentSelector.find(ds => typeof ds !== 'string' && ds.language === documentContext.languageId)
                ? 10
                : 0;
        }]));
    return serviceCollection;
}
/**
 * @returns a context suitable for `lib` tests.
 */
function createLibTestingContext() {
    let serviceCollection = (0, services_1.createExtensionTestingServices)();
    serviceCollection = _createBaselineContext(serviceCollection, new config_1.InMemoryConfigProvider(new config_1.DefaultsOnlyConfigProvider()));
    serviceCollection.define(networking_1.ICompletionsFetcherService, new fetcher_1.NoFetchFetcher());
    serviceCollection.define(config_1.ICompletionsEditorAndPluginInfo, new LibTestsEditorInfo());
    serviceCollection.define(textDocumentManager_1.ICompletionsTextDocumentManagerService, new descriptors_1.SyncDescriptor(textDocument_1.TestTextDocumentManager));
    serviceCollection.define(fileSystem_1.ICompletionsFileSystemService, new localFileSystem_1.LocalFileSystem());
    serviceCollection.define(contextProviderRegistry_1.ICompletionsDefaultContextProviders, new contextProviderRegistry_1.DefaultContextProvidersContainer());
    return serviceCollection;
}
class LibTestsEditorInfo {
    constructor(editorPluginInfo = { name: 'lib-tests-plugin', version: '2' }, editorInfo = { name: 'lib-tests-editor', version: '1' }, relatedPluginInfo = [{ name: 'lib-tests-related-plugin', version: '3' }]) {
        this.editorPluginInfo = editorPluginInfo;
        this.editorInfo = editorInfo;
        this.relatedPluginInfo = relatedPluginInfo;
    }
    getEditorInfo() {
        return this.editorInfo;
    }
    getEditorPluginInfo() {
        return this.editorPluginInfo;
    }
    getRelatedPluginInfo() {
        return this.relatedPluginInfo;
    }
}
exports.LibTestsEditorInfo = LibTestsEditorInfo;
//# sourceMappingURL=context.js.map