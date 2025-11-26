/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import { Color, RGBA } from '../../../base/common/color.js';
import { activeContrastBorder, editorBackground, registerColor, editorWarningForeground, editorInfoForeground, editorWarningBorder, editorInfoBorder, contrastBorder, editorFindMatchHighlight, editorWarningBackground } from '../../../platform/theme/common/colorRegistry.js';
import { registerThemingParticipant } from '../../../platform/theme/common/themeService.js';
/**
 * Definition of the editor colors
 */
export const editorLineHighlight = registerColor('editor.lineHighlightBackground', null, nls.localize(728, null));
export const editorInactiveLineHighlight = registerColor('editor.inactiveLineHighlightBackground', editorLineHighlight, nls.localize(729, null));
export const editorLineHighlightBorder = registerColor('editor.lineHighlightBorder', { dark: '#282828', light: '#eeeeee', hcDark: '#f38518', hcLight: contrastBorder }, nls.localize(730, null));
export const editorRangeHighlight = registerColor('editor.rangeHighlightBackground', { dark: '#ffffff0b', light: '#fdff0033', hcDark: null, hcLight: null }, nls.localize(731, null), true);
export const editorRangeHighlightBorder = registerColor('editor.rangeHighlightBorder', { dark: null, light: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize(732, null));
export const editorSymbolHighlight = registerColor('editor.symbolHighlightBackground', { dark: editorFindMatchHighlight, light: editorFindMatchHighlight, hcDark: null, hcLight: null }, nls.localize(733, null), true);
export const editorSymbolHighlightBorder = registerColor('editor.symbolHighlightBorder', { dark: null, light: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize(734, null));
export const editorCursorForeground = registerColor('editorCursor.foreground', { dark: '#AEAFAD', light: Color.black, hcDark: Color.white, hcLight: '#0F4A85' }, nls.localize(735, null));
export const editorCursorBackground = registerColor('editorCursor.background', null, nls.localize(736, null));
export const editorMultiCursorPrimaryForeground = registerColor('editorMultiCursor.primary.foreground', editorCursorForeground, nls.localize(737, null));
export const editorMultiCursorPrimaryBackground = registerColor('editorMultiCursor.primary.background', editorCursorBackground, nls.localize(738, null));
export const editorMultiCursorSecondaryForeground = registerColor('editorMultiCursor.secondary.foreground', editorCursorForeground, nls.localize(739, null));
export const editorMultiCursorSecondaryBackground = registerColor('editorMultiCursor.secondary.background', editorCursorBackground, nls.localize(740, null));
export const editorWhitespaces = registerColor('editorWhitespace.foreground', { dark: '#e3e4e229', light: '#33333333', hcDark: '#e3e4e229', hcLight: '#CCCCCC' }, nls.localize(741, null));
export const editorLineNumbers = registerColor('editorLineNumber.foreground', { dark: '#858585', light: '#237893', hcDark: Color.white, hcLight: '#292929' }, nls.localize(742, null));
export const deprecatedEditorIndentGuides = registerColor('editorIndentGuide.background', editorWhitespaces, nls.localize(743, null), false, nls.localize(744, null));
export const deprecatedEditorActiveIndentGuides = registerColor('editorIndentGuide.activeBackground', editorWhitespaces, nls.localize(745, null), false, nls.localize(746, null));
export const editorIndentGuide1 = registerColor('editorIndentGuide.background1', deprecatedEditorIndentGuides, nls.localize(747, null));
export const editorIndentGuide2 = registerColor('editorIndentGuide.background2', '#00000000', nls.localize(748, null));
export const editorIndentGuide3 = registerColor('editorIndentGuide.background3', '#00000000', nls.localize(749, null));
export const editorIndentGuide4 = registerColor('editorIndentGuide.background4', '#00000000', nls.localize(750, null));
export const editorIndentGuide5 = registerColor('editorIndentGuide.background5', '#00000000', nls.localize(751, null));
export const editorIndentGuide6 = registerColor('editorIndentGuide.background6', '#00000000', nls.localize(752, null));
export const editorActiveIndentGuide1 = registerColor('editorIndentGuide.activeBackground1', deprecatedEditorActiveIndentGuides, nls.localize(753, null));
export const editorActiveIndentGuide2 = registerColor('editorIndentGuide.activeBackground2', '#00000000', nls.localize(754, null));
export const editorActiveIndentGuide3 = registerColor('editorIndentGuide.activeBackground3', '#00000000', nls.localize(755, null));
export const editorActiveIndentGuide4 = registerColor('editorIndentGuide.activeBackground4', '#00000000', nls.localize(756, null));
export const editorActiveIndentGuide5 = registerColor('editorIndentGuide.activeBackground5', '#00000000', nls.localize(757, null));
export const editorActiveIndentGuide6 = registerColor('editorIndentGuide.activeBackground6', '#00000000', nls.localize(758, null));
const deprecatedEditorActiveLineNumber = registerColor('editorActiveLineNumber.foreground', { dark: '#c6c6c6', light: '#0B216F', hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize(759, null), false, nls.localize(760, null));
export const editorActiveLineNumber = registerColor('editorLineNumber.activeForeground', deprecatedEditorActiveLineNumber, nls.localize(761, null));
export const editorDimmedLineNumber = registerColor('editorLineNumber.dimmedForeground', null, nls.localize(762, null));
export const editorRuler = registerColor('editorRuler.foreground', { dark: '#5A5A5A', light: Color.lightgrey, hcDark: Color.white, hcLight: '#292929' }, nls.localize(763, null));
export const editorCodeLensForeground = registerColor('editorCodeLens.foreground', { dark: '#999999', light: '#919191', hcDark: '#999999', hcLight: '#292929' }, nls.localize(764, null));
export const editorBracketMatchBackground = registerColor('editorBracketMatch.background', { dark: '#0064001a', light: '#0064001a', hcDark: '#0064001a', hcLight: '#0000' }, nls.localize(765, null));
export const editorBracketMatchBorder = registerColor('editorBracketMatch.border', { dark: '#888', light: '#B9B9B9', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(766, null));
export const editorOverviewRulerBorder = registerColor('editorOverviewRuler.border', { dark: '#7f7f7f4d', light: '#7f7f7f4d', hcDark: '#7f7f7f4d', hcLight: '#666666' }, nls.localize(767, null));
export const editorOverviewRulerBackground = registerColor('editorOverviewRuler.background', null, nls.localize(768, null));
export const editorGutter = registerColor('editorGutter.background', editorBackground, nls.localize(769, null));
export const editorUnnecessaryCodeBorder = registerColor('editorUnnecessaryCode.border', { dark: null, light: null, hcDark: Color.fromHex('#fff').transparent(0.8), hcLight: contrastBorder }, nls.localize(770, null));
export const editorUnnecessaryCodeOpacity = registerColor('editorUnnecessaryCode.opacity', { dark: Color.fromHex('#000a'), light: Color.fromHex('#0007'), hcDark: null, hcLight: null }, nls.localize(771, null));
export const ghostTextBorder = registerColor('editorGhostText.border', { dark: null, light: null, hcDark: Color.fromHex('#fff').transparent(0.8), hcLight: Color.fromHex('#292929').transparent(0.8) }, nls.localize(772, null));
export const ghostTextForeground = registerColor('editorGhostText.foreground', { dark: Color.fromHex('#ffffff56'), light: Color.fromHex('#0007'), hcDark: null, hcLight: null }, nls.localize(773, null));
export const ghostTextBackground = registerColor('editorGhostText.background', null, nls.localize(774, null));
const rulerRangeDefault = new Color(new RGBA(0, 122, 204, 0.6));
export const overviewRulerRangeHighlight = registerColor('editorOverviewRuler.rangeHighlightForeground', rulerRangeDefault, nls.localize(775, null), true);
export const overviewRulerError = registerColor('editorOverviewRuler.errorForeground', { dark: new Color(new RGBA(255, 18, 18, 0.7)), light: new Color(new RGBA(255, 18, 18, 0.7)), hcDark: new Color(new RGBA(255, 50, 50, 1)), hcLight: '#B5200D' }, nls.localize(776, null));
export const overviewRulerWarning = registerColor('editorOverviewRuler.warningForeground', { dark: editorWarningForeground, light: editorWarningForeground, hcDark: editorWarningBorder, hcLight: editorWarningBorder }, nls.localize(777, null));
export const overviewRulerInfo = registerColor('editorOverviewRuler.infoForeground', { dark: editorInfoForeground, light: editorInfoForeground, hcDark: editorInfoBorder, hcLight: editorInfoBorder }, nls.localize(778, null));
export const editorBracketHighlightingForeground1 = registerColor('editorBracketHighlight.foreground1', { dark: '#FFD700', light: '#0431FAFF', hcDark: '#FFD700', hcLight: '#0431FAFF' }, nls.localize(779, null));
export const editorBracketHighlightingForeground2 = registerColor('editorBracketHighlight.foreground2', { dark: '#DA70D6', light: '#319331FF', hcDark: '#DA70D6', hcLight: '#319331FF' }, nls.localize(780, null));
export const editorBracketHighlightingForeground3 = registerColor('editorBracketHighlight.foreground3', { dark: '#179FFF', light: '#7B3814FF', hcDark: '#87CEFA', hcLight: '#7B3814FF' }, nls.localize(781, null));
export const editorBracketHighlightingForeground4 = registerColor('editorBracketHighlight.foreground4', '#00000000', nls.localize(782, null));
export const editorBracketHighlightingForeground5 = registerColor('editorBracketHighlight.foreground5', '#00000000', nls.localize(783, null));
export const editorBracketHighlightingForeground6 = registerColor('editorBracketHighlight.foreground6', '#00000000', nls.localize(784, null));
export const editorBracketHighlightingUnexpectedBracketForeground = registerColor('editorBracketHighlight.unexpectedBracket.foreground', { dark: new Color(new RGBA(255, 18, 18, 0.8)), light: new Color(new RGBA(255, 18, 18, 0.8)), hcDark: new Color(new RGBA(255, 50, 50, 1)), hcLight: '#B5200D' }, nls.localize(785, null));
export const editorBracketPairGuideBackground1 = registerColor('editorBracketPairGuide.background1', '#00000000', nls.localize(786, null));
export const editorBracketPairGuideBackground2 = registerColor('editorBracketPairGuide.background2', '#00000000', nls.localize(787, null));
export const editorBracketPairGuideBackground3 = registerColor('editorBracketPairGuide.background3', '#00000000', nls.localize(788, null));
export const editorBracketPairGuideBackground4 = registerColor('editorBracketPairGuide.background4', '#00000000', nls.localize(789, null));
export const editorBracketPairGuideBackground5 = registerColor('editorBracketPairGuide.background5', '#00000000', nls.localize(790, null));
export const editorBracketPairGuideBackground6 = registerColor('editorBracketPairGuide.background6', '#00000000', nls.localize(791, null));
export const editorBracketPairGuideActiveBackground1 = registerColor('editorBracketPairGuide.activeBackground1', '#00000000', nls.localize(792, null));
export const editorBracketPairGuideActiveBackground2 = registerColor('editorBracketPairGuide.activeBackground2', '#00000000', nls.localize(793, null));
export const editorBracketPairGuideActiveBackground3 = registerColor('editorBracketPairGuide.activeBackground3', '#00000000', nls.localize(794, null));
export const editorBracketPairGuideActiveBackground4 = registerColor('editorBracketPairGuide.activeBackground4', '#00000000', nls.localize(795, null));
export const editorBracketPairGuideActiveBackground5 = registerColor('editorBracketPairGuide.activeBackground5', '#00000000', nls.localize(796, null));
export const editorBracketPairGuideActiveBackground6 = registerColor('editorBracketPairGuide.activeBackground6', '#00000000', nls.localize(797, null));
export const editorUnicodeHighlightBorder = registerColor('editorUnicodeHighlight.border', editorWarningForeground, nls.localize(798, null));
export const editorUnicodeHighlightBackground = registerColor('editorUnicodeHighlight.background', editorWarningBackground, nls.localize(799, null));
// contains all color rules that used to defined in editor/browser/widget/editor.css
registerThemingParticipant((theme, collector) => {
    const background = theme.getColor(editorBackground);
    const lineHighlight = theme.getColor(editorLineHighlight);
    const imeBackground = (lineHighlight && !lineHighlight.isTransparent() ? lineHighlight : background);
    if (imeBackground) {
        collector.addRule(`.monaco-editor .inputarea.ime-input { background-color: ${imeBackground}; }`);
    }
});
//# sourceMappingURL=editorColorRegistry.js.map