/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { registerColor, editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
export const multiDiffEditorHeaderBackground = registerColor('multiDiffEditor.headerBackground', { dark: '#262626', light: 'tab.inactiveBackground', hcDark: 'tab.inactiveBackground', hcLight: 'tab.inactiveBackground', }, localize(256, null));
export const multiDiffEditorBackground = registerColor('multiDiffEditor.background', editorBackground, localize(257, null));
export const multiDiffEditorBorder = registerColor('multiDiffEditor.border', { dark: 'sideBarSectionHeader.border', light: '#cccccc', hcDark: 'sideBarSectionHeader.border', hcLight: '#cccccc', }, localize(258, null));
//# sourceMappingURL=colors.js.map