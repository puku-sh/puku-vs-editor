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
var IntegrityService_1;
import { localize } from '../../../../nls.js';
import Severity from '../../../../base/common/severity.js';
import { URI } from '../../../../base/common/uri.js';
import { IIntegrityService } from '../common/integrity.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { INotificationService, NotificationPriority } from '../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { FileAccess } from '../../../../base/common/network.js';
import { IChecksumService } from '../../../../platform/checksum/common/checksumService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
class IntegrityStorage {
    static { this.KEY = 'integrityService'; }
    constructor(storageService) {
        this.storageService = storageService;
        this.value = this._read();
    }
    _read() {
        const jsonValue = this.storageService.get(IntegrityStorage.KEY, -1 /* StorageScope.APPLICATION */);
        if (!jsonValue) {
            return null;
        }
        try {
            return JSON.parse(jsonValue);
        }
        catch (err) {
            return null;
        }
    }
    get() {
        return this.value;
    }
    set(data) {
        this.value = data;
        this.storageService.store(IntegrityStorage.KEY, JSON.stringify(this.value), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
}
let IntegrityService = IntegrityService_1 = class IntegrityService {
    isPure() { return this.isPurePromise; }
    constructor(notificationService, storageService, lifecycleService, openerService, productService, checksumService, logService) {
        this.notificationService = notificationService;
        this.lifecycleService = lifecycleService;
        this.openerService = openerService;
        this.productService = productService;
        this.checksumService = checksumService;
        this.logService = logService;
        this.storage = new IntegrityStorage(storageService);
        this.isPurePromise = this._isPure();
        this._compute();
    }
    async _compute() {
        const { isPure } = await this.isPure();
        if (isPure) {
            return; // all is good
        }
        this.logService.warn(`

----------------------------------------------
***	Installation has been modified on disk ***
----------------------------------------------

`);
        const storedData = this.storage.get();
        if (storedData?.dontShowPrompt && storedData.commit === this.productService.commit) {
            return; // Do not prompt
        }
        this._showNotification();
    }
    async _isPure() {
        const expectedChecksums = this.productService.checksums || {};
        await this.lifecycleService.when(4 /* LifecyclePhase.Eventually */);
        const allResults = await Promise.all(Object.keys(expectedChecksums).map(filename => this._resolve(filename, expectedChecksums[filename])));
        let isPure = true;
        for (let i = 0, len = allResults.length; i < len; i++) {
            if (!allResults[i].isPure) {
                isPure = false;
                break;
            }
        }
        return {
            isPure,
            proof: allResults
        };
    }
    async _resolve(filename, expected) {
        const fileUri = FileAccess.asFileUri(filename);
        try {
            const checksum = await this.checksumService.checksum(fileUri);
            return IntegrityService_1._createChecksumPair(fileUri, checksum, expected);
        }
        catch (error) {
            return IntegrityService_1._createChecksumPair(fileUri, '', expected);
        }
    }
    static _createChecksumPair(uri, actual, expected) {
        return {
            uri: uri,
            actual: actual,
            expected: expected,
            isPure: (actual === expected)
        };
    }
    _showNotification() {
        const checksumFailMoreInfoUrl = this.productService.checksumFailMoreInfoUrl;
        const message = localize(15521, null, this.productService.nameShort);
        if (checksumFailMoreInfoUrl) {
            this.notificationService.prompt(Severity.Warning, message, [
                {
                    label: localize(15522, null),
                    run: () => this.openerService.open(URI.parse(checksumFailMoreInfoUrl))
                },
                {
                    label: localize(15523, null),
                    isSecondary: true,
                    run: () => this.storage.set({ dontShowPrompt: true, commit: this.productService.commit })
                }
            ], {
                sticky: true,
                priority: NotificationPriority.URGENT
            });
        }
        else {
            this.notificationService.notify({
                severity: Severity.Warning,
                message,
                sticky: true,
                priority: NotificationPriority.URGENT
            });
        }
    }
};
IntegrityService = IntegrityService_1 = __decorate([
    __param(0, INotificationService),
    __param(1, IStorageService),
    __param(2, ILifecycleService),
    __param(3, IOpenerService),
    __param(4, IProductService),
    __param(5, IChecksumService),
    __param(6, ILogService)
], IntegrityService);
export { IntegrityService };
registerSingleton(IIntegrityService, IntegrityService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=integrityService.js.map