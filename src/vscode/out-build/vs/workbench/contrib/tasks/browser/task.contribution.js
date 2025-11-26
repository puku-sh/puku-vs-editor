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
import * as nls from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { MenuRegistry, MenuId, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { ProblemMatcherRegistry } from '../common/problemMatcher.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import * as jsonContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { Extensions as OutputExt } from '../../../services/output/common/output.js';
import { TaskGroup, TASKS_CATEGORY, TASK_RUNNING_STATE, TASK_TERMINAL_ACTIVE, TaskEventKind, rerunTaskIcon, RerunForActiveTerminalCommandId, RerunAllRunningTasksCommandId } from '../common/tasks.js';
import { ITaskService, TaskCommandsRegistered, TaskExecutionSupportedContext } from '../common/taskService.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { RunAutomaticTasks, ManageAutomaticTaskRunning } from './runAutomaticTasks.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import schemaVersion1 from '../common/jsonSchema_v1.js';
import schemaVersion2, { updateProblemMatchers, updateTaskDefinitions } from '../common/jsonSchema_v2.js';
import { AbstractTaskService, ConfigureTaskAction } from './abstractTaskService.js';
import { tasksSchemaId } from '../../../services/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { WorkbenchStateContext } from '../../../common/contextkeys.js';
import { Extensions as QuickAccessExtensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { TasksQuickAccessProvider } from './tasksQuickAccess.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { TaskDefinitionRegistry } from '../common/taskDefinitionRegistry.js';
import { isString } from '../../../../base/common/types.js';
import { promiseWithResolvers } from '../../../../base/common/async.js';
import { TerminalContextKeys } from '../../terminal/common/terminalContextKey.js';
import { ITerminalService } from '../../terminal/browser/terminal.js';
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(RunAutomaticTasks, 4 /* LifecyclePhase.Eventually */);
registerAction2(ManageAutomaticTaskRunning);
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: ManageAutomaticTaskRunning.ID,
        title: ManageAutomaticTaskRunning.LABEL,
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
let TaskStatusBarContributions = class TaskStatusBarContributions extends Disposable {
    constructor(_taskService, _statusbarService, _progressService) {
        super();
        this._taskService = _taskService;
        this._statusbarService = _statusbarService;
        this._progressService = _progressService;
        this._activeTasksCount = 0;
        this._registerListeners();
    }
    _registerListeners() {
        let promise = undefined;
        let resolve;
        this._register(this._taskService.onDidStateChange(event => {
            if (event.kind === TaskEventKind.Changed) {
                this._updateRunningTasksStatus();
            }
            if (!this._ignoreEventForUpdateRunningTasksCount(event)) {
                switch (event.kind) {
                    case TaskEventKind.Active:
                        this._activeTasksCount++;
                        if (this._activeTasksCount === 1) {
                            if (!promise) {
                                ({ promise, resolve } = promiseWithResolvers());
                            }
                        }
                        break;
                    case TaskEventKind.Inactive:
                        // Since the exiting of the sub process is communicated async we can't order inactive and terminate events.
                        // So try to treat them accordingly.
                        if (this._activeTasksCount > 0) {
                            this._activeTasksCount--;
                            if (this._activeTasksCount === 0) {
                                if (promise && resolve) {
                                    resolve();
                                }
                            }
                        }
                        break;
                    case TaskEventKind.Terminated:
                        if (this._activeTasksCount !== 0) {
                            this._activeTasksCount = 0;
                            if (promise && resolve) {
                                resolve();
                            }
                        }
                        break;
                }
            }
            if (promise && (event.kind === TaskEventKind.Active) && (this._activeTasksCount === 1)) {
                this._progressService.withProgress({ location: 10 /* ProgressLocation.Window */, command: 'workbench.action.tasks.showTasks' }, progress => {
                    progress.report({ message: nls.localize(12209, null) });
                    return promise;
                }).then(() => {
                    promise = undefined;
                });
            }
        }));
    }
    async _updateRunningTasksStatus() {
        const tasks = await this._taskService.getActiveTasks();
        if (tasks.length === 0) {
            if (this._runningTasksStatusItem) {
                this._runningTasksStatusItem.dispose();
                this._runningTasksStatusItem = undefined;
            }
        }
        else {
            const itemProps = {
                name: nls.localize(12210, null),
                text: `$(tools) ${tasks.length}`,
                ariaLabel: nls.localize(12211, null, tasks.length),
                tooltip: nls.localize(12212, null),
                command: 'workbench.action.tasks.showTasks',
            };
            if (!this._runningTasksStatusItem) {
                this._runningTasksStatusItem = this._statusbarService.addEntry(itemProps, 'status.runningTasks', 0 /* StatusbarAlignment.LEFT */, { location: { id: 'status.problems', priority: 50 }, alignment: 1 /* StatusbarAlignment.RIGHT */ });
            }
            else {
                this._runningTasksStatusItem.update(itemProps);
            }
        }
    }
    _ignoreEventForUpdateRunningTasksCount(event) {
        if (!this._taskService.inTerminal() || event.kind === TaskEventKind.Changed) {
            return false;
        }
        if ((isString(event.group) ? event.group : event.group?._id) !== TaskGroup.Build._id) {
            return true;
        }
        return event.__task.configurationProperties.problemMatchers === undefined || event.__task.configurationProperties.problemMatchers.length === 0;
    }
};
TaskStatusBarContributions = __decorate([
    __param(0, ITaskService),
    __param(1, IStatusbarService),
    __param(2, IProgressService)
], TaskStatusBarContributions);
export { TaskStatusBarContributions };
workbenchRegistry.registerWorkbenchContribution(TaskStatusBarContributions, 3 /* LifecyclePhase.Restored */);
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "3_run" /* TerminalMenuBarGroup.Run */,
    command: {
        id: 'workbench.action.tasks.runTask',
        title: nls.localize(12213, null)
    },
    order: 1,
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "3_run" /* TerminalMenuBarGroup.Run */,
    command: {
        id: 'workbench.action.tasks.build',
        title: nls.localize(12214, null)
    },
    order: 2,
    when: TaskExecutionSupportedContext
});
// Manage Tasks
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "5_manage" /* TerminalMenuBarGroup.Manage */,
    command: {
        precondition: TASK_RUNNING_STATE,
        id: 'workbench.action.tasks.showTasks',
        title: nls.localize(12215, null)
    },
    order: 1,
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "5_manage" /* TerminalMenuBarGroup.Manage */,
    command: {
        precondition: TASK_RUNNING_STATE,
        id: 'workbench.action.tasks.restartTask',
        title: nls.localize(12216, null)
    },
    order: 2,
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "5_manage" /* TerminalMenuBarGroup.Manage */,
    command: {
        precondition: TASK_RUNNING_STATE,
        id: 'workbench.action.tasks.terminate',
        title: nls.localize(12217, null)
    },
    order: 3,
    when: TaskExecutionSupportedContext
});
// Configure Tasks
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "7_configure" /* TerminalMenuBarGroup.Configure */,
    command: {
        id: 'workbench.action.tasks.configureTaskRunner',
        title: nls.localize(12218, null)
    },
    order: 1,
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "7_configure" /* TerminalMenuBarGroup.Configure */,
    command: {
        id: 'workbench.action.tasks.configureDefaultBuildTask',
        title: nls.localize(12219, null)
    },
    order: 2,
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.openWorkspaceFileTasks',
        title: nls.localize2(12245, "Open Workspace Tasks"),
        category: TASKS_CATEGORY
    },
    when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace'), TaskExecutionSupportedContext)
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: ConfigureTaskAction.ID,
        title: ConfigureTaskAction.TEXT,
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.showLog',
        title: nls.localize2(12246, "Show Task Log"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.runTask',
        title: nls.localize2(12247, "Run Task"),
        category: TASKS_CATEGORY
    }
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.reRunTask',
        title: nls.localize2(12248, "Rerun Last Task"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.restartTask',
        title: nls.localize2(12249, "Restart Running Task"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: RerunAllRunningTasksCommandId,
        title: nls.localize2(12250, "Rerun All Running Tasks"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.showTasks',
        title: nls.localize2(12251, "Show Running Tasks"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.terminate',
        title: nls.localize2(12252, "Terminate Task"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.build',
        title: nls.localize2(12253, "Run Build Task"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.test',
        title: nls.localize2(12254, "Run Test Task"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.configureDefaultBuildTask',
        title: nls.localize2(12255, "Configure Default Build Task"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.configureDefaultTestTask',
        title: nls.localize2(12256, "Configure Default Test Task"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.openUserTasks',
        title: nls.localize2(12257, "Open User Tasks"), category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
class UserTasksGlobalActionContribution extends Disposable {
    constructor() {
        super();
        this.registerActions();
    }
    registerActions() {
        const id = 'workbench.action.tasks.openUserTasks';
        const title = nls.localize(12220, null);
        this._register(MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            command: {
                id,
                title
            },
            when: TaskExecutionSupportedContext,
            group: '2_configuration',
            order: 6
        }));
        this._register(MenuRegistry.appendMenuItem(MenuId.MenubarPreferencesMenu, {
            command: {
                id,
                title
            },
            when: TaskExecutionSupportedContext,
            group: '2_configuration',
            order: 6
        }));
    }
}
workbenchRegistry.registerWorkbenchContribution(UserTasksGlobalActionContribution, 3 /* LifecyclePhase.Restored */);
// MenuRegistry.addCommand( { id: 'workbench.action.tasks.rebuild', title: nls.localize('RebuildAction.label', 'Run Rebuild Task'), category: tasksCategory });
// MenuRegistry.addCommand( { id: 'workbench.action.tasks.clean', title: nls.localize('CleanAction.label', 'Run Clean Task'), category: tasksCategory });
KeybindingsRegistry.registerKeybindingRule({
    id: 'workbench.action.tasks.build',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: TaskCommandsRegistered,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 32 /* KeyCode.KeyB */
});
// Tasks Output channel. Register it before using it in Task Service.
const outputChannelRegistry = Registry.as(OutputExt.OutputChannels);
outputChannelRegistry.registerChannel({ id: AbstractTaskService.OutputChannelId, label: AbstractTaskService.OutputChannelLabel, log: false });
// Register Quick Access
const quickAccessRegistry = (Registry.as(QuickAccessExtensions.Quickaccess));
const tasksPickerContextKey = 'inTasksPicker';
quickAccessRegistry.registerQuickAccessProvider({
    ctor: TasksQuickAccessProvider,
    prefix: TasksQuickAccessProvider.PREFIX,
    contextKey: tasksPickerContextKey,
    placeholder: nls.localize(12221, null),
    helpEntries: [{ description: nls.localize(12222, null), commandCenterOrder: 60 }]
});
// tasks.json validation
const schema = {
    id: tasksSchemaId,
    description: 'Task definition file',
    type: 'object',
    allowTrailingCommas: true,
    allowComments: true,
    default: {
        version: '2.0.0',
        tasks: [
            {
                label: 'My Task',
                command: 'echo hello',
                type: 'shell',
                args: [],
                problemMatcher: ['$tsc'],
                presentation: {
                    reveal: 'always'
                },
                group: 'build'
            }
        ]
    }
};
schema.definitions = {
    ...schemaVersion1.definitions,
    ...schemaVersion2.definitions,
};
schema.oneOf = [...(schemaVersion2.oneOf || []), ...(schemaVersion1.oneOf || [])];
const jsonRegistry = Registry.as(jsonContributionRegistry.Extensions.JSONContribution);
jsonRegistry.registerSchema(tasksSchemaId, schema);
export class TaskRegistryContribution extends Disposable {
    static { this.ID = 'taskRegistryContribution'; }
    constructor() {
        super();
        this._register(ProblemMatcherRegistry.onMatcherChanged(() => {
            updateProblemMatchers();
            jsonRegistry.notifySchemaChanged(tasksSchemaId);
        }));
        this._register(TaskDefinitionRegistry.onDefinitionsChanged(() => {
            updateTaskDefinitions();
            jsonRegistry.notifySchemaChanged(tasksSchemaId);
        }));
    }
}
registerWorkbenchContribution2(TaskRegistryContribution.ID, TaskRegistryContribution, 3 /* WorkbenchPhase.AfterRestored */);
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'task',
    order: 100,
    title: nls.localize(12223, null),
    type: 'object',
    properties: {
        ["task.problemMatchers.neverPrompt" /* TaskSettingId.ProblemMatchersNeverPrompt */]: {
            markdownDescription: nls.localize(12224, null),
            'oneOf': [
                {
                    type: 'boolean',
                    markdownDescription: nls.localize(12225, null)
                },
                {
                    type: 'object',
                    patternProperties: {
                        '.*': {
                            type: 'boolean'
                        }
                    },
                    markdownDescription: nls.localize(12226, null),
                    default: {
                        'shell': true
                    }
                }
            ],
            default: false
        },
        ["task.autoDetect" /* TaskSettingId.AutoDetect */]: {
            markdownDescription: nls.localize(12227, null),
            type: 'string',
            enum: ['on', 'off'],
            default: 'on'
        },
        ["task.slowProviderWarning" /* TaskSettingId.SlowProviderWarning */]: {
            markdownDescription: nls.localize(12228, null),
            'oneOf': [
                {
                    type: 'boolean',
                    markdownDescription: nls.localize(12229, null)
                },
                {
                    type: 'array',
                    items: {
                        type: 'string',
                        markdownDescription: nls.localize(12230, null)
                    }
                }
            ],
            default: true
        },
        ["task.quickOpen.history" /* TaskSettingId.QuickOpenHistory */]: {
            markdownDescription: nls.localize(12231, null),
            type: 'number',
            default: 30, minimum: 0, maximum: 30
        },
        ["task.quickOpen.detail" /* TaskSettingId.QuickOpenDetail */]: {
            markdownDescription: nls.localize(12232, null),
            type: 'boolean',
            default: true
        },
        ["task.quickOpen.skip" /* TaskSettingId.QuickOpenSkip */]: {
            type: 'boolean',
            description: nls.localize(12233, null),
            default: false
        },
        ["task.quickOpen.showAll" /* TaskSettingId.QuickOpenShowAll */]: {
            type: 'boolean',
            description: nls.localize(12234, null),
            default: false
        },
        ["task.allowAutomaticTasks" /* TaskSettingId.AllowAutomaticTasks */]: {
            type: 'string',
            enum: ['on', 'off'],
            enumDescriptions: [
                nls.localize(12235, null),
                nls.localize(12236, null),
            ],
            description: nls.localize(12237, null),
            default: 'on',
            restricted: true
        },
        ["task.reconnection" /* TaskSettingId.Reconnection */]: {
            type: 'boolean',
            description: nls.localize(12238, null),
            default: true
        },
        ["task.saveBeforeRun" /* TaskSettingId.SaveBeforeRun */]: {
            markdownDescription: nls.localize(12239, null),
            type: 'string',
            enum: ['always', 'never', 'prompt'],
            enumDescriptions: [
                nls.localize(12240, null),
                nls.localize(12241, null),
                nls.localize(12242, null),
            ],
            default: 'always',
        },
        ["task.notifyWindowOnTaskCompletion" /* TaskSettingId.NotifyWindowOnTaskCompletion */]: {
            type: 'integer',
            markdownDescription: nls.localize(12243, null),
            default: 60000,
            minimum: -1
        },
        ["task.verboseLogging" /* TaskSettingId.VerboseLogging */]: {
            type: 'boolean',
            description: nls.localize(12244, null),
            default: false
        },
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: RerunForActiveTerminalCommandId,
            icon: rerunTaskIcon,
            title: nls.localize2(12258, 'Rerun Task'),
            precondition: TASK_TERMINAL_ACTIVE,
            menu: [{ id: MenuId.TerminalInstanceContext, when: TASK_TERMINAL_ACTIVE }],
            keybinding: {
                when: TerminalContextKeys.focus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */
                },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        });
    }
    async run(accessor, args) {
        const terminalService = accessor.get(ITerminalService);
        const taskSystem = accessor.get(ITaskService);
        const instance = args ?? terminalService.activeInstance;
        if (instance) {
            await taskSystem.rerun(instance.instanceId);
        }
    }
});
//# sourceMappingURL=task.contribution.js.map