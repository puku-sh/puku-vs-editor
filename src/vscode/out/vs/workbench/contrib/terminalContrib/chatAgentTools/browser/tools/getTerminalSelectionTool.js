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
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../nls.js';
import { ToolDataSource } from '../../../../chat/common/languageModelToolsService.js';
import { ITerminalService } from '../../../../terminal/browser/terminal.js';
export const GetTerminalSelectionToolData = {
    id: 'terminal_selection',
    toolReferenceName: 'terminalSelection',
    legacyToolReferenceFullNames: ['runCommands/terminalSelection'],
    displayName: localize('terminalSelectionTool.displayName', 'Get Terminal Selection'),
    modelDescription: 'Get the current selection in the active terminal.',
    source: ToolDataSource.Internal,
    icon: Codicon.terminal,
};
let GetTerminalSelectionTool = class GetTerminalSelectionTool extends Disposable {
    constructor(_terminalService) {
        super();
        this._terminalService = _terminalService;
    }
    async prepareToolInvocation(context, token) {
        return {
            invocationMessage: localize('getTerminalSelection.progressive', "Reading terminal selection"),
            pastTenseMessage: localize('getTerminalSelection.past', "Read terminal selection"),
        };
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const activeInstance = this._terminalService.activeInstance;
        if (!activeInstance) {
            return {
                content: [{
                        kind: 'text',
                        value: 'No active terminal instance found.'
                    }]
            };
        }
        const selection = activeInstance.selection;
        if (!selection) {
            return {
                content: [{
                        kind: 'text',
                        value: 'No text is currently selected in the active terminal.'
                    }]
            };
        }
        return {
            content: [{
                    kind: 'text',
                    value: `The active terminal's selection:\n${selection}`
                }]
        };
    }
};
GetTerminalSelectionTool = __decorate([
    __param(0, ITerminalService)
], GetTerminalSelectionTool);
export { GetTerminalSelectionTool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0VGVybWluYWxTZWxlY3Rpb25Ub29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvdG9vbHMvZ2V0VGVybWluYWxTZWxlY3Rpb25Ub29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxjQUFjLEVBQTZMLE1BQU0sc0RBQXNELENBQUM7QUFDalIsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFNUUsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQWM7SUFDdEQsRUFBRSxFQUFFLG9CQUFvQjtJQUN4QixpQkFBaUIsRUFBRSxtQkFBbUI7SUFDdEMsNEJBQTRCLEVBQUUsQ0FBQywrQkFBK0IsQ0FBQztJQUMvRCxXQUFXLEVBQUUsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLHdCQUF3QixDQUFDO0lBQ3BGLGdCQUFnQixFQUFFLG1EQUFtRDtJQUNyRSxNQUFNLEVBQUUsY0FBYyxDQUFDLFFBQVE7SUFDL0IsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRO0NBQ3RCLENBQUM7QUFFSyxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFFdkQsWUFDb0MsZ0JBQWtDO1FBRXJFLEtBQUssRUFBRSxDQUFDO1FBRjJCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7SUFHdEUsQ0FBQztJQUVELEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxPQUEwQyxFQUFFLEtBQXdCO1FBQy9GLE9BQU87WUFDTixpQkFBaUIsRUFBRSxRQUFRLENBQUMsa0NBQWtDLEVBQUUsNEJBQTRCLENBQUM7WUFDN0YsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLDJCQUEyQixFQUFFLHlCQUF5QixDQUFDO1NBQ2xGLENBQUM7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUEyQixFQUFFLFlBQWlDLEVBQUUsU0FBdUIsRUFBRSxLQUF3QjtRQUM3SCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDO1FBQzVELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixPQUFPO2dCQUNOLE9BQU8sRUFBRSxDQUFDO3dCQUNULElBQUksRUFBRSxNQUFNO3dCQUNaLEtBQUssRUFBRSxvQ0FBb0M7cUJBQzNDLENBQUM7YUFDRixDQUFDO1FBQ0gsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUM7UUFDM0MsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE9BQU87Z0JBQ04sT0FBTyxFQUFFLENBQUM7d0JBQ1QsSUFBSSxFQUFFLE1BQU07d0JBQ1osS0FBSyxFQUFFLHVEQUF1RDtxQkFDOUQsQ0FBQzthQUNGLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTztZQUNOLE9BQU8sRUFBRSxDQUFDO29CQUNULElBQUksRUFBRSxNQUFNO29CQUNaLEtBQUssRUFBRSxxQ0FBcUMsU0FBUyxFQUFFO2lCQUN2RCxDQUFDO1NBQ0YsQ0FBQztJQUNILENBQUM7Q0FDRCxDQUFBO0FBM0NZLHdCQUF3QjtJQUdsQyxXQUFBLGdCQUFnQixDQUFBO0dBSE4sd0JBQXdCLENBMkNwQyJ9