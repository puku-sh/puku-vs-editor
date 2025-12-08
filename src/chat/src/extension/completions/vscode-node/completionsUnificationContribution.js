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
exports.CompletionsUnificationContribution = void 0;
exports.unificationStateObservable = unificationStateObservable;
const vscode_1 = require("vscode");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const observableInternal_1 = require("../../../util/vs/base/common/observableInternal");
let CompletionsUnificationContribution = class CompletionsUnificationContribution extends lifecycle_1.Disposable {
    constructor(telemetryService) {
        super();
        const unificationState = unificationStateObservable(this);
        this._register((0, observableInternal_1.autorun)(reader => {
            const state = unificationState.read(reader);
            telemetryService.setAdditionalExpAssignments(state?.expAssignments ?? []);
        }));
    }
};
exports.CompletionsUnificationContribution = CompletionsUnificationContribution;
exports.CompletionsUnificationContribution = CompletionsUnificationContribution = __decorate([
    __param(0, telemetry_1.ITelemetryService)
], CompletionsUnificationContribution);
function unificationStateObservable(owner) {
    return (0, observableInternal_1.observableFromEvent)(owner, l => vscode_1.languages.onDidChangeCompletionsUnificationState?.(l) ?? lifecycle_1.Disposable.None, () => vscode_1.languages.inlineCompletionsUnificationState);
}
//# sourceMappingURL=completionsUnificationContribution.js.map