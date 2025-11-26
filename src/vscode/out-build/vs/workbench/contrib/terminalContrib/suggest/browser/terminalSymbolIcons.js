/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/terminalSymbolIcons.css';
import { SYMBOL_ICON_ENUMERATOR_FOREGROUND, SYMBOL_ICON_ENUMERATOR_MEMBER_FOREGROUND, SYMBOL_ICON_METHOD_FOREGROUND, SYMBOL_ICON_VARIABLE_FOREGROUND, SYMBOL_ICON_FILE_FOREGROUND, SYMBOL_ICON_FOLDER_FOREGROUND } from '../../../../../editor/contrib/symbolIcons/browser/symbolIcons.js';
import { registerColor } from '../../../../../platform/theme/common/colorUtils.js';
import { localize } from '../../../../../nls.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../../base/common/codicons.js';
export const TERMINAL_SYMBOL_ICON_FLAG_FOREGROUND = registerColor('terminalSymbolIcon.flagForeground', SYMBOL_ICON_ENUMERATOR_FOREGROUND, localize(13390, null));
export const TERMINAL_SYMBOL_ICON_ALIAS_FOREGROUND = registerColor('terminalSymbolIcon.aliasForeground', SYMBOL_ICON_METHOD_FOREGROUND, localize(13391, null));
export const TERMINAL_SYMBOL_ICON_OPTION_VALUE_FOREGROUND = registerColor('terminalSymbolIcon.optionValueForeground', SYMBOL_ICON_ENUMERATOR_MEMBER_FOREGROUND, localize(13392, null));
export const TERMINAL_SYMBOL_ICON_METHOD_FOREGROUND = registerColor('terminalSymbolIcon.methodForeground', SYMBOL_ICON_METHOD_FOREGROUND, localize(13393, null));
export const TERMINAL_SYMBOL_ICON_ARGUMENT_FOREGROUND = registerColor('terminalSymbolIcon.argumentForeground', SYMBOL_ICON_VARIABLE_FOREGROUND, localize(13394, null));
export const TERMINAL_SYMBOL_ICON_OPTION_FOREGROUND = registerColor('terminalSymbolIcon.optionForeground', SYMBOL_ICON_ENUMERATOR_FOREGROUND, localize(13395, null));
export const TERMINAL_SYMBOL_ICON_INLINE_SUGGESTION_FOREGROUND = registerColor('terminalSymbolIcon.inlineSuggestionForeground', null, localize(13396, null));
export const TERMINAL_SYMBOL_ICON_FILE_FOREGROUND = registerColor('terminalSymbolIcon.fileForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(13397, null));
export const TERMINAL_SYMBOL_ICON_FOLDER_FOREGROUND = registerColor('terminalSymbolIcon.folderForeground', SYMBOL_ICON_FOLDER_FOREGROUND, localize(13398, null));
export const TERMINAL_SYMBOL_ICON_COMMIT_FOREGROUND = registerColor('terminalSymbolIcon.commitForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(13399, null));
export const TERMINAL_SYMBOL_ICON_BRANCH_FOREGROUND = registerColor('terminalSymbolIcon.branchForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(13400, null));
export const TERMINAL_SYMBOL_ICON_TAG_FOREGROUND = registerColor('terminalSymbolIcon.tagForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(13401, null));
export const TERMINAL_SYMBOL_ICON_STASH_FOREGROUND = registerColor('terminalSymbolIcon.stashForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(13402, null));
export const TERMINAL_SYMBOL_ICON_REMOTE_FOREGROUND = registerColor('terminalSymbolIcon.remoteForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(13403, null));
export const TERMINAL_SYMBOL_ICON_PULL_REQUEST_FOREGROUND = registerColor('terminalSymbolIcon.pullRequestForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(13404, null));
export const TERMINAL_SYMBOL_ICON_PULL_REQUEST_DONE_FOREGROUND = registerColor('terminalSymbolIcon.pullRequestDoneForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(13405, null));
export const TERMINAL_SYMBOL_ICON_SYMBOLIC_LINK_FILE_FOREGROUND = registerColor('terminalSymbolIcon.symbolicLinkFileForeground', SYMBOL_ICON_FILE_FOREGROUND, localize(13406, null));
export const TERMINAL_SYMBOL_ICON_SYMBOLIC_LINK_FOLDER_FOREGROUND = registerColor('terminalSymbolIcon.symbolicLinkFolderForeground', SYMBOL_ICON_FOLDER_FOREGROUND, localize(13407, null));
export const TERMINAL_SYMBOL_ICON_SYMBOL_TEXT_FOREGROUND = registerColor('terminalSymbolIcon.symbolText', SYMBOL_ICON_FILE_FOREGROUND, localize(13408, null));
export const terminalSymbolFlagIcon = registerIcon('terminal-symbol-flag', Codicon.flag, localize(13409, null), TERMINAL_SYMBOL_ICON_FLAG_FOREGROUND);
export const terminalSymbolAliasIcon = registerIcon('terminal-symbol-alias', Codicon.symbolMethod, localize(13410, null), TERMINAL_SYMBOL_ICON_ALIAS_FOREGROUND);
export const terminalSymbolEnumMember = registerIcon('terminal-symbol-option-value', Codicon.symbolEnumMember, localize(13411, null), TERMINAL_SYMBOL_ICON_OPTION_VALUE_FOREGROUND);
export const terminalSymbolMethodIcon = registerIcon('terminal-symbol-method', Codicon.symbolMethod, localize(13412, null), TERMINAL_SYMBOL_ICON_METHOD_FOREGROUND);
export const terminalSymbolArgumentIcon = registerIcon('terminal-symbol-argument', Codicon.symbolVariable, localize(13413, null), TERMINAL_SYMBOL_ICON_ARGUMENT_FOREGROUND);
export const terminalSymbolOptionIcon = registerIcon('terminal-symbol-option', Codicon.symbolEnum, localize(13414, null), TERMINAL_SYMBOL_ICON_OPTION_FOREGROUND);
export const terminalSymbolInlineSuggestionIcon = registerIcon('terminal-symbol-inline-suggestion', Codicon.star, localize(13415, null), TERMINAL_SYMBOL_ICON_INLINE_SUGGESTION_FOREGROUND);
export const terminalSymbolFileIcon = registerIcon('terminal-symbol-file', Codicon.symbolFile, localize(13416, null), TERMINAL_SYMBOL_ICON_FILE_FOREGROUND);
export const terminalSymbolFolderIcon = registerIcon('terminal-symbol-folder', Codicon.symbolFolder, localize(13417, null), TERMINAL_SYMBOL_ICON_FOLDER_FOREGROUND);
export const terminalSymbolCommitIcon = registerIcon('terminal-symbol-commit', Codicon.gitCommit, localize(13418, null), TERMINAL_SYMBOL_ICON_COMMIT_FOREGROUND);
export const terminalSymbolBranchIcon = registerIcon('terminal-symbol-branch', Codicon.gitBranch, localize(13419, null), TERMINAL_SYMBOL_ICON_BRANCH_FOREGROUND);
export const terminalSymbolTagIcon = registerIcon('terminal-symbol-tag', Codicon.tag, localize(13420, null), TERMINAL_SYMBOL_ICON_TAG_FOREGROUND);
export const terminalSymbolStashIcon = registerIcon('terminal-symbol-stash', Codicon.gitStash, localize(13421, null), TERMINAL_SYMBOL_ICON_STASH_FOREGROUND);
export const terminalSymbolRemoteIcon = registerIcon('terminal-symbol-remote', Codicon.remote, localize(13422, null), TERMINAL_SYMBOL_ICON_REMOTE_FOREGROUND);
export const terminalSymbolPullRequestIcon = registerIcon('terminal-symbol-pull-request', Codicon.gitPullRequest, localize(13423, null), TERMINAL_SYMBOL_ICON_PULL_REQUEST_FOREGROUND);
export const terminalSymbolPullRequestDoneIcon = registerIcon('terminal-symbol-pull-request-done', Codicon.gitPullRequestDone, localize(13424, null), TERMINAL_SYMBOL_ICON_PULL_REQUEST_DONE_FOREGROUND);
export const terminalSymbolSymbolicLinkFileIcon = registerIcon('terminal-symbol-symbolic-link-file', Codicon.fileSymlinkFile, localize(13425, null), TERMINAL_SYMBOL_ICON_SYMBOLIC_LINK_FILE_FOREGROUND);
export const terminalSymbolSymbolicLinkFolderIcon = registerIcon('terminal-symbol-symbolic-link-folder', Codicon.fileSymlinkDirectory, localize(13426, null), TERMINAL_SYMBOL_ICON_SYMBOLIC_LINK_FOLDER_FOREGROUND);
export const terminalSymbolSymbolTextIcon = registerIcon('terminal-symbol-symbol-text', Codicon.symbolKey, localize(13427, null), TERMINAL_SYMBOL_ICON_SYMBOL_TEXT_FOREGROUND);
//# sourceMappingURL=terminalSymbolIcons.js.map