/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { raceTimeout } from '../../../../base/common/async.js';
import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IChatWidgetService } from '../../chat/browser/chat.js';
import { IChatService } from '../../chat/common/chatService.js';
export const IInlineChatSessionService = createDecorator('IInlineChatSessionService');
export async function moveToPanelChat(accessor, model, resend) {
    const chatService = accessor.get(IChatService);
    const widgetService = accessor.get(IChatWidgetService);
    const widget = await widgetService.revealWidget();
    if (widget && widget.viewModel && model) {
        let lastRequest;
        for (const request of model.getRequests().slice()) {
            await chatService.adoptRequest(widget.viewModel.model.sessionResource, request);
            lastRequest = request;
        }
        if (lastRequest && resend) {
            chatService.resendRequest(lastRequest, { location: widget.location });
        }
        widget.focusResponseItem();
    }
}
export async function askInPanelChat(accessor, model) {
    const widgetService = accessor.get(IChatWidgetService);
    const widget = await widgetService.revealWidget();
    if (!widget) {
        return;
    }
    if (!widget.viewModel) {
        await raceTimeout(Event.toPromise(widget.onDidChangeViewModel), 1000);
    }
    if (model.attachedContext) {
        widget.attachmentModel.addContext(...model.attachedContext);
    }
    widget.acceptInput(model.message.text, {
        enableImplicitContext: true,
        isVoiceInput: false,
        noCommandDetection: true
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFNlc3Npb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC9icm93c2VyL2lubGluZUNoYXRTZXNzaW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBT3pELE9BQU8sRUFBRSxlQUFlLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDL0csT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFHaEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBT2hFLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGVBQWUsQ0FBNEIsMkJBQTJCLENBQUMsQ0FBQztBQWlEakgsTUFBTSxDQUFDLEtBQUssVUFBVSxlQUFlLENBQUMsUUFBMEIsRUFBRSxLQUE2QixFQUFFLE1BQWU7SUFFL0csTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMvQyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFFdkQsTUFBTSxNQUFNLEdBQUcsTUFBTSxhQUFhLENBQUMsWUFBWSxFQUFFLENBQUM7SUFFbEQsSUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLFNBQVMsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUN6QyxJQUFJLFdBQTBDLENBQUM7UUFDL0MsS0FBSyxNQUFNLE9BQU8sSUFBSSxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUNuRCxNQUFNLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ2hGLFdBQVcsR0FBRyxPQUFPLENBQUM7UUFDdkIsQ0FBQztRQUVELElBQUksV0FBVyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzNCLFdBQVcsQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7UUFFRCxNQUFNLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUM1QixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsY0FBYyxDQUFDLFFBQTBCLEVBQUUsS0FBd0I7SUFFeEYsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBRXZELE1BQU0sTUFBTSxHQUFHLE1BQU0sYUFBYSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBRWxELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE9BQU87SUFDUixDQUFDO0lBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN2QixNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFRCxJQUFJLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUMzQixNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRTtRQUN0QyxxQkFBcUIsRUFBRSxJQUFJO1FBQzNCLFlBQVksRUFBRSxLQUFLO1FBQ25CLGtCQUFrQixFQUFFLElBQUk7S0FDeEIsQ0FBQyxDQUFDO0FBQ0osQ0FBQyJ9