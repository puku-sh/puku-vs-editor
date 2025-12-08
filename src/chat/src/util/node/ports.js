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
exports.waitForListenerOnPort = waitForListenerOnPort;
const net = __importStar(require("net"));
function dispose(socket) {
    try {
        socket.removeAllListeners('connect');
        socket.removeAllListeners('error');
        socket.end();
        socket.destroy();
        socket.unref();
    }
    catch (error) {
        console.error(error); // otherwise this error would get lost in the callback chain
    }
}
async function waitForListenerOnPort(port, host, token) {
    while (!token.isCancellationRequested) {
        try {
            await new Promise((resolve, reject) => {
                const socket = new net.Socket();
                const cleanup = () => {
                    clearTimeout(t);
                    dispose(socket);
                };
                socket.once('connect', () => {
                    cleanup();
                    resolve();
                });
                socket.once('error', (err) => {
                    cleanup();
                    reject(err);
                });
                const t = setTimeout(() => {
                    cleanup();
                    reject(new Error(`Timeout waiting for port ${port}`));
                }, 1000);
                socket.connect(port, host ?? '127.0.0.1');
            });
            return; // Successfully connected
        }
        catch {
            // Ignore errors and retry
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait before retrying
        }
    }
    throw new Error(`Cancelled or unable to connect to port ${port}`);
}
//# sourceMappingURL=ports.js.map