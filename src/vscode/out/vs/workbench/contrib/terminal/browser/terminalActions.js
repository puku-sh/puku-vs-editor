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
import { isKeyboardEvent, isMouseEvent, isPointerEvent, getActiveWindow } from '../../../../base/browser/dom.js';
import { Action } from '../../../../base/common/actions.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Schemas } from '../../../../base/common/network.js';
import { isAbsolute } from '../../../../base/common/path.js';
import { isWindows } from '../../../../base/common/platform.js';
import { dirname } from '../../../../base/common/resources.js';
import { hasKey, isObject, isString } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { localize, localize2 } from '../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { TerminalExitReason, TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { createProfileSchemaEnums } from '../../../../platform/terminal/common/terminalProfiles.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { PICK_WORKSPACE_FOLDER_COMMAND_ID } from '../../../browser/actions/workspaceCommands.js';
import { CLOSE_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { ConfigurationResolverExpression } from '../../../services/configurationResolver/common/configurationResolverExpression.js';
import { editorGroupToColumn } from '../../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { AUX_WINDOW_GROUP, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { accessibleViewCurrentProviderId, accessibleViewIsShown, accessibleViewOnLastLine } from '../../accessibility/browser/accessibilityConfiguration.js';
import { ITerminalProfileResolverService, ITerminalProfileService, TERMINAL_VIEW_ID } from '../common/terminal.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { terminalStrings } from '../common/terminalStrings.js';
import { ITerminalConfigurationService, ITerminalEditorService, ITerminalEditingService, ITerminalGroupService, ITerminalInstanceService, ITerminalService } from './terminal.js';
import { isAuxiliaryWindow } from '../../../../base/browser/window.js';
import { InstanceContext } from './terminalContextMenu.js';
import { getColorClass, getIconId, getUriClasses } from './terminalIcon.js';
import { killTerminalIcon, newTerminalIcon } from './terminalIcons.js';
import { TerminalTabList } from './terminalTabsList.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { SeparatorSelectOption } from '../../../../base/browser/ui/selectBox/selectBox.js';
export const switchTerminalShowTabsTitle = localize('showTerminalTabs', "Show Tabs");
const category = terminalStrings.actionCategory;
// Some terminal context keys get complicated. Since normalizing and/or context keys can be
// expensive this is done once per context key and shared.
export const sharedWhenClause = (() => {
    const terminalAvailable = ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated);
    return {
        terminalAvailable,
        terminalAvailable_and_opened: ContextKeyExpr.and(terminalAvailable, TerminalContextKeys.isOpen),
        terminalAvailable_and_editorActive: ContextKeyExpr.and(terminalAvailable, TerminalContextKeys.terminalEditorActive),
        terminalAvailable_and_singularSelection: ContextKeyExpr.and(terminalAvailable, TerminalContextKeys.tabsSingularSelection),
        focusInAny_and_normalBuffer: ContextKeyExpr.and(TerminalContextKeys.focusInAny, TerminalContextKeys.altBufferActive.negate())
    };
})();
export async function getCwdForSplit(instance, folders, commandService, configService) {
    switch (configService.config.splitCwd) {
        case 'workspaceRoot':
            if (folders !== undefined && commandService !== undefined) {
                if (folders.length === 1) {
                    return folders[0].uri;
                }
                else if (folders.length > 1) {
                    // Only choose a path when there's more than 1 folder
                    const options = {
                        placeHolder: localize('workbench.action.terminal.newWorkspacePlaceholder', "Select current working directory for new terminal")
                    };
                    const workspace = await commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID, [options]);
                    if (!workspace) {
                        // Don't split the instance if the workspace picker was canceled
                        return undefined;
                    }
                    return Promise.resolve(workspace.uri);
                }
            }
            return '';
        case 'initial':
            return instance.getInitialCwd();
        case 'inherited':
            return instance.getSpeculativeCwd();
    }
}
let TerminalLaunchHelpAction = class TerminalLaunchHelpAction extends Action {
    constructor(_openerService) {
        super('workbench.action.terminal.launchHelp', localize('terminalLaunchHelp', "Open Help"));
        this._openerService = _openerService;
    }
    async run() {
        this._openerService.open('https://aka.ms/vscode-troubleshoot-terminal-launch');
    }
};
TerminalLaunchHelpAction = __decorate([
    __param(0, IOpenerService)
], TerminalLaunchHelpAction);
export { TerminalLaunchHelpAction };
/**
 * A wrapper function around registerAction2 to help make registering terminal actions more concise.
 * The following default options are used if undefined:
 *
 * - `f1`: true
 * - `category`: Terminal
 * - `precondition`: TerminalContextKeys.processSupported
 */
export function registerTerminalAction(options) {
    // Set defaults
    options.f1 = options.f1 ?? true;
    options.category = options.category ?? category;
    options.precondition = options.precondition ?? TerminalContextKeys.processSupported;
    // Remove run function from options so it's not passed through to registerAction2
    const runFunc = options.run;
    const strictOptions = options;
    delete strictOptions['run'];
    // Register
    return registerAction2(class extends Action2 {
        constructor() {
            super(strictOptions);
        }
        run(accessor, args, args2) {
            return runFunc(getTerminalServices(accessor), accessor, args, args2);
        }
    });
}
function parseActionArgs(args) {
    if (Array.isArray(args)) {
        if (args.every(e => e instanceof InstanceContext)) {
            return args;
        }
    }
    else if (args instanceof InstanceContext) {
        return [args];
    }
    return undefined;
}
/**
 * A wrapper around {@link registerTerminalAction} that runs a callback for all currently selected
 * instances provided in the action context. This falls back to the active instance if there are no
 * contextual instances provided.
 */
export function registerContextualInstanceAction(options) {
    const originalRun = options.run;
    return registerTerminalAction({
        ...options,
        run: async (c, accessor, focusedInstanceArgs, allInstanceArgs) => {
            let instances = getSelectedViewInstances2(accessor, allInstanceArgs);
            if (!instances) {
                const activeInstance = (options.activeInstanceType === 'view'
                    ? c.groupService
                    : options.activeInstanceType === 'editor' ?
                        c.editorService
                        : c.service).activeInstance;
                if (!activeInstance) {
                    return;
                }
                instances = [activeInstance];
            }
            const results = [];
            for (const instance of instances) {
                results.push(originalRun(instance, c, accessor, focusedInstanceArgs));
            }
            await Promise.all(results);
            if (options.runAfter) {
                options.runAfter(instances, c, accessor, focusedInstanceArgs);
            }
        }
    });
}
/**
 * A wrapper around {@link registerTerminalAction} that ensures an active instance exists and
 * provides it to the run function.
 */
export function registerActiveInstanceAction(options) {
    const originalRun = options.run;
    return registerTerminalAction({
        ...options,
        run: (c, accessor, args) => {
            const activeInstance = c.service.activeInstance;
            if (activeInstance) {
                return originalRun(activeInstance, c, accessor, args);
            }
        }
    });
}
/**
 * A wrapper around {@link registerTerminalAction} that ensures an active terminal
 * exists and provides it to the run function.
 *
 * This includes detached xterm terminals that are not managed by an {@link ITerminalInstance}.
 */
export function registerActiveXtermAction(options) {
    const originalRun = options.run;
    return registerTerminalAction({
        ...options,
        run: (c, accessor, args) => {
            const activeDetached = Iterable.find(c.service.detachedInstances, d => d.xterm.isFocused);
            if (activeDetached) {
                return originalRun(activeDetached.xterm, accessor, activeDetached, args);
            }
            const activeInstance = c.service.activeInstance;
            if (activeInstance?.xterm) {
                return originalRun(activeInstance.xterm, accessor, activeInstance, args);
            }
        }
    });
}
function getTerminalServices(accessor) {
    return {
        service: accessor.get(ITerminalService),
        configService: accessor.get(ITerminalConfigurationService),
        groupService: accessor.get(ITerminalGroupService),
        instanceService: accessor.get(ITerminalInstanceService),
        editorService: accessor.get(ITerminalEditorService),
        editingService: accessor.get(ITerminalEditingService),
        profileService: accessor.get(ITerminalProfileService),
        profileResolverService: accessor.get(ITerminalProfileResolverService)
    };
}
export function registerTerminalActions() {
    registerTerminalAction({
        id: "workbench.action.terminal.newInActiveWorkspace" /* TerminalCommandId.NewInActiveWorkspace */,
        title: localize2('workbench.action.terminal.newInActiveWorkspace', 'Create New Terminal (In Active Workspace)'),
        run: async (c) => {
            if (c.service.isProcessSupportRegistered) {
                const instance = await c.service.createTerminal({ location: c.configService.defaultLocation });
                if (!instance) {
                    return;
                }
                c.service.setActiveInstance(instance);
                await focusActiveTerminal(instance, c);
            }
        }
    });
    // Register new with profile command
    refreshTerminalActions([]);
    registerTerminalAction({
        id: "workbench.action.createTerminalEditor" /* TerminalCommandId.CreateTerminalEditor */,
        title: localize2('workbench.action.terminal.createTerminalEditor', 'Create New Terminal in Editor Area'),
        run: async (c, _, args) => {
            function isCreateTerminalOptions(obj) {
                return isObject(obj) && 'location' in obj;
            }
            const options = isCreateTerminalOptions(args) ? args : { location: TerminalLocation.Editor };
            const instance = await c.service.createTerminal(options);
            await instance.focusWhenReady();
        }
    });
    registerTerminalAction({
        id: "workbench.action.createTerminalEditorSameGroup" /* TerminalCommandId.CreateTerminalEditorSameGroup */,
        title: localize2('workbench.action.terminal.createTerminalEditor', 'Create New Terminal in Editor Area'),
        f1: false,
        run: async (c, accessor, args) => {
            // Force the editor into the same editor group if it's locked. This command is only ever
            // called when a terminal is the active editor
            const editorGroupsService = accessor.get(IEditorGroupsService);
            const instance = await c.service.createTerminal({
                location: {
                    viewColumn: editorGroupToColumn(editorGroupsService, editorGroupsService.activeGroup),
                }
            });
            await instance.focusWhenReady();
        }
    });
    registerTerminalAction({
        id: "workbench.action.createTerminalEditorSide" /* TerminalCommandId.CreateTerminalEditorSide */,
        title: localize2('workbench.action.terminal.createTerminalEditorSide', 'Create New Terminal in Editor Area to the Side'),
        run: async (c) => {
            const instance = await c.service.createTerminal({
                location: { viewColumn: SIDE_GROUP }
            });
            await instance.focusWhenReady();
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.newInNewWindow" /* TerminalCommandId.NewInNewWindow */,
        title: terminalStrings.newInNewWindow,
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 91 /* KeyCode.Backquote */,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 91 /* KeyCode.Backquote */ },
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        run: async (c) => {
            const instance = await c.service.createTerminal({
                location: {
                    viewColumn: AUX_WINDOW_GROUP,
                    auxiliary: { compact: true },
                },
            });
            await instance.focusWhenReady();
        }
    });
    registerContextualInstanceAction({
        id: "workbench.action.terminal.moveToEditor" /* TerminalCommandId.MoveToEditor */,
        title: terminalStrings.moveToEditor,
        precondition: sharedWhenClause.terminalAvailable_and_opened,
        activeInstanceType: 'view',
        run: (instance, c) => c.service.moveToEditor(instance),
        runAfter: (instances) => instances.at(-1)?.focus()
    });
    registerContextualInstanceAction({
        id: "workbench.action.terminal.moveIntoNewWindow" /* TerminalCommandId.MoveIntoNewWindow */,
        title: terminalStrings.moveIntoNewWindow,
        precondition: sharedWhenClause.terminalAvailable_and_opened,
        run: (instance, c) => c.service.moveIntoNewEditor(instance),
        runAfter: (instances) => instances.at(-1)?.focus()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.moveToTerminalPanel" /* TerminalCommandId.MoveToTerminalPanel */,
        title: terminalStrings.moveToTerminalPanel,
        precondition: sharedWhenClause.terminalAvailable_and_editorActive,
        run: (c, _, args) => {
            const source = toOptionalUri(args) ?? c.editorService.activeInstance;
            if (source) {
                c.service.moveToTerminalView(source);
            }
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusPreviousPane" /* TerminalCommandId.FocusPreviousPane */,
        title: localize2('workbench.action.terminal.focusPreviousPane', 'Focus Previous Terminal in Terminal Group'),
        keybinding: {
            primary: 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */,
            secondary: [512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */],
            mac: {
                primary: 512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */,
                secondary: [512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */]
            },
            when: ContextKeyExpr.and(TerminalContextKeys.focus, TerminalContextKeys.splitTerminalActive),
            // Should win over send sequence commands https://github.com/microsoft/vscode/issues/259326
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c) => {
            c.groupService.activeGroup?.focusPreviousPane();
            await c.groupService.showPanel(true);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusNextPane" /* TerminalCommandId.FocusNextPane */,
        title: localize2('workbench.action.terminal.focusNextPane', 'Focus Next Terminal in Terminal Group'),
        keybinding: {
            primary: 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */,
            secondary: [512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */],
            mac: {
                primary: 512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */,
                secondary: [512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */]
            },
            when: ContextKeyExpr.and(TerminalContextKeys.focus, TerminalContextKeys.splitTerminalActive),
            // Should win over send sequence commands https://github.com/microsoft/vscode/issues/259326
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c) => {
            c.groupService.activeGroup?.focusNextPane();
            await c.groupService.showPanel(true);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.resizePaneLeft" /* TerminalCommandId.ResizePaneLeft */,
        title: localize2('workbench.action.terminal.resizePaneLeft', 'Resize Terminal Left'),
        keybinding: {
            linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */ },
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 15 /* KeyCode.LeftArrow */ },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (c) => c.groupService.activeGroup?.resizePane(0 /* Direction.Left */)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.resizePaneRight" /* TerminalCommandId.ResizePaneRight */,
        title: localize2('workbench.action.terminal.resizePaneRight', 'Resize Terminal Right'),
        keybinding: {
            linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */ },
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 17 /* KeyCode.RightArrow */ },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (c) => c.groupService.activeGroup?.resizePane(1 /* Direction.Right */)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.resizePaneUp" /* TerminalCommandId.ResizePaneUp */,
        title: localize2('workbench.action.terminal.resizePaneUp', 'Resize Terminal Up'),
        keybinding: {
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 16 /* KeyCode.UpArrow */ },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (c) => c.groupService.activeGroup?.resizePane(2 /* Direction.Up */)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.resizePaneDown" /* TerminalCommandId.ResizePaneDown */,
        title: localize2('workbench.action.terminal.resizePaneDown', 'Resize Terminal Down'),
        keybinding: {
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 18 /* KeyCode.DownArrow */ },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (c) => c.groupService.activeGroup?.resizePane(3 /* Direction.Down */)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focus" /* TerminalCommandId.Focus */,
        title: terminalStrings.focus,
        keybinding: {
            when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, accessibleViewOnLastLine, accessibleViewCurrentProviderId.isEqualTo("terminal" /* AccessibleViewProviderId.Terminal */)),
            primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c) => {
            const instance = c.service.activeInstance || await c.service.createTerminal({ location: TerminalLocation.Panel });
            if (!instance) {
                return;
            }
            c.service.setActiveInstance(instance);
            focusActiveTerminal(instance, c);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusTabs" /* TerminalCommandId.FocusTabs */,
        title: localize2('workbench.action.terminal.focus.tabsView', 'Focus Terminal Tabs View'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 93 /* KeyCode.Backslash */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.or(TerminalContextKeys.tabsFocus, TerminalContextKeys.focus),
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (c) => c.groupService.focusTabs()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusNext" /* TerminalCommandId.FocusNext */,
        title: localize2('workbench.action.terminal.focusNext', 'Focus Next Terminal Group'),
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 12 /* KeyCode.PageDown */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 94 /* KeyCode.BracketRight */
            },
            when: ContextKeyExpr.and(TerminalContextKeys.focus, TerminalContextKeys.editorFocus.negate()),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        run: async (c) => {
            c.groupService.setActiveGroupToNext();
            await c.groupService.showPanel(true);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusPrevious" /* TerminalCommandId.FocusPrevious */,
        title: localize2('workbench.action.terminal.focusPrevious', 'Focus Previous Terminal Group'),
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 11 /* KeyCode.PageUp */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 92 /* KeyCode.BracketLeft */
            },
            when: ContextKeyExpr.and(TerminalContextKeys.focus, TerminalContextKeys.editorFocus.negate()),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        run: async (c) => {
            c.groupService.setActiveGroupToPrevious();
            await c.groupService.showPanel(true);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.runSelectedText" /* TerminalCommandId.RunSelectedText */,
        title: localize2('workbench.action.terminal.runSelectedText', 'Run Selected Text In Active Terminal'),
        run: async (c, accessor) => {
            const codeEditorService = accessor.get(ICodeEditorService);
            const editor = codeEditorService.getActiveCodeEditor();
            if (!editor || !editor.hasModel()) {
                return;
            }
            const instance = await c.service.getActiveOrCreateInstance({ acceptsInput: true });
            const selection = editor.getSelection();
            let text;
            if (selection.isEmpty()) {
                text = editor.getModel().getLineContent(selection.selectionStartLineNumber).trim();
            }
            else {
                const endOfLinePreference = isWindows ? 1 /* EndOfLinePreference.LF */ : 2 /* EndOfLinePreference.CRLF */;
                text = editor.getModel().getValueInRange(selection, endOfLinePreference);
            }
            instance.sendText(text, true, true);
            await c.service.revealActiveTerminal(true);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.runActiveFile" /* TerminalCommandId.RunActiveFile */,
        title: localize2('workbench.action.terminal.runActiveFile', 'Run Active File In Active Terminal'),
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c, accessor) => {
            const codeEditorService = accessor.get(ICodeEditorService);
            const notificationService = accessor.get(INotificationService);
            const workbenchEnvironmentService = accessor.get(IWorkbenchEnvironmentService);
            const editor = codeEditorService.getActiveCodeEditor();
            if (!editor || !editor.hasModel()) {
                return;
            }
            const instance = await c.service.getActiveOrCreateInstance({ acceptsInput: true });
            const isRemote = instance ? instance.hasRemoteAuthority : (workbenchEnvironmentService.remoteAuthority ? true : false);
            const uri = editor.getModel().uri;
            if ((!isRemote && uri.scheme !== Schemas.file && uri.scheme !== Schemas.vscodeUserData) || (isRemote && uri.scheme !== Schemas.vscodeRemote)) {
                notificationService.warn(localize('workbench.action.terminal.runActiveFile.noFile', 'Only files on disk can be run in the terminal'));
                return;
            }
            // TODO: Convert this to ctrl+c, ctrl+v for pwsh?
            await instance.sendPath(uri, true);
            return c.groupService.showPanel();
        }
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollDown" /* TerminalCommandId.ScrollDownLine */,
        title: localize2('workbench.action.terminal.scrollDown', 'Scroll Down (Line)'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */,
            linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollDownLine()
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollDownPage" /* TerminalCommandId.ScrollDownPage */,
        title: localize2('workbench.action.terminal.scrollDownPage', 'Scroll Down (Page)'),
        keybinding: {
            primary: 1024 /* KeyMod.Shift */ | 12 /* KeyCode.PageDown */,
            mac: { primary: 12 /* KeyCode.PageDown */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollDownPage()
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollToBottom" /* TerminalCommandId.ScrollToBottom */,
        title: localize2('workbench.action.terminal.scrollToBottom', 'Scroll to Bottom'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 13 /* KeyCode.End */,
            linux: { primary: 1024 /* KeyMod.Shift */ | 13 /* KeyCode.End */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollToBottom()
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollUp" /* TerminalCommandId.ScrollUpLine */,
        title: localize2('workbench.action.terminal.scrollUp', 'Scroll Up (Line)'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */,
            linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollUpLine()
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollUpPage" /* TerminalCommandId.ScrollUpPage */,
        title: localize2('workbench.action.terminal.scrollUpPage', 'Scroll Up (Page)'),
        f1: true,
        keybinding: {
            primary: 1024 /* KeyMod.Shift */ | 11 /* KeyCode.PageUp */,
            mac: { primary: 11 /* KeyCode.PageUp */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollUpPage()
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollToTop" /* TerminalCommandId.ScrollToTop */,
        title: localize2('workbench.action.terminal.scrollToTop', 'Scroll to Top'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 14 /* KeyCode.Home */,
            linux: { primary: 1024 /* KeyMod.Shift */ | 14 /* KeyCode.Home */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollToTop()
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.clearSelection" /* TerminalCommandId.ClearSelection */,
        title: localize2('workbench.action.terminal.clearSelection', 'Clear Selection'),
        keybinding: {
            primary: 9 /* KeyCode.Escape */,
            when: ContextKeyExpr.and(TerminalContextKeys.focusInAny, TerminalContextKeys.textSelected, TerminalContextKeys.notFindVisible),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => {
            if (xterm.hasSelection()) {
                xterm.clearSelection();
            }
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.changeIcon" /* TerminalCommandId.ChangeIcon */,
        title: terminalStrings.changeIcon,
        precondition: sharedWhenClause.terminalAvailable,
        run: (c, _, args) => getResourceOrActiveInstance(c, args)?.changeIcon()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.changeIconActiveTab" /* TerminalCommandId.ChangeIconActiveTab */,
        title: terminalStrings.changeIcon,
        f1: false,
        precondition: sharedWhenClause.terminalAvailable_and_singularSelection,
        run: async (c, accessor, args) => {
            let icon;
            if (c.groupService.lastAccessedMenu === 'inline-tab') {
                getResourceOrActiveInstance(c, args)?.changeIcon();
                return;
            }
            for (const terminal of getSelectedViewInstances(accessor) ?? []) {
                icon = await terminal.changeIcon(icon);
            }
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.changeColor" /* TerminalCommandId.ChangeColor */,
        title: terminalStrings.changeColor,
        precondition: sharedWhenClause.terminalAvailable,
        run: (c, _, args) => getResourceOrActiveInstance(c, args)?.changeColor()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.changeColorActiveTab" /* TerminalCommandId.ChangeColorActiveTab */,
        title: terminalStrings.changeColor,
        f1: false,
        precondition: sharedWhenClause.terminalAvailable_and_singularSelection,
        run: async (c, accessor, args) => {
            let color;
            let i = 0;
            if (c.groupService.lastAccessedMenu === 'inline-tab') {
                getResourceOrActiveInstance(c, args)?.changeColor();
                return;
            }
            for (const terminal of getSelectedViewInstances(accessor) ?? []) {
                const skipQuickPick = i !== 0;
                // Always show the quickpick on the first iteration
                color = await terminal.changeColor(color, skipQuickPick);
                i++;
            }
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.rename" /* TerminalCommandId.Rename */,
        title: terminalStrings.rename,
        precondition: sharedWhenClause.terminalAvailable,
        run: (c, accessor, args) => renameWithQuickPick(c, accessor, args)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.renameActiveTab" /* TerminalCommandId.RenameActiveTab */,
        title: terminalStrings.rename,
        f1: false,
        keybinding: {
            primary: 60 /* KeyCode.F2 */,
            mac: {
                primary: 3 /* KeyCode.Enter */
            },
            when: ContextKeyExpr.and(TerminalContextKeys.tabsFocus),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable_and_singularSelection,
        run: async (c, accessor) => {
            const terminalGroupService = accessor.get(ITerminalGroupService);
            const notificationService = accessor.get(INotificationService);
            const instances = getSelectedViewInstances(accessor);
            const firstInstance = instances?.[0];
            if (!firstInstance) {
                return;
            }
            if (terminalGroupService.lastAccessedMenu === 'inline-tab') {
                return renameWithQuickPick(c, accessor, firstInstance);
            }
            c.editingService.setEditingTerminal(firstInstance);
            c.editingService.setEditable(firstInstance, {
                validationMessage: value => validateTerminalName(value),
                onFinish: async (value, success) => {
                    // Cancel editing first as instance.rename will trigger a rerender automatically
                    c.editingService.setEditable(firstInstance, null);
                    c.editingService.setEditingTerminal(undefined);
                    if (success) {
                        const promises = [];
                        for (const instance of instances) {
                            promises.push((async () => {
                                await instance.rename(value);
                            })());
                        }
                        try {
                            await Promise.all(promises);
                        }
                        catch (e) {
                            notificationService.error(e);
                        }
                    }
                }
            });
        }
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.detachSession" /* TerminalCommandId.DetachSession */,
        title: localize2('workbench.action.terminal.detachSession', 'Detach Session'),
        run: (activeInstance) => activeInstance.detachProcessAndDispose(TerminalExitReason.User)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.attachToSession" /* TerminalCommandId.AttachToSession */,
        title: localize2('workbench.action.terminal.attachToSession', 'Attach to Session'),
        run: async (c, accessor) => {
            const quickInputService = accessor.get(IQuickInputService);
            const labelService = accessor.get(ILabelService);
            const remoteAgentService = accessor.get(IRemoteAgentService);
            const notificationService = accessor.get(INotificationService);
            const remoteAuthority = remoteAgentService.getConnection()?.remoteAuthority ?? undefined;
            const backend = await accessor.get(ITerminalInstanceService).getBackend(remoteAuthority);
            if (!backend) {
                throw new Error(`No backend registered for remote authority '${remoteAuthority}'`);
            }
            const terms = await backend.listProcesses();
            backend.reduceConnectionGraceTime();
            const unattachedTerms = terms.filter(term => !c.service.isAttachedToTerminal(term));
            const items = unattachedTerms.map(term => {
                const cwdLabel = labelService.getUriLabel(URI.file(term.cwd));
                return {
                    label: term.title,
                    detail: term.workspaceName ? `${term.workspaceName} \u2E31 ${cwdLabel}` : cwdLabel,
                    description: term.pid ? String(term.pid) : '',
                    term
                };
            });
            if (items.length === 0) {
                notificationService.info(localize('noUnattachedTerminals', 'There are no unattached terminals to attach to'));
                return;
            }
            const selected = await quickInputService.pick(items, { canPickMany: false });
            if (selected) {
                const instance = await c.service.createTerminal({
                    config: { attachPersistentProcess: selected.term }
                });
                c.service.setActiveInstance(instance);
                await focusActiveTerminal(instance, c);
            }
        }
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.scrollToPreviousCommand" /* TerminalCommandId.ScrollToPreviousCommand */,
        title: terminalStrings.scrollToPreviousCommand,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
            when: ContextKeyExpr.and(TerminalContextKeys.focus, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        icon: Codicon.arrowUp,
        menu: [
            {
                id: MenuId.ViewTitle,
                group: 'navigation',
                order: 4,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true
            },
            ...[MenuId.EditorTitle, MenuId.CompactWindowEditorTitle].map(id => ({
                id,
                group: '1_shellIntegration',
                order: 4,
                when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
                isHiddenByDefault: true
            })),
        ],
        run: (activeInstance) => activeInstance.xterm?.markTracker.scrollToPreviousMark(undefined, undefined, activeInstance.capabilities.has(2 /* TerminalCapability.CommandDetection */))
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.scrollToNextCommand" /* TerminalCommandId.ScrollToNextCommand */,
        title: terminalStrings.scrollToNextCommand,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
            when: ContextKeyExpr.and(TerminalContextKeys.focus, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        icon: Codicon.arrowDown,
        menu: [
            {
                id: MenuId.ViewTitle,
                group: 'navigation',
                order: 5,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true
            },
            ...[MenuId.EditorTitle, MenuId.CompactWindowEditorTitle].map(id => ({
                id,
                group: '1_shellIntegration',
                order: 5,
                when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
                isHiddenByDefault: true
            })),
        ],
        run: (activeInstance) => {
            activeInstance.xterm?.markTracker.scrollToNextMark();
            activeInstance.focus();
        }
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.selectToPreviousCommand" /* TerminalCommandId.SelectToPreviousCommand */,
        title: localize2('workbench.action.terminal.selectToPreviousCommand', 'Select to Previous Command'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */,
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (activeInstance) => {
            activeInstance.xterm?.markTracker.selectToPreviousMark();
            activeInstance.focus();
        }
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.selectToNextCommand" /* TerminalCommandId.SelectToNextCommand */,
        title: localize2('workbench.action.terminal.selectToNextCommand', 'Select to Next Command'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */,
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (activeInstance) => {
            activeInstance.xterm?.markTracker.selectToNextMark();
            activeInstance.focus();
        }
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.selectToPreviousLine" /* TerminalCommandId.SelectToPreviousLine */,
        title: localize2('workbench.action.terminal.selectToPreviousLine', 'Select to Previous Line'),
        precondition: sharedWhenClause.terminalAvailable,
        run: async (xterm, _, instance) => {
            xterm.markTracker.selectToPreviousLine();
            // prefer to call focus on the TerminalInstance for additional accessibility triggers
            (instance || xterm).focus();
        }
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.selectToNextLine" /* TerminalCommandId.SelectToNextLine */,
        title: localize2('workbench.action.terminal.selectToNextLine', 'Select to Next Line'),
        precondition: sharedWhenClause.terminalAvailable,
        run: async (xterm, _, instance) => {
            xterm.markTracker.selectToNextLine();
            // prefer to call focus on the TerminalInstance for additional accessibility triggers
            (instance || xterm).focus();
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.newWithCwd" /* TerminalCommandId.NewWithCwd */,
        title: terminalStrings.newWithCwd,
        metadata: {
            description: terminalStrings.newWithCwd.value,
            args: [{
                    name: 'args',
                    schema: {
                        type: 'object',
                        required: ['cwd'],
                        properties: {
                            cwd: {
                                description: localize('workbench.action.terminal.newWithCwd.cwd', "The directory to start the terminal at"),
                                type: 'string'
                            }
                        },
                    }
                }]
        },
        run: async (c, _, args) => {
            const cwd = args ? toOptionalString(args.cwd) : undefined;
            const instance = await c.service.createTerminal({ cwd });
            if (!instance) {
                return;
            }
            c.service.setActiveInstance(instance);
            await focusActiveTerminal(instance, c);
        }
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.renameWithArg" /* TerminalCommandId.RenameWithArgs */,
        title: terminalStrings.renameWithArgs,
        metadata: {
            description: terminalStrings.renameWithArgs.value,
            args: [{
                    name: 'args',
                    schema: {
                        type: 'object',
                        required: ['name'],
                        properties: {
                            name: {
                                description: localize('workbench.action.terminal.renameWithArg.name', "The new name for the terminal"),
                                type: 'string',
                                minLength: 1
                            }
                        }
                    }
                }]
        },
        precondition: sharedWhenClause.terminalAvailable,
        f1: false,
        run: async (activeInstance, c, accessor, args) => {
            const notificationService = accessor.get(INotificationService);
            const name = args ? toOptionalString(args.name) : undefined;
            if (!name) {
                notificationService.warn(localize('workbench.action.terminal.renameWithArg.noName', "No name argument provided"));
                return;
            }
            activeInstance.rename(name);
        }
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.relaunch" /* TerminalCommandId.Relaunch */,
        title: localize2('workbench.action.terminal.relaunch', 'Relaunch Active Terminal'),
        run: (activeInstance) => activeInstance.relaunch()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
        title: terminalStrings.split,
        precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.webExtensionContributedProfile),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 26 /* KeyCode.Digit5 */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */,
                secondary: [256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 26 /* KeyCode.Digit5 */]
            },
            when: TerminalContextKeys.focus
        },
        icon: Codicon.splitHorizontal,
        run: async (c, accessor, args) => {
            const optionsOrProfile = isObject(args) ? args : undefined;
            const commandService = accessor.get(ICommandService);
            const workspaceContextService = accessor.get(IWorkspaceContextService);
            const options = convertOptionsOrProfileToOptions(optionsOrProfile);
            const activeInstance = (await c.service.getInstanceHost(options?.location)).activeInstance;
            if (!activeInstance) {
                return;
            }
            const cwd = await getCwdForSplit(activeInstance, workspaceContextService.getWorkspace().folders, commandService, c.configService);
            if (cwd === undefined) {
                return;
            }
            const instance = await c.service.createTerminal({ location: { parentTerminal: activeInstance }, config: options?.config, cwd });
            await focusActiveTerminal(instance, c);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.splitActiveTab" /* TerminalCommandId.SplitActiveTab */,
        title: terminalStrings.split,
        f1: false,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 26 /* KeyCode.Digit5 */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */,
                secondary: [256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 26 /* KeyCode.Digit5 */]
            },
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: TerminalContextKeys.tabsFocus
        },
        run: async (c, accessor) => {
            const instances = getSelectedViewInstances(accessor);
            if (instances) {
                const promises = [];
                for (const t of instances) {
                    promises.push((async () => {
                        await c.service.createTerminal({ location: { parentTerminal: t } });
                        await c.groupService.showPanel(true);
                    })());
                }
                await Promise.all(promises);
            }
        }
    });
    registerContextualInstanceAction({
        id: "workbench.action.terminal.unsplit" /* TerminalCommandId.Unsplit */,
        title: terminalStrings.unsplit,
        precondition: sharedWhenClause.terminalAvailable,
        run: async (instance, c) => {
            const group = c.groupService.getGroupForInstance(instance);
            if (group && group?.terminalInstances.length > 1) {
                c.groupService.unsplitInstance(instance);
            }
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.joinActiveTab" /* TerminalCommandId.JoinActiveTab */,
        title: localize2('workbench.action.terminal.joinInstance', 'Join Terminals'),
        precondition: ContextKeyExpr.and(sharedWhenClause.terminalAvailable, TerminalContextKeys.tabsSingularSelection.toNegated()),
        run: async (c, accessor) => {
            const instances = getSelectedViewInstances(accessor);
            if (instances && instances.length > 1) {
                c.groupService.joinInstances(instances);
            }
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.join" /* TerminalCommandId.Join */,
        title: localize2('workbench.action.terminal.join', 'Join Terminals...'),
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c, accessor) => {
            const themeService = accessor.get(IThemeService);
            const notificationService = accessor.get(INotificationService);
            const quickInputService = accessor.get(IQuickInputService);
            const picks = [];
            if (c.groupService.instances.length <= 1) {
                notificationService.warn(localize('workbench.action.terminal.join.insufficientTerminals', 'Insufficient terminals for the join action'));
                return;
            }
            const otherInstances = c.groupService.instances.filter(i => i.instanceId !== c.groupService.activeInstance?.instanceId);
            for (const terminal of otherInstances) {
                const group = c.groupService.getGroupForInstance(terminal);
                if (group?.terminalInstances.length === 1) {
                    const iconId = getIconId(accessor, terminal);
                    const label = `$(${iconId}): ${terminal.title}`;
                    const iconClasses = [];
                    const colorClass = getColorClass(terminal);
                    if (colorClass) {
                        iconClasses.push(colorClass);
                    }
                    const uriClasses = getUriClasses(terminal, themeService.getColorTheme().type);
                    if (uriClasses) {
                        iconClasses.push(...uriClasses);
                    }
                    picks.push({
                        terminal,
                        label,
                        iconClasses
                    });
                }
            }
            if (picks.length === 0) {
                notificationService.warn(localize('workbench.action.terminal.join.onlySplits', 'All terminals are joined already'));
                return;
            }
            const result = await quickInputService.pick(picks, {});
            if (result) {
                c.groupService.joinInstances([result.terminal, c.groupService.activeInstance]);
            }
        }
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.splitInActiveWorkspace" /* TerminalCommandId.SplitInActiveWorkspace */,
        title: localize2('workbench.action.terminal.splitInActiveWorkspace', 'Split Terminal (In Active Workspace)'),
        run: async (instance, c) => {
            const newInstance = await c.service.createTerminal({ location: { parentTerminal: instance } });
            if (newInstance?.target !== TerminalLocation.Editor) {
                await c.groupService.showPanel(true);
            }
        }
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.selectAll" /* TerminalCommandId.SelectAll */,
        title: localize2('workbench.action.terminal.selectAll', 'Select All'),
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: [{
                // Don't use ctrl+a by default as that would override the common go to start
                // of prompt shell binding
                primary: 0,
                // Technically this doesn't need to be here as it will fall back to this
                // behavior anyway when handed to xterm.js, having this handled by VS Code
                // makes it easier for users to see how it works though.
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: TerminalContextKeys.focusInAny
            }],
        run: (xterm) => xterm.selectAll()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
        title: localize2('workbench.action.terminal.new', 'Create New Terminal'),
        precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.webExtensionContributedProfile),
        icon: newTerminalIcon,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 91 /* KeyCode.Backquote */,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 91 /* KeyCode.Backquote */ },
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        run: async (c, accessor, args) => {
            let eventOrOptions = isObject(args) ? args : undefined;
            const workspaceContextService = accessor.get(IWorkspaceContextService);
            const commandService = accessor.get(ICommandService);
            const editorGroupsService = accessor.get(IEditorGroupsService);
            const folders = workspaceContextService.getWorkspace().folders;
            if (eventOrOptions && isMouseEvent(eventOrOptions) && (eventOrOptions.altKey || eventOrOptions.ctrlKey)) {
                await c.service.createTerminal({ location: { splitActiveTerminal: true } });
                return;
            }
            if (c.service.isProcessSupportRegistered) {
                eventOrOptions = !eventOrOptions || isMouseEvent(eventOrOptions) ? {} : eventOrOptions;
                if (isAuxiliaryWindow(getActiveWindow()) && !eventOrOptions.location) {
                    eventOrOptions.location = { viewColumn: editorGroupToColumn(editorGroupsService, editorGroupsService.activeGroup) };
                }
                let instance;
                if (folders.length <= 1) {
                    // Allow terminal service to handle the path when there is only a
                    // single root
                    instance = await c.service.createTerminal(eventOrOptions);
                }
                else {
                    const cwd = (await pickTerminalCwd(accessor))?.cwd;
                    if (!cwd) {
                        // Don't create the instance if the workspace picker was canceled
                        return;
                    }
                    eventOrOptions.cwd = cwd;
                    instance = await c.service.createTerminal(eventOrOptions);
                }
                c.service.setActiveInstance(instance);
                await focusActiveTerminal(instance, c);
            }
            else {
                if (c.profileService.contributedProfiles.length > 0) {
                    commandService.executeCommand("workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */);
                }
                else {
                    commandService.executeCommand("workbench.action.terminal.toggleTerminal" /* TerminalCommandId.Toggle */);
                }
            }
        }
    });
    async function killInstance(c, instance) {
        if (!instance) {
            return;
        }
        await c.service.safeDisposeTerminal(instance);
        if (c.groupService.instances.length > 0) {
            await c.groupService.showPanel(true);
        }
    }
    registerTerminalAction({
        id: "workbench.action.terminal.kill" /* TerminalCommandId.Kill */,
        title: localize2('workbench.action.terminal.kill', 'Kill the Active Terminal Instance'),
        precondition: ContextKeyExpr.or(sharedWhenClause.terminalAvailable, TerminalContextKeys.isOpen),
        icon: killTerminalIcon,
        run: async (c) => killInstance(c, c.groupService.activeInstance)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.killViewOrEditor" /* TerminalCommandId.KillViewOrEditor */,
        title: terminalStrings.kill,
        f1: false, // This is an internal command used for context menus
        precondition: ContextKeyExpr.or(sharedWhenClause.terminalAvailable, TerminalContextKeys.isOpen),
        run: async (c) => killInstance(c, c.service.activeInstance)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.killAll" /* TerminalCommandId.KillAll */,
        title: localize2('workbench.action.terminal.killAll', 'Kill All Terminals'),
        precondition: ContextKeyExpr.or(sharedWhenClause.terminalAvailable, TerminalContextKeys.isOpen),
        icon: Codicon.trash,
        run: async (c) => {
            const disposePromises = [];
            for (const instance of c.service.instances) {
                disposePromises.push(c.service.safeDisposeTerminal(instance));
            }
            await Promise.all(disposePromises);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.killEditor" /* TerminalCommandId.KillEditor */,
        title: localize2('workbench.action.terminal.killEditor', 'Kill the Active Terminal in Editor Area'),
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */,
            win: { primary: 2048 /* KeyMod.CtrlCmd */ | 62 /* KeyCode.F4 */, secondary: [2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */] },
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(TerminalContextKeys.focus, TerminalContextKeys.editorFocus)
        },
        run: (c, accessor) => accessor.get(ICommandService).executeCommand(CLOSE_EDITOR_COMMAND_ID)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.killActiveTab" /* TerminalCommandId.KillActiveTab */,
        title: terminalStrings.kill,
        f1: false,
        precondition: ContextKeyExpr.or(sharedWhenClause.terminalAvailable, TerminalContextKeys.isOpen),
        keybinding: {
            primary: 20 /* KeyCode.Delete */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
                secondary: [20 /* KeyCode.Delete */]
            },
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: TerminalContextKeys.tabsFocus
        },
        run: async (c, accessor) => {
            const disposePromises = [];
            for (const terminal of getSelectedViewInstances(accessor, true) ?? []) {
                disposePromises.push(c.service.safeDisposeTerminal(terminal));
            }
            await Promise.all(disposePromises);
            c.groupService.focusTabs();
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusHover" /* TerminalCommandId.FocusHover */,
        title: terminalStrings.focusHover,
        precondition: ContextKeyExpr.or(sharedWhenClause.terminalAvailable, TerminalContextKeys.isOpen),
        keybinding: {
            primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.or(TerminalContextKeys.tabsFocus, TerminalContextKeys.focus)
        },
        run: (c) => c.groupService.focusHover()
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
        title: localize2('workbench.action.terminal.clear', 'Clear'),
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: [{
                primary: 0,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */ },
                // Weight is higher than work workbench contributions so the keybinding remains
                // highest priority when chords are registered afterwards
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                // Disable the keybinding when accessibility mode is enabled as chords include
                // important screen reader keybindings such as cmd+k, cmd+i to show the hover
                when: ContextKeyExpr.or(ContextKeyExpr.and(TerminalContextKeys.focus, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()), ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, accessibleViewIsShown, accessibleViewCurrentProviderId.isEqualTo("terminal" /* AccessibleViewProviderId.Terminal */))),
            }],
        run: (activeInstance) => activeInstance.clearBuffer()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.selectDefaultShell" /* TerminalCommandId.SelectDefaultProfile */,
        title: localize2('workbench.action.terminal.selectDefaultShell', 'Select Default Profile'),
        run: (c) => c.service.showProfileQuickPick('setDefault')
    });
    registerTerminalAction({
        id: "workbench.action.terminal.openSettings" /* TerminalCommandId.ConfigureTerminalSettings */,
        title: localize2('workbench.action.terminal.openSettings', 'Configure Terminal Settings'),
        precondition: sharedWhenClause.terminalAvailable,
        run: (c, accessor) => accessor.get(IPreferencesService).openSettings({ jsonEditor: false, query: '@feature:terminal' })
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.setDimensions" /* TerminalCommandId.SetDimensions */,
        title: localize2('workbench.action.terminal.setFixedDimensions', 'Set Fixed Dimensions'),
        precondition: sharedWhenClause.terminalAvailable_and_opened,
        run: (activeInstance) => activeInstance.setFixedDimensions()
    });
    registerContextualInstanceAction({
        id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
        title: terminalStrings.toggleSizeToContentWidth,
        precondition: sharedWhenClause.terminalAvailable_and_opened,
        keybinding: {
            primary: 512 /* KeyMod.Alt */ | 56 /* KeyCode.KeyZ */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: TerminalContextKeys.focus
        },
        run: (instance) => instance.toggleSizeToContentWidth()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.switchTerminal" /* TerminalCommandId.SwitchTerminal */,
        title: localize2('workbench.action.terminal.switchTerminal', 'Switch Terminal'),
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c, accessor, args) => {
            const item = toOptionalString(args);
            if (!item) {
                return;
            }
            if (item === SeparatorSelectOption.text) {
                c.service.refreshActiveGroup();
                return;
            }
            if (item === switchTerminalShowTabsTitle) {
                accessor.get(IConfigurationService).updateValue("terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */, true);
                return;
            }
            const terminalIndexRe = /^([0-9]+): /;
            const indexMatches = terminalIndexRe.exec(item);
            if (indexMatches) {
                c.groupService.setActiveGroupByIndex(Number(indexMatches[1]) - 1);
                return c.groupService.showPanel(true);
            }
            const quickSelectProfiles = c.profileService.availableProfiles;
            // Remove 'New ' from the selected item to get the profile name
            const profileSelection = item.substring(4);
            if (quickSelectProfiles) {
                const profile = quickSelectProfiles.find(profile => profile.profileName === profileSelection);
                if (profile) {
                    const instance = await c.service.createTerminal({
                        config: profile
                    });
                    c.service.setActiveInstance(instance);
                }
                else {
                    console.warn(`No profile with name "${profileSelection}"`);
                }
            }
            else {
                console.warn(`Unmatched terminal item: "${item}"`);
            }
        }
    });
}
function getSelectedViewInstances2(accessor, args) {
    const terminalService = accessor.get(ITerminalService);
    const result = [];
    const context = parseActionArgs(args);
    if (context && context.length > 0) {
        for (const instanceContext of context) {
            const instance = terminalService.getInstanceFromId(instanceContext.instanceId);
            if (instance) {
                result.push(instance);
            }
        }
        if (result.length > 0) {
            return result;
        }
    }
    return undefined;
}
function getSelectedViewInstances(accessor, args, args2) {
    const listService = accessor.get(IListService);
    const terminalGroupService = accessor.get(ITerminalGroupService);
    const result = [];
    // Assign list only if it's an instance of TerminalTabList (#234791)
    const list = listService.lastFocusedList instanceof TerminalTabList ? listService.lastFocusedList : undefined;
    // Get selected tab list instance(s)
    const selections = list?.getSelection();
    // Get inline tab instance if there are not tab list selections #196578
    if (terminalGroupService.lastAccessedMenu === 'inline-tab' && !selections?.length) {
        const instance = terminalGroupService.activeInstance;
        return instance ? [terminalGroupService.activeInstance] : undefined;
    }
    if (!list || !selections) {
        return undefined;
    }
    const focused = list.getFocus();
    const viewInstances = terminalGroupService.instances;
    if (focused.length === 1 && !selections.includes(focused[0])) {
        // focused length is always a max of 1
        // if the focused one is not in the selected list, return that item
        result.push(viewInstances[focused[0]]);
        return result;
    }
    // multi-select
    for (const selection of selections) {
        result.push(viewInstances[selection]);
    }
    return result.filter(r => !!r);
}
export function validateTerminalName(name) {
    if (!name || name.trim().length === 0) {
        return {
            content: localize('emptyTerminalNameInfo', "Providing no name will reset it to the default value"),
            severity: Severity.Info
        };
    }
    return null;
}
function isTerminalProfile(obj) {
    return isObject(obj) && 'profileName' in obj;
}
function convertOptionsOrProfileToOptions(optionsOrProfile) {
    if (isTerminalProfile(optionsOrProfile)) {
        return { config: optionsOrProfile, location: optionsOrProfile.location };
    }
    return optionsOrProfile;
}
let newWithProfileAction;
export function refreshTerminalActions(detectedProfiles) {
    const profileEnum = createProfileSchemaEnums(detectedProfiles);
    newWithProfileAction?.dispose();
    // TODO: Use new register function
    newWithProfileAction = registerAction2(class extends Action2 {
        constructor() {
            super({
                id: "workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */,
                title: localize2('workbench.action.terminal.newWithProfile', 'Create New Terminal (With Profile)'),
                f1: true,
                precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.webExtensionContributedProfile),
                metadata: {
                    description: "workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */,
                    args: [{
                            name: 'args',
                            schema: {
                                type: 'object',
                                required: ['profileName'],
                                properties: {
                                    profileName: {
                                        description: localize('workbench.action.terminal.newWithProfile.profileName', "The name of the profile to create"),
                                        type: 'string',
                                        enum: profileEnum.values,
                                        markdownEnumDescriptions: profileEnum.markdownDescriptions
                                    },
                                    location: {
                                        description: localize('newWithProfile.location', "Where to create the terminal"),
                                        type: 'string',
                                        enum: ['view', 'editor'],
                                        enumDescriptions: [
                                            localize('newWithProfile.location.view', 'Create the terminal in the terminal view'),
                                            localize('newWithProfile.location.editor', 'Create the terminal in the editor'),
                                        ]
                                    }
                                }
                            }
                        }]
                },
            });
        }
        async run(accessor, eventOrOptionsOrProfile, profile) {
            const c = getTerminalServices(accessor);
            const workspaceContextService = accessor.get(IWorkspaceContextService);
            const commandService = accessor.get(ICommandService);
            let event;
            let options;
            let instance;
            let cwd;
            if (isObject(eventOrOptionsOrProfile) && eventOrOptionsOrProfile && hasKey(eventOrOptionsOrProfile, { profileName: true })) {
                const config = c.profileService.availableProfiles.find(profile => profile.profileName === eventOrOptionsOrProfile.profileName);
                if (!config) {
                    throw new Error(`Could not find terminal profile "${eventOrOptionsOrProfile.profileName}"`);
                }
                options = { config };
                function isSimpleArgs(obj) {
                    return isObject(obj) && 'location' in obj;
                }
                if (isSimpleArgs(eventOrOptionsOrProfile)) {
                    switch (eventOrOptionsOrProfile.location) {
                        case 'editor':
                            options.location = TerminalLocation.Editor;
                            break;
                        case 'view':
                            options.location = TerminalLocation.Panel;
                            break;
                    }
                }
            }
            else if (isMouseEvent(eventOrOptionsOrProfile) || isPointerEvent(eventOrOptionsOrProfile) || isKeyboardEvent(eventOrOptionsOrProfile)) {
                event = eventOrOptionsOrProfile;
                options = profile ? { config: profile } : undefined;
            }
            else {
                options = convertOptionsOrProfileToOptions(eventOrOptionsOrProfile);
            }
            // split terminal
            if (event && (event.altKey || event.ctrlKey)) {
                const parentTerminal = c.service.activeInstance;
                if (parentTerminal) {
                    await c.service.createTerminal({ location: { parentTerminal }, config: options?.config });
                    return;
                }
            }
            const folders = workspaceContextService.getWorkspace().folders;
            if (folders.length > 1) {
                // multi-root workspace, create root picker
                const options = {
                    placeHolder: localize('workbench.action.terminal.newWorkspacePlaceholder', "Select current working directory for new terminal")
                };
                const workspace = await commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID, [options]);
                if (!workspace) {
                    // Don't create the instance if the workspace picker was canceled
                    return;
                }
                cwd = workspace.uri;
            }
            if (options) {
                options.cwd = cwd;
                instance = await c.service.createTerminal(options);
            }
            else {
                instance = await c.service.showProfileQuickPick('createInstance', cwd);
            }
            if (instance) {
                c.service.setActiveInstance(instance);
                await focusActiveTerminal(instance, c);
            }
        }
    });
    return newWithProfileAction;
}
function getResourceOrActiveInstance(c, resource) {
    return c.service.getInstanceFromResource(toOptionalUri(resource)) || c.service.activeInstance;
}
async function pickTerminalCwd(accessor, cancel) {
    const quickInputService = accessor.get(IQuickInputService);
    const labelService = accessor.get(ILabelService);
    const contextService = accessor.get(IWorkspaceContextService);
    const modelService = accessor.get(IModelService);
    const languageService = accessor.get(ILanguageService);
    const configurationService = accessor.get(IConfigurationService);
    const configurationResolverService = accessor.get(IConfigurationResolverService);
    const folders = contextService.getWorkspace().folders;
    if (!folders.length) {
        return;
    }
    const folderCwdPairs = await Promise.all(folders.map(e => resolveWorkspaceFolderCwd(e, configurationService, configurationResolverService)));
    const shrinkedPairs = shrinkWorkspaceFolderCwdPairs(folderCwdPairs);
    if (shrinkedPairs.length === 1) {
        return shrinkedPairs[0];
    }
    const folderPicks = shrinkedPairs.map(pair => {
        const label = pair.folder.name;
        const description = pair.isOverridden
            ? localize('workbench.action.terminal.overriddenCwdDescription', "(Overriden) {0}", labelService.getUriLabel(pair.cwd, { relative: !pair.isAbsolute }))
            : labelService.getUriLabel(dirname(pair.cwd), { relative: true });
        return {
            label,
            description: description !== label ? description : undefined,
            pair: pair,
            iconClasses: getIconClasses(modelService, languageService, pair.cwd, FileKind.ROOT_FOLDER)
        };
    });
    const options = {
        placeHolder: localize('workbench.action.terminal.newWorkspacePlaceholder', "Select current working directory for new terminal"),
        matchOnDescription: true,
        canPickMany: false,
    };
    const token = cancel || CancellationToken.None;
    const pick = await quickInputService.pick(folderPicks, options, token);
    return pick?.pair;
}
async function resolveWorkspaceFolderCwd(folder, configurationService, configurationResolverService) {
    const cwdConfig = configurationService.getValue("terminal.integrated.cwd" /* TerminalSettingId.Cwd */, { resource: folder.uri });
    if (!isString(cwdConfig) || cwdConfig.length === 0) {
        return { folder, cwd: folder.uri, isAbsolute: false, isOverridden: false };
    }
    const resolvedCwdConfig = await configurationResolverService.resolveAsync(folder, cwdConfig);
    return isAbsolute(resolvedCwdConfig) || resolvedCwdConfig.startsWith(ConfigurationResolverExpression.VARIABLE_LHS)
        ? { folder, isAbsolute: true, isOverridden: true, cwd: URI.from({ ...folder.uri, path: resolvedCwdConfig }) }
        : { folder, isAbsolute: false, isOverridden: true, cwd: URI.joinPath(folder.uri, resolvedCwdConfig) };
}
/**
 * Drops repeated CWDs, if any, by keeping the one which best matches the workspace folder. It also preserves the original order.
 */
export function shrinkWorkspaceFolderCwdPairs(pairs) {
    const map = new Map();
    for (const pair of pairs) {
        const key = pair.cwd.toString();
        const value = map.get(key);
        if (!value || key === pair.folder.uri.toString()) {
            map.set(key, pair);
        }
    }
    const selectedPairs = new Set(map.values());
    const selectedPairsInOrder = pairs.filter(x => selectedPairs.has(x));
    return selectedPairsInOrder;
}
async function focusActiveTerminal(instance, c) {
    // TODO@meganrogge: Is this the right logic for when instance is undefined?
    if (instance?.target === TerminalLocation.Editor) {
        await c.editorService.revealActiveEditor();
        await instance.focusWhenReady(true);
    }
    else {
        await c.groupService.showPanel(true);
    }
}
async function renameWithQuickPick(c, accessor, resource) {
    let instance = resource;
    // Check if the 'instance' does not exist or if 'instance.rename' is not defined
    if (!instance || !instance?.rename) {
        // If not, obtain the resource instance using 'getResourceOrActiveInstance'
        instance = getResourceOrActiveInstance(c, resource);
    }
    if (instance) {
        const title = await accessor.get(IQuickInputService).input({
            value: instance.title,
            prompt: localize('workbench.action.terminal.rename.prompt', "Enter terminal name"),
        });
        if (title) {
            instance.rename(title);
        }
    }
}
function toOptionalUri(obj) {
    return URI.isUri(obj) ? obj : undefined;
}
function toOptionalString(obj) {
    return isString(obj) ? obj : undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUM7QUFFaEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVu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