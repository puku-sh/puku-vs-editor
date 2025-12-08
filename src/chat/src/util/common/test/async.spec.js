"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sinon_1 = __importDefault(require("sinon"));
const async_1 = require("../async");
const vitest_1 = require("vitest");
const errors_1 = require("../../vs/base/common/errors");
(0, vitest_1.describe)('TaskQueue', () => {
    let taskQueue;
    (0, vitest_1.beforeEach)(() => {
        taskQueue = new async_1.TaskQueue();
    });
    (0, vitest_1.it)('should schedule and run a single task', async () => {
        const task = sinon_1.default.stub().resolves('result');
        const result = await taskQueue.schedule(task);
        sinon_1.default.assert.calledOnce(task);
        vitest_1.assert.strictEqual(result, 'result');
    });
    (0, vitest_1.it)('should schedule and run multiple tasks in order', async () => {
        const results = [];
        const task1 = sinon_1.default.stub().callsFake(async () => { results.push('task1'); });
        const task2 = sinon_1.default.stub().callsFake(async () => { results.push('task2'); });
        await taskQueue.schedule(task1);
        await taskQueue.schedule(task2);
        sinon_1.default.assert.callOrder(task1, task2);
        vitest_1.assert.deepStrictEqual(results, ['task1', 'task2']);
    });
    (0, vitest_1.it)('should clear pending tasks', async () => {
        try {
            const task1 = sinon_1.default.stub().resolves('task1');
            const task2 = sinon_1.default.stub().resolves('task2');
            const p1 = taskQueue.schedule(task1);
            const p2 = taskQueue.schedule(task2);
            taskQueue.clearPending();
            sinon_1.default.assert.calledOnce(task1);
            sinon_1.default.assert.notCalled(task2);
            await p1;
            await p2;
        }
        catch (e) {
            if (!(0, errors_1.isCancellationError)(e)) {
                throw e;
            }
        }
    });
});
//# sourceMappingURL=async.spec.js.map