/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import themePickerContent from './media/theme_picker.js';
import themePickerSmallContent from './media/theme_picker_small.js';
import notebookProfileContent from './media/notebookProfile.js';
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { NotebookSetting } from '../../notebook/common/notebookCommon.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import product from '../../../../platform/product/common/product.js';
const defaultChat = {
    documentationUrl: product.defaultChatAgent?.documentationUrl ?? '',
    manageSettingsUrl: product.defaultChatAgent?.manageSettingsUrl ?? '',
    provider: product.defaultChatAgent?.provider ?? { default: { name: '' } },
    publicCodeMatchesUrl: product.defaultChatAgent?.publicCodeMatchesUrl ?? '',
    termsStatementUrl: product.defaultChatAgent?.termsStatementUrl ?? '',
    privacyStatementUrl: product.defaultChatAgent?.privacyStatementUrl ?? ''
};
export const copilotSettingsMessage = localize(14420, null, defaultChat.provider.default.name, defaultChat.publicCodeMatchesUrl, defaultChat.manageSettingsUrl);
class GettingStartedContentProviderRegistry {
    constructor() {
        this.providers = new Map();
    }
    registerProvider(moduleId, provider) {
        this.providers.set(moduleId, provider);
    }
    getProvider(moduleId) {
        return this.providers.get(moduleId);
    }
}
export const gettingStartedContentRegistry = new GettingStartedContentProviderRegistry();
export async function moduleToContent(resource) {
    if (!resource.query) {
        throw new Error('Getting Started: invalid resource');
    }
    const query = JSON.parse(resource.query);
    if (!query.moduleId) {
        throw new Error('Getting Started: invalid resource');
    }
    const provider = gettingStartedContentRegistry.getProvider(query.moduleId);
    if (!provider) {
        throw new Error(`Getting Started: no provider registered for ${query.moduleId}`);
    }
    return provider();
}
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/theme_picker', themePickerContent);
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/theme_picker_small', themePickerSmallContent);
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/notebookProfile', notebookProfileContent);
// Register empty media for accessibility walkthrough
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/empty', () => '');
const setupIcon = registerIcon('getting-started-setup', Codicon.zap, localize(14421, null));
const beginnerIcon = registerIcon('getting-started-beginner', Codicon.lightbulb, localize(14422, null));
export const startEntries = [
    {
        id: 'welcome.showNewFileEntries',
        title: localize(14423, null),
        description: localize(14424, null),
        icon: Codicon.newFile,
        content: {
            type: 'startEntry',
            command: 'command:welcome.showNewFileEntries',
        }
    },
    {
        id: 'topLevelOpenMac',
        title: localize(14425, null),
        description: localize(14426, null),
        icon: Codicon.folderOpened,
        when: '!isWeb && isMac',
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFileFolder',
        }
    },
    {
        id: 'topLevelOpenFile',
        title: localize(14427, null),
        description: localize(14428, null),
        icon: Codicon.goToFile,
        when: 'isWeb || !isMac',
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFile',
        }
    },
    {
        id: 'topLevelOpenFolder',
        title: localize(14429, null),
        description: localize(14430, null),
        icon: Codicon.folderOpened,
        when: '!isWeb && !isMac',
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFolder',
        }
    },
    {
        id: 'topLevelOpenFolderWeb',
        title: localize(14431, null),
        description: localize(14432, null),
        icon: Codicon.folderOpened,
        when: '!openFolderWorkspaceSupport && workbenchState == \'workspace\'',
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFolderViaWorkspace',
        }
    },
    {
        id: 'topLevelGitClone',
        title: localize(14433, null),
        description: localize(14434, null),
        when: 'config.git.enabled && !git.missing',
        icon: Codicon.sourceControl,
        content: {
            type: 'startEntry',
            command: 'command:git.clone',
        }
    },
    {
        id: 'topLevelGitOpen',
        title: localize(14435, null),
        description: localize(14436, null),
        when: 'workspacePlatform == \'webworker\'',
        icon: Codicon.sourceControl,
        content: {
            type: 'startEntry',
            command: 'command:remoteHub.openRepository',
        }
    },
    {
        id: 'topLevelRemoteOpen',
        title: localize(14437, null),
        description: localize(14438, null),
        when: '!isWeb',
        icon: Codicon.remote,
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.remote.showMenu',
        }
    },
    {
        id: 'topLevelOpenTunnel',
        title: localize(14439, null),
        description: localize(14440, null),
        when: 'isWeb && showRemoteStartEntryInWeb',
        icon: Codicon.remote,
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.remote.showWebStartEntryActions',
        }
    },
    {
        id: 'topLevelNewWorkspaceChat',
        title: localize(14441, null),
        description: localize(14442, null),
        icon: Codicon.chatSparkle,
        when: '!isWeb && !chatSetupHidden',
        content: {
            type: 'startEntry',
            command: 'command:welcome.newWorkspaceChat',
        }
    },
];
const Button = (title, href) => `[${title}](${href})`;
const CopilotStepTitle = localize(14443, null);
const CopilotDescription = localize(14444, null, defaultChat.documentationUrl ?? '');
const CopilotTermsString = localize(14445, null, defaultChat.provider.default.name, defaultChat.provider.default.name, defaultChat.termsStatementUrl, defaultChat.privacyStatementUrl);
const CopilotAnonymousButton = Button(localize(14446, null), `command:workbench.action.chat.triggerSetupAnonymousWithoutDialog`);
const CopilotSignedOutButton = Button(localize(14447, null), `command:workbench.action.chat.triggerSetup`);
const CopilotSignedInButton = Button(localize(14448, null), `command:workbench.action.chat.triggerSetup`);
const CopilotCompleteButton = Button(localize(14449, null), 'command:workbench.action.chat.open');
function createCopilotSetupStep(id, button, when, includeTerms) {
    const description = includeTerms ?
        `${CopilotDescription}\n${CopilotTermsString}\n${button}` :
        `${CopilotDescription}\n${button}`;
    return {
        id,
        title: CopilotStepTitle,
        description,
        when: `${when} && !chatSetupHidden`,
        media: {
            type: 'svg', altText: 'VS Code Copilot multi file edits', path: 'multi-file-edits.svg'
        },
    };
}
export const walkthroughs = [
    {
        id: 'Setup',
        title: localize(14450, null),
        description: localize(14451, null),
        isFeatured: true,
        icon: setupIcon,
        when: '!isWeb',
        walkthroughPageTitle: localize(14452, null),
        next: 'Beginner',
        content: {
            type: 'steps',
            steps: [
                createCopilotSetupStep('CopilotSetupAnonymous', CopilotAnonymousButton, 'chatAnonymous && !chatSetupInstalled', true),
                createCopilotSetupStep('CopilotSetupSignedOut', CopilotSignedOutButton, 'chatEntitlementSignedOut && !chatAnonymous', false),
                createCopilotSetupStep('CopilotSetupComplete', CopilotCompleteButton, 'chatSetupInstalled && !chatSetupDisabled && (chatAnonymous || chatPlanPro || chatPlanProPlus || chatPlanBusiness || chatPlanEnterprise || chatPlanFree)', false),
                createCopilotSetupStep('CopilotSetupSignedIn', CopilotSignedInButton, '!chatEntitlementSignedOut && (!chatSetupInstalled || chatSetupDisabled || chatPlanCanSignUp)', false),
                {
                    id: 'pickColorTheme',
                    title: localize(14453, null),
                    description: localize(14454, null, Button(localize(14455, null), 'command:workbench.action.selectTheme')),
                    completionEvents: [
                        'onSettingChanged:workbench.colorTheme',
                        'onCommand:workbench.action.selectTheme'
                    ],
                    media: { type: 'markdown', path: 'theme_picker', }
                },
                {
                    id: 'videoTutorial',
                    title: localize(14456, null),
                    description: localize(14457, null, Button(localize(14458, null), 'https://aka.ms/vscode-getting-started-video')),
                    media: { type: 'svg', altText: 'VS Code Settings', path: 'learn.svg' },
                }
            ]
        }
    },
    {
        id: 'SetupWeb',
        title: localize(14459, null),
        description: localize(14460, null),
        isFeatured: true,
        icon: setupIcon,
        when: 'isWeb',
        next: 'Beginner',
        walkthroughPageTitle: localize(14461, null),
        content: {
            type: 'steps',
            steps: [
                {
                    id: 'pickColorThemeWeb',
                    title: localize(14462, null),
                    description: localize(14463, null, Button(localize(14464, null), 'command:workbench.action.selectTheme')),
                    completionEvents: [
                        'onSettingChanged:workbench.colorTheme',
                        'onCommand:workbench.action.selectTheme'
                    ],
                    media: { type: 'markdown', path: 'theme_picker', }
                },
                {
                    id: 'menuBarWeb',
                    title: localize(14465, null),
                    description: localize(14466, null, Button(localize(14467, null), 'command:workbench.action.toggleMenuBar')),
                    when: 'isWeb',
                    media: {
                        type: 'svg', altText: 'Comparing menu dropdown with the visible menu bar.', path: 'menuBar.svg'
                    },
                },
                {
                    id: 'extensionsWebWeb',
                    title: localize(14468, null),
                    description: localize(14469, null, Button(localize(14470, null), 'command:workbench.extensions.action.showPopularExtensions')),
                    when: 'workspacePlatform == \'webworker\'',
                    media: {
                        type: 'svg', altText: 'VS Code extension marketplace with featured language extensions', path: 'extensions-web.svg'
                    },
                },
                {
                    id: 'findLanguageExtensionsWeb',
                    title: localize(14471, null),
                    description: localize(14472, null, Button(localize(14473, null), 'command:workbench.extensions.action.showLanguageExtensions')),
                    when: 'workspacePlatform != \'webworker\'',
                    media: {
                        type: 'svg', altText: 'Language extensions', path: 'languages.svg'
                    },
                },
                {
                    id: 'settingsSyncWeb',
                    title: localize(14474, null),
                    description: localize(14475, null, Button(localize(14476, null), 'command:workbench.userDataSync.actions.turnOn')),
                    when: 'syncStatus != uninitialized',
                    completionEvents: ['onEvent:sync-enabled'],
                    media: {
                        type: 'svg', altText: 'The "Turn on Sync" entry in the settings gear menu.', path: 'settingsSync.svg'
                    },
                },
                {
                    id: 'commandPaletteTaskWeb',
                    title: localize(14477, null),
                    description: localize(14478, null, Button(localize(14479, null), 'command:workbench.action.showCommands')),
                    media: { type: 'svg', altText: 'Command Palette overlay for searching and executing commands.', path: 'commandPalette.svg' },
                },
                {
                    id: 'pickAFolderTask-WebWeb',
                    title: localize(14480, null),
                    description: localize(14481, null, Button(localize(14482, null), 'command:workbench.action.addRootFolder'), Button(localize(14483, null), 'command:remoteHub.openRepository')),
                    when: 'workspaceFolderCount == 0',
                    media: {
                        type: 'svg', altText: 'Explorer view showing buttons for opening folder and cloning repository.', path: 'openFolder.svg'
                    }
                },
                {
                    id: 'quickOpenWeb',
                    title: localize(14484, null),
                    description: localize(14485, null, Button(localize(14486, null), 'command:toSide:workbench.action.quickOpen')),
                    when: 'workspaceFolderCount != 0',
                    media: {
                        type: 'svg', altText: 'Go to file in quick search.', path: 'search.svg'
                    }
                }
            ]
        }
    },
    {
        id: 'SetupAccessibility',
        title: localize(14487, null),
        description: localize(14488, null),
        isFeatured: true,
        icon: setupIcon,
        when: CONTEXT_ACCESSIBILITY_MODE_ENABLED.key,
        next: 'Setup',
        walkthroughPageTitle: localize(14489, null),
        content: {
            type: 'steps',
            steps: [
                {
                    id: 'accessibilityHelp',
                    title: localize(14490, null),
                    description: localize(14491, null, Button(localize(14492, null), 'command:editor.action.accessibilityHelp')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'accessibleView',
                    title: localize(14493, null),
                    description: localize(14494, null, Button(localize(14495, null), 'command:editor.action.accessibleView')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'verbositySettings',
                    title: localize(14496, null),
                    description: localize(14497, null, Button(localize(14498, null), 'command:workbench.action.openAccessibilitySettings')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'commandPaletteTaskAccessibility',
                    title: localize(14499, null),
                    description: localize(14500, null, Button(localize(14501, null), 'command:workbench.action.showCommands')),
                    media: { type: 'markdown', path: 'empty' },
                },
                {
                    id: 'keybindingsAccessibility',
                    title: localize(14502, null),
                    description: localize(14503, null, Button(localize(14504, null), 'command:toSide:workbench.action.openGlobalKeybindings')),
                    media: {
                        type: 'markdown', path: 'empty',
                    }
                },
                {
                    id: 'accessibilitySignals',
                    title: localize(14505, null),
                    description: localize(14506, null, Button(localize(14507, null), 'command:signals.sounds.help'), Button(localize(14508, null), 'command:accessibility.announcement.help')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'hover',
                    title: localize(14509, null),
                    description: localize(14510, null, Button(localize(14511, null), 'command:editor.action.showHover')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'goToSymbol',
                    title: localize(14512, null),
                    description: localize(14513, null, Button(localize(14514, null), 'command:editor.action.goToSymbol')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'codeFolding',
                    title: localize(14515, null),
                    description: localize(14516, null, Button(localize(14517, null), 'command:editor.toggleFold'), Button(localize(14518, null), 'command:editor.toggleFoldRecursively')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'intellisense',
                    title: localize(14519, null),
                    description: localize(14520, null, Button(localize(14521, null), 'command:editor.action.triggerSuggest'), Button(localize(14522, null), 'command:editor.action.inlineSuggest.trigger')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'accessibilitySettings',
                    title: localize(14523, null),
                    description: localize(14524, null, Button(localize(14525, null), 'command:workbench.action.openAccessibilitySettings')),
                    media: { type: 'markdown', path: 'empty' }
                },
                {
                    id: 'dictation',
                    title: localize(14526, null),
                    description: localize(14527, null, Button(localize(14528, null), 'command:workbench.action.editorDictation.start'), Button(localize(14529, null), 'command:workbench.action.terminal.startVoice'), Button(localize(14530, null), 'command:workbench.action.terminal.stopVoice')),
                    when: 'hasSpeechProvider',
                    media: { type: 'markdown', path: 'empty' }
                }
            ]
        }
    },
    {
        id: 'Beginner',
        isFeatured: false,
        title: localize(14531, null),
        icon: beginnerIcon,
        description: localize(14532, null),
        walkthroughPageTitle: localize(14533, null),
        content: {
            type: 'steps',
            steps: [
                {
                    id: 'settingsAndSync',
                    title: localize(14534, null),
                    description: localize(14535, null, Button(localize(14536, null), 'command:toSide:workbench.action.openSettings')),
                    when: 'workspacePlatform != \'webworker\' && syncStatus != uninitialized',
                    completionEvents: ['onEvent:sync-enabled'],
                    media: {
                        type: 'svg', altText: 'VS Code Settings', path: 'settings.svg'
                    },
                },
                {
                    id: 'extensions',
                    title: localize(14537, null),
                    description: localize(14538, null, Button(localize(14539, null), 'command:workbench.extensions.action.showPopularExtensions')),
                    when: 'workspacePlatform != \'webworker\'',
                    media: {
                        type: 'svg', altText: 'VS Code extension marketplace with featured language extensions', path: 'extensions.svg'
                    },
                },
                {
                    id: 'terminal',
                    title: localize(14540, null),
                    description: localize(14541, null, Button(localize(14542, null), 'command:workbench.action.terminal.toggleTerminal')),
                    when: 'workspacePlatform != \'webworker\' && remoteName != codespaces && !terminalIsOpen',
                    media: {
                        type: 'svg', altText: 'Integrated terminal running a few npm commands', path: 'terminal.svg'
                    },
                },
                {
                    id: 'debugging',
                    title: localize(14543, null),
                    description: localize(14544, null, Button(localize(14545, null), 'command:workbench.action.debug.selectandstart')),
                    when: 'workspacePlatform != \'webworker\' && workspaceFolderCount != 0',
                    media: {
                        type: 'svg', altText: 'Run and debug view.', path: 'debug.svg',
                    },
                },
                {
                    id: 'scmClone',
                    title: localize(14546, null),
                    description: localize(14547, null, Button(localize(14548, null), 'command:git.clone')),
                    when: 'config.git.enabled && !git.missing && workspaceFolderCount == 0',
                    media: {
                        type: 'svg', altText: 'Source Control view.', path: 'git.svg',
                    },
                },
                {
                    id: 'scmSetup',
                    title: localize(14549, null),
                    description: localize(14550, null, Button(localize(14551, null), 'command:git.init')),
                    when: 'config.git.enabled && !git.missing && workspaceFolderCount != 0 && gitOpenRepositoryCount == 0',
                    media: {
                        type: 'svg', altText: 'Source Control view.', path: 'git.svg',
                    },
                },
                {
                    id: 'scm',
                    title: localize(14552, null),
                    description: localize(14553, null, Button(localize(14554, null), 'command:workbench.view.scm')),
                    when: 'config.git.enabled && !git.missing && workspaceFolderCount != 0 && gitOpenRepositoryCount != 0 && activeViewlet != \'workbench.view.scm\'',
                    media: {
                        type: 'svg', altText: 'Source Control view.', path: 'git.svg',
                    },
                },
                {
                    id: 'installGit',
                    title: localize(14555, null),
                    description: localize(14556, null, Button(localize(14557, null), 'https://aka.ms/vscode-install-git'), '[', '](command:workbench.action.reloadWindow)'),
                    when: 'git.missing',
                    media: {
                        type: 'svg', altText: 'Install Git.', path: 'git.svg',
                    },
                    completionEvents: [
                        'onContext:git.state == initialized'
                    ]
                },
                {
                    id: 'tasks',
                    title: localize(14558, null),
                    when: 'workspaceFolderCount != 0 && workspacePlatform != \'webworker\'',
                    description: localize(14559, null, Button(localize(14560, null), 'command:workbench.action.tasks.runTask')),
                    media: {
                        type: 'svg', altText: 'Task runner.', path: 'runTask.svg',
                    },
                },
                {
                    id: 'shortcuts',
                    title: localize(14561, null),
                    description: localize(14562, null, Button(localize(14563, null), 'command:toSide:workbench.action.openGlobalKeybindings')),
                    media: {
                        type: 'svg', altText: 'Interactive shortcuts.', path: 'shortcuts.svg',
                    }
                },
                {
                    id: 'workspaceTrust',
                    title: localize(14564, null),
                    description: localize(14565, null, Button(localize(14566, null), 'https://code.visualstudio.com/docs/editor/workspace-trust'), Button(localize(14567, null), 'command:toSide:workbench.trust.manage')),
                    when: 'workspacePlatform != \'webworker\' && !isWorkspaceTrusted && workspaceFolderCount == 0',
                    media: {
                        type: 'svg', altText: 'Workspace Trust editor in Restricted mode and a primary button for switching to Trusted mode.', path: 'workspaceTrust.svg'
                    },
                },
            ]
        }
    },
    {
        id: 'notebooks',
        title: localize(14568, null),
        description: '',
        icon: setupIcon,
        isFeatured: false,
        when: `config.${NotebookSetting.openGettingStarted} && userHasOpenedNotebook`,
        walkthroughPageTitle: localize(14569, null),
        content: {
            type: 'steps',
            steps: [
                {
                    completionEvents: ['onCommand:notebook.setProfile'],
                    id: 'notebookProfile',
                    title: localize(14570, null),
                    description: localize(14571, null),
                    when: 'userHasOpenedNotebook',
                    media: {
                        type: 'markdown', path: 'notebookProfile'
                    }
                },
            ]
        }
    }
];
//# sourceMappingURL=gettingStartedContent.js.map