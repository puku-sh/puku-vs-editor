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
exports.LoggingCitationManager = void 0;
const vscode_1 = require("vscode");
const _1 = require(".");
const authentication_1 = require("../../../../../../platform/authentication/common/authentication");
const lifecycle_1 = require("../../../../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const copilotTokenNotifier_1 = require("../../../lib/src/auth/copilotTokenNotifier");
const constants_1 = require("../../../lib/src/snippy/constants");
const telemetryHandlers_1 = require("../../../lib/src/snippy/telemetryHandlers");
const matchNotifier_1 = require("./matchNotifier");
const outputChannel_1 = require("./outputChannel");
/**
 * Citation manager that logs citations to the VS Code log. On the first citation encountered,
 * the user gets a notification.
 */
let LoggingCitationManager = class LoggingCitationManager extends lifecycle_1.Disposable {
    constructor(instantiationService, authenticationService) {
        super();
        this.instantiationService = instantiationService;
        this.codeReference = this._register(this.instantiationService.createInstance(_1.CodeReference));
        const disposable = (0, copilotTokenNotifier_1.onCopilotToken)(authenticationService, _ => {
            if (this.logger) {
                return;
            }
            this.logger = instantiationService.createInstance(outputChannel_1.GitHubCopilotLogger);
            const initialNotificationCommand = vscode_1.commands.registerCommand(constants_1.OutputPaneShowCommand, () => this.logger?.forceShow());
            this.codeReference.addDisposable(initialNotificationCommand);
        });
        this.codeReference.addDisposable(disposable);
    }
    register() {
        return this.codeReference.register();
    }
    async handleIPCodeCitation(citation) {
        if (!this.codeReference.enabled || !this.logger || citation.details.length === 0) {
            return;
        }
        const start = citation.location?.start;
        const matchLocation = start ? `[Ln ${start.line + 1}, Col ${start.character + 1}]` : 'Location not available';
        const shortenedMatchText = `${citation.matchingText
            ?.slice(0, 100)
            .replace(/[\r\n\t]+|^[ \t]+/gm, ' ')
            .trim()}...`;
        this.logger.info(citation.inDocumentUri, `Similar code at `, matchLocation, shortenedMatchText);
        for (const detail of citation.details) {
            const { license, url } = detail;
            this.logger.info(`License: ${license.replace('NOASSERTION', 'unknown')}, URL: ${url}`);
        }
        telemetryHandlers_1.copilotOutputLogTelemetry.handleWrite({ instantiationService: this.instantiationService });
        await this.instantiationService.invokeFunction(matchNotifier_1.notify);
    }
};
exports.LoggingCitationManager = LoggingCitationManager;
exports.LoggingCitationManager = LoggingCitationManager = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, authentication_1.IAuthenticationService)
], LoggingCitationManager);
//# sourceMappingURL=citationManager.js.map