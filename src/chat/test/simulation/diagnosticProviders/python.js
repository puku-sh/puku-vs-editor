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
exports.PylintDiagnosticsProvider = exports.PyrightDiagnosticsProvider = void 0;
exports.isValidPythonFile = isValidPythonFile;
exports.canExecutePythonCodeWithoutErrors = canExecutePythonCodeWithoutErrors;
exports.ensurePythonVEnv = ensurePythonVEnv;
const assert_1 = __importDefault(require("assert"));
const cp = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const uuid_1 = require("../../../src/util/vs/base/common/uuid");
const range_1 = require("../../../src/util/vs/workbench/api/common/extHostTypes/range");
const hash_1 = require("../../base/hash");
const salts_1 = require("../../base/salts");
const simulationContext_1 = require("../../base/simulationContext");
const cacheSalt_1 = require("../../cacheSalt");
const utils_1 = require("./utils");
/**
 * Class which finds Pyright diagnostics
 */
class PyrightDiagnosticsProvider extends utils_1.LintingDiagnosticsProvider {
    constructor() {
        super(...arguments);
        this.id = 'pyright';
        this.cacheSalt = salts_1.TestingCacheSalts.pyrightCacheSalt;
        this.cacheScope = simulationContext_1.CacheScope.Pyright;
    }
    async fetchCommand(temporaryDirectory, filePath) {
        const configPyrightFile = path_1.default.join(temporaryDirectory, 'pyrightconfig.json');
        await fs.promises.writeFile(configPyrightFile, JSON.stringify({}));
        const virtualEnvironment = ensurePythonVEnv();
        if (!virtualEnvironment) {
            // throw
            throw new Error('No virtual environment found');
        }
        return {
            command: virtualEnvironment.pythonInterpreter,
            arguments: ['-m', 'pyright', '--project', configPyrightFile, '--outputjson', filePath],
            env: virtualEnvironment.env
        };
    }
    processDiagnostics(fileName, stdoutResult) {
        const generalDiagnostics = stdoutResult.generalDiagnostics;
        (0, assert_1.default)(Array.isArray(generalDiagnostics));
        const diagnostics = [];
        for (const diagnostic of generalDiagnostics) {
            const range = diagnostic.range;
            const message = diagnostic.message;
            (0, assert_1.default)(range_1.Range.isRange(range) && typeof message === 'string');
            diagnostics.push({
                file: fileName,
                startLine: range.start.line,
                startCharacter: range.start.character,
                endLine: range.end.line,
                endCharacter: range.end.character,
                message: message,
                code: undefined,
                relatedInformation: undefined,
                source: 'pyright'
            });
        }
        return diagnostics;
    }
}
exports.PyrightDiagnosticsProvider = PyrightDiagnosticsProvider;
/**
 * Class which finds Pylint diagnostics
 */
class PylintDiagnosticsProvider extends utils_1.LintingDiagnosticsProvider {
    constructor() {
        super(...arguments);
        this.id = 'pylint';
        this.cacheSalt = salts_1.TestingCacheSalts.pylintCacheSalt;
        this.cacheScope = simulationContext_1.CacheScope.Pylint;
    }
    get pylintConfigFile() {
        const pylintConfigFile = [
            `[MESSAGES CONTROL]`,
            `disable=W0311, C0115, C0305, C0116, C0114, C0304, C0103, W0108`
        ].join(`\n`);
        return pylintConfigFile;
    }
    async fetchCommand(temporaryDirectory, filePath) {
        const configPylintFile = path_1.default.join(temporaryDirectory, '.pylintrc');
        await fs.promises.writeFile(configPylintFile, this.pylintConfigFile);
        const virtualEnvironment = ensurePythonVEnv();
        if (!virtualEnvironment) {
            throw new Error('No virtual environment found');
        }
        return {
            command: virtualEnvironment.pythonInterpreter,
            arguments: ['-m', 'pylint', '--rcfile', configPylintFile, '--output-format', 'json', filePath]
        };
    }
    processDiagnostics(fileName, stdoutResult) {
        const diagnostics = [];
        (0, assert_1.default)(Array.isArray(stdoutResult));
        if (stdoutResult.length === 0) {
            return [];
        }
        for (const stdout of stdoutResult) {
            const message = stdout.message;
            const line = stdout.line;
            const column = stdout.column;
            const endLine = stdout.endLine ?? null;
            const endColumn = stdout.endColumn ?? null;
            const code = stdout["message-id"] ?? null;
            (0, assert_1.default)(typeof message === 'string'
                && typeof line === 'number'
                && typeof column === 'number'
                && (typeof endLine === 'number' || endColumn === null)
                && (typeof endColumn === 'number' || endColumn === null));
            diagnostics.push({
                file: fileName,
                startLine: line - 1,
                startCharacter: column,
                endLine: (endLine ?? line) - 1,
                endCharacter: (endColumn ?? column),
                message: message,
                code: code,
                relatedInformation: undefined,
                source: 'pylint'
            });
        }
        return diagnostics;
    }
}
exports.PylintDiagnosticsProvider = PylintDiagnosticsProvider;
async function isValidPythonFile(accessor, text) {
    // Remove lines that start with `%xyz` as they can be cell magics in Jupyter Notebooks
    // & that doesn't work in a standalone Python file
    text = text.split(/\r?\n/g).filter(line => !line.startsWith('%')).join('\n');
    const cacheKey = (0, hash_1.computeSHA256)(`python-v2${cacheSalt_1.PYTHON_VALID_SYNTAX_CACHE_SALT}-${text}`);
    return accessor.get(simulationContext_1.ICachingResourceFetcher).invokeWithCache(simulationContext_1.CacheScope.Python, text, salts_1.TestingCacheSalts.pythonCacheSalt, cacheKey, doIsValidPythonFile);
}
async function doIsValidPythonFile(text) {
    const fileName = `python-verify_${(0, hash_1.computeSHA256)(`python-v${cacheSalt_1.PYTHON_VALID_SYNTAX_CACHE_SALT}-${text}`)}.py`;
    const dir = path_1.default.join((0, os_1.tmpdir)(), (0, uuid_1.generateUuid)());
    const tmpFile = path_1.default.join(dir, fileName);
    await (0, util_1.promisify)(fs.mkdir)(dir, { recursive: true });
    await (0, util_1.promisify)(fs.writeFile)(tmpFile, text);
    return new Promise((resolve) => {
        cp.exec(`python3 -m py_compile "${tmpFile}"`, (error, stdout, stderr) => {
            if (error) {
                return resolve(false);
            }
            else if (stderr && stderr.length > 0) {
                return resolve(false);
            }
            resolve(true);
        });
    }).finally(() => {
        fs.rm(dir, { recursive: true, force: true }, () => { });
    });
}
async function canExecutePythonCodeWithoutErrors(accessor, text) {
    // Remove lines that start with `%xyz` as they can be cell magics in Jupyter Notebooks
    // & that doesn't work in a standalone Python file
    text = text.split(/\r?\n/g).filter(line => !line.startsWith('%')).join('\n');
    const cacheKey = (0, hash_1.computeSHA256)(`python-verify-execution_${cacheSalt_1.PYTHON_EXECUTES_WITHOUT_ERRORS}-${text}`);
    return accessor.get(simulationContext_1.ICachingResourceFetcher).invokeWithCache(simulationContext_1.CacheScope.Python, text, salts_1.TestingCacheSalts.pythonCacheSalt, cacheKey, canExecutePythonCodeWithoutErrorsImpl);
}
async function canExecutePythonCodeWithoutErrorsImpl(text) {
    const fileName = `python-verify-execution_${(0, hash_1.computeSHA256)(`python-v${cacheSalt_1.PYTHON_EXECUTES_WITHOUT_ERRORS}-${text}`)}.py`;
    const dir = path_1.default.join((0, os_1.tmpdir)(), (0, uuid_1.generateUuid)());
    const tmpFile = path_1.default.join(dir, fileName);
    await (0, util_1.promisify)(fs.mkdir)(dir, { recursive: true });
    await (0, util_1.promisify)(fs.writeFile)(tmpFile, text);
    return new Promise((resolve) => {
        cp.exec(`python3 "${tmpFile}"`, (error, stdout, stderr) => {
            if (error) {
                return resolve(false);
            }
            else if (stderr && stderr.length > 0) {
                return resolve(false);
            }
            resolve(true);
        });
    }).finally(() => {
        fs.rm(dir, { recursive: true, force: true }, () => { });
    });
}
function ensurePythonVEnv() {
    const repoRoot = path_1.default.join(__dirname, '../');
    const isWindows = process.platform === 'win32';
    const envBinFolder = path_1.default.join(repoRoot, '.venv', isWindows ? 'Scripts' : 'bin');
    const p = path_1.default.join(envBinFolder, isWindows ? 'python.exe' : 'python');
    for (let i = 0; i < 2; i++) {
        try {
            (0, assert_1.default)(fs.existsSync(p));
            const envs = Object.assign({}, process.env);
            envs.PATH = `${envBinFolder}${path_1.default.delimiter}${envs.PATH}`;
            envs.Path = `${envBinFolder}${path_1.default.delimiter}${envs.Path}`;
            return {
                pythonInterpreter: p,
                env: envs
            };
        }
        catch (err) {
            if (!err.stack.includes('AssertionError')) {
                throw err;
            }
            cp.execSync(`npm run create_venv`, { stdio: 'inherit' });
        }
    }
    throw new Error('Python virtual environment not found, create it manually with `npm run create_venv`');
}
//# sourceMappingURL=python.js.map