/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import product from '../../../../../platform/product/common/product.js';
export var TerminalSuggestSettingId;
(function (TerminalSuggestSettingId) {
    TerminalSuggestSettingId["Enabled"] = "terminal.integrated.suggest.enabled";
    TerminalSuggestSettingId["QuickSuggestions"] = "terminal.integrated.suggest.quickSuggestions";
    TerminalSuggestSettingId["SuggestOnTriggerCharacters"] = "terminal.integrated.suggest.suggestOnTriggerCharacters";
    TerminalSuggestSettingId["RunOnEnter"] = "terminal.integrated.suggest.runOnEnter";
    TerminalSuggestSettingId["WindowsExecutableExtensions"] = "terminal.integrated.suggest.windowsExecutableExtensions";
    TerminalSuggestSettingId["Providers"] = "terminal.integrated.suggest.providers";
    TerminalSuggestSettingId["ShowStatusBar"] = "terminal.integrated.suggest.showStatusBar";
    TerminalSuggestSettingId["CdPath"] = "terminal.integrated.suggest.cdPath";
    TerminalSuggestSettingId["InlineSuggestion"] = "terminal.integrated.suggest.inlineSuggestion";
    TerminalSuggestSettingId["UpArrowNavigatesHistory"] = "terminal.integrated.suggest.upArrowNavigatesHistory";
    TerminalSuggestSettingId["SelectionMode"] = "terminal.integrated.suggest.selectionMode";
    TerminalSuggestSettingId["InsertTrailingSpace"] = "terminal.integrated.suggest.insertTrailingSpace";
})(TerminalSuggestSettingId || (TerminalSuggestSettingId = {}));
export const windowsDefaultExecutableExtensions = [
    'exe', // Executable file
    'bat', // Batch file
    'cmd', // Command script
    'com', // Command file
    'msi', // Windows Installer package
    'ps1', // PowerShell script
    'vbs', // VBScript file
    'js', // JScript file
    'jar', // Java Archive (requires Java runtime)
    'py', // Python script (requires Python interpreter)
    'rb', // Ruby script (requires Ruby interpreter)
    'pl', // Perl script (requires Perl interpreter)
    'sh', // Shell script (via WSL or third-party tools)
];
export const terminalSuggestConfigSection = 'terminal.integrated.suggest';
export const terminalSuggestConfiguration = {
    ["terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */]: {
        restricted: true,
        markdownDescription: localize('suggest.enabled', "Enables terminal intellisense suggestions (preview) for supported shells ({0}) when {1} is set to {2}.", 'PowerShell v7+, zsh, bash, fish', `\`#${"terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */}#\``, '`true`'),
        type: 'boolean',
        default: product.quality !== 'stable',
        experiment: {
            mode: 'auto',
        },
    },
    ["terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */]: {
        restricted: true,
        markdownDescription: localize('suggest.providers', "Providers are enabled by default. Omit them by setting the id of the provider to `false`."),
        type: 'object',
        properties: {},
    },
    ["terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */]: {
        restricted: true,
        markdownDescription: localize('suggest.quickSuggestions', "Controls whether suggestions should automatically show up while typing. Also be aware of the {0}-setting which controls if suggestions are triggered by special characters.", `\`#${"terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */}#\``),
        type: 'object',
        properties: {
            commands: {
                description: localize('suggest.quickSuggestions.commands', 'Enable quick suggestions for commands, the first word in a command line input.'),
                type: 'string',
                enum: ['off', 'on'],
            },
            arguments: {
                description: localize('suggest.quickSuggestions.arguments', 'Enable quick suggestions for arguments, anything after the first word in a command line input.'),
                type: 'string',
                enum: ['off', 'on'],
            },
            unknown: {
                description: localize('suggest.quickSuggestions.unknown', 'Enable quick suggestions when it\'s unclear what the best suggestion is, if this is on files and folders will be suggested as a fallback.'),
                type: 'string',
                enum: ['off', 'on'],
            },
        },
        default: {
            commands: 'on',
            arguments: 'on',
            unknown: 'off',
        },
    },
    ["terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */]: {
        restricted: true,
        markdownDescription: localize('suggest.suggestOnTriggerCharacters', "Controls whether suggestions should automatically show up when typing trigger characters."),
        type: 'boolean',
        default: true,
    },
    ["terminal.integrated.suggest.runOnEnter" /* TerminalSuggestSettingId.RunOnEnter */]: {
        restricted: true,
        markdownDescription: localize('suggest.runOnEnter', "Controls whether suggestions should run immediately when `Enter` (not `Tab`) is used to accept the result."),
        enum: ['never', 'exactMatch', 'exactMatchIgnoreExtension', 'always'],
        markdownEnumDescriptions: [
            localize('runOnEnter.never', "Never run on `Enter`."),
            localize('runOnEnter.exactMatch', "Run on `Enter` when the suggestion is typed in its entirety."),
            localize('runOnEnter.exactMatchIgnoreExtension', "Run on `Enter` when the suggestion is typed in its entirety or when a file is typed without its extension included."),
            localize('runOnEnter.always', "Always run on `Enter`.")
        ],
        default: 'never',
    },
    ["terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */]: {
        markdownDescription: localize('terminal.integrated.selectionMode', "Controls how suggestion selection works in the integrated terminal."),
        type: 'string',
        enum: ['partial', 'always', 'never'],
        markdownEnumDescriptions: [
            localize('terminal.integrated.selectionMode.partial', "Partially select a suggestion when automatically triggering IntelliSense. `Tab` can be used to accept the first suggestion, only after navigating the suggestions via `Down` will `Enter` also accept the active suggestion."),
            localize('terminal.integrated.selectionMode.always', "Always select a suggestion when automatically triggering IntelliSense. `Enter` or `Tab` can be used to accept the first suggestion."),
            localize('terminal.integrated.selectionMode.never', "Never select a suggestion when automatically triggering IntelliSense. The list must be navigated via `Down` before `Enter` or `Tab` can be used to accept the active suggestion."),
        ],
        default: 'partial',
    },
    ["terminal.integrated.suggest.windowsExecutableExtensions" /* TerminalSuggestSettingId.WindowsExecutableExtensions */]: {
        restricted: true,
        markdownDescription: localize("terminalWindowsExecutableSuggestionSetting", "A set of windows command executable extensions that will be included as suggestions in the terminal.\n\nMany executables are included by default, listed below:\n\n{0}.\n\nTo exclude an extension, set it to `false`\n\n. To include one not in the list, add it and set it to `true`.", windowsDefaultExecutableExtensions.sort().map(extension => `- ${extension}`).join('\n')),
        type: 'object',
        default: {},
    },
    ["terminal.integrated.suggest.showStatusBar" /* TerminalSuggestSettingId.ShowStatusBar */]: {
        restricted: true,
        markdownDescription: localize('suggest.showStatusBar', "Controls whether the terminal suggestions status bar should be shown."),
        type: 'boolean',
        default: true,
    },
    ["terminal.integrated.suggest.cdPath" /* TerminalSuggestSettingId.CdPath */]: {
        restricted: true,
        markdownDescription: localize('suggest.cdPath', "Controls whether to enable $CDPATH support which exposes children of the folders in the $CDPATH variable regardless of the current working directory. $CDPATH is expected to be semi colon-separated on Windows and colon-separated on other platforms."),
        type: 'string',
        enum: ['off', 'relative', 'absolute'],
        markdownEnumDescriptions: [
            localize('suggest.cdPath.off', "Disable the feature."),
            localize('suggest.cdPath.relative', "Enable the feature and use relative paths."),
            localize('suggest.cdPath.absolute', "Enable the feature and use absolute paths. This is useful when the shell doesn't natively support `$CDPATH`."),
        ],
        default: 'absolute',
    },
    ["terminal.integrated.suggest.inlineSuggestion" /* TerminalSuggestSettingId.InlineSuggestion */]: {
        restricted: true,
        markdownDescription: localize('suggest.inlineSuggestion', "Controls whether the shell's inline suggestion should be detected and how it is scored."),
        type: 'string',
        enum: ['off', 'alwaysOnTopExceptExactMatch', 'alwaysOnTop'],
        markdownEnumDescriptions: [
            localize('suggest.inlineSuggestion.off', "Disable the feature."),
            localize('suggest.inlineSuggestion.alwaysOnTopExceptExactMatch', "Enable the feature and sort the inline suggestion without forcing it to be on top. This means that exact matches will be will be above the inline suggestion."),
            localize('suggest.inlineSuggestion.alwaysOnTop', "Enable the feature and always put the inline suggestion on top."),
        ],
        default: 'alwaysOnTop',
    },
    ["terminal.integrated.suggest.upArrowNavigatesHistory" /* TerminalSuggestSettingId.UpArrowNavigatesHistory */]: {
        restricted: true,
        markdownDescription: localize('suggest.upArrowNavigatesHistory', "Determines whether the up arrow key navigates the command history when focus is on the first suggestion and navigation has not yet occurred. When set to false, the up arrow will move focus to the last suggestion instead."),
        type: 'boolean',
        default: true,
    },
    ["terminal.integrated.suggest.insertTrailingSpace" /* TerminalSuggestSettingId.InsertTrailingSpace */]: {
        restricted: true,
        markdownDescription: localize('suggest.insertTrailingSpace', "Controls whether a space is automatically inserted after accepting a suggestion and re-trigger suggestions. Folders and symbolic link folders will never have a trailing space added."),
        type: 'boolean',
        default: false,
    },
};
let terminalSuggestProvidersConfiguration;
export function registerTerminalSuggestProvidersConfiguration(providers) {
    const oldProvidersConfiguration = terminalSuggestProvidersConfiguration;
    providers ??= new Map();
    if (!providers.has('lsp')) {
        providers.set('lsp', {
            id: 'lsp',
            description: localize('suggest.provider.lsp.description', 'Show suggestions from language servers.')
        });
    }
    const providersProperties = {};
    for (const id of Array.from(providers.keys()).sort()) {
        providersProperties[id] = {
            type: 'boolean',
            default: true,
            description: providers.get(id)?.description ??
                localize('suggest.provider.title', "Show suggestions from {0}.", id)
        };
    }
    const defaultValue = {};
    for (const key in providersProperties) {
        defaultValue[key] = providersProperties[key].default;
    }
    terminalSuggestProvidersConfiguration = {
        id: 'terminalSuggestProviders',
        order: 100,
        title: localize('terminalSuggestProvidersConfigurationTitle', "Terminal Suggest Providers"),
        type: 'object',
        properties: {
            ["terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */]: {
                restricted: true,
                markdownDescription: localize('suggest.providersEnabledByDefault', "Controls which suggestions automatically show up while typing. Suggestion providers are enabled by default."),
                type: 'object',
                properties: providersProperties,
                default: defaultValue,
                tags: ['preview'],
                additionalProperties: false
            }
        }
    };
    const registry = Registry.as(ConfigurationExtensions.Configuration);
    registry.updateConfigurations({
        add: [terminalSuggestProvidersConfiguration],
        remove: oldProvidersConfiguration ? [oldProvidersConfiguration] : []
    });
}
registerTerminalSuggestProvidersConfiguration();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0Q29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2NvbW1vbi90ZXJtaW5hbFN1Z2dlc3RDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQW9ELFVBQVUsSUFBSSx1QkFBdUIsRUFBMEIsTUFBTSx1RUFBdUUsQ0FBQztBQUN4TSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDL0UsT0FBTyxPQUFPLE1BQU0sbURBQW1ELENBQUM7QUFHeEUsTUFBTSxDQUFOLElBQWtCLHdCQWFqQjtBQWJELFdBQWtCLHdCQUF3QjtJQUN6QywyRUFBK0MsQ0FBQTtJQUMvQyw2RkFBaUUsQ0FBQTtJQUNqRSxpSEFBcUYsQ0FBQTtJQUNyRixpRkFBcUQsQ0FBQTtJQUNyRCxtSEFBdUYsQ0FBQTtJQUN2RiwrRUFBbUQsQ0FBQTtJQUNuRCx1RkFBMkQsQ0FBQTtJQUMzRCx5RUFBNkMsQ0FBQTtJQUM3Qyw2RkFBaUUsQ0FBQTtJQUNqRSwyR0FBK0UsQ0FBQTtJQUMvRSx1RkFBMkQsQ0FBQTtJQUMzRCxtR0FBdUUsQ0FBQTtBQUN4RSxDQUFDLEVBYmlCLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFhekM7QUFFRCxNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBYTtJQUMzRCxLQUFLLEVBQUksa0JBQWtCO0lBQzNCLEtBQUssRUFBSSxhQUFhO0lBQ3RCLEtBQUssRUFBSSxpQkFBaUI7SUFDMUIsS0FBSyxFQUFJLGVBQWU7SUFFeEIsS0FBSyxFQUFJLDRCQUE0QjtJQUVyQyxL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