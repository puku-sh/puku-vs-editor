"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vscodeWebContributions = void 0;
const contributions_1 = __importDefault(require("../vscode/contributions"));
// ###################################################################################################
// ###                                                                                             ###
// ###                  Web contributions run ONLY in web worker extension host.                   ###
// ###                                                                                             ###
// ### !!! Prefer to list contributions in ../vscode/contributions.ts to support them anywhere !!! ###
// ###                                                                                             ###
// ###################################################################################################
exports.vscodeWebContributions = [
    ...contributions_1.default,
];
//# sourceMappingURL=contributions.js.map