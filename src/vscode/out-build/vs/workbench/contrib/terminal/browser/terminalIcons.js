/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
export const terminalViewIcon = registerIcon('terminal-view-icon', Codicon.terminal, localize(12631, null));
export const renameTerminalIcon = registerIcon('terminal-rename', Codicon.edit, localize(12632, null));
export const killTerminalIcon = registerIcon('terminal-kill', Codicon.trash, localize(12633, null));
export const newTerminalIcon = registerIcon('terminal-new', Codicon.add, localize(12634, null));
export const configureTerminalProfileIcon = registerIcon('terminal-configure-profile', Codicon.gear, localize(12635, null));
export const terminalDecorationMark = registerIcon('terminal-decoration-mark', Codicon.circleSmallFilled, localize(12636, null));
export const terminalDecorationIncomplete = registerIcon('terminal-decoration-incomplete', Codicon.circle, localize(12637, null));
export const terminalDecorationError = registerIcon('terminal-decoration-error', Codicon.errorSmall, localize(12638, null));
export const terminalDecorationSuccess = registerIcon('terminal-decoration-success', Codicon.circleFilled, localize(12639, null));
export const commandHistoryRemoveIcon = registerIcon('terminal-command-history-remove', Codicon.close, localize(12640, null));
export const commandHistoryOutputIcon = registerIcon('terminal-command-history-output', Codicon.output, localize(12641, null));
export const commandHistoryFuzzySearchIcon = registerIcon('terminal-command-history-fuzzy-search', Codicon.searchFuzzy, localize(12642, null));
export const commandHistoryOpenFileIcon = registerIcon('terminal-command-history-open-file', Codicon.symbolReference, localize(12643, null));
//# sourceMappingURL=terminalIcons.js.map