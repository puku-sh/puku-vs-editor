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
var ExtensionBisectService_1, ExtensionBisectUi_1;
import { localize, localize2 } from '../../../../nls.js';
import { IExtensionManagementService, IGlobalExtensionEnablementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { isResolverExtension } from '../../../../platform/extensions/common/extensions.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { INotificationService, NotificationPriority, Severity } from '../../../../platform/notification/common/notification.js';
import { IHostService } from '../../host/browser/host.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../common/contributions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IWorkbenchExtensionEnablementService } from '../common/extensionManagement.js';
// --- bisect service
export const IExtensionBisectService = createDecorator('IExtensionBisectService');
class BisectState {
    static fromJSON(raw) {
        if (!raw) {
            return undefined;
        }
        try {
            const data = JSON.parse(raw);
            return new BisectState(data.extensions, data.low, data.high, data.mid);
        }
        catch {
            return undefined;
        }
    }
    constructor(extensions, low, high, mid = ((low + high) / 2) | 0) {
        this.extensions = extensions;
        this.low = low;
        this.high = high;
        this.mid = mid;
    }
}
let ExtensionBisectService = class ExtensionBisectService {
    static { ExtensionBisectService_1 = this; }
    static { this._storageKey = 'extensionBisectState'; }
    constructor(logService, _storageService, _envService) {
        this._storageService = _storageService;
        this._envService = _envService;
        this._disabled = new Map();
        const raw = _storageService.get(ExtensionBisectService_1._storageKey, -1 /* StorageScope.APPLICATION */);
        this._state = BisectState.fromJSON(raw);
        if (this._state) {
            const { mid, high } = this._state;
            for (let i = 0; i < this._state.extensions.length; i++) {
                const isDisabled = i >= mid && i < high;
                this._disabled.set(this._state.extensions[i], isDisabled);
            }
            logService.warn('extension BISECT active', [...this._disabled]);
        }
    }
    get isActive() {
        return !!this._state;
    }
    get disabledCount() {
        return this._state ? this._state.high - this._state.mid : -1;
    }
    isDisabledByBisect(extension) {
        if (!this._state) {
            // bisect isn't active
            return false;
        }
        if (isResolverExtension(extension.manifest, this._envService.remoteAuthority)) {
            // the current remote resolver extension cannot be disabled
            return false;
        }
        if (this._isEnabledInEnv(extension)) {
            // Extension enabled in env cannot be disabled
            return false;
        }
        const disabled = this._disabled.get(extension.identifier.id);
        return disabled ?? false;
    }
    _isEnabledInEnv(extension) {
        return Array.isArray(this._envService.enableExtensions) && this._envService.enableExtensions.some(id => areSameExtensions({ id }, extension.identifier));
    }
    async start(extensions) {
        if (this._state) {
            throw new Error('invalid state');
        }
        const extensionIds = extensions.map(ext => ext.identifier.id);
        const newState = new BisectState(extensionIds, 0, extensionIds.length, 0);
        this._storageService.store(ExtensionBisectService_1._storageKey, JSON.stringify(newState), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        await this._storageService.flush();
    }
    async next(seeingBad) {
        if (!this._state) {
            throw new Error('invalid state');
        }
        // check if bad when all extensions are disabled
        if (seeingBad && this._state.mid === 0 && this._state.high === this._state.extensions.length) {
            return { bad: true, id: '' };
        }
        // check if there is only one left
        if (this._state.low === this._state.high - 1) {
            await this.reset();
            return { id: this._state.extensions[this._state.low], bad: seeingBad };
        }
        // the second half is disabled so if there is still bad it must be
        // in the first half
        const nextState = new BisectState(this._state.extensions, seeingBad ? this._state.low : this._state.mid, seeingBad ? this._state.mid : this._state.high);
        this._storageService.store(ExtensionBisectService_1._storageKey, JSON.stringify(nextState), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        await this._storageService.flush();
        return undefined;
    }
    async reset() {
        this._storageService.remove(ExtensionBisectService_1._storageKey, -1 /* StorageScope.APPLICATION */);
        await this._storageService.flush();
    }
};
ExtensionBisectService = ExtensionBisectService_1 = __decorate([
    __param(0, ILogService),
    __param(1, IStorageService),
    __param(2, IWorkbenchEnvironmentService)
], ExtensionBisectService);
registerSingleton(IExtensionBisectService, ExtensionBisectService, 1 /* InstantiationType.Delayed */);
// --- bisect UI
let ExtensionBisectUi = class ExtensionBisectUi {
    static { ExtensionBisectUi_1 = this; }
    static { this.ctxIsBisectActive = new RawContextKey('isExtensionBisectActive', false); }
    constructor(contextKeyService, _extensionBisectService, _notificationService, _commandService) {
        this._extensionBisectService = _extensionBisectService;
        this._notificationService = _notificationService;
        this._commandService = _commandService;
        if (_extensionBisectService.isActive) {
            ExtensionBisectUi_1.ctxIsBisectActive.bindTo(contextKeyService).set(true);
            this._showBisectPrompt();
        }
    }
    _showBisectPrompt() {
        const goodPrompt = {
            label: localize(15252, null),
            run: () => this._commandService.executeCommand('extension.bisect.next', false)
        };
        const badPrompt = {
            label: localize(15253, null),
            run: () => this._commandService.executeCommand('extension.bisect.next', true)
        };
        const stop = {
            label: 'Stop Bisect',
            run: () => this._commandService.executeCommand('extension.bisect.stop')
        };
        const message = this._extensionBisectService.disabledCount === 1
            ? localize(15254, null)
            : localize(15255, null, this._extensionBisectService.disabledCount);
        this._notificationService.prompt(Severity.Info, message, [goodPrompt, badPrompt, stop], { sticky: true, priority: NotificationPriority.URGENT });
    }
};
ExtensionBisectUi = ExtensionBisectUi_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, IExtensionBisectService),
    __param(2, INotificationService),
    __param(3, ICommandService)
], ExtensionBisectUi);
Registry.as(Extensions.Workbench).registerWorkbenchContribution(ExtensionBisectUi, 3 /* LifecyclePhase.Restored */);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'extension.bisect.start',
            title: localize2(15272, 'Start Extension Bisect'),
            category: Categories.Help,
            f1: true,
            precondition: ExtensionBisectUi.ctxIsBisectActive.negate(),
            menu: {
                id: MenuId.ViewContainerTitle,
                when: ContextKeyExpr.equals('viewContainer', 'workbench.view.extensions'),
                group: '2_enablement',
                order: 4
            }
        });
    }
    async run(accessor) {
        const dialogService = accessor.get(IDialogService);
        const hostService = accessor.get(IHostService);
        const extensionManagement = accessor.get(IExtensionManagementService);
        const extensionEnablementService = accessor.get(IWorkbenchExtensionEnablementService);
        const extensionsBisect = accessor.get(IExtensionBisectService);
        const extensions = (await extensionManagement.getInstalled(1 /* ExtensionType.User */)).filter(ext => extensionEnablementService.isEnabled(ext));
        const res = await dialogService.confirm({
            message: localize(15256, null),
            detail: localize(15257, null, 2 + Math.log2(extensions.length) | 0),
            primaryButton: localize(15258, null)
        });
        if (res.confirmed) {
            await extensionsBisect.start(extensions);
            hostService.reload();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'extension.bisect.next',
            title: localize2(15273, 'Continue Extension Bisect'),
            category: Categories.Help,
            f1: true,
            precondition: ExtensionBisectUi.ctxIsBisectActive
        });
    }
    async run(accessor, seeingBad) {
        const dialogService = accessor.get(IDialogService);
        const hostService = accessor.get(IHostService);
        const bisectService = accessor.get(IExtensionBisectService);
        const productService = accessor.get(IProductService);
        const extensionEnablementService = accessor.get(IGlobalExtensionEnablementService);
        const commandService = accessor.get(ICommandService);
        if (!bisectService.isActive) {
            return;
        }
        if (seeingBad === undefined) {
            const goodBadStopCancel = await this._checkForBad(dialogService, bisectService);
            if (goodBadStopCancel === null) {
                return;
            }
            seeingBad = goodBadStopCancel;
        }
        if (seeingBad === undefined) {
            await bisectService.reset();
            hostService.reload();
            return;
        }
        const done = await bisectService.next(seeingBad);
        if (!done) {
            hostService.reload();
            return;
        }
        if (done.bad) {
            // DONE but nothing found
            await dialogService.info(localize(15259, null), localize(15260, null, productService.nameShort));
        }
        else {
            // DONE and identified extension
            const res = await dialogService.confirm({
                type: Severity.Info,
                message: localize(15261, null),
                primaryButton: localize(15262, null),
                cancelButton: localize(15263, null),
                detail: localize(15264, null, done.id),
                checkbox: { label: localize(15265, null), checked: true }
            });
            if (res.checkboxChecked) {
                await extensionEnablementService.disableExtension({ id: done.id }, undefined);
            }
            if (res.confirmed) {
                await commandService.executeCommand('workbench.action.openIssueReporter', done.id);
            }
        }
        await bisectService.reset();
        hostService.reload();
    }
    async _checkForBad(dialogService, bisectService) {
        const { result } = await dialogService.prompt({
            type: Severity.Info,
            message: localize(15266, null),
            detail: localize(15267, null, bisectService.disabledCount),
            buttons: [
                {
                    label: localize(15268, null),
                    run: () => false // good now
                },
                {
                    label: localize(15269, null),
                    run: () => true // bad
                },
                {
                    label: localize(15270, null),
                    run: () => undefined // stop
                }
            ],
            cancelButton: {
                label: localize(15271, null),
                run: () => null // cancel
            }
        });
        return result;
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'extension.bisect.stop',
            title: localize2(15274, 'Stop Extension Bisect'),
            category: Categories.Help,
            f1: true,
            precondition: ExtensionBisectUi.ctxIsBisectActive
        });
    }
    async run(accessor) {
        const extensionsBisect = accessor.get(IExtensionBisectService);
        const hostService = accessor.get(IHostService);
        await extensionsBisect.reset();
        hostService.reload();
    }
});
//# sourceMappingURL=extensionBisect.js.map