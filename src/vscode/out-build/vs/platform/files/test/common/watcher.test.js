/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { isLinux, isWindows } from '../../../../base/common/platform.js';
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { FileChangesEvent } from '../../common/files.js';
import { coalesceEvents, reviveFileChanges, parseWatcherPatterns, isFiltered } from '../../common/watcher.js';
class TestFileWatcher extends Disposable {
    constructor() {
        super();
        this._onDidFilesChange = this._register(new Emitter());
    }
    get onDidFilesChange() {
        return this._onDidFilesChange.event;
    }
    report(changes) {
        this.onRawFileEvents(changes);
    }
    onRawFileEvents(events) {
        // Coalesce
        const coalescedEvents = coalesceEvents(events);
        // Emit through event emitter
        if (coalescedEvents.length > 0) {
            this._onDidFilesChange.fire({ raw: reviveFileChanges(coalescedEvents), event: this.toFileChangesEvent(coalescedEvents) });
        }
    }
    toFileChangesEvent(changes) {
        return new FileChangesEvent(reviveFileChanges(changes), !isLinux);
    }
}
var Path;
(function (Path) {
    Path[Path["UNIX"] = 0] = "UNIX";
    Path[Path["WINDOWS"] = 1] = "WINDOWS";
    Path[Path["UNC"] = 2] = "UNC";
})(Path || (Path = {}));
suite('Watcher', () => {
    (isWindows ? test.skip : test)('parseWatcherPatterns - posix', () => {
        const path = '/users/data/src';
        let parsedPattern = parseWatcherPatterns(path, ['*.js'])[0];
        assert.strictEqual(parsedPattern('/users/data/src/foo.js'), true);
        assert.strictEqual(parsedPattern('/users/data/src/foo.ts'), false);
        assert.strictEqual(parsedPattern('/users/data/src/bar/foo.js'), false);
        parsedPattern = parseWatcherPatterns(path, ['/users/data/src/*.js'])[0];
        assert.strictEqual(parsedPattern('/users/data/src/foo.js'), true);
        assert.strictEqual(parsedPattern('/users/data/src/foo.ts'), false);
        assert.strictEqual(parsedPattern('/users/data/src/bar/foo.js'), false);
        parsedPattern = parseWatcherPatterns(path, ['/users/data/src/bar/*.js'])[0];
        assert.strictEqual(parsedPattern('/users/data/src/foo.js'), false);
        assert.strictEqual(parsedPattern('/users/data/src/foo.ts'), false);
        assert.strictEqual(parsedPattern('/users/data/src/bar/foo.js'), true);
        parsedPattern = parseWatcherPatterns(path, ['**/*.js'])[0];
        assert.strictEqual(parsedPattern('/users/data/src/foo.js'), true);
        assert.strictEqual(parsedPattern('/users/data/src/foo.ts'), false);
        assert.strictEqual(parsedPattern('/users/data/src/bar/foo.js'), true);
    });
    (!isWindows ? test.skip : test)('parseWatcherPatterns - windows', () => {
        const path = 'c:\\users\\data\\src';
        let parsedPattern = parseWatcherPatterns(path, ['*.js'])[0];
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.js'), true);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.ts'), false);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\bar/foo.js'), false);
        parsedPattern = parseWatcherPatterns(path, ['c:\\users\\data\\src\\*.js'])[0];
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.js'), true);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.ts'), false);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\bar\\foo.js'), false);
        parsedPattern = parseWatcherPatterns(path, ['c:\\users\\data\\src\\bar/*.js'])[0];
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.js'), false);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.ts'), false);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\bar\\foo.js'), true);
        parsedPattern = parseWatcherPatterns(path, ['**/*.js'])[0];
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.js'), true);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.ts'), false);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\bar\\foo.js'), true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
suite('Watcher Events Normalizer', () => {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    test('simple add/update/delete', done => {
        const watch = disposables.add(new TestFileWatcher());
        const added = URI.file('/users/data/src/added.txt');
        const updated = URI.file('/users/data/src/updated.txt');
        const deleted = URI.file('/users/data/src/deleted.txt');
        const raw = [
            { resource: added, type: 1 /* FileChangeType.ADDED */ },
            { resource: updated, type: 0 /* FileChangeType.UPDATED */ },
            { resource: deleted, type: 2 /* FileChangeType.DELETED */ },
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 3);
            assert.ok(event.contains(added, 1 /* FileChangeType.ADDED */));
            assert.ok(event.contains(updated, 0 /* FileChangeType.UPDATED */));
            assert.ok(event.contains(deleted, 2 /* FileChangeType.DELETED */));
            done();
        }));
        watch.report(raw);
    });
    (isWindows ? [Path.WINDOWS, Path.UNC] : [Path.UNIX]).forEach(path => {
        test(`delete only reported for top level folder (${path})`, done => {
            const watch = disposables.add(new TestFileWatcher());
            const deletedFolderA = URI.file(path === Path.UNIX ? '/users/data/src/todelete1' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\todelete1' : '\\\\localhost\\users\\data\\src\\todelete1');
            const deletedFolderB = URI.file(path === Path.UNIX ? '/users/data/src/todelete2' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\todelete2' : '\\\\localhost\\users\\data\\src\\todelete2');
            const deletedFolderBF1 = URI.file(path === Path.UNIX ? '/users/data/src/todelete2/file.txt' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\todelete2\\file.txt' : '\\\\localhost\\users\\data\\src\\todelete2\\file.txt');
            const deletedFolderBF2 = URI.file(path === Path.UNIX ? '/users/data/src/todelete2/more/test.txt' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\todelete2\\more\\test.txt' : '\\\\localhost\\users\\data\\src\\todelete2\\more\\test.txt');
            const deletedFolderBF3 = URI.file(path === Path.UNIX ? '/users/data/src/todelete2/super/bar/foo.txt' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\todelete2\\super\\bar\\foo.txt' : '\\\\localhost\\users\\data\\src\\todelete2\\super\\bar\\foo.txt');
            const deletedFileA = URI.file(path === Path.UNIX ? '/users/data/src/deleteme.txt' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\deleteme.txt' : '\\\\localhost\\users\\data\\src\\deleteme.txt');
            const addedFile = URI.file(path === Path.UNIX ? '/users/data/src/added.txt' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\added.txt' : '\\\\localhost\\users\\data\\src\\added.txt');
            const updatedFile = URI.file(path === Path.UNIX ? '/users/data/src/updated.txt' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\updated.txt' : '\\\\localhost\\users\\data\\src\\updated.txt');
            const raw = [
                { resource: deletedFolderA, type: 2 /* FileChangeType.DELETED */ },
                { resource: deletedFolderB, type: 2 /* FileChangeType.DELETED */ },
                { resource: deletedFolderBF1, type: 2 /* FileChangeType.DELETED */ },
                { resource: deletedFolderBF2, type: 2 /* FileChangeType.DELETED */ },
                { resource: deletedFolderBF3, type: 2 /* FileChangeType.DELETED */ },
                { resource: deletedFileA, type: 2 /* FileChangeType.DELETED */ },
                { resource: addedFile, type: 1 /* FileChangeType.ADDED */ },
                { resource: updatedFile, type: 0 /* FileChangeType.UPDATED */ }
            ];
            disposables.add(watch.onDidFilesChange(({ event, raw }) => {
                assert.ok(event);
                assert.strictEqual(raw.length, 5);
                assert.ok(event.contains(deletedFolderA, 2 /* FileChangeType.DELETED */));
                assert.ok(event.contains(deletedFolderB, 2 /* FileChangeType.DELETED */));
                assert.ok(event.contains(deletedFileA, 2 /* FileChangeType.DELETED */));
                assert.ok(event.contains(addedFile, 1 /* FileChangeType.ADDED */));
                assert.ok(event.contains(updatedFile, 0 /* FileChangeType.UPDATED */));
                done();
            }));
            watch.report(raw);
        });
    });
    test('event coalescer: ignore CREATE followed by DELETE', done => {
        const watch = disposables.add(new TestFileWatcher());
        const created = URI.file('/users/data/src/related');
        const deleted = URI.file('/users/data/src/related');
        const unrelated = URI.file('/users/data/src/unrelated');
        const raw = [
            { resource: created, type: 1 /* FileChangeType.ADDED */ },
            { resource: deleted, type: 2 /* FileChangeType.DELETED */ },
            { resource: unrelated, type: 0 /* FileChangeType.UPDATED */ },
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 1);
            assert.ok(event.contains(unrelated, 0 /* FileChangeType.UPDATED */));
            done();
        }));
        watch.report(raw);
    });
    test('event coalescer: flatten DELETE followed by CREATE into CHANGE', done => {
        const watch = disposables.add(new TestFileWatcher());
        const deleted = URI.file('/users/data/src/related');
        const created = URI.file('/users/data/src/related');
        const unrelated = URI.file('/users/data/src/unrelated');
        const raw = [
            { resource: deleted, type: 2 /* FileChangeType.DELETED */ },
            { resource: created, type: 1 /* FileChangeType.ADDED */ },
            { resource: unrelated, type: 0 /* FileChangeType.UPDATED */ },
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 2);
            assert.ok(event.contains(deleted, 0 /* FileChangeType.UPDATED */));
            assert.ok(event.contains(unrelated, 0 /* FileChangeType.UPDATED */));
            done();
        }));
        watch.report(raw);
    });
    test('event coalescer: ignore UPDATE when CREATE received', done => {
        const watch = disposables.add(new TestFileWatcher());
        const created = URI.file('/users/data/src/related');
        const updated = URI.file('/users/data/src/related');
        const unrelated = URI.file('/users/data/src/unrelated');
        const raw = [
            { resource: created, type: 1 /* FileChangeType.ADDED */ },
            { resource: updated, type: 0 /* FileChangeType.UPDATED */ },
            { resource: unrelated, type: 0 /* FileChangeType.UPDATED */ },
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 2);
            assert.ok(event.contains(created, 1 /* FileChangeType.ADDED */));
            assert.ok(!event.contains(created, 0 /* FileChangeType.UPDATED */));
            assert.ok(event.contains(unrelated, 0 /* FileChangeType.UPDATED */));
            done();
        }));
        watch.report(raw);
    });
    test('event coalescer: apply DELETE', done => {
        const watch = disposables.add(new TestFileWatcher());
        const updated = URI.file('/users/data/src/related');
        const updated2 = URI.file('/users/data/src/related');
        const deleted = URI.file('/users/data/src/related');
        const unrelated = URI.file('/users/data/src/unrelated');
        const raw = [
            { resource: updated, type: 0 /* FileChangeType.UPDATED */ },
            { resource: updated2, type: 0 /* FileChangeType.UPDATED */ },
            { resource: unrelated, type: 0 /* FileChangeType.UPDATED */ },
            { resource: updated, type: 2 /* FileChangeType.DELETED */ }
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 2);
            assert.ok(event.contains(deleted, 2 /* FileChangeType.DELETED */));
            assert.ok(!event.contains(updated, 0 /* FileChangeType.UPDATED */));
            assert.ok(event.contains(unrelated, 0 /* FileChangeType.UPDATED */));
            done();
        }));
        watch.report(raw);
    });
    test('event coalescer: track case renames', done => {
        const watch = disposables.add(new TestFileWatcher());
        const oldPath = URI.file('/users/data/src/added');
        const newPath = URI.file('/users/data/src/ADDED');
        const raw = [
            { resource: newPath, type: 1 /* FileChangeType.ADDED */ },
            { resource: oldPath, type: 2 /* FileChangeType.DELETED */ }
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 2);
            for (const r of raw) {
                if (isEqual(r.resource, oldPath)) {
                    assert.strictEqual(r.type, 2 /* FileChangeType.DELETED */);
                }
                else if (isEqual(r.resource, newPath)) {
                    assert.strictEqual(r.type, 1 /* FileChangeType.ADDED */);
                }
                else {
                    assert.fail();
                }
            }
            done();
        }));
        watch.report(raw);
    });
    test('event type filter', () => {
        const resource = URI.file('/users/data/src/related');
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, undefined), false);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, undefined), false);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, undefined), false);
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, 2 /* FileChangeFilter.UPDATED */), true);
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, 2 /* FileChangeFilter.UPDATED */ | 8 /* FileChangeFilter.DELETED */), true);
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, 4 /* FileChangeFilter.ADDED */), false);
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, 4 /* FileChangeFilter.ADDED */ | 2 /* FileChangeFilter.UPDATED */), false);
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, 4 /* FileChangeFilter.ADDED */ | 2 /* FileChangeFilter.UPDATED */ | 8 /* FileChangeFilter.DELETED */), false);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, 2 /* FileChangeFilter.UPDATED */), true);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, 2 /* FileChangeFilter.UPDATED */ | 4 /* FileChangeFilter.ADDED */), true);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, 8 /* FileChangeFilter.DELETED */), false);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, 8 /* FileChangeFilter.DELETED */ | 2 /* FileChangeFilter.UPDATED */), false);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, 4 /* FileChangeFilter.ADDED */ | 8 /* FileChangeFilter.DELETED */ | 2 /* FileChangeFilter.UPDATED */), false);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, 4 /* FileChangeFilter.ADDED */), true);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, 8 /* FileChangeFilter.DELETED */ | 4 /* FileChangeFilter.ADDED */), true);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, 2 /* FileChangeFilter.UPDATED */), false);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, 8 /* FileChangeFilter.DELETED */ | 2 /* FileChangeFilter.UPDATED */), false);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, 4 /* FileChangeFilter.ADDED */ | 8 /* FileChangeFilter.DELETED */ | 2 /* FileChangeFilter.UPDATED */), false);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=watcher.test.js.map