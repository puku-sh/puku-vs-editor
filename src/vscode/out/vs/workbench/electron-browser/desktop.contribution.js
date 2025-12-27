/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../platform/registry/common/platform.js';
import { localize, localize2 } from '../../nls.js';
import { MenuRegistry, MenuId, registerAction2 } from '../../platform/actions/common/actions.js';
import { Extensions as ConfigurationExtensions } from '../../platform/configuration/common/configurationRegistry.js';
import { isLinux, isMacintosh, isWindows } from '../../base/common/platform.js';
import { ConfigureRuntimeArgumentsAction, ToggleDevToolsAction, ReloadWindowWithExtensionsDisabledAction, OpenUserDataFolderAction, ShowGPUInfoAction, StopTracing } from './actions/developerActions.js';
import { ZoomResetAction, ZoomOutAction, ZoomInAction, CloseWindowAction, SwitchWindowAction, QuickSwitchWindowAction, NewWindowTabHandler, ShowPreviousWindowTabHandler, ShowNextWindowTabHandler, MoveWindowTabToNewWindowHandler, MergeWindowTabsHandlerHandler, ToggleWindowTabsBarHandler, ToggleWindowAlwaysOnTopAction, DisableWindowAlwaysOnTopAction, EnableWindowAlwaysOnTopAction } from './actions/windowActions.js';
import { ContextKeyExpr } from '../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../platform/keybinding/common/keybindingsRegistry.js';
import { CommandsRegistry } from '../../platform/commands/common/commands.js';
import { IsMacContext } from '../../platform/contextkey/common/contextkeys.js';
import { INativeHostService } from '../../platform/native/common/native.js';
import { Extensions as JSONExtensions } from '../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { InstallShellScriptAction, UninstallShellScriptAction } from './actions/installActions.js';
import { EditorsVisibleContext, SingleEditorGroupsContext } from '../common/contextkeys.js';
import { TELEMETRY_SETTING_ID } from '../../platform/telemetry/common/telemetry.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { NativeWindow } from './window.js';
import { ModifierKeyEmitter } from '../../base/browser/dom.js';
import { applicationConfigurationNodeBase, securityConfigurationNodeBase } from '../common/configuration.js';
import { MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL } from '../../platform/window/electron-browser/window.js';
// Actions
(function registerActions() {
    // Actions: Zoom
    registerAction2(ZoomInAction);
    registerAction2(ZoomOutAction);
    registerAction2(ZoomResetAction);
    // Actions: Window
    registerAction2(SwitchWindowAction);
    registerAction2(QuickSwitchWindowAction);
    registerAction2(CloseWindowAction);
    registerAction2(ToggleWindowAlwaysOnTopAction);
    registerAction2(EnableWindowAlwaysOnTopAction);
    registerAction2(DisableWindowAlwaysOnTopAction);
    if (isMacintosh) {
        // macOS: behave like other native apps that have documents
        // but can run without a document opened and allow to close
        // the window when the last document is closed
        // (https://github.com/microsoft/vscode/issues/126042)
        KeybindingsRegistry.registerKeybindingRule({
            id: CloseWindowAction.ID,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(EditorsVisibleContext.toNegated(), SingleEditorGroupsContext),
            primary: 2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */
        });
    }
    // Actions: Install Shell Script (macOS only)
    if (isMacintosh) {
        registerAction2(InstallShellScriptAction);
        registerAction2(UninstallShellScriptAction);
    }
    // Quit
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: 'workbench.action.quit',
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        async handler(accessor) {
            const nativeHostService = accessor.get(INativeHostService);
            const configurationService = accessor.get(IConfigurationService);
            const confirmBeforeClose = configurationService.getValue('window.confirmBeforeClose');
            if (confirmBeforeClose === 'always' || (confirmBeforeClose === 'keyboardOnly' && ModifierKeyEmitter.getInstance().isModifierPressed)) {
                const confirmed = await NativeWindow.confirmOnShutdown(accessor, 2 /* ShutdownReason.QUIT */);
                if (!confirmed) {
                    return; // quit prevented by user
                }
            }
            nativeHostService.quit();
        },
        when: undefined,
        mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 47 /* KeyCode.KeyQ */ },
        linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 47 /* KeyCode.KeyQ */ }
    });
    // Actions: macOS Native Tabs
    if (isMacintosh) {
        for (const command of [
            { handler: NewWindowTabHandler, id: 'workbench.action.newWindowTab', title: localize2('newTab', 'New Window Tab') },
            { handler: ShowPreviousWindowTabHandler, id: 'workbench.action.showPreviousWindowTab', title: localize2('showPreviousTab', 'Show Previous Window Tab') },
            { handler: ShowNextWindowTabHandler, id: 'workbench.action.showNextWindowTab', title: localize2('showNextWindowTab', 'Show Next Window Tab') },
            { handler: MoveWindowTabToNewWindowHandler, id: 'workbench.action.moveWindowTabToNewWindow', title: localize2('moveWindowTabToNewWindow', 'Move Window Tab to New Window') },
            { handler: MergeWindowTabsHandlerHandler, id: 'workbench.action.mergeAllWindowTabs', title: localize2('mergeAllWindowTabs', 'Merge All Windows') },
            { handler: ToggleWindowTabsBarHandler, id: 'workbench.action.toggleWindowTabsBar', title: localize2('toggleWindowTabsBar', 'Toggle Window Tabs Bar') }
        ]) {
            CommandsRegistry.registerCommand(command.id, command.handler);
            MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
                command,
                when: ContextKeyExpr.equals('config.window.nativeTabs', true)
            });
        }
    }
    // Actions: Developer
    registerAction2(ReloadWindowWithExtensionsDisabledAction);
    registerAction2(ConfigureRuntimeArgumentsAction);
    registerAction2(ToggleDevToolsAction);
    registerAction2(OpenUserDataFolderAction);
    registerAction2(ShowGPUInfoAction);
    registerAction2(StopTracing);
})();
// Menu
(function registerMenu() {
    // Quit
    MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
        group: 'z_Exit',
        command: {
            id: 'workbench.action.quit',
            title: localize({ key: 'miExit', comment: ['&& denotes a mnemonic'] }, "E&&xit")
        },
        order: 1,
        when: IsMacContext.toNegated()
    });
})();
// Configuration
(function registerConfiguration() {
    const registry = Registry.as(ConfigurationExtensions.Configuration);
    // Application
    registry.registerConfiguration({
        ...applicationConfigurationNodeBase,
        'properties': {
            'application.shellEnvironmentResolutionTimeout': {
                'type': 'number',
                'default': 10,
                'minimum': 1,
                'maximum': 120,
                'included': !isWindows,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': localize('application.shellEnvironmentResolutionTimeout', "Controls the timeout in seconds before giving up resolving the shell environment when the application is not already launched from a terminal. See our [documentation](https://go.microsoft.com/fwlink/?linkid=2149667) for more information.")
            }
        }
    });
    // Window
    registry.registerConfiguration({
        'id': 'window',
        'order': 8,
        'title': localize('windowConfigurationTitle', "Window"),
        'type': 'object',
        'properties': {
            'window.confirmSaveUntitledWorkspace': {
                'type': 'boolean',
                'default': true,
                'description': localize('confirmSaveUntitledWorkspace', "Controls whether a confirmation dialog shows asking to save or discard an opened untitled workspace in the window when switching to another workspace. Disabling the confirmation dialog will always discard the untitled workspace."),
            },
            'window.openWithoutArgumentsInNewWindow': {
                'type': 'string',
                'enum': ['on', 'off'],
                'enumDescriptions': [
                    localize('window.openWithoutArgumentsInNewWindow.on', "Open a new empty window."),
                    localize('window.openWithoutArgumentsInNewWindow.off', "Focus the last active running instance.")
                ],
                'default': isMacintosh ? 'off' : 'on',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': localize('openWithoutArgumentsInNewWindow', "Controls whether a new empty window should open when starting a second instance without arguments or if the last running instance should get focus.\nNote that there can still be cases where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` command line option).")
            },
            'window.restoreWindows': {
                'type': 'string',
                'enum': ['preserve', 'all', 'folders', 'one', 'none'],
                'enumDescriptions': [
                    localize('window.reopenFolders.preserve', "Always reopen all windows. If a folder or workspace is opened (e.g. from the command line) it opens as a new window unless it was opened before. If files are opened they will open in one of the restored windows together with editors that were previously opened."),
                    localize('window.reopenFolders.all', "Reopen all windows unless a folder, workspace or file is opened (e.g. from the command line). If a file is opened, it will replace any of the editors that were previously opened in a window."),
                    localize('window.reopenFolders.folders', "Reopen all windows that had folders or workspaces opened unless a folder, workspace or file is opened (e.g. from the command line). If a file is opened, it will replace any of the editors that were previously opened in a window."),
                    localize('window.reopenFolders.one', "Reopen the last active window unless a folder, workspace or file is opened (e.g. from the command line). If a file is opened, it will replace any of the editors that were previously opened in a window."),
                    localize('window.reopenFolders.none', "Never reopen a window. Unless a folder or workspace is opened (e.g. from the command line), an empty window will appear.")
                ],
                'default': 'all',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('restoreWindows', "Controls how windows and editors within are being restored when opening.")
            },
            'window.restoreFullscreen': {
                'type': 'boolean',
                'default': false,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('restoreFullscreen', "Controls whether a window should restore to full screen mode if it was exited in full screen mode.")
            },
            'window.zoomLevel': {
                'type': 'number',
                'default': 0,
                'minimum': MIN_ZOOM_LEVEL,
                'maximum': MAX_ZOOM_LEVEL,
                'markdownDescription': localize({ comment: ['{0} will be a setting name rendered as a link'], key: 'zoomLevel' }, "Adjust the default zoom level for all windows. Each increment above `0` (e.g. `1`) or below (e.g. `-1`) represents zooming `20%` larger or smaller. You can also enter decimals to adjust the zoom level with a finer granularity. See {0} for configuring if the 'Zoom In' and 'Zoom Out' commands apply the zoom level to all windows or only the active window.", '`#window.zoomPerWindow#`'),
                ignoreSync: true,
                tags: ['accessibility']
            },
            'window.zoomPerWindow': {
                'type': 'boolean',
                'default': true,
                'markdownDescription': localize({ comment: ['{0} will be a setting name rendered as a link'], key: 'zoomPerWindow' }, "Controls if the 'Zoom In' and 'Zoom Out' commands apply the zoom level to all windows or only the active window. See {0} for configuring a default zoom level for all windows.", '`#window.zoomLevel#`'),
                tags: ['accessibility']
            },
            'window.newWindowDimensions': {
                'type': 'string',
                'enum': ['default', 'inherit', 'offset', 'maximized', 'fullscreen'],
                'enumDescriptions': [
                    localize('window.newWindowDimensions.default', "Open new windows in the center of the screen."),
                    localize('window.newWindowDimensions.inherit', "Open new windows with same dimension as last active one."),
                    localize('window.newWindowDimensions.offset', "Open new windows with same dimension as last active one with an offset position."),
                    localize('window.newWindowDimensions.maximized', "Open new windows maximized."),
                    localize('window.newWindowDimensions.fullscreen', "Open new windows in full screen mode.")
                ],
                'default': 'default',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('newWindowDimensions', "Controls the dimensions of opening a new window when at least one window is already opened. Note that this setting does not have an impact on the first window that is opened. The first window will always restore the size and location as you left it before closing.")
            },
            'window.closeWhenEmpty': {
                'type': 'boolean',
                'default': false,
                'description': localize('closeWhenEmpty', "Controls whether closing the last editor should also close the window. This setting only applies for windows that do not show folders.")
            },
            'window.doubleClickIconToClose': {
                'type': 'boolean',
                'default': false,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': localize('window.doubleClickIconToClose', "If enabled, this setting will close the window when the application icon in the title bar is double-clicked. The window will not be able to be dragged by the icon. This setting is effective only if {0} is set to `custom`.", '`#window.titleBarStyle#`')
            },
            'window.titleBarStyle': {
                'type': 'string',
                'enum': ['native', 'custom'],
                'default': 'custom',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('titleBarStyle', "Adjust the appearance of the window title bar to be native by the OS or custom. Changes require a full restart to apply."),
            },
            'window.controlsStyle': {
                'type': 'string',
                'enum': ['native', 'custom', 'hidden'],
                'default': 'native',
                'included': !isMacintosh,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('controlsStyle', "Adjust the appearance of the window controls to be native by the OS, custom drawn or hidden. Changes require a full restart to apply."),
            },
            'window.customTitleBarVisibility': {
                'type': 'string',
                'enum': ['auto', 'windowed', 'never'],
                'markdownEnumDescriptions': [
                    localize(`window.customTitleBarVisibility.auto`, "Automatically changes custom title bar visibility."),
                    localize(`window.customTitleBarVisibility.windowed`, "Hide custom titlebar in full screen. When not in full screen, automatically change custom title bar visibility."),
                    localize(`window.customTitleBarVisibility.never`, "Hide custom titlebar when {0} is set to `native`.", '`#window.titleBarStyle#`'),
                ],
                'default': 'auto',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': localize('window.customTitleBarVisibility', "Adjust when the custom title bar should be shown. The custom title bar can be hidden when in full screen mode with `windowed`. The custom title bar can only be hidden in non full screen mode with `never` when {0} is set to `native`.", '`#window.titleBarStyle#`'),
            },
            'window.menuStyle': {
                'type': 'string',
                'enum': ['custom', 'native', 'inherit'],
                'markdownEnumDescriptions': isMacintosh ?
                    [
                        localize(`window.menuStyle.custom.mac`, "Use the custom context menu."),
                        localize(`window.menuStyle.native.mac`, "Use the native context menu."),
                        localize(`window.menuStyle.inherit.mac`, "Matches the context menu style to the title bar style defined in {0}.", '`#window.titleBarStyle#`'),
                    ] :
                    [
                        localize(`window.menuStyle.custom`, "Use the custom menu."),
                        localize(`window.menuStyle.native`, "Use the native menu. This is ignored when {0} is set to {1}.", '`#window.titleBarStyle#`', '`custom`'),
                        localize(`window.menuStyle.inherit`, "Matches the menu style to the title bar style defined in {0}.", '`#window.titleBarStyle#`'),
                    ],
                'default': isMacintosh ? 'native' : 'inherit',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': isMacintosh ?
                    localize('window.menuStyle.mac', "Adjust the context menu appearances to either be native by the OS, custom, or inherited from the title bar style defined in {0}.", '`#window.titleBarStyle#`') :
                    localize('window.menuStyle', "Adjust the menu style to either be native by the OS, custom, or inherited from the title bar style defined in {0}. This also affects the context menu appearance. Changes require a full restart to apply.", '`#window.titleBarStyle#`'),
            },
            'window.dialogStyle': {
                'type': 'string',
                'enum': ['native', 'custom'],
                'default': 'native',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('dialogStyle', "Adjust the appearance of dialogs to be native by the OS or custom.")
            },
            'window.nativeTabs': {
                'type': 'boolean',
                'default': false,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('window.nativeTabs', "Enables macOS native window tabs. Note that changes require a full restart to apply and that native tabs will disable a custom title bar style if configured."),
                'included': isMacintosh,
            },
            'window.nativeFullScreen': {
                'type': 'boolean',
                'default': true,
                'description': localize('window.nativeFullScreen', "Controls if native full-screen should be used on macOS. Disable this option to prevent macOS from creating a new space when going full-screen."),
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'included': isMacintosh
            },
            'window.clickThroughInactive': {
                'type': 'boolean',
                'default': true,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('window.clickThroughInactive', "If enabled, clicking on an inactive window will both activate the window and trigger the element under the mouse if it is clickable. If disabled, clicking anywhere on an inactive window will activate it only and a second click is required on the element."),
                'included': isMacintosh
            },
            'window.border': {
                'type': 'string',
                'default': 'default',
                'markdownDescription': (() => {
                    let windowBorderDescription = localize('window.border.prefix', "Controls the border color of the window:");
                    windowBorderDescription += '\n- ' + [
                        localize('window.border.default', "{0}: respect color theme settings, fallback to Windows settings", '`default`'),
                        localize('window.border.system', "{0}: respect Windows settings only", '`system`'),
                        localize('window.border.off', "{0}: disable border colors", '`off`'),
                        localize('window.border.color', "{0}: specific color in Hex, RGB, RGBA, HSL, HSLA format", '`<color>`'),
                    ].join('\n- ');
                    windowBorderDescription += '\n\n' + localize('window.border.suffix', "Use {0} to set different colors for active and inactive windows. This setting is ignored when {1} is set to {2}.", '`#workbench.colorCustomizations#`', '`#window.titleBarStyle#`', '`native`');
                    return windowBorderDescription;
                })(),
                'included': isWindows
            }
        }
    });
    // Telemetry
    registry.registerConfiguration({
        'id': 'telemetry',
        'order': 110,
        title: localize('telemetryConfigurationTitle', "Telemetry"),
        'type': 'object',
        'properties': {
            'telemetry.enableCrashReporter': {
                'type': 'boolean',
                'description': localize('telemetry.enableCrashReporting', "Enable crash reports to be collected. This helps us improve stability. \nThis option requires restart to take effect."),
                'default': true,
                'tags': ['usesOnlineServices', 'telemetry'],
                'markdownDeprecationMessage': localize('enableCrashReporterDeprecated', "If this setting is false, no telemetry will be sent regardless of the new setting's value. Deprecated due to being combined into the {0} setting.", `\`#${TELEMETRY_SETTING_ID}#\``),
            }
        }
    });
    // Keybinding
    registry.registerConfiguration({
        'id': 'keyboard',
        'order': 15,
        'type': 'object',
        'title': localize('keyboardConfigurationTitle', "Keyboard"),
        'properties': {
            'keyboard.touchbar.enabled': {
                'type': 'boolean',
                'default': true,
                'description': localize('touchbar.enabled', "Enables the macOS touchbar buttons on the keyboard if available."),
                'included': isMacintosh
            },
            'keyboard.touchbar.ignored': {
                'type': 'array',
                'items': {
                    'type': 'string'
                },
                'default': [],
                'markdownDescription': localize('touchbar.ignored', 'A set of identifiers for entries in the touchbar that should not show up (for example `workbench.action.navigateBack`).'),
                'included': isMacintosh
            }
        }
    });
    // Security
    registry.registerConfiguration({
        ...securityConfigurationNodeBase,
        'properties': {
            'security.promptForLocalFileProtocolHandling': {
                'type': 'boolean',
                'default': true,
                'markdownDescription': localize('security.promptForLocalFileProtocolHandling', 'If enabled, a dialog will ask for confirmation whenever a local file or workspace is about to open through a protocol handler.'),
                'scope': 1 /* ConfigurationScope.APPLICATION */
            },
            'security.promptForRemoteFileProtocolHandling': {
                'type': 'boolean',
                'default': true,
                'markdownDescription': localize('security.promptForRemoteFileProtocolHandling', 'If enabled, a dialog will ask for confirmation whenever a remote file or workspace is about to open through a protocol handler.'),
                'scope': 1 /* ConfigurationScope.APPLICATION */
            }
        }
    });
})();
// JSON Schemas
(function registerJSONSchemas() {
    const argvDefinitionFileSchemaId = 'vscode://schemas/argv';
    const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
    const schema = {
        id: argvDefinitionFileSchemaId,
        allowComments: true,
        allowTrailingCommas: true,
        description: 'VSCode static command line definition file',
        type: 'object',
        additionalProperties: false,
        properties: {
            locale: {
                type: 'string',
                description: localize('argv.locale', 'The display Language to use. Picking a different language requires the associated language pack to be installed.')
            },
            'disable-lcd-text': {
                type: 'boolean',
                description: localize('argv.disableLcdText', 'Disables LCD font antialiasing.')
            },
            'proxy-bypass-list': {
                type: 'string',
                description: localize('argv.proxyBypassList', 'Bypass any specified proxy for the given semi-colon-separated list of hosts. Example value "<local>;*.microsoft.com;*foo.com;1.2.3.4:5678", will use the proxy server for all hosts except for local addresses (localhost, 127.0.0.1 etc.), microsoft.com subdomains, hosts that contain the suffix foo.com and anything at 1.2.3.4:5678')
            },
            'disable-hardware-acceleration': {
                type: 'boolean',
                description: localize('argv.disableHardwareAcceleration', 'Disables hardware acceleration. ONLY change this option if you encounter graphic issues.')
            },
            'force-color-profile': {
                type: 'string',
                markdownDescription: localize('argv.forceColorProfile', 'Allows to override the color profile to use. If you experience colors appear badly, try to set this to `srgb` and restart.')
            },
            'enable-crash-reporter': {
                type: 'boolean',
                markdownDescription: localize('argv.enableCrashReporter', 'Allows to disable crash reporting, should restart the app if the value is changed.')
            },
            'crash-reporter-id': {
                type: 'string',
                markdownDescription: localize('argv.crashReporterId', 'Unique id used for correlating crash reports sent from this app instance.')
            },
            'enable-proposed-api': {
                type: 'array',
                description: localize('argv.enebleProposedApi', "Enable proposed APIs for a list of extension ids (such as \`vscode.git\`). Proposed APIs are unstable and subject to breaking without warning at any time. This should only be set for extension development and testing purposes."),
                items: {
                    type: 'string'
                }
            },
            'log-level': {
                type: ['string', 'array'],
                description: localize('argv.logLevel', "Log level to use. Default is 'info'. Allowed values are 'error', 'warn', 'info', 'debug', 'trace', 'off'.")
            },
            'disable-chromium-sandbox': {
                type: 'boolean',
                description: localize('argv.disableChromiumSandbox', "Disables the Chromium sandbox. This is useful when running VS Code as elevated on Linux and running under Applocker on Windows.")
            },
            'use-inmemory-secretstorage': {
                type: 'boolean',
                description: localize('argv.useInMemorySecretStorage', "Ensures that an in-memory store will be used for secret storage instead of using the OS's credential store. This is often used when running VS Code extension tests or when you're experiencing difficulties with the credential store.")
            },
            'remote-debugging-port': {
                type: 'string',
                description: localize('argv.remoteDebuggingPort', "Specifies the port to use for remote debugging.")
            }
        }
    };
    if (isLinux) {
        schema.properties['force-renderer-accessibility'] = {
            type: 'boolean',
            description: localize('argv.force-renderer-accessibility', 'Forces the renderer to be accessible. ONLY change this if you are using a screen reader on Linux. On other platforms the renderer will automatically be accessible. This flag is automatically set if you have editor.accessibilitySupport: on.'),
        };
        schema.properties['password-store'] = {
            type: 'string',
            description: localize('argv.passwordStore', "Configures the backend used to store secrets on Linux. This argument is ignored on Windows & macOS.")
        };
    }
    if (isWindows) {
        schema.properties['enable-rdp-display-tracking'] = {
            type: 'boolean',
            description: localize('argv.enableRDPDisplayTracking', "Ensures that maximized windows gets restored to correct display during RDP reconnection.")
        };
    }
    jsonRegistry.registerSchema(argvDefinitionFileSchemaId, schema);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVza3RvcC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvZWxlY3Ryb24tYnJvd3Nlci9kZXNrdG9wLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDbkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDakcsT0FBTyxFQUEwQixVQUFVLElBQUksdUJBQXVCLEVBQXNCLE1BQU0sOERBQThELENBQUM7QUFFakssT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDaEYsT0FBTyxFQUFFLCtCQUErQixFQUFFLG9CQUFvQixFQUFFLHdDQUF3QyxFQUFFLHdCQUF3QixFQUFFLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzFNLE9BQU8sRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBRSx1QkFBdUIsRUFBRSxtQkFBbUIsRUFBRSw0QkFBNEIsRUFBRSx3QkFBd0IsRUFBRSwrQkFBK0IsRUFBRSw2QkFBNkIsRUFBRSwwQkFBMEIsRUFBRSw2QkFBNkIsRUFBRSw4QkFBOEIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2phLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsbUJBQW1CLEVBQW9CLE1BQU0seURBQXlE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