"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const lifecycle_1 = require("../../vs/base/common/lifecycle");
const testUtils_1 = require("./testUtils");
(0, vitest_1.describe)('testUtils', () => {
    (0, vitest_1.describe)('throwIfDisposablesAreLeaked', () => {
        (0, vitest_1.it)('should not throw when no disposables are leaked', () => {
            (0, vitest_1.expect)(() => {
                (0, testUtils_1.throwIfDisposablesAreLeaked)(() => {
                    // Create and properly dispose a disposable
                    const store = new lifecycle_1.DisposableStore();
                    store.add({ dispose: () => { } });
                    store.dispose();
                });
            }).not.toThrow();
        });
        (0, vitest_1.it)('should throw when disposables are leaked', () => {
            // suppress the console.error when it expectedly fails
            const consoleSpy = vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
            try {
                (0, vitest_1.expect)(() => {
                    (0, testUtils_1.throwIfDisposablesAreLeaked)(() => {
                        // Create a disposable but don't dispose it
                        const store = new lifecycle_1.DisposableStore();
                        store.add({ dispose: () => { } });
                        // Don't call store.dispose()
                    });
                }).toThrow(/There are \d+ undisposed disposables!/);
            }
            finally {
                consoleSpy.mockRestore();
            }
        });
    });
    (0, vitest_1.describe)('throwIfDisposablesAreLeakedAsync', () => {
        (0, vitest_1.it)('should not throw when no disposables are leaked in async context', async () => {
            await (0, vitest_1.expect)((0, testUtils_1.throwIfDisposablesAreLeakedAsync)(async () => {
                const store = new lifecycle_1.DisposableStore();
                store.add({ dispose: () => { } });
                store.dispose();
            })).resolves.not.toThrow();
        });
        (0, vitest_1.it)('should throw when disposables are leaked in async context', async () => {
            // suppress the console.error when it expectedly fails
            const consoleSpy = vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
            try {
                await (0, vitest_1.expect)((0, testUtils_1.throwIfDisposablesAreLeakedAsync)(async () => {
                    const store = new lifecycle_1.DisposableStore();
                    store.add({ dispose: () => { } });
                    // Don't dispose
                })).rejects.toThrow(/There are \d+ undisposed disposables!/);
            }
            finally {
                consoleSpy.mockRestore();
            }
        });
        (0, vitest_1.it)('should work with async operations', async () => {
            await (0, vitest_1.expect)((0, testUtils_1.throwIfDisposablesAreLeakedAsync)(async () => {
                const store = new lifecycle_1.DisposableStore();
                store.add({ dispose: () => { } });
                // Simulate async work
                await new Promise(resolve => setTimeout(resolve, 1));
                store.dispose();
            })).resolves.not.toThrow();
        });
    });
});
//# sourceMappingURL=testUtils.spec.js.map