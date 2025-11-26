/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { Color } from '../../../../base/common/color.js';
import { registerColor, transparent } from '../colorUtils.js';
export const foreground = registerColor('foreground', { dark: '#CCCCCC', light: '#616161', hcDark: '#FFFFFF', hcLight: '#292929' }, nls.localize(2370, null));
export const disabledForeground = registerColor('disabledForeground', { dark: '#CCCCCC80', light: '#61616180', hcDark: '#A5A5A5', hcLight: '#7F7F7F' }, nls.localize(2371, null));
export const errorForeground = registerColor('errorForeground', { dark: '#F48771', light: '#A1260D', hcDark: '#F48771', hcLight: '#B5200D' }, nls.localize(2372, null));
export const descriptionForeground = registerColor('descriptionForeground', { light: '#717171', dark: transparent(foreground, 0.7), hcDark: transparent(foreground, 0.7), hcLight: transparent(foreground, 0.7) }, nls.localize(2373, null));
export const iconForeground = registerColor('icon.foreground', { dark: '#C5C5C5', light: '#424242', hcDark: '#FFFFFF', hcLight: '#292929' }, nls.localize(2374, null));
export const focusBorder = registerColor('focusBorder', { dark: '#007FD4', light: '#0090F1', hcDark: '#F38518', hcLight: '#006BBD' }, nls.localize(2375, null));
export const contrastBorder = registerColor('contrastBorder', { light: null, dark: null, hcDark: '#6FC3DF', hcLight: '#0F4A85' }, nls.localize(2376, null));
export const activeContrastBorder = registerColor('contrastActiveBorder', { light: null, dark: null, hcDark: focusBorder, hcLight: focusBorder }, nls.localize(2377, null));
export const selectionBackground = registerColor('selection.background', null, nls.localize(2378, null));
// ------ text link
export const textLinkForeground = registerColor('textLink.foreground', { light: '#006AB1', dark: '#3794FF', hcDark: '#21A6FF', hcLight: '#0F4A85' }, nls.localize(2379, null));
export const textLinkActiveForeground = registerColor('textLink.activeForeground', { light: '#006AB1', dark: '#3794FF', hcDark: '#21A6FF', hcLight: '#0F4A85' }, nls.localize(2380, null));
export const textSeparatorForeground = registerColor('textSeparator.foreground', { light: '#0000002e', dark: '#ffffff2e', hcDark: Color.black, hcLight: '#292929' }, nls.localize(2381, null));
// ------ text preformat
export const textPreformatForeground = registerColor('textPreformat.foreground', { light: '#A31515', dark: '#D7BA7D', hcDark: '#000000', hcLight: '#FFFFFF' }, nls.localize(2382, null));
export const textPreformatBackground = registerColor('textPreformat.background', { light: '#0000001A', dark: '#FFFFFF1A', hcDark: '#FFFFFF', hcLight: '#09345f' }, nls.localize(2383, null));
// ------ text block quote
export const textBlockQuoteBackground = registerColor('textBlockQuote.background', { light: '#f2f2f2', dark: '#222222', hcDark: null, hcLight: '#F2F2F2' }, nls.localize(2384, null));
export const textBlockQuoteBorder = registerColor('textBlockQuote.border', { light: '#007acc80', dark: '#007acc80', hcDark: Color.white, hcLight: '#292929' }, nls.localize(2385, null));
// ------ text code block
export const textCodeBlockBackground = registerColor('textCodeBlock.background', { light: '#dcdcdc66', dark: '#0a0a0a66', hcDark: Color.black, hcLight: '#F2F2F2' }, nls.localize(2386, null));
//# sourceMappingURL=baseColors.js.map