/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { timeout } from '../../../../../../../base/common/async.js';
import { localize } from '../../../../../../../nls.js';
import { ITelemetryService } from '../../../../../../../platform/telemetry/common/telemetry.js';
import { ToolDataSource } from '../../../../../chat/common/languageModelToolsService.js';
import { ITaskService, TasksAvailableContext } from '../../../../../tasks/common/taskService.js';
import { ITerminalService } from '../../../../../terminal/browser/terminal.js';
import { collectTerminalResults, getTaskDefinition, getTaskForTool, resolveDependencyTasks, tasksMatch } from '../../taskHelpers.js';
import { MarkdownString } from '../../../../../../../base/common/htmlContent.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { Codicon } from '../../../../../../../base/common/codicons.js';
import { toolResultDetailsFromResponse, toolResultMessageFromResponse } from './taskHelpers.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { DisposableStore } from '../../../../../../../base/common/lifecycle.js';
let RunTaskTool = class RunTaskTool {
    constructor(_tasksService, _telemetryService, _terminalService, _configurationService, _instantiationService) {
        this._tasksService = _tasksService;
        this._telemetryService = _telemetryService;
        this._terminalService = _terminalService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const args = invocation.parameters;
        if (!invocation.context) {
            return { content: [{ kind: 'text', value: `No invocation context` }], toolResultMessage: `No invocation context` };
        }
        const taskDefinition = getTaskDefinition(args.id);
        const task = await getTaskForTool(args.id, taskDefinition, args.workspaceFolder, this._configurationService, this._tasksService, true);
        if (!task) {
            return { content: [{ kind: 'text', value: `Task not found: ${args.id}` }], toolResultMessage: new MarkdownString(localize(13178, null, args.id)) };
        }
        const taskLabel = task._label;
        const activeTasks = await this._tasksService.getActiveTasks();
        if (activeTasks.includes(task)) {
            return { content: [{ kind: 'text', value: `The task ${taskLabel} is already running.` }], toolResultMessage: new MarkdownString(localize(13179, null, taskLabel)) };
        }
        const raceResult = await Promise.race([this._tasksService.run(task, undefined, 5 /* TaskRunSource.ChatAgent */), timeout(3000)]);
        const result = raceResult && typeof raceResult === 'object' ? raceResult : undefined;
        const dependencyTasks = await resolveDependencyTasks(task, args.workspaceFolder, this._configurationService, this._tasksService);
        const resources = this._tasksService.getTerminalsForTasks(dependencyTasks ?? task);
        if (!resources || resources.length === 0) {
            return { content: [{ kind: 'text', value: `Task started but no terminal was found for: ${taskLabel}` }], toolResultMessage: new MarkdownString(localize(13180, null, taskLabel)) };
        }
        const terminals = this._terminalService.instances.filter(t => resources.some(r => r.path === t.resource.path && r.scheme === t.resource.scheme));
        if (terminals.length === 0) {
            return { content: [{ kind: 'text', value: `Task started but no terminal was found for: ${taskLabel}` }], toolResultMessage: new MarkdownString(localize(13181, null, taskLabel)) };
        }
        const store = new DisposableStore();
        const terminalResults = await collectTerminalResults(terminals, task, this._instantiationService, invocation.context, _progress, token, store, (terminalTask) => this._isTaskActive(terminalTask), dependencyTasks, this._tasksService);
        store.dispose();
        for (const r of terminalResults) {
            this._telemetryService.publicLog2?.('copilotChat.runTaskTool.run', {
                taskId: args.id,
                bufferLength: r.output.length ?? 0,
                pollDurationMs: r.pollDurationMs ?? 0,
                inputToolManualAcceptCount: r.inputToolManualAcceptCount ?? 0,
                inputToolManualRejectCount: r.inputToolManualRejectCount ?? 0,
                inputToolManualChars: r.inputToolManualChars ?? 0,
                inputToolManualShownCount: r.inputToolManualShownCount ?? 0,
                inputToolFreeFormInputShownCount: r.inputToolFreeFormInputShownCount ?? 0,
                inputToolFreeFormInputCount: r.inputToolFreeFormInputCount ?? 0
            });
        }
        const details = terminalResults.map(r => `Terminal: ${r.name}\nOutput:\n${r.output}`);
        const uniqueDetails = Array.from(new Set(details)).join('\n\n');
        const toolResultDetails = toolResultDetailsFromResponse(terminalResults);
        const toolResultMessage = toolResultMessageFromResponse(result, taskLabel, toolResultDetails, terminalResults);
        return {
            content: [{ kind: 'text', value: uniqueDetails }],
            toolResultMessage,
            toolResultDetails
        };
    }
    async _isTaskActive(task) {
        const busyTasks = await this._tasksService.getBusyTasks();
        return busyTasks?.some(t => tasksMatch(t, task)) ?? false;
    }
    async prepareToolInvocation(context, token) {
        const args = context.parameters;
        const taskDefinition = getTaskDefinition(args.id);
        const task = await getTaskForTool(args.id, taskDefinition, args.workspaceFolder, this._configurationService, this._tasksService, true);
        if (!task) {
            return { invocationMessage: new MarkdownString(localize(13182, null, args.id)) };
        }
        const taskLabel = task._label;
        const activeTasks = await this._tasksService.getActiveTasks();
        if (task && activeTasks.includes(task)) {
            return { invocationMessage: new MarkdownString(localize(13183, null)) };
        }
        if (await this._isTaskActive(task)) {
            return {
                invocationMessage: new MarkdownString(localize(13184, null, taskLabel)),
                pastTenseMessage: new MarkdownString(localize(13185, null, taskLabel)),
                confirmationMessages: undefined
            };
        }
        return {
            invocationMessage: new MarkdownString(localize(13186, null, taskLabel)),
            pastTenseMessage: new MarkdownString(task?.configurationProperties.isBackground
                ? localize(13187, null, taskLabel)
                : localize(13188, null, taskLabel)),
            confirmationMessages: task
                ? { title: localize(13189, null), message: localize(13190, null, taskLabel) }
                : undefined
        };
    }
};
RunTaskTool = __decorate([
    __param(0, ITaskService),
    __param(1, ITelemetryService),
    __param(2, ITerminalService),
    __param(3, IConfigurationService),
    __param(4, IInstantiationService)
], RunTaskTool);
export { RunTaskTool };
export const RunTaskToolData = {
    id: 'run_task',
    toolReferenceName: 'runTask',
    legacyToolReferenceFullNames: ['runTasks/runTask'],
    displayName: localize(13191, null),
    modelDescription: 'Runs a VS Code task.\n\n- If you see that an appropriate task exists for building or running code, prefer to use this tool to run the task instead of using the run_in_terminal tool.\n- Make sure that any appropriate build or watch task is running before trying to run tests or execute code.\n- If the user asks to run a task, use this tool to do so.',
    userDescription: localize(13192, null),
    icon: Codicon.tools,
    source: ToolDataSource.Internal,
    when: TasksAvailableContext,
    inputSchema: {
        'type': 'object',
        'properties': {
            'workspaceFolder': {
                'type': 'string',
                'description': 'The workspace folder path containing the task'
            },
            'id': {
                'type': 'string',
                'description': 'The task ID to run.'
            }
        },
        'required': [
            'workspaceFolder',
            'id'
        ]
    }
};
//# sourceMappingURL=runTaskTool.js.map