"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogMemory = exports.LogServiceImpl = exports.ConsoleLog = exports.LogLevel = exports.ILogService = void 0;
exports.collectErrorMessages = collectErrorMessages;
exports.collectSingleLineErrorMessage = collectSingleLineErrorMessage;
const services_1 = require("../../../util/common/services");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
exports.ILogService = (0, services_1.createServiceIdentifier)('ILogService');
/**
 * Log levels (taken from vscode.d.ts)
 */
var LogLevel;
(function (LogLevel) {
    /**
     * No messages are logged with this level.
     */
    LogLevel[LogLevel["Off"] = 0] = "Off";
    /**
     * All messages are logged with this level.
     */
    LogLevel[LogLevel["Trace"] = 1] = "Trace";
    /**
     * Messages with debug and higher log level are logged with this level.
     */
    LogLevel[LogLevel["Debug"] = 2] = "Debug";
    /**
     * Messages with info and higher log level are logged with this level.
     */
    LogLevel[LogLevel["Info"] = 3] = "Info";
    /**
     * Messages with warning and higher log level are logged with this level.
     */
    LogLevel[LogLevel["Warning"] = 4] = "Warning";
    /**
     * Only error messages are logged with this level.
     */
    LogLevel[LogLevel["Error"] = 5] = "Error";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
// Simple implementation of a log targe used for logging to the console.
class ConsoleLog {
    constructor(prefix, minLogLevel = LogLevel.Warning) {
        this.prefix = prefix;
        this.minLogLevel = minLogLevel;
    }
    logIt(level, metadataStr, ...extra) {
        if (this.prefix) {
            metadataStr = `${this.prefix}${metadataStr}`;
        }
        // Note we don't log INFO or DEBUG messages into console.
        // They are still logged in the output channel.
        if (level === LogLevel.Error) {
            console.error(metadataStr, ...extra);
        }
        else if (level === LogLevel.Warning) {
            console.warn(metadataStr, ...extra);
        }
        else if (level >= this.minLogLevel) {
            console.log(metadataStr, ...extra);
        }
    }
}
exports.ConsoleLog = ConsoleLog;
class LogServiceImpl extends lifecycle_1.Disposable {
    constructor(logTargets) {
        super();
        this.logger = new LoggerImpl(logTargets);
    }
    // Delegate logging methods directly to the internal logger
    trace(message) {
        this.logger.trace(message);
    }
    debug(message) {
        this.logger.debug(message);
    }
    info(message) {
        this.logger.info(message);
    }
    warn(message) {
        this.logger.warn(message);
    }
    error(error, message) {
        this.logger.error(error, message);
    }
    show(preserveFocus) {
        this.logger.show(preserveFocus);
    }
}
exports.LogServiceImpl = LogServiceImpl;
class LoggerImpl {
    constructor(_logTargets) {
        this._logTargets = _logTargets;
    }
    _logIt(level, message) {
        LogMemory.addLog(LogLevel[level], message);
        this._logTargets.forEach(t => t.logIt(level, message));
    }
    trace(message) {
        this._logIt(LogLevel.Trace, message);
    }
    debug(message) {
        this._logIt(LogLevel.Debug, message);
    }
    info(message) {
        this._logIt(LogLevel.Info, message);
    }
    warn(message) {
        this._logIt(LogLevel.Warning, message);
    }
    error(error, message) {
        this._logIt(LogLevel.Error, collectErrorMessages(error) + (message ? `: ${message}` : ''));
    }
    show(preserveFocus) {
        this._logTargets.forEach(t => t.show?.(preserveFocus));
    }
}
function collectErrorMessages(e) {
    // Collect error messages from nested errors as seen with Node's `fetch`.
    const seen = new Set();
    function collect(e, indent) {
        if (!e || !['object', 'string'].includes(typeof e) || seen.has(e)) {
            return '';
        }
        seen.add(e);
        const message = typeof e === 'string' ? e : (e.stack || e.message || e.code || e.toString?.() || '');
        const messageStr = message.toString?.() || '';
        return [
            messageStr ? `${messageStr.split('\n').map(line => `${indent}${line}`).join('\n')}\n` : '',
            collect(e.cause, indent + '  '),
            ...(Array.isArray(e.errors) ? e.errors.map((e) => collect(e, indent + '  ')) : []),
        ].join('');
    }
    return collect(e, '')
        .trim();
}
function collectSingleLineErrorMessage(e) {
    // Collect error messages from nested errors as seen with Node's `fetch`.
    const seen = new Set();
    function collect(e) {
        if (!e || !['object', 'string'].includes(typeof e) || seen.has(e)) {
            return '';
        }
        seen.add(e);
        const message = typeof e === 'string' ? e : (e.message || e.code || e.toString?.() || '');
        const messageStr = message.toString?.() || '';
        const messageLine = messageStr.trim().split('\n').join(' ');
        const details = [
            ...(e.cause ? [collect(e.cause)] : []),
            ...(Array.isArray(e.errors) ? e.errors.map((e) => collect(e)) : []),
        ].join(', ');
        return details ? `${messageLine}: ${details}` : messageLine;
    }
    return collect(e);
}
class LogMemory {
    static { this._logs = []; }
    static { this._requestIds = []; }
    static { this.MAX_LOGS = 50; }
    /**
     * Extracts the requestId from a log message if it matches the expected pattern.
     * Returns a string in the format 'requestId: {string}' or undefined if not found.
     */
    static extractRequestIdFromMessage(message) {
        const match = message.match(/request done: requestId: \[([0-9a-fA-F-]+)\] model deployment ID: \[/);
        if (match) {
            const requestId = match[1];
            if (!this._requestIds.includes(requestId)) {
                return requestId;
            }
        }
        return undefined;
    }
    static addLog(level, message) {
        if (this._logs.length >= this.MAX_LOGS) {
            this._logs.shift();
        }
        this._logs.push(`${level}: ${message}`);
        // Extract and store requestId if present
        if (this._requestIds.length >= this.MAX_LOGS) {
            this._requestIds.shift();
        }
        const requestId = this.extractRequestIdFromMessage(message);
        if (requestId) {
            this._requestIds.push(requestId);
        }
    }
    static getLogs() {
        return this._logs;
    }
    static getRequestIds() {
        return this._requestIds;
    }
}
exports.LogMemory = LogMemory;
//# sourceMappingURL=logService.js.map