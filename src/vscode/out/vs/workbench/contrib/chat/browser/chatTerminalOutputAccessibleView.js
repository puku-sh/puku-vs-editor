/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ITerminalChatService } from '../../terminal/browser/terminal.js';
export class ChatTerminalOutputAccessibleView {
    constructor() {
        this.priority = 115;
        this.name = 'chatTerminalOutput';
        this.type = "view" /* AccessibleViewType.View */;
        this.when = ChatContextKeys.inChatTerminalToolOutput;
    }
    getProvider(accessor) {
        const terminalChatService = accessor.get(ITerminalChatService);
        const part = terminalChatService.getFocusedProgressPart();
        if (!part) {
            return;
        }
        const content = part.getCommandAndOutputAsText();
        if (!content) {
            return;
        }
        return new AccessibleContentProvider("chatTerminalOutput" /* AccessibleViewProviderId.ChatTerminalOutput */, { type: "view" /* AccessibleViewType.View */, id: "chatTerminalOutput" /* AccessibleViewProviderId.ChatTerminalOutput */, language: 'text' }, () => content, () => part.focusOutput(), "accessibility.verbosity.terminalChatOutput" /* AccessibilityVerbositySettingId.TerminalChatOutput */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRlcm1pbmFsT3V0cHV0QWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFRlcm1pbmFsT3V0cHV0QWNjZXNzaWJsZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHlCQUF5QixFQUFnRCxNQUFNLDhEQUE4RCxDQUFDO0FBSXZKLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUUxRSxNQUFNLE9BQU8sZ0NBQWdDO0lBQTdDO1FBQ1UsYUFBUSxHQUFHLEdBQUcsQ0FBQztRQUNmLFNBQUksR0FBRyxvQkFBb0IsQ0FBQztRQUM1QixTQUFJLHdDQUEyQjtRQUMvQixTQUFJLEdBQUcsZUFBZSxDQUFDLHdCQUF3QixDQUFDO0lBc0IxRCxDQUFDO0lBcEJBLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUMvRCxNQUFNLElBQUksR0FBRyxtQkFBbUIsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQzFELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7UUFDakQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTztRQUNSLENBQUM7UUFFRCxPQUFPLElBQUkseUJBQXlCLHlFQUVuQyxFQUFFLElBQUksc0NBQXlCLEVBQUUsRUFBRSx3RUFBNkMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEVBQ3BHLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFDYixHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLHdHQUV4QixDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=