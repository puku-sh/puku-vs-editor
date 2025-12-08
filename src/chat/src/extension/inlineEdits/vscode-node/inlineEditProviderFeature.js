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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.learnMoreLink = exports.learnMoreCommandId = exports.InlineEditProviderFeature = void 0;
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const envService_1 = require("../../../platform/env/common/envService");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const inlineEditLogContext_1 = require("../../../platform/inlineEdits/common/inlineEditLogContext");
const observableGit_1 = require("../../../platform/inlineEdits/common/observableGit");
const nesHistoryContextProvider_1 = require("../../../platform/inlineEdits/common/workspaceEditTracker/nesHistoryContextProvider");
const logService_1 = require("../../../platform/log/common/logService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const notebooks_1 = require("../../../util/common/notebooks");
const tracing_1 = require("../../../util/common/tracing");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const observable_1 = require("../../../util/vs/base/common/observable");
const path_1 = require("../../../util/vs/base/common/path");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const completionsProvider_1 = require("../../completions/vscode-node/completionsProvider");
const completionsUnificationContribution_1 = require("../../completions/vscode-node/completionsUnificationContribution");
const jumpToCursorPosition_1 = require("../common/jumpToCursorPosition");
const nextEditProviderTelemetry_1 = require("../node/nextEditProviderTelemetry");
const inlineEditDebugComponent_1 = require("./components/inlineEditDebugComponent");
const logContextRecorder_1 = require("./components/logContextRecorder");
const diagnosticsInlineEditProvider_1 = require("./features/diagnosticsInlineEditProvider");
const inlineCompletionProvider_1 = require("./inlineCompletionProvider");
const inlineEditModel_1 = require("./inlineEditModel");
const inlineEditLogger_1 = require("./parts/inlineEditLogger");
const lastEditTimeTracker_1 = require("./parts/lastEditTimeTracker");
const vscodeWorkspace_1 = require("./parts/vscodeWorkspace");
const observablesUtils_1 = require("./utils/observablesUtils");
const TRIGGER_INLINE_EDIT_ON_ACTIVE_EDITOR_CHANGE = false; // otherwise, eg, NES would trigger just when going through search results
const useEnhancedNotebookNESContextKey = 'puku.chat.enableEnhancedNotebookNES';
let InlineEditProviderFeature = class InlineEditProviderFeature extends lifecycle_1.Disposable {
    constructor(_vscodeExtensionContext, _configurationService, _authenticationService, _expService, _envService, _logService, _instantiationService, _experimentationService) {
        super();
        this._vscodeExtensionContext = _vscodeExtensionContext;
        this._configurationService = _configurationService;
        this._authenticationService = _authenticationService;
        this._expService = _expService;
        this._envService = _envService;
        this._logService = _logService;
        this._instantiationService = _instantiationService;
        this._inlineEditsProviderId = (0, observablesUtils_1.makeSettable)(this._configurationService.getExperimentBasedConfigObservable(configurationService_1.ConfigKey.Internal.InlineEditsProviderId, this._expService));
        this._hideInternalInterface = this._configurationService.getConfigObservable(configurationService_1.ConfigKey.Internal.InlineEditsHideInternalInterface);
        this._enableDiagnosticsProvider = this._configurationService.getExperimentBasedConfigObservable(configurationService_1.ConfigKey.InlineEditsEnableDiagnosticsProvider, this._expService);
        this._enableCompletionsProvider = this._configurationService.getExperimentBasedConfigObservable(configurationService_1.ConfigKey.Internal.InlineEditsEnableCompletionsProvider, this._expService);
        this._yieldToCopilot = this._configurationService.getExperimentBasedConfigObservable(configurationService_1.ConfigKey.Internal.InlineEditsYieldToCopilot, this._expService);
        this._excludedProviders = this._configurationService.getExperimentBasedConfigObservable(configurationService_1.ConfigKey.Internal.InlineEditsExcludedProviders, this._expService).map(v => v ? v.split(',').map(v => v.trim()).filter(v => v !== '') : []);
        this._copilotToken = (0, observable_1.observableFromEvent)(this, this._authenticationService.onDidAuthenticationChange, () => this._authenticationService.copilotToken);
        this.inlineEditsEnabled = (0, observable_1.derived)(this, (reader) => {
            const copilotToken = this._copilotToken.read(reader);
            if (copilotToken === undefined) {
                return false;
            }
            if (copilotToken.isCompletionsQuotaExceeded) {
                return false;
            }
            return true;
        });
        this._internalActionsEnabled = (0, observable_1.derived)(this, (reader) => {
            return !!this._copilotToken.read(reader)?.isInternal && !this._hideInternalInterface.read(reader);
        });
        this.isInlineEditsLogFileEnabledObservable = this._configurationService.getConfigObservable(configurationService_1.ConfigKey.Internal.InlineEditsLogContextRecorderEnabled);
        this._workspace = (0, observable_1.derivedDisposable)(this, _reader => {
            return this._instantiationService.createInstance(vscodeWorkspace_1.VSCodeWorkspace);
        });
        const tracer = (0, tracing_1.createTracer)(['NES', 'Feature'], (s) => this._logService.trace(s));
        const constructorTracer = tracer.sub('constructor');
        const hasUpdatedNesSettingKey = 'copilot.chat.nextEdits.hasEnabledNesInSettings';
        const enableEnhancedNotebookNES = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.UseAlternativeNESNotebookFormat, _experimentationService) || this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.UseAlternativeNESNotebookFormat, _experimentationService);
        const unificationState = (0, completionsUnificationContribution_1.unificationStateObservable)(this);
        vscode_1.commands.executeCommand('setContext', useEnhancedNotebookNESContextKey, enableEnhancedNotebookNES);
        this._register((0, observable_1.autorun)((reader) => {
            const copilotToken = this._copilotToken.read(reader);
            if (copilotToken === undefined) {
                return;
            }
            if (this._expService.getTreatmentVariable('copilotchat.enableNesInSettings') &&
                this._vscodeExtensionContext.globalState.get(hasUpdatedNesSettingKey) !== true &&
                !copilotToken.isFreeUser) {
                this._vscodeExtensionContext.globalState.update(hasUpdatedNesSettingKey, true);
                if (!this._configurationService.isConfigured(configurationService_1.ConfigKey.InlineEditsEnabled)) {
                    this._configurationService.setConfig(configurationService_1.ConfigKey.InlineEditsEnabled, true);
                }
            }
        }));
        this._register((0, observable_1.autorun)(reader => {
            if (!this.inlineEditsEnabled.read(reader)) {
                return;
            }
            const logger = reader.store.add(this._instantiationService.createInstance(inlineEditLogger_1.InlineEditLogger));
            const statelessProviderId = this._inlineEditsProviderId.read(reader);
            const workspace = this._workspace.read(reader);
            const git = reader.store.add(this._instantiationService.createInstance(observableGit_1.ObservableGit));
            const historyContextProvider = new nesHistoryContextProvider_1.NesHistoryContextProvider(workspace, git);
            let diagnosticsProvider = undefined;
            if (this._enableDiagnosticsProvider.read(reader)) {
                diagnosticsProvider = reader.store.add(this._instantiationService.createInstance(diagnosticsInlineEditProvider_1.DiagnosticsNextEditProvider, workspace, git));
            }
            const completionsProvider = (this._enableCompletionsProvider.read(reader)
                ? reader.store.add(this._instantiationService.createInstance(completionsProvider_1.CompletionsProvider, workspace))
                : undefined);
            const model = reader.store.add(this._instantiationService.createInstance(inlineEditModel_1.InlineEditModel, statelessProviderId, workspace, historyContextProvider, diagnosticsProvider, completionsProvider));
            const recordingDirPath = (0, path_1.join)(this._vscodeExtensionContext.globalStorageUri.fsPath, 'logContextRecordings');
            const isInlineEditLogFileEnabled = this.isInlineEditsLogFileEnabledObservable.read(reader);
            let logContextRecorder;
            if (isInlineEditLogFileEnabled) {
                logContextRecorder = reader.store.add(this._instantiationService.createInstance(logContextRecorder_1.LogContextRecorder, recordingDirPath, logger));
            }
            else {
                void logContextRecorder_1.LogContextRecorder.cleanupOldRecordings(recordingDirPath);
            }
            const inlineEditDebugComponent = reader.store.add(new inlineEditDebugComponent_1.InlineEditDebugComponent(this._internalActionsEnabled, this.inlineEditsEnabled, model.debugRecorder, this._inlineEditsProviderId));
            const telemetrySender = this._register(this._instantiationService.createInstance(nextEditProviderTelemetry_1.TelemetrySender));
            const provider = this._instantiationService.createInstance(inlineCompletionProvider_1.InlineCompletionProviderImpl, model, logger, logContextRecorder, inlineEditDebugComponent, telemetrySender);
            const unificationStateValue = unificationState.read(reader);
            let excludes = this._excludedProviders.read(reader);
            if (unificationStateValue?.modelUnification) {
                excludes = excludes.slice(0);
                if (!excludes.includes('completions')) {
                    excludes.push('completions');
                }
                if (!excludes.includes('puku')) {
                    excludes.push('puku');
                }
            }
            reader.store.add(vscode_1.languages.registerInlineCompletionItemProvider('*', provider, {
                displayName: provider.displayName,
                yieldTo: this._yieldToCopilot.read(reader) ? ['puku'] : undefined,
                debounceDelayMs: 0, // set 0 debounce to ensure consistent delays/timings
                groupId: 'nes',
                excludes,
            }));
            if (TRIGGER_INLINE_EDIT_ON_ACTIVE_EDITOR_CHANGE) {
                const lastEditTimeTracker = new lastEditTimeTracker_1.LastEditTimeTracker(model.workspace);
                reader.store.add(vscode_1.window.onDidChangeActiveTextEditor((activeEditor) => {
                    if (activeEditor !== undefined && lastEditTimeTracker.hadEditsRecently) {
                        model.onChange.trigger(undefined);
                    }
                }));
                reader.store.add(lastEditTimeTracker);
            }
            reader.store.add(vscode_1.commands.registerCommand(exports.learnMoreCommandId, () => {
                this._envService.openExternal(uri_1.URI.parse(exports.learnMoreLink));
            }));
            reader.store.add(vscode_1.commands.registerCommand(jumpToCursorPosition_1.jumpToPositionCommandId, (position) => {
                const currentEditor = vscode_1.window.activeTextEditor;
                if (!currentEditor) {
                    return;
                }
                // vscode API uses 0-based line and column numbers
                const range = new vscode.Range(position.lineNumber - 1, position.column - 1, position.lineNumber - 1, position.column - 1);
                currentEditor.selection = new vscode.Selection(range.start, range.end);
                currentEditor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
                model.onChange.trigger(undefined);
            }));
            reader.store.add(vscode_1.commands.registerCommand(clearCacheCommandId, () => {
                model.nextEditProvider.clearCache();
            }));
            reader.store.add(vscode_1.commands.registerCommand(reportNotebookNESIssueCommandId, () => {
                const activeNotebook = vscode_1.window.activeNotebookEditor;
                const document = vscode_1.window.activeTextEditor?.document;
                if (!activeNotebook || !document || !(0, notebooks_1.isNotebookCell)(document.uri)) {
                    return;
                }
                const doc = model.workspace.getDocumentByTextDocument(document);
                const selection = activeNotebook.selection;
                if (!selection || !doc) {
                    return;
                }
                const logContext = new inlineEditLogContext_1.InlineEditRequestLogContext(doc.id.uri, document.version, undefined);
                logContext.recordingBookmark = model.debugRecorder.createBookmark();
                void vscode_1.commands.executeCommand(inlineEditDebugComponent_1.reportFeedbackCommandId, { logContext });
            }));
        }));
        constructorTracer.returns();
    }
};
exports.InlineEditProviderFeature = InlineEditProviderFeature;
exports.InlineEditProviderFeature = InlineEditProviderFeature = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext),
    __param(1, configurationService_1.IConfigurationService),
    __param(2, authentication_1.IAuthenticationService),
    __param(3, nullExperimentationService_1.IExperimentationService),
    __param(4, envService_1.IEnvService),
    __param(5, logService_1.ILogService),
    __param(6, instantiation_1.IInstantiationService),
    __param(7, nullExperimentationService_1.IExperimentationService)
], InlineEditProviderFeature);
exports.learnMoreCommandId = 'puku.debug.inlineEdit.learnMore';
exports.learnMoreLink = 'https://aka.ms/vscode-nes';
const clearCacheCommandId = 'puku.debug.inlineEdit.clearCache';
const reportNotebookNESIssueCommandId = 'puku.debug.inlineEdit.reportNotebookNESIssue';
//# sourceMappingURL=inlineEditProviderFeature.js.map