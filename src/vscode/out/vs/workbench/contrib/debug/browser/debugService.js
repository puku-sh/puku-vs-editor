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
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { toAction } from '../../../../base/common/actions.js';
import { distinct } from '../../../../base/common/arrays.js';
import { RunOnceScheduler, raceTimeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { isErrorWithActions } from '../../../../base/common/errorMessage.js';
import * as errors from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { deepClone, equals } from '../../../../base/common/objects.js';
import severity from '../../../../base/common/severity.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import * as nls from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IExtensionHostDebugService } from '../../../../platform/debug/common/extensionHostDebug.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { VIEWLET_ID as EXPLORER_VIEWLET_ID } from '../../files/common/files.js';
import { ITestService } from '../../testing/common/testService.js';
import { CALLSTACK_VIEW_ID, CONTEXT_BREAKPOINTS_EXIST, CONTEXT_DEBUG_STATE, CONTEXT_DEBUG_TYPE, CONTEXT_DEBUG_UX, CONTEXT_DISASSEMBLY_VIEW_FOCUS, CONTEXT_HAS_DEBUGGED, CONTEXT_IN_DEBUG_MODE, DEBUG_MEMORY_SCHEME, DEBUG_SCHEME, REPL_VIEW_ID, VIEWLET_ID, debuggerDisabledMessage, getStateLabel } from '../common/debug.js';
import { DebugCompoundRoot } from '../common/debugCompoundRoot.js';
import { Breakpoint, DataBreakpoint, DebugModel, FunctionBreakpoint, InstructionBreakpoint } from '../common/debugModel.js';
import { Source } from '../common/debugSource.js';
import { DebugStorage } from '../common/debugStorage.js';
import { DebugTelemetry } from '../common/debugTelemetry.js';
import { getExtensionHostDebugSession, saveAllBeforeDebugStart } from '../common/debugUtils.js';
import { ViewModel } from '../common/debugViewModel.js';
import { DisassemblyViewInput } from '../common/disassemblyViewInput.js';
import { AdapterManager } from './debugAdapterManager.js';
import { DEBUG_CONFIGURE_COMMAND_ID, DEBUG_CONFIGURE_LABEL } from './debugCommands.js';
import { ConfigurationManager } from './debugConfigurationManager.js';
import { DebugMemoryFileSystemProvider } from './debugMemory.js';
import { DebugSession } from './debugSession.js';
import { DebugTaskRunner } from './debugTaskRunner.js';
let DebugService = class DebugService {
    constructor(editorService, paneCompositeService, viewsService, viewDescriptorService, notificationService, dialogService, layoutService, contextService, contextKeyService, lifecycleService, instantiationService, extensionService, fileService, configurationService, extensionHostDebugService, activityService, commandService, quickInputService, workspaceTrustRequestService, uriIdentityService, testService) {
        this.editorService = editorService;
        this.paneCompositeService = paneCompositeService;
        this.viewsService = viewsService;
        this.viewDescriptorService = viewDescriptorService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.layoutService = layoutService;
        this.contextService = contextService;
        this.contextKeyService = contextKeyService;
        this.lifecycleService = lifecycleService;
        this.instantiationService = instantiationService;
        this.extensionService = extensionService;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.extensionHostDebugService = extensionHostDebugService;
        this.activityService = activityService;
        this.commandService = commandService;
        this.quickInputService = quickInputService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.uriIdentityService = uriIdentityService;
        this.testService = testService;
        this.restartingSessions = new Set();
        this.disposables = new DisposableStore();
        this.initializing = false;
        this.sessionCancellationTokens = new Map();
        this.haveDoneLazySetup = false;
        this.breakpointsToSendOnResourceSaved = new Set();
        this._onDidChangeState = new Emitter();
        this._onDidNewSession = new Emitter();
        this._onWillNewSession = new Emitter();
        this._onDidEndSession = new Emitter();
        this.adapterManager = this.instantiationService.createInstance(AdapterManager, {
            onDidNewSession: this.onDidNewSession,
            configurationManager: () => this.configurationManager,
        });
        this.disposables.add(this.adapterManager);
        this.configurationManager = this.instantiationService.createInstance(ConfigurationManager, this.adapterManager);
        this.disposables.add(this.configurationManager);
        this.debugStorage = this.disposables.add(this.instantiationService.createInstance(DebugStorage));
        this.chosenEnvironments = this.debugStorage.loadChosenEnvironments();
        this.model = this.instantiationService.createInstance(DebugModel, this.debugStorage);
        this.telemetry = this.instantiationService.createInstance(DebugTelemetry, this.model);
        this.viewModel = new ViewModel(contextKeyService);
        this.taskRunner = this.instantiationService.createInstance(DebugTaskRunner);
        this.disposables.add(this.fileService.onDidFilesChange(e => this.onFileChanges(e)));
        this.disposables.add(this.lifecycleService.onWillShutdown(this.dispose, this));
        this.disposables.add(this.extensionHostDebugService.onAttachSession(event => {
            const session = this.model.getSession(event.sessionId, true);
            if (session) {
                // EH was started in debug mode -> attach to it
                session.configuration.request = 'attach';
                session.configuration.port = event.port;
                session.setSubId(event.subId);
                this.launchOrAttachToSession(session);
            }
        }));
        this.disposables.add(this.extensionHostDebugService.onTerminateSession(event => {
            const session = this.model.getSession(event.sessionId);
            if (session && session.subId === event.subId) {
                session.disconnect();
            }
        }));
        this.disposables.add(this.viewModel.onDidFocusStackFrame(() => {
            this.onStateChange();
        }));
        this.disposables.add(this.viewModel.onDidFocusSession((session) => {
            this.onStateChange();
            if (session) {
                this.setExceptionBreakpointFallbackSession(session.getId());
            }
        }));
        this.disposables.add(Event.any(this.adapterManager.onDidRegisterDebugger, this.configurationManager.onDidSelectConfiguration)(() => {
            const debugUxValue = (this.state !== 0 /* State.Inactive */ || (this.configurationManager.getAllConfigurations().length > 0 && this.adapterManager.hasEnabledDebuggers())) ? 'default' : 'simple';
            this.debugUx.set(debugUxValue);
            this.debugStorage.storeDebugUxState(debugUxValue);
        }));
        this.disposables.add(this.model.onDidChangeCallStack(() => {
            const numberOfSessions = this.model.getSessions().filter(s => !s.parentSession).length;
            this.activity?.dispose();
            if (numberOfSessions > 0) {
                const viewContainer = this.viewDescriptorService.getViewContainerByViewId(CALLSTACK_VIEW_ID);
                if (viewContainer) {
                    this.activity = this.activityService.showViewContainerActivity(viewContainer.id, { badge: new NumberBadge(numberOfSessions, n => n === 1 ? nls.localize('1activeSession', "1 active session") : nls.localize('nActiveSessions', "{0} active sessions", n)) });
                }
            }
        }));
        this.disposables.add(editorService.onDidActiveEditorChange(() => {
            this.contextKeyService.bufferChangeEvents(() => {
                if (editorService.activeEditor === DisassemblyViewInput.instance) {
                    this.disassemblyViewFocus.set(true);
                }
                else {
                    // This key can be initialized a tick after this event is fired
                    this.disassemblyViewFocus?.reset();
                }
            });
        }));
        this.disposables.add(this.lifecycleService.onBeforeShutdown(() => {
            for (const editor of editorService.editors) {
                // Editors will not be valid on window reload, so close them.
                if (editor.resource?.scheme === DEBUG_MEMORY_SCHEME) {
                    editor.dispose();
                }
            }
        }));
        this.disposables.add(extensionService.onWillStop(evt => {
            evt.veto(this.model.getSessions().length > 0, nls.localize('active debug session', 'A debug session is still running that would terminate.'));
        }));
        this.initContextKeys(contextKeyService);
    }
    initContextKeys(contextKeyService) {
        queueMicrotask(() => {
            contextKeyService.bufferChangeEvents(() => {
                this.debugType = CONTEXT_DEBUG_TYPE.bindTo(contextKeyService);
                this.debugState = CONTEXT_DEBUG_STATE.bindTo(contextKeyService);
                this.hasDebugged = CONTEXT_HAS_DEBUGGED.bindTo(contextKeyService);
                this.inDebugMode = CONTEXT_IN_DEBUG_MODE.bindTo(contextKeyService);
                this.debugUx = CONTEXT_DEBUG_UX.bindTo(contextKeyService);
                this.debugUx.set(this.debugStorage.loadDebugUxState());
                this.breakpointsExist = CONTEXT_BREAKPOINTS_EXIST.bindTo(contextKeyService);
                // Need to set disassemblyViewFocus here to make it in the same context as the debug event handlers
                this.disassemblyViewFocus = CONTEXT_DISASSEMBLY_VIEW_FOCUS.bindTo(contextKeyService);
            });
            const setBreakpointsExistContext = () => this.breakpointsExist.set(!!(this.model.getBreakpoints().length || this.model.getDataBreakpoints().length || this.model.getFunctionBreakpoints().length));
            setBreakpointsExistContext();
            this.disposables.add(this.model.onDidChangeBreakpoints(() => setBreakpointsExistContext()));
        });
    }
    getModel() {
        return this.model;
    }
    getViewModel() {
        return this.viewModel;
    }
    getConfigurationManager() {
        return this.configurationManager;
    }
    getAdapterManager() {
        return this.adapterManager;
    }
    sourceIsNotAvailable(uri) {
        this.model.sourceIsNotAvailable(uri);
    }
    dispose() {
        this.disposables.dispose();
    }
    //---- state management
    get state() {
        const focusedSession = this.viewModel.focusedSession;
        if (focusedSession) {
            return focusedSession.state;
        }
        return this.initializing ? 1 /* State.Initializing */ : 0 /* State.Inactive */;
    }
    get initializingOptions() {
        return this._initializingOptions;
    }
    startInitializingState(options) {
        if (!this.initializing) {
            this.initializing = true;
            this._initializingOptions = options;
            this.onStateChange();
        }
    }
    endInitializingState() {
        if (this.initializing) {
            this.initializing = false;
            this._initializingOptions = undefined;
            this.onStateChange();
        }
    }
    cancelTokens(id) {
        if (id) {
            const token = this.sessionCancellationTokens.get(id);
            if (token) {
                token.cancel();
                this.sessionCancellationTokens.delete(id);
            }
        }
        else {
            this.sessionCancellationTokens.forEach(t => t.cancel());
            this.sessionCancellationTokens.clear();
        }
    }
    onStateChange() {
        const state = this.state;
        if (this.previousState !== state) {
            this.contextKeyService.bufferChangeEvents(() => {
                this.debugState.set(getStateLabel(state));
                this.inDebugMode.set(state !== 0 /* State.Inactive */);
                // Only show the simple ux if debug is not yet started and if no launch.json exists
                const debugUxValue = ((state !== 0 /* State.Inactive */ && state !== 1 /* State.Initializing */) || (this.adapterManager.hasEnabledDebuggers() && this.configurationManager.selectedConfiguration.name)) ? 'default' : 'simple';
                this.debugUx.set(debugUxValue);
                this.debugStorage.storeDebugUxState(debugUxValue);
            });
            this.previousState = state;
            this._onDidChangeState.fire(state);
        }
    }
    get onDidChangeState() {
        return this._onDidChangeState.event;
    }
    get onDidNewSession() {
        return this._onDidNewSession.event;
    }
    get onWillNewSession() {
        return this._onWillNewSession.event;
    }
    get onDidEndSession() {
        return this._onDidEndSession.event;
    }
    lazySetup() {
        if (!this.haveDoneLazySetup) {
            // Registering fs providers is slow
            // https://github.com/microsoft/vscode/issues/159886
            this.disposables.add(this.fileService.registerProvider(DEBUG_MEMORY_SCHEME, this.disposables.add(new DebugMemoryFileSystemProvider(this))));
            this.haveDoneLazySetup = true;
        }
    }
    //---- life cycle management
    /**
     * main entry point
     * properly manages compounds, checks for errors and handles the initializing state.
     */
    async startDebugging(launch, configOrName, options, saveBeforeStart = !options?.parentSession) {
        const message = options && options.noDebug ? nls.localize('runTrust', "Running executes build tasks and program code from your workspace.") : nls.localize('debugTrust', "Debugging executes build tasks and program code from your workspace.");
        const trust = await this.workspaceTrustRequestService.requestWorkspaceTrust({ message });
        if (!trust) {
            return false;
        }
        this.lazySetup();
        this.startInitializingState(options);
        this.hasDebugged.set(true);
        try {
            // make sure to save all files and that the configuration is up to date
            await this.extensionService.activateByEvent('onDebug');
            if (saveBeforeStart) {
                await saveAllBeforeDebugStart(this.configurationService, this.editorService);
            }
            await this.extensionService.whenInstalledExtensionsRegistered();
            let config;
            let compound;
            if (!configOrName) {
                configOrName = this.configurationManager.selectedConfiguration.name;
            }
            if (typeof configOrName === 'string' && launch) {
                config = launch.getConfiguration(configOrName);
                compound = launch.getCompound(configOrName);
            }
            else if (typeof configOrName !== 'string') {
                config = configOrName;
            }
            if (compound) {
                // we are starting a compound debug, first do some error checking and than start each configuration in the compound
                if (!compound.configurations) {
                    throw new Error(nls.localize({ key: 'compoundMustHaveConfigurations', comment: ['compound indicates a "compounds" configuration item', '"configurations" is an attribute and should not be localized'] }, "Compound must have \"configurations\" attribute set in order to start multiple configurations."));
                }
                if (compound.preLaunchTask) {
                    const taskResult = await this.taskRunner.runTaskAndCheckErrors(launch?.workspace || this.contextService.getWorkspace(), compound.preLaunchTask);
                    if (taskResult === 0 /* TaskRunResult.Failure */) {
                        this.endInitializingState();
                        return false;
                    }
                }
                if (compound.stopAll) {
                    options = { ...options, compoundRoot: new DebugCompoundRoot() };
                }
                const values = await Promise.all(compound.configurations.map(configData => {
                    const name = typeof configData === 'string' ? configData : configData.name;
                    if (name === compound.name) {
                        return Promise.resolve(false);
                    }
                    let launchForName;
                    if (typeof configData === 'string') {
                        const launchesContainingName = this.configurationManager.getLaunches().filter(l => !!l.getConfiguration(name));
                        if (launchesContainingName.length === 1) {
                            launchForName = launchesContainingName[0];
                        }
                        else if (launch && launchesContainingName.length > 1 && launchesContainingName.indexOf(launch) >= 0) {
                            // If there are multiple launches containing the configuration give priority to the configuration in the current launch
                            launchForName = launch;
                        }
                        else {
                            throw new Error(launchesContainingName.length === 0 ? nls.localize('noConfigurationNameInWorkspace', "Could not find launch configuration '{0}' in the workspace.", name)
                                : nls.localize('multipleConfigurationNamesInWorkspace', "There are multiple launch configurations '{0}' in the workspace. Use folder name to qualify the configuration.", name));
                        }
                    }
                    else if (configData.folder) {
                        const launchesMatchingConfigData = this.configurationManager.getLaunches().filter(l => l.workspace && l.workspace.name === configData.folder && !!l.getConfiguration(configData.name));
                        if (launchesMatchingConfigData.length === 1) {
                            launchForName = launchesMatchingConfigData[0];
                        }
                        else {
                            throw new Error(nls.localize('noFolderWithName', "Can not find folder with name '{0}' for configuration '{1}' in compound '{2}'.", configData.folder, configData.name, compound.name));
                        }
                    }
                    return this.createSession(launchForName, launchForName.getConfiguration(name), options);
                }));
                const result = values.every(success => !!success); // Compound launch is a success only if each configuration launched successfully
                this.endInitializingState();
                return result;
            }
            if (configOrName && !config) {
                const message = !!launch ? nls.localize('configMissing', "Configuration '{0}' is missing in 'launch.json'.", typeof configOrName === 'string' ? configOrName : configOrName.name) :
                    nls.localize('launchJsonDoesNotExist', "'launch.json' does not exist for passed workspace folder.");
                throw new Error(message);
            }
            const result = await this.createSession(launch, config, options);
            this.endInitializingState();
            return result;
        }
        catch (err) {
            // make sure to get out of initializing state, and propagate the result
            this.notificationService.error(err);
            this.endInitializingState();
            return Promise.reject(err);
        }
    }
    /**
     * gets the debugger for the type, resolves configurations by providers, substitutes variables and runs prelaunch tasks
     */
    async createSession(launch, config, options) {
        // We keep the debug type in a separate variable 'type' so that a no-folder config has no attributes.
        // Storing the type in the config would break extensions that assume that the no-folder case is indicated by an empty config.
        let type;
        if (config) {
            type = config.type;
        }
        else {
            // a no-folder workspace has no launch.config
            config = Object.create(null);
        }
        if (options && options.noDebug) {
            config.noDebug = true;
        }
        else if (options && typeof options.noDebug === 'undefined' && options.parentSession && options.parentSession.configuration.noDebug) {
            config.noDebug = true;
        }
        const unresolvedConfig = deepClone(config);
        let guess;
        let activeEditor;
        if (!type) {
            activeEditor = this.editorService.activeEditor;
            if (activeEditor && activeEditor.resource) {
                const chosen = this.chosenEnvironments[activeEditor.resource.toString()];
                if (chosen) {
                    type = chosen.type;
                    if (chosen.dynamicLabel) {
                        const dyn = await this.configurationManager.getDynamicConfigurationsByType(chosen.type);
                        const found = dyn.find(d => d.label === chosen.dynamicLabel);
                        if (found) {
                            launch = found.launch;
                            Object.assign(config, found.config);
                        }
                    }
                }
            }
            if (!type) {
                guess = await this.adapterManager.guessDebugger(false);
                if (guess) {
                    type = guess.debugger.type;
                    if (guess.withConfig) {
                        launch = guess.withConfig.launch;
                        Object.assign(config, guess.withConfig.config);
                    }
                }
            }
        }
        const initCancellationToken = new CancellationTokenSource();
        const sessionId = generateUuid();
        this.sessionCancellationTokens.set(sessionId, initCancellationToken);
        const configByProviders = await this.configurationManager.resolveConfigurationByProviders(launch && launch.workspace ? launch.workspace.uri : undefined, type, config, initCancellationToken.token);
        // a falsy config indicates an aborted launch
        if (configByProviders && configByProviders.type) {
            try {
                let resolvedConfig = await this.substituteVariables(launch, configByProviders);
                if (!resolvedConfig) {
                    // User cancelled resolving of interactive variables, silently return
                    return false;
                }
                if (initCancellationToken.token.isCancellationRequested) {
                    // User cancelled, silently return
                    return false;
                }
                // Check for concurrent sessions before running preLaunchTask to avoid running the task if user cancels
                let userConfirmedConcurrentSession = false;
                if (options?.startedByUser && resolvedConfig && resolvedConfig.suppressMultipleSessionWarning !== true) {
                    // Check if there's already a session with the same launch configuration
                    const existingSessions = this.model.getSessions();
                    const workspace = launch?.workspace;
                    const existingSession = existingSessions.find(s => s.configuration.name === resolvedConfig.name &&
                        s.configuration.type === resolvedConfig.type &&
                        s.configuration.request === resolvedConfig.request &&
                        s.root === workspace);
                    if (existingSession) {
                        // There is already a session with the same configuration, prompt user before running preLaunchTask
                        const confirmed = await this.confirmConcurrentSession(existingSession.getLabel());
                        if (!confirmed) {
                            return false;
                        }
                        userConfirmedConcurrentSession = true;
                    }
                }
                const workspace = launch?.workspace || this.contextService.getWorkspace();
                const taskResult = await this.taskRunner.runTaskAndCheckErrors(workspace, resolvedConfig.preLaunchTask);
                if (taskResult === 0 /* TaskRunResult.Failure */) {
                    return false;
                }
                const cfg = await this.configurationManager.resolveDebugConfigurationWithSubstitutedVariables(launch && launch.workspace ? launch.workspace.uri : undefined, resolvedConfig.type, resolvedConfig, initCancellationToken.token);
                if (!cfg) {
                    if (launch && type && cfg === null && !initCancellationToken.token.isCancellationRequested) { // show launch.json only for "config" being "null".
                        await launch.openConfigFile({ preserveFocus: true, type }, initCancellationToken.token);
                    }
                    return false;
                }
                resolvedConfig = cfg;
                const dbg = this.adapterManager.getDebugger(resolvedConfig.type);
                if (!dbg || (configByProviders.request !== 'attach' && configByProviders.request !== 'launch')) {
                    let message;
                    if (configByProviders.request !== 'attach' && configByProviders.request !== 'launch') {
                        message = configByProviders.request ? nls.localize('debugRequestNotSupported', "Attribute '{0}' has an unsupported value '{1}' in the chosen debug configuration.", 'request', configByProviders.request)
                            : nls.localize('debugRequesMissing', "Attribute '{0}' is missing from the chosen debug configuration.", 'request');
                    }
                    else {
                        message = resolvedConfig.type ? nls.localize('debugTypeNotSupported', "Configured debug type '{0}' is not supported.", resolvedConfig.type) :
                            nls.localize('debugTypeMissing', "Missing property 'type' for the chosen launch configuration.");
                    }
                    const actionList = [];
                    actionList.push(toAction({
                        id: 'installAdditionalDebuggers',
                        label: nls.localize({ key: 'installAdditionalDebuggers', comment: ['Placeholder is the debug type, so for example "node", "python"'] }, "Install {0} Extension", resolvedConfig.type),
                        enabled: true,
                        run: async () => this.commandService.executeCommand('debug.installAdditionalDebuggers', resolvedConfig?.type)
                    }));
                    await this.showError(message, actionList);
                    return false;
                }
                if (!dbg.enabled) {
                    await this.showError(debuggerDisabledMessage(dbg.type), []);
                    return false;
                }
                const result = await this.doCreateSession(sessionId, launch?.workspace, { resolved: resolvedConfig, unresolved: unresolvedConfig }, options, userConfirmedConcurrentSession);
                if (result && guess && activeEditor && activeEditor.resource) {
                    // Remeber user choice of environment per active editor to make starting debugging smoother #124770
                    this.chosenEnvironments[activeEditor.resource.toString()] = { type: guess.debugger.type, dynamicLabel: guess.withConfig?.label };
                    this.debugStorage.storeChosenEnvironments(this.chosenEnvironments);
                }
                return result;
            }
            catch (err) {
                if (err && err.message) {
                    await this.showError(err.message);
                }
                else if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
                    await this.showError(nls.localize('noFolderWorkspaceDebugError', "The active file can not be debugged. Make sure it is saved and that you have a debug extension installed for that file type."));
                }
                if (launch && !initCancellationToken.token.isCancellationRequested) {
                    await launch.openConfigFile({ preserveFocus: true }, initCancellationToken.token);
                }
                return false;
            }
        }
        if (launch && type && configByProviders === null && !initCancellationToken.token.isCancellationRequested) { // show launch.json only for "config" being "null".
            await launch.openConfigFile({ preserveFocus: true, type }, initCancellationToken.token);
        }
        return false;
    }
    /**
     * instantiates the new session, initializes the session, registers session listeners and reports telemetry
     */
    async doCreateSession(sessionId, root, configuration, options, userConfirmedConcurrentSession = false) {
        const session = this.instantiationService.createInstance(DebugSession, sessionId, configuration, root, this.model, options);
        if (!userConfirmedConcurrentSession && options?.startedByUser && this.model.getSessions().some(s => s.configuration.name === configuration.resolved.name &&
            s.configuration.type === configuration.resolved.type &&
            s.configuration.request === configuration.resolved.request &&
            s.root === root) && configuration.resolved.suppressMultipleSessionWarning !== true) {
            // There is already a session with the same configuration, prompt user #127721
            const confirmed = await this.confirmConcurrentSession(session.getLabel());
            if (!confirmed) {
                return false;
            }
        }
        this.model.addSession(session);
        // since the Session is now properly registered under its ID and hooked, we can announce it
        // this event doesn't go to extensions
        this._onWillNewSession.fire(session);
        const openDebug = this.configurationService.getValue('debug').openDebug;
        // Open debug viewlet based on the visibility of the side bar and openDebug setting. Do not open for 'run without debug'
        if (!configuration.resolved.noDebug && (openDebug === 'openOnSessionStart' || (openDebug !== 'neverOpen' && this.viewModel.firstSessionStart)) && !session.suppressDebugView) {
            await this.paneCompositeService.openPaneComposite(VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */);
        }
        try {
            await this.launchOrAttachToSession(session);
            const internalConsoleOptions = session.configuration.internalConsoleOptions || this.configurationService.getValue('debug').internalConsoleOptions;
            if (internalConsoleOptions === 'openOnSessionStart' || (this.viewModel.firstSessionStart && internalConsoleOptions === 'openOnFirstSessionStart')) {
                this.viewsService.openView(REPL_VIEW_ID, false);
            }
            this.viewModel.firstSessionStart = false;
            const showSubSessions = this.configurationService.getValue('debug').showSubSessionsInToolBar;
            const sessions = this.model.getSessions();
            const shownSessions = showSubSessions ? sessions : sessions.filter(s => !s.parentSession);
            if (shownSessions.length > 1) {
                this.viewModel.setMultiSessionView(true);
            }
            // since the initialized response has arrived announce the new Session (including extensions)
            this._onDidNewSession.fire(session);
            return true;
        }
        catch (error) {
            if (errors.isCancellationError(error)) {
                // don't show 'canceled' error messages to the user #7906
                return false;
            }
            // Show the repl if some error got logged there #5870
            if (session && session.getReplElements().length > 0) {
                this.viewsService.openView(REPL_VIEW_ID, false);
            }
            if (session.configuration && session.configuration.request === 'attach' && session.configuration.__autoAttach) {
                // ignore attach timeouts in auto attach mode
                return false;
            }
            const errorMessage = error instanceof Error ? error.message : error;
            if (error.showUser !== false) {
                // Only show the error when showUser is either not defined, or is true #128484
                await this.showError(errorMessage, isErrorWithActions(error) ? error.actions : []);
            }
            return false;
        }
    }
    async confirmConcurrentSession(sessionLabel) {
        const result = await this.dialogService.confirm({
            message: nls.localize('multipleSession', "'{0}' is already running. Do you want to start another instance?", sessionLabel)
        });
        return result.confirmed;
    }
    async launchOrAttachToSession(session, forceFocus = false) {
        // register listeners as the very first thing!
        this.registerSessionListeners(session);
        const dbgr = this.adapterManager.getDebugger(session.configuration.type);
        try {
            await session.initialize(dbgr);
            await session.launchOrAttach(session.configuration);
            const launchJsonExists = !!session.root && !!this.configurationService.getValue('launch', { resource: session.root.uri });
            await this.telemetry.logDebugSessionStart(dbgr, launchJsonExists);
            if (forceFocus || !this.viewModel.focusedSession || (session.parentSession === this.viewModel.focusedSession && session.compact)) {
                await this.focusStackFrame(undefined, undefined, session);
            }
        }
        catch (err) {
            if (this.viewModel.focusedSession === session) {
                await this.focusStackFrame(undefined);
            }
            return Promise.reject(err);
        }
    }
    registerSessionListeners(session) {
        const listenerDisposables = new DisposableStore();
        this.disposables.add(listenerDisposables);
        const sessionRunningScheduler = listenerDisposables.add(new RunOnceScheduler(() => {
            // Do not immediatly defocus the stack frame if the session is running
            if (session.state === 3 /* State.Running */ && this.viewModel.focusedSession === session) {
                this.viewModel.setFocus(undefined, this.viewModel.focusedThread, session, false);
            }
        }, 200));
        listenerDisposables.add(session.onDidChangeState(() => {
            if (session.state === 3 /* State.Running */ && this.viewModel.focusedSession === session) {
                sessionRunningScheduler.schedule();
            }
            if (session === this.viewModel.focusedSession) {
                this.onStateChange();
            }
        }));
        listenerDisposables.add(this.onDidEndSession(e => {
            if (e.session === session) {
                this.disposables.delete(listenerDisposables);
            }
        }));
        listenerDisposables.add(session.onDidEndAdapter(async (adapterExitEvent) => {
            if (adapterExitEvent) {
                if (adapterExitEvent.error) {
                    this.notificationService.error(nls.localize('debugAdapterCrash', "Debug adapter process has terminated unexpectedly ({0})", adapterExitEvent.error.message || adapterExitEvent.error.toString()));
                }
                this.telemetry.logDebugSessionStop(session, adapterExitEvent);
            }
            // 'Run without debugging' mode VSCode must terminate the extension host. More details: #3905
            const extensionDebugSession = getExtensionHostDebugSession(session);
            if (extensionDebugSession && extensionDebugSession.state === 3 /* State.Running */ && extensionDebugSession.configuration.noDebug) {
                this.extensionHostDebugService.close(extensionDebugSession.getId());
            }
            if (session.configuration.postDebugTask) {
                const root = session.root ?? this.contextService.getWorkspace();
                try {
                    await this.taskRunner.runTask(root, session.configuration.postDebugTask);
                }
                catch (err) {
                    this.notificationService.error(err);
                }
            }
            this.endInitializingState();
            this.cancelTokens(session.getId());
            if (this.configurationService.getValue('debug').closeReadonlyTabsOnEnd) {
                const editorsToClose = this.editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */).filter(({ editor }) => {
                    return editor.resource?.scheme === DEBUG_SCHEME && session.getId() === Source.getEncodedDebugData(editor.resource).sessionId;
                });
                this.editorService.closeEditors(editorsToClose);
            }
            this._onDidEndSession.fire({ session, restart: this.restartingSessions.has(session) });
            const focusedSession = this.viewModel.focusedSession;
            if (focusedSession && focusedSession.getId() === session.getId()) {
                const { session, thread, stackFrame } = getStackFrameThreadAndSessionToFocus(this.model, undefined, undefined, undefined, focusedSession);
                this.viewModel.setFocus(stackFrame, thread, session, false);
            }
            if (this.model.getSessions().length === 0) {
                this.viewModel.setMultiSessionView(false);
                if (this.layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) && this.configurationService.getValue('debug').openExplorerOnEnd) {
                    this.paneCompositeService.openPaneComposite(EXPLORER_VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */);
                }
                // Data breakpoints that can not be persisted should be cleared when a session ends
                const dataBreakpoints = this.model.getDataBreakpoints().filter(dbp => !dbp.canPersist);
                dataBreakpoints.forEach(dbp => this.model.removeDataBreakpoints(dbp.getId()));
                if (this.configurationService.getValue('debug').console.closeOnEnd) {
                    const debugConsoleContainer = this.viewDescriptorService.getViewContainerByViewId(REPL_VIEW_ID);
                    if (debugConsoleContainer && this.viewsService.isViewContainerVisible(debugConsoleContainer.id)) {
                        this.viewsService.closeViewContainer(debugConsoleContainer.id);
                    }
                }
            }
            this.model.removeExceptionBreakpointsForSession(session.getId());
            // session.dispose(); TODO@roblourens
        }));
    }
    async restartSession(session, restartData) {
        if (session.saveBeforeRestart) {
            await saveAllBeforeDebugStart(this.configurationService, this.editorService);
        }
        const isAutoRestart = !!restartData;
        const runTasks = async () => {
            if (isAutoRestart) {
                // Do not run preLaunch and postDebug tasks for automatic restarts
                return Promise.resolve(1 /* TaskRunResult.Success */);
            }
            const root = session.root || this.contextService.getWorkspace();
            await this.taskRunner.runTask(root, session.configuration.preRestartTask);
            await this.taskRunner.runTask(root, session.configuration.postDebugTask);
            const taskResult1 = await this.taskRunner.runTaskAndCheckErrors(root, session.configuration.preLaunchTask);
            if (taskResult1 !== 1 /* TaskRunResult.Success */) {
                return taskResult1;
            }
            return this.taskRunner.runTaskAndCheckErrors(root, session.configuration.postRestartTask);
        };
        const extensionDebugSession = getExtensionHostDebugSession(session);
        if (extensionDebugSession) {
            const taskResult = await runTasks();
            if (taskResult === 1 /* TaskRunResult.Success */) {
                this.extensionHostDebugService.reload(extensionDebugSession.getId());
            }
            return;
        }
        // Read the configuration again if a launch.json has been changed, if not just use the inmemory configuration
        let needsToSubstitute = false;
        let unresolved;
        const launch = session.root ? this.configurationManager.getLaunch(session.root.uri) : undefined;
        if (launch) {
            unresolved = launch.getConfiguration(session.configuration.name);
            if (unresolved && !equals(unresolved, session.unresolvedConfiguration)) {
                unresolved.noDebug = session.configuration.noDebug;
                needsToSubstitute = true;
            }
        }
        let resolved = session.configuration;
        if (launch && needsToSubstitute && unresolved) {
            const initCancellationToken = new CancellationTokenSource();
            this.sessionCancellationTokens.set(session.getId(), initCancellationToken);
            const resolvedByProviders = await this.configurationManager.resolveConfigurationByProviders(launch.workspace ? launch.workspace.uri : undefined, unresolved.type, unresolved, initCancellationToken.token);
            if (resolvedByProviders) {
                resolved = await this.substituteVariables(launch, resolvedByProviders);
                if (resolved && !initCancellationToken.token.isCancellationRequested) {
                    resolved = await this.configurationManager.resolveDebugConfigurationWithSubstitutedVariables(launch && launch.workspace ? launch.workspace.uri : undefined, resolved.type, resolved, initCancellationToken.token);
                }
            }
            else {
                resolved = resolvedByProviders;
            }
        }
        if (resolved) {
            session.setConfiguration({ resolved, unresolved });
        }
        session.configuration.__restart = restartData;
        const doRestart = async (fn) => {
            this.restartingSessions.add(session);
            let didRestart = false;
            try {
                didRestart = (await fn()) !== false;
            }
            catch (e) {
                didRestart = false;
                throw e;
            }
            finally {
                this.restartingSessions.delete(session);
                // we previously may have issued an onDidEndSession with restart: true,
                // assuming the adapter exited (in `registerSessionListeners`). But the
                // restart failed, so emit the final termination now.
                if (!didRestart) {
                    this._onDidEndSession.fire({ session, restart: false });
                }
            }
        };
        for (const breakpoint of this.model.getBreakpoints({ triggeredOnly: true })) {
            breakpoint.setSessionDidTrigger(session.getId(), false);
        }
        // For debug sessions spawned by test runs, cancel the test run and stop
        // the session, then start the test run again; tests have no notion of restarts.
        if (session.correlatedTestRun) {
            if (!session.correlatedTestRun.completedAt) {
                session.cancelCorrelatedTestRun();
                await Event.toPromise(session.correlatedTestRun.onComplete);
                // todo@connor4312 is there any reason to wait for the debug session to
                // terminate? I don't think so, test extension should already handle any
                // state conflicts...
            }
            this.testService.runResolvedTests(session.correlatedTestRun.request);
            return;
        }
        if (session.capabilities.supportsRestartRequest) {
            const taskResult = await runTasks();
            if (taskResult === 1 /* TaskRunResult.Success */) {
                await doRestart(async () => {
                    await session.restart();
                    return true;
                });
            }
            return;
        }
        const shouldFocus = !!this.viewModel.focusedSession && session.getId() === this.viewModel.focusedSession.getId();
        return doRestart(async () => {
            // If the restart is automatic  -> disconnect, otherwise -> terminate #55064
            if (isAutoRestart) {
                await session.disconnect(true);
            }
            else {
                await session.terminate(true);
            }
            return new Promise((c, e) => {
                setTimeout(async () => {
                    const taskResult = await runTasks();
                    if (taskResult !== 1 /* TaskRunResult.Success */) {
                        return c(false);
                    }
                    if (!resolved) {
                        return c(false);
                    }
                    try {
                        await this.launchOrAttachToSession(session, shouldFocus);
                        this._onDidNewSession.fire(session);
                        c(true);
                    }
                    catch (error) {
                        e(error);
                    }
                }, 300);
            });
        });
    }
    async stopSession(session, disconnect = false, suspend = false) {
        if (session) {
            return disconnect ? session.disconnect(undefined, suspend) : session.terminate();
        }
        const sessions = this.model.getSessions();
        if (sessions.length === 0) {
            this.taskRunner.cancel();
            // User might have cancelled starting of a debug session, and in some cases the quick pick is left open
            await this.quickInputService.cancel();
            this.endInitializingState();
            this.cancelTokens(undefined);
        }
        return Promise.all(sessions.map(s => disconnect ? s.disconnect(undefined, suspend) : s.terminate()));
    }
    async substituteVariables(launch, config) {
        const dbg = this.adapterManager.getDebugger(config.type);
        if (dbg) {
            let folder = undefined;
            if (launch && launch.workspace) {
                folder = launch.workspace;
            }
            else {
                const folders = this.contextService.getWorkspace().folders;
                if (folders.length === 1) {
                    folder = folders[0];
                }
            }
            try {
                return await dbg.substituteVariables(folder, config);
            }
            catch (err) {
                if (err.message !== errors.canceledName) {
                    this.showError(err.message, undefined, !!launch?.getConfiguration(config.name));
                }
                return undefined; // bail out
            }
        }
        return Promise.resolve(config);
    }
    async showError(message, errorActions = [], promptLaunchJson = true) {
        const configureAction = toAction({ id: DEBUG_CONFIGURE_COMMAND_ID, label: DEBUG_CONFIGURE_LABEL, enabled: true, run: () => this.commandService.executeCommand(DEBUG_CONFIGURE_COMMAND_ID) });
        // Don't append the standard command if id of any provided action indicates it is a command
        const actions = errorActions.filter((action) => action.id.endsWith('.command')).length > 0 ?
            errorActions :
            [...errorActions, ...(promptLaunchJson ? [configureAction] : [])];
        await this.dialogService.prompt({
            type: severity.Error,
            message,
            buttons: actions.map(action => ({
                label: action.label,
                run: () => action.run()
            })),
            cancelButton: true
        });
    }
    //---- focus management
    async focusStackFrame(_stackFrame, _thread, _session, options) {
        const { stackFrame, thread, session } = getStackFrameThreadAndSessionToFocus(this.model, _stackFrame, _thread, _session);
        if (stackFrame) {
            const editor = await stackFrame.openInEditor(this.editorService, options?.preserveFocus ?? true, options?.sideBySide, options?.pinned);
            if (editor) {
                if (editor.input === DisassemblyViewInput.instance) {
                    // Go to address is invoked via setFocus
                }
                else {
                    const control = editor.getControl();
                    if (stackFrame && isCodeEditor(control) && control.hasModel()) {
                        const model = control.getModel();
                        const lineNumber = stackFrame.range.startLineNumber;
                        if (lineNumber >= 1 && lineNumber <= model.getLineCount()) {
                            const lineContent = control.getModel().getLineContent(lineNumber);
                            aria.alert(nls.localize({ key: 'debuggingPaused', comment: ['First placeholder is the file line content, second placeholder is the reason why debugging is stopped, for example "breakpoint", third is the stack frame name, and last is the line number.'] }, "{0}, debugging paused {1}, {2}:{3}", lineContent, thread && thread.stoppedDetails ? `, reason ${thread.stoppedDetails.reason}` : '', stackFrame.source ? stackFrame.source.name : '', stackFrame.range.startLineNumber));
                        }
                    }
                }
            }
        }
        if (session) {
            this.debugType.set(session.configuration.type);
        }
        else {
            this.debugType.reset();
        }
        this.viewModel.setFocus(stackFrame, thread, session, !!options?.explicit);
    }
    //---- watches
    addWatchExpression(name) {
        const we = this.model.addWatchExpression(name);
        if (!name) {
            this.viewModel.setSelectedExpression(we, false);
        }
        this.debugStorage.storeWatchExpressions(this.model.getWatchExpressions());
    }
    renameWatchExpression(id, newName) {
        this.model.renameWatchExpression(id, newName);
        this.debugStorage.storeWatchExpressions(this.model.getWatchExpressions());
    }
    moveWatchExpression(id, position) {
        this.model.moveWatchExpression(id, position);
        this.debugStorage.storeWatchExpressions(this.model.getWatchExpressions());
    }
    removeWatchExpressions(id) {
        this.model.removeWatchExpressions(id);
        this.debugStorage.storeWatchExpressions(this.model.getWatchExpressions());
    }
    //---- breakpoints
    canSetBreakpointsIn(model) {
        return this.adapterManager.canSetBreakpointsIn(model);
    }
    async enableOrDisableBreakpoints(enable, breakpoint) {
        if (breakpoint) {
            this.model.setEnablement(breakpoint, enable);
            this.debugStorage.storeBreakpoints(this.model);
            if (breakpoint instanceof Breakpoint) {
                await this.makeTriggeredBreakpointsMatchEnablement(enable, breakpoint);
                await this.sendBreakpoints(breakpoint.originalUri);
            }
            else if (breakpoint instanceof FunctionBreakpoint) {
                await this.sendFunctionBreakpoints();
            }
            else if (breakpoint instanceof DataBreakpoint) {
                await this.sendDataBreakpoints();
            }
            else if (breakpoint instanceof InstructionBreakpoint) {
                await this.sendInstructionBreakpoints();
            }
            else {
                await this.sendExceptionBreakpoints();
            }
        }
        else {
            this.model.enableOrDisableAllBreakpoints(enable);
            this.debugStorage.storeBreakpoints(this.model);
            await this.sendAllBreakpoints();
        }
        this.debugStorage.storeBreakpoints(this.model);
    }
    async addBreakpoints(uri, rawBreakpoints, ariaAnnounce = true) {
        const breakpoints = this.model.addBreakpoints(uri, rawBreakpoints);
        if (ariaAnnounce) {
            breakpoints.forEach(bp => aria.status(nls.localize('breakpointAdded', "Added breakpoint, line {0}, file {1}", bp.lineNumber, uri.fsPath)));
        }
        // In some cases we need to store breakpoints before we send them because sending them can take a long time
        // And after sending them because the debug adapter can attach adapter data to a breakpoint
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendBreakpoints(uri);
        this.debugStorage.storeBreakpoints(this.model);
        return breakpoints;
    }
    async updateBreakpoints(uri, data, sendOnResourceSaved) {
        this.model.updateBreakpoints(data);
        this.debugStorage.storeBreakpoints(this.model);
        if (sendOnResourceSaved) {
            this.breakpointsToSendOnResourceSaved.add(uri);
        }
        else {
            await this.sendBreakpoints(uri);
            this.debugStorage.storeBreakpoints(this.model);
        }
    }
    async removeBreakpoints(id) {
        const breakpoints = this.model.getBreakpoints();
        const toRemove = breakpoints.filter(bp => !id || bp.getId() === id);
        // note: using the debugger-resolved uri for aria to reflect UI state
        toRemove.forEach(bp => aria.status(nls.localize('breakpointRemoved', "Removed breakpoint, line {0}, file {1}", bp.lineNumber, bp.uri.fsPath)));
        const urisToClear = new Set(toRemove.map(bp => bp.originalUri.toString()));
        this.model.removeBreakpoints(toRemove);
        this.unlinkTriggeredBreakpoints(breakpoints, toRemove).forEach(uri => urisToClear.add(uri.toString()));
        this.debugStorage.storeBreakpoints(this.model);
        await Promise.all([...urisToClear].map(uri => this.sendBreakpoints(URI.parse(uri))));
    }
    setBreakpointsActivated(activated) {
        this.model.setBreakpointsActivated(activated);
        return this.sendAllBreakpoints();
    }
    async addFunctionBreakpoint(opts, id) {
        this.model.addFunctionBreakpoint(opts ?? { name: '' }, id);
        // If opts not provided, sending the breakpoint is handled by a later to call to `updateFunctionBreakpoint`
        if (opts) {
            this.debugStorage.storeBreakpoints(this.model);
            await this.sendFunctionBreakpoints();
            this.debugStorage.storeBreakpoints(this.model);
        }
    }
    async updateFunctionBreakpoint(id, update) {
        this.model.updateFunctionBreakpoint(id, update);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendFunctionBreakpoints();
    }
    async removeFunctionBreakpoints(id) {
        this.model.removeFunctionBreakpoints(id);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendFunctionBreakpoints();
    }
    async addDataBreakpoint(opts) {
        this.model.addDataBreakpoint(opts);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendDataBreakpoints();
        this.debugStorage.storeBreakpoints(this.model);
    }
    async updateDataBreakpoint(id, update) {
        this.model.updateDataBreakpoint(id, update);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendDataBreakpoints();
    }
    async removeDataBreakpoints(id) {
        this.model.removeDataBreakpoints(id);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendDataBreakpoints();
    }
    async addInstructionBreakpoint(opts) {
        this.model.addInstructionBreakpoint(opts);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendInstructionBreakpoints();
        this.debugStorage.storeBreakpoints(this.model);
    }
    async removeInstructionBreakpoints(instructionReference, offset) {
        this.model.removeInstructionBreakpoints(instructionReference, offset);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendInstructionBreakpoints();
    }
    setExceptionBreakpointFallbackSession(sessionId) {
        this.model.setExceptionBreakpointFallbackSession(sessionId);
        this.debugStorage.storeBreakpoints(this.model);
    }
    setExceptionBreakpointsForSession(session, filters) {
        this.model.setExceptionBreakpointsForSession(session.getId(), filters);
        this.debugStorage.storeBreakpoints(this.model);
    }
    async setExceptionBreakpointCondition(exceptionBreakpoint, condition) {
        this.model.setExceptionBreakpointCondition(exceptionBreakpoint, condition);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendExceptionBreakpoints();
    }
    async sendAllBreakpoints(session) {
        const setBreakpointsPromises = distinct(this.model.getBreakpoints(), bp => bp.originalUri.toString())
            .map(bp => this.sendBreakpoints(bp.originalUri, false, session));
        // If sending breakpoints to one session which we know supports the configurationDone request, can make all requests in parallel
        if (session?.capabilities.supportsConfigurationDoneRequest) {
            await Promise.all([
                ...setBreakpointsPromises,
                this.sendFunctionBreakpoints(session),
                this.sendDataBreakpoints(session),
                this.sendInstructionBreakpoints(session),
                this.sendExceptionBreakpoints(session),
            ]);
        }
        else {
            await Promise.all(setBreakpointsPromises);
            await this.sendFunctionBreakpoints(session);
            await this.sendDataBreakpoints(session);
            await this.sendInstructionBreakpoints(session);
            // send exception breakpoints at the end since some debug adapters may rely on the order - this was the case before
            // the configurationDone request was introduced.
            await this.sendExceptionBreakpoints(session);
        }
    }
    /**
     * Removes the condition of triggered breakpoints that depended on
     * breakpoints in `removedBreakpoints`. Returns the URIs of resources that
     * had their breakpoints changed in this way.
     */
    unlinkTriggeredBreakpoints(allBreakpoints, removedBreakpoints) {
        const affectedUris = [];
        for (const removed of removedBreakpoints) {
            for (const existing of allBreakpoints) {
                if (!removedBreakpoints.includes(existing) && existing.triggeredBy === removed.getId()) {
                    this.model.updateBreakpoints(new Map([[existing.getId(), { triggeredBy: undefined }]]));
                    affectedUris.push(existing.originalUri);
                }
            }
        }
        return affectedUris;
    }
    async makeTriggeredBreakpointsMatchEnablement(enable, breakpoint) {
        if (enable) {
            /** If the breakpoint is being enabled, also ensure its triggerer is enabled */
            if (breakpoint.triggeredBy) {
                const trigger = this.model.getBreakpoints().find(bp => breakpoint.triggeredBy === bp.getId());
                if (trigger && !trigger.enabled) {
                    await this.enableOrDisableBreakpoints(enable, trigger);
                }
            }
        }
        /** Makes its triggeree states match the state of this breakpoint */
        await Promise.all(this.model.getBreakpoints()
            .filter(bp => bp.triggeredBy === breakpoint.getId() && bp.enabled !== enable)
            .map(bp => this.enableOrDisableBreakpoints(enable, bp)));
    }
    async sendBreakpoints(modelUri, sourceModified = false, session) {
        const breakpointsToSend = this.model.getBreakpoints({ originalUri: modelUri, enabledOnly: true });
        await sendToOneOrAllSessions(this.model, session, async (s) => {
            if (!s.configuration.noDebug) {
                const sessionBps = breakpointsToSend.filter(bp => !bp.triggeredBy || bp.getSessionDidTrigger(s.getId()));
                await s.sendBreakpoints(modelUri, sessionBps, sourceModified);
            }
        });
    }
    async sendFunctionBreakpoints(session) {
        const breakpointsToSend = this.model.getFunctionBreakpoints().filter(fbp => fbp.enabled && this.model.areBreakpointsActivated());
        await sendToOneOrAllSessions(this.model, session, async (s) => {
            if (s.capabilities.supportsFunctionBreakpoints && !s.configuration.noDebug) {
                await s.sendFunctionBreakpoints(breakpointsToSend);
            }
        });
    }
    async sendDataBreakpoints(session) {
        const breakpointsToSend = this.model.getDataBreakpoints().filter(fbp => fbp.enabled && this.model.areBreakpointsActivated());
        await sendToOneOrAllSessions(this.model, session, async (s) => {
            if (s.capabilities.supportsDataBreakpoints && !s.configuration.noDebug) {
                await s.sendDataBreakpoints(breakpointsToSend);
            }
        });
    }
    async sendInstructionBreakpoints(session) {
        const breakpointsToSend = this.model.getInstructionBreakpoints().filter(fbp => fbp.enabled && this.model.areBreakpointsActivated());
        await sendToOneOrAllSessions(this.model, session, async (s) => {
            if (s.capabilities.supportsInstructionBreakpoints && !s.configuration.noDebug) {
                await s.sendInstructionBreakpoints(breakpointsToSend);
            }
        });
    }
    sendExceptionBreakpoints(session) {
        return sendToOneOrAllSessions(this.model, session, async (s) => {
            const enabledExceptionBps = this.model.getExceptionBreakpointsForSession(s.getId()).filter(exb => exb.enabled);
            if (s.capabilities.supportsConfigurationDoneRequest && (!s.capabilities.exceptionBreakpointFilters || s.capabilities.exceptionBreakpointFilters.length === 0)) {
                // Only call `setExceptionBreakpoints` as specified in dap protocol #90001
                return;
            }
            if (!s.configuration.noDebug) {
                await s.sendExceptionBreakpoints(enabledExceptionBps);
            }
        });
    }
    onFileChanges(fileChangesEvent) {
        const toRemove = this.model.getBreakpoints().filter(bp => fileChangesEvent.contains(bp.originalUri, 2 /* FileChangeType.DELETED */));
        if (toRemove.length) {
            this.model.removeBreakpoints(toRemove);
        }
        const toSend = [];
        for (const uri of this.breakpointsToSendOnResourceSaved) {
            if (fileChangesEvent.contains(uri, 0 /* FileChangeType.UPDATED */)) {
                toSend.push(uri);
            }
        }
        for (const uri of toSend) {
            this.breakpointsToSendOnResourceSaved.delete(uri);
            this.sendBreakpoints(uri, true);
        }
    }
    async runTo(uri, lineNumber, column) {
        let breakpointToRemove;
        let threadToContinue = this.getViewModel().focusedThread;
        const addTempBreakPoint = async () => {
            const bpExists = !!(this.getModel().getBreakpoints({ column, lineNumber, uri }).length);
            if (!bpExists) {
                const addResult = await this.addAndValidateBreakpoints(uri, lineNumber, column);
                if (addResult.thread) {
                    threadToContinue = addResult.thread;
                }
                if (addResult.breakpoint) {
                    breakpointToRemove = addResult.breakpoint;
                }
            }
            return { threadToContinue, breakpointToRemove };
        };
        const removeTempBreakPoint = (state) => {
            if (state === 2 /* State.Stopped */ || state === 0 /* State.Inactive */) {
                if (breakpointToRemove) {
                    this.removeBreakpoints(breakpointToRemove.getId());
                }
                return true;
            }
            return false;
        };
        await addTempBreakPoint();
        if (this.state === 0 /* State.Inactive */) {
            // If no session exists start the debugger
            const { launch, name, getConfig } = this.getConfigurationManager().selectedConfiguration;
            const config = await getConfig();
            const configOrName = config ? Object.assign(deepClone(config), {}) : name;
            const listener = this.onDidChangeState(state => {
                if (removeTempBreakPoint(state)) {
                    listener.dispose();
                }
            });
            await this.startDebugging(launch, configOrName, undefined, true);
        }
        if (this.state === 2 /* State.Stopped */) {
            const focusedSession = this.getViewModel().focusedSession;
            if (!focusedSession || !threadToContinue) {
                return;
            }
            const listener = threadToContinue.session.onDidChangeState(() => {
                if (removeTempBreakPoint(focusedSession.state)) {
                    listener.dispose();
                }
            });
            await threadToContinue.continue();
        }
    }
    async addAndValidateBreakpoints(uri, lineNumber, column) {
        const debugModel = this.getModel();
        const viewModel = this.getViewModel();
        const breakpoints = await this.addBreakpoints(uri, [{ lineNumber, column }], false);
        const breakpoint = breakpoints?.[0];
        if (!breakpoint) {
            return { breakpoint: undefined, thread: viewModel.focusedThread };
        }
        // If the breakpoint was not initially verified, wait up to 2s for it to become so.
        // Inherently racey if multiple sessions can verify async, but not solvable...
        if (!breakpoint.verified) {
            let listener;
            await raceTimeout(new Promise(resolve => {
                listener = debugModel.onDidChangeBreakpoints(() => {
                    if (breakpoint.verified) {
                        resolve();
                    }
                });
            }), 2000);
            listener.dispose();
        }
        // Look at paused threads for sessions that verified this bp. Prefer, in order:
        let Score;
        (function (Score) {
            /** The focused thread */
            Score[Score["Focused"] = 0] = "Focused";
            /** Any other stopped thread of a session that verified the bp */
            Score[Score["Verified"] = 1] = "Verified";
            /** Any thread that verified and paused in the same file */
            Score[Score["VerifiedAndPausedInFile"] = 2] = "VerifiedAndPausedInFile";
            /** The focused thread if it verified the breakpoint */
            Score[Score["VerifiedAndFocused"] = 3] = "VerifiedAndFocused";
        })(Score || (Score = {}));
        let bestThread = viewModel.focusedThread;
        let bestScore = 0 /* Score.Focused */;
        for (const sessionId of breakpoint.sessionsThatVerified) {
            const session = debugModel.getSession(sessionId);
            if (!session) {
                continue;
            }
            const threads = session.getAllThreads().filter(t => t.stopped);
            if (bestScore < 3 /* Score.VerifiedAndFocused */) {
                if (viewModel.focusedThread && threads.includes(viewModel.focusedThread)) {
                    bestThread = viewModel.focusedThread;
                    bestScore = 3 /* Score.VerifiedAndFocused */;
                }
            }
            if (bestScore < 2 /* Score.VerifiedAndPausedInFile */) {
                const pausedInThisFile = threads.find(t => {
                    const top = t.getTopStackFrame();
                    return top && this.uriIdentityService.extUri.isEqual(top.source.uri, uri);
                });
                if (pausedInThisFile) {
                    bestThread = pausedInThisFile;
                    bestScore = 2 /* Score.VerifiedAndPausedInFile */;
                }
            }
            if (bestScore < 1 /* Score.Verified */) {
                bestThread = threads[0];
                bestScore = 2 /* Score.VerifiedAndPausedInFile */;
            }
        }
        return { thread: bestThread, breakpoint };
    }
};
DebugService = __decorate([
    __param(0, IEditorService),
    __param(1, IPaneCompositePartService),
    __param(2, IViewsService),
    __param(3, IViewDescriptorService),
    __param(4, INotificationService),
    __param(5, IDialogService),
    __param(6, IWorkbenchLayoutService),
    __param(7, IWorkspaceContextService),
    __param(8, IContextKeyService),
    __param(9, ILifecycleService),
    __param(10, IInstantiationService),
    __param(11, IExtensionService),
    __param(12, IFileService),
    __param(13, IConfigurationService),
    __param(14, IExtensionHostDebugService),
    __param(15, IActivityService),
    __param(16, ICommandService),
    __param(17, IQuickInputService),
    __param(18, IWorkspaceTrustRequestService),
    __param(19, IUriIdentityService),
    __param(20, ITestService)
], DebugService);
export { DebugService };
export function getStackFrameThreadAndSessionToFocus(model, stackFrame, thread, session, avoidSession) {
    if (!session) {
        if (stackFrame || thread) {
            session = stackFrame ? stackFrame.thread.session : thread.session;
        }
        else {
            const sessions = model.getSessions();
            const stoppedSession = sessions.find(s => s.state === 2 /* State.Stopped */);
            // Make sure to not focus session that is going down
            session = stoppedSession || sessions.find(s => s !== avoidSession && s !== avoidSession?.parentSession) || (sessions.length ? sessions[0] : undefined);
        }
    }
    if (!thread) {
        if (stackFrame) {
            thread = stackFrame.thread;
        }
        else {
            const threads = session ? session.getAllThreads() : undefined;
            const stoppedThread = threads && threads.find(t => t.stopped);
            thread = stoppedThread || (threads && threads.length ? threads[0] : undefined);
        }
    }
    if (!stackFrame && thread) {
        stackFrame = thread.getTopStackFrame();
    }
    return { session, thread, stackFrame };
}
async function sendToOneOrAllSessions(model, session, send) {
    if (session) {
        await send(session);
    }
    else {
        await Promise.all(model.getSessions().map(s => send(s)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSwwQ0FBMEMsQ0FBQztBQUNqRSxPQUFPLEVBQVcsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM3RSxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFdkUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBYyxNQUFNLGdDQUFnQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFM0UsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxP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