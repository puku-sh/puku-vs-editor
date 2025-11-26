/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var RegistryType;
(function (RegistryType) {
    RegistryType["NODE"] = "npm";
    RegistryType["PYTHON"] = "pypi";
    RegistryType["DOCKER"] = "oci";
    RegistryType["NUGET"] = "nuget";
    RegistryType["MCPB"] = "mcpb";
    RegistryType["REMOTE"] = "remote";
})(RegistryType || (RegistryType = {}));
export var TransportType;
(function (TransportType) {
    TransportType["STDIO"] = "stdio";
    TransportType["STREAMABLE_HTTP"] = "streamable-http";
    TransportType["SSE"] = "sse";
})(TransportType || (TransportType = {}));
export var GalleryMcpServerStatus;
(function (GalleryMcpServerStatus) {
    GalleryMcpServerStatus["Active"] = "active";
    GalleryMcpServerStatus["Deprecated"] = "deprecated";
})(GalleryMcpServerStatus || (GalleryMcpServerStatus = {}));
export const IMcpGalleryService = createDecorator('IMcpGalleryService');
export const IMcpManagementService = createDecorator('IMcpManagementService');
export const IAllowedMcpServersService = createDecorator('IAllowedMcpServersService');
export const mcpAccessConfig = 'chat.mcp.access';
export const mcpGalleryServiceUrlConfig = 'chat.mcp.gallery.serviceUrl';
export const mcpGalleryServiceEnablementConfig = 'chat.mcp.gallery.enabled';
export const mcpAutoStartConfig = 'chat.mcp.autostart';
export var McpAutoStartValue;
(function (McpAutoStartValue) {
    McpAutoStartValue["Never"] = "never";
    McpAutoStartValue["OnlyNew"] = "onlyNew";
    McpAutoStartValue["NewAndOutdated"] = "newAndOutdated";
})(McpAutoStartValue || (McpAutoStartValue = {}));
export var McpAccessValue;
(function (McpAccessValue) {
    McpAccessValue["None"] = "none";
    McpAccessValue["Registry"] = "registry";
    McpAccessValue["All"] = "all";
})(McpAccessValue || (McpAccessValue = {}));
//# sourceMappingURL=mcpManagement.js.map