/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { isString } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import product from '../../../../platform/product/common/product.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { terminalColorSchema, terminalIconSchema } from '../../../../platform/terminal/common/terminalPlatformConfiguration.js';
import { Extensions as WorkbenchExtensions } from '../../../common/configuration.js';
import { terminalContribConfiguration } from '../terminalContribExports.js';
import { DEFAULT_COMMANDS_TO_SKIP_SHELL, DEFAULT_LETTER_SPACING, DEFAULT_LINE_HEIGHT, MAXIMUM_FONT_WEIGHT, MINIMUM_FONT_WEIGHT, SUGGESTIONS_FONT_WEIGHT } from './terminal.js';
const terminalDescriptors = '\n- ' + [
    '`\${cwd}`: ' + localize(12819, null),
    '`\${cwdFolder}`: ' + localize(12820, null),
    '`\${workspaceFolder}`: ' + localize(12821, null),
    '`\${workspaceFolderName}`: ' + localize(12822, null),
    '`\${local}`: ' + localize(12823, null),
    '`\${process}`: ' + localize(12824, null),
    '`\${progress}`: ' + localize(12825, null),
    '`\${separator}`: ' + localize(12826, null, '(` - `)'),
    '`\${sequence}`: ' + localize(12827, null),
    '`\${task}`: ' + localize(12828, null),
    '`\${shellType}`: ' + localize(12829, null),
    '`\${shellCommand}`: ' + localize(12830, null),
    '`\${shellPromptInput}`: ' + localize(12831, null),
].join('\n- '); // intentionally concatenated to not produce a string that is too long for translations
let terminalTitle = localize(12832, null);
terminalTitle += terminalDescriptors;
let terminalDescription = localize(12833, null);
terminalDescription += terminalDescriptors;
export const defaultTerminalFontSize = isMacintosh ? 12 : 14;
const terminalConfiguration = {
    ["terminal.integrated.sendKeybindingsToShell" /* TerminalSettingId.SendKeybindingsToShell */]: {
        markdownDescription: localize(12834, null, '`#terminal.integrated.commandsToSkipShell#`'),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.tabs.defaultColor" /* TerminalSettingId.TabsDefaultColor */]: {
        description: localize(12835, null),
        ...terminalColorSchema,
        scope: 5 /* ConfigurationScope.RESOURCE */
    },
    ["terminal.integrated.tabs.defaultIcon" /* TerminalSettingId.TabsDefaultIcon */]: {
        description: localize(12836, null),
        ...terminalIconSchema,
        default: Codicon.terminal.id,
        scope: 5 /* ConfigurationScope.RESOURCE */
    },
    ["terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */]: {
        description: localize(12837, null),
        type: 'boolean',
        default: true,
    },
    ["terminal.integrated.tabs.enableAnimation" /* TerminalSettingId.TabsEnableAnimation */]: {
        description: localize(12838, null),
        type: 'boolean',
        default: true,
    },
    ["terminal.integrated.tabs.hideCondition" /* TerminalSettingId.TabsHideCondition */]: {
        description: localize(12839, null),
        type: 'string',
        enum: ['never', 'singleTerminal', 'singleGroup'],
        enumDescriptions: [
            localize(12840, null),
            localize(12841, null),
            localize(12842, null),
        ],
        default: 'singleTerminal',
    },
    ["terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */]: {
        description: localize(12843, null),
        type: 'string',
        enum: ['always', 'singleTerminal', 'singleTerminalOrNarrow', 'never'],
        enumDescriptions: [
            localize(12844, null),
            localize(12845, null),
            localize(12846, null),
            localize(12847, null),
        ],
        default: 'singleTerminalOrNarrow',
    },
    ["terminal.integrated.tabs.showActions" /* TerminalSettingId.TabsShowActions */]: {
        description: localize(12848, null),
        type: 'string',
        enum: ['always', 'singleTerminal', 'singleTerminalOrNarrow', 'never'],
        enumDescriptions: [
            localize(12849, null),
            localize(12850, null),
            localize(12851, null),
            localize(12852, null),
        ],
        default: 'singleTerminalOrNarrow',
    },
    ["terminal.integrated.tabs.location" /* TerminalSettingId.TabsLocation */]: {
        type: 'string',
        enum: ['left', 'right'],
        enumDescriptions: [
            localize(12853, null),
            localize(12854, null)
        ],
        default: 'right',
        description: localize(12855, null)
    },
    ["terminal.integrated.defaultLocation" /* TerminalSettingId.DefaultLocation */]: {
        type: 'string',
        enum: ["editor" /* TerminalLocationConfigValue.Editor */, "view" /* TerminalLocationConfigValue.TerminalView */],
        enumDescriptions: [
            localize(12856, null),
            localize(12857, null)
        ],
        default: 'view',
        description: localize(12858, null)
    },
    ["terminal.integrated.tabs.focusMode" /* TerminalSettingId.TabsFocusMode */]: {
        type: 'string',
        enum: ['singleClick', 'doubleClick'],
        enumDescriptions: [
            localize(12859, null),
            localize(12860, null)
        ],
        default: 'doubleClick',
        description: localize(12861, null)
    },
    ["terminal.integrated.macOptionIsMeta" /* TerminalSettingId.MacOptionIsMeta */]: {
        description: localize(12862, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.macOptionClickForcesSelection" /* TerminalSettingId.MacOptionClickForcesSelection */]: {
        description: localize(12863, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.altClickMovesCursor" /* TerminalSettingId.AltClickMovesCursor */]: {
        markdownDescription: localize(12864, null, '`#editor.multiCursorModifier#`', '`\'alt\'`'),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.copyOnSelection" /* TerminalSettingId.CopyOnSelection */]: {
        description: localize(12865, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.enableMultiLinePasteWarning" /* TerminalSettingId.EnableMultiLinePasteWarning */]: {
        markdownDescription: localize(12866, null),
        type: 'string',
        enum: ['auto', 'always', 'never'],
        markdownEnumDescriptions: [
            localize(12867, null),
            localize(12868, null),
            localize(12869, null)
        ],
        default: 'auto'
    },
    ["terminal.integrated.drawBoldTextInBrightColors" /* TerminalSettingId.DrawBoldTextInBrightColors */]: {
        description: localize(12870, null),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */]: {
        markdownDescription: localize(12871, null, '`#editor.fontFamily#`'),
        type: 'string',
    },
    ["terminal.integrated.fontLigatures.enabled" /* TerminalSettingId.FontLigaturesEnabled */]: {
        markdownDescription: localize(12872, null, `\`#${"terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */}#\``),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.fontLigatures.featureSettings" /* TerminalSettingId.FontLigaturesFeatureSettings */]: {
        markdownDescription: localize(12873, null) + '\n\n- ' + [
            `\`"calt" off, "ss03"\``,
            `\`"liga" on\``,
            `\`"calt" off, "dlig" on\``
        ].join('\n- '),
        type: 'string',
        default: '"calt" on'
    },
    ["terminal.integrated.fontLigatures.fallbackLigatures" /* TerminalSettingId.FontLigaturesFallbackLigatures */]: {
        markdownDescription: localize(12874, null, `\`#${"terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */}#\``, `\`#${"terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */}#\``),
        type: 'array',
        items: [{ type: 'string' }],
        default: [
            '<--', '<---', '<<-', '<-', '->', '->>', '-->', '--->',
            '<==', '<===', '<<=', '<=', '=>', '=>>', '==>', '===>', '>=', '>>=',
            '<->', '<-->', '<--->', '<---->', '<=>', '<==>', '<===>', '<====>', '::', ':::',
            '<~~', '</', '</>', '/>', '~~>', '==', '!=', '/=', '~=', '<>', '===', '!==', '!===',
            '<:', ':=', '*=', '*+', '<*', '<*>', '*>', '<|', '<|>', '|>', '+*', '=*', '=:', ':>',
            '/*', '*/', '+++', '<!--', '<!---'
        ]
    },
    ["terminal.integrated.fontSize" /* TerminalSettingId.FontSize */]: {
        description: localize(12875, null),
        type: 'number',
        default: defaultTerminalFontSize,
        minimum: 6,
        maximum: 100
    },
    ["terminal.integrated.letterSpacing" /* TerminalSettingId.LetterSpacing */]: {
        description: localize(12876, null),
        type: 'number',
        default: DEFAULT_LETTER_SPACING
    },
    ["terminal.integrated.lineHeight" /* TerminalSettingId.LineHeight */]: {
        description: localize(12877, null),
        type: 'number',
        default: DEFAULT_LINE_HEIGHT
    },
    ["terminal.integrated.minimumContrastRatio" /* TerminalSettingId.MinimumContrastRatio */]: {
        markdownDescription: localize(12878, null),
        type: 'number',
        default: 4.5,
        tags: ['accessibility']
    },
    ["terminal.integrated.tabStopWidth" /* TerminalSettingId.TabStopWidth */]: {
        markdownDescription: localize(12879, null),
        type: 'number',
        minimum: 1,
        default: 8
    },
    ["terminal.integrated.fastScrollSensitivity" /* TerminalSettingId.FastScrollSensitivity */]: {
        markdownDescription: localize(12880, null),
        type: 'number',
        default: 5
    },
    ["terminal.integrated.mouseWheelScrollSensitivity" /* TerminalSettingId.MouseWheelScrollSensitivity */]: {
        markdownDescription: localize(12881, null),
        type: 'number',
        default: 1
    },
    ["terminal.integrated.bellDuration" /* TerminalSettingId.BellDuration */]: {
        markdownDescription: localize(12882, null),
        type: 'number',
        default: 1000
    },
    ["terminal.integrated.fontWeight" /* TerminalSettingId.FontWeight */]: {
        'anyOf': [
            {
                type: 'number',
                minimum: MINIMUM_FONT_WEIGHT,
                maximum: MAXIMUM_FONT_WEIGHT,
                errorMessage: localize(12883, null)
            },
            {
                type: 'string',
                pattern: '^(normal|bold|1000|[1-9][0-9]{0,2})$'
            },
            {
                enum: SUGGESTIONS_FONT_WEIGHT,
            }
        ],
        description: localize(12884, null),
        default: 'normal'
    },
    ["terminal.integrated.fontWeightBold" /* TerminalSettingId.FontWeightBold */]: {
        'anyOf': [
            {
                type: 'number',
                minimum: MINIMUM_FONT_WEIGHT,
                maximum: MAXIMUM_FONT_WEIGHT,
                errorMessage: localize(12885, null)
            },
            {
                type: 'string',
                pattern: '^(normal|bold|1000|[1-9][0-9]{0,2})$'
            },
            {
                enum: SUGGESTIONS_FONT_WEIGHT,
            }
        ],
        description: localize(12886, null),
        default: 'bold'
    },
    ["terminal.integrated.cursorBlinking" /* TerminalSettingId.CursorBlinking */]: {
        description: localize(12887, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.cursorStyle" /* TerminalSettingId.CursorStyle */]: {
        description: localize(12888, null),
        enum: ['block', 'line', 'underline'],
        default: 'block'
    },
    ["terminal.integrated.cursorStyleInactive" /* TerminalSettingId.CursorStyleInactive */]: {
        description: localize(12889, null),
        enum: ['outline', 'block', 'line', 'underline', 'none'],
        default: 'outline'
    },
    ["terminal.integrated.cursorWidth" /* TerminalSettingId.CursorWidth */]: {
        markdownDescription: localize(12890, null, '`#terminal.integrated.cursorStyle#`', '`line`'),
        type: 'number',
        default: 1
    },
    ["terminal.integrated.scrollback" /* TerminalSettingId.Scrollback */]: {
        description: localize(12891, null),
        type: 'number',
        default: 1000
    },
    ["terminal.integrated.detectLocale" /* TerminalSettingId.DetectLocale */]: {
        markdownDescription: localize(12892, null),
        type: 'string',
        enum: ['auto', 'off', 'on'],
        markdownEnumDescriptions: [
            localize(12893, null),
            localize(12894, null),
            localize(12895, null)
        ],
        default: 'auto'
    },
    ["terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */]: {
        type: 'string',
        enum: ['auto', 'on', 'off'],
        markdownEnumDescriptions: [
            localize(12896, null),
            localize(12897, null),
            localize(12898, null),
        ],
        default: 'auto',
        description: localize(12899, null)
    },
    ["terminal.integrated.tabs.separator" /* TerminalSettingId.TerminalTitleSeparator */]: {
        'type': 'string',
        'default': ' - ',
        'markdownDescription': localize(12900, null, `\`#${"terminal.integrated.tabs.title" /* TerminalSettingId.TerminalTitle */}#\``, `\`#${"terminal.integrated.tabs.description" /* TerminalSettingId.TerminalDescription */}#\``)
    },
    ["terminal.integrated.tabs.title" /* TerminalSettingId.TerminalTitle */]: {
        'type': 'string',
        'default': '${process}',
        'markdownDescription': terminalTitle
    },
    ["terminal.integrated.tabs.description" /* TerminalSettingId.TerminalDescription */]: {
        'type': 'string',
        'default': '${task}${separator}${local}${separator}${cwdFolder}',
        'markdownDescription': terminalDescription
    },
    ["terminal.integrated.rightClickBehavior" /* TerminalSettingId.RightClickBehavior */]: {
        type: 'string',
        enum: ['default', 'copyPaste', 'paste', 'selectWord', 'nothing'],
        enumDescriptions: [
            localize(12901, null),
            localize(12902, null),
            localize(12903, null),
            localize(12904, null),
            localize(12905, null)
        ],
        default: isMacintosh ? 'selectWord' : isWindows ? 'copyPaste' : 'default',
        description: localize(12906, null)
    },
    ["terminal.integrated.middleClickBehavior" /* TerminalSettingId.MiddleClickBehavior */]: {
        type: 'string',
        enum: ['default', 'paste'],
        enumDescriptions: [
            localize(12907, null),
            localize(12908, null),
        ],
        default: 'default',
        description: localize(12909, null)
    },
    ["terminal.integrated.cwd" /* TerminalSettingId.Cwd */]: {
        restricted: true,
        description: localize(12910, null),
        type: 'string',
        default: undefined,
        scope: 5 /* ConfigurationScope.RESOURCE */
    },
    ["terminal.integrated.confirmOnExit" /* TerminalSettingId.ConfirmOnExit */]: {
        description: localize(12911, null),
        type: 'string',
        enum: ['never', 'always', 'hasChildProcesses'],
        enumDescriptions: [
            localize(12912, null),
            localize(12913, null),
            localize(12914, null),
        ],
        default: 'never'
    },
    ["terminal.integrated.confirmOnKill" /* TerminalSettingId.ConfirmOnKill */]: {
        description: localize(12915, null),
        type: 'string',
        enum: ['never', 'editor', 'panel', 'always'],
        enumDescriptions: [
            localize(12916, null),
            localize(12917, null),
            localize(12918, null),
            localize(12919, null),
        ],
        default: 'editor'
    },
    ["terminal.integrated.enableBell" /* TerminalSettingId.EnableBell */]: {
        markdownDeprecationMessage: localize(12920, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.enableVisualBell" /* TerminalSettingId.EnableVisualBell */]: {
        description: localize(12921, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.commandsToSkipShell" /* TerminalSettingId.CommandsToSkipShell */]: {
        markdownDescription: localize(12922, null, DEFAULT_COMMANDS_TO_SKIP_SHELL.sort().map(command => `- ${command}`).join('\n'), `[${localize(12923, null)}](command:workbench.action.openRawDefaultSettings '${localize(12924, null)}')`),
        type: 'array',
        items: {
            type: 'string'
        },
        default: []
    },
    ["terminal.integrated.allowChords" /* TerminalSettingId.AllowChords */]: {
        markdownDescription: localize(12925, null, '`#terminal.integrated.commandsToSkipShell#`'),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.allowMnemonics" /* TerminalSettingId.AllowMnemonics */]: {
        markdownDescription: localize(12926, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.env.osx" /* TerminalSettingId.EnvMacOs */]: {
        restricted: true,
        markdownDescription: localize(12927, null),
        type: 'object',
        additionalProperties: {
            type: ['string', 'null']
        },
        default: {}
    },
    ["terminal.integrated.env.linux" /* TerminalSettingId.EnvLinux */]: {
        restricted: true,
        markdownDescription: localize(12928, null),
        type: 'object',
        additionalProperties: {
            type: ['string', 'null']
        },
        default: {}
    },
    ["terminal.integrated.env.windows" /* TerminalSettingId.EnvWindows */]: {
        restricted: true,
        markdownDescription: localize(12929, null),
        type: 'object',
        additionalProperties: {
            type: ['string', 'null']
        },
        default: {}
    },
    ["terminal.integrated.environmentChangesRelaunch" /* TerminalSettingId.EnvironmentChangesRelaunch */]: {
        markdownDescription: localize(12930, null),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.showExitAlert" /* TerminalSettingId.ShowExitAlert */]: {
        description: localize(12931, null),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.windowsUseConptyDll" /* TerminalSettingId.WindowsUseConptyDll */]: {
        markdownDescription: localize(12932, null),
        type: 'boolean',
        tags: ['preview'],
        default: false
    },
    ["terminal.integrated.splitCwd" /* TerminalSettingId.SplitCwd */]: {
        description: localize(12933, null),
        type: 'string',
        enum: ['workspaceRoot', 'initial', 'inherited'],
        enumDescriptions: [
            localize(12934, null),
            localize(12935, null),
            localize(12936, null),
        ],
        default: 'inherited'
    },
    ["terminal.integrated.windowsEnableConpty" /* TerminalSettingId.WindowsEnableConpty */]: {
        description: localize(12937, null),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.wordSeparators" /* TerminalSettingId.WordSeparators */]: {
        markdownDescription: localize(12938, null),
        type: 'string',
        // allow-any-unicode-next-line
        default: ' ()[]{}\',"`─‘’“”|'
    },
    ["terminal.integrated.enableFileLinks" /* TerminalSettingId.EnableFileLinks */]: {
        description: localize(12939, null),
        type: 'string',
        enum: ['off', 'on', 'notRemote'],
        enumDescriptions: [
            localize(12940, null),
            localize(12941, null),
            localize(12942, null)
        ],
        default: 'on'
    },
    ["terminal.integrated.allowedLinkSchemes" /* TerminalSettingId.AllowedLinkSchemes */]: {
        description: localize(12943, null),
        type: 'array',
        items: {
            type: 'string'
        },
        default: [
            'file',
            'http',
            'https',
            'mailto',
            'vscode',
            'vscode-insiders',
        ]
    },
    ["terminal.integrated.unicodeVersion" /* TerminalSettingId.UnicodeVersion */]: {
        type: 'string',
        enum: ['6', '11'],
        enumDescriptions: [
            localize(12944, null),
            localize(12945, null)
        ],
        default: '11',
        description: localize(12946, null)
    },
    ["terminal.integrated.enablePersistentSessions" /* TerminalSettingId.EnablePersistentSessions */]: {
        description: localize(12947, null),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.persistentSessionReviveProcess" /* TerminalSettingId.PersistentSessionReviveProcess */]: {
        markdownDescription: localize(12948, null),
        type: 'string',
        enum: ['onExit', 'onExitAndWindowClose', 'never'],
        markdownEnumDescriptions: [
            localize(12949, null),
            localize(12950, null),
            localize(12951, null)
        ],
        default: 'onExit'
    },
    ["terminal.integrated.hideOnStartup" /* TerminalSettingId.HideOnStartup */]: {
        description: localize(12952, null),
        type: 'string',
        enum: ['never', 'whenEmpty', 'always'],
        markdownEnumDescriptions: [
            localize(12953, null),
            localize(12954, null),
            localize(12955, null)
        ],
        default: 'never'
    },
    ["terminal.integrated.hideOnLastClosed" /* TerminalSettingId.HideOnLastClosed */]: {
        description: localize(12956, null),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.customGlyphs" /* TerminalSettingId.CustomGlyphs */]: {
        markdownDescription: localize(12957, null, `\`#${"terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */}#\``),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.rescaleOverlappingGlyphs" /* TerminalSettingId.RescaleOverlappingGlyphs */]: {
        markdownDescription: localize(12958, null),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */]: {
        restricted: true,
        markdownDescription: localize(12959, null, '`#terminal.integrated.shellIntegration.decorationsEnabled#`', '`#editor.accessibilitySupport#`'),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */]: {
        restricted: true,
        markdownDescription: localize(12960, null),
        type: 'string',
        enum: ['both', 'gutter', 'overviewRuler', 'never'],
        enumDescriptions: [
            localize(12961, null),
            localize(12962, null),
            localize(12963, null),
            localize(12964, null),
        ],
        default: 'both'
    },
    ["terminal.integrated.shellIntegration.timeout" /* TerminalSettingId.ShellIntegrationTimeout */]: {
        restricted: true,
        markdownDescription: localize(12965, null, '`0`', '`-1`'),
        type: 'integer',
        minimum: -1,
        maximum: 60000,
        default: -1
    },
    ["terminal.integrated.shellIntegration.quickFixEnabled" /* TerminalSettingId.ShellIntegrationQuickFixEnabled */]: {
        restricted: true,
        markdownDescription: localize(12966, null),
        type: 'boolean',
        default: true
    },
    ["terminal.integrated.shellIntegration.environmentReporting" /* TerminalSettingId.ShellIntegrationEnvironmentReporting */]: {
        markdownDescription: localize(12967, null, `\`#${"terminal.integrated.suggest.enabled" /* TerminalContribSettingId.SuggestEnabled */}#\``),
        type: 'boolean',
        default: product.quality !== 'stable'
    },
    ["terminal.integrated.smoothScrolling" /* TerminalSettingId.SmoothScrolling */]: {
        markdownDescription: localize(12968, null),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.ignoreBracketedPasteMode" /* TerminalSettingId.IgnoreBracketedPasteMode */]: {
        markdownDescription: localize(12969, null, '`\\x1b[200~`', '`\\x1b[201~`'),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.enableImages" /* TerminalSettingId.EnableImages */]: {
        restricted: true,
        markdownDescription: localize(12970, null, `\`#${"terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */}#\``, `\`#${"terminal.integrated.windowsUseConptyDll" /* TerminalSettingId.WindowsUseConptyDll */}#\``),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.focusAfterRun" /* TerminalSettingId.FocusAfterRun */]: {
        markdownDescription: localize(12971, null),
        enum: ['terminal', 'accessible-buffer', 'none'],
        default: 'none',
        tags: ['accessibility'],
        markdownEnumDescriptions: [
            localize(12972, null),
            localize(12973, null),
            localize(12974, null),
        ]
    },
    ["terminal.integrated.developer.ptyHost.latency" /* TerminalSettingId.DeveloperPtyHostLatency */]: {
        description: localize(12975, null),
        type: 'number',
        minimum: 0,
        default: 0,
        tags: ['advanced']
    },
    ["terminal.integrated.developer.ptyHost.startupDelay" /* TerminalSettingId.DeveloperPtyHostStartupDelay */]: {
        description: localize(12976, null),
        type: 'number',
        minimum: 0,
        default: 0,
        tags: ['advanced']
    },
    ["terminal.integrated.developer.devMode" /* TerminalSettingId.DevMode */]: {
        description: localize(12977, null),
        type: 'boolean',
        default: false,
        tags: ['advanced']
    },
    ...terminalContribConfiguration,
};
export async function registerTerminalConfiguration(getFontSnippets) {
    const configurationRegistry = Registry.as(Extensions.Configuration);
    configurationRegistry.registerConfiguration({
        id: 'terminal',
        order: 100,
        title: localize(12978, null),
        type: 'object',
        properties: terminalConfiguration,
    });
    terminalConfiguration["terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */].defaultSnippets = await getFontSnippets();
}
Registry.as(WorkbenchExtensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: "terminal.integrated.enableBell" /* TerminalSettingId.EnableBell */,
        migrateFn: (enableBell, accessor) => {
            const configurationKeyValuePairs = [];
            let announcement = accessor('accessibility.signals.terminalBell')?.announcement ?? accessor('accessibility.alert.terminalBell');
            if (announcement !== undefined && !isString(announcement)) {
                announcement = announcement ? 'auto' : 'off';
            }
            configurationKeyValuePairs.push(['accessibility.signals.terminalBell', { value: { sound: enableBell ? 'on' : 'off', announcement } }]);
            configurationKeyValuePairs.push(["terminal.integrated.enableBell" /* TerminalSettingId.EnableBell */, { value: undefined }]);
            configurationKeyValuePairs.push(["terminal.integrated.enableVisualBell" /* TerminalSettingId.EnableVisualBell */, { value: enableBell }]);
            return configurationKeyValuePairs;
        }
    }]);
//# sourceMappingURL=terminalConfiguration.js.map