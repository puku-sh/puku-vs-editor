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
var InlineCompletionsSource_1;
import { booleanComparator, compareBy, compareUndefinedSmallest, numberComparator } from '../../../../../base/common/arrays.js';
import { findLastMax } from '../../../../../base/common/arraysFind.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { equalsIfDefined, itemEquals } from '../../../../../base/common/equals.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { derived, observableValue, recordChangesLazy, transaction } from '../../../../../base/common/observable.js';
// eslint-disable-next-line local/code-no-deep-import-of-internal
import { observableReducerSettable } from '../../../../../base/common/observableInternal/experimental/reducer.js';
import { isDefined, isObject } from '../../../../../base/common/types.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { DataChannelForwardingTelemetryService, forwardToChannelIf, isCopilotLikeExtension } from '../../../../../platform/dataChannel/browser/forwardingTelemetryService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import product from '../../../../../platform/product/common/product.js';
import { StringEdit } from '../../../../common/core/edits/stringEdit.js';
import { InlineCompletionEndOfLifeReasonKind, InlineCompletionTriggerKind } from '../../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { offsetEditFromContentChanges } from '../../../../common/model/textModelStringEdit.js';
import { formatRecordableLogEntry, StructuredLogger } from '../structuredLogger.js';
import { sendInlineCompletionsEndOfLifeTelemetry } from '../telemetry.js';
import { wait } from '../utils.js';
import { InlineSuggestionItem } from './inlineSuggestionItem.js';
import { provideInlineCompletions, runWhenCancelled } from './provideInlineCompletions.js';
let InlineCompletionsSource = class InlineCompletionsSource extends Disposable {
    static { InlineCompletionsSource_1 = this; }
    static { this._requestId = 0; }
    constructor(_textModel, _versionId, _debounceValue, _cursorPosition, _languageConfigurationService, _logService, _configurationService, _instantiationService, _contextKeyService) {
        super();
        this._textModel = _textModel;
        this._versionId = _versionId;
        this._debounceValue = _debounceValue;
        this._cursorPosition = _cursorPosition;
        this._languageConfigurationService = _languageConfigurationService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._contextKeyService = _contextKeyService;
        this._updateOperation = this._register(new MutableDisposable());
        this._state = observableReducerSettable(this, {
            initial: () => ({
                inlineCompletions: InlineCompletionsState.createEmpty(),
                suggestWidgetInlineCompletions: InlineCompletionsState.createEmpty(),
            }),
            disposeFinal: (values) => {
                values.inlineCompletions.dispose();
                values.suggestWidgetInlineCompletions.dispose();
            },
            changeTracker: recordChangesLazy(() => ({ versionId: this._versionId })),
            update: (reader, previousValue, changes) => {
                const edit = StringEdit.compose(changes.changes.map(c => c.change ? offsetEditFromContentChanges(c.change.changes) : StringEdit.empty).filter(isDefined));
                if (edit.isEmpty()) {
                    return previousValue;
                }
                try {
                    return {
                        inlineCompletions: previousValue.inlineCompletions.createStateWithAppliedEdit(edit, this._textModel),
                        suggestWidgetInlineCompletions: previousValue.suggestWidgetInlineCompletions.createStateWithAppliedEdit(edit, this._textModel),
                    };
                }
                finally {
                    previousValue.inlineCompletions.dispose();
                    previousValue.suggestWidgetInlineCompletions.dispose();
                }
            }
        });
        this.inlineCompletions = this._state.map(this, v => v.inlineCompletions);
        this.suggestWidgetInlineCompletions = this._state.map(this, v => v.suggestWidgetInlineCompletions);
        this._completionsEnabled = undefined;
        this.clearOperationOnTextModelChange = derived(this, reader => {
            this._versionId.read(reader);
            this._updateOperation.clear();
            return undefined; // always constant
        });
        this._loadingCount = observableValue(this, 0);
        this.loading = this._loadingCount.map(this, v => v > 0);
        this._loggingEnabled = observableConfigValue('editor.inlineSuggest.logFetch', false, this._configurationService).recomputeInitiallyAndOnChange(this._store);
        this._sendRequestData = observableConfigValue('editor.inlineSuggest.emptyResponseInformation', true, this._configurationService).recomputeInitiallyAndOnChange(this._store);
        this._structuredFetchLogger = this._register(this._instantiationService.createInstance(StructuredLogger.cast(), 'editor.inlineSuggest.logFetch.commandId'));
        this.clearOperationOnTextModelChange.recomputeInitiallyAndOnChange(this._store);
        const enablementSetting = product.defaultChatAgent?.completionsEnablementSetting ?? undefined;
        if (enablementSetting) {
            this._updateCompletionsEnablement(enablementSetting);
            this._register(this._configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(enablementSetting)) {
                    this._updateCompletionsEnablement(enablementSetting);
                }
            }));
        }
        this._state.recomputeInitiallyAndOnChange(this._store);
    }
    _updateCompletionsEnablement(enalementSetting) {
        const result = this._configurationService.getValue(enalementSetting);
        if (!isObject(result)) {
            this._completionsEnabled = undefined;
        }
        else {
            this._completionsEnabled = result;
        }
    }
    _log(entry) {
        if (this._loggingEnabled.get()) {
            this._logService.info(formatRecordableLogEntry(entry));
        }
        this._structuredFetchLogger.log(entry);
    }
    fetch(providers, providersLabel, context, activeInlineCompletion, withDebounce, userJumpedToActiveCompletion, requestInfo) {
        const position = this._cursorPosition.get();
        const request = new UpdateRequest(position, context, this._textModel.getVersionId(), new Set(providers));
        const target = context.selectedSuggestionInfo ? this.suggestWidgetInlineCompletions.get() : this.inlineCompletions.get();
        if (this._updateOperation.value?.request.satisfies(request)) {
            return this._updateOperation.value.promise;
        }
        else if (target?.request?.satisfies(request)) {
            return Promise.resolve(true);
        }
        const updateOngoing = !!this._updateOperation.value;
        this._updateOperation.clear();
        const source = new CancellationTokenSource();
        const promise = (async () => {
            const store = new DisposableStore();
            this._loadingCount.set(this._loadingCount.get() + 1, undefined);
            let didDecrease = false;
            const decreaseLoadingCount = () => {
                if (!didDecrease) {
                    didDecrease = true;
                    this._loadingCount.set(this._loadingCount.get() - 1, undefined);
                }
            };
            const loadingReset = store.add(new RunOnceScheduler(() => decreaseLoadingCount(), 10 * 1000));
            loadingReset.schedule();
            const inlineSuggestionsProviders = providers.filter(p => p.providerId);
            const requestResponseInfo = new RequestResponseData(context, requestInfo, inlineSuggestionsProviders);
            try {
                const recommendedDebounceValue = this._debounceValue.get(this._textModel);
                const debounceValue = findLastMax(providers.map(p => p.debounceDelayMs), compareUndefinedSmallest(numberComparator)) ?? recommendedDebounceValue;
                // Debounce in any case if update is ongoing
                const shouldDebounce = updateOngoing || (withDebounce && context.triggerKind === InlineCompletionTriggerKind.Automatic);
                if (shouldDebounce) {
                    // This debounces the operation
                    await wait(debounceValue, source.token);
                }
                if (source.token.isCancellationRequested || this._store.isDisposed || this._textModel.getVersionId() !== request.versionId) {
                    requestResponseInfo.setNoSuggestionReasonIfNotSet('canceled:beforeFetch');
                    return false;
                }
                const requestId = InlineCompletionsSource_1._requestId++;
                if (this._loggingEnabled.get() || this._structuredFetchLogger.isEnabled.get()) {
                    this._log({
                        sourceId: 'InlineCompletions.fetch',
                        kind: 'start',
                        requestId,
                        modelUri: this._textModel.uri,
                        modelVersion: this._textModel.getVersionId(),
                        context: { triggerKind: context.triggerKind, suggestInfo: context.selectedSuggestionInfo ? true : undefined },
                        time: Date.now(),
                        provider: providersLabel,
                    });
                }
                const startTime = new Date();
                const providerResult = provideInlineCompletions(providers, this._cursorPosition.get(), this._textModel, context, requestInfo, this._languageConfigurationService);
                runWhenCancelled(source.token, () => providerResult.cancelAndDispose({ kind: 'tokenCancellation' }));
                let shouldStopEarly = false;
                let producedSuggestion = false;
                const suggestions = [];
                for await (const list of providerResult.lists) {
                    if (!list) {
                        continue;
                    }
                    list.addRef();
                    store.add(toDisposable(() => list.removeRef(list.inlineSuggestionsData.length === 0 ? { kind: 'empty' } : { kind: 'notTaken' })));
                    for (const item of list.inlineSuggestionsData) {
                        producedSuggestion = true;
                        if (!context.includeInlineEdits && (item.isInlineEdit || item.showInlineEditMenu)) {
                            item.setNotShownReason('notInlineEditRequested');
                            continue;
                        }
                        if (!context.includeInlineCompletions && !(item.isInlineEdit || item.showInlineEditMenu)) {
                            item.setNotShownReason('notInlineCompletionRequested');
                            continue;
                        }
                        const i = InlineSuggestionItem.create(item, this._textModel);
                        suggestions.push(i);
                        // Stop after first visible inline completion
                        if (!i.isInlineEdit && !i.showInlineEditMenu && context.triggerKind === InlineCompletionTriggerKind.Automatic) {
                            if (i.isVisible(this._textModel, this._cursorPosition.get())) {
                                shouldStopEarly = true;
                            }
                        }
                    }
                    if (shouldStopEarly) {
                        break;
                    }
                }
                providerResult.cancelAndDispose({ kind: 'lostRace' });
                if (this._loggingEnabled.get() || this._structuredFetchLogger.isEnabled.get()) {
                    const didAllProvidersReturn = providerResult.didAllProvidersReturn;
                    let error = undefined;
                    if (source.token.isCancellationRequested || this._store.isDisposed || this._textModel.getVersionId() !== request.versionId) {
                        error = 'canceled';
                    }
                    const result = suggestions.map(c => ({
                        range: c.editRange.toString(),
                        text: c.insertText,
                        hint: c.hint,
                        isInlineEdit: c.isInlineEdit,
                        showInlineEditMenu: c.showInlineEditMenu,
                        providerId: c.source.provider.providerId?.toString(),
                    }));
                    this._log({ sourceId: 'InlineCompletions.fetch', kind: 'end', requestId, durationMs: (Date.now() - startTime.getTime()), error, result, time: Date.now(), didAllProvidersReturn });
                }
                requestResponseInfo.setRequestUuid(providerResult.contextWithUuid.requestUuid);
                if (producedSuggestion) {
                    requestResponseInfo.setHasProducedSuggestion();
                    if (suggestions.length > 0 && source.token.isCancellationRequested) {
                        suggestions.forEach(s => s.setNotShownReasonIfNotSet('canceled:whileAwaitingOtherProviders'));
                    }
                }
                else {
                    if (source.token.isCancellationRequested) {
                        requestResponseInfo.setNoSuggestionReasonIfNotSet('canceled:whileFetching');
                    }
                    else {
                        const completionsQuotaExceeded = this._contextKeyService.getContextKeyValue('completionsQuotaExceeded');
                        requestResponseInfo.setNoSuggestionReasonIfNotSet(completionsQuotaExceeded ? 'completionsQuotaExceeded' : 'noSuggestion');
                    }
                }
                const remainingTimeToWait = context.earliestShownDateTime - Date.now();
                if (remainingTimeToWait > 0) {
                    await wait(remainingTimeToWait, source.token);
                }
                if (source.token.isCancellationRequested || this._store.isDisposed || this._textModel.getVersionId() !== request.versionId
                    || userJumpedToActiveCompletion.get() /* In the meantime the user showed interest for the active completion so dont hide it */) {
                    const notShownReason = source.token.isCancellationRequested ? 'canceled:afterMinShowDelay' :
                        this._store.isDisposed ? 'canceled:disposed' :
                            this._textModel.getVersionId() !== request.versionId ? 'canceled:documentChanged' :
                                userJumpedToActiveCompletion.get() ? 'canceled:userJumped' :
                                    'unknown';
                    suggestions.forEach(s => s.setNotShownReasonIfNotSet(notShownReason));
                    return false;
                }
                const endTime = new Date();
                this._debounceValue.update(this._textModel, endTime.getTime() - startTime.getTime());
                const cursorPosition = this._cursorPosition.get();
                this._updateOperation.clear();
                transaction(tx => {
                    /** @description Update completions with provider result */
                    const v = this._state.get();
                    if (context.selectedSuggestionInfo) {
                        this._state.set({
                            inlineCompletions: InlineCompletionsState.createEmpty(),
                            suggestWidgetInlineCompletions: v.suggestWidgetInlineCompletions.createStateWithAppliedResults(suggestions, request, this._textModel, cursorPosition, activeInlineCompletion),
                        }, tx);
                    }
                    else {
                        this._state.set({
                            inlineCompletions: v.inlineCompletions.createStateWithAppliedResults(suggestions, request, this._textModel, cursorPosition, activeInlineCompletion),
                            suggestWidgetInlineCompletions: InlineCompletionsState.createEmpty(),
                        }, tx);
                    }
                    v.inlineCompletions.dispose();
                    v.suggestWidgetInlineCompletions.dispose();
                });
            }
            finally {
                store.dispose();
                decreaseLoadingCount();
                this.sendInlineCompletionsRequestTelemetry(requestResponseInfo);
            }
            return true;
        })();
        const updateOperation = new UpdateOperation(request, source, promise);
        this._updateOperation.value = updateOperation;
        return promise;
    }
    clear(tx) {
        this._updateOperation.clear();
        const v = this._state.get();
        this._state.set({
            inlineCompletions: InlineCompletionsState.createEmpty(),
            suggestWidgetInlineCompletions: InlineCompletionsState.createEmpty()
        }, tx);
        v.inlineCompletions.dispose();
        v.suggestWidgetInlineCompletions.dispose();
    }
    seedInlineCompletionsWithSuggestWidget() {
        const inlineCompletions = this.inlineCompletions.get();
        const suggestWidgetInlineCompletions = this.suggestWidgetInlineCompletions.get();
        if (!suggestWidgetInlineCompletions) {
            return;
        }
        transaction(tx => {
            /** @description Seed inline completions with (newer) suggest widget inline completions */
            if (!inlineCompletions || (suggestWidgetInlineCompletions.request?.versionId ?? -1) > (inlineCompletions.request?.versionId ?? -1)) {
                inlineCompletions?.dispose();
                const s = this._state.get();
                this._state.set({
                    inlineCompletions: suggestWidgetInlineCompletions.clone(),
                    suggestWidgetInlineCompletions: InlineCompletionsState.createEmpty(),
                }, tx);
                s.inlineCompletions.dispose();
                s.suggestWidgetInlineCompletions.dispose();
            }
            this.clearSuggestWidgetInlineCompletions(tx);
        });
    }
    sendInlineCompletionsRequestTelemetry(requestResponseInfo) {
        if (!this._sendRequestData.get() && !this._contextKeyService.getContextKeyValue('isRunningUnificationExperiment')) {
            return;
        }
        if (requestResponseInfo.requestUuid === undefined || requestResponseInfo.hasProducedSuggestion) {
            return;
        }
        if (!isCompletionsEnabled(this._completionsEnabled, this._textModel.getLanguageId())) {
            return;
        }
        if (!requestResponseInfo.providers.some(p => isCopilotLikeExtension(p.providerId?.extensionId))) {
            return;
        }
        const emptyEndOfLifeEvent = {
            opportunityId: requestResponseInfo.requestUuid,
            noSuggestionReason: requestResponseInfo.noSuggestionReason ?? 'unknown',
            extensionId: 'vscode-core',
            extensionVersion: '0.0.0',
            groupId: 'empty',
            shown: false,
            editorType: requestResponseInfo.requestInfo.editorType,
            requestReason: requestResponseInfo.requestInfo.reason,
            typingInterval: requestResponseInfo.requestInfo.typingInterval,
            typingIntervalCharacterCount: requestResponseInfo.requestInfo.typingIntervalCharacterCount,
            languageId: requestResponseInfo.requestInfo.languageId,
            selectedSuggestionInfo: !!requestResponseInfo.context.selectedSuggestionInfo,
            availableProviders: requestResponseInfo.providers.map(p => p.providerId?.toString()).filter(isDefined).join(','),
            ...forwardToChannelIf(requestResponseInfo.providers.some(p => isCopilotLikeExtension(p.providerId?.extensionId))),
            timeUntilProviderRequest: undefined,
            timeUntilProviderResponse: undefined,
            viewKind: undefined,
            preceeded: undefined,
            superseded: undefined,
            reason: undefined,
            correlationId: undefined,
            shownDuration: undefined,
            shownDurationUncollapsed: undefined,
            timeUntilShown: undefined,
            partiallyAccepted: undefined,
            partiallyAcceptedCountSinceOriginal: undefined,
            partiallyAcceptedRatioSinceOriginal: undefined,
            partiallyAcceptedCharactersSinceOriginal: undefined,
            cursorColumnDistance: undefined,
            cursorLineDistance: undefined,
            lineCountOriginal: undefined,
            lineCountModified: undefined,
            characterCountOriginal: undefined,
            characterCountModified: undefined,
            disjointReplacements: undefined,
            sameShapeReplacements: undefined,
            notShownReason: undefined,
        };
        const dataChannel = this._instantiationService.createInstance(DataChannelForwardingTelemetryService);
        sendInlineCompletionsEndOfLifeTelemetry(dataChannel, emptyEndOfLifeEvent);
    }
    clearSuggestWidgetInlineCompletions(tx) {
        if (this._updateOperation.value?.request.context.selectedSuggestionInfo) {
            this._updateOperation.clear();
        }
    }
    cancelUpdate() {
        this._updateOperation.clear();
    }
};
InlineCompletionsSource = InlineCompletionsSource_1 = __decorate([
    __param(4, ILanguageConfigurationService),
    __param(5, ILogService),
    __param(6, IConfigurationService),
    __param(7, IInstantiationService),
    __param(8, IContextKeyService)
], InlineCompletionsSource);
export { InlineCompletionsSource };
class UpdateRequest {
    constructor(position, context, versionId, providers) {
        this.position = position;
        this.context = context;
        this.versionId = versionId;
        this.providers = providers;
    }
    satisfies(other) {
        return this.position.equals(other.position)
            && equalsIfDefined(this.context.selectedSuggestionInfo, other.context.selectedSuggestionInfo, itemEquals())
            && (other.context.triggerKind === InlineCompletionTriggerKind.Automatic
                || this.context.triggerKind === InlineCompletionTriggerKind.Explicit)
            && this.versionId === other.versionId
            && isSubset(other.providers, this.providers);
    }
    get isExplicitRequest() {
        return this.context.triggerKind === InlineCompletionTriggerKind.Explicit;
    }
}
class RequestResponseData {
    constructor(context, requestInfo, providers) {
        this.context = context;
        this.requestInfo = requestInfo;
        this.providers = providers;
        this.hasProducedSuggestion = false;
    }
    setRequestUuid(uuid) {
        this.requestUuid = uuid;
    }
    setNoSuggestionReasonIfNotSet(type) {
        this.noSuggestionReason ??= type;
    }
    setHasProducedSuggestion() {
        this.hasProducedSuggestion = true;
    }
}
function isSubset(set1, set2) {
    return [...set1].every(item => set2.has(item));
}
function isCompletionsEnabled(completionsEnablementObject, modeId = '*') {
    if (completionsEnablementObject === undefined) {
        return false; // default to disabled if setting is not available
    }
    if (typeof completionsEnablementObject[modeId] !== 'undefined') {
        return Boolean(completionsEnablementObject[modeId]); // go with setting if explicitly defined
    }
    return Boolean(completionsEnablementObject['*']); // fallback to global setting otherwise
}
class UpdateOperation {
    constructor(request, cancellationTokenSource, promise) {
        this.request = request;
        this.cancellationTokenSource = cancellationTokenSource;
        this.promise = promise;
    }
    dispose() {
        this.cancellationTokenSource.cancel();
    }
}
class InlineCompletionsState extends Disposable {
    static createEmpty() {
        return new InlineCompletionsState([], undefined);
    }
    constructor(inlineCompletions, request) {
        for (const inlineCompletion of inlineCompletions) {
            inlineCompletion.addRef();
        }
        super();
        this.inlineCompletions = inlineCompletions;
        this.request = request;
        this._register({
            dispose: () => {
                for (const inlineCompletion of this.inlineCompletions) {
                    inlineCompletion.removeRef();
                }
            }
        });
    }
    _findById(id) {
        return this.inlineCompletions.find(i => i.identity === id);
    }
    _findByHash(hash) {
        return this.inlineCompletions.find(i => i.hash === hash);
    }
    /**
     * Applies the edit on the state.
    */
    createStateWithAppliedEdit(edit, textModel) {
        const newInlineCompletions = this.inlineCompletions.map(i => i.withEdit(edit, textModel)).filter(isDefined);
        return new InlineCompletionsState(newInlineCompletions, this.request);
    }
    createStateWithAppliedResults(updatedSuggestions, request, textModel, cursorPosition, itemIdToPreserveAtTop) {
        let itemToPreserve = undefined;
        if (itemIdToPreserveAtTop) {
            const itemToPreserveCandidate = this._findById(itemIdToPreserveAtTop);
            if (itemToPreserveCandidate && itemToPreserveCandidate.canBeReused(textModel, request.position)) {
                itemToPreserve = itemToPreserveCandidate;
                const updatedItemToPreserve = updatedSuggestions.find(i => i.hash === itemToPreserveCandidate.hash);
                if (updatedItemToPreserve) {
                    updatedSuggestions = moveToFront(updatedItemToPreserve, updatedSuggestions);
                }
                else {
                    updatedSuggestions = [itemToPreserveCandidate, ...updatedSuggestions];
                }
            }
        }
        const preferInlineCompletions = itemToPreserve
            // itemToPreserve has precedence
            ? !itemToPreserve.isInlineEdit
            // Otherwise: prefer inline completion if there is a visible one
            : updatedSuggestions.some(i => !i.isInlineEdit && i.isVisible(textModel, cursorPosition));
        let updatedItems = [];
        for (const i of updatedSuggestions) {
            const oldItem = this._findByHash(i.hash);
            let item;
            if (oldItem && oldItem !== i) {
                item = i.withIdentity(oldItem.identity);
                i.setIsPreceeded(oldItem);
                oldItem.setEndOfLifeReason({ kind: InlineCompletionEndOfLifeReasonKind.Ignored, userTypingDisagreed: false, supersededBy: i.getSourceCompletion() });
            }
            else {
                item = i;
            }
            if (preferInlineCompletions !== item.isInlineEdit) {
                updatedItems.push(item);
            }
        }
        updatedItems.sort(compareBy(i => i.showInlineEditMenu, booleanComparator));
        updatedItems = distinctByKey(updatedItems, i => i.semanticId);
        return new InlineCompletionsState(updatedItems, request);
    }
    clone() {
        return new InlineCompletionsState(this.inlineCompletions, this.request);
    }
}
/** Keeps the first item in case of duplicates. */
function distinctByKey(items, key) {
    const seen = new Set();
    return items.filter(item => {
        const k = key(item);
        if (seen.has(k)) {
            return false;
        }
        seen.add(k);
        return true;
    });
}
function moveToFront(item, items) {
    const index = items.indexOf(item);
    if (index > -1) {
        return [item, ...items.slice(0, index), ...items.slice(index + 1)];
    }
    return items;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNTb3VyY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL21vZGVsL2lubGluZUNvbXBsZXRpb25zU291cmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsU0FBUyxFQUFFLHdCQUF3QixFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEksT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEksT0FBTyxFQUFFLE9BQU8sRUFBb0QsZUFBZSxFQUFFLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3RLLGlFQUFpRTtBQUNqRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUNsSCxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9B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