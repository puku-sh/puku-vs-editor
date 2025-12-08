"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceDocumentEditHistory = void 0;
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const observable_1 = require("../../../../util/vs/base/common/observable");
const stringEdit_1 = require("../../../../util/vs/editor/common/core/edits/stringEdit");
const observable_2 = require("../utils/observable");
const utils_1 = require("../utils/utils");
class WorkspaceDocumentEditHistory extends lifecycle_1.Disposable {
    constructor(workspace, observableGit, historyLength) {
        super();
        this._documentState = new Map();
        this._lastDocuments = new FifoSet(50);
        this._register((0, observable_1.autorun)(reader => {
            const branch = reader.readObservable(observableGit.branch);
            if (branch === undefined) {
                return; // probably git extension hasn't activated or no repository found, so don't do anything
            }
            this._lastGitCheckout = (0, utils_1.now)();
            this._documentState.forEach(d => d.resetEditHistory());
        }));
        (0, observable_1.mapObservableArrayCached)(this, workspace.openDocuments, (doc, store) => {
            const state = new DocumentEditHistory(doc.value.get(), historyLength);
            this._documentState.set(doc.id, state);
            store.add((0, observable_2.autorunWithChanges)(this, {
                value: doc.value,
            }, (data) => {
                const isInCooldown = this._isAwaitingGitCheckoutCooldown();
                for (const edit of data.value.changes) {
                    this._lastDocuments.push(state);
                    state.handleEdit(edit, isInCooldown);
                }
            }));
            store.add((0, lifecycle_1.toDisposable)(() => {
                const state = this._documentState.get(doc.id);
                if (state) {
                    this._lastDocuments.remove(state);
                }
                this._documentState.delete(doc.id);
            }));
        }, d => d.id).recomputeInitiallyAndOnChange(this._store);
    }
    _isAwaitingGitCheckoutCooldown() {
        if (!this._lastGitCheckout) {
            return false;
        }
        const isInCooldown = (0, utils_1.now)() - this._lastGitCheckout < 2 * 1000 /* 2 seconds */;
        if (!isInCooldown) {
            this._lastGitCheckout = undefined;
        }
        return isInCooldown;
    }
    getRecentEdits(docId) {
        const state = this._documentState.get(docId);
        if (!state) {
            return undefined;
        }
        return state.getRecentEdits();
    }
    getNRecentEdits(docId, n) {
        const state = this._documentState.get(docId);
        if (!state) {
            return undefined;
        }
        return state.getNRecentEdits(n);
    }
    resetEditHistory() {
        this._documentState.forEach(d => d.resetEditHistory());
    }
    getLastDocuments() {
        return this._lastDocuments.getItemsReversed();
    }
    hasDocument(docId) {
        return this._documentState.has(docId);
    }
}
exports.WorkspaceDocumentEditHistory = WorkspaceDocumentEditHistory;
class DocumentEdit {
    constructor(value) {
        this.value = value;
    }
    join(other) {
        if (this.value >= other.value) {
            return this;
        }
        return other;
    }
}
class DocumentEditHistory {
    constructor(original, _historyLength) {
        this._historyLength = _historyLength;
        this._documentStateID = 0;
        this._recentEdits = stringEdit_1.AnnotatedStringEdit.create([]);
        this._base = original;
        this._current = original;
    }
    handleEdit(edit, isInCooldown) {
        if (edit.isEmpty()) {
            return;
        }
        const stateIdentifier = this._documentStateID++;
        this._current = edit.applyOnText(this._current);
        if (isInCooldown) {
            this.resetEditHistory();
            return;
        }
        const annotatedEdit = edit.mapData(r => new DocumentEdit(stateIdentifier));
        const updatedRecentEdits = this._recentEdits.compose(annotatedEdit);
        const { e1: newRecentEdits, e2: oldEdits } = updatedRecentEdits.decomposeSplit((r) => r.data.value > this._documentStateID - this._historyLength);
        this._recentEdits = newRecentEdits;
        this._base = oldEdits.applyOnText(this._base);
    }
    getRecentEdits() {
        return {
            before: this._base,
            after: this._current,
            edits: this._recentEdits.toStringEdit()
        };
    }
    getNRecentEdits(n) {
        const { e1: nRecentEdits, e2: oldEdits } = this._recentEdits.decomposeSplit((r) => r.data.value > this._documentStateID - n);
        return {
            before: oldEdits.applyOnText(this._base),
            after: this._current,
            edits: nRecentEdits.toStringEdit()
        };
    }
    resetEditHistory() {
        this._base = this._current;
        this._recentEdits = stringEdit_1.AnnotatedStringEdit.create([]);
    }
}
class FifoSet {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this._arr = [];
    }
    push(e) {
        const existing = this._arr.indexOf(e);
        if (existing !== -1) {
            this._arr.splice(existing, 1);
        }
        else if (this._arr.length >= this.maxSize) {
            this._arr.shift();
        }
        this._arr.push(e);
    }
    remove(e) {
        const existing = this._arr.indexOf(e);
        if (existing !== -1) {
            this._arr.splice(existing, 1);
        }
    }
    getItemsReversed() {
        const arr = [...this._arr];
        arr.reverse();
        return arr;
    }
    has(item) {
        return this._arr.indexOf(item) !== -1;
    }
}
//# sourceMappingURL=workspaceDocumentEditTracker.js.map