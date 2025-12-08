"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatImageMimeType = void 0;
exports.isImageDataPart = isImageDataPart;
const vscodeTypes_1 = require("../../../vscodeTypes");
var ChatImageMimeType;
(function (ChatImageMimeType) {
    ChatImageMimeType["PNG"] = "image/png";
    ChatImageMimeType["JPEG"] = "image/jpeg";
    ChatImageMimeType["GIF"] = "image/gif";
    ChatImageMimeType["WEBP"] = "image/webp";
    ChatImageMimeType["BMP"] = "image/bmp";
})(ChatImageMimeType || (exports.ChatImageMimeType = ChatImageMimeType = {}));
function isImageDataPart(part) {
    if (part instanceof vscodeTypes_1.LanguageModelDataPart && isChatImageMimeType(part.mimeType)) {
        return true;
    }
    return false;
}
function isChatImageMimeType(mimeType) {
    switch (mimeType) {
        case ChatImageMimeType.JPEG:
        case ChatImageMimeType.PNG:
        case ChatImageMimeType.GIF:
        case ChatImageMimeType.WEBP:
        case ChatImageMimeType.BMP:
            return true;
        default:
            return false;
    }
}
//# sourceMappingURL=languageModelChatMessageHelpers.js.map