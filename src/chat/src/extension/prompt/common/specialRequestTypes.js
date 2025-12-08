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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.isContinueOnError = exports.isToolCallLimitAcceptance = exports.isToolCallLimitCancellation = exports.cancelText = exports.getRequestedToolCallIterationLimit = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const isToolCallIterationIncrease = (c) => !!(c && typeof c.copilotRequestedRoundLimit === 'number');
const getRequestedToolCallIterationLimit = (request) => request.acceptedConfirmationData?.find(isToolCallIterationIncrease)?.copilotRequestedRoundLimit;
exports.getRequestedToolCallIterationLimit = getRequestedToolCallIterationLimit;
// todo@connor4312 improve with the choices API
const cancelText = () => l10n.t('Pause');
exports.cancelText = cancelText;
const isToolCallLimitCancellation = (request) => !!(0, exports.getRequestedToolCallIterationLimit)(request) && request.prompt.includes((0, exports.cancelText)());
exports.isToolCallLimitCancellation = isToolCallLimitCancellation;
const isToolCallLimitAcceptance = (request) => !!(0, exports.getRequestedToolCallIterationLimit)(request) && !(0, exports.isToolCallLimitCancellation)(request);
exports.isToolCallLimitAcceptance = isToolCallLimitAcceptance;
function isContinueOnErrorConfirmation(c) {
    return !!(c && c.copilotContinueOnError === true);
}
const isContinueOnError = (request) => !!(request.acceptedConfirmationData?.some(isContinueOnErrorConfirmation));
exports.isContinueOnError = isContinueOnError;
//# sourceMappingURL=specialRequestTypes.js.map