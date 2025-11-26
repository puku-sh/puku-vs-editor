/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon, getAllCodicons } from '../../../base/common/codicons.js';
import { PlatformToString } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
import { Extensions } from '../../configuration/common/configurationRegistry.js';
import { Registry } from '../../registry/common/platform.js';
import { createProfileSchemaEnums } from './terminalProfiles.js';
export const terminalColorSchema = {
    type: ['string', 'null'],
    enum: [
        'terminal.ansiBlack',
        'terminal.ansiRed',
        'terminal.ansiGreen',
        'terminal.ansiYellow',
        'terminal.ansiBlue',
        'terminal.ansiMagenta',
        'terminal.ansiCyan',
        'terminal.ansiWhite'
    ],
    default: null
};
export const terminalIconSchema = {
    type: 'string',
    enum: Array.from(getAllCodicons(), icon => icon.id),
    markdownEnumDescriptions: Array.from(getAllCodicons(), icon => `$(${icon.id})`),
};
export const terminalProfileBaseProperties = {
    args: {
        description: localize('terminalProfile.args', 'An optional set of arguments to run the shell executable with.'),
        type: 'array',
        items: {
            type: 'string'
        }
    },
    icon: {
        description: localize('terminalProfile.icon', 'A codicon ID to associate with the terminal icon.'),
        ...terminalIconSchema
    },
    color: {
        description: localize('terminalProfile.color', 'A theme color ID to associate with the terminal icon.'),
        ...terminalColorSchema
    },
    env: {
        markdownDescription: localize('terminalProfile.env', "An object with environment variables that will be added to the terminal profile process. Set to `null` to delete environment variables from the base environment."),
        type: 'object',
        additionalProperties: {
            type: ['string', 'null']
        },
        default: {}
    }
};
const terminalProfileSchema = {
    type: 'object',
    required: ['path'],
    properties: {
        path: {
            description: localize('terminalProfile.path', 'A single path to a shell executable or an array of paths that will be used as fallbacks when one fails.'),
            type: ['string', 'array'],
            items: {
                type: 'string'
            }
        },
        overrideName: {
            description: localize('terminalProfile.overrideName', 'Whether or not to replace the dynamic terminal title that detects what program is running with the static profile name.'),
            type: 'boolean'
        },
        ...terminalProfileBaseProperties
    }
};
const terminalAutomationProfileSchema = {
    type: 'object',
    required: ['path'],
    properties: {
        path: {
            description: localize('terminalAutomationProfile.path', 'A path to a shell executable.'),
            type: ['string'],
            items: {
                type: 'string'
            }
        },
        ...terminalProfileBaseProperties
    }
};
function createTerminalProfileMarkdownDescription(platform) {
    const key = platform === 2 /* Platform.Linux */ ? 'linux' : platform === 1 /* Platform.Mac */ ? 'osx' : 'windows';
    return localize({
        key: 'terminal.integrated.profile',
        comment: ['{0} is the platform, {1} is a code block, {2} and {3} are a link start and end']
    }, "A set of terminal profile customizations for {0} which allows adding, removing or changing how terminals are launched. Profiles are made up of a mandatory path, optional arguments and other presentation options.\n\nTo override an existing profile use its profile name as the key, for example:\n\n{1}\n\n{2}Read more about configuring profiles{3}.", PlatformToString(platform), '```json\n"terminal.integrated.profile.' + key + '": {\n  "bash": null\n}\n```', '[', '](https://code.visualstudio.com/docs/terminal/profiles)');
}
const terminalPlatformConfiguration = {
    id: 'terminal',
    order: 100,
    title: localize('terminalIntegratedConfigurationTitle', "Integrated Terminal"),
    type: 'object',
    properties: {
        ["terminal.integrated.automationProfile.linux" /* TerminalSettingId.AutomationProfileLinux */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.automationProfile.linux', "The terminal profile to use on Linux for automation-related terminal usage like tasks and debug."),
            type: ['object', 'null'],
            default: null,
            'anyOf': [
                { type: 'null' },
                terminalAutomationProfileSchema
            ],
            defaultSnippets: [
                {
                    body: {
                        path: '${1}',
                        icon: '${2}'
                    }
                }
            ]
        },
        ["terminal.integrated.automationProfile.osx" /* TerminalSettingId.AutomationProfileMacOs */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.automationProfile.osx', "The terminal profile to use on macOS for automation-related terminal usage like tasks and debug."),
            type: ['object', 'null'],
            default: null,
            'anyOf': [
                { type: 'null' },
                terminalAutomationProfileSchema
            ],
            defaultSnippets: [
                {
                    body: {
                        path: '${1}',
                        icon: '${2}'
                    }
                }
            ]
        },
        ["terminal.integrated.automationProfile.windows" /* TerminalSettingId.AutomationProfileWindows */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.automationProfile.windows', "The terminal profile to use for automation-related terminal usage like tasks and debug. This setting will currently be ignored if {0} (now deprecated) is set.", '`terminal.integrated.automationShell.windows`'),
            type: ['object', 'null'],
            default: null,
            'anyOf': [
                { type: 'null' },
                terminalAutomationProfileSchema
            ],
            defaultSnippets: [
                {
                    body: {
                        path: '${1}',
                        icon: '${2}'
                    }
                }
            ]
        },
        ["terminal.integrated.profiles.windows" /* TerminalSettingId.ProfilesWindows */]: {
            restricted: true,
            markdownDescription: createTerminalProfileMarkdownDescription(3 /* Platform.Windows */),
            type: 'object',
            default: {
                'PowerShell': {
                    source: 'PowerShell',
                    icon: Codicon.terminalPowershell.id,
                },
                'Command Prompt': {
                    path: [
                        '${env:windir}\\Sysnative\\cmd.exe',
                        '${env:windir}\\System32\\cmd.exe'
                    ],
                    args: [],
                    icon: Codicon.terminalCmd,
                },
                'Git Bash': {
                    source: 'Git Bash',
                    icon: Codicon.terminalGitBash.id,
                }
            },
            additionalProperties: {
                'anyOf': [
                    {
                        type: 'object',
                        required: ['source'],
                        properties: {
                            source: {
                                description: localize('terminalProfile.windowsSource', 'A profile source that will auto detect the paths to the shell. Note that non-standard executable locations are not supported and must be created manually in a new profile.'),
                                enum: ['PowerShell', 'Git Bash']
                            },
                            ...terminalProfileBaseProperties
                        }
                    },
                    {
                        type: 'object',
                        required: ['extensionIdentifier', 'id', 'title'],
                        properties: {
                            extensionIdentifier: {
                                description: localize('terminalProfile.windowsExtensionIdentifier', 'The extension that contributed this profile.'),
                                type: 'string'
                            },
                            id: {
                                description: localize('terminalProfile.windowsExtensionId', 'The id of the extension terminal'),
                                type: 'string'
                            },
                            title: {
                                description: localize('terminalProfile.windowsExtensionTitle', 'The name of the extension terminal'),
                                type: 'string'
                            },
                            ...terminalProfileBaseProperties
                        }
                    },
                    { type: 'null' },
                    terminalProfileSchema
                ]
            }
        },
        ["terminal.integrated.profiles.osx" /* TerminalSettingId.ProfilesMacOs */]: {
            restricted: true,
            markdownDescription: createTerminalProfileMarkdownDescription(1 /* Platform.Mac */),
            type: 'object',
            default: {
                'bash': {
                    path: 'bash',
                    args: ['-l'],
                    icon: Codicon.terminalBash.id
                },
                'zsh': {
                    path: 'zsh',
                    args: ['-l']
                },
                'fish': {
                    path: 'fish',
                    args: ['-l']
                },
                'tmux': {
                    path: 'tmux',
                    icon: Codicon.terminalTmux.id
                },
                'pwsh': {
                    path: 'pwsh',
                    icon: Codicon.terminalPowershell.id
                }
            },
            additionalProperties: {
                'anyOf': [
                    {
                        type: 'object',
                        required: ['extensionIdentifier', 'id', 'title'],
                        properties: {
                            extensionIdentifier: {
                                description: localize('terminalProfile.osxExtensionIdentifier', 'The extension that contributed this profile.'),
                                type: 'string'
                            },
                            id: {
                                description: localize('terminalProfile.osxExtensionId', 'The id of the extension terminal'),
                                type: 'string'
                            },
                            title: {
                                description: localize('terminalProfile.osxExtensionTitle', 'The name of the extension terminal'),
                                type: 'string'
                            },
                            ...terminalProfileBaseProperties
                        }
                    },
                    { type: 'null' },
                    terminalProfileSchema
                ]
            }
        },
        ["terminal.integrated.profiles.linux" /* TerminalSettingId.ProfilesLinux */]: {
            restricted: true,
            markdownDescription: createTerminalProfileMarkdownDescription(2 /* Platform.Linux */),
            type: 'object',
            default: {
                'bash': {
                    path: 'bash',
                    icon: Codicon.terminalBash.id
                },
                'zsh': {
                    path: 'zsh'
                },
                'fish': {
                    path: 'fish'
                },
                'tmux': {
                    path: 'tmux',
                    icon: Codicon.terminalTmux.id
                },
                'pwsh': {
                    path: 'pwsh',
                    icon: Codicon.terminalPowershell.id
                }
            },
            additionalProperties: {
                'anyOf': [
                    {
                        type: 'object',
                        required: ['extensionIdentifier', 'id', 'title'],
                        properties: {
                            extensionIdentifier: {
                                description: localize('terminalProfile.linuxExtensionIdentifier', 'The extension that contributed this profile.'),
                                type: 'string'
                            },
                            id: {
                                description: localize('terminalProfile.linuxExtensionId', 'The id of the extension terminal'),
                                type: 'string'
                            },
                            title: {
                                description: localize('terminalProfile.linuxExtensionTitle', 'The name of the extension terminal'),
                                type: 'string'
                            },
                            ...terminalProfileBaseProperties
                        }
                    },
                    { type: 'null' },
                    terminalProfileSchema
                ]
            }
        },
        ["terminal.integrated.useWslProfiles" /* TerminalSettingId.UseWslProfiles */]: {
            description: localize('terminal.integrated.useWslProfiles', 'Controls whether or not WSL distros are shown in the terminal dropdown'),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.inheritEnv" /* TerminalSettingId.InheritEnv */]: {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize('terminal.integrated.inheritEnv', "Whether new shells should inherit their environment from VS Code, which may source a login shell to ensure $PATH and other development variables are initialized. This has no effect on Windows."),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.persistentSessionScrollback" /* TerminalSettingId.PersistentSessionScrollback */]: {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            markdownDescription: localize('terminal.integrated.persistentSessionScrollback', "Controls the maximum amount of lines that will be restored when reconnecting to a persistent terminal session. Increasing this will restore more lines of scrollback at the cost of more memory and increase the time it takes to connect to terminals on start up. This setting requires a restart to take effect and should be set to a value less than or equal to `#terminal.integrated.scrollback#`."),
            type: 'number',
            default: 100
        },
        ["terminal.integrated.showLinkHover" /* TerminalSettingId.ShowLinkHover */]: {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize('terminal.integrated.showLinkHover', "Whether to show hovers for links in the terminal output."),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.ignoreProcessNames" /* TerminalSettingId.IgnoreProcessNames */]: {
            markdownDescription: localize('terminal.integrated.confirmIgnoreProcesses', "A set of process names to ignore when using the {0} setting.", '`#terminal.integrated.confirmOnKill#`'),
            type: 'array',
            items: {
                type: 'string',
                uniqueItems: true
            },
            default: [
                // Popular prompt programs, these should not count as child processes
                'starship',
                'oh-my-posh',
                // Git bash may runs a subprocess of itself (bin\bash.exe -> usr\bin\bash.exe)
                'bash',
                'zsh',
            ]
        }
    }
};
/**
 * Registers terminal configurations required by shared process and remote server.
 */
export function registerTerminalPlatformConfiguration() {
    Registry.as(Extensions.Configuration).registerConfiguration(terminalPlatformConfiguration);
    registerTerminalDefaultProfileConfiguration();
}
let defaultProfilesConfiguration;
export function registerTerminalDefaultProfileConfiguration(detectedProfiles, extensionContributedProfiles) {
    const registry = Registry.as(Extensions.Configuration);
    let profileEnum;
    if (detectedProfiles) {
        profileEnum = createProfileSchemaEnums(detectedProfiles?.profiles, extensionContributedProfiles);
    }
    const oldDefaultProfilesConfiguration = defaultProfilesConfiguration;
    defaultProfilesConfiguration = {
        id: 'terminal',
        order: 100,
        title: localize('terminalIntegratedConfigurationTitle', "Integrated Terminal"),
        type: 'object',
        properties: {
            ["terminal.integrated.defaultProfile.linux" /* TerminalSettingId.DefaultProfileLinux */]: {
                restricted: true,
                markdownDescription: localize('terminal.integrated.defaultProfile.linux', "The default terminal profile on Linux."),
                type: ['string', 'null'],
                default: null,
                enum: detectedProfiles?.os === 3 /* OperatingSystem.Linux */ ? profileEnum?.values : undefined,
                markdownEnumDescriptions: detectedProfiles?.os === 3 /* OperatingSystem.Linux */ ? profileEnum?.markdownDescriptions : undefined
            },
            ["terminal.integrated.defaultProfile.osx" /* TerminalSettingId.DefaultProfileMacOs */]: {
                restricted: true,
                markdownDescription: localize('terminal.integrated.defaultProfile.osx', "The default terminal profile on macOS."),
                type: ['string', 'null'],
                default: null,
                enum: detectedProfiles?.os === 2 /* OperatingSystem.Macintosh */ ? profileEnum?.values : undefined,
                markdownEnumDescriptions: detectedProfiles?.os === 2 /* OperatingSystem.Macintosh */ ? profileEnum?.markdownDescriptions : undefined
            },
            ["terminal.integrated.defaultProfile.windows" /* TerminalSettingId.DefaultProfileWindows */]: {
                restricted: true,
                markdownDescription: localize('terminal.integrated.defaultProfile.windows', "The default terminal profile on Windows."),
                type: ['string', 'null'],
                default: null,
                enum: detectedProfiles?.os === 1 /* OperatingSystem.Windows */ ? profileEnum?.values : undefined,
                markdownEnumDescriptions: detectedProfiles?.os === 1 /* OperatingSystem.Windows */ ? profileEnum?.markdownDescriptions : undefined
            },
        }
    };
    registry.updateConfigurations({ add: [defaultProfilesConfiguration], remove: oldDefaultProfilesConfiguration ? [oldDefaultProfilesConfiguration] : [] });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQbGF0Zm9ybUNvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vdGVybWluYWxQbGF0Zm9ybUNvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRSxPQUFPLEVBQTZCLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBc0IsVUFBVSxFQUE4QyxNQUFNLHFEQUFxRCxDQUFDO0FBQ2pKLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU3RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVqRSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBZ0I7SUFDL0MsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQztJQUN4QixJQUFJLEVBQUU7UUFDTCxvQkFBb0I7UUFDcEIsa0JBQWtCO1FBQ2xCLG9CQUFvQjtRQUNwQixxQkFBcUI7UUFDckIsbUJBQW1CO1FBQ25CLHNCQUFzQjtRQUN0QixtQkFBbUI7UUFDbkIsb0JBQW9CO0tBQ3BCO0lBQ0QsT0FBTyxFQUFFLElBQUk7Q0FDYixDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQWdCO0lBQzlDLElBQUksRUFBRSxRQUFRO0lBQ2QsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxD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