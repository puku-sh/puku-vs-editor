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
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { MenuRegistry, MenuId } from '../../../../platform/actions/common/actions.js';
import { localize } from '../../../../nls.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { Action } from '../../../../base/common/actions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Promises } from '../../../../base/common/async.js';
let ExtensionDependencyChecker = class ExtensionDependencyChecker extends Disposable {
    constructor(extensionService, extensionsWorkbenchService, notificationService, hostService) {
        super();
        this.extensionService = extensionService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.notificationService = notificationService;
        this.hostService = hostService;
        CommandsRegistry.registerCommand('workbench.extensions.installMissingDependencies', () => this.installMissingDependencies());
        MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
            command: {
                id: 'workbench.extensions.installMissingDependencies',
                category: localize(8320, null),
                title: localize(8321, null)
            }
        });
    }
    async getUninstalledMissingDependencies() {
        const allMissingDependencies = await this.getAllMissingDependencies();
        const localExtensions = await this.extensionsWorkbenchService.queryLocal();
        return allMissingDependencies.filter(id => localExtensions.every(l => !areSameExtensions(l.identifier, { id })));
    }
    async getAllMissingDependencies() {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const runningExtensionsIds = this.extensionService.extensions.reduce((result, r) => { result.add(r.identifier.value.toLowerCase()); return result; }, new Set());
        const missingDependencies = new Set();
        for (const extension of this.extensionService.extensions) {
            if (extension.extensionDependencies) {
                extension.extensionDependencies.forEach(dep => {
                    if (!runningExtensionsIds.has(dep.toLowerCase())) {
                        missingDependencies.add(dep);
                    }
                });
            }
        }
        return [...missingDependencies.values()];
    }
    async installMissingDependencies() {
        const missingDependencies = await this.getUninstalledMissingDependencies();
        if (missingDependencies.length) {
            const extensions = await this.extensionsWorkbenchService.getExtensions(missingDependencies.map(id => ({ id })), CancellationToken.None);
            if (extensions.length) {
                await Promises.settled(extensions.map(extension => this.extensionsWorkbenchService.install(extension)));
                this.notificationService.notify({
                    severity: Severity.Info,
                    message: localize(8322, null),
                    actions: {
                        primary: [new Action('realod', localize(8323, null), '', true, () => this.hostService.reload())]
                    }
                });
            }
        }
        else {
            this.notificationService.info(localize(8324, null));
        }
    }
};
ExtensionDependencyChecker = __decorate([
    __param(0, IExtensionService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, INotificationService),
    __param(3, IHostService)
], ExtensionDependencyChecker);
export { ExtensionDependencyChecker };
//# sourceMappingURL=extensionsDependencyChecker.js.map