"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.LockMap = exports.Lock = void 0;
/**
 * A class representing a lock that can be acquired and released.
 */
class Lock {
    constructor() {
        this._locked = false;
        this._queue = [];
    }
    get locked() {
        return this._locked;
    }
    /**
     * Acquires the lock. If the lock is already acquired, waits until it is released.
     */
    async acquire() {
        if (!this._locked) {
            this._locked = true;
            return;
        }
        await new Promise((resolve) => {
            this._queue.push(resolve);
        });
        await this.acquire();
    }
    /**
     * Releases the lock and allows the next queued function to execute.
     * If the lock is not currently locked, an error will be thrown.
     */
    release() {
        if (!this._locked) {
            throw new Error('Cannot release an unlocked lock');
        }
        this._locked = false;
        const next = this._queue.shift();
        if (next) {
            next();
        }
    }
}
exports.Lock = Lock;
class LockMap {
    constructor() {
        this._locks = new Map();
    }
    async withLock(key, fn) {
        if (!this._locks.has(key)) {
            this._locks.set(key, new Lock());
        }
        const lock = this._locks.get(key);
        await lock.acquire();
        try {
            return await fn();
        }
        catch (error) {
            throw error;
        }
        finally {
            lock.release();
        }
    }
}
exports.LockMap = LockMap;
//# sourceMappingURL=lock.js.map