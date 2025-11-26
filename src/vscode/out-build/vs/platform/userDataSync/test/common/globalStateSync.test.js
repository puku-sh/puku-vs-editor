/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { IFileService } from '../../../files/common/files.js';
import { IStorageService } from '../../../storage/common/storage.js';
import { IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { IUserDataSyncStoreService } from '../../common/userDataSync.js';
import { IUserDataProfileStorageService } from '../../../userDataProfile/common/userDataProfileStorageService.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('GlobalStateSync', () => {
    const server = new UserDataSyncTestServer();
    let testClient;
    let client2;
    let testObject;
    teardown(async () => {
        await testClient.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        testClient = disposableStore.add(new UserDataSyncClient(server));
        await testClient.setUp(true);
        testObject = testClient.getSynchronizer("globalState" /* SyncResource.GlobalState */);
        client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
    });
    test('when global state does not exist', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        assert.deepStrictEqual(await testObject.getLastSyncUserData(), null);
        let manifest = await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */);
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, []);
        const lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
        assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
        assert.strictEqual(lastSyncUserData.syncData, null);
        manifest = await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */);
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, []);
        manifest = await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */);
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, []);
    }));
    test('when global state is created after first sync', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        updateUserStorage('a', 'value1', testClient);
        let lastSyncUserData = await testObject.getLastSyncUserData();
        const manifest = await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */);
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, [
            { type: 'POST', url: `${server.url}/v1/resource/${testObject.resource}`, headers: { 'If-Match': lastSyncUserData?.ref } },
        ]);
        lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
        assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
        assert.deepStrictEqual(JSON.parse(lastSyncUserData.syncData.content).storage, { 'a': { version: 1, value: 'value1' } });
    }));
    test('first time sync - outgoing to server (no state)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', testClient);
        updateMachineStorage('b', 'value1', testClient);
        await updateLocale(testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { 'globalState.argv.locale': { version: 1, value: 'en' }, 'a': { version: 1, value: 'value1' } });
    }));
    test('first time sync - incoming from server (no state)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', client2);
        await updateLocale(client2);
        await client2.sync();
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value1');
        assert.strictEqual(await readLocale(testClient), 'en');
    }));
    test('first time sync when storage exists', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', client2);
        await client2.sync();
        updateUserStorage('b', 'value2', testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value1');
        assert.strictEqual(readStorage('b', testClient), 'value2');
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { 'a': { version: 1, value: 'value1' }, 'b': { version: 1, value: 'value2' } });
    }));
    test('first time sync when storage exists - has conflicts', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', client2);
        await client2.sync();
        updateUserStorage('a', 'value2', client2);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value1');
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { 'a': { version: 1, value: 'value1' } });
    }));
    test('sync adding a storage value', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        updateUserStorage('b', 'value2', testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value1');
        assert.strictEqual(readStorage('b', testClient), 'value2');
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { 'a': { version: 1, value: 'value1' }, 'b': { version: 1, value: 'value2' } });
    }));
    test('sync updating a storage value', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        updateUserStorage('a', 'value2', testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value2');
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { 'a': { version: 1, value: 'value2' } });
    }));
    test('sync removing a storage value', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', testClient);
        updateUserStorage('b', 'value2', testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        removeStorage('b', testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value1');
        assert.strictEqual(readStorage('b', testClient), undefined);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { 'a': { version: 1, value: 'value1' } });
    }));
    test('sync profile state', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
        const profile = await client2.instantiationService.get(IUserDataProfilesService).createNamedProfile('profile1');
        await updateLocale(client2);
        await updateUserStorageForProfile('a', 'value1', profile, testClient);
        await client2.sync();
        await testClient.sync();
        const syncedProfile = testClient.instantiationService.get(IUserDataProfilesService).profiles.find(p => p.id === profile.id);
        const profileStorage = await testClient.instantiationService.get(IUserDataProfileStorageService).readStorageData(syncedProfile);
        assert.strictEqual(profileStorage.get('a')?.value, 'value1');
        assert.strictEqual(await readLocale(testClient), 'en');
        const { content } = await testClient.read(testObject.resource, '1');
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { 'a': { version: 1, value: 'value1' } });
    }));
    function parseGlobalState(content) {
        const syncData = JSON.parse(content);
        return JSON.parse(syncData.content);
    }
    async function updateLocale(client) {
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'en' })));
    }
    function updateUserStorage(key, value, client, profile) {
        const storageService = client.instantiationService.get(IStorageService);
        storageService.store(key, value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    async function updateUserStorageForProfile(key, value, profile, client) {
        const storageService = client.instantiationService.get(IUserDataProfileStorageService);
        const data = new Map();
        data.set(key, value);
        await storageService.updateStorageData(profile, data, 0 /* StorageTarget.USER */);
    }
    function updateMachineStorage(key, value, client) {
        const storageService = client.instantiationService.get(IStorageService);
        storageService.store(key, value, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    function removeStorage(key, client) {
        const storageService = client.instantiationService.get(IStorageService);
        storageService.remove(key, 0 /* StorageScope.PROFILE */);
    }
    function readStorage(key, client) {
        const storageService = client.instantiationService.get(IStorageService);
        return storageService.get(key, 0 /* StorageScope.PROFILE */);
    }
    async function readLocale(client) {
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const content = await fileService.readFile(environmentService.argvResource);
        return JSON.parse(content.value.toString()).locale;
    }
});
//# sourceMappingURL=globalStateSync.test.js.map