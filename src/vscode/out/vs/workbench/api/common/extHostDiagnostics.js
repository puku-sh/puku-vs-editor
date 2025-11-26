/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ExtHostDiagnostics_1;
/* eslint-disable local/code-no-native-private */
import { localize } from '../../../nls.js';
import { MarkerSeverity } from '../../../platform/markers/common/markers.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext } from './extHost.protocol.js';
import { DiagnosticSeverity } from './extHostTypes.js';
import * as converter from './extHostTypeConverters.js';
import { Event, DebounceEmitter } from '../../../base/common/event.js';
import { coalesce } from '../../../base/common/arrays.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ResourceMap } from '../../../base/common/map.js';
import { IExtHostFileSystemInfo } from './extHostFileSystemInfo.js';
export class DiagnosticCollection {
    #proxy;
    #onDidChangeDiagnostics;
    #data;
    constructor(_name, _owner, _maxDiagnosticsTotal, _maxDiagnosticsPerFile, _modelVersionIdProvider, extUri, proxy, onDidChangeDiagnostics) {
        this._name = _name;
        this._owner = _owner;
        this._maxDiagnosticsTotal = _maxDiagnosticsTotal;
        this._maxDiagnosticsPerFile = _maxDiagnosticsPerFile;
        this._modelVersionIdProvider = _modelVersionIdProvider;
        this._isDisposed = false;
        this._maxDiagnosticsTotal = Math.max(_maxDiagnosticsPerFile, _maxDiagnosticsTotal);
        this.#data = new ResourceMap(uri => extUri.getComparisonKey(uri));
        this.#proxy = proxy;
        this.#onDidChangeDiagnostics = onDidChangeDiagnostics;
    }
    dispose() {
        if (!this._isDisposed) {
            this.#onDidChangeDiagnostics.fire([...this.#data.keys()]);
            this.#proxy?.$clear(this._owner);
            this.#data.clear();
            this._isDisposed = true;
        }
    }
    get name() {
        this._checkDisposed();
        return this._name;
    }
    set(first, diagnostics) {
        if (!first) {
            // this set-call is a clear-call
            this.clear();
            return;
        }
        // the actual implementation for #set
        this._checkDisposed();
        let toSync = [];
        if (URI.isUri(first)) {
            if (!diagnostics) {
                // remove this entry
                this.delete(first);
                return;
            }
            // update single row
            this.#data.set(first, coalesce(diagnostics));
            toSync = [first];
        }
        else if (Array.isArray(first)) {
            // update many rows
            toSync = [];
            let lastUri;
            // ensure stable-sort
            first = [...first].sort(DiagnosticCollection._compareIndexedTuplesByUri);
            for (const tuple of first) {
                const [uri, diagnostics] = tuple;
                if (!lastUri || uri.toString() !== lastUri.toString()) {
                    if (lastUri && this.#data.get(lastUri).length === 0) {
                        this.#data.delete(lastUri);
                    }
                    lastUri = uri;
                    toSync.push(uri);
                    this.#data.set(uri, []);
                }
                if (!diagnostics) {
                    // [Uri, undefined] means clear this
                    const currentDiagnostics = this.#data.get(uri);
                    if (currentDiagnostics) {
                        currentDiagnostics.length = 0;
                    }
                }
                else {
                    const currentDiagnostics = this.#data.get(uri);
                    currentDiagnostics?.push(...coalesce(diagnostics));
                }
            }
        }
        // send event for extensions
        this.#onDidChangeDiagnostics.fire(toSync);
        // compute change and send to main side
        if (!this.#proxy) {
            return;
        }
        const entries = [];
        let totalMarkerCount = 0;
        for (const uri of toSync) {
            let marker = [];
            const diagnostics = this.#data.get(uri);
            if (diagnostics) {
                // no more than N diagnostics per file
                if (diagnostics.length > this._maxDiagnosticsPerFile) {
                    marker = [];
                    const order = [DiagnosticSeverity.Error, DiagnosticSeverity.Warning, DiagnosticSeverity.Information, DiagnosticSeverity.Hint];
                    orderLoop: for (let i = 0; i < 4; i++) {
                        for (const diagnostic of diagnostics) {
                            if (diagnostic.severity === order[i]) {
                                const len = marker.push({ ...converter.Diagnostic.from(diagnostic), modelVersionId: this._modelVersionIdProvider(uri) });
                                if (len === this._maxDiagnosticsPerFile) {
                                    break orderLoop;
                                }
                            }
                        }
                    }
                    // add 'signal' marker for showing omitted errors/warnings
                    marker.push({
                        severity: MarkerSeverity.Info,
                        message: localize({ key: 'limitHit', comment: ['amount of errors/warning skipped due to limits'] }, "Not showing {0} further errors and warnings.", diagnostics.length - this._maxDiagnosticsPerFile),
                        startLineNumber: marker[marker.length - 1].startLineNumber,
                        startColumn: marker[marker.length - 1].startColumn,
                        endLineNumber: marker[marker.length - 1].endLineNumber,
                        endColumn: marker[marker.length - 1].endColumn
                    });
                }
                else {
                    marker = diagnostics.map(diag => ({ ...converter.Diagnostic.from(diag), modelVersionId: this._modelVersionIdProvider(uri) }));
                }
            }
            entries.push([uri, marker]);
            totalMarkerCount += marker.length;
            if (totalMarkerCount > this._maxDiagnosticsTotal) {
                // ignore markers that are above the limit
                break;
            }
        }
        this.#proxy.$changeMany(this._owner, entries);
    }
    delete(uri) {
        this._checkDisposed();
        this.#onDidChangeDiagnostics.fire([uri]);
        this.#data.delete(uri);
        this.#proxy?.$changeMany(this._owner, [[uri, undefined]]);
    }
    clear() {
        this._checkDisposed();
        this.#onDidChangeDiagnostics.fire([...this.#data.keys()]);
        this.#data.clear();
        this.#proxy?.$clear(this._owner);
    }
    forEach(callback, thisArg) {
        this._checkDisposed();
        for (const [uri, values] of this) {
            callback.call(thisArg, uri, values, this);
        }
    }
    *[Symbol.iterator]() {
        this._checkDisposed();
        for (const uri of this.#data.keys()) {
            yield [uri, this.get(uri)];
        }
    }
    get(uri) {
        this._checkDisposed();
        const result = this.#data.get(uri);
        if (Array.isArray(result)) {
            return Object.freeze(result.slice(0));
        }
        return [];
    }
    has(uri) {
        this._checkDisposed();
        return Array.isArray(this.#data.get(uri));
    }
    _checkDisposed() {
        if (this._isDisposed) {
            throw new Error('illegal state - object is disposed');
        }
    }
    static _compareIndexedTuplesByUri(a, b) {
        if (a[0].toString() < b[0].toString()) {
            return -1;
        }
        else if (a[0].toString() > b[0].toString()) {
            return 1;
        }
        else {
            return 0;
        }
    }
}
let ExtHostDiagnostics = class ExtHostDiagnostics {
    static { ExtHostDiagnostics_1 = this; }
    static { this._idPool = 0; }
    static { this._maxDiagnosticsPerFile = 1000; }
    static { this._maxDiagnosticsTotal = 1.1 * this._maxDiagnosticsPerFile; }
    static _mapper(last) {
        const map = new ResourceMap();
        for (const uri of last) {
            map.set(uri, uri);
        }
        return { uris: Object.freeze(Array.from(map.values())) };
    }
    constructor(mainContext, _logService, _fileSystemInfoService, _extHostDocumentsAndEditors) {
        this._logService = _logService;
        this._fileSystemInfoService = _fileSystemInfoService;
        this._extHostDocumentsAndEditors = _extHostDocumentsAndEditors;
        this._collections = new Map();
        this._onDidChangeDiagnostics = new DebounceEmitter({ merge: all => all.flat(), delay: 50 });
        this.onDidChangeDiagnostics = Event.map(this._onDidChangeDiagnostics.event, ExtHostDiagnostics_1._mapper);
        this._proxy = mainContext.getProxy(MainContext.MainThreadDiagnostics);
    }
    createDiagnosticCollection(extensionId, name) {
        const { _collections, _proxy, _onDidChangeDiagnostics, _logService, _fileSystemInfoService, _extHostDocumentsAndEditors } = this;
        const loggingProxy = new class {
            $changeMany(owner, entries) {
                _proxy.$changeMany(owner, entries);
                _logService.trace('[DiagnosticCollection] change many (extension, owner, uris)', extensionId.value, owner, entries.length === 0 ? 'CLEARING' : entries);
            }
            $clear(owner) {
                _proxy.$clear(owner);
                _logService.trace('[DiagnosticCollection] remove all (extension, owner)', extensionId.value, owner);
            }
            dispose() {
                _proxy.dispose();
            }
        };
        let owner;
        if (!name) {
            name = '_generated_diagnostic_collection_name_#' + ExtHostDiagnostics_1._idPool++;
            owner = name;
        }
        else if (!_collections.has(name)) {
            owner = name;
        }
        else {
            this._logService.warn(`DiagnosticCollection with name '${name}' does already exist.`);
            do {
                owner = name + ExtHostDiagnostics_1._idPool++;
            } while (_collections.has(owner));
        }
        const result = new class extends DiagnosticCollection {
            constructor() {
                super(name, owner, ExtHostDiagnostics_1._maxDiagnosticsTotal, ExtHostDiagnostics_1._maxDiagnosticsPerFile, uri => _extHostDocumentsAndEditors.getDocument(uri)?.version, _fileSystemInfoService.extUri, loggingProxy, _onDidChangeDiagnostics);
                _collections.set(owner, this);
            }
            dispose() {
                super.dispose();
                _collections.delete(owner);
            }
        };
        return result;
    }
    getDiagnostics(resource) {
        if (resource) {
            return this._getDiagnostics(resource);
        }
        else {
            const index = new Map();
            const res = [];
            for (const collection of this._collections.values()) {
                collection.forEach((uri, diagnostics) => {
                    let idx = index.get(uri.toString());
                    if (typeof idx === 'undefined') {
                        idx = res.length;
                        index.set(uri.toString(), idx);
                        res.push([uri, []]);
                    }
                    res[idx][1] = res[idx][1].concat(...diagnostics);
                });
            }
            return res;
        }
    }
    _getDiagnostics(resource) {
        let res = [];
        for (const collection of this._collections.values()) {
            if (collection.has(resource)) {
                res = res.concat(collection.get(resource));
            }
        }
        return res;
    }
    $acceptMarkersChange(data) {
        if (!this._mirrorCollection) {
            const name = '_generated_mirror';
            const collection = new DiagnosticCollection(name, name, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, // no limits because this collection is just a mirror of "sanitized" data
            // no limits because this collection is just a mirror of "sanitized" data
            _uri => undefined, this._fileSystemInfoService.extUri, undefined, this._onDidChangeDiagnostics);
            this._collections.set(name, collection);
            this._mirrorCollection = collection;
        }
        for (const [uri, markers] of data) {
            this._mirrorCollection.set(URI.revive(uri), markers.map(converter.Diagnostic.to));
        }
    }
};
ExtHostDiagnostics = ExtHostDiagnostics_1 = __decorate([
    __param(1, ILogService),
    __param(2, IExtHostFileSystemInfo)
], ExtHostDiagnostics);
export { ExtHostDiagnostics };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERpYWdub3N0aWNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdERpYWdub3N0aWNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxpREFBaUQ7QUFFakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMxRixPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBRWpFLE9BQU8sRUFBRSxXQUFXLEVBQXFFLE1BQU0sdUJBQXVCLENBQUM7QUFDdkgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDdkQsT0FBTyxLQUFLLFNBQVMsTUFBTSw0QkFBNEIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFXLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRTFELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBSXBFLE1BQU0sT0FBTyxvQkFBb0I7SUFFdkIsTUFBTSxDQUF5QztJQUMvQyx1QkFBdUIsQ0FBaUM7SUFDeEQsS0FBSyxDQUFtQztJQUlqRCxZQUNrQixLQUFhLEVBQ2IsTUFBYyxFQUNkLG9CQUE0QixFQUM1QixzQkFBOEIsRUFDOUIsdUJBQXlELEVBQzFFLE1BQWUsRUFDZixLQUE2QyxF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