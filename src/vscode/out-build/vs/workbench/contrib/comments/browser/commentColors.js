/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as languages from '../../../../editor/common/languages.js';
import { peekViewTitleBackground } from '../../../../editor/contrib/peekView/browser/peekView.js';
import * as nls from '../../../../nls.js';
import { contrastBorder, disabledForeground, listFocusOutline, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
const resolvedCommentViewIcon = registerColor('commentsView.resolvedIcon', { dark: disabledForeground, light: disabledForeground, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(6822, null));
const unresolvedCommentViewIcon = registerColor('commentsView.unresolvedIcon', { dark: listFocusOutline, light: listFocusOutline, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(6823, null));
registerColor('editorCommentsWidget.replyInputBackground', peekViewTitleBackground, nls.localize(6824, null));
const resolvedCommentBorder = registerColor('editorCommentsWidget.resolvedBorder', { dark: resolvedCommentViewIcon, light: resolvedCommentViewIcon, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(6825, null));
const unresolvedCommentBorder = registerColor('editorCommentsWidget.unresolvedBorder', { dark: unresolvedCommentViewIcon, light: unresolvedCommentViewIcon, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(6826, null));
export const commentThreadRangeBackground = registerColor('editorCommentsWidget.rangeBackground', transparent(unresolvedCommentBorder, .1), nls.localize(6827, null));
export const commentThreadRangeActiveBackground = registerColor('editorCommentsWidget.rangeActiveBackground', transparent(unresolvedCommentBorder, .1), nls.localize(6828, null));
const commentThreadStateBorderColors = new Map([
    [languages.CommentThreadState.Unresolved, unresolvedCommentBorder],
    [languages.CommentThreadState.Resolved, resolvedCommentBorder],
]);
const commentThreadStateIconColors = new Map([
    [languages.CommentThreadState.Unresolved, unresolvedCommentViewIcon],
    [languages.CommentThreadState.Resolved, resolvedCommentViewIcon],
]);
export const commentThreadStateColorVar = '--comment-thread-state-color';
export const commentViewThreadStateColorVar = '--comment-view-thread-state-color';
export const commentThreadStateBackgroundColorVar = '--comment-thread-state-background-color';
function getCommentThreadStateColor(state, theme, map) {
    const colorId = (state !== undefined) ? map.get(state) : undefined;
    return (colorId !== undefined) ? theme.getColor(colorId) : undefined;
}
export function getCommentThreadStateBorderColor(state, theme) {
    return getCommentThreadStateColor(state, theme, commentThreadStateBorderColors);
}
export function getCommentThreadStateIconColor(state, theme) {
    return getCommentThreadStateColor(state, theme, commentThreadStateIconColors);
}
//# sourceMappingURL=commentColors.js.map