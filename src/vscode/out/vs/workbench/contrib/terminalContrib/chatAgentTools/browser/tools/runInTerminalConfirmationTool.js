/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../../base/common/codicons.js';
import { localize } from '../../../../../../nls.js';
import { ToolDataSource, ToolInvocationPresentation } from '../../../../chat/common/languageModelToolsService.js';
import { RunInTerminalTool } from './runInTerminalTool.js';
export const ConfirmTerminalCommandToolData = {
    id: 'vscode_get_terminal_confirmation',
    displayName: localize('confirmTerminalCommandTool.displayName', 'Confirm Terminal Command'),
    modelDescription: [
        'This tool allows you to get explicit user confirmation for a terminal command without executing it.',
        '',
        'When to use:',
        '- When you need to verify user approval before executing a command',
        '- When you want to show command details, auto-approval status, and simplified versions to the user',
        '- When you need the user to review a potentially risky command',
        '',
        'The tool will:',
        '- Show the command with syntax highlighting',
        '- Display auto-approval status if enabled',
        '- Show simplified version of the command if applicable',
        '- Provide custom actions for creating auto-approval rules',
        '- Return approval/rejection status',
        '',
        'After confirmation, use a tool to actually execute the command.'
    ].join('\n'),
    userDescription: localize('confirmTerminalCommandTool.userDescription', 'Tool for confirming terminal commands'),
    source: ToolDataSource.Internal,
    icon: Codicon.shield,
    inputSchema: {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'The command to confirm with the user.'
            },
            explanation: {
                type: 'string',
                description: 'A one-sentence description of what the command does. This will be shown to the user in the confirmation dialog.'
            },
            isBackground: {
                type: 'boolean',
                description: 'Whether the command would start a background process. This provides context for the confirmation.'
            },
        },
        required: [
            'command',
            'explanation',
            'isBackground',
        ]
    }
};
export class ConfirmTerminalCommandTool extends RunInTerminalTool {
    async prepareToolInvocation(context, token) {
        const preparedInvocation = await super.prepareToolInvocation(context, token);
        if (preparedInvocation) {
            preparedInvocation.presentation = ToolInvocationPresentation.HiddenAfterComplete;
        }
        return preparedInvocation;
    }
    async invoke(invocation, countTokens, progress, token) {
        // This is a confirmation-only tool - just return success
        return {
            content: [{
                    kind: 'text',
                    value: 'yes'
                }]
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuSW5UZXJtaW5hbENvbmZpcm1hdGlvblRvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci90b29scy9ydW5JblRlcm1pbmFsQ29uZmlybWF0aW9uVG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBNEgsY0FBYyxFQUFFLDBCQUEwQixFQUFnQixNQUFNLHNEQUFzRCxDQUFDO0FBQzFQLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRTNELE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFjO0lBQ3hELEVBQUUsRUFBRSxrQ0FBa0M7SUFDdEMsV0FBVyxFQUFFLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSwwQkFBMEIsQ0FBQztJQUMzRixnQkFBZ0IsRUFBRTtRQUNqQixxR0FBcUc7UUFDckcsRUFBRTtRQUNGLGNBQWM7UUFDZCxvRUFBb0U7UUFDcEUsb0dBQW9HO1FBQ3BHLGdFQUFnRTtRQUNoRSxFQUFFO1FBQ0YsZ0JBQWdCO1FBQ2hCLDZDQUE2QztRQUM3QywyQ0FBMkM7UUFDM0Msd0RBQXdEO1FBQ3hELDJEQUEyRDtRQUMzRCxvQ0FBb0M7UUFDcEMsRUFBRTtRQUNGLGlFQUFpRTtLQUNqRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDWixlQUFlLEVBQUUsUUFBUSxDQUFDLDRDQUE0QyxFQUFFLHVDQUF1QyxDQUFDO0lBQ2hILE1BQU0sRUFBRSxjQUFjLENBQUMsUUFBUTtJQUMvQixJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU07SUFDcEIsV0FBVyxFQUFFO1FBQ1osSUFBSSxFQUFFLFFBQVE7UUFDZCxVQUFVLEVBQUU7WUFDWCxPQUFPLEVBQUU7Z0JBQ1IsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLHVDQUF1QzthQUNwRDtZQUNELFdBQVcsRUFBRTtnQkFDWixJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsaUhBQWlIO2FBQzlIO1lBQ0QsWUFBWSxFQUFFO2dCQUNiLElBQUksRUFBRSxTQUFTO2dCQUNmLFdBQVcsRUFBRSxtR0FBbUc7YUFDaEg7U0FDRDtRQUNELFFBQVEsRUFBRTtZQUNULFNBQVM7WUFDVCxhQUFhO1lBQ2IsY0FBYztTQUNkO0tBQ0Q7Q0FDRCxDQUFDO0FBRUYsTUFBTSxPQUFPLDBCQUEyQixTQUFRLGlCQUFpQjtJQUN2RCxLQUFLLENBQUMscUJBQXFCLENBQUMsT0FBMEMsRUFBRSxLQUF3QjtRQUN4RyxNQUFNLGtCQUFrQixHQUFHLE1BQU0sS0FBSyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RSxJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFDeEIsa0JBQWtCLENBQUMsWUFBWSxHQUFHLDBCQUEwQixDQUFDLG1CQUFtQixDQUFDO1FBQ2xGLENBQUM7UUFDRCxPQUFPLGtCQUFrQixDQUFDO0lBQzNCLENBQUM7SUFDUSxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQTJCLEVBQUUsV0FBZ0MsRUFBRSxRQUFzQixFQUFFLEtBQXdCO1FBQ3BJLHlEQUF5RDtRQUN6RCxPQUFPO1lBQ04sT0FBTyxFQUFFLENBQUM7b0JBQ1QsSUFBSSxFQUFFLE1BQU07b0JBQ1osS0FBSyxFQUFFLEtBQUs7aUJBQ1osQ0FBQztTQUNGLENBQUM7SUFDSCxDQUFDO0NBQ0QifQ==