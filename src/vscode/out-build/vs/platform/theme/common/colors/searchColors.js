/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { registerColor, transparent } from '../colorUtils.js';
// Import the colors we need
import { foreground } from './baseColors.js';
import { editorFindMatchHighlight, editorFindMatchHighlightBorder } from './editorColors.js';
export const searchResultsInfoForeground = registerColor('search.resultsInfoForeground', { light: foreground, dark: transparent(foreground, 0.65), hcDark: foreground, hcLight: foreground }, nls.localize(2616, null));
// ----- search editor (Distinct from normal editor find match to allow for better differentiation)
export const searchEditorFindMatch = registerColor('searchEditor.findMatchBackground', { light: transparent(editorFindMatchHighlight, 0.66), dark: transparent(editorFindMatchHighlight, 0.66), hcDark: editorFindMatchHighlight, hcLight: editorFindMatchHighlight }, nls.localize(2617, null));
export const searchEditorFindMatchBorder = registerColor('searchEditor.findMatchBorder', { light: transparent(editorFindMatchHighlightBorder, 0.66), dark: transparent(editorFindMatchHighlightBorder, 0.66), hcDark: editorFindMatchHighlightBorder, hcLight: editorFindMatchHighlightBorder }, nls.localize(2618, null));
//# sourceMappingURL=searchColors.js.map