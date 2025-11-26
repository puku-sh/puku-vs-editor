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
        localize(13194, null),
        localize(13195, null),
    ],
    description: localize(13196, null),
};
const terminalChatAgentProfileSchema = {
    type: 'object',
    required: ['path'],
    properties: {
        path: {
            description: localize(13197, null),
            type: 'string',
        },
        ...terminalProfileBaseProperties,
    }
};
export const terminalChatAgentToolsConfiguration = {
    ["chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */]: {
        description: localize(13198, null),
        type: 'boolean',
        default: true,
        policy: {
            name: 'ChatToolsTerminalEnableAutoApprove',
            category: PolicyCategory.IntegratedTerminal,
            minimumVersion: '1.104',
            localization: {
                description: {
                    key: 'autoApproveMode.description',
                    value: localize(13199, null),
                }
            }
        }
    },
    ["chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */]: {
        markdownDescription: [
            localize(13200, null, '`/`', '`i`'),
            localize(13201, null, '`true`', '`false`', '`null`'),
            localize(13202, null, '`foo && bar`', '`foo`', '`bar`', '`true`', '`false`', '`<(foo)`'),
            localize(13203, null, '`{ approve: false, matchCommandLine: true }`'),
            localize(13204, null, `\`#${"chat.tools.terminal.ignoreDefaultAutoApproveRules" /* TerminalChatAgentToolsSettingId.IgnoreDefaultAutoApproveRules */}#\``, '`true`'),
            [
                localize(13205, null),
                `|${localize(13206, null)}|${localize(13207, null)}|`,
                '|---|---|',
                '| `\"mkdir\": true` | ' + localize(13208, null, '`mkdir`'),
                '| `\"npm run build\": true` | ' + localize(13209, null, '`npm run build`'),
                '| `\"bin/test.sh\": true` | ' + localize(13210, null, '`bin/test.sh`', '`bin\\test.sh`', '`./bin/test.sh`'),
                '| `\"/^git (status\\|show\\\\b.*)$/\": true` | ' + localize(13211, null, '`git status`', '`git show`'),
                '| `\"/^Get-ChildItem\\\\b/i\": true` | ' + localize(13212, null, '`Get-ChildItem`'),
                '| `\"/.*/\": true` | ' + localize(13213, null),
                '| `\"rm\": false` | ' + localize(13214, null, '`rm`'),
                '| `\"/\\\\.ps1/i\": { approve: false, matchCommandLine: true }` | ' + localize(13215, null, '`".ps1"`'),
                '| `\"rm\": null` | ' + localize(13216, null, '`false`', '`rm`'),
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
                                localize(13217, null),
                                localize(13218, null),
                            ],
                            description: localize(13219, null),
                        }
                    },
                    required: ['approve']
                },
                {
                    type: 'null',
                    description: localize(13220, null),
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
        markdownDescription: localize(13221, null, `\`#${"chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */}#\``),
    },
    ["chat.tools.terminal.blockDetectedFileWrites" /* TerminalChatAgentToolsSettingId.BlockDetectedFileWrites */]: {
        type: 'string',
        enum: ['never', 'outsideWorkspace', 'all'],
        enumDescriptions: [
            localize(13222, null),
            localize(13223, null),
            localize(13224, null),
        ],
        default: 'outsideWorkspace',
        tags: ['experimental'],
        markdownDescription: localize(13225, null),
    },
    ["chat.tools.terminal.shellIntegrationTimeout" /* TerminalChatAgentToolsSettingId.ShellIntegrationTimeout */]: {
        markdownDescription: localize(13226, null, `\`#${"terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */}#\``),
        type: 'integer',
        minimum: -1,
        maximum: 60000,
        default: -1,
        markdownDeprecationMessage: localize(13227, null, `\`#${"terminal.integrated.shellIntegration.timeout" /* TerminalSettingId.ShellIntegrationTimeout */}#\``)
    },
    ["chat.tools.terminal.terminalProfile.linux" /* TerminalChatAgentToolsSettingId.TerminalProfileLinux */]: {
        restricted: true,
        markdownDescription: localize(13228, null),
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
        markdownDescription: localize(13229, null),
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
        markdownDescription: localize(13230, null),
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
        markdownDescription: localize(13231, null),
    },
    ["chat.tools.terminal.outputLocation" /* TerminalChatAgentToolsSettingId.OutputLocation */]: {
        markdownDescription: localize(13232, null),
        type: 'string',
        enum: ['terminal', 'none'],
        enumDescriptions: [
            localize(13233, null),
            localize(13234, null),
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
        markdownDeprecationMessage: localize(13235, null, `\`#${"chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */}#\``)
    };
}
//# sourceMappingURL=terminalChatAgentToolsConfiguration.js.map