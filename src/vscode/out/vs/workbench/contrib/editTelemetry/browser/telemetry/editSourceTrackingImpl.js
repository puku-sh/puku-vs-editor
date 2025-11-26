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
import { reverseOrder, compareBy, numberComparator, sumBy } from '../../../../../base/common/arrays.js';
import { IntervalTimer, TimeoutTimer } from '../../../../../base/common/async.js';
import { toDisposable, Disposable } from '../../../../../base/common/lifecycle.js';
import { mapObservableArrayCached, derived, observableSignal, runOnChange, autorun } from '../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { CreateSuggestionIdForChatOrInlineChatCaller, EditTelemetryReportEditArcForChatOrInlineChatSender, EditTelemetryReportInlineEditArcSender } from './arcTelemetrySender.js';
import { createDocWithJustReason } from '../helpers/documentWithAnnotatedEdits.js';
import { DocumentEditSourceTracker } from './editTracker.js';
import { sumByCategory } from '../helpers/utils.js';
import { ScmAdapter } from './scmAdapter.js';
import { IRandomService } from '../randomService.js';
let EditSourceTrackingImpl = class EditSourceTrackingImpl extends Disposable {
    constructor(_statsEnabled, _annotatedDocuments, _instantiationService) {
        super();
        this._statsEnabled = _statsEnabled;
        this._annotatedDocuments = _annotatedDocuments;
        this._instantiationService = _instantiationService;
        const scmBridge = this._instantiationService.createInstance(ScmAdapter);
        this._states = mapObservableArrayCached(this, this._annotatedDocuments.documents, (doc, store) => {
            return [doc.document, store.add(this._instantiationService.createInstance(TrackedDocumentInfo, doc, scmBridge, this._statsEnabled))];
        });
        this.docsState = this._states.map((entries) => new Map(entries));
        this.docsState.recomputeInitiallyAndOnChange(this._store);
    }
};
EditSourceTrackingImpl = __decorate([
    __param(2, IInstantiationService)
], EditSourceTrackingImpl);
export { EditSourceTrackingImpl };
let TrackedDocumentInfo = class TrackedDocumentInfo extends Disposable {
    constructor(_doc, _scm, _statsEnabled, _instantiationService, _telemetryService, _randomService) {
        super();
        this._doc = _doc;
        this._scm = _scm;
        this._statsEnabled = _statsEnabled;
        this._instantiationService = _instantiationService;
        this._telemetryService = _telemetryService;
        this._randomService = _randomService;
        this._repo = derived(this, reader => this._scm.getRepo(_doc.document.uri, reader));
        const docWithJustReason = createDocWithJustReason(_doc.documentWithAnnotations, this._store);
        const longtermResetSignal = observableSignal('resetSignal');
        let longtermReason = 'closed';
        this.longtermTracker = derived((reader) => {
            if (!this._statsEnabled.read(reader)) {
                return undefined;
            }
            longtermResetSignal.read(reader);
            const t = reader.store.add(new DocumentEditSourceTracker(docWithJustReason, undefined));
            reader.store.add(toDisposable(() => {
                // send long term document telemetry
                if (!t.isEmpty()) {
                    this.sendTelemetry('longterm', longtermReason, t);
                }
                t.dispose();
            }));
            return t;
        }).recomputeInitiallyAndOnChange(this._store);
        this._store.add(new IntervalTimer()).cancelAndSet(() => {
            // Reset after 10 hours
            longtermReason = '10hours';
            longtermResetSignal.trigger(undefined);
            longtermReason = 'closed';
        }, 10 * 60 * 60 * 1000);
        // Reset on branch change or commit
        this._store.add(autorun(reader => {
            const repo = this._repo.read(reader);
            if (repo) {
                reader.store.add(runOnChange(repo.headCommitHashObs, () => {
                    longtermReason = 'hashChange';
                    longtermResetSignal.trigger(undefined);
                    longtermReason = 'closed';
                }));
                reader.store.add(runOnChange(repo.headBranchNameObs, () => {
                    longtermReason = 'branchChange';
                    longtermResetSignal.trigger(undefined);
                    longtermReason = 'closed';
                }));
            }
        }));
        this._store.add(this._instantiationService.createInstance(EditTelemetryReportInlineEditArcSender, _doc.documentWithAnnotations, this._repo));
        this._store.add(this._instantiationService.createInstance(EditTelemetryReportEditArcForChatOrInlineChatSender, _doc.documentWithAnnotations, this._repo));
        this._store.add(this._instantiationService.createInstance(CreateSuggestionIdForChatOrInlineChatCaller, _doc.documentWithAnnotations));
        const resetSignal = observableSignal('resetSignal');
        this.windowedTracker = derived((reader) => {
            if (!this._statsEnabled.read(reader)) {
                return undefined;
            }
            if (!this._doc.isVisible.read(reader)) {
                return undefined;
            }
            resetSignal.read(reader);
            reader.store.add(new TimeoutTimer(() => {
                // Reset after 5 minutes
                resetSignal.trigger(undefined);
            }, 5 * 60 * 1000));
            const t = reader.store.add(new DocumentEditSourceTracker(docWithJustReason, undefined));
            reader.store.add(toDisposable(async () => {
                // send long term document telemetry
                this.sendTelemetry('5minWindow', 'time', t);
                t.dispose();
            }));
            return t;
        }).recomputeInitiallyAndOnChange(this._store);
    }
    async sendTelemetry(mode, trigger, t) {
        const ranges = t.getTrackedRanges();
        const keys = t.getAllKeys();
        if (keys.length === 0) {
            return;
        }
        const data = this.getTelemetryData(ranges);
        const statsUuid = this._randomService.generateUuid();
        const sums = sumByCategory(ranges, r => r.range.length, r => r.sourceKey);
        const entries = Object.entries(sums).filter(([key, value]) => value !== undefined);
        entries.sort(reverseOrder(compareBy(([key, value]) => value, numberComparator)));
        entries.length = mode === 'longterm' ? 30 : 10;
        for (const key of keys) {
            if (!sums[key]) {
                sums[key] = 0;
            }
        }
        for (const [key, value] of Object.entries(sums)) {
            if (value === undefined) {
                continue;
            }
            const repr = t.getRepresentative(key);
            const deltaModifiedCount = t.getTotalInsertedCharactersCount(key);
            this._telemetryService.publicLog2('editTelemetry.editSources.details', {
                mode,
                sourceKey: key,
                sourceKeyCleaned: repr.toKey(1, { $extensionId: false, $extensionVersion: false, $modelId: false }),
                extensionId: repr.props.$extensionId,
                extensionVersion: repr.props.$extensionVersion,
                modelId: repr.props.$modelId,
                trigger,
                languageId: this._doc.document.languageId.get(),
                statsUuid: statsUuid,
                modifiedCount: value,
                deltaModifiedCount: deltaModifiedCount,
                totalModifiedCount: data.totalModifiedCharactersInFinalState,
            });
        }
        const isTrackedByGit = await data.isTrackedByGit;
        this._telemetryService.publicLog2('editTelemetry.editSources.stats', {
            mode,
            languageId: this._doc.document.languageId.get(),
            statsUuid: statsUuid,
            nesModifiedCount: data.nesModifiedCount,
            inlineCompletionsCopilotModifiedCount: data.inlineCompletionsCopilotModifiedCount,
            inlineCompletionsNESModifiedCount: data.inlineCompletionsNESModifiedCount,
            otherAIModifiedCount: data.otherAIModifiedCount,
            unknownModifiedCount: data.unknownModifiedCount,
            userModifiedCount: data.userModifiedCount,
            ideModifiedCount: data.ideModifiedCount,
            totalModifiedCharacters: data.totalModifiedCharactersInFinalState,
            externalModifiedCount: data.externalModifiedCount,
            isTrackedByGit: isTrackedByGit ? 1 : 0,
        });
    }
    getTelemetryData(ranges) {
        const getEditCategory = (source) => {
            if (source.category === 'ai' && source.kind === 'nes') {
                return 'nes';
            }
            if (source.category === 'ai' && source.kind === 'completion' && source.extensionId === 'github.copilot') {
                return 'inlineCompletionsCopilot';
            }
            if (source.category === 'ai' && source.kind === 'completion' && source.extensionId === 'github.copilot-chat' && source.providerId === 'completions') {
                return 'inlineCompletionsCopilot';
            }
            if (source.category === 'ai' && source.kind === 'completion' && source.extensionId === 'github.copilot-chat' && source.providerId === 'nes') {
                return 'inlineCompletionsNES';
            }
            if (source.category === 'ai' && source.kind === 'completion') {
                return 'inlineCompletionsOther';
            }
            if (source.category === 'ai') {
                return 'otherAI';
            }
            if (source.category === 'user') {
                return 'user';
            }
            if (source.category === 'ide') {
                return 'ide';
            }
            if (source.category === 'external') {
                return 'external';
            }
            if (source.category === 'unknown') {
                return 'unknown';
            }
            return 'unknown';
        };
        const sums = sumByCategory(ranges, r => r.range.length, r => getEditCategory(r.source));
        const totalModifiedCharactersInFinalState = sumBy(ranges, r => r.range.length);
        return {
            nesModifiedCount: sums.nes ?? 0,
            inlineCompletionsCopilotModifiedCount: sums.inlineCompletionsCopilot ?? 0,
            inlineCompletionsNESModifiedCount: sums.inlineCompletionsNES ?? 0,
            otherAIModifiedCount: sums.otherAI ?? 0,
            userModifiedCount: sums.user ?? 0,
            ideModifiedCount: sums.ide ?? 0,
            unknownModifiedCount: sums.unknown ?? 0,
            externalModifiedCount: sums.external ?? 0,
            totalModifiedCharactersInFinalState,
            languageId: this._doc.document.languageId.get(),
            isTrackedByGit: this._repo.get()?.isIgnored(this._doc.document.uri),
        };
    }
};
TrackedDocumentInfo = __decorate([
    __param(3, IInstantiationService),
    __param(4, ITelemetryService),
    __param(5, IRandomService)
], TrackedDocumentInfo);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNvdXJjZVRyYWNraW5nSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRUZWxlbWV0cnkvYnJvd3Nlci90ZWxlbWV0cnkvZWRpdFNvdXJjZVRyYWNraW5nSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN4RyxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE9BQU8sRUFBZSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbEosT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFMUYsT0FBTyxFQUFFLDJDQUEyQyxFQUFFLG1EQUFtRCxFQUFFLHNDQUFzQyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDbkwsT0FBTyxFQUFFLHVCQUF1QixFQUFjLE1BQU0sMENBQTBDLENBQUM7QUFDL0YsT0FBTyxFQUFFLHlCQUF5QixFQUFlLE1BQU0sa0JBQWtCLENBQUM7QUFDMUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxVQUFVLEVBQWtCLE1BQU0saUJBQWlCLENBQUM7QUFDN0QsT0FBTyxFQUFFLGNBQWMs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