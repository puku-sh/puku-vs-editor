"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservableWorkspaceRecordingReplayer = void 0;
const documentId_1 = require("../../../platform/inlineEdits/common/dataTypes/documentId");
const editUtils_1 = require("../../../platform/inlineEdits/common/dataTypes/editUtils");
const languageId_1 = require("../../../platform/inlineEdits/common/dataTypes/languageId");
const observableWorkspace_1 = require("../../../platform/inlineEdits/common/observableWorkspace");
const workspaceLog_1 = require("../../../platform/workspaceRecorder/common/workspaceLog");
const assert_1 = require("../../../util/vs/base/common/assert");
const errors_1 = require("../../../util/vs/base/common/errors");
const event_1 = require("../../../util/vs/base/common/event");
const types_1 = require("../../../util/vs/base/common/types");
const uri_1 = require("../../../util/vs/base/common/uri");
const offsetRange_1 = require("../../../util/vs/editor/common/core/ranges/offsetRange");
const abstractText_1 = require("../../../util/vs/editor/common/core/text/abstractText");
class ObservableWorkspaceRecordingReplayer {
    get workspace() { return this._workspace; }
    get stepIdx() { return this._stepIdx; }
    constructor(_recording, _includeNextEditSelection = false) {
        this._recording = _recording;
        this._includeNextEditSelection = _includeNextEditSelection;
        this._workspace = new observableWorkspace_1.MutableObservableWorkspace();
        this._stepIdx = 0;
        this._lastId = undefined;
        this._repoRootUri = undefined;
        this._documents = new Map();
        this._states = new Map();
        this._onDocumentEvent = new event_1.Emitter();
        this.onDocumentEvent = this._onDocumentEvent.event;
        this._lastTime = undefined;
    }
    getPreviousLogEntry() {
        if (this._stepIdx === 0) {
            return undefined;
        }
        return this._recording.log[this._stepIdx - 1];
    }
    step() {
        return this._step((e, cont) => cont());
    }
    async finishReplaySimulateTime() {
        while (await this.stepSimulateTime()) {
            // noop
        }
    }
    getLastTime() {
        return this._lastTime || 0;
    }
    stepSimulateTime() {
        return new Promise(res => {
            const r = this._step((entry, cont) => {
                if ('time' in entry) {
                    const diff = Math.max(0, this._lastTime !== undefined ? (entry.time - this._lastTime) : 0);
                    this._lastTime = entry.time;
                    setTimeout(() => {
                        cont();
                        res(true);
                    }, diff);
                }
                else {
                    cont();
                    res(true);
                }
            });
            if (!r) {
                res(false);
            }
        });
    }
    _step(cb) {
        if (this._stepIdx === this._recording.log.length && this._includeNextEditSelection) {
            this._stepIdx++;
            const nextEdit = this._recording.nextUserEdit;
            if (!nextEdit) {
                return false;
            }
            // we assume that the next edit refers to the last document! This might be wrong.
            const range = (0, editUtils_1.deserializeStringEdit)(nextEdit.edit).replacements[0]?.replaceRange;
            if (!this._lastId) {
                throw new errors_1.BugIndicatingError();
            }
            this._workspace.getDocument(this._lastId)?.setSelection([range], undefined);
            return true;
        }
        if (this._stepIdx >= this._recording.log.length) {
            return false;
        }
        const entry = this._recording.log[this._stepIdx];
        this._stepIdx++;
        cb(entry, () => {
            if ('time' in entry) {
                this._lastTime = entry.time;
            }
            switch (entry.kind) {
                case "opened": {
                    break;
                }
                case "header": {
                    if (entry.repoRootUri !== undefined) {
                        this._repoRootUri = entry.repoRootUri;
                    }
                    break;
                }
                case "meta": {
                    this._repoRootUri = entry.data.repoRootUri;
                    break;
                }
                case "documentEncountered": {
                    const pathUri = joinUriWithRelativePath((0, types_1.assertReturnsDefined)(this._repoRootUri), entry.relativePath);
                    const id = documentId_1.DocumentId.create(pathUri);
                    this._documents.set(entry.id, { id: id, workspaceRoot: this._repoRootUri, initialized: false });
                    break;
                }
                case "setContent": {
                    const doc = this._documents.get(entry.id);
                    if (!doc) {
                        throw new errors_1.BugIndicatingError();
                    }
                    if (doc.initialized) {
                        const d = this._workspace.getDocument(doc.id);
                        d.setValue(new abstractText_1.StringText(entry.content), undefined, entry.v);
                    }
                    else {
                        doc.initialized = true;
                        const d = this._workspace.addDocument({
                            id: doc.id,
                            workspaceRoot: doc.workspaceRoot ? uri_1.URI.parse(doc.workspaceRoot) : undefined,
                            initialValue: entry.content,
                            languageId: guessLanguageId(doc.id)
                        });
                        d.setSelection([new offsetRange_1.OffsetRange(0, 0)]);
                    }
                    break;
                }
                case "changed": {
                    const doc = this._documents.get(entry.id);
                    if (!doc || !doc.initialized) {
                        throw new errors_1.BugIndicatingError();
                    }
                    const e = (0, editUtils_1.deserializeStringEdit)(entry.edit);
                    this._workspace.getDocument(doc.id)?.applyEdit(e, undefined, entry.v);
                    this._lastId = doc.id;
                    break;
                }
                case "selectionChanged": {
                    const doc = this._documents.get(entry.id);
                    if (!doc || !doc.initialized) {
                        throw new errors_1.BugIndicatingError();
                    }
                    const selection = entry.selection;
                    const docFromWorkspace = this._workspace.getDocument(doc.id);
                    (0, assert_1.assert)(docFromWorkspace !== undefined, "Document should be in workspace");
                    docFromWorkspace.updateSelection(selection.map(s => (0, workspaceLog_1.deserializeOffsetRange)(s)), undefined);
                    this._lastId = doc.id;
                    break;
                }
                case "focused":
                case "applicationStart": {
                    break;
                }
                case "storeContent": {
                    const doc = this._documents.get(entry.id);
                    this._states.set(entry.contentId, this._workspace.getDocument(doc.id).value.get().value);
                    break;
                }
                case "restoreContent": {
                    const doc = this._documents.get(entry.id);
                    const content = this._states.get(entry.contentId);
                    if (!content) {
                        throw new errors_1.BugIndicatingError();
                    }
                    this._workspace.getDocument(doc.id).setValue(new abstractText_1.StringText(content), undefined, entry.v);
                    break;
                }
                case "documentEvent": {
                    const docId = this._documents.get(entry.id);
                    const doc = this._workspace.getDocument(docId.id);
                    const data = entry.data;
                    this._onDocumentEvent.fire({ logEntry: entry, data, doc });
                    break;
                }
                case "event": {
                    break;
                }
                default:
                    throw new errors_1.BugIndicatingError(`'${entry.kind}' not supported`);
            }
        });
        return true;
    }
    stepTo(idx) {
        while (this._stepIdx < idx) {
            if (!this.step()) {
                return false;
            }
        }
        return true;
    }
    stepUntilFirstDocument() {
        do {
            const docs = this.workspace.openDocuments.get();
            if (docs.length > 0) {
                return docs[0];
            }
        } while (this.step());
        return undefined;
    }
    replay() {
        while (this.step()) { }
        if (!this._lastId) {
            throw new errors_1.BugIndicatingError();
        }
        return { lastDocId: this._lastId };
    }
}
exports.ObservableWorkspaceRecordingReplayer = ObservableWorkspaceRecordingReplayer;
function joinUriWithRelativePath(baseUri, relativePath) {
    // TODO@hediet: use return URI.parse(join(baseUri, relativePath).replaceAll('\\', '/'));
    if (baseUri.endsWith('/')) {
        baseUri = baseUri.substring(0, baseUri.length - 1);
    }
    return baseUri + '/' + relativePath.replaceAll('\\', '/');
}
// TODO: This should be centralized in languages.ts
function guessLanguageId(docId) {
    const extension = docId.extension;
    const extensionToLanguageId = {
        '.py': 'python',
        '.js': 'javascript',
        '.jsx': 'javascriptreact',
        '.html': 'html',
        '.htm': 'html',
        '.css': 'css',
        '.ts': 'typescript',
        '.tsx': 'typescriptreact',
        '.go': 'go',
        '.ruby': 'ruby',
        '.cs': 'csharp',
        '.c': 'cpp',
        '.cpp': 'cpp',
        '.h': 'cpp',
        '.hpp': 'cpp',
        '.java': 'java',
        '.rs': 'rust',
    };
    if (extensionToLanguageId[extension]) {
        return languageId_1.LanguageId.create(extensionToLanguageId[extension]);
    }
    return languageId_1.LanguageId.PlainText;
}
//# sourceMappingURL=observableWorkspaceRecordingReplayer.js.map