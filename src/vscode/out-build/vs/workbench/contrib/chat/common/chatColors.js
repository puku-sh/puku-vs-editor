/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color, RGBA } from '../../../../base/common/color.js';
import { localize } from '../../../../nls.js';
import { badgeBackground, badgeForeground, contrastBorder, editorBackground, editorSelectionBackground, editorWidgetBackground, foreground, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
export const chatRequestBorder = registerColor('chat.requestBorder', { dark: new Color(new RGBA(255, 255, 255, 0.10)), light: new Color(new RGBA(0, 0, 0, 0.10)), hcDark: contrastBorder, hcLight: contrastBorder, }, localize(6346, null));
export const chatRequestBackground = registerColor('chat.requestBackground', { dark: transparent(editorBackground, 0.62), light: transparent(editorBackground, 0.62), hcDark: editorWidgetBackground, hcLight: null }, localize(6347, null));
export const chatSlashCommandBackground = registerColor('chat.slashCommandBackground', { dark: '#26477866', light: '#adceff7a', hcDark: Color.white, hcLight: badgeBackground }, localize(6348, null));
export const chatSlashCommandForeground = registerColor('chat.slashCommandForeground', { dark: '#85b6ff', light: '#26569e', hcDark: Color.black, hcLight: badgeForeground }, localize(6349, null));
export const chatAvatarBackground = registerColor('chat.avatarBackground', { dark: '#1f1f1f', light: '#f2f2f2', hcDark: Color.black, hcLight: Color.white, }, localize(6350, null));
export const chatAvatarForeground = registerColor('chat.avatarForeground', foreground, localize(6351, null));
export const chatEditedFileForeground = registerColor('chat.editedFileForeground', {
    light: '#895503',
    dark: '#E2C08D',
    hcDark: '#E2C08D',
    hcLight: '#895503'
}, localize(6352, null));
export const chatRequestCodeBorder = registerColor('chat.requestCodeBorder', { dark: '#004972B8', light: '#0e639c40', hcDark: null, hcLight: null }, localize(6353, null), true);
export const chatRequestBubbleBackground = registerColor('chat.requestBubbleBackground', { light: transparent(editorSelectionBackground, 0.3), dark: transparent(editorSelectionBackground, 0.3), hcDark: null, hcLight: null }, localize(6354, null), true);
export const chatRequestBubbleHoverBackground = registerColor('chat.requestBubbleHoverBackground', { dark: transparent(editorSelectionBackground, 0.6), light: transparent(editorSelectionBackground, 0.6), hcDark: null, hcLight: null }, localize(6355, null), true);
export const chatCheckpointSeparator = registerColor('chat.checkpointSeparator', { dark: '#585858', light: '#a9a9a9', hcDark: '#a9a9a9', hcLight: '#a5a5a5' }, localize(6356, null));
export const chatLinesAddedForeground = registerColor('chat.linesAddedForeground', { dark: '#54B054', light: '#107C10', hcDark: '#54B054', hcLight: '#107C10' }, localize(6357, null), true);
export const chatLinesRemovedForeground = registerColor('chat.linesRemovedForeground', { dark: '#FC6A6A', light: '#BC2F32', hcDark: '#F48771', hcLight: '#B5200D' }, localize(6358, null), true);
//# sourceMappingURL=chatColors.js.map