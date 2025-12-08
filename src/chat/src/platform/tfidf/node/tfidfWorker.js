"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const worker_threads_1 = require("worker_threads");
const worker_1 = require("../../../util/node/worker");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const iterator_1 = require("../../../util/vs/base/common/iterator");
const lazy_1 = require("../../../util/vs/base/common/lazy");
const map_1 = require("../../../util/vs/base/common/map");
const stopwatch_1 = require("../../../util/vs/base/common/stopwatch");
const uri_1 = require("../../../util/vs/base/common/uri");
const range_1 = require("../../../util/vs/editor/common/core/range");
const naiveChunker_1 = require("../../chunking/node/naiveChunker");
const nullTelemetryService_1 = require("../../telemetry/common/nullTelemetryService");
const tokenizer_1 = require("../../tokenizer/node/tokenizer");
const tfidf_1 = require("./tfidf");
const tfidfMessaging_1 = require("./tfidfMessaging");
function isIRange(obj) {
    return obj && typeof obj.startLineNumber === 'number' && typeof obj.startColumn === 'number' && typeof obj.endLineNumber === 'number' && typeof obj.endColumn === 'number';
}
function serialize(value) {
    return (0, tfidfMessaging_1.rewriteObject)(value, obj => {
        if (uri_1.URI.isUri(obj)) {
            return { $mid: 'uri', ...obj };
        }
        if (isIRange(obj)) {
            return { $mid: 'range', ...obj };
        }
    });
}
function revive(value) {
    return (0, tfidfMessaging_1.rewriteObject)(value, (obj) => {
        if (obj['$mid'] === 'uri') {
            return uri_1.URI.from(obj);
        }
    });
}
class Host {
    constructor(port, impl) {
        this._handler = new worker_1.RcpResponseHandler();
        this.proxy = (0, worker_1.createRpcProxy)((name, args) => {
            const { id, result } = this._handler.createHandler();
            port.postMessage({ id, fn: name, args });
            return result;
        });
        port.on('message', async (msg) => {
            if ('fn' in msg) {
                try {
                    const res = await impl[msg.fn](...revive(msg.args));
                    port.postMessage({ id: msg.id, res: serialize(res) });
                }
                catch (err) {
                    port.postMessage({ id: msg.id, err });
                }
            }
            else {
                this._handler.handleResponse(msg);
            }
        });
    }
}
class TfidfWorker {
    constructor(port, workerData) {
        this._pendingChanges = new map_1.ResourceMap();
        this._tfIdf = new tfidf_1.PersistentTfIdf(workerData.dbPath === ':memory:' ? ':memory:' : uri_1.URI.from(workerData.dbPath));
        this._chunker = new naiveChunker_1.NaiveChunker(workerData.endpoint, new tokenizer_1.TokenizerProvider(false, new nullTelemetryService_1.NullTelemetryService()));
        this._host = new Host(port, this);
    }
    initialize(workspaceDocsIn) {
        const { outOfSyncDocs, newDocs, deletedDocs } = this._tfIdf.initialize(workspaceDocsIn.map(entry => ({
            uri: uri_1.URI.from(entry.uri),
            contentId: entry.contentId,
        })));
        // Defer actually updating any out of sync docs until we need to do a search
        for (const uri of iterator_1.Iterable.concat(outOfSyncDocs, newDocs)) {
            this._pendingChanges.set(uri, 'update');
        }
        return {
            newFileCount: newDocs.size,
            outOfSyncFileCount: outOfSyncDocs.size,
            deletedFileCount: deletedDocs.size
        };
    }
    addOrUpdate(documents) {
        for (const uri of documents) {
            const revivedUri = uri_1.URI.from(uri);
            this._pendingChanges.set(revivedUri, 'update');
        }
    }
    delete(uris) {
        for (const uri of uris) {
            const revivedUri = uri_1.URI.from(uri);
            this._pendingChanges.set(revivedUri, 'delete');
        }
    }
    async search(query, options) {
        const sw = new stopwatch_1.StopWatch();
        const updatedFileCount = this._pendingChanges.size;
        await this._flushPendingChanges();
        const updateTime = sw.elapsed();
        sw.reset();
        const results = await this._tfIdf.search(query, options);
        const searchTime = sw.elapsed();
        return {
            results: results,
            telemetry: {
                fileCount: this._tfIdf.fileCount,
                updatedFileCount,
                updateTime,
                searchTime,
            }
        };
    }
    async _flushPendingChanges() {
        if (!this._pendingChanges.size) {
            return;
        }
        const toDelete = Array.from(iterator_1.Iterable.filter(this._pendingChanges.entries(), ([_uri, op]) => op === 'delete'), ([uri]) => uri);
        this._tfIdf.delete(toDelete);
        const updatedDocs = Array.from(iterator_1.Iterable.filter(this._pendingChanges.entries(), ([_uri, op]) => op === 'update'), ([uri]) => {
            const contentVersionId = new lazy_1.Lazy(() => this._host.proxy.getContentVersionId(uri));
            return {
                uri: uri,
                getContentVersionId: () => contentVersionId.value,
                getChunks: async () => this.getRawNaiveChunks(uri, await this._host.proxy.readFile(uri), cancellation_1.CancellationToken.None)
            };
        });
        if (updatedDocs.length) {
            await this._tfIdf.addOrUpdate(updatedDocs);
        }
        this._pendingChanges.clear();
    }
    async getRawNaiveChunks(uri, text, token) {
        try {
            const naiveChunks = await this._chunker.chunkFile(uri, text, {}, token);
            return iterator_1.Iterable.map(naiveChunks, (e) => {
                return {
                    file: uri,
                    text: e.text,
                    rawText: e.rawText,
                    range: range_1.Range.lift(e.range),
                    isFullFile: e.isFullFile
                };
            });
        }
        catch (e) {
            console.error(`Could not chunk: ${uri}`, e);
            return [];
        }
    }
}
// #region Main
const port = worker_threads_1.parentPort;
if (!port) {
    throw new Error(`This module should only be used in a worker thread.`);
}
if (!worker_threads_1.workerData) {
    throw new Error(`Expected 'workerData' to be provided to the worker thread.`);
}
new TfidfWorker(port, worker_threads_1.workerData);
// #endregion
//# sourceMappingURL=tfidfWorker.js.map