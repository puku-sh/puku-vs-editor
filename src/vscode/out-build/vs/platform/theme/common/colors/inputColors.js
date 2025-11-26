/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { Color, RGBA } from '../../../../base/common/color.js';
import { registerColor, transparent, lighten, darken } from '../colorUtils.js';
// Import the colors we need
import { foreground, contrastBorder, focusBorder, iconForeground } from './baseColors.js';
import { editorWidgetBackground } from './editorColors.js';
// ----- input
export const inputBackground = registerColor('input.background', { dark: '#3C3C3C', light: Color.white, hcDark: Color.black, hcLight: Color.white }, nls.localize(2490, null));
export const inputForeground = registerColor('input.foreground', foreground, nls.localize(2491, null));
export const inputBorder = registerColor('input.border', { dark: null, light: null, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2492, null));
export const inputActiveOptionBorder = registerColor('inputOption.activeBorder', { dark: '#007ACC', light: '#007ACC', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2493, null));
export const inputActiveOptionHoverBackground = registerColor('inputOption.hoverBackground', { dark: '#5a5d5e80', light: '#b8b8b850', hcDark: null, hcLight: null }, nls.localize(2494, null));
export const inputActiveOptionBackground = registerColor('inputOption.activeBackground', { dark: transparent(focusBorder, 0.4), light: transparent(focusBorder, 0.2), hcDark: Color.transparent, hcLight: Color.transparent }, nls.localize(2495, null));
export const inputActiveOptionForeground = registerColor('inputOption.activeForeground', { dark: Color.white, light: Color.black, hcDark: foreground, hcLight: foreground }, nls.localize(2496, null));
export const inputPlaceholderForeground = registerColor('input.placeholderForeground', { light: transparent(foreground, 0.5), dark: transparent(foreground, 0.5), hcDark: transparent(foreground, 0.7), hcLight: transparent(foreground, 0.7) }, nls.localize(2497, null));
// ----- input validation
export const inputValidationInfoBackground = registerColor('inputValidation.infoBackground', { dark: '#063B49', light: '#D6ECF2', hcDark: Color.black, hcLight: Color.white }, nls.localize(2498, null));
export const inputValidationInfoForeground = registerColor('inputValidation.infoForeground', { dark: null, light: null, hcDark: null, hcLight: foreground }, nls.localize(2499, null));
export const inputValidationInfoBorder = registerColor('inputValidation.infoBorder', { dark: '#007acc', light: '#007acc', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2500, null));
export const inputValidationWarningBackground = registerColor('inputValidation.warningBackground', { dark: '#352A05', light: '#F6F5D2', hcDark: Color.black, hcLight: Color.white }, nls.localize(2501, null));
export const inputValidationWarningForeground = registerColor('inputValidation.warningForeground', { dark: null, light: null, hcDark: null, hcLight: foreground }, nls.localize(2502, null));
export const inputValidationWarningBorder = registerColor('inputValidation.warningBorder', { dark: '#B89500', light: '#B89500', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2503, null));
export const inputValidationErrorBackground = registerColor('inputValidation.errorBackground', { dark: '#5A1D1D', light: '#F2DEDE', hcDark: Color.black, hcLight: Color.white }, nls.localize(2504, null));
export const inputValidationErrorForeground = registerColor('inputValidation.errorForeground', { dark: null, light: null, hcDark: null, hcLight: foreground }, nls.localize(2505, null));
export const inputValidationErrorBorder = registerColor('inputValidation.errorBorder', { dark: '#BE1100', light: '#BE1100', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2506, null));
// ----- select
export const selectBackground = registerColor('dropdown.background', { dark: '#3C3C3C', light: Color.white, hcDark: Color.black, hcLight: Color.white }, nls.localize(2507, null));
export const selectListBackground = registerColor('dropdown.listBackground', { dark: null, light: null, hcDark: Color.black, hcLight: Color.white }, nls.localize(2508, null));
export const selectForeground = registerColor('dropdown.foreground', { dark: '#F0F0F0', light: foreground, hcDark: Color.white, hcLight: foreground }, nls.localize(2509, null));
export const selectBorder = registerColor('dropdown.border', { dark: selectBackground, light: '#CECECE', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2510, null));
// ------ button
export const buttonForeground = registerColor('button.foreground', Color.white, nls.localize(2511, null));
export const buttonSeparator = registerColor('button.separator', transparent(buttonForeground, .4), nls.localize(2512, null));
export const buttonBackground = registerColor('button.background', { dark: '#0E639C', light: '#007ACC', hcDark: Color.black, hcLight: '#0F4A85' }, nls.localize(2513, null));
export const buttonHoverBackground = registerColor('button.hoverBackground', { dark: lighten(buttonBackground, 0.2), light: darken(buttonBackground, 0.2), hcDark: buttonBackground, hcLight: buttonBackground }, nls.localize(2514, null));
export const buttonBorder = registerColor('button.border', contrastBorder, nls.localize(2515, null));
export const buttonSecondaryForeground = registerColor('button.secondaryForeground', { dark: Color.white, light: Color.white, hcDark: Color.white, hcLight: foreground }, nls.localize(2516, null));
export const buttonSecondaryBackground = registerColor('button.secondaryBackground', { dark: '#3A3D41', light: '#5F6A79', hcDark: null, hcLight: Color.white }, nls.localize(2517, null));
export const buttonSecondaryHoverBackground = registerColor('button.secondaryHoverBackground', { dark: lighten(buttonSecondaryBackground, 0.2), light: darken(buttonSecondaryBackground, 0.2), hcDark: null, hcLight: null }, nls.localize(2518, null));
// ------ radio
export const radioActiveForeground = registerColor('radio.activeForeground', inputActiveOptionForeground, nls.localize(2519, null));
export const radioActiveBackground = registerColor('radio.activeBackground', inputActiveOptionBackground, nls.localize(2520, null));
export const radioActiveBorder = registerColor('radio.activeBorder', inputActiveOptionBorder, nls.localize(2521, null));
export const radioInactiveForeground = registerColor('radio.inactiveForeground', null, nls.localize(2522, null));
export const radioInactiveBackground = registerColor('radio.inactiveBackground', null, nls.localize(2523, null));
export const radioInactiveBorder = registerColor('radio.inactiveBorder', { light: transparent(radioActiveForeground, .2), dark: transparent(radioActiveForeground, .2), hcDark: transparent(radioActiveForeground, .4), hcLight: transparent(radioActiveForeground, .2) }, nls.localize(2524, null));
export const radioInactiveHoverBackground = registerColor('radio.inactiveHoverBackground', inputActiveOptionHoverBackground, nls.localize(2525, null));
// ------ checkbox
export const checkboxBackground = registerColor('checkbox.background', selectBackground, nls.localize(2526, null));
export const checkboxSelectBackground = registerColor('checkbox.selectBackground', editorWidgetBackground, nls.localize(2527, null));
export const checkboxForeground = registerColor('checkbox.foreground', selectForeground, nls.localize(2528, null));
export const checkboxBorder = registerColor('checkbox.border', selectBorder, nls.localize(2529, null));
export const checkboxSelectBorder = registerColor('checkbox.selectBorder', iconForeground, nls.localize(2530, null));
export const checkboxDisabledBackground = registerColor('checkbox.disabled.background', { op: 7 /* ColorTransformType.Mix */, color: checkboxBackground, with: checkboxForeground, ratio: 0.33 }, nls.localize(2531, null));
export const checkboxDisabledForeground = registerColor('checkbox.disabled.foreground', { op: 7 /* ColorTransformType.Mix */, color: checkboxForeground, with: checkboxBackground, ratio: 0.33 }, nls.localize(2532, null));
// ------ keybinding label
export const keybindingLabelBackground = registerColor('keybindingLabel.background', { dark: new Color(new RGBA(128, 128, 128, 0.17)), light: new Color(new RGBA(221, 221, 221, 0.4)), hcDark: Color.transparent, hcLight: Color.transparent }, nls.localize(2533, null));
export const keybindingLabelForeground = registerColor('keybindingLabel.foreground', { dark: Color.fromHex('#CCCCCC'), light: Color.fromHex('#555555'), hcDark: Color.white, hcLight: foreground }, nls.localize(2534, null));
export const keybindingLabelBorder = registerColor('keybindingLabel.border', { dark: new Color(new RGBA(51, 51, 51, 0.6)), light: new Color(new RGBA(204, 204, 204, 0.4)), hcDark: new Color(new RGBA(111, 195, 223)), hcLight: contrastBorder }, nls.localize(2535, null));
export const keybindingLabelBottomBorder = registerColor('keybindingLabel.bottomBorder', { dark: new Color(new RGBA(68, 68, 68, 0.6)), light: new Color(new RGBA(187, 187, 187, 0.4)), hcDark: new Color(new RGBA(111, 195, 223)), hcLight: foreground }, nls.localize(2536, null));
//# sourceMappingURL=inputColors.js.map