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
exports.TSServerDiagnosticsProvider = void 0;
exports.compileTSWorkspace = compileTSWorkspace;
exports.doRunNpmInstall = doRunNpmInstall;
const cp = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const salts_1 = require("../../base/salts");
const simulationContext_1 = require("../../base/simulationContext");
const stest_1 = require("../../base/stest");
const cacheSalt_1 = require("../../cacheSalt");
const stestUtil_1 = require("../stestUtil");
const utils_1 = require("./utils");
/**
 * Class which finds TS Server diagnostics after compilation of TS files
 */
class TSServerDiagnosticsProvider extends utils_1.CachingDiagnosticsProvider {
    constructor(options = {}) {
        super();
        this.cacheSalt = salts_1.TestingCacheSalts.tscCacheSalt;
        this.cacheScope = simulationContext_1.CacheScope.TSC;
        this.ignoreImportErrors = options.ignoreImportErrors ?? false;
        this.id = this.ignoreImportErrors ? 'tsc-ignore-import-errors' : 'tsc';
    }
    get cacheVersion() { return cacheSalt_1.TS_SERVER_DIAGNOSTICS_PROVIDER_CACHE_SALT; }
    async computeDiagnostics(files) {
        if (this.ignoreImportErrors) {
            const identifiers = new Set();
            for (const file of files) {
                addIdentifiersToSet(file.fileContents, identifiers);
            }
            const filteredIdentifiers = [...withoutKeywords(identifiers)];
            files.push({
                fileName: 'modules-mock.d.ts',
                fileContents: `
declare module '*'  {
	${filteredIdentifiers.map(i => `export const ${i}: any; export type ${i} = any;`).join('\n\t')}
}
`
            });
        }
        const workspacePath = await (0, stestUtil_1.createTempDir)();
        const filesWithPaths = await (0, utils_1.setupTemporaryWorkspace)(workspacePath, files);
        const packagejson = filesWithPaths.find(file => path.basename(file.fileName) === 'package.json');
        if (packagejson) {
            try {
                await doRunNpmInstall(path.dirname(packagejson.filePath));
            }
            catch (err) {
                return files.map(file => ({
                    file: file.fileName,
                    startLine: 0,
                    startCharacter: 0,
                    endLine: 0,
                    endCharacter: 0,
                    code: 'npm-install-failed',
                    message: `npm install failed: ${err.message}`,
                    source: 'ts',
                    relatedInformation: undefined
                }));
            }
        }
        const hasTSConfigFile = filesWithPaths.some(file => path.basename(file.fileName) === 'tsconfig.json');
        if (!hasTSConfigFile) {
            const tsconfigPath = path.join(workspacePath, 'tsconfig.json');
            let tsConfig;
            if (this.ignoreImportErrors) {
                tsConfig = {
                    "compilerOptions": {
                        "target": "es2021",
                        "strict": true,
                        "module": "commonjs",
                        "outDir": "out",
                        "sourceMap": false,
                        "useDefineForClassFields": false,
                        "experimentalDecorators": true,
                    },
                    "exclude": [
                        "node_modules",
                        "outcome",
                        "scenarios"
                    ]
                };
            }
            else {
                tsConfig = {
                    "compilerOptions": {
                        "target": "es2021",
                        "strict": true,
                        "module": "commonjs",
                        "outDir": "out",
                        "sourceMap": true
                    },
                    "exclude": [
                        "node_modules",
                        "outcome",
                        "scenarios"
                    ]
                };
            }
            await fs.promises.writeFile(tsconfigPath, JSON.stringify(tsConfig));
        }
        try {
            let diagnostics = await this.compileFolder(workspacePath, filesWithPaths);
            if (this.ignoreImportErrors) {
                const errorCodeThisMemberCannotHaveAnOverride = 4113; // "This member cannot have an 'override' modifier because it is not declared in the base class 'any'."
                const errorCodeParameterOptionsImplicitlyHasAnAnyType = 7006; // "Parameter 'options' implicitly has an 'any' type."
                diagnostics = diagnostics.filter(d => d.code !== errorCodeThisMemberCannotHaveAnOverride && d.code !== errorCodeParameterOptionsImplicitlyHasAnAnyType);
            }
            return diagnostics;
        }
        finally {
            (0, stestUtil_1.cleanTempDirWithRetry)(workspacePath);
        }
    }
    compileFolder(workspacePath, files) {
        return new Promise((resolve, reject) => {
            const results = [];
            const tsserverPath = path.resolve(path.join(stest_1.REPO_ROOT, 'node_modules/typescript/lib/tsserver.js'));
            const tsserver = cp.fork(tsserverPath, {
                cwd: workspacePath,
                stdio: ['pipe', 'pipe', 'pipe', 'ipc']
            });
            tsserver.stdin?.setDefaultEncoding('utf8');
            tsserver.stdout?.setEncoding('utf8');
            let seq = 1;
            const seqToFile = new Map();
            const writeRequest = (data) => {
                data.seq = seq++;
                const actual = `${JSON.stringify(data)}\r\n`;
                tsserver.stdin.write(actual);
            };
            for (const file of files) {
                writeRequest({
                    "type": "request",
                    "command": "open",
                    "arguments": { "file": file.filePath }
                });
            }
            for (const file of files) {
                seqToFile.set(seq, file.fileName);
                writeRequest({
                    "type": "request",
                    "command": "syntacticDiagnosticsSync",
                    "arguments": { "file": file.filePath }
                });
            }
            for (const file of files) {
                seqToFile.set(seq, file.fileName);
                writeRequest({
                    "type": "request",
                    "command": "semanticDiagnosticsSync",
                    "arguments": { "file": file.filePath }
                });
            }
            tsserver.on('error', reject);
            const handleMessage = (msg) => {
                if (msg.type !== 'response') {
                    return;
                }
                const resp = msg;
                if (resp.command !== 'semanticDiagnosticsSync' && resp.command !== 'syntacticDiagnosticsSync') {
                    return;
                }
                const kind = resp.command === 'semanticDiagnosticsSync' ? 'semantic' : 'syntactic';
                const diagResp = resp;
                for (const diag of diagResp.body ?? []) {
                    if (typeof diag.start === 'number') {
                        throw new Error(`TODO: Can't handle DiagnosticWithLinePosition right now`);
                    }
                    const regularDiag = diag;
                    const _relatedInfo = (regularDiag.relatedInformation ?? []).map((ri) => {
                        if (!ri.span) {
                            return null;
                        }
                        return {
                            location: {
                                file: ri.span.file.substring(workspacePath.length + 1),
                                startLine: ri.span?.start.line - 1,
                                startCharacter: ri.span?.start.offset - 1,
                                endLine: ri.span?.end.line - 1,
                                endCharacter: ri.span?.end.offset - 1,
                            },
                            message: ri.message,
                            code: ri.code
                        };
                    });
                    const relatedInformation = _relatedInfo.filter((x) => !!x);
                    results.push({
                        file: seqToFile.get(diagResp.request_seq),
                        startLine: regularDiag.start.line - 1,
                        startCharacter: regularDiag.start.offset - 1,
                        endLine: regularDiag.end.line - 1,
                        endCharacter: regularDiag.end.offset - 1,
                        message: regularDiag.text,
                        code: regularDiag.code,
                        relatedInformation,
                        source: 'ts',
                        kind,
                    });
                }
                if (diagResp.request_seq === seq - 1) {
                    writeRequest({
                        "type": "request",
                        "command": "exit",
                    });
                    tsserver.on('exit', () => {
                        resolve(results);
                    });
                    tsserver.kill();
                }
            };
            let stdout = '';
            const processStdoutData = () => {
                do {
                    const eolIndex = stdout.indexOf('\r\n') ?? stdout.indexOf('\n');
                    if (eolIndex === -1) {
                        break;
                    }
                    const firstLine = stdout.substring(0, eolIndex);
                    let body;
                    if (firstLine.includes('Content-Length')) {
                        const contentLength = parseInt(firstLine.substring('Content-Length: '.length), 10);
                        body = stdout.substring(eolIndex + 4, eolIndex + 4 + contentLength);
                        if (body.length < contentLength) {
                            // entire body did not arrive yet
                            break;
                        }
                        stdout = stdout.substring(eolIndex + 4 + contentLength);
                    }
                    else {
                        // Might come after the body
                        body = firstLine;
                        // Hold on to the rest of the stdout for the next iteration
                        stdout = stdout.substring(eolIndex + 2);
                    }
                    try {
                        handleMessage(JSON.parse(body));
                    }
                    catch (ex) {
                        console.error(ex);
                    }
                } while (true);
            };
            tsserver.stdout.on('data', (chunk) => {
                stdout += chunk;
                processStdoutData();
            });
        });
    }
}
exports.TSServerDiagnosticsProvider = TSServerDiagnosticsProvider;
function addIdentifiersToSet(content, result) {
    const regex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        result.add(match[0]);
    }
}
function withoutKeywords(identifiers) {
    const keywords = ['class', 'interface', 'function', 'const', 'let', 'var', 'import', 'export', 'from', 'default', 'extends', 'implements', 'new', 'return', 'if', 'else', 'for',
        'while', 'do', 'switch', 'case', 'break', 'continue', 'throw', 'try', 'catch', 'finally', 'finally', 'await', 'async', 'await', 'void', 'any', 'number',
        'string', 'boolean', 'object', 'null', 'undefined', 'true', 'false', 'this', 'super', 'typeof', 'instanceof', 'in', 'as', 'is', 'delete', 'typeof',
        'instanceof', 'in', 'as', 'is', 'delete', 'void', 'never', 'unknown', 'declare', 'namespace', 'module', 'type', 'enum', 'readonly', 'abstract', 'private',
        'protected', 'public', 'static', 'readonly', 'abstract', 'private', 'protected', 'public', 'static', 'get', 'set', 'constructor', 'require', 'module', 'exports',
        'global', 'window', 'document', 'console', 'process', 'require', 'module', 'exports', 'global', 'window', 'document', 'console', 'process', 'with'];
    const keywordsSet = new Set(keywords);
    const filteredIdentifiers = new Set();
    for (const identifier of identifiers) {
        if (!keywordsSet.has(identifier)) {
            filteredIdentifiers.add(identifier);
        }
    }
    return filteredIdentifiers;
}
/**
 * Runs `npm install` and proceeds to compile the files in the passed in folder. This is cached and is safe to use in tests.
 */
async function compileTSWorkspace(accessor, folderPath) {
    const files = await readTSFiles(folderPath);
    return await new TSServerDiagnosticsProvider().getDiagnostics(accessor, files);
}
function doRunNpmInstall(projectRoot) {
    return new Promise((resolve, reject) => {
        cp.exec('npm install', { cwd: projectRoot }, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }
            return resolve();
        });
    });
}
async function readTSFiles(folderPath) {
    const allFiles = [];
    await rreaddir(folderPath, allFiles);
    return await Promise.all(allFiles.filter(file => ['.ts', '.tsx', '.json'].includes(path.extname(file))).map(async (filePath) => {
        const relativeFilePath = path.relative(folderPath, filePath);
        const fileContents = await fs.promises.readFile(filePath, 'utf8');
        return {
            fileName: relativeFilePath,
            fileContents
        };
    }));
}
async function rreaddir(folderPath, result) {
    const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        if (entry.isDirectory()) {
            await rreaddir(fullPath, result);
        }
        else {
            result.push(fullPath);
        }
    }
}
//# sourceMappingURL=tsc.js.map