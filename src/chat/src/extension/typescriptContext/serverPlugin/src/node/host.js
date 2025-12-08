"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeHost = void 0;
const crypto_1 = __importDefault(require("crypto"));
class NodeHost {
    constructor() {
    }
    createHash(algorithm) {
        return crypto_1.default.createHash(algorithm);
    }
    isDebugging() {
        return process.execArgv.some((arg) => /^--(?:inspect|debug)(?:-brk)?(?:=\d+)?$/i.test(arg));
    }
}
exports.NodeHost = NodeHost;
//# sourceMappingURL=host.js.map