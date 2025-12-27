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
import { URI } from '../../../../base/common/uri.js';
import { isLocation } from '../../../../editor/common/languages.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ChatAgentVoteDirection, ChatCopyKind } from './chatService.js';
import { isImageVariableEntry } from './chatVariableEntries.js';
import { ILanguageModelsService } from './languageModels.js';
let ChatServiceTelemetry = class ChatServiceTelemetry {
    constructor(telemetryService) {
        this.telemetryService = telemetryService;
    }
    notifyUserAction(action) {
        if (action.action.kind === 'vote') {
            this.telemetryService.publicLog2('interactiveSessionVote', {
                direction: action.action.direction === ChatAgentVoteDirection.Up ? 'up' : 'down',
                agentId: action.agentId ?? '',
                command: action.command,
                reason: action.action.reason,
            });
        }
        else if (action.action.kind === 'copy') {
            this.telemetryService.publicLog2('interactiveSessionCopy', {
                copyKind: action.action.copyKind === ChatCopyKind.Action ? 'action' : 'toolbar',
                agentId: action.agentId ?? '',
                command: action.command,
            });
        }
        else if (action.action.kind === 'insert') {
            this.telemetryService.publicLog2('interactiveSessionInsert', {
                newFile: !!action.action.newFile,
                agentId: action.agentId ?? '',
                command: action.command,
            });
        }
        else if (action.action.kind === 'apply') {
            this.telemetryService.publicLog2('interactiveSessionApply', {
                newFile: !!action.action.newFile,
                codeMapper: action.action.codeMapper,
                agentId: action.agentId ?? '',
                command: action.command,
                editsProposed: !!action.action.editsProposed,
            });
        }
        else if (action.action.kind === 'runInTerminal') {
            this.telemetryService.publicLog2('interactiveSessionRunInTerminal', {
                languageId: action.action.languageId ?? '',
                agentId: action.agentId ?? '',
                command: action.command,
            });
        }
        else if (action.action.kind === 'followUp') {
            this.telemetryService.publicLog2('chatFollowupClicked', {
                agentId: action.agentId ?? '',
                command: action.command,
            });
        }
        else if (action.action.kind === 'chatEditingHunkAction') {
            this.telemetryService.publicLog2('chatEditHunk', {
                agentId: action.agentId ?? '',
                outcome: action.action.outcome,
                lineCount: action.action.lineCount,
                hasRemainingEdits: action.action.hasRemainingEdits,
            });
        }
    }
    retrievedFollowups(agentId, command, numFollowups) {
        this.telemetryService.publicLog2('chatFollowupsRetrieved', {
            agentId,
            command,
            numFollowups,
        });
    }
};
ChatServiceTelemetry = __decorate([
    __param(0, ITelemetryService)
], ChatServiceTelemetry);
export { ChatServiceTelemetry };
function getCodeBlocks(text) {
    const lines = text.split('\n');
    const codeBlockLanguages = [];
    let codeBlockState;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (codeBlockState) {
            if (new RegExp(`^\\s*${codeBlockState.delimiter}\\s*$`).test(line)) {
                codeBlockLanguages.push(codeBlockState.languageId);
                codeBlockState = undefined;
            }
        }
        else {
            const match = line.match(/^(\s*)(`{3,}|~{3,})(\w*)/);
            if (match) {
                codeBlockState = { delimiter: match[2], languageId: match[3] };
            }
        }
    }
    return codeBlockLanguages;
}
let ChatRequestTelemetry = class ChatRequestTelemetry {
    constructor(opts, telemetryService, languageModelsService) {
        this.opts = opts;
        this.telemetryService = telemetryService;
        this.languageModelsService = languageModelsService;
        this.isComplete = false;
    }
    complete({ timeToFirstProgress, totalTime, result, requestType, request, detectedAgent }) {
        if (this.isComplete) {
            return;
        }
        this.isComplete = true;
        this.telemetryService.publicLog2('interactiveSessionProviderInvoked', {
            timeToFirstProgress,
            totalTime,
            result,
            requestType,
            agent: detectedAgent?.id ?? this.opts.agent.id,
            agentExtensionId: detectedAgent?.extensionId.value ?? this.opts.agent.extensionId.value,
            slashCommand: this.opts.agentSlashCommandPart ? this.opts.agentSlashCommandPart.command.name : this.opts.commandPart?.slashCommand.command,
            chatSessionId: this.opts.sessionId,
            enableCommandDetection: this.opts.enableCommandDetection,
            isParticipantDetected: !!detectedAgent,
            location: this.opts.location,
            citations: request.response?.codeCitations.length ?? 0,
            numCodeBlocks: getCodeBlocks(request.response?.response.toString() ?? '').length,
            attachmentKinds: this.attachmentKindsForTelemetry(request.variableData),
            model: this.resolveModelId(this.opts.options?.userSelectedModelId),
        });
    }
    attachmentKindsForTelemetry(variableData) {
        // this shows why attachments still have to be cleaned up somewhat
        return variableData.variables.map(v => {
            if (v.kind === 'implicit') {
                return 'implicit';
            }
            else if (v.range) {
                // 'range' is range within the prompt text
                if (v.kind === 'tool') {
                    return 'toolInPrompt';
                }
                else if (v.kind === 'toolset') {
                    return 'toolsetInPrompt';
                }
                else {
                    return 'fileInPrompt';
                }
            }
            else if (v.kind === 'command') {
                return 'command';
            }
            else if (v.kind === 'symbol') {
                return 'symbol';
            }
            else if (isImageVariableEntry(v)) {
                return 'image';
            }
            else if (v.kind === 'directory') {
                return 'directory';
            }
            else if (v.kind === 'tool') {
                return 'tool';
            }
            else if (v.kind === 'toolset') {
                return 'toolset';
            }
            else {
                if (URI.isUri(v.value)) {
                    return 'file';
                }
                else if (isLocation(v.value)) {
                    return 'location';
                }
                else {
                    return 'otherAttachment';
                }
            }
        });
    }
    resolveModelId(userSelectedModelId) {
        return userSelectedModelId && this.languageModelsService.lookupLanguageModel(userSelectedModelId)?.id;
    }
};
ChatRequestTelemetry = __decorate([
    __param(1, ITelemetryService),
    __param(2, ILanguageModelsService)
], ChatRequestTelemetry);
export { ChatRequestTelemetry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlcnZpY2VUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0U2VydmljZVRlbGVtZXRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBSXZGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxZQUFZLEVBQWlELE1BQU0sa0JBQWtCLENBQUM7QUFDdkgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFaEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUE4SnRELElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQW9CO0lBQ2hDLFlBQ3FDLGdCQUFtQztRQUFuQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO0lBQ3BFLENBQUM7SUFFTCxnQkFBZ0IsQ0FBQyxNQUE0QjtRQUM1QyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQXdDLHdCQUF3QixFQUFFO2dCQUNqRyxTQUFTLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEtBQUssc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU07Z0JBQ2hGLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxJQUFJLEVBQUU7Z0JBQzdCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztnQkFDdkIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTTthQUM1QixDQUFDLENBQUM7UUFDSixDQUFDO2FBQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUF3Qyx3QkFBd0IsRUFBRTtnQkFDakcsUUFBUSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxLQUFLLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUztnQkFDL0UsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLElBQUksRUFBRTtnQkFDN0IsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO2FBQ3ZCLENBQUMsQ0FBQztRQUNKLENBQUM7YUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzVDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQTRDLDBCQUEwQixFQUFFO2dCQUN2RyxPQUFPLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTztnQkFDaEMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLElBQUksRUFBRTtnQkFDN0IsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO2FBQ3ZCLENBQUMsQ0FBQztRQUNKLENBQUM7YUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQTBDLHlCQUF5QixFQUFFO2dCQUNwRyxPQUFPLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTztnQkFDaEMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVTtnQkFDcEMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLElBQUksRUFBRTtnQkFDN0IsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO2dCQUN2QixhQUFhLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsYUFBYTthQUM1QyxDQUFDLENBQUM7UUFDSixDQUFDO2FBQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxlQUFlLEVBQUUsQ0FBQztZQUNuRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFnRCxpQ0FBaUMsRUFBRTtnQkFDbEgsVUFBVSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxJQUFJLEVBQUU7Z0JBQzFDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxJQUFJLEVBQUU7Z0JBQzdCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTzthQUN2QixDQUFDLENBQUM7UUFDSixDQUFDO2FBQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUM5QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFnRCxxQkFBcUIsRUFBRTtnQkFDdEcsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLElBQUksRUFBRTtnQkFDN0IsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO2FBQ3ZCLENBQUMsQ0FBQztRQUNKLENBQUM7YUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLHVCQUF1QixFQUFFLENBQUM7WUFDM0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBZ0QsY0FBYyxFQUFFO2dCQUMvRixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sSUFBSSxFQUFFO2dCQUM3QixPQUFPLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPO2dCQUM5QixTQUFTLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTO2dCQUNsQyxpQkFBaUIsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLGlCQUFpQjthQUNsRCxDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQztJQUVELGtCQUFrQixDQUFDLE9BQWUsRUFBRSxPQUEyQixFQUFFLFlBQW9CO1FBQ3BGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQW9FLHdCQUF3QixFQUFFO1lBQzdILE9BQU87WUFDUCxPQUFPO1lBQ1AsWUFBWTtTQUNaLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCxDQUFBO0FBN0RZLG9CQUFvQjtJQUU5QixXQUFBLGlCQUFpQixDQUFBO0dBRlAsb0JBQW9CLENBNkRoQzs7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFZO0lBQ2xDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IsTUFBTSxrQkFBa0IsR0FBYSxFQUFFLENBQUM7SUFFeEMsSUFBSSxjQUF1RixDQUFDO0lBQzVGLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDdkMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRCLElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsSUFBSSxJQUFJLE1BQU0sQ0FBQyxRQUFRLGNBQWMsQ0FBQyxTQUFTLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNwRSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNuRCxjQUFjLEdBQUcsU0FBUyxDQUFDO1lBQzVCLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUNyRCxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLGNBQWMsR0FBRyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2hFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sa0JBQWtCLENBQUM7QUFDM0IsQ0FBQztBQUVNLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQW9CO0lBR2hDLFlBQTZCLElBUTVCLEVBQ21CLGdCQUFvRCxFQUMvQyxxQkFBOEQ7UUFWMUQsU0FBSSxHQUFKLElBQUksQ0FRaEM7UUFDb0MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUM5QiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1FBWi9FLGVBQVUsR0FBRyxLQUFLLENBQUM7SUFhdkIsQ0FBQztJQUVMLFFBQVEsQ0FBQyxFQUFFLG1CQUFtQixFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBUXJGO1FBQ0EsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztRQUN2QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUE4RCxtQ0FBbUMsRUFBRTtZQUNsSSxtQkFBbUI7WUFDbkIsU0FBUztZQUNULE1BQU07WUFDTixXQUFXO1lBQ1gsS0FBSyxFQUFFLGFBQWEsRUFBRSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUM5QyxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsV0FBVyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSztZQUN2RixZQUFZLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsT0FBTztZQUMxSSxhQUFhLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTO1lBQ2xDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCO1lBQ3hELHFCQUFxQixFQUFFLENBQUMsQ0FBQyxhQUFhO1lBQ3RDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVE7WUFDNUIsU0FBUyxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLE1BQU0sSUFBSSxDQUFDO1lBQ3RELGFBQWEsRUFBRSxhQUFhLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTTtZQUNoRixlQUFlLEVBQUUsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7WUFDdkUsS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsbUJBQW1CLENBQUM7U0FDbEUsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLDJCQUEyQixDQUFDLFlBQXNDO1FBQ3pFLGtFQUFrRTtRQUNsRSxPQUFPLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3JDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDM0IsT0FBTyxVQUFVLENBQUM7WUFDbkIsQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDcEIsMENBQTBDO2dCQUMxQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFLENBQUM7b0JBQ3ZCLE9BQU8sY0FBYyxDQUFDO2dCQUN2QixDQUFDO3FCQUFNLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDakMsT0FBTyxpQkFBaUIsQ0FBQztnQkFDMUIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8sY0FBYyxDQUFDO2dCQUN2QixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ2pDLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNoQyxPQUFPLFFBQVEsQ0FBQztZQUNqQixDQUFDO2lCQUFNLElBQUksb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDcEMsT0FBTyxPQUFPLENBQUM7WUFDaEIsQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQ25DLE9BQU8sV0FBVyxDQUFDO1lBQ3BCLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUM5QixPQUFPLE1BQU0sQ0FBQztZQUNmLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNqQyxPQUFPLFNBQVMsQ0FBQztZQUNsQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUN4QixPQUFPLE1BQU0sQ0FBQztnQkFDZixDQUFDO3FCQUFNLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNoQyxPQUFPLFVBQVUsQ0FBQztnQkFDbkIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8saUJBQWlCLENBQUM7Z0JBQzFCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sY0FBYyxDQUFDLG1CQUF1QztRQUM3RCxPQUFPLG1CQUFtQixJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsQ0FBQztJQUN2RyxDQUFDO0NBQ0QsQ0FBQTtBQTFGWSxvQkFBb0I7SUFZOUIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLHNCQUFzQixDQUFBO0dBYlosb0JBQW9CLENBMEZoQyJ9