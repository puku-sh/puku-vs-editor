/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { Color } from '../../../../base/common/color.js';
import { registerColor, darken, lighten, transparent, ifDefinedThenElse } from '../colorUtils.js';
// Import the colors we need
import { foreground, contrastBorder, activeContrastBorder, focusBorder, iconForeground } from './baseColors.js';
import { editorWidgetBackground, editorFindMatchHighlightBorder, editorFindMatchHighlight, widgetShadow, editorWidgetForeground } from './editorColors.js';
export const listFocusBackground = registerColor('list.focusBackground', null, nls.localize(2537, null));
export const listFocusForeground = registerColor('list.focusForeground', null, nls.localize(2538, null));
export const listFocusOutline = registerColor('list.focusOutline', { dark: focusBorder, light: focusBorder, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize(2539, null));
export const listFocusAndSelectionOutline = registerColor('list.focusAndSelectionOutline', null, nls.localize(2540, null));
export const listActiveSelectionBackground = registerColor('list.activeSelectionBackground', { dark: '#04395E', light: '#0060C0', hcDark: null, hcLight: Color.fromHex('#0F4A85').transparent(0.1) }, nls.localize(2541, null));
export const listActiveSelectionForeground = registerColor('list.activeSelectionForeground', { dark: Color.white, light: Color.white, hcDark: null, hcLight: null }, nls.localize(2542, null));
export const listActiveSelectionIconForeground = registerColor('list.activeSelectionIconForeground', null, nls.localize(2543, null));
export const listInactiveSelectionBackground = registerColor('list.inactiveSelectionBackground', { dark: '#37373D', light: '#E4E6F1', hcDark: null, hcLight: Color.fromHex('#0F4A85').transparent(0.1) }, nls.localize(2544, null));
export const listInactiveSelectionForeground = registerColor('list.inactiveSelectionForeground', null, nls.localize(2545, null));
export const listInactiveSelectionIconForeground = registerColor('list.inactiveSelectionIconForeground', null, nls.localize(2546, null));
export const listInactiveFocusBackground = registerColor('list.inactiveFocusBackground', null, nls.localize(2547, null));
export const listInactiveFocusOutline = registerColor('list.inactiveFocusOutline', null, nls.localize(2548, null));
export const listHoverBackground = registerColor('list.hoverBackground', { dark: '#2A2D2E', light: '#F0F0F0', hcDark: Color.white.transparent(0.1), hcLight: Color.fromHex('#0F4A85').transparent(0.1) }, nls.localize(2549, null));
export const listHoverForeground = registerColor('list.hoverForeground', null, nls.localize(2550, null));
export const listDropOverBackground = registerColor('list.dropBackground', { dark: '#062F4A', light: '#D6EBFF', hcDark: null, hcLight: null }, nls.localize(2551, null));
export const listDropBetweenBackground = registerColor('list.dropBetweenBackground', { dark: iconForeground, light: iconForeground, hcDark: null, hcLight: null }, nls.localize(2552, null));
export const listHighlightForeground = registerColor('list.highlightForeground', { dark: '#2AAAFF', light: '#0066BF', hcDark: focusBorder, hcLight: focusBorder }, nls.localize(2553, null));
export const listFocusHighlightForeground = registerColor('list.focusHighlightForeground', { dark: listHighlightForeground, light: ifDefinedThenElse(listActiveSelectionBackground, listHighlightForeground, '#BBE7FF'), hcDark: listHighlightForeground, hcLight: listHighlightForeground }, nls.localize(2554, null));
export const listInvalidItemForeground = registerColor('list.invalidItemForeground', { dark: '#B89500', light: '#B89500', hcDark: '#B89500', hcLight: '#B5200D' }, nls.localize(2555, null));
export const listErrorForeground = registerColor('list.errorForeground', { dark: '#F88070', light: '#B01011', hcDark: null, hcLight: null }, nls.localize(2556, null));
export const listWarningForeground = registerColor('list.warningForeground', { dark: '#CCA700', light: '#855F00', hcDark: null, hcLight: null }, nls.localize(2557, null));
export const listFilterWidgetBackground = registerColor('listFilterWidget.background', { light: darken(editorWidgetBackground, 0), dark: lighten(editorWidgetBackground, 0), hcDark: editorWidgetBackground, hcLight: editorWidgetBackground }, nls.localize(2558, null));
export const listFilterWidgetOutline = registerColor('listFilterWidget.outline', { dark: Color.transparent, light: Color.transparent, hcDark: '#f38518', hcLight: '#007ACC' }, nls.localize(2559, null));
export const listFilterWidgetNoMatchesOutline = registerColor('listFilterWidget.noMatchesOutline', { dark: '#BE1100', light: '#BE1100', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(2560, null));
export const listFilterWidgetShadow = registerColor('listFilterWidget.shadow', widgetShadow, nls.localize(2561, null));
export const listFilterMatchHighlight = registerColor('list.filterMatchBackground', { dark: editorFindMatchHighlight, light: editorFindMatchHighlight, hcDark: null, hcLight: null }, nls.localize(2562, null));
export const listFilterMatchHighlightBorder = registerColor('list.filterMatchBorder', { dark: editorFindMatchHighlightBorder, light: editorFindMatchHighlightBorder, hcDark: contrastBorder, hcLight: activeContrastBorder }, nls.localize(2563, null));
export const listDeemphasizedForeground = registerColor('list.deemphasizedForeground', { dark: '#8C8C8C', light: '#8E8E90', hcDark: '#A7A8A9', hcLight: '#666666' }, nls.localize(2564, null));
// ------ tree
export const treeIndentGuidesStroke = registerColor('tree.indentGuidesStroke', { dark: '#585858', light: '#a9a9a9', hcDark: '#a9a9a9', hcLight: '#a5a5a5' }, nls.localize(2565, null));
export const treeInactiveIndentGuidesStroke = registerColor('tree.inactiveIndentGuidesStroke', transparent(treeIndentGuidesStroke, 0.4), nls.localize(2566, null));
// ------ table
export const tableColumnsBorder = registerColor('tree.tableColumnsBorder', { dark: '#CCCCCC20', light: '#61616120', hcDark: null, hcLight: null }, nls.localize(2567, null));
export const tableOddRowsBackgroundColor = registerColor('tree.tableOddRowsBackground', { dark: transparent(foreground, 0.04), light: transparent(foreground, 0.04), hcDark: null, hcLight: null }, nls.localize(2568, null));
// ------ action list
export const editorActionListBackground = registerColor('editorActionList.background', editorWidgetBackground, nls.localize(2569, null));
export const editorActionListForeground = registerColor('editorActionList.foreground', editorWidgetForeground, nls.localize(2570, null));
export const editorActionListFocusForeground = registerColor('editorActionList.focusForeground', listActiveSelectionForeground, nls.localize(2571, null));
export const editorActionListFocusBackground = registerColor('editorActionList.focusBackground', listActiveSelectionBackground, nls.localize(2572, null));
//# sourceMappingURL=listColors.js.map