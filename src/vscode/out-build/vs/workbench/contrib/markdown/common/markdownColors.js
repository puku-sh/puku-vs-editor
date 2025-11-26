/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { registerColor, editorInfoForeground, editorWarningForeground, editorErrorForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { chartsGreen, chartsPurple } from '../../../../platform/theme/common/colors/chartsColors.js';
/*
 * Markdown alert colors for GitHub-style alert syntax.
 */
export const markdownAlertNoteColor = registerColor('markdownAlert.note.foreground', editorInfoForeground, localize(9403, null));
export const markdownAlertTipColor = registerColor('markdownAlert.tip.foreground', chartsGreen, localize(9404, null));
export const markdownAlertImportantColor = registerColor('markdownAlert.important.foreground', chartsPurple, localize(9405, null));
export const markdownAlertWarningColor = registerColor('markdownAlert.warning.foreground', editorWarningForeground, localize(9406, null));
export const markdownAlertCautionColor = registerColor('markdownAlert.caution.foreground', editorErrorForeground, localize(9407, null));
//# sourceMappingURL=markdownColors.js.map