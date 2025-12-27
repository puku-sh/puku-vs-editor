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
import { isMarkdownString, MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { IChatAccessibilityService } from '../chat.js';
import { AcceptElicitationRequestActionId } from '../actions/chatElicitationActions.js';
import { ChatConfirmationWidget } from './chatConfirmationWidget.js';
let ChatElicitationContentPart = class ChatElicitationContentPart extends Disposable {
    get codeblocks() {
        return this._confirmWidget.codeblocks;
    }
    get codeblocksPartId() {
        return this._confirmWidget.codeblocksPartId;
    }
    constructor(elicitation, context, instantiationService, chatAccessibilityService, contextKeyService, keybindingService) {
        super();
        this.elicitation = elicitation;
        this.instantiationService = instantiationService;
        this.chatAccessibilityService = chatAccessibilityService;
        this.contextKeyService = contextKeyService;
        this.keybindingService = keybindingService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        const buttons = [];
        if (elicitation.kind === 'elicitation2') {
            const acceptKeybinding = this.keybindingService.lookupKeybinding(AcceptElicitationRequestActionId);
            const acceptTooltip = acceptKeybinding ? `${elicitation.acceptButtonLabel} (${acceptKeybinding.getLabel()})` : elicitation.acceptButtonLabel;
            buttons.push({
                label: elicitation.acceptButtonLabel,
                tooltip: acceptTooltip,
                data: true,
                moreActions: elicitation.moreActions?.map((action) => ({
                    label: action.label,
                    data: action,
                    run: action.run
                }))
            });
            if (elicitation.rejectButtonLabel && elicitation.reject) {
                buttons.push({ label: elicitation.rejectButtonLabel, data: false, isSecondary: true });
            }
            this._register(autorun(reader => {
                if (elicitation.isHidden?.read(reader)) {
                    this.domNode.remove();
                }
            }));
            const hasElicitationKey = ChatContextKeys.Editing.hasElicitationRequest.bindTo(this.contextKeyService);
            this._register(autorun(reader => {
                hasElicitationKey.set(elicitation.state.read(reader) === "pending" /* ElicitationState.Pending */);
            }));
            this._register(toDisposable(() => hasElicitationKey.reset()));
            this.chatAccessibilityService.acceptElicitation(elicitation);
        }
        const confirmationWidget = this._register(this.instantiationService.createInstance(ChatConfirmationWidget, context, {
            title: elicitation.title,
            subtitle: elicitation.subtitle,
            buttons,
            message: this.getMessageToRender(elicitation),
            toolbarData: { partType: 'elicitation', partSource: elicitation.source?.type, arg: elicitation },
        }));
        this._confirmWidget = confirmationWidget;
        confirmationWidget.setShowButtons(elicitation.kind === 'elicitation2' && elicitation.state.get() === "pending" /* ElicitationState.Pending */);
        this._register(confirmationWidget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this._register(confirmationWidget.onDidClick(async (e) => {
            if (elicitation.kind !== 'elicitation2') {
                return;
            }
            let result;
            if (typeof e.data === 'boolean' && e.data === true) {
                result = e.data;
            }
            else if (e.data && typeof e.data === 'object' && 'run' in e.data && 'label' in e.data) {
                result = e.data;
            }
            else {
                result = undefined;
            }
            if (result !== undefined) {
                await elicitation.accept(result);
            }
            else if (elicitation.reject) {
                await elicitation.reject();
            }
            confirmationWidget.setShowButtons(false);
            confirmationWidget.updateMessage(this.getMessageToRender(elicitation));
            this._onDidChangeHeight.fire();
        }));
        this.domNode = confirmationWidget.domNode;
        this.domNode.tabIndex = 0;
        const messageToRender = this.getMessageToRender(elicitation);
        this.domNode.ariaLabel = elicitation.title + ' ' + (typeof messageToRender === 'string' ? messageToRender : messageToRender.value || '');
    }
    getMessageToRender(elicitation) {
        if (!elicitation.acceptedResult) {
            return elicitation.message;
        }
        const messageMd = isMarkdownString(elicitation.message) ? MarkdownString.lift(elicitation.message) : new MarkdownString(elicitation.message);
        messageMd.appendCodeblock('json', JSON.stringify(elicitation.acceptedResult, null, 2));
        return messageMd;
    }
    hasSameContent(other) {
        // No other change allowed for this content type
        return other === this.elicitation;
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatElicitationContentPart = __decorate([
    __param(2, IInstantiationService),
    __param(3, IChatAccessibilityService),
    __param(4, IContextKeyService),
    __param(5, IKeybindingService)
], ChatElicitationContentPart);
export { ChatElicitationContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVsaWNpdGF0aW9uQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0RWxpY2l0YXRpb25Db250ZW50UGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFtQixnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM5RyxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUU3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFbEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBMkIsTUFBTSw2QkFBNkIsQ0FBQztBQUl2RixJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLFVBQVU7SUFRekQsSUFBVyxVQUFVO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUM7SUFDdkMsQ0FBQztJQUVELElB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