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
import { equals as arraysEqual } from '../../../../base/common/arrays.js';
import { assertNever } from '../../../../base/common/assert.js';
import { decodeHex, encodeHex, VSBuffer } from '../../../../base/common/buffer.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { equals as objectsEqual } from '../../../../base/common/objects.js';
import { ObservableMap } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { MCP } from './modelContextProtocol.js';
export const extensionMcpCollectionPrefix = 'ext.';
export function extensionPrefixedIdentifier(identifier, id) {
    return ExtensionIdentifier.toKey(identifier) + '/' + id;
}
export var McpCollectionSortOrder;
(function (McpCollectionSortOrder) {
    McpCollectionSortOrder[McpCollectionSortOrder["WorkspaceFolder"] = 0] = "WorkspaceFolder";
    McpCollectionSortOrder[McpCollectionSortOrder["Workspace"] = 100] = "Workspace";
    McpCollectionSortOrder[McpCollectionSortOrder["User"] = 200] = "User";
    McpCollectionSortOrder[McpCollectionSortOrder["Extension"] = 300] = "Extension";
    McpCollectionSortOrder[McpCollectionSortOrder["Filesystem"] = 400] = "Filesystem";
    McpCollectionSortOrder[McpCollectionSortOrder["RemoteBoost"] = -50] = "RemoteBoost";
})(McpCollectionSortOrder || (McpCollectionSortOrder = {}));
export var McpCollectionDefinition;
(function (McpCollectionDefinition) {
    function equals(a, b) {
        return a.id === b.id
            && a.remoteAuthority === b.remoteAuthority
            && a.label === b.label
            && a.trustBehavior === b.trustBehavior;
    }
    McpCollectionDefinition.equals = equals;
})(McpCollectionDefinition || (McpCollectionDefinition = {}));
export var McpServerStaticToolAvailability;
(function (McpServerStaticToolAvailability) {
    /** Tool is expected to be present as soon as the server is started. */
    McpServerStaticToolAvailability[McpServerStaticToolAvailability["Initial"] = 0] = "Initial";
    /** Tool may be present later. */
    McpServerStaticToolAvailability[McpServerStaticToolAvailability["Dynamic"] = 1] = "Dynamic";
})(McpServerStaticToolAvailability || (McpServerStaticToolAvailability = {}));
export var McpServerDefinition;
(function (McpServerDefinition) {
    function toSerialized(def) {
        return def;
    }
    McpServerDefinition.toSerialized = toSerialized;
    function fromSerialized(def) {
        return {
            id: def.id,
            label: def.label,
            cacheNonce: def.cacheNonce,
            staticMetadata: def.staticMetadata,
            launch: McpServerLaunch.fromSerialized(def.launch),
            variableReplacement: def.variableReplacement ? McpServerDefinitionVariableReplacement.fromSerialized(def.variableReplacement) : undefined,
        };
    }
    McpServerDefinition.fromSerialized = fromSerialized;
    function equals(a, b) {
        return a.id === b.id
            && a.label === b.label
            && arraysEqual(a.roots, b.roots, (a, b) => a.toString() === b.toString())
            && objectsEqual(a.launch, b.launch)
            && objectsEqual(a.presentation, b.presentation)
            && objectsEqual(a.variableReplacement, b.variableReplacement)
            && objectsEqual(a.devMode, b.devMode);
    }
    McpServerDefinition.equals = equals;
})(McpServerDefinition || (McpServerDefinition = {}));
export var McpServerDefinitionVariableReplacement;
(function (McpServerDefinitionVariableReplacement) {
    function toSerialized(def) {
        return def;
    }
    McpServerDefinitionVariableReplacement.toSerialized = toSerialized;
    function fromSerialized(def) {
        return {
            section: def.section,
            folder: def.folder ? { ...def.folder, uri: URI.revive(def.folder.uri) } : undefined,
            target: def.target,
        };
    }
    McpServerDefinitionVariableReplacement.fromSerialized = fromSerialized;
})(McpServerDefinitionVariableReplacement || (McpServerDefinitionVariableReplacement = {}));
export var IAutostartResult;
(function (IAutostartResult) {
    IAutostartResult.Empty = { working: false, starting: [], serversRequiringInteraction: [] };
})(IAutostartResult || (IAutostartResult = {}));
export var LazyCollectionState;
(function (LazyCollectionState) {
    LazyCollectionState[LazyCollectionState["HasUnknown"] = 0] = "HasUnknown";
    LazyCollectionState[LazyCollectionState["LoadingUnknown"] = 1] = "LoadingUnknown";
    LazyCollectionState[LazyCollectionState["AllKnown"] = 2] = "AllKnown";
})(LazyCollectionState || (LazyCollectionState = {}));
export const IMcpService = createDecorator('IMcpService');
export class McpStartServerInteraction {
    constructor() {
        /** @internal */
        this.participants = new ObservableMap();
    }
}
export var McpServerTrust;
(function (McpServerTrust) {
    let Kind;
    (function (Kind) {
        /** The server is trusted */
        Kind[Kind["Trusted"] = 0] = "Trusted";
        /** The server is trusted as long as its nonce matches */
        Kind[Kind["TrustedOnNonce"] = 1] = "TrustedOnNonce";
        /** The server trust was denied. */
        Kind[Kind["Untrusted"] = 2] = "Untrusted";
        /** The server is not yet trusted or untrusted. */
        Kind[Kind["Unknown"] = 3] = "Unknown";
    })(Kind = McpServerTrust.Kind || (McpServerTrust.Kind = {}));
})(McpServerTrust || (McpServerTrust = {}));
export const isMcpResourceTemplate = (obj) => {
    return obj.template !== undefined;
};
export const isMcpResource = (obj) => {
    return obj.mcpUri !== undefined;
};
export var McpServerCacheState;
(function (McpServerCacheState) {
    /** Tools have not been read before */
    McpServerCacheState[McpServerCacheState["Unknown"] = 0] = "Unknown";
    /** Tools were read from the cache */
    McpServerCacheState[McpServerCacheState["Cached"] = 1] = "Cached";
    /** Tools were read from the cache or live, but they may be outdated. */
    McpServerCacheState[McpServerCacheState["Outdated"] = 2] = "Outdated";
    /** Tools are refreshing for the first time */
    McpServerCacheState[McpServerCacheState["RefreshingFromUnknown"] = 3] = "RefreshingFromUnknown";
    /** Tools are refreshing and the current tools are cached */
    McpServerCacheState[McpServerCacheState["RefreshingFromCached"] = 4] = "RefreshingFromCached";
    /** Tool state is live, server is connected */
    McpServerCacheState[McpServerCacheState["Live"] = 5] = "Live";
})(McpServerCacheState || (McpServerCacheState = {}));
export const mcpPromptReplaceSpecialChars = (s) => s.replace(/[^a-z0-9_.-]/gi, '_');
export const mcpPromptPrefix = (definition) => `/mcp.` + mcpPromptReplaceSpecialChars(definition.label);
export var McpServerTransportType;
(function (McpServerTransportType) {
    /** A command-line MCP server communicating over standard in/out */
    McpServerTransportType[McpServerTransportType["Stdio"] = 1] = "Stdio";
    /** An MCP server that uses Server-Sent Events */
    McpServerTransportType[McpServerTransportType["HTTP"] = 2] = "HTTP";
})(McpServerTransportType || (McpServerTransportType = {}));
export var McpServerLaunch;
(function (McpServerLaunch) {
    function toSerialized(launch) {
        return launch;
    }
    McpServerLaunch.toSerialized = toSerialized;
    function fromSerialized(launch) {
        switch (launch.type) {
            case 2 /* McpServerTransportType.HTTP */:
                return { type: launch.type, uri: URI.revive(launch.uri), headers: launch.headers, authentication: launch.authentication };
            case 1 /* McpServerTransportType.Stdio */:
                return {
                    type: launch.type,
                    cwd: launch.cwd,
                    command: launch.command,
                    args: launch.args,
                    env: launch.env,
                    envFile: launch.envFile,
                };
        }
    }
    McpServerLaunch.fromSerialized = fromSerialized;
    async function hash(launch) {
        const nonce = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(launch)));
        return encodeHex(VSBuffer.wrap(new Uint8Array(nonce)));
    }
    McpServerLaunch.hash = hash;
})(McpServerLaunch || (McpServerLaunch = {}));
/**
 * McpConnectionState is the state of the underlying connection and is
 * communicated e.g. from the extension host to the renderer.
 */
export var McpConnectionState;
(function (McpConnectionState) {
    let Kind;
    (function (Kind) {
        Kind[Kind["Stopped"] = 0] = "Stopped";
        Kind[Kind["Starting"] = 1] = "Starting";
        Kind[Kind["Running"] = 2] = "Running";
        Kind[Kind["Error"] = 3] = "Error";
    })(Kind = McpConnectionState.Kind || (McpConnectionState.Kind = {}));
    McpConnectionState.toString = (s) => {
        switch (s.state) {
            case 0 /* Kind.Stopped */:
                return localize(9905, null);
            case 1 /* Kind.Starting */:
                return localize(9906, null);
            case 2 /* Kind.Running */:
                return localize(9907, null);
            case 3 /* Kind.Error */:
                return localize(9908, null, s.message);
            default:
                assertNever(s);
        }
    };
    McpConnectionState.toKindString = (s) => {
        switch (s) {
            case 0 /* Kind.Stopped */:
                return 'stopped';
            case 1 /* Kind.Starting */:
                return 'starting';
            case 2 /* Kind.Running */:
                return 'running';
            case 3 /* Kind.Error */:
                return 'error';
            default:
                assertNever(s);
        }
    };
    /** Returns if the MCP state is one where starting a new server is valid */
    McpConnectionState.canBeStarted = (s) => s === 3 /* Kind.Error */ || s === 0 /* Kind.Stopped */;
    /** Gets whether the state is a running state. */
    McpConnectionState.isRunning = (s) => !McpConnectionState.canBeStarted(s.state);
})(McpConnectionState || (McpConnectionState = {}));
export class MpcResponseError extends Error {
    constructor(message, code, data) {
        super(`MPC ${code}: ${message}`);
        this.code = code;
        this.data = data;
    }
}
export class McpConnectionFailedError extends Error {
}
export class UserInteractionRequiredError extends Error {
    static { this.prefix = 'User interaction required: '; }
    static is(error) {
        return error.message.startsWith(this.prefix);
    }
    constructor(reason) {
        super(`${UserInteractionRequiredError.prefix}${reason}`);
        this.reason = reason;
    }
}
export var McpServerEnablementState;
(function (McpServerEnablementState) {
    McpServerEnablementState[McpServerEnablementState["Disabled"] = 0] = "Disabled";
    McpServerEnablementState[McpServerEnablementState["DisabledByAccess"] = 1] = "DisabledByAccess";
    McpServerEnablementState[McpServerEnablementState["Enabled"] = 2] = "Enabled";
})(McpServerEnablementState || (McpServerEnablementState = {}));
export var McpServerInstallState;
(function (McpServerInstallState) {
    McpServerInstallState[McpServerInstallState["Installing"] = 0] = "Installing";
    McpServerInstallState[McpServerInstallState["Installed"] = 1] = "Installed";
    McpServerInstallState[McpServerInstallState["Uninstalling"] = 2] = "Uninstalling";
    McpServerInstallState[McpServerInstallState["Uninstalled"] = 3] = "Uninstalled";
})(McpServerInstallState || (McpServerInstallState = {}));
export var McpServerEditorTab;
(function (McpServerEditorTab) {
    McpServerEditorTab["Readme"] = "readme";
    McpServerEditorTab["Manifest"] = "manifest";
    McpServerEditorTab["Configuration"] = "configuration";
})(McpServerEditorTab || (McpServerEditorTab = {}));
export const IMcpWorkbenchService = createDecorator('IMcpWorkbenchService');
let McpServerContainers = class McpServerContainers extends Disposable {
    constructor(containers, mcpWorkbenchService) {
        super();
        this.containers = containers;
        this._register(mcpWorkbenchService.onChange(this.update, this));
    }
    set mcpServer(extension) {
        this.containers.forEach(c => c.mcpServer = extension);
    }
    update(server) {
        for (const container of this.containers) {
            if (server && container.mcpServer) {
                if (server.id === container.mcpServer.id) {
                    container.mcpServer = server;
                }
            }
            else {
                container.update();
            }
        }
    }
};
McpServerContainers = __decorate([
    __param(1, IMcpWorkbenchService)
], McpServerContainers);
export { McpServerContainers };
export const McpServersGalleryStatusContext = new RawContextKey('mcpServersGalleryStatus', "unavailable" /* McpGalleryManifestStatus.Unavailable */);
export const HasInstalledMcpServersContext = new RawContextKey('hasInstalledMcpServers', true);
export const InstalledMcpServersViewId = 'workbench.views.mcp.installed';
export var McpResourceURI;
(function (McpResourceURI) {
    McpResourceURI.scheme = 'mcp-resource';
    // Random placeholder for empty authorities, otherwise they're represente as
    // `scheme//path/here` in the URI which would get normalized to `scheme/path/here`.
    const emptyAuthorityPlaceholder = 'dylo78gyp'; // chosen by a fair dice roll. Guaranteed to be random.
    function fromServer(def, resourceURI) {
        if (typeof resourceURI === 'string') {
            resourceURI = URI.parse(resourceURI);
        }
        return resourceURI.with({
            scheme: McpResourceURI.scheme,
            authority: encodeHex(VSBuffer.fromString(def.id)),
            path: ['', resourceURI.scheme, resourceURI.authority || emptyAuthorityPlaceholder].join('/') + resourceURI.path,
        });
    }
    McpResourceURI.fromServer = fromServer;
    function toServer(uri) {
        if (typeof uri === 'string') {
            uri = URI.parse(uri);
        }
        if (uri.scheme !== McpResourceURI.scheme) {
            throw new Error(`Invalid MCP resource URI: ${uri.toString()}`);
        }
        const parts = uri.path.split('/');
        if (parts.length < 3) {
            throw new Error(`Invalid MCP resource URI: ${uri.toString()}`);
        }
        const [, serverScheme, authority, ...path] = parts;
        // URI cannot correctly stringify empty authorities (#250905) so we use URL instead to construct
        const url = new URL(`${serverScheme}://${authority.toLowerCase() === emptyAuthorityPlaceholder ? '' : authority}`);
        url.pathname = path.length ? ('/' + path.join('/')) : '';
        url.search = uri.query;
        url.hash = uri.fragment;
        return {
            definitionId: decodeHex(uri.authority).toString(),
            resourceURL: url,
        };
    }
    McpResourceURI.toServer = toServer;
})(McpResourceURI || (McpResourceURI = {}));
/** Warning: this enum is cached in `mcpServer.ts` and all changes MUST only be additive. */
export var McpCapability;
(function (McpCapability) {
    McpCapability[McpCapability["Logging"] = 1] = "Logging";
    McpCapability[McpCapability["Completions"] = 2] = "Completions";
    McpCapability[McpCapability["Prompts"] = 4] = "Prompts";
    McpCapability[McpCapability["PromptsListChanged"] = 8] = "PromptsListChanged";
    McpCapability[McpCapability["Resources"] = 16] = "Resources";
    McpCapability[McpCapability["ResourcesSubscribe"] = 32] = "ResourcesSubscribe";
    McpCapability[McpCapability["ResourcesListChanged"] = 64] = "ResourcesListChanged";
    McpCapability[McpCapability["Tools"] = 128] = "Tools";
    McpCapability[McpCapability["ToolsListChanged"] = 256] = "ToolsListChanged";
})(McpCapability || (McpCapability = {}));
export const IMcpSamplingService = createDecorator('IMcpServerSampling');
export class McpError extends Error {
    static methodNotFound(method) {
        return new McpError(MCP.METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
    static notAllowed() {
        return new McpError(-32000, 'The user has denied permission to call this method.');
    }
    static unknown(e) {
        const mcpError = new McpError(MCP.INTERNAL_ERROR, `Unknown error: ${e.stack}`);
        mcpError.cause = e;
        return mcpError;
    }
    constructor(code, message, data) {
        super(message);
        this.code = code;
        this.data = data;
    }
}
export var McpToolName;
(function (McpToolName) {
    McpToolName["Prefix"] = "mcp_";
    McpToolName[McpToolName["MaxPrefixLen"] = 18] = "MaxPrefixLen";
    McpToolName[McpToolName["MaxLength"] = 64] = "MaxLength";
})(McpToolName || (McpToolName = {}));
export var ElicitationKind;
(function (ElicitationKind) {
    ElicitationKind[ElicitationKind["Form"] = 0] = "Form";
    ElicitationKind[ElicitationKind["URL"] = 1] = "URL";
})(ElicitationKind || (ElicitationKind = {}));
export const IMcpElicitationService = createDecorator('IMcpElicitationService');
export const McpToolResourceLinkMimeType = 'application/vnd.code.resource-link';
//# sourceMappingURL=mcpTypes.js.map