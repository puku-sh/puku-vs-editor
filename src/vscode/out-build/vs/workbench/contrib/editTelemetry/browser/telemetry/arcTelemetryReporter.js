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
//# sourceMappingURL=arcTelemetryReporter.js.map