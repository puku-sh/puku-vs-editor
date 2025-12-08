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
exports.RuffDiagnosticsProvider = void 0;
const assert_1 = __importDefault(require("assert"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const salts_1 = require("../../base/salts");
const simulationContext_1 = require("../../base/simulationContext");
const python_1 = require("./python");
const utils_1 = require("./utils");
/**
 * Class which finds python rule tooling diagnostic erors
 */
class RuffDiagnosticsProvider extends utils_1.LintingDiagnosticsProvider {
    constructor() {
        super(...arguments);
        this.id = 'ruff';
        this.cacheSalt = salts_1.TestingCacheSalts.ruffCacheSalt;
        this.cacheScope = simulationContext_1.CacheScope.Ruff;
    }
    get ruffConfig() {
        // pyproject.toml
        return `
[tool.ruff]
select = ["ALL"]

[tool.ruff.lint]
preview = true

[tool.ruff.format]
preview = true
`;
    }
    async fetchCommand(temporaryDirectory, filePath) {
        const ruffConfigFile = path.join(temporaryDirectory, 'pyproject.toml');
        await fs.promises.writeFile(ruffConfigFile, this.ruffConfig, 'utf8');
        const virtualEnvironment = (0, python_1.ensurePythonVEnv)();
        if (!virtualEnvironment) {
            throw new Error('No virtual environment found');
        }
        return {
            command: virtualEnvironment.pythonInterpreter,
            arguments: ['-m', 'ruff', 'check', filePath, '--config', ruffConfigFile, '--output-format', 'json']
        };
    }
    processDiagnostics(fileName, stdoutResult) {
        (0, assert_1.default)(Array.isArray(stdoutResult));
        if (stdoutResult.length === 0) {
            return [];
        }
        const sanitizeLineOrColumn = (lineOrColumn) => typeof lineOrColumn !== 'number' || Number.isNaN(lineOrColumn) ? 0 : Math.max(0, lineOrColumn - 1);
        const diagnostics = [];
        const messages = stdoutResult;
        (0, assert_1.default)(Array.isArray(messages));
        for (const message of messages) {
            const messageText = message.message;
            (0, assert_1.default)(typeof messageText === 'string');
            diagnostics.push({
                file: fileName,
                startLine: sanitizeLineOrColumn(message.location.row),
                startCharacter: sanitizeLineOrColumn(message.location.column),
                endLine: sanitizeLineOrColumn(message.end_location.row),
                endCharacter: sanitizeLineOrColumn(message.end_location.column),
                message: messageText,
                code: message.ruleId,
                relatedInformation: undefined,
                source: 'Ruff'
            });
        }
        return diagnostics;
    }
}
exports.RuffDiagnosticsProvider = RuffDiagnosticsProvider;
//# sourceMappingURL=ruff.js.map