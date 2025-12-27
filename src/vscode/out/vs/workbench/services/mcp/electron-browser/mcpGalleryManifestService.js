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
import { Emitter } from '../../../../base/common/event.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IMcpGalleryManifestService } from '../../../../platform/mcp/common/mcpGalleryManifest.js';
import { McpGalleryManifestService as McpGalleryManifestService } from '../../../../platform/mcp/common/mcpGalleryManifestService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-browser/services.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { mcpGalleryServiceUrlConfig } from '../../../../platform/mcp/common/mcpManagement.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
let WorkbenchMcpGalleryManifestService = class WorkbenchMcpGalleryManifestService extends McpGalleryManifestService {
    get mcpGalleryManifestStatus() { return this.currentStatus; }
    constructor(productService, remoteAgentService, requestService, logService, sharedProcessService, configurationService) {
        super(productService, requestService, logService);
        this.configurationService = configurationService;
        this.mcpGalleryManifest = null;
        this._onDidChangeMcpGalleryManifest = this._register(new Emitter());
        this.onDidChangeMcpGalleryManifest = this._onDidChangeMcpGalleryManifest.event;
        this.currentStatus = "unavailable" /* McpGalleryManifestStatus.Unavailable */;
        this._onDidChangeMcpGalleryManifestStatus = this._register(new Emitter());
        this.onDidChangeMcpGalleryManifestStatus = this._onDidChangeMcpGalleryManifestStatus.event;
        const channels = [sharedProcessService.getChannel('mcpGalleryManifest')];
        const remoteConnection = remoteAgentService.getConnection();
        if (remoteConnection) {
            channels.push(remoteConnection.getChannel('mcpGalleryManifest'));
        }
        this.getMcpGalleryManifest().then(manifest => {
            channels.forEach(channel => channel.call('setMcpGalleryManifest', [manifest]));
        });
    }
    async getMcpGalleryManifest() {
        if (!this.initPromise) {
            this.initPromise = this.doGetMcpGalleryManifest();
        }
        await this.initPromise;
        return this.mcpGalleryManifest;
    }
    async doGetMcpGalleryManifest() {
        await this.getAndUpdateMcpGalleryManifest();
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(mcpGalleryServiceUrlConfig) || e.affectsConfiguration('chat.mcp.gallery.version')) {
                this.getAndUpdateMcpGalleryManifest();
            }
        }));
    }
    async getAndUpdateMcpGalleryManifest() {
        const mcpGalleryConfig = this.configurationService.getValue('chat.mcp.gallery');
        if (mcpGalleryConfig?.serviceUrl) {
            this.update(await this.createMcpGalleryManifest(mcpGalleryConfig.serviceUrl, mcpGalleryConfig.version));
        }
        else {
            this.update(await super.getMcpGalleryManifest());
        }
    }
    update(manifest) {
        if (this.mcpGalleryManifest?.url === manifest?.url && this.mcpGalleryManifest?.version === manifest?.version) {
            return;
        }
        this.mcpGalleryManifest = manifest;
        if (this.mcpGalleryManifest) {
            this.logService.info('MCP Registry configured:', this.mcpGalleryManifest.url);
        }
        else {
            this.logService.info('No MCP Registry configured');
        }
        this.currentStatus = this.mcpGalleryManifest ? "available" /* McpGalleryManifestStatus.Available */ : "unavailable" /* McpGalleryManifestStatus.Unavailable */;
        this._onDidChangeMcpGalleryManifest.fire(this.mcpGalleryManifest);
        this._onDidChangeMcpGalleryManifestStatus.fire(this.currentStatus);
    }
};
WorkbenchMcpGalleryManifestService = __decorate([
    __param(0, IProductService),
    __param(1, IRemoteAgentService),
    __param(2, IRequestService),
    __param(3, ILogService),
    __param(4, ISharedProcessService),
    __param(5, IConfigurationService)
], WorkbenchMcpGalleryManifestService);
export { WorkbenchMcpGalleryManifestService };
registerSingleton(IMcpGalleryManifestService, WorkbenchMcpGalleryManifestService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwR2FsbGVyeU1hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9tY3AvZWxlY3Ryb24tYnJvd3Nlci9tY3BHYWxsZXJ5TWFuaWZlc3RTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsMEJBQTBCLEVBQWlELE1BQU0sdURBQXVELENBQUM7QUFDbEosT0FBTyxFQUFFLHlCQUF5QixJQUFJLHlCQUF5QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDdEksT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNoRixPQUFPLEVBQXFCLDBCQUEwQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDakgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUxRSxJQUFNLGtDQUFrQyxHQUF4QyxNQUFNLGtDQUFtQyxTQUFRLHlCQUF5QjtJQVFoRixJQUFhLHdCQUF3QixLQUErQixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBSWhHLFlBQ2tCLGNBQStCLEVBQzNCLGtCQUF1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