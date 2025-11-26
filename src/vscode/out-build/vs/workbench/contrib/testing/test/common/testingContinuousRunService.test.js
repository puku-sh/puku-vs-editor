/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { mock, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { TestingContinuousRunService } from '../../common/testingContinuousRunService.js';
suite('TestingContinuousRunService', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    let testService;
    let cr;
    const profile1 = { profileId: 1, controllerId: 'ctrl', group: 2 /* TestRunProfileBitset.Run */, label: 'label', supportsContinuousRun: true, isDefault: false, hasConfigurationHandler: true, tag: null };
    const profile2 = { profileId: 2, controllerId: 'ctrl', group: 2 /* TestRunProfileBitset.Run */, label: 'label', supportsContinuousRun: true, isDefault: false, hasConfigurationHandler: true, tag: null };
    class MockTestService extends mock() {
        constructor() {
            super(...arguments);
            this.requests = new Set();
            this.log = [];
        }
        startContinuousRun(req, token) {
            this.requests.add(req);
            this.log.push(['start', req.targets[0].profileId, req.targets[0].testIds]);
            ds.add(token.onCancellationRequested(() => {
                this.log.push(['stop', req.targets[0].profileId, req.targets[0].testIds]);
                this.requests.delete(req);
            }));
            return Promise.resolve();
        }
    }
    class MockProfilesService extends mock() {
        constructor() {
            super(...arguments);
            this.didChangeEmitter = ds.add(new Emitter());
            this.onDidChange = this.didChangeEmitter.event;
        }
        getGroupDefaultProfiles(group, controllerId) {
            return [];
        }
    }
    setup(() => {
        testService = new MockTestService();
        cr = ds.add(new TestingContinuousRunService(testService, ds.add(new TestStorageService()), ds.add(new MockContextKeyService()), new MockProfilesService()));
    });
    test('isSpecificallyEnabledFor', () => {
        assert.strictEqual(cr.isEnabled(), false);
        assert.strictEqual(cr.isSpecificallyEnabledFor('testId'), false);
        cr.start([profile1], 'testId\0child');
        assert.strictEqual(cr.isSpecificallyEnabledFor('testId'), false);
        assert.strictEqual(cr.isSpecificallyEnabledFor('testId\0child'), true);
        assert.deepStrictEqual(testService.log, [
            ['start', 1, ['testId\0child']],
        ]);
    });
    test('isEnabledForAParentOf', () => {
        assert.strictEqual(cr.isEnabled(), false);
        assert.strictEqual(cr.isEnabledForAParentOf('testId'), false);
        cr.start([profile1], 'parentTestId\0testId');
        assert.strictEqual(cr.isEnabledForAParentOf('parentTestId'), false);
        assert.strictEqual(cr.isEnabledForAParentOf('parentTestId\0testId'), true);
        assert.strictEqual(cr.isEnabledForAParentOf('parentTestId\0testId\0nestd'), true);
        assert.strictEqual(cr.isEnabled(), true);
        assert.deepStrictEqual(testService.log, [
            ['start', 1, ['parentTestId\0testId']],
        ]);
    });
    test('isEnabledForAChildOf', () => {
        assert.strictEqual(cr.isEnabled(), false);
        assert.strictEqual(cr.isEnabledForAChildOf('testId'), false);
        cr.start([profile1], 'testId\0childTestId');
        assert.strictEqual(cr.isEnabledForAChildOf('testId'), true);
        assert.strictEqual(cr.isEnabledForAChildOf('testId\0childTestId'), true);
        assert.strictEqual(cr.isEnabledForAChildOf('testId\0childTestId\0neested'), false);
        assert.strictEqual(cr.isEnabled(), true);
    });
    suite('lifecycle', () => {
        test('stops general in DFS order', () => {
            cr.start([profile1], 'a\0b\0c\0d');
            cr.start([profile1], 'a\0b');
            cr.start([profile1], 'a\0b\0c');
            cr.stop();
            assert.deepStrictEqual(testService.log, [
                ['start', 1, ['a\0b\0c\0d']],
                ['start', 1, ['a\0b']],
                ['start', 1, ['a\0b\0c']],
                ['stop', 1, ['a\0b\0c\0d']],
                ['stop', 1, ['a\0b\0c']],
                ['stop', 1, ['a\0b']],
            ]);
            assert.strictEqual(cr.isEnabled(), false);
        });
        test('stops profiles in DFS order', () => {
            cr.start([profile1], 'a\0b\0c\0d');
            cr.start([profile1], 'a\0b');
            cr.start([profile1], 'a\0b\0c');
            cr.stopProfile(profile1);
            assert.deepStrictEqual(testService.log, [
                ['start', 1, ['a\0b\0c\0d']],
                ['start', 1, ['a\0b']],
                ['start', 1, ['a\0b\0c']],
                ['stop', 1, ['a\0b\0c\0d']],
                ['stop', 1, ['a\0b\0c']],
                ['stop', 1, ['a\0b']],
            ]);
            assert.strictEqual(cr.isEnabled(), false);
        });
        test('updates profile for a test if profile is changed', () => {
            cr.start([profile1], 'parent\0testId');
            cr.start([profile2], 'parent\0testId');
            assert.strictEqual(cr.isEnabled(), true);
            cr.stop();
            assert.strictEqual(cr.isEnabled(), false);
            assert.deepStrictEqual(testService.log, [
                ['start', 1, ['parent\0testId']],
                ['start', 2, ['parent\0testId']],
                ['stop', 1, ['parent\0testId']],
                ['stop', 2, ['parent\0testId']],
            ]);
            assert.strictEqual(cr.isEnabled(), false);
        });
        test('stops a single profile test', () => {
            cr.start([profile1, profile2], 'parent\0testId');
            cr.stopProfile(profile1);
            assert.deepStrictEqual(testService.log, [
                ['start', 1, ['parent\0testId']],
                ['start', 2, ['parent\0testId']],
                ['stop', 1, ['parent\0testId']],
            ]);
            assert.strictEqual(cr.isEnabled(), true);
            cr.stopProfile(profile2);
            assert.deepStrictEqual(testService.log, [
                ['start', 1, ['parent\0testId']],
                ['start', 2, ['parent\0testId']],
                ['stop', 1, ['parent\0testId']],
                ['stop', 2, ['parent\0testId']],
            ]);
            assert.strictEqual(cr.isEnabled(), false);
        });
    });
});
//# sourceMappingURL=testingContinuousRunService.test.js.map