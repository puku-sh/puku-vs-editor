"use strict";
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
exports.logger = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const chalk = __importStar(require("chalk"));
const logService_1 = require("../src/platform/log/common/logService");
class SimulationLogger {
    constructor(logFn, logLevel = logService_1.LogLevel.Info, tagPrefix = '') {
        this.logFn = logFn;
        this.logLevel = logLevel;
        this.tagPrefix = tagPrefix;
    }
    setLogLevel(level) {
        this.logLevel = level;
    }
    trace(...args) {
        if (this.shouldLog(logService_1.LogLevel.Trace)) {
            this.logFn(this.formatMessage(logService_1.LogLevel.Trace, ...args));
        }
    }
    debug(...args) {
        if (this.shouldLog(logService_1.LogLevel.Debug)) {
            this.logFn(this.formatMessage(logService_1.LogLevel.Debug, ...args));
        }
    }
    info(...args) {
        if (this.shouldLog(logService_1.LogLevel.Info)) {
            this.logFn(this.formatMessage(logService_1.LogLevel.Info, ...args));
        }
    }
    warn(...args) {
        if (this.shouldLog(logService_1.LogLevel.Warning)) {
            this.logFn(this.formatMessage(logService_1.LogLevel.Warning, ...args));
        }
    }
    error(...args) {
        if (this.shouldLog(logService_1.LogLevel.Error)) {
            this.logFn(this.formatMessage(logService_1.LogLevel.Error, ...args));
        }
    }
    tag(tag) {
        return new SimulationLogger(this.logFn, this.logLevel, `${this.tagPrefix}[${tag}] `);
    }
    shouldLog(level) {
        const levels = [logService_1.LogLevel.Debug, logService_1.LogLevel.Info, logService_1.LogLevel.Warning, logService_1.LogLevel.Error];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }
    formatMessage(level, ...args) {
        const levelColors = {
            [logService_1.LogLevel.Off]: chalk.white('off'),
            [logService_1.LogLevel.Trace]: chalk.gray('trace'),
            [logService_1.LogLevel.Debug]: chalk.blue('debug'),
            [logService_1.LogLevel.Info]: chalk.green('info '),
            [logService_1.LogLevel.Warning]: chalk.yellow('yellow'),
            [logService_1.LogLevel.Error]: chalk.red('error')
        };
        return `${chalk.bold(levelColors[level])} ${this.tagPrefix}${args.join(' ')}`;
    }
}
exports.logger = new SimulationLogger((...args) => console.log(...args));
//# sourceMappingURL=simulationLogger.js.map