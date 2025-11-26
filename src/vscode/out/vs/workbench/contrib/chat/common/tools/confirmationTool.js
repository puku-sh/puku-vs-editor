/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { ToolDataSource, ToolInvocationPresentation } from '../languageModelToolsService.js';
export const ConfirmationToolId = 'vscode_get_confirmation';
export const ConfirmationToolData = {
    id: ConfirmationToolId,
    displayName: 'Confirmation Tool',
    modelDescription: 'A tool that demonstrates different types of confirmations. Takes a title, message, and confirmation type (basic or terminal).',
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            title: {
                type: 'string',
                description: 'Title for the confirmation dialog'
            },
            message: {
                type: 'string',
                description: 'Message to show in the confirmation dialog'
            },
            confirmationType: {
                type: 'string',
                enum: ['basic', 'terminal'],
                description: 'Type of confirmation to show - basic for simple confirmation, terminal for terminal command confirmation'
            },
            terminalCommand: {
                type: 'string',
                description: 'Terminal command to show (only used when confirmationType is "terminal")'
            }
        },
        required: ['title', 'message', 'confirmationType'],
        additionalProperties: false
    }
};
export class ConfirmationTool {
    async prepareToolInvocation(context, token) {
        const parameters = context.parameters;
        if (!parameters.title || !parameters.message) {
            throw new Error('Missing required parameters for ConfirmationTool');
        }
        const confirmationType = parameters.confirmationType ?? 'basic';
        // Create different tool-specific data based on confirmation type
        let toolSpecificData;
        if (confirmationType === 'terminal') {
            // For terminal confirmations, use the terminal tool data structure
            toolSpecificData = {
                kind: 'terminal',
                commandLine: {
                    original: parameters.terminalCommand ?? ''
                },
                language: 'bash'
            };
        }
        else {
            // For basic confirmations, don't set toolSpecificData - this will use the default confirmation UI
            toolSpecificData = undefined;
        }
        return {
            confirmationMessages: {
                title: parameters.title,
                message: new MarkdownString(parameters.message),
                allowAutoConfirm: true
            },
            toolSpecificData,
            presentation: ToolInvocationPresentation.HiddenAfterComplete
        };
    }
    async invoke(invocation, countTokens, progress, token) {
        // This is a no-op tool - just return success
        return {
            content: [{
                    kind: 'text',
                    value: 'yes' // Consumers should check for this label to know whether the tool was confirmed or skipped
                }]
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlybWF0aW9uVG9vbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Rvb2xzL2NvbmZpcm1hdGlvblRvb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRTNFLE9BQU8sRUFBdUksY0FBYyxFQUFFLDBCQUEwQixFQUFnQixNQUFNLGlDQUFpQyxDQUFDO0FBRWhQLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLHlCQUF5QixDQUFDO0FBRTVELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFjO0lBQzlDLEVBQUUsRUFBRSxrQkFBa0I7SUFDdEIsV0FBVyxFQUFFLG1CQUFtQjtJQUNoQyxnQkFBZ0IsRUFBRSwrSEFBK0g7SUFDakosTUFBTSxFQUFFLGNBQWMsQ0FBQyxRQUFRO0lBQy9CLFdBQVcsRUFBRTtRQUNaLElBQUksRUFBRSxRQUFRO1FBQ2QsVUFBVSxFQUFFO1lBQ1gsS0FBSyxFQUFFO2dCQUNOLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxtQ0FBbUM7YUFDaEQ7WUFDRCxPQUFPLEVBQUU7Z0JBQ1IsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLDRDQUE0QzthQUN6RDtZQUNELGdCQUFnQixFQUFFO2dCQUNqQixJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDO2dCQUMzQixXQUFXLEVBQUUsMEdBQTBHO2FBQ3ZIO1lBQ0QsZUFBZSxFQUFFO2dCQUNoQixJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsMEVBQTBFO2FBQ3ZGO1NBQ0Q7UUFDRCxRQUFRLEVBQUUsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixDQUFDO1FBQ2xELG9CQUFvQixFQUFFLEtBQUs7S0FDM0I7Q0FDRCxDQUFDO0FBU0YsTUFBTSxPQUFPLGdCQUFnQjtJQUM1QixLQUFLLENBQUMscUJBQXFCLENBQUMsT0FBMEMsRUFBRSxLQUF3QjtRQUMvRixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBcUMsQ0FBQztRQUNqRSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM5QyxNQUFNLElBQUksS0FBSyxDQUFDLGtEQUFrRCxDQUFDLENBQUM7UUFDckUsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixJQUFJLE9BQU8sQ0FBQztRQUVoRSxpRUFBaUU7UUFDakUsSUFBSSxnQkFBNkQsQ0FBQztRQUVsRSxJQUFJLGdCQUFnQixLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ3JDLG1FQUFtRTtZQUNuRSxnQkFBZ0IsR0FBRztnQkFDbEIsSUFBSSxFQUFFLFVBQVU7Z0JBQ2hCLFdBQVcsRUFBRTtvQkFDWixRQUFRLEVBQUUsVUFBVSxDQUFDLGVBQWUsSUFBSSxFQUFFO2lCQUMxQztnQkFDRCxRQUFRLEVBQUUsTUFBTTthQUNoQixDQUFDO1FBQ0gsQ0FBQzthQUFNLENBQUM7WUFDUCxrR0FBa0c7WUFDbEcsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDO1FBQzlCLENBQUM7UUFFRCxPQUFPO1lBQ04sb0JBQW9CLEVBQUU7Z0JBQ3JCLEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSztnQkFDdkIsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUM7Z0JBQy9DLGdCQUFnQixFQUFFLElBQUk7YUFDdEI7WUFDRCxnQkFBZ0I7WUFDaEIsWUFBWSxFQUFFLDBCQUEwQixDQUFDLG1CQUFtQjtTQUM1RCxDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBMkIsRUFBRSxXQUFnQyxFQUFFLFFBQXNCLEVBQUUsS0FBd0I7UUFDM0gsNkNBQTZDO1FBQzdDLE9BQU87WUFDTixPQUFPLEVBQUUsQ0FBQztvQkFDVCxJQUFJLEVBQUUsTUFBTTtvQkFDWixLQUFLLEVBQUUsS0FBSyxDQUFDLDBGQUEwRjtpQkFDdkcsQ0FBQztTQUNGLENBQUM7SUFDSCxDQUFDO0NBQ0QifQ==