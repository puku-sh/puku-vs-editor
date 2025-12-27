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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatService } from '../../common/chatService.js';
import { isResponseVM } from '../../common/chatViewModel.js';
import { IChatWidgetService } from '../chat.js';
import { SimpleChatConfirmationWidget } from './chatConfirmationWidget.js';
let ChatConfirmationContentPart = class ChatConfirmationContentPart extends Disposable {
    constructor(confirmation, context, instantiationService, chatService, chatWidgetService) {
        super();
        this.instantiationService = instantiationService;
        this.chatService = chatService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        const element = context.element;
        const buttons = confirmation.buttons
            ? confirmation.buttons.map(button => ({
                label: button,
                data: confirmation.data,
                isSecondary: button !== confirmation.buttons?.[0],
            }))
            : [
                { label: localize('accept', "Accept"), data: confirmation.data },
                { label: localize('dismiss', "Dismiss"), data: confirmation.data, isSecondary: true },
            ];
        const confirmationWidget = this._register(this.instantiationService.createInstance(SimpleChatConfirmationWidget, context, { title: confirmation.title, buttons, message: confirmation.message, silent: confirmation.isLive === false }));
        confirmationWidget.setShowButtons(!confirmation.isUsed);
        this._register(confirmationWidget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this._register(confirmationWidget.onDidClick(async (e) => {
            if (isResponseVM(element)) {
                const prompt = `${e.label}: "${confirmation.title}"`;
                const options = e.isSecondary ?
                    { rejectedConfirmationData: [e.data] } :
                    { acceptedConfirmationData: [e.data] };
                options.agentId = element.agent?.id;
                options.slashCommand = element.slashCommand?.name;
                options.confirmation = e.label;
                const widget = chatWidgetService.getWidgetBySessionResource(element.sessionResource);
                options.userSelectedModelId = widget?.input.currentLanguageModel;
                options.modeInfo = widget?.input.currentModeInfo;
                options.location = widget?.location;
                Object.assign(options, widget?.getModeRequestOptions());
                if (await this.chatService.sendRequest(element.sessionResource, prompt, options)) {
                    confirmation.isUsed = true;
                    confirmationWidget.setShowButtons(false);
                    this._onDidChangeHeight.fire();
                }
            }
        }));
        this.domNode = confirmationWidget.domNode;
    }
    hasSameContent(other) {
        // No other change allowed for this content type
        return other.kind === 'confirmation';
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatConfirmationContentPart = __decorate([
    __param(2, IInstantiationService),
    __param(3, IChatService),
    __param(4, IChatWidgetService)
], ChatConfirmationContentPart);
export { ChatConfirmationContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbmZpcm1hdGlvbkNvbnRlbnRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdENvbmZpcm1hdGlvbkNvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8sRUFBOEMsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzdELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNoRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUdwRSxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUE0QixTQUFRLFVBQVU7SUFNMUQsWUFDQyxZQUErQixFQUMvQixPQUFzQyxFQUNmLG9CQUE0RCxFQUNyRSxXQUEwQyxFQUNwQyxpQkFBcUM7UUFFekQsS0FBSyxFQUFFLENBQUM7UUFKZ0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNwRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQVB4Qyx1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUMxRCxzQkFBaUIsR0FBRyxJQUFJ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