"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotCLIMCPHandler = exports.ICopilotCLIMCPHandler = void 0;
const jsonc_parser_1 = require("jsonc-parser");
const authentication_1 = require("../../../../platform/authentication/common/authentication");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const logService_1 = require("../../../../platform/log/common/logService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const services_1 = require("../../../../util/common/services");
const resources_1 = require("../../../../util/vs/base/common/resources");
const uri_1 = require("../../../../util/vs/base/common/uri");
exports.ICopilotCLIMCPHandler = (0, services_1.createServiceIdentifier)('ICopilotCLIMCPHandler');
const isRecord = (value) => typeof value === 'object' && value !== null;
const toStringArray = (value) => {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const strings = value.filter((entry) => typeof entry === 'string');
    return strings.length ? strings : undefined;
};
const toStringRecord = (value) => {
    if (!isRecord(value)) {
        return undefined;
    }
    const entries = Object.entries(value);
    if (!entries.every(([, entryValue]) => typeof entryValue === 'string')) {
        return undefined;
    }
    return Object.fromEntries(entries);
};
let CopilotCLIMCPHandler = class CopilotCLIMCPHandler {
    constructor(logService, workspaceService, authenticationService, configurationService) {
        this.logService = logService;
        this.workspaceService = workspaceService;
        this.authenticationService = authenticationService;
        this.configurationService = configurationService;
    }
    async loadMcpConfig(workingDirectory) {
        if (!this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.CLIMCPServerEnabled)) {
            return undefined;
        }
        const processedConfig = {};
        const workspaceFolder = this.getWorkspaceFolder(workingDirectory);
        if (workspaceFolder) {
            await this.loadConfigFromWorkspace(workspaceFolder, processedConfig);
        }
        await this.addBuiltInGitHubServer(processedConfig);
        return Object.keys(processedConfig).length > 0 ? processedConfig : undefined;
    }
    getWorkspaceFolder(workingDirectory) {
        // If a working directory is provided, try to find the matching workspace folder
        if (workingDirectory) {
            const workspaceFolders = this.workspaceService.getWorkspaceFolders();
            const matchingFolder = workspaceFolders.find(folder => workingDirectory.startsWith(folder.fsPath));
            if (matchingFolder) {
                return matchingFolder;
            }
            // If no matching workspace folder, use the working directory as a URI
            return uri_1.URI.file(workingDirectory);
        }
        // Fall back to the first workspace folder
        const workspaceFolders = this.workspaceService.getWorkspaceFolders();
        if (workspaceFolders.length === 0) {
            this.logService.trace('[CopilotCLIMCPHandler] No workspace folders found.');
            return undefined;
        }
        return workspaceFolders[0];
    }
    async loadConfigFromWorkspace(workspaceFolder, processedConfig) {
        const mcpConfigPath = (0, resources_1.joinPath)(workspaceFolder, '.vscode', 'mcp.json');
        try {
            const fileContent = await this.workspaceService.fs.readFile(mcpConfigPath);
            const configText = new TextDecoder().decode(fileContent);
            await this.parseAndProcessConfig(configText, workspaceFolder.fsPath, processedConfig);
        }
        catch (error) {
            this.logService.trace(`[CopilotCLIMCPHandler] Failed to load MCP config file: ${error}`);
        }
    }
    async parseAndProcessConfig(configText, workspacePath, processedConfig) {
        const parseErrors = [];
        const mcpConfig = (0, jsonc_parser_1.parse)(configText, parseErrors, { allowTrailingComma: true, disallowComments: false });
        if (parseErrors.length > 0) {
            const { error: parseErrorCode } = parseErrors[0];
            const message = (0, jsonc_parser_1.printParseErrorCode)(parseErrorCode);
            this.logService.warn(`[CopilotCLIMCPHandler] Failed to parse MCP config ${message}.`);
            return;
        }
        const servers = this.extractServersFromConfig(mcpConfig);
        if (!servers) {
            return;
        }
        this.processServerConfigs(servers, workspacePath, processedConfig);
    }
    extractServersFromConfig(mcpConfig) {
        if (!isRecord(mcpConfig)) {
            return undefined;
        }
        // Try direct 'servers' property
        if (isRecord(mcpConfig['servers'])) {
            return mcpConfig['servers'];
        }
        // Try nested 'mcp.servers' property
        const mcpWrapper = mcpConfig['mcp'];
        if (isRecord(mcpWrapper) && isRecord(mcpWrapper['servers'])) {
            return mcpWrapper['servers'];
        }
        // Try 'mcpServers' property
        if (isRecord(mcpConfig['mcpServers'])) {
            return mcpConfig['mcpServers'];
        }
        return undefined;
    }
    processServerConfigs(servers, workspacePath, processedConfig) {
        for (const [serverName, serverConfig] of Object.entries(servers)) {
            if (!isRecord(serverConfig)) {
                this.logService.warn(`[CopilotCLIMCPHandler] Ignoring invalid MCP server definition "${serverName}".`);
                continue;
            }
            const processedServer = this.processServerConfig(serverConfig, serverName, workspacePath);
            if (processedServer) {
                processedConfig[serverName] = processedServer;
            }
        }
    }
    processServerConfig(rawConfig, serverName, workspacePath) {
        const type = typeof rawConfig.type === 'string' ? rawConfig.type : undefined;
        const toolsArray = toStringArray(rawConfig.tools);
        const tools = toolsArray && toolsArray.length > 0 ? toolsArray : ['*'];
        if (!type || type === 'local' || type === 'stdio') {
            return this.processLocalServerConfig(rawConfig, serverName, tools, workspacePath);
        }
        if (type === 'http' || type === 'sse') {
            return this.processRemoteServerConfig(rawConfig, serverName, type, tools);
        }
        this.logService.warn(`[CopilotCLIMCPHandler] Unsupported MCP server type "${type}" for "${serverName}".`);
        return undefined;
    }
    processLocalServerConfig(rawConfig, serverName, tools, workspacePath) {
        const command = typeof rawConfig.command === 'string' ? rawConfig.command : undefined;
        if (!command) {
            this.logService.warn(`[CopilotCLIMCPHandler] Skipping MCP local server "${serverName}" due to missing command.`);
            return undefined;
        }
        const type = typeof rawConfig.type === 'string' && rawConfig.type === 'stdio' ? 'stdio' : 'local';
        const args = toStringArray(rawConfig.args) ?? [];
        const env = toStringRecord(rawConfig.env) ?? {};
        const cwd = typeof rawConfig.cwd === 'string' ? rawConfig.cwd.replace('${workspaceFolder}', workspacePath) : undefined;
        const localConfig = { type, command, args, tools, env };
        if (cwd) {
            localConfig.cwd = cwd;
        }
        return localConfig;
    }
    processRemoteServerConfig(rawConfig, serverName, type, tools) {
        const url = typeof rawConfig.url === 'string' ? rawConfig.url : undefined;
        if (!url) {
            this.logService.warn(`[CopilotCLIMCPHandler] Skipping MCP remote server "${serverName}" due to missing url.`);
            return undefined;
        }
        const headers = toStringRecord(rawConfig.headers) ?? {};
        return { type, url, headers, tools };
    }
    async addBuiltInGitHubServer(config) {
        try {
            // Don't override if user has configured their own github mcp server
            if (config['github']) {
                return;
            }
            // Check if any existing server already uses the GitHub MCP URL
            const githubMcpUrlPrefix = 'https://api.githubcopilot.com/mcp/';
            for (const [serverName, serverConfig] of Object.entries(config)) {
                if (serverConfig.type === 'http' || serverConfig.type === 'sse') {
                    if (serverConfig.url.startsWith(githubMcpUrlPrefix)) {
                        this.logService.trace(`[CopilotCLIMCPHandler] Skipping built-in GitHub MCP server as "${serverName}" already uses the same URL.`);
                        return;
                    }
                }
            }
            const session = await this.authenticationService.getAnyGitHubSession();
            if (!session) {
                this.logService.trace('[CopilotCLIMCPHandler] Skipping built-in GitHub MCP server due to missing Copilot token.');
                return;
            }
            config['github'] = {
                type: 'http',
                url: 'https://api.githubcopilot.com/mcp/readonly',
                tools: ['*'],
                isDefaultServer: true,
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'X-MCP-Toolsets': 'repos,issues,users,pull_requests,code_security,secret_protection,actions,web_search',
                    'X-MCP-Host': 'copilot-sdk',
                },
            };
            this.logService.trace('[CopilotCLIMCPHandler] Added built-in GitHub MCP server.');
        }
        catch (error) {
            this.logService.warn(`[CopilotCLIMCPHandler] Failed to add built-in GitHub MCP server: ${error}`);
        }
    }
};
exports.CopilotCLIMCPHandler = CopilotCLIMCPHandler;
exports.CopilotCLIMCPHandler = CopilotCLIMCPHandler = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, authentication_1.IAuthenticationService),
    __param(3, configurationService_1.IConfigurationService)
], CopilotCLIMCPHandler);
//# sourceMappingURL=mcpHandler.js.map