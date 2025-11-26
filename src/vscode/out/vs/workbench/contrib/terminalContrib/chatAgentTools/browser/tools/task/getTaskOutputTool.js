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
import { MarkdownString } from '../../../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../../../../platform/telemetry/common/telemetry.js';
import { ToolDataSource } from '../../../../../chat/common/languageModelToolsService.js';
import { ITaskService, TasksAvailableContext } from '../../../../../tasks/common/taskService.js';
import { ITerminalService } from '../../../../../terminal/browser/terminal.js';
import { collectTerminalResults, getTaskDefinition, getTaskForTool, resolveDependencyTasks, tasksMatch } from '../../taskHelpers.js';
import { toolResultDetailsFromResponse, toolResultMessageFromResponse } from './taskHelpers.js';
export const GetTaskOutputToolData = {
    id: 'get_task_output',
    toolReferenceName: 'getTaskOutput',
    legacyToolReferenceFullNames: ['runTasks/getTaskOutput'],
    displayName: localize('getTaskOutputTool.displayName', 'Get Task Output'),
    modelDescription: 'Get the output of a task',
    source: ToolDataSource.Internal,
    when: TasksAvailableContext,
    inputSchema: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: 'The task ID for which to get the output.'
            },
            workspaceFolder: {
                type: 'string',
                description: 'The workspace folder path containing the task'
            },
        },
        required: [
            'id',
            'workspaceFolder'
        ]
    }
};
let GetTaskOutputTool = class GetTaskOutputTool extends Disposable {
    constructor(_tasksService, _terminalService, _configurationService, _instantiationService, _telemetryService) {
        super();
        this._tasksService = _tasksService;
        this._terminalService = _terminalService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._telemetryService = _telemetryService;
    }
    async prepareToolInvocation(context, token) {
        const args = context.parameters;
        const taskDefinition = getTaskDefinition(args.id);
        const task = await getTaskForTool(args.id, taskDefinition, args.workspaceFolder, this._configurationService, this._tasksService, true);
        if (!task) {
            return { invocationMessage: new MarkdownString(localize('copilotChat.taskNotFound', 'Task not found: `{0}`', args.id)) };
        }
        const taskLabel = task._label;
        const activeTasks = await this._tasksService.getActiveTasks();
        if (activeTasks.includes(task)) {
            return { invocationMessage: new MarkdownString(localize('copilotChat.taskAlreadyRunning', 'The task `{0}` is already running.', taskLabel)) };
        }
        return {
            invocationMessage: new MarkdownString(localize('copilotChat.checkingTerminalOutput', 'Checking output for task `{0}`', taskLabel)),
            pastTenseMessage: new MarkdownString(localize('copilotChat.checkedTerminalOutput', 'Checked output for task `{0}`', taskLabel)),
        };
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const args = invocation.parameters;
        const taskDefinition = getTaskDefinition(args.id);
        const task = await getTaskForTool(args.id, taskDefinition, args.workspaceFolder, this._configurationService, this._tasksService, true);
        if (!task) {
            return { content: [{ kind: 'text', value: `Task not found: ${args.id}` }], toolResultMessage: new MarkdownString(localize('copilotChat.taskNotFound', 'Task not found: `{0}`', args.id)) };
        }
        const dependencyTasks = await resolveDependencyTasks(task, args.workspaceFolder, this._configurationService, this._tasksService);
        const resources = this._tasksService.getTerminalsForTasks(dependencyTasks ?? task);
        const taskLabel = task._label;
        const terminals = resources?.map(resource => this._terminalService.instances.find(t => t.resource.path === resource?.path && t.resource.scheme === resource.scheme)).filter(t => !!t);
        if (!terminals || terminals.length === 0) {
            return { content: [{ kind: 'text', value: `Terminal not found for task ${taskLabel}` }], toolResultMessage: new MarkdownString(localize('copilotChat.terminalNotFound', 'Terminal not found for task `{0}`', taskLabel)) };
        }
        const store = new DisposableStore();
        const terminalResults = await collectTerminalResults(terminals, task, this._instantiationService, invocation.context, _progress, token, store, (terminalTask) => this._isTaskActive(terminalTask), dependencyTasks, this._tasksService);
        store.dispose();
        for (const r of terminalResults) {
            this._telemetryService.publicLog2?.('copilotChat.getTaskOutputTool.get', {
                taskId: args.id,
                bufferLength: r.output.length ?? 0,
                pollDurationMs: r.pollDurationMs ?? 0,
                inputToolManualAcceptCount: r.inputToolManualAcceptCount ?? 0,
                inputToolManualRejectCount: r.inputToolManualRejectCount ?? 0,
                inputToolManualChars: r.inputToolManualChars ?? 0,
                inputToolManualShownCount: r.inputToolManualShownCount ?? 0,
                inputToolFreeFormInputCount: r.inputToolFreeFormInputCount ?? 0,
                inputToolFreeFormInputShownCount: r.inputToolFreeFormInputShownCount ?? 0
            });
        }
        const details = terminalResults.map(r => `Terminal: ${r.name}\nOutput:\n${r.output}`);
        const uniqueDetails = Array.from(new Set(details)).join('\n\n');
        const toolResultDetails = toolResultDetailsFromResponse(terminalResults);
        const toolResultMessage = toolResultMessageFromResponse(undefined, taskLabel, toolResultDetails, terminalResults, true);
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
};
GetTaskOutputTool = __decorate([
    __param(0, ITaskService),
    __param(1, ITerminalService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, ITelemetryService)
], GetTaskOutputTool);
export { GetTaskOutputTool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0VGFza091dHB1dFRvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci90b29scy90YXNrL2dldFRhc2tPdXRwdXRUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM1RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM1RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUE2TCxNQUFNLHlEQUF5RCxDQUFDO0FBQ3BSLE9BQU8sRUFBRSxZQUFZLEVBQVEscUJBQXFCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN2RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLHNCQUFzQixFQUFFLFVBQVUsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3JJLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBR2hHLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFjO0lBQy9DLEVBQUUsRUFBRSxpQkFBaUI7SUFDckIsaUJBQWlCLEVBQUUsZUFBZTtJQUNsQyw0QkFBNEIsRUFBRSxDQUFDLHdCQUF3QixDQUFDO0lBQ3hELFdBQVcsRUFBRSxRQUFRLENBQUMsK0JBQStCLEVBQUUsaUJBQWlCLENBQUM7SUFDekUsZ0JBQWdCLEVBQUUsMEJBQTBCO0lBQzVDLE1BQU0sRUFBRSxjQUFjLENBQUMsUUFBUTtJQUMvQixJQUFJLEVBQUUscUJBQXFCO0lBQzNCLFdBQVcsRUFBRTtRQUNaLElBQUksRUFBRSxRQUFRO1FBQ2QsVUFBVSxFQUFFO1lBQ1gsRUFBRSxFQUFFO2dCQUNILElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSwwQ0FBMEM7YUFDdkQ7WUFDRCxlQUFlLEVBQUU7Z0JBQ2hCLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSwrQ0FBK0M7YUFDNUQ7U0FDRDtRQUNELFFBQVEsRUFBRTtZQUNULElBQUk7WUFDSixpQkFBaUI7U0FDakI7S0FDRDtDQUNELENBQUM7QUFPSyxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFVBQVU7SUFDaEQsWUFDZ0MsYUFBMkIsRUFDdkIsZ0JBQWtDLEVBQzdCLHFCQUE0QyxFQUM1QyxxQkFBNEMsRUFDaEQsaUJBQW9DO1FBRXhFLEtBQUssRUFBRSxDQUFDO1FBTnVCLGtCQUFhLEdBQWIsYUFBYSxDQUFjO1FBQ3ZCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDN0IsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUM1QywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQ2hELHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7SUFHekUsQ0FBQztJQUNELEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxPQUEwQyxFQUFFLEtBQXdCO1FBQy9GLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxVQUF1QyxDQUFDO1FBRTdELE1BQU0sY0FBYyxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsRCxNQUFNLElBQUksR0FBRyxNQUFNLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3ZJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUMxSCxDQUFDO1FBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUM5QixNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDOUQsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDaEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxvQ0FBb0MsRUFBRSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDL0ksQ0FBQztRQUVELE9BQU87WUFDTixpQkFBaUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsb0NBQW9DLEVBQUUsZ0NBQWdDLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDbEksZ0JBQWdCLEVBQUUsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLCtCQUErQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1NBQy9ILENBQUM7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUEyQixFQUFFLFlBQWlDLEVBQUUsU0FBdUIsRUFBRSxLQUF3QjtRQUM3SCxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsVUFBdUMsQ0FBQztRQUNoRSxNQUFNLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2SSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxtQkFBbUIsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUM1TCxDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsTUFBTSxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2pJLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxDQUFDO1FBQ25GLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDOUIsTUFBTSxTQUFTLEdBQUcsU0FBUyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLElBQUksSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEwsSUFBSSxDQUFDLFNBQVMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLCtCQUErQixTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLDhCQUE4QixFQUFFLG1DQUFtQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUM1TixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNwQyxNQUFNLGVBQWUsR0FBRyxNQUFNLHNCQUFzQixDQUNuRCxTQUFTLEVBQ1QsSUFBSSxFQUNKLElBQUksQ0FBQyxxQkFBcUIsRUFDMUIsVUFBVSxDQUFDLE9BQVEsRUFDbkIsU0FBUyxFQUNULEtBQUssRUFDTCxLQUFLLEVBQ0wsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLEVBQ2xELGVBQWUsRUFDZixJQUFJLENBQUMsYUFBYSxDQUNsQixDQUFDO1FBQ0YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLEtBQUssTUFBTSxDQUFDLElBQUksZUFBZSxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxDQUF3QyxtQ0FBbUMsRUFBRTtnQkFDL0csTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFO2dCQUNmLFlBQVksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDO2dCQUNsQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLGNBQWMsSUFBSSxDQUFDO2dCQUNyQywwQkFBMEIsRUFBRSxDQUFDLENBQUMsMEJBQTBCLElBQUksQ0FBQztnQkFDN0QsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDLDBCQUEwQixJQUFJLENBQUM7Z0JBQzdELG9CQUFvQixFQUFFLENBQUMsQ0FBQyxvQkFBb0IsSUFBSSxDQUFDO2dCQUNqRCx5QkFBeUIsRUFBRSxDQUFDLENBQUMseUJBQXlCLElBQUksQ0FBQztnQkFDM0QsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixJQUFJLENBQUM7Z0JBQy9ELGdDQUFnQyxFQUFFLENBQUMsQ0FBQyxnQ0FBZ0MsSUFBSSxDQUFDO2FBQ3pFLENBQUMsQ0FBQztRQUNKLENBQUM7UUFDRCxNQUFNLE9BQU8sR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxjQUFjLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEUsTUFBTSxpQkFBaUIsR0FBRyw2QkFBNkIsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUN6RSxNQUFNLGlCQUFpQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXhILE9BQU87WUFDTixPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxDQUFDO1lBQ2pELGlCQUFpQjtZQUNqQixpQkFBaUI7U0FDakIsQ0FBQztJQUNILENBQUM7SUFDTyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQVU7UUFDckMsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzFELE9BQU8sU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUM7SUFDM0QsQ0FBQztDQUNELENBQUE7QUF2RlksaUJBQWlCO0lBRTNCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxpQkFBaUIsQ0FBQTtHQU5QLGlCQUFpQixDQXVGN0IifQ==