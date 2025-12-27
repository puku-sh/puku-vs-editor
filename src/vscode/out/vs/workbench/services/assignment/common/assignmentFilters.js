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
var CopilotAssignmentFilterProvider_1;
import { IExtensionService } from '../../extensions/common/extensions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Emitter } from '../../../../base/common/event.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IChatEntitlementService } from '../../chat/common/chatEntitlementService.js';
export var ExtensionsFilter;
(function (ExtensionsFilter) {
    /**
     * Version of the github.copilot extension.
     */
    ExtensionsFilter["CopilotExtensionVersion"] = "X-Copilot-RelatedPluginVersion-githubcopilot";
    /**
     * Version of the github.copilot-chat extension.
     */
    ExtensionsFilter["CopilotChatExtensionVersion"] = "X-Copilot-RelatedPluginVersion-githubcopilotchat";
    /**
     * Version of the completions version.
     */
    ExtensionsFilter["CompletionsVersionInCopilotChat"] = "X-VSCode-CompletionsInChatExtensionVersion";
    /**
     * SKU of the copilot entitlement.
     */
    ExtensionsFilter["CopilotSku"] = "X-GitHub-Copilot-SKU";
    /**
     * The internal org of the user.
     */
    ExtensionsFilter["MicrosoftInternalOrg"] = "X-Microsoft-Internal-Org";
})(ExtensionsFilter || (ExtensionsFilter = {}));
var StorageVersionKeys;
(function (StorageVersionKeys) {
    StorageVersionKeys["CopilotExtensionVersion"] = "extensionsAssignmentFilterProvider.copilotExtensionVersion";
    StorageVersionKeys["CopilotChatExtensionVersion"] = "extensionsAssignmentFilterProvider.copilotChatExtensionVersion";
    StorageVersionKeys["CompletionsVersion"] = "extensionsAssignmentFilterProvider.copilotCompletionsVersion";
    StorageVersionKeys["CopilotSku"] = "extensionsAssignmentFilterProvider.copilotSku";
    StorageVersionKeys["CopilotInternalOrg"] = "extensionsAssignmentFilterProvider.copilotInternalOrg";
})(StorageVersionKeys || (StorageVersionKeys = {}));
let CopilotAssignmentFilterProvider = CopilotAssignmentFilterProvider_1 = class CopilotAssignmentFilterProvider extends Disposable {
    constructor(_extensionService, _logService, _storageService, _chatEntitlementService) {
        super();
        this._extensionService = _extensionService;
        this._logService = _logService;
        this._storageService = _storageService;
        this._chatEntitlementService = _chatEntitlementService;
        this._onDidChangeFilters = this._register(new Emitter());
        this.onDidChangeFilters = this._onDidChangeFilters.event;
        this.copilotExtensionVersion = this._storageService.get(StorageVersionKeys.CopilotExtensionVersion, 0 /* StorageScope.PROFILE */);
        this.copilotChatExtensionVersion = this._storageService.get(StorageVersionKeys.CopilotChatExtensionVersion, 0 /* StorageScope.PROFILE */);
        this.copilotCompletionsVersion = this._storageService.get(StorageVersionKeys.CompletionsVersion, 0 /* StorageScope.PROFILE */);
        this.copilotSku = this._storageService.get(StorageVersionKeys.CopilotSku, 0 /* StorageScope.PROFILE */);
        this.copilotInternalOrg = this._storageService.get(StorageVersionKeys.CopilotInternalOrg, 0 /* StorageScope.PROFILE */);
        this._register(this._extensionService.onDidChangeExtensionsStatus(extensionIdentifiers => {
            if (extensionIdentifiers.some(identifier => ExtensionIdentifier.equals(identifier, 'github.copilot') || ExtensionIdentifier.equals(identifier, 'github.copilot-chat'))) {
                this.updateExtensionVersions();
            }
        }));
        this._register(this._chatEntitlementService.onDidChangeEntitlement(() => {
            this.updateCopilotEntitlementInfo();
        }));
        this.updateExtensionVersions();
        this.updateCopilotEntitlementInfo();
    }
    async updateExtensionVersions() {
        let copilotExtensionVersion;
        let copilotChatExtensionVersion;
        let copilotCompletionsVersion;
        try {
            const [copilotExtension, copilotChatExtension] = await Promise.all([
                this._extensionService.getExtension('github.copilot'),
                this._extensionService.getExtension('github.copilot-chat'),
            ]);
            copilotExtensionVersion = copilotExtension?.version;
            copilotChatExtensionVersion = copilotChatExtension?.version;
            copilotCompletionsVersion = copilotChatExtension?.completionsCoreVersion;
        }
        catch (error) {
            this._logService.error('Failed to update extension version assignments', error);
        }
        if (this.copilotCompletionsVersion === copilotCompletionsVersion &&
            this.copilotExtensionVersion === copilotExtensionVersion &&
            this.copilotChatExtensionVersion === copilotChatExtensionVersion) {
            return;
        }
        this.copilotExtensionVersion = copilotExtensionVersion;
        this.copilotChatExtensionVersion = copilotChatExtensionVersion;
        this.copilotCompletionsVersion = copilotCompletionsVersion;
        this._storageService.store(StorageVersionKeys.CopilotExtensionVersion, this.copilotExtensionVersion, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        this._storageService.store(StorageVersionKeys.CopilotChatExtensionVersion, this.copilotChatExtensionVersion, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        this._storageService.store(StorageVersionKeys.CompletionsVersion, this.copilotCompletionsVersion, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        // Notify that the filters have changed.
        this._onDidChangeFilters.fire();
    }
    updateCopilotEntitlementInfo() {
        const newSku = this._chatEntitlementService.sku;
        const newIsGitHubInternal = this._chatEntitlementService.organisations?.includes('github');
        const newIsMicrosoftInternal = this._chatEntitlementService.organisations?.includes('microsoft') || this._chatEntitlementService.organisations?.includes('ms-copilot') || this._chatEntitlementService.organisations?.includes('MicrosoftCopilot');
        const newInternalOrg = newIsGitHubInternal ? 'github' : newIsMicrosoftInternal ? 'microsoft' : undefined;
        if (this.copilotSku === newSku && this.copilotInternalOrg === newInternalOrg) {
            return;
        }
        this.copilotSku = newSku;
        this.copilotInternalOrg = newInternalOrg;
        this._storageService.store(StorageVersionKeys.CopilotSku, this.copilotSku, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        this._storageService.store(StorageVersionKeys.CopilotInternalOrg, this.copilotInternalOrg, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        // Notify that the filters have changed.
        this._onDidChangeFilters.fire();
    }
    /**
     * Returns a version string that can be parsed by the TAS client.
     * The tas client cannot handle suffixes lke "-insider"
     * Ref: https://github.com/microsoft/tas-client/blob/30340d5e1da37c2789049fcf45928b954680606f/vscode-tas-client/src/vscode-tas-client/VSCodeFilterProvider.ts#L35
     *
     * @param version Version string to be trimmed.
    */
    static trimVersionSuffix(version) {
        const regex = /\-[a-zA-Z0-9]+$/;
        const result = version.split(regex);
        return result[0];
    }
    getFilterValue(filter) {
        switch (filter) {
            case ExtensionsFilter.CopilotExtensionVersion:
                return this.copilotExtensionVersion ? CopilotAssignmentFilterProvider_1.trimVersionSuffix(this.copilotExtensionVersion) : null;
            case ExtensionsFilter.CompletionsVersionInCopilotChat:
                return this.copilotCompletionsVersion ? CopilotAssignmentFilterProvider_1.trimVersionSuffix(this.copilotCompletionsVersion) : null;
            case ExtensionsFilter.CopilotChatExtensionVersion:
                return this.copilotChatExtensionVersion ? CopilotAssignmentFilterProvider_1.trimVersionSuffix(this.copilotChatExtensionVersion) : null;
            case ExtensionsFilter.CopilotSku:
                return this.copilotSku ?? null;
            case ExtensionsFilter.MicrosoftInternalOrg:
                return this.copilotInternalOrg ?? null;
            default:
                return null;
        }
    }
    getFilters() {
        const filters = new Map();
        const filterValues = Object.values(ExtensionsFilter);
        for (const value of filterValues) {
            filters.set(value, this.getFilterValue(value));
        }
        return filters;
    }
};
CopilotAssignmentFilterProvider = CopilotAssignmentFilterProvider_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, ILogService),
    __param(2, IStorageService),
    __param(3, IChatEntitlementService)
], CopilotAssignmentFilterProvider);
export { CopilotAssignmentFilterProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzaWdubWVudEZpbHRlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYXNzaWdubWVudC9jb21tb24vYXNzaWdubWVudEZpbHRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMzRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFdEYsTUFBTSxDQUFOLElBQVksZ0JBMEJYO0FBMUJELFdBQVksZ0JBQWdCO0lBRTNCOztPQUVHO0lBQ0gsNEZBQXdFLENBQUE7SUFFeEU7O09BRUc7SUFDSCxvR0FBZ0YsQ0FBQTtJQUVoRjs7T0FFRztJQUNILGtHQUE4RSxDQUFBO0lBRTlFOztPQUVHO0lBQ0gsdURBQW1DLENBQUE7SUFFbkM7O09BRUc7SUFDSCxxRUFBaUQsQ0FBQTtBQUNsRCxDQUFDLEVBMUJXLGdCQUFnQixLQUFoQixnQkFBZ0IsUUEwQjNCO0FBRUQsSUFBSyxrQkFNSjtBQU5ELFdBQUssa0JBQWtCO0lBQ3RCLDRHQUFzRixDQUFBO0lBQ3RGLG9IQUE4RixDQUFBO0lBQzlGLHlHQUFtRixDQUFBO0lBQ25GLGtGQUE0RCxDQUFBO0lBQzVELGtH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