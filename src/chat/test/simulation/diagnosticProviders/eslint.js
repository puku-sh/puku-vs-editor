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
exports.EslintDiagnosticsProvider = void 0;
const assert_1 = __importDefault(require("assert"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const salts_1 = require("../../base/salts");
const simulationContext_1 = require("../../base/simulationContext");
const utils_1 = require("./utils");
/**
 * Class which finds eslint diagnostic erors
 */
class EslintDiagnosticsProvider extends utils_1.LintingDiagnosticsProvider {
    constructor() {
        super(...arguments);
        this.id = 'eslint';
        this.cacheSalt = salts_1.TestingCacheSalts.eslintCacheSalt;
        this.cacheScope = simulationContext_1.CacheScope.ESLint;
    }
    get eslintConfig() {
        return {
            "parser": "@typescript-eslint/parser",
            "plugins": ["@typescript-eslint"],
            "extends": [],
            "parserOptions": {
                "warnOnUnsupportedTypeScriptVersion": false,
                "sourceType": "module",
                "ecmaVersion": "latest",
                "ecmaFeatures": { "jsx": true, "experimentalObjectRestSpread": true },
            },
            "ignorePatterns": ["!+"],
            "rules": {
                "constructor-super": "error",
                "for-direction": "error",
                "getter-return": "error",
                "no-async-promise-executor": "error",
                "no-class-assign": "error",
                "no-compare-neg-zero": "error",
                "no-cond-assign": "error",
                "no-const-assign": "error",
                "no-constant-condition": "error",
                "no-control-regex": "error",
                "no-dupe-args": "error",
                "no-empty-pattern": "error",
                "no-ex-assign": "error",
                "no-invalid-regexp": "error",
                "no-new-symbol": "error",
                "no-obj-calls": "error",
                "no-prototype-builtins": "error",
                "no-self-assign": "error",
                "no-setter-return": "error",
                "no-unreachable": "error",
                "no-unreachable-loop": "error",
                "no-unsafe-finally": "error",
                "no-unsafe-negation": "error",
                "no-unsafe-optional-chaining": "error",
                "use-isnan": "error",
                "indent": "off"
            },
        };
    }
    async fetchCommand(temporaryDirectory, filePath) {
        const eslintConfigFile = path.join(temporaryDirectory, '.eslintrc.json');
        await fs.promises.writeFile(eslintConfigFile, JSON.stringify(this.eslintConfig));
        return {
            command: 'npx',
            arguments: ['eslint', '--no-eslintrc', '--config', eslintConfigFile, '--no-ignore', '-f', 'json', filePath]
        };
    }
    processDiagnostics(fileName, stdoutResult) {
        (0, assert_1.default)(Array.isArray(stdoutResult));
        if (stdoutResult.length === 0) {
            return [];
        }
        const sanitizeLineOrColumn = (lineOrColumn) => typeof lineOrColumn !== 'number' || Number.isNaN(lineOrColumn) ? 0 : Math.max(0, lineOrColumn - 1);
        const diagnostics = [];
        const messages = stdoutResult[0].messages;
        (0, assert_1.default)(Array.isArray(messages));
        for (const message of messages) {
            const messageText = message.message;
            (0, assert_1.default)(typeof messageText === 'string');
            diagnostics.push({
                file: fileName,
                startLine: sanitizeLineOrColumn(message.line),
                startCharacter: sanitizeLineOrColumn(message.column),
                endLine: sanitizeLineOrColumn(message.endLine),
                endCharacter: sanitizeLineOrColumn(message.endColumn),
                message: messageText,
                code: message.ruleId,
                relatedInformation: undefined,
                source: 'eslint'
            });
        }
        return diagnostics;
    }
}
exports.EslintDiagnosticsProvider = EslintDiagnosticsProvider;
//# sourceMappingURL=eslint.js.map