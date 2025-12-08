"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const jsonc = __importStar(require("jsonc-parser"));
const vscode = __importStar(require("vscode"));
const errors_1 = require("../../../util/vs/base/common/errors");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const objects_1 = require("../../../util/vs/base/common/objects");
const uri_1 = require("../../../util/vs/base/common/uri");
const range_1 = require("../../../util/vs/editor/common/core/range");
const offsetLineColumnConverter_1 = require("../../editing/common/offsetLineColumnConverter");
const fileSystemService_1 = require("../../filesystem/common/fileSystemService");
const languageDiagnosticsService_1 = require("../../languages/common/languageDiagnosticsService");
const logService_1 = require("../../log/common/logService");
const workspaceService_1 = require("../../workspace/common/workspaceService");
const tasksService_1 = require("../common/tasksService");
let TasksService = class TasksService extends lifecycle_1.DisposableStore {
    constructor(workspaceService, fileSystemService, languageDiagnosticsService, logService) {
        super();
        this.workspaceService = workspaceService;
        this.fileSystemService = fileSystemService;
        this.languageDiagnosticsService = languageDiagnosticsService;
        this.logService = logService;
        this.latestTerminalForTaskDefinition = new Map();
        this.add(vscode.tasks.onDidStartTask(e => {
            const terminal = e.execution.terminal;
            if (!terminal) {
                return;
            }
            this.latestTerminalForTaskDefinition.set(e.execution.task.definition, terminal);
            const closeListener = vscode.window.onDidCloseTerminal(closedTerminal => {
                if (closedTerminal === terminal && this.latestTerminalForTaskDefinition.has(e.execution.task.definition)) {
                    this.latestTerminalForTaskDefinition.delete(e.execution.task.definition);
                    closeListener.dispose();
                }
            });
            this.add(closeListener);
            const endListener = vscode.tasks.onDidEndTask(ev => {
                if (ev.execution.task.definition === e.execution.task.definition) {
                    closeListener.dispose();
                    endListener.dispose();
                }
            });
            this.add(endListener);
        }));
    }
    getTasksFromConfig(workspaceFolder) {
        const tasks = vscode.workspace.getConfiguration('tasks', workspaceFolder);
        return tasks.get('tasks') || [];
    }
    matchesTask(task, def) {
        return task.type === def.type && task.label === def.label;
    }
    hasTask(workspaceFolder, def) {
        const existingTasks = this.getTasksFromConfig(workspaceFolder);
        return existingTasks.some(t => this.matchesTask(t, def));
    }
    /**
     * This is needed because when tasks exit, they're removed from the taskExecutions, but we might want to review the output of the task
     * after it has exited. This allows us to get the terminal for a task definition.
     * @param task
     */
    getTerminalForTask(taskDefinition) {
        for (const [key, terminal] of this.latestTerminalForTaskDefinition.entries()) {
            if (key.id) {
                // Only some task definitions have IDs
                const taskId = this._getTaskId(taskDefinition);
                if (taskId === key.id) {
                    return terminal;
                }
            }
            if ((taskDefinition.type === key.type &&
                (key.label || key.script || key.command) &&
                (!key.label || taskDefinition.label === key.label) &&
                (!key.script || taskDefinition.script === key.script) &&
                (!key.command || taskDefinition.command === key.command))) {
                return terminal;
            }
            this.logService.debug(`getTerminalForTask: no terminal found for task definition: ${JSON.stringify(taskDefinition)} matching ${JSON.stringify(key)}`);
            this.logService.debug(`getTerminalForTask: current stored terminals: ${[...this.latestTerminalForTaskDefinition.values()].map(t => t.name).join(', ')}`);
        }
    }
    _getTaskId(taskDefinition) {
        if (!taskDefinition.type || (taskDefinition.command === undefined && taskDefinition.script === undefined)) {
            return undefined;
        }
        return taskDefinition.type + ',' + (taskDefinition.command ?? taskDefinition.script) + ',';
    }
    async getTaskConfigPosition(workspaceFolder, def) {
        const index = this.getTasksFromConfig(workspaceFolder).findIndex(t => this.matchesTask(t, def));
        if (index === -1) {
            return undefined;
        }
        const uri = uri_1.URI.joinPath(workspaceFolder, '.vscode', 'tasks.json');
        let text;
        try {
            const contents = await this.fileSystemService.readFile(uri);
            text = new TextDecoder().decode(contents);
        }
        catch {
            return undefined;
        }
        const root = jsonc.parseTree(text);
        if (!root) {
            return undefined;
        }
        const node = jsonc.findNodeAtLocation(root, ['tasks', index]);
        if (!node) {
            return undefined;
        }
        const convert = new offsetLineColumnConverter_1.OffsetLineColumnConverter(text);
        return {
            uri,
            range: range_1.Range.fromPositions(convert.offsetToPosition(node.offset), convert.offsetToPosition(node.offset + node.length)),
        };
    }
    async ensureTask(workspaceFolder, def, skipDefault) {
        const existingTasks = this.getTasksFromConfig(workspaceFolder);
        if (existingTasks.some(t => this.matchesTask(t, def))) {
            return;
        }
        const tasks = vscode.workspace.getConfiguration('tasks', workspaceFolder);
        await tasks.update('tasks', skipDefault ? [def] : [...existingTasks, def], vscode.ConfigurationTarget.WorkspaceFolder);
    }
    isTaskActive(task) {
        const activeTasks = vscode.tasks.taskExecutions;
        for (const a of activeTasks) {
            if (a.task.definition.type === task.type && a.task.name === task.label) {
                return true;
            }
        }
        return false;
    }
    getTasks(workspaceFolder) {
        if (workspaceFolder) {
            return this.getTasksFromConfig(workspaceFolder);
        }
        return this.workspaceService.getWorkspaceFolders()
            .map((folder) => [folder, this.getTasksFromConfig(folder)])
            .filter(([, tasks]) => tasks.length > 0);
    }
    async getBestMatchingContributedTask(def) {
        const tasks = await vscode.tasks.fetchTasks({ type: def?.type });
        let best;
        let bestOverlap = -1;
        tasks.forEach(task => {
            let currentOverlap = 0;
            for (const [key, value] of Object.entries(task.definition)) {
                if (!(0, objects_1.equals)(def[key], value)) {
                    return;
                }
                currentOverlap++;
            }
            if (currentOverlap > bestOverlap) {
                best = task;
                bestOverlap = currentOverlap;
            }
        });
        return best;
    }
    async executeTask(def, token, workspaceFolder) {
        const disposables = new lifecycle_1.DisposableStore();
        try {
            // todo@connor4312: is this really the best way to run a task definition?
            let task = await this.getBestMatchingContributedTask(def);
            if (token.isCancellationRequested) {
                throw new errors_1.CancellationError();
            }
            return await new Promise((resolve) => {
                let processExitCode;
                disposables.add(vscode.tasks.onDidEndTaskProcess(e => {
                    if (e.execution.task === task) {
                        processExitCode = e.exitCode;
                    }
                }));
                disposables.add(vscode.tasks.onDidEndTask(e => {
                    if (e.execution.task === task) {
                        if (processExitCode !== undefined && processExitCode !== 0) {
                            resolve({ status: tasksService_1.TaskStatus.Error, error: new Error(`Task exited with code ${processExitCode}`) });
                        }
                        else {
                            resolve({ status: tasksService_1.TaskStatus.Finished });
                        }
                    }
                }));
                let adopted = false;
                let execution;
                function cancel() {
                    resolve({ status: tasksService_1.TaskStatus.Error, error: new errors_1.CancellationError() });
                    if (!adopted && execution) {
                        execution.terminate(); // Only cancel non-background tasks that we started
                    }
                }
                if (!def.isBackground) {
                    disposables.add(token.onCancellationRequested(cancel));
                }
                if (task) {
                    const existing = vscode.tasks.taskExecutions.find(e => (0, objects_1.equals)(e.task.definition, task.definition));
                    adopted = !!existing;
                    Promise.resolve(existing || vscode.tasks.executeTask(task)).then(_execution => {
                        execution = _execution;
                        if (token.isCancellationRequested) {
                            cancel();
                        }
                        else if (task.isBackground) {
                            let resolved = false;
                            disposables.add(vscode.tasks.onDidEndTaskProblemMatchers(async (e) => {
                                resolved = true;
                                if (e.execution.task === task) {
                                    if (e.hasErrors) {
                                        let diagnostics = [];
                                        if (workspaceFolder) {
                                            diagnostics = this.languageDiagnosticsService.getAllDiagnostics().map(d => d[0] + ' ' + d[1].map(d => d.message).join(', '));
                                        }
                                        resolve({ status: tasksService_1.TaskStatus.Error, error: new Error('Task exited with errors in the following files: ' + diagnostics.join(', ')) });
                                    }
                                    else {
                                        resolve({ status: tasksService_1.TaskStatus.Finished });
                                    }
                                }
                            }));
                            setTimeout(() => {
                                if (!resolved) {
                                    resolve({ status: tasksService_1.TaskStatus.Started });
                                }
                            }, task?.isBackground && task.problemMatchers.length ? 10000 : 0);
                        }
                        else {
                            resolve({ status: tasksService_1.TaskStatus.Started });
                        }
                    }, (error) => resolve({ status: tasksService_1.TaskStatus.Error, error }));
                }
                else {
                    // No provided task found? Try to run by label or definition
                    // assume whatever task is next is the one that's started
                    vscode.commands.executeCommand('workbench.action.tasks.runTask', def.label || def);
                    disposables.add(vscode.tasks.onDidStartTask(e => {
                        task = e.execution.task;
                        resolve({ status: tasksService_1.TaskStatus.Started });
                    }));
                    disposables.add(vscode.tasks.onDidEndTask(e => {
                        if (e.execution.task.name === def.label) {
                            if (processExitCode !== undefined && processExitCode !== 0) {
                                resolve({ status: tasksService_1.TaskStatus.Error, error: new Error(`Task exited with code ${processExitCode}`) });
                            }
                            else {
                                resolve({ status: tasksService_1.TaskStatus.Finished });
                            }
                        }
                    }));
                }
            });
        }
        finally {
            disposables.dispose();
        }
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    __param(0, workspaceService_1.IWorkspaceService),
    __param(1, fileSystemService_1.IFileSystemService),
    __param(2, languageDiagnosticsService_1.ILanguageDiagnosticsService),
    __param(3, logService_1.ILogService)
], TasksService);
//# sourceMappingURL=tasksService.js.map