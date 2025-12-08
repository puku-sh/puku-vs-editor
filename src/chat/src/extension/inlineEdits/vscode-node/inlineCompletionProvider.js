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
exports.InlineCompletionProviderImpl = void 0;
exports.raceAndAll = raceAndAll;
const vscode_1 = require("vscode");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const diffService_1 = require("../../../platform/diff/common/diffService");
const edit_1 = require("../../../platform/editing/common/edit");
const editComputer_1 = require("../../../platform/editSurvivalTracking/common/editComputer");
const editSurvivalReporter_1 = require("../../../platform/editSurvivalTracking/common/editSurvivalReporter");
const gitExtensionService_1 = require("../../../platform/git/common/gitExtensionService");
const inlineEditLogContext_1 = require("../../../platform/inlineEdits/common/inlineEditLogContext");
const logService_1 = require("../../../platform/log/common/logService");
const helpers_1 = require("../../../platform/notebook/common/helpers");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const notebooks_1 = require("../../../util/common/notebooks");
const tracing_1 = require("../../../util/common/tracing");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const event_1 = require("../../../util/vs/base/common/event");
const stringEdit_1 = require("../../../util/vs/editor/common/core/edits/stringEdit");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const naturalLanguageHint_1 = require("../../inlineChat/vscode-node/naturalLanguageHint");
const nextEditProviderTelemetry_1 = require("../node/nextEditProviderTelemetry");
const inlineEditProviderFeature_1 = require("./inlineEditProviderFeature");
const isInlineSuggestion_1 = require("./isInlineSuggestion");
const translations_1 = require("./utils/translations");
const learnMoreAction = {
    title: vscode_1.l10n.t('Learn More'),
    command: inlineEditProviderFeature_1.learnMoreCommandId,
    tooltip: inlineEditProviderFeature_1.learnMoreLink
};
class NesCompletionList extends vscode_1.InlineCompletionList {
    constructor(requestUuid, item, commands, telemetryBuilder) {
        super(item === undefined ? [] : [item]);
        this.requestUuid = requestUuid;
        this.commands = commands;
        this.telemetryBuilder = telemetryBuilder;
        this.enableForwardStability = true;
    }
}
class BaseNesCompletionInfo {
    constructor(suggestion, documentId, document, requestUuid) {
        this.suggestion = suggestion;
        this.documentId = documentId;
        this.document = document;
        this.requestUuid = requestUuid;
    }
}
class LlmCompletionInfo extends BaseNesCompletionInfo {
    constructor() {
        super(...arguments);
        this.source = 'provider';
    }
}
class DiagnosticsCompletionInfo extends BaseNesCompletionInfo {
    constructor() {
        super(...arguments);
        this.source = 'diagnostics';
    }
}
function isLlmCompletionInfo(item) {
    return item.source === 'provider';
}
const GoToNextEdit = vscode_1.l10n.t('Go To Inline Suggestion');
let InlineCompletionProviderImpl = class InlineCompletionProviderImpl {
    constructor(model, logger, logContextRecorder, inlineEditDebugComponent, telemetrySender, _instantiationService, _telemetryService, _diffService, _configurationService, _logService, _expService, _gitExtensionService, _notebookService, _workspaceService) {
        this.model = model;
        this.logger = logger;
        this.logContextRecorder = logContextRecorder;
        this.inlineEditDebugComponent = inlineEditDebugComponent;
        this.telemetrySender = telemetrySender;
        this._instantiationService = _instantiationService;
        this._telemetryService = _telemetryService;
        this._diffService = _diffService;
        this._configurationService = _configurationService;
        this._logService = _logService;
        this._expService = _expService;
        this._gitExtensionService = _gitExtensionService;
        this._notebookService = _notebookService;
        this._workspaceService = _workspaceService;
        this.displayName = 'Inline Suggestion';
        this.onDidChange = event_1.Event.fromObservableLight(this.model.onChange);
        this._tracer = (0, tracing_1.createTracer)(['NES', 'Provider'], (s) => this._logService.trace(s));
        this._displayNextEditorNES = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.UseAlternativeNESNotebookFormat, this._expService);
    }
    // copied from `vscodeWorkspace.ts` `DocumentFilter#_enabledLanguages`
    _isCompletionsEnabled(document) {
        const enabledLanguages = this._configurationService.getConfig(configurationService_1.ConfigKey.Enable);
        const enabledLanguagesMap = new Map(Object.entries(enabledLanguages));
        if (!enabledLanguagesMap.has('*')) {
            enabledLanguagesMap.set('*', false);
        }
        return enabledLanguagesMap.has(document.languageId) ? enabledLanguagesMap.get(document.languageId) : enabledLanguagesMap.get('*');
    }
    async provideInlineCompletionItems(document, position, context, token) {
        const tracer = this._tracer.sub(['provideInlineCompletionItems', shortOpportunityId(context.requestUuid)]);
        const isCompletionsEnabled = this._isCompletionsEnabled(document);
        const unification = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsUnification, this._expService);
        const isInlineEditsEnabled = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.InlineEditsEnabled, this._expService, { languageId: document.languageId });
        const serveAsCompletionsProvider = unification && isCompletionsEnabled && !isInlineEditsEnabled;
        if (!isInlineEditsEnabled && !serveAsCompletionsProvider) {
            tracer.returns('inline edits disabled');
            return undefined;
        }
        const doc = this.model.workspace.getDocumentByTextDocument(document);
        if (!doc) {
            tracer.returns('document not found in workspace');
            return undefined;
        }
        const documentVersion = ((0, notebooks_1.isNotebookCell)(document.uri) ? (0, notebooks_1.findNotebook)(document.uri, vscode_1.workspace.notebookDocuments)?.version : undefined) || document.version;
        const logContext = new inlineEditLogContext_1.InlineEditRequestLogContext(doc.id.uri, documentVersion, context);
        logContext.recordingBookmark = this.model.debugRecorder.createBookmark();
        const telemetryBuilder = new nextEditProviderTelemetry_1.NextEditProviderTelemetryBuilder(this._gitExtensionService, this._notebookService, this._workspaceService, this.model.nextEditProvider.ID, doc, this.model.debugRecorder, logContext.recordingBookmark);
        telemetryBuilder.setOpportunityId(context.requestUuid);
        telemetryBuilder.setConfigIsDiagnosticsNESEnabled(!!this.model.diagnosticsBasedProvider);
        telemetryBuilder.setIsNaturalLanguageDominated(naturalLanguageHint_1.LineCheck.isNaturalLanguageDominated(document, position));
        const requestCancellationTokenSource = new cancellation_1.CancellationTokenSource(token);
        const completionsCts = new cancellation_1.CancellationTokenSource(token);
        let suggestionInfo;
        try {
            tracer.trace('invoking next edit provider');
            const { first, all } = raceAndAll([
                this.model.nextEditProvider.getNextEdit(doc.id, context, logContext, token, telemetryBuilder.nesBuilder),
                this.model.diagnosticsBasedProvider?.runUntilNextEdit(doc.id, context, logContext, 50, requestCancellationTokenSource.token, telemetryBuilder.diagnosticsBuilder) ?? (0, async_1.raceCancellation)(new Promise(() => { }), requestCancellationTokenSource.token),
                this.model.completionsProvider?.getCompletions(doc.id, context, logContext, token) ?? (0, async_1.raceCancellation)(new Promise(() => { }), completionsCts.token),
            ]);
            let [providerSuggestion, diagnosticsSuggestion, completionAtCursor] = await first;
            // ensure completions promise resolves
            completionsCts.cancel();
            const hasCompletionAtCursor = completionAtCursor && completionAtCursor.result !== undefined;
            const hasNonEmptyLlmNes = providerSuggestion && providerSuggestion.result !== undefined;
            const shouldGiveMoreTimeToDiagnostics = !hasCompletionAtCursor && !hasNonEmptyLlmNes && this.model.diagnosticsBasedProvider;
            if (shouldGiveMoreTimeToDiagnostics) {
                tracer.trace('giving some more time to diagnostics provider');
                (0, async_1.timeout)(1000).then(() => requestCancellationTokenSource.cancel());
                [, diagnosticsSuggestion] = await all;
            }
            // Cancel ongoing requests
            requestCancellationTokenSource.cancel();
            const emptyList = new NesCompletionList(context.requestUuid, undefined, [], telemetryBuilder);
            if (token.isCancellationRequested) {
                tracer.returns('lost race to cancellation');
                this.telemetrySender.scheduleSendingEnhancedTelemetry({ requestId: logContext.requestId, result: undefined }, telemetryBuilder);
                return emptyList;
            }
            // Determine which suggestion to use
            if (completionAtCursor?.result) {
                suggestionInfo = new LlmCompletionInfo(completionAtCursor, doc.id, document, context.requestUuid);
            }
            else if (diagnosticsSuggestion?.result) {
                suggestionInfo = new DiagnosticsCompletionInfo(diagnosticsSuggestion, doc.id, document, context.requestUuid);
            }
            else if (providerSuggestion) {
                suggestionInfo = new LlmCompletionInfo(providerSuggestion, doc.id, document, context.requestUuid);
            }
            else {
                this.telemetrySender.scheduleSendingEnhancedTelemetry({ requestId: logContext.requestId, result: undefined }, telemetryBuilder);
                return emptyList;
            }
            // Return and send telemetry if there is no result
            const result = suggestionInfo.suggestion.result;
            if (!result) {
                tracer.trace('no next edit suggestion');
                this.telemetrySender.scheduleSendingEnhancedTelemetry(suggestionInfo.suggestion, telemetryBuilder);
                return emptyList;
            }
            tracer.trace(`using next edit suggestion from ${suggestionInfo.source}`);
            let isInlineCompletion = false;
            let completionItem;
            const documents = doc.fromOffsetRange(result.edit.replaceRange);
            const [targetDocument, range] = documents.length ? documents[0] : [undefined, undefined];
            addNotebookTelemetry(document, position, result.edit.newText, documents, telemetryBuilder);
            telemetryBuilder.setIsActiveDocument(vscode_1.window.activeTextEditor?.document === targetDocument);
            if (!targetDocument) {
                tracer.trace('no next edit suggestion');
            }
            else if (hasNotebookCellMarker(document, result.edit.newText)) {
                tracer.trace('no next edit suggestion, edits contain Notebook Cell Markers');
            }
            else if (targetDocument === document) {
                // nes is for this same document.
                const allowInlineCompletions = this.model.inlineEditsInlineCompletionsEnabled.get();
                isInlineCompletion = allowInlineCompletions && (0, isInlineSuggestion_1.isInlineSuggestion)(position, document, range, result.edit.newText);
                completionItem = serveAsCompletionsProvider && !isInlineCompletion ?
                    undefined :
                    this.createCompletionItem(doc, document, position, range, result);
            }
            else if (this._displayNextEditorNES) {
                // nes is for a different document.
                completionItem = serveAsCompletionsProvider ?
                    undefined :
                    this.createNextEditorEditCompletionItem(position, {
                        document: targetDocument,
                        insertText: result.edit.newText,
                        range
                    });
            }
            if (!completionItem) {
                this.telemetrySender.scheduleSendingEnhancedTelemetry(suggestionInfo.suggestion, telemetryBuilder);
                return emptyList;
            }
            const menuCommands = [];
            if (this.inlineEditDebugComponent) {
                menuCommands.push(...this.inlineEditDebugComponent.getCommands(logContext));
            }
            // telemetry
            telemetryBuilder.setPickedNESType(suggestionInfo.source === 'diagnostics' ? 'diagnostics' : 'llm');
            logContext.setPickedNESType(suggestionInfo.source === 'diagnostics' ? 'diagnostics' : 'llm');
            telemetryBuilder.setPostProcessingOutcome({ edit: result.edit, displayLocation: result.displayLocation, isInlineCompletion });
            telemetryBuilder.setHadLlmNES(suggestionInfo.source === 'provider');
            telemetryBuilder.setHadDiagnosticsNES(suggestionInfo.source === 'diagnostics');
            all.then(([llmResult, diagnosticsResult]) => {
                telemetryBuilder.setHadLlmNES(!!llmResult?.result);
                telemetryBuilder.setHadDiagnosticsNES(!!diagnosticsResult?.result);
            });
            this.telemetrySender.scheduleSendingEnhancedTelemetry(suggestionInfo.suggestion, telemetryBuilder);
            const nesCompletionItem = {
                ...completionItem,
                info: suggestionInfo,
                telemetryBuilder,
                action: learnMoreAction,
                isInlineEdit: !isInlineCompletion,
                showInlineEditMenu: !serveAsCompletionsProvider,
                wasShown: false
            };
            return new NesCompletionList(context.requestUuid, nesCompletionItem, menuCommands, telemetryBuilder);
        }
        catch (e) {
            tracer.trace('error', e);
            logContext.setError(e);
            try {
                this.telemetrySender.sendTelemetry(suggestionInfo?.suggestion, telemetryBuilder);
            }
            finally {
                telemetryBuilder.dispose();
            }
            throw e;
        }
        finally {
            requestCancellationTokenSource.dispose();
            completionsCts.dispose();
            this.logger.add(logContext);
        }
    }
    createNextEditorEditCompletionItem(requestingPosition, nextEdit) {
        // Display the next edit in the current document, but with a command to open the next edit in the other document.
        // & range of this completion item will be the same as the current documents cursor position.
        const range = new vscode_1.Range(requestingPosition, requestingPosition);
        const displayLocation = {
            range,
            label: GoToNextEdit,
            kind: vscode_1.InlineCompletionDisplayLocationKind.Label
        };
        const commandArgs = {
            preserveFocus: false,
            selection: new vscode_1.Range(nextEdit.range.start, nextEdit.range.start)
        };
        const command = {
            command: 'vscode.open',
            title: GoToNextEdit,
            arguments: [nextEdit.document.uri, commandArgs]
        };
        return {
            range,
            insertText: nextEdit.insertText,
            showRange: range,
            command,
            displayLocation,
            isEditInAnotherDocument: true
        };
    }
    createCompletionItem(doc, document, position, range, result) {
        // Only show edit when the cursor is max 4 lines away from the edit
        const showRange = result.showRangePreference === "aroundEdit" /* ShowNextEditPreference.AroundEdit */
            ? new vscode_1.Range(Math.max(range.start.line - 4, 0), 0, range.end.line + 4, Number.MAX_SAFE_INTEGER) : undefined;
        const displayLocationRange = result.displayLocation && doc.fromRange(document, (0, translations_1.toExternalRange)(result.displayLocation.range));
        const displayLocation = result.displayLocation && displayLocationRange ? {
            range: displayLocationRange,
            label: result.displayLocation.label,
            kind: vscode_1.InlineCompletionDisplayLocationKind.Code,
        } : undefined;
        return {
            range,
            insertText: result.edit.newText,
            showRange,
            displayLocation,
            command: result.action,
        };
    }
    handleDidShowCompletionItem(completionItem, updatedInsertText) {
        completionItem.wasShown = true;
        completionItem.telemetryBuilder.setAsShown();
        const info = completionItem.info;
        this.logContextRecorder?.handleShown(info.suggestion);
        if (isLlmCompletionInfo(info)) {
            this.model.nextEditProvider.handleShown(info.suggestion);
        }
        else {
            this.model.diagnosticsBasedProvider?.handleShown(info.suggestion);
        }
    }
    handleListEndOfLifetime(list, reason) {
        const tracer = this._tracer.sub(['handleListEndOfLifetime', shortOpportunityId(list.requestUuid)]);
        tracer.trace(`List ${list.requestUuid} disposed, reason: ${vscode_1.InlineCompletionsDisposeReasonKind[reason.kind]}`);
        const telemetryBuilder = list.telemetryBuilder;
        const disposeReasonStr = vscode_1.InlineCompletionsDisposeReasonKind[reason.kind];
        telemetryBuilder.setDisposalReason(disposeReasonStr);
        this.telemetrySender.sendTelemetryForBuilder(telemetryBuilder);
    }
    handleEndOfLifetime(item, reason) {
        const tracer = this._tracer.sub(['handleEndOfLifetime', shortOpportunityId(item.info.requestUuid)]);
        tracer.trace(`reason: ${vscode_1.InlineCompletionEndOfLifeReasonKind[reason.kind]}`);
        switch (reason.kind) {
            case vscode_1.InlineCompletionEndOfLifeReasonKind.Accepted: {
                this._handleAcceptance(item);
                break;
            }
            case vscode_1.InlineCompletionEndOfLifeReasonKind.Rejected: {
                this._handleDidRejectCompletionItem(item);
                break;
            }
            case vscode_1.InlineCompletionEndOfLifeReasonKind.Ignored: {
                const supersededBy = reason.supersededBy ? reason.supersededBy : undefined;
                tracer.trace(`Superseded by: ${supersededBy?.info.requestUuid || 'none'}, was shown: ${item.wasShown}`);
                if (supersededBy) {
                    /* __GDPR__
                        "supersededInlineEdit" : {
                            "owner": "ulugbekna",
                            "comment": "Tracks when an inline edit was superseded by another edit.",
                            "opportunityId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The opportunity ID of the original inline edit." },
                            "supersededByOpportunityId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The opportunity ID of the inline edit that superseded the original edit." }
                        }
                    */
                    this._telemetryService.sendMSFTTelemetryEvent('supersededInlineEdit', { opportunityId: item.info.requestUuid, supersededByOpportunityId: supersededBy.info.requestUuid });
                }
                this._handleDidIgnoreCompletionItem(item, supersededBy);
                break;
            }
        }
    }
    _handleAcceptance(item) {
        this.logContextRecorder?.handleAcceptance(item.info.suggestion);
        item.telemetryBuilder.setAcceptance('accepted');
        item.telemetryBuilder.setStatus('accepted');
        const info = item.info;
        if (isLlmCompletionInfo(info)) {
            this.model.nextEditProvider.handleAcceptance(info.documentId, info.suggestion);
            if (!item.isEditInAnotherDocument) {
                this._trackSurvivalRate(info);
            }
        }
        else {
            this.model.diagnosticsBasedProvider?.handleAcceptance(info.documentId, info.suggestion);
        }
    }
    // TODO: Support tracking Diagnostics NES
    async _trackSurvivalRate(item) {
        const result = item.suggestion.result;
        if (!result) {
            return;
        }
        const docBeforeEdits = result.documentBeforeEdits.value;
        const docAfterEdits = result.edit.toEdit().apply(docBeforeEdits);
        const recorder = this._instantiationService.createInstance(editComputer_1.DocumentEditRecorder, item.document);
        // Assumption: The user cannot edit the document while the inline edit is being applied
        let userEdits = stringEdit_1.StringEdit.empty;
        // softAssert(docAfterEdits === userEdits.apply(item.document.getText())); // TODO@hediet
        const diffedNextEdit = await (0, edit_1.stringEditFromDiff)(docBeforeEdits, docAfterEdits, this._diffService);
        const recordedEdits = recorder.getEdits();
        userEdits = userEdits.compose(recordedEdits);
        this._instantiationService.createInstance(editSurvivalReporter_1.EditSurvivalReporter, item.document, result.documentBeforeEdits.value, diffedNextEdit, userEdits, { includeArc: true }, res => {
            /* __GDPR__
                "reportInlineEditSurvivalRate" : {
                    "owner": "hediet",
                    "comment": "Reports the survival rate for an inline edit.",
                    "opportunityId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Unique identifier for an opportunity to show an NES." },

                    "survivalRateFourGram": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The rate between 0 and 1 of how much of the AI edit is still present in the document." },
                    "survivalRateNoRevert": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The rate between 0 and 1 of how much of the ranges the AI touched ended up being reverted." },
                    "didBranchChange": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Indicates if the branch changed in the meantime. If the branch changed (value is 1), this event should probably be ignored." },
                    "timeDelayMs": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The time delay between the user accepting the edit and measuring the survival rate." },
                    "arc": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The accepted and restrained character count." }
                }
            */
            this._telemetryService.sendTelemetryEvent('reportInlineEditSurvivalRate', { microsoft: true, github: { eventNamePrefix: 'copilot-nes/' } }, {
                opportunityId: item.requestUuid,
            }, {
                survivalRateFourGram: res.fourGram,
                survivalRateNoRevert: res.noRevert,
                didBranchChange: res.didBranchChange ? 1 : 0,
                timeDelayMs: res.timeDelayMs,
                arc: res.arc,
            });
        });
    }
    _handleDidRejectCompletionItem(completionItem) {
        this.logContextRecorder?.handleRejection(completionItem.info.suggestion);
        completionItem.telemetryBuilder.setAcceptance('rejected');
        completionItem.telemetryBuilder.setStatus('rejected');
        const info = completionItem.info;
        if (isLlmCompletionInfo(info)) {
            this.model.nextEditProvider.handleRejection(info.documentId, info.suggestion);
        }
        else {
            this.model.diagnosticsBasedProvider?.handleRejection(info.documentId, info.suggestion);
        }
    }
    _handleDidIgnoreCompletionItem(item, supersededBy) {
        if (supersededBy) {
            item.telemetryBuilder.setSupersededBy(supersededBy.info.requestUuid);
        }
        const info = item.info;
        const supersededBySuggestion = supersededBy ? supersededBy.info.suggestion : undefined;
        if (isLlmCompletionInfo(info)) {
            this.model.nextEditProvider.handleIgnored(info.documentId, info.suggestion, supersededBySuggestion);
        }
        else {
            this.model.diagnosticsBasedProvider?.handleIgnored(info.documentId, info.suggestion, supersededBySuggestion);
        }
    }
};
exports.InlineCompletionProviderImpl = InlineCompletionProviderImpl;
exports.InlineCompletionProviderImpl = InlineCompletionProviderImpl = __decorate([
    __param(5, instantiation_1.IInstantiationService),
    __param(6, telemetry_1.ITelemetryService),
    __param(7, diffService_1.IDiffService),
    __param(8, configurationService_1.IConfigurationService),
    __param(9, logService_1.ILogService),
    __param(10, nullExperimentationService_1.IExperimentationService),
    __param(11, gitExtensionService_1.IGitExtensionService),
    __param(12, notebookService_1.INotebookService),
    __param(13, workspaceService_1.IWorkspaceService)
], InlineCompletionProviderImpl);
/**
 * Runs multiple promises concurrently and provides two results:
 * 1. `first`: Resolves as soon as the first promise resolves, with a tuple where only the first resolved value is set, others are undefined..
 * 2. `all`: Resolves when all promises resolve, with a tuple of all results.
 * @param promises Tuple of promises to race
 */
function raceAndAll(promises) {
    let settled = false;
    const first = new Promise((resolve, reject) => {
        promises.forEach((promise, index) => {
            promise.then(result => {
                if (settled) {
                    return;
                }
                settled = true;
                const output = Array(promises.length).fill(undefined);
                output[index] = result;
                resolve(output);
            }, error => {
                settled = true;
                console.error(error);
                const output = Array(promises.length).fill(undefined);
                resolve(output);
            });
        });
    });
    const all = Promise.all(promises);
    return { first, all };
}
function shortOpportunityId(oppId) {
    return oppId.substring(4, 8);
}
function hasNotebookCellMarker(document, newText) {
    return (0, notebooks_1.isNotebookCell)(document.uri) && newText.includes('%% vscode.cell [id=');
}
function addNotebookTelemetry(document, position, newText, documents, telemetryBuilder) {
    const notebook = (0, notebooks_1.isNotebookCell)(document.uri) ? (0, notebooks_1.findNotebook)(document.uri, vscode_1.workspace.notebookDocuments) : undefined;
    const cell = notebook ? (0, notebooks_1.findCell)(document.uri, notebook) : undefined;
    if (!cell || !notebook || !documents.length) {
        return;
    }
    const cellMarkerCount = newText.match(/%% vscode.cell \[id=/g)?.length || 0;
    const cellMarkerIndex = newText.indexOf('#%% vscode.cell [id=');
    const isMultiline = newText.includes('\n');
    const targetEol = documents[0][0].eol === vscode_1.EndOfLine.CRLF ? '\r\n' : '\n';
    const sourceEol = newText.includes('\r\n') ? '\r\n' : (newText.includes('\n') ? '\n' : targetEol);
    const nextEditor = vscode_1.window.visibleTextEditors.find(editor => editor.document === documents[0][0]);
    const isNextEditorRangeVisible = nextEditor && nextEditor.visibleRanges.some(range => range.contains(documents[0][1]));
    const notebookId = (0, helpers_1.getNotebookId)(notebook);
    const lineSuffix = `(${position.line}:${position.character})`;
    const suggestionLineSuffix = `(->${documents[0][1].start.line}:${documents[0][1].start.character})`;
    const getCellPrefix = (c) => {
        if (c === cell) {
            return `*`;
        }
        if (c.document === documents[0][0]) {
            return `+`;
        }
        return '';
    };
    const lineCounts = notebook.getCells()
        .filter(c => c.kind === vscode_1.NotebookCellKind.Code)
        .map(c => `${getCellPrefix(c)}${c.document.lineCount}${c === cell ? lineSuffix : ''}${c.document === documents[0][0] ? suggestionLineSuffix : ''}`).join(',');
    telemetryBuilder.
        setNotebookCellMarkerIndex(cellMarkerIndex)
        .setNotebookCellMarkerCount(cellMarkerCount)
        .setIsMultilineEdit(isMultiline)
        .setIsEolDifferent(targetEol !== sourceEol)
        .setIsNextEditorVisible(!!nextEditor)
        .setIsNextEditorRangeVisible(!!isNextEditorRangeVisible)
        .setNotebookCellLines(lineCounts)
        .setNotebookId(notebookId)
        .setIsNESForOtherEditor(documents[0][0] !== document);
}
//# sourceMappingURL=inlineCompletionProvider.js.map