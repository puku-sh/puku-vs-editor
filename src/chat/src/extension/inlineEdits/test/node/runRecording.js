"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncDiffService = exports.RecordingPlayground = void 0;
exports.runRecording = runRecording;
const diffService_1 = require("../../../../platform/diff/common/diffService");
const diffWorker_1 = require("../../../../platform/diff/common/diffWorker");
const diffServiceImpl_1 = require("../../../../platform/diff/node/diffServiceImpl");
const services_1 = require("../../../../platform/test/node/services");
const timeTravelScheduler_1 = require("../../../../util/common/timeTravelScheduler");
const event_1 = require("../../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const observableInternal_1 = require("../../../../util/vs/base/common/observableInternal");
const types_1 = require("../../../../util/vs/base/common/types");
const lineRange_1 = require("../../../../util/vs/editor/common/core/ranges/lineRange");
const linesDiffComputer_1 = require("../../../../util/vs/editor/common/diff/linesDiffComputer");
const rangeMapping_1 = require("../../../../util/vs/editor/common/diff/rangeMapping");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const rendererVisualization_1 = require("../../../inlineChat/node/rendererVisualization");
const summarizeDocumentPlayground_1 = require("../../../prompts/node/test/summarizeDocumentPlayground");
const workspaceListenerService_1 = require("../../../workspaceRecorder/common/workspaceListenerService");
const observableWorkspaceRecordingReplayer_1 = require("../../common/observableWorkspaceRecordingReplayer");
async function runRecording(recording, run) {
    const globalStore = new lifecycle_1.DisposableStore();
    async function playRecordingWithFakedTimers(rec) {
        globalStore.clear();
        return await (0, timeTravelScheduler_1.runWithFakedTimers)({ maxTaskCount: 10_000_000 }, async () => {
            return await playRecording(rec);
        });
    }
    async function playRecording(rec) {
        rendererVisualization_1.VisualizationTestRun.startRun();
        rendererVisualization_1.VisualizationTestRun.instance.addData('recording', () => {
            return playground;
        }, undefined, '.recording');
        rendererVisualization_1.VisualizationTestRun.instance.addData('result', () => {
            return playground.getResult();
        });
        const r = new observableWorkspaceRecordingReplayer_1.ObservableWorkspaceRecordingReplayer(rec);
        const store = new lifecycle_1.DisposableStore();
        const _onStructuredData = new event_1.Emitter();
        const onStructuredData = _onStructuredData.event;
        const _onHandleChangeReason = new event_1.Emitter();
        const onHandleChangeReason = _onHandleChangeReason.event;
        const myS = {
            _serviceBrand: undefined,
            onHandleChangeReason: onHandleChangeReason,
            onStructuredData: onStructuredData,
        };
        store.add(r.onDocumentEvent(e => {
            // TODO: _onStructuredData.fire(e);
            if (e.data.sourceId === 'TextModel.setChangeReason') {
                _onHandleChangeReason.fire({
                    documentUri: e.doc.id.toUri().toString(),
                    documentVersion: e.data.v,
                    reason: e.data.source,
                    metadata: e.data,
                });
            }
        }));
        const s = (0, services_1.createPlatformServices)();
        s.define(workspaceListenerService_1.IWorkspaceListenerService, myS);
        s.define(diffService_1.IDiffService, new SyncDiffService());
        let instantiationService;
        const result = await run({
            get testingServiceCollection() {
                if (instantiationService) {
                    throw new Error('Already created instances!');
                }
                return s;
            },
            get instantiationService() {
                if (!instantiationService) {
                    instantiationService = s.createTestingAccessor().get(instantiation_1.IInstantiationService);
                }
                return instantiationService;
            },
            player: r,
            store,
            workspace: r.workspace,
            finishReplay: () => {
                while (r.step()) {
                    // noop
                }
            },
            step: () => {
                return r.step();
            },
            stepSkipNonContentChanges: () => {
                while (r.step()) {
                    const entry = r.getPreviousLogEntry();
                    if (entry?.kind === 'changed') {
                        return true;
                    }
                }
                return false;
            }
        });
        globalStore.add(store);
        return result;
    }
    if (Array.isArray(recording)) {
        recording = { log: recording };
    }
    const result = await playRecordingWithFakedTimers(recording);
    const playground = new RecordingPlayground(JSON.stringify(result, undefined, 4), 0, recording.log, async (recording, logEntryIdx) => {
        try {
            const result = await playRecordingWithFakedTimers({ log: recording.slice(0, logEntryIdx + 1) });
            if (typeof result === 'string') {
                return result;
            }
            return JSON.stringify(result, undefined, 4);
        }
        catch (e) {
            console.error(e);
            return JSON.stringify({ error: e });
        }
    });
    return result;
}
class RecordingPlayground {
    constructor(result, logEntryIdx, _recording, _getUpdatedResult) {
        this._recording = _recording;
        this._getUpdatedResult = _getUpdatedResult;
        this._logEntryIdx = (0, observableInternal_1.observableValue)(this, 0);
        this._initialResult = (0, observableInternal_1.observableValue)(this, undefined);
        this._store = new lifecycle_1.DisposableStore();
        this._result = (0, observableInternal_1.derived)(this, reader => {
            const r = this._initialResult.read(reader);
            if (r) {
                return r;
            }
            return this._getUpdatedResult(this._recording, this._logEntryIdx.read(reader));
        });
        (0, observableInternal_1.transaction)(tx => {
            this._initialResult.set(result, tx);
            this._logEntryIdx.set(logEntryIdx, tx);
        });
        this._result.recomputeInitiallyAndOnChange(this._store);
    }
    get recording() {
        return {
            ...{ $fileExtension: 'recording.w.json' },
            log: this._recording,
            logEntryIdx: this._logEntryIdx.get(),
            writeStep: true,
        };
    }
    set recording(value) {
        (0, observableInternal_1.transaction)(tx => {
            this._initialResult.set(undefined, tx);
            this._logEntryIdx.set(value.logEntryIdx ?? 0, tx);
        });
    }
    getResult() {
        return (0, summarizeDocumentPlayground_1.waitForStateOrReturn)(this._result, types_1.isDefined);
    }
}
exports.RecordingPlayground = RecordingPlayground;
/** This is to avoid non-deterministic race conditions. */
class SyncDiffService {
    computeDiff(original, modified, options) {
        const result = (0, diffWorker_1.computeDiffSync)(original, modified, options);
        // Convert from space efficient JSON data to rich objects.
        const diff = {
            identical: result.identical,
            quitEarly: result.quitEarly,
            changes: (0, diffServiceImpl_1.toLineRangeMappings)(result.changes),
            moves: result.moves.map(m => new linesDiffComputer_1.MovedText(new rangeMapping_1.LineRangeMapping(new lineRange_1.LineRange(m[0], m[1]), new lineRange_1.LineRange(m[2], m[3])), (0, diffServiceImpl_1.toLineRangeMappings)(m[4])))
        };
        return Promise.resolve(diff);
    }
}
exports.SyncDiffService = SyncDiffService;
//# sourceMappingURL=runRecording.js.map