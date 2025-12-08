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
exports.CppDiagnosticsProvider = void 0;
const cp = __importStar(require("child_process"));
const salts_1 = require("../../base/salts");
const simulationContext_1 = require("../../base/simulationContext");
const cacheSalt_1 = require("../../cacheSalt");
const stestUtil_1 = require("../stestUtil");
const utils_1 = require("./utils");
/**
 * Class which finds clang diagnostics after compilation of C++ files
 */
class CppDiagnosticsProvider extends utils_1.CachingDiagnosticsProvider {
    constructor() {
        super(...arguments);
        this.id = 'cpp';
        this.cacheSalt = salts_1.TestingCacheSalts.cppCacheSalt;
        this.cacheScope = simulationContext_1.CacheScope.CPP;
        this.sources = [];
    }
    get cacheVersion() {
        return cacheSalt_1.CLANG_DIAGNOSTICS_PROVIDER_CACHE_SALT;
    }
    isInstalled() {
        if (this._isInstalled === undefined) {
            if ((0, utils_1.findIfInstalled)({ command: 'clang', arguments: ['-v'] }, /\d+\.\d+\.\d+/)) {
                this._isInstalled = 'local';
            }
            else if ((0, utils_1.findIfInstalled)({ command: 'docker', arguments: ['--version'] }, /\d+\.\d+\.\d+/)) {
                this._isInstalled = 'docker';
            }
            else {
                this._isInstalled = false;
            }
        }
        return this._isInstalled !== false;
    }
    async computeDiagnostics(_files) {
        const temporaryDirectory = await this.setupWorkspace(_files);
        const diagnostics = await this.processDiagnostics(temporaryDirectory, _files);
        //await cleanTempDir(temporaryDirectory);
        return diagnostics;
    }
    async setupWorkspace(_files) {
        const temporaryDirectory = await (0, stestUtil_1.createTempDir)();
        await (0, utils_1.setupTemporaryWorkspace)(temporaryDirectory, _files);
        return temporaryDirectory;
    }
    async processDiagnostics(temporaryDirectory, _files) {
        // Validate that the diagnostics provider is installed
        if (!this.isInstalled()) {
            throw new Error('clang or docker must be available in this environment for c++ diagnostics.');
        }
        const diagnostics = [];
        const basename = 'workspaceFolder_' + new Date().getTime();
        for (const file of _files) {
            let spawnResult;
            if (this._isInstalled === 'docker') {
                const args = ['run', '--rm', '-v', `${temporaryDirectory}:/${basename}`, 'mcr.microsoft.com/devcontainers/cpp:latest', 'clang++', `/${basename}/${file.fileName}`];
                //console.log('docker ' + args.map(arg => `'${arg}'`).join(' '));
                spawnResult = cp.spawnSync('docker', args, { shell: true, encoding: 'utf-8' });
            }
            else {
                spawnResult = cp.spawnSync('clang++', [`${temporaryDirectory}/${file.fileName}`]);
            }
            // If compilation was successful, no diagnostics are needed.
            if (spawnResult.status === 0) {
                return [];
            }
            // Need to capture the output of clang and convert it into diagnostics
            // Grab the diagnostic info from the error and turn it into a diagnostic object.
            // Example error:
            // /workspaceFolder/main.cpp:5:10: error: expected ';' after return statement
            // /workspaceFolder/LyraHealthComponent.cpp:3:10: fatal error: 'LyraHealthComponent.h' file not found
            // Format:
            // /${filePath}:${line}:${col}: ${code}: ${message}
            const regexp = new RegExp(`^\/${basename}\/([A-Za-z_\\-\\s0-9\\.]+):(\\d+):(\\d+): ([^:]+): (.*)`);
            let hasErrors = false;
            const lines = spawnResult.stderr.toString().split('\n');
            for (const line of lines) {
                const m = line.match(regexp);
                if (m) {
                    const [, filePath, line, col, code, message] = m;
                    // TODO: Add support for related information
                    diagnostics.push({
                        file: filePath,
                        startLine: +line - 1,
                        startCharacter: +col - 1,
                        endLine: +line - 1,
                        endCharacter: +col - 1,
                        message: message,
                        code: code,
                        relatedInformation: undefined,
                        source: this.id
                    });
                    hasErrors = true;
                }
            }
            if (!hasErrors || spawnResult.error) {
                throw new Error(`Error while running 'clang' \n\nstderr : ` + spawnResult.stderr + '\n\nerr : ' + spawnResult.error);
            }
        }
        return diagnostics;
    }
}
exports.CppDiagnosticsProvider = CppDiagnosticsProvider;
//# sourceMappingURL=cpp.js.map