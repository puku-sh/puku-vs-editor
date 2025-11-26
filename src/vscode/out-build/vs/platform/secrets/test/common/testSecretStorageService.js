/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
export class TestSecretStorageService {
    constructor() {
        this._storage = new Map();
        this._onDidChangeSecretEmitter = new Emitter();
        this.onDidChangeSecret = this._onDidChangeSecretEmitter.event;
        this.type = 'in-memory';
    }
    async get(key) {
        return this._storage.get(key);
    }
    async set(key, value) {
        this._storage.set(key, value);
        this._onDidChangeSecretEmitter.fire(key);
    }
    async delete(key) {
        this._storage.delete(key);
        this._onDidChangeSecretEmitter.fire(key);
    }
    async keys() {
        return Array.from(this._storage.keys());
    }
    // Helper method for tests to clear all secrets
    clear() {
        this._storage.clear();
    }
    dispose() {
        this._onDidChangeSecretEmitter.dispose();
        this._storage.clear();
    }
}
//# sourceMappingURL=testSecretStorageService.js.map