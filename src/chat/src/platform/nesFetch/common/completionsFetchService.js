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
exports.ICompletionsFetchService = exports.CompletionsFetchError = void 0;
exports.getErrorDetailsFromFetchError = getErrorDetailsFromFetchError;
const l10n = __importStar(require("@vscode/l10n"));
const services_1 = require("../../../util/common/services");
class CompletionsFetchError extends Error {
    constructor(type, requestId, message) {
        super(message);
        this.type = type;
        this.requestId = requestId;
    }
}
exports.CompletionsFetchError = CompletionsFetchError;
exports.ICompletionsFetchService = (0, services_1.createServiceIdentifier)('ICompletionsFetchService');
function getErrorDetailsFromFetchError(requestId, error) {
    switch (error.kind) {
        case 'cancelled':
            return { message: 'Cancelled' };
        case 'exceeded-rate-limit':
            return {
                message: l10n.t(`Sorry, your request was rate-limited. Please wait and try again.`),
                responseIsFiltered: true,
            };
        case 'quota-exceeded':
            return {
                message: l10n.t(`You've reached your monthly chat messages limit. [Upgrade to Copilot Pro]({0}) (30-day Free Trial) or wait for your limit to reset.`, 'https://aka.ms/github-copilot-upgrade-plan'),
            };
        case 'model_overloaded':
        case 'model_error':
        case 'not-registered':
        case 'not-200-status':
        case 'context-window-exceeded':
        case 'invalid-api-key':
        case 'not-configured':
        default:
            return { message: l10n.t(`Sorry, your request failed. Please try again. Request id: {0}`, requestId) };
    }
}
//# sourceMappingURL=completionsFetchService.js.map