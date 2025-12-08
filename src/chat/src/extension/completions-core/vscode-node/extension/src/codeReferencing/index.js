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
exports.CodeReference = void 0;
const vscode_1 = require("vscode");
const authentication_1 = require("../../../../../../platform/authentication/common/authentication");
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const copilotTokenNotifier_1 = require("../../../lib/src/auth/copilotTokenNotifier");
const logger_1 = require("../../../lib/src/logger");
const logger_2 = require("../../../lib/src/snippy/logger");
const runtimeMode_1 = require("../../../lib/src/util/runtimeMode");
const codeReferenceEngagementTracker_1 = require("./codeReferenceEngagementTracker");
let CodeReference = class CodeReference {
    constructor(_instantiationService, _runtimeMode, _logTarget, _authenticationService) {
        this._instantiationService = _instantiationService;
        this._runtimeMode = _runtimeMode;
        this._logTarget = _logTarget;
        this._authenticationService = _authenticationService;
        this.enabled = false;
        this.onCopilotToken = (token) => {
            this.enabled = token.codeQuoteEnabled || false;
            if (!token.codeQuoteEnabled) {
                this.subscriptions?.dispose();
                this.subscriptions = undefined;
                logger_2.codeReferenceLogger.debug(this._logTarget, 'Public code references are disabled.');
                return;
            }
            logger_2.codeReferenceLogger.info(this._logTarget, 'Public code references are enabled.');
            this.addDisposable(this._instantiationService.createInstance(codeReferenceEngagementTracker_1.CodeRefEngagementTracker));
        };
    }
    dispose() {
        this.subscriptions?.dispose();
        this.event?.dispose();
    }
    register() {
        if (!this._runtimeMode.isRunningInTest()) {
            this.event = (0, copilotTokenNotifier_1.onCopilotToken)(this._authenticationService, (t) => this.onCopilotToken(t));
        }
        return this;
    }
    addDisposable(disposable) {
        if (!this.subscriptions) {
            this.subscriptions = vscode_1.Disposable.from(disposable);
        }
        else {
            this.subscriptions = vscode_1.Disposable.from(this.subscriptions, disposable);
        }
    }
};
exports.CodeReference = CodeReference;
exports.CodeReference = CodeReference = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, runtimeMode_1.ICompletionsRuntimeModeService),
    __param(2, logger_1.ICompletionsLogTargetService),
    __param(3, authentication_1.IAuthenticationService)
], CodeReference);
//# sourceMappingURL=index.js.map