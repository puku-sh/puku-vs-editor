"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureNoDisposablesAreLeakedInTestSuite = ensureNoDisposablesAreLeakedInTestSuite;
exports.throwIfDisposablesAreLeaked = throwIfDisposablesAreLeaked;
exports.throwIfDisposablesAreLeakedAsync = throwIfDisposablesAreLeakedAsync;
const vitest_1 = require("vitest");
const lifecycle_1 = require("../../vs/base/common/lifecycle");
/**
 * Use this function to ensure that all disposables are cleaned up at the end of each test in the current suite.
 *
 * Use `markAsSingleton` if disposable singletons are created lazily that are allowed to outlive the test.
 * Make sure that the singleton properly registers all child disposables so that they are excluded too.
 *
 * @returns A {@link DisposableStore} that can optionally be used to track disposables in the test.
 * This will be automatically disposed on test teardown.
*/
function ensureNoDisposablesAreLeakedInTestSuite() {
    let tracker;
    let store;
    (0, vitest_1.beforeEach)(() => {
        store = new lifecycle_1.DisposableStore();
        tracker = new lifecycle_1.DisposableTracker();
        (0, lifecycle_1.setDisposableTracker)(tracker);
    });
    (0, vitest_1.afterEach)(() => {
        store.clear();
        (0, lifecycle_1.setDisposableTracker)(null);
        const result = tracker.computeLeakingDisposables();
        if (result) {
            console.error(result.details);
            throw new Error(`There are ${result.leaks.length} undisposed disposables!${result.details}`);
        }
    });
    // Wrap store as the suite function is called before it's initialized
    const testContext = {
        add(o) {
            return store.add(o);
        }
    };
    return testContext;
}
function throwIfDisposablesAreLeaked(body, logToConsole = true) {
    const tracker = new lifecycle_1.DisposableTracker();
    (0, lifecycle_1.setDisposableTracker)(tracker);
    body();
    (0, lifecycle_1.setDisposableTracker)(null);
    computeLeakingDisposables(tracker, logToConsole);
}
async function throwIfDisposablesAreLeakedAsync(body) {
    const tracker = new lifecycle_1.DisposableTracker();
    (0, lifecycle_1.setDisposableTracker)(tracker);
    await body();
    (0, lifecycle_1.setDisposableTracker)(null);
    computeLeakingDisposables(tracker);
}
function computeLeakingDisposables(tracker, logToConsole = true) {
    const result = tracker.computeLeakingDisposables();
    if (result) {
        if (logToConsole) {
            console.error(result.details);
        }
        throw new Error(`There are ${result.leaks.length} undisposed disposables!${result.details}`);
    }
}
//# sourceMappingURL=testUtils.js.map