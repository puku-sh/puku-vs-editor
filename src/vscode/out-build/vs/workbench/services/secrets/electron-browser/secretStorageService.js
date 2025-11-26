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
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { isLinux } from '../../../../base/common/platform.js';
import Severity from '../../../../base/common/severity.js';
import { localize } from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IEncryptionService, isGnome, isKwallet } from '../../../../platform/encryption/common/encryptionService.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { BaseSecretStorageService, ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IJSONEditingService } from '../../configuration/common/jsonEditing.js';
let NativeSecretStorageService = class NativeSecretStorageService extends BaseSecretStorageService {
    constructor(_notificationService, _dialogService, _openerService, _jsonEditingService, _environmentService, storageService, encryptionService, logService) {
        super(!!_environmentService.useInMemorySecretStorage, storageService, encryptionService, logService);
        this._notificationService = _notificationService;
        this._dialogService = _dialogService;
        this._openerService = _openerService;
        this._jsonEditingService = _jsonEditingService;
        this._environmentService = _environmentService;
        this.notifyOfNoEncryptionOnce = createSingleCallFunction(() => this.notifyOfNoEncryption());
    }
    set(key, value) {
        this._sequencer.queue(key, async () => {
            await this.resolvedStorageService;
            if (this.type !== 'persisted' && !this._environmentService.useInMemorySecretStorage) {
                this._logService.trace('[NativeSecretStorageService] Notifying user that secrets are not being stored on disk.');
                await this.notifyOfNoEncryptionOnce();
            }
        });
        return super.set(key, value);
    }
    async notifyOfNoEncryption() {
        const buttons = [];
        const troubleshootingButton = {
            label: localize(15693, null),
            run: () => this._openerService.open('https://go.microsoft.com/fwlink/?linkid=2239490'),
            // doesn't close dialogs
            keepOpen: true
        };
        buttons.push(troubleshootingButton);
        let errorMessage = localize(15694, null);
        if (!isLinux) {
            this._notificationService.prompt(Severity.Error, errorMessage, buttons);
            return;
        }
        const provider = await this._encryptionService.getKeyStorageProvider();
        if (provider === "basic_text" /* KnownStorageProvider.basicText */) {
            const detail = localize(15695, null);
            const usePlainTextButton = {
                label: localize(15696, null),
                run: async () => {
                    await this._encryptionService.setUsePlainTextEncryption();
                    await this._jsonEditingService.write(this._environmentService.argvResource, [{ path: ['password-store'], value: "basic" /* PasswordStoreCLIOption.basic */ }], true);
                    this.reinitialize();
                }
            };
            buttons.unshift(usePlainTextButton);
            await this._dialogService.prompt({
                type: 'error',
                buttons,
                message: errorMessage,
                detail
            });
            return;
        }
        if (isGnome(provider)) {
            errorMessage = localize(15697, null);
        }
        else if (isKwallet(provider)) {
            errorMessage = localize(15698, null);
        }
        this._notificationService.prompt(Severity.Error, errorMessage, buttons);
    }
};
NativeSecretStorageService = __decorate([
    __param(0, INotificationService),
    __param(1, IDialogService),
    __param(2, IOpenerService),
    __param(3, IJSONEditingService),
    __param(4, INativeEnvironmentService),
    __param(5, IStorageService),
    __param(6, IEncryptionService),
    __param(7, ILogService)
], NativeSecretStorageService);
export { NativeSecretStorageService };
registerSingleton(ISecretStorageService, NativeSecretStorageService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=secretStorageService.js.map