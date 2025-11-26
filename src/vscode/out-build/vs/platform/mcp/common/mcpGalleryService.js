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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { format2, uppercaseFirstLetter } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { asJson, asText, IRequestService } from '../../request/common/request.js';
import { IMcpGalleryManifestService, getMcpGalleryManifestResourceUri } from './mcpGalleryManifest.js';
import { CancellationError } from '../../../base/common/errors.js';
import { isObject, isString } from '../../../base/common/types.js';
var IconMimeType;
(function (IconMimeType) {
    IconMimeType["PNG"] = "image/png";
    IconMimeType["JPEG"] = "image/jpeg";
    IconMimeType["JPG"] = "image/jpg";
    IconMimeType["SVG"] = "image/svg+xml";
    IconMimeType["WEBP"] = "image/webp";
})(IconMimeType || (IconMimeType = {}));
var IconTheme;
(function (IconTheme) {
    IconTheme["LIGHT"] = "light";
    IconTheme["DARK"] = "dark";
})(IconTheme || (IconTheme = {}));
var McpServerSchemaVersion_v2025_07_09;
(function (McpServerSchemaVersion_v2025_07_09) {
    McpServerSchemaVersion_v2025_07_09.VERSION = 'v0-2025-07-09';
    McpServerSchemaVersion_v2025_07_09.SCHEMA = `https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json`;
    class Serializer {
        toRawGalleryMcpServerResult(input) {
            if (!input || typeof input !== 'object' || !Array.isArray(input.servers)) {
                return undefined;
            }
            const from = input;
            const servers = [];
            for (const server of from.servers) {
                const rawServer = this.toRawGalleryMcpServer(server);
                if (!rawServer) {
                    return undefined;
                }
                servers.push(rawServer);
            }
            return {
                metadata: {
                    count: from.metadata.count ?? 0,
                    nextCursor: from.metadata?.next_cursor
                },
                servers
            };
        }
        toRawGalleryMcpServer(input) {
            if (!input || typeof input !== 'object') {
                return undefined;
            }
            const from = input;
            if ((!from.name || !isString(from.name))
                || (!from.description || !isString(from.description))
                || (!from.version || !isString(from.version))) {
                return undefined;
            }
            if (from.$schema && from.$schema !== McpServerSchemaVersion_v2025_07_09.SCHEMA) {
                return undefined;
            }
            const registryInfo = from._meta?.['io.modelcontextprotocol.registry/official'];
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
            const gitHubInfo = from._meta['io.modelcontextprotocol.registry/publisher-provided']?.github;
            return {
                id: registryInfo.id,
                name: from.name,
                description: from.description,
                repository: from.repository ? {
                    url: from.repository.url,
                    source: from.repository.source,
                    id: from.repository.id,
                } : undefined,
                readme: from.repository?.readme,
                version: from.version,
                createdAt: from.created_at,
                updatedAt: from.updated_at,
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
                registryInfo: {
                    isLatest: registryInfo.is_latest,
                    publishedAt: registryInfo.published_at,
                    updatedAt: registryInfo.updated_at,
                },
                githubInfo: gitHubInfo ? {
                    name: gitHubInfo.name,
                    nameWithOwner: gitHubInfo.name_with_owner,
                    displayName: gitHubInfo.display_name,
                    isInOrganization: gitHubInfo.is_in_organization,
                    license: gitHubInfo.license,
                    opengraphImageUrl: gitHubInfo.opengraph_image_url,
                    ownerAvatarUrl: gitHubInfo.owner_avatar_url,
                    primaryLanguage: gitHubInfo.primary_language,
                    primaryLanguageColor: gitHubInfo.primary_language_color,
                    pushedAt: gitHubInfo.pushed_at,
                    stargazerCount: gitHubInfo.stargazer_count,
                    topics: gitHubInfo.topics,
                    usesCustomOpengraphImage: gitHubInfo.uses_custom_opengraph_image
                } : undefined
            };
        }
    }
    McpServerSchemaVersion_v2025_07_09.SERIALIZER = new Serializer();
})(McpServerSchemaVersion_v2025_07_09 || (McpServerSchemaVersion_v2025_07_09 = {}));
var McpServerSchemaVersion_v0_1;
(function (McpServerSchemaVersion_v0_1) {
    McpServerSchemaVersion_v0_1.VERSION = 'v0.1';
    McpServerSchemaVersion_v0_1.SCHEMA = `https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json`;
    class Serializer {
        toRawGalleryMcpServerResult(input) {
            if (!input || typeof input !== 'object' || !Array.isArray(input.servers)) {
                return undefined;
            }
            const from = input;
            const servers = [];
            for (const server of from.servers) {
                const rawServer = this.toRawGalleryMcpServer(server);
                if (!rawServer) {
                    if (servers.length === 0) {
                        return undefined;
                    }
                    else {
                        continue;
                    }
                }
                servers.push(rawServer);
            }
            return {
                metadata: from.metadata,
                servers
            };
        }
        toRawGalleryMcpServer(input) {
            if (!input || typeof input !== 'object') {
                return undefined;
            }
            const from = input;
            if ((!from.server || !isObject(from.server))
                || (!from.server.name || !isString(from.server.name))
                || (!from.server.description || !isString(from.server.description))
                || (!from.server.version || !isString(from.server.version))) {
                return undefined;
            }
            if (from.server.$schema && from.server.$schema !== McpServerSchemaVersion_v0_1.SCHEMA) {
                return undefined;
            }
            const { 'io.modelcontextprotocol.registry/official': registryInfo, ...apicInfo } = from._meta;
            const githubInfo = from.server._meta?.['io.modelcontextprotocol.registry/publisher-provided']?.github;
            return {
                name: from.server.name,
                description: from.server.description,
                version: from.server.version,
                title: from.server.title,
                repository: from.server.repository ? {
                    url: from.server.repository.url,
                    source: from.server.repository.source,
                    id: from.server.repository.id,
                } : undefined,
                readme: githubInfo?.readme,
                icons: from.server.icons,
                websiteUrl: from.server.websiteUrl,
                packages: from.server.packages,
                remotes: from.server.remotes,
                status: registryInfo?.status,
                registryInfo,
                githubInfo,
                apicInfo
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
        toRawGalleryMcpServerResult(input) {
            for (const serializer of this.galleryMcpServerDataSerializers) {
                const result = serializer.toRawGalleryMcpServerResult(input);
                if (result) {
                    return result;
                }
            }
            return undefined;
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
})(McpServerSchemaVersion_v0 || (McpServerSchemaVersion_v0 = {}));
const DefaultPageSize = 50;
const DefaultQueryState = {
    pageSize: DefaultPageSize,
};
class Query {
    constructor(state = DefaultQueryState) {
        this.state = state;
    }
    get pageSize() { return this.state.pageSize; }
    get searchText() { return this.state.searchText; }
    get cursor() { return this.state.cursor; }
    withPage(cursor, pageSize = this.pageSize) {
        return new Query({ ...this.state, pageSize, cursor });
    }
    withSearchText(searchText) {
        return new Query({ ...this.state, searchText });
    }
}
let McpGalleryService = class McpGalleryService extends Disposable {
    constructor(requestService, fileService, logService, mcpGalleryManifestService) {
        super();
        this.requestService = requestService;
        this.fileService = fileService;
        this.logService = logService;
        this.mcpGalleryManifestService = mcpGalleryManifestService;
        this.galleryMcpServerDataSerializers = new Map();
        this.galleryMcpServerDataSerializers.set(McpServerSchemaVersion_v0.VERSION, McpServerSchemaVersion_v0.SERIALIZER);
        this.galleryMcpServerDataSerializers.set(McpServerSchemaVersion_v0_1.VERSION, McpServerSchemaVersion_v0_1.SERIALIZER);
    }
    isEnabled() {
        return this.mcpGalleryManifestService.mcpGalleryManifestStatus === "available" /* McpGalleryManifestStatus.Available */;
    }
    async query(options, token = CancellationToken.None) {
        const mcpGalleryManifest = await this.mcpGalleryManifestService.getMcpGalleryManifest();
        if (!mcpGalleryManifest) {
            return {
                firstPage: { items: [], hasMore: false },
                getNextPage: async () => ({ items: [], hasMore: false })
            };
        }
        let query = new Query();
        if (options?.text) {
            query = query.withSearchText(options.text.trim());
        }
        const { servers, metadata } = await this.queryGalleryMcpServers(query, mcpGalleryManifest, token);
        let currentCursor = metadata.nextCursor;
        return {
            firstPage: { items: servers, hasMore: !!metadata.nextCursor },
            getNextPage: async (ct) => {
                if (ct.isCancellationRequested) {
                    throw new CancellationError();
                }
                if (!currentCursor) {
                    return { items: [], hasMore: false };
                }
                const { servers, metadata: nextMetadata } = await this.queryGalleryMcpServers(query.withPage(currentCursor).withSearchText(undefined), mcpGalleryManifest, ct);
                currentCursor = nextMetadata.nextCursor;
                return { items: servers, hasMore: !!nextMetadata.nextCursor };
            }
        };
    }
    async getMcpServersFromGallery(infos) {
        const mcpGalleryManifest = await this.mcpGalleryManifestService.getMcpGalleryManifest();
        if (!mcpGalleryManifest) {
            return [];
        }
        const mcpServers = [];
        await Promise.allSettled(infos.map(async (info) => {
            const mcpServer = await this.getMcpServerByName(info, mcpGalleryManifest);
            if (mcpServer) {
                mcpServers.push(mcpServer);
            }
        }));
        return mcpServers;
    }
    async getMcpServerByName({ name, id }, mcpGalleryManifest) {
        const mcpServerUrl = this.getLatestServerVersionUrl(name, mcpGalleryManifest);
        if (mcpServerUrl) {
            const mcpServer = await this.getMcpServer(mcpServerUrl);
            if (mcpServer) {
                return mcpServer;
            }
        }
        const byNameUrl = this.getNamedServerUrl(name, mcpGalleryManifest);
        if (byNameUrl) {
            const mcpServer = await this.getMcpServer(byNameUrl);
            if (mcpServer) {
                return mcpServer;
            }
        }
        const byIdUrl = id ? this.getServerIdUrl(id, mcpGalleryManifest) : undefined;
        if (byIdUrl) {
            const mcpServer = await this.getMcpServer(byIdUrl);
            if (mcpServer) {
                return mcpServer;
            }
        }
        return undefined;
    }
    async getReadme(gallery, token) {
        const readmeUrl = gallery.readmeUrl;
        if (!readmeUrl) {
            return Promise.resolve(localize(2177, null));
        }
        const uri = URI.parse(readmeUrl);
        if (uri.scheme === Schemas.file) {
            try {
                const content = await this.fileService.readFile(uri);
                return content.value.toString();
            }
            catch (error) {
                this.logService.error(`Failed to read file from ${uri}: ${error}`);
            }
        }
        if (uri.authority !== 'raw.githubusercontent.com') {
            return new MarkdownString(localize(2178, null, readmeUrl)).value;
        }
        const context = await this.requestService.request({
            type: 'GET',
            url: readmeUrl,
        }, token);
        const result = await asText(context);
        if (!result) {
            throw new Error(`Failed to fetch README from ${readmeUrl}`);
        }
        return result;
    }
    toGalleryMcpServer(server, manifest) {
        let publisher = '';
        let displayName = server.title;
        if (server.githubInfo?.name) {
            if (!displayName) {
                displayName = server.githubInfo.name.split('-').map(s => s.toLowerCase() === 'mcp' ? 'MCP' : s.toLowerCase() === 'github' ? 'GitHub' : uppercaseFirstLetter(s)).join(' ');
            }
            publisher = server.githubInfo.nameWithOwner.split('/')[0];
        }
        else {
            const nameParts = server.name.split('/');
            if (nameParts.length > 0) {
                const domainParts = nameParts[0].split('.');
                if (domainParts.length > 0) {
                    publisher = domainParts[domainParts.length - 1]; // Always take the last part as owner
                }
            }
            if (!displayName) {
                displayName = nameParts[nameParts.length - 1].split('-').map(s => uppercaseFirstLetter(s)).join(' ');
            }
        }
        if (server.githubInfo?.displayName) {
            displayName = server.githubInfo.displayName;
        }
        let icon;
        if (server.githubInfo?.preferredImage) {
            icon = {
                light: server.githubInfo.preferredImage,
                dark: server.githubInfo.preferredImage
            };
        }
        else if (server.githubInfo?.ownerAvatarUrl) {
            icon = {
                light: server.githubInfo.ownerAvatarUrl,
                dark: server.githubInfo.ownerAvatarUrl
            };
        }
        else if (server.apicInfo?.['x-ms-icon']) {
            icon = {
                light: server.apicInfo['x-ms-icon'],
                dark: server.apicInfo['x-ms-icon']
            };
        }
        else if (server.icons && server.icons.length > 0) {
            const lightIcon = server.icons.find(icon => icon.theme === 'light') ?? server.icons[0];
            const darkIcon = server.icons.find(icon => icon.theme === 'dark') ?? lightIcon;
            icon = {
                light: lightIcon.src,
                dark: darkIcon.src
            };
        }
        const webUrl = manifest ? this.getWebUrl(server.name, manifest) : undefined;
        const publisherUrl = manifest ? this.getPublisherUrl(publisher, manifest) : undefined;
        return {
            id: server.id,
            name: server.name,
            displayName,
            galleryUrl: manifest?.url,
            webUrl,
            description: server.description,
            status: server.status ?? "active" /* GalleryMcpServerStatus.Active */,
            version: server.version,
            isLatest: server.registryInfo?.isLatest ?? true,
            publishDate: server.registryInfo?.publishedAt ? Date.parse(server.registryInfo.publishedAt) : undefined,
            lastUpdated: server.githubInfo?.pushedAt ? Date.parse(server.githubInfo.pushedAt) : server.registryInfo?.updatedAt ? Date.parse(server.registryInfo.updatedAt) : undefined,
            repositoryUrl: server.repository?.url,
            readme: server.readme,
            icon,
            publisher,
            publisherUrl,
            license: server.githubInfo?.license,
            starsCount: server.githubInfo?.stargazerCount,
            topics: server.githubInfo?.topics,
            configuration: {
                packages: server.packages,
                remotes: server.remotes
            }
        };
    }
    async queryGalleryMcpServers(query, mcpGalleryManifest, token) {
        const { servers, metadata } = await this.queryRawGalleryMcpServers(query, mcpGalleryManifest, token);
        return {
            servers: servers.map(item => this.toGalleryMcpServer(item, mcpGalleryManifest)),
            metadata
        };
    }
    async queryRawGalleryMcpServers(query, mcpGalleryManifest, token) {
        const mcpGalleryUrl = this.getMcpGalleryUrl(mcpGalleryManifest);
        if (!mcpGalleryUrl) {
            return { servers: [], metadata: { count: 0 } };
        }
        const uri = URI.parse(mcpGalleryUrl);
        if (uri.scheme === Schemas.file) {
            try {
                const content = await this.fileService.readFile(uri);
                const data = content.value.toString();
                return JSON.parse(data);
            }
            catch (error) {
                this.logService.error(`Failed to read file from ${uri}: ${error}`);
            }
        }
        let url = `${mcpGalleryUrl}?limit=${query.pageSize}`;
        if (query.cursor) {
            url += `&cursor=${query.cursor}`;
        }
        if (query.searchText) {
            const text = encodeURIComponent(query.searchText);
            url += `&search=${text}`;
        }
        const context = await this.requestService.request({
            type: 'GET',
            url,
        }, token);
        const data = await asJson(context);
        if (!data) {
            return { servers: [], metadata: { count: 0 } };
        }
        const result = this.serializeMcpServersResult(data, mcpGalleryManifest);
        if (!result) {
            throw new Error(`Failed to serialize MCP servers result from ${mcpGalleryUrl}`, data);
        }
        return result;
    }
    async getMcpServer(mcpServerUrl, mcpGalleryManifest) {
        const context = await this.requestService.request({
            type: 'GET',
            url: mcpServerUrl,
        }, CancellationToken.None);
        if (context.res.statusCode && context.res.statusCode >= 400 && context.res.statusCode < 500) {
            return undefined;
        }
        const data = await asJson(context);
        if (!data) {
            return undefined;
        }
        if (!mcpGalleryManifest) {
            mcpGalleryManifest = await this.mcpGalleryManifestService.getMcpGalleryManifest();
        }
        mcpGalleryManifest = mcpGalleryManifest && mcpServerUrl.startsWith(mcpGalleryManifest.url) ? mcpGalleryManifest : null;
        const server = this.serializeMcpServer(data, mcpGalleryManifest);
        if (!server) {
            throw new Error(`Failed to serialize MCP server from ${mcpServerUrl}`, data);
        }
        return this.toGalleryMcpServer(server, mcpGalleryManifest);
    }
    serializeMcpServer(data, mcpGalleryManifest) {
        return this.getSerializer(mcpGalleryManifest)?.toRawGalleryMcpServer(data);
    }
    serializeMcpServersResult(data, mcpGalleryManifest) {
        return this.getSerializer(mcpGalleryManifest)?.toRawGalleryMcpServerResult(data);
    }
    getSerializer(mcpGalleryManifest) {
        const version = mcpGalleryManifest?.version ?? 'v0';
        return this.galleryMcpServerDataSerializers.get(version);
    }
    getNamedServerUrl(name, mcpGalleryManifest) {
        const namedResourceUriTemplate = getMcpGalleryManifestResourceUri(mcpGalleryManifest, "McpServerNamedResourceUriTemplate" /* McpGalleryResourceType.McpServerNamedResourceUri */);
        if (!namedResourceUriTemplate) {
            return undefined;
        }
        return format2(namedResourceUriTemplate, { name });
    }
    getServerIdUrl(id, mcpGalleryManifest) {
        const resourceUriTemplate = getMcpGalleryManifestResourceUri(mcpGalleryManifest, "McpServerIdUriTemplate" /* McpGalleryResourceType.McpServerIdUri */);
        if (!resourceUriTemplate) {
            return undefined;
        }
        return format2(resourceUriTemplate, { id });
    }
    getLatestServerVersionUrl(name, mcpGalleryManifest) {
        const latestVersionResourceUriTemplate = getMcpGalleryManifestResourceUri(mcpGalleryManifest, "McpServerLatestVersionUriTemplate" /* McpGalleryResourceType.McpServerLatestVersionUri */);
        if (!latestVersionResourceUriTemplate) {
            return undefined;
        }
        return format2(latestVersionResourceUriTemplate, { name: encodeURIComponent(name) });
    }
    getWebUrl(name, mcpGalleryManifest) {
        const resourceUriTemplate = getMcpGalleryManifestResourceUri(mcpGalleryManifest, "McpServerWebUriTemplate" /* McpGalleryResourceType.McpServerWebUri */);
        if (!resourceUriTemplate) {
            return undefined;
        }
        return format2(resourceUriTemplate, { name });
    }
    getPublisherUrl(name, mcpGalleryManifest) {
        const resourceUriTemplate = getMcpGalleryManifestResourceUri(mcpGalleryManifest, "PublisherUriTemplate" /* McpGalleryResourceType.PublisherUriTemplate */);
        if (!resourceUriTemplate) {
            return undefined;
        }
        return format2(resourceUriTemplate, { name });
    }
    getMcpGalleryUrl(mcpGalleryManifest) {
        return getMcpGalleryManifestResourceUri(mcpGalleryManifest, "McpServersQueryService" /* McpGalleryResourceType.McpServersQueryService */);
    }
};
McpGalleryService = __decorate([
    __param(0, IRequestService),
    __param(1, IFileService),
    __param(2, ILogService),
    __param(3, IMcpGalleryManifestService)
], McpGalleryService);
export { McpGalleryService };
//# sourceMappingURL=mcpGalleryService.js.map