/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isStandalone } from '../../base/browser/browser.js';
import { isLinux, isMacintosh, isNative, isWeb, isWindows } from '../../base/common/platform.js';
import { localize } from '../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { ConfigurationMigrationWorkbenchContribution, DynamicWindowConfiguration, DynamicWorkbenchSecurityConfiguration, Extensions, problemsConfigurationNodeBase, windowConfigurationNodeBase, workbenchConfigurationNodeBase } from '../common/configuration.js';
import { registerWorkbenchContribution2 } from '../common/contributions.js';
import { CustomEditorLabelService } from '../services/editor/common/customEditorLabelService.js';
import { defaultWindowTitle, defaultWindowTitleSeparator } from './parts/titlebar/windowTitle.js';
const registry = Registry.as(ConfigurationExtensions.Configuration);
// Configuration
(function registerConfiguration() {
    // Migration support
    registerWorkbenchContribution2(ConfigurationMigrationWorkbenchContribution.ID, ConfigurationMigrationWorkbenchContribution, 4 /* WorkbenchPhase.Eventually */);
    // Dynamic Configuration
    registerWorkbenchContribution2(DynamicWorkbenchSecurityConfiguration.ID, DynamicWorkbenchSecurityConfiguration, 3 /* WorkbenchPhase.AfterRestored */);
    // Workbench
    registry.registerConfiguration({
        ...workbenchConfigurationNodeBase,
        'properties': {
            'workbench.externalBrowser': {
                type: 'string',
                markdownDescription: localize(4132, null),
                included: isNative,
                restricted: true
            },
            'workbench.editor.titleScrollbarSizing': {
                type: 'string',
                enum: ['default', 'large'],
                enumDescriptions: [
                    localize(4133, null),
                    localize(4134, null)
                ],
                description: localize(4135, null),
                default: 'default',
            },
            'workbench.editor.titleScrollbarVisibility': {
                type: 'string',
                enum: ['auto', 'visible', 'hidden'],
                enumDescriptions: [
                    localize(4136, null),
                    localize(4137, null),
                    localize(4138, null)
                ],
                description: localize(4139, null),
                default: 'auto',
            },
            ["workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */]: {
                'type': 'string',
                'enum': ["multiple" /* EditorTabsMode.MULTIPLE */, "single" /* EditorTabsMode.SINGLE */, "none" /* EditorTabsMode.NONE */],
                'enumDescriptions': [
                    localize(4140, null),
                    localize(4141, null),
                    localize(4142, null),
                ],
                'description': localize(4143, null),
                'default': 'multiple'
            },
            ["workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */]: {
                'type': 'string',
                'enum': ["default" /* EditorActionsLocation.DEFAULT */, "titleBar" /* EditorActionsLocation.TITLEBAR */, "hidden" /* EditorActionsLocation.HIDDEN */],
                'markdownEnumDescriptions': [
                    localize(4144, null, '`#workbench.editor.showTabs#`', '`none`'),
                    localize(4145, null, '`#window.customTitleBarVisibility#`', '`never`'),
                    localize(4146, null),
                ],
                'markdownDescription': localize(4147, null),
                'default': 'default'
            },
            'workbench.editor.alwaysShowEditorActions': {
                'type': 'boolean',
                'markdownDescription': localize(4148, null),
                'default': false
            },
            'workbench.editor.wrapTabs': {
                'type': 'boolean',
                'markdownDescription': localize(4149, null, '`#workbench.editor.showTabs#`', '`multiple`'),
                'default': false
            },
            'workbench.editor.scrollToSwitchTabs': {
                'type': 'boolean',
                'markdownDescription': localize(4150, null, '`#workbench.editor.showTabs#`', '`multiple`'),
                'default': false
            },
            'workbench.editor.highlightModifiedTabs': {
                'type': 'boolean',
                'markdownDescription': localize(4151, null, '`#workbench.editor.showTabs#`', `multiple`),
                'default': false
            },
            'workbench.editor.decorations.badges': {
                'type': 'boolean',
                'markdownDescription': localize(4152, null),
                'default': true
            },
            'workbench.editor.decorations.colors': {
                'type': 'boolean',
                'markdownDescription': localize(4153, null),
                'default': true
            },
            [CustomEditorLabelService.SETTING_ID_ENABLED]: {
                'type': 'boolean',
                'markdownDescription': localize(4154, null),
                'default': true,
            },
            [CustomEditorLabelService.SETTING_ID_PATTERNS]: {
                'type': 'object',
                'markdownDescription': (() => {
                    let customEditorLabelDescription = localize(4155, null);
                    customEditorLabelDescription += '\n- ' + [
                        localize(4156, null),
                        localize(4157, null),
                        localize(4158, null),
                        localize(4159, null),
                        localize(4160, null),
                    ].join('\n- '); // intentionally concatenated to not produce a string that is too long for translations
                    customEditorLabelDescription += '\n\n' + localize(4161, null);
                    return customEditorLabelDescription;
                })(),
                additionalProperties: {
                    type: ['string', 'null'],
                    markdownDescription: localize(4162, null),
                    minLength: 1,
                    pattern: '.*[a-zA-Z0-9].*'
                },
                'default': {}
            },
            'workbench.editor.labelFormat': {
                'type': 'string',
                'enum': ['default', 'short', 'medium', 'long'],
                'enumDescriptions': [
                    localize(4163, null),
                    localize(4164, null),
                    localize(4165, null),
                    localize(4166, null)
                ],
                'default': 'default',
                'description': localize(4167, null),
            },
            'workbench.editor.untitled.labelFormat': {
                'type': 'string',
                'enum': ['content', 'name'],
                'enumDescriptions': [
                    localize(4168, null),
                    localize(4169, null),
                ],
                'default': 'content',
                'description': localize(4170, null),
            },
            'workbench.editor.empty.hint': {
                'type': 'string',
                'enum': ['text', 'hidden'],
                'default': 'text',
                'markdownDescription': localize(4171, null)
            },
            'workbench.editor.languageDetection': {
                type: 'boolean',
                default: true,
                description: localize(4172, null),
                scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
            },
            'workbench.editor.historyBasedLanguageDetection': {
                type: 'boolean',
                default: true,
                description: localize(4173, null),
            },
            'workbench.editor.preferHistoryBasedLanguageDetection': {
                type: 'boolean',
                default: false,
                description: localize(4174, null),
            },
            'workbench.editor.languageDetectionHints': {
                type: 'object',
                default: { 'untitledEditors': true, 'notebookEditors': true },
                description: localize(4175, null),
                additionalProperties: false,
                properties: {
                    untitledEditors: {
                        type: 'boolean',
                        description: localize(4176, null),
                    },
                    notebookEditors: {
                        type: 'boolean',
                        description: localize(4177, null),
                    }
                }
            },
            'workbench.editor.tabActionLocation': {
                type: 'string',
                enum: ['left', 'right'],
                default: 'right',
                markdownDescription: localize(4178, null, '`#workbench.editor.showTabs#`', '`multiple`')
            },
            'workbench.editor.tabActionCloseVisibility': {
                type: 'boolean',
                default: true,
                description: localize(4179, null)
            },
            'workbench.editor.tabActionUnpinVisibility': {
                type: 'boolean',
                default: true,
                description: localize(4180, null)
            },
            'workbench.editor.showTabIndex': {
                'type': 'boolean',
                'default': false,
                'markdownDescription': localize(4181, null, '`#workbench.editor.showTabs#`', '`multiple`')
            },
            'workbench.editor.tabSizing': {
                'type': 'string',
                'enum': ['fit', 'shrink', 'fixed'],
                'default': 'fit',
                'enumDescriptions': [
                    localize(4182, null),
                    localize(4183, null),
                    localize(4184, null)
                ],
                'markdownDescription': localize(4185, null, '`#workbench.editor.showTabs#`', '`multiple`')
            },
            'workbench.editor.tabSizingFixedMinWidth': {
                'type': 'number',
                'default': 50,
                'minimum': 38,
                'markdownDescription': localize(4186, null, '`#workbench.editor.tabSizing#`', '`fixed`')
            },
            'workbench.editor.tabSizingFixedMaxWidth': {
                'type': 'number',
                'default': 160,
                'minimum': 38,
                'markdownDescription': localize(4187, null, '`#workbench.editor.tabSizing#`', '`fixed`')
            },
            'window.density.editorTabHeight': {
                'type': 'string',
                'enum': ['default', 'compact'],
                'default': 'default',
                'markdownDescription': localize(4188, null, '`#workbench.editor.showTabs#`', '`multiple`')
            },
            'workbench.editor.pinnedTabSizing': {
                'type': 'string',
                'enum': ['normal', 'compact', 'shrink'],
                'default': 'normal',
                'enumDescriptions': [
                    localize(4189, null),
                    localize(4190, null),
                    localize(4191, null)
                ],
                'markdownDescription': localize(4192, null, '`#workbench.editor.showTabs#`', '`multiple`')
            },
            'workbench.editor.pinnedTabsOnSeparateRow': {
                'type': 'boolean',
                'default': false,
                'markdownDescription': localize(4193, null, '`#workbench.editor.showTabs#`', '`multiple`'),
            },
            'workbench.editor.preventPinnedEditorClose': {
                'type': 'string',
                'enum': ['keyboardAndMouse', 'keyboard', 'mouse', 'never'],
                'default': 'keyboardAndMouse',
                'enumDescriptions': [
                    localize(4194, null),
                    localize(4195, null),
                    localize(4196, null),
                    localize(4197, null)
                ],
                description: localize(4198, null),
            },
            'workbench.editor.splitSizing': {
                'type': 'string',
                'enum': ['auto', 'distribute', 'split'],
                'default': 'auto',
                'enumDescriptions': [
                    localize(4199, null),
                    localize(4200, null),
                    localize(4201, null)
                ],
                'description': localize(4202, null)
            },
            'workbench.editor.splitOnDragAndDrop': {
                'type': 'boolean',
                'default': true,
                'description': localize(4203, null)
            },
            'workbench.editor.dragToOpenWindow': {
                'type': 'boolean',
                'default': true,
                'markdownDescription': localize(4204, null)
            },
            'workbench.editor.focusRecentEditorAfterClose': {
                'type': 'boolean',
                'description': localize(4205, null),
                'default': true
            },
            'workbench.editor.showIcons': {
                'type': 'boolean',
                'description': localize(4206, null),
                'default': true
            },
            'workbench.editor.enablePreview': {
                'type': 'boolean',
                'description': localize(4207, null),
                'default': true
            },
            'workbench.editor.enablePreviewFromQuickOpen': {
                'type': 'boolean',
                'markdownDescription': localize(4208, null, '`#workbench.editor.showTabs#`', '`multiple`'),
                'default': false
            },
            'workbench.editor.enablePreviewFromCodeNavigation': {
                'type': 'boolean',
                'markdownDescription': localize(4209, null, '`#workbench.editor.showTabs#`', '`multiple`'),
                'default': false
            },
            'workbench.editor.closeOnFileDelete': {
                'type': 'boolean',
                'description': localize(4210, null),
                'default': false
            },
            'workbench.editor.openPositioning': {
                'type': 'string',
                'enum': ['left', 'right', 'first', 'last'],
                'default': 'right',
                'markdownDescription': localize(4211, null, '`left`', '`right`', '`first`', '`last`')
            },
            'workbench.editor.openSideBySideDirection': {
                'type': 'string',
                'enum': ['right', 'down'],
                'default': 'right',
                'markdownDescription': localize(4212, null)
            },
            'workbench.editor.closeEmptyGroups': {
                'type': 'boolean',
                'description': localize(4213, null),
                'default': true
            },
            'workbench.editor.revealIfOpen': {
                'type': 'boolean',
                'description': localize(4214, null),
                'default': false
            },
            'workbench.editor.swipeToNavigate': {
                'type': 'boolean',
                'description': localize(4215, null),
                'default': false,
                'included': isMacintosh && !isWeb
            },
            'workbench.editor.mouseBackForwardToNavigate': {
                'type': 'boolean',
                'description': localize(4216, null),
                'default': true
            },
            'workbench.editor.navigationScope': {
                'type': 'string',
                'enum': ['default', 'editorGroup', 'editor'],
                'default': 'default',
                'markdownDescription': localize(4217, null),
                'enumDescriptions': [
                    localize(4218, null),
                    localize(4219, null),
                    localize(4220, null)
                ],
            },
            'workbench.editor.restoreViewState': {
                'type': 'boolean',
                'markdownDescription': localize(4221, null, '`#workbench.editor.sharedViewState#`'),
                'default': true,
                'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
            },
            'workbench.editor.sharedViewState': {
                'type': 'boolean',
                'description': localize(4222, null),
                'default': false
            },
            'workbench.editor.splitInGroupLayout': {
                'type': 'string',
                'enum': ['vertical', 'horizontal'],
                'default': 'horizontal',
                'markdownDescription': localize(4223, null),
                'enumDescriptions': [
                    localize(4224, null),
                    localize(4225, null)
                ]
            },
            'workbench.editor.centeredLayoutAutoResize': {
                'type': 'boolean',
                'default': true,
                'description': localize(4226, null)
            },
            'workbench.editor.centeredLayoutFixedWidth': {
                'type': 'boolean',
                'default': false,
                'description': localize(4227, null)
            },
            'workbench.editor.doubleClickTabToToggleEditorGroupSizes': {
                'type': 'string',
                'enum': ['maximize', 'expand', 'off'],
                'default': 'expand',
                'markdownDescription': localize(4228, null, '`#workbench.editor.showTabs#`', '`multiple`'),
                'enumDescriptions': [
                    localize(4229, null),
                    localize(4230, null),
                    localize(4231, null)
                ]
            },
            'workbench.editor.limit.enabled': {
                'type': 'boolean',
                'default': false,
                'description': localize(4232, null)
            },
            'workbench.editor.limit.value': {
                'type': 'number',
                'default': 10,
                'exclusiveMinimum': 0,
                'markdownDescription': localize(4233, null, '`#workbench.editor.limit.perEditorGroup#`')
            },
            'workbench.editor.limit.excludeDirty': {
                'type': 'boolean',
                'default': false,
                'description': localize(4234, null)
            },
            'workbench.editor.limit.perEditorGroup': {
                'type': 'boolean',
                'default': false,
                'description': localize(4235, null)
            },
            'workbench.localHistory.enabled': {
                'type': 'boolean',
                'default': true,
                'description': localize(4236, null),
                'scope': 5 /* ConfigurationScope.RESOURCE */
            },
            'workbench.localHistory.maxFileSize': {
                'type': 'number',
                'default': 256,
                'minimum': 1,
                'description': localize(4237, null),
                'scope': 5 /* ConfigurationScope.RESOURCE */
            },
            'workbench.localHistory.maxFileEntries': {
                'type': 'number',
                'default': 50,
                'minimum': 0,
                'description': localize(4238, null),
                'scope': 5 /* ConfigurationScope.RESOURCE */
            },
            'workbench.localHistory.exclude': {
                'type': 'object',
                'patternProperties': {
                    '.*': { 'type': 'boolean' }
                },
                'markdownDescription': localize(4239, null),
                'scope': 5 /* ConfigurationScope.RESOURCE */
            },
            'workbench.localHistory.mergeWindow': {
                'type': 'number',
                'default': 10,
                'minimum': 1,
                'markdownDescription': localize(4240, null),
                'scope': 5 /* ConfigurationScope.RESOURCE */
            },
            'workbench.commandPalette.history': {
                'type': 'number',
                'description': localize(4241, null),
                'default': 50,
                'minimum': 0
            },
            'workbench.commandPalette.preserveInput': {
                'type': 'boolean',
                'description': localize(4242, null),
                'default': false
            },
            'workbench.commandPalette.experimental.suggestCommands': {
                'type': 'boolean',
                tags: ['experimental'],
                'description': localize(4243, null),
                'default': false
            },
            'workbench.commandPalette.experimental.askChatLocation': {
                'type': 'string',
                tags: ['experimental'],
                'description': localize(4244, null),
                'default': 'chatView',
                enum: ['chatView', 'quickChat'],
                enumDescriptions: [
                    localize(4245, null),
                    localize(4246, null)
                ]
            },
            'workbench.commandPalette.showAskInChat': {
                'type': 'boolean',
                tags: ['experimental'],
                'description': localize(4247, null),
                'default': true
            },
            'workbench.commandPalette.experimental.enableNaturalLanguageSearch': {
                'type': 'boolean',
                tags: ['experimental'],
                'description': localize(4248, null),
                'default': true
            },
            'workbench.quickOpen.closeOnFocusLost': {
                'type': 'boolean',
                'description': localize(4249, null),
                'default': true
            },
            'workbench.quickOpen.preserveInput': {
                'type': 'boolean',
                'description': localize(4250, null),
                'default': false
            },
            'workbench.settings.openDefaultSettings': {
                'type': 'boolean',
                'description': localize(4251, null),
                'default': false
            },
            'workbench.settings.useSplitJSON': {
                'type': 'boolean',
                'markdownDescription': localize(4252, null),
                'default': false
            },
            'workbench.settings.openDefaultKeybindings': {
                'type': 'boolean',
                'description': localize(4253, null),
                'default': false
            },
            'workbench.sideBar.location': {
                'type': 'string',
                'enum': ['left', 'right'],
                'default': 'left',
                'description': localize(4254, null)
            },
            'workbench.panel.showLabels': {
                'type': 'boolean',
                'default': true,
                'description': localize(4255, null),
            },
            'workbench.panel.defaultLocation': {
                'type': 'string',
                'enum': ['left', 'bottom', 'top', 'right'],
                'default': 'bottom',
                'description': localize(4256, null),
            },
            'workbench.panel.opensMaximized': {
                'type': 'string',
                'enum': ['always', 'never', 'preserve'],
                'default': 'preserve',
                'description': localize(4257, null),
                'enumDescriptions': [
                    localize(4258, null),
                    localize(4259, null),
                    localize(4260, null)
                ]
            },
            'workbench.secondarySideBar.defaultVisibility': {
                'type': 'string',
                'enum': ['hidden', 'visibleInWorkspace', 'visible', 'maximizedInWorkspace', 'maximized'],
                'default': 'visibleInWorkspace',
                'description': localize(4261, null),
                'enumDescriptions': [
                    localize(4262, null),
                    localize(4263, null),
                    localize(4264, null),
                    localize(4265, null),
                    localize(4266, null)
                ]
            },
            'workbench.secondarySideBar.enableDefaultVisibilityInOldWorkspace': {
                'type': 'boolean',
                'default': false,
                'description': localize(4267, null),
                'tags': ['advanced'],
                'experiment': {
                    'mode': 'auto'
                }
            },
            'workbench.secondarySideBar.showLabels': {
                'type': 'boolean',
                'default': true,
                'markdownDescription': localize(4268, null, '`#workbench.activityBar.location#`', '`top`'),
            },
            'workbench.statusBar.visible': {
                'type': 'boolean',
                'default': true,
                'description': localize(4269, null)
            },
            ["workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */]: {
                'type': 'string',
                'enum': ['default', 'top', 'bottom', 'hidden'],
                'default': 'default',
                'markdownDescription': localize(4270, null),
                'enumDescriptions': [
                    localize(4271, null),
                    localize(4272, null),
                    localize(4273, null),
                    localize(4274, null)
                ],
            },
            'workbench.activityBar.iconClickBehavior': {
                'type': 'string',
                'enum': ['toggle', 'focus'],
                'default': 'toggle',
                'markdownDescription': localize(4275, null, '`#workbench.activityBar.location#`', '`default`'),
                'enumDescriptions': [
                    localize(4276, null),
                    localize(4277, null)
                ]
            },
            'workbench.view.alwaysShowHeaderActions': {
                'type': 'boolean',
                'default': false,
                'description': localize(4278, null)
            },
            'workbench.view.showQuietly': {
                'type': 'object',
                'description': localize(4279, null),
                'scope': 4 /* ConfigurationScope.WINDOW */,
                'properties': {
                    'workbench.panel.output': {
                        'type': 'boolean',
                        'description': localize(4280, null)
                    }
                },
                'additionalProperties': false
            },
            'workbench.fontAliasing': {
                'type': 'string',
                'enum': ['default', 'antialiased', 'none', 'auto'],
                'default': 'default',
                'description': localize(4281, null),
                'enumDescriptions': [
                    localize(4282, null),
                    localize(4283, null),
                    localize(4284, null),
                    localize(4285, null)
                ],
                'included': isMacintosh
            },
            'workbench.settings.editor': {
                'type': 'string',
                'enum': ['ui', 'json'],
                'enumDescriptions': [
                    localize(4286, null),
                    localize(4287, null),
                ],
                'description': localize(4288, null),
                'default': 'ui',
                'scope': 4 /* ConfigurationScope.WINDOW */
            },
            'workbench.settings.showAISearchToggle': {
                'type': 'boolean',
                'default': true,
                'description': localize(4289, null),
            },
            'workbench.hover.delay': {
                'type': 'number',
                'description': localize(4290, null),
                // Testing has indicated that on Windows and Linux 500 ms matches the native hovers most closely.
                // On Mac, the delay is 1500.
                'default': isMacintosh ? 1500 : 500,
                'minimum': 0
            },
            'workbench.reduceMotion': {
                type: 'string',
                description: localize(4291, null),
                'enumDescriptions': [
                    localize(4292, null),
                    localize(4293, null),
                    localize(4294, null),
                ],
                default: 'auto',
                tags: ['accessibility'],
                enum: ['on', 'off', 'auto']
            },
            'workbench.navigationControl.enabled': {
                'type': 'boolean',
                'default': true,
                'markdownDescription': isWeb ?
                    localize(4295, null) :
                    localize(4296, null, '`#window.customTitleBarVisibility#`', '`never`')
            },
            ["workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */]: {
                'type': 'boolean',
                'default': true,
                'markdownDescription': isWeb ?
                    localize(4297, null) :
                    localize(4298, null, '`#window.customTitleBarVisibility#`', '`never`')
            },
            'workbench.layoutControl.type': {
                'type': 'string',
                'enum': ['menu', 'toggles', 'both'],
                'enumDescriptions': [
                    localize(4299, null),
                    localize(4300, null),
                    localize(4301, null),
                ],
                'default': 'both',
                'description': localize(4302, null),
            },
            'workbench.tips.enabled': {
                'type': 'boolean',
                'default': true,
                'description': localize(4303, null)
            },
        }
    });
    // Window
    let windowTitleDescription = localize(4304, null);
    windowTitleDescription += '\n- ' + [
        localize(4305, null),
        localize(4306, null),
        localize(4307, null),
        localize(4308, null),
        localize(4309, null),
        localize(4310, null),
        localize(4311, null),
        localize(4312, null),
        localize(4313, null),
        localize(4314, null),
        localize(4315, null),
        localize(4316, null),
        localize(4317, null),
        localize(4318, null),
        localize(4319, null),
        localize(4320, null),
        localize(4321, null),
        localize(4322, null),
        localize(4323, null, '`accessibility.windowTitleOptimized`'),
        localize(4324, null)
    ].join('\n- '); // intentionally concatenated to not produce a string that is too long for translations
    registry.registerConfiguration({
        ...windowConfigurationNodeBase,
        'properties': {
            'window.title': {
                'type': 'string',
                'default': defaultWindowTitle,
                'markdownDescription': windowTitleDescription
            },
            'window.titleSeparator': {
                'type': 'string',
                'default': defaultWindowTitleSeparator,
                'markdownDescription': localize(4325, null, '`#window.title#`')
            },
            ["window.commandCenter" /* LayoutSettings.COMMAND_CENTER */]: {
                type: 'boolean',
                default: true,
                markdownDescription: isWeb ?
                    localize(4326, null) :
                    localize(4327, null, '`#window.customTitleBarVisibility#`', '`never`')
            },
            'window.menuBarVisibility': {
                'type': 'string',
                'enum': ['classic', 'visible', 'toggle', 'hidden', 'compact'],
                'markdownEnumDescriptions': [
                    localize(4328, null),
                    localize(4329, null),
                    isMacintosh ?
                        localize(4330, null) :
                        localize(4331, null),
                    localize(4332, null),
                    isWeb ?
                        localize(4333, null) :
                        localize(4334, null, '`#window.titleBarStyle#`', '`native`', '`#window.menuStyle#`', '`native`', '`inherit`')
                ],
                'default': isWeb ? 'compact' : 'classic',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': isMacintosh ?
                    localize(4335, null) :
                    localize(4336, null),
                'included': isWindows || isLinux || isWeb
            },
            'window.enableMenuBarMnemonics': {
                'type': 'boolean',
                'default': true,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize(4337, null),
                'included': isWindows || isLinux
            },
            'window.customMenuBarAltFocus': {
                'type': 'boolean',
                'default': true,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': localize(4338, null),
                'included': isWindows || isLinux
            },
            'window.openFilesInNewWindow': {
                'type': 'string',
                'enum': ['on', 'off', 'default'],
                'enumDescriptions': [
                    localize(4339, null),
                    localize(4340, null),
                    isMacintosh ?
                        localize(4341, null) :
                        localize(4342, null)
                ],
                'default': 'off',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': isMacintosh ?
                    localize(4343, null) :
                    localize(4344, null)
            },
            'window.openFoldersInNewWindow': {
                'type': 'string',
                'enum': ['on', 'off', 'default'],
                'enumDescriptions': [
                    localize(4345, null),
                    localize(4346, null),
                    localize(4347, null)
                ],
                'default': 'default',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': localize(4348, null)
            },
            'window.confirmBeforeClose': {
                'type': 'string',
                'enum': ['always', 'keyboardOnly', 'never'],
                'enumDescriptions': [
                    isWeb ?
                        localize(4349, null) :
                        localize(4350, null),
                    isWeb ?
                        localize(4351, null) :
                        localize(4352, null),
                    isWeb ?
                        localize(4353, null) :
                        localize(4354, null)
                ],
                'default': (isWeb && !isStandalone()) ? 'keyboardOnly' : 'never', // on by default in web, unless PWA, never on desktop
                'markdownDescription': isWeb ?
                    localize(4355, null) :
                    localize(4356, null),
                'scope': 1 /* ConfigurationScope.APPLICATION */
            }
        }
    });
    // Dynamic Window Configuration
    registerWorkbenchContribution2(DynamicWindowConfiguration.ID, DynamicWindowConfiguration, 4 /* WorkbenchPhase.Eventually */);
    // Problems
    registry.registerConfiguration({
        ...problemsConfigurationNodeBase,
        'properties': {
            'problems.visibility': {
                'type': 'boolean',
                'default': true,
                'description': localize(4357, null),
            },
        }
    });
    // Zen Mode
    registry.registerConfiguration({
        'id': 'zenMode',
        'order': 9,
        'title': localize(4358, null),
        'type': 'object',
        'properties': {
            'zenMode.fullScreen': {
                'type': 'boolean',
                'default': true,
                'description': localize(4359, null)
            },
            'zenMode.centerLayout': {
                'type': 'boolean',
                'default': true,
                'description': localize(4360, null)
            },
            'zenMode.showTabs': {
                'type': 'string',
                'enum': ['multiple', 'single', 'none'],
                'description': localize(4361, null),
                'enumDescriptions': [
                    localize(4362, null),
                    localize(4363, null),
                    localize(4364, null),
                ],
                'default': 'multiple'
            },
            'zenMode.hideStatusBar': {
                'type': 'boolean',
                'default': true,
                'description': localize(4365, null)
            },
            'zenMode.hideActivityBar': {
                'type': 'boolean',
                'default': true,
                'description': localize(4366, null)
            },
            'zenMode.hideLineNumbers': {
                'type': 'boolean',
                'default': true,
                'description': localize(4367, null)
            },
            'zenMode.restore': {
                'type': 'boolean',
                'default': true,
                'description': localize(4368, null)
            },
            'zenMode.silentNotifications': {
                'type': 'boolean',
                'default': true,
                'description': localize(4369, null)
            }
        }
    });
})();
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'workbench.activityBar.visible', migrateFn: (value) => {
            const result = [];
            if (value !== undefined) {
                result.push(['workbench.activityBar.visible', { value: undefined }]);
            }
            if (value === false) {
                result.push(["workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, { value: "hidden" /* ActivityBarPosition.HIDDEN */ }]);
            }
            return result;
        }
    }]);
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: "workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, migrateFn: (value) => {
            const results = [];
            if (value === 'side') {
                results.push(["workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, { value: "default" /* ActivityBarPosition.DEFAULT */ }]);
            }
            return results;
        }
    }]);
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'workbench.editor.doubleClickTabToToggleEditorGroupSizes', migrateFn: (value) => {
            const results = [];
            if (typeof value === 'boolean') {
                value = value ? 'expand' : 'off';
                results.push(['workbench.editor.doubleClickTabToToggleEditorGroupSizes', { value }]);
            }
            return results;
        }
    }, {
        key: "workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */, migrateFn: (value) => {
            const results = [];
            if (typeof value === 'boolean') {
                value = value ? "multiple" /* EditorTabsMode.MULTIPLE */ : "single" /* EditorTabsMode.SINGLE */;
                results.push(["workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */, { value }]);
            }
            return results;
        }
    }, {
        key: 'workbench.editor.tabCloseButton', migrateFn: (value) => {
            const result = [];
            if (value === 'left' || value === 'right') {
                result.push(['workbench.editor.tabActionLocation', { value }]);
            }
            else if (value === 'off') {
                result.push(['workbench.editor.tabActionCloseVisibility', { value: false }]);
            }
            return result;
        }
    }, {
        key: 'zenMode.hideTabs', migrateFn: (value) => {
            const result = [['zenMode.hideTabs', { value: undefined }]];
            if (value === true) {
                result.push(['zenMode.showTabs', { value: 'single' }]);
            }
            return result;
        }
    }]);
//# sourceMappingURL=workbench.contribution.js.map