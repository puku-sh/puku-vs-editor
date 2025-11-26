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
            return { content: [{ kind: 'text', value: `Task not found: ${args.id}` }], toolResultMessage: new MarkdownString(localize('chat.taskNotFound', 'Task not found: `{0}`', args.id)) };
        }
        const taskLabel = task._label;
        const activeTasks = await this._tasksService.getActiveTasks();
        if (activeTasks.includes(task)) {
            return { content: [{ kind: 'text', value: `The task ${taskLabel} is already running.` }], toolResultMessage: new MarkdownString(localize('chat.taskAlreadyRunning', 'The task `{0}` is already running.', taskLabel)) };
        }
        const raceResult = await Promise.race([this._tasksService.run(task, undefined, 5 /* TaskRunSource.ChatAgent */), timeout(3000)]);
        const result = raceResult && typeof raceResult === 'object' ? raceResult : undefined;
        const dependencyTasks = await resolveDependencyTasks(task, args.workspaceFolder, this._configurationService, this._tasksService);
        const resources = this._tasksService.getTerminalsForTasks(dependencyTasks ?? task);
        if (!resources || resources.length === 0) {
            return { content: [{ kind: 'text', value: `Task started but no terminal was found for: ${taskLabel}` }], toolResultMessage: new MarkdownString(localize('chat.noTerminal', 'Task started but no terminal was found for: `{0}`', taskLabel)) };
        }
        const terminals = this._terminalService.instances.filter(t => resources.some(r => r.path === t.resource.path && r.scheme === t.resource.scheme));
        if (terminals.length === 0) {
            return { content: [{ kind: 'text', value: `Task started but no terminal was found for: ${taskLabel}` }], toolResultMessage: new MarkdownString(localize('chat.noTerminal', 'Task started but no terminal was found for: `{0}`', taskLabel)) };
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
            return { invocationMessage: new MarkdownString(localize('chat.taskNotFound', 'Task not found: `{0}`', args.id)) };
        }
        const taskLabel = task._label;
        const activeTasks = await this._tasksService.getActiveTasks();
        if (task && activeTasks.includes(task)) {
            return { invocationMessage: new MarkdownString(localize('chat.taskAlreadyActive', 'The task is already running.')) };
        }
        if (await this._isTaskActive(task)) {
            return {
                invocationMessage: new MarkdownString(localize('chat.taskIsAlreadyRunning', '`{0}` is already running.', taskLabel)),
                pastTenseMessage: new MarkdownString(localize('chat.taskWasAlreadyRunning', '`{0}` was already running.', taskLabel)),
                confirmationMessages: undefined
            };
        }
        return {
            invocationMessage: new MarkdownString(localize('chat.runningTask', 'Running `{0}`', taskLabel)),
            pastTenseMessage: new MarkdownString(task?.configurationProperties.isBackground
                ? localize('chat.startedTask', 'Started `{0}`', taskLabel)
                : localize('chat.ranTask', 'Ran `{0}`', taskLabel)),
            confirmationMessages: task
                ? { title: localize('chat.allowTaskRunTitle', 'Allow task run?'), message: localize('chat.allowTaskRunMsg', 'Allow to run the task `{0}`?', taskLabel) }
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
    displayName: localize('runInTerminalTool.displayName', 'Run Task'),
    modelDescription: 'Runs a VS Code task.\n\n- If you see that an appropriate task exists for building or running code, prefer to use this tool to run the task instead of using the run_in_terminal tool.\n- Make sure that any appropriate build or watch task is running before trying to run tests or execute code.\n- If the user asks to run a task, use this tool to do so.',
    userDescription: localize('runInTerminalTool.userDescription', 'Run tasks in the workspace'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuVGFza1Rvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci90b29scy90YXNrL3J1blRhc2tUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDaEcsT0FBTyxFQUF1SSxjQUFjLEVBQWdCLE1BQU0seURBQXlELENBQUM7QUFDNU8sT0FBTyxFQUFFLFlBQVksRUFBc0IscUJBQXFCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVySCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLHNCQUFzQixFQUFFLFVBQVUsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3JJLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM1RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdkUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLDZCQUE2QixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDNUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFN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