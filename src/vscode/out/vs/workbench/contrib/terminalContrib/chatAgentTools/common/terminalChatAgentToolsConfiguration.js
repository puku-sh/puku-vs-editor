/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import product from '../../../../../platform/product/common/product.js';
import { terminalProfileBaseProperties } from '../../../../../platform/terminal/common/terminalPlatformConfiguration.js';
import { PolicyCategory } from '../../../../../base/common/policy.js';
export var TerminalChatAgentToolsSettingId;
(function (TerminalChatAgentToolsSettingId) {
    TerminalChatAgentToolsSettingId["EnableAutoApprove"] = "chat.tools.terminal.enableAutoApprove";
    TerminalChatAgentToolsSettingId["AutoApprove"] = "chat.tools.terminal.autoApprove";
    TerminalChatAgentToolsSettingId["IgnoreDefaultAutoApproveRules"] = "chat.tools.terminal.ignoreDefaultAutoApproveRules";
    TerminalChatAgentToolsSettingId["BlockDetectedFileWrites"] = "chat.tools.terminal.blockDetectedFileWrites";
    TerminalChatAgentToolsSettingId["ShellIntegrationTimeout"] = "chat.tools.terminal.shellIntegrationTimeout";
    TerminalChatAgentToolsSettingId["AutoReplyToPrompts"] = "chat.tools.terminal.autoReplyToPrompts";
    TerminalChatAgentToolsSettingId["OutputLocation"] = "chat.tools.terminal.outputLocation";
    TerminalChatAgentToolsSettingId["TerminalProfileLinux"] = "chat.tools.terminal.terminalProfile.linux";
    TerminalChatAgentToolsSettingId["TerminalProfileMacOs"] = "chat.tools.terminal.terminalProfile.osx";
    TerminalChatAgentToolsSettingId["TerminalProfileWindows"] = "chat.tools.terminal.terminalProfile.windows";
    TerminalChatAgentToolsSettingId["DeprecatedAutoApproveCompatible"] = "chat.agent.terminal.autoApprove";
    TerminalChatAgentToolsSettingId["DeprecatedAutoApprove1"] = "chat.agent.terminal.allowList";
    TerminalChatAgentToolsSettingId["DeprecatedAutoApprove2"] = "chat.agent.terminal.denyList";
    TerminalChatAgentToolsSettingId["DeprecatedAutoApprove3"] = "github.copilot.chat.agent.terminal.allowList";
    TerminalChatAgentToolsSettingId["DeprecatedAutoApprove4"] = "github.copilot.chat.agent.terminal.denyList";
})(TerminalChatAgentToolsSettingId || (TerminalChatAgentToolsSettingId = {}));
const autoApproveBoolean = {
    type: 'boolean',
    enum: [
        true,
        false,
    ],
    enumDescriptions: [
        localize('autoApprove.true', "Automatically approve the pattern."),
        localize('autoApprove.false', "Require explicit approval for the pattern."),
    ],
    description: localize('autoApprove.key', "The start of a command to match against. A regular expression can be provided by wrapping the string in `/` characters."),
};
const terminalChatAgentProfileSchema = {
    type: 'object',
    required: ['path'],
    properties: {
        path: {
            description: localize('terminalChatAgentProfile.path', "A path to a shell executable."),
            type: 'string',
        },
        ...terminalProfileBaseProperties,
    }
};
export const terminalChatAgentToolsConfiguration = {
    ["chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */]: {
        description: localize('autoApproveMode.description', "Controls whether to allow auto approval in the run in terminal tool."),
        type: 'boolean',
        default: true,
        policy: {
            name: 'ChatToolsTerminalEnableAutoApprove',
            category: PolicyCategory.IntegratedTerminal,
            minimumVersion: '1.104',
            localization: {
                description: {
                    key: 'autoApproveMode.description',
                    value: localize('autoApproveMode.description', "Controls whether to allow auto approval in the run in terminal tool."),
                }
            }
        }
    },
    ["chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */]: {
        markdownDescription: [
            localize('autoApprove.description.intro', "A list of commands or regular expressions that control whether the run in terminal tool commands require explicit approval. These will be matched against the start of a command. A regular expression can be provided by wrapping the string in {0} characters followed by optional flags such as {1} for case-insensitivity.", '`/`', '`i`'),
            localize('autoApprove.description.values', "Set to {0} to automatically approve commands, {1} to always require explicit approval or {2} to unset the value.", '`true`', '`false`', '`null`'),
            localize('autoApprove.description.subCommands', "Note that these commands and regular expressions are evaluated for every _sub-command_ within the full _command line_, so {0} for example will need both {1} and {2} to match a {3} entry and must not match a {4} entry in order to auto approve. Inline commands such as {5} (process substitution) should also be detected.", '`foo && bar`', '`foo`', '`bar`', '`true`', '`false`', '`<(foo)`'),
            localize('autoApprove.description.commandLine', "An object can be used to match against the full command line instead of matching sub-commands and inline commands, for example {0}. In order to be auto approved _both_ the sub-command and command line must not be explicitly denied, then _either_ all sub-commands or command line needs to be approved.", '`{ approve: false, matchCommandLine: true }`'),
            localize('autoApprove.defaults', "Note that there's a default set of rules to allow and also deny commands. Consider setting {0} to {1} to ignore all default rules to ensure there are no conflicts with your own rules. Do this at your own risk, the default denial rules are designed to protect you against running dangerous commands.", `\`#${"chat.tools.terminal.ignoreDefaultAutoApproveRules" /* TerminalChatAgentToolsSettingId.IgnoreDefaultAutoApproveRules */}#\``, '`true`'),
            [
                localize('autoApprove.description.examples.title', 'Examples:'),
                `|${localize('autoApprove.description.examples.value', "Value")}|${localize('autoApprove.description.examples.description', "Description")}|`,
                '|---|---|',
                '| `\"mkdir\": true` | ' + localize('autoApprove.description.examples.mkdir', "Allow all commands starting with {0}", '`mkdir`'),
                '| `\"npm run build\": true` | ' + localize('autoApprove.description.examples.npmRunBuild', "Allow all commands starting with {0}", '`npm run build`'),
                '| `\"bin/test.sh\": true` | ' + localize('autoApprove.description.examples.binTest', "Allow all commands that match the path {0} ({1}, {2}, etc.)", '`bin/test.sh`', '`bin\\test.sh`', '`./bin/test.sh`'),
                '| `\"/^git (status\\|show\\\\b.*)$/\": true` | ' + localize('autoApprove.description.examples.regexGit', "Allow {0} and all commands starting with {1}", '`git status`', '`git show`'),
                '| `\"/^Get-ChildItem\\\\b/i\": true` | ' + localize('autoApprove.description.examples.regexCase', "will allow {0} commands regardless of casing", '`Get-ChildItem`'),
                '| `\"/.*/\": true` | ' + localize('autoApprove.description.examples.regexAll', "Allow all commands (denied commands still require approval)"),
                '| `\"rm\": false` | ' + localize('autoApprove.description.examples.rm', "Require explicit approval for all commands starting with {0}", '`rm`'),
                '| `\"/\\\\.ps1/i\": { approve: false, matchCommandLine: true }` | ' + localize('autoApprove.description.examples.ps1', "Require explicit approval for any _command line_ that contains {0} regardless of casing", '`".ps1"`'),
                '| `\"rm\": null` | ' + localize('autoApprove.description.examples.rmUnset', "Unset the default {0} value for {1}", '`false`', '`rm`'),
            ].join('\n'),
        ].join('\n\n'),
        type: 'object',
        additionalProperties: {
            anyOf: [
                autoApproveBoolean,
                {
                    type: 'object',
                    properties: {
                        approve: autoApproveBoolean,
                        matchCommandLine: {
                            type: 'boolean',
                            enum: [
                                true,
                                false,
                            ],
                            enumDescriptions: [
                                localize('autoApprove.matchCommandLine.true', "Match against the full command line, eg. `foo && bar`."),
                                localize('autoApprove.matchCommandLine.false', "Match against sub-commands and inline commands, eg. `foo && bar` will need both `foo` and `bar` to match."),
                            ],
                            description: localize('autoApprove.matchCommandLine', "Whether to match against the full command line, as opposed to splitting by sub-commands and inline commands."),
                        }
                    },
                    required: ['approve']
                },
                {
                    type: 'null',
                    description: localize('autoApprove.null', "Ignore the pattern, this is useful for unsetting the same pattern set at a higher scope."),
                },
            ]
        },
        default: {
            // This is the default set of terminal auto approve commands. Note that these are best
            // effort and do not aim to provide exhaustive coverage to prevent dangerous commands
            // from executing as that is simply not feasible. Workspace trust and warnings of
            // possible prompt injection are _the_ thing protecting the user in agent mode, once
            // that trust boundary has been breached all bets are off as trusting a workspace that
            // contains anything malicious has already compromised the machine.
            //
            // Instead, the focus here is to unblock the user from approving clearly safe commands
            // frequently and cover common edge cases that could arise from the user auto-approving
            // commands.
            //
            // Take for example `find` which looks innocuous and most users are likely to auto
            // approve future calls when offered. However, the `-exec` argument can run anything. So
            // instead of leaving this decision up to the user we provide relatively safe defaults
            // and block common edge cases. So offering these default rules, despite their flaws, is
            // likely to protect the user more in general than leaving everything up to them (plus
            // make agent mode more convenient).
            // #region Safe commands
            //
            // Generally safe and common readonly commands
            cd: true,
            echo: true,
            ls: true,
            pwd: true,
            cat: true,
            head: true,
            tail: true,
            findstr: true,
            wc: true,
            tr: true,
            cut: true,
            cmp: true,
            which: true,
            basename: true,
            dirname: true,
            realpath: true,
            readlink: true,
            stat: true,
            file: true,
            du: true,
            df: true,
            sleep: true,
            nl: true,
            // grep
            // - Variable
            // - `-f`: Read patterns from file, this is an acceptable risk since you can do similar
            //   with cat
            // - `-P`: PCRE risks include denial of service (memory exhaustion, catastrophic
            //   backtracking) which could lock up the terminal. Older PCRE versions allow code
            //   execution via this flag but this has been patched with CVEs.
            // - Variable injection is possible, but requires setting a variable which would need
            //   manual approval.
            grep: true,
            // #endregion
            // #region Safe sub-commands
            //
            // Safe and common sub-commands
            'git status': true,
            'git log': true,
            'git show': true,
            'git diff': true,
            // git grep
            // - `--open-files-in-pager`: This is the configured pager, so no risk of code execution
            // - See notes on `grep`
            'git grep': true,
            // git branch
            // - `-d`, `-D`, `--delete`: Prevent branch deletion
            // - `-m`, `-M`: Prevent branch renaming
            // - `--force`: Generally dangerous
            'git branch': true,
            '/^git branch\\b.*-(d|D|m|M|-delete|-force)\\b/': false,
            // #endregion
            // #region PowerShell
            'Get-ChildItem': true,
            'Get-Content': true,
            'Get-Date': true,
            'Get-Random': true,
            'Get-Location': true,
            'Write-Host': true,
            'Write-Output': true,
            'Split-Path': true,
            'Join-Path': true,
            'Start-Sleep': true,
            'Where-Object': true,
            // Blanket approval of safe verbs
            '/^Select-[a-z0-9]/i': true,
            '/^Measure-[a-z0-9]/i': true,
            '/^Compare-[a-z0-9]/i': true,
            '/^Format-[a-z0-9]/i': true,
            '/^Sort-[a-z0-9]/i': true,
            // #endregion
            // #region Safe + disabled args
            //
            // Commands that are generally allowed with special cases we block. Note that shell
            // expansion is handled by the inline command detection when parsing sub-commands.
            // column
            // - `-c`: We block excessive columns that could lead to memory exhaustion.
            column: true,
            '/^column\\b.*-c\\s+[0-9]{4,}/': false,
            // date
            // -s|--set: Sets the system clock
            date: true,
            '/^date\\b.*(-s|--set)\\b/': false,
            // find
            // - `-delete`: Deletes files or directories.
            // - `-exec`/`-execdir`: Execute on results.
            // - `-fprint`/`fprintf`/`fls`: Writes files.
            // - `-ok`/`-okdir`: Like exec but with a confirmation.
            find: true,
            '/^find\\b.*-(delete|exec|execdir|fprint|fprintf|fls|ok|okdir)\\b/': false,
            // sort
            // - `-o`: Output redirection can write files (`sort -o /etc/something file`) which are
            //   blocked currently
            // - `-S`: Memory exhaustion is possible (`sort -S 100G file`), we allow possible denial
            //   of service.
            sort: true,
            '/^sort\\b.*-(o|S)\\b/': false,
            // tree
            // - `-o`: Output redirection can write files (`tree -o /etc/something file`) which are
            //   blocked currently
            tree: true,
            '/^tree\\b.*-o\\b/': false,
            // #endregion
            // #region Dangerous commands
            //
            // There are countless dangerous commands available on the command line, the defaults
            // here include common ones that the user is likely to want to explicitly approve first.
            // This is not intended to be a catch all as the user needs to opt-in to auto-approve
            // commands, it provides some additional safety when the commands get approved by overly
            // broad user/workspace rules.
            // Deleting files
            rm: false,
            rmdir: false,
            del: false,
            'Remove-Item': false,
            ri: false,
            rd: false,
            erase: false,
            dd: false,
            // Managing/killing processes, dangerous thing to do generally
            kill: false,
            ps: false,
            top: false,
            'Stop-Process': false,
            spps: false,
            taskkill: false,
            'taskkill.exe': false,
            // Web requests, prompt injection concerns
            curl: false,
            wget: false,
            'Invoke-RestMethod': false,
            'Invoke-WebRequest': false,
            'irm': false,
            'iwr': false,
            // File permissions and ownership, messing with these can cause hard to diagnose issues
            chmod: false,
            chown: false,
            'Set-ItemProperty': false,
            'sp': false,
            'Set-Acl': false,
            // General eval/command execution, can lead to anything else running
            jq: false,
            xargs: false,
            eval: false,
            'Invoke-Expression': false,
            iex: false,
            // #endregion
        },
    },
    ["chat.tools.terminal.ignoreDefaultAutoApproveRules" /* TerminalChatAgentToolsSettingId.IgnoreDefaultAutoApproveRules */]: {
        type: 'boolean',
        default: false,
        tags: ['experimental'],
        markdownDescription: localize('ignoreDefaultAutoApproveRules.description', "Whether to ignore the built-in default auto-approve rules used by the run in terminal tool as defined in {0}. When this setting is enabled, the run in terminal tool will ignore any rule that comes from the default set but still follow rules defined in the user, remote and workspace settings. Use this setting at your own risk; the default auto-approve rules are designed to protect you against running dangerous commands.", `\`#${"chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */}#\``),
    },
    ["chat.tools.terminal.blockDetectedFileWrites" /* TerminalChatAgentToolsSettingId.BlockDetectedFileWrites */]: {
        type: 'string',
        enum: ['never', 'outsideWorkspace', 'all'],
        enumDescriptions: [
            localize('blockFileWrites.never', "Allow all detected file writes."),
            localize('blockFileWrites.outsideWorkspace', "Block file writes detected outside the workspace. This depends on the shell integration feature working correctly to determine the current working directory of the terminal."),
            localize('blockFileWrites.all', "Block all detected file writes."),
        ],
        default: 'outsideWorkspace',
        tags: ['experimental'],
        markdownDescription: localize('blockFileWrites.description', "Controls whether detected file write operations are blocked in the run in terminal tool. When detected, this will require explicit approval regardless of whether the command would normally be auto approved. Note that this cannot detect all possible methods of writing files, this is what is currently detected:\n\n- File redirection (detected via the bash or PowerShell tree sitter grammar)"),
    },
    ["chat.tools.terminal.shellIntegrationTimeout" /* TerminalChatAgentToolsSettingId.ShellIntegrationTimeout */]: {
        markdownDescription: localize('shellIntegrationTimeout.description', "Configures the duration in milliseconds to wait for shell integration to be detected when the run in terminal tool launches a new terminal. Set to `0` to wait the minimum time, the default value `-1` means the wait time is variable based on the value of {0} and whether it's a remote window. A large value can be useful if your shell starts very slowly and a low value if you're intentionally not using shell integration.", `\`#${"terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */}#\``),
        type: 'integer',
        minimum: -1,
        maximum: 60000,
        default: -1,
        markdownDeprecationMessage: localize('shellIntegrationTimeout.deprecated', 'Use {0} instead', `\`#${"terminal.integrated.shellIntegration.timeout" /* TerminalSettingId.ShellIntegrationTimeout */}#\``)
    },
    ["chat.tools.terminal.terminalProfile.linux" /* TerminalChatAgentToolsSettingId.TerminalProfileLinux */]: {
        restricted: true,
        markdownDescription: localize('terminalChatAgentProfile.linux', "The terminal profile to use on Linux for chat agent's run in terminal tool."),
        type: ['object', 'null'],
        default: null,
        'anyOf': [
            { type: 'null' },
            terminalChatAgentProfileSchema
        ],
        defaultSnippets: [
            {
                body: {
                    path: '${1}'
                }
            }
        ]
    },
    ["chat.tools.terminal.terminalProfile.osx" /* TerminalChatAgentToolsSettingId.TerminalProfileMacOs */]: {
        restricted: true,
        markdownDescription: localize('terminalChatAgentProfile.osx', "The terminal profile to use on macOS for chat agent's run in terminal tool."),
        type: ['object', 'null'],
        default: null,
        'anyOf': [
            { type: 'null' },
            terminalChatAgentProfileSchema
        ],
        defaultSnippets: [
            {
                body: {
                    path: '${1}'
                }
            }
        ]
    },
    ["chat.tools.terminal.terminalProfile.windows" /* TerminalChatAgentToolsSettingId.TerminalProfileWindows */]: {
        restricted: true,
        markdownDescription: localize('terminalChatAgentProfile.windows', "The terminal profile to use on Windows for chat agent's run in terminal tool."),
        type: ['object', 'null'],
        default: null,
        'anyOf': [
            { type: 'null' },
            terminalChatAgentProfileSchema
        ],
        defaultSnippets: [
            {
                body: {
                    path: '${1}'
                }
            }
        ]
    },
    ["chat.tools.terminal.autoReplyToPrompts" /* TerminalChatAgentToolsSettingId.AutoReplyToPrompts */]: {
        type: 'boolean',
        default: false,
        tags: ['experimental'],
        markdownDescription: localize('autoReplyToPrompts.key', "Whether to automatically respond to prompts in the terminal such as `Confirm? y/n`. This is an experimental feature and may not work in all scenarios."),
    },
    ["chat.tools.terminal.outputLocation" /* TerminalChatAgentToolsSettingId.OutputLocation */]: {
        markdownDescription: localize('outputLocation.description', "Where to show the output from the run in terminal tool session."),
        type: 'string',
        enum: ['terminal', 'none'],
        enumDescriptions: [
            localize('outputLocation.terminal', "Reveal the terminal when running the command."),
            localize('outputLocation.none', "Do not reveal the terminal automatically."),
        ],
        default: product.quality !== 'stable' ? 'none' : 'terminal',
        tags: ['experimental'],
        experiment: {
            mode: 'auto'
        }
    }
};
for (const id of [
    "chat.agent.terminal.allowList" /* TerminalChatAgentToolsSettingId.DeprecatedAutoApprove1 */,
    "chat.agent.terminal.denyList" /* TerminalChatAgentToolsSettingId.DeprecatedAutoApprove2 */,
    "github.copilot.chat.agent.terminal.allowList" /* TerminalChatAgentToolsSettingId.DeprecatedAutoApprove3 */,
    "github.copilot.chat.agent.terminal.denyList" /* TerminalChatAgentToolsSettingId.DeprecatedAutoApprove4 */,
    "chat.agent.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.DeprecatedAutoApproveCompatible */,
]) {
    terminalChatAgentToolsConfiguration[id] = {
        deprecated: true,
        markdownDeprecationMessage: localize('autoApprove.deprecated', 'Use {0} instead', `\`#${"chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */}#\``)
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0QWdlbnRUb29sc0NvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvY29tbW9uL3Rlcm1pbmFsQ2hhdEFnZW50VG9vbHNDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUdqRCxPQUFPLE9BQU8sTUFBTSxtREFBbUQsQ0FBQztBQUN4RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQztBQUN6SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdEUsTUFBTSxDQUFOLElBQWtCLCtCQWtCakI7QUFsQkQsV0FBa0IsK0JBQStCO0lBQ2hELDhGQUEyRCxDQUFBO0lBQzNELGtGQUErQyxDQUFBO0lBQy9DLHNIQUFtRixDQUFBO0lBQ25GLDBHQUF1RSxDQUFBO0lBQ3ZFLDBHQUF1RSxDQUFBO0lBQ3ZFLGdHQUE2RCxDQUFBO0lBQzdELHdGQUFxRCxDQUFBO0lBRXJELHFHQUFrRSxDQUFBO0lBQ2xFLG1HQUFnRSxDQUFBO0lBQ2hFLHlHQUFzRSxDQUFBO0lBRXRFLHNHQUFtRSxDQUFBO0lBQ25FLDJGQUF3RCxDQUFBO0lBQ3hELDBGQUF1RCxDQUFBO0lBQ3ZELDBHQUF1RSxDQUFBO0lBQ3ZFLHlHQUFzRSxDQUFBO0FBQ3ZFLENBQUMsRUFsQmlCLCtCQUErQixLQUEvQiwrQkFBK0IsUUFrQmhEO0FBUUQsTUFBTSxrQkFBa0IsR0FBZ0I7SUFDdkMsSUFBSSxFQUFFLFNBQVM7SUFDZixJQUFJLEVBQUU7UUFDTCxJQUFJO1FBQ0os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