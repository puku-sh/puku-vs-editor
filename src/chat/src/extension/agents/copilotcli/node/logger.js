"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCopilotLogger = getCopilotLogger;
function getCopilotLogger(logService) {
    return {
        isDebug: () => false,
        debug: (msg) => logService.debug(msg),
        log: (msg) => logService.trace(msg),
        info: (msg) => logService.info(msg),
        notice: (msg) => logService.info(typeof msg === 'string' ? msg : msg.message),
        warning: (msg) => logService.warn(typeof msg === 'string' ? msg : msg.message),
        error: (msg) => logService.error(typeof msg === 'string' ? msg : msg.message),
        startGroup: () => { },
        endGroup: () => { }
    };
}
//# sourceMappingURL=logger.js.map