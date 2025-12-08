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
exports.GitHubCopilotLogger = exports.citationsChannelName = void 0;
const vscode_1 = require("vscode");
const authentication_1 = require("../../../../../../platform/authentication/common/authentication");
const lifecycle_1 = require("../../../../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const copilotTokenNotifier_1 = require("../../../lib/src/auth/copilotTokenNotifier");
exports.citationsChannelName = 'GitHub Copilot Log (Code References)';
// Literally taken from VS Code
function getCurrentTimestamp() {
    const toTwoDigits = (v) => (v < 10 ? `0${v}` : v);
    const toThreeDigits = (v) => (v < 10 ? `00${v}` : v < 100 ? `0${v}` : v);
    const currentTime = new Date();
    return `${currentTime.getFullYear()}-${toTwoDigits(currentTime.getMonth() + 1)}-${toTwoDigits(currentTime.getDate())} ${toTwoDigits(currentTime.getHours())}:${toTwoDigits(currentTime.getMinutes())}:${toTwoDigits(currentTime.getSeconds())}.${toThreeDigits(currentTime.getMilliseconds())}`;
}
class CodeReferenceOutputChannel {
    constructor(output) {
        this.output = output;
    }
    info(...messages) {
        this.output.appendLine(`${getCurrentTimestamp()} [info] ${messages.join(' ')}`);
    }
    show(preserveFocus) {
        this.output.show(preserveFocus);
    }
    dispose() {
        this.output.dispose();
    }
}
let GitHubCopilotLogger = class GitHubCopilotLogger extends lifecycle_1.Disposable {
    constructor(instantiationService, authenticationService) {
        super();
        this.output = this._register(new lifecycle_1.MutableDisposable());
        this.checkCopilotToken = (token) => {
            if (token.codeQuoteEnabled) {
                this.createChannel();
            }
            else {
                this.removeChannel();
            }
        };
        this._register((0, copilotTokenNotifier_1.onCopilotToken)(authenticationService, t => this.checkCopilotToken(t)));
        this.createChannel();
    }
    log(type, ...messages) {
        const output = this.createChannel();
        const [base, ...rest] = messages;
        output[type](base, ...rest);
    }
    info(...messages) {
        this.log('info', ...messages);
    }
    forceShow() {
        // Preserve focus in the editor
        this.getChannel()?.show(true);
    }
    createChannel() {
        if (this.output.value) {
            return this.output.value;
        }
        this.output.value = new CodeReferenceOutputChannel(vscode_1.window.createOutputChannel(exports.citationsChannelName, 'code-referencing'));
        return this.output.value;
    }
    getChannel() {
        return this.output.value;
    }
    removeChannel() {
        this.output.value = undefined;
    }
};
exports.GitHubCopilotLogger = GitHubCopilotLogger;
exports.GitHubCopilotLogger = GitHubCopilotLogger = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, authentication_1.IAuthenticationService)
], GitHubCopilotLogger);
//# sourceMappingURL=outputChannel.js.map