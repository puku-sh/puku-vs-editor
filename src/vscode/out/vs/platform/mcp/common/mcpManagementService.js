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
import { RunOnceScheduler } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { equals } from '../../../base/common/objects.js';
import { isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { IMcpGalleryService, IAllowedMcpServersService } from './mcpManagement.js';
import { IMcpResourceScannerService } from './mcpResourceScannerService.js';
let AbstractCommonMcpManagementService = class AbstractCommonMcpManagementService extends Disposable {
    constructor(logService) {
        super();
        this.logService = logService;
    }
    getMcpServerConfigurationFromManifest(manifest, packageType) {
        // remote
        if (packageType === "remote" /* RegistryType.REMOTE */ && manifest.remotes?.length) {
            const { inputs, variables } = this.processKeyValueInputs(manifest.remotes[0].headers ?? []);
            return {
                mcpServerConfiguration: {
                    config: {
                        type: "http" /* McpServerType.REMOTE */,
                        url: manifest.remotes[0].url,
                        headers: Object.keys(inputs).length ? inputs : undefined,
                    },
                    inputs: variables.length ? variables : undefined,
                },
                notices: [],
            };
        }
        // local
        const serverPackage = manifest.packages?.find(p => p.registryType === packageType) ?? manifest.packages?.[0];
        if (!serverPackage) {
            throw new Error(`No server package found`);
        }
        const args = [];
        const inputs = [];
        const env = {};
        const notices = [];
        if (serverPackage.registryType === "oci" /* RegistryType.DOCKER */) {
            args.push('run');
            args.push('-i');
            args.push('--rm');
        }
        if (serverPackage.runtimeArguments?.length) {
            const result = this.processArguments(serverPackage.runtimeArguments ?? []);
            args.push(...result.args);
            inputs.push(...result.variables);
            notices.push(...result.notices);
        }
        if (serverPackage.environmentVariables?.length) {
            const { inputs: envInputs, variables: envVariables, notices: envNotices } = this.processKeyValueInputs(serverPackage.environmentVariables ?? []);
            inputs.push(...envVariables);
            notices.push(...envNotices);
            for (const [name, value] of Object.entries(envInputs)) {
                env[name] = value;
                if (serverPackage.registryType === "oci" /* RegistryType.DOCKER */) {
                    args.push('-e');
                    args.push(name);
                }
            }
        }
        switch (serverPackage.registryType) {
            case "npm" /* RegistryType.NODE */:
                args.push(serverPackage.version ? `${serverPackage.identifier}@${serverPackage.version}` : serverPackage.identifier);
                break;
            case "pypi" /* RegistryType.PYTHON */:
                args.push(serverPackage.version ? `${serverPackage.identifier}==${serverPackage.version}` : serverPackage.identifier);
                break;
            case "oci" /* RegistryType.DOCKER */:
                args.push(serverPackage.version ? `${serverPackage.identifier}:${serverPackage.version}` : serverPackage.identifier);
                break;
            case "nuget" /* RegistryType.NUGET */:
                args.push(serverPackage.version ? `${serverPackage.identifier}@${serverPackage.version}` : serverPackage.identifier);
                args.push('--yes'); // installation is confirmed by the UI, so --yes is appropriate here
                if (serverPackage.packageArguments?.length) {
                    args.push('--');
                }
                break;
        }
        if (serverPackage.packageArguments?.length) {
            const result = this.processArguments(serverPackage.packageArguments);
            args.push(...result.args);
            inputs.push(...result.variables);
            notices.push(...result.notices);
        }
        return {
            notices,
            mcpServerConfiguration: {
                config: {
                    type: "stdio" /* McpServerType.LOCAL */,
                    command: this.getCommandName(serverPackage.registryType),
                    args: args.length ? args : undefined,
                    env: Object.keys(env).length ? env : undefined,
                },
                inputs: inputs.length ? inputs : undefined,
            }
        };
    }
    getCommandName(packageType) {
        switch (packageType) {
            case "npm" /* RegistryType.NODE */: return 'npx';
            case "oci" /* RegistryType.DOCKER */: return 'docker';
            case "pypi" /* RegistryType.PYTHON */: return 'uvx';
            case "nuget" /* RegistryType.NUGET */: return 'dnx';
        }
        return packageType;
    }
    getVariables(variableInputs) {
        const variables = [];
        for (const [key, value] of Object.entries(variableInputs)) {
            variables.push({
                id: key,
                type: value.choices ? "pickString" /* McpServerVariableType.PICK */ : "promptString" /* McpServerVariableType.PROMPT */,
                description: value.description ?? '',
                password: !!value.isSecret,
                default: value.default,
                options: value.choices,
            });
        }
        return variables;
    }
    processKeyValueInputs(keyValueInputs) {
        const notices = [];
        const inputs = {};
        const variables = [];
        for (const input of keyValueInputs) {
            const inputVariables = input.variables ? this.getVariables(input.variables) : [];
            let value = input.value || '';
            // If explicit variables exist, use them regardless of value
            if (inputVariables.length) {
                for (const variable of inputVariables) {
                    value = value.replace(`{${variable.id}}`, `\${input:${variable.id}}`);
                }
                variables.push(...inputVariables);
            }
            else if (!value && (input.description || input.choices || input.default !== undefined)) {
                // Only create auto-generated input variable if no explicit variables and no value
                variables.push({
                    id: input.name,
                    type: input.choices ? "pickString" /* McpServerVariableType.PICK */ : "promptString" /* McpServerVariableType.PROMPT */,
                    description: input.description ?? '',
                    password: !!input.isSecret,
                    default: input.default,
                    options: input.choices,
                });
                value = `\${input:${input.name}}`;
            }
            inputs[input.name] = value;
        }
        return { inputs, variables, notices };
    }
    processArguments(argumentsList) {
        const args = [];
        const variables = [];
        const notices = [];
        for (const arg of argumentsList) {
            const argVariables = arg.variables ? this.getVariables(arg.variables) : [];
            if (arg.type === 'positional') {
                let value = arg.value;
                if (value) {
                    for (const variable of argVariables) {
                        value = value.replace(`{${variable.id}}`, `\${input:${variable.id}}`);
                    }
                    args.push(value);
                    if (argVariables.length) {
                        variables.push(...argVariables);
                    }
                }
                else if (arg.valueHint && (arg.description || arg.default !== undefined)) {
                    // Create input variable for positional argument without value
                    variables.push({
                        id: arg.valueHint,
                        type: "promptString" /* McpServerVariableType.PROMPT */,
                        description: arg.description ?? '',
                        password: false,
                        default: arg.default,
                    });
                    args.push(`\${input:${arg.valueHint}}`);
                }
                else {
                    // Fallback to value_hint as literal
                    args.push(arg.valueHint ?? '');
                }
            }
            else if (arg.type === 'named') {
                if (!arg.name) {
                    notices.push(`Named argument is missing a name. ${JSON.stringify(arg)}`);
                    continue;
                }
                args.push(arg.name);
                if (arg.value) {
                    let value = arg.value;
                    for (const variable of argVariables) {
                        value = value.replace(`{${variable.id}}`, `\${input:${variable.id}}`);
                    }
                    args.push(value);
                    if (argVariables.length) {
                        variables.push(...argVariables);
                    }
                }
                else if (arg.description || arg.default !== undefined) {
                    // Create input variable for named argument without value
                    const variableId = arg.name.replace(/^--?/, '');
                    variables.push({
                        id: variableId,
                        type: "promptString" /* McpServerVariableType.PROMPT */,
                        description: arg.description ?? '',
                        password: false,
                        default: arg.default,
                    });
                    args.push(`\${input:${variableId}}`);
                }
            }
        }
        return { args, variables, notices };
    }
};
AbstractCommonMcpManagementService = __decorate([
    __param(0, ILogService)
], AbstractCommonMcpManagementService);
export { AbstractCommonMcpManagementService };
let AbstractMcpResourceManagementService = class AbstractMcpResourceManagementService extends AbstractCommonMcpManagementService {
    get onDidInstallMcpServers() { return this._onDidInstallMcpServers.event; }
    get onDidUpdateMcpServers() { return this._onDidUpdateMcpServers.event; }
    get onUninstallMcpServer() { return this._onUninstallMcpServer.event; }
    get onDidUninstallMcpServer() { return this._onDidUninstallMcpServer.event; }
    constructor(mcpResource, target, mcpGalleryService, fileService, uriIdentityService, logService, mcpResourceScannerService) {
        super(logService);
        this.mcpResource = mcpResource;
        this.target = target;
        this.mcpGalleryService = mcpGalleryService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.mcpResourceScannerService = mcpResourceScannerService;
        this.local = new Map();
        this._onInstallMcpServer = this._register(new Emitter());
        this.onInstallMcpServer = this._onInstallMcpServer.event;
        this._onDidInstallMcpServers = this._register(new Emitter());
        this._onDidUpdateMcpServers = this._register(new Emitter());
        this._onUninstallMcpServer = this._register(new Emitter());
        this._onDidUninstallMcpServer = this._register(new Emitter());
        this.reloadConfigurationScheduler = this._register(new RunOnceScheduler(() => this.updateLocal(), 50));
    }
    initialize() {
        if (!this.initializePromise) {
            this.initializePromise = (async () => {
                try {
                    this.local = await this.populateLocalServers();
                }
                finally {
                    this.startWatching();
                }
            })();
        }
        return this.initializePromise;
    }
    async populateLocalServers() {
        this.logService.trace('AbstractMcpResourceManagementService#populateLocalServers', this.mcpResource.toString());
        const local = new Map();
        try {
            const scannedMcpServers = await this.mcpResourceScannerService.scanMcpServers(this.mcpResource, this.target);
            if (scannedMcpServers.servers) {
                await Promise.allSettled(Object.entries(scannedMcpServers.servers).map(async ([name, scannedServer]) => {
                    const server = await this.scanLocalServer(name, scannedServer);
                    local.set(name, server);
                }));
            }
        }
        catch (error) {
            this.logService.debug('Could not read user MCP servers:', error);
            throw error;
        }
        return local;
    }
    startWatching() {
        this._register(this.fileService.watch(this.mcpResource));
        this._register(this.fileService.onDidFilesChange(e => {
            if (e.affects(this.mcpResource)) {
                this.reloadConfigurationScheduler.schedule();
            }
        }));
    }
    async updateLocal() {
        try {
            const current = await this.populateLocalServers();
            const added = [];
            const updated = [];
            const removed = [...this.local.keys()].filter(name => !current.has(name));
            for (const server of removed) {
                this.local.delete(server);
            }
            for (const [name, server] of current) {
                const previous = this.local.get(name);
                if (previous) {
                    if (!equals(previous, server)) {
                        updated.push(server);
                        this.local.set(name, server);
                    }
                }
                else {
                    added.push(server);
                    this.local.set(name, server);
                }
            }
            for (const server of removed) {
                this.local.delete(server);
                this._onDidUninstallMcpServer.fire({ name: server, mcpResource: this.mcpResource });
            }
            if (updated.length) {
                this._onDidUpdateMcpServers.fire(updated.map(server => ({ name: server.name, local: server, mcpResource: this.mcpResource })));
            }
            if (added.length) {
                this._onDidInstallMcpServers.fire(added.map(server => ({ name: server.name, local: server, mcpResource: this.mcpResource })));
            }
        }
        catch (error) {
            this.logService.error('Failed to load installed MCP servers:', error);
        }
    }
    async getInstalled() {
        await this.initialize();
        return Array.from(this.local.values());
    }
    async scanLocalServer(name, config) {
        let mcpServerInfo = await this.getLocalServerInfo(name, config);
        if (!mcpServerInfo) {
            mcpServerInfo = { name, version: config.version, galleryUrl: isString(config.gallery) ? config.gallery : undefined };
        }
        return {
            name,
            config,
            mcpResource: this.mcpResource,
            version: mcpServerInfo.version,
            location: mcpServerInfo.location,
            displayName: mcpServerInfo.displayName,
            description: mcpServerInfo.description,
            publisher: mcpServerInfo.publisher,
            publisherDisplayName: mcpServerInfo.publisherDisplayName,
            galleryUrl: mcpServerInfo.galleryUrl,
            galleryId: mcpServerInfo.galleryId,
            repositoryUrl: mcpServerInfo.repositoryUrl,
            readmeUrl: mcpServerInfo.readmeUrl,
            icon: mcpServerInfo.icon,
            codicon: mcpServerInfo.codicon,
            manifest: mcpServerInfo.manifest,
            source: config.gallery ? 'gallery' : 'local'
        };
    }
    async install(server, options) {
        this.logService.trace('MCP Management Service: install', server.name);
        this._onInstallMcpServer.fire({ name: server.name, mcpResource: this.mcpResource });
        try {
            await this.mcpResourceScannerService.addMcpServers([server], this.mcpResource, this.target);
            await this.updateLocal();
            const local = this.local.get(server.name);
            if (!local) {
                throw new Error(`Failed to install MCP server: ${server.name}`);
            }
            return local;
        }
        catch (e) {
            this._onDidInstallMcpServers.fire([{ name: server.name, error: e, mcpResource: this.mcpResource }]);
            throw e;
        }
    }
    async uninstall(server, options) {
        this.logService.trace('MCP Management Service: uninstall', server.name);
        this._onUninstallMcpServer.fire({ name: server.name, mcpResource: this.mcpResource });
        try {
            const currentServers = await this.mcpResourceScannerService.scanMcpServers(this.mcpResource, this.target);
            if (!currentServers.servers) {
                return;
            }
            await this.mcpResourceScannerService.removeMcpServers([server.name], this.mcpResource, this.target);
            if (server.location) {
                await this.fileService.del(URI.revive(server.location), { recursive: true });
            }
            await this.updateLocal();
        }
        catch (e) {
            this._onDidUninstallMcpServer.fire({ name: server.name, error: e, mcpResource: this.mcpResource });
            throw e;
        }
    }
};
AbstractMcpResourceManagementService = __decorate([
    __param(2, IMcpGalleryService),
    __param(3, IFileService),
    __param(4, IUriIdentityService),
    __param(5, ILogService),
    __param(6, IMcpResourceScannerService)
], AbstractMcpResourceManagementService);
export { AbstractMcpResourceManagementService };
let McpUserResourceManagementService = class McpUserResourceManagementService extends AbstractMcpResourceManagementService {
    constructor(mcpResource, mcpGalleryService, fileService, uriIdentityService, logService, mcpResourceScannerService, environmentService) {
        super(mcpResource, 2 /* ConfigurationTarget.USER */, mcpGalleryService, fileService, uriIdentityService, logService, mcpResourceScannerService);
        this.mcpLocation = uriIdentityService.extUri.joinPath(environmentService.userRoamingDataHome, 'mcp');
    }
    async installFromGallery(server, options) {
        throw new Error('Not supported');
    }
    async updateMetadata(local, gallery) {
        await this.updateMetadataFromGallery(gallery);
        await this.updateLocal();
        const updatedLocal = (await this.getInstalled()).find(s => s.name === local.name);
        if (!updatedLocal) {
            throw new Error(`Failed to find MCP server: ${local.name}`);
        }
        return updatedLocal;
    }
    async updateMetadataFromGallery(gallery) {
        const manifest = gallery.configuration;
        const location = this.getLocation(gallery.name, gallery.version);
        const manifestPath = this.uriIdentityService.extUri.joinPath(location, 'manifest.json');
        const local = {
            galleryUrl: gallery.galleryUrl,
            galleryId: gallery.id,
            name: gallery.name,
            displayName: gallery.displayName,
            description: gallery.description,
            version: gallery.version,
            publisher: gallery.publisher,
            publisherDisplayName: gallery.publisherDisplayName,
            repositoryUrl: gallery.repositoryUrl,
            licenseUrl: gallery.license,
            icon: gallery.icon,
            codicon: gallery.codicon,
            manifest,
        };
        await this.fileService.writeFile(manifestPath, VSBuffer.fromString(JSON.stringify(local)));
        if (gallery.readmeUrl || gallery.readme) {
            const readme = gallery.readme ? gallery.readme : await this.mcpGalleryService.getReadme(gallery, CancellationToken.None);
            await this.fileService.writeFile(this.uriIdentityService.extUri.joinPath(location, 'README.md'), VSBuffer.fromString(readme));
        }
        return manifest;
    }
    async getLocalServerInfo(name, mcpServerConfig) {
        let storedMcpServerInfo;
        let location;
        let readmeUrl;
        if (mcpServerConfig.gallery) {
            location = this.getLocation(name, mcpServerConfig.version);
            const manifestLocation = this.uriIdentityService.extUri.joinPath(location, 'manifest.json');
            try {
                const content = await this.fileService.readFile(manifestLocation);
                storedMcpServerInfo = JSON.parse(content.value.toString());
                // migrate
                if (storedMcpServerInfo.galleryUrl?.includes('/v0/')) {
                    storedMcpServerInfo.galleryUrl = storedMcpServerInfo.galleryUrl.substring(0, storedMcpServerInfo.galleryUrl.indexOf('/v0/'));
                    await this.fileService.writeFile(manifestLocation, VSBuffer.fromString(JSON.stringify(storedMcpServerInfo)));
                }
                storedMcpServerInfo.location = location;
                readmeUrl = this.uriIdentityService.extUri.joinPath(location, 'README.md');
                if (!await this.fileService.exists(readmeUrl)) {
                    readmeUrl = undefined;
                }
                storedMcpServerInfo.readmeUrl = readmeUrl;
            }
            catch (e) {
                this.logService.error('MCP Management Service: failed to read manifest', location.toString(), e);
            }
        }
        return storedMcpServerInfo;
    }
    getLocation(name, version) {
        name = name.replace('/', '.');
        return this.uriIdentityService.extUri.joinPath(this.mcpLocation, version ? `${name}-${version}` : name);
    }
    installFromUri(uri, options) {
        throw new Error('Method not supported.');
    }
    canInstall() {
        throw new Error('Not supported');
    }
};
McpUserResourceManagementService = __decorate([
    __param(1, IMcpGalleryService),
    __param(2, IFileService),
    __param(3, IUriIdentityService),
    __param(4, ILogService),
    __param(5, IMcpResourceScannerService),
    __param(6, IEnvironmentService)
], McpUserResourceManagementService);
export { McpUserResourceManagementService };
let AbstractMcpManagementService = class AbstractMcpManagementService extends AbstractCommonMcpManagementService {
    constructor(allowedMcpServersService, logService) {
        super(logService);
        this.allowedMcpServersService = allowedMcpServersService;
    }
    canInstall(server) {
        const allowedToInstall = this.allowedMcpServersService.isAllowed(server);
        if (allowedToInstall !== true) {
            return new MarkdownString(localize('not allowed to install', "This mcp server cannot be installed because {0}", allowedToInstall.value));
        }
        return true;
    }
};
AbstractMcpManagementService = __decorate([
    __param(0, IAllowedMcpServersService),
    __param(1, ILogService)
], AbstractMcpManagementService);
export { AbstractMcpManagementService };
let McpManagementService = class McpManagementService extends AbstractMcpManagementService {
    constructor(allowedMcpServersService, logService, userDataProfilesService, instantiationService) {
        super(allowedMcpServersService, logService);
        this.userDataProfilesService = userDataProfilesService;
        this.instantiationService = instantiationService;
        this._onInstallMcpServer = this._register(new Emitter());
        this.onInstallMcpServer = this._onInstallMcpServer.event;
        this._onDidInstallMcpServers = this._register(new Emitter());
        this.onDidInstallMcpServers = this._onDidInstallMcpServers.event;
        this._onDidUpdateMcpServers = this._register(new Emitter());
        this.onDidUpdateMcpServers = this._onDidUpdateMcpServers.event;
        this._onUninstallMcpServer = this._register(new Emitter());
        this.onUninstallMcpServer = this._onUninstallMcpServer.event;
        this._onDidUninstallMcpServer = this._register(new Emitter());
        this.onDidUninstallMcpServer = this._onDidUninstallMcpServer.event;
        this.mcpResourceManagementServices = new ResourceMap();
    }
    getMcpResourceManagementService(mcpResource) {
        let mcpResourceManagementService = this.mcpResourceManagementServices.get(mcpResource);
        if (!mcpResourceManagementService) {
            const disposables = new DisposableStore();
            const service = disposables.add(this.createMcpResourceManagementService(mcpResource));
            disposables.add(service.onInstallMcpServer(e => this._onInstallMcpServer.fire(e)));
            disposables.add(service.onDidInstallMcpServers(e => this._onDidInstallMcpServers.fire(e)));
            disposables.add(service.onDidUpdateMcpServers(e => this._onDidUpdateMcpServers.fire(e)));
            disposables.add(service.onUninstallMcpServer(e => this._onUninstallMcpServer.fire(e)));
            disposables.add(service.onDidUninstallMcpServer(e => this._onDidUninstallMcpServer.fire(e)));
            this.mcpResourceManagementServices.set(mcpResource, mcpResourceManagementService = { service, dispose: () => disposables.dispose() });
        }
        return mcpResourceManagementService.service;
    }
    async getInstalled(mcpResource) {
        const mcpResourceUri = mcpResource || this.userDataProfilesService.defaultProfile.mcpResource;
        return this.getMcpResourceManagementService(mcpResourceUri).getInstalled();
    }
    async install(server, options) {
        const mcpResourceUri = options?.mcpResource || this.userDataProfilesService.defaultProfile.mcpResource;
        return this.getMcpResourceManagementService(mcpResourceUri).install(server, options);
    }
    async uninstall(server, options) {
        const mcpResourceUri = options?.mcpResource || this.userDataProfilesService.defaultProfile.mcpResource;
        return this.getMcpResourceManagementService(mcpResourceUri).uninstall(server, options);
    }
    async installFromGallery(server, options) {
        const mcpResourceUri = options?.mcpResource || this.userDataProfilesService.defaultProfile.mcpResource;
        return this.getMcpResourceManagementService(mcpResourceUri).installFromGallery(server, options);
    }
    async updateMetadata(local, gallery, mcpResource) {
        return this.getMcpResourceManagementService(mcpResource || this.userDataProfilesService.defaultProfile.mcpResource).updateMetadata(local, gallery);
    }
    dispose() {
        this.mcpResourceManagementServices.forEach(service => service.dispose());
        this.mcpResourceManagementServices.clear();
        super.dispose();
    }
    createMcpResourceManagementService(mcpResource) {
        return this.instantiationService.createInstance(McpUserResourceManagementService, mcpResource);
    }
};
McpManagementService = __decorate([
    __param(0, IAllowedMcpServersService),
    __param(1, ILogService),
    __param(2, IUserDataProfilesService),
    __param(3, IInstantiationService)
], McpManagementService);
export { McpManagementService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9tY3AvY29tbW9uL21jcE1hbmFnZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFM0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIs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