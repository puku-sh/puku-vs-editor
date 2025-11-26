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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { mcpConfigurationSection } from '../../../contrib/mcp/common/mcpConfiguration.js';
import { IWorkbenchMcpManagementService } from '../../../services/mcp/common/mcpWorkbenchManagementService.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { IFileService, toFileOperationResult } from '../../../../platform/files/common/files.js';
import { parse } from '../../../../base/common/jsonc.js';
import { isObject } from '../../../../base/common/types.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IJSONEditingService } from '../../../services/configuration/common/jsonEditing.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { localize } from '../../../../nls.js';
let McpConfigMigrationContribution = class McpConfigMigrationContribution extends Disposable {
    static { this.ID = 'workbench.mcp.config.migration'; }
    constructor(mcpManagementService, userDataProfileService, fileService, remoteAgentService, jsonEditingService, logService, notificationService, commandService) {
        super();
        this.mcpManagementService = mcpManagementService;
        this.userDataProfileService = userDataProfileService;
        this.fileService = fileService;
        this.remoteAgentService = remoteAgentService;
        this.jsonEditingService = jsonEditingService;
        this.logService = logService;
        this.notificationService = notificationService;
        this.commandService = commandService;
        this.migrateMcpConfig();
    }
    async migrateMcpConfig() {
        try {
            const userMcpConfig = await this.parseMcpConfig(this.userDataProfileService.currentProfile.settingsResource);
            if (userMcpConfig && userMcpConfig.servers && Object.keys(userMcpConfig.servers).length > 0) {
                await Promise.all(Object.entries(userMcpConfig.servers).map(([name, config], index) => this.mcpManagementService.install({ name, config, inputs: index === 0 ? userMcpConfig.inputs : undefined })));
                await this.removeMcpConfig(this.userDataProfileService.currentProfile.settingsResource);
            }
        }
        catch (error) {
            this.logService.error(`MCP migration: Failed to migrate user MCP config`, error);
        }
        this.watchForMcpConfiguration(this.userDataProfileService.currentProfile.settingsResource, false);
        const remoteEnvironment = await this.remoteAgentService.getEnvironment();
        if (remoteEnvironment) {
            try {
                const userRemoteMcpConfig = await this.parseMcpConfig(remoteEnvironment.settingsPath);
                if (userRemoteMcpConfig && userRemoteMcpConfig.servers && Object.keys(userRemoteMcpConfig.servers).length > 0) {
                    await Promise.all(Object.entries(userRemoteMcpConfig.servers).map(([name, config], index) => this.mcpManagementService.install({ name, config, inputs: index === 0 ? userRemoteMcpConfig.inputs : undefined }, { target: 4 /* ConfigurationTarget.USER_REMOTE */ })));
                    await this.removeMcpConfig(remoteEnvironment.settingsPath);
                }
            }
            catch (error) {
                this.logService.error(`MCP migration: Failed to migrate remote MCP config`, error);
            }
            this.watchForMcpConfiguration(remoteEnvironment.settingsPath, true);
        }
    }
    watchForMcpConfiguration(file, isRemote) {
        this._register(this.fileService.watch(file));
        this._register(this.fileService.onDidFilesChange(e => {
            if (e.contains(file)) {
                this.checkForMcpConfigInFile(file, isRemote);
            }
        }));
    }
    async checkForMcpConfigInFile(settingsFile, isRemote) {
        try {
            const mcpConfig = await this.parseMcpConfig(settingsFile);
            if (mcpConfig && mcpConfig.servers && Object.keys(mcpConfig.servers).length > 0) {
                this.showMcpConfigErrorNotification(isRemote);
            }
        }
        catch (error) {
            // Ignore parsing errors - file might not exist or be malformed
        }
    }
    showMcpConfigErrorNotification(isRemote) {
        const message = isRemote
            ? localize(9684, null)
            : localize(9685, null);
        const openConfigLabel = isRemote
            ? localize(9686, null)
            : localize(9687, null);
        const commandId = isRemote ? "workbench.mcp.openRemoteUserMcpJson" /* McpCommandIds.OpenRemoteUserMcp */ : "workbench.mcp.openUserMcpJson" /* McpCommandIds.OpenUserMcp */;
        this.notificationService.prompt(Severity.Error, message, [{
                label: localize(9688, null),
                run: async () => {
                    await this.migrateMcpConfig();
                    await this.commandService.executeCommand(commandId);
                },
            }, {
                label: openConfigLabel,
                keepOpen: true,
                run: () => this.commandService.executeCommand(commandId)
            }]);
    }
    async parseMcpConfig(settingsFile) {
        try {
            const content = await this.fileService.readFile(settingsFile);
            const settingsObject = parse(content.value.toString());
            if (!isObject(settingsObject)) {
                return undefined;
            }
            const mcpConfiguration = settingsObject[mcpConfigurationSection];
            if (mcpConfiguration && mcpConfiguration.servers) {
                for (const [, config] of Object.entries(mcpConfiguration.servers)) {
                    if (config.type === undefined) {
                        config.type = config.command ? "stdio" /* McpServerType.LOCAL */ : "http" /* McpServerType.REMOTE */;
                    }
                }
            }
            return mcpConfiguration;
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.warn(`MCP migration: Failed to parse MCP config from ${settingsFile}:`, error);
            }
            return;
        }
    }
    async removeMcpConfig(settingsFile) {
        try {
            await this.jsonEditingService.write(settingsFile, [
                {
                    path: [mcpConfigurationSection],
                    value: undefined
                }
            ], true);
        }
        catch (error) {
            this.logService.warn(`MCP migration: Failed to remove MCP config from ${settingsFile}:`, error);
        }
    }
};
McpConfigMigrationContribution = __decorate([
    __param(0, IWorkbenchMcpManagementService),
    __param(1, IUserDataProfileService),
    __param(2, IFileService),
    __param(3, IRemoteAgentService),
    __param(4, IJSONEditingService),
    __param(5, ILogService),
    __param(6, INotificationService),
    __param(7, ICommandService)
], McpConfigMigrationContribution);
export { McpConfigMigrationContribution };
//# sourceMappingURL=mcpMigration.js.map