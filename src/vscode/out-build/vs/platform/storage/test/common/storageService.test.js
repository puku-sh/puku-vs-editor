/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, ok, strictEqual } from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { InMemoryStorageService } from '../../common/storage.js';
export function createSuite(params) {
    let storageService;
    const disposables = new DisposableStore();
    setup(async () => {
        storageService = await params.setup();
    });
    teardown(() => {
        disposables.clear();
        return params.teardown(storageService);
    });
    test('Get Data, Integer, Boolean (application)', () => {
        storeData(-1 /* StorageScope.APPLICATION */);
    });
    test('Get Data, Integer, Boolean (profile)', () => {
        storeData(0 /* StorageScope.PROFILE */);
    });
    test('Get Data, Integer, Boolean, Object (workspace)', () => {
        storeData(1 /* StorageScope.WORKSPACE */);
    });
    test('Storage change source', () => {
        const storageValueChangeEvents = [];
        storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, undefined, disposables)(e => storageValueChangeEvents.push(e), undefined, disposables);
        // Explicit external source
        storageService.storeAll([{ key: 'testExternalChange', value: 'foobar', scope: 1 /* StorageScope.WORKSPACE */, target: 1 /* StorageTarget.MACHINE */ }], true);
        let storageValueChangeEvent = storageValueChangeEvents.find(e => e.key === 'testExternalChange');
        strictEqual(storageValueChangeEvent?.external, true);
        // Default source
        storageService.storeAll([{ key: 'testChange', value: 'barfoo', scope: 1 /* StorageScope.WORKSPACE */, target: 1 /* StorageTarget.MACHINE */ }], false);
        storageValueChangeEvent = storageValueChangeEvents.find(e => e.key === 'testChange');
        strictEqual(storageValueChangeEvent?.external, false);
        storageService.store('testChange', 'foobar', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storageValueChangeEvent = storageValueChangeEvents.find(e => e.key === 'testChange');
        strictEqual(storageValueChangeEvent?.external, false);
    });
    test('Storage change event scope (all keys)', () => {
        const storageValueChangeEvents = [];
        storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, undefined, disposables)(e => storageValueChangeEvents.push(e), undefined, disposables);
        storageService.store('testChange', 'foobar', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange2', 'foobar', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange', 'foobar', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange', 'foobar', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange2', 'foobar', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageValueChangeEvents.length, 2);
    });
    test('Storage change event scope (specific key)', () => {
        const storageValueChangeEvents = [];
        storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, 'testChange', disposables)(e => storageValueChangeEvents.push(e), undefined, disposables);
        storageService.store('testChange', 'foobar', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange', 'foobar', 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        storageService.store('testChange', 'foobar', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange2', 'foobar', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        const storageValueChangeEvent = storageValueChangeEvents.find(e => e.key === 'testChange');
        ok(storageValueChangeEvent);
        strictEqual(storageValueChangeEvents.length, 1);
    });
    function storeData(scope) {
        let storageValueChangeEvents = [];
        storageService.onDidChangeValue(scope, undefined, disposables)(e => storageValueChangeEvents.push(e), undefined, disposables);
        strictEqual(storageService.get('test.get', scope, 'foobar'), 'foobar');
        strictEqual(storageService.get('test.get', scope, ''), '');
        strictEqual(storageService.getNumber('test.getNumber', scope, 5), 5);
        strictEqual(storageService.getNumber('test.getNumber', scope, 0), 0);
        strictEqual(storageService.getBoolean('test.getBoolean', scope, true), true);
        strictEqual(storageService.getBoolean('test.getBoolean', scope, false), false);
        deepStrictEqual(storageService.getObject('test.getObject', scope, { 'foo': 'bar' }), { 'foo': 'bar' });
        deepStrictEqual(storageService.getObject('test.getObject', scope, {}), {});
        deepStrictEqual(storageService.getObject('test.getObject', scope, []), []);
        storageService.store('test.get', 'foobar', scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.get('test.get', scope, (undefined)), 'foobar');
        let storageValueChangeEvent = storageValueChangeEvents.find(e => e.key === 'test.get');
        strictEqual(storageValueChangeEvent?.scope, scope);
        strictEqual(storageValueChangeEvent?.key, 'test.get');
        storageValueChangeEvents = [];
        storageService.store('test.get', '', scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.get('test.get', scope, (undefined)), '');
        storageValueChangeEvent = storageValueChangeEvents.find(e => e.key === 'test.get');
        strictEqual(storageValueChangeEvent.scope, scope);
        strictEqual(storageValueChangeEvent.key, 'test.get');
        storageService.store('test.getNumber', 5, scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.getNumber('test.getNumber', scope, (undefined)), 5);
        storageService.store('test.getNumber', 0, scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.getNumber('test.getNumber', scope, (undefined)), 0);
        storageService.store('test.getBoolean', true, scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.getBoolean('test.getBoolean', scope, (undefined)), true);
        storageService.store('test.getBoolean', false, scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.getBoolean('test.getBoolean', scope, (undefined)), false);
        storageService.store('test.getObject', {}, scope, 1 /* StorageTarget.MACHINE */);
        deepStrictEqual(storageService.getObject('test.getObject', scope, (undefined)), {});
        storageService.store('test.getObject', [42], scope, 1 /* StorageTarget.MACHINE */);
        deepStrictEqual(storageService.getObject('test.getObject', scope, (undefined)), [42]);
        storageService.store('test.getObject', { 'foo': {} }, scope, 1 /* StorageTarget.MACHINE */);
        deepStrictEqual(storageService.getObject('test.getObject', scope, (undefined)), { 'foo': {} });
        strictEqual(storageService.get('test.getDefault', scope, 'getDefault'), 'getDefault');
        strictEqual(storageService.getNumber('test.getNumberDefault', scope, 5), 5);
        strictEqual(storageService.getBoolean('test.getBooleanDefault', scope, true), true);
        deepStrictEqual(storageService.getObject('test.getObjectDefault', scope, { 'foo': 42 }), { 'foo': 42 });
        storageService.storeAll([
            { key: 'test.storeAll1', value: 'foobar', scope, target: 1 /* StorageTarget.MACHINE */ },
            { key: 'test.storeAll2', value: 4, scope, target: 1 /* StorageTarget.MACHINE */ },
            { key: 'test.storeAll3', value: null, scope, target: 1 /* StorageTarget.MACHINE */ }
        ], false);
        strictEqual(storageService.get('test.storeAll1', scope, 'foobar'), 'foobar');
        strictEqual(storageService.get('test.storeAll2', scope, '4'), '4');
        strictEqual(storageService.get('test.storeAll3', scope, 'null'), 'null');
    }
    test('Remove Data (application)', () => {
        removeData(-1 /* StorageScope.APPLICATION */);
    });
    test('Remove Data (profile)', () => {
        removeData(0 /* StorageScope.PROFILE */);
    });
    test('Remove Data (workspace)', () => {
        removeData(1 /* StorageScope.WORKSPACE */);
    });
    function removeData(scope) {
        const storageValueChangeEvents = [];
        storageService.onDidChangeValue(scope, undefined, disposables)(e => storageValueChangeEvents.push(e), undefined, disposables);
        storageService.store('test.remove', 'foobar', scope, 1 /* StorageTarget.MACHINE */);
        strictEqual('foobar', storageService.get('test.remove', scope, (undefined)));
        storageService.remove('test.remove', scope);
        ok(!storageService.get('test.remove', scope, (undefined)));
        const storageValueChangeEvent = storageValueChangeEvents.find(e => e.key === 'test.remove');
        strictEqual(storageValueChangeEvent?.scope, scope);
        strictEqual(storageValueChangeEvent?.key, 'test.remove');
    }
    test('Keys (in-memory)', () => {
        let storageTargetEvent = undefined;
        storageService.onDidChangeTarget(e => storageTargetEvent = e, undefined, disposables);
        // Empty
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                strictEqual(storageService.keys(scope, target).length, 0);
            }
        }
        let storageValueChangeEvent = undefined;
        // Add values
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            storageService.onDidChangeValue(scope, undefined, disposables)(e => storageValueChangeEvent = e, undefined, disposables);
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                storageTargetEvent = Object.create(null);
                storageValueChangeEvent = Object.create(null);
                storageService.store('test.target1', 'value1', scope, target);
                strictEqual(storageService.keys(scope, target).length, 1);
                strictEqual(storageTargetEvent?.scope, scope);
                strictEqual(storageValueChangeEvent?.key, 'test.target1');
                strictEqual(storageValueChangeEvent?.scope, scope);
                strictEqual(storageValueChangeEvent?.target, target);
                storageTargetEvent = undefined;
                storageValueChangeEvent = Object.create(null);
                storageService.store('test.target1', 'otherValue1', scope, target);
                strictEqual(storageService.keys(scope, target).length, 1);
                strictEqual(storageTargetEvent, undefined);
                strictEqual(storageValueChangeEvent?.key, 'test.target1');
                strictEqual(storageValueChangeEvent?.scope, scope);
                strictEqual(storageValueChangeEvent?.target, target);
                storageService.store('test.target2', 'value2', scope, target);
                storageService.store('test.target3', 'value3', scope, target);
                strictEqual(storageService.keys(scope, target).length, 3);
            }
        }
        // Remove values
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                const keysLength = storageService.keys(scope, target).length;
                storageService.store('test.target4', 'value1', scope, target);
                strictEqual(storageService.keys(scope, target).length, keysLength + 1);
                storageTargetEvent = Object.create(null);
                storageValueChangeEvent = Object.create(null);
                storageService.remove('test.target4', scope);
                strictEqual(storageService.keys(scope, target).length, keysLength);
                strictEqual(storageTargetEvent?.scope, scope);
                strictEqual(storageValueChangeEvent?.key, 'test.target4');
                strictEqual(storageValueChangeEvent?.scope, scope);
            }
        }
        // Remove all
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                const keys = storageService.keys(scope, target);
                for (const key of keys) {
                    storageService.remove(key, scope);
                }
                strictEqual(storageService.keys(scope, target).length, 0);
            }
        }
        // Adding undefined or null removes value
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                storageService.store('test.target1', 'value1', scope, target);
                strictEqual(storageService.keys(scope, target).length, 1);
                storageTargetEvent = Object.create(null);
                storageService.store('test.target1', undefined, scope, target);
                strictEqual(storageService.keys(scope, target).length, 0);
                strictEqual(storageTargetEvent?.scope, scope);
                storageService.store('test.target1', '', scope, target);
                strictEqual(storageService.keys(scope, target).length, 1);
                storageService.store('test.target1', null, scope, target);
                strictEqual(storageService.keys(scope, target).length, 0);
            }
        }
        // Target change
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            storageTargetEvent = undefined;
            storageService.store('test.target5', 'value1', scope, 1 /* StorageTarget.MACHINE */);
            ok(storageTargetEvent);
            storageTargetEvent = undefined;
            storageService.store('test.target5', 'value1', scope, 0 /* StorageTarget.USER */);
            ok(storageTargetEvent);
            storageTargetEvent = undefined;
            storageService.store('test.target5', 'value1', scope, 1 /* StorageTarget.MACHINE */);
            ok(storageTargetEvent);
            storageTargetEvent = undefined;
            storageService.store('test.target5', 'value1', scope, 1 /* StorageTarget.MACHINE */);
            ok(!storageTargetEvent); // no change in target
        }
    });
}
suite('StorageService (in-memory)', function () {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    createSuite({
        setup: async () => disposables.add(new InMemoryStorageService()),
        teardown: async () => { }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=storageService.test.js.map