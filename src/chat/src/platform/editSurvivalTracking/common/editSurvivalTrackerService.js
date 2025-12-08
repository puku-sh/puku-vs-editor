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
exports.EditSurvivalTrackerService = exports.NullEditSurvivalTrackerService = exports.NullEditSurvivalTrackingSession = exports.IEditSurvivalTrackerService = void 0;
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const logService_1 = require("../../log/common/logService");
const editCollector_1 = require("./editCollector");
const editComputer_1 = require("./editComputer");
const editSurvivalReporter_1 = require("./editSurvivalReporter");
exports.IEditSurvivalTrackerService = (0, instantiation_1.createDecorator)('IEditSurvivalTrackerService');
class NullEditSurvivalTrackingSession {
    collectAIEdits() { }
    startReporter() { }
    cancel() { }
}
exports.NullEditSurvivalTrackingSession = NullEditSurvivalTrackingSession;
class NullEditSurvivalTrackerService {
    initialize(document) {
        return new NullEditSurvivalTrackingSession();
    }
}
exports.NullEditSurvivalTrackerService = NullEditSurvivalTrackerService;
let EditSurvivalTrackerService = class EditSurvivalTrackerService {
    constructor(_instantiationService, _logService) {
        this._instantiationService = _instantiationService;
        this._logService = _logService;
    }
    initialize(document) {
        const editCollector = this._instantiationService.createInstance(editCollector_1.EditCollector, document.getText());
        let reporter;
        return {
            collectAIEdits: (edits) => {
                try {
                    editCollector.addEdits(Array.isArray(edits) ? edits : [edits]);
                }
                catch (error) {
                    this._logService.error("[EditSurvivalTrackerService] Error while collecting edits", error);
                }
            },
            startReporter: (sendTelemetryEvent) => {
                const userEditComputer = this._instantiationService.createInstance(editComputer_1.EditComputer, editCollector.getText(), document);
                (async () => {
                    try {
                        const [aiEdits, userEditsResult] = await Promise.all([editCollector.getEdits(), userEditComputer.compute()]);
                        const userEdits = userEditsResult.getEditsSinceInitial();
                        reporter = this._instantiationService.createInstance(editSurvivalReporter_1.EditSurvivalReporter, document, editCollector.initialText, aiEdits, userEdits, {}, sendTelemetryEvent);
                    }
                    finally {
                        userEditComputer.dispose();
                    }
                })();
            },
            cancel: () => {
                reporter?.cancel();
            }
        };
    }
};
exports.EditSurvivalTrackerService = EditSurvivalTrackerService;
exports.EditSurvivalTrackerService = EditSurvivalTrackerService = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, logService_1.ILogService)
], EditSurvivalTrackerService);
//# sourceMappingURL=editSurvivalTrackerService.js.map