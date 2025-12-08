"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const path_1 = require("../../../util/vs/base/common/path");
const extension_1 = require("../vscode/extension");
const contributions_1 = require("./contributions");
const services_1 = require("./services");
// ###############################################################################################
// ###                                                                                         ###
// ###                 Node extension that runs ONLY in node.js extension host.                ###
// ###                                                                                         ###
// ### !!! Prefer to add code in ../vscode/extension.ts to support all extension runtimes !!!  ###
// ###                                                                                         ###
// ###############################################################################################
//#region TODO@bpasero this needs cleanup
require("../../intents/node/allIntents");
function configureDevPackages() {
    try {
        const sourceMapSupport = require('source-map-support');
        sourceMapSupport.install();
        const dotenv = require('dotenv');
        dotenv.config({ path: [(0, path_1.resolve)(__dirname, '../.env')] });
    }
    catch (err) {
        console.error(err);
    }
}
//#endregion
function activate(context, forceActivation) {
    return (0, extension_1.baseActivate)({
        context,
        registerServices: services_1.registerServices,
        contributions: contributions_1.vscodeNodeContributions,
        configureDevPackages,
        forceActivation
    });
}
//# sourceMappingURL=extension.js.map