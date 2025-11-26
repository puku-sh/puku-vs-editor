/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { Color, RGBA } from '../../../../base/common/color.js';
import { registerColor, transparent } from '../colorUtils.js';
// Import the colors we need
import { editorInfoForeground, editorWarningForeground, editorWarningBorder, editorInfoBorder } from './editorColors.js';
import { scrollbarSliderBackground, scrollbarSliderHoverBackground, scrollbarSliderActiveBackground } from './miscColors.js';
export const minimapFindMatch = registerColor('minimap.findMatchHighlight', { light: '#d18616', dark: '#d18616', hcDark: '#AB5A00', hcLight: '#0F4A85' }, nls.localize(2580, null), true);
export const minimapSelectionOccurrenceHighlight = registerColor('minimap.selectionOccurrenceHighlight', { light: '#c9c9c9', dark: '#676767', hcDark: '#ffffff', hcLight: '#0F4A85' }, nls.localize(2581, null), true);
export const minimapSelection = registerColor('minimap.selectionHighlight', { light: '#ADD6FF', dark: '#264F78', hcDark: '#ffffff', hcLight: '#0F4A85' }, nls.localize(2582, null), true);
export const minimapInfo = registerColor('minimap.infoHighlight', { dark: editorInfoForeground, light: editorInfoForeground, hcDark: editorInfoBorder, hcLight: editorInfoBorder }, nls.localize(2583, null));
export const minimapWarning = registerColor('minimap.warningHighlight', { dark: editorWarningForeground, light: editorWarningForeground, hcDark: editorWarningBorder, hcLight: editorWarningBorder }, nls.localize(2584, null));
export const minimapError = registerColor('minimap.errorHighlight', { dark: new Color(new RGBA(255, 18, 18, 0.7)), light: new Color(new RGBA(255, 18, 18, 0.7)), hcDark: new Color(new RGBA(255, 50, 50, 1)), hcLight: '#B5200D' }, nls.localize(2585, null));
export const minimapBackground = registerColor('minimap.background', null, nls.localize(2586, null));
export const minimapForegroundOpacity = registerColor('minimap.foregroundOpacity', Color.fromHex('#000f'), nls.localize(2587, null));
export const minimapSliderBackground = registerColor('minimapSlider.background', transparent(scrollbarSliderBackground, 0.5), nls.localize(2588, null));
export const minimapSliderHoverBackground = registerColor('minimapSlider.hoverBackground', transparent(scrollbarSliderHoverBackground, 0.5), nls.localize(2589, null));
export const minimapSliderActiveBackground = registerColor('minimapSlider.activeBackground', transparent(scrollbarSliderActiveBackground, 0.5), nls.localize(2590, null));
//# sourceMappingURL=minimapColors.js.map