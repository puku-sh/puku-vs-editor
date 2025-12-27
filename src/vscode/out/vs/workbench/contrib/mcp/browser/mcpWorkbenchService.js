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
import { Emitter, Event } from '../../../../base/common/event.js';
import { createCommandUri, MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IMcpGalleryService, mcpAccessConfig, IAllowedMcpServersService } from '../../../../platform/mcp/common/mcpManagement.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IURLService } from '../../../../platform/url/common/url.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { MCP_CONFIGURATION_KEY, WORKSPACE_STANDALONE_CONFIGURATIONS } from '../../../services/configuration/common/configuration.js';
import { ACTIVE_GROUP, IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IWorkbenchMcpManagementService, REMOTE_USER_CONFIG_ID, USER_CONFIG_ID, WORKSPACE_CONFIG_ID, WORKSPACE_FOLDER_CONFIG_ID_PREFIX } from '../../../services/mcp/common/mcpWorkbenchManagementService.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { mcpConfigurationSection } from '../common/mcpConfiguration.js';
import { HasInstalledMcpServersContext, IMcpService, IMcpWorkbenchService, McpServersGalleryStatusContext } from '../common/mcpTypes.js';
import { McpServerEditorInput } from './mcpServerEditorInput.js';
import { IMcpGalleryManifestService } from '../../../../platform/mcp/common/mcpGalleryManifest.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { runOnChange } from '../../../../base/common/observable.js';
import Severity from '../../../../base/common/severity.js';
import { Queue } from '../../../../base/common/async.js';
let McpWorkbenchServer = class McpWorkbenchServer {
    constructor(installStateProvider, runtimeStateProvider, local, gallery, installable, mcpGalleryService, fileService) {
        this.installStateProvider = installStateProvider;
        this.runtimeStateProvider = runtimeStateProvider;
        this.local = local;
        this.gallery = gallery;
        this.installable = installable;
        this.mcpGalleryService = mcpGalleryService;
        this.fileService = fileService;
        this.local = local;
    }
    get id() {
        return this.local?.id ?? this.gallery?.name ?? this.installable?.name ?? this.name;
    }
    get name() {
        return this.gallery?.name ?? this.local?.name ?? this.installable?.name ?? '';
    }
    get label() {
        return this.gallery?.displayName ?? this.local?.displayName ?? this.local?.name ?? this.installable?.name ?? '';
    }
    get icon() {
        return this.gallery?.icon ?? this.local?.icon;
    }
    get installState() {
        return this.installStateProvider(this);
    }
    get codicon() {
        return this.gallery?.codicon ?? this.local?.codicon;
    }
    get publisherDisplayName() {
        return this.gallery?.publisherDisplayName ?? this.local?.publisherDisplayName ?? this.gallery?.publisher ?? this.local?.publisher;
    }
    get publisherUrl() {
        return this.gallery?.publisherDomain?.link;
    }
    get description() {
        return this.gallery?.description ?? this.local?.description ?? '';
    }
    get starsCount() {
        return this.gallery?.starsCount ?? 0;
    }
    get license() {
        return this.gallery?.license;
    }
    get repository() {
        return this.gallery?.repositoryUrl;
    }
    get config() {
        return this.local?.config ?? this.installable?.config;
    }
    get runtimeStatus() {
        return this.runtimeStateProvider(this);
    }
    get readmeUrl() {
        return this.local?.readmeUrl ?? (this.gallery?.readmeUrl ? URI.parse(this.gallery.readmeUrl) : undefined);
    }
    async getReadme(token) {
        if (this.local?.readmeUrl) {
            const content = await this.fileService.readFile(this.local.readmeUrl);
            return content.value.toString();
        }
        if (this.gallery?.readme) {
            return this.gallery.readme;
        }
        if (this.gallery?.readmeUrl) {
            return this.mcpGalleryService.getReadme(this.gallery, token);
        }
        return Promise.reject(new Error('not available'));
    }
    async getManifest(token) {
        if (this.local?.manifest) {
            return this.local.manifest;
        }
        if (this.gallery) {
            return this.gallery.configuration;
        }
        throw new Error('No manifest available');
    }
};
McpWorkbenchServer = __decorate([
    __param(5, IMcpGalleryService),
    __param(6, IFileService)
], McpWorkbenchServer);
let McpWorkbenchService = class McpWorkbenchService extends Disposable {
    get local() { return [...this._local]; }
    constructor(mcpGalleryManifestService, mcpGalleryService, mcpManagementService, editorService, userDataProfilesService, uriIdentityService, workspaceService, environmentService, labelService, productService, remoteAgentService, configurationService, instantiationService, telemetryService, logService, extensionsWorkbenchService, allowedMcpServersService, mcpService, urlService) {
        super();
        this.mcpGalleryService = mcpGalleryService;
        this.mcpManagementService = mcpManagementService;
        this.editorService = editorService;
        this.userDataProfilesService = userDataProfilesService;
        this.uriIdentityService = uriIdentityService;
        this.workspaceService = workspaceService;
        this.environmentService = environmentService;
        this.labelService = labelService;
        this.productService = productService;
        this.remoteAgentService = remoteAgentService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.telemetryService = telemetryService;
        this.logService = logService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.allowedMcpServersService = allowedMcpServersService;
        this.mcpService = mcpService;
        this.installing = [];
        this.uninstalling = [];
        this._local = [];
        this._onChange = this._register(new Emitter());
        this.onChange = this._onChange.event;
        this._onReset = this._register(new Emitter());
        this.onReset = this._onReset.event;
        this._register(this.mcpManagementService.onDidInstallMcpServersInCurrentProfile(e => this.onDidInstallMcpServers(e)));
        this._register(this.mcpManagementService.onDidUpdateMcpServersInCurrentProfile(e => this.onDidUpdateMcpServers(e)));
        this._register(this.mcpManagementService.onDidUninstallMcpServerInCurrentProfile(e => this.onDidUninstallMcpServer(e)));
        this._register(this.mcpManagementService.onDidChangeProfile(e => this.onDidChangeProfile()));
        this.queryLocal().then(() => {
            if (this._store.isDisposed) {
                return;
            }
            const queue = this._register(new Queue());
            this._register(mcpGalleryManifestService.onDidChangeMcpGalleryManifest(e => queue.queue(() => this.syncInstalledMcpServers())));
            queue.queue(() => this.syncInstalledMcpServers());
        });
        urlService.registerHandler(this);
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(mcpAccessConfig)) {
                this._onChange.fire(undefined);
            }
        }));
        this._register(this.allowedMcpServersService.onDidChangeAllowedMcpServers(() => {
            this._local = this.sort(this._local);
            this._onChange.fire(undefined);
        }));
        this._register(runOnChange(mcpService.servers, () => {
            this._local = this.sort(this._local);
            this._onChange.fire(undefined);
        }));
    }
    async onDidChangeProfile() {
        await this.queryLocal();
        this._onChange.fire(undefined);
        this._onReset.fire();
    }
    areSameMcpServers(a, b) {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.name === b.name && a.scope === b.scope;
    }
    onDidUninstallMcpServer(e) {
        if (e.error) {
            return;
        }
        const uninstalled = this._local.find(server => this.areSameMcpServers(server.local, e));
        if (uninstalled) {
            this._local = this._local.filter(server => server !== uninstalled);
            this._onChange.fire(uninstalled);
        }
    }
    onDidInstallMcpServers(e) {
        const servers = [];
        for (const { local, source, name } of e) {
            let server = this.installing.find(server => server.local && local ? this.areSameMcpServers(server.local, local) : server.name === name);
            this.installing = server ? this.installing.filter(e => e !== server) : this.installing;
            if (local) {
                if (server) {
                    server.local = local;
                }
                else {
                    server = this.instantiationService.createInstance(McpWorkbenchServer, e => this.getInstallState(e), e => this.getRuntimeStatus(e), local, source, undefined);
                }
                if (!local.galleryUrl) {
                    server.gallery = undefined;
                }
                this._local = this._local.filter(server => !this.areSameMcpServers(server.local, local));
                this.addServer(server);
            }
            this._onChange.fire(server);
        }
        if (servers.some(server => server.local?.galleryUrl && !server.gallery)) {
            this.syncInstalledMcpServers();
        }
    }
    onDidUpdateMcpServers(e) {
        for (const result of e) {
            if (!result.local) {
                continue;
            }
            const serverIndex = this._local.findIndex(server => this.areSameMcpServers(server.local, result.local));
            let server;
            if (serverIndex !== -1) {
                this._local[serverIndex].local = result.local;
                server = this._local[serverIndex];
            }
            else {
                server = this.instantiationService.createInstance(McpWorkbenchServer, e => this.getInstallState(e), e => this.getRuntimeStatus(e), result.local, result.source, undefined);
                this.addServer(server);
            }
            this._onChange.fire(server);
        }
    }
    fromGallery(gallery) {
        for (const local of this._local) {
            if (local.name === gallery.name) {
                local.gallery = gallery;
                return local;
            }
        }
        return undefined;
    }
    async syncInstalledMcpServers() {
        const infos = [];
        for (const installed of this.local) {
            if (installed.local?.source !== 'gallery') {
                continue;
            }
            if (installed.local.galleryUrl) {
                infos.push({ name: installed.local.name, id: installed.local.galleryId });
            }
        }
        if (infos.length) {
            const galleryServers = await this.mcpGalleryService.getMcpServersFromGallery(infos);
            await this.syncInstalledMcpServersWithGallery(galleryServers);
        }
    }
    async syncInstalledMcpServersWithGallery(gallery) {
        const galleryMap = new Map(gallery.map(server => [server.name, server]));
        for (const mcpServer of this.local) {
            if (!mcpServer.local) {
                continue;
            }
            const key = mcpServer.local.name;
            const gallery = key ? galleryMap.get(key) : undefined;
            if (!gallery || gallery.galleryUrl !== mcpServer.local.galleryUrl) {
                if (mcpServer.gallery) {
                    mcpServer.gallery = undefined;
                    this._onChange.fire(mcpServer);
                }
                continue;
            }
            mcpServer.gallery = gallery;
            if (!mcpServer.local.manifest) {
                mcpServer.local = await this.mcpManagementService.updateMetadata(mcpServer.local, gallery);
            }
            this._onChange.fire(mcpServer);
        }
    }
    async queryGallery(options, token) {
        if (!this.mcpGalleryService.isEnabled()) {
            return {
                firstPage: { items: [], hasMore: false },
                getNextPage: async () => ({ items: [], hasMore: false })
            };
        }
        const pager = await this.mcpGalleryService.query(options, token);
        const mapPage = (page) => ({
            items: page.items.map(gallery => this.fromGallery(gallery) ?? this.instantiationService.createInstance(McpWorkbenchServer, e => this.getInstallState(e), e => this.getRuntimeStatus(e), undefined, gallery, undefined)),
            hasMore: page.hasMore
        });
        return {
            firstPage: mapPage(pager.firstPage),
            getNextPage: async (ct) => {
                const nextPage = await pager.getNextPage(ct);
                return mapPage(nextPage);
            }
        };
    }
    async queryLocal() {
        const installed = await this.mcpManagementService.getInstalled();
        this._local = this.sort(installed.map(i => {
            const existing = this._local.find(local => local.id === i.id);
            const local = existing ?? this.instantiationService.createInstance(McpWorkbenchServer, e => this.getInstallState(e), e => this.getRuntimeStatus(e), undefined, undefined, undefined);
            local.local = i;
            return local;
        }));
        this._onChange.fire(undefined);
        return [...this.local];
    }
    addServer(server) {
        this._local.push(server);
        this._local = this.sort(this._local);
    }
    sort(local) {
        return local.sort((a, b) => {
            if (a.name === b.name) {
                if (!a.runtimeStatus || a.runtimeStatus.state === 2 /* McpServerEnablementState.Enabled */) {
                    return -1;
                }
                if (!b.runtimeStatus || b.runtimeStatus.state === 2 /* McpServerEnablementState.Enabled */) {
                    return 1;
                }
                return 0;
            }
            return a.name.localeCompare(b.name);
        });
    }
    getEnabledLocalMcpServers() {
        const result = new Map();
        const userRemote = [];
        const workspace = [];
        for (const server of this.local) {
            const enablementStatus = this.getEnablementStatus(server);
            if (enablementStatus && enablementStatus.state !== 2 /* McpServerEnablementState.Enabled */) {
                continue;
            }
            if (server.local?.scope === "user" /* LocalMcpServerScope.User */) {
                result.set(server.name, server.local);
            }
            else if (server.local?.scope === "remoteUser" /* LocalMcpServerScope.RemoteUser */) {
                userRemote.push(server.local);
            }
            else if (server.local?.scope === "workspace" /* LocalMcpServerScope.Workspace */) {
                workspace.push(server.local);
            }
        }
        for (const server of userRemote) {
            const existing = result.get(server.name);
            if (existing) {
                this.logService.warn(localize('overwriting', "Overwriting mcp server '{0}' from {1} with {2}.", server.name, server.mcpResource.path, existing.mcpResource.path));
            }
            result.set(server.name, server);
        }
        for (const server of workspace) {
            const existing = result.get(server.name);
            if (existing) {
                this.logService.warn(localize('overwriting', "Overwriting mcp server '{0}' from {1} with {2}.", server.name, server.mcpResource.path, existing.mcpResource.path));
            }
            result.set(server.name, server);
        }
        return [...result.values()];
    }
    canInstall(mcpServer) {
        if (!(mcpServer instanceof McpWorkbenchServer)) {
            return new MarkdownString().appendText(localize('not an extension', "The provided object is not an mcp server."));
        }
        if (mcpServer.gallery) {
            const result = this.mcpManagementService.canInstall(mcpServer.gallery);
            if (result === true) {
                return true;
            }
            return result;
        }
        if (mcpServer.installable) {
            const result = this.mcpManagementService.canInstall(mcpServer.installable);
            if (result === true) {
                return true;
            }
            return result;
        }
        return new MarkdownString().appendText(localize('cannot be installed', "Cannot install the '{0}' MCP Server because it is not available in this setup.", mcpServer.label));
    }
    async install(server, installOptions) {
        if (!(server instanceof McpWorkbenchServer)) {
            throw new Error('Invalid server instance');
        }
        if (server.installable) {
            const installable = server.installable;
            return this.doInstall(server, () => this.mcpManagementService.install(installable, installOptions));
        }
        if (server.gallery) {
            const gallery = server.gallery;
            return this.doInstall(server, () => this.mcpManagementService.installFromGallery(gallery, installOptions));
        }
        throw new Error('No installable server found');
    }
    async uninstall(server) {
        if (!server.local) {
            throw new Error('Local server is missing');
        }
        await this.mcpManagementService.uninstall(server.local);
    }
    async doInstall(server, installTask) {
        const source = server.gallery ? 'gallery' : 'local';
        const serverName = server.name;
        // Check for inputs in installable config or if it comes from handleURL with inputs
        const hasInputs = !!(server.installable?.inputs && server.installable.inputs.length > 0);
        this.installing.push(server);
        this._onChange.fire(server);
        try {
            await installTask();
            const result = await this.waitAndGetInstalledMcpServer(server);
            // Track successful installation
            this.telemetryService.publicLog2('mcp/serverInstall', {
                serverName,
                source,
                scope: result.local?.scope ?? 'unknown',
                success: true,
                hasInputs
            });
            return result;
        }
        catch (error) {
            // Track failed installation
            this.telemetryService.publicLog2('mcp/serverInstall', {
                serverName,
                source,
                scope: 'unknown',
                success: false,
                error: error instanceof Error ? error.message : String(error),
                hasInputs
            });
            throw error;
        }
        finally {
            if (this.installing.includes(server)) {
                this.installing.splice(this.installing.indexOf(server), 1);
                this._onChange.fire(server);
            }
        }
    }
    async waitAndGetInstalledMcpServer(server) {
        let installed = this.local.find(local => local.name === server.name);
        if (!installed) {
            await Event.toPromise(Event.filter(this.onChange, e => !!e && this.local.some(local => local.name === server.name)));
        }
        installed = this.local.find(local => local.name === server.name);
        if (!installed) {
            // This should not happen
            throw new Error('Extension should have been installed');
        }
        return installed;
    }
    getMcpConfigPath(arg) {
        if (arg instanceof URI) {
            const mcpResource = arg;
            for (const profile of this.userDataProfilesService.profiles) {
                if (this.uriIdentityService.extUri.isEqual(profile.mcpResource, mcpResource)) {
                    return this.getUserMcpConfigPath(mcpResource);
                }
            }
            return this.remoteAgentService.getEnvironment().then(remoteEnvironment => {
                if (remoteEnvironment && this.uriIdentityService.extUri.isEqual(remoteEnvironment.mcpResource, mcpResource)) {
                    return this.getRemoteMcpConfigPath(mcpResource);
                }
                return this.getWorkspaceMcpConfigPath(mcpResource);
            });
        }
        if (arg.scope === "user" /* LocalMcpServerScope.User */) {
            return this.getUserMcpConfigPath(arg.mcpResource);
        }
        if (arg.scope === "workspace" /* LocalMcpServerScope.Workspace */) {
            return this.getWorkspaceMcpConfigPath(arg.mcpResource);
        }
        if (arg.scope === "remoteUser" /* LocalMcpServerScope.RemoteUser */) {
            return this.getRemoteMcpConfigPath(arg.mcpResource);
        }
        return undefined;
    }
    getUserMcpConfigPath(mcpResource) {
        return {
            id: USER_CONFIG_ID,
            key: 'userLocalValue',
            target: 3 /* ConfigurationTarget.USER_LOCAL */,
            label: localize('mcp.configuration.userLocalValue', 'Global in {0}', this.productService.nameShort),
            scope: 0 /* StorageScope.PROFILE */,
            order: 200 /* McpCollectionSortOrder.User */,
            uri: mcpResource,
            section: [],
        };
    }
    getRemoteMcpConfigPath(mcpResource) {
        return {
            id: REMOTE_USER_CONFIG_ID,
            key: 'userRemoteValue',
            target: 4 /* ConfigurationTarget.USER_REMOTE */,
            label: this.environmentService.remoteAuthority ? this.labelService.getHostLabel(Schemas.vscodeRemote, this.environmentService.remoteAuthority) : 'Remote',
            scope: 0 /* StorageScope.PROFILE */,
            order: 200 /* McpCollectionSortOrder.User */ + -50 /* McpCollectionSortOrder.RemoteBoost */,
            remoteAuthority: this.environmentService.remoteAuthority,
            uri: mcpResource,
            section: [],
        };
    }
    getWorkspaceMcpConfigPath(mcpResource) {
        const workspace = this.workspaceService.getWorkspace();
        if (workspace.configuration && this.uriIdentityService.extUri.isEqual(workspace.configuration, mcpResource)) {
            return {
                id: WORKSPACE_CONFIG_ID,
                key: 'workspaceValue',
                target: 5 /* ConfigurationTarget.WORKSPACE */,
                label: basename(mcpResource),
                scope: 1 /* StorageScope.WORKSPACE */,
                order: 100 /* McpCollectionSortOrder.Workspace */,
                remoteAuthority: this.environmentService.remoteAuthority,
                uri: mcpResource,
                section: ['settings', mcpConfigurationSection],
            };
        }
        const workspaceFolders = workspace.folders;
        for (let index = 0; index < workspaceFolders.length; index++) {
            const workspaceFolder = workspaceFolders[index];
            if (this.uriIdentityService.extUri.isEqual(this.uriIdentityService.extUri.joinPath(workspaceFolder.uri, WORKSPACE_STANDALONE_CONFIGURATIONS[MCP_CONFIGURATION_KEY]), mcpResource)) {
                return {
                    id: `${WORKSPACE_FOLDER_CONFIG_ID_PREFIX}${index}`,
                    key: 'workspaceFolderValue',
                    target: 6 /* ConfigurationTarget.WORKSPACE_FOLDER */,
                    label: `${workspaceFolder.name}/.vscode/mcp.json`,
                    scope: 1 /* StorageScope.WORKSPACE */,
                    remoteAuthority: this.environmentService.remoteAuthority,
                    order: 0 /* McpCollectionSortOrder.WorkspaceFolder */,
                    uri: mcpResource,
                    workspaceFolder,
                };
            }
        }
        return undefined;
    }
    async handleURL(uri) {
        if (uri.path === 'mcp/install') {
            return this.handleMcpInstallUri(uri);
        }
        if (uri.path.startsWith('mcp/by-name/')) {
            const mcpServerName = uri.path.substring('mcp/by-name/'.length);
            if (mcpServerName) {
                return this.handleMcpServerByName(mcpServerName);
            }
        }
        if (uri.path.startsWith('mcp/')) {
            const mcpServerUrl = uri.path.substring(4);
            if (mcpServerUrl) {
                return this.handleMcpServerUrl(`${Schemas.https}://${mcpServerUrl}`);
            }
        }
        return false;
    }
    async handleMcpInstallUri(uri) {
        let parsed;
        try {
            parsed = JSON.parse(decodeURIComponent(uri.query));
        }
        catch (e) {
            return false;
        }
        try {
            const { name, inputs, gallery, ...config } = parsed;
            if (config.type === undefined) {
                config.type = parsed.command ? "stdio" /* McpServerType.LOCAL */ : "http" /* McpServerType.REMOTE */;
            }
            this.open(this.instantiationService.createInstance(McpWorkbenchServer, e => this.getInstallState(e), e => this.getRuntimeStatus(e), undefined, undefined, { name, config, inputs }));
        }
        catch (e) {
            // ignore
        }
        return true;
    }
    async handleMcpServerUrl(url) {
        try {
            const gallery = await this.mcpGalleryService.getMcpServer(url);
            if (!gallery) {
                this.logService.info(`MCP server '${url}' not found`);
                return true;
            }
            const local = this.local.find(e => e.name === gallery.name) ?? this.instantiationService.createInstance(McpWorkbenchServer, e => this.getInstallState(e), e => this.getRuntimeStatus(e), undefined, gallery, undefined);
            this.open(local);
        }
        catch (e) {
            // ignore
            this.logService.error(e);
        }
        return true;
    }
    async handleMcpServerByName(name) {
        try {
            const [gallery] = await this.mcpGalleryService.getMcpServersFromGallery([{ name }]);
            if (!gallery) {
                this.logService.info(`MCP server '${name}' not found`);
                return true;
            }
            const local = this.local.find(e => e.name === gallery.name) ?? this.instantiationService.createInstance(McpWorkbenchServer, e => this.getInstallState(e), e => this.getRuntimeStatus(e), undefined, gallery, undefined);
            this.open(local);
        }
        catch (e) {
            // ignore
            this.logService.error(e);
        }
        return true;
    }
    async openSearch(searchValue, preserveFoucs) {
        await this.extensionsWorkbenchService.openSearch(`@mcp ${searchValue}`, preserveFoucs);
    }
    async open(extension, options) {
        await this.editorService.openEditor(this.instantiationService.createInstance(McpServerEditorInput, extension), options, ACTIVE_GROUP);
    }
    getInstallState(extension) {
        if (this.installing.some(i => i.name === extension.name)) {
            return 0 /* McpServerInstallState.Installing */;
        }
        if (this.uninstalling.some(e => e.name === extension.name)) {
            return 2 /* McpServerInstallState.Uninstalling */;
        }
        const local = this.local.find(e => e === extension);
        return local ? 1 /* McpServerInstallState.Installed */ : 3 /* McpServerInstallState.Uninstalled */;
    }
    getRuntimeStatus(mcpServer) {
        const enablementStatus = this.getEnablementStatus(mcpServer);
        if (enablementStatus) {
            return enablementStatus;
        }
        if (!this.mcpService.servers.get().find(s => s.definition.id === mcpServer.id)) {
            return { state: 0 /* McpServerEnablementState.Disabled */ };
        }
        return undefined;
    }
    getEnablementStatus(mcpServer) {
        if (!mcpServer.local) {
            return undefined;
        }
        const settingsCommandLink = createCommandUri('workbench.action.openSettings', { query: `@id:${mcpAccessConfig}` }).toString();
        const accessValue = this.configurationService.getValue(mcpAccessConfig);
        if (accessValue === "none" /* McpAccessValue.None */) {
            return {
                state: 1 /* McpServerEnablementState.DisabledByAccess */,
                message: {
                    severity: Severity.Warning,
                    text: new MarkdownString(localize('disabled - all not allowed', "This MCP Server is disabled because MCP servers are configured to be disabled in the Editor. Please check your [settings]({0}).", settingsCommandLink))
                }
            };
        }
        if (accessValue === "registry" /* McpAccessValue.Registry */) {
            if (!mcpServer.gallery) {
                return {
                    state: 1 /* McpServerEnablementState.DisabledByAccess */,
                    message: {
                        severity: Severity.Warning,
                        text: new MarkdownString(localize('disabled - some not allowed', "This MCP Server is disabled because it is configured to be disabled in the Editor. Please check your [settings]({0}).", settingsCommandLink))
                    }
                };
            }
            const remoteUrl = mcpServer.local.config.type === "http" /* McpServerType.REMOTE */ && mcpServer.local.config.url;
            if (remoteUrl && !mcpServer.gallery.configuration.remotes?.some(remote => remote.url === remoteUrl)) {
                return {
                    state: 1 /* McpServerEnablementState.DisabledByAccess */,
                    message: {
                        severity: Severity.Warning,
                        text: new MarkdownString(localize('disabled - some not allowed', "This MCP Server is disabled because it is configured to be disabled in the Editor. Please check your [settings]({0}).", settingsCommandLink))
                    }
                };
            }
        }
        return undefined;
    }
};
McpWorkbenchService = __decorate([
    __param(0, IMcpGalleryManifestService),
    __param(1, IMcpGalleryService),
    __param(2, IWorkbenchMcpManagementService),
    __param(3, IEditorService),
    __param(4, IUserDataProfilesService),
    __param(5, IUriIdentityService),
    __param(6, IWorkspaceContextService),
    __param(7, IWorkbenchEnvironmentService),
    __param(8, ILabelService),
    __param(9, IProductService),
    __param(10, IRemoteAgentService),
    __param(11, IConfigurationService),
    __param(12, IInstantiationService),
    __param(13, ITelemetryService),
    __param(14, ILogService),
    __param(15, IExtensionsWorkbenchService),
    __param(16, IAllowedMcpServersService),
    __param(17, IMcpService),
    __param(18, IURLService)
], McpWorkbenchService);
export { McpWorkbenchService };
let MCPContextsInitialisation = class MCPContextsInitialisation extends Disposable {
    static { this.ID = 'workbench.mcp.contexts.initialisation'; }
    constructor(mcpWorkbenchService, mcpGalleryManifestService, contextKeyService) {
        super();
        const mcpServersGalleryStatus = McpServersGalleryStatusContext.bindTo(contextKeyService);
        mcpServersGalleryStatus.set(mcpGalleryManifestService.mcpGalleryManifestStatus);
        this._register(mcpGalleryManifestService.onDidChangeMcpGalleryManifestStatus(status => mcpServersGalleryStatus.set(status)));
        const hasInstalledMcpServersContextKey = HasInstalledMcpServersContext.bindTo(contextKeyService);
        mcpWorkbenchService.queryLocal().finally(() => {
            hasInstalledMcpServersContextKey.set(mcpWorkbenchService.local.length > 0);
            this._register(mcpWorkbenchService.onChange(() => hasInstalledMcpServersContextKey.set(mcpWorkbenchService.local.length > 0)));
        });
    }
};
MCPContextsInitialisation = __decorate([
    __param(0, IMcpWorkbenchService),
    __param(1, IMcpGalleryManifestService),
    __param(2, IContextKeyService)
], MCPContextsInitialisation);
export { MCPContextsInitialisation };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwV29ya2JlbmNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9icm93c2VyL21jcFdvcmtiZW5jaFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQW1CLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzNHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRTFGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBcUIsa0JBQWtCLEVBQXdFLGVBQWUsRUFBa0IseUJBQXlCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUMzTyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUV2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFeEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQzFHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRTlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3JJLE9BQU8sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDaEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDMUcsT0FBTyxFQUFpRSw4QkFBOEIsRUFBMkYscUJBQXFCLEVBQUUsY0FBYyxFQUFFLG1CQUFtQixFQUFFLGlDQUFpQyxFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdFcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFeEUsT0FBTyxFQUFFLDZCQUE2QixFQUFrQixXQUFXLEVBQUUsb0JBQW9CLEVBQTJILDhCQUE4QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbFIsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDakUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFbkcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDcEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3BFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQU16RCxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFrQjtJQUV2QixZQUNTLG9CQUFvRSxFQUNwRSxvQkFBb0YsRUFDckYsS0FBMkMsRUFDM0MsT0FBc0MsRUFDN0IsV0FBOEMsRUFDekIsaUJBQXFDLEVBQzNDLFdBQXlCO1FBTmhELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBZ0Q7UUFDcEUseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFnRTtRQUNyRixVQUFLLEdBQUwsS0FBSyxDQUFzQztRQUMzQyxZQUFPLEdBQVAsT0FBTyxDQUErQjtRQUM3QixnQkFBVyxHQUFYLFdBQVcsQ0FBbUM7UUFDekIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUMzQyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUV4RCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNwQixDQUFDO0lBRUQsSUFBSSxFQUFFO1FBQ0wsT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3BGLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDUCxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUMvRSxDQUFDO0lBRUQsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLFdBQVcsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUM7SUFDakgsQ0FBQztJQUVELElBQUksSUFBSTtRQUlQLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUM7SUFDL0MsQ0FBQztJQUVELElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDO0lBQ3JELENBQUM7SUFFRCxJQUFJLG9CQUFvQjtRQUN2QixPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxvQkFBb0IsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQztJQUNuSSxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7SUFDNUMsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxXQUFXLElBQUksRUFBRSxDQUFDO0lBQ25FLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxJQUFJLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQztJQUM5QixDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQztJQUN2RCxDQUFDO0lBRUQsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDM0csQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBd0I7UUFDdkMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxDQUFDO1lBQzNCLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN0RSxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDakMsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUMxQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQzVCLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUM7WUFDN0IsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDOUQsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQXdCO1FBQ3pDLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQztZQUMxQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBQzVCLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO1FBQ25DLENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDMUMsQ0FBQztDQUVELENBQUE7QUExR0ssa0JBQWtCO0lBUXJCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxZQUFZLENBQUE7R0FUVCxrQkFBa0IsQ0EwR3ZCO0FBRU0sSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBUWxELElBQUksS0FBSyxLQUFvQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBUXZFLFlBQzZCLHlCQUFxRCxFQUM3RCxpQkFBc0QsRUFDMUMsb0JBQXFFLEVBQ3JGLGFBQThDLEVBQ3BDLHVCQUFrRSxFQUN2RSxrQkFBd0QsRUFDbkQsZ0JBQTJELEVBQ3ZELGtCQUFpRSxFQUNoRixZQUE0QyxFQUMxQyxjQUFnRCxFQUM1QyxrQkFBd0QsRUFDdEQsb0JBQTRELEVBQzVELG9CQUE0RCxFQUNoRSxnQkFBb0QsRUFDMUQsVUFBd0MsRUFDeEIsMEJBQXdFLEVBQzFFLHdCQUFvRSxFQUNsRixVQUF3QyxFQUN4QyxVQUF1QjtRQUVwQyxLQUFLLEVBQUUsQ0FBQztRQW5CNkIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUN6Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQWdDO1FBQ3BFLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUNuQiw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBQ3RELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDbEMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUEwQjtRQUN0Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQThCO1FBQy9ELGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ3pCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUMzQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3JDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDM0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMvQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3pDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDUCwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO1FBQ3pELDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMkI7UUFDakUsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQTlCOUMsZUFBVSxHQUF5QixFQUFFLENBQUM7UUFDdEMsaUJBQVksR0FBeUIsRUFBRSxDQUFDO1FBRXhDLFdBQU0sR0FBeUIsRUFBRSxDQUFDO1FBR3pCLGNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFtQyxDQUFDLENBQUM7UUFDbkYsYUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO1FBRXhCLGFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUN2RCxZQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7UUF3QnRDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHNDQUFzQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0SCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEgsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsdUNBQXVDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hILElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdGLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQzNCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDNUIsT0FBTztZQUNSLENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsU0FBUyxDQUFDLHlCQUF5QixDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoSSxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7UUFDSCxVQUFVLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3JFLElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2hDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsNEJBQTRCLENBQUMsR0FBRyxFQUFFO1lBQzlFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ25ELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCO1FBQy9CLE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVPLGlCQUFpQixDQUFDLENBQTJELEVBQUUsQ0FBMkQ7UUFDakosSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDYixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDZCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxPQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDakQsQ0FBQztJQUVPLHVCQUF1QixDQUFDLENBQXNDO1FBQ3JFLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2IsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEYsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxLQUFLLFdBQVcsQ0FBQyxDQUFDO1lBQ25FLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7SUFDRixDQUFDO0lBRU8sc0JBQXNCLENBQUMsQ0FBOEM7UUFDNUUsTUFBTSxPQUFPLEdBQTBCLEVBQUUsQ0FBQztRQUMxQyxLQUFLLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3pDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDO1lBQ3hJLElBQUksQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUN2RixJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1osTUFBTSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7Z0JBQ3RCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFNLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDOUosQ0FBQztnQkFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUN2QixNQUFNLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztnQkFDNUIsQ0FBQztnQkFDRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUN6RixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hCLENBQUM7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QixDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxVQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUN6RSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUNoQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLHFCQUFxQixDQUFDLENBQThDO1FBQzNFLEtBQUssTUFBTSxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDbkIsU0FBUztZQUNWLENBQUM7WUFDRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3hHLElBQUksTUFBMEIsQ0FBQztZQUMvQixJQUFJLFdBQVcsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO2dCQUM5QyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNuQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDM0ssSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4QixDQUFDO1lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDN0IsQ0FBQztJQUNGLENBQUM7SUFFTyxXQUFXLENBQUMsT0FBMEI7UUFDN0MsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDakMsS0FBSyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7Z0JBQ3hCLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRU8sS0FBSyxDQUFDLHVCQUF1QjtRQUNwQyxNQUFNLEtBQUssR0FBb0MsRUFBRSxDQUFDO1FBRWxELEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3BDLElBQUksU0FBUyxDQUFDLEtBQUssRUFBRSxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzNDLFNBQVM7WUFDVixDQUFDO1lBQ0QsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNoQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7WUFDM0UsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNwRixNQUFNLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMvRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxPQUE0QjtRQUM1RSxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBNEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEcsS0FBSyxNQUFNLFNBQVMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDdEIsU0FBUztZQUNWLENBQUM7WUFDRCxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztZQUNqQyxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUV0RCxJQUFJLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFVLEtBQUssU0FBUyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDbkUsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ3ZCLFNBQVMsQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDO29CQUM5QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDaEMsQ0FBQztnQkFDRCxTQUFTO1lBQ1YsQ0FBQztZQUVELFNBQVMsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1lBQzVCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUMvQixTQUFTLENBQUMsS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzVGLENBQUM7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoQyxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBdUIsRUFBRSxLQUF5QjtRQUNwRSxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUM7WUFDekMsT0FBTztnQkFDTixTQUFTLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUU7Z0JBQ3hDLFdBQVcsRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQzthQUN4RCxDQUFDO1FBQ0gsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFakUsTUFBTSxPQUFPLEdBQUcsQ0FBQyxJQUF1QyxFQUF1QyxFQUFFLENBQUMsQ0FBQztZQUNsRyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDdk4sT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1NBQ3JCLENBQUMsQ0FBQztRQUVILE9BQU87WUFDTixTQUFTLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUM7WUFDbkMsV0FBVyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRTtnQkFDekIsTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUM3QyxPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMxQixDQUFDO1NBQ0QsQ0FBQztJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVTtRQUNmLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ2pFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3pDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDOUQsTUFBTSxLQUFLLEdBQUcsUUFBUSxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDckwsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7WUFDaEIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDL0IsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLENBQUM7SUFFTyxTQUFTLENBQUMsTUFBMEI7UUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRU8sSUFBSSxDQUFDLEtBQTJCO1FBQ3ZDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN2QixJQUFJLENBQUMsQ0FBQyxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssNkNBQXFDLEVBQUUsQ0FBQztvQkFDcEYsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDWCxDQUFDO2dCQUNELElBQUksQ0FBQyxDQUFDLENBQUMsYUFBYSxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyw2Q0FBcUMsRUFBRSxDQUFDO29CQUNwRixPQUFPLENBQUMsQ0FBQztnQkFDVixDQUFDO2dCQUNELE9BQU8sQ0FBQyxDQUFDO1lBQ1YsQ0FBQztZQUNELE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELHlCQUF5QjtRQUN4QixNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBb0MsQ0FBQztRQUMzRCxNQUFNLFVBQVUsR0FBK0IsRUFBRSxDQUFDO1FBQ2xELE1BQU0sU0FBUyxHQUErQixFQUFFLENBQUM7UUFFakQsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDMUQsSUFBSSxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLDZDQUFxQyxFQUFFLENBQUM7Z0JBQ3JGLFNBQVM7WUFDVixDQUFDO1lBRUQsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssMENBQTZCLEVBQUUsQ0FBQztnQkFDdEQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN2QyxDQUFDO2lCQUFNLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLHNEQUFtQyxFQUFFLENBQUM7Z0JBQ25FLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQy9CLENBQUM7aUJBQU0sSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssb0RBQWtDLEVBQUUsQ0FBQztnQkFDbEUsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDOUIsQ0FBQztRQUNGLENBQUM7UUFFRCxLQUFLLE1BQU0sTUFBTSxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pDLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxpREFBaUQsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNuSyxDQUFDO1lBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFFRCxLQUFLLE1BQU0sTUFBTSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pDLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxpREFBaUQsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNuSyxDQUFDO1lBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFFRCxPQUFPLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsVUFBVSxDQUFDLFNBQThCO1FBQ3hDLElBQUksQ0FBQyxDQUFDLFNBQVMsWUFBWSxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7WUFDaEQsT0FBTyxJQUFJLGNBQWMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsMkNBQTJDLENBQUMsQ0FBQyxDQUFDO1FBQ25ILENBQUM7UUFFRCxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN2QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN2RSxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDckIsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1lBRUQsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDO1FBRUQsSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDM0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDM0UsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ3JCLE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQztZQUVELE9BQU8sTUFBTSxDQUFDO1FBQ2YsQ0FBQztRQUdELE9BQU8sSUFBSSxjQUFjLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLGdGQUFnRixFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzVLLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQTJCLEVBQUUsY0FBaUQ7UUFDM0YsSUFBSSxDQUFDLENBQUMsTUFBTSxZQUFZLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztZQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDNUMsQ0FBQztRQUVELElBQUksTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUM7WUFDdkMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQ3JHLENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNwQixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO1lBQy9CLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQzVHLENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBMkI7UUFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDNUMsQ0FBQztRQUNELE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVPLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBMEIsRUFBRSxXQUFvRDtRQUN2RyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUNwRCxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQy9CLG1GQUFtRjtRQUNuRixNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLE1BQU0sSUFBSSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFekYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFNUIsSUFBSSxDQUFDO1lBQ0osTUFBTSxXQUFXLEVBQUUsQ0FBQztZQUNwQixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUUvRCxnQ0FBZ0M7WUFDaEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBdUQsbUJBQW1CLEVBQUU7Z0JBQzNHLFVBQVU7Z0JBQ1YsTUFBTTtnQkFDTixLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLElBQUksU0FBUztnQkFDdkMsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsU0FBUzthQUNULENBQUMsQ0FBQztZQUVILE9BQU8sTUFBTSxDQUFDO1FBQ2YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsNEJBQTRCO1lBQzVCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQXVELG1CQUFtQixFQUFFO2dCQUMzRyxVQUFVO2dCQUNWLE1BQU07Z0JBQ04sS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLE9BQU8sRUFBRSxLQUFLO2dCQUNkLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2dCQUM3RCxTQUFTO2FBQ1QsQ0FBQyxDQUFDO1lBRUgsTUFBTSxLQUFLLENBQUM7UUFDYixDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMzRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM3QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsNEJBQTRCLENBQUMsTUFBMEI7UUFDcEUsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsTUFBTSxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEgsQ0FBQztRQUNELFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQix5QkFBeUI7WUFDekIsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBSUQsZ0JBQWdCLENBQUMsR0FBbUM7UUFDbkQsSUFBSSxHQUFHLFlBQVksR0FBRyxFQUFFLENBQUM7WUFDeEIsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDO1lBQ3hCLEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUM3RCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLEVBQUUsQ0FBQztvQkFDOUUsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQy9DLENBQUM7WUFDRixDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUU7Z0JBQ3hFLElBQUksaUJBQWlCLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQzdHLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUNqRCxDQUFDO2dCQUNELE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3BELENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELElBQUksR0FBRyxDQUFDLEtBQUssMENBQTZCLEVBQUUsQ0FBQztZQUM1QyxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbkQsQ0FBQztRQUVELElBQUksR0FBRyxDQUFDLEtBQUssb0RBQWtDLEVBQUUsQ0FBQztZQUNqRCxPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUVELElBQUksR0FBRyxDQUFDLEtBQUssc0RBQW1DLEVBQUUsQ0FBQztZQUNsRCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDckQsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxXQUFnQjtRQUM1QyxPQUFPO1lBQ04sRUFBRSxFQUFFLGNBQWM7WUFDbEIsR0FBRyxFQUFFLGdCQUFnQjtZQUNyQixNQUFNLHdDQUFnQztZQUN0QyxLQUFLLEVBQUUsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQztZQUNuRyxLQUFLLDhCQUFzQjtZQUMzQixLQUFLLHVDQUE2QjtZQUNsQyxHQUFHLEVBQUUsV0FBVztZQUNoQixPQUFPLEVBQUUsRUFBRTtTQUNYLENBQUM7SUFDSCxDQUFDO0lBRU8sc0JBQXNCLENBQUMsV0FBZ0I7UUFDOUMsT0FBTztZQUNOLEVBQUUsRUFBRSxxQkFBcUI7WUFDekIsR0FBRyxFQUFFLGlCQUFpQjtZQUN0QixNQUFNLHlDQUFpQztZQUN2QyxLQUFLLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7WUFDekosS0FBSyw4QkFBc0I7WUFDM0IsS0FBSyxFQUFFLG9GQUFnRTtZQUN2RSxlQUFlLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWU7WUFDeEQsR0FBRyxFQUFFLFdBQVc7WUFDaEIsT0FBTyxFQUFFLEVBQUU7U0FDWCxDQUFDO0lBQ0gsQ0FBQztJQUVPLHlCQUF5QixDQUFDLFdBQWdCO1FBQ2pELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN2RCxJQUFJLFNBQVMsQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQzdHLE9BQU87Z0JBQ04sRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsR0FBRyxFQUFFLGdCQUFnQjtnQkFDckIsTUFBTSx1Q0FBK0I7Z0JBQ3JDLEtBQUssRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDO2dCQUM1QixLQUFLLGdDQUF3QjtnQkFDN0IsS0FBSyw0Q0FBa0M7Z0JBQ3ZDLGVBQWUsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZTtnQkFDeEQsR0FBRyxFQUFFLFdBQVc7Z0JBQ2hCLE9BQU8sRUFBRSxDQUFDLFVBQVUsRUFBRSx1QkFBdUIsQ0FBQzthQUM5QyxDQUFDO1FBQ0gsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQztRQUMzQyxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDOUQsTUFBTSxlQUFlLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEQsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLG1DQUFtQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUNuTCxPQUFPO29CQUNOLEVBQUUsRUFBRSxHQUFHLGlDQUFpQyxHQUFHLEtBQUssRUFBRTtvQkFDbEQsR0FBRyxFQUFFLHNCQUFzQjtvQkFDM0IsTUFBTSw4Q0FBc0M7b0JBQzVDLEtBQUssRUFBRSxHQUFHLGVBQWUsQ0FBQyxJQUFJLG1CQUFtQjtvQkFDakQsS0FBSyxnQ0FBd0I7b0JBQzdCLGVBQWUsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZTtvQkFDeEQsS0FBSyxnREFBd0M7b0JBQzdDLEdBQUcsRUFBRSxXQUFXO29CQUNoQixlQUFlO2lCQUNmLENBQUM7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQVE7UUFDdkIsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLGFBQWEsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFDRCxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDekMsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2hFLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ25CLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ2xELENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNDLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsT0FBTyxDQUFDLEtBQUssTUFBTSxZQUFZLEVBQUUsQ0FBQyxDQUFDO1lBQ3RFLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU8sS0FBSyxDQUFDLG1CQUFtQixDQUFDLEdBQVE7UUFDekMsSUFBSSxNQUFvRyxDQUFDO1FBQ3pHLElBQUksQ0FBQztZQUNKLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0osTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDO1lBQ3BELElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDSSxNQUFPLENBQUMsSUFBSSxHQUFrQyxNQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsbUNBQXFCLENBQUMsa0NBQXFCLENBQUM7WUFDL0ksQ0FBQztZQUNELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RMLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osU0FBUztRQUNWLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCLENBQUMsR0FBVztRQUMzQyxJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxhQUFhLENBQUMsQ0FBQztnQkFDdEQsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1lBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3hOLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEIsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixTQUFTO1lBQ1QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVPLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxJQUFZO1FBQy9DLElBQUksQ0FBQztZQUNKLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3BGLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxlQUFlLElBQUksYUFBYSxDQUFDLENBQUM7Z0JBQ3ZELE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN4TixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xCLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osU0FBUztZQUNULElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLFdBQW1CLEVBQUUsYUFBdUI7UUFDNUQsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLFFBQVEsV0FBVyxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDeEYsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBOEIsRUFBRSxPQUF3QjtRQUNsRSxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3ZJLENBQUM7SUFFTyxlQUFlLENBQUMsU0FBNkI7UUFDcEQsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDMUQsZ0RBQXdDO1FBQ3pDLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM1RCxrREFBMEM7UUFDM0MsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQ3BELE9BQU8sS0FBSyxDQUFDLENBQUMseUNBQWlDLENBQUMsMENBQWtDLENBQUM7SUFDcEYsQ0FBQztJQUVPLGdCQUFnQixDQUFDLFNBQTZCO1FBQ3JELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTdELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixPQUFPLGdCQUFnQixDQUFDO1FBQ3pCLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDaEYsT0FBTyxFQUFFLEtBQUssMkNBQW1DLEVBQUUsQ0FBQztRQUNyRCxDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVPLG1CQUFtQixDQUFDLFNBQTZCO1FBQ3hELElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDdEIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE1BQU0sbUJBQW1CLEdBQUcsZ0JBQWdCLENBQUMsK0JBQStCLEVBQUUsRUFBRSxLQUFLLEVBQUUsT0FBTyxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUgsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUV4RSxJQUFJLFdBQVcscUNBQXdCLEVBQUUsQ0FBQztZQUN6QyxPQUFPO2dCQUNOLEtBQUssbURBQTJDO2dCQUNoRCxPQUFPLEVBQUU7b0JBQ1IsUUFBUSxFQUFFLFFBQVEsQ0FBQyxPQUFPO29CQUMxQixJQUFJLEVBQUUsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLGlJQUFpSSxFQUFFLG1CQUFtQixDQUFDLENBQUM7aUJBQ3hOO2FBQ0QsQ0FBQztRQUVILENBQUM7UUFFRCxJQUFJLFdBQVcsNkNBQTRCLEVBQUUsQ0FBQztZQUM3QyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN4QixPQUFPO29CQUNOLEtBQUssbURBQTJDO29CQUNoRCxPQUFPLEVBQUU7d0JBQ1IsUUFBUSxFQUFFLFFBQVEsQ0FBQyxPQUFPO3dCQUMxQixJQUFJLEVBQUUsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLDZCQUE2QixFQUFFLHVIQUF1SCxFQUFFLG1CQUFtQixDQUFDLENBQUM7cUJBQy9NO2lCQUNELENBQUM7WUFDSCxDQUFDO1lBRUQsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxzQ0FBeUIsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7WUFDckcsSUFBSSxTQUFTLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUNyRyxPQUFPO29CQUNOLEtBQUssbURBQTJDO29CQUNoRCxPQUFPLEVBQUU7d0JBQ1IsUUFBUSxFQUFFLFFBQVEsQ0FBQyxPQUFPO3dCQUMxQixJQUFJLEVBQUUsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLDZCQUE2QixFQUFFLHVIQUF1SCxFQUFFLG1CQUFtQixDQUFDLENBQUM7cUJBQy9NO2lCQUNELENBQUM7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7Q0FFRCxDQUFBO0FBN25CWSxtQkFBbUI7SUFpQjdCLFdBQUEsMEJBQTBCLENBQUE7SUFDMUIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLDhCQUE4QixDQUFBO0lBQzlCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSw0QkFBNEIsQ0FBQTtJQUM1QixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZUFBZSxDQUFBO0lBQ2YsWUFBQSxtQkFBbUIsQ0FBQTtJQUNuQixZQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFlBQUEscUJBQXFCLENBQUE7SUFDckIsWUFBQSxpQkFBaUIsQ0FBQTtJQUNqQixZQUFBLFdBQVcsQ0FBQTtJQUNYLFlBQUEsMkJBQTJCLENBQUE7SUFDM0IsWUFBQSx5QkFBeUIsQ0FBQTtJQUN6QixZQUFBLFdBQVcsQ0FBQTtJQUNYLFlBQUEsV0FBVyxDQUFBO0dBbkNELG1CQUFtQixDQTZuQi9COztBQUVNLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQTBCLFNBQVEsVUFBVTthQUVqRCxPQUFFLEdBQUcsdUNBQXVDLEFBQTFDLENBQTJDO0lBRXBELFlBQ3VCLG1CQUF5QyxFQUNuQyx5QkFBcUQsRUFDN0QsaUJBQXFDO1FBRXpELEtBQUssRUFBRSxDQUFDO1FBRVIsTUFBTSx1QkFBdUIsR0FBRyw4QkFBOEIsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN6Rix1QkFBdUIsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUNoRixJQUFJLENBQUMsU0FBUyxDQUFDLHlCQUF5QixDQUFDLG1DQUFtQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU3SCxNQUFNLGdDQUFnQyxHQUFHLDZCQUE2QixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2pHLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDN0MsZ0NBQWdDLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDM0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsZ0NBQWdDLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hJLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQzs7QUFwQlcseUJBQXlCO0lBS25DLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSwwQkFBMEIsQ0FBQTtJQUMxQixXQUFBLGtCQUFrQixDQUFBO0dBUFIseUJBQXlCLENBcUJyQyJ9