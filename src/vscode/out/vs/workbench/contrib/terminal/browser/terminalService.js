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
import * as domStylesheets from '../../../../base/browser/domStylesheets.js';
import * as cssValue from '../../../../base/browser/cssValue.js';
import { DeferredPromise, timeout } from '../../../../base/common/async.js';
import { debounce, memoize } from '../../../../base/common/decorators.js';
import { DynamicListEventMultiplexer, Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isMacintosh, isWeb } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ITerminalLogService, TerminalExitReason, TerminalLocation, TitleEventSource } from '../../../../platform/terminal/common/terminal.js';
import { formatMessageForTerminal } from '../../../../platform/terminal/common/terminalStrings.js';
import { iconForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { getIconRegistry } from '../../../../platform/theme/common/iconRegistry.js';
import { isDark } from '../../../../platform/theme/common/theme.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { VirtualWorkspaceContext } from '../../../common/contextkeys.js';
import { ITerminalConfigurationService, ITerminalEditorService, ITerminalGroupService, ITerminalInstanceService, ITerminalService } from './terminal.js';
import { getCwdForSplit } from './terminalActions.js';
import { TerminalEditorInput } from './terminalEditorInput.js';
import { getColorStyleContent, getUriClasses } from './terminalIcon.js';
import { TerminalProfileQuickpick } from './terminalProfileQuickpick.js';
import { getInstanceFromResource, getTerminalUri, parseTerminalUri } from './terminalUri.js';
import { ITerminalProfileService } from '../common/terminal.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { columnToEditorGroup } from '../../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, AUX_WINDOW_GROUP, IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { XtermTerminal } from './xterm/xtermTerminal.js';
import { TerminalInstance } from './terminalInstance.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { TerminalCapabilityStore } from '../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
import { mark } from '../../../../base/common/performance.js';
import { DetachedTerminal } from './detachedTerminal.js';
import { createInstanceCapabilityEventMultiplexer } from './terminalEvents.js';
import { isAuxiliaryWindow, mainWindow } from '../../../../base/browser/window.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { hasKey, isString } from '../../../../base/common/types.js';
let TerminalService = class TerminalService extends Disposable {
    get isProcessSupportRegistered() { return !!this._processSupportContextKey.get(); }
    get connectionState() { return this._connectionState; }
    get whenConnected() { return this._whenConnected.p; }
    get restoredGroupCount() { return this._restoredGroupCount; }
    get instances() {
        return this._terminalGroupService.instances.concat(this._terminalEditorService.instances).concat(this._backgroundedTerminalInstances.map(bg => bg.instance));
    }
    /** Gets all non-background terminals. */
    get foregroundInstances() {
        return this._terminalGroupService.instances.concat(this._terminalEditorService.instances);
    }
    get detachedInstances() {
        return this._detachedXterms;
    }
    getReconnectedTerminals(reconnectionOwner) {
        return this._reconnectedTerminals.get(reconnectionOwner);
    }
    get activeInstance() {
        // Check if either an editor or panel terminal has focus and return that, regardless of the
        // value of _activeInstance. This avoids terminals created in the panel for example stealing
        // the active status even when it's not focused.
        for (const activeHostTerminal of this._hostActiveTerminals.values()) {
            if (activeHostTerminal?.hasFocus) {
                return activeHostTerminal;
            }
        }
        // Fallback to the last recorded active terminal if neither have focus
        return this._activeInstance;
    }
    get onDidCreateInstance() { return this._onDidCreateInstance.event; }
    get onDidChangeInstanceDimensions() { return this._onDidChangeInstanceDimensions.event; }
    get onDidRegisterProcessSupport() { return this._onDidRegisterProcessSupport.event; }
    get onDidChangeConnectionState() { return this._onDidChangeConnectionState.event; }
    get onDidRequestStartExtensionTerminal() { return this._onDidRequestStartExtensionTerminal.event; }
    get onDidDisposeInstance() { return this._onDidDisposeInstance.event; }
    get onDidFocusInstance() { return this._onDidFocusInstance.event; }
    get onDidChangeActiveInstance() { return this._onDidChangeActiveInstance.event; }
    get onDidChangeInstances() { return this._onDidChangeInstances.event; }
    get onDidChangeInstanceCapability() { return this._onDidChangeInstanceCapability.event; }
    get onDidChangeActiveGroup() { return this._onDidChangeActiveGroup.event; }
    // Lazily initialized events that fire when the specified event fires on _any_ terminal
    // TODO: Batch events
    get onAnyInstanceData() { return this._register(this.createOnInstanceEvent(instance => Event.map(instance.onData, data => ({ instance, data })))).event; }
    get onAnyInstanceDataInput() { return this._register(this.createOnInstanceEvent(e => Event.map(e.onDidInputData, () => e, e.store))).event; }
    get onAnyInstanceIconChange() { return this._register(this.createOnInstanceEvent(e => e.onIconChanged)).event; }
    get onAnyInstanceMaximumDimensionsChange() { return this._register(this.createOnInstanceEvent(e => Event.map(e.onMaximumDimensionsChanged, () => e, e.store))).event; }
    get onAnyInstancePrimaryStatusChange() { return this._register(this.createOnInstanceEvent(e => Event.map(e.statusList.onDidChangePrimaryStatus, () => e, e.store))).event; }
    get onAnyInstanceProcessIdReady() { return this._register(this.createOnInstanceEvent(e => e.onProcessIdReady)).event; }
    get onAnyInstanceSelectionChange() { return this._register(this.createOnInstanceEvent(e => e.onDidChangeSelection)).event; }
    get onAnyInstanceTitleChange() { return this._register(this.createOnInstanceEvent(e => e.onTitleChanged)).event; }
    get onAnyInstanceShellTypeChanged() { return this._register(this.createOnInstanceEvent(e => Event.map(e.onDidChangeShellType, () => e))).event; }
    get onAnyInstanceAddedCapabilityType() { return this._register(this.createOnInstanceEvent(e => Event.map(e.capabilities.onDidAddCapability, e => e.id))).event; }
    constructor(_contextKeyService, _lifecycleService, _logService, _dialogService, _instantiationService, _remoteAgentService, _configurationService, _environmentService, _terminalConfigurationService, _terminalEditorService, _terminalGroupService, _terminalInstanceService, _editorGroupsService, _terminalProfileService, _extensionService, _notificationService, _workspaceContextService, _commandService, _keybindingService, _timerService) {
        super();
        this._contextKeyService = _contextKeyService;
        this._lifecycleService = _lifecycleService;
        this._logService = _logService;
        this._dialogService = _dialogService;
        this._instantiationService = _instantiationService;
        this._remoteAgentService = _remoteAgentService;
        this._configurationService = _configurationService;
        this._environmentService = _environmentService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._terminalEditorService = _terminalEditorService;
        this._terminalGroupService = _terminalGroupService;
        this._terminalInstanceService = _terminalInstanceService;
        this._editorGroupsService = _editorGroupsService;
        this._terminalProfileService = _terminalProfileService;
        this._extensionService = _extensionService;
        this._notificationService = _notificationService;
        this._workspaceContextService = _workspaceContextService;
        this._commandService = _commandService;
        this._keybindingService = _keybindingService;
        this._timerService = _timerService;
        this._hostActiveTerminals = new Map();
        this._detachedXterms = new Set();
        this._isShuttingDown = false;
        this._backgroundedTerminalInstances = [];
        this._backgroundedTerminalDisposables = new Map();
        this._connectionState = 0 /* TerminalConnectionState.Connecting */;
        this._whenConnected = new DeferredPromise();
        this._restoredGroupCount = 0;
        this._reconnectedTerminals = new Map();
        this._onDidCreateInstance = this._register(new Emitter());
        this._onDidChangeInstanceDimensions = this._register(new Emitter());
        this._onDidRegisterProcessSupport = this._register(new Emitter());
        this._onDidChangeConnectionState = this._register(new Emitter());
        this._onDidRequestStartExtensionTerminal = this._register(new Emitter());
        // ITerminalInstanceHost events
        this._onDidDisposeInstance = this._register(new Emitter());
        this._onDidFocusInstance = this._register(new Emitter());
        this._onDidChangeActiveInstance = this._register(new Emitter());
        this._onDidChangeInstances = this._register(new Emitter());
        this._onDidChangeInstanceCapability = this._register(new Emitter());
        // Terminal view events
        this._onDidChangeActiveGroup = this._register(new Emitter());
        // the below avoids having to poll routinely.
        // we update detected profiles when an instance is created so that,
        // for example, we detect if you've installed a pwsh
        this._register(this.onDidCreateInstance(() => this._terminalProfileService.refreshAvailableProfiles()));
        this._forwardInstanceHostEvents(this._terminalGroupService);
        this._forwardInstanceHostEvents(this._terminalEditorService);
        this._register(this._terminalGroupService.onDidChangeActiveGroup(this._onDidChangeActiveGroup.fire, this._onDidChangeActiveGroup));
        this._register(this._terminalInstanceService.onDidCreateInstance(instance => {
            this._initInstanceListeners(instance);
            this._onDidCreateInstance.fire(instance);
        }));
        // Hide the panel if there are no more instances, provided that VS Code is not shutting
        // down. When shutting down the panel is locked in place so that it is restored upon next
        // launch.
        this._register(this._terminalGroupService.onDidChangeActiveInstance(instance => {
            if (!instance && !this._isShuttingDown && this._terminalConfigurationService.config.hideOnLastClosed) {
                this._terminalGroupService.hidePanel();
            }
            if (instance?.shellType) {
                this._terminalShellTypeContextKey.set(instance.shellType.toString());
            }
            else if (!instance || !(instance.shellType)) {
                this._terminalShellTypeContextKey.reset();
            }
        }));
        this._handleInstanceContextKeys();
        this._terminalShellTypeContextKey = TerminalContextKeys.shellType.bindTo(this._contextKeyService);
        this._processSupportContextKey = TerminalContextKeys.processSupported.bindTo(this._contextKeyService);
        this._processSupportContextKey.set(!isWeb || this._remoteAgentService.getConnection() !== null);
        this._terminalHasBeenCreated = TerminalContextKeys.terminalHasBeenCreated.bindTo(this._contextKeyService);
        this._terminalCountContextKey = TerminalContextKeys.count.bindTo(this._contextKeyService);
        this._terminalEditorActive = TerminalContextKeys.terminalEditorActive.bindTo(this._contextKeyService);
        this._register(this.onDidChangeActiveInstance(instance => {
            this._terminalEditorActive.set(!!instance?.target && instance.target === TerminalLocation.Editor);
        }));
        this._register(_lifecycleService.onBeforeShutdown(async (e) => e.veto(this._onBeforeShutdown(e.reason), 'veto.terminal')));
        this._register(_lifecycleService.onWillShutdown(e => this._onWillShutdown(e)));
        this._initializePrimaryBackend();
        // Create async as the class depends on `this`
        timeout(0).then(() => this._register(this._instantiationService.createInstance(TerminalEditorStyle, mainWindow.document.head)));
    }
    async showProfileQuickPick(type, cwd) {
        const quickPick = this._instantiationService.createInstance(TerminalProfileQuickpick);
        const result = await quickPick.showAndGetResult(type);
        if (!result) {
            return;
        }
        if (isString(result)) {
            return;
        }
        const keyMods = result.keyMods;
        if (type === 'createInstance') {
            const activeInstance = this.getDefaultInstanceHost().activeInstance;
            const defaultLocation = this._terminalConfigurationService.defaultLocation;
            let instance;
            if (result.config && hasKey(result.config, { id: true })) {
                await this.createContributedTerminalProfile(result.config.extensionIdentifier, result.config.id, {
                    icon: result.config.options?.icon,
                    color: result.config.options?.color,
                    location: !!(keyMods?.alt && activeInstance) ? { splitActiveTerminal: true } : defaultLocation
                });
                return;
            }
            else if (result.config && hasKey(result.config, { profileName: true })) {
                if (keyMods?.alt && activeInstance) {
                    // create split, only valid if there's an active instance
                    instance = await this.createTerminal({ location: { parentTerminal: activeInstance }, config: result.config, cwd });
                }
                else {
                    instance = await this.createTerminal({ location: defaultLocation, config: result.config, cwd });
                }
            }
            if (instance && defaultLocation !== TerminalLocation.Editor) {
                this._terminalGroupService.showPanel(true);
                this.setActiveInstance(instance);
                return instance;
            }
        }
        return undefined;
    }
    async _initializePrimaryBackend() {
        mark('code/terminal/willGetTerminalBackend');
        this._primaryBackend = await this._terminalInstanceService.getBackend(this._environmentService.remoteAuthority);
        mark('code/terminal/didGetTerminalBackend');
        const enableTerminalReconnection = this._terminalConfigurationService.config.enablePersistentSessions;
        // Connect to the extension host if it's there, set the connection state to connected when
        // it's done. This should happen even when there is no extension host.
        this._connectionState = 0 /* TerminalConnectionState.Connecting */;
        const isPersistentRemote = !!this._environmentService.remoteAuthority && enableTerminalReconnection;
        if (this._primaryBackend) {
            this._register(this._primaryBackend.onDidRequestDetach(async (e) => {
                const instanceToDetach = this.getInstanceFromResource(getTerminalUri(e.workspaceId, e.instanceId));
                if (instanceToDetach) {
                    const persistentProcessId = instanceToDetach?.persistentProcessId;
                    if (persistentProcessId && !instanceToDetach.shellLaunchConfig.isFeatureTerminal && !instanceToDetach.shellLaunchConfig.customPtyImplementation) {
                        if (instanceToDetach.target === TerminalLocation.Editor) {
                            this._terminalEditorService.detachInstance(instanceToDetach);
                        }
                        else {
                            this._terminalGroupService.getGroupForInstance(instanceToDetach)?.removeInstance(instanceToDetach);
                        }
                        await instanceToDetach.detachProcessAndDispose(TerminalExitReason.User);
                        await this._primaryBackend?.acceptDetachInstanceReply(e.requestId, persistentProcessId);
                    }
                    else {
                        // will get rejected without a persistentProcessId to attach to
                        await this._primaryBackend?.acceptDetachInstanceReply(e.requestId, undefined);
                    }
                }
            }));
        }
        mark('code/terminal/willReconnect');
        let reconnectedPromise;
        if (isPersistentRemote) {
            reconnectedPromise = this._reconnectToRemoteTerminals();
        }
        else if (enableTerminalReconnection) {
            reconnectedPromise = this._reconnectToLocalTerminals();
        }
        else {
            reconnectedPromise = Promise.resolve();
        }
        reconnectedPromise.then(async () => {
            this._setConnected();
            mark('code/terminal/didReconnect');
            mark('code/terminal/willReplay');
            const instances = await this._reconnectedTerminalGroups?.then(groups => groups.map(e => e.terminalInstances).flat()) ?? [];
            await Promise.all(instances.map(e => new Promise(r => Event.once(e.onProcessReplayComplete)(r))));
            mark('code/terminal/didReplay');
            mark('code/terminal/willGetPerformanceMarks');
            await Promise.all(Array.from(this._terminalInstanceService.getRegisteredBackends()).map(async (backend) => {
                this._timerService.setPerformanceMarks(backend.remoteAuthority === undefined ? 'localPtyHost' : 'remotePtyHost', await backend.getPerformanceMarks());
                backend.setReady();
            }));
            mark('code/terminal/didGetPerformanceMarks');
            this._whenConnected.complete();
        });
    }
    getPrimaryBackend() {
        return this._primaryBackend;
    }
    async setNextCommandId(id, commandLine, commandId) {
        if (!this._primaryBackend || id <= 0) {
            return;
        }
        await this._primaryBackend.setNextCommandId(id, commandLine, commandId);
    }
    _forwardInstanceHostEvents(host) {
        this._register(host.onDidChangeInstances(this._onDidChangeInstances.fire, this._onDidChangeInstances));
        this._register(host.onDidDisposeInstance(this._onDidDisposeInstance.fire, this._onDidDisposeInstance));
        this._register(host.onDidChangeActiveInstance(instance => this._evaluateActiveInstance(host, instance)));
        this._register(host.onDidFocusInstance(instance => {
            this._onDidFocusInstance.fire(instance);
            this._evaluateActiveInstance(host, instance);
        }));
        this._register(host.onDidChangeInstanceCapability((instance) => {
            this._onDidChangeInstanceCapability.fire(instance);
        }));
        this._hostActiveTerminals.set(host, undefined);
    }
    _evaluateActiveInstance(host, instance) {
        // Track the latest active terminal for each host so that when one becomes undefined, the
        // TerminalService's active terminal is set to the last active terminal from the other host.
        // This means if the last terminal editor is closed such that it becomes undefined, the last
        // active group's terminal will be used as the active terminal if available.
        this._hostActiveTerminals.set(host, instance);
        if (instance === undefined) {
            for (const active of this._hostActiveTerminals.values()) {
                if (active) {
                    instance = active;
                }
            }
        }
        this._activeInstance = instance;
        this._onDidChangeActiveInstance.fire(instance);
    }
    setActiveInstance(value) {
        // TODO@meganrogge: Is this the right logic for when instance is undefined?
        if (!value) {
            return;
        }
        // If this was a hideFromUser terminal created by the API this was triggered by show,
        // in which case we need to create the terminal group
        if (value.shellLaunchConfig.hideFromUser) {
            this.showBackgroundTerminal(value);
        }
        if (value.target === TerminalLocation.Editor) {
            this._terminalEditorService.setActiveInstance(value);
        }
        else {
            this._terminalGroupService.setActiveInstance(value);
        }
    }
    async focusInstance(instance) {
        if (instance.target === TerminalLocation.Editor) {
            return this._terminalEditorService.focusInstance(instance);
        }
        return this._terminalGroupService.focusInstance(instance);
    }
    async focusActiveInstance() {
        if (!this._activeInstance) {
            return;
        }
        return this.focusInstance(this._activeInstance);
    }
    async createContributedTerminalProfile(extensionIdentifier, id, options) {
        await this._extensionService.activateByEvent(`onTerminalProfile:${id}`);
        const profileProvider = this._terminalProfileService.getContributedProfileProvider(extensionIdentifier, id);
        if (!profileProvider) {
            this._notificationService.error(`No terminal profile provider registered for id "${id}"`);
            return;
        }
        try {
            await profileProvider.createContributedTerminalProfile(options);
            this._terminalGroupService.setActiveInstanceByIndex(this._terminalGroupService.instances.length - 1);
            await this._terminalGroupService.activeInstance?.focusWhenReady();
        }
        catch (e) {
            this._notificationService.error(e.message);
        }
    }
    async safeDisposeTerminal(instance) {
        // Confirm on kill in the editor is handled by the editor input
        if (instance.target !== TerminalLocation.Editor &&
            instance.hasChildProcesses &&
            (this._terminalConfigurationService.config.confirmOnKill === 'panel' || this._terminalConfigurationService.config.confirmOnKill === 'always')) {
            const veto = await this._showTerminalCloseConfirmation(true);
            if (veto) {
                return;
            }
        }
        return new Promise(r => {
            Event.once(instance.onExit)(() => r());
            instance.dispose(TerminalExitReason.User);
        });
    }
    _setConnected() {
        this._connectionState = 1 /* TerminalConnectionState.Connected */;
        this._onDidChangeConnectionState.fire();
        this._logService.trace('Pty host ready');
    }
    async _reconnectToRemoteTerminals() {
        const remoteAuthority = this._environmentService.remoteAuthority;
        if (!remoteAuthority) {
            return;
        }
        const backend = await this._terminalInstanceService.getBackend(remoteAuthority);
        if (!backend) {
            return;
        }
        mark('code/terminal/willGetTerminalLayoutInfo');
        const layoutInfo = await backend.getTerminalLayoutInfo();
        mark('code/terminal/didGetTerminalLayoutInfo');
        backend.reduceConnectionGraceTime();
        mark('code/terminal/willRecreateTerminalGroups');
        await this._recreateTerminalGroups(layoutInfo);
        mark('code/terminal/didRecreateTerminalGroups');
        // now that terminals have been restored,
        // attach listeners to update remote when terminals are changed
        this._attachProcessLayoutListeners();
        this._logService.trace('Reconnected to remote terminals');
    }
    async _reconnectToLocalTerminals() {
        const localBackend = await this._terminalInstanceService.getBackend();
        if (!localBackend) {
            return;
        }
        mark('code/terminal/willGetTerminalLayoutInfo');
        const layoutInfo = await localBackend.getTerminalLayoutInfo();
        mark('code/terminal/didGetTerminalLayoutInfo');
        if (layoutInfo && (layoutInfo.tabs.length > 0 || layoutInfo?.background?.length)) {
            mark('code/terminal/willRecreateTerminalGroups');
            this._reconnectedTerminalGroups = this._recreateTerminalGroups(layoutInfo);
            const revivedInstances = await this._reviveBackgroundTerminalInstances(layoutInfo.background || []);
            this._backgroundedTerminalInstances = revivedInstances.map(instance => ({ instance }));
            mark('code/terminal/didRecreateTerminalGroups');
        }
        // now that terminals have been restored,
        // attach listeners to update local state when terminals are changed
        this._attachProcessLayoutListeners();
        this._logService.trace('Reconnected to local terminals');
    }
    _recreateTerminalGroups(layoutInfo) {
        const groupPromises = [];
        let activeGroup;
        if (layoutInfo) {
            for (const tabLayout of layoutInfo.tabs) {
                const terminalLayouts = tabLayout.terminals.filter(t => t.terminal && t.terminal.isOrphan);
                if (terminalLayouts.length) {
                    this._restoredGroupCount += terminalLayouts.length;
                    const promise = this._recreateTerminalGroup(tabLayout, terminalLayouts);
                    groupPromises.push(promise);
                    if (tabLayout.isActive) {
                        activeGroup = promise;
                    }
                    const activeInstance = this.instances.find(t => t.shellLaunchConfig.attachPersistentProcess?.id === tabLayout.activePersistentProcessId);
                    if (activeInstance) {
                        this.setActiveInstance(activeInstance);
                    }
                }
            }
            if (layoutInfo.tabs.length) {
                activeGroup?.then(group => this._terminalGroupService.activeGroup = group);
            }
        }
        return Promise.all(groupPromises).then(result => result.filter(e => !!e));
    }
    async _reviveBackgroundTerminalInstances(bgTerminals) {
        const instances = [];
        for (const bg of bgTerminals) {
            const attachPersistentProcess = bg;
            if (!attachPersistentProcess) {
                continue;
            }
            const instance = await this.createTerminal({ config: { attachPersistentProcess, hideFromUser: true, forcePersist: true }, location: TerminalLocation.Panel });
            instances.push(instance);
        }
        return instances;
    }
    async _recreateTerminalGroup(tabLayout, terminalLayouts) {
        let lastInstance;
        for (const terminalLayout of terminalLayouts) {
            const attachPersistentProcess = terminalLayout.terminal;
            if (this._lifecycleService.startupKind !== 3 /* StartupKind.ReloadedWindow */ && attachPersistentProcess.type === 'Task') {
                continue;
            }
            mark(`code/terminal/willRecreateTerminal/${attachPersistentProcess.id}-${attachPersistentProcess.pid}`);
            lastInstance = this.createTerminal({
                config: { attachPersistentProcess },
                location: lastInstance ? { parentTerminal: lastInstance } : TerminalLocation.Panel
            });
            lastInstance.then(() => mark(`code/terminal/didRecreateTerminal/${attachPersistentProcess.id}-${attachPersistentProcess.pid}`));
        }
        const group = lastInstance?.then(instance => {
            const g = this._terminalGroupService.getGroupForInstance(instance);
            g?.resizePanes(tabLayout.terminals.map(terminal => terminal.relativeSize));
            return g;
        });
        return group;
    }
    _attachProcessLayoutListeners() {
        this._register(this.onDidChangeActiveGroup(() => this._saveState()));
        this._register(this.onDidChangeActiveInstance(() => this._saveState()));
        this._register(this.onDidChangeInstances(() => this._saveState()));
        // The state must be updated when the terminal is relaunched, otherwise the persistent
        // terminal ID will be stale and the process will be leaked.
        this._register(this.onAnyInstanceProcessIdReady(() => this._saveState()));
        this._register(this.onAnyInstanceTitleChange(instance => this._updateTitle(instance)));
        this._register(this.onAnyInstanceIconChange(e => this._updateIcon(e.instance, e.userInitiated)));
    }
    _handleInstanceContextKeys() {
        const terminalIsOpenContext = TerminalContextKeys.isOpen.bindTo(this._contextKeyService);
        const updateTerminalContextKeys = () => {
            terminalIsOpenContext.set(this.instances.length > 0);
            this._terminalCountContextKey.set(this.instances.length);
        };
        this._register(this.onDidChangeInstances(() => updateTerminalContextKeys()));
    }
    async getActiveOrCreateInstance(options) {
        const activeInstance = this.activeInstance;
        // No instance, create
        if (!activeInstance) {
            return this.createTerminal();
        }
        // Active instance, ensure accepts input
        if (!options?.acceptsInput || activeInstance.xterm?.isStdinDisabled !== true) {
            return activeInstance;
        }
        // Active instance doesn't accept input, create and focus
        const instance = await this.createTerminal();
        this.setActiveInstance(instance);
        await this.revealActiveTerminal();
        return instance;
    }
    async revealTerminal(source, preserveFocus) {
        if (source.target === TerminalLocation.Editor) {
            await this._terminalEditorService.revealActiveEditor(preserveFocus);
        }
        else {
            await this._terminalGroupService.showPanel();
        }
    }
    async revealActiveTerminal(preserveFocus) {
        const instance = this.activeInstance;
        if (!instance) {
            return;
        }
        await this.revealTerminal(instance, preserveFocus);
    }
    requestStartExtensionTerminal(proxy, cols, rows) {
        // The initial request came from the extension host, no need to wait for it
        return new Promise(callback => {
            this._onDidRequestStartExtensionTerminal.fire({ proxy, cols, rows, callback });
        });
    }
    _onBeforeShutdown(reason) {
        // Never veto on web as this would block all windows from being closed. This disables
        // process revive as we can't handle it on shutdown.
        if (isWeb) {
            this._isShuttingDown = true;
            return false;
        }
        return this._onBeforeShutdownAsync(reason);
    }
    async _onBeforeShutdownAsync(reason) {
        if (this.instances.length === 0) {
            // No terminal instances, don't veto
            return false;
        }
        // Persist terminal _buffer state_, note that even if this happens the dirty terminal prompt
        // still shows as that cannot be revived
        try {
            this._shutdownWindowCount = await this._nativeDelegate?.getWindowCount();
            const shouldReviveProcesses = this._shouldReviveProcesses(reason);
            if (shouldReviveProcesses) {
                // Attempt to persist the terminal state but only allow 2000ms as we can't block
                // shutdown. This can happen when in a remote workspace but the other side has been
                // suspended and is in the process of reconnecting, the message will be put in a
                // queue in this case for when the connection is back up and running. Aborting the
                // process is preferable in this case.
                await Promise.race([
                    this._primaryBackend?.persistTerminalState(),
                    timeout(2000)
                ]);
            }
            // Persist terminal _processes_
            const shouldPersistProcesses = this._terminalConfigurationService.config.enablePersistentSessions && reason === 3 /* ShutdownReason.RELOAD */;
            if (!shouldPersistProcesses) {
                const hasDirtyInstances = ((this._terminalConfigurationService.config.confirmOnExit === 'always' && this.foregroundInstances.length > 0) ||
                    (this._terminalConfigurationService.config.confirmOnExit === 'hasChildProcesses' && this.foregroundInstances.some(e => e.hasChildProcesses)));
                if (hasDirtyInstances) {
                    return this._onBeforeShutdownConfirmation(reason);
                }
            }
        }
        catch (err) {
            // Swallow as exceptions should not cause a veto to prevent shutdown
            this._logService.warn('Exception occurred during terminal shutdown', err);
        }
        this._isShuttingDown = true;
        return false;
    }
    setNativeDelegate(nativeDelegate) {
        this._nativeDelegate = nativeDelegate;
    }
    _shouldReviveProcesses(reason) {
        if (!this._terminalConfigurationService.config.enablePersistentSessions) {
            return false;
        }
        switch (this._terminalConfigurationService.config.persistentSessionReviveProcess) {
            case 'onExit': {
                // Allow on close if it's the last window on Windows or Linux
                if (reason === 1 /* ShutdownReason.CLOSE */ && (this._shutdownWindowCount === 1 && !isMacintosh)) {
                    return true;
                }
                return reason === 4 /* ShutdownReason.LOAD */ || reason === 2 /* ShutdownReason.QUIT */;
            }
            case 'onExitAndWindowClose': return reason !== 3 /* ShutdownReason.RELOAD */;
            default: return false;
        }
    }
    async _onBeforeShutdownConfirmation(reason) {
        // veto if configured to show confirmation and the user chose not to exit
        const veto = await this._showTerminalCloseConfirmation();
        if (!veto) {
            this._isShuttingDown = true;
        }
        return veto;
    }
    _onWillShutdown(e) {
        // Don't touch processes if the shutdown was a result of reload as they will be reattached
        const shouldPersistTerminals = this._terminalConfigurationService.config.enablePersistentSessions && e.reason === 3 /* ShutdownReason.RELOAD */;
        for (const instance of [...this._terminalGroupService.instances, ...this._backgroundedTerminalInstances.map(bg => bg.instance)]) {
            if (shouldPersistTerminals && instance.shouldPersist) {
                instance.detachProcessAndDispose(TerminalExitReason.Shutdown);
            }
            else {
                instance.dispose(TerminalExitReason.Shutdown);
            }
        }
        // Clear terminal layout info only when not persisting
        if (!shouldPersistTerminals && !this._shouldReviveProcesses(e.reason)) {
            this._primaryBackend?.setTerminalLayoutInfo(undefined);
        }
    }
    _saveState() {
        // Avoid saving state when shutting down as that would override process state to be revived
        if (this._isShuttingDown) {
            return;
        }
        if (!this._terminalConfigurationService.config.enablePersistentSessions) {
            return;
        }
        const tabs = this._terminalGroupService.groups.map(g => g.getLayoutInfo(g === this._terminalGroupService.activeGroup));
        const state = { tabs, background: this._backgroundedTerminalInstances.map(bg => bg.instance).filter(i => i.shellLaunchConfig.forcePersist).map(i => i.persistentProcessId).filter((e) => e !== undefined) };
        this._primaryBackend?.setTerminalLayoutInfo(state);
    }
    _updateTitle(instance) {
        if (!this._terminalConfigurationService.config.enablePersistentSessions || !instance || !instance.persistentProcessId || !instance.title || instance.isDisposed) {
            return;
        }
        if (instance.staticTitle) {
            this._primaryBackend?.updateTitle(instance.persistentProcessId, instance.staticTitle, TitleEventSource.Api);
        }
        else {
            this._primaryBackend?.updateTitle(instance.persistentProcessId, instance.title, instance.titleSource);
        }
    }
    _updateIcon(instance, userInitiated) {
        if (!this._terminalConfigurationService.config.enablePersistentSessions || !instance || !instance.persistentProcessId || !instance.icon || instance.isDisposed) {
            return;
        }
        this._primaryBackend?.updateIcon(instance.persistentProcessId, userInitiated, instance.icon, instance.color);
    }
    refreshActiveGroup() {
        this._onDidChangeActiveGroup.fire(this._terminalGroupService.activeGroup);
    }
    getInstanceFromId(terminalId) {
        let bgIndex = -1;
        this._backgroundedTerminalInstances.forEach((bg, i) => {
            if (bg.instance.instanceId === terminalId) {
                bgIndex = i;
            }
        });
        if (bgIndex !== -1) {
            return this._backgroundedTerminalInstances[bgIndex].instance;
        }
        try {
            return this.instances[this._getIndexFromId(terminalId)];
        }
        catch {
            return undefined;
        }
    }
    getInstanceFromResource(resource) {
        return getInstanceFromResource(this.instances, resource);
    }
    openResource(resource) {
        const instance = this.getInstanceFromResource(resource);
        if (instance) {
            this.setActiveInstance(instance);
            this.revealTerminal(instance);
            const commands = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.commands;
            const params = new URLSearchParams(resource.query);
            const relevantCommand = commands?.find(c => c.id === params.get('command'));
            if (relevantCommand) {
                instance.xterm?.markTracker.revealCommand(relevantCommand);
            }
        }
    }
    isAttachedToTerminal(remoteTerm) {
        return this.instances.some(term => term.processId === remoteTerm.pid);
    }
    moveToEditor(source, group) {
        if (source.target === TerminalLocation.Editor) {
            return;
        }
        const sourceGroup = this._terminalGroupService.getGroupForInstance(source);
        if (!sourceGroup) {
            return;
        }
        sourceGroup.removeInstance(source);
        this._terminalEditorService.openEditor(source, group ? { viewColumn: group } : undefined);
    }
    moveIntoNewEditor(source) {
        this.moveToEditor(source, AUX_WINDOW_GROUP);
    }
    async moveToTerminalView(source, target, side) {
        if (URI.isUri(source)) {
            source = this.getInstanceFromResource(source);
        }
        if (!source) {
            return;
        }
        this._terminalEditorService.detachInstance(source);
        if (source.target !== TerminalLocation.Editor) {
            await this._terminalGroupService.showPanel(true);
            return;
        }
        source.target = TerminalLocation.Panel;
        let group;
        if (target) {
            group = this._terminalGroupService.getGroupForInstance(target);
        }
        if (!group) {
            group = this._terminalGroupService.createGroup();
        }
        group.addInstance(source);
        this.setActiveInstance(source);
        await this._terminalGroupService.showPanel(true);
        if (target && side) {
            const index = group.terminalInstances.indexOf(target) + (side === 'after' ? 1 : 0);
            group.moveInstance(source, index, side);
        }
        // Fire events
        this._onDidChangeInstances.fire();
        this._onDidChangeActiveGroup.fire(this._terminalGroupService.activeGroup);
    }
    _initInstanceListeners(instance) {
        const instanceDisposables = new DisposableStore();
        instanceDisposables.add(instance.onDimensionsChanged(() => {
            this._onDidChangeInstanceDimensions.fire(instance);
            if (this._terminalConfigurationService.config.enablePersistentSessions && this.isProcessSupportRegistered) {
                this._saveState();
            }
        }));
        instanceDisposables.add(instance.onDidFocus(this._onDidChangeActiveInstance.fire, this._onDidChangeActiveInstance));
        instanceDisposables.add(instance.onRequestAddInstanceToGroup(async (e) => await this._addInstanceToGroup(instance, e)));
        instanceDisposables.add(instance.onDidChangeShellType(() => this._extensionService.activateByEvent(`onTerminal:${instance.shellType}`)));
        instanceDisposables.add(Event.runAndSubscribe(instance.capabilities.onDidAddCapability, (() => {
            if (instance.capabilities.has(2 /* TerminalCapability.CommandDetection */)) {
                this._extensionService.activateByEvent(`onTerminalShellIntegration:${instance.shellType}`);
            }
        })));
        const disposeListener = this._register(instance.onDisposed(() => {
            instanceDisposables.dispose();
            this._store.delete(disposeListener);
        }));
    }
    async _addInstanceToGroup(instance, e) {
        const terminalIdentifier = parseTerminalUri(e.uri);
        if (terminalIdentifier.instanceId === undefined) {
            return;
        }
        let sourceInstance = this.getInstanceFromResource(e.uri);
        // Terminal from a different window
        if (!sourceInstance) {
            const attachPersistentProcess = await this._primaryBackend?.requestDetachInstance(terminalIdentifier.workspaceId, terminalIdentifier.instanceId);
            if (attachPersistentProcess) {
                sourceInstance = await this.createTerminal({ config: { attachPersistentProcess }, resource: e.uri });
                this._terminalGroupService.moveInstance(sourceInstance, instance, e.side);
                return;
            }
        }
        // View terminals
        sourceInstance = this._terminalGroupService.getInstanceFromResource(e.uri);
        if (sourceInstance) {
            this._terminalGroupService.moveInstance(sourceInstance, instance, e.side);
            return;
        }
        // Terminal editors
        sourceInstance = this._terminalEditorService.getInstanceFromResource(e.uri);
        if (sourceInstance) {
            this.moveToTerminalView(sourceInstance, instance, e.side);
            return;
        }
        return;
    }
    registerProcessSupport(isSupported) {
        if (!isSupported) {
            return;
        }
        this._processSupportContextKey.set(isSupported);
        this._onDidRegisterProcessSupport.fire();
    }
    // TODO: Remove this, it should live in group/editor servioce
    _getIndexFromId(terminalId) {
        let terminalIndex = -1;
        this.instances.forEach((terminalInstance, i) => {
            if (terminalInstance.instanceId === terminalId) {
                terminalIndex = i;
            }
        });
        if (terminalIndex === -1) {
            throw new Error(`Terminal with ID ${terminalId} does not exist (has it already been disposed?)`);
        }
        return terminalIndex;
    }
    async _showTerminalCloseConfirmation(singleTerminal) {
        let message;
        const foregroundInstances = this.foregroundInstances;
        if (foregroundInstances.length === 1 || singleTerminal) {
            message = nls.localize('terminalService.terminalCloseConfirmationSingular', "Do you want to terminate the active terminal session?");
        }
        else {
            message = nls.localize('terminalService.terminalCloseConfirmationPlural', "Do you want to terminate the {0} active terminal sessions?", foregroundInstances.length);
        }
        const { confirmed } = await this._dialogService.confirm({
            type: 'warning',
            message,
            primaryButton: nls.localize({ key: 'terminate', comment: ['&& denotes a mnemonic'] }, "&&Terminate")
        });
        return !confirmed;
    }
    getDefaultInstanceHost() {
        if (this._terminalConfigurationService.defaultLocation === TerminalLocation.Editor) {
            return this._terminalEditorService;
        }
        return this._terminalGroupService;
    }
    async getInstanceHost(location) {
        if (location) {
            if (location === TerminalLocation.Editor) {
                return this._terminalEditorService;
            }
            else if (typeof location === 'object') {
                if (hasKey(location, { viewColumn: true })) {
                    return this._terminalEditorService;
                }
                else if (hasKey(location, { parentTerminal: true })) {
                    return (await location.parentTerminal).target === TerminalLocation.Editor ? this._terminalEditorService : this._terminalGroupService;
                }
            }
            else {
                return this._terminalGroupService;
            }
        }
        return this;
    }
    async createTerminal(options) {
        // Await the initialization of available profiles as long as this is not a pty terminal or a
        // local terminal in a remote workspace as profile won't be used in those cases and these
        // terminals need to be launched before remote connections are established.
        const isLocalInRemoteTerminal = this._remoteAgentService.getConnection() && URI.isUri(options?.cwd) && options?.cwd.scheme === Schemas.file;
        if (this._terminalProfileService.availableProfiles.length === 0) {
            const isPtyTerminal = options?.config && hasKey(options.config, { customPtyImplementation: true });
            if (!isPtyTerminal && !isLocalInRemoteTerminal) {
                if (this._connectionState === 0 /* TerminalConnectionState.Connecting */) {
                    mark(`code/terminal/willGetProfiles`);
                }
                await this._terminalProfileService.profilesReady;
                if (this._connectionState === 0 /* TerminalConnectionState.Connecting */) {
                    mark(`code/terminal/didGetProfiles`);
                }
            }
        }
        let config = options?.config;
        if (!config && isLocalInRemoteTerminal) {
            const backend = await this._terminalInstanceService.getBackend(undefined);
            const executable = await backend?.getDefaultSystemShell();
            if (executable) {
                config = { executable };
            }
        }
        if (!config) {
            config = this._terminalProfileService.getDefaultProfile();
        }
        const shellLaunchConfig = config && hasKey(config, { extensionIdentifier: true }) ? {} : this._terminalInstanceService.convertProfileToShellLaunchConfig(config || {});
        // Get the contributed profile if it was provided
        const contributedProfile = options?.skipContributedProfileCheck ? undefined : await this._getContributedProfile(shellLaunchConfig, options);
        const splitActiveTerminal = typeof options?.location === 'object' && hasKey(options.location, { splitActiveTerminal: true })
            ? options.location.splitActiveTerminal
            : typeof options?.location === 'object' ? hasKey(options.location, { parentTerminal: true }) : false;
        await this._resolveCwd(shellLaunchConfig, splitActiveTerminal, options);
        // Launch the contributed profile
        // If it's a custom pty implementation, we did not await the profiles ready, so
        // we cannot launch the contributed profile and doing so would cause an error
        if (!shellLaunchConfig.customPtyImplementation && contributedProfile) {
            const resolvedLocation = await this.resolveLocation(options?.location);
            let location;
            if (splitActiveTerminal) {
                location = resolvedLocation === TerminalLocation.Editor ? { viewColumn: SIDE_GROUP } : { splitActiveTerminal: true };
            }
            else {
                location = typeof options?.location === 'object' && hasKey(options.location, { viewColumn: true }) ? options.location : resolvedLocation;
            }
            await this.createContributedTerminalProfile(contributedProfile.extensionIdentifier, contributedProfile.id, {
                icon: contributedProfile.icon,
                color: contributedProfile.color,
                location,
                cwd: shellLaunchConfig.cwd,
            });
            const instanceHost = resolvedLocation === TerminalLocation.Editor ? this._terminalEditorService : this._terminalGroupService;
            // TODO@meganrogge: This returns undefined in the remote & web smoke tests but the function
            // does not return undefined. This should be handled correctly.
            const instance = instanceHost.instances[instanceHost.instances.length - 1];
            await instance?.focusWhenReady();
            this._terminalHasBeenCreated.set(true);
            return instance;
        }
        if (!shellLaunchConfig.customPtyImplementation && !this.isProcessSupportRegistered) {
            throw new Error('Could not create terminal when process support is not registered');
        }
        this._evaluateLocalCwd(shellLaunchConfig);
        const location = await this.resolveLocation(options?.location) || this._terminalConfigurationService.defaultLocation;
        if (shellLaunchConfig.hideFromUser) {
            const instance = this._terminalInstanceService.createInstance(shellLaunchConfig, location);
            this._backgroundedTerminalInstances.push({ instance, terminalLocationOptions: options?.location });
            this._backgroundedTerminalDisposables.set(instance.instanceId, [
                instance.onDisposed(instance => {
                    const idx = this._backgroundedTerminalInstances.findIndex(bg => bg.instance === instance);
                    if (idx !== -1) {
                        this._backgroundedTerminalInstances.splice(idx, 1);
                    }
                    this._onDidDisposeInstance.fire(instance);
                })
            ]);
            this._onDidChangeInstances.fire();
            return instance;
        }
        const parent = await this._getSplitParent(options?.location);
        this._terminalHasBeenCreated.set(true);
        this._extensionService.activateByEvent('onTerminal:*');
        let instance;
        if (parent) {
            instance = this._splitTerminal(shellLaunchConfig, location, parent);
        }
        else {
            instance = this._createTerminal(shellLaunchConfig, location, options);
        }
        if (instance.shellType) {
            this._extensionService.activateByEvent(`onTerminal:${instance.shellType}`);
        }
        return instance;
    }
    async createAndFocusTerminal(options) {
        const instance = await this.createTerminal(options);
        this.setActiveInstance(instance);
        await instance.focusWhenReady();
        return instance;
    }
    async _getContributedProfile(shellLaunchConfig, options) {
        if (options?.config && hasKey(options.config, { extensionIdentifier: true })) {
            return options.config;
        }
        return this._terminalProfileService.getContributedDefaultProfile(shellLaunchConfig);
    }
    async createDetachedTerminal(options) {
        const ctor = await TerminalInstance.getXtermConstructor(this._keybindingService, this._contextKeyService);
        const xterm = this._instantiationService.createInstance(XtermTerminal, undefined, ctor, {
            cols: options.cols,
            rows: options.rows,
            xtermColorProvider: options.colorProvider,
            capabilities: options.capabilities || new TerminalCapabilityStore(),
        }, undefined);
        if (options.readonly) {
            xterm.raw.attachCustomKeyEventHandler(() => false);
        }
        const instance = new DetachedTerminal(xterm, options, this._instantiationService);
        this._detachedXterms.add(instance);
        const l = xterm.onDidDispose(() => {
            this._detachedXterms.delete(instance);
            l.dispose();
        });
        return instance;
    }
    async _resolveCwd(shellLaunchConfig, splitActiveTerminal, options) {
        const cwd = shellLaunchConfig.cwd;
        if (!cwd) {
            if (options?.cwd) {
                shellLaunchConfig.cwd = options.cwd;
            }
            else if (splitActiveTerminal && options?.location) {
                let parent = this.activeInstance;
                if (typeof options.location === 'object' && hasKey(options.location, { parentTerminal: true })) {
                    parent = await options.location.parentTerminal;
                }
                if (!parent) {
                    throw new Error('Cannot split without an active instance');
                }
                shellLaunchConfig.cwd = await getCwdForSplit(parent, this._workspaceContextService.getWorkspace().folders, this._commandService, this._terminalConfigurationService);
            }
        }
    }
    _splitTerminal(shellLaunchConfig, location, parent) {
        let instance;
        // Use the URI from the base instance if it exists, this will correctly split local terminals
        if (typeof shellLaunchConfig.cwd !== 'object' && typeof parent.shellLaunchConfig.cwd === 'object') {
            shellLaunchConfig.cwd = URI.from({
                scheme: parent.shellLaunchConfig.cwd.scheme,
                authority: parent.shellLaunchConfig.cwd.authority,
                path: shellLaunchConfig.cwd || parent.shellLaunchConfig.cwd.path
            });
        }
        if (location === TerminalLocation.Editor || parent.target === TerminalLocation.Editor) {
            instance = this._terminalEditorService.splitInstance(parent, shellLaunchConfig);
        }
        else {
            const group = this._terminalGroupService.getGroupForInstance(parent);
            if (!group) {
                throw new Error(`Cannot split a terminal without a group (instanceId: ${parent.instanceId}, title: ${parent.title})`);
            }
            shellLaunchConfig.parentTerminalId = parent.instanceId;
            instance = group.split(shellLaunchConfig);
        }
        return instance;
    }
    _createTerminal(shellLaunchConfig, location, options) {
        let instance;
        if (location === TerminalLocation.Editor) {
            instance = this._terminalInstanceService.createInstance(shellLaunchConfig, TerminalLocation.Editor);
            if (!shellLaunchConfig.hideFromUser) {
                const editorOptions = this._getEditorOptions(options?.location);
                this._terminalEditorService.openEditor(instance, editorOptions);
            }
        }
        else {
            // TODO: pass resource?
            const group = this._terminalGroupService.createGroup(shellLaunchConfig);
            instance = group.terminalInstances[0];
        }
        return instance;
    }
    async resolveLocation(location) {
        if (location && typeof location === 'object') {
            if (hasKey(location, { parentTerminal: true })) {
                // since we don't set the target unless it's an editor terminal, this is necessary
                const parentTerminal = await location.parentTerminal;
                return !parentTerminal.target ? TerminalLocation.Panel : parentTerminal.target;
            }
            else if (hasKey(location, { viewColumn: true })) {
                return TerminalLocation.Editor;
            }
            else if (hasKey(location, { splitActiveTerminal: true })) {
                // since we don't set the target unless it's an editor terminal, this is necessary
                return !this._activeInstance?.target ? TerminalLocation.Panel : this._activeInstance?.target;
            }
        }
        return location;
    }
    async _getSplitParent(location) {
        if (location && typeof location === 'object' && hasKey(location, { parentTerminal: true })) {
            return location.parentTerminal;
        }
        else if (location && typeof location === 'object' && hasKey(location, { splitActiveTerminal: true })) {
            return this.activeInstance;
        }
        return undefined;
    }
    _getEditorOptions(location) {
        if (location && typeof location === 'object' && hasKey(location, { viewColumn: true })) {
            // Terminal-specific workaround to resolve the active group in auxiliary windows to
            // override the locked editor behavior.
            if (location.viewColumn === ACTIVE_GROUP && isAuxiliaryWindow(getActiveWindow())) {
                location.viewColumn = this._editorGroupsService.activeGroup.id;
                return location;
            }
            location.viewColumn = columnToEditorGroup(this._editorGroupsService, this._configurationService, location.viewColumn);
            return location;
        }
        return undefined;
    }
    _evaluateLocalCwd(shellLaunchConfig) {
        // Add welcome message and title annotation for local terminals launched within remote or
        // virtual workspaces
        if (!isString(shellLaunchConfig.cwd) && shellLaunchConfig.cwd?.scheme === Schemas.file) {
            if (VirtualWorkspaceContext.getValue(this._contextKeyService)) {
                shellLaunchConfig.initialText = formatMessageForTerminal(nls.localize('localTerminalVirtualWorkspace', "This shell is open to a {0}local{1} folder, NOT to the virtual folder", '\x1b[3m', '\x1b[23m'), { excludeLeadingNewLine: true, loudFormatting: true });
                shellLaunchConfig.type = 'Local';
            }
            else if (this._remoteAgentService.getConnection()) {
                shellLaunchConfig.initialText = formatMessageForTerminal(nls.localize('localTerminalRemote', "This shell is running on your {0}local{1} machine, NOT on the connected remote machine", '\x1b[3m', '\x1b[23m'), { excludeLeadingNewLine: true, loudFormatting: true });
                shellLaunchConfig.type = 'Local';
            }
        }
    }
    async showBackgroundTerminal(instance, suppressSetActive) {
        const index = this._backgroundedTerminalInstances.findIndex(bg => bg.instance === instance);
        if (index === -1) {
            return;
        }
        const backgroundTerminal = this._backgroundedTerminalInstances[index];
        this._backgroundedTerminalInstances.splice(index, 1);
        const disposables = this._backgroundedTerminalDisposables.get(instance.instanceId);
        if (disposables) {
            dispose(disposables);
        }
        this._backgroundedTerminalDisposables.delete(instance.instanceId);
        if (instance.target === TerminalLocation.Panel) {
            this._terminalGroupService.createGroup(instance);
            // Make active automatically if it's the first instance
            if (this.instances.length === 1 && !suppressSetActive) {
                this._terminalGroupService.setActiveInstanceByIndex(0);
            }
        }
        else {
            const editorOptions = backgroundTerminal.terminalLocationOptions ? this._getEditorOptions(backgroundTerminal.terminalLocationOptions) : this._getEditorOptions(instance.target);
            this._terminalEditorService.openEditor(instance, editorOptions);
        }
        this._onDidChangeInstances.fire();
    }
    async setContainers(panelContainer, terminalContainer) {
        this._terminalConfigurationService.setPanelContainer(panelContainer);
        this._terminalGroupService.setContainer(terminalContainer);
    }
    createOnInstanceEvent(getEvent) {
        return new DynamicListEventMultiplexer(this.instances, this.onDidCreateInstance, this.onDidDisposeInstance, getEvent);
    }
    createOnInstanceCapabilityEvent(capabilityId, getEvent) {
        return createInstanceCapabilityEventMultiplexer(this.instances, this.onDidCreateInstance, this.onDidDisposeInstance, capabilityId, getEvent);
    }
};
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceData", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceDataInput", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceIconChange", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceMaximumDimensionsChange", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstancePrimaryStatusChange", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceProcessIdReady", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceSelectionChange", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceTitleChange", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceShellTypeChanged", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceAddedCapabilityType", null);
__decorate([
    debounce(500)
], TerminalService.prototype, "_saveState", null);
__decorate([
    debounce(500)
], TerminalService.prototype, "_updateTitle", null);
__decorate([
    debounce(500)
], TerminalService.prototype, "_updateIcon", null);
TerminalService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ILifecycleService),
    __param(2, ITerminalLogService),
    __param(3, IDialogService),
    __param(4, IInstantiationService),
    __param(5, IRemoteAgentService),
    __param(6, IConfigurationService),
    __param(7, IWorkbenchEnvironmentService),
    __param(8, ITerminalConfigurationService),
    __param(9, ITerminalEditorService),
    __param(10, ITerminalGroupService),
    __param(11, ITerminalInstanceService),
    __param(12, IEditorGroupsService),
    __param(13, ITerminalProfileService),
    __param(14, IExtensionService),
    __param(15, INotificationService),
    __param(16, IWorkspaceContextService),
    __param(17, ICommandService),
    __param(18, IKeybindingService),
    __param(19, ITimerService)
], TerminalService);
export { TerminalService };
let TerminalEditorStyle = class TerminalEditorStyle extends Themable {
    constructor(container, _terminalService, _themeService, _terminalProfileService, _editorService) {
        super(_themeService);
        this._terminalService = _terminalService;
        this._themeService = _themeService;
        this._terminalProfileService = _terminalProfileService;
        this._editorService = _editorService;
        this._registerListeners();
        this._styleElement = domStylesheets.createStyleSheet(container);
        this._register(toDisposable(() => this._styleElement.remove()));
        this.updateStyles();
    }
    _registerListeners() {
        this._register(this._terminalService.onAnyInstanceIconChange(() => this.updateStyles()));
        this._register(this._terminalService.onDidCreateInstance(() => this.updateStyles()));
        this._register(this._editorService.onDidActiveEditorChange(() => {
            if (this._editorService.activeEditor instanceof TerminalEditorInput) {
                this.updateStyles();
            }
        }));
        this._register(this._editorService.onDidCloseEditor(() => {
            if (this._editorService.activeEditor instanceof TerminalEditorInput) {
                this.updateStyles();
            }
        }));
        this._register(this._terminalProfileService.onDidChangeAvailableProfiles(() => this.updateStyles()));
    }
    updateStyles() {
        super.updateStyles();
        const colorTheme = this._themeService.getColorTheme();
        // TODO: add a rule collector to avoid duplication
        let css = '';
        const productIconTheme = this._themeService.getProductIconTheme();
        // Add icons
        for (const instance of this._terminalService.instances) {
            const icon = instance.icon;
            if (!icon) {
                continue;
            }
            let uri = undefined;
            if (icon instanceof URI) {
                uri = icon;
            }
            else if (icon instanceof Object && hasKey(icon, { light: true, dark: true })) {
                uri = isDark(colorTheme.type) ? icon.dark : icon.light;
            }
            const iconClasses = getUriClasses(instance, colorTheme.type);
            if (uri instanceof URI && iconClasses && iconClasses.length > 1) {
                css += (cssValue.inline `.monaco-workbench .terminal-tab.${cssValue.className(iconClasses[0])}::before
					{content: ''; background-image: ${cssValue.asCSSUrl(uri)};}`);
            }
            if (ThemeIcon.isThemeIcon(icon)) {
                const iconRegistry = getIconRegistry();
                const iconContribution = iconRegistry.getIcon(icon.id);
                if (iconContribution) {
                    const def = productIconTheme.getIcon(iconContribution);
                    if (def) {
                        css += cssValue.inline `.monaco-workbench .terminal-tab.codicon-${cssValue.className(icon.id)}::before
							{content: ${cssValue.stringValue(def.fontCharacter)} !important; font-family: ${cssValue.stringValue(def.font?.id ?? 'codicon')} !important;}`;
                    }
                }
            }
        }
        // Add colors
        const iconForegroundColor = colorTheme.getColor(iconForeground);
        if (iconForegroundColor) {
            css += cssValue.inline `.monaco-workbench .show-file-icons .file-icon.terminal-tab::before { color: ${iconForegroundColor}; }`;
        }
        css += getColorStyleContent(colorTheme, true);
        this._styleElement.textContent = css;
    }
};
TerminalEditorStyle = __decorate([
    __param(1, ITerminalService),
    __param(2, IThemeService),
    __param(3, ITerminalProfileService),
    __param(4, IEditorService)
], TerminalEditorStyle);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLGNBQWMsTUFBTSw0Q0FBNEMsQ0FBQztBQUM3RSxPQUFPLEtBQUssUUFBUSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFxQixNQUFNLGtDQUFrQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQWdDLE1BQU0sa0NBQWtDLENBQUM7QUFDN0gsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0s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