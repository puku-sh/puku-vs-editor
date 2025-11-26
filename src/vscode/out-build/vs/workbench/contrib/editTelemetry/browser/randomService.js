/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { generateUuid } from '../../../../base/common/uuid.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IRandomService = createDecorator('randomService');
export class RandomService {
    generateUuid() {
        return generateUuid();
    }
    /** Namespace should be 3 letter. */
    generatePrefixedUuid(namespace) {
        return `${namespace}-${this.generateUuid()}`;
    }
}
//# sourceMappingURL=randomService.js.map