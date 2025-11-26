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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { localize } from '../../../../nls.js';
import { FileOperationError, IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
import { IUserDataProfileService } from '../common/userDataProfile.js';
let McpResourceInitializer = class McpResourceInitializer {
    constructor(userDataProfileService, fileService, logService) {
        this.userDataProfileService = userDataProfileService;
        this.fileService = fileService;
        this.logService = logService;
    }
    async initialize(content) {
        const mcpContent = JSON.parse(content);
        if (!mcpContent.mcp) {
            this.logService.info(`Initializing Profile: No MCP servers to apply...`);
            return;
        }
        await this.fileService.writeFile(this.userDataProfileService.currentProfile.mcpResource, VSBuffer.fromString(mcpContent.mcp));
    }
};
McpResourceInitializer = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IFileService),
    __param(2, ILogService)
], McpResourceInitializer);
export { McpResourceInitializer };
let McpProfileResource = class McpProfileResource {
    constructor(fileService, logService) {
        this.fileService = fileService;
        this.logService = logService;
    }
    async getContent(profile) {
        const mcpContent = await this.getMcpResourceContent(profile);
        return JSON.stringify(mcpContent);
    }
    async getMcpResourceContent(profile) {
        const mcpContent = await this.getMcpContent(profile);
        return { mcp: mcpContent };
    }
    async apply(content, profile) {
        const mcpContent = JSON.parse(content);
        if (!mcpContent.mcp) {
            this.logService.info(`Importing Profile (${profile.name}): No MCP servers to apply...`);
            return;
        }
        await this.fileService.writeFile(profile.mcpResource, VSBuffer.fromString(mcpContent.mcp));
    }
    async getMcpContent(profile) {
        try {
            const content = await this.fileService.readFile(profile.mcpResource);
            return content.value.toString();
        }
        catch (error) {
            // File not found
            if (error instanceof FileOperationError && error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return null;
            }
            else {
                throw error;
            }
        }
    }
};
McpProfileResource = __decorate([
    __param(0, IFileService),
    __param(1, ILogService)
], McpProfileResource);
export { McpProfileResource };
let McpResourceTreeItem = class McpResourceTreeItem {
    constructor(profile, uriIdentityService, instantiationService) {
        this.profile = profile;
        this.uriIdentityService = uriIdentityService;
        this.instantiationService = instantiationService;
        this.type = "mcp" /* ProfileResourceType.Mcp */;
        this.handle = "mcp" /* ProfileResourceType.Mcp */;
        this.label = { label: localize(15961, null) };
        this.collapsibleState = TreeItemCollapsibleState.Expanded;
    }
    async getChildren() {
        return [{
                handle: this.profile.mcpResource.toString(),
                resourceUri: this.profile.mcpResource,
                collapsibleState: TreeItemCollapsibleState.None,
                parent: this,
                accessibilityInformation: {
                    label: this.uriIdentityService.extUri.basename(this.profile.mcpResource)
                },
                command: {
                    id: API_OPEN_EDITOR_COMMAND_ID,
                    title: '',
                    arguments: [this.profile.mcpResource, undefined, undefined]
                }
            }];
    }
    async hasContent() {
        const mcpContent = await this.instantiationService.createInstance(McpProfileResource).getMcpResourceContent(this.profile);
        return mcpContent.mcp !== null;
    }
    async getContent() {
        return this.instantiationService.createInstance(McpProfileResource).getContent(this.profile);
    }
    isFromDefaultProfile() {
        return !this.profile.isDefault && !!this.profile.useDefaultFlags?.mcp;
    }
};
McpResourceTreeItem = __decorate([
    __param(1, IUriIdentityService),
    __param(2, IInstantiationService)
], McpResourceTreeItem);
export { McpResourceTreeItem };
//# sourceMappingURL=mcpProfileResource.js.map