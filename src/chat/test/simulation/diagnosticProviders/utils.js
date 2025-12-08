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
exports.LintingDiagnosticsProvider = exports.CachingDiagnosticsProvider = void 0;
exports.setupTemporaryWorkspace = setupTemporaryWorkspace;
exports.convertTestToVSCodeDiagnostics = convertTestToVSCodeDiagnostics;
exports.findIfInstalled = findIfInstalled;
const cp = __importStar(require("child_process"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const map_1 = require("../../../src/util/vs/base/common/map");
const vscodeTypes_1 = require("../../../src/vscodeTypes");
const hash_1 = require("../../base/hash");
const simulationContext_1 = require("../../base/simulationContext");
const cacheSalt_1 = require("../../cacheSalt");
const stestUtil_1 = require("../stestUtil");
const diagnosticsProvider_1 = require("./diagnosticsProvider");
/**
 * Abstract class which finds diagnostics for a set of files and stores them in a cache path
 */
class CachingDiagnosticsProvider extends diagnosticsProvider_1.DiagnosticsProvider {
    constructor() {
        super(...arguments);
        this.id = this.constructor.name;
    }
    get cacheVersion() { return cacheSalt_1.CACHING_DIAGNOSTICS_PROVIDER_CACHE_SALT; }
    async getDiagnostics(accessor, files) {
        // Always use / as separators in file names to avoid cache misses on Windows
        files = files.map(f => ({ ...f, fileName: f.fileName.replace(/\\/g, '/') }));
        // Keep files stable and maximize cache hits by sorting them by file name
        files.sort((a, b) => a.fileName.localeCompare(b.fileName));
        const cacheKey = (0, hash_1.computeSHA256)(`${this.id}-v${this.cacheVersion}-${JSON.stringify(files)}`);
        return await accessor.get(simulationContext_1.ICachingResourceFetcher).invokeWithCache(this.cacheScope, files, this.cacheSalt, cacheKey, this.computeDiagnostics.bind(this));
    }
}
exports.CachingDiagnosticsProvider = CachingDiagnosticsProvider;
/**
 * Abstract class for defining diagnostics provider which provide linting errors
 */
class LintingDiagnosticsProvider extends CachingDiagnosticsProvider {
    async computeDiagnostics(_files) {
        const temporaryDirectory = await (0, stestUtil_1.createTempDir)();
        const diagnostics = [];
        const files = await setupTemporaryWorkspace(temporaryDirectory, _files);
        for (const file of files) {
            const command = await this.fetchCommand(temporaryDirectory, file.filePath);
            const spawnResult = (0, child_process_1.spawnSync)(command.command, command.arguments, { shell: true, encoding: 'utf-8', env: command.env });
            const processedDiagnostics = this.processDiagnostics(file.fileName, JSON.parse(spawnResult.stdout || '{}'));
            diagnostics.push(...processedDiagnostics);
        }
        await (0, stestUtil_1.cleanTempDirWithRetry)(temporaryDirectory);
        return diagnostics;
    }
}
exports.LintingDiagnosticsProvider = LintingDiagnosticsProvider;
async function setupTemporaryWorkspace(workspacePath, _files) {
    const files = _files.map((file) => {
        return {
            filePath: path.join(workspacePath, file.fileName),
            fileName: file.fileName,
            fileContents: file.fileContents
        };
    });
    await fs.promises.rm(workspacePath, { recursive: true, force: true });
    await fs.promises.mkdir(workspacePath, { recursive: true });
    for (const file of files) {
        await fs.promises.mkdir(path.dirname(file.filePath), { recursive: true });
        await fs.promises.writeFile(file.filePath, file.fileContents);
    }
    return files;
}
function convertTestToVSCodeDiagnostics(diagnostics, pathToUri) {
    const result = new map_1.ResourceMap();
    for (const d of diagnostics) {
        const diagnostic = new vscodeTypes_1.Diagnostic(new vscodeTypes_1.Range(d.startLine, d.startCharacter, d.endLine, d.endCharacter), d.message);
        diagnostic.code = d.code;
        diagnostic.source = d.source;
        diagnostic.relatedInformation = d.relatedInformation?.map(r => {
            const range = new vscodeTypes_1.Range(r.location.startLine, r.location.startCharacter, r.location.endLine, r.location.endCharacter);
            const relatedLocation = new vscodeTypes_1.Location(pathToUri(r.location.file), range);
            return new vscodeTypes_1.DiagnosticRelatedInformation(relatedLocation, r.message);
        });
        const uri = pathToUri(d.file);
        if (!result.has(uri)) {
            result.set(uri, []);
        }
        result.get(uri).push(diagnostic);
    }
    return result;
}
function findIfInstalled(verificationCommand, verificationRegex) {
    const spawnResult = cp.spawnSync(verificationCommand.command, verificationCommand.arguments, { shell: true, encoding: 'utf-8' });
    const regexMatch = spawnResult.stdout.match(verificationRegex);
    if (!regexMatch || regexMatch.length === 0) {
        return false;
    }
    return true;
}
//# sourceMappingURL=utils.js.map