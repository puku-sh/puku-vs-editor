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
exports.CodeRefEngagementTracker = void 0;
const vscode_1 = require("vscode");
const lifecycle_1 = require("../../../../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const telemetryHandlers_1 = require("../../../lib/src/snippy/telemetryHandlers");
const outputChannel_1 = require("./outputChannel");
let CodeRefEngagementTracker = class CodeRefEngagementTracker extends lifecycle_1.Disposable {
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.activeLog = false;
        this.onActiveEditorChange = (editor) => {
            if (this.isOutputLog(editor)) {
                telemetryHandlers_1.copilotOutputLogTelemetry.handleFocus({ instantiationService: this.instantiationService });
            }
        };
        this.onVisibleEditorsChange = (currEditors) => {
            const copilotLog = currEditors.find(e => this.isOutputLog(e));
            if (this.activeLog) {
                if (!copilotLog) {
                    this.activeLog = false;
                }
            }
            else if (copilotLog) {
                this.activeLog = true;
                telemetryHandlers_1.copilotOutputLogTelemetry.handleOpen({ instantiationService: this.instantiationService });
            }
        };
        this.isOutputLog = (editor) => {
            return (editor && editor.document.uri.scheme === 'output' && editor.document.uri.path.includes(outputChannel_1.citationsChannelName));
        };
        this._register(vscode_1.window.onDidChangeActiveTextEditor((e) => this.onActiveEditorChange(e)));
        this._register(vscode_1.window.onDidChangeVisibleTextEditors((e) => this.onVisibleEditorsChange(e)));
    }
    get logVisible() {
        return this.activeLog;
    }
};
exports.CodeRefEngagementTracker = CodeRefEngagementTracker;
exports.CodeRefEngagementTracker = CodeRefEngagementTracker = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], CodeRefEngagementTracker);
//# sourceMappingURL=codeReferenceEngagementTracker.js.map