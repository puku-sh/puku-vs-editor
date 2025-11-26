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
        title: localize2(13473, "Start Dictation in Terminal"),
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
                message = localize(13468, null);
                primaryButton = localize(13469, null);
                run = () => workbenchExtensionEnablementService.setEnablement([extension], 13 /* EnablementState.EnabledWorkspace */);
            }
            else {
                message = localize(13470, null);
                run = () => commandService.executeCommand('workbench.extensions.installExtension', 'ms-vscode.vscode-speech');
                primaryButton = localize(13471, null);
            }
            const detail = localize(13472, null);
            const confirmed = await dialogService.confirm({ message, primaryButton, type: 'info', detail });
            if (confirmed.confirmed) {
                await run();
            }
        },
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.stopVoice" /* TerminalCommandId.StopVoice */,
        title: localize2(13474, "Stop Dictation in Terminal"),
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
//# sourceMappingURL=terminalVoiceActions.js.map