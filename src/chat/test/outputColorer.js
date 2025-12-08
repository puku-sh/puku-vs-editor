"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orange = exports.violet = exports.red = exports.yellow = exports.green = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const green = (str) => process.stdout.isTTY ? `\x1b[32m${str}\x1b[0m` : str;
exports.green = green;
const yellow = (str) => process.stdout.isTTY ? `\x1b[33m${str}\x1b[0m` : str;
exports.yellow = yellow;
const red = (str) => process.stdout.isTTY ? `\x1b[31m${str}\x1b[0m` : str;
exports.red = red;
const violet = (str) => process.stdout.isTTY ? `\x1b[35m${str}\x1b[0m` : str;
exports.violet = violet;
const orange = (str) => process.stdout.isTTY ? `\x1b[33m${str}\x1b[0m` : str;
exports.orange = orange;
//# sourceMappingURL=outputColorer.js.map