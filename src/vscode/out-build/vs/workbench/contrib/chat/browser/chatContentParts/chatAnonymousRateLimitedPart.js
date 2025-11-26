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
import { $, append } from '../../../../../base/browser/dom.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IChatEntitlementService } from '../../../../services/chat/common/chatEntitlementService.js';
let ChatAnonymousRateLimitedPart = class ChatAnonymousRateLimitedPart extends Disposable {
    constructor(content, commandService, telemetryService, chatEntitlementService) {
        super();
        this.content = content;
        this.domNode = $('.chat-rate-limited-widget');
        const icon = append(this.domNode, $('span'));
        icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.info));
        const messageContainer = append(this.domNode, $('.chat-rate-limited-message'));
        const message = append(messageContainer, $('div'));
        message.textContent = localize(5513, null);
        const signInButton = this._register(new Button(messageContainer, { ...defaultButtonStyles, supportIcons: true }));
        signInButton.label = localize(5514, null);
        signInButton.element.classList.add('chat-rate-limited-button');
        this._register(signInButton.onDidClick(async () => {
            const commandId = 'workbench.action.chat.triggerSetup';
            telemetryService.publicLog2('workbenchActionExecuted', { id: commandId, from: 'chat-response' });
            await commandService.executeCommand(commandId);
        }));
    }
    hasSameContent(other) {
        return other.kind === this.content.kind && !!other.errorDetails.isRateLimited;
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatAnonymousRateLimitedPart = __decorate([
    __param(1, ICommandService),
    __param(2, ITelemetryService),
    __param(3, IChatEntitlementService)
], ChatAnonymousRateLimitedPart);
export { ChatAnonymousRateLimitedPart };
//# sourceMappingURL=chatAnonymousRateLimitedPart.js.map