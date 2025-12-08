"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPukuChatService = exports.PukuChatStatus = void 0;
const services_1 = require("../../../util/common/services");
/**
 * Puku Chat Service status
 */
var PukuChatStatus;
(function (PukuChatStatus) {
    /** Service not initialized */
    PukuChatStatus["Uninitialized"] = "uninitialized";
    /** Service ready to use */
    PukuChatStatus["Ready"] = "ready";
    /** Service is processing a request */
    PukuChatStatus["Busy"] = "busy";
    /** Service encountered an error */
    PukuChatStatus["Error"] = "error";
})(PukuChatStatus || (exports.PukuChatStatus = PukuChatStatus = {}));
exports.IPukuChatService = (0, services_1.createServiceIdentifier)('IPukuChatService');
//# sourceMappingURL=pukuChatService.js.map