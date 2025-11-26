/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IExtensionManagementService } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchExtensionEnablementService } from '../../../../services/extensionManagement/common/extensionManagement.js';
import { HasSpeechProvider, SpeechToTextInProgress } from '../../../speech/common/speechService.js';
import { registerActiveInstanceAction, sharedWhenClause } from '../../../terminal/browser/terminalActions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { TerminalVoiceSession } from './terminalVoice.js';
export function registerTerminalVoiceActions() {
    registerActiveInstanceAction({
        id: "workbench.action.terminal.startVoice" /* TerminalCommandId.StartVoice */,
        title: localize2('workbench.action.terminal.startDictation', "Start Dictation in Terminal"),
        precondition: ContextKeyExpr.and(SpeechToTextInProgress.toNegated(), sharedWhenClause.terminalAvailable),
        f1: true,
        run: async (activeInstance, c, accessor) => {
            const contextKeyService = accessor.get(IContextKeyService);
            const commandService = accessor.get(ICommandService);
            const dialogService = accessor.get(IDialogService);
            const workbenchExtensionEnablementService = accessor.get(IWorkbenchExtensionEnablementService);
            const extensionManagementService = accessor.get(IExtensionManagementService);
            if (HasSpeechProvider.getValue(contextKeyService)) {
                const instantiationService = accessor.get(IInstantiationService);
                TerminalVoiceSession.getInstance(instantiationService).start();
                return;
            }
            const extensions = await extensionManagementService.getInstalled();
            const extension = extensions.find(extension => extension.identifier.id === 'ms-vscode.vscode-speech');
            const extensionIsDisabled = extension && !workbenchExtensionEnablementService.isEnabled(extension);
            let run;
            let message;
            let primaryButton;
            if (extensionIsDisabled) {
                message = localize('terminal.voice.enableSpeechExtension', "Would you like to enable the speech extension?");
                primaryButton = localize('enableExtension', "Enable Extension");
                run = () => workbenchExtensionEnablementService.setEnablement([extension], 13 /* EnablementState.EnabledWorkspace */);
            }
            else {
                message = localize('terminal.voice.installSpeechExtension', "Would you like to install 'VS Code Speech' extension from 'Microsoft'?");
                run = () => commandService.executeCommand('workbench.extensions.installExtension', 'ms-vscode.vscode-speech');
                primaryButton = localize('installExtension', "Install Extension");
            }
            const detail = localize('terminal.voice.detail', "Microphone support requires this extension.");
            const confirmed = await dialogService.confirm({ message, primaryButton, type: 'info', detail });
            if (confirmed.confirmed) {
                await run();
            }
        },
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.stopVoice" /* TerminalCommandId.StopVoice */,
        title: localize2('workbench.action.terminal.stopDictation', "Stop Dictation in Terminal"),
        precondition: TerminalContextKeys.terminalDictationInProgress,
        f1: true,
        keybinding: {
            primary: 9 /* KeyCode.Escape */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 100
        },
        run: (activeInstance, c, accessor) => {
            const instantiationService = accessor.get(IInstantiationService);
            TerminalVoiceSession.getInstance(instantiationService).stop(true);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxWb2ljZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvdm9pY2UvYnJvd3Nlci90ZXJtaW5hbFZvaWNlQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQ3hILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBR3RHLE9BQU8sRUFBbUIsb0NBQW9DLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUMvSSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUU5RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUUxRCxNQUFNLFVBQVUsNEJBQTRCO0lBQzNDLDRCQUE0QixDQUFDO1FBQzVCLEVBQUUsMkVBQThCO1FBQ2hDLEtBQUssRUFBRSxTQUFTLENBQUMsMENBQTBDLEVBQUUsNkJBQTZCLENB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