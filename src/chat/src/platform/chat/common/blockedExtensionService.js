"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockedExtensionService = exports.IBlockedExtensionService = void 0;
const services_1 = require("../../../util/common/services");
exports.IBlockedExtensionService = (0, services_1.createServiceIdentifier)('IBlockedExtensionService');
class BlockedExtensionService {
    constructor() {
        this.blockedExtensions = new Map();
    }
    reportBlockedExtension(extensionId, timeout) {
        if (this.blockedExtensions.has(extensionId)) {
            clearTimeout(this.blockedExtensions.get(extensionId));
        }
        const timer = setTimeout(() => {
            this.blockedExtensions.delete(extensionId);
        }, timeout * 1000);
        this.blockedExtensions.set(extensionId, timer);
    }
    isExtensionBlocked(extensionId) {
        return this.blockedExtensions.has(extensionId);
    }
}
exports.BlockedExtensionService = BlockedExtensionService;
//# sourceMappingURL=blockedExtensionService.js.map