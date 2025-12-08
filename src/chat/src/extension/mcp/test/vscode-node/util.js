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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixtureFetcherService = exports.FixtureCommandExecutor = void 0;
const fs = __importStar(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class FixtureCommandExecutor {
    constructor(fullCommandToResultMap = new Map()) {
        this.fullCommandToResultMap = fullCommandToResultMap;
        this.commands = [];
    }
    async executeWithTimeout(command, args, cwd, timeoutMs, expectZeroExitCode, cancellationToken) {
        this.commands.push({ command, args, cwd });
        let stdout = '';
        let exitCode = 1;
        if (this.fullCommandToResultMap) {
            const fullCommand = `${command} ${args.join(' ')}`;
            const result = this.fullCommandToResultMap.get(fullCommand);
            if (result) {
                exitCode = result.exitCode;
                if (result.fileName) {
                    const filePath = path_1.default.join(__dirname, 'fixtures', 'snapshots', result.fileName);
                    stdout = await fs.readFile(filePath, 'utf-8');
                }
                else if (result.stdout) {
                    stdout = result.stdout;
                }
            }
        }
        if (expectZeroExitCode && exitCode !== 0) {
            return Promise.reject(new Error(`Expected zero exit code but got ${exitCode}`));
        }
        return Promise.resolve({
            exitCode,
            stdout,
            stderr: '',
        });
    }
}
exports.FixtureCommandExecutor = FixtureCommandExecutor;
class FixtureFetcherService {
    constructor(urlToFileNameMap = new Map()) {
        this.urlToFileNameMap = urlToFileNameMap;
        this.urls = [];
    }
    async fetch(url, options) {
        this.urls.push(url);
        const result = this.urlToFileNameMap?.get(url);
        if (!result) {
            return Promise.resolve({
                ok: false,
                status: 404,
                json: async () => ({ message: 'Not Found' }),
            });
        }
        else {
            const filePath = path_1.default.join(__dirname, 'fixtures', 'snapshots', result.fileName);
            const content = await fs.readFile(filePath, 'utf-8');
            return Promise.resolve({
                ok: result.status === 200,
                status: result.status,
                text: async () => content,
                json: async () => JSON.parse(content),
            });
        }
    }
    getUserAgentLibrary() { throw new Error('Method not implemented.'); }
    disconnectAll() { throw new Error('Method not implemented.'); }
    makeAbortController() { throw new Error('Method not implemented.'); }
    isAbortError(e) { throw new Error('Method not implemented.'); }
    isInternetDisconnectedError(e) { throw new Error('Method not implemented.'); }
    isFetcherError(e) { throw new Error('Method not implemented.'); }
    getUserMessageForFetcherError(err) { throw new Error('Method not implemented.'); }
}
exports.FixtureFetcherService = FixtureFetcherService;
//# sourceMappingURL=util.js.map