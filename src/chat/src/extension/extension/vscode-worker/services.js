"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerServices = registerServices;
const services_1 = require("../vscode/services");
// ###########################################################################################
// ###                                                                                     ###
// ###               Web services that run ONLY in web worker extension host.              ###
// ###                                                                                     ###
// ###  !!! Prefer to list services in ../vscode/services.ts to support them anywhere !!!  ###
// ###                                                                                     ###
// ###########################################################################################
function registerServices(builder, extensionContext) {
    (0, services_1.registerServices)(builder, extensionContext);
}
//# sourceMappingURL=services.js.map