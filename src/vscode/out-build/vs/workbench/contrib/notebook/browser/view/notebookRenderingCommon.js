/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createTrustedTypesPolicy } from '../../../../../base/browser/trustedTypes.js';
export const collapsedCellTTPolicy = createTrustedTypesPolicy('collapsedCellPreview', { createHTML: value => value });
//# sourceMappingURL=notebookRenderingCommon.js.map