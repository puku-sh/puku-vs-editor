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
var AbstractTaskService_1;
import { Action } from '../../../../base/common/actions.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import * as glob from '../../../../base/common/glob.js';
import * as json from '../../../../base/common/json.js';
import { Disposable, DisposableStore, dispose, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../base/common/map.js';
import * as Objects from '../../../../base/common/objects.js';
import { ValidationStatus } from '../../../../base/common/parsers.js';
import * as Platform from '../../../../base/common/platform.js';
import * as resources from '../../../../base/common/resources.js';
import Severity from '../../../../base/common/severity.js';
import * as Types from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import * as UUID from '../../../../base/common/uuid.js';
import * as nls from '../../../../nls.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ProblemMatcherRegistry } from '../common/problemMatcher.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IWorkspaceContextService, WorkspaceFolder } from '../../../../platform/workspace/common/workspace.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Markers } from '../../markers/common/markers.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { ITerminalGroupService, ITerminalService } from '../../terminal/browser/terminal.js';
import { ITerminalProfileResolverService } from '../../terminal/common/terminal.js';
import { ConfiguringTask, ContributedTask, CustomTask, ExecutionEngine, InMemoryTask, KeyedTaskIdentifier, RerunAllRunningTasksCommandId, RuntimeType, TASK_RUNNING_STATE, TaskDefinition, TaskEventKind, TaskGroup, TaskSorter, TaskSourceKind, USER_TASKS_GROUP_KEY } from '../common/tasks.js';
import { ChatAgentLocation, ChatModeKind } from '../../chat/common/constants.js';
import { CustomExecutionSupportedContext, ProcessExecutionSupportedContext, ServerlessWebContext, ShellExecutionSupportedContext, TaskCommandsRegistered, TaskExecutionSupportedContext, TasksAvailableContext } from '../common/taskService.js';
import { TaskError, Triggers, VerifiedTask } from '../common/taskSystem.js';
import { getTemplates as getTaskTemplates } from '../common/taskTemplates.js';
import * as TaskConfig from '../common/taskConfiguration.js';
import { TerminalTaskSystem } from './terminalTaskSystem.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { TaskDefinitionRegistry } from '../common/taskDefinitionRegistry.js';
import { getActiveElement } from '../../../../base/browser/dom.js';
import { raceTimeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { toFormattedString } from '../../../../base/common/jsonFormatter.js';
import { Schemas } from '../../../../base/common/network.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { TerminalExitReason } from '../../../../platform/terminal/common/terminal.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceTrustManagementService, IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { VirtualWorkspaceContext } from '../../../common/contextkeys.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { CHAT_OPEN_ACTION_ID } from '../../chat/browser/actions/chatActions.js';
import { IChatAgentService } from '../../chat/common/chatAgents.js';
import { IChatService } from '../../chat/common/chatService.js';
import { configureTaskIcon, isWorkspaceFolder, QUICKOPEN_DETAIL_CONFIG, QUICKOPEN_SKIP_CONFIG, TaskQuickPick } from './taskQuickPick.js';
import { IHostService } from '../../../services/host/browser/host.js';
import * as dom from '../../../../base/browser/dom.js';
const QUICKOPEN_HISTORY_LIMIT_CONFIG = 'task.quickOpen.history';
const PROBLEM_MATCHER_NEVER_CONFIG = 'task.problemMatchers.neverPrompt';
const USE_SLOW_PICKER = 'task.quickOpen.showAll';
const TaskTerminalType = 'Task';
export var ConfigureTaskAction;
(function (ConfigureTaskAction) {
    ConfigureTaskAction.ID = 'workbench.action.tasks.configureTaskRunner';
    ConfigureTaskAction.TEXT = nls.localize2('ConfigureTaskRunnerAction.label', "Configure Task");
})(ConfigureTaskAction || (ConfigureTaskAction = {}));
class ProblemReporter {
    constructor(_outputChannel) {
        this._outputChannel = _outputChannel;
        this._onDidError = new Emitter();
        this.onDidError = this._onDidError.event;
        this._validationStatus = new ValidationStatus();
    }
    info(message) {
        this._validationStatus.state = 1 /* ValidationState.Info */;
        this._outputChannel.append(message + '\n');
    }
    warn(message) {
        this._validationStatus.state = 2 /* ValidationState.Warning */;
        this._outputChannel.append(message + '\n');
    }
    error(message) {
        this._validationStatus.state = 3 /* ValidationState.Error */;
        this._outputChannel.append(message + '\n');
        this._onDidError.fire(message);
    }
    fatal(message) {
        this._validationStatus.state = 4 /* ValidationState.Fatal */;
        this._outputChannel.append(message + '\n');
        this._onDidError.fire(message);
    }
    get status() {
        return this._validationStatus;
    }
}
class TaskMap {
    constructor() {
        this._store = new Map();
    }
    forEach(callback) {
        this._store.forEach(callback);
    }
    static getKey(workspaceFolder) {
        let key;
        if (Types.isString(workspaceFolder)) {
            key = workspaceFolder;
        }
        else {
            const uri = isWorkspaceFolder(workspaceFolder) ? workspaceFolder.uri : workspaceFolder.configuration;
            key = uri ? uri.toString() : '';
        }
        return key;
    }
    get(workspaceFolder) {
        const key = TaskMap.getKey(workspaceFolder);
        let result = this._store.get(key);
        if (!result) {
            result = [];
            this._store.set(key, result);
        }
        return result;
    }
    add(workspaceFolder, ...task) {
        const key = TaskMap.getKey(workspaceFolder);
        let values = this._store.get(key);
        if (!values) {
            values = [];
            this._store.set(key, values);
        }
        values.push(...task);
    }
    all() {
        const result = [];
        this._store.forEach((values) => result.push(...values));
        return result;
    }
}
let AbstractTaskService = class AbstractTaskService extends Disposable {
    static { AbstractTaskService_1 = this; }
    // private static autoDetectTelemetryName: string = 'taskServer.autoDetect';
    static { this.RecentlyUsedTasks_Key = 'workbench.tasks.recentlyUsedTasks'; }
    static { this.RecentlyUsedTasks_KeyV2 = 'workbench.tasks.recentlyUsedTasks2'; }
    static { this.PersistentTasks_Key = 'workbench.tasks.persistentTasks'; }
    static { this.IgnoreTask010DonotShowAgain_key = 'workbench.tasks.ignoreTask010Shown'; }
    static { this.OutputChannelId = 'tasks'; }
    static { this.OutputChannelLabel = nls.localize('tasks', "Tasks"); }
    static { this._nextHandle = 0; }
    get isReconnected() { return this._tasksReconnected; }
    constructor(_configurationService, _markerService, _outputService, _paneCompositeService, _viewsService, _commandService, _editorService, _fileService, _contextService, _telemetryService, _textFileService, _modelService, _extensionService, _quickInputService, _configurationResolverService, _terminalService, _terminalGroupService, _storageService, _progressService, _openerService, _dialogService, _notificationService, _contextKeyService, _environmentService, _terminalProfileResolverService, _pathService, _textModelResolverService, _preferencesService, _viewDescriptorService, _workspaceTrustRequestService, _workspaceTrustManagementService, _logService, _themeService, _lifecycleService, remoteAgentService, _instantiationService, _chatService, _chatAgentService, _hostService) {
        super();
        this._configurationService = _configurationService;
        this._markerService = _markerService;
        this._outputService = _outputService;
        this._paneCompositeService = _paneCompositeService;
        this._viewsService = _viewsService;
        this._commandService = _commandService;
        this._editorService = _editorService;
        this._fileService = _fileService;
        this._contextService = _contextService;
        this._telemetryService = _telemetryService;
        this._textFileService = _textFileService;
        this._modelService = _modelService;
        this._extensionService = _extensionService;
        this._quickInputService = _quickInputService;
        this._configurationResolverService = _configurationResolverService;
        this._terminalService = _terminalService;
        this._terminalGroupService = _terminalGroupService;
        this._storageService = _storageService;
        this._progressService = _progressService;
        this._openerService = _openerService;
        this._dialogService = _dialogService;
        this._notificationService = _notificationService;
        this._contextKeyService = _contextKeyService;
        this._environmentService = _environmentService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._pathService = _pathService;
        this._textModelResolverService = _textModelResolverService;
        this._preferencesService = _preferencesService;
        this._viewDescriptorService = _viewDescriptorService;
        this._workspaceTrustRequestService = _workspaceTrustRequestService;
        this._workspaceTrustManagementService = _workspaceTrustManagementService;
        this._logService = _logService;
        this._themeService = _themeService;
        this._lifecycleService = _lifecycleService;
        this._instantiationService = _instantiationService;
        this._chatService = _chatService;
        this._chatAgentService = _chatAgentService;
        this._hostService = _hostService;
        this._tasksReconnected = false;
        this._taskSystemListeners = [];
        this._onDidRegisterSupportedExecutions = new Emitter();
        this._onDidRegisterAllSupportedExecutions = new Emitter();
        this._onDidChangeTaskSystemInfo = new Emitter();
        this._willRestart = false;
        this.onDidChangeTaskSystemInfo = this._onDidChangeTaskSystemInfo.event;
        this._onDidReconnectToTasks = new Emitter();
        this.onDidReconnectToTasks = this._onDidReconnectToTasks.event;
        this._onDidChangeTaskConfig = new Emitter();
        this.onDidChangeTaskConfig = this._onDidChangeTaskConfig.event;
        this._onDidChangeTaskProviders = this._register(new Emitter());
        this.onDidChangeTaskProviders = this._onDidChangeTaskProviders.event;
        this._taskRunStartTimes = new Map();
        this._taskRunSources = new Map();
        this._activatedTaskProviders = new Set();
        this.notification = this._register(new MutableDisposable());
        this._whenTaskSystemReady = Event.toPromise(this.onDidChangeTaskSystemInfo);
        this._workspaceTasksPromise = undefined;
        this._taskSystem = undefined;
        this._taskSystemListeners = undefined;
        this._outputChannel = this._outputService.getChannel(AbstractTaskService_1.OutputChannelId);
        this._providers = new Map();
        this._providerTypes = new Map();
        this._taskSystemInfos = new Map();
        this._register(this._contextService.onDidChangeWorkspaceFolders(() => {
            const folderSetup = this._computeWorkspaceFolderSetup();
            if (this.executionEngine !== folderSetup[2]) {
                this._disposeTaskSystemListeners();
                this._taskSystem = undefined;
            }
            this._updateSetup(folderSetup);
            return this._updateWorkspaceTasks(2 /* TaskRunSource.FolderOpen */);
        }));
        this._register(this._configurationService.onDidChangeConfiguration(async (e) => {
            if (!e.affectsConfiguration('tasks') || (!this._taskSystem && !this._workspaceTasksPromise)) {
                return;
            }
            if (!this._taskSystem || this._taskSystem instanceof TerminalTaskSystem) {
                this._outputChannel.clear();
            }
            if (e.affectsConfiguration("task.reconnection" /* TaskSettingId.Reconnection */)) {
                if (!this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */)) {
                    this._persistentTasks?.clear();
                    this._storageService.remove(AbstractTaskService_1.PersistentTasks_Key, 1 /* StorageScope.WORKSPACE */);
                }
            }
            this._setTaskLRUCacheLimit();
            const mapStringToFolderTasks = await this._updateWorkspaceTasks(3 /* TaskRunSource.ConfigurationChange */);
            this._onDidChangeTaskConfig.fire();
            // Loop through all workspaceFolderTask result
            for (const [folderUri, folderResult] of mapStringToFolderTasks) {
                if (!folderResult.set?.tasks?.length) {
                    continue;
                }
                for (const task of folderResult.set.tasks) {
                    const realUniqueId = task._id;
                    const lastTask = this._taskSystem?.lastTask?.task._id;
                    if (lastTask && lastTask === realUniqueId && folderUri !== 'setting') {
                        const verifiedLastTask = new VerifiedTask(task, this._taskSystem.lastTask.resolver, Triggers.command);
                        this._taskSystem.lastTask = verifiedLastTask;
                    }
                }
            }
        }));
        this._taskRunningState = TASK_RUNNING_STATE.bindTo(_contextKeyService);
        this._tasksAvailableState = TasksAvailableContext.bindTo(_contextKeyService);
        this._onDidStateChange = this._register(new Emitter());
        this._registerCommands().then(() => TaskCommandsRegistered.bindTo(this._contextKeyService).set(true));
        ServerlessWebContext.bindTo(this._contextKeyService).set(Platform.isWeb && !remoteAgentService.getConnection()?.remoteAuthority);
        this._configurationResolverService.contributeVariable('defaultBuildTask', async () => {
            // delay provider activation, we might find a single default build task in the tasks.json file
            let tasks = await this._getTasksForGroup(TaskGroup.Build, true);
            if (tasks.length > 0) {
                const defaults = this._getDefaultTasks(tasks);
                if (defaults.length === 1) {
                    return defaults[0]._label;
                }
            }
            // activate all providers, we haven't found the default build task in the tasks.json file
            tasks = await this._getTasksForGroup(TaskGroup.Build);
            const defaults = this._getDefaultTasks(tasks);
            if (defaults.length === 1) {
                return defaults[0]._label;
            }
            else if (defaults.length) {
                tasks = defaults;
            }
            let entry;
            if (tasks && tasks.length > 0) {
                entry = await this._showQuickPick(tasks, nls.localize('TaskService.pickBuildTaskForLabel', 'Select the build task (there is no default build task defined)'));
            }
            const task = entry ? entry.task : undefined;
            if (!task) {
                return undefined;
            }
            return task._label;
        });
        this._register(this._lifecycleService.onBeforeShutdown(e => {
            this._willRestart = e.reason !== 3 /* ShutdownReason.RELOAD */;
        }));
        this._register(this.onDidStateChange(async (e) => {
            this._log(nls.localize('taskEvent', 'Task Event kind: {0}', e.kind), true);
            switch (e.kind) {
                case TaskEventKind.Start:
                    this._taskRunStartTimes.set(e.taskId, Date.now());
                    break;
                case TaskEventKind.ProcessEnded: {
                    const processEndedEvent = e;
                    const startTime = this._taskRunStartTimes.get(e.taskId);
                    if (!startTime) {
                        break;
                    }
                    const durationMs = processEndedEvent.durationMs ?? (Date.now() - startTime);
                    if (durationMs !== undefined) {
                        this._handleLongRunningTaskCompletion(processEndedEvent, durationMs);
                    }
                    this._taskRunStartTimes.delete(e.taskId);
                    this._taskRunSources.delete(e.taskId);
                    break;
                }
                case TaskEventKind.Inactive: {
                    const processEndedEvent = e;
                    const startTime = this._taskRunStartTimes.get(e.taskId);
                    if (!startTime) {
                        break;
                    }
                    const durationMs = processEndedEvent.durationMs ?? (Date.now() - startTime);
                    if (durationMs !== undefined) {
                        this._handleLongRunningTaskCompletion(processEndedEvent, durationMs);
                    }
                    this._taskRunStartTimes.delete(e.taskId);
                    this._taskRunSources.delete(e.taskId);
                    break;
                }
                case TaskEventKind.Terminated:
                    this._taskRunStartTimes.delete(e.taskId);
                    this._taskRunSources.delete(e.taskId);
                    break;
            }
            if (e.kind === TaskEventKind.Changed) {
                // no-op
            }
            else if ((this._willRestart || (e.kind === TaskEventKind.Terminated && e.exitReason === TerminalExitReason.User)) && e.taskId) {
                const key = e.__task.getKey();
                if (key) {
                    this.removePersistentTask(key);
                }
            }
            else if (e.kind === TaskEventKind.Start && e.__task && e.__task.getWorkspaceFolder()) {
                this._setPersistentTask(e.__task);
            }
        }));
        this._waitForAllSupportedExecutions = new Promise(resolve => {
            Event.once(this._onDidRegisterAllSupportedExecutions.event)(() => resolve());
        });
        this._terminalService.whenConnected.then(() => {
            const reconnectedInstances = this._terminalService.instances.filter(e => e.reconnectionProperties?.ownerId === TaskTerminalType);
            if (reconnectedInstances.length) {
                this._attemptTaskReconnection();
            }
            else {
                this._tasksReconnected = true;
                this._onDidReconnectToTasks.fire();
            }
        });
        this._upgrade();
    }
    registerSupportedExecutions(custom, shell, process) {
        if (custom !== undefined) {
            const customContext = CustomExecutionSupportedContext.bindTo(this._contextKeyService);
            customContext.set(custom);
        }
        const isVirtual = !!VirtualWorkspaceContext.getValue(this._contextKeyService);
        if (shell !== undefined) {
            const shellContext = ShellExecutionSupportedContext.bindTo(this._contextKeyService);
            shellContext.set(shell && !isVirtual);
        }
        if (process !== undefined) {
            const processContext = ProcessExecutionSupportedContext.bindTo(this._contextKeyService);
            processContext.set(process && !isVirtual);
        }
        // update tasks so an incomplete list isn't returned when getWorkspaceTasks is called
        this._workspaceTasksPromise = undefined;
        this._onDidRegisterSupportedExecutions.fire();
        if (ServerlessWebContext.getValue(this._contextKeyService) || (custom && shell && process)) {
            this._onDidRegisterAllSupportedExecutions.fire();
        }
    }
    _attemptTaskReconnection() {
        if (this._lifecycleService.startupKind !== 3 /* StartupKind.ReloadedWindow */) {
            this._log(nls.localize('TaskService.skippingReconnection', 'Startup kind not window reload, setting connected and removing persistent tasks'), true);
            this._tasksReconnected = true;
            this._storageService.remove(AbstractTaskService_1.PersistentTasks_Key, 1 /* StorageScope.WORKSPACE */);
        }
        if (!this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */) || this._tasksReconnected) {
            this._log(nls.localize('TaskService.notConnecting', 'Setting tasks connected configured value {0}, tasks were already reconnected {1}', this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */), this._tasksReconnected), true);
            this._tasksReconnected = true;
            return;
        }
        this._log(nls.localize('TaskService.reconnecting', 'Reconnecting to running tasks...'), true);
        this.getWorkspaceTasks(4 /* TaskRunSource.Reconnect */).then(async () => {
            this._tasksReconnected = await this._reconnectTasks();
            this._log(nls.localize('TaskService.reconnected', 'Reconnected to running tasks.'), true);
            this._onDidReconnectToTasks.fire();
        });
    }
    async _handleLongRunningTaskCompletion(event, durationMs) {
        const notificationThreshold = this._configurationService.getValue("task.notifyWindowOnTaskCompletion" /* TaskSettingId.NotifyWindowOnTaskCompletion */);
        // If threshold is -1, notifications are disabled
        // If threshold is 0, always show notifications (no minimum duration)
        // Otherwise, only show if duration meets or exceeds the threshold
        if (notificationThreshold === -1 || (notificationThreshold > 0 && durationMs < notificationThreshold)) {
            return;
        }
        const taskRunSource = this._taskRunSources.get(event.taskId);
        if (taskRunSource === 5 /* TaskRunSource.ChatAgent */) {
            return;
        }
        const terminalForTask = this._terminalService.instances.find(i => i.instanceId === event.terminalId);
        if (!terminalForTask) {
            return;
        }
        const taskLabel = terminalForTask.title;
        const targetWindow = dom.getWindow(terminalForTask.domElement);
        if (targetWindow.document.hasFocus()) {
            return;
        }
        const durationText = this._formatTaskDuration(durationMs);
        const message = taskLabel
            ? nls.localize('task.longRunningTaskCompletedWithLabel', 'Task "{0}" finished in {1}.', taskLabel, durationText)
            : nls.localize('task.longRunningTaskCompleted', 'Task finished in {0}.', durationText);
        this._hostService.focus(targetWindow, { mode: 1 /* FocusMode.Notify */ });
        const notification = await dom.triggerNotification(message);
        if (notification) {
            const disposables = this.notification.value = new DisposableStore();
            disposables.add(notification);
            disposables.add(Event.once(notification.onClick)(() => {
                this._hostService.focus(targetWindow, { mode: 2 /* FocusMode.Force */ });
            }));
            disposables.add(this._hostService.onDidChangeFocus(focus => {
                if (focus) {
                    disposables.dispose();
                }
            }));
        }
    }
    _formatTaskDuration(durationMs) {
        const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        if (minutes > 0) {
            return seconds > 0
                ? nls.localize('task.longRunningTaskDurationMinutesSeconds', '{0}m {1}s', minutes, seconds)
                : nls.localize('task.longRunningTaskDurationMinutes', '{0}m', minutes);
        }
        return nls.localize('task.longRunningTaskDurationSeconds', '{0}s', seconds);
    }
    async _reconnectTasks() {
        const tasks = await this.getSavedTasks('persistent');
        if (!tasks.length) {
            this._log(nls.localize('TaskService.noTasks', 'No persistent tasks to reconnect.'), true);
            return true;
        }
        const taskLabels = tasks.map(task => task._label).join(', ');
        this._log(nls.localize('TaskService.reconnectingTasks', 'Reconnecting to {0} tasks...', taskLabels), true);
        for (const task of tasks) {
            if (ConfiguringTask.is(task)) {
                const resolved = await this.tryResolveTask(task);
                if (resolved) {
                    this.run(resolved, undefined, 4 /* TaskRunSource.Reconnect */);
                }
            }
            else {
                this.run(task, undefined, 4 /* TaskRunSource.Reconnect */);
            }
        }
        return true;
    }
    get onDidStateChange() {
        return this._onDidStateChange.event;
    }
    get supportsMultipleTaskExecutions() {
        return this.inTerminal();
    }
    async _registerCommands() {
        CommandsRegistry.registerCommand({
            id: 'workbench.action.tasks.runTask',
            handler: async (accessor, arg) => {
                if (await this._trust()) {
                    await this._runTaskCommand(arg);
                }
            },
            metadata: {
                description: 'Run Task',
                args: [{
                        name: 'args',
                        isOptional: true,
                        description: nls.localize('runTask.arg', "Filters the tasks shown in the quickpick"),
                        schema: {
                            anyOf: [
                                {
                                    type: 'string',
                                    description: nls.localize('runTask.label', "The task's label or a term to filter by")
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        type: {
                                            type: 'string',
                                            description: nls.localize('runTask.type', "The contributed task type")
                                        },
                                        task: {
                                            type: 'string',
                                            description: nls.localize('runTask.task', "The task's label or a term to filter by")
                                        }
                                    }
                                }
                            ]
                        }
                    }]
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.reRunTask', async (accessor) => {
            if (await this._trust()) {
                this._reRunTaskCommand();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.restartTask', async (accessor, arg) => {
            if (await this._trust()) {
                this._runRestartTaskCommand(arg);
            }
        });
        CommandsRegistry.registerCommand(RerunAllRunningTasksCommandId, async (accessor) => {
            if (await this._trust()) {
                this._runRerunAllRunningTasksCommand();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.terminate', async (accessor, arg) => {
            if (await this._trust()) {
                this._runTerminateCommand(arg);
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.showLog', () => {
            this._showOutput(undefined, true);
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.build', async () => {
            if (await this._trust()) {
                this._runBuildCommand();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.test', async () => {
            if (await this._trust()) {
                this._runTestCommand();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.configureTaskRunner', async () => {
            if (await this._trust()) {
                this._runConfigureTasks();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.configureDefaultBuildTask', async () => {
            if (await this._trust()) {
                this._runConfigureDefaultBuildTask();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.configureDefaultTestTask', async () => {
            if (await this._trust()) {
                this._runConfigureDefaultTestTask();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.showTasks', async () => {
            if (await this._trust()) {
                return this.runShowTasks();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.toggleProblems', () => this._commandService.executeCommand(Markers.TOGGLE_MARKERS_VIEW_ACTION_ID));
        CommandsRegistry.registerCommand('workbench.action.tasks.openUserTasks', async () => {
            const resource = this._getResourceForKind(TaskSourceKind.User);
            if (resource) {
                this._openTaskFile(resource, TaskSourceKind.User);
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.openWorkspaceFileTasks', async () => {
            const resource = this._getResourceForKind(TaskSourceKind.WorkspaceFile);
            if (resource) {
                this._openTaskFile(resource, TaskSourceKind.WorkspaceFile);
            }
        });
    }
    get workspaceFolders() {
        if (!this._workspaceFolders) {
            this._updateSetup();
        }
        return this._workspaceFolders;
    }
    get ignoredWorkspaceFolders() {
        if (!this._ignoredWorkspaceFolders) {
            this._updateSetup();
        }
        return this._ignoredWorkspaceFolders;
    }
    get executionEngine() {
        if (this._executionEngine === undefined) {
            this._updateSetup();
        }
        return this._executionEngine;
    }
    get schemaVersion() {
        if (this._schemaVersion === undefined) {
            this._updateSetup();
        }
        return this._schemaVersion;
    }
    get showIgnoreMessage() {
        if (this._showIgnoreMessage === undefined) {
            this._showIgnoreMessage = !this._storageService.getBoolean(AbstractTaskService_1.IgnoreTask010DonotShowAgain_key, 1 /* StorageScope.WORKSPACE */, false);
        }
        return this._showIgnoreMessage;
    }
    _getActivationEvents(type) {
        const result = [];
        result.push('onCommand:workbench.action.tasks.runTask');
        if (type) {
            // send a specific activation event for this task type
            result.push(`onTaskType:${type}`);
        }
        else {
            // send activation events for all task types
            for (const definition of TaskDefinitionRegistry.all()) {
                result.push(`onTaskType:${definition.taskType}`);
            }
        }
        return result;
    }
    async _activateTaskProviders(type) {
        // We need to first wait for extensions to be registered because we might read
        // the `TaskDefinitionRegistry` in case `type` is `undefined`
        await this._extensionService.whenInstalledExtensionsRegistered();
        const hasLoggedActivation = this._activatedTaskProviders.has(type ?? 'all');
        if (!hasLoggedActivation) {
            this._log('Activating task providers ' + (type ?? 'all'));
        }
        const result = await raceTimeout(Promise.all(this._getActivationEvents(type).map(activationEvent => this._extensionService.activateByEvent(activationEvent))), 5000, () => this._logService.warn('Timed out activating extensions for task providers'));
        if (result) {
            this._activatedTaskProviders.add(type ?? 'all');
        }
    }
    _updateSetup(setup) {
        if (!setup) {
            setup = this._computeWorkspaceFolderSetup();
        }
        this._workspaceFolders = setup[0];
        if (this._ignoredWorkspaceFolders) {
            if (this._ignoredWorkspaceFolders.length !== setup[1].length) {
                this._showIgnoreMessage = undefined;
            }
            else {
                const set = new Set();
                this._ignoredWorkspaceFolders.forEach(folder => set.add(folder.uri.toString()));
                for (const folder of setup[1]) {
                    if (!set.has(folder.uri.toString())) {
                        this._showIgnoreMessage = undefined;
                        break;
                    }
                }
            }
        }
        this._ignoredWorkspaceFolders = setup[1];
        this._executionEngine = setup[2];
        this._schemaVersion = setup[3];
        this._workspace = setup[4];
    }
    _showOutput(runSource = 1 /* TaskRunSource.User */, userRequested, errorMessage) {
        if (!VirtualWorkspaceContext.getValue(this._contextKeyService) && ((runSource === 1 /* TaskRunSource.User */) || (runSource === 3 /* TaskRunSource.ConfigurationChange */))) {
            if (userRequested) {
                this._outputService.showChannel(this._outputChannel.id, true);
            }
            else {
                const chatEnabled = this._chatService.isEnabled(ChatAgentLocation.Chat);
                const actions = [];
                if (chatEnabled && errorMessage) {
                    const beforeJSONregex = /^(.*?)\s*\{[\s\S]*$/;
                    const matches = errorMessage.match(beforeJSONregex);
                    if (matches && matches.length > 1) {
                        const message = matches[1];
                        const customMessage = message === errorMessage
                            ? `\`${message}\``
                            : `\`${message}\`\n\`\`\`json${errorMessage}\`\`\``;
                        const defaultAgent = this._chatAgentService.getDefaultAgent(ChatAgentLocation.Chat);
                        if (defaultAgent) {
                            actions.push({
                                label: nls.localize('troubleshootWithChat', "Fix with AI"),
                                run: async () => {
                                    this._commandService.executeCommand(CHAT_OPEN_ACTION_ID, {
                                        mode: ChatModeKind.Agent,
                                        query: `Fix this task configuration error: ${customMessage}`
                                    });
                                }
                            });
                        }
                    }
                }
                actions.push({
                    label: nls.localize('showOutput', "Show Output"),
                    run: () => {
                        this._outputService.showChannel(this._outputChannel.id, true);
                    }
                });
                if (chatEnabled && actions.length > 1) {
                    this._notificationService.prompt(Severity.Warning, nls.localize('taskServiceOutputPromptChat', 'There are task errors. Use chat to fix them or view the output for details.'), actions);
                }
                else {
                    this._notificationService.prompt(Severity.Warning, nls.localize('taskServiceOutputPrompt', 'There are task errors. See the output for details.'), actions);
                }
            }
        }
    }
    _disposeTaskSystemListeners() {
        if (this._taskSystemListeners) {
            dispose(this._taskSystemListeners);
            this._taskSystemListeners = undefined;
        }
    }
    registerTaskProvider(provider, type) {
        if (!provider) {
            return {
                dispose: () => { }
            };
        }
        const handle = AbstractTaskService_1._nextHandle++;
        this._providers.set(handle, provider);
        this._providerTypes.set(handle, type);
        this._onDidChangeTaskProviders.fire();
        return {
            dispose: () => {
                this._providers.delete(handle);
                this._providerTypes.delete(handle);
                this._onDidChangeTaskProviders.fire();
            }
        };
    }
    get hasTaskSystemInfo() {
        const infosCount = Array.from(this._taskSystemInfos.values()).flat().length;
        // If there's a remoteAuthority, then we end up with 2 taskSystemInfos,
        // one for each extension host.
        if (this._environmentService.remoteAuthority) {
            return infosCount > 1;
        }
        return infosCount > 0;
    }
    registerTaskSystem(key, info) {
        // Ideally the Web caller of registerRegisterTaskSystem would use the correct key.
        // However, the caller doesn't know about the workspace folders at the time of the call, even though we know about them here.
        if (info.platform === 0 /* Platform.Platform.Web */) {
            key = this.workspaceFolders.length ? this.workspaceFolders[0].uri.scheme : key;
        }
        if (!this._taskSystemInfos.has(key)) {
            this._taskSystemInfos.set(key, [info]);
        }
        else {
            const infos = this._taskSystemInfos.get(key);
            if (info.platform === 0 /* Platform.Platform.Web */) {
                // Web infos should be pushed last.
                infos.push(info);
            }
            else {
                infos.unshift(info);
            }
        }
        if (this.hasTaskSystemInfo) {
            this._onDidChangeTaskSystemInfo.fire();
        }
    }
    _getTaskSystemInfo(key) {
        const infos = this._taskSystemInfos.get(key);
        return (infos && infos.length) ? infos[0] : undefined;
    }
    extensionCallbackTaskComplete(task, result) {
        if (!this._taskSystem) {
            return Promise.resolve();
        }
        return this._taskSystem.customExecutionComplete(task, result);
    }
    /**
     * Get a subset of workspace tasks that match a certain predicate.
     */
    async _findWorkspaceTasks(predicate) {
        const result = [];
        const tasks = await this.getWorkspaceTasks();
        for (const [, workspaceTasks] of tasks) {
            if (workspaceTasks.configurations) {
                for (const taskName in workspaceTasks.configurations.byIdentifier) {
                    const task = workspaceTasks.configurations.byIdentifier[taskName];
                    if (predicate(task, workspaceTasks.workspaceFolder)) {
                        result.push(task);
                    }
                }
            }
            if (workspaceTasks.set) {
                for (const task of workspaceTasks.set.tasks) {
                    if (predicate(task, workspaceTasks.workspaceFolder)) {
                        result.push(task);
                    }
                }
            }
        }
        return result;
    }
    async _findWorkspaceTasksInGroup(group, isDefault) {
        return this._findWorkspaceTasks((task) => {
            const taskGroup = task.configurationProperties.group;
            if (taskGroup && typeof taskGroup !== 'string') {
                return (taskGroup._id === group._id && (!isDefault || !!taskGroup.isDefault));
            }
            return false;
        });
    }
    async getTask(folder, identifier, compareId = false, type = undefined) {
        if (!(await this._trust())) {
            return;
        }
        const name = Types.isString(folder) ? folder : isWorkspaceFolder(folder) ? folder.name : folder.configuration ? resources.basename(folder.configuration) : undefined;
        if (this.ignoredWorkspaceFolders.some(ignored => ignored.name === name)) {
            return Promise.reject(new Error(nls.localize('TaskServer.folderIgnored', 'The folder {0} is ignored since it uses task version 0.1.0', name)));
        }
        const key = !Types.isString(identifier)
            ? TaskDefinition.createTaskIdentifier(identifier, console)
            : identifier;
        if (key === undefined) {
            return Promise.resolve(undefined);
        }
        // Try to find the task in the workspace
        const requestedFolder = TaskMap.getKey(folder);
        const matchedTasks = await this._findWorkspaceTasks((task, workspaceFolder) => {
            const taskFolder = TaskMap.getKey(workspaceFolder);
            if (taskFolder !== requestedFolder && taskFolder !== USER_TASKS_GROUP_KEY) {
                return false;
            }
            return task.matches(key, compareId);
        });
        matchedTasks.sort(task => task._source.kind === TaskSourceKind.Extension ? 1 : -1);
        if (matchedTasks.length > 0) {
            // Nice, we found a configured task!
            const task = matchedTasks[0];
            if (ConfiguringTask.is(task)) {
                return this.tryResolveTask(task);
            }
            else {
                return task;
            }
        }
        // We didn't find the task, so we need to ask all resolvers about it
        const map = await this._getGroupedTasks({ type });
        let values = map.get(folder);
        values = values.concat(map.get(USER_TASKS_GROUP_KEY));
        if (!values) {
            return undefined;
        }
        values = values.filter(task => task.matches(key, compareId)).sort(task => task._source.kind === TaskSourceKind.Extension ? 1 : -1);
        return values.length > 0 ? values[0] : undefined;
    }
    async tryResolveTask(configuringTask) {
        if (!(await this._trust())) {
            return;
        }
        await this._activateTaskProviders(configuringTask.type);
        let matchingProvider;
        let matchingProviderUnavailable = false;
        for (const [handle, provider] of this._providers) {
            const providerType = this._providerTypes.get(handle);
            if (configuringTask.type === providerType) {
                if (providerType && !this._isTaskProviderEnabled(providerType)) {
                    matchingProviderUnavailable = true;
                    continue;
                }
                matchingProvider = provider;
                break;
            }
        }
        if (!matchingProvider) {
            if (matchingProviderUnavailable) {
                this._log(nls.localize('TaskService.providerUnavailable', 'Warning: {0} tasks are unavailable in the current environment.', configuringTask.configures.type));
            }
            return;
        }
        // Try to resolve the task first
        try {
            const resolvedTask = await matchingProvider.resolveTask(configuringTask);
            if (resolvedTask && (resolvedTask._id === configuringTask._id)) {
                return TaskConfig.createCustomTask(resolvedTask, configuringTask);
            }
        }
        catch (error) {
            // Ignore errors. The task could not be provided by any of the providers.
        }
        // The task couldn't be resolved. Instead, use the less efficient provideTask.
        const tasks = await this.tasks({ type: configuringTask.type });
        for (const task of tasks) {
            if (task._id === configuringTask._id) {
                return TaskConfig.createCustomTask(task, configuringTask);
            }
        }
        return;
    }
    async tasks(filter) {
        if (!(await this._trust())) {
            return [];
        }
        if (!this._versionAndEngineCompatible(filter)) {
            return Promise.resolve([]);
        }
        return this._getGroupedTasks(filter).then((map) => this.applyFilterToTaskMap(filter, map));
    }
    async getKnownTasks(filter) {
        if (!this._versionAndEngineCompatible(filter)) {
            return Promise.resolve([]);
        }
        return this._getGroupedTasks(filter, true, true).then((map) => this.applyFilterToTaskMap(filter, map));
    }
    taskTypes() {
        const types = [];
        if (this._isProvideTasksEnabled()) {
            for (const definition of TaskDefinitionRegistry.all()) {
                if (this._isTaskProviderEnabled(definition.taskType)) {
                    types.push(definition.taskType);
                }
            }
        }
        return types;
    }
    createSorter() {
        return new TaskSorter(this._contextService.getWorkspace() ? this._contextService.getWorkspace().folders : []);
    }
    _isActive() {
        if (!this._taskSystem) {
            return Promise.resolve(false);
        }
        return this._taskSystem.isActive();
    }
    async getActiveTasks() {
        if (!this._taskSystem) {
            return [];
        }
        return this._taskSystem.getActiveTasks();
    }
    async getBusyTasks() {
        if (!this._taskSystem) {
            return [];
        }
        return this._taskSystem.getBusyTasks();
    }
    getRecentlyUsedTasksV1() {
        if (this._recentlyUsedTasksV1) {
            return this._recentlyUsedTasksV1;
        }
        const quickOpenHistoryLimit = this._configurationService.getValue(QUICKOPEN_HISTORY_LIMIT_CONFIG);
        this._recentlyUsedTasksV1 = new LRUCache(quickOpenHistoryLimit);
        const storageValue = this._storageService.get(AbstractTaskService_1.RecentlyUsedTasks_Key, 1 /* StorageScope.WORKSPACE */);
        if (storageValue) {
            try {
                const values = JSON.parse(storageValue);
                if (Array.isArray(values)) {
                    for (const value of values) {
                        this._recentlyUsedTasksV1.set(value, value);
                    }
                }
            }
            catch (error) {
                // Ignore. We use the empty result
            }
        }
        return this._recentlyUsedTasksV1;
    }
    applyFilterToTaskMap(filter, map) {
        if (!filter || !filter.type) {
            return map.all();
        }
        const result = [];
        map.forEach((tasks) => {
            for (const task of tasks) {
                if (ContributedTask.is(task) && ((task.defines.type === filter.type) || (task._source.label === filter.type))) {
                    result.push(task);
                }
                else if (CustomTask.is(task)) {
                    if (task.type === filter.type) {
                        result.push(task);
                    }
                    else {
                        const customizes = task.customizes();
                        if (customizes && customizes.type === filter.type) {
                            result.push(task);
                        }
                    }
                }
            }
        });
        return result;
    }
    _getTasksFromStorage(type) {
        return type === 'persistent' ? this._getPersistentTasks() : this._getRecentTasks();
    }
    _getRecentTasks() {
        if (this._recentlyUsedTasks) {
            return this._recentlyUsedTasks;
        }
        const quickOpenHistoryLimit = this._configurationService.getValue(QUICKOPEN_HISTORY_LIMIT_CONFIG);
        this._recentlyUsedTasks = new LRUCache(quickOpenHistoryLimit);
        const storageValue = this._storageService.get(AbstractTaskService_1.RecentlyUsedTasks_KeyV2, 1 /* StorageScope.WORKSPACE */);
        if (storageValue) {
            try {
                const values = JSON.parse(storageValue);
                if (Array.isArray(values)) {
                    for (const value of values) {
                        this._recentlyUsedTasks.set(value[0], value[1]);
                    }
                }
            }
            catch (error) {
                // Ignore. We use the empty result
            }
        }
        return this._recentlyUsedTasks;
    }
    _getPersistentTasks() {
        if (this._persistentTasks) {
            this._log(nls.localize('taskService.gettingCachedTasks', 'Returning cached tasks {0}', this._persistentTasks.size), true);
            return this._persistentTasks;
        }
        //TODO: should this # be configurable?
        this._persistentTasks = new LRUCache(10);
        const storageValue = this._storageService.get(AbstractTaskService_1.PersistentTasks_Key, 1 /* StorageScope.WORKSPACE */);
        if (storageValue) {
            try {
                const values = JSON.parse(storageValue);
                if (Array.isArray(values)) {
                    for (const value of values) {
                        this._persistentTasks.set(value[0], value[1]);
                    }
                }
            }
            catch (error) {
                // Ignore. We use the empty result
            }
        }
        return this._persistentTasks;
    }
    _getFolderFromTaskKey(key) {
        const keyValue = JSON.parse(key);
        return {
            folder: keyValue.folder, isWorkspaceFile: keyValue.id?.endsWith(TaskSourceKind.WorkspaceFile)
        };
    }
    async getSavedTasks(type) {
        const folderMap = Object.create(null);
        this.workspaceFolders.forEach(folder => {
            folderMap[folder.uri.toString()] = folder;
        });
        const folderToTasksMap = new Map();
        const workspaceToTaskMap = new Map();
        const storedTasks = this._getTasksFromStorage(type);
        const tasks = [];
        this._log(nls.localize('taskService.getSavedTasks', 'Fetching tasks from task storage.'), true);
        function addTaskToMap(map, folder, task) {
            if (folder && !map.has(folder)) {
                map.set(folder, []);
            }
            if (folder && (folderMap[folder] || (folder === USER_TASKS_GROUP_KEY)) && task) {
                map.get(folder).push(task);
            }
        }
        for (const entry of storedTasks.entries()) {
            try {
                const key = entry[0];
                const task = JSON.parse(entry[1]);
                const folderInfo = this._getFolderFromTaskKey(key);
                this._log(nls.localize('taskService.getSavedTasks.reading', 'Reading tasks from task storage, {0}, {1}, {2}', key, task, folderInfo.folder), true);
                addTaskToMap(folderInfo.isWorkspaceFile ? workspaceToTaskMap : folderToTasksMap, folderInfo.folder, task);
            }
            catch (error) {
                this._log(nls.localize('taskService.getSavedTasks.error', 'Fetching a task from task storage failed: {0}.', error), true);
            }
        }
        const readTasksMap = new Map();
        async function readTasks(that, map, isWorkspaceFile) {
            for (const key of map.keys()) {
                const custom = [];
                const customized = Object.create(null);
                const taskConfigSource = (folderMap[key]
                    ? (isWorkspaceFile
                        ? TaskConfig.TaskConfigSource.WorkspaceFile : TaskConfig.TaskConfigSource.TasksJson)
                    : TaskConfig.TaskConfigSource.User);
                await that._computeTasksForSingleConfig(folderMap[key] ?? await that._getAFolder(), {
                    version: '2.0.0',
                    tasks: map.get(key)
                }, 0 /* TaskRunSource.System */, custom, customized, taskConfigSource, true);
                custom.forEach(task => {
                    const taskKey = task.getKey();
                    if (taskKey) {
                        readTasksMap.set(taskKey, task);
                    }
                });
                for (const configuration in customized) {
                    const taskKey = customized[configuration].getKey();
                    if (taskKey) {
                        readTasksMap.set(taskKey, customized[configuration]);
                    }
                }
            }
        }
        await readTasks(this, folderToTasksMap, false);
        await readTasks(this, workspaceToTaskMap, true);
        for (const key of storedTasks.keys()) {
            if (readTasksMap.has(key)) {
                tasks.push(readTasksMap.get(key));
                this._log(nls.localize('taskService.getSavedTasks.resolved', 'Resolved task {0}', key), true);
            }
            else {
                this._log(nls.localize('taskService.getSavedTasks.unresolved', 'Unable to resolve task {0} ', key), true);
            }
        }
        return tasks;
    }
    removeRecentlyUsedTask(taskRecentlyUsedKey) {
        if (this._getTasksFromStorage('historical').has(taskRecentlyUsedKey)) {
            this._getTasksFromStorage('historical').delete(taskRecentlyUsedKey);
            this._saveRecentlyUsedTasks();
        }
    }
    removePersistentTask(key) {
        this._log(nls.localize('taskService.removePersistentTask', 'Removing persistent task {0}', key), true);
        if (this._getTasksFromStorage('persistent').has(key)) {
            this._getTasksFromStorage('persistent').delete(key);
            this._savePersistentTasks();
        }
    }
    _setTaskLRUCacheLimit() {
        const quickOpenHistoryLimit = this._configurationService.getValue(QUICKOPEN_HISTORY_LIMIT_CONFIG);
        if (this._recentlyUsedTasks) {
            this._recentlyUsedTasks.limit = quickOpenHistoryLimit;
        }
    }
    async _setRecentlyUsedTask(task) {
        let key = task.getKey();
        if (!InMemoryTask.is(task) && key) {
            const customizations = this._createCustomizableTask(task);
            if (ContributedTask.is(task) && customizations) {
                const custom = [];
                const customized = Object.create(null);
                await this._computeTasksForSingleConfig(task._source.workspaceFolder ?? this.workspaceFolders[0], {
                    version: '2.0.0',
                    tasks: [customizations]
                }, 0 /* TaskRunSource.System */, custom, customized, TaskConfig.TaskConfigSource.TasksJson, true);
                for (const configuration in customized) {
                    key = customized[configuration].getKey();
                }
            }
            this._getTasksFromStorage('historical').set(key, JSON.stringify(customizations));
            this._saveRecentlyUsedTasks();
        }
    }
    _saveRecentlyUsedTasks() {
        if (!this._recentlyUsedTasks) {
            return;
        }
        const quickOpenHistoryLimit = this._configurationService.getValue(QUICKOPEN_HISTORY_LIMIT_CONFIG);
        // setting history limit to 0 means no LRU sorting
        if (quickOpenHistoryLimit === 0) {
            return;
        }
        let keys = [...this._recentlyUsedTasks.keys()];
        if (keys.length > quickOpenHistoryLimit) {
            keys = keys.slice(0, quickOpenHistoryLimit);
        }
        const keyValues = [];
        for (const key of keys) {
            keyValues.push([key, this._recentlyUsedTasks.get(key, 0 /* Touch.None */)]);
        }
        this._storageService.store(AbstractTaskService_1.RecentlyUsedTasks_KeyV2, JSON.stringify(keyValues), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async _setPersistentTask(task) {
        if (!this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */)) {
            return;
        }
        let key = task.getKey();
        if (!InMemoryTask.is(task) && key) {
            const customizations = this._createCustomizableTask(task);
            if (ContributedTask.is(task) && customizations) {
                const custom = [];
                const customized = Object.create(null);
                await this._computeTasksForSingleConfig(task._source.workspaceFolder ?? this.workspaceFolders[0], {
                    version: '2.0.0',
                    tasks: [customizations]
                }, 0 /* TaskRunSource.System */, custom, customized, TaskConfig.TaskConfigSource.TasksJson, true);
                for (const configuration in customized) {
                    key = customized[configuration].getKey();
                }
            }
            if (!task.configurationProperties.isBackground) {
                return;
            }
            this._log(nls.localize('taskService.setPersistentTask', 'Setting persistent task {0}', key), true);
            this._getTasksFromStorage('persistent').set(key, JSON.stringify(customizations));
            this._savePersistentTasks();
        }
    }
    _savePersistentTasks() {
        this._persistentTasks = this._getTasksFromStorage('persistent');
        const keys = [...this._persistentTasks.keys()];
        const keyValues = [];
        for (const key of keys) {
            keyValues.push([key, this._persistentTasks.get(key, 0 /* Touch.None */)]);
        }
        this._log(nls.localize('savePersistentTask', 'Saving persistent tasks: {0}', keys.join(', ')), true);
        this._storageService.store(AbstractTaskService_1.PersistentTasks_Key, JSON.stringify(keyValues), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    _openDocumentation() {
        this._openerService.open(URI.parse('https://code.visualstudio.com/docs/editor/tasks#_defining-a-problem-matcher'));
    }
    async _findSingleWorkspaceTaskOfGroup(group) {
        const tasksOfGroup = await this._findWorkspaceTasksInGroup(group, true);
        if ((tasksOfGroup.length === 1) && (typeof tasksOfGroup[0].configurationProperties.group !== 'string') && tasksOfGroup[0].configurationProperties.group?.isDefault) {
            let resolvedTask;
            if (ConfiguringTask.is(tasksOfGroup[0])) {
                resolvedTask = await this.tryResolveTask(tasksOfGroup[0]);
            }
            else {
                resolvedTask = tasksOfGroup[0];
            }
            if (resolvedTask) {
                return this.run(resolvedTask, undefined, 1 /* TaskRunSource.User */);
            }
        }
        return undefined;
    }
    async _build() {
        const tryBuildShortcut = await this._findSingleWorkspaceTaskOfGroup(TaskGroup.Build);
        if (tryBuildShortcut) {
            return tryBuildShortcut;
        }
        return this._getGroupedTasksAndExecute();
    }
    async _runTest() {
        const tryTestShortcut = await this._findSingleWorkspaceTaskOfGroup(TaskGroup.Test);
        if (tryTestShortcut) {
            return tryTestShortcut;
        }
        return this._getGroupedTasksAndExecute(true);
    }
    async _getGroupedTasksAndExecute(test) {
        const tasks = await this._getGroupedTasks();
        const runnable = this._createRunnableTask(tasks, test ? TaskGroup.Test : TaskGroup.Build);
        if (!runnable || !runnable.task) {
            if (test) {
                if (this.schemaVersion === 1 /* JsonSchemaVersion.V0_1_0 */) {
                    throw new TaskError(Severity.Info, nls.localize('TaskService.noTestTask1', 'No test task defined. Mark a task with \'isTestCommand\' in the tasks.json file.'), 3 /* TaskErrors.NoTestTask */);
                }
                else {
                    throw new TaskError(Severity.Info, nls.localize('TaskService.noTestTask2', 'No test task defined. Mark a task with as a \'test\' group in the tasks.json file.'), 3 /* TaskErrors.NoTestTask */);
                }
            }
            else {
                if (this.schemaVersion === 1 /* JsonSchemaVersion.V0_1_0 */) {
                    throw new TaskError(Severity.Info, nls.localize('TaskService.noBuildTask1', 'No build task defined. Mark a task with \'isBuildCommand\' in the tasks.json file.'), 2 /* TaskErrors.NoBuildTask */);
                }
                else {
                    throw new TaskError(Severity.Info, nls.localize('TaskService.noBuildTask2', 'No build task defined. Mark a task with as a \'build\' group in the tasks.json file.'), 2 /* TaskErrors.NoBuildTask */);
                }
            }
        }
        let executeTaskResult;
        try {
            executeTaskResult = await this._executeTask(runnable.task, runnable.resolver, 1 /* TaskRunSource.User */);
        }
        catch (error) {
            this._handleError(error);
            return Promise.reject(error);
        }
        return executeTaskResult;
    }
    async run(task, options, runSource = 0 /* TaskRunSource.System */) {
        if (!(await this._trust())) {
            return;
        }
        if (!task) {
            throw new TaskError(Severity.Info, nls.localize('TaskServer.noTask', 'Task to execute is undefined'), 5 /* TaskErrors.TaskNotFound */);
        }
        const resolver = this._createResolver();
        let executeTaskResult;
        try {
            if (options && options.attachProblemMatcher && this._shouldAttachProblemMatcher(task) && !InMemoryTask.is(task)) {
                const taskToExecute = await this._attachProblemMatcher(task);
                if (taskToExecute) {
                    executeTaskResult = await this._executeTask(taskToExecute, resolver, runSource);
                }
            }
            else {
                executeTaskResult = await this._executeTask(task, resolver, runSource);
            }
            return executeTaskResult;
        }
        catch (error) {
            this._handleError(error);
            return Promise.reject(error);
        }
    }
    _isProvideTasksEnabled() {
        const settingValue = this._configurationService.getValue("task.autoDetect" /* TaskSettingId.AutoDetect */);
        return settingValue === 'on';
    }
    _isProblemMatcherPromptEnabled(type) {
        const settingValue = this._configurationService.getValue(PROBLEM_MATCHER_NEVER_CONFIG);
        if (Types.isBoolean(settingValue)) {
            return !settingValue;
        }
        if (type === undefined) {
            return true;
        }
        // eslint-disable-next-line local/code-no-any-casts
        const settingValueMap = settingValue;
        return !settingValueMap[type];
    }
    _getTypeForTask(task) {
        let type;
        if (CustomTask.is(task)) {
            const configProperties = task._source.config.element;
            // eslint-disable-next-line local/code-no-any-casts
            type = configProperties.type;
        }
        else {
            type = task.getDefinition().type;
        }
        return type;
    }
    _shouldAttachProblemMatcher(task) {
        const enabled = this._isProblemMatcherPromptEnabled(this._getTypeForTask(task));
        if (enabled === false) {
            return false;
        }
        if (!this._canCustomize(task)) {
            return false;
        }
        if (task.configurationProperties.group !== undefined && task.configurationProperties.group !== TaskGroup.Build) {
            return false;
        }
        if (task.configurationProperties.problemMatchers !== undefined && task.configurationProperties.problemMatchers.length > 0) {
            return false;
        }
        if (ContributedTask.is(task)) {
            return !task.hasDefinedMatchers && !!task.configurationProperties.problemMatchers && (task.configurationProperties.problemMatchers.length === 0);
        }
        if (CustomTask.is(task)) {
            const configProperties = task._source.config.element;
            return configProperties.problemMatcher === undefined && !task.hasDefinedMatchers;
        }
        return false;
    }
    async _updateNeverProblemMatcherSetting(type) {
        const current = this._configurationService.getValue(PROBLEM_MATCHER_NEVER_CONFIG);
        if (current === true) {
            return;
        }
        let newValue;
        if (current !== false) {
            // eslint-disable-next-line local/code-no-any-casts
            newValue = current;
        }
        else {
            newValue = Object.create(null);
        }
        newValue[type] = true;
        return this._configurationService.updateValue(PROBLEM_MATCHER_NEVER_CONFIG, newValue);
    }
    async _attachProblemMatcher(task) {
        let entries = [];
        for (const key of ProblemMatcherRegistry.keys()) {
            const matcher = ProblemMatcherRegistry.get(key);
            if (matcher.deprecated) {
                continue;
            }
            if (matcher.name === matcher.label) {
                entries.push({ label: matcher.name, matcher: matcher });
            }
            else {
                entries.push({
                    label: matcher.label,
                    description: `$${matcher.name}`,
                    matcher: matcher
                });
            }
        }
        if (entries.length === 0) {
            return;
        }
        entries = entries.sort((a, b) => {
            if (a.label && b.label) {
                return a.label.localeCompare(b.label);
            }
            else {
                return 0;
            }
        });
        entries.unshift({ type: 'separator', label: nls.localize('TaskService.associate', 'associate') });
        let taskType;
        if (CustomTask.is(task)) {
            const configProperties = task._source.config.element;
            // eslint-disable-next-line local/code-no-any-casts
            taskType = configProperties.type;
        }
        else {
            taskType = task.getDefinition().type;
        }
        entries.unshift({ label: nls.localize('TaskService.attachProblemMatcher.continueWithout', 'Continue without scanning the task output'), matcher: undefined }, { label: nls.localize('TaskService.attachProblemMatcher.never', 'Never scan the task output for this task'), matcher: undefined, never: true }, { label: nls.localize('TaskService.attachProblemMatcher.neverType', 'Never scan the task output for {0} tasks', taskType), matcher: undefined, setting: taskType }, { label: nls.localize('TaskService.attachProblemMatcher.learnMoreAbout', 'Learn more about scanning the task output'), matcher: undefined, learnMore: true });
        const problemMatcher = await this._quickInputService.pick(entries, { placeHolder: nls.localize('selectProblemMatcher', 'Select for which kind of errors and warnings to scan the task output') });
        if (!problemMatcher) {
            return task;
        }
        if (problemMatcher.learnMore) {
            this._openDocumentation();
            return undefined;
        }
        if (problemMatcher.never) {
            this.customize(task, { problemMatcher: [] }, true);
            return task;
        }
        if (problemMatcher.matcher) {
            const newTask = task.clone();
            const matcherReference = `$${problemMatcher.matcher.name}`;
            const properties = { problemMatcher: [matcherReference] };
            newTask.configurationProperties.problemMatchers = [matcherReference];
            const matcher = ProblemMatcherRegistry.get(problemMatcher.matcher.name);
            if (matcher && matcher.watching !== undefined) {
                properties.isBackground = true;
                newTask.configurationProperties.isBackground = true;
            }
            this.customize(task, properties, true);
            return newTask;
        }
        if (problemMatcher.setting) {
            await this._updateNeverProblemMatcherSetting(problemMatcher.setting);
        }
        return task;
    }
    async _getTasksForGroup(group, waitToActivate) {
        const groups = await this._getGroupedTasks(undefined, waitToActivate);
        const result = [];
        groups.forEach(tasks => {
            for (const task of tasks) {
                const configTaskGroup = TaskGroup.from(task.configurationProperties.group);
                if (configTaskGroup?._id === group._id) {
                    result.push(task);
                }
            }
        });
        return result;
    }
    needsFolderQualification() {
        return this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */;
    }
    _canCustomize(task) {
        if (this.schemaVersion !== 2 /* JsonSchemaVersion.V2_0_0 */) {
            return false;
        }
        if (CustomTask.is(task)) {
            return true;
        }
        if (ContributedTask.is(task)) {
            return !!task.getWorkspaceFolder();
        }
        return false;
    }
    async _formatTaskForJson(resource, task) {
        let reference;
        let stringValue = '';
        try {
            reference = await this._textModelResolverService.createModelReference(resource);
            const model = reference.object.textEditorModel;
            const { tabSize, insertSpaces } = model.getOptions();
            const eol = model.getEOL();
            let stringified = toFormattedString(task, { eol, tabSize, insertSpaces });
            const regex = new RegExp(eol + (insertSpaces ? ' '.repeat(tabSize) : '\\t'), 'g');
            stringified = stringified.replace(regex, eol + (insertSpaces ? ' '.repeat(tabSize * 3) : '\t\t\t'));
            const twoTabs = insertSpaces ? ' '.repeat(tabSize * 2) : '\t\t';
            stringValue = twoTabs + stringified.slice(0, stringified.length - 1) + twoTabs + stringified.slice(stringified.length - 1);
        }
        finally {
            reference?.dispose();
        }
        return stringValue;
    }
    async _openEditorAtTask(resource, task, configIndex = -1) {
        if (resource === undefined) {
            return Promise.resolve(false);
        }
        const fileContent = await this._fileService.readFile(resource);
        const content = fileContent.value;
        if (!content || !task) {
            return false;
        }
        const contentValue = content.toString();
        let stringValue;
        if (configIndex !== -1) {
            const json = this._configurationService.getValue('tasks', { resource });
            if (json.tasks && (json.tasks.length > configIndex)) {
                stringValue = await this._formatTaskForJson(resource, json.tasks[configIndex]);
            }
        }
        if (!stringValue) {
            if (typeof task === 'string') {
                stringValue = task;
            }
            else {
                stringValue = await this._formatTaskForJson(resource, task);
            }
        }
        const index = contentValue.indexOf(stringValue);
        let startLineNumber = 1;
        for (let i = 0; i < index; i++) {
            if (contentValue.charAt(i) === '\n') {
                startLineNumber++;
            }
        }
        let endLineNumber = startLineNumber;
        for (let i = 0; i < stringValue.length; i++) {
            if (stringValue.charAt(i) === '\n') {
                endLineNumber++;
            }
        }
        const selection = startLineNumber > 1 ? { startLineNumber, startColumn: startLineNumber === endLineNumber ? 4 : 3, endLineNumber, endColumn: startLineNumber === endLineNumber ? undefined : 4 } : undefined;
        await this._editorService.openEditor({
            resource,
            options: {
                pinned: false,
                forceReload: true, // because content might have changed
                selection,
                selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */
            }
        });
        return !!selection;
    }
    _createCustomizableTask(task) {
        let toCustomize;
        const taskConfig = CustomTask.is(task) || ConfiguringTask.is(task) ? task._source.config : undefined;
        if (taskConfig && taskConfig.element) {
            toCustomize = { ...(taskConfig.element) };
        }
        else if (ContributedTask.is(task)) {
            toCustomize = {};
            const identifier = Object.assign(Object.create(null), task.defines);
            delete identifier['_key'];
            // eslint-disable-next-line local/code-no-any-casts
            Object.keys(identifier).forEach(key => toCustomize[key] = identifier[key]);
            if (task.configurationProperties.problemMatchers && task.configurationProperties.problemMatchers.length > 0 && Types.isStringArray(task.configurationProperties.problemMatchers)) {
                toCustomize.problemMatcher = task.configurationProperties.problemMatchers;
            }
            if (task.configurationProperties.group) {
                toCustomize.group = TaskConfig.GroupKind.to(task.configurationProperties.group);
            }
        }
        if (!toCustomize) {
            return undefined;
        }
        if (toCustomize.problemMatcher === undefined && task.configurationProperties.problemMatchers === undefined || (task.configurationProperties.problemMatchers && task.configurationProperties.problemMatchers.length === 0)) {
            toCustomize.problemMatcher = [];
        }
        if (task._source.label !== 'Workspace') {
            toCustomize.label = task.configurationProperties.identifier;
        }
        else {
            toCustomize.label = task._label;
        }
        toCustomize.detail = task.configurationProperties.detail;
        return toCustomize;
    }
    async customize(task, properties, openConfig) {
        if (!(await this._trust())) {
            return;
        }
        const workspaceFolder = task.getWorkspaceFolder();
        if (!workspaceFolder) {
            return Promise.resolve(undefined);
        }
        const configuration = this._getConfiguration(workspaceFolder, task._source.kind);
        if (configuration.hasParseErrors) {
            this._notificationService.warn(nls.localize('customizeParseErrors', 'The current task configuration has errors. Please fix the errors first before customizing a task.'));
            return Promise.resolve(undefined);
        }
        const fileConfig = configuration.config;
        const toCustomize = this._createCustomizableTask(task);
        if (!toCustomize) {
            return Promise.resolve(undefined);
        }
        const index = CustomTask.is(task) ? task._source.config.index : undefined;
        if (properties) {
            for (const property of Object.getOwnPropertyNames(properties)) {
                // eslint-disable-next-line local/code-no-any-casts
                const value = properties[property];
                if (value !== undefined && value !== null) {
                    // eslint-disable-next-line local/code-no-any-casts
                    toCustomize[property] = value;
                }
            }
        }
        if (!fileConfig) {
            const value = {
                version: '2.0.0',
                tasks: [toCustomize]
            };
            let content = [
                '{',
                nls.localize('tasksJsonComment', '\t// See https://go.microsoft.com/fwlink/?LinkId=733558 \n\t// for the documentation about the tasks.json format'),
            ].join('\n') + JSON.stringify(value, null, '\t').substr(1);
            const editorConfig = this._configurationService.getValue();
            if (editorConfig.editor.insertSpaces) {
                content = content.replace(/(\n)(\t+)/g, (_, s1, s2) => s1 + ' '.repeat(s2.length * editorConfig.editor.tabSize));
            }
            await this._textFileService.create([{ resource: workspaceFolder.toResource('.vscode/tasks.json'), value: content }]);
        }
        else {
            // We have a global task configuration
            if ((index === -1) && properties) {
                if (properties.problemMatcher !== undefined) {
                    fileConfig.problemMatcher = properties.problemMatcher;
                    await this._writeConfiguration(workspaceFolder, 'tasks.problemMatchers', fileConfig.problemMatcher, task._source.kind);
                }
                else if (properties.group !== undefined) {
                    fileConfig.group = properties.group;
                    await this._writeConfiguration(workspaceFolder, 'tasks.group', fileConfig.group, task._source.kind);
                }
            }
            else {
                if (!Array.isArray(fileConfig.tasks)) {
                    fileConfig.tasks = [];
                }
                if (index === undefined) {
                    fileConfig.tasks.push(toCustomize);
                }
                else {
                    fileConfig.tasks[index] = toCustomize;
                }
                await this._writeConfiguration(workspaceFolder, 'tasks.tasks', fileConfig.tasks, task._source.kind);
            }
        }
        if (openConfig) {
            this._openEditorAtTask(this._getResourceForTask(task), toCustomize);
        }
    }
    _writeConfiguration(workspaceFolder, key, value, source) {
        let target = undefined;
        switch (source) {
            case TaskSourceKind.User:
                target = 2 /* ConfigurationTarget.USER */;
                break;
            case TaskSourceKind.WorkspaceFile:
                target = 5 /* ConfigurationTarget.WORKSPACE */;
                break;
            default: if (this._contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                target = 5 /* ConfigurationTarget.WORKSPACE */;
            }
            else if (this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
                target = 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
            }
        }
        if (target) {
            return this._configurationService.updateValue(key, value, { resource: workspaceFolder.uri }, target);
        }
        else {
            return undefined;
        }
    }
    _getResourceForKind(kind) {
        this._updateSetup();
        switch (kind) {
            case TaskSourceKind.User: {
                return resources.joinPath(resources.dirname(this._preferencesService.userSettingsResource), 'tasks.json');
            }
            case TaskSourceKind.WorkspaceFile: {
                if (this._workspace && this._workspace.configuration) {
                    return this._workspace.configuration;
                }
            }
            default: {
                return undefined;
            }
        }
    }
    _getResourceForTask(task) {
        if (CustomTask.is(task)) {
            let uri = this._getResourceForKind(task._source.kind);
            if (!uri) {
                const taskFolder = task.getWorkspaceFolder();
                if (taskFolder) {
                    uri = taskFolder.toResource(task._source.config.file);
                }
                else {
                    uri = this.workspaceFolders[0].uri;
                }
            }
            return uri;
        }
        else {
            return task.getWorkspaceFolder().toResource('.vscode/tasks.json');
        }
    }
    async openConfig(task) {
        let resource;
        if (task) {
            resource = this._getResourceForTask(task);
        }
        else {
            resource = (this._workspaceFolders && (this._workspaceFolders.length > 0)) ? this._workspaceFolders[0].toResource('.vscode/tasks.json') : undefined;
        }
        return this._openEditorAtTask(resource, task ? task._label : undefined, task ? task._source.config.index : -1);
    }
    _createRunnableTask(tasks, group) {
        const resolverData = new Map();
        const workspaceTasks = [];
        const extensionTasks = [];
        tasks.forEach((tasks, folder) => {
            let data = resolverData.get(folder);
            if (!data) {
                data = {
                    id: new Map(),
                    label: new Map(),
                    identifier: new Map()
                };
                resolverData.set(folder, data);
            }
            for (const task of tasks) {
                data.id.set(task._id, task);
                data.label.set(task._label, task);
                if (task.configurationProperties.identifier) {
                    data.identifier.set(task.configurationProperties.identifier, task);
                }
                if (group && task.configurationProperties.group === group) {
                    if (task._source.kind === TaskSourceKind.Workspace) {
                        workspaceTasks.push(task);
                    }
                    else {
                        extensionTasks.push(task);
                    }
                }
            }
        });
        const resolver = {
            resolve: async (uri, alias) => {
                const data = resolverData.get(typeof uri === 'string' ? uri : uri.toString());
                if (!data) {
                    return undefined;
                }
                return data.id.get(alias) || data.label.get(alias) || data.identifier.get(alias);
            }
        };
        if (workspaceTasks.length > 0) {
            if (workspaceTasks.length > 1) {
                this._log(nls.localize('moreThanOneBuildTask', 'There are many build tasks defined in the tasks.json. Executing the first one.'));
            }
            return { task: workspaceTasks[0], resolver };
        }
        if (extensionTasks.length === 0) {
            return undefined;
        }
        // We can only have extension tasks if we are in version 2.0.0. Then we can even run
        // multiple build tasks.
        if (extensionTasks.length === 1) {
            return { task: extensionTasks[0], resolver };
        }
        else {
            const id = UUID.generateUuid();
            const task = new InMemoryTask(id, { kind: TaskSourceKind.InMemory, label: 'inMemory' }, id, 'inMemory', { reevaluateOnRerun: true }, {
                identifier: id,
                dependsOn: extensionTasks.map((extensionTask) => { return { uri: extensionTask.getWorkspaceFolder().uri, task: extensionTask._id }; }),
                name: id
            });
            return { task, resolver };
        }
    }
    _createResolver(grouped) {
        let resolverData;
        async function quickResolve(that, uri, identifier) {
            const foundTasks = await that._findWorkspaceTasks((task) => {
                const taskUri = ((ConfiguringTask.is(task) || CustomTask.is(task)) ? task._source.config.workspaceFolder?.uri : undefined);
                const originalUri = (typeof uri === 'string' ? uri : uri.toString());
                if (taskUri?.toString() !== originalUri) {
                    return false;
                }
                if (Types.isString(identifier)) {
                    return ((task._label === identifier) || (task.configurationProperties.identifier === identifier));
                }
                else {
                    const keyedIdentifier = task.getDefinition(true);
                    const searchIdentifier = TaskDefinition.createTaskIdentifier(identifier, console);
                    return (searchIdentifier && keyedIdentifier) ? (searchIdentifier._key === keyedIdentifier._key) : false;
                }
            });
            if (foundTasks.length === 0) {
                return undefined;
            }
            const task = foundTasks[0];
            if (ConfiguringTask.is(task)) {
                return that.tryResolveTask(task);
            }
            return task;
        }
        async function getResolverData(that) {
            if (resolverData === undefined) {
                resolverData = new Map();
                (grouped || await that._getGroupedTasks()).forEach((tasks, folder) => {
                    let data = resolverData.get(folder);
                    if (!data) {
                        data = { label: new Map(), identifier: new Map(), taskIdentifier: new Map() };
                        resolverData.set(folder, data);
                    }
                    for (const task of tasks) {
                        data.label.set(task._label, task);
                        if (task.configurationProperties.identifier) {
                            data.identifier.set(task.configurationProperties.identifier, task);
                        }
                        const keyedIdentifier = task.getDefinition(true);
                        if (keyedIdentifier !== undefined) {
                            data.taskIdentifier.set(keyedIdentifier._key, task);
                        }
                    }
                });
            }
            return resolverData;
        }
        async function fullResolve(that, uri, identifier) {
            const allResolverData = await getResolverData(that);
            const data = allResolverData.get(typeof uri === 'string' ? uri : uri.toString());
            if (!data) {
                return undefined;
            }
            if (Types.isString(identifier)) {
                return data.label.get(identifier) || data.identifier.get(identifier);
            }
            else {
                const key = TaskDefinition.createTaskIdentifier(identifier, console);
                return key !== undefined ? data.taskIdentifier.get(key._key) : undefined;
            }
        }
        return {
            resolve: async (uri, identifier) => {
                if (!identifier) {
                    return undefined;
                }
                if ((resolverData === undefined) && (grouped === undefined)) {
                    return (await quickResolve(this, uri, identifier)) ?? fullResolve(this, uri, identifier);
                }
                else {
                    return fullResolve(this, uri, identifier);
                }
            }
        };
    }
    async _saveBeforeRun() {
        let SaveBeforeRunConfigOptions;
        (function (SaveBeforeRunConfigOptions) {
            SaveBeforeRunConfigOptions["Always"] = "always";
            SaveBeforeRunConfigOptions["Never"] = "never";
            SaveBeforeRunConfigOptions["Prompt"] = "prompt";
        })(SaveBeforeRunConfigOptions || (SaveBeforeRunConfigOptions = {}));
        const saveBeforeRunTaskConfig = this._configurationService.getValue("task.saveBeforeRun" /* TaskSettingId.SaveBeforeRun */);
        if (saveBeforeRunTaskConfig === SaveBeforeRunConfigOptions.Never) {
            return false;
        }
        else if (saveBeforeRunTaskConfig === SaveBeforeRunConfigOptions.Prompt && this._editorService.editors.some(e => e.isDirty())) {
            const { confirmed } = await this._dialogService.confirm({
                message: nls.localize('TaskSystem.saveBeforeRun.prompt.title', "Save all editors?"),
                detail: nls.localize('detail', "Do you want to save all editors before running the task?"),
                primaryButton: nls.localize({ key: 'saveBeforeRun.save', comment: ['&& denotes a mnemonic'] }, '&&Save'),
                cancelButton: nls.localize({ key: 'saveBeforeRun.dontSave', comment: ['&& denotes a mnemonic'] }, "Do&&n't Save"),
            });
            if (!confirmed) {
                return false;
            }
        }
        await this._editorService.saveAll({ reason: 2 /* SaveReason.AUTO */ });
        return true;
    }
    async _executeTask(task, resolver, runSource) {
        let taskToRun = task;
        if (await this._saveBeforeRun()) {
            await this._configurationService.reloadConfiguration();
            await this._updateWorkspaceTasks();
            const taskFolder = task.getWorkspaceFolder();
            const taskIdentifier = task.configurationProperties.identifier;
            const taskType = CustomTask.is(task) ? task.customizes()?.type : (ContributedTask.is(task) ? task.type : undefined);
            // Since we save before running tasks, the task may have changed as part of the save.
            // However, if the TaskRunSource is not User, then we shouldn't try to fetch the task again
            // since this can cause a new'd task to get overwritten with a provided task.
            taskToRun = ((taskFolder && taskIdentifier && (runSource === 1 /* TaskRunSource.User */))
                ? await this.getTask(taskFolder, taskIdentifier, false, taskType) : task) ?? task;
        }
        await ProblemMatcherRegistry.onReady();
        const executeResult = runSource === 4 /* TaskRunSource.Reconnect */ ? this._getTaskSystem().reconnect(taskToRun, resolver) : this._getTaskSystem().run(taskToRun, resolver);
        if (executeResult) {
            return this._handleExecuteResult(executeResult, runSource);
        }
        return { exitCode: 0 };
    }
    async _handleExecuteResult(executeResult, runSource) {
        if (runSource && executeResult.task._id) {
            this._taskRunSources.set(executeResult.task._id, runSource);
        }
        if (runSource === 1 /* TaskRunSource.User */) {
            await this._setRecentlyUsedTask(executeResult.task);
        }
        if (executeResult.kind === 2 /* TaskExecuteKind.Active */) {
            const active = executeResult.active;
            if (active && active.same && runSource === 2 /* TaskRunSource.FolderOpen */ || runSource === 4 /* TaskRunSource.Reconnect */) {
                // ignore, the task is already active, likely from being reconnected or from folder open.
                this._logService.debug('Ignoring task that is already active', executeResult.task);
                return executeResult.promise;
            }
            if (active && active.same) {
                this._handleInstancePolicy(executeResult.task, executeResult.task.runOptions.instancePolicy);
            }
            else {
                throw new TaskError(Severity.Warning, nls.localize('TaskSystem.active', 'There is already a task running. Terminate it first before executing another task.'), 1 /* TaskErrors.RunningTask */);
            }
        }
        this._setRecentlyUsedTask(executeResult.task);
        return executeResult.promise;
    }
    _handleInstancePolicy(task, policy) {
        if (!this._taskSystem?.isTaskVisible(task)) {
            this._taskSystem?.revealTask(task);
        }
        switch (policy) {
            case "terminateNewest" /* InstancePolicy.terminateNewest */:
                this._restart(this._getTaskSystem().getLastInstance(task) ?? task);
                break;
            case "terminateOldest" /* InstancePolicy.terminateOldest */:
                this._restart(this._getTaskSystem().getFirstInstance(task) ?? task);
                break;
            case "silent" /* InstancePolicy.silent */:
                break;
            case "warn" /* InstancePolicy.warn */:
                this._notificationService.warn(nls.localize('TaskSystem.InstancePolicy.warn', 'The instance limit for this task has been reached.'));
                break;
            case "prompt" /* InstancePolicy.prompt */:
            default:
                this._showQuickPick(this._taskSystem.getActiveTasks().filter(t => task._id === t._id), nls.localize('TaskService.instanceToTerminate', 'Select an instance to terminate'), {
                    label: nls.localize('TaskService.noInstanceRunning', 'No instance is currently running'),
                    task: undefined
                }, false, true, undefined).then(entry => {
                    const task = entry ? entry.task : undefined;
                    if (task === undefined || task === null) {
                        return;
                    }
                    this._restart(task);
                });
        }
    }
    async _restart(task) {
        if (!this._taskSystem) {
            return;
        }
        // Check if the task is currently running
        const isTaskRunning = await this.getActiveTasks().then(tasks => tasks.some(t => t.getMapKey() === task.getMapKey()));
        if (isTaskRunning) {
            // Task is running, terminate it first
            const response = await this._taskSystem.terminate(task);
            if (!response.success) {
                this._notificationService.warn(nls.localize('TaskSystem.restartFailed', 'Failed to terminate and restart task {0}', Types.isString(task) ? task : task.configurationProperties.name));
                return;
            }
        }
        // Task is not running or was successfully terminated, now run it
        try {
            // Before restarting, check if the task still exists and get updated version
            const updatedTask = await this._findUpdatedTask(task);
            if (updatedTask) {
                await this.run(updatedTask);
            }
            else {
                // Task no longer exists, show warning
                this._notificationService.warn(nls.localize('TaskSystem.taskNoLongerExists', 'Task {0} no longer exists or has been modified. Cannot restart.', task.configurationProperties.name));
            }
        }
        catch {
            // eat the error, we don't care about it here
        }
    }
    async _findUpdatedTask(originalTask) {
        const mapStringToFolderTasks = await this._updateWorkspaceTasks(0 /* TaskRunSource.System */);
        // Look for the task in current workspace configuration
        for (const [_, folderResult] of mapStringToFolderTasks) {
            if (!folderResult.set?.tasks?.length && !folderResult.configurations?.byIdentifier) {
                continue;
            }
            // There are two ways where Task lives:
            // 1. folderResult.set.tasks
            if (folderResult.set?.tasks) {
                for (const task of folderResult.set.tasks) {
                    // Check if this is the same task by ID
                    if (task._id === originalTask._id) {
                        return task;
                    }
                }
            }
            // 2. folderResult.configurations.byIdentifier
            if (folderResult.configurations?.byIdentifier) {
                for (const [_, configuringTask] of Object.entries(folderResult.configurations.byIdentifier)) {
                    // Check if this is the same task by ID
                    if (configuringTask._id === originalTask._id) {
                        return this.tryResolveTask(configuringTask);
                    }
                }
            }
        }
        // If task wasn't found in workspace configuration, check contributed tasks from providers
        // This is important for tasks from extensions like npm, which are ContributedTasks
        if (ContributedTask.is(originalTask)) {
            // The type filter ensures only the matching provider is called (e.g., only npm provider for npm tasks)
            // This is the same pattern used in tryResolveTask as a fallback
            const allTasks = await this.tasks({ type: originalTask.type });
            for (const task of allTasks) {
                if (task._id === originalTask._id) {
                    return task;
                }
            }
        }
        return undefined;
    }
    async terminate(task) {
        if (!(await this._trust())) {
            return { success: true, task: undefined };
        }
        if (!this._taskSystem) {
            return { success: true, task: undefined };
        }
        return this._taskSystem.terminate(task);
    }
    _terminateAll() {
        if (!this._taskSystem) {
            return Promise.resolve([]);
        }
        return this._taskSystem.terminateAll();
    }
    _createTerminalTaskSystem() {
        return new TerminalTaskSystem(this._terminalService, this._terminalGroupService, this._outputService, this._paneCompositeService, this._viewsService, this._markerService, this._modelService, this._configurationResolverService, this._contextService, this._environmentService, AbstractTaskService_1.OutputChannelId, this._fileService, this._terminalProfileResolverService, this._pathService, this._viewDescriptorService, this._logService, this._notificationService, this._contextKeyService, this._instantiationService, (workspaceFolder) => {
            if (workspaceFolder) {
                return this._getTaskSystemInfo(workspaceFolder.uri.scheme);
            }
            else if (this._taskSystemInfos.size > 0) {
                const infos = Array.from(this._taskSystemInfos.entries());
                const notFile = infos.filter(info => info[0] !== Schemas.file);
                if (notFile.length > 0) {
                    return notFile[0][1][0];
                }
                return infos[0][1][0];
            }
            else {
                return undefined;
            }
        }, async (taskKey) => {
            // Look up task by its map key across all workspace tasks
            const taskMap = await this._getGroupedTasks();
            const allTasks = taskMap.all();
            for (const task of allTasks) {
                if (task.getMapKey() === taskKey) {
                    return task;
                }
            }
            return undefined;
        });
    }
    _isTaskProviderEnabled(type) {
        const definition = TaskDefinitionRegistry.get(type);
        return !definition || !definition.when || this._contextKeyService.contextMatchesRules(definition.when);
    }
    async _getGroupedTasks(filter, waitToActivate, knownOnlyOrTrusted) {
        await this._waitForAllSupportedExecutions;
        const type = filter?.type;
        const needsRecentTasksMigration = this._needsRecentTasksMigration();
        if (!waitToActivate) {
            await this._activateTaskProviders(filter?.type);
        }
        const validTypes = Object.create(null);
        TaskDefinitionRegistry.all().forEach(definition => validTypes[definition.taskType] = true);
        validTypes['shell'] = true;
        validTypes['process'] = true;
        const contributedTaskSets = await new Promise(resolve => {
            const result = [];
            let counter = 0;
            const done = (value) => {
                if (value) {
                    result.push(value);
                }
                if (--counter === 0) {
                    resolve(result);
                }
            };
            const error = (error) => {
                try {
                    if (!isCancellationError(error)) {
                        if (error && Types.isString(error.message)) {
                            this._log(`Error: ${error.message}\n`);
                            this._showOutput(error.message);
                        }
                        else {
                            this._log('Unknown error received while collecting tasks from providers.');
                            this._showOutput();
                        }
                    }
                }
                finally {
                    if (--counter === 0) {
                        resolve(result);
                    }
                }
            };
            if (this._isProvideTasksEnabled() && (this.schemaVersion === 2 /* JsonSchemaVersion.V2_0_0 */) && (this._providers.size > 0)) {
                let foundAnyProviders = false;
                for (const [handle, provider] of this._providers) {
                    const providerType = this._providerTypes.get(handle);
                    if ((type === undefined) || (type === providerType)) {
                        if (providerType && !this._isTaskProviderEnabled(providerType)) {
                            continue;
                        }
                        foundAnyProviders = true;
                        counter++;
                        raceTimeout(provider.provideTasks(validTypes).then((taskSet) => {
                            // Check that the tasks provided are of the correct type
                            for (const task of taskSet.tasks) {
                                if (task.type !== this._providerTypes.get(handle)) {
                                    this._log(nls.localize('unexpectedTaskType', "The task provider for \"{0}\" tasks unexpectedly provided a task of type \"{1}\".\n", this._providerTypes.get(handle), task.type));
                                    if ((task.type !== 'shell') && (task.type !== 'process')) {
                                        this._showOutput();
                                    }
                                    break;
                                }
                            }
                            return done(taskSet);
                        }, error), 5000, () => {
                            // onTimeout
                            done(undefined);
                        });
                    }
                }
                if (!foundAnyProviders) {
                    resolve(result);
                }
            }
            else {
                resolve(result);
            }
        });
        const result = new TaskMap();
        const contributedTasks = new TaskMap();
        for (const set of contributedTaskSets) {
            for (const task of set.tasks) {
                const workspaceFolder = task.getWorkspaceFolder();
                if (workspaceFolder) {
                    contributedTasks.add(workspaceFolder, task);
                }
            }
        }
        try {
            let tasks = [];
            // prevent workspace trust dialog from being shown in unexpected cases #224881
            if (!knownOnlyOrTrusted || this._workspaceTrustManagementService.isWorkspaceTrusted()) {
                tasks = Array.from(await this.getWorkspaceTasks());
            }
            await Promise.all(this._getCustomTaskPromises(tasks, filter, result, contributedTasks, waitToActivate));
            if (needsRecentTasksMigration) {
                // At this point we have all the tasks and can migrate the recently used tasks.
                await this._migrateRecentTasks(result.all());
            }
            return result;
        }
        catch {
            // If we can't read the tasks.json file provide at least the contributed tasks
            const result = new TaskMap();
            for (const set of contributedTaskSets) {
                for (const task of set.tasks) {
                    const folder = task.getWorkspaceFolder();
                    if (folder) {
                        result.add(folder, task);
                    }
                }
            }
            return result;
        }
    }
    _getCustomTaskPromises(customTasksKeyValuePairs, filter, result, contributedTasks, waitToActivate) {
        return customTasksKeyValuePairs.map(async ([key, folderTasks]) => {
            const contributed = contributedTasks.get(key);
            if (!folderTasks.set) {
                if (contributed) {
                    result.add(key, ...contributed);
                }
                return;
            }
            if (this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
                result.add(key, ...folderTasks.set.tasks);
            }
            else {
                const configurations = folderTasks.configurations;
                const legacyTaskConfigurations = folderTasks.set ? this._getLegacyTaskConfigurations(folderTasks.set) : undefined;
                const customTasksToDelete = [];
                if (configurations || legacyTaskConfigurations) {
                    const unUsedConfigurations = new Set();
                    if (configurations) {
                        Object.keys(configurations.byIdentifier).forEach(key => unUsedConfigurations.add(key));
                    }
                    for (const task of contributed) {
                        if (!ContributedTask.is(task)) {
                            continue;
                        }
                        if (configurations) {
                            const configuringTask = configurations.byIdentifier[task.defines._key];
                            if (configuringTask) {
                                unUsedConfigurations.delete(task.defines._key);
                                result.add(key, TaskConfig.createCustomTask(task, configuringTask));
                            }
                            else {
                                result.add(key, task);
                            }
                        }
                        else if (legacyTaskConfigurations) {
                            const configuringTask = legacyTaskConfigurations[task.defines._key];
                            if (configuringTask) {
                                result.add(key, TaskConfig.createCustomTask(task, configuringTask));
                                customTasksToDelete.push(configuringTask);
                            }
                            else {
                                result.add(key, task);
                            }
                        }
                        else {
                            result.add(key, task);
                        }
                    }
                    if (customTasksToDelete.length > 0) {
                        const toDelete = customTasksToDelete.reduce((map, task) => {
                            map[task._id] = true;
                            return map;
                        }, Object.create(null));
                        for (const task of folderTasks.set.tasks) {
                            if (toDelete[task._id]) {
                                continue;
                            }
                            result.add(key, task);
                        }
                    }
                    else {
                        result.add(key, ...folderTasks.set.tasks);
                    }
                    const unUsedConfigurationsAsArray = Array.from(unUsedConfigurations);
                    const unUsedConfigurationPromises = unUsedConfigurationsAsArray.map(async (value) => {
                        const configuringTask = configurations.byIdentifier[value];
                        if (filter?.type && (filter.type !== configuringTask.configures.type)) {
                            return;
                        }
                        let requiredTaskProviderUnavailable = false;
                        for (const [handle, provider] of this._providers) {
                            const providerType = this._providerTypes.get(handle);
                            if (configuringTask.type === providerType) {
                                if (providerType && !this._isTaskProviderEnabled(providerType)) {
                                    requiredTaskProviderUnavailable = true;
                                    continue;
                                }
                                try {
                                    const resolvedTask = await provider.resolveTask(configuringTask);
                                    if (resolvedTask && (resolvedTask._id === configuringTask._id)) {
                                        result.add(key, TaskConfig.createCustomTask(resolvedTask, configuringTask));
                                        return;
                                    }
                                }
                                catch (error) {
                                    // Ignore errors. The task could not be provided by any of the providers.
                                }
                            }
                        }
                        if (requiredTaskProviderUnavailable) {
                            this._log(nls.localize('TaskService.providerUnavailable', 'Warning: {0} tasks are unavailable in the current environment.', configuringTask.configures.type));
                        }
                        else if (!waitToActivate) {
                            this._log(nls.localize('TaskService.noConfiguration', 'Error: The {0} task detection didn\'t contribute a task for the following configuration:\n{1}\nThe task will be ignored.', configuringTask.configures.type, JSON.stringify(configuringTask._source.config.element, undefined, 4)));
                        }
                    });
                    await Promise.all(unUsedConfigurationPromises);
                }
                else {
                    result.add(key, ...folderTasks.set.tasks);
                    result.add(key, ...contributed);
                }
            }
        });
    }
    _getLegacyTaskConfigurations(workspaceTasks) {
        let result;
        function getResult() {
            if (result) {
                return result;
            }
            result = Object.create(null);
            return result;
        }
        for (const task of workspaceTasks.tasks) {
            if (CustomTask.is(task)) {
                const commandName = task.command && task.command.name;
                // This is for backwards compatibility with the 0.1.0 task annotation code
                // if we had a gulp, jake or grunt command a task specification was a annotation
                if (commandName === 'gulp' || commandName === 'grunt' || commandName === 'jake') {
                    const identifier = KeyedTaskIdentifier.create({
                        type: commandName,
                        task: task.configurationProperties.name
                    });
                    getResult()[identifier._key] = task;
                }
            }
        }
        return result;
    }
    async getWorkspaceTasks(runSource = 1 /* TaskRunSource.User */) {
        if (!(await this._trust())) {
            return new Map();
        }
        await raceTimeout(this._waitForAllSupportedExecutions, 2000, () => {
            this._logService.warn('Timed out waiting for all supported executions');
        });
        await this._whenTaskSystemReady;
        if (this._workspaceTasksPromise) {
            return this._workspaceTasksPromise;
        }
        return this._updateWorkspaceTasks(runSource);
    }
    getTaskProblems(instanceId) {
        return this._taskSystem?.getTaskProblems(instanceId);
    }
    _updateWorkspaceTasks(runSource = 1 /* TaskRunSource.User */) {
        this._workspaceTasksPromise = this._computeWorkspaceTasks(runSource);
        return this._workspaceTasksPromise;
    }
    async _getAFolder() {
        let folder = this.workspaceFolders.length > 0 ? this.workspaceFolders[0] : undefined;
        if (!folder) {
            const userhome = await this._pathService.userHome();
            folder = new WorkspaceFolder({ uri: userhome, name: resources.basename(userhome), index: 0 });
        }
        return folder;
    }
    getTerminalsForTasks(task) {
        return this._taskSystem?.getTerminalsForTasks(task);
    }
    async _computeWorkspaceTasks(runSource = 1 /* TaskRunSource.User */) {
        const promises = [];
        for (const folder of this.workspaceFolders) {
            promises.push(this._computeWorkspaceFolderTasks(folder, runSource));
        }
        const values = await Promise.all(promises);
        const result = new Map();
        for (const value of values) {
            if (value) {
                result.set(value.workspaceFolder.uri.toString(), value);
            }
        }
        const folder = await this._getAFolder();
        if (this._contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */) {
            const workspaceFileTasks = await this._computeWorkspaceFileTasks(folder, runSource);
            if (workspaceFileTasks && this._workspace && this._workspace.configuration) {
                result.set(this._workspace.configuration.toString(), workspaceFileTasks);
            }
        }
        const userTasks = await this._computeUserTasks(folder, runSource);
        if (userTasks) {
            result.set(USER_TASKS_GROUP_KEY, userTasks);
        }
        // Update tasks available context key
        const hasAnyTasks = Array.from(result.values()).some(folderResult => (folderResult.set?.tasks && folderResult.set.tasks.length > 0) ||
            (folderResult.configurations?.byIdentifier && Object.keys(folderResult.configurations.byIdentifier).length > 0));
        this._tasksAvailableState.set(hasAnyTasks);
        return result;
    }
    get _jsonTasksSupported() {
        return ShellExecutionSupportedContext.getValue(this._contextKeyService) === true && ProcessExecutionSupportedContext.getValue(this._contextKeyService) === true;
    }
    async _computeWorkspaceFolderTasks(workspaceFolder, runSource = 1 /* TaskRunSource.User */) {
        const workspaceFolderConfiguration = (this._executionEngine === ExecutionEngine.Process ? await this._computeLegacyConfiguration(workspaceFolder) : await this._computeConfiguration(workspaceFolder));
        if (!workspaceFolderConfiguration || !workspaceFolderConfiguration.config || workspaceFolderConfiguration.hasErrors) {
            return Promise.resolve({ workspaceFolder, set: undefined, configurations: undefined, hasErrors: workspaceFolderConfiguration ? workspaceFolderConfiguration.hasErrors : false });
        }
        await ProblemMatcherRegistry.onReady();
        const taskSystemInfo = this._getTaskSystemInfo(workspaceFolder.uri.scheme);
        const problemReporter = new ProblemReporter(this._outputChannel);
        this._register(problemReporter.onDidError(error => this._showOutput(runSource, undefined, error)));
        const parseResult = TaskConfig.parse(workspaceFolder, undefined, taskSystemInfo ? taskSystemInfo.platform : Platform.platform, workspaceFolderConfiguration.config, problemReporter, TaskConfig.TaskConfigSource.TasksJson, this._contextKeyService);
        let hasErrors = false;
        if (!parseResult.validationStatus.isOK() && (parseResult.validationStatus.state !== 1 /* ValidationState.Info */)) {
            hasErrors = true;
        }
        if (problemReporter.status.isFatal()) {
            problemReporter.fatal(nls.localize('TaskSystem.configurationErrors', 'Error: the provided task configuration has validation errors and can\'t not be used. Please correct the errors first.'));
            return { workspaceFolder, set: undefined, configurations: undefined, hasErrors };
        }
        let customizedTasks;
        if (parseResult.configured && parseResult.configured.length > 0) {
            customizedTasks = {
                byIdentifier: Object.create(null)
            };
            for (const task of parseResult.configured) {
                customizedTasks.byIdentifier[task.configures._key] = task;
            }
        }
        if (!this._jsonTasksSupported && (parseResult.custom.length > 0)) {
            this._logService.warn('Custom workspace tasks are not supported.');
        }
        return { workspaceFolder, set: { tasks: this._jsonTasksSupported ? parseResult.custom : [] }, configurations: customizedTasks, hasErrors };
    }
    _testParseExternalConfig(config, location) {
        if (!config) {
            return { config: undefined, hasParseErrors: false };
        }
        // eslint-disable-next-line local/code-no-any-casts
        const parseErrors = config.$parseErrors;
        if (parseErrors) {
            let isAffected = false;
            for (const parseError of parseErrors) {
                if (/tasks\.json$/.test(parseError)) {
                    isAffected = true;
                    break;
                }
            }
            if (isAffected) {
                this._log(nls.localize({ key: 'TaskSystem.invalidTaskJsonOther', comment: ['Message notifies of an error in one of several places there is tasks related json, not necessarily in a file named tasks.json'] }, 'Error: The content of the tasks json in {0} has syntax errors. Please correct them before executing a task.', location));
                this._showOutput(undefined, undefined, nls.localize({ key: 'TaskSystem.invalidTaskJsonOther', comment: ['Message notifies of an error in one of several places there is tasks related json, not necessarily in a file named tasks.json'] }, 'Error: The content of the tasks json in {0} has syntax errors. Please correct them before executing a task.', location));
                return { config, hasParseErrors: true };
            }
        }
        return { config, hasParseErrors: false };
    }
    _log(value, verbose) {
        if (!verbose || this._configurationService.getValue("task.verboseLogging" /* TaskSettingId.VerboseLogging */)) {
            this._outputChannel.append(value + '\n');
        }
    }
    async _computeWorkspaceFileTasks(workspaceFolder, runSource = 1 /* TaskRunSource.User */) {
        if (this._executionEngine === ExecutionEngine.Process) {
            return this._emptyWorkspaceTaskResults(workspaceFolder);
        }
        const workspaceFileConfig = this._getConfiguration(workspaceFolder, TaskSourceKind.WorkspaceFile);
        const configuration = this._testParseExternalConfig(workspaceFileConfig.config, nls.localize('TasksSystem.locationWorkspaceConfig', 'workspace file'));
        const customizedTasks = {
            byIdentifier: Object.create(null)
        };
        const custom = [];
        await this._computeTasksForSingleConfig(workspaceFolder, configuration.config, runSource, custom, customizedTasks.byIdentifier, TaskConfig.TaskConfigSource.WorkspaceFile);
        const engine = configuration.config ? TaskConfig.ExecutionEngine.from(configuration.config) : ExecutionEngine.Terminal;
        if (engine === ExecutionEngine.Process) {
            this._notificationService.warn(nls.localize('TaskSystem.versionWorkspaceFile', 'Only tasks version 2.0.0 permitted in workspace configuration files.'));
            return this._emptyWorkspaceTaskResults(workspaceFolder);
        }
        return { workspaceFolder, set: { tasks: custom }, configurations: customizedTasks, hasErrors: configuration.hasParseErrors };
    }
    async _computeUserTasks(workspaceFolder, runSource = 1 /* TaskRunSource.User */) {
        if (this._executionEngine === ExecutionEngine.Process) {
            return this._emptyWorkspaceTaskResults(workspaceFolder);
        }
        const userTasksConfig = this._getConfiguration(workspaceFolder, TaskSourceKind.User);
        const configuration = this._testParseExternalConfig(userTasksConfig.config, nls.localize('TasksSystem.locationUserConfig', 'user settings'));
        const customizedTasks = {
            byIdentifier: Object.create(null)
        };
        const custom = [];
        await this._computeTasksForSingleConfig(workspaceFolder, configuration.config, runSource, custom, customizedTasks.byIdentifier, TaskConfig.TaskConfigSource.User);
        const engine = configuration.config ? TaskConfig.ExecutionEngine.from(configuration.config) : ExecutionEngine.Terminal;
        if (engine === ExecutionEngine.Process) {
            this._notificationService.warn(nls.localize('TaskSystem.versionSettings', 'Only tasks version 2.0.0 permitted in user settings.'));
            return this._emptyWorkspaceTaskResults(workspaceFolder);
        }
        return { workspaceFolder, set: { tasks: custom }, configurations: customizedTasks, hasErrors: configuration.hasParseErrors };
    }
    _emptyWorkspaceTaskResults(workspaceFolder) {
        return { workspaceFolder, set: undefined, configurations: undefined, hasErrors: false };
    }
    async _computeTasksForSingleConfig(workspaceFolder, config, runSource, custom, customized, source, isRecentTask = false) {
        if (!config) {
            return false;
        }
        else if (!workspaceFolder) {
            this._logService.trace('TaskService.computeTasksForSingleConfig: no workspace folder for worskspace', this._workspace?.id);
            return false;
        }
        const taskSystemInfo = this._getTaskSystemInfo(workspaceFolder.uri.scheme);
        const problemReporter = new ProblemReporter(this._outputChannel);
        const parseResult = TaskConfig.parse(workspaceFolder, this._workspace, taskSystemInfo ? taskSystemInfo.platform : Platform.platform, config, problemReporter, source, this._contextKeyService, isRecentTask);
        let hasErrors = false;
        if (!parseResult.validationStatus.isOK() && (parseResult.validationStatus.state !== 1 /* ValidationState.Info */)) {
            this._showOutput(runSource);
            hasErrors = true;
        }
        if (problemReporter.status.isFatal()) {
            problemReporter.fatal(nls.localize('TaskSystem.configurationErrors', 'Error: the provided task configuration has validation errors and can\'t not be used. Please correct the errors first.'));
            return hasErrors;
        }
        if (parseResult.configured && parseResult.configured.length > 0) {
            for (const task of parseResult.configured) {
                customized[task.configures._key] = task;
            }
        }
        if (!this._jsonTasksSupported && (parseResult.custom.length > 0)) {
            this._logService.warn('Custom workspace tasks are not supported.');
        }
        else {
            for (const task of parseResult.custom) {
                custom.push(task);
            }
        }
        return hasErrors;
    }
    _computeConfiguration(workspaceFolder) {
        const { config, hasParseErrors } = this._getConfiguration(workspaceFolder);
        return Promise.resolve({ workspaceFolder, config, hasErrors: hasParseErrors });
    }
    _computeWorkspaceFolderSetup() {
        const workspaceFolders = [];
        const ignoredWorkspaceFolders = [];
        let executionEngine = ExecutionEngine.Terminal;
        let schemaVersion = 2 /* JsonSchemaVersion.V2_0_0 */;
        let workspace;
        if (this._contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            const workspaceFolder = this._contextService.getWorkspace().folders[0];
            workspaceFolders.push(workspaceFolder);
            executionEngine = this._computeExecutionEngine(workspaceFolder);
            schemaVersion = this._computeJsonSchemaVersion(workspaceFolder);
        }
        else if (this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            workspace = this._contextService.getWorkspace();
            for (const workspaceFolder of this._contextService.getWorkspace().folders) {
                if (schemaVersion === this._computeJsonSchemaVersion(workspaceFolder)) {
                    workspaceFolders.push(workspaceFolder);
                }
                else {
                    ignoredWorkspaceFolders.push(workspaceFolder);
                    this._log(nls.localize('taskService.ignoringFolder', 'Ignoring task configurations for workspace folder {0}. Multi folder workspace task support requires that all folders use task version 2.0.0', workspaceFolder.uri.fsPath));
                }
            }
        }
        return [workspaceFolders, ignoredWorkspaceFolders, executionEngine, schemaVersion, workspace];
    }
    _computeExecutionEngine(workspaceFolder) {
        const { config } = this._getConfiguration(workspaceFolder);
        if (!config) {
            return ExecutionEngine._default;
        }
        return TaskConfig.ExecutionEngine.from(config);
    }
    _computeJsonSchemaVersion(workspaceFolder) {
        const { config } = this._getConfiguration(workspaceFolder);
        if (!config) {
            return 2 /* JsonSchemaVersion.V2_0_0 */;
        }
        return TaskConfig.JsonSchemaVersion.from(config);
    }
    _getConfiguration(workspaceFolder, source) {
        let result;
        if ((source !== TaskSourceKind.User) && (this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */)) {
            result = undefined;
        }
        else {
            const wholeConfig = this._configurationService.inspect('tasks', { resource: workspaceFolder.uri });
            switch (source) {
                case TaskSourceKind.User: {
                    if (wholeConfig.userValue !== wholeConfig.workspaceFolderValue) {
                        result = Objects.deepClone(wholeConfig.userValue);
                    }
                    break;
                }
                case TaskSourceKind.Workspace:
                    result = Objects.deepClone(wholeConfig.workspaceFolderValue);
                    break;
                case TaskSourceKind.WorkspaceFile: {
                    if ((this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */)
                        && (wholeConfig.workspaceFolderValue !== wholeConfig.workspaceValue)) {
                        result = Objects.deepClone(wholeConfig.workspaceValue);
                    }
                    break;
                }
                default: result = Objects.deepClone(wholeConfig.workspaceFolderValue);
            }
        }
        if (!result) {
            return { config: undefined, hasParseErrors: false };
        }
        // eslint-disable-next-line local/code-no-any-casts
        const parseErrors = result.$parseErrors;
        if (parseErrors) {
            let isAffected = false;
            for (const parseError of parseErrors) {
                if (/tasks\.json$/.test(parseError)) {
                    isAffected = true;
                    break;
                }
            }
            if (isAffected) {
                this._log(nls.localize('TaskSystem.invalidTaskJson', 'Error: The content of the tasks.json file has syntax errors. Please correct them before executing a task.'));
                this._showOutput(undefined, undefined, nls.localize('TaskSystem.invalidTaskJson', 'Error: The content of the tasks.json file has syntax errors. Please correct them before executing a task.'));
                return { config: undefined, hasParseErrors: true };
            }
        }
        return { config: result, hasParseErrors: false };
    }
    inTerminal() {
        if (this._taskSystem) {
            return this._taskSystem instanceof TerminalTaskSystem;
        }
        return this._executionEngine === ExecutionEngine.Terminal;
    }
    configureAction() {
        const thisCapture = this;
        return new class extends Action {
            constructor() {
                super(ConfigureTaskAction.ID, ConfigureTaskAction.TEXT.value, undefined, true, () => { thisCapture._runConfigureTasks(); return Promise.resolve(undefined); });
            }
        };
    }
    _handleError(err) {
        let showOutput = true;
        if (err instanceof TaskError) {
            const buildError = err;
            const needsConfig = buildError.code === 0 /* TaskErrors.NotConfigured */ || buildError.code === 2 /* TaskErrors.NoBuildTask */ || buildError.code === 3 /* TaskErrors.NoTestTask */;
            const needsTerminate = buildError.code === 1 /* TaskErrors.RunningTask */;
            if (needsConfig || needsTerminate) {
                this._notificationService.prompt(buildError.severity, buildError.message, [{
                        label: needsConfig ? ConfigureTaskAction.TEXT.value : nls.localize('TerminateAction.label', "Terminate Task"),
                        run: () => {
                            if (needsConfig) {
                                this._runConfigureTasks();
                            }
                            else {
                                this._runTerminateCommand();
                            }
                        }
                    }]);
            }
            else {
                this._notificationService.notify({ severity: buildError.severity, message: buildError.message });
            }
        }
        else if (err instanceof Error) {
            const error = err;
            this._notificationService.error(error.message);
            showOutput = false;
        }
        else if (Types.isString(err)) {
            this._notificationService.error(err);
        }
        else {
            this._notificationService.error(nls.localize('TaskSystem.unknownError', 'An error has occurred while running a task. See task log for details.'));
        }
        if (showOutput) {
            this._showOutput(undefined, undefined, err);
        }
    }
    _showDetail() {
        return this._configurationService.getValue(QUICKOPEN_DETAIL_CONFIG);
    }
    async _createTaskQuickPickEntries(tasks, group = false, sort = false, selectedEntry, includeRecents = true) {
        let encounteredTasks = {};
        if (tasks === undefined || tasks === null || tasks.length === 0) {
            return [];
        }
        const TaskQuickPickEntry = (task) => {
            const newEntry = { label: task._label, description: this.getTaskDescription(task), task, detail: this._showDetail() ? task.configurationProperties.detail : undefined };
            if (encounteredTasks[task._id]) {
                if (encounteredTasks[task._id].length === 1) {
                    encounteredTasks[task._id][0].label += ' (1)';
                }
                newEntry.label = newEntry.label + ' (' + (encounteredTasks[task._id].length + 1).toString() + ')';
            }
            else {
                encounteredTasks[task._id] = [];
            }
            encounteredTasks[task._id].push(newEntry);
            return newEntry;
        };
        function fillEntries(entries, tasks, groupLabel) {
            if (tasks.length) {
                entries.push({ type: 'separator', label: groupLabel });
            }
            for (const task of tasks) {
                const entry = TaskQuickPickEntry(task);
                entry.buttons = [{ iconClass: ThemeIcon.asClassName(configureTaskIcon), tooltip: nls.localize('configureTask', "Configure Task") }];
                if (selectedEntry && (task === selectedEntry.task)) {
                    entries.unshift(selectedEntry);
                }
                else {
                    entries.push(entry);
                }
            }
        }
        let entries;
        if (group) {
            entries = [];
            if (tasks.length === 1) {
                entries.push(TaskQuickPickEntry(tasks[0]));
            }
            else {
                const recentlyUsedTasks = await this.getSavedTasks('historical');
                const recent = [];
                const recentSet = new Set();
                let configured = [];
                let detected = [];
                const taskMap = Object.create(null);
                tasks.forEach(task => {
                    const key = task.getCommonTaskId();
                    if (key) {
                        taskMap[key] = task;
                    }
                });
                recentlyUsedTasks.reverse().forEach(recentTask => {
                    const key = recentTask.getCommonTaskId();
                    if (key) {
                        recentSet.add(key);
                        const task = taskMap[key];
                        if (task) {
                            recent.push(task);
                        }
                    }
                });
                for (const task of tasks) {
                    const key = task.getCommonTaskId();
                    if (!key || !recentSet.has(key)) {
                        if ((task._source.kind === TaskSourceKind.Workspace) || (task._source.kind === TaskSourceKind.User)) {
                            configured.push(task);
                        }
                        else {
                            detected.push(task);
                        }
                    }
                }
                const sorter = this.createSorter();
                if (includeRecents) {
                    fillEntries(entries, recent, nls.localize('recentlyUsed', 'recently used tasks'));
                }
                configured = configured.sort((a, b) => sorter.compare(a, b));
                fillEntries(entries, configured, nls.localize('configured', 'configured tasks'));
                detected = detected.sort((a, b) => sorter.compare(a, b));
                fillEntries(entries, detected, nls.localize('detected', 'detected tasks'));
            }
        }
        else {
            if (sort) {
                const sorter = this.createSorter();
                tasks = tasks.sort((a, b) => sorter.compare(a, b));
            }
            entries = tasks.map(task => TaskQuickPickEntry(task));
        }
        encounteredTasks = {};
        return entries;
    }
    async _showTwoLevelQuickPick(placeHolder, defaultEntry, type, name) {
        return this._instantiationService.createInstance(TaskQuickPick).show(placeHolder, defaultEntry, type, name);
    }
    async _showQuickPick(tasks, placeHolder, defaultEntry, group = false, sort = false, selectedEntry, additionalEntries, name) {
        const resolvedTasks = await tasks;
        const entries = await raceTimeout(this._createTaskQuickPickEntries(resolvedTasks, group, sort, selectedEntry), 200, () => undefined);
        if (!entries) {
            return undefined;
        }
        if (entries.length === 1 && this._configurationService.getValue(QUICKOPEN_SKIP_CONFIG)) {
            return entries[0];
        }
        else if ((entries.length === 0) && defaultEntry) {
            entries.push(defaultEntry);
        }
        else if (entries.length > 1 && additionalEntries && additionalEntries.length > 0) {
            entries.push({ type: 'separator', label: '' });
            entries.push(additionalEntries[0]);
        }
        return this._quickInputService.pick(entries, {
            value: name,
            placeHolder,
            matchOnDescription: true,
            onDidTriggerItemButton: context => {
                const task = context.item.task;
                this._quickInputService.cancel();
                if (ContributedTask.is(task)) {
                    this.customize(task, undefined, true);
                }
                else if (CustomTask.is(task)) {
                    this.openConfig(task);
                }
            },
        });
    }
    _needsRecentTasksMigration() {
        return (this.getRecentlyUsedTasksV1().size > 0) && (this._getTasksFromStorage('historical').size === 0);
    }
    async _migrateRecentTasks(tasks) {
        if (!this._needsRecentTasksMigration()) {
            return;
        }
        const recentlyUsedTasks = this.getRecentlyUsedTasksV1();
        const taskMap = Object.create(null);
        tasks.forEach(task => {
            const key = task.getKey();
            if (key) {
                taskMap[key] = task;
            }
        });
        const reversed = [...recentlyUsedTasks.keys()].reverse();
        for (const key in reversed) {
            const task = taskMap[key];
            if (task) {
                await this._setRecentlyUsedTask(task);
            }
        }
        this._storageService.remove(AbstractTaskService_1.RecentlyUsedTasks_Key, 1 /* StorageScope.WORKSPACE */);
    }
    _showIgnoredFoldersMessage() {
        if (this.ignoredWorkspaceFolders.length === 0 || !this.showIgnoreMessage) {
            return Promise.resolve(undefined);
        }
        this._notificationService.prompt(Severity.Info, nls.localize('TaskService.ignoredFolder', 'The following workspace folders are ignored since they use task version 0.1.0: {0}', this.ignoredWorkspaceFolders.map(f => f.name).join(', ')), [{
                label: nls.localize('TaskService.notAgain', "Don't Show Again"),
                isSecondary: true,
                run: () => {
                    this._storageService.store(AbstractTaskService_1.IgnoreTask010DonotShowAgain_key, true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                    this._showIgnoreMessage = false;
                }
            }]);
        return Promise.resolve(undefined);
    }
    async _trust() {
        const context = this._contextKeyService.getContext(getActiveElement());
        if (ServerlessWebContext.getValue(this._contextKeyService) && !TaskExecutionSupportedContext?.evaluate(context)) {
            return false;
        }
        await this._workspaceTrustManagementService.workspaceTrustInitialized;
        if (!this._workspaceTrustManagementService.isWorkspaceTrusted()) {
            return (await this._workspaceTrustRequestService.requestWorkspaceTrust({
                message: nls.localize('TaskService.requestTrust', "Listing and running tasks requires that some of the files in this workspace be executed as code.")
            })) === true;
        }
        return true;
    }
    async _runTaskCommand(filter) {
        if (!this._tasksReconnected) {
            return;
        }
        if (!filter) {
            return this._doRunTaskCommand();
        }
        const type = typeof filter === 'string' ? undefined : filter.type;
        const taskName = typeof filter === 'string' ? filter : filter.task;
        const grouped = await this._getGroupedTasks({ type });
        const identifier = this._getTaskIdentifier(filter);
        const tasks = grouped.all();
        const resolver = this._createResolver(grouped);
        const folderURIs = this._contextService.getWorkspace().folders.map(folder => folder.uri);
        if (this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            folderURIs.push(this._contextService.getWorkspace().configuration);
        }
        folderURIs.push(USER_TASKS_GROUP_KEY);
        if (identifier) {
            for (const uri of folderURIs) {
                const task = await resolver.resolve(uri, identifier);
                if (task) {
                    this.run(task);
                    return;
                }
            }
        }
        const exactMatchTask = !taskName ? undefined : tasks.find(t => t.configurationProperties.identifier === taskName || t.getDefinition(true)?.configurationProperties?.identifier === taskName);
        if (!exactMatchTask) {
            return this._doRunTaskCommand(tasks, type, taskName);
        }
        for (const uri of folderURIs) {
            const task = await resolver.resolve(uri, taskName);
            if (task) {
                await this.run(task, { attachProblemMatcher: true }, 1 /* TaskRunSource.User */);
                return;
            }
        }
    }
    _tasksAndGroupedTasks(filter) {
        if (!this._versionAndEngineCompatible(filter)) {
            return { tasks: Promise.resolve([]), grouped: Promise.resolve(new TaskMap()) };
        }
        const grouped = this._getGroupedTasks(filter);
        const tasks = grouped.then((map) => {
            if (!filter || !filter.type) {
                return map.all();
            }
            const result = [];
            map.forEach((tasks) => {
                for (const task of tasks) {
                    if (ContributedTask.is(task) && task.defines.type === filter.type) {
                        result.push(task);
                    }
                    else if (CustomTask.is(task)) {
                        if (task.type === filter.type) {
                            result.push(task);
                        }
                        else {
                            const customizes = task.customizes();
                            if (customizes && customizes.type === filter.type) {
                                result.push(task);
                            }
                        }
                    }
                }
            });
            return result;
        });
        return { tasks, grouped };
    }
    _doRunTaskCommand(tasks, type, name) {
        const pickThen = (task) => {
            if (task === undefined) {
                return;
            }
            if (task === null) {
                this._runConfigureTasks();
            }
            else {
                this.run(task, { attachProblemMatcher: true }, 1 /* TaskRunSource.User */).then(undefined, reason => {
                    // eat the error, it has already been surfaced to the user and we don't care about it here
                });
            }
        };
        const placeholder = nls.localize('TaskService.pickRunTask', 'Select the task to run');
        this._showIgnoredFoldersMessage().then(() => {
            if (this._configurationService.getValue(USE_SLOW_PICKER)) {
                let taskResult = undefined;
                if (!tasks) {
                    taskResult = this._tasksAndGroupedTasks();
                }
                this._showQuickPick(tasks ? tasks : taskResult.tasks, placeholder, {
                    label: '$(plus) ' + nls.localize('TaskService.noEntryToRun', 'Configure a Task'),
                    task: null
                }, true, undefined, undefined, undefined, name).
                    then((entry) => {
                    return pickThen(entry ? entry.task : undefined);
                });
            }
            else {
                this._showTwoLevelQuickPick(placeholder, {
                    label: '$(plus) ' + nls.localize('TaskService.noEntryToRun', 'Configure a Task'),
                    task: null
                }, type, name).
                    then(pickThen);
            }
        });
    }
    async rerun(terminalInstanceId) {
        const task = await this._taskSystem?.getTaskForTerminal(terminalInstanceId);
        if (task) {
            this._restart(task);
        }
        else {
            this._reRunTaskCommand(true);
        }
    }
    _reRunTaskCommand(onlyRerun) {
        ProblemMatcherRegistry.onReady().then(() => {
            return this._editorService.saveAll({ reason: 2 /* SaveReason.AUTO */ }).then(() => {
                const executeResult = this._getTaskSystem().rerun();
                if (executeResult) {
                    return this._handleExecuteResult(executeResult);
                }
                else {
                    if (!onlyRerun && !this._taskRunningState.get()) {
                        // No task running, prompt to ask which to run
                        this._doRunTaskCommand();
                    }
                    return Promise.resolve(undefined);
                }
            });
        });
    }
    /**
     *
     * @param tasks - The tasks which need to be filtered
     * @param tasksInList - This tells splitPerGroupType to filter out globbed tasks (into defaults)
     * @returns
     */
    _getDefaultTasks(tasks, taskGlobsInList = false) {
        const defaults = [];
        for (const task of tasks.filter(t => !!t.configurationProperties.group)) {
            // At this point (assuming taskGlobsInList is true) there are tasks with matching globs, so only put those in defaults
            if (taskGlobsInList && typeof task.configurationProperties.group.isDefault === 'string') {
                defaults.push(task);
            }
            else if (!taskGlobsInList && task.configurationProperties.group.isDefault === true) {
                defaults.push(task);
            }
        }
        return defaults;
    }
    _runTaskGroupCommand(taskGroup, strings, configure, legacyCommand) {
        if (this.schemaVersion === 1 /* JsonSchemaVersion.V0_1_0 */) {
            legacyCommand();
            return;
        }
        const options = {
            location: 10 /* ProgressLocation.Window */,
            title: strings.fetching
        };
        const promise = (async () => {
            async function runSingleTask(task, problemMatcherOptions, that) {
                that.run(task, problemMatcherOptions, 1 /* TaskRunSource.User */).then(undefined, reason => {
                    // eat the error, it has already been surfaced to the user and we don't care about it here
                });
            }
            const chooseAndRunTask = (tasks) => {
                this._showIgnoredFoldersMessage().then(() => {
                    this._showQuickPick(tasks, strings.select, {
                        label: strings.notFoundConfigure,
                        task: null
                    }, true).then((entry) => {
                        const task = entry ? entry.task : undefined;
                        if (task === undefined) {
                            return;
                        }
                        if (task === null) {
                            configure.apply(this);
                            return;
                        }
                        runSingleTask(task, { attachProblemMatcher: true }, this);
                    });
                });
            };
            let groupTasks = [];
            const { globGroupTasks, globTasksDetected } = await this._getGlobTasks(taskGroup._id);
            groupTasks = [...globGroupTasks];
            if (!globTasksDetected && groupTasks.length === 0) {
                groupTasks = await this._findWorkspaceTasksInGroup(taskGroup, true);
            }
            const handleMultipleTasks = (areGlobTasks) => {
                return this._getTasksForGroup(taskGroup).then((tasks) => {
                    if (tasks.length > 0) {
                        // If we're dealing with tasks that were chosen because of a glob match,
                        // then put globs in the defaults and everything else in none
                        const defaults = this._getDefaultTasks(tasks, areGlobTasks);
                        if (defaults.length === 1) {
                            runSingleTask(defaults[0], undefined, this);
                            return;
                        }
                        else if (defaults.length > 0) {
                            tasks = defaults;
                        }
                    }
                    // At this this point there are multiple tasks.
                    chooseAndRunTask(tasks);
                });
            };
            const resolveTaskAndRun = (taskGroupTask) => {
                if (ConfiguringTask.is(taskGroupTask)) {
                    this.tryResolveTask(taskGroupTask).then(resolvedTask => {
                        runSingleTask(resolvedTask, undefined, this);
                    });
                }
                else {
                    runSingleTask(taskGroupTask, undefined, this);
                }
            };
            // A single default glob task was returned, just run it directly
            if (groupTasks.length === 1) {
                return resolveTaskAndRun(groupTasks[0]);
            }
            // If there's multiple globs that match we want to show the quick picker for those tasks
            // We will need to call splitPerGroupType putting globs in defaults and the remaining tasks in none.
            // We don't need to carry on after here
            if (globTasksDetected && groupTasks.length > 1) {
                return handleMultipleTasks(true);
            }
            // If no globs are found or matched fallback to checking for default tasks of the task group
            if (!groupTasks.length) {
                groupTasks = await this._findWorkspaceTasksInGroup(taskGroup, true);
            }
            if (groupTasks.length === 1) {
                // A single default task was returned, just run it directly
                return resolveTaskAndRun(groupTasks[0]);
            }
            // Multiple default tasks returned, show the quickPicker
            return handleMultipleTasks(false);
        })();
        this._progressService.withProgress(options, () => promise);
    }
    async _getGlobTasks(taskGroupId) {
        let globTasksDetected = false;
        // First check for globs before checking for the default tasks of the task group
        const absoluteURI = EditorResourceAccessor.getOriginalUri(this._editorService.activeEditor);
        if (absoluteURI) {
            const workspaceFolder = this._contextService.getWorkspaceFolder(absoluteURI);
            if (workspaceFolder) {
                const configuredTasks = this._getConfiguration(workspaceFolder)?.config?.tasks;
                if (configuredTasks) {
                    globTasksDetected = configuredTasks.filter(task => task.group && typeof task.group !== 'string' && typeof task.group.isDefault === 'string').length > 0;
                    // This will activate extensions, so only do so if necessary #185960
                    if (globTasksDetected) {
                        // Fallback to absolute path of the file if it is not in a workspace or relative path cannot be found
                        const relativePath = workspaceFolder?.uri ? (resources.relativePath(workspaceFolder.uri, absoluteURI) ?? absoluteURI.path) : absoluteURI.path;
                        const globGroupTasks = await this._findWorkspaceTasks((task) => {
                            const currentTaskGroup = task.configurationProperties.group;
                            if (currentTaskGroup && typeof currentTaskGroup !== 'string' && typeof currentTaskGroup.isDefault === 'string') {
                                return (currentTaskGroup._id === taskGroupId && glob.match(currentTaskGroup.isDefault, relativePath, { ignoreCase: true }));
                            }
                            globTasksDetected = false;
                            return false;
                        });
                        return { globGroupTasks, globTasksDetected };
                    }
                }
            }
        }
        return { globGroupTasks: [], globTasksDetected };
    }
    _runBuildCommand() {
        if (!this._tasksReconnected) {
            return;
        }
        return this._runTaskGroupCommand(TaskGroup.Build, {
            fetching: nls.localize('TaskService.fetchingBuildTasks', 'Fetching build tasks...'),
            select: nls.localize('TaskService.pickBuildTask', 'Select the build task to run'),
            notFoundConfigure: nls.localize('TaskService.noBuildTask', 'No build task to run found. Configure Build Task...')
        }, this._runConfigureDefaultBuildTask, this._build);
    }
    _runTestCommand() {
        return this._runTaskGroupCommand(TaskGroup.Test, {
            fetching: nls.localize('TaskService.fetchingTestTasks', 'Fetching test tasks...'),
            select: nls.localize('TaskService.pickTestTask', 'Select the test task to run'),
            notFoundConfigure: nls.localize('TaskService.noTestTaskTerminal', 'No test task to run found. Configure Tasks...')
        }, this._runConfigureDefaultTestTask, this._runTest);
    }
    _runTerminateCommand(arg) {
        if (arg === 'terminateAll') {
            this._terminateAll();
            return;
        }
        const runQuickPick = (promise) => {
            this._showQuickPick(promise || this.getActiveTasks(), nls.localize('TaskService.taskToTerminate', 'Select a task to terminate'), {
                label: nls.localize('TaskService.noTaskRunning', 'No task is currently running'),
                task: undefined
            }, false, true, undefined, [{
                    label: nls.localize('TaskService.terminateAllRunningTasks', 'All Running Tasks'),
                    id: 'terminateAll',
                    task: undefined
                }]).then(entry => {
                if (entry && entry.id === 'terminateAll') {
                    this._terminateAll();
                }
                const task = entry ? entry.task : undefined;
                if (task === undefined || task === null) {
                    return;
                }
                this.terminate(task);
            });
        };
        if (this.inTerminal()) {
            const identifier = this._getTaskIdentifier(arg);
            let promise;
            if (identifier !== undefined) {
                promise = this.getActiveTasks();
                promise.then((tasks) => {
                    for (const task of tasks) {
                        if (task.matches(identifier)) {
                            this.terminate(task);
                            return;
                        }
                    }
                    runQuickPick(promise);
                });
            }
            else {
                runQuickPick();
            }
        }
        else {
            this._isActive().then((active) => {
                if (active) {
                    this._terminateAll().then((responses) => {
                        // the output runner has only one task
                        const response = responses[0];
                        if (response.success) {
                            return;
                        }
                        if (response.code && response.code === 3 /* TerminateResponseCode.ProcessNotFound */) {
                            this._notificationService.error(nls.localize('TerminateAction.noProcess', 'The launched process doesn\'t exist anymore. If the task spawned background tasks exiting VS Code might result in orphaned processes.'));
                        }
                        else {
                            this._notificationService.error(nls.localize('TerminateAction.failed', 'Failed to terminate running task'));
                        }
                    });
                }
            });
        }
    }
    async _runRestartTaskCommand(arg) {
        const activeTasks = await this.getActiveTasks();
        if (activeTasks.length === 1) {
            this._restart(activeTasks[0]);
            return;
        }
        if (this.inTerminal()) {
            // try dispatching using task identifier
            const identifier = this._getTaskIdentifier(arg);
            if (identifier !== undefined) {
                for (const task of activeTasks) {
                    if (task.matches(identifier)) {
                        this._restart(task);
                        return;
                    }
                }
            }
            // show quick pick with active tasks
            const entry = await this._showQuickPick(activeTasks, nls.localize('TaskService.taskToRestart', 'Select the task to restart'), {
                label: nls.localize('TaskService.noTaskToRestart', 'No task to restart'),
                task: null
            }, false, true);
            if (entry && entry.task) {
                this._restart(entry.task);
            }
        }
        else {
            if (activeTasks.length > 0) {
                this._restart(activeTasks[0]);
            }
        }
    }
    async _runRerunAllRunningTasksCommand() {
        const activeTasks = await this.getActiveTasks();
        if (activeTasks.length === 0) {
            this._notificationService.info(nls.localize('TaskService.noRunningTasks', 'No running tasks to restart'));
            return;
        }
        // Restart all active tasks
        const restartPromises = activeTasks.map(task => this._restart(task));
        await Promise.allSettled(restartPromises);
    }
    _getTaskIdentifier(filter) {
        let result = undefined;
        if (Types.isString(filter)) {
            result = filter;
        }
        else if (filter && Types.isString(filter.type)) {
            result = TaskDefinition.createTaskIdentifier(filter, console);
        }
        return result;
    }
    _configHasTasks(taskConfig) {
        return !!taskConfig && !!taskConfig.tasks && taskConfig.tasks.length > 0;
    }
    _openTaskFile(resource, taskSource) {
        let configFileCreated = false;
        this._fileService.stat(resource).then((stat) => stat, () => undefined).then(async (stat) => {
            const fileExists = !!stat;
            const configValue = this._configurationService.inspect('tasks', { resource });
            let tasksExistInFile;
            let target;
            switch (taskSource) {
                case TaskSourceKind.User:
                    tasksExistInFile = this._configHasTasks(configValue.userValue);
                    target = 2 /* ConfigurationTarget.USER */;
                    break;
                case TaskSourceKind.WorkspaceFile:
                    tasksExistInFile = this._configHasTasks(configValue.workspaceValue);
                    target = 5 /* ConfigurationTarget.WORKSPACE */;
                    break;
                default:
                    tasksExistInFile = this._configHasTasks(configValue.workspaceFolderValue);
                    target = 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
            }
            let content;
            if (!tasksExistInFile) {
                const pickTemplateResult = await this._quickInputService.pick(getTaskTemplates(), { placeHolder: nls.localize('TaskService.template', 'Select a Task Template') });
                if (!pickTemplateResult) {
                    return Promise.resolve(undefined);
                }
                content = pickTemplateResult.content;
                // eslint-disable-next-line local/code-no-any-casts
                const editorConfig = this._configurationService.getValue();
                if (editorConfig.editor.insertSpaces) {
                    content = content.replace(/(\n)(\t+)/g, (_, s1, s2) => s1 + ' '.repeat(s2.length * editorConfig.editor.tabSize));
                }
                configFileCreated = true;
            }
            if (!fileExists && content) {
                return this._textFileService.create([{ resource, value: content }]).then(result => {
                    return result[0].resource;
                });
            }
            else if (fileExists && (tasksExistInFile || content)) {
                const statResource = stat?.resource;
                if (content && statResource) {
                    this._configurationService.updateValue('tasks', json.parse(content), { resource: statResource }, target);
                }
                return statResource;
            }
            return undefined;
        }).then((resource) => {
            if (!resource) {
                return;
            }
            this._editorService.openEditor({
                resource,
                options: {
                    pinned: configFileCreated // pin only if config file is created #8727
                }
            });
        });
    }
    _isTaskEntry(value) {
        // eslint-disable-next-line local/code-no-any-casts
        const candidate = value;
        return candidate && !!candidate.task;
    }
    _isSettingEntry(value) {
        // eslint-disable-next-line local/code-no-any-casts
        const candidate = value;
        return candidate && !!candidate.settingType;
    }
    _configureTask(task) {
        if (ContributedTask.is(task)) {
            this.customize(task, undefined, true);
        }
        else if (CustomTask.is(task)) {
            this.openConfig(task);
        }
        else if (ConfiguringTask.is(task)) {
            // Do nothing.
        }
    }
    _handleSelection(selection) {
        if (!selection) {
            return;
        }
        if (this._isTaskEntry(selection)) {
            this._configureTask(selection.task);
        }
        else if (this._isSettingEntry(selection)) {
            const taskQuickPick = this._instantiationService.createInstance(TaskQuickPick);
            taskQuickPick.handleSettingOption(selection.settingType);
        }
        else if (selection.folder && (this._contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */)) {
            this._openTaskFile(selection.folder.toResource('.vscode/tasks.json'), TaskSourceKind.Workspace);
        }
        else {
            const resource = this._getResourceForKind(TaskSourceKind.User);
            if (resource) {
                this._openTaskFile(resource, TaskSourceKind.User);
            }
        }
    }
    getTaskDescription(task) {
        let description;
        if (task._source.kind === TaskSourceKind.User) {
            description = nls.localize('taskQuickPick.userSettings', 'User');
        }
        else if (task._source.kind === TaskSourceKind.WorkspaceFile) {
            description = task.getWorkspaceFileName();
        }
        else if (this.needsFolderQualification()) {
            const workspaceFolder = task.getWorkspaceFolder();
            if (workspaceFolder) {
                description = workspaceFolder.name;
            }
        }
        return description;
    }
    async _runConfigureTasks() {
        if (!(await this._trust())) {
            return;
        }
        let taskPromise;
        if (this.schemaVersion === 2 /* JsonSchemaVersion.V2_0_0 */) {
            taskPromise = this._getGroupedTasks();
        }
        else {
            taskPromise = Promise.resolve(new TaskMap());
        }
        const stats = this._contextService.getWorkspace().folders.map((folder) => {
            return this._fileService.stat(folder.toResource('.vscode/tasks.json')).then(stat => stat, () => undefined);
        });
        const createLabel = nls.localize('TaskService.createJsonFile', 'Create tasks.json file from template');
        const openLabel = nls.localize('TaskService.openJsonFile', 'Open tasks.json file');
        const tokenSource = new CancellationTokenSource();
        const cancellationToken = tokenSource.token;
        const entries = Promise.all(stats).then((stats) => {
            return taskPromise.then((taskMap) => {
                const entries = [];
                let configuredCount = 0;
                let tasks = taskMap.all();
                if (tasks.length > 0) {
                    tasks = tasks.sort((a, b) => a._label.localeCompare(b._label));
                    for (const task of tasks) {
                        const entry = { label: TaskQuickPick.getTaskLabelWithIcon(task), task, description: this.getTaskDescription(task), detail: this._showDetail() ? task.configurationProperties.detail : undefined };
                        TaskQuickPick.applyColorStyles(task, entry, this._themeService);
                        entries.push(entry);
                        if (!ContributedTask.is(task)) {
                            configuredCount++;
                        }
                    }
                }
                const needsCreateOrOpen = (configuredCount === 0);
                // If the only configured tasks are user tasks, then we should also show the option to create from a template.
                if (needsCreateOrOpen || (taskMap.get(USER_TASKS_GROUP_KEY).length === configuredCount)) {
                    const label = stats[0] !== undefined ? openLabel : createLabel;
                    if (entries.length) {
                        entries.push({ type: 'separator' });
                    }
                    entries.push({ label, folder: this._contextService.getWorkspace().folders[0] });
                }
                if ((entries.length === 1) && !needsCreateOrOpen) {
                    tokenSource.cancel();
                }
                return entries;
            });
        });
        const timeout = await Promise.race([new Promise((resolve) => {
                entries.then(() => resolve(false));
            }), new Promise((resolve) => {
                const timer = setTimeout(() => {
                    clearTimeout(timer);
                    resolve(true);
                }, 200);
            })]);
        if (!timeout && ((await entries).length === 1) && this._configurationService.getValue(QUICKOPEN_SKIP_CONFIG)) {
            const entry = (await entries)[0];
            if (entry.task) {
                this._handleSelection(entry);
                return;
            }
        }
        const entriesWithSettings = entries.then(resolvedEntries => {
            resolvedEntries.push(...TaskQuickPick.allSettingEntries(this._configurationService));
            return resolvedEntries;
        });
        this._quickInputService.pick(entriesWithSettings, { placeHolder: nls.localize('TaskService.pickTask', 'Select a task to configure') }, cancellationToken).
            then(async (selection) => {
            if (cancellationToken.isCancellationRequested) {
                // canceled when there's only one task
                const task = (await entries)[0];
                // eslint-disable-next-line local/code-no-any-casts
                if (task.task) {
                    selection = task;
                }
            }
            this._handleSelection(selection);
        });
    }
    _runConfigureDefaultBuildTask() {
        if (this.schemaVersion === 2 /* JsonSchemaVersion.V2_0_0 */) {
            this.tasks().then((tasks => {
                if (tasks.length === 0) {
                    this._runConfigureTasks();
                    return;
                }
                const entries = [];
                let selectedTask;
                let selectedEntry;
                this._showIgnoredFoldersMessage().then(async () => {
                    const { globGroupTasks } = await this._getGlobTasks(TaskGroup.Build._id);
                    let defaultTasks = globGroupTasks;
                    if (!defaultTasks?.length) {
                        defaultTasks = this._getDefaultTasks(tasks, false);
                    }
                    let defaultBuildTask;
                    if (defaultTasks.length === 1) {
                        const group = defaultTasks[0].configurationProperties.group;
                        if (group) {
                            if (typeof group === 'string' && group === TaskGroup.Build._id) {
                                defaultBuildTask = defaultTasks[0];
                            }
                            else {
                                defaultBuildTask = defaultTasks[0];
                            }
                        }
                    }
                    for (const task of tasks) {
                        if (task === defaultBuildTask) {
                            const label = nls.localize('TaskService.defaultBuildTaskExists', '{0} is already marked as the default build task', TaskQuickPick.getTaskLabelWithIcon(task, task.getQualifiedLabel()));
                            selectedTask = task;
                            selectedEntry = { label, task, description: this.getTaskDescription(task), detail: this._showDetail() ? task.configurationProperties.detail : undefined };
                            TaskQuickPick.applyColorStyles(task, selectedEntry, this._themeService);
                        }
                        else {
                            const entry = { label: TaskQuickPick.getTaskLabelWithIcon(task), task, description: this.getTaskDescription(task), detail: this._showDetail() ? task.configurationProperties.detail : undefined };
                            TaskQuickPick.applyColorStyles(task, entry, this._themeService);
                            entries.push(entry);
                        }
                    }
                    if (selectedEntry) {
                        entries.unshift(selectedEntry);
                    }
                    const tokenSource = new CancellationTokenSource();
                    const cancellationToken = tokenSource.token;
                    this._quickInputService.pick(entries, { placeHolder: nls.localize('TaskService.pickTask', 'Select a task to configure') }, cancellationToken).
                        then(async (entry) => {
                        if (cancellationToken.isCancellationRequested) {
                            // canceled when there's only one task
                            const task = (await entries)[0];
                            // eslint-disable-next-line local/code-no-any-casts
                            if (task.task) {
                                entry = task;
                            }
                        }
                        const task = entry && 'task' in entry ? entry.task : undefined;
                        if ((task === undefined) || (task === null)) {
                            return;
                        }
                        if (task === selectedTask && CustomTask.is(task)) {
                            this.openConfig(task);
                        }
                        if (!InMemoryTask.is(task)) {
                            this.customize(task, { group: { kind: 'build', isDefault: true } }, true).then(() => {
                                if (selectedTask && (task !== selectedTask) && !InMemoryTask.is(selectedTask)) {
                                    this.customize(selectedTask, { group: 'build' }, false);
                                }
                            });
                        }
                    });
                    this._quickInputService.pick(entries, {
                        placeHolder: nls.localize('TaskService.pickDefaultBuildTask', 'Select the task to be used as the default build task')
                    }).
                        then((entry) => {
                        const task = entry && 'task' in entry ? entry.task : undefined;
                        if ((task === undefined) || (task === null)) {
                            return;
                        }
                        if (task === selectedTask && CustomTask.is(task)) {
                            this.openConfig(task);
                        }
                        if (!InMemoryTask.is(task)) {
                            this.customize(task, { group: { kind: 'build', isDefault: true } }, true).then(() => {
                                if (selectedTask && (task !== selectedTask) && !InMemoryTask.is(selectedTask)) {
                                    this.customize(selectedTask, { group: 'build' }, false);
                                }
                            });
                        }
                    });
                });
            }));
        }
        else {
            this._runConfigureTasks();
        }
    }
    _runConfigureDefaultTestTask() {
        if (this.schemaVersion === 2 /* JsonSchemaVersion.V2_0_0 */) {
            this.tasks().then((tasks => {
                if (tasks.length === 0) {
                    this._runConfigureTasks();
                    return;
                }
                let selectedTask;
                let selectedEntry;
                for (const task of tasks) {
                    const taskGroup = TaskGroup.from(task.configurationProperties.group);
                    if (taskGroup && taskGroup.isDefault && taskGroup._id === TaskGroup.Test._id) {
                        selectedTask = task;
                        break;
                    }
                }
                if (selectedTask) {
                    selectedEntry = {
                        label: nls.localize('TaskService.defaultTestTaskExists', '{0} is already marked as the default test task.', selectedTask.getQualifiedLabel()),
                        task: selectedTask,
                        detail: this._showDetail() ? selectedTask.configurationProperties.detail : undefined
                    };
                }
                this._showIgnoredFoldersMessage().then(() => {
                    this._showQuickPick(tasks, nls.localize('TaskService.pickDefaultTestTask', 'Select the task to be used as the default test task'), undefined, true, false, selectedEntry).then((entry) => {
                        const task = entry ? entry.task : undefined;
                        if (!task) {
                            return;
                        }
                        if (task === selectedTask && CustomTask.is(task)) {
                            this.openConfig(task);
                        }
                        if (!InMemoryTask.is(task)) {
                            this.customize(task, { group: { kind: 'test', isDefault: true } }, true).then(() => {
                                if (selectedTask && (task !== selectedTask) && !InMemoryTask.is(selectedTask)) {
                                    this.customize(selectedTask, { group: 'test' }, false);
                                }
                            });
                        }
                    });
                });
            }));
        }
        else {
            this._runConfigureTasks();
        }
    }
    async runShowTasks() {
        const activeTasksPromise = this.getActiveTasks();
        const activeTasks = await activeTasksPromise;
        let group;
        if (activeTasks.length === 1) {
            this._taskSystem.revealTask(activeTasks[0]);
        }
        else if (activeTasks.length && activeTasks.every((task) => {
            if (InMemoryTask.is(task)) {
                return false;
            }
            if (!group) {
                group = task.command.presentation?.group;
            }
            return task.command.presentation?.group && (task.command.presentation.group === group);
        })) {
            this._taskSystem.revealTask(activeTasks[0]);
        }
        else {
            this._showQuickPick(activeTasksPromise, nls.localize('TaskService.pickShowTask', 'Select the task to show its output'), {
                label: nls.localize('TaskService.noTaskIsRunning', 'No task is running'),
                task: null
            }, false, true).then((entry) => {
                const task = entry ? entry.task : undefined;
                if (task === undefined || task === null) {
                    return;
                }
                this._taskSystem.revealTask(task);
            });
        }
    }
    async _createTasksDotOld(folder) {
        const tasksFile = folder.toResource('.vscode/tasks.json');
        if (await this._fileService.exists(tasksFile)) {
            const oldFile = tasksFile.with({ path: `${tasksFile.path}.old` });
            await this._fileService.copy(tasksFile, oldFile, true);
            return [oldFile, tasksFile];
        }
        return undefined;
    }
    _upgradeTask(task, suppressTaskName, globalConfig) {
        if (!CustomTask.is(task)) {
            return;
        }
        const configElement = {
            label: task._label
        };
        const oldTaskTypes = new Set(['gulp', 'jake', 'grunt']);
        if (Types.isString(task.command.name) && oldTaskTypes.has(task.command.name)) {
            configElement.type = task.command.name;
            configElement.task = task.command.args[0];
        }
        else {
            if (task.command.runtime === RuntimeType.Shell) {
                configElement.type = RuntimeType.toString(RuntimeType.Shell);
            }
            if (task.command.name && !suppressTaskName && !globalConfig.windows?.command && !globalConfig.osx?.command && !globalConfig.linux?.command) {
                configElement.command = task.command.name;
            }
            else if (suppressTaskName) {
                configElement.command = task._source.config.element.command;
            }
            if (task.command.args && (!Array.isArray(task.command.args) || (task.command.args.length > 0))) {
                if (!globalConfig.windows?.args && !globalConfig.osx?.args && !globalConfig.linux?.args) {
                    configElement.args = task.command.args;
                }
                else {
                    configElement.args = task._source.config.element.args;
                }
            }
        }
        if (task.configurationProperties.presentation) {
            configElement.presentation = task.configurationProperties.presentation;
        }
        if (task.configurationProperties.isBackground) {
            configElement.isBackground = task.configurationProperties.isBackground;
        }
        if (task.configurationProperties.problemMatchers) {
            configElement.problemMatcher = task._source.config.element.problemMatcher;
        }
        if (task.configurationProperties.group) {
            configElement.group = task.configurationProperties.group;
        }
        task._source.config.element = configElement;
        const tempTask = new CustomTask(task._id, task._source, task._label, task.type, task.command, task.hasDefinedMatchers, task.runOptions, task.configurationProperties);
        const configTask = this._createCustomizableTask(tempTask);
        if (configTask) {
            return configTask;
        }
        return;
    }
    async _upgrade() {
        if (this.schemaVersion === 2 /* JsonSchemaVersion.V2_0_0 */) {
            return;
        }
        if (!this._workspaceTrustManagementService.isWorkspaceTrusted()) {
            this._register(Event.once(this._workspaceTrustManagementService.onDidChangeTrust)(isTrusted => {
                if (isTrusted) {
                    this._upgrade();
                }
            }));
            return;
        }
        const tasks = await this._getGroupedTasks();
        const fileDiffs = [];
        for (const folder of this.workspaceFolders) {
            const diff = await this._createTasksDotOld(folder);
            if (diff) {
                fileDiffs.push(diff);
            }
            if (!diff) {
                continue;
            }
            const configTasks = [];
            const suppressTaskName = !!this._configurationService.getValue("tasks.suppressTaskName" /* TasksSchemaProperties.SuppressTaskName */, { resource: folder.uri });
            const globalConfig = {
                windows: this._configurationService.getValue("tasks.windows" /* TasksSchemaProperties.Windows */, { resource: folder.uri }),
                osx: this._configurationService.getValue("tasks.osx" /* TasksSchemaProperties.Osx */, { resource: folder.uri }),
                linux: this._configurationService.getValue("tasks.linux" /* TasksSchemaProperties.Linux */, { resource: folder.uri })
            };
            tasks.get(folder).forEach(task => {
                const configTask = this._upgradeTask(task, suppressTaskName, globalConfig);
                if (configTask) {
                    configTasks.push(configTask);
                }
            });
            this._taskSystem = undefined;
            this._workspaceTasksPromise = undefined;
            await this._writeConfiguration(folder, 'tasks.tasks', configTasks);
            await this._writeConfiguration(folder, 'tasks.version', '2.0.0');
            if (this._configurationService.getValue("tasks.showOutput" /* TasksSchemaProperties.ShowOutput */, { resource: folder.uri })) {
                await this._configurationService.updateValue("tasks.showOutput" /* TasksSchemaProperties.ShowOutput */, undefined, { resource: folder.uri });
            }
            if (this._configurationService.getValue("tasks.isShellCommand" /* TasksSchemaProperties.IsShellCommand */, { resource: folder.uri })) {
                await this._configurationService.updateValue("tasks.isShellCommand" /* TasksSchemaProperties.IsShellCommand */, undefined, { resource: folder.uri });
            }
            if (this._configurationService.getValue("tasks.suppressTaskName" /* TasksSchemaProperties.SuppressTaskName */, { resource: folder.uri })) {
                await this._configurationService.updateValue("tasks.suppressTaskName" /* TasksSchemaProperties.SuppressTaskName */, undefined, { resource: folder.uri });
            }
        }
        this._updateSetup();
        this._notificationService.prompt(Severity.Warning, fileDiffs.length === 1 ?
            nls.localize('taskService.upgradeVersion', "The deprecated tasks version 0.1.0 has been removed. Your tasks have been upgraded to version 2.0.0. Open the diff to review the upgrade.")
            : nls.localize('taskService.upgradeVersionPlural', "The deprecated tasks version 0.1.0 has been removed. Your tasks have been upgraded to version 2.0.0. Open the diffs to review the upgrade."), [{
                label: fileDiffs.length === 1 ? nls.localize('taskService.openDiff', "Open diff") : nls.localize('taskService.openDiffs', "Open diffs"),
                run: async () => {
                    for (const upgrade of fileDiffs) {
                        await this._editorService.openEditor({
                            original: { resource: upgrade[0] },
                            modified: { resource: upgrade[1] }
                        });
                    }
                }
            }]);
    }
};
AbstractTaskService = AbstractTaskService_1 = __decorate([
    __param(0, IConfigurationService),
    __param(1, IMarkerService),
    __param(2, IOutputService),
    __param(3, IPaneCompositePartService),
    __param(4, IViewsService),
    __param(5, ICommandService),
    __param(6, IEditorService),
    __param(7, IFileService),
    __param(8, IWorkspaceContextService),
    __param(9, ITelemetryService),
    __param(10, ITextFileService),
    __param(11, IModelService),
    __param(12, IExtensionService),
    __param(13, IQuickInputService),
    __param(14, IConfigurationResolverService),
    __param(15, ITerminalService),
    __param(16, ITerminalGroupService),
    __param(17, IStorageService),
    __param(18, IProgressService),
    __param(19, IOpenerService),
    __param(20, IDialogService),
    __param(21, INotificationService),
    __param(22, IContextKeyService),
    __param(23, IWorkbenchEnvironmentService),
    __param(24, ITerminalProfileResolverService),
    __param(25, IPathService),
    __param(26, ITextModelService),
    __param(27, IPreferencesService),
    __param(28, IViewDescriptorService),
    __param(29, IWorkspaceTrustRequestService),
    __param(30, IWorkspaceTrustManagementService),
    __param(31, ILogService),
    __param(32, IThemeService),
    __param(33, ILifecycleService),
    __param(34, IRemoteAgentService),
    __param(35, IInstantiationService),
    __param(36, IChatService),
    __param(37, IChatAgentService),
    __param(38, IHostService)
], AbstractTaskService);
export { AbstractTaskService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RUYXNrU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL2Jyb3dzZXIvYWJzdHJhY3RUYXNrU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBMkIsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN4SSxPQUFPLEVBQUUsUUFBUSxFQUFTLE1BQU0sZ0NBQWdDLENBQUM7QUFDakUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQW1CLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkYsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUVoRSxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUs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