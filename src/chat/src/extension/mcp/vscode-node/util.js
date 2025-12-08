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
exports.CommandExecutor = void 0;
const cp = __importStar(require("child_process"));
class CommandExecutor {
    async executeWithTimeout(command, args, cwd, timeoutMs, expectZeroExitCode, cancellationToken) {
        return await executeWithTimeout(command, args, cwd, timeoutMs, expectZeroExitCode, cancellationToken);
    }
}
exports.CommandExecutor = CommandExecutor;
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 10000;
async function executeWithTimeout(command, args, cwd, timeoutMs = 60000, expectZeroExitCode = true, cancellationToken) {
    return await new Promise((resolve, reject) => {
        const stdout = [];
        const stderr = [];
        let settled = false;
        const child = cp.spawn(command, args, {
            stdio: "pipe",
            env: { ...process.env },
            cwd: cwd,
        });
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (data) => stdout.push(data));
        child.stderr.on('data', (data) => stderr.push(data));
        const timeoutHandler = setTimeout(() => {
            if (!settled) {
                settled = true;
                child.kill('SIGTERM');
                setTimeout(() => {
                    if (!child.killed) {
                        child.kill('SIGKILL');
                    }
                }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
                reject(new Error(`Process timed out after ${timeoutMs}ms`));
            }
        }, timeoutMs);
        const cancellationHandler = cancellationToken?.onCancellationRequested(() => {
            if (!settled) {
                settled = true;
                clearTimeout(timeoutHandler);
                child.kill('SIGTERM');
                setTimeout(() => {
                    if (!child.killed) {
                        child.kill('SIGKILL');
                    }
                }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
                reject(new Error(`Process cancelled`));
            }
        });
        child.on('error', (error) => {
            if (!settled) {
                settled = true;
                clearTimeout(timeoutHandler);
                cancellationHandler?.dispose();
                reject(error);
            }
        });
        child.on('close', (code) => {
            if (!settled) {
                settled = true;
                clearTimeout(timeoutHandler);
                cancellationHandler?.dispose();
                if (expectZeroExitCode && code !== 0) {
                    reject(new Error(`Process ${child.pid} (${command}) failed with code ${code}.
stdout: ${stdout.join('')}
stderr: ${stderr.join('')}`));
                }
                else {
                    resolve({
                        stdout: stdout.join(''),
                        stderr: stderr.join(''),
                        exitCode: code ?? -1,
                    });
                }
            }
        });
    });
}
//# sourceMappingURL=util.js.map