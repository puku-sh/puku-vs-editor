"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = createContext;
exports.setup = setup;
exports.registerUnificationCommands = registerUnificationCommands;
exports.registerCommandWrapper = registerCommandWrapper;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_1 = require("vscode");
const logService_1 = require("../../../platform/log/common/logService");
const outputChannelLogTarget_1 = require("../../../platform/log/vscode/outputChannelLogTarget");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const uri_1 = require("../../../util/vs/base/common/uri");
const descriptors_1 = require("../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const serviceCollection_1 = require("../../../util/vs/platform/instantiation/common/serviceCollection");
const completionsTelemetryServiceBridge_1 = require("./bridge/src/completionsTelemetryServiceBridge");
const citationManager_1 = require("./extension/src/codeReferencing/citationManager");
const config_1 = require("./extension/src/config");
const constants_1 = require("./extension/src/constants");
const contextProviderMatch_1 = require("./extension/src/contextProviderMatch");
const common_1 = require("./extension/src/copilotPanel/common");
const extensionStatus_1 = require("./extension/src/extensionStatus");
const fileSystem_1 = require("./extension/src/fileSystem");
const ghostText_1 = require("./extension/src/ghostText/ghostText");
const inlineCompletion_1 = require("./extension/src/inlineCompletion");
const modelPicker_1 = require("./extension/src/modelPicker");
const statusBar_1 = require("./extension/src/statusBar");
const statusBarPicker_1 = require("./extension/src/statusBarPicker");
const textDocumentManager_1 = require("./extension/src/textDocumentManager");
const copilotTokenManager_1 = require("./lib/src/auth/copilotTokenManager");
const citationManager_2 = require("./lib/src/citationManager");
const completionNotifier_1 = require("./lib/src/completionNotifier");
const completionsObservableWorkspace_1 = require("./lib/src/completionsObservableWorkspace");
const config_2 = require("./lib/src/config");
const documentTracker_1 = require("./lib/src/documentTracker");
const userErrorNotifier_1 = require("./lib/src/error/userErrorNotifier");
const defaultExpFilters_1 = require("./lib/src/experiments/defaultExpFilters");
const features_1 = require("./lib/src/experiments/features");
const featuresService_1 = require("./lib/src/experiments/featuresService");
const fileReader_1 = require("./lib/src/fileReader");
const fileSystem_2 = require("./lib/src/fileSystem");
const asyncCompletions_1 = require("./lib/src/ghostText/asyncCompletions");
const completionsCache_1 = require("./lib/src/ghostText/completionsCache");
const configBlockMode_1 = require("./lib/src/ghostText/configBlockMode");
const current_1 = require("./lib/src/ghostText/current");
const last_1 = require("./lib/src/ghostText/last");
const speculativeRequestCache_1 = require("./lib/src/ghostText/speculativeRequestCache");
const logger_1 = require("./lib/src/logger");
const util_1 = require("./lib/src/logging/util");
const networking_1 = require("./lib/src/networking");
const notificationSender_1 = require("./lib/src/notificationSender");
const fetch_1 = require("./lib/src/openai/fetch");
const model_1 = require("./lib/src/openai/model");
const progress_1 = require("./lib/src/progress");
const completionsPromptFactory_1 = require("./lib/src/prompt/completionsPromptFactory/completionsPromptFactory");
const contextProviderBridge_1 = require("./lib/src/prompt/components/contextProviderBridge");
const contextProviderRegistry_1 = require("./lib/src/prompt/contextProviderRegistry");
const contextProviderStatistics_1 = require("./lib/src/prompt/contextProviderStatistics");
const recentEditsProvider_1 = require("./lib/src/prompt/recentEdits/recentEditsProvider");
const compositeRelatedFilesProvider_1 = require("./lib/src/prompt/similarFiles/compositeRelatedFilesProvider");
const relatedFiles_1 = require("./lib/src/prompt/similarFiles/relatedFiles");
const userConfig_1 = require("./lib/src/telemetry/userConfig");
const textDocumentManager_2 = require("./lib/src/textDocumentManager");
const promiseQueue_1 = require("./lib/src/util/promiseQueue");
const runtimeMode_1 = require("./lib/src/util/runtimeMode");
/** @public */
function createContext(serviceAccessor, store) {
    const logService = serviceAccessor.get(logService_1.ILogService);
    const serviceCollection = new serviceCollection_1.ServiceCollection();
    serviceCollection.set(logger_1.ICompletionsLogTargetService, new class {
        logIt(level, category, ...extra) {
            const msg = (0, util_1.formatLogMessage)(category, ...extra);
            switch (level) {
                case logger_1.LogLevel.DEBUG: return logService.debug(msg);
                case logger_1.LogLevel.INFO: return logService.info(msg);
                case logger_1.LogLevel.WARN: return logService.warn(msg);
                case logger_1.LogLevel.ERROR: return logService.error(msg);
            }
        }
    });
    serviceCollection.set(runtimeMode_1.ICompletionsRuntimeModeService, runtimeMode_1.RuntimeMode.fromEnvironment(false));
    serviceCollection.set(completionsCache_1.ICompletionsCacheService, new completionsCache_1.CompletionsCache());
    serviceCollection.set(config_2.ICompletionsConfigProvider, new config_1.VSCodeConfigProvider());
    serviceCollection.set(last_1.ICompletionsLastGhostText, new last_1.LastGhostText());
    serviceCollection.set(current_1.ICompletionsCurrentGhostText, new current_1.CurrentGhostText());
    serviceCollection.set(speculativeRequestCache_1.ICompletionsSpeculativeRequestCache, new speculativeRequestCache_1.SpeculativeRequestCache());
    serviceCollection.set(notificationSender_1.ICompletionsNotificationSender, new notificationSender_1.ExtensionNotificationSender());
    serviceCollection.set(config_2.ICompletionsEditorAndPluginInfo, new config_1.VSCodeEditorInfo());
    serviceCollection.set(extensionStatus_1.ICompletionsExtensionStatus, new extensionStatus_1.CopilotExtensionStatus());
    serviceCollection.set(featuresService_1.ICompletionsFeaturesService, new descriptors_1.SyncDescriptor(features_1.Features));
    serviceCollection.set(completionsObservableWorkspace_1.ICompletionsObservableWorkspace, new descriptors_1.SyncDescriptor(completionsObservableWorkspace_1.CompletionsObservableWorkspace));
    serviceCollection.set(progress_1.ICompletionsStatusReporter, new descriptors_1.SyncDescriptor(statusBar_1.CopilotStatusBar, ['puku.languageStatus']));
    serviceCollection.set(copilotTokenManager_1.ICompletionsCopilotTokenManager, new descriptors_1.SyncDescriptor(copilotTokenManager_1.CopilotTokenManagerImpl, [false]));
    serviceCollection.set(textDocumentManager_2.ICompletionsTextDocumentManagerService, new descriptors_1.SyncDescriptor(textDocumentManager_1.ExtensionTextDocumentManager));
    serviceCollection.set(fileReader_1.ICompletionsFileReaderService, new descriptors_1.SyncDescriptor(fileReader_1.FileReader));
    serviceCollection.set(configBlockMode_1.ICompletionsBlockModeConfig, new descriptors_1.SyncDescriptor(configBlockMode_1.ConfigBlockModeConfig));
    serviceCollection.set(completionsTelemetryServiceBridge_1.ICompletionsTelemetryService, new descriptors_1.SyncDescriptor(completionsTelemetryServiceBridge_1.CompletionsTelemetryServiceBridge));
    serviceCollection.set(userConfig_1.ICompletionsTelemetryUserConfigService, new descriptors_1.SyncDescriptor(userConfig_1.TelemetryUserConfig));
    serviceCollection.set(recentEditsProvider_1.ICompletionsRecentEditsProviderService, new descriptors_1.SyncDescriptor(recentEditsProvider_1.FullRecentEditsProvider, [undefined]));
    serviceCollection.set(completionNotifier_1.ICompletionsNotifierService, new descriptors_1.SyncDescriptor(completionNotifier_1.CompletionNotifier));
    serviceCollection.set(fetch_1.ICompletionsOpenAIFetcherService, new descriptors_1.SyncDescriptor(fetch_1.LiveOpenAIFetcher));
    serviceCollection.set(model_1.ICompletionsModelManagerService, new descriptors_1.SyncDescriptor(model_1.AvailableModelsManager, [true]));
    serviceCollection.set(asyncCompletions_1.ICompletionsAsyncManagerService, new descriptors_1.SyncDescriptor(asyncCompletions_1.AsyncCompletionManager));
    serviceCollection.set(contextProviderBridge_1.ICompletionsContextProviderBridgeService, new descriptors_1.SyncDescriptor(contextProviderBridge_1.ContextProviderBridge));
    serviceCollection.set(userErrorNotifier_1.ICompletionsUserErrorNotifierService, new descriptors_1.SyncDescriptor(userErrorNotifier_1.UserErrorNotifier));
    serviceCollection.set(relatedFiles_1.ICompletionsRelatedFilesProviderService, new descriptors_1.SyncDescriptor(compositeRelatedFilesProvider_1.CompositeRelatedFilesProvider));
    serviceCollection.set(fileSystem_2.ICompletionsFileSystemService, fileSystem_1.extensionFileSystem);
    serviceCollection.set(contextProviderRegistry_1.ICompletionsContextProviderRegistryService, new descriptors_1.SyncDescriptor(contextProviderRegistry_1.CachedContextProviderRegistry, [contextProviderRegistry_1.CoreContextProviderRegistry, contextProviderMatch_1.contextProviderMatch]));
    serviceCollection.set(promiseQueue_1.ICompletionsPromiseQueueService, new promiseQueue_1.PromiseQueue());
    serviceCollection.set(citationManager_2.ICompletionsCitationManager, new descriptors_1.SyncDescriptor(citationManager_1.LoggingCitationManager));
    serviceCollection.set(contextProviderStatistics_1.ICompletionsContextProviderService, new contextProviderStatistics_1.ContextProviderStatistics());
    try {
        serviceCollection.set(completionsPromptFactory_1.ICompletionsPromptFactoryService, new descriptors_1.SyncDescriptor(completionsPromptFactory_1.CompletionsPromptFactory));
    }
    catch (e) {
        console.log(e);
    }
    serviceCollection.set(networking_1.ICompletionsFetcherService, new descriptors_1.SyncDescriptor(networking_1.CompletionsFetcher));
    serviceCollection.set(contextProviderRegistry_1.ICompletionsDefaultContextProviders, new contextProviderRegistry_1.DefaultContextProvidersContainer());
    return serviceAccessor.get(instantiation_1.IInstantiationService).createChild(serviceCollection, store);
}
/** @public */
function setup(serviceAccessor, disposables) {
    // This must be registered before activation!
    // CodeQuote needs to listen for the initial token notification event.
    disposables.add(serviceAccessor.get(citationManager_2.ICompletionsCitationManager).register());
    // Send telemetry when ghost text is accepted
    disposables.add((0, ghostText_1.registerGhostTextDependencies)(serviceAccessor));
    // Register to listen for changes to the active document to keep track
    // of last access time
    disposables.add((0, documentTracker_1.registerDocumentTracker)(serviceAccessor));
    // Register the context providers enabled by default.
    const defaultContextProviders = serviceAccessor.get(contextProviderRegistry_1.ICompletionsDefaultContextProviders);
    defaultContextProviders.add('ms-vscode.cpptools');
    defaultContextProviders.add('puku.semanticContext'); // Puku semantic context for FIM
    disposables.add((0, defaultExpFilters_1.setupCompletionsExperimentationService)(serviceAccessor));
}
function registerUnificationCommands(accessor) {
    const disposables = new lifecycle_1.DisposableStore();
    disposables.add(registerEnablementCommands(accessor));
    disposables.add(registerStatusBar(accessor));
    disposables.add(registerDiagnosticCommands(accessor));
    disposables.add((0, common_1.registerPanelSupport)(accessor));
    disposables.add(registerModelPickerCommands(accessor));
    return disposables;
}
function registerEnablementCommands(accessor) {
    const disposables = new lifecycle_1.DisposableStore();
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    // Enable/Disable/Toggle completions commands [with Command Palette support]
    function enable(id) {
        return registerCommandWrapper(accessor, id, async () => {
            await instantiationService.invokeFunction(config_1.enableCompletions);
        });
    }
    function disable(id) {
        return registerCommandWrapper(accessor, id, async () => {
            await instantiationService.invokeFunction(config_1.disableCompletions);
        });
    }
    function toggle(id) {
        return registerCommandWrapper(accessor, id, async () => {
            await instantiationService.invokeFunction(config_1.toggleCompletions);
        });
    }
    // To support command palette
    disposables.add(enable(constants_1.CMDEnableCompletionsChat));
    disposables.add(disable(constants_1.CMDDisableCompletionsChat));
    disposables.add(toggle(constants_1.CMDToggleCompletionsChat));
    // To support keybindings/main functionality
    disposables.add(enable(constants_1.CMDEnableCompletionsClient));
    disposables.add(disable(constants_1.CMDDisableCompletionsClient));
    disposables.add(toggle(constants_1.CMDToggleCompletionsClient));
    return disposables;
}
function registerModelPickerCommands(accessor) {
    const disposables = new lifecycle_1.DisposableStore();
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    const modelsPicker = instantiationService.createInstance(modelPicker_1.ModelPickerManager);
    function registerModelPicker(commandId) {
        return registerCommandWrapper(accessor, commandId, async () => {
            await modelsPicker.showModelPicker();
        });
    }
    // Model picker command [with Command Palette support]
    disposables.add(registerModelPicker(constants_1.CMDOpenModelPickerClient));
    disposables.add(registerModelPicker(constants_1.CMDOpenModelPickerChat));
    return disposables;
}
function registerStatusBar(accessor) {
    const disposables = new lifecycle_1.DisposableStore();
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    const copilotTokenManagerService = accessor.get(copilotTokenManager_1.ICompletionsCopilotTokenManager);
    const extensionStatusService = accessor.get(extensionStatus_1.ICompletionsExtensionStatus);
    // Status menu command [with Command Palette support]
    function registerStatusMenu(menuId) {
        return registerCommandWrapper(accessor, menuId, async () => {
            if (extensionStatusService.kind === 'Error') {
                // Try for a fresh token to clear up the error, but don't block the UI for too long.
                await Promise.race([
                    copilotTokenManagerService.primeToken(),
                    new Promise(resolve => setTimeout(resolve, 100)),
                ]);
            }
            instantiationService.createInstance(statusBarPicker_1.CopilotStatusBarPickMenu).showStatusMenu();
        });
    }
    disposables.add(registerStatusMenu(constants_1.CMDToggleStatusMenuClient));
    disposables.add(registerStatusMenu(constants_1.CMDToggleStatusMenuChat));
    return disposables;
}
function registerDiagnosticCommands(accessor) {
    const disposables = new lifecycle_1.DisposableStore();
    disposables.add(registerCommandWrapper(accessor, constants_1.CMDOpenDocumentationClient, () => {
        return vscode_1.env.openExternal(uri_1.URI.parse('https://docs.github.com/en/copilot/getting-started-with-github-copilot?tool=vscode'));
    }));
    disposables.add(registerCommandWrapper(accessor, constants_1.CMDOpenLogsClient, () => {
        outputChannelLogTarget_1.outputChannel.show();
    }));
    return disposables;
}
function registerCommandWrapper(accessor, command, fn) {
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    return vscode_1.commands.registerCommand(command, async (...args) => {
        try {
            await fn(...args);
        }
        catch (error) {
            instantiationService.invokeFunction(inlineCompletion_1.exception, error, command);
        }
    });
}
//# sourceMappingURL=completionsServiceBridges.js.map