"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleExperimentationService = exports.LogLevel = void 0;
exports.createNESProvider = createNESProvider;
const debugRecorder_1 = require("../../extension/inlineEdits/node/debugRecorder");
const nextEditProvider_1 = require("../../extension/inlineEdits/node/nextEditProvider");
const nextEditProviderTelemetry_1 = require("../../extension/inlineEdits/node/nextEditProviderTelemetry");
const chatMLFetcher_1 = require("../../extension/prompt/node/chatMLFetcher");
const xtabProvider_1 = require("../../extension/xtab/node/xtabProvider");
const authentication_1 = require("../../platform/authentication/common/authentication");
const copilotTokenManager_1 = require("../../platform/authentication/common/copilotTokenManager");
const copilotTokenStore_1 = require("../../platform/authentication/common/copilotTokenStore");
const staticGitHubAuthenticationService_1 = require("../../platform/authentication/common/staticGitHubAuthenticationService");
const copilotTokenManager_2 = require("../../platform/authentication/node/copilotTokenManager");
const chatMLFetcher_2 = require("../../platform/chat/common/chatMLFetcher");
const chatQuotaService_1 = require("../../platform/chat/common/chatQuotaService");
const chatQuotaServiceImpl_1 = require("../../platform/chat/common/chatQuotaServiceImpl");
const conversationOptions_1 = require("../../platform/chat/common/conversationOptions");
const interactionService_1 = require("../../platform/chat/common/interactionService");
const configurationService_1 = require("../../platform/configuration/common/configurationService");
const defaultsOnlyConfigurationService_1 = require("../../platform/configuration/common/defaultsOnlyConfigurationService");
const diffService_1 = require("../../platform/diff/common/diffService");
const diffServiceImpl_1 = require("../../platform/diff/node/diffServiceImpl");
const capiClient_1 = require("../../platform/endpoint/common/capiClient");
const domainService_1 = require("../../platform/endpoint/common/domainService");
const capiClientImpl_1 = require("../../platform/endpoint/node/capiClientImpl");
const domainServiceImpl_1 = require("../../platform/endpoint/node/domainServiceImpl");
const envService_1 = require("../../platform/env/common/envService");
const nullEnvService_1 = require("../../platform/env/common/nullEnvService");
const gitExtensionService_1 = require("../../platform/git/common/gitExtensionService");
const nullGitExtensionService_1 = require("../../platform/git/common/nullGitExtensionService");
const ignoreService_1 = require("../../platform/ignore/common/ignoreService");
const documentId_1 = require("../../platform/inlineEdits/common/dataTypes/documentId");
const inlineEditLogContext_1 = require("../../platform/inlineEdits/common/inlineEditLogContext");
const observableGit_1 = require("../../platform/inlineEdits/common/observableGit");
const nesHistoryContextProvider_1 = require("../../platform/inlineEdits/common/workspaceEditTracker/nesHistoryContextProvider");
const nesXtabHistoryTracker_1 = require("../../platform/inlineEdits/common/workspaceEditTracker/nesXtabHistoryTracker");
const languageContextProviderService_1 = require("../../platform/languageContextProvider/common/languageContextProviderService");
const nullLanguageContextProviderService_1 = require("../../platform/languageContextProvider/common/nullLanguageContextProviderService");
const languageDiagnosticsService_1 = require("../../platform/languages/common/languageDiagnosticsService");
const testLanguageDiagnosticsService_1 = require("../../platform/languages/common/testLanguageDiagnosticsService");
const logService_1 = require("../../platform/log/common/logService");
const fetcherService_1 = require("../../platform/networking/common/fetcherService");
const nullRequestLogger_1 = require("../../platform/requestLogger/node/nullRequestLogger");
const requestLogger_1 = require("../../platform/requestLogger/node/requestLogger");
const simulationTestContext_1 = require("../../platform/simulationTestContext/common/simulationTestContext");
const snippyService_1 = require("../../platform/snippy/common/snippyService");
const nullExperimentationService_1 = require("../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../platform/telemetry/common/telemetry");
const telemetryData_1 = require("../../platform/telemetry/common/telemetryData");
const tokenizer_1 = require("../../platform/tokenizer/node/tokenizer");
const workspaceService_1 = require("../../platform/workspace/common/workspaceService");
const services_1 = require("../../util/common/services");
const lifecycle_1 = require("../../util/vs/base/common/lifecycle");
const uuid_1 = require("../../util/vs/base/common/uuid");
const descriptors_1 = require("../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../util/vs/platform/instantiation/common/instantiation");
const event_1 = require("../../util/vs/base/common/event");
/**
 * Log levels (taken from vscode.d.ts)
 */
var LogLevel;
(function (LogLevel) {
    /**
     * No messages are logged with this level.
     */
    LogLevel[LogLevel["Off"] = 0] = "Off";
    /**
     * All messages are logged with this level.
     */
    LogLevel[LogLevel["Trace"] = 1] = "Trace";
    /**
     * Messages with debug and higher log level are logged with this level.
     */
    LogLevel[LogLevel["Debug"] = 2] = "Debug";
    /**
     * Messages with info and higher log level are logged with this level.
     */
    LogLevel[LogLevel["Info"] = 3] = "Info";
    /**
     * Messages with warning and higher log level are logged with this level.
     */
    LogLevel[LogLevel["Warning"] = 4] = "Warning";
    /**
     * Only error messages are logged with this level.
     */
    LogLevel[LogLevel["Error"] = 5] = "Error";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
function createNESProvider(options) {
    const instantiationService = setupServices(options);
    return instantiationService.createInstance(NESProvider, options);
}
let NESProvider = class NESProvider extends lifecycle_1.Disposable {
    constructor(_options, instantiationService, _expService, _configurationService, _workspaceService) {
        super();
        this._options = _options;
        this._expService = _expService;
        this._configurationService = _configurationService;
        this._workspaceService = _workspaceService;
        const statelessNextEditProvider = instantiationService.createInstance(xtabProvider_1.XtabProvider);
        const git = instantiationService.createInstance(observableGit_1.ObservableGit);
        const historyContextProvider = new nesHistoryContextProvider_1.NesHistoryContextProvider(this._options.workspace, git);
        const xtabDiffNEntries = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabDiffNEntries, this._expService);
        const xtabHistoryTracker = new nesXtabHistoryTracker_1.NesXtabHistoryTracker(this._options.workspace, xtabDiffNEntries);
        this._debugRecorder = this._register(new debugRecorder_1.DebugRecorder(this._options.workspace));
        this._nextEditProvider = instantiationService.createInstance(nextEditProvider_1.NextEditProvider, this._options.workspace, statelessNextEditProvider, historyContextProvider, xtabHistoryTracker, this._debugRecorder);
        this._telemetrySender = this._register(instantiationService.createInstance(nextEditProviderTelemetry_1.TelemetrySender));
    }
    getId() {
        return this._nextEditProvider.ID;
    }
    handleShown(result) {
        result.telemetryBuilder.setAsShown();
        this._nextEditProvider.handleShown(result.internalResult);
    }
    handleAcceptance(result) {
        result.telemetryBuilder.setAcceptance('accepted');
        result.telemetryBuilder.setStatus('accepted');
        this._nextEditProvider.handleAcceptance(result.docId, result.internalResult);
        this.handleEndOfLifetime(result);
    }
    handleRejection(result) {
        result.telemetryBuilder.setAcceptance('rejected');
        result.telemetryBuilder.setStatus('rejected');
        this._nextEditProvider.handleRejection(result.docId, result.internalResult);
        this.handleEndOfLifetime(result);
    }
    handleIgnored(result, supersededByRequestUuid) {
        if (supersededByRequestUuid) {
            result.telemetryBuilder.setSupersededBy(supersededByRequestUuid.requestUuid);
        }
        this._nextEditProvider.handleIgnored(result.docId, result.internalResult, supersededByRequestUuid?.internalResult);
        this.handleEndOfLifetime(result);
    }
    handleEndOfLifetime(result) {
        try {
            this._telemetrySender.sendTelemetryForBuilder(result.telemetryBuilder);
        }
        finally {
            result.telemetryBuilder.dispose();
        }
    }
    async getNextEdit(documentUri, cancellationToken) {
        const docId = documentId_1.DocumentId.create(documentUri.toString());
        // Create minimal required context objects
        const context = {
            triggerKind: 1, // Invoke
            selectedCompletionInfo: undefined,
            requestUuid: (0, uuid_1.generateUuid)(),
            requestIssuedDateTime: Date.now(),
            earliestShownDateTime: Date.now() + 200,
        };
        // Create log context
        const logContext = new inlineEditLogContext_1.InlineEditRequestLogContext(documentUri.toString(), 1, context);
        const document = this._options.workspace.getDocument(docId);
        if (!document) {
            throw new Error('DocumentNotFound');
        }
        // Create telemetry builder - we'll need to pass null/undefined for services we don't have
        const telemetryBuilder = new nextEditProviderTelemetry_1.NextEditProviderTelemetryBuilder(new nullGitExtensionService_1.NullGitExtensionService(), undefined, // INotebookService
        this._workspaceService, this._nextEditProvider.ID, document, this._debugRecorder, logContext.recordingBookmark);
        telemetryBuilder.setOpportunityId(context.requestUuid);
        try {
            const internalResult = await this._nextEditProvider.getNextEdit(docId, context, logContext, cancellationToken, telemetryBuilder.nesBuilder);
            const result = {
                result: internalResult.result ? {
                    newText: internalResult.result.edit.newText,
                    range: internalResult.result.edit.replaceRange,
                } : undefined,
                docId,
                requestUuid: context.requestUuid,
                internalResult,
                telemetryBuilder,
            };
            return result;
        }
        catch (e) {
            try {
                this._telemetrySender.sendTelemetryForBuilder(telemetryBuilder);
            }
            finally {
                telemetryBuilder.dispose();
            }
            throw e;
        }
    }
    updateTreatmentVariables(variables) {
        if (this._expService instanceof SimpleExperimentationService) {
            this._expService.updateTreatmentVariables(variables);
        }
    }
};
NESProvider = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, nullExperimentationService_1.IExperimentationService),
    __param(3, configurationService_1.IConfigurationService),
    __param(4, workspaceService_1.IWorkspaceService)
], NESProvider);
function setupServices(options) {
    const { fetcher, copilotTokenManager, telemetrySender, logTarget } = options;
    const builder = new services_1.InstantiationServiceBuilder();
    builder.define(configurationService_1.IConfigurationService, new descriptors_1.SyncDescriptor(defaultsOnlyConfigurationService_1.DefaultsOnlyConfigurationService));
    builder.define(nullExperimentationService_1.IExperimentationService, new descriptors_1.SyncDescriptor(SimpleExperimentationService, [options.waitForTreatmentVariables]));
    builder.define(simulationTestContext_1.ISimulationTestContext, new descriptors_1.SyncDescriptor(simulationTestContext_1.NulSimulationTestContext));
    builder.define(workspaceService_1.IWorkspaceService, new descriptors_1.SyncDescriptor(workspaceService_1.NullWorkspaceService));
    builder.define(diffService_1.IDiffService, new descriptors_1.SyncDescriptor(diffServiceImpl_1.DiffServiceImpl, [false]));
    builder.define(logService_1.ILogService, new descriptors_1.SyncDescriptor(logService_1.LogServiceImpl, [[logTarget || new logService_1.ConsoleLog(undefined, logService_1.LogLevel.Trace)]]));
    builder.define(gitExtensionService_1.IGitExtensionService, new descriptors_1.SyncDescriptor(nullGitExtensionService_1.NullGitExtensionService));
    builder.define(languageContextProviderService_1.ILanguageContextProviderService, new descriptors_1.SyncDescriptor(nullLanguageContextProviderService_1.NullLanguageContextProviderService));
    builder.define(languageDiagnosticsService_1.ILanguageDiagnosticsService, new descriptors_1.SyncDescriptor(testLanguageDiagnosticsService_1.TestLanguageDiagnosticsService));
    builder.define(ignoreService_1.IIgnoreService, new descriptors_1.SyncDescriptor(ignoreService_1.NullIgnoreService));
    builder.define(snippyService_1.ISnippyService, new descriptors_1.SyncDescriptor(snippyService_1.NullSnippyService));
    builder.define(domainService_1.IDomainService, new descriptors_1.SyncDescriptor(domainServiceImpl_1.DomainService));
    builder.define(capiClient_1.ICAPIClientService, new descriptors_1.SyncDescriptor(capiClientImpl_1.CAPIClientImpl));
    builder.define(copilotTokenStore_1.ICopilotTokenStore, new descriptors_1.SyncDescriptor(copilotTokenStore_1.CopilotTokenStore));
    builder.define(envService_1.IEnvService, new descriptors_1.SyncDescriptor(nullEnvService_1.NullEnvService));
    builder.define(fetcherService_1.IFetcherService, new descriptors_1.SyncDescriptor(SingleFetcherService, [fetcher]));
    builder.define(telemetry_1.ITelemetryService, new descriptors_1.SyncDescriptor(SimpleTelemetryService, [telemetrySender]));
    builder.define(authentication_1.IAuthenticationService, new descriptors_1.SyncDescriptor(staticGitHubAuthenticationService_1.StaticGitHubAuthenticationService, [(0, copilotTokenManager_2.createStaticGitHubTokenProvider)()]));
    builder.define(copilotTokenManager_1.ICopilotTokenManager, copilotTokenManager);
    builder.define(chatMLFetcher_2.IChatMLFetcher, new descriptors_1.SyncDescriptor(chatMLFetcher_1.ChatMLFetcherImpl));
    builder.define(chatQuotaService_1.IChatQuotaService, new descriptors_1.SyncDescriptor(chatQuotaServiceImpl_1.ChatQuotaService));
    builder.define(interactionService_1.IInteractionService, new descriptors_1.SyncDescriptor(interactionService_1.InteractionService));
    builder.define(requestLogger_1.IRequestLogger, new descriptors_1.SyncDescriptor(nullRequestLogger_1.NullRequestLogger));
    builder.define(tokenizer_1.ITokenizerProvider, new descriptors_1.SyncDescriptor(tokenizer_1.TokenizerProvider, [false]));
    builder.define(conversationOptions_1.IConversationOptions, {
        _serviceBrand: undefined,
        maxResponseTokens: undefined,
        temperature: 0.1,
        topP: 1,
        rejectionMessage: 'Sorry, but I can only assist with programming related questions.',
    });
    return builder.seal();
}
class SimpleExperimentationService extends lifecycle_1.Disposable {
    constructor(waitForTreatmentVariables) {
        super();
        this.variables = {};
        this._onDidTreatmentsChange = this._register(new event_1.Emitter());
        this.onDidTreatmentsChange = this._onDidTreatmentsChange.event;
        if (waitForTreatmentVariables) {
            let resolveWaitFor;
            this.waitFor = new Promise(resolve => {
                resolveWaitFor = resolve;
            });
            this.resolveWaitFor = resolveWaitFor;
        }
        else {
            this.waitFor = Promise.resolve();
            this.resolveWaitFor = () => { };
        }
    }
    async hasTreatments() {
        return this.waitFor;
    }
    getTreatmentVariable(name) {
        return this.variables[name];
    }
    async setCompletionsFilters(_filters) { }
    updateTreatmentVariables(variables) {
        const changedVariables = [];
        for (const [key, value] of Object.entries(variables)) {
            const existing = this.variables[key];
            if (existing !== value) {
                this.variables[key] = value;
                changedVariables.push(key);
            }
        }
        for (const key of Object.keys(this.variables)) {
            if (!Object.hasOwn(variables, key)) {
                delete this.variables[key];
                changedVariables.push(key);
            }
        }
        if (changedVariables.length > 0) {
            this._onDidTreatmentsChange.fire({ affectedTreatmentVariables: changedVariables });
        }
        this.resolveWaitFor();
    }
}
exports.SimpleExperimentationService = SimpleExperimentationService;
class SingleFetcherService {
    constructor(_fetcher) {
        this._fetcher = _fetcher;
    }
    getUserAgentLibrary() {
        return this._fetcher.getUserAgentLibrary();
    }
    fetch(url, options) {
        return this._fetcher.fetch(url, options);
    }
    disconnectAll() {
        return this._fetcher.disconnectAll();
    }
    makeAbortController() {
        return this._fetcher.makeAbortController();
    }
    isAbortError(e) {
        return this._fetcher.isAbortError(e);
    }
    isInternetDisconnectedError(e) {
        return this._fetcher.isInternetDisconnectedError(e);
    }
    isFetcherError(e) {
        return this._fetcher.isFetcherError(e);
    }
    getUserMessageForFetcherError(err) {
        return this._fetcher.getUserMessageForFetcherError(err);
    }
}
class SimpleTelemetryService {
    constructor(_telemetrySender) {
        this._telemetrySender = _telemetrySender;
    }
    dispose() {
        return;
    }
    sendInternalMSFTTelemetryEvent(eventName, properties, measurements) {
        return;
    }
    sendMSFTTelemetryEvent(eventName, properties, measurements) {
        return;
    }
    sendMSFTTelemetryErrorEvent(eventName, properties, measurements) {
        return;
    }
    sendGHTelemetryEvent(eventName, properties, measurements) {
        this._telemetrySender.sendTelemetryEvent(eventName, (0, telemetryData_1.eventPropertiesToSimpleObject)(properties), measurements);
    }
    sendGHTelemetryErrorEvent(eventName, properties, measurements) {
        return;
    }
    sendGHTelemetryException(maybeError, origin) {
        return;
    }
    sendTelemetryEvent(eventName, destination, properties, measurements) {
        return;
    }
    sendTelemetryErrorEvent(eventName, destination, properties, measurements) {
        return;
    }
    setSharedProperty(name, value) {
        return;
    }
    setAdditionalExpAssignments(expAssignments) {
        return;
    }
    postEvent(eventName, props) {
        return;
    }
    sendEnhancedGHTelemetryEvent(eventName, properties, measurements) {
        return;
    }
    sendEnhancedGHTelemetryErrorEvent(eventName, properties, measurements) {
        return;
    }
}
//# sourceMappingURL=chatLibMain.js.map