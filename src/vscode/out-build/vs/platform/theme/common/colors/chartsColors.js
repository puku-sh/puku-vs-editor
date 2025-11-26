/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { registerColor, transparent } from '../colorUtils.js';
import { foreground } from './baseColors.js';
import { editorErrorForeground, editorInfoForeground, editorWarningForeground } from './editorColors.js';
import { minimapFindMatch } from './minimapColors.js';
export const chartsForeground = registerColor('charts.foreground', foreground, nls.localize(2387, null));
export const chartsLines = registerColor('charts.lines', transparent(foreground, .5), nls.localize(2388, null));
export const chartsRed = registerColor('charts.red', editorErrorForeground, nls.localize(2389, null));
export const chartsBlue = registerColor('charts.blue', editorInfoForeground, nls.localize(2390, null));
export const chartsYellow = registerColor('charts.yellow', editorWarningForeground, nls.localize(2391, null));
export const chartsOrange = registerColor('charts.orange', minimapFindMatch, nls.localize(2392, null));
export const chartsGreen = registerColor('charts.green', { dark: '#89D185', light: '#388A34', hcDark: '#89D185', hcLight: '#374e06' }, nls.localize(2393, null));
export const chartsPurple = registerColor('charts.purple', { dark: '#B180D7', light: '#652D90', hcDark: '#B180D7', hcLight: '#652D90' }, nls.localize(2394, null));
//# sourceMappingURL=chartsColors.js.map