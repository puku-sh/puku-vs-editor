/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mark } from '../../base/common/performance.js';
import { domContentLoaded, detectFullscreen, getCookieValue, getWindow } from '../../base/browser/dom.js';
import { assertReturnsDefined } from '../../base/common/types.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ILogService, ConsoleLogger, getLogLevel, ILoggerService } from '../../platform/log/common/log.js';
import { ConsoleLogInAutomationLogger } from '../../platform/log/browser/log.js';
import { Disposable, DisposableStore, toDisposable } from '../../base/common/lifecycle.js';
import { BrowserWorkbenchEnvironmentService, IBrowserWorkbenchEnvironmentService } from '../services/environment/browser/environmentService.js';
import { Workbench } from './workbench.js';
import { RemoteFileSystemProviderClient } from '../services/remote/common/remoteFileSystemProviderClient.js';
import { IProductService } from '../../platform/product/common/productService.js';
import product from '../../platform/product/common/product.js';
import { RemoteAgentService } from '../services/remote/browser/remoteAgentService.js';
import { RemoteAuthorityResolverService } from '../../platform/remote/browser/remoteAuthorityResolverService.js';
import { IRemoteAuthorityResolverService } from '../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteAgentService } from '../services/remote/common/remoteAgentService.js';
import { IFileService } from '../../platform/files/common/files.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { Schemas, connectionTokenCookieName } from '../../base/common/network.js';
import { IWorkspaceContextService, UNKNOWN_EMPTY_WINDOW_WORKSPACE, isTemporaryWorkspace, isWorkspaceIdentifier } from '../../platform/workspace/common/workspace.js';
import { IWorkbenchConfigurationService } from '../services/configuration/common/configuration.js';
import { onUnexpectedError } from '../../base/common/errors.js';
import { setFullscreen } from '../../base/browser/browser.js';
import { URI } from '../../base/common/uri.js';
import { WorkspaceService } from '../services/configuration/browser/configurationService.js';
import { ConfigurationCache } from '../services/configuration/common/configurationCache.js';
import { ISignService } from '../../platform/sign/common/sign.js';
import { SignService } from '../../platform/sign/browser/signService.js';
import { BrowserStorageService } from '../services/storage/browser/storageService.js';
import { IStorageService } from '../../platform/storage/common/storage.js';
import { toLocalISOString } from '../../base/common/date.js';
import { isWorkspaceToOpen, isFolderToOpen } from '../../platform/window/common/window.js';
import { getSingleFolderWorkspaceIdentifier, getWorkspaceIdentifier } from '../services/workspaces/browser/workspaces.js';
import { InMemoryFileSystemProvider } from '../../platform/files/common/inMemoryFilesystemProvider.js';
import { ICommandService } from '../../platform/commands/common/commands.js';
import { IndexedDBFileSystemProvider } from '../../platform/files/browser/indexedDBFileSystemProvider.js';
import { BrowserRequestService } from '../services/request/browser/requestService.js';
import { IRequestService } from '../../platform/request/common/request.js';
import { IUserDataInitializationService, UserDataInitializationService } from '../services/userData/browser/userDataInit.js';
import { UserDataSyncStoreManagementService } from '../../platform/userDataSync/common/userDataSyncStoreService.js';
import { IUserDataSyncStoreManagementService } from '../../platform/userDataSync/common/userDataSync.js';
import { ILifecycleService } from '../services/lifecycle/common/lifecycle.js';
import { Action2, MenuId, registerAction2 } from '../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { localize, localize2 } from '../../nls.js';
import { Categories } from '../../platform/action/common/actionCommonCategories.js';
import { IDialogService } from '../../platform/dialogs/common/dialogs.js';
import { IHostService } from '../services/host/browser/host.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { BrowserWindow } from './window.js';
import { ITimerService } from '../services/timer/browser/timerService.js';
import { WorkspaceTrustEnablementService, WorkspaceTrustManagementService } from '../services/workspaces/common/workspaceTrust.js';
import { IWorkspaceTrustEnablementService, IWorkspaceTrustManagementService } from '../../platform/workspace/common/workspaceTrust.js';
import { HTMLFileSystemProvider } from '../../platform/files/browser/htmlFileSystemProvider.js';
import { IOpenerService } from '../../platform/opener/common/opener.js';
import { mixin, safeStringify } from '../../base/common/objects.js';
import { IndexedDB } from '../../base/browser/indexedDB.js';
import { WebFileSystemAccess } from '../../platform/files/browser/webFileSystemAccess.js';
import { IProgressService } from '../../platform/progress/common/progress.js';
import { DelayedLogChannel } from '../services/output/common/delayedLogChannel.js';
import { dirname, joinPath } from '../../base/common/resources.js';
import { IUserDataProfilesService } from '../../platform/userDataProfile/common/userDataProfile.js';
import { IPolicyService } from '../../platform/policy/common/policy.js';
import { IRemoteExplorerService } from '../services/remote/common/remoteExplorerService.js';
import { DisposableTunnel, TunnelProtocol } from '../../platform/tunnel/common/tunnel.js';
import { ILabelService } from '../../platform/label/common/label.js';
import { UserDataProfileService } from '../services/userDataProfile/common/userDataProfileService.js';
import { IUserDataProfileService } from '../services/userDataProfile/common/userDataProfile.js';
import { BrowserUserDataProfilesService } from '../../platform/userDataProfile/browser/userDataProfile.js';
import { DeferredPromise, timeout } from '../../base/common/async.js';
import { windowLogGroup, windowLogId } from '../services/log/common/logConstants.js';
import { LogService } from '../../platform/log/common/logService.js';
import { IRemoteSocketFactoryService, RemoteSocketFactoryService } from '../../platform/remote/common/remoteSocketFactoryService.js';
import { BrowserSocketFactory } from '../../platform/remote/browser/browserSocketFactory.js';
import { VSBuffer } from '../../base/common/buffer.js';
import { UserDataProfileInitializer } from '../services/userDataProfile/browser/userDataProfileInit.js';
import { UserDataSyncInitializer } from '../services/userDataSync/browser/userDataSyncInit.js';
import { BrowserRemoteResourceLoader } from '../services/remote/browser/browserRemoteResourceHandler.js';
import { BufferLogger } from '../../platform/log/common/bufferLog.js';
import { FileLoggerService } from '../../platform/log/common/fileLog.js';
import { IEmbedderTerminalService } from '../services/terminal/common/embedderTerminalService.js';
import { BrowserSecretStorageService } from '../services/secrets/browser/secretStorageService.js';
import { EncryptionService } from '../services/encryption/browser/encryptionService.js';
import { IEncryptionService } from '../../platform/encryption/common/encryptionService.js';
import { ISecretStorageService } from '../../platform/secrets/common/secrets.js';
import { TunnelSource } from '../services/remote/common/tunnelModel.js';
import { mainWindow } from '../../base/browser/window.js';
import { INotificationService, Severity } from '../../platform/notification/common/notification.js';
import { DefaultAccountService, IDefaultAccountService } from '../services/accounts/common/defaultAccount.js';
import { AccountPolicyService } from '../services/policies/common/accountPolicyService.js';
export class BrowserMain extends Disposable {
    constructor(domElement, configuration) {
        super();
        this.domElement = domElement;
        this.configuration = configuration;
        this.onWillShutdownDisposables = this._register(new DisposableStore());
        this.indexedDBFileSystemProviders = [];
        this.init();
    }
    init() {
        // Browser config
        setFullscreen(!!detectFullscreen(mainWindow), mainWindow);
    }
    async open() {
        // Init services and wait for DOM to be ready in parallel
        const [services] = await Promise.all([this.initServices(), domContentLoaded(getWindow(this.domElement))]);
        // Create Workbench
        const workbench = new Workbench(this.domElement, undefined, services.serviceCollection, services.logService);
        // Listeners
        this.registerListeners(workbench);
        // Startup
        const instantiationService = workbench.startup();
        // Window
        this._register(instantiationService.createInstance(BrowserWindow));
        // Logging
        services.logService.trace('workbench#open with configuration', safeStringify(this.configuration));
        // Return API Facade
        return instantiationService.invokeFunction(accessor => {
            const commandService = accessor.get(ICommandService);
            const lifecycleService = accessor.get(ILifecycleService);
            const timerService = accessor.get(ITimerService);
            const openerService = accessor.get(IOpenerService);
            const productService = accessor.get(IProductService);
            const progressService = accessor.get(IProgressService);
            const environmentService = accessor.get(IBrowserWorkbenchEnvironmentService);
            const instantiationService = accessor.get(IInstantiationService);
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            const labelService = accessor.get(ILabelService);
            const embedderTerminalService = accessor.get(IEmbedderTerminalService);
            const remoteAuthorityResolverService = accessor.get(IRemoteAuthorityResolverService);
            const notificationService = accessor.get(INotificationService);
            async function showMessage(severity, message, ...items) {
                const choice = new DeferredPromise();
                const handle = notificationService.prompt(severity, message, items.map(item => ({
                    label: item,
                    run: () => choice.complete(item)
                })));
                const disposable = handle.onDidClose(() => {
                    choice.complete(undefined);
                    disposable.dispose();
                });
                const result = await choice.p;
                handle.close();
                return result;
            }
            let logger = undefined;
            return {
                commands: {
                    executeCommand: (command, ...args) => commandService.executeCommand(command, ...args)
                },
                env: {
                    async getUriScheme() {
                        return productService.urlProtocol;
                    },
                    async retrievePerformanceMarks() {
                        await timerService.whenReady();
                        return timerService.getPerformanceMarks();
                    },
                    async openUri(uri) {
                        return openerService.open(URI.isUri(uri) ? uri : URI.from(uri), {});
                    }
                },
                logger: {
                    log: (level, message) => {
                        if (!logger) {
                            logger = instantiationService.createInstance(DelayedLogChannel, 'webEmbedder', productService.embedderIdentifier || productService.nameShort, joinPath(dirname(environmentService.logFile), 'webEmbedder.log'));
                        }
                        logger.log(level, message);
                    }
                },
                window: {
                    withProgress: (options, task) => progressService.withProgress(options, task),
                    createTerminal: async (options) => embedderTerminalService.createTerminal(options),
                    showInformationMessage: (message, ...items) => showMessage(Severity.Info, message, ...items),
                },
                workspace: {
                    didResolveRemoteAuthority: async () => {
                        if (!this.configuration.remoteAuthority) {
                            return;
                        }
                        await remoteAuthorityResolverService.resolveAuthority(this.configuration.remoteAuthority);
                    },
                    openTunnel: async (tunnelOptions) => {
                        const tunnel = assertReturnsDefined(await remoteExplorerService.forward({
                            remote: tunnelOptions.remoteAddress,
                            local: tunnelOptions.localAddressPort,
                            name: tunnelOptions.label,
                            source: {
                                source: TunnelSource.Extension,
                                description: labelService.getHostLabel(Schemas.vscodeRemote, this.configuration.remoteAuthority)
                            },
                            elevateIfNeeded: false,
                            privacy: tunnelOptions.privacy
                        }, {
                            label: tunnelOptions.label,
                            elevateIfNeeded: undefined,
                            onAutoForward: undefined,
                            requireLocalPort: undefined,
                            protocol: tunnelOptions.protocol === TunnelProtocol.Https ? tunnelOptions.protocol : TunnelProtocol.Http
                        }));
                        if (typeof tunnel === 'string') {
                            throw new Error(tunnel);
                        }
                        return new class extends DisposableTunnel {
                        }({
                            port: tunnel.tunnelRemotePort,
                            host: tunnel.tunnelRemoteHost
                        }, tunnel.localAddress, () => tunnel.dispose());
                    }
                },
                shutdown: () => lifecycleService.shutdown()
            };
        });
    }
    registerListeners(workbench) {
        // Workbench Lifecycle
        this._register(workbench.onWillShutdown(() => this.onWillShutdownDisposables.clear()));
        this._register(workbench.onDidShutdown(() => this.dispose()));
    }
    async initServices() {
        const serviceCollection = new ServiceCollection();
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.web.main.ts` if the service
        //       is web only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        const workspace = this.resolveWorkspace();
        // Product
        const productService = mixin({ _serviceBrand: undefined, ...product }, this.configuration.productConfiguration);
        serviceCollection.set(IProductService, productService);
        // Environment
        const logsPath = URI.file(toLocalISOString(new Date()).replace(/-|:|\.\d+Z$/g, '')).with({ scheme: 'vscode-log' });
        const environmentService = new BrowserWorkbenchEnvironmentService(workspace.id, logsPath, this.configuration, productService);
        serviceCollection.set(IBrowserWorkbenchEnvironmentService, environmentService);
        // Files
        const fileLogger = new BufferLogger();
        const fileService = this._register(new FileService(fileLogger));
        serviceCollection.set(IFileService, fileService);
        // Logger
        const loggerService = new FileLoggerService(getLogLevel(environmentService), logsPath, fileService);
        serviceCollection.set(ILoggerService, loggerService);
        // Log Service
        const otherLoggers = [new ConsoleLogger(loggerService.getLogLevel())];
        if (environmentService.isExtensionDevelopment && !!environmentService.extensionTestsLocationURI) {
            otherLoggers.push(new ConsoleLogInAutomationLogger(loggerService.getLogLevel()));
        }
        const logger = loggerService.createLogger(environmentService.logFile, { id: windowLogId, name: windowLogGroup.name, group: windowLogGroup });
        const logService = new LogService(logger, otherLoggers);
        serviceCollection.set(ILogService, logService);
        // Set the logger of the fileLogger after the log service is ready.
        // This is to avoid cyclic dependency
        fileLogger.logger = logService;
        // Register File System Providers depending on IndexedDB support
        // Register them early because they are needed for the profiles initialization
        await this.registerIndexedDBFileSystemProviders(environmentService, fileService, logService, loggerService, logsPath);
        const connectionToken = environmentService.options.connectionToken || getCookieValue(connectionTokenCookieName);
        const remoteResourceLoader = this.configuration.remoteResourceProvider ? new BrowserRemoteResourceLoader(fileService, this.configuration.remoteResourceProvider) : undefined;
        const resourceUriProvider = this.configuration.resourceUriProvider ?? remoteResourceLoader?.getResourceUriProvider();
        const remoteAuthorityResolverService = new RemoteAuthorityResolverService(!environmentService.expectsResolverExtension, connectionToken, resourceUriProvider, this.configuration.serverBasePath, productService, logService);
        serviceCollection.set(IRemoteAuthorityResolverService, remoteAuthorityResolverService);
        // Signing
        const signService = new SignService(productService);
        serviceCollection.set(ISignService, signService);
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.web.main.ts` if the service
        //       is web only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // URI Identity
        const uriIdentityService = new UriIdentityService(fileService);
        serviceCollection.set(IUriIdentityService, uriIdentityService);
        // User Data Profiles
        const userDataProfilesService = new BrowserUserDataProfilesService(environmentService, fileService, uriIdentityService, logService);
        serviceCollection.set(IUserDataProfilesService, userDataProfilesService);
        const currentProfile = await this.getCurrentProfile(workspace, userDataProfilesService, environmentService);
        await userDataProfilesService.setProfileForWorkspace(workspace, currentProfile);
        const userDataProfileService = new UserDataProfileService(currentProfile);
        serviceCollection.set(IUserDataProfileService, userDataProfileService);
        // Remote Agent
        const remoteSocketFactoryService = new RemoteSocketFactoryService();
        remoteSocketFactoryService.register(0 /* RemoteConnectionType.WebSocket */, new BrowserSocketFactory(this.configuration.webSocketFactory));
        serviceCollection.set(IRemoteSocketFactoryService, remoteSocketFactoryService);
        const remoteAgentService = this._register(new RemoteAgentService(remoteSocketFactoryService, userDataProfileService, environmentService, productService, remoteAuthorityResolverService, signService, logService));
        serviceCollection.set(IRemoteAgentService, remoteAgentService);
        this._register(RemoteFileSystemProviderClient.register(remoteAgentService, fileService, logService));
        // Default Account
        const defaultAccountService = this._register(new DefaultAccountService());
        serviceCollection.set(IDefaultAccountService, defaultAccountService);
        // Policies
        const policyService = new AccountPolicyService(logService, defaultAccountService);
        serviceCollection.set(IPolicyService, policyService);
        // Long running services (workspace, config, storage)
        const [configurationService, storageService] = await Promise.all([
            this.createWorkspaceService(workspace, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, policyService, logService).then(service => {
                // Workspace
                serviceCollection.set(IWorkspaceContextService, service);
                // Configuration
                serviceCollection.set(IWorkbenchConfigurationService, service);
                return service;
            }),
            this.createStorageService(workspace, logService, userDataProfileService).then(service => {
                // Storage
                serviceCollection.set(IStorageService, service);
                return service;
            })
        ]);
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.web.main.ts` if the service
        //       is web only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // Workspace Trust Service
        const workspaceTrustEnablementService = new WorkspaceTrustEnablementService(configurationService, environmentService);
        serviceCollection.set(IWorkspaceTrustEnablementService, workspaceTrustEnablementService);
        const workspaceTrustManagementService = new WorkspaceTrustManagementService(configurationService, remoteAuthorityResolverService, storageService, uriIdentityService, environmentService, configurationService, workspaceTrustEnablementService, fileService);
        serviceCollection.set(IWorkspaceTrustManagementService, workspaceTrustManagementService);
        // Update workspace trust so that configuration is updated accordingly
        configurationService.updateWorkspaceTrust(workspaceTrustManagementService.isWorkspaceTrusted());
        this._register(workspaceTrustManagementService.onDidChangeTrust(() => configurationService.updateWorkspaceTrust(workspaceTrustManagementService.isWorkspaceTrusted())));
        // Request Service
        const requestService = new BrowserRequestService(remoteAgentService, configurationService, loggerService);
        serviceCollection.set(IRequestService, requestService);
        // Userdata Sync Store Management Service
        const userDataSyncStoreManagementService = new UserDataSyncStoreManagementService(productService, configurationService, storageService);
        serviceCollection.set(IUserDataSyncStoreManagementService, userDataSyncStoreManagementService);
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.web.main.ts` if the service
        //       is web only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        const encryptionService = new EncryptionService();
        serviceCollection.set(IEncryptionService, encryptionService);
        const secretStorageService = new BrowserSecretStorageService(storageService, encryptionService, environmentService, logService);
        serviceCollection.set(ISecretStorageService, secretStorageService);
        // Userdata Initialize Service
        const userDataInitializers = [];
        userDataInitializers.push(new UserDataSyncInitializer(environmentService, secretStorageService, userDataSyncStoreManagementService, fileService, userDataProfilesService, storageService, productService, requestService, logService, uriIdentityService));
        if (environmentService.options.profile) {
            userDataInitializers.push(new UserDataProfileInitializer(environmentService, fileService, userDataProfileService, storageService, logService, uriIdentityService, requestService));
        }
        const userDataInitializationService = new UserDataInitializationService(userDataInitializers);
        serviceCollection.set(IUserDataInitializationService, userDataInitializationService);
        try {
            await Promise.race([
                // Do not block more than 5s
                timeout(5000),
                this.initializeUserData(userDataInitializationService, configurationService)
            ]);
        }
        catch (error) {
            logService.error(error);
        }
        return { serviceCollection, configurationService, logService };
    }
    async initializeUserData(userDataInitializationService, configurationService) {
        if (await userDataInitializationService.requiresInitialization()) {
            mark('code/willInitRequiredUserData');
            // Initialize required resources - settings & global state
            await userDataInitializationService.initializeRequiredResources();
            // Important: Reload only local user configuration after initializing
            // Reloading complete configuration blocks workbench until remote configuration is loaded.
            await configurationService.reloadLocalUserConfiguration();
            mark('code/didInitRequiredUserData');
        }
    }
    async registerIndexedDBFileSystemProviders(environmentService, fileService, logService, loggerService, logsPath) {
        // IndexedDB is used for logging and user data
        let indexedDB;
        const userDataStore = 'vscode-userdata-store';
        const logsStore = 'vscode-logs-store';
        const handlesStore = 'vscode-filehandles-store';
        try {
            indexedDB = await IndexedDB.create('vscode-web-db', 3, [userDataStore, logsStore, handlesStore]);
            // Close onWillShutdown
            this.onWillShutdownDisposables.add(toDisposable(() => indexedDB?.close()));
        }
        catch (error) {
            logService.error('Error while creating IndexedDB', error);
        }
        // Logger
        if (indexedDB) {
            const logFileSystemProvider = new IndexedDBFileSystemProvider(logsPath.scheme, indexedDB, logsStore, false);
            this.indexedDBFileSystemProviders.push(logFileSystemProvider);
            fileService.registerProvider(logsPath.scheme, logFileSystemProvider);
        }
        else {
            fileService.registerProvider(logsPath.scheme, new InMemoryFileSystemProvider());
        }
        // User data
        let userDataProvider;
        if (indexedDB) {
            userDataProvider = new IndexedDBFileSystemProvider(Schemas.vscodeUserData, indexedDB, userDataStore, true);
            this.indexedDBFileSystemProviders.push(userDataProvider);
            this.registerDeveloperActions(userDataProvider);
        }
        else {
            logService.info('Using in-memory user data provider');
            userDataProvider = new InMemoryFileSystemProvider();
        }
        fileService.registerProvider(Schemas.vscodeUserData, userDataProvider);
        // Local file access (if supported by browser)
        if (WebFileSystemAccess.supported(mainWindow)) {
            fileService.registerProvider(Schemas.file, new HTMLFileSystemProvider(indexedDB, handlesStore, logService));
        }
        // In-memory
        fileService.registerProvider(Schemas.tmp, new InMemoryFileSystemProvider());
    }
    registerDeveloperActions(provider) {
        this._register(registerAction2(class ResetUserDataAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.resetUserData',
                    title: localize2('reset', "Reset User Data"),
                    category: Categories.Developer,
                    menu: {
                        id: MenuId.CommandPalette
                    }
                });
            }
            async run(accessor) {
                const dialogService = accessor.get(IDialogService);
                const hostService = accessor.get(IHostService);
                const storageService = accessor.get(IStorageService);
                const logService = accessor.get(ILogService);
                const result = await dialogService.confirm({
                    message: localize('reset user data message', "Would you like to reset your data (settings, keybindings, extensions, snippets and UI State) and reload?")
                });
                if (result.confirmed) {
                    try {
                        await provider?.reset();
                        if (storageService instanceof BrowserStorageService) {
                            await storageService.clear();
                        }
                    }
                    catch (error) {
                        logService.error(error);
                        throw error;
                    }
                }
                hostService.reload();
            }
        }));
    }
    async createStorageService(workspace, logService, userDataProfileService) {
        const storageService = new BrowserStorageService(workspace, userDataProfileService, logService);
        try {
            await storageService.initialize();
            // Register to close on shutdown
            this.onWillShutdownDisposables.add(toDisposable(() => storageService.close()));
            return storageService;
        }
        catch (error) {
            onUnexpectedError(error);
            logService.error(error);
            return storageService;
        }
    }
    async createWorkspaceService(workspace, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, policyService, logService) {
        // Temporary workspaces do not exist on startup because they are
        // just in memory. As such, detect this case and eagerly create
        // the workspace file empty so that it is a valid workspace.
        if (isWorkspaceIdentifier(workspace) && isTemporaryWorkspace(workspace.configPath)) {
            try {
                const emptyWorkspace = { folders: [] };
                await fileService.createFile(workspace.configPath, VSBuffer.fromString(JSON.stringify(emptyWorkspace, null, '\t')), { overwrite: false });
            }
            catch (error) {
                // ignore if workspace file already exists
            }
        }
        const configurationCache = new ConfigurationCache([Schemas.file, Schemas.vscodeUserData, Schemas.tmp] /* Cache all non native resources */, environmentService, fileService);
        const workspaceService = new WorkspaceService({ remoteAuthority: this.configuration.remoteAuthority, configurationCache }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, logService, policyService);
        try {
            await workspaceService.initialize(workspace);
            return workspaceService;
        }
        catch (error) {
            onUnexpectedError(error);
            logService.error(error);
            return workspaceService;
        }
    }
    async getCurrentProfile(workspace, userDataProfilesService, environmentService) {
        const profileName = environmentService.options?.profile?.name ?? environmentService.profile;
        if (profileName) {
            const profile = userDataProfilesService.profiles.find(p => p.name === profileName);
            if (profile) {
                return profile;
            }
            return userDataProfilesService.createNamedProfile(profileName, undefined, workspace);
        }
        return userDataProfilesService.getProfileForWorkspace(workspace) ?? userDataProfilesService.defaultProfile;
    }
    resolveWorkspace() {
        let workspace = undefined;
        if (this.configuration.workspaceProvider) {
            workspace = this.configuration.workspaceProvider.workspace;
        }
        // Multi-root workspace
        if (workspace && isWorkspaceToOpen(workspace)) {
            return getWorkspaceIdentifier(workspace.workspaceUri);
        }
        // Single-folder workspace
        if (workspace && isFolderToOpen(workspace)) {
            return getSingleFolderWorkspaceIdentifier(workspace.folderUri);
        }
        // Empty window workspace
        return UNKNOWN_EMPTY_WINDOW_WORKSPACE;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLm1haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci93ZWIubWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMxRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFXLE1BQU0sa0NBQWtDLENBQUM7QUFDcEgsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0YsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDaEosT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzNDLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRTdHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNsRixPQUFPLE9BQU8sTUFBTSwwQ0FBMEMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztB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