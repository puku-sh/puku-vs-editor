"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatLogMessage = formatLogMessage;
const node_util_1 = __importDefault(require("node:util"));
function formatLogMessage(category, ...extra) {
    return `[${category}] ${format(extra)}`;
}
function format(args) {
    return node_util_1.default.formatWithOptions({ maxStringLength: Infinity }, ...args);
}
//# sourceMappingURL=util.js.map