"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageServiceImpl = void 0;
const pukuRequestTypes_1 = require("../../api/common/pukuRequestTypes");
const uri_1 = require("../../../util/vs/base/common/uri");
const capiClient_1 = require("../../endpoint/common/capiClient");
let ImageServiceImpl = class ImageServiceImpl {
    constructor(capiClient) {
        this.capiClient = capiClient;
    }
    async uploadChatImageAttachment(binaryData, name, mimeType, token) {
        if (!mimeType || !token) {
            throw new Error('Missing required mimeType or token for image upload');
        }
        const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, '');
        let uploadName = sanitizedName;
        // can catch unexpected types like "IMAGE/JPEG", "image/svg+xml", or "image/png; charset=UTF-8"
        const subtypeMatch = mimeType.toLowerCase().match(/^[^\/]+\/([^+;]+)/);
        const subtype = subtypeMatch?.[1];
        // add the extension if it is missing.
        if (subtype && !uploadName.toLowerCase().endsWith(`.${subtype}`)) {
            uploadName = `${uploadName}.${subtype}`;
        }
        try {
            const response = await this.capiClient.makeRequest({
                method: 'POST',
                body: binaryData,
                headers: {
                    'Content-Type': 'application/octet-stream',
                    Authorization: `Bearer ${token}`,
                }
            }, { type: pukuRequestTypes_1.RequestType.ChatAttachmentUpload, uploadName, mimeType });
            if (!response.ok) {
                throw new Error(`Image upload failed: ${response.status} ${response.statusText}`);
            }
            const result = await response.json();
            return uri_1.URI.parse(result.url);
        }
        catch (error) {
            throw new Error(`Error uploading image: ${error}`);
        }
    }
};
exports.ImageServiceImpl = ImageServiceImpl;
exports.ImageServiceImpl = ImageServiceImpl = __decorate([
    __param(0, capiClient_1.ICAPIClientService)
], ImageServiceImpl);
//# sourceMappingURL=imageServiceImpl.js.map