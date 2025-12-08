"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const extension_1 = require("../vscode/extension");
const contributions_1 = require("./contributions");
const services_1 = require("./services");
// ###############################################################################################
// ###                                                                                         ###
// ###                 Web extension that runs ONLY in web worker extension host.              ###
// ###                                                                                         ###
// ### !!! Prefer to add code in ../vscode/extension.ts to support all extension runtimes !!!  ###
// ###                                                                                         ###
// ###############################################################################################
function activate(context, forceActivation) {
    return (0, extension_1.baseActivate)({
        context,
        registerServices: services_1.registerServices,
        contributions: contributions_1.vscodeWebContributions,
        forceActivation
    });
}
//# sourceMappingURL=extension.js.map