"use strict";
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
exports.ChatQuotaContribution = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_1 = require("vscode");
const chatQuotaService_1 = require("../../../platform/chat/common/chatQuotaService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
let ChatQuotaContribution = class ChatQuotaContribution extends lifecycle_1.Disposable {
    constructor(chatQuotaService) {
        super();
        this.id = 'chat.quota';
        this._register(vscode_1.commands.registerCommand('chat.enablePremiumOverages', () => {
            // Clear quota before opening the page to ensure that if the user enabled overages,
            // the next request they send won't try to downgrade them to the base model.
            chatQuotaService.clearQuota();
            vscode_1.env.openExternal(vscode_1.Uri.parse('https://aka.ms/github-copilot-manage-overage'));
        }));
    }
};
exports.ChatQuotaContribution = ChatQuotaContribution;
exports.ChatQuotaContribution = ChatQuotaContribution = __decorate([
    __param(0, chatQuotaService_1.IChatQuotaService)
], ChatQuotaContribution);
//# sourceMappingURL=chatQuota.contribution.js.map