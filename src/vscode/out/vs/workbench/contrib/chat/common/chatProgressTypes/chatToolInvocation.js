/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { encodeBase64 } from '../../../../../base/common/buffer.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { localize } from '../../../../../nls.js';
import { IChatToolInvocation } from '../chatService.js';
import { isToolResultOutputDetails } from '../languageModelToolsService.js';
export class ChatToolInvocation {
    get state() {
        return this._state;
    }
    constructor(preparedInvocation, toolData, toolCallId, fromSubAgent, parameters) {
        this.toolCallId = toolCallId;
        this.kind = 'toolInvocation';
        this._progress = observableValue(this, { progress: 0 });
        const defaultMessage = localize('toolInvocationMessage', "Using {0}", `"${toolData.displayName}"`);
        const invocationMessage = preparedInvocation?.invocationMessage ?? defaultMessage;
        this.invocationMessage = invocationMessage;
        this.pastTenseMessage = preparedInvocation?.pastTenseMessage;
        this.originMessage = preparedInvocation?.originMessage;
        this.confirmationMessages = preparedInvocation?.confirmationMessages;
        this.presentation = preparedInvocation?.presentation;
        this.toolSpecificData = preparedInvocation?.toolSpecificData;
        this.toolId = toolData.id;
        this.source = toolData.source;
        this.fromSubAgent = fromSubAgent;
        this.parameters = parameters;
        if (!this.confirmationMessages?.title) {
            this._state = observableValue(this, { type: 1 /* IChatToolInvocation.StateKind.Executing */, confirmed: { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */ }, progress: this._progress });
        }
        else {
            this._state = observableValue(this, {
                type: 0 /* IChatToolInvocation.StateKind.WaitingForConfirmation */,
                confirm: reason => {
                    if (reason.type === 0 /* ToolConfirmKind.Denied */ || reason.type === 5 /* ToolConfirmKind.Skipped */) {
                        this._state.set({ type: 4 /* IChatToolInvocation.StateKind.Cancelled */, reason: reason.type }, undefined);
                    }
                    else {
                        this._state.set({ type: 1 /* IChatToolInvocation.StateKind.Executing */, confirmed: reason, progress: this._progress }, undefined);
                    }
                }
            });
        }
    }
    _setCompleted(result, postConfirmed) {
        if (postConfirmed && (postConfirmed.type === 0 /* ToolConfirmKind.Denied */ || postConfirmed.type === 5 /* ToolConfirmKind.Skipped */)) {
            this._state.set({ type: 4 /* IChatToolInvocation.StateKind.Cancelled */, reason: postConfirmed.type }, undefined);
            return;
        }
        this._state.set({
            type: 3 /* IChatToolInvocation.StateKind.Completed */,
            confirmed: IChatToolInvocation.executionConfirmedOrDenied(this) || { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */ },
            resultDetails: result?.toolResultDetails,
            postConfirmed,
            contentForModel: result?.content || [],
        }, undefined);
    }
    didExecuteTool(result, final) {
        if (result?.toolResultMessage) {
            this.pastTenseMessage = result.toolResultMessage;
        }
        else if (this._progress.get().message) {
            this.pastTenseMessage = this._progress.get().message;
        }
        if (this.confirmationMessages?.confirmResults && !result?.toolResultError && result?.confirmResults !== false && !final) {
            this._state.set({
                type: 2 /* IChatToolInvocation.StateKind.WaitingForPostApproval */,
                confirmed: IChatToolInvocation.executionConfirmedOrDenied(this) || { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */ },
                resultDetails: result?.toolResultDetails,
                contentForModel: result?.content || [],
                confirm: reason => this._setCompleted(result, reason),
            }, undefined);
        }
        else {
            this._setCompleted(result);
        }
        return this._state.get();
    }
    acceptProgress(step) {
        const prev = this._progress.get();
        this._progress.set({
            progress: step.progress || prev.progress || 0,
            message: step.message,
        }, undefined);
    }
    toJSON() {
        // persist the serialized call as 'skipped' if we were waiting for postapproval
        const waitingForPostApproval = this.state.get().type === 2 /* IChatToolInvocation.StateKind.WaitingForPostApproval */;
        const details = waitingForPostApproval ? undefined : IChatToolInvocation.resultDetails(this);
        return {
            kind: 'toolInvocationSerialized',
            presentation: this.presentation,
            invocationMessage: this.invocationMessage,
            pastTenseMessage: this.pastTenseMessage,
            originMessage: this.originMessage,
            isConfirmed: waitingForPostApproval ? { type: 5 /* ToolConfirmKind.Skipped */ } : IChatToolInvocation.executionConfirmedOrDenied(this),
            isComplete: true,
            source: this.source,
            resultDetails: isToolResultOutputDetails(details)
                ? { output: { type: 'data', mimeType: details.output.mimeType, base64Data: encodeBase64(details.output.value) } }
                : details,
            toolSpecificData: this.toolSpecificData,
            toolCallId: this.toolCallId,
            toolId: this.toolId,
            fromSubAgent: this.fromSubAgent,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xJbnZvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFByb2dyZXNzVHlwZXMvY2hhdFRvb2xJbnZvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVwRSxPQUFPLEVBQW9DLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzdHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQStGLG1CQUFtQixFQUF3RixNQUFNLG1CQUFtQixDQUFDO0FBQzNPLE9BQU8sRUFBMkIseUJBQXlCLEVBQXdGLE1BQU0saUNBQWlDLENBQUM7QUFFM0wsTUFBTSxPQUFPLGtCQUFrQjtJQWtCOUIsSUFBVyxLQUFLO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFHRCxZQUFZLGtCQUF1RCxFQUFFLFFBQW1CLEVBQWtCLFVBQWtCLEVBQUUsWUFBaUMsRUFBRSxVQUFtQjtRQUExRSxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBdEI1RyxTQUFJLEdBQXFCLGdCQUFnQixDQUFDO1FBY3pDLGNBQVMsR0FBRyxlQUFlLENBQXVFLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBU3pJLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxRQUFRLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztRQUNuRyxNQUFNLGlCQUFpQixHQUFHLGtCQUFrQixFQUFFLGlCQUFpQixJQUFJLGNBQWMsQ0FBQztRQUNsRixJQUFJLENBQUMsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUM7UUFDM0MsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGtCQUFrQixFQUFFLGdCQUFnQixDQUFDO1FBQzdELElBQUksQ0FBQyxhQUFhLEdBQUcsa0JBQWtCLEVBQUUsYUFBYSxDQUFDO1FBQ3ZELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxrQkFBa0IsRUFBRSxvQkFBb0IsQ0FBQztRQUNyRSxJQUFJLENBQUMsWUFBWSxHQUFHLGtCQUFrQixFQUFFLFlBQVksQ0FBQztRQUNyRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsa0JBQWtCLEVBQUUsZ0JBQWdCLENBQUM7UUFDN0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQzFCLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUM5QixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUNqQyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUU3QixJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEtBQUssRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxNQUFNLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksaURBQXlDLEVBQUUsU0FBUyxFQUFFLEVBQUUsSUFBSSwrQ0FBdUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUM5SyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxNQUFNLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRTtnQkFDbkMsSUFBSSw4REFBc0Q7Z0JBQzFELE9BQU8sRUFBRSxNQUFNLENBQUMsRUFBRTtvQkFDakIsSUFBSSxNQUFNLENBQUMsSUFBSSxtQ0FBMkIsSUFBSSxNQUFNLENBQUMsSUFBSSxvQ0FBNEIsRUFBRSxDQUFDO3dCQUN2RixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksaURBQXlDLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDcEcsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxpREFBeUMsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQzVILENBQUM7Z0JBQ0YsQ0FBQzthQUNELENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0lBRU8sYUFBYSxDQUFDLE1BQStCLEVBQUUsYUFBMkM7UUFDakcsSUFBSSxhQUFhLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxtQ0FBMkIsSUFBSSxhQUFhLENBQUMsSUFBSSxvQ0FBNEIsQ0FBQyxFQUFFLENBQUM7WUFDeEgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLGlEQUF5QyxFQUFFLE1BQU0sRUFBRSxhQUFhLENBQUMsSUFBSSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUcsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztZQUNmLElBQUksaURBQXlDO1lBQzdDLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksK0NBQXVDLEVBQUU7WUFDbEgsYUFBYSxFQUFFLE1BQU0sRUFBRSxpQkFBaUI7WUFDeEMsYUFBYTtZQUNiLGVBQWUsRUFBRSxNQUFNLEVBQUUsT0FBTyxJQUFJLEVBQUU7U0FDdEMsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNmLENBQUM7SUFFTSxjQUFjLENBQUMsTUFBK0IsRUFBRSxLQUFlO1FBQ3JFLElBQUksTUFBTSxFQUFFLGlCQUFpQixFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQztRQUNsRCxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQztRQUN0RCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsY0FBYyxJQUFJLENBQUMsTUFBTSxFQUFFLGVBQWUsSUFBSSxNQUFNLEVBQUUsY0FBYyxLQUFLLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3pILElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO2dCQUNmLElBQUksOERBQXNEO2dCQUMxRCxTQUFTLEVBQUUsbUJBQW1CLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLCtDQUF1QyxFQUFFO2dCQUNsSCxhQUFhLEVBQUUsTUFBTSxFQUFFLGlCQUFpQjtnQkFDeEMsZUFBZSxFQUFFLE1BQU0sRUFBRSxPQUFPLElBQUksRUFBRTtnQkFDdEMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO2FBQ3JELEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDZixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU0sY0FBYyxDQUFDLElBQXVCO1FBQzVDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDbEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUM7WUFDbEIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDO1lBQzdDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztTQUNyQixFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ2YsQ0FBQztJQUVNLE1BQU07UUFDWiwrRUFBK0U7UUFDL0UsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksaUVBQXlELENBQUM7UUFDOUcsTUFBTSxPQUFPLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTdGLE9BQU87WUFDTixJQUFJLEVBQUUsMEJBQTBCO1lBQ2hDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtZQUMvQixpQkFBaUIsRUFBRSxJQUFJLENBQUMsaUJBQWlCO1lBQ3pDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxnQkFBZ0I7WUFDdkMsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQ2pDLFdBQVcsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLGlDQUF5QixFQUFFLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQztZQUM5SCxVQUFVLEVBQUUsSUFBSTtZQUNoQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsYUFBYSxFQUFFLHlCQUF5QixDQUFDLE9BQU8sQ0FBQztnQkFDaEQsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUU7Z0JBQ2pILENBQUMsQ0FBQyxPQUFPO1lBQ1YsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtZQUN2QyxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7WUFDM0IsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtTQUMvQixDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=