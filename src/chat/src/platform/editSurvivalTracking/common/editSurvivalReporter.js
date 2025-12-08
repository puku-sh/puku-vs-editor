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
exports.EditSurvivalReporter = void 0;
const gitService_1 = require("../../../platform/git/common/gitService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const async_1 = require("../../../util/vs/base/common/async");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const edit_1 = require("../../editing/common/edit");
const arcTracker_1 = require("./arcTracker");
const editSurvivalTracker_1 = require("./editSurvivalTracker");
let EditSurvivalReporter = class EditSurvivalReporter {
    /**
     * ```
     * _documentTextBeforeMarkedEdits
     * 	----markedEdits---->
     * 	----editsOnTop---->
     * _document.getText()
     *  ----onDidChangeTextDocument edits---->
     * 		[30sec] -> telemetry event of survival rate of markedEdits
     * 		[2min] -> ...
     * 		[5min] -> ...
     * 		[10min] -> ...
     * ```
    */
    constructor(_document, _documentTextBeforeMarkedEdits, _markedEdits, editsOnTop, _options, _sendTelemetryEvent, workspaceService, _gitService, _telemetryService) {
        this._document = _document;
        this._documentTextBeforeMarkedEdits = _documentTextBeforeMarkedEdits;
        this._markedEdits = _markedEdits;
        this._options = _options;
        this._sendTelemetryEvent = _sendTelemetryEvent;
        this._gitService = _gitService;
        this._telemetryService = _telemetryService;
        this._store = new lifecycle_1.DisposableStore();
        this._editSurvivalTracker = new editSurvivalTracker_1.EditSurvivalTracker(this._documentTextBeforeMarkedEdits, this._markedEdits);
        this._arcTracker = this._options.includeArc === true ? new arcTracker_1.ArcTracker(this._documentTextBeforeMarkedEdits, this._markedEdits) : undefined;
        this._store.add(workspaceService.onDidChangeTextDocument(e => {
            if (e.document !== this._document) {
                return;
            }
            const edits = (0, edit_1.stringEditFromTextContentChange)(e.contentChanges);
            this._editSurvivalTracker.handleEdits(edits);
            this._arcTracker?.handleEdits(edits);
        }));
        this._editSurvivalTracker.handleEdits(editsOnTop);
        this._arcTracker?.handleEdits(editsOnTop);
        this._initialBranchName = this._gitService.activeRepository.get()?.headBranchName;
        // This aligns with github inline completions
        this._reportAfter(30 * 1000);
        this._reportAfter(120 * 1000);
        this._reportAfter(300 * 1000);
        this._reportAfter(600 * 1000);
        // track up to 15min to allow for slower edit responses from legacy SD endpoint
        this._reportAfter(900 * 1000, () => {
            this._store.dispose();
        });
    }
    _getCurrentBranchName() {
        return this._gitService.activeRepository.get()?.headBranchName;
    }
    _reportAfter(timeoutMs, cb) {
        const timer = new async_1.TimeoutTimer(() => {
            this._report(timeoutMs);
            timer.dispose();
            if (cb) {
                cb();
            }
        }, timeoutMs);
        this._store.add(timer);
    }
    _report(timeMs) {
        const survivalRate = this._editSurvivalTracker.computeTrackedEditsSurvivalScore();
        const currentBranch = this._getCurrentBranchName();
        const didBranchChange = currentBranch !== this._initialBranchName;
        this._sendTelemetryEvent({
            telemetryService: this._telemetryService,
            fourGram: survivalRate.fourGram,
            noRevert: survivalRate.noRevert,
            timeDelayMs: timeMs,
            didBranchChange,
            currentFileContent: this._document.getText(),
            arc: this._arcTracker?.getAcceptedRestrainedCharactersCount(),
        });
    }
    cancel() {
        this._store.dispose();
    }
};
exports.EditSurvivalReporter = EditSurvivalReporter;
exports.EditSurvivalReporter = EditSurvivalReporter = __decorate([
    __param(6, workspaceService_1.IWorkspaceService),
    __param(7, gitService_1.IGitService),
    __param(8, telemetry_1.ITelemetryService)
], EditSurvivalReporter);
//# sourceMappingURL=editSurvivalReporter.js.map