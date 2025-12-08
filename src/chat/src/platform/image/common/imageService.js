"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.nullImageService = exports.IImageService = void 0;
const services_1 = require("../../../util/common/services");
exports.IImageService = (0, services_1.createServiceIdentifier)('IImageService');
exports.nullImageService = {
    _serviceBrand: undefined,
    async uploadChatImageAttachment() {
        throw new Error('Image service not implemented');
    }
};
//# sourceMappingURL=imageService.js.map