/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createCommandUri } from '../../../../../base/common/htmlContent.js';
import { escape } from '../../../../../base/common/strings.js';
import { localize } from '../../../../../nls.js';
const createSetProfileCommandUri = (profile) => createCommandUri('notebook.setProfile', { profile }).toString();
const imageSize = 400;
export default () => `
<vertically-centered>
<checklist>
	<checkbox on-checked="${createSetProfileCommandUri('default')}" checked-on="config.notebook.cellFocusIndicator == 'border' && config.notebook.insertToolbarLocation == 'both' && config.notebook.globalToolbar == false && config.notebook.compactView == true && config.notebook.showCellStatusBar == 'visible'">
		<img width="${imageSize}" src="./notebookThemes/default.png"/>
		${escape(localize(14572, null))}
	</checkbox>
	<checkbox on-checked="${createSetProfileCommandUri('jupyter')}" checked-on="config.notebook.cellFocusIndicator == 'gutter' && config.notebook.insertToolbarLocation == 'notebookToolbar' && config.notebook.globalToolbar == true && config.notebook.compactView == true  && config.notebook.showCellStatusBar == 'visible'">
		<img width="${imageSize}" src="./notebookThemes/jupyter.png"/>
		${escape(localize(14573, null))}
	</checkbox>
	<checkbox on-checked="${createSetProfileCommandUri('colab')}" checked-on="config.notebook.cellFocusIndicator == 'border' && config.notebook.insertToolbarLocation == 'betweenCells' && config.notebook.globalToolbar == false && config.notebook.compactView == false && config.notebook.showCellStatusBar == 'hidden'">
		<img width="${imageSize}" src="./notebookThemes/colab.png"/>
		${escape(localize(14574, null))}
	</checkbox>
</checklist>
</vertically-centered>
`;
//# sourceMappingURL=notebookProfile.js.map