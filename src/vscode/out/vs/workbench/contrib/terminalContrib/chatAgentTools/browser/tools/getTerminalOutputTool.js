/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../nls.js';
import { ToolDataSource } from '../../../../chat/common/languageModelToolsService.js';
import { RunInTerminalTool } from './runInTerminalTool.js';
export const GetTerminalOutputToolData = {
    id: 'get_terminal_output',
    toolReferenceName: 'getTerminalOutput',
    legacyToolReferenceFullNames: ['runCommands/getTerminalOutput'],
    displayName: localize('getTerminalOutputTool.displayName', 'Get Terminal Output'),
    modelDescription: 'Get the output of a terminal command previously started with run_in_terminal',
    icon: Codicon.terminal,
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: 'The ID of the terminal to check.'
            },
        },
        required: [
            'id',
        ]
    }
};
export class GetTerminalOutputTool extends Disposable {
    async prepareToolInvocation(context, token) {
        return {
            invocationMessage: localize('bg.progressive', "Checking background terminal output"),
            pastTenseMessage: localize('bg.past', "Checked background terminal output"),
        };
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const args = invocation.parameters;
        return {
            content: [{
                    kind: 'text',
                    value: `Output of terminal ${args.id}:\n${RunInTerminalTool.getBackgroundOutput(args.id)}`
                }]
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0VGVybWluYWxPdXRwdXRUb29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvdG9vbHMvZ2V0VGVybWluYWxPdXRwdXRUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxjQUFjLEVBQTZMLE1BQU0sc0RBQXNELENBQUM7QUFDalIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFM0QsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQWM7SUFDbkQsRUFBRSxFQUFFLHFCQUFxQjtJQUN6QixpQkFBaUIsRUFBRSxtQkFBbUI7SUFDdEMsNEJBQTRCLEVBQUUsQ0FBQywrQkFBK0IsQ0FBQztJQUMvRCxXQUFXLEVBQUUsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLHFCQUFxQixDQUFDO0lBQ2pGLGdCQUFnQixFQUFFLDhFQUE4RTtJQUNoRyxJQUFJLEVBQUUsT0FBTyxDQUFDLFFBQVE7SUFDdEIsTUFBTSxFQUFFLGNBQWMsQ0FBQyxRQUFRO0lBQy9CLFdBQVcsRUFBRTtRQUNaLElBQUksRUFBRSxRQUFRO1FBQ2QsVUFBVSxFQUFFO1lBQ1gsRUFBRSxFQUFFO2dCQUNILElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxrQ0FBa0M7YUFDL0M7U0FDRDtRQUNELFFBQVEsRUFBRTtZQUNULElBQUk7U0FDSjtLQUNEO0NBQ0QsQ0FBQztBQU1GLE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxVQUFVO0lBQ3BELEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxPQUEwQyxFQUFFLEtBQXdCO1FBQy9GLE9BQU87WUFDTixpQkFBaUIsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUscUNBQXFDLENBQUM7WUFDcEYsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxvQ0FBb0MsQ0FBQztTQUMzRSxDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBMkIsRUFBRSxZQUFpQyxFQUFFLFNBQXVCLEVBQUUsS0FBd0I7UUFDN0gsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLFVBQTJDLENBQUM7UUFDcEUsT0FBTztZQUNOLE9BQU8sRUFBRSxDQUFDO29CQUNULElBQUksRUFBRSxNQUFNO29CQUNaLEtBQUssRUFBRSxzQkFBc0IsSUFBSSxDQUFDLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUU7aUJBQzFGLENBQUM7U0FDRixDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=