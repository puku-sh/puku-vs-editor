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
var PolicyExportContribution_1;
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchConfigurationService } from '../../../services/configuration/common/configuration.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { PolicyCategory, PolicyCategoryData } from '../../../../base/common/policy.js';
import { join } from '../../../../base/common/path.js';
let PolicyExportContribution = class PolicyExportContribution extends Disposable {
    static { PolicyExportContribution_1 = this; }
    static { this.ID = 'workbench.contrib.policyExport'; }
    static { this.DEFAULT_POLICY_EXPORT_PATH = 'build/lib/policies/policyData.jsonc'; }
    constructor(nativeEnvironmentService, extensionService, fileService, configurationService, nativeHostService, progressService, logService) {
        super();
        this.nativeEnvironmentService = nativeEnvironmentService;
        this.extensionService = extensionService;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.nativeHostService = nativeHostService;
        this.progressService = progressService;
        this.logService = logService;
        // Skip for non-development flows
        if (this.nativeEnvironmentService.isBuilt) {
            return;
        }
        const policyDataPath = this.nativeEnvironmentService.exportPolicyData;
        if (policyDataPath !== undefined) {
            const defaultPath = join(this.nativeEnvironmentService.appRoot, PolicyExportContribution_1.DEFAULT_POLICY_EXPORT_PATH);
            void this.exportPolicyDataAndQuit(policyDataPath ? policyDataPath : defaultPath);
        }
    }
    log(msg, ...args) {
        this.logService.info(`[${PolicyExportContribution_1.ID}]`, msg, ...args);
    }
    async exportPolicyDataAndQuit(policyDataPath) {
        try {
            await this.progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                title: `Exporting policy data to ${policyDataPath}`
            }, async (_progress) => {
                this.log('Export started. Waiting for configurations to load.');
                await this.extensionService.whenInstalledExtensionsRegistered();
                await this.configurationService.whenRemoteConfigurationLoaded();
                this.log('Extensions and configuration loaded.');
                const configurationRegistry = Registry.as(Extensions.Configuration);
                const configurationProperties = {
                    ...configurationRegistry.getExcludedConfigurationProperties(),
                    ...configurationRegistry.getConfigurationProperties(),
                };
                const policyData = {
                    categories: Object.values(PolicyCategory).map(category => ({
                        key: category,
                        name: PolicyCategoryData[category].name
                    })),
                    policies: []
                };
                for (const [key, schema] of Object.entries(configurationProperties)) {
                    // Check for the localization property for now to remain backwards compatible.
                    if (schema.policy?.localization) {
                        policyData.policies.push({
                            key,
                            name: schema.policy.name,
                            category: schema.policy.category,
                            minimumVersion: schema.policy.minimumVersion,
                            localization: {
                                description: schema.policy.localization.description,
                                enumDescriptions: schema.policy.localization.enumDescriptions,
                            },
                            type: schema.type,
                            default: schema.default,
                            enum: schema.enum,
                        });
                    }
                }
                this.log(`Discovered ${policyData.policies.length} policies to export.`);
                const disclaimerComment = `/** THIS FILE IS AUTOMATICALLY GENERATED USING \`code --export-policy-data\`. DO NOT MODIFY IT MANUALLY. **/`;
                const policyDataFileContent = `${disclaimerComment}\n${JSON.stringify(policyData, null, 4)}\n`;
                await this.fileService.writeFile(URI.file(policyDataPath), VSBuffer.fromString(policyDataFileContent));
                this.log(`Successfully exported ${policyData.policies.length} policies to ${policyDataPath}.`);
            });
            await this.nativeHostService.exit(0);
        }
        catch (error) {
            this.log('Failed to export policy', error);
            await this.nativeHostService.exit(1);
        }
    }
};
PolicyExportContribution = PolicyExportContribution_1 = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, IExtensionService),
    __param(2, IFileService),
    __param(3, IWorkbenchConfigurationService),
    __param(4, INativeHostService),
    __param(5, IProgressService),
    __param(6, ILogService)
], PolicyExportContribution);
export { PolicyExportContribution };
registerWorkbenchContribution2(PolicyExportContribution.ID, PolicyExportContribution, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9saWN5RXhwb3J0LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3BvbGljeUV4cG9ydC9lbGVjdHJvbi1icm93c2VyL3BvbGljeUV4cG9ydC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBMEIsOEJBQThCLEVBQWtCLE1BQU0sa0NBQWtDLENBQUM7QUFDMUgsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsRUFBMEIsTUFBTSxvRUFBb0UsQ0FBQztBQUN4SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQW9CLE1BQU0sa0RBQWtELENBQUM7QUFDdEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1D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