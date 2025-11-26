/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../../base/common/assert.js';
import { AsyncIterableProducer } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../../base/common/errors.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { prefixedUuid } from '../../../../../base/common/uuid.js';
import { StringReplacement } from '../../../../common/core/edits/stringEdit.js';
import { OffsetRange } from '../../../../common/core/ranges/offsetRange.js';
import { Range } from '../../../../common/core/range.js';
import { TextReplacement } from '../../../../common/core/edits/textEdit.js';
import { InlineCompletionEndOfLifeReasonKind } from '../../../../common/languages.js';
import { fixBracketsInLine } from '../../../../common/model/bracketPairsTextModelPart/fixBrackets.js';
import { SnippetParser, Text } from '../../../snippet/browser/snippetParser.js';
import { getReadonlyEmptyArray } from '../utils.js';
import { groupByMap } from '../../../../../base/common/collections.js';
import { DirectedGraph } from './graph.js';
import { CachedFunction } from '../../../../../base/common/cache.js';
import { InlineCompletionViewKind } from '../view/inlineEdits/inlineEditsViewInterface.js';
import { isDefined } from '../../../../../base/common/types.js';
import { inlineCompletionIsVisible } from './inlineSuggestionItem.js';
import { EditDeltaInfo } from '../../../../common/textModelEditSource.js';
import { URI } from '../../../../../base/common/uri.js';
export function provideInlineCompletions(providers, position, model, context, requestInfo, languageConfigurationService) {
    const requestUuid = prefixedUuid('icr');
    const cancellationTokenSource = new CancellationTokenSource();
    let cancelReason = undefined;
    const contextWithUuid = { ...context, requestUuid: requestUuid };
    const defaultReplaceRange = getDefaultRange(position, model);
    const providersByGroupId = groupByMap(providers, p => p.groupId);
    const yieldsToGraph = DirectedGraph.from(providers, p => {
        return p.yieldsToGroupIds?.flatMap(groupId => providersByGroupId.get(groupId) ?? []) ?? [];
    });
    const { foundCycles } = yieldsToGraph.removeCycles();
    if (foundCycles.length > 0) {
        onUnexpectedExternalError(new Error(`Inline completions: cyclic yield-to dependency detected.`
            + ` Path: ${foundCycles.map(s => s.toString ? s.toString() : ('' + s)).join(' -> ')}`));
    }
    let runningCount = 0;
    const queryProvider = new CachedFunction(async (provider) => {
        try {
            runningCount++;
            if (cancellationTokenSource.token.isCancellationRequested) {
                return undefined;
            }
            const yieldsTo = yieldsToGraph.getOutgoing(provider);
            for (const p of yieldsTo) {
                // We know there is no cycle, so no recursion here
                const result = await queryProvider.get(p);
                if (result) {
                    for (const item of result.inlineSuggestions.items) {
                        if (item.isInlineEdit || typeof item.insertText !== 'string' && item.insertText !== undefined) {
                            return undefined;
                        }
                        if (item.insertText !== undefined) {
                            const t = new TextReplacement(Range.lift(item.range) ?? defaultReplaceRange, item.insertText);
                            if (inlineCompletionIsVisible(t, undefined, model, position)) {
                                return undefined;
                            }
                        }
                        // else: inline completion is not visible, so lets not block
                    }
                }
            }
            let result;
            const providerStartTime = Date.now();
            try {
                result = await provider.provideInlineCompletions(model, position, contextWithUuid, cancellationTokenSource.token);
            }
            catch (e) {
                onUnexpectedExternalError(e);
                return undefined;
            }
            const providerEndTime = Date.now();
            if (!result) {
                return undefined;
            }
            const data = [];
            const list = new InlineSuggestionList(result, data, provider);
            list.addRef();
            runWhenCancelled(cancellationTokenSource.token, () => {
                return list.removeRef(cancelReason);
            });
            if (cancellationTokenSource.token.isCancellationRequested) {
                return undefined; // The list is disposed now, so we cannot return the items!
            }
            for (const item of result.items) {
                data.push(toInlineSuggestData(item, list, defaultReplaceRange, model, languageConfigurationService, contextWithUuid, requestInfo, { startTime: providerStartTime, endTime: providerEndTime }));
            }
            return list;
        }
        finally {
            runningCount--;
        }
    });
    const inlineCompletionLists = AsyncIterableProducer.fromPromisesResolveOrder(providers.map(p => queryProvider.get(p))).filter(isDefined);
    return {
        contextWithUuid,
        get didAllProvidersReturn() { return runningCount === 0; },
        lists: inlineCompletionLists,
        cancelAndDispose: reason => {
            if (cancelReason !== undefined) {
                return;
            }
            cancelReason = reason;
            cancellationTokenSource.dispose(true);
        }
    };
}
/** If the token is eventually cancelled, this will not leak either. */
export function runWhenCancelled(token, callback) {
    if (token.isCancellationRequested) {
        callback();
        return Disposable.None;
    }
    else {
        const listener = token.onCancellationRequested(() => {
            listener.dispose();
            callback();
        });
        return { dispose: () => listener.dispose() };
    }
}
function toInlineSuggestData(inlineCompletion, source, defaultReplaceRange, textModel, languageConfigurationService, context, requestInfo, providerRequestInfo) {
    let insertText;
    let snippetInfo;
    let range = inlineCompletion.range ? Range.lift(inlineCompletion.range) : defaultReplaceRange;
    if (typeof inlineCompletion.insertText === 'string') {
        insertText = inlineCompletion.insertText;
        if (languageConfigurationService && inlineCompletion.completeBracketPairs) {
            insertText = closeBrackets(insertText, range.getStartPosition(), textModel, languageConfigurationService);
            // Modify range depending on if brackets are added or removed
            const diff = insertText.length - inlineCompletion.insertText.length;
            if (diff !== 0) {
                range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn + diff);
            }
        }
        snippetInfo = undefined;
    }
    else if (inlineCompletion.insertText === undefined) {
        insertText = ''; // TODO use undefined
        snippetInfo = undefined;
        range = new Range(1, 1, 1, 1);
    }
    else if ('snippet' in inlineCompletion.insertText) {
        const preBracketCompletionLength = inlineCompletion.insertText.snippet.length;
        if (languageConfigurationService && inlineCompletion.completeBracketPairs) {
            inlineCompletion.insertText.snippet = closeBrackets(inlineCompletion.insertText.snippet, range.getStartPosition(), textModel, languageConfigurationService);
            // Modify range depending on if brackets are added or removed
            const diff = inlineCompletion.insertText.snippet.length - preBracketCompletionLength;
            if (diff !== 0) {
                range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn + diff);
            }
        }
        const snippet = new SnippetParser().parse(inlineCompletion.insertText.snippet);
        if (snippet.children.length === 1 && snippet.children[0] instanceof Text) {
            insertText = snippet.children[0].value;
            snippetInfo = undefined;
        }
        else {
            insertText = snippet.toString();
            snippetInfo = {
                snippet: inlineCompletion.insertText.snippet,
                range: range
            };
        }
    }
    else {
        assertNever(inlineCompletion.insertText);
    }
    return new InlineSuggestData(range, insertText, snippetInfo, URI.revive(inlineCompletion.uri), inlineCompletion.hint, inlineCompletion.additionalTextEdits || getReadonlyEmptyArray(), inlineCompletion, source, context, inlineCompletion.isInlineEdit ?? false, requestInfo, providerRequestInfo, inlineCompletion.correlationId);
}
export class InlineSuggestData {
    constructor(range, insertText, snippetInfo, uri, hint, additionalTextEdits, sourceInlineCompletion, source, context, isInlineEdit, _requestInfo, _providerRequestInfo, _correlationId) {
        this.range = range;
        this.insertText = insertText;
        this.snippetInfo = snippetInfo;
        this.uri = uri;
        this.hint = hint;
        this.additionalTextEdits = additionalTextEdits;
        this.sourceInlineCompletion = sourceInlineCompletion;
        this.source = source;
        this.context = context;
        this.isInlineEdit = isInlineEdit;
        this._requestInfo = _requestInfo;
        this._providerRequestInfo = _providerRequestInfo;
        this._correlationId = _correlationId;
        this._didShow = false;
        this._timeUntilShown = undefined;
        this._showStartTime = undefined;
        this._shownDuration = 0;
        this._showUncollapsedStartTime = undefined;
        this._showUncollapsedDuration = 0;
        this._notShownReason = undefined;
        this._didReportEndOfLife = false;
        this._lastSetEndOfLifeReason = undefined;
        this._isPreceeded = false;
        this._partiallyAcceptedCount = 0;
        this._partiallyAcceptedSinceOriginal = { characters: 0, ratio: 0, count: 0 };
        this._viewData = { editorType: _requestInfo.editorType };
    }
    get showInlineEditMenu() { return this.sourceInlineCompletion.showInlineEditMenu ?? false; }
    get partialAccepts() { return this._partiallyAcceptedSinceOriginal; }
    getSingleTextEdit() {
        return new TextReplacement(this.range, this.insertText);
    }
    async reportInlineEditShown(commandService, updatedInsertText, viewKind, viewData) {
        this.updateShownDuration(viewKind);
        if (this._didShow) {
            return;
        }
        this._didShow = true;
        this._viewData.viewKind = viewKind;
        this._viewData.renderData = viewData;
        this._timeUntilShown = Date.now() - this._requestInfo.startTime;
        const editDeltaInfo = new EditDeltaInfo(viewData.lineCountModified, viewData.lineCountOriginal, viewData.characterCountModified, viewData.characterCountOriginal);
        this.source.provider.handleItemDidShow?.(this.source.inlineSuggestions, this.sourceInlineCompletion, updatedInsertText, editDeltaInfo);
        if (this.sourceInlineCompletion.shownCommand) {
            await commandService.executeCommand(this.sourceInlineCompletion.shownCommand.id, ...(this.sourceInlineCompletion.shownCommand.arguments || []));
        }
    }
    reportPartialAccept(acceptedCharacters, info, partialAcceptance) {
        this._partiallyAcceptedCount++;
        this._partiallyAcceptedSinceOriginal.characters += partialAcceptance.characters;
        this._partiallyAcceptedSinceOriginal.ratio = Math.min(this._partiallyAcceptedSinceOriginal.ratio + (1 - this._partiallyAcceptedSinceOriginal.ratio) * partialAcceptance.ratio, 1);
        this._partiallyAcceptedSinceOriginal.count += partialAcceptance.count;
        this.source.provider.handlePartialAccept?.(this.source.inlineSuggestions, this.sourceInlineCompletion, acceptedCharacters, info);
    }
    /**
     * Sends the end of life event to the provider.
     * If no reason is provided, the last set reason is used.
     * If no reason was set, the default reason is used.
    */
    reportEndOfLife(reason) {
        if (this._didReportEndOfLife) {
            return;
        }
        this._didReportEndOfLife = true;
        this.reportInlineEditHidden();
        if (!reason) {
            reason = this._lastSetEndOfLifeReason ?? { kind: InlineCompletionEndOfLifeReasonKind.Ignored, userTypingDisagreed: false, supersededBy: undefined };
        }
        if (reason.kind === InlineCompletionEndOfLifeReasonKind.Rejected && this.source.provider.handleRejection) {
            this.source.provider.handleRejection(this.source.inlineSuggestions, this.sourceInlineCompletion);
        }
        if (this.source.provider.handleEndOfLifetime) {
            const summary = {
                requestUuid: this.context.requestUuid,
                correlationId: this._correlationId,
                selectedSuggestionInfo: !!this.context.selectedSuggestionInfo,
                partiallyAccepted: this._partiallyAcceptedCount,
                partiallyAcceptedCountSinceOriginal: this._partiallyAcceptedSinceOriginal.count,
                partiallyAcceptedRatioSinceOriginal: this._partiallyAcceptedSinceOriginal.ratio,
                partiallyAcceptedCharactersSinceOriginal: this._partiallyAcceptedSinceOriginal.characters,
                shown: this._didShow,
                shownDuration: this._shownDuration,
                shownDurationUncollapsed: this._showUncollapsedDuration,
                preceeded: this._isPreceeded,
                timeUntilShown: this._timeUntilShown,
                timeUntilProviderRequest: this._providerRequestInfo.startTime - this._requestInfo.startTime,
                timeUntilProviderResponse: this._providerRequestInfo.endTime - this._requestInfo.startTime,
                editorType: this._viewData.editorType,
                languageId: this._requestInfo.languageId,
                requestReason: this._requestInfo.reason,
                viewKind: this._viewData.viewKind,
                notShownReason: this._notShownReason,
                typingInterval: this._requestInfo.typingInterval,
                typingIntervalCharacterCount: this._requestInfo.typingIntervalCharacterCount,
                availableProviders: this._requestInfo.availableProviders.map(p => p.toString()).join(','),
                ...this._viewData.renderData,
            };
            this.source.provider.handleEndOfLifetime(this.source.inlineSuggestions, this.sourceInlineCompletion, reason, summary);
        }
    }
    setIsPreceeded(partialAccepts) {
        this._isPreceeded = true;
        if (this._partiallyAcceptedSinceOriginal.characters !== 0 || this._partiallyAcceptedSinceOriginal.ratio !== 0 || this._partiallyAcceptedSinceOriginal.count !== 0) {
            console.warn('Expected partiallyAcceptedCountSinceOriginal to be { characters: 0, rate: 0, partialAcceptances: 0 } before setIsPreceeded.');
        }
        this._partiallyAcceptedSinceOriginal = partialAccepts;
    }
    setNotShownReason(reason) {
        this._notShownReason ??= reason;
    }
    /**
     * Sets the end of life reason, but does not send the event to the provider yet.
    */
    setEndOfLifeReason(reason) {
        this.reportInlineEditHidden();
        this._lastSetEndOfLifeReason = reason;
    }
    updateShownDuration(viewKind) {
        const timeNow = Date.now();
        if (!this._showStartTime) {
            this._showStartTime = timeNow;
        }
        const isCollapsed = viewKind === InlineCompletionViewKind.Collapsed;
        if (!isCollapsed && this._showUncollapsedStartTime === undefined) {
            this._showUncollapsedStartTime = timeNow;
        }
        if (isCollapsed && this._showUncollapsedStartTime !== undefined) {
            this._showUncollapsedDuration += timeNow - this._showUncollapsedStartTime;
        }
    }
    reportInlineEditHidden() {
        if (this._showStartTime === undefined) {
            return;
        }
        const timeNow = Date.now();
        this._shownDuration += timeNow - this._showStartTime;
        this._showStartTime = undefined;
        if (this._showUncollapsedStartTime === undefined) {
            return;
        }
        this._showUncollapsedDuration += timeNow - this._showUncollapsedStartTime;
        this._showUncollapsedStartTime = undefined;
    }
}
export var InlineCompletionEditorType;
(function (InlineCompletionEditorType) {
    InlineCompletionEditorType["TextEditor"] = "textEditor";
    InlineCompletionEditorType["DiffEditor"] = "diffEditor";
    InlineCompletionEditorType["Notebook"] = "notebook";
})(InlineCompletionEditorType || (InlineCompletionEditorType = {}));
/**
 * A ref counted pointer to the computed `InlineCompletions` and the `InlineCompletionsProvider` that
 * computed them.
 */
export class InlineSuggestionList {
    constructor(inlineSuggestions, inlineSuggestionsData, provider) {
        this.inlineSuggestions = inlineSuggestions;
        this.inlineSuggestionsData = inlineSuggestionsData;
        this.provider = provider;
        this.refCount = 0;
    }
    addRef() {
        this.refCount++;
    }
    removeRef(reason = { kind: 'other' }) {
        this.refCount--;
        if (this.refCount === 0) {
            for (const item of this.inlineSuggestionsData) {
                // Fallback if it has not been called before
                item.reportEndOfLife();
            }
            this.provider.disposeInlineCompletions(this.inlineSuggestions, reason);
        }
    }
}
function getDefaultRange(position, model) {
    const word = model.getWordAtPosition(position);
    const maxColumn = model.getLineMaxColumn(position.lineNumber);
    // By default, always replace up until the end of the current line.
    // This default might be subject to change!
    return word
        ? new Range(position.lineNumber, word.startColumn, position.lineNumber, maxColumn)
        : Range.fromPositions(position, position.with(undefined, maxColumn));
}
function closeBrackets(text, position, model, languageConfigurationService) {
    const currentLine = model.getLineContent(position.lineNumber);
    const edit = StringReplacement.replace(new OffsetRange(position.column - 1, currentLine.length), text);
    const proposedLineTokens = model.tokenization.tokenizeLinesAt(position.lineNumber, [edit.replace(currentLine)]);
    const textTokens = proposedLineTokens?.[0].sliceZeroCopy(edit.getRangeAfterReplace());
    if (!textTokens) {
        return text;
    }
    const fixedText = fixBracketsInLine(textTokens, languageConfigurationService);
    return fixedText;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZUlubGluZUNvbXBsZXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9wcm92aWRlSW5saW5lQ29tcGxldGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVFLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBR2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUU1RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzVFLE9BQU8sRUFBbUMsbUNBQW1DLEVBQWlNLE1BQU0saUNBQWlDLENBQUM7QUFHdFQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDcEQs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