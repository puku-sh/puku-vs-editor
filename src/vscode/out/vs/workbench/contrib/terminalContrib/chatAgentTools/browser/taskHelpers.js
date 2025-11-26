/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeout } from '../../../../../base/common/async.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { getOutput } from './outputHelpers.js';
import { OutputMonitor } from './tools/monitoring/outputMonitor.js';
import { OutputMonitorState } from './tools/monitoring/types.js';
import { Event } from '../../../../../base/common/event.js';
import { isString } from '../../../../../base/common/types.js';
export function getTaskDefinition(id) {
    const idx = id.indexOf(': ');
    const taskType = id.substring(0, idx);
    let taskLabel = idx > 0 ? id.substring(idx + 2) : id;
    if (/^\d+$/.test(taskLabel)) {
        taskLabel = id;
    }
    return { taskLabel, taskType };
}
export function getTaskRepresentation(task) {
    if ('label' in task && task.label) {
        return task.label;
    }
    else if ('script' in task && task.script) {
        return task.script;
    }
    else if ('command' in task && task.command) {
        return isString(task.command) ? task.command : task.command.name?.toString() || '';
    }
    return '';
}
export function getTaskKey(task) {
    return task.getKey() ?? task.getMapKey();
}
export function tasksMatch(a, b) {
    if (!a || !b) {
        return false;
    }
    if (getTaskKey(a) === getTaskKey(b)) {
        return true;
    }
    if (a.getCommonTaskId?.() === b.getCommonTaskId?.()) {
        return true;
    }
    return a._id === b._id;
}
export async function getTaskForTool(id, taskDefinition, workspaceFolder, configurationService, taskService, allowParentTask) {
    let index = 0;
    let task;
    const workspaceFolderToTaskMap = await taskService.getWorkspaceTasks();
    let configTasks = [];
    for (const folder of workspaceFolderToTaskMap.keys()) {
        const tasksConfig = configurationService.getValue('tasks', { resource: URI.parse(folder) });
        if (tasksConfig?.tasks) {
            configTasks = configTasks.concat(tasksConfig.tasks);
        }
    }
    for (const configTask of configTasks) {
        if ((!allowParentTask && !configTask.type) || ('hide' in configTask && configTask.hide)) {
            // Skip these as they are not included in the agent prompt and we need to align with
            // the indices used there.
            continue;
        }
        if ((configTask.type && taskDefinition.taskType ? configTask.type === taskDefinition.taskType : true) &&
            ((getTaskRepresentation(configTask) === taskDefinition?.taskLabel) || (id === configTask.label))) {
            task = configTask;
            break;
        }
        else if (!configTask.label && id === `${configTask.type}: ${index}`) {
            task = configTask;
            break;
        }
        index++;
    }
    if (!task) {
        return;
    }
    let tasksForWorkspace;
    const workspaceFolderPath = URI.file(workspaceFolder).path;
    for (const [folder, tasks] of workspaceFolderToTaskMap) {
        if (URI.parse(folder).path === workspaceFolderPath) {
            tasksForWorkspace = tasks;
            break;
        }
    }
    if (!tasksForWorkspace) {
        return;
    }
    const configuringTasks = tasksForWorkspace.configurations?.byIdentifier;
    const configuredTask = Object.values(configuringTasks ?? {}).find(t => {
        return t.type === task.type && (t._label === task.label || t._label === `${task.type}: ${getTaskRepresentation(task)}` || t._label === getTaskRepresentation(task));
    });
    let resolvedTask;
    if (configuredTask) {
        resolvedTask = await taskService.tryResolveTask(configuredTask);
    }
    if (!resolvedTask) {
        const customTasks = tasksForWorkspace.set?.tasks;
        resolvedTask = customTasks?.find(t => task.label === t._label || task.label === t._label);
    }
    return resolvedTask;
}
export async function resolveDependencyTasks(parentTask, workspaceFolder, configurationService, taskService) {
    if (!parentTask.configurationProperties?.dependsOn) {
        return undefined;
    }
    const dependencyTasks = await Promise.all(parentTask.configurationProperties.dependsOn.map(async (dep) => {
        const depId = isString(dep.task) ? dep.task : dep.task?._key;
        if (!depId) {
            return undefined;
        }
        return await getTaskForTool(depId, { taskLabel: depId }, workspaceFolder, configurationService, taskService);
    }));
    return dependencyTasks.filter((t) => t !== undefined);
}
/**
 * Collects output, polling duration, and idle status for all terminals.
 */
export async function collectTerminalResults(terminals, task, instantiationService, invocationContext, progress, token, disposableStore, isActive, dependencyTasks, taskService) {
    const results = [];
    if (token.isCancellationRequested) {
        return results;
    }
    const commonTaskIdToTaskMap = {};
    const taskIdToTaskMap = {};
    const taskLabelToTaskMap = {};
    for (const dependencyTask of dependencyTasks ?? []) {
        commonTaskIdToTaskMap[dependencyTask.getCommonTaskId()] = dependencyTask;
        taskIdToTaskMap[dependencyTask._id] = dependencyTask;
        taskLabelToTaskMap[dependencyTask._label] = dependencyTask;
    }
    for (const instance of terminals) {
        progress.report({ message: new MarkdownString(`Checking output for \`${instance.shellLaunchConfig.name ?? 'unknown'}\``) });
        let terminalTask = task;
        // For composite tasks, find the actual dependency task running in this terminal
        if (dependencyTasks?.length) {
            // Use reconnection data if possible to match, since the properties here are unique
            const reconnectionData = instance.reconnectionProperties?.data;
            if (reconnectionData) {
                if (reconnectionData.lastTask in commonTaskIdToTaskMap) {
                    terminalTask = commonTaskIdToTaskMap[reconnectionData.lastTask];
                }
                else if (reconnectionData.id in taskIdToTaskMap) {
                    terminalTask = taskIdToTaskMap[reconnectionData.id];
                }
            }
            else {
                // Otherwise, fallback to label matching
                if (instance.shellLaunchConfig.name && instance.shellLaunchConfig.name in taskLabelToTaskMap) {
                    terminalTask = taskLabelToTaskMap[instance.shellLaunchConfig.name];
                }
                else if (instance.title in taskLabelToTaskMap) {
                    terminalTask = taskLabelToTaskMap[instance.title];
                }
            }
        }
        const execution = {
            getOutput: () => getOutput(instance) ?? '',
            task: terminalTask,
            isActive: isActive ? () => isActive(terminalTask) : undefined,
            instance,
            dependencyTasks,
            sessionId: invocationContext.sessionId
        };
        // For tasks with problem matchers, wait until the task becomes busy before creating the output monitor
        if (terminalTask.configurationProperties.problemMatchers && terminalTask.configurationProperties.problemMatchers.length > 0 && taskService) {
            const maxWaitTime = 1000; // Wait up to 1 second
            const startTime = Date.now();
            while (!token.isCancellationRequested && Date.now() - startTime < maxWaitTime) {
                const busyTasks = await taskService.getBusyTasks();
                if (busyTasks.some(t => tasksMatch(t, terminalTask))) {
                    break;
                }
                await timeout(100);
            }
        }
        const outputMonitor = disposableStore.add(instantiationService.createInstance(OutputMonitor, execution, taskProblemPollFn, invocationContext, token, task._label));
        await Event.toPromise(outputMonitor.onDidFinishCommand);
        const pollingResult = outputMonitor.pollingResult;
        results.push({
            name: instance.shellLaunchConfig.name ?? instance.title ?? 'unknown',
            output: pollingResult?.output ?? '',
            pollDurationMs: pollingResult?.pollDurationMs ?? 0,
            resources: pollingResult?.resources,
            state: pollingResult?.state || OutputMonitorState.Idle,
            inputToolManualAcceptCount: outputMonitor.outputMonitorTelemetryCounters.inputToolManualAcceptCount ?? 0,
            inputToolManualRejectCount: outputMonitor.outputMonitorTelemetryCounters.inputToolManualRejectCount ?? 0,
            inputToolManualChars: outputMonitor.outputMonitorTelemetryCounters.inputToolManualChars ?? 0,
            inputToolAutoAcceptCount: outputMonitor.outputMonitorTelemetryCounters.inputToolAutoAcceptCount ?? 0,
            inputToolAutoChars: outputMonitor.outputMonitorTelemetryCounters.inputToolAutoChars ?? 0,
            inputToolManualShownCount: outputMonitor.outputMonitorTelemetryCounters.inputToolManualShownCount ?? 0,
            inputToolFreeFormInputShownCount: outputMonitor.outputMonitorTelemetryCounters.inputToolFreeFormInputShownCount ?? 0,
            inputToolFreeFormInputCount: outputMonitor.outputMonitorTelemetryCounters.inputToolFreeFormInputCount ?? 0,
        });
    }
    return results;
}
export async function taskProblemPollFn(execution, token, taskService) {
    if (token.isCancellationRequested) {
        return;
    }
    if (execution.task) {
        const data = taskService.getTaskProblems(execution.instance.instanceId);
        if (data) {
            // Problem matchers exist for this task
            const problemList = [];
            const resultResources = [];
            for (const [owner, { resources, markers }] of data.entries()) {
                for (let i = 0; i < markers.length; i++) {
                    const uri = resources[i];
                    const marker = markers[i];
                    resultResources.push({
                        uri,
                        range: marker.startLineNumber !== undefined && marker.startColumn !== undefined && marker.endLineNumber !== undefined && marker.endColumn !== undefined
                            ? new Range(marker.startLineNumber, marker.startColumn, marker.endLineNumber, marker.endColumn)
                            : undefined
                    });
                    const message = marker.message ?? '';
                    problemList.push(`Problem: ${message} in ${uri.fsPath} coming from ${owner} starting on line ${marker.startLineNumber}${marker.startColumn ? `, column ${marker.startColumn} and ending on line ${marker.endLineNumber}${marker.endColumn ? `, column ${marker.endColumn}` : ''}` : ''}`);
                }
            }
            if (problemList.length === 0) {
                const lastTenLines = execution.getOutput().split('\n').filter(line => line !== '').slice(-10).join('\n');
                return {
                    state: OutputMonitorState.Idle,
                    output: `Task completed with output:\n${lastTenLines}`,
                };
            }
            return {
                state: OutputMonitorState.Idle,
                output: problemList.join('\n'),
                resources: resultResources,
            };
        }
    }
    throw new Error('Polling failed');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza0hlbHBlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci90YXNrSGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFHOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFRbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNwRSxPQUFPLEVBQThCLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDN0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUcvRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsRUFBVTtJQUMzQyxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdCLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLElBQUksU0FBUyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FB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