/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter, Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { InMemoryStorageDatabase, Storage } from '../../../../base/parts/storage/common/storage.js';
import { AbstractUserDataProfileStorageService } from '../../common/userDataProfileStorageService.js';
import { InMemoryStorageService, loadKeyTargets, TARGET_KEY } from '../../../storage/common/storage.js';
import { toUserDataProfile } from '../../common/userDataProfile.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
class TestStorageDatabase extends InMemoryStorageDatabase {
    constructor() {
        super(...arguments);
        this._onDidChangeItemsExternal = new Emitter();
        this.onDidChangeItemsExternal = this._onDidChangeItemsExternal.event;
    }
    async updateItems(request) {
        await super.updateItems(request);
        if (request.insert || request.delete) {
            this._onDidChangeItemsExternal.fire({ changed: request.insert, deleted: request.delete });
        }
    }
}
export class TestUserDataProfileStorageService extends AbstractUserDataProfileStorageService {
    constructor() {
        super(...arguments);
        this.onDidChange = Event.None;
        this.databases = new Map();
    }
    async createStorageDatabase(profile) {
        let database = this.databases.get(profile.id);
        if (!database) {
            this.databases.set(profile.id, database = new TestStorageDatabase());
        }
        return database;
    }
    setupStorageDatabase(profile) {
        return this.createStorageDatabase(profile);
    }
}
suite('ProfileStorageService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const profile = toUserDataProfile('test', 'test', URI.file('foo'), URI.file('cache'));
    let testObject;
    let storage;
    setup(async () => {
        testObject = disposables.add(new TestUserDataProfileStorageService(false, disposables.add(new InMemoryStorageService())));
        storage = disposables.add(new Storage(await testObject.setupStorageDatabase(profile)));
        await storage.init();
    });
    test('read empty storage', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const actual = await testObject.readStorageData(profile);
        assert.strictEqual(actual.size, 0);
    }));
    test('read storage with data', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        storage.set('foo', 'bar');
        storage.set(TARGET_KEY, JSON.stringify({ foo: 0 /* StorageTarget.USER */ }));
        await storage.flush();
        const actual = await testObject.readStorageData(profile);
        assert.strictEqual(actual.size, 1);
        assert.deepStrictEqual(actual.get('foo'), { 'value': 'bar', 'target': 0 /* StorageTarget.USER */ });
    }));
    test('write in empty storage', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const data = new Map();
        data.set('foo', 'bar');
        await testObject.updateStorageData(profile, data, 0 /* StorageTarget.USER */);
        assert.strictEqual(storage.items.size, 2);
        assert.deepStrictEqual(loadKeyTargets(storage), { foo: 0 /* StorageTarget.USER */ });
        assert.strictEqual(storage.get('foo'), 'bar');
    }));
    test('write in storage with data', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        storage.set('foo', 'bar');
        storage.set(TARGET_KEY, JSON.stringify({ foo: 0 /* StorageTarget.USER */ }));
        await storage.flush();
        const data = new Map();
        data.set('abc', 'xyz');
        await testObject.updateStorageData(profile, data, 1 /* StorageTarget.MACHINE */);
        assert.strictEqual(storage.items.size, 3);
        assert.deepStrictEqual(loadKeyTargets(storage), { foo: 0 /* StorageTarget.USER */, abc: 1 /* StorageTarget.MACHINE */ });
        assert.strictEqual(storage.get('foo'), 'bar');
        assert.strictEqual(storage.get('abc'), 'xyz');
    }));
    test('write in storage with data (insert, update, remove)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        storage.set('foo', 'bar');
        storage.set('abc', 'xyz');
        storage.set(TARGET_KEY, JSON.stringify({ foo: 0 /* StorageTarget.USER */, abc: 1 /* StorageTarget.MACHINE */ }));
        await storage.flush();
        const data = new Map();
        data.set('foo', undefined);
        data.set('abc', 'def');
        data.set('var', 'const');
        await testObject.updateStorageData(profile, data, 0 /* StorageTarget.USER */);
        assert.strictEqual(storage.items.size, 3);
        assert.deepStrictEqual(loadKeyTargets(storage), { abc: 0 /* StorageTarget.USER */, var: 0 /* StorageTarget.USER */ });
        assert.strictEqual(storage.get('abc'), 'def');
        assert.strictEqual(storage.get('var'), 'const');
    }));
});
//# sourceMappingURL=userDataProfileStorageService.test.js.map