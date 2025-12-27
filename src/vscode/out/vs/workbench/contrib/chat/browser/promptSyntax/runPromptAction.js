/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ChatViewId, IChatWidgetService } from '../chat.js';
import { ACTION_ID_NEW_CHAT, CHAT_CATEGORY, CHAT_CONFIG_MENU_ID } from '../actions/chatActions.js';
import { OS } from '../../../../../base/common/platform.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { assertDefined } from '../../../../../base/common/types.js';
import { PromptsType, PROMPT_LANGUAGE_ID } from '../../common/promptSyntax/promptTypes.js';
import { localize, localize2 } from '../../../../../nls.js';
import { UILabelProvider } from '../../../../../base/common/keybindingLabels.js';
import { PromptFilePickers } from './pickers/promptFilePickers.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ResourceContextKey } from '../../../../common/contextkeys.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IPromptsService } from '../../common/promptSyntax/service/promptsService.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
/**
 * Condition for the `Run Current Prompt` action.
 */
const EDITOR_ACTIONS_CONDITION = ContextKeyExpr.and(ChatContextKeys.enabled, ResourceContextKey.HasResource, ResourceContextKey.LangId.isEqualTo(PROMPT_LANGUAGE_ID));
/**
 * Keybinding of the action.
 */
const COMMAND_KEY_BINDING = 256 /* KeyMod.WinCtrl */ | 90 /* KeyCode.Slash */ | 512 /* KeyMod.Alt */;
/**
 * Action ID for the `Run Current Prompt` action.
 */
const RUN_CURRENT_PROMPT_ACTION_ID = 'workbench.action.chat.run.prompt.current';
/**
 * Action ID for the `Run Prompt...` action.
 */
const RUN_SELECTED_PROMPT_ACTION_ID = 'workbench.action.chat.run.prompt';
/**
 * Action ID for the `Configure Prompt Files...` action.
 */
const CONFIGURE_PROMPTS_ACTION_ID = 'workbench.action.chat.configure.prompts';
/**
 * Base class of the `Run Prompt` action.
 */
class RunPromptBaseAction extends Action2 {
    constructor(options) {
        super({
            id: options.id,
            title: options.title,
            f1: false,
            precondition: ChatContextKeys.enabled,
            category: CHAT_CATEGORY,
            icon: options.icon,
            keybinding: {
                when: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, EDITOR_ACTIONS_CONDITION),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: options.keybinding,
            },
            menu: [
                {
                    id: MenuId.EditorTitleRun,
                    group: 'navigation',
                    order: options.alt ? 0 : 1,
                    alt: options.alt,
                    when: EDITOR_ACTIONS_CONDITION,
                },
            ],
        });
    }
    /**
     * Executes the run prompt action with provided options.
     */
    async execute(resource, inNewChat, accessor) {
        const commandService = accessor.get(ICommandService);
        const promptsService = accessor.get(IPromptsService);
        const widgetService = accessor.get(IChatWidgetService);
        resource ||= getActivePromptFileUri(accessor);
        assertDefined(resource, 'Cannot find URI resource for an active text editor.');
        if (inNewChat === true) {
            await commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }
        const widget = await widgetService.revealWidget();
        if (widget) {
            widget.setInput(`/${await promptsService.getPromptSlashCommandName(resource, CancellationToken.None)}`);
            // submit the prompt immediately
            await widget.acceptInput();
        }
        return widget;
    }
}
const RUN_CURRENT_PROMPT_ACTION_TITLE = localize2('run-prompt.capitalized', "Run Prompt in Current Chat");
const RUN_CURRENT_PROMPT_ACTION_ICON = Codicon.playCircle;
/**
 * The default `Run Current Prompt` action.
 */
class RunCurrentPromptAction extends RunPromptBaseAction {
    constructor() {
        super({
            id: RUN_CURRENT_PROMPT_ACTION_ID,
            title: RUN_CURRENT_PROMPT_ACTION_TITLE,
            icon: RUN_CURRENT_PROMPT_ACTION_ICON,
            keybinding: COMMAND_KEY_BINDING,
        });
    }
    async run(accessor, resource) {
        return await super.execute(resource, false, accessor);
    }
}
class RunSelectedPromptAction extends Action2 {
    constructor() {
        super({
            id: RUN_SELECTED_PROMPT_ACTION_ID,
            title: localize2('run-prompt.capitalized.ellipses', "Run Prompt..."),
            icon: Codicon.bookmark,
            f1: true,
            precondition: ChatContextKeys.enabled,
            keybinding: {
                when: ChatContextKeys.enabled,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: COMMAND_KEY_BINDING,
            },
            category: CHAT_CATEGORY,
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        const instaService = accessor.get(IInstantiationService);
        const promptsService = accessor.get(IPromptsService);
        const widgetService = accessor.get(IChatWidgetService);
        const pickers = instaService.createInstance(PromptFilePickers);
        const placeholder = localize('commands.prompt.select-dialog.placeholder', 'Select the prompt file to run (hold {0}-key to use in new chat)', UILabelProvider.modifierLabels[OS].ctrlKey);
        const result = await pickers.selectPromptFile({ placeholder, type: PromptsType.prompt });
        if (result === undefined) {
            return;
        }
        const { promptFile, keyMods } = result;
        if (keyMods.ctrlCmd === true) {
            await commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }
        const widget = await widgetService.revealWidget();
        if (widget) {
            widget.setInput(`/${await promptsService.getPromptSlashCommandName(promptFile, CancellationToken.None)}`);
            // submit the prompt immediately
            await widget.acceptInput();
            widget.focusInput();
        }
    }
}
class ManagePromptFilesAction extends Action2 {
    constructor() {
        super({
            id: CONFIGURE_PROMPTS_ACTION_ID,
            title: localize2('configure-prompts', "Configure Prompt Files..."),
            shortTitle: localize2('configure-prompts.short', "Prompt Files"),
            icon: Codicon.bookmark,
            f1: true,
            precondition: ChatContextKeys.enabled,
            category: CHAT_CATEGORY,
            menu: {
                id: CHAT_CONFIG_MENU_ID,
                when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
                order: 11,
                group: '0_level'
            },
        });
    }
    async run(accessor) {
        const openerService = accessor.get(IOpenerService);
        const instaService = accessor.get(IInstantiationService);
        const pickers = instaService.createInstance(PromptFilePickers);
        const placeholder = localize('commands.prompt.manage-dialog.placeholder', 'Select the prompt file to open');
        const result = await pickers.selectPromptFile({ placeholder, type: PromptsType.prompt, optionEdit: false });
        if (result !== undefined) {
            await openerService.open(result.promptFile);
        }
    }
}
/**
 * Gets `URI` of a prompt file open in an active editor instance, if any.
 */
function getActivePromptFileUri(accessor) {
    const codeEditorService = accessor.get(ICodeEditorService);
    const model = codeEditorService.getActiveCodeEditor()?.getModel();
    if (model?.getLanguageId() === PROMPT_LANGUAGE_ID) {
        return model.uri;
    }
    return undefined;
}
/**
 * Action ID for the `Run Current Prompt In New Chat` action.
 */
const RUN_CURRENT_PROMPT_IN_NEW_CHAT_ACTION_ID = 'workbench.action.chat.run-in-new-chat.prompt.current';
const RUN_IN_NEW_CHAT_ACTION_TITLE = localize2('run-prompt-in-new-chat.capitalized', "Run Prompt In New Chat");
/**
 * Icon for the `Run Current Prompt In New Chat` action.
 */
const RUN_IN_NEW_CHAT_ACTION_ICON = Codicon.play;
/**
 * `Run Current Prompt In New Chat` action.
 */
class RunCurrentPromptInNewChatAction extends RunPromptBaseAction {
    constructor() {
        super({
            id: RUN_CURRENT_PROMPT_IN_NEW_CHAT_ACTION_ID,
            title: RUN_IN_NEW_CHAT_ACTION_TITLE,
            icon: RUN_IN_NEW_CHAT_ACTION_ICON,
            keybinding: COMMAND_KEY_BINDING | 2048 /* KeyMod.CtrlCmd */,
            alt: {
                id: RUN_CURRENT_PROMPT_ACTION_ID,
                title: RUN_CURRENT_PROMPT_ACTION_TITLE,
                icon: RUN_CURRENT_PROMPT_ACTION_ICON,
            },
        });
    }
    async run(accessor, resource) {
        return await super.execute(resource, true, accessor);
    }
}
/**
 * Helper to register all the `Run Current Prompt` actions.
 */
export function registerRunPromptActions() {
    registerAction2(RunCurrentPromptInNewChatAction);
    registerAction2(RunCurrentPromptAction);
    registerAction2(RunSelectedPromptAction);
    registerAction2(ManagePromptFilesAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuUHJvbXB0QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9ydW5Qcm9tcHRBY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUN6RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFbkcsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBR3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRixPQUFPLEVBQW9CLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRWpHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FB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