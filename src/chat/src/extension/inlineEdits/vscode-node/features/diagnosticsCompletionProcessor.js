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
exports.DiagnosticsCompletionProcessor = exports.DiagnosticsCollection = void 0;
const vscode = __importStar(require("vscode"));
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const editSurvivalTracker_1 = require("../../../../platform/editSurvivalTracking/common/editSurvivalTracker");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const edit_1 = require("../../../../platform/inlineEdits/common/dataTypes/edit");
const observable_1 = require("../../../../platform/inlineEdits/common/utils/observable");
const workspaceDocumentEditTracker_1 = require("../../../../platform/inlineEdits/common/workspaceEditTracker/workspaceDocumentEditTracker");
const logService_1 = require("../../../../platform/log/common/logService");
const tabsAndEditorsService_1 = require("../../../../platform/tabs/common/tabsAndEditorsService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const notebooks_1 = require("../../../../util/common/notebooks");
const tracing_1 = require("../../../../util/common/tracing");
const arrays_1 = require("../../../../util/vs/base/common/arrays");
const arraysFind_1 = require("../../../../util/vs/base/common/arraysFind");
const async_1 = require("../../../../util/vs/base/common/async");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const errors_1 = require("../../../../util/vs/base/common/errors");
const event_1 = require("../../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const observableInternal_1 = require("../../../../util/vs/base/common/observableInternal");
const resources_1 = require("../../../../util/vs/base/common/resources");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const informationDelta_1 = require("../../common/informationDelta");
const rejectionCollector_1 = require("../../common/rejectionCollector");
const translations_1 = require("../utils/translations");
const anyDiagnosticsCompletionProvider_1 = require("./diagnosticsBasedCompletions/anyDiagnosticsCompletionProvider");
const asyncDiagnosticsCompletionProvider_1 = require("./diagnosticsBasedCompletions/asyncDiagnosticsCompletionProvider");
const diagnosticsCompletions_1 = require("./diagnosticsBasedCompletions/diagnosticsCompletions");
const importDiagnosticsCompletionProvider_1 = require("./diagnosticsBasedCompletions/importDiagnosticsCompletionProvider");
function diagnosticCompletionRunResultEquals(a, b) {
    if (!!a.completionItem && !!b.completionItem) {
        return diagnosticsCompletions_1.DiagnosticCompletionItem.equals(a.completionItem, b.completionItem);
    }
    return a.completionItem === b.completionItem;
}
// Only exported for testing
class DiagnosticsCollection {
    constructor() {
        this._diagnostics = [];
    }
    applyEdit(previous, edit, after) {
        let hasInvalidated = false;
        for (const diagnostic of this._diagnostics) {
            const oldRange = diagnostic.range;
            const newRange = (0, editSurvivalTracker_1.applyEditsToRanges)([oldRange], edit)[0];
            // If the range shrank then the diagnostic will have changed
            if (!newRange || newRange.length < oldRange.length) {
                diagnostic.invalidate();
                hasInvalidated = true;
                continue;
            }
            const contentAtOldRange = oldRange.substring(previous.value);
            // If the range stays the same then the diagnostic is still valid if the content is the same
            if (newRange.length === oldRange.length) {
                const contentAtNewRange = newRange.substring(after.value);
                if (contentAtOldRange === contentAtNewRange) {
                    diagnostic.updateRange(newRange);
                }
                else {
                    diagnostic.invalidate();
                    hasInvalidated = true;
                }
                continue;
            }
            // If the range grew then we need to check what got added
            const isSamePrefix = contentAtOldRange === new offsetRange_1.OffsetRange(newRange.start, newRange.start + oldRange.length).substring(after.value);
            const isSameSuffix = contentAtOldRange === new offsetRange_1.OffsetRange(newRange.endExclusive - oldRange.length, newRange.endExclusive).substring(after.value);
            if (!isSamePrefix && !isSameSuffix) {
                // The content at the diagnostic range has changed
                diagnostic.invalidate();
                hasInvalidated = true;
                continue;
            }
            let edgeCharacter;
            if (isSamePrefix) {
                const offsetAfterOldRange = newRange.start + oldRange.length;
                edgeCharacter = new offsetRange_1.OffsetRange(offsetAfterOldRange, offsetAfterOldRange + 1).substring(after.value);
            }
            else {
                const offsetBeforeOldRange = newRange.endExclusive - oldRange.length - 1;
                edgeCharacter = new offsetRange_1.OffsetRange(offsetBeforeOldRange, offsetBeforeOldRange + 1).substring(after.value);
            }
            if (edgeCharacter.length !== 1 || /^[a-zA-Z0-9_]$/.test(edgeCharacter)) {
                // The content at the diagnostic range has changed
                diagnostic.invalidate();
                hasInvalidated = true;
                continue;
            }
            // We need to update the range of the diagnostic after applying the edits
            let updatedRange;
            if (isSamePrefix) {
                updatedRange = new offsetRange_1.OffsetRange(newRange.start, newRange.start + oldRange.length);
            }
            else {
                updatedRange = new offsetRange_1.OffsetRange(newRange.endExclusive - oldRange.length, newRange.endExclusive);
            }
            diagnostic.updateRange(updatedRange);
        }
        return hasInvalidated;
    }
    isEqualAndUpdate(relevantDiagnostics) {
        if ((0, arrays_1.equals)(this._diagnostics, relevantDiagnostics, diagnosticsCompletions_1.Diagnostic.equals)) {
            return true;
        }
        this._diagnostics = relevantDiagnostics;
        return false;
    }
    toString() {
        return this._diagnostics.map(d => d.toString()).join('\n');
    }
}
exports.DiagnosticsCollection = DiagnosticsCollection;
let DiagnosticsCompletionProcessor = class DiagnosticsCompletionProcessor extends lifecycle_1.Disposable {
    static get documentSelector() {
        return Array.from(new Set([
            ...importDiagnosticsCompletionProvider_1.ImportDiagnosticCompletionProvider.SupportedLanguages,
            ...asyncDiagnosticsCompletionProvider_1.AsyncDiagnosticCompletionProvider.SupportedLanguages
        ]));
    }
    constructor(_workspace, git, logService, configurationService, workspaceService, fileSystemService, _tabsAndEditorsService) {
        super();
        this._workspace = _workspace;
        this._tabsAndEditorsService = _tabsAndEditorsService;
        this._onDidChange = this._register(new event_1.Emitter());
        this.onDidChange = this._onDidChange.event;
        this._worker = new AsyncWorker(20, diagnosticCompletionRunResultEquals);
        this._currentDiagnostics = new DiagnosticsCollection();
        this._lastAcceptedDiagnostic = undefined;
        this._workspaceDocumentEditHistory = this._register(new workspaceDocumentEditTracker_1.WorkspaceDocumentEditHistory(this._workspace, git, 100));
        this._tracer = (0, tracing_1.createTracer)(['NES', 'DiagnosticsInlineCompletionProvider'], (s) => logService.trace(s));
        const diagnosticsExplorationEnabled = configurationService.getConfigObservable(configurationService_1.ConfigKey.Internal.InlineEditsDiagnosticsExplorationEnabled);
        const importProvider = new importDiagnosticsCompletionProvider_1.ImportDiagnosticCompletionProvider(this._tracer.sub('Import'), workspaceService, fileSystemService);
        const asyncProvider = new asyncDiagnosticsCompletionProvider_1.AsyncDiagnosticCompletionProvider(this._tracer.sub('Async'));
        this._diagnosticsCompletionProviders = (0, observableInternal_1.derived)(reader => {
            const providers = [
                importProvider,
                asyncProvider
            ];
            if (diagnosticsExplorationEnabled.read(reader)) {
                providers.push(new anyDiagnosticsCompletionProvider_1.AnyDiagnosticCompletionProvider(this._tracer.sub('All')));
            }
            return providers;
        }).recomputeInitiallyAndOnChange(this._store);
        this._rejectionCollector = this._register(new rejectionCollector_1.RejectionCollector(this._workspace, s => this._tracer.trace(s)));
        const isValidEditor = (editor) => {
            return !!editor && ((0, notebooks_1.isNotebookCell)(editor.document.uri) || isEditorFromEditorGrid(editor));
        };
        this._register((0, observableInternal_1.autorun)(reader => {
            const activeDocument = this._workspace.lastActiveDocument.read(reader);
            if (!activeDocument) {
                return;
            }
            const activeEditor = this._tabsAndEditorsService.activeTextEditor;
            if (!activeEditor || !isEditorFromEditorGrid(activeEditor) || !(0, resources_1.isEqual)(activeDocument.id.toUri(), activeEditor.document.uri)) {
                return;
            }
            // update state because document changed
            this._updateState();
            // update state because diagnostics changed
            reader.store.add((0, observableInternal_1.runOnChange)(activeDocument.diagnostics, () => {
                this._updateState();
            }));
        }));
        this._register(vscode.window.onDidChangeTextEditorSelection(async (e) => {
            const activeEditor = this._tabsAndEditorsService.activeTextEditor;
            if (!isValidEditor(activeEditor)) {
                return;
            }
            if (!(0, resources_1.isEqual)(e.textEditor.document.uri, activeEditor.document.uri)) {
                return;
            }
            this._updateState();
        }));
        this._register(this._worker.onDidChange(result => {
            this._onDidChange.fire(!!result.completionItem);
        }));
        this._register((0, observableInternal_1.autorun)(reader => {
            const document = this._workspace.lastActiveDocument.read(reader);
            if (!document) {
                return;
            }
            reader.store.add((0, observable_1.autorunWithChanges)(this, {
                value: document.value,
            }, (data) => {
                for (const edit of data.value.changes) {
                    if (!data.value.previous) {
                        continue;
                    }
                    const hasInvalidatedRange = this._currentDiagnostics.applyEdit(data.value.previous, edit, data.value.value);
                    if (hasInvalidatedRange) {
                        this._updateState();
                    }
                }
            }));
        }));
    }
    async _updateState() {
        const activeTextEditor = this._tabsAndEditorsService.activeTextEditor;
        if (!activeTextEditor) {
            return;
        }
        const workspaceDocument = this._workspace.getDocumentByTextDocument(activeTextEditor.document);
        if (!workspaceDocument) {
            return;
        }
        const range = new vscode.Range(activeTextEditor.selection.active, activeTextEditor.selection.active);
        const selection = workspaceDocument.toRange(activeTextEditor.document, range);
        if (!selection) {
            return;
        }
        const cursor = (0, translations_1.toInternalPosition)(selection.start);
        const log = new diagnosticsCompletions_1.DiagnosticInlineEditRequestLogContext();
        const { availableDiagnostics, relevantDiagnostics } = this._getDiagnostics(workspaceDocument, cursor, log);
        const diagnosticsSorted = (0, diagnosticsCompletions_1.sortDiagnosticsByDistance)(workspaceDocument, relevantDiagnostics, cursor);
        if (this._currentDiagnostics.isEqualAndUpdate(diagnosticsSorted)) {
            return;
        }
        this._tracer.trace('Scheduled update for diagnostics inline completion');
        await this._worker.schedule(async (token) => this._runCompletionHandler(workspaceDocument, diagnosticsSorted, availableDiagnostics, cursor, log, token));
    }
    _getDiagnostics(workspaceDocument, cursor, logContext) {
        const availableDiagnostics = workspaceDocument.diagnostics.get().map(d => new diagnosticsCompletions_1.Diagnostic(d));
        if (availableDiagnostics.length === 0) {
            return { availableDiagnostics: [], relevantDiagnostics: [] };
        }
        const filterDiagnosticsAndLog = (diagnostics, message, filterFn) => {
            const diagnosticsAfter = filterFn(diagnostics);
            const diagnosticsDiff = diagnostics.filter(diagnostic => !diagnosticsAfter.includes(diagnostic));
            if (diagnosticsDiff.length > 0) {
                (0, diagnosticsCompletions_1.logList)(message, diagnosticsDiff, logContext, this._tracer);
            }
            return diagnosticsAfter;
        };
        const language = workspaceDocument.languageId.get();
        const providers = this._diagnosticsCompletionProviders.get();
        let relevantDiagnostics = [...availableDiagnostics];
        relevantDiagnostics = filterDiagnosticsAndLog(relevantDiagnostics, 'Filtered by provider', ds => ds.filter(diagnostic => providers.some(provider => provider.providesCompletionsForDiagnostic(workspaceDocument, diagnostic, language, cursor))));
        relevantDiagnostics = filterDiagnosticsAndLog(relevantDiagnostics, 'Filtered by recent acceptance', ds => ds.filter(diagnostic => !this._hasDiagnosticRecentlyBeenAccepted(diagnostic)));
        relevantDiagnostics = filterDiagnosticsAndLog(relevantDiagnostics, 'Filtered by no recent edit', ds => this._filterDiagnosticsByRecentEditNearby(ds, workspaceDocument));
        return { availableDiagnostics, relevantDiagnostics };
    }
    async _runCompletionHandler(workspaceDocument, diagnosticsSorted, allDiagnostics, cursor, log, token) {
        const telemetryBuilder = new DiagnosticsCompletionHandlerTelemetry();
        let completionItem = null;
        try {
            this._tracer.trace('Running diagnostics inline completion handler');
            completionItem = await this._getCompletionFromDiagnostics(workspaceDocument, diagnosticsSorted, cursor, log, token, telemetryBuilder);
        }
        catch (error) {
            log.setError(error);
        }
        // Distance to the closest diagnostic which is not supported by any provider
        const allNoneSupportedDiagnostics = allDiagnostics.filter(diagnostic => !diagnosticsSorted.includes(diagnostic));
        telemetryBuilder.setDistanceToUnknownDiagnostic((0, diagnosticsCompletions_1.distanceToClosestDiagnostic)(workspaceDocument, allNoneSupportedDiagnostics, cursor));
        // Distance to the closest none result diagnostic
        const allAlternativeDiagnostics = allDiagnostics.filter(diagnostic => !completionItem || !completionItem.diagnostic.equals(diagnostic));
        telemetryBuilder.setDistanceToAlternativeDiagnostic((0, diagnosticsCompletions_1.distanceToClosestDiagnostic)(workspaceDocument, allAlternativeDiagnostics, cursor));
        if (completionItem) {
            const hasDiagnosticForSameRange = allAlternativeDiagnostics.some(diagnostic => completionItem.diagnostic.range.equals(diagnostic.range));
            telemetryBuilder.setHasAlternativeDiagnosticForSameRange(hasDiagnosticForSameRange);
        }
        // Todo: this should be handled on a lower level
        if (completionItem instanceof importDiagnosticsCompletionProvider_1.ImportDiagnosticCompletionItem) {
            telemetryBuilder.setImportTelemetry(completionItem);
        }
        return { completionItem, logContext: log, telemetryBuilder: telemetryBuilder };
    }
    getCurrentState(docId) {
        const currentState = this._worker.getCurrentResult();
        const workspaceDocument = this._workspace.getDocument(docId);
        if (!workspaceDocument) {
            return { item: undefined, telemetry: new DiagnosticsCompletionHandlerTelemetry().addDroppedReason('WorkspaceDocumentNotFound').build(), logContext: undefined };
        }
        if (currentState === "has-not-run-yet" /* NoResultReason.HasNotRunYet */) {
            return { item: undefined, telemetry: new DiagnosticsCompletionHandlerTelemetry().build(), logContext: undefined };
        }
        if (currentState === "work-in-progress" /* NoResultReason.WorkInProgress */) {
            return { item: undefined, telemetry: new DiagnosticsCompletionHandlerTelemetry().addDroppedReason("work-in-progress" /* NoResultReason.WorkInProgress */).build(), logContext: undefined };
        }
        const { telemetryBuilder, completionItem, logContext } = currentState;
        if (!completionItem) {
            return { item: undefined, telemetry: telemetryBuilder.build(), logContext };
        }
        if (!this._isCompletionItemValid(completionItem, workspaceDocument, currentState.logContext, telemetryBuilder)) {
            return { item: undefined, telemetry: telemetryBuilder.build(), logContext };
        }
        if (completionItem.documentId !== docId) {
            logContext.addLog("Dropped: wrong-document");
            return { item: undefined, telemetry: telemetryBuilder.addDroppedReason('wrong-document').build(), logContext };
        }
        (0, diagnosticsCompletions_1.log)("following known diagnostics:\n" + this._currentDiagnostics.toString(), undefined, this._tracer);
        return { item: completionItem, telemetry: telemetryBuilder.build(), logContext };
    }
    async getNextUpdatedState(docId, token) {
        const disposables = new lifecycle_1.DisposableStore();
        await new Promise((resolve) => {
            disposables.add(token.onCancellationRequested(() => resolve()));
            disposables.add(this._worker.onDidChange(() => resolve()));
        });
        disposables.dispose();
        return this.getCurrentState(docId);
    }
    async _getCompletionFromDiagnostics(workspaceDocument, diagnosticsSorted, pos, logContext, token, tb) {
        if (diagnosticsSorted.length === 0) {
            (0, diagnosticsCompletions_1.log)(`No diagnostics available for document ${workspaceDocument.id.toString()}`, logContext, this._tracer);
            return null;
        }
        const diagnosticsCompletionItems = await this._fetchDiagnosticsBasedCompletions(workspaceDocument, diagnosticsSorted, pos, logContext, token);
        return diagnosticsCompletionItems.find(item => this._isCompletionItemValid(item, workspaceDocument, logContext, tb)) ?? null;
    }
    async _fetchDiagnosticsBasedCompletions(workspaceDocument, sortedDiagnostics, pos, logContext, token) {
        const providers = this._diagnosticsCompletionProviders.get();
        const providerResults = await Promise.all(providers.map(provider => provider.provideDiagnosticCompletionItem(workspaceDocument, sortedDiagnostics, pos, logContext, token)));
        return providerResults.filter(item => !!item);
    }
    // Handle Acceptance and rejection of diagnostics completion items
    handleEndOfLifetime(completionItem, reason) {
        const provider = this._diagnosticsCompletionProviders.get().find(p => p.providerName === completionItem.providerName);
        if (!provider) {
            throw new errors_1.BugIndicatingError('No provider found for completion item');
        }
        if (reason.kind === vscode.InlineCompletionEndOfLifeReasonKind.Rejected) {
            this._rejectDiagnosticCompletion(provider, completionItem);
        }
        else if (reason.kind === vscode.InlineCompletionEndOfLifeReasonKind.Accepted) {
            this._acceptDiagnosticCompletion(provider, completionItem);
        }
    }
    _acceptDiagnosticCompletion(provider, item) {
        this._lastAcceptedDiagnostic = { diagnostic: item.diagnostic, time: Date.now() };
    }
    _rejectDiagnosticCompletion(provider, item) {
        this._rejectionCollector.reject(item.documentId, item.toOffsetEdit());
        provider.completionItemRejected?.(item);
    }
    // Filters
    _isCompletionItemValid(item, workspaceDocument, logContext, tb) {
        if (!item.diagnostic.isValid()) {
            (0, diagnosticsCompletions_1.log)('Diagnostic completion item is no longer valid', logContext, this._tracer);
            tb.addDroppedReason('no-longer-valid', item);
            logContext.markToBeLogged();
            return false;
        }
        if (this._isDiagnosticCompletionRejected(item)) {
            (0, diagnosticsCompletions_1.log)('Diagnostic completion item has been rejected before', logContext, this._tracer);
            tb.addDroppedReason('recently-rejected', item);
            logContext.markToBeLogged();
            return false;
        }
        if (this._isUndoRecentEdit(item)) {
            (0, diagnosticsCompletions_1.log)('Diagnostic completion item is an undo operation', logContext, this._tracer);
            tb.addDroppedReason('undo-operation', item);
            logContext.markToBeLogged();
            return false;
        }
        if (this._hasDiagnosticRecentlyBeenAccepted(item.diagnostic)) {
            (0, diagnosticsCompletions_1.log)('Completion item fixing the diagnostic has been accepted recently', logContext, this._tracer);
            tb.addDroppedReason('recently-accepted', item);
            logContext.markToBeLogged();
            return false;
        }
        if (this._hasRecentlyBeenAddedWithoutNES(item)) {
            (0, diagnosticsCompletions_1.log)('Diagnostic has been fixed without NES recently', logContext, this._tracer);
            tb.addDroppedReason('recently-added-without-nes', item);
            logContext.markToBeLogged();
            return false;
        }
        const provider = this._diagnosticsCompletionProviders.get().find(p => p.providerName === item.providerName);
        if (provider && provider.isCompletionItemStillValid && !provider.isCompletionItemStillValid(item, workspaceDocument)) {
            (0, diagnosticsCompletions_1.log)(`${provider.providerName}: Completion item is no longer valid`, logContext, this._tracer);
            tb.addDroppedReason(`${provider.providerName}-no-longer-valid`, item);
            logContext.markToBeLogged();
            return false;
        }
        return true;
    }
    _isDiagnosticCompletionRejected(diagnostic) {
        return this._rejectionCollector.isRejected(diagnostic.documentId, diagnostic.toOffsetEdit());
    }
    _hasRecentlyBeenAddedWithoutNES(item) {
        const recentEdits = this._workspaceDocumentEditHistory.getNRecentEdits(item.documentId, 5)?.edits;
        if (!recentEdits) {
            return false;
        }
        const offsetEdit = item.toOffsetEdit();
        return recentEdits.replacements.some(edit => edit.replaceRange.intersectsOrTouches(offsetEdit.replaceRange));
    }
    _hasDiagnosticRecentlyBeenAccepted(diagnostic) {
        if (!this._lastAcceptedDiagnostic || this._lastAcceptedDiagnostic.time + 1000 < Date.now()) {
            return false;
        }
        return this._lastAcceptedDiagnostic.diagnostic.equals(diagnostic);
    }
    _isUndoRecentEdit(diagnostic) {
        const documentHistory = this._workspaceDocumentEditHistory.getRecentEdits(diagnostic.documentId);
        if (!documentHistory) {
            return false;
        }
        return diagnosticWouldUndoUserEdit(diagnostic, documentHistory.before, documentHistory.after, edit_1.Edits.single(documentHistory.edits));
    }
    _filterDiagnosticsByRecentEditNearby(diagnostics, document) {
        const recentEdits = this._workspaceDocumentEditHistory.getRecentEdits(document.id)?.edits;
        if (!recentEdits) {
            return [];
        }
        return diagnostics.filter(diagnostic => {
            const newRanges = recentEdits.getNewRanges();
            const potentialIntersection = (0, arraysFind_1.findFirstMonotonous)(newRanges, (r) => r.endExclusive >= diagnostic.range.start);
            return potentialIntersection?.intersectsOrTouches(diagnostic.range);
        });
    }
};
exports.DiagnosticsCompletionProcessor = DiagnosticsCompletionProcessor;
exports.DiagnosticsCompletionProcessor = DiagnosticsCompletionProcessor = __decorate([
    __param(2, logService_1.ILogService),
    __param(3, configurationService_1.IConfigurationService),
    __param(4, workspaceService_1.IWorkspaceService),
    __param(5, fileSystemService_1.IFileSystemService),
    __param(6, tabsAndEditorsService_1.ITabsAndEditorsService)
], DiagnosticsCompletionProcessor);
function diagnosticWouldUndoUserEdit(diagnostic, documentBefore, documentAfter, edits) {
    const currentEdit = diagnostic.toOffsetEdit().toEdit();
    const ourInformationDelta = (0, informationDelta_1.getInformationDelta)(documentAfter.value, currentEdit);
    let recentInformationDelta = new informationDelta_1.InformationDelta();
    let doc = documentBefore.value;
    for (const edit of edits.edits) {
        recentInformationDelta = recentInformationDelta.combine((0, informationDelta_1.getInformationDelta)(doc, edit));
        doc = edit.apply(doc);
    }
    if (recentInformationDelta.isUndoneBy(ourInformationDelta)) {
        return true;
    }
    return false;
}
function isEditorFromEditorGrid(editor) {
    return editor.viewColumn !== undefined;
}
class AsyncWorker extends lifecycle_1.Disposable {
    get _currentResult() {
        return this.__currentResult;
    }
    set _currentResult(value) {
        if (!this._taskQueue.isTriggered() && (this.__currentResult === undefined || !this._equals(value, this.__currentResult))) {
            this._onDidChange.fire(value);
        }
        this.__currentResult = value;
    }
    constructor(delay, _equals) {
        super();
        this._equals = _equals;
        this._onDidChange = this._register(new vscode.EventEmitter());
        this.onDidChange = this._onDidChange.event;
        this._currentTokenSource = undefined;
        this._activeWorkPromise = undefined;
        this.__currentResult = undefined;
        this._taskQueue = new async_1.ThrottledDelayer(delay);
    }
    async schedule(fn) {
        const activePromise = this._doSchedule(fn);
        this._activeWorkPromise = activePromise;
        await activePromise;
        if (this._activeWorkPromise === activePromise) {
            this._activeWorkPromise = undefined;
        }
    }
    async _doSchedule(fn) {
        this._currentTokenSource?.dispose(true);
        this._currentTokenSource = new cancellation_1.CancellationTokenSource();
        const token = this._currentTokenSource.token;
        await this._taskQueue.trigger(async () => {
            if (token.isCancellationRequested) {
                return;
            }
            const result = await fn(token);
            if (token.isCancellationRequested) {
                return;
            }
            this._currentResult = result;
        });
    }
    // Get the active result if there is one currently
    // Return undefined if there is currently work being done
    getCurrentResult() {
        if (this._currentResult === undefined) {
            return "has-not-run-yet" /* NoResultReason.HasNotRunYet */;
        }
        if (this._activeWorkPromise !== undefined) {
            return "work-in-progress" /* NoResultReason.WorkInProgress */;
        }
        return this._currentResult;
    }
    dispose() {
        if (this._currentTokenSource) {
            this._currentTokenSource.dispose();
        }
        super.dispose();
    }
}
class DiagnosticsCompletionHandlerTelemetry {
    constructor() {
        this._droppedReasons = [];
    }
    addDroppedReason(reason, item) {
        if (item instanceof anyDiagnosticsCompletionProvider_1.AnyDiagnosticCompletionItem) {
            return this; // Do not track dropped reasons for "any" items
        }
        this._droppedReasons.push(item ? `${item.type}:${reason}` : reason);
        return this;
    }
    setDistanceToAlternativeDiagnostic(distance) {
        this._distanceToAlternativeDiagnostic = distance;
        return this;
    }
    setDistanceToUnknownDiagnostic(distance) {
        this._distanceToUnknownDiagnostic = distance;
        return this;
    }
    setHasAlternativeDiagnosticForSameRange(has) {
        this._hasAlternativeDiagnosticForSameRange = has;
        return this;
    }
    setImportTelemetry(item) {
        this._alternativeImportsCount = item.alternativeImportsCount;
        this._hasExistingSameFileImport = item.hasExistingSameFileImport;
        this._isLocalImport = item.isLocalImport;
        return this;
    }
    build() {
        return {
            droppedReasons: this._droppedReasons,
            alternativeImportsCount: this._alternativeImportsCount,
            hasExistingSameFileImport: this._hasExistingSameFileImport,
            isLocalImport: this._isLocalImport,
            distanceToUnknownDiagnostic: this._distanceToUnknownDiagnostic,
            distanceToAlternativeDiagnostic: this._distanceToAlternativeDiagnostic,
            hasAlternativeDiagnosticForSameRange: this._hasAlternativeDiagnosticForSameRange
        };
    }
}
//# sourceMappingURL=diagnosticsCompletionProcessor.js.map