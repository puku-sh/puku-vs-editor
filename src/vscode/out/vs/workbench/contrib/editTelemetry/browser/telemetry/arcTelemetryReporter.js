var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TimeoutTimer } from '../../../../../base/common/async.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { runOnChange } from '../../../../../base/common/observable.js';
import { BaseStringEdit } from '../../../../../editor/common/core/edits/stringEdit.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ArcTracker } from '../../common/arcTracker.js';
let ArcTelemetryReporter = class ArcTelemetryReporter extends Disposable {
    constructor(_timesMs, _documentValueBeforeTrackedEdit, _document, 
    // _markedEdits -> document.value
    _gitRepo, _trackedEdit, _sendTelemetryEvent, _onBeforeDispose, _telemetryService) {
        super();
        this._timesMs = _timesMs;
        this._documentValueBeforeTrackedEdit = _documentValueBeforeTrackedEdit;
        this._document = _document;
        this._gitRepo = _gitRepo;
        this._trackedEdit = _trackedEdit;
        this._sendTelemetryEvent = _sendTelemetryEvent;
        this._onBeforeDispose = _onBeforeDispose;
        this._telemetryService = _telemetryService;
        this._arcTracker = new ArcTracker(this._documentValueBeforeTrackedEdit, this._trackedEdit);
        this._store.add(toDisposable(() => {
            this._onBeforeDispose();
        }));
        this._store.add(runOnChange(this._document.value, (_val, _prevVal, changes) => {
            const edit = BaseStringEdit.composeOrUndefined(changes.map(c => c.edit));
            if (edit) {
                this._arcTracker.handleEdits(edit);
            }
        }));
        this._initialLineCounts = this._arcTracker.getLineCountInfo();
        this._initialBranchName = this._gitRepo.get()?.headBranchNameObs.get();
        for (let i = 0; i < this._timesMs.length; i++) {
            const timeMs = this._timesMs[i];
            if (timeMs <= 0) {
                this._report(timeMs);
            }
            else {
                this._reportAfter(timeMs, i === this._timesMs.length - 1 ? () => {
                    this.dispose();
                } : undefined);
            }
        }
    }
    _reportAfter(timeoutMs, cb) {
        const timer = new TimeoutTimer(() => {
            this._report(timeoutMs);
            timer.dispose();
            if (cb) {
                cb();
            }
        }, timeoutMs);
        this._store.add(timer);
    }
    _report(timeMs) {
        const currentBranch = this._gitRepo.get()?.headBranchNameObs.get();
        const didBranchChange = currentBranch !== this._initialBranchName;
        const currentLineCounts = this._arcTracker.getLineCountInfo();
        this._sendTelemetryEvent({
            telemetryService: this._telemetryService,
            timeDelayMs: timeMs,
            didBranchChange,
            arc: this._arcTracker.getAcceptedRestrainedCharactersCount(),
            originalCharCount: this._arcTracker.getOriginalCharacterCount(),
            currentLineCount: currentLineCounts.insertedLineCounts,
            currentDeletedLineCount: currentLineCounts.deletedLineCounts,
            originalLineCount: this._initialLineCounts.insertedLineCounts,
            originalDeletedLineCount: this._initialLineCounts.deletedLineCounts,
        });
    }
};
ArcTelemetryReporter = __decorate([
    __param(7, ITelemetryService)
], ArcTelemetryReporter);
export { ArcTelemetryReporter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjVGVsZW1ldHJ5UmVwb3J0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9lZGl0VGVsZW1ldHJ5L2Jyb3dzZXIvdGVsZW1ldHJ5L2FyY1RlbGVtZXRyeVJlcG9ydGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25GLE9BQU8sRUFBc0MsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRXZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUdqRCxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFVBQVU7SUFNbkQsWUFDa0IsUUFBa0IsRUFDbEIsK0JBQTJDLEVBQzNDLFNBQWlGO0lBQ2xHLGlDQUFpQztJQUNoQixRQUFpRCxFQUNqRCxZQUE0QixFQUM1QixtQkFBNEQsRUFDNUQsZ0JBQTRCLEVBQ1QsaUJBQW9DO1FBRXhFLEtBQUssRUFBRSxDQUFDO1FBVlMsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQUNsQixvQ0FBK0IsR0FBL0IsK0JBQStCLENBQVk7UUFDM0MsY0FBUyxHQUFULFNBQVMsQ0FBd0U7UUFFakYsYUFBUSxHQUFSLFFBQVEsQ0FBeUM7UUFDakQsaUJBQVksR0FBWixZQUFZLENBQWdCO1FBQzVCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBeUM7UUFD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