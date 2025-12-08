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
exports.WorkspaceRecorderImpl = exports.WorkspaceRecorder = void 0;
const promises_1 = require("fs/promises");
const vscode_1 = require("vscode");
const workspaceLog_1 = require("../../../platform/workspaceRecorder/common/workspaceLog");
const async_1 = require("../../../util/common/async");
const async_2 = require("../../../util/vs/base/common/async");
const errors_1 = require("../../../util/vs/base/common/errors");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const path = __importStar(require("../../../util/vs/base/common/path"));
const uuid_1 = require("../../../util/vs/base/common/uuid");
const safeFileWriteUtils_1 = require("./safeFileWriteUtils");
const utils_1 = require("./utils");
class WorkspaceRecorder extends lifecycle_1.Disposable {
    constructor(repoRootUri, recordingDirPath, _context) {
        super();
        this.repoRootUri = repoRootUri;
        this.recordingDirPath = recordingDirPath;
        this._context = _context;
        this._queue = new async_1.TaskQueue();
        this.logFilePath = path.join(this.recordingDirPath, `current.workspaceRecording.jsonl`);
        this._impl = WorkspaceRecorderImpl.create(this.repoRootUri, this.recordingDirPath, this.logFilePath, this._context);
    }
    handleOnDidOpenTextDocument(documentUri, initialText, newModelVersion) {
        this._schedule(() => this._impl.then(v => v.handleOnDidOpenTextDocument(this._getTime(), documentUri, initialText, newModelVersion)));
    }
    handleOnDidCloseTextDocument(documentUri) {
        this._schedule(() => this._impl.then(v => v.handleOnDidCloseTextDocument(this._getTime(), documentUri)));
    }
    handleOnDidShowTextDocument(documentUri) {
        this._schedule(() => this._impl.then(v => v.handleOnDidShowTextDocument(this._getTime(), documentUri)));
    }
    handleOnDidHideTextDocument(documentUri) {
        this._schedule(() => this._impl.then(v => v.handleOnDidHideTextDocument(this._getTime(), documentUri)));
    }
    handleOnDidChangeTextDocument(documentUri, edit, newModelVersion, metadata) {
        if (edit.isEmpty()) {
            return;
        }
        this._schedule(() => this._impl.then(v => v.handleOnDidChangeTextDocument(this._getTime(), documentUri, edit, newModelVersion, metadata)));
    }
    handleOnDidFocusedDocumentChange(documentUri) {
        this._schedule(() => this._impl.then(v => v.handleOnDidFocusedDocumentChange(this._getTime(), documentUri)));
    }
    handleOnDidSelectionChange(documentUri, selection) {
        this._schedule(() => this._impl.then(v => v.handleOnDidSelectionChange(this._getTime(), documentUri, selection)));
    }
    handleEvent(time, data) {
        this._schedule(() => this._impl.then(v => v.handleEvent(time, data)));
    }
    handleDocumentEvent(documentUri, time, data) {
        this._schedule(() => this._impl.then(v => v.handleDocumentEvent(time, documentUri, data)));
    }
    addBookmark() {
        this._schedule(() => this._impl.then(v => v.addBookmark(this._getTime())));
    }
    _schedule(task) {
        this._queue.schedule(task);
    }
    _getTime() {
        return Date.now();
    }
}
exports.WorkspaceRecorder = WorkspaceRecorder;
class WorkspaceRecorderImpl extends lifecycle_1.Disposable {
    static async create(repoRootUri, recordingDirPath, logFilePath, context) {
        await (0, promises_1.mkdir)(recordingDirPath, { recursive: true });
        const currentVersion = 4;
        const state = await safeFileWriteUtils_1.FlushableJSONFile.loadOrCreate(path.join(recordingDirPath, 'state.json'), {
            version: currentVersion,
            logCount: 0,
            documents: {}
        });
        let shouldStartNewLog = false;
        if (!('version' in state.value) || state.value.version !== currentVersion) {
            shouldStartNewLog = true;
            state.setValue({
                version: currentVersion,
                logCount: 0,
                documents: {}
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
            await (0, promises_1.rename)(logFilePath, path.join(recordingDirPath, `${state.value.logCount}.${formatDateFileNameSafe(date)}.workspaceRecording.jsonl`));
            // Reset state after truncating the log
            state.setValue({
                version: currentVersion,
                logCount: state.value.logCount + 1,
                documents: {},
            });
            await state.flushAsync();
            logFileExists = false;
        }
        const log = new safeFileWriteUtils_1.FlushableSafeJSONLFile(logFilePath);
        return new WorkspaceRecorderImpl(repoRootUri, state, log, context, logFileExists, currentVersion);
    }
    constructor(repoRootUri, _state, _log, _context, _logFileExists, _revision) {
        super();
        this.repoRootUri = repoRootUri;
        this._state = _state;
        this._log = _log;
        this._context = _context;
        this._logFileExists = _logFileExists;
        this._revision = _revision;
        this._documentInitialTexts = new Map();
        this._writeQueue = new async_1.TaskQueue();
        this._register((0, lifecycle_1.toDisposable)(() => {
            this._forceFlush();
        }));
        if (!this._logFileExists) {
            this._appendEntry({
                documentType: 'workspaceRecording@1.0',
                kind: 'header',
                repoRootUri: this.repoRootUri,
                time: Date.now(),
                uuid: (0, uuid_1.generateUuid)(),
                revision: this._revision,
            });
        }
        this._appendEntry({
            kind: 'applicationStart',
            time: Date.now(),
            commitHash: vscode_1.env.appCommit
        });
    }
    async handleOnDidOpenTextDocument(time, documentUri, initialText, initialModelVersion) {
        const relativeUri = this._getRelativePath(documentUri);
        if (this._documentInitialTexts.has(relativeUri)) {
            throw new errors_1.BugIndicatingError('should not happen');
        }
        this._documentInitialTexts.set(relativeUri, { value: initialText, time, initialModelVersion });
    }
    async handleOnDidCloseTextDocument(time, documentUri) {
        this._documentInitialTexts.delete(this._getRelativePath(documentUri));
    }
    async handleOnDidShowTextDocument(time, documentUri) {
        const id = await this._getId(documentUri);
        if (id === undefined) {
            return;
        }
        this._appendEntry({ kind: 'opened', id, time });
    }
    async handleOnDidHideTextDocument(time, documentUri) {
        const id = await this._getId(documentUri);
        if (id === undefined) {
            return;
        }
        this._appendEntry({ kind: 'closed', id, time });
    }
    async handleOnDidChangeTextDocument(time, documentUri, edit, newModelVersion, metadata) {
        const id = await this._getId(documentUri);
        if (id === undefined) {
            return;
        }
        this._appendEntry({ kind: 'changed', id, time, edit: (0, workspaceLog_1.serializeEdit)(edit), v: newModelVersion, metadata });
    }
    async handleOnDidFocusedDocumentChange(time, documentUri) {
        const id = await this._getId(documentUri);
        if (id === undefined) {
            return;
        }
        this._appendEntry({ kind: 'focused', id, time });
    }
    async handleOnDidSelectionChange(time, documentUri, selection) {
        const id = await this._getId(documentUri);
        if (id === undefined) {
            return;
        }
        this._appendEntry({ kind: 'selectionChanged', id, time, selection: selection.map(s => (0, workspaceLog_1.serializeOffsetRange)(s)) });
    }
    async addBookmark(time) {
        this._appendEntry({ kind: 'bookmark', time });
    }
    async handleDocumentEvent(time, documentUri, data) {
        const id = await this._getId(documentUri);
        if (id === undefined) {
            return;
        }
        this._appendEntry({ kind: 'documentEvent', id, time, data });
    }
    async handleEvent(time, data) {
        this._appendEntry({ kind: 'event', time, data });
    }
    _getRelativePath(documentUri) {
        return path.relative(this.repoRootUri, documentUri);
    }
    async _getId(documentUri) {
        if (await this._context.isIgnoredDocument(documentUri)) {
            return undefined;
        }
        const relativePath = this._getRelativePath(documentUri);
        const s = this._state;
        const curState = s.value;
        let shouldWrite = false;
        let info = curState.documents[relativePath];
        if (!info) {
            info = { id: Object.entries(curState.documents).length, lastHash: '' };
            this._appendEntry({ kind: 'documentEncountered', time: Date.now(), id: info.id, relativePath });
            shouldWrite = true;
        }
        const initialText = this._documentInitialTexts.get(relativePath);
        if (initialText !== undefined) {
            const hash = (0, utils_1.computeShortSha)(initialText.value);
            const v = initialText.initialModelVersion === 0 ? undefined : initialText.initialModelVersion;
            if (info.lastHash !== hash) {
                info.lastHash = hash;
                shouldWrite = true;
                this._appendEntry({ kind: 'setContent', time: initialText.time, id: info.id, content: initialText.value, v });
                this._appendEntry({ kind: 'storeContent', time: initialText.time, id: info.id, contentId: hash, v });
            }
            else {
                this._appendEntry({ kind: 'restoreContent', time: initialText.time, id: info.id, contentId: hash, v });
            }
            this._documentInitialTexts.delete(relativePath);
        }
        if (shouldWrite) {
            s.setValue({ ...s.value, documents: { ...curState.documents, [relativePath]: info } });
            this._scheduleFlush();
        }
        if (info.lastHash === '') {
            throw new errors_1.BugIndicatingError(`hash was empty for uri "${documentUri}"`);
        }
        return info.id;
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
    _appendEntry(entry) {
        this._log.appendEntry(entry);
        this._scheduleFlush();
    }
}
exports.WorkspaceRecorderImpl = WorkspaceRecorderImpl;
//# sourceMappingURL=workspaceRecorder.js.map