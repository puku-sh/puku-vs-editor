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
                this.logService.warn(localize(9812, null, server.name, server.mcpResource.path, existing.mcpResource.path));
            }
            result.set(server.name, server);
        }
        for (const server of workspace) {
            const existing = result.get(server.name);
            if (existing) {
                this.logService.warn(localize(9813, null, server.name, server.mcpResource.path, existing.mcpResource.path));
            }
            result.set(server.name, server);
        }
        return [...result.values()];
    }
    canInstall(mcpServer) {
        if (!(mcpServer instanceof McpWorkbenchServer)) {
            return new MarkdownString().appendText(localize(9814, null));
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
        return new MarkdownString().appendText(localize(9815, null, mcpServer.label));
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
            label: localize(9816, null, this.productService.nameShort),
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
                    text: new MarkdownString(localize(9817, null, settingsCommandLink))
                }
            };
        }
        if (accessValue === "registry" /* McpAccessValue.Registry */) {
            if (!mcpServer.gallery) {
                return {
                    state: 1 /* McpServerEnablementState.DisabledByAccess */,
                    message: {
                        severity: Severity.Warning,
                        text: new MarkdownString(localize(9818, null, settingsCommandLink))
                    }
                };
            }
            const remoteUrl = mcpServer.local.config.type === "http" /* McpServerType.REMOTE */ && mcpServer.local.config.url;
            if (remoteUrl && !mcpServer.gallery.configuration.remotes?.some(remote => remote.url === remoteUrl)) {
                return {
                    state: 1 /* McpServerEnablementState.DisabledByAccess */,
                    message: {
                        severity: Severity.Warning,
                        text: new MarkdownString(localize(9819, null, settingsCommandLink))
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
//# sourceMappingURL=mcpWorkbenchService.js.map