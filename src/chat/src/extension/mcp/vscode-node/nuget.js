"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpMappingUtility = exports.McpServerSchemaVersion_v0 = exports.McpServerSchemaVersion_v2025_07_09 = exports.NuGetMcpSetup = void 0;
exports.mapServerJsonToMcpServer = mapServerJsonToMcpServer;
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const path_1 = __importDefault(require("path"));
const extpath_1 = require("../../../util/vs/base/common/extpath");
const types_1 = require("../../../util/vs/base/common/types");
const nls_1 = require("../../../util/vs/nls");
const util_1 = require("./util");
const MCP_SERVER_SCHEMA_2025_07_09_GH = "https://modelcontextprotocol.io/schemas/draft/2025-07-09/server.json";
class NuGetMcpSetup {
    constructor(logService, fetcherService, commandExecutor = new util_1.CommandExecutor(), dotnet = { command: 'dotnet', args: [] }, 
    // use NuGet.org central registry
    // see https://github.com/microsoft/vscode/issues/259901 for future options
    source = 'https://api.nuget.org/v3/index.json') {
        this.logService = logService;
        this.fetcherService = fetcherService;
        this.commandExecutor = commandExecutor;
        this.dotnet = dotnet;
        this.source = source;
    }
    async getNuGetPackageMetadata(id) {
        // use the home directory, which is the default for MCP servers
        // see https://github.com/microsoft/vscode/issues/259901 for future options
        const cwd = os.homedir();
        // check for .NET CLI version for a quick "is dotnet installed?" check
        let dotnetVersion;
        try {
            dotnetVersion = await this.getDotnetVersion(cwd);
        }
        catch (error) {
            const errorCode = error.hasOwnProperty('code') ? String(error.code) : undefined;
            if (errorCode === 'ENOENT') {
                return {
                    state: 'error',
                    error: (0, nls_1.localize)("mcp.setup.dotnetNotFound", "The '{0}' command was not found. .NET SDK 10 or newer must be installed and available in PATH.", this.dotnet.command),
                    errorType: "MissingCommand" /* ValidatePackageErrorType.MissingCommand */,
                    helpUri: 'https://aka.ms/vscode-mcp-install/dotnet',
                    helpUriLabel: (0, nls_1.localize)("mcp.setup.installDotNetSdk", "Install .NET SDK"),
                };
            }
            else {
                throw error;
            }
        }
        // dnx is used for running .NET MCP servers and it was shipped with .NET 10
        const dotnetMajorVersion = parseInt(dotnetVersion.split('.')[0]);
        if (dotnetMajorVersion < 10) {
            return {
                state: 'error',
                error: (0, nls_1.localize)("mcp.setup.badDotnetSdkVersion", "The installed .NET SDK must be version 10 or newer. Found {0}.", dotnetVersion),
                errorType: "BadCommandVersion" /* ValidatePackageErrorType.BadCommandVersion */,
                helpUri: 'https://aka.ms/vscode-mcp-install/dotnet',
                helpUriLabel: (0, nls_1.localize)("mcp.setup.installDotNetSdk", "Update .NET SDK"),
            };
        }
        // check if the package exists, using .NET CLI
        const latest = await this.getLatestPackageVersion(cwd, id);
        if (!latest) {
            return {
                state: 'error',
                errorType: "NotFound" /* ValidatePackageErrorType.NotFound */,
                error: (0, nls_1.localize)("mcp.setup.nugetPackageNotFound", "Package {0} does not exist on NuGet.org.", id)
            };
        }
        // read the package readme from NuGet.org, using the HTTP API
        const readme = await this.getPackageReadmeFromNuGetOrgAsync(latest.id, latest.version);
        return {
            state: 'ok',
            publisher: latest.owners ?? 'unknown',
            name: latest.id,
            version: latest.version,
            readme,
            getMcpServer: async (installConsent) => {
                // getting the server.json downloads the package, so wait for consent
                await installConsent;
                const manifest = await this.getServerManifest(latest.id, latest.version);
                return mapServerJsonToMcpServer(manifest, "nuget" /* RegistryType.NUGET */);
            },
        };
    }
    async getServerManifest(id, version) {
        this.logService.info(`Reading .mcp/server.json from NuGet package ${id}@${version}.`);
        const installDir = (0, extpath_1.randomPath)(os.tmpdir(), "vscode-nuget-mcp");
        try {
            // perform a local tool install using the .NET CLI
            // this warms the cache (user packages folder) so dnx will be fast
            // this also makes the server.json available which will be mapped to VS Code MCP config
            await fs.mkdir(installDir, { recursive: true });
            // the cwd must be the install directory or a child directory for local tool install to work
            const cwd = installDir;
            const packagesDir = await this.getGlobalPackagesPath(id, version, cwd);
            if (!packagesDir) {
                return undefined;
            }
            // explicitly create a tool manifest in the off chance one already exists in a parent directory
            const createManifestSuccess = await this.createToolManifest(id, version, cwd);
            if (!createManifestSuccess) {
                return undefined;
            }
            const localInstallSuccess = await this.installLocalTool(id, version, cwd);
            if (!localInstallSuccess) {
                return undefined;
            }
            return await this.readServerManifest(packagesDir, id, version);
        }
        catch (e) {
            this.logService.warn(`
Failed to install NuGet package ${id}@${version}. Proceeding without server.json.
Error: ${e}`);
        }
        finally {
            try {
                await fs.rm(installDir, { recursive: true, force: true });
            }
            catch (e) {
                this.logService.warn(`Failed to clean up temporary .NET tool install directory ${installDir}.
Error: ${e}`);
            }
        }
    }
    async getDotnetVersion(cwd) {
        const args = this.dotnet.args.concat(['--version']);
        const result = await this.commandExecutor.executeWithTimeout(this.dotnet.command, args, cwd);
        const version = result.stdout.trim();
        if (result.exitCode !== 0 || !version) {
            this.logService.warn(`Failed to check for .NET version while checking if a NuGet MCP server exists.
stdout: ${result.stdout}
stderr: ${result.stderr}`);
            throw new Error(`Failed to check for .NET version using '${this.dotnet.command} --version'.`);
        }
        return version;
    }
    async getLatestPackageVersion(cwd, id) {
        // we don't use --exact-match here because it does not return owner information on NuGet.org
        const args = this.dotnet.args.concat(['package', 'search', id, '--source', this.source, '--prerelease', '--format', 'json']);
        const searchResult = await this.commandExecutor.executeWithTimeout(this.dotnet.command, args, cwd);
        const searchData = JSON.parse(searchResult.stdout.trim());
        for (const result of searchData.searchResult ?? []) {
            for (const pkg of result.packages ?? []) {
                if (pkg.id.toUpperCase() === id.toUpperCase()) {
                    return { id: pkg.id, version: pkg.latestVersion, owners: pkg.owners };
                }
            }
        }
    }
    async getPackageReadmeFromNuGetOrgAsync(id, version) {
        try {
            const sourceUrl = URL.parse(this.source);
            if (sourceUrl?.protocol !== 'https:' || !sourceUrl.pathname.endsWith('.json')) {
                this.logService.warn(`NuGet package source is not an HTTPS V3 source URL. Cannot fetch a readme for ${id}@${version}.`);
                return;
            }
            // download the service index to locate services
            // https://learn.microsoft.com/en-us/nuget/api/service-index
            const serviceIndexResponse = await this.fetcherService.fetch(this.source, { method: 'GET' });
            if (serviceIndexResponse.status !== 200) {
                this.logService.warn(`Unable to read the service index for NuGet.org while fetching readme for ${id}@${version}.
HTTP status: ${serviceIndexResponse.status}`);
                return;
            }
            const serviceIndex = await serviceIndexResponse.json();
            // try to fetch the package readme using the URL template
            // https://learn.microsoft.com/en-us/nuget/api/readme-template-resource
            const readmeTemplate = serviceIndex.resources?.find(resource => resource['@type'] === 'ReadmeUriTemplate/6.13.0')?.['@id'];
            if (!readmeTemplate) {
                this.logService.warn(`No readme URL template found for ${id}@${version} on NuGet.org.`);
                return;
            }
            const readmeUrl = readmeTemplate
                .replace('{lower_id}', encodeURIComponent(id.toLowerCase()))
                .replace('{lower_version}', encodeURIComponent(version.toLowerCase()));
            const readmeResponse = await this.fetcherService.fetch(readmeUrl, { method: 'GET' });
            if (readmeResponse.status === 200) {
                return readmeResponse.text();
            }
            else if (readmeResponse.status === 404) {
                this.logService.info(`No package readme exists for ${id}@${version} on NuGet.org.`);
            }
            else {
                this.logService.warn(`Failed to read package readme for ${id}@${version} from NuGet.org.
HTTP status: ${readmeResponse.status}`);
            }
        }
        catch (error) {
            this.logService.warn(`Failed to read package readme for ${id}@${version} from NuGet.org.
Error: ${error}`);
        }
    }
    async getGlobalPackagesPath(id, version, cwd) {
        const args = this.dotnet.args.concat(['nuget', 'locals', 'global-packages', '--list', '--force-english-output']);
        const globalPackagesResult = await this.commandExecutor.executeWithTimeout(this.dotnet.command, args, cwd);
        if (globalPackagesResult.exitCode !== 0) {
            this.logService.warn(`Failed to discover the NuGet global packages folder. Proceeding without server.json for ${id}@${version}.
stdout: ${globalPackagesResult.stdout}
stderr: ${globalPackagesResult.stderr}`);
            return undefined;
        }
        // output looks like:
        // global-packages: C:\Users\username\.nuget\packages\
        return globalPackagesResult.stdout.trim().split(' ', 2).at(-1)?.trim();
    }
    async createToolManifest(id, version, cwd) {
        const args = this.dotnet.args.concat(['new', 'tool-manifest']);
        const result = await this.commandExecutor.executeWithTimeout(this.dotnet.command, args, cwd);
        if (result.exitCode !== 0) {
            this.logService.warn(`Failed to create tool manifest.Proceeding without server.json for ${id}@${version}.
stdout: ${result.stdout}
stderr: ${result.stderr}`);
            return false;
        }
        return true;
    }
    async installLocalTool(id, version, cwd) {
        const args = this.dotnet.args.concat(["tool", "install", `${id}@${version}`, "--source", this.source, "--local", "--create-manifest-if-needed"]);
        const installResult = await this.commandExecutor.executeWithTimeout(this.dotnet.command, args, cwd);
        if (installResult.exitCode !== 0) {
            this.logService.warn(`Failed to install local tool ${id} @${version}. Proceeding without server.json for ${id}@${version}.
stdout: ${installResult.stdout}
stderr: ${installResult.stderr}`);
            return false;
        }
        return true;
    }
    prepareServerJson(manifest, id, version) {
        // Force the ID and version of matching NuGet package in the server.json to the one we installed.
        // This handles cases where the server.json in the package is stale.
        // The ID should match generally, but we'll protect against unexpected package IDs.
        // We handle old and new schema formats:
        // - https://modelcontextprotocol.io/schemas/draft/2025-07-09/server.json (only hosted in GitHub)
        // - https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json (had several breaking changes over time)
        // - https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json
        if (manifest?.packages) {
            for (const pkg of manifest.packages) {
                if (!pkg) {
                    continue;
                }
                const registryType = pkg.registryType ?? pkg.registry_type ?? pkg.registry_name;
                if (registryType === "nuget") {
                    if (pkg.name && pkg.name !== id) {
                        this.logService.warn(`Package name mismatch in NuGet.mcp / server.json: expected ${id}, found ${pkg.name}.`);
                        pkg.name = id;
                    }
                    if (pkg.identifier && pkg.identifier !== id) {
                        this.logService.warn(`Package identifier mismatch in NuGet.mcp / server.json: expected ${id}, found ${pkg.identifier}.`);
                        pkg.identifier = id;
                    }
                    if (pkg.version !== version) {
                        this.logService.warn(`Package version mismatch in NuGet.mcp / server.json: expected ${version}, found ${pkg.version}.`);
                        pkg.version = version;
                    }
                }
            }
        }
        // the original .NET MCP server project template used a schema URL that is deprecated
        if (manifest["$schema"] === MCP_SERVER_SCHEMA_2025_07_09_GH || !manifest["$schema"]) {
            manifest["$schema"] = McpServerSchemaVersion_v2025_07_09.SCHEMA;
        }
        // add missing properties to improve mapping
        if (!manifest.name) {
            manifest.name = id;
        }
        if (!manifest.description) {
            manifest.description = id;
        }
        if (!manifest.version) {
            manifest.version = version;
        }
        return manifest;
    }
    async readServerManifest(packagesDir, id, version) {
        const serverJsonPath = path_1.default.join(packagesDir, id.toLowerCase(), version.toLowerCase(), ".mcp", "server.json");
        try {
            await fs.access(serverJsonPath, fs.constants.R_OK);
        }
        catch {
            this.logService.info(`No server.json found at ${serverJsonPath}. Proceeding without server.json for ${id}@${version}.`);
            return undefined;
        }
        const json = await fs.readFile(serverJsonPath, 'utf8');
        let manifest;
        try {
            manifest = JSON.parse(json);
        }
        catch {
            this.logService.warn(`Invalid JSON in NuGet package server.json at ${serverJsonPath}. Proceeding without server.json for ${id}@${version}.`);
            return undefined;
        }
        if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
            this.logService.warn(`Invalid JSON in NuGet package server.json at ${serverJsonPath}. Proceeding without server.json for ${id}@${version}.`);
            return undefined;
        }
        return this.prepareServerJson(manifest, id, version);
    }
}
exports.NuGetMcpSetup = NuGetMcpSetup;
function mapServerJsonToMcpServer(input, registryType) {
    let data = input;
    if (!data || typeof data !== 'object' || typeof data.$schema !== 'string') {
        return undefined;
    }
    // starting from 2025-09-29, the server.json is wrapped in a "server" property
    if (data.$schema !== McpServerSchemaVersion_v2025_07_09.SCHEMA) {
        data = { server: data };
    }
    const raw = McpServerSchemaVersion_v0.SERIALIZER.toRawGalleryMcpServer(data);
    if (!raw) {
        return undefined;
    }
    const utility = new McpMappingUtility();
    const result = utility.getMcpServerConfigurationFromManifest(raw, registryType);
    return result.mcpServerConfiguration;
}
var McpServerSchemaVersion_v2025_07_09;
(function (McpServerSchemaVersion_v2025_07_09) {
    McpServerSchemaVersion_v2025_07_09.VERSION = 'v0-2025-07-09';
    McpServerSchemaVersion_v2025_07_09.SCHEMA = `https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json`;
    class Serializer {
        toRawGalleryMcpServer(input) {
            if (!input || typeof input !== 'object') {
                return undefined;
            }
            const from = input;
            if (from.$schema && from.$schema !== McpServerSchemaVersion_v2025_07_09.SCHEMA) {
                return undefined;
            }
            function convertServerInput(input) {
                return {
                    ...input,
                    isRequired: input.is_required,
                    isSecret: input.is_secret,
                };
            }
            function convertVariables(variables) {
                const result = {};
                for (const [key, value] of Object.entries(variables)) {
                    result[key] = convertServerInput(value);
                }
                return result;
            }
            function convertServerArgument(arg) {
                if (arg.type === 'positional') {
                    return {
                        ...arg,
                        valueHint: arg.value_hint,
                        isRepeated: arg.is_repeated,
                        isRequired: arg.is_required,
                        isSecret: arg.is_secret,
                        variables: arg.variables ? convertVariables(arg.variables) : undefined,
                    };
                }
                return {
                    ...arg,
                    isRepeated: arg.is_repeated,
                    isRequired: arg.is_required,
                    isSecret: arg.is_secret,
                    variables: arg.variables ? convertVariables(arg.variables) : undefined,
                };
            }
            function convertKeyValueInput(input) {
                return {
                    ...input,
                    isRequired: input.is_required,
                    isSecret: input.is_secret,
                    variables: input.variables ? convertVariables(input.variables) : undefined,
                };
            }
            function convertTransport(input) {
                switch (input.type) {
                    case 'stdio':
                        return {
                            type: "stdio" /* TransportType.STDIO */,
                        };
                    case 'streamable-http':
                        return {
                            type: "streamable-http" /* TransportType.STREAMABLE_HTTP */,
                            url: input.url,
                            headers: input.headers?.map(convertKeyValueInput),
                        };
                    case 'sse':
                        return {
                            type: "sse" /* TransportType.SSE */,
                            url: input.url,
                            headers: input.headers?.map(convertKeyValueInput),
                        };
                    default:
                        return {
                            type: "stdio" /* TransportType.STDIO */,
                        };
                }
            }
            function convertRegistryType(input) {
                switch (input) {
                    case 'npm':
                        return "npm" /* RegistryType.NODE */;
                    case 'docker':
                    case 'docker-hub':
                    case 'oci':
                        return "oci" /* RegistryType.DOCKER */;
                    case 'pypi':
                        return "pypi" /* RegistryType.PYTHON */;
                    case 'nuget':
                        return "nuget" /* RegistryType.NUGET */;
                    case 'mcpb':
                        return "mcpb" /* RegistryType.MCPB */;
                    default:
                        return "npm" /* RegistryType.NODE */;
                }
            }
            return {
                packages: from.packages?.map(p => ({
                    identifier: p.identifier ?? p.name,
                    registryType: convertRegistryType(p.registry_type ?? p.registry_name),
                    version: p.version,
                    fileSha256: p.file_sha256,
                    registryBaseUrl: p.registry_base_url,
                    transport: p.transport ? convertTransport(p.transport) : { type: "stdio" /* TransportType.STDIO */ },
                    packageArguments: p.package_arguments?.map(convertServerArgument),
                    runtimeHint: p.runtime_hint,
                    runtimeArguments: p.runtime_arguments?.map(convertServerArgument),
                    environmentVariables: p.environment_variables?.map(convertKeyValueInput),
                })),
                remotes: from.remotes?.map(remote => {
                    const type = remote.type ?? remote.transport_type ?? remote.transport;
                    return {
                        type: type === "sse" /* TransportType.SSE */ ? "sse" /* TransportType.SSE */ : "streamable-http" /* TransportType.STREAMABLE_HTTP */,
                        url: remote.url,
                        headers: remote.headers?.map(convertKeyValueInput)
                    };
                }),
            };
        }
    }
    McpServerSchemaVersion_v2025_07_09.SERIALIZER = new Serializer();
})(McpServerSchemaVersion_v2025_07_09 || (exports.McpServerSchemaVersion_v2025_07_09 = McpServerSchemaVersion_v2025_07_09 = {}));
var McpServerSchemaVersion_v0_1;
(function (McpServerSchemaVersion_v0_1) {
    McpServerSchemaVersion_v0_1.VERSION = 'v0.1';
    McpServerSchemaVersion_v0_1.SCHEMA = `https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json`;
    class Serializer {
        toRawGalleryMcpServer(input) {
            if (!input || typeof input !== 'object') {
                return undefined;
            }
            const from = input;
            if ((!from.server || !(0, types_1.isObject)(from.server))) {
                return undefined;
            }
            if (from.server.$schema && from.server.$schema !== McpServerSchemaVersion_v0_1.SCHEMA) {
                return undefined;
            }
            return {
                packages: from.server.packages,
                remotes: from.server.remotes,
            };
        }
    }
    McpServerSchemaVersion_v0_1.SERIALIZER = new Serializer();
})(McpServerSchemaVersion_v0_1 || (McpServerSchemaVersion_v0_1 = {}));
var McpServerSchemaVersion_v0;
(function (McpServerSchemaVersion_v0) {
    McpServerSchemaVersion_v0.VERSION = 'v0';
    class Serializer {
        constructor() {
            this.galleryMcpServerDataSerializers = [];
            this.galleryMcpServerDataSerializers.push(McpServerSchemaVersion_v0_1.SERIALIZER);
            this.galleryMcpServerDataSerializers.push(McpServerSchemaVersion_v2025_07_09.SERIALIZER);
        }
        toRawGalleryMcpServer(input) {
            for (const serializer of this.galleryMcpServerDataSerializers) {
                const result = serializer.toRawGalleryMcpServer(input);
                if (result) {
                    return result;
                }
            }
            return undefined;
        }
    }
    McpServerSchemaVersion_v0.SERIALIZER = new Serializer();
})(McpServerSchemaVersion_v0 || (exports.McpServerSchemaVersion_v0 = McpServerSchemaVersion_v0 = {}));
// Copied from https://github.com/microsoft/vscode/blob/f8e2f71c2f78ac1ce63389e761e2aefc724646fc/src/vs/platform/mcp/common/mcpManagementService.ts
class McpMappingUtility {
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
}
exports.McpMappingUtility = McpMappingUtility;
//# sourceMappingURL=nuget.js.map