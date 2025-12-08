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
exports.LogContextRecorder = void 0;
const fs = __importStar(require("fs/promises"));
const promises_1 = require("fs/promises");
const async_1 = require("../../../../util/common/async");
const async_2 = require("../../../../util/vs/base/common/async");
const errors_1 = require("../../../../util/vs/base/common/errors");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const path = __importStar(require("../../../../util/vs/base/common/path"));
const safeFileWriteUtils_1 = require("../../../workspaceRecorder/vscode-node/safeFileWriteUtils");
class LogContextRecorder extends lifecycle_1.Disposable {
    static { this.fileSuffix = '.logContext.jsonl'; }
    constructor(recordingDirPath, _inlineEditLogger) {
        super();
        this.recordingDirPath = recordingDirPath;
        this._inlineEditLogger = _inlineEditLogger;
        this._queue = new async_1.TaskQueue();
        this._shownSuggestions = this._register(new lifecycle_1.DisposableMap());
        this.logFilePath = path.join(this.recordingDirPath, `current${LogContextRecorder.fileSuffix}`);
        this._impl = LogContextRecorderImpl.create(this.recordingDirPath, this.logFilePath);
        this._impl.then(impl => {
            if (this._store.isDisposed) {
                impl.dispose();
            }
            else {
                this._register(impl);
            }
        });
    }
    static async cleanupOldRecordings(recordingDirPath) {
        const dirContents = await fs.readdir(recordingDirPath).catch(() => []);
        return Promise.all(dirContents.filter(file => file.endsWith(LogContextRecorder.fileSuffix)).map(file => {
            const filePath = path.join(recordingDirPath, file);
            return fs.unlink(filePath).catch(() => { });
        }));
    }
    handleShown(nextEditResult) {
        const requestId = nextEditResult.requestId;
        // If the user doesn't interact with the suggestion for 10s,
        //  we'll consider it ignored
        const timer = setTimeout(() => {
            const req = this._inlineEditLogger.getRequestById(requestId);
            if (req) {
                this.writeLog(req);
            }
            this._shownSuggestions.deleteAndDispose(requestId);
        }, 10000);
        this._shownSuggestions.set(requestId, { timeout: timer, dispose: () => clearTimeout(timer) });
    }
    handleAcceptance(nextEditResult) {
        const requestId = nextEditResult.requestId;
        this._shownSuggestions.deleteAndDispose(requestId);
        const req = this._inlineEditLogger.getRequestById(requestId);
        if (req) {
            req.setAccepted(true);
            this.writeLog(req);
        }
    }
    handleRejection(nextEditResult) {
        const requestId = nextEditResult.requestId;
        this._shownSuggestions.deleteAndDispose(requestId);
        const req = this._inlineEditLogger.getRequestById(requestId);
        if (req) {
            req.setAccepted(false);
            this.writeLog(req);
        }
    }
    writeLog(req) {
        this._queue.schedule(async () => {
            const impl = await this._impl;
            await req.allPromisesResolved();
            impl.appendEntry(req);
        });
    }
}
exports.LogContextRecorder = LogContextRecorder;
class LogContextRecorderImpl extends lifecycle_1.Disposable {
    static async create(recordingDirPath, logFilePath) {
        await (0, promises_1.mkdir)(recordingDirPath, { recursive: true });
        const currentVersion = 1;
        const state = await safeFileWriteUtils_1.FlushableJSONFile.loadOrCreate(path.join(recordingDirPath, 'state.json'), {
            version: currentVersion,
            logCount: 0,
        });
        let shouldStartNewLog = false;
        if (!('version' in state.value) || state.value.version !== currentVersion) {
            shouldStartNewLog = true;
            state.setValue({
                version: currentVersion,
                logCount: 0,
            });
            await state.flushAsync();
        }
        if (!('version' in state.value)) {
            throw new errors_1.BugIndicatingError();
        }
        const logFileSize = await (0, safeFileWriteUtils_1.getFileSize)(logFilePath);
        let logFileExists = logFileSize !== undefined;
        const MB = 1024 * 1024;
        const maxLogFileSize = 20 * MB;
        if (logFileSize !== undefined && logFileSize > maxLogFileSize) {
            shouldStartNewLog = true;
        }
        if (logFileExists && shouldStartNewLog) {
            // log rotation
            const date = new Date();
            function formatDateFileNameSafe(date) {
                return date.toISOString().replace(/:/g, '-');
            }
            await (0, promises_1.rename)(logFilePath, path.join(recordingDirPath, `${state.value.logCount}.${formatDateFileNameSafe(date)}${LogContextRecorder.fileSuffix}`));
            // Reset state after truncating the log
            state.setValue({
                version: currentVersion,
                logCount: state.value.logCount + 1,
            });
            await state.flushAsync();
            logFileExists = false;
        }
        const log = new safeFileWriteUtils_1.FlushableSafeJSONLFile(logFilePath);
        return new LogContextRecorderImpl(state, log);
    }
    constructor(_state, _log) {
        super();
        this._state = _state;
        this._log = _log;
        this._writeQueue = new async_1.TaskQueue();
        this._loggedRequests = new Set();
        this._loggedQueue = [];
        this._logBufferSize = 20;
        this._register((0, lifecycle_1.toDisposable)(() => {
            this._forceFlush();
        }));
    }
    _scheduleFlush() {
        this._writeQueue.clearPending();
        this._writeQueue.schedule(async () => {
            await (0, async_2.timeout)(10 * 1000);
            const state = this._state;
            await state.flushAsync();
            await this._log.flushAsync();
        });
    }
    _forceFlush() {
        this._writeQueue.clearPending();
        this._state.flushSync();
        this._log.flushSync();
    }
    // Decide if a request should be logged
    shouldLog(entry) {
        if (this._loggedRequests.has(entry.requestId)) {
            return false;
        }
        // We keep a buffer of requests to ensure the set
        // doesn't keep increasing throughout a session.
        if (this._loggedRequests.size >= this._logBufferSize) {
            const oldest = this._loggedQueue.shift();
            if (oldest !== undefined) {
                this._loggedRequests.delete(oldest);
            }
        }
        return true;
    }
    // Updated appendEntry using the helper method
    appendEntry(entry) {
        if (!this.shouldLog(entry)) {
            return;
        }
        this._loggedRequests.add(entry.requestId);
        this._loggedQueue.push(entry.requestId);
        this._log.appendEntry(entry.toJSON());
        this._scheduleFlush();
    }
}
//# sourceMappingURL=logContextRecorder.js.map