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
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { UserDataSyncWorkbenchContribution } from './userDataSync.js';
import { IUserDataAutoSyncService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { isWeb } from '../../../../base/common/platform.js';
import { UserDataSyncTrigger } from './userDataSyncTrigger.js';
import { toAction } from '../../../../base/common/actions.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { SHOW_SYNC_LOG_COMMAND_ID } from '../../../services/userDataSync/common/userDataSync.js';
let UserDataSyncReportIssueContribution = class UserDataSyncReportIssueContribution extends Disposable {
    constructor(userDataAutoSyncService, notificationService, productService, commandService, hostService) {
        super();
        this.notificationService = notificationService;
        this.productService = productService;
        this.commandService = commandService;
        this.hostService = hostService;
        this._register(userDataAutoSyncService.onError(error => this.onAutoSyncError(error)));
    }
    onAutoSyncError(error) {
        switch (error.code) {
            case "LocalTooManyRequests" /* UserDataSyncErrorCode.LocalTooManyRequests */: {
                const message = isWeb ? localize(14159, null, this.productService.nameLong)
                    : localize(14160, null, this.productService.nameLong);
                this.notificationService.notify({
                    severity: Severity.Error,
                    message,
                    actions: {
                        primary: [
                            toAction({
                                id: 'Show Sync Logs',
                                label: localize(14161, null),
                                run: () => this.commandService.executeCommand(SHOW_SYNC_LOG_COMMAND_ID)
                            }),
                            toAction({
                                id: 'Restart',
                                label: isWeb ? localize(14162, null) : localize(14163, null),
                                run: () => this.hostService.restart()
                            })
                        ]
                    }
                });
                return;
            }
            case "RemoteTooManyRequests" /* UserDataSyncErrorCode.TooManyRequests */: {
                const operationId = error.operationId ? localize(14164, null, error.operationId) : undefined;
                const message = localize(14165, null);
                this.notificationService.notify({
                    severity: Severity.Error,
                    message: operationId ? `${message} ${operationId}` : message,
                    source: error.operationId ? localize(14166, null, error.operationId) : undefined,
                    actions: {
                        primary: [
                            toAction({
                                id: 'Show Sync Logs',
                                label: localize(14167, null),
                                run: () => this.commandService.executeCommand(SHOW_SYNC_LOG_COMMAND_ID)
                            })
                        ]
                    }
                });
                return;
            }
        }
    }
};
UserDataSyncReportIssueContribution = __decorate([
    __param(0, IUserDataAutoSyncService),
    __param(1, INotificationService),
    __param(2, IProductService),
    __param(3, ICommandService),
    __param(4, IHostService)
], UserDataSyncReportIssueContribution);
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(UserDataSyncWorkbenchContribution, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(UserDataSyncTrigger, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(UserDataSyncReportIssueContribution, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=userDataSync.contribution.js.map