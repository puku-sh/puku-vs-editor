"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRunner = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class CTask {
    constructor(_execute) {
        this._execute = _execute;
        this.result = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
    async execute() {
        try {
            const result = await this._execute();
            this.resolve(result);
        }
        catch (err) {
            this.reject(err);
        }
    }
}
class TaskRunner {
    // private waitPromise: Promise<void> | undefined;
    constructor(parallelism) {
        this.parallelism = parallelism;
        this.tasks = [];
        this.pendingTasks = 0;
    }
    run(task) {
        if (!(task instanceof CTask)) {
            task = new CTask(task);
        }
        this.tasks.push(task);
        this.launchTaskIfPossible();
        return task.result;
    }
    launchTaskIfPossible() {
        if (this.tasks.length === 0) {
            // all tasks completed
            return;
        }
        if (this.pendingTasks >= this.parallelism) {
            // too many tasks running
            return;
        }
        const task = this.tasks.shift();
        this.pendingTasks++;
        task.execute().then(() => this.onDidCompleteTask(), () => this.onDidCompleteTask());
    }
    onDidCompleteTask() {
        this.pendingTasks--;
        this.launchTaskIfPossible();
        if (this.pendingTasks === 0) {
            // all tasks completed
            // this.waitPromise = undefined;
            this.waitResolve?.();
        }
    }
    async waitForCompletion() {
        throw new Error('not implemented');
        // if (!this.waitPromise) {
        // 	this.waitPromise = new Promise<void>(resolve => this.waitResolve = resolve);
        // }
        // // for (let i = 0; i < this.parallelism; i++) {
        // // 	this.launchTaskIfPossible();
        // // }
        // return this.waitPromise;
    }
}
exports.TaskRunner = TaskRunner;
//# sourceMappingURL=taskRunner.js.map