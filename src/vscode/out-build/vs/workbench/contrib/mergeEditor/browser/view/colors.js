/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { mergeCurrentHeaderBackground, mergeIncomingHeaderBackground, registerColor, transparent } from '../../../../../platform/theme/common/colorRegistry.js';
export const diff = registerColor('mergeEditor.change.background', '#9bb95533', localize(9997, null));
export const diffWord = registerColor('mergeEditor.change.word.background', { dark: '#9ccc2c33', light: '#9ccc2c66', hcDark: '#9ccc2c33', hcLight: '#9ccc2c66', }, localize(9998, null));
export const diffBase = registerColor('mergeEditor.changeBase.background', { dark: '#4B1818FF', light: '#FFCCCCFF', hcDark: '#4B1818FF', hcLight: '#FFCCCCFF', }, localize(9999, null));
export const diffWordBase = registerColor('mergeEditor.changeBase.word.background', { dark: '#6F1313FF', light: '#FFA3A3FF', hcDark: '#6F1313FF', hcLight: '#FFA3A3FF', }, localize(10000, null));
export const conflictBorderUnhandledUnfocused = registerColor('mergeEditor.conflict.unhandledUnfocused.border', { dark: '#ffa6007a', light: '#ffa600FF', hcDark: '#ffa6007a', hcLight: '#ffa6007a', }, localize(10001, null));
export const conflictBorderUnhandledFocused = registerColor('mergeEditor.conflict.unhandledFocused.border', '#ffa600', localize(10002, null));
export const conflictBorderHandledUnfocused = registerColor('mergeEditor.conflict.handledUnfocused.border', '#86868649', localize(10003, null));
export const conflictBorderHandledFocused = registerColor('mergeEditor.conflict.handledFocused.border', '#c1c1c1cc', localize(10004, null));
export const handledConflictMinimapOverViewRulerColor = registerColor('mergeEditor.conflict.handled.minimapOverViewRuler', '#adaca8ee', localize(10005, null));
export const unhandledConflictMinimapOverViewRulerColor = registerColor('mergeEditor.conflict.unhandled.minimapOverViewRuler', '#fcba03FF', localize(10006, null));
export const conflictingLinesBackground = registerColor('mergeEditor.conflictingLines.background', '#ffea0047', localize(10007, null));
const contentTransparency = 0.4;
export const conflictInput1Background = registerColor('mergeEditor.conflict.input1.background', transparent(mergeCurrentHeaderBackground, contentTransparency), localize(10008, null));
export const conflictInput2Background = registerColor('mergeEditor.conflict.input2.background', transparent(mergeIncomingHeaderBackground, contentTransparency), localize(10009, null));
//# sourceMappingURL=colors.js.map