/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../../editor/common/core/range.js';
export function isSearchTreeAIFileMatch(obj) {
    return obj && obj.getFullRange && obj.getFullRange() instanceof Range;
}
//# sourceMappingURL=aiSearchModelBase.js.map