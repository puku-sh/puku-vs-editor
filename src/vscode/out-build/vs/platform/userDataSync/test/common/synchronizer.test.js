/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Barrier } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { isEqual, joinPath } from '../../../../base/common/resources.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IFileService } from '../../../files/common/files.js';
import { IStorageService } from '../../../storage/common/storage.js';
import { IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { AbstractSynchroniser } from '../../common/abstractSynchronizer.js';
import { IUserDataSyncStoreService, USER_DATA_SYNC_SCHEME } from '../../common/userDataSync.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
class TestSynchroniser extends AbstractSynchroniser {
    constructor() {
        super(...arguments);
        this.syncBarrier = new Barrier();
        this.syncResult = { hasConflicts: false, hasError: false };
        this.onDoSyncCall = this._register(new Emitter());
        this.failWhenGettingLatestRemoteUserData = false;
        this.version = 1;
        this.cancelled = false;
        this.localResource = joinPath(this.environmentService.userRoamingDataHome, 'testResource.json');
        this.onDidTriggerLocalChangeCall = this._register(new Emitter());
    }
    getMachineId() { return this.currentMachineIdPromise; }
    getLastSyncResource() { return this.lastSyncResource; }
    getLatestRemoteUserData(refOrLatestData, lastSyncUserData) {
        if (this.failWhenGettingLatestRemoteUserData) {
            throw new Error();
        }
        return super.getLatestRemoteUserData(refOrLatestData, lastSyncUserData);
    }
    async doSync(remoteUserData, lastSyncUserData, strategy, userDataSyncConfiguration) {
        this.cancelled = false;
        this.onDoSyncCall.fire();
        await this.syncBarrier.wait();
        if (this.cancelled) {
            return "idle" /* SyncStatus.Idle */;
        }
        return super.doSync(remoteUserData, lastSyncUserData, strategy, userDataSyncConfiguration);
    }
    async generateSyncPreview(remoteUserData) {
        if (this.syncResult.hasError) {
            throw new Error('failed');
        }
        let fileContent = null;
        try {
            fileContent = await this.fileService.readFile(this.localResource);
        }
        catch (error) { }
        return [{
                baseResource: this.localResource.with(({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' })),
                baseContent: null,
                localResource: this.localResource,
                localContent: fileContent ? fileContent.value.toString() : null,
                remoteResource: this.localResource.with(({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' })),
                remoteContent: remoteUserData.syncData ? remoteUserData.syncData.content : null,
                previewResource: this.localResource.with(({ scheme: USER_DATA_SYNC_SCHEME, authority: 'preview' })),
                ref: remoteUserData.ref,
                localChange: 2 /* Change.Modified */,
                remoteChange: 2 /* Change.Modified */,
                acceptedResource: this.localResource.with(({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' })),
            }];
    }
    async hasRemoteChanged(lastSyncUserData) {
        return true;
    }
    async getMergeResult(resourcePreview, token) {
        return {
            content: resourcePreview.ref,
            localChange: 2 /* Change.Modified */,
            remoteChange: 2 /* Change.Modified */,
            hasConflicts: this.syncResult.hasConflicts,
        };
    }
    async getAcceptResult(resourcePreview, resource, content, token) {
        if (isEqual(resource, resourcePreview.localResource)) {
            return {
                content: resourcePreview.localContent,
                localChange: 0 /* Change.None */,
                remoteChange: resourcePreview.localContent === null ? 3 /* Change.Deleted */ : 2 /* Change.Modified */,
            };
        }
        if (isEqual(resource, resourcePreview.remoteResource)) {
            return {
                content: resourcePreview.remoteContent,
                localChange: resourcePreview.remoteContent === null ? 3 /* Change.Deleted */ : 2 /* Change.Modified */,
                remoteChange: 0 /* Change.None */,
            };
        }
        if (isEqual(resource, resourcePreview.previewResource)) {
            if (content === undefined) {
                return {
                    content: resourcePreview.ref,
                    localChange: 2 /* Change.Modified */,
                    remoteChange: 2 /* Change.Modified */,
                };
            }
            else {
                return {
                    content,
                    localChange: content === null ? resourcePreview.localContent !== null ? 3 /* Change.Deleted */ : 0 /* Change.None */ : 2 /* Change.Modified */,
                    remoteChange: content === null ? resourcePreview.remoteContent !== null ? 3 /* Change.Deleted */ : 0 /* Change.None */ : 2 /* Change.Modified */,
                };
            }
        }
        throw new Error(`Invalid Resource: ${resource.toString()}`);
    }
    async applyResult(remoteUserData, lastSyncUserData, resourcePreviews, force) {
        if (resourcePreviews[0][1].localChange === 3 /* Change.Deleted */) {
            await this.fileService.del(this.localResource);
        }
        if (resourcePreviews[0][1].localChange === 1 /* Change.Added */ || resourcePreviews[0][1].localChange === 2 /* Change.Modified */) {
            await this.fileService.writeFile(this.localResource, VSBuffer.fromString(resourcePreviews[0][1].content));
        }
        if (resourcePreviews[0][1].remoteChange === 3 /* Change.Deleted */) {
            await this.applyRef(null, remoteUserData.ref);
        }
        if (resourcePreviews[0][1].remoteChange === 1 /* Change.Added */ || resourcePreviews[0][1].remoteChange === 2 /* Change.Modified */) {
            await this.applyRef(resourcePreviews[0][1].content, remoteUserData.ref);
        }
    }
    async applyRef(content, ref) {
        const remoteUserData = await this.updateRemoteUserData(content === null ? '' : content, ref);
        await this.updateLastSyncUserData(remoteUserData);
    }
    async stop() {
        this.cancelled = true;
        this.syncBarrier.open();
        super.stop();
    }
    testTriggerLocalChange() {
        this.triggerLocalChange();
    }
    async doTriggerLocalChange() {
        await super.doTriggerLocalChange();
        this.onDidTriggerLocalChangeCall.fire();
    }
    hasLocalData() { throw new Error('not implemented'); }
    async resolveContent(uri) { return null; }
}
suite('TestSynchronizer - Auto Sync', () => {
    const server = new UserDataSyncTestServer();
    let client;
    teardown(async () => {
        await client.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        client = disposableStore.add(new UserDataSyncClient(server));
        await client.setUp();
    });
    test('status is syncing', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            const actual = [];
            disposableStore.add(testObject.onDidChangeStatus(status => actual.push(status)));
            const promise = Event.toPromise(testObject.onDoSyncCall.event);
            testObject.sync(await client.getLatestRef(testObject.resource));
            await promise;
            assert.deepStrictEqual(actual, ["syncing" /* SyncStatus.Syncing */]);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            testObject.stop();
        });
    });
    test('status is set correctly when sync is finished', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            const actual = [];
            disposableStore.add(testObject.onDidChangeStatus(status => actual.push(status)));
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(actual, ["syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */]);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        });
    });
    test('status is set correctly when sync has errors', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasError: true, hasConflicts: false };
            testObject.syncBarrier.open();
            const actual = [];
            disposableStore.add(testObject.onDidChangeStatus(status => actual.push(status)));
            try {
                await testObject.sync(await client.getLatestRef(testObject.resource));
                assert.fail('Should fail');
            }
            catch (e) {
                assert.deepStrictEqual(actual, ["syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */]);
                assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            }
        });
    });
    test('status is set to hasConflicts when asked to sync if there are conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            assertConflicts(testObject.conflicts.conflicts, [testObject.localResource]);
        });
    });
    test('sync should not run if syncing already', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            const promise = Event.toPromise(testObject.onDoSyncCall.event);
            testObject.sync(await client.getLatestRef(testObject.resource));
            await promise;
            const actual = [];
            disposableStore.add(testObject.onDidChangeStatus(status => actual.push(status)));
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(actual, []);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            await testObject.stop();
        });
    });
    test('sync should not run if there are conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const actual = [];
            disposableStore.add(testObject.onDidChangeStatus(status => actual.push(status)));
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(actual, []);
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        });
    });
    test('accept preview during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const fileService = client.instantiationService.get(IFileService);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, (await fileService.readFile(testObject.localResource)).value.toString());
        });
    });
    test('accept remote during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const fileService = client.instantiationService.get(IFileService);
            const currentRemoteContent = (await testObject.getRemoteUserData(null)).syncData?.content;
            const newLocalContent = 'conflict';
            await fileService.writeFile(testObject.localResource, VSBuffer.fromString(newLocalContent));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, currentRemoteContent);
            assert.strictEqual((await fileService.readFile(testObject.localResource)).value.toString(), currentRemoteContent);
        });
    });
    test('accept local during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const fileService = client.instantiationService.get(IFileService);
            const newLocalContent = 'conflict';
            await fileService.writeFile(testObject.localResource, VSBuffer.fromString(newLocalContent));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].localResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, newLocalContent);
            assert.strictEqual((await fileService.readFile(testObject.localResource)).value.toString(), newLocalContent);
        });
    });
    test('accept new content during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const fileService = client.instantiationService.get(IFileService);
            const newLocalContent = 'conflict';
            await fileService.writeFile(testObject.localResource, VSBuffer.fromString(newLocalContent));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            const mergeContent = 'newContent';
            await testObject.accept(testObject.conflicts.conflicts[0].previewResource, mergeContent);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, mergeContent);
            assert.strictEqual((await fileService.readFile(testObject.localResource)).value.toString(), mergeContent);
        });
    });
    test('accept delete during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const fileService = client.instantiationService.get(IFileService);
            const newLocalContent = 'conflict';
            await fileService.writeFile(testObject.localResource, VSBuffer.fromString(newLocalContent));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].previewResource, null);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, '');
            assert.ok(!(await fileService.exists(testObject.localResource)));
        });
    });
    test('accept deleted local during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const fileService = client.instantiationService.get(IFileService);
            await fileService.del(testObject.localResource);
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].localResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, '');
            assert.ok(!(await fileService.exists(testObject.localResource)));
        });
    });
    test('accept deleted remote during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            const fileService = client.instantiationService.get(IFileService);
            await fileService.writeFile(testObject.localResource, VSBuffer.fromString('some content'));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData, null);
            assert.ok(!(await fileService.exists(testObject.localResource)));
        });
    });
    test('request latest data on precondition failure', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            // Sync once
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            testObject.syncBarrier = new Barrier();
            // update remote data before syncing so that 412 is thrown by server
            const disposable = testObject.onDoSyncCall.event(async () => {
                disposable.dispose();
                await testObject.applyRef(ref, ref);
                server.reset();
                testObject.syncBarrier.open();
            });
            // Start sycing
            const ref = await client.getLatestRef(testObject.resource);
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(server.requests, [
                { type: 'POST', url: `${server.url}/v1/resource/${testObject.resource}`, headers: { 'If-Match': ref } },
                { type: 'GET', url: `${server.url}/v1/resource/${testObject.resource}/latest`, headers: {} },
                { type: 'POST', url: `${server.url}/v1/resource/${testObject.resource}`, headers: { 'If-Match': `${parseInt(ref) + 1}` } },
            ]);
        });
    });
    test('no requests are made to server when local change is triggered', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            server.reset();
            const promise = Event.toPromise(testObject.onDidTriggerLocalChangeCall.event);
            testObject.testTriggerLocalChange();
            await promise;
            assert.deepStrictEqual(server.requests, []);
        });
    });
    test('status is reset when getting latest remote data fails', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.failWhenGettingLatestRemoteUserData = true;
            try {
                await testObject.sync(await client.getLatestRef(testObject.resource));
                assert.fail('Should throw an error');
            }
            catch (error) {
            }
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        });
    });
});
suite('TestSynchronizer - Manual Sync', () => {
    const server = new UserDataSyncTestServer();
    let client;
    teardown(async () => {
        await client.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        client = disposableStore.add(new UserDataSyncClient(server));
        await client.setUp();
    });
    test('preview', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            const preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preview -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.accept(preview.resourcePreviews[0].localResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preview -> merge -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const ref = await client.getLatestRef(testObject.resource);
            let preview = await testObject.sync(ref, true);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, ref);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), ref);
        });
    });
    test('preview -> accept -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const ref = await client.getLatestRef(testObject.resource);
            let preview = await testObject.sync(ref, true);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, ref);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), ref);
        });
    });
    test('preivew -> discard', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "preview" /* MergeState.Preview */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preivew -> discard -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preivew -> accept -> discard -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preivew -> accept -> discard', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "preview" /* MergeState.Preview */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preivew -> discard -> accept -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const expectedContent = (await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].localResource);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, expectedContent);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), expectedContent);
        });
    });
    test('conflicts: preview', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            const preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "conflict" /* MergeState.Conflict */);
            assertConflicts(testObject.conflicts.conflicts, [preview.resourcePreviews[0].localResource]);
        });
    });
    test('conflicts: preview -> discard', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            const preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            await testObject.discard(preview.resourcePreviews[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "preview" /* MergeState.Preview */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preview -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            const content = await testObject.resolveContent(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource, content);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preview -> accept 2', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            const content = await testObject.resolveContent(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource, content);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preview -> accept -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            const ref = await client.getLatestRef(testObject.resource);
            let preview = await testObject.sync(ref, true);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, ref);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), ref);
        });
    });
    test('conflicts: preivew -> discard', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "preview" /* MergeState.Preview */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preivew -> discard -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preivew -> accept -> discard -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preivew -> accept -> discard', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "preview" /* MergeState.Preview */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preivew -> discard -> accept -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const expectedContent = (await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].localResource);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, expectedContent);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), expectedContent);
        });
    });
    test('conflicts: preivew -> accept -> discard -> accept -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const expectedContent = (await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].localResource);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, expectedContent);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), expectedContent);
        });
    });
    test('remote is accepted if last sync state does not exists in server', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp();
            const synchronizer2 = disposableStore.add(client2.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client2.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            synchronizer2.syncBarrier.open();
            const ref = await client2.getLatestRef(testObject.resource);
            await synchronizer2.sync(ref);
            await fileService.del(testObject.getLastSyncResource());
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), ref);
        });
    });
});
suite('TestSynchronizer - Last Sync Data', () => {
    const server = new UserDataSyncTestServer();
    let client;
    teardown(async () => {
        await client.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        client = disposableStore.add(new UserDataSyncClient(server));
        await client.setUp();
    });
    test('last sync data is null when not synced before', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            const actual = await testObject.getLastSyncUserData();
            assert.strictEqual(actual, null);
        });
    });
    test('last sync data is set after sync', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const machineId = await testObject.getMachineId();
            const actual = await testObject.getLastSyncUserData();
            assert.deepStrictEqual(storageService.get('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */), JSON.stringify({ ref: '1' }));
            assert.deepStrictEqual(JSON.parse((await fileService.readFile(testObject.getLastSyncResource())).value.toString()), { ref: '1', syncData: { version: 1, machineId, content: '0' } });
            assert.deepStrictEqual(actual, {
                ref: '1',
                syncData: {
                    content: '0',
                    machineId,
                    version: 1
                },
            });
        });
    });
    test('last sync data is read from server after sync if last sync resource is deleted', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const machineId = await testObject.getMachineId();
            await fileService.del(testObject.getLastSyncResource());
            const actual = await testObject.getLastSyncUserData();
            assert.deepStrictEqual(storageService.get('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */), JSON.stringify({ ref: '1' }));
            assert.deepStrictEqual(actual, {
                ref: '1',
                syncData: {
                    content: '0',
                    machineId,
                    version: 1
                },
            });
        });
    });
    test('last sync data is read from server after sync and sync data is invalid', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const machineId = await testObject.getMachineId();
            await fileService.writeFile(testObject.getLastSyncResource(), VSBuffer.fromString(JSON.stringify({
                ref: '1',
                version: 1,
                content: JSON.stringify({
                    content: '0',
                    machineId,
                    version: 1
                }),
                additionalData: {
                    foo: 'bar'
                }
            })));
            server.reset();
            const actual = await testObject.getLastSyncUserData();
            assert.deepStrictEqual(storageService.get('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */), JSON.stringify({ ref: '1' }));
            assert.deepStrictEqual(actual, {
                ref: '1',
                syncData: {
                    content: '0',
                    machineId,
                    version: 1
                },
            });
            assert.deepStrictEqual(server.requests, [{ headers: {}, type: 'GET', url: 'http://host:3000/v1/resource/settings/1' }]);
        });
    });
    test('last sync data is read from server after sync and stored sync data is tampered', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const machineId = await testObject.getMachineId();
            await fileService.writeFile(testObject.getLastSyncResource(), VSBuffer.fromString(JSON.stringify({
                ref: '2',
                syncData: {
                    content: '0',
                    machineId,
                    version: 1
                }
            })));
            server.reset();
            const actual = await testObject.getLastSyncUserData();
            assert.deepStrictEqual(storageService.get('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */), JSON.stringify({ ref: '1' }));
            assert.deepStrictEqual(actual, {
                ref: '1',
                syncData: {
                    content: '0',
                    machineId,
                    version: 1
                }
            });
            assert.deepStrictEqual(server.requests, [{ headers: {}, type: 'GET', url: 'http://host:3000/v1/resource/settings/1' }]);
        });
    });
    test('reading last sync data: no requests are made to server when sync data is invalid', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const machineId = await testObject.getMachineId();
            await fileService.writeFile(testObject.getLastSyncResource(), VSBuffer.fromString(JSON.stringify({
                ref: '1',
                version: 1,
                content: JSON.stringify({
                    content: '0',
                    machineId,
                    version: 1
                }),
                additionalData: {
                    foo: 'bar'
                }
            })));
            await testObject.getLastSyncUserData();
            server.reset();
            await testObject.getLastSyncUserData();
            assert.deepStrictEqual(server.requests, []);
        });
    });
    test('reading last sync data: no requests are made to server when sync data is null', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            server.reset();
            await fileService.writeFile(testObject.getLastSyncResource(), VSBuffer.fromString(JSON.stringify({
                ref: '1',
                syncData: null,
            })));
            await testObject.getLastSyncUserData();
            assert.deepStrictEqual(server.requests, []);
        });
    });
    test('last sync data is null after sync if last sync state is deleted', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            storageService.remove('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */);
            const actual = await testObject.getLastSyncUserData();
            assert.strictEqual(actual, null);
        });
    });
    test('last sync data is null after sync if last sync content is deleted everywhere', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const fileService = client.instantiationService.get(IFileService);
            const userDataSyncStoreService = client.instantiationService.get(IUserDataSyncStoreService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            await fileService.del(testObject.getLastSyncResource());
            await userDataSyncStoreService.deleteResource(testObject.syncResource.syncResource, null);
            const actual = await testObject.getLastSyncUserData();
            assert.deepStrictEqual(storageService.get('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */), JSON.stringify({ ref: '1' }));
            assert.strictEqual(actual, null);
        });
    });
});
function assertConflicts(actual, expected) {
    assert.deepStrictEqual(actual.map(({ localResource }) => localResource.toString()), expected.map(uri => uri.toString()));
}
function assertPreviews(actual, expected) {
    assert.deepStrictEqual(actual.map(({ localResource }) => localResource.toString()), expected.map(uri => uri.toString()));
}
//# sourceMappingURL=synchronizer.test.js.map