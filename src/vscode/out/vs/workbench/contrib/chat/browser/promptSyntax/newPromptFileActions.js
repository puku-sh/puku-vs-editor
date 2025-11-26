/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEqual } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { SnippetController2 } from '../../../../../editor/contrib/snippet/browser/snippetController2.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { INotificationService, NeverShowAgainScope, Severity } from '../../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { getLanguageIdForPromptsType, PromptsType } from '../../common/promptSyntax/promptTypes.js';
import { IUserDataSyncEnablementService } from '../../../../../platform/userDataSync/common/userDataSync.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { CONFIGURE_SYNC_COMMAND_ID } from '../../../../services/userDataSync/common/userDataSync.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { CHAT_CATEGORY } from '../actions/chatActions.js';
import { askForPromptFileName } from './pickers/askForPromptName.js';
import { askForPromptSourceFolder } from './pickers/askForPromptSourceFolder.js';
import { IChatModeService } from '../../common/chatModes.js';
class AbstractNewPromptFileAction extends Action2 {
    constructor(id, title, type) {
        super({
            id,
            title,
            f1: false,
            precondition: ChatContextKeys.enabled,
            category: CHAT_CATEGORY,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: {
                id: MenuId.CommandPalette,
                when: ChatContextKeys.enabled
            }
        });
        this.type = type;
    }
    async run(accessor) {
        const logService = accessor.get(ILogService);
        const openerService = accessor.get(IOpenerService);
        const commandService = accessor.get(ICommandService);
        const notificationService = accessor.get(INotificationService);
        const userDataSyncEnablementService = accessor.get(IUserDataSyncEnablementService);
        const editorService = accessor.get(IEditorService);
        const fileService = accessor.get(IFileService);
        const instaService = accessor.get(IInstantiationService);
        const chatModeService = accessor.get(IChatModeService);
        const selectedFolder = await instaService.invokeFunction(askForPromptSourceFolder, this.type);
        if (!selectedFolder) {
            return;
        }
        const fileName = await instaService.invokeFunction(askForPromptFileName, this.type, selectedFolder.uri);
        if (!fileName) {
            return;
        }
        // create the prompt file
        await fileService.createFolder(selectedFolder.uri);
        const promptUri = URI.joinPath(selectedFolder.uri, fileName);
        await fileService.createFile(promptUri);
        await openerService.open(promptUri);
        const editor = getCodeEditor(editorService.activeTextEditorControl);
        if (editor && editor.hasModel() && isEqual(editor.getModel().uri, promptUri)) {
            SnippetController2.get(editor)?.apply([{
                    range: editor.getModel().getFullModelRange(),
                    template: getDefaultContentSnippet(this.type, chatModeService),
                }]);
        }
        if (selectedFolder.storage !== 'user') {
            return;
        }
        // due to PII concerns, synchronization of the 'user' reusable prompts
        // is disabled by default, but we want to make that fact clear to the user
        // hence after a 'user' prompt is create, we check if the synchronization
        // was explicitly configured before, and if it wasn't, we show a suggestion
        // to enable the synchronization logic in the Settings Sync configuration
        const isConfigured = userDataSyncEnablementService
            .isResourceEnablementConfigured("prompts" /* SyncResource.Prompts */);
        const isSettingsSyncEnabled = userDataSyncEnablementService.isEnabled();
        // if prompts synchronization has already been configured before or
        // if settings sync service is currently disabled, nothing to do
        if ((isConfigured === true) || (isSettingsSyncEnabled === false)) {
            return;
        }
        // show suggestion to enable synchronization of the user prompts and instructions to the user
        notificationService.prompt(Severity.Info, localize('workbench.command.prompts.create.user.enable-sync-notification', "Do you want to backup and sync your user prompt, instruction and custom agent files with Setting Sync?'"), [
            {
                label: localize('enable.capitalized', "Enable"),
                run: () => {
                    commandService.executeCommand(CONFIGURE_SYNC_COMMAND_ID)
                        .catch((error) => {
                        logService.error(`Failed to run '${CONFIGURE_SYNC_COMMAND_ID}' command: ${error}.`);
                    });
                },
            },
            {
                label: localize('learnMore.capitalized', "Learn More"),
                run: () => {
                    openerService.open(URI.parse('https://aka.ms/vscode-settings-sync-help'));
                },
            },
        ], {
            neverShowAgain: {
                id: 'workbench.command.prompts.create.user.enable-sync-notification',
                scope: NeverShowAgainScope.PROFILE,
            },
        });
    }
}
function getDefaultContentSnippet(promptType, chatModeService) {
    const agents = chatModeService.getModes();
    const agentNames = agents.builtin.map(agent => agent.name.get()).join(',') + (agents.custom.length ? (',' + agents.custom.map(agent => agent.name.get()).join(',')) : '');
    switch (promptType) {
        case PromptsType.prompt:
            return [
                `---`,
                `agent: \${1|${agentNames}|}`,
                `---`,
                `\${2:Define the task to achieve, including specific requirements, constraints, and success criteria.}`,
            ].join('\n');
        case PromptsType.instructions:
            return [
                `---`,
                `applyTo: '\${1|**,**/*.ts|}'`,
                `---`,
                `\${2:Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.}`,
            ].join('\n');
        case PromptsType.agent:
            return [
                `---`,
                `description: '\${1:Describe what this custom agent does and when to use it.}'`,
                `tools: []`,
                `---`,
                `\${2:Define what this custom agent accomplishes for the user, when to use it, and the edges it won't cross. Specify its ideal inputs/outputs, the tools it may call, and how it reports progress or asks for help.}`,
            ].join('\n');
        default:
            throw new Error(`Unknown prompt type: ${promptType}`);
    }
}
export const NEW_PROMPT_COMMAND_ID = 'workbench.command.new.prompt';
export const NEW_INSTRUCTIONS_COMMAND_ID = 'workbench.command.new.instructions';
export const NEW_AGENT_COMMAND_ID = 'workbench.command.new.agent';
class NewPromptFileAction extends AbstractNewPromptFileAction {
    constructor() {
        super(NEW_PROMPT_COMMAND_ID, localize('commands.new.prompt.local.title', "New Prompt File..."), PromptsType.prompt);
    }
}
class NewInstructionsFileAction extends AbstractNewPromptFileAction {
    constructor() {
        super(NEW_INSTRUCTIONS_COMMAND_ID, localize('commands.new.instructions.local.title', "New Instructions File..."), PromptsType.instructions);
    }
}
class NewAgentFileAction extends AbstractNewPromptFileAction {
    constructor() {
        super(NEW_AGENT_COMMAND_ID, localize('commands.new.agent.local.title', "New Custom Agent..."), PromptsType.agent);
    }
}
class NewUntitledPromptFileAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.command.new.untitled.prompt',
            title: localize2('commands.new.untitled.prompt.title', "New Untitled Prompt File"),
            f1: true,
            precondition: ChatContextKeys.enabled,
            category: CHAT_CATEGORY,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const chatModeService = accessor.get(IChatModeService);
        const languageId = getLanguageIdForPromptsType(PromptsType.prompt);
        const input = await editorService.openEditor({
            resource: undefined,
            languageId,
            options: {
                pinned: true
            }
        });
        const type = PromptsType.prompt;
        const editor = getCodeEditor(editorService.activeTextEditorControl);
        if (editor && editor.hasModel()) {
            SnippetController2.get(editor)?.apply([{
                    range: editor.getModel().getFullModelRange(),
                    template: getDefaultContentSnippet(type, chatModeService),
                }]);
        }
        return input;
    }
}
export function registerNewPromptFileActions() {
    registerAction2(NewPromptFileAction);
    registerAction2(NewInstructionsFileAction);
    registerAction2(NewAgentFileAction);
    registerAction2(NewUntitledPromptFileAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3UHJvbXB0RmlsZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L25ld1Byb21wdEZpbGVBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sK0RBQStELENBQUM7QUFFeEgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNsSSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3BHLE9BQU8sRUFB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