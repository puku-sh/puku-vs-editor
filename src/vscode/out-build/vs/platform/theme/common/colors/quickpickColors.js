/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { Color, RGBA } from '../../../../base/common/color.js';
import { registerColor, oneOf } from '../colorUtils.js';
// Import the colors we need
import { editorWidgetBackground, editorWidgetForeground } from './editorColors.js';
import { listActiveSelectionBackground, listActiveSelectionForeground, listActiveSelectionIconForeground } from './listColors.js';
export const quickInputBackground = registerColor('quickInput.background', editorWidgetBackground, nls.localize(2607, null));
export const quickInputForeground = registerColor('quickInput.foreground', editorWidgetForeground, nls.localize(2608, null));
export const quickInputTitleBackground = registerColor('quickInputTitle.background', { dark: new Color(new RGBA(255, 255, 255, 0.105)), light: new Color(new RGBA(0, 0, 0, 0.06)), hcDark: '#000000', hcLight: Color.white }, nls.localize(2609, null));
export const pickerGroupForeground = registerColor('pickerGroup.foreground', { dark: '#3794FF', light: '#0066BF', hcDark: Color.white, hcLight: '#0F4A85' }, nls.localize(2610, null));
export const pickerGroupBorder = registerColor('pickerGroup.border', { dark: '#3F3F46', light: '#CCCEDB', hcDark: Color.white, hcLight: '#0F4A85' }, nls.localize(2611, null));
export const _deprecatedQuickInputListFocusBackground = registerColor('quickInput.list.focusBackground', null, '', undefined, nls.localize(2612, null));
export const quickInputListFocusForeground = registerColor('quickInputList.focusForeground', listActiveSelectionForeground, nls.localize(2613, null));
export const quickInputListFocusIconForeground = registerColor('quickInputList.focusIconForeground', listActiveSelectionIconForeground, nls.localize(2614, null));
export const quickInputListFocusBackground = registerColor('quickInputList.focusBackground', { dark: oneOf(_deprecatedQuickInputListFocusBackground, listActiveSelectionBackground), light: oneOf(_deprecatedQuickInputListFocusBackground, listActiveSelectionBackground), hcDark: null, hcLight: null }, nls.localize(2615, null));
//# sourceMappingURL=quickpickColors.js.map