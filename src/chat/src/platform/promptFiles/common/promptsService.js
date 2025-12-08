"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptFileLangageId = exports.IPromptsService = void 0;
const services_1 = require("../../../util/common/services");
__exportStar(require("../../../util/vs/workbench/contrib/chat/common/promptSyntax/promptFileParser"), exports);
exports.IPromptsService = (0, services_1.createServiceIdentifier)('IPromptsService');
var PromptFileLangageId;
(function (PromptFileLangageId) {
    PromptFileLangageId.prompt = 'prompt';
    PromptFileLangageId.instructions = 'instructions';
    PromptFileLangageId.agent = 'chatagent';
})(PromptFileLangageId || (exports.PromptFileLangageId = PromptFileLangageId = {}));
//# sourceMappingURL=promptsService.js.map