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
import { ChatViewId, IChatWidgetService } from '../chat.js';
import { CHAT_CATEGORY, CHAT_CONFIG_MENU_ID } from '../actions/chatActions.js';
import { localize, localize2 } from '../../../../../nls.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { IPromptsService } from '../../common/promptSyntax/service/promptsService.js';
import { PromptFilePickers } from './pickers/promptFilePickers.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { getCleanPromptName } from '../../common/promptSyntax/config/promptFileLocations.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { INSTRUCTIONS_LANGUAGE_ID, PromptsType } from '../../common/promptSyntax/promptTypes.js';
import { compare } from '../../../../../base/common/strings.js';
import { PromptFileVariableKind, toPromptFileVariableEntry } from '../../common/chatVariableEntries.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
/**
 * Action ID for the `Attach Instruction` action.
 */
const ATTACH_INSTRUCTIONS_ACTION_ID = 'workbench.action.chat.attach.instructions';
/**
 * Action ID for the `Configure Instruction` action.
 */
const CONFIGURE_INSTRUCTIONS_ACTION_ID = 'workbench.action.chat.configure.instructions';
/**
 * Action to attach a prompt to a chat widget input.
 */
class AttachInstructionsAction extends Action2 {
    constructor() {
        super({
            id: ATTACH_INSTRUCTIONS_ACTION_ID,
            title: localize2('attach-instructions.capitalized.ellipses', "Attach Instructions..."),
            f1: false,
            precondition: ChatContextKeys.enabled,
            category: CHAT_CATEGORY,
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 90 /* KeyCode.Slash */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: {
                id: MenuId.CommandPalette,
                when: ChatContextKeys.enabled
            }
        });
    }
    async run(accessor, options) {
        const instaService = accessor.get(IInstantiationService);
        const widgetService = accessor.get(IChatWidgetService);
        if (!options) {
            options = {
                resource: getActiveInstructionsFileUri(accessor),
                widget: getFocusedChatWidget(accessor),
            };
        }
        const pickers = instaService.createInstance(PromptFilePickers);
        const { skipSelectionDialog, resource } = options;
        const widget = options.widget ?? (await widgetService.revealWidget());
        if (!widget) {
            return;
        }
        if (skipSelectionDialog && resource) {
            widget.attachmentModel.addContext(toPromptFileVariableEntry(resource, PromptFileVariableKind.Instruction));
            widget.focusInput();
            return;
        }
        const placeholder = localize('commands.instructions.select-dialog.placeholder', 'Select instructions files to attach');
        const result = await pickers.selectPromptFile({ resource, placeholder, type: PromptsType.instructions });
        if (result !== undefined) {
            widget.attachmentModel.addContext(toPromptFileVariableEntry(result.promptFile, PromptFileVariableKind.Instruction));
            widget.focusInput();
        }
    }
}
class ManageInstructionsFilesAction extends Action2 {
    constructor() {
        super({
            id: CONFIGURE_INSTRUCTIONS_ACTION_ID,
            title: localize2('configure-instructions', "Configure Instructions..."),
            shortTitle: localize2('configure-instructions.short', "Chat Instructions"),
            icon: Codicon.bookmark,
            f1: true,
            precondition: ChatContextKeys.enabled,
            category: CHAT_CATEGORY,
            menu: {
                id: CHAT_CONFIG_MENU_ID,
                when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
                order: 10,
                group: '1_level'
            }
        });
    }
    async run(accessor) {
        const openerService = accessor.get(IOpenerService);
        const instaService = accessor.get(IInstantiationService);
        const pickers = instaService.createInstance(PromptFilePickers);
        const placeholder = localize('commands.prompt.manage-dialog.placeholder', 'Select the instructions file to open');
        const result = await pickers.selectPromptFile({ placeholder, type: PromptsType.instructions, optionEdit: false });
        if (result !== undefined) {
            await openerService.open(result.promptFile);
        }
    }
}
function getFocusedChatWidget(accessor) {
    const chatWidgetService = accessor.get(IChatWidgetService);
    const { lastFocusedWidget } = chatWidgetService;
    if (!lastFocusedWidget) {
        return undefined;
    }
    // the widget input `must` be focused at the time when command run
    if (!lastFocusedWidget.hasInputFocus()) {
        return undefined;
    }
    return lastFocusedWidget;
}
/**
 * Gets `URI` of a instructions file open in an active editor instance, if any.
 */
function getActiveInstructionsFileUri(accessor) {
    const codeEditorService = accessor.get(ICodeEditorService);
    const model = codeEditorService.getActiveCodeEditor()?.getModel();
    if (model?.getLanguageId() === INSTRUCTIONS_LANGUAGE_ID) {
        return model.uri;
    }
    return undefined;
}
/**
 * Helper to register the `Attach Prompt` action.
 */
export function registerAttachPromptActions() {
    registerAction2(AttachInstructionsAction);
    registerAction2(ManageInstructionsFilesAction);
}
let ChatInstructionsPickerPick = class ChatInstructionsPickerPick {
    constructor(promptsService) {
        this.promptsService = promptsService;
        this.type = 'pickerPick';
        this.label = localize('chatContext.attach.instructions.label', 'Instructions...');
        this.icon = Codicon.bookmark;
        this.commandId = ATTACH_INSTRUCTIONS_ACTION_ID;
    }
    isEnabled(widget) {
        return !!widget.attachmentCapabilities.supportsInstructionAttachments;
    }
    asPicker() {
        const picks = this.promptsService.listPromptFiles(PromptsType.instructions, CancellationToken.None).then(value => {
            const result = [];
            value = value.slice(0).sort((a, b) => compare(a.storage, b.storage));
            let storageType;
            for (const promptsPath of value) {
                if (storageType !== promptsPath.storage) {
                    storageType = promptsPath.storage;
                    result.push({
                        type: 'separator',
                        label: this.promptsService.getPromptLocationLabel(promptsPath)
                    });
                }
                result.push({
                    label: promptsPath.name ?? getCleanPromptName(promptsPath.uri),
                    asAttachment: () => {
                        return toPromptFileVariableEntry(promptsPath.uri, PromptFileVariableKind.Instruction);
                    }
                });
            }
            return result;
        });
        return {
            placeholder: localize('placeholder', 'Select instructions files to attach'),
            picks,
            configure: {
                label: localize('configureInstructions', 'Configure Instructions...'),
                commandId: CONFIGURE_INSTRUCTIONS_ACTION_ID
            }
        };
    }
};
ChatInstructionsPickerPick = __decorate([
    __param(0, IPromptsService)
], ChatInstructionsPickerPick);
export { ChatInstructionsPickerPick };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXR0YWNoSW5zdHJ1Y3Rpb25zQWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9hdHRhY2hJbnN0cnVjdGlvbnNBY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBR3RHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FB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