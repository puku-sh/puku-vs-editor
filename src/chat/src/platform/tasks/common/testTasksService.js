"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestTasksService = void 0;
const tasksService_1 = require("./tasksService");
class TestTasksService {
    async ensureTask() {
        // No-op for stub
    }
    hasTask() {
        return false;
    }
    getTasks() {
        return [];
    }
    getTaskConfigPosition() {
        return Promise.resolve(undefined);
    }
    async executeTask(def, token, workspaceFolder) {
        return {
            status: tasksService_1.TaskStatus.Error,
            error: new Error(`Task not found: ${def.type}:${def.label}`)
        };
    }
    isTaskActive(def) {
        return false;
    }
    getTerminalForTask(task) {
        // Return a mock terminal with a defined processId for testing
        return {
            name: task.label || 'mock-terminal',
            processId: Promise.resolve(12345),
            // Add any other properties/methods as needed for your tests
        };
    }
}
exports.TestTasksService = TestTasksService;
//# sourceMappingURL=testTasksService.js.map