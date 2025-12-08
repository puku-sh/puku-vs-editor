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
var SnippyNotifier_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnippyNotifier = void 0;
const uri_1 = require("../../../util/vs/base/common/uri");
const envService_1 = require("../../env/common/envService");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const logService_1 = require("../../log/common/logService");
const notificationService_1 = require("../../notification/common/notificationService");
let SnippyNotifier = class SnippyNotifier {
    static { SnippyNotifier_1 = this; }
    static { this.matchCodeMessage = 'We found a reference to public code in a recent suggestion. To learn more about public code references, review the [documentation](https://aka.ms/github-copilot-match-public-code).'; }
    static { this.MatchAction = 'View Reference'; }
    static { this.SettingAction = 'Change Setting'; }
    static { this.CodeReferenceKey = 'copilot.chat.codeReference.notified'; }
    constructor(notificationService, context, logService, envService) {
        this.notificationService = notificationService;
        this.context = context;
        this.logService = logService;
        this.envService = envService;
    }
    notify() {
        const didNotify = this.context.globalState.get(SnippyNotifier_1.CodeReferenceKey);
        if (didNotify) {
            return;
        }
        const messageItems = [SnippyNotifier_1.MatchAction, SnippyNotifier_1.SettingAction];
        void this.notificationService.showInformationMessage(SnippyNotifier_1.matchCodeMessage, ...messageItems).then(action => {
            switch (action) {
                case SnippyNotifier_1.MatchAction: {
                    this.logService.show(true);
                    break;
                }
                case SnippyNotifier_1.SettingAction: {
                    this.envService.openExternal(uri_1.URI.parse('https://aka.ms/github-copilot-settings'));
                    break;
                }
                case undefined: {
                    break;
                }
            }
        });
        this.context.globalState.update(SnippyNotifier_1.CodeReferenceKey, true);
    }
};
exports.SnippyNotifier = SnippyNotifier;
exports.SnippyNotifier = SnippyNotifier = SnippyNotifier_1 = __decorate([
    __param(0, notificationService_1.INotificationService),
    __param(1, extensionContext_1.IVSCodeExtensionContext),
    __param(2, logService_1.ILogService),
    __param(3, envService_1.IEnvService)
], SnippyNotifier);
//# sourceMappingURL=snippyNotifier.js.map