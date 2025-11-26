/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
export const selectKernelIcon = registerIcon('notebook-kernel-select', Codicon.serverEnvironment, localize(10538, null));
export const executeIcon = registerIcon('notebook-execute', Codicon.play, localize(10539, null));
export const executeAboveIcon = registerIcon('notebook-execute-above', Codicon.runAbove, localize(10540, null));
export const executeBelowIcon = registerIcon('notebook-execute-below', Codicon.runBelow, localize(10541, null));
export const stopIcon = registerIcon('notebook-stop', Codicon.primitiveSquare, localize(10542, null));
export const deleteCellIcon = registerIcon('notebook-delete-cell', Codicon.trash, localize(10543, null));
export const executeAllIcon = registerIcon('notebook-execute-all', Codicon.runAll, localize(10544, null));
export const editIcon = registerIcon('notebook-edit', Codicon.pencil, localize(10545, null));
export const stopEditIcon = registerIcon('notebook-stop-edit', Codicon.check, localize(10546, null));
export const moveUpIcon = registerIcon('notebook-move-up', Codicon.arrowUp, localize(10547, null));
export const moveDownIcon = registerIcon('notebook-move-down', Codicon.arrowDown, localize(10548, null));
export const clearIcon = registerIcon('notebook-clear', Codicon.clearAll, localize(10549, null));
export const splitCellIcon = registerIcon('notebook-split-cell', Codicon.splitVertical, localize(10550, null));
export const successStateIcon = registerIcon('notebook-state-success', Codicon.check, localize(10551, null));
export const errorStateIcon = registerIcon('notebook-state-error', Codicon.error, localize(10552, null));
export const pendingStateIcon = registerIcon('notebook-state-pending', Codicon.clock, localize(10553, null));
export const executingStateIcon = registerIcon('notebook-state-executing', Codicon.sync, localize(10554, null));
export const collapsedIcon = registerIcon('notebook-collapsed', Codicon.chevronRight, localize(10555, null));
export const expandedIcon = registerIcon('notebook-expanded', Codicon.chevronDown, localize(10556, null));
export const openAsTextIcon = registerIcon('notebook-open-as-text', Codicon.fileCode, localize(10557, null));
export const revertIcon = registerIcon('notebook-revert', Codicon.discard, localize(10558, null));
export const toggleWhitespace = registerIcon('notebook-diff-cell-toggle-whitespace', Codicon.whitespace, localize(10559, null));
export const renderOutputIcon = registerIcon('notebook-render-output', Codicon.preview, localize(10560, null));
export const mimetypeIcon = registerIcon('notebook-mimetype', Codicon.code, localize(10561, null));
export const copyIcon = registerIcon('notebook-copy', Codicon.copy, localize(10562, null));
export const saveIcon = registerIcon('notebook-save', Codicon.save, localize(10563, null));
export const previousChangeIcon = registerIcon('notebook-diff-editor-previous-change', Codicon.arrowUp, localize(10564, null));
export const nextChangeIcon = registerIcon('notebook-diff-editor-next-change', Codicon.arrowDown, localize(10565, null));
export const variablesViewIcon = registerIcon('variables-view-icon', Codicon.variableGroup, localize(10566, null));
//# sourceMappingURL=notebookIcons.js.map