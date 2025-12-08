"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseExperimentationService = exports.UserInfoStore = void 0;
const async_1 = require("../../../util/vs/base/common/async");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const copilotTokenStore_1 = require("../../authentication/common/copilotTokenStore");
const configurationService_1 = require("../../configuration/common/configurationService");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const logService_1 = require("../../log/common/logService");
class UserInfoStore extends lifecycle_1.Disposable {
    static { this.INTERNAL_ORG_STORAGE_KEY = 'exp.puku.internalOrg'; }
    static { this.SKU_STORAGE_KEY = 'exp.puku.sku'; }
    static { this.IS_FCV1_STORAGE_KEY = 'exp.puku.isFcv1'; }
    constructor(context, copilotTokenStore) {
        super();
        this.context = context;
        this._onDidChangeUserInfo = this._register(new event_1.Emitter());
        this.onDidChangeUserInfo = this._onDidChangeUserInfo.event;
        if (copilotTokenStore) {
            const getInternalOrg = () => {
                if (copilotTokenStore.copilotToken?.isGitHubInternal) {
                    return 'github';
                }
                else if (copilotTokenStore.copilotToken?.isMicrosoftInternal) {
                    return 'microsoft';
                }
                return undefined;
            };
            copilotTokenStore.onDidStoreUpdate(() => {
                this.updateUserInfo(getInternalOrg(), copilotTokenStore.copilotToken?.sku, copilotTokenStore.copilotToken?.isFcv1());
            });
            if (copilotTokenStore.copilotToken) {
                this.updateUserInfo(getInternalOrg(), copilotTokenStore.copilotToken.sku, copilotTokenStore.copilotToken.isFcv1());
            }
            else {
                const cachedInternalValue = this.context.globalState.get(UserInfoStore.INTERNAL_ORG_STORAGE_KEY);
                const cachedSkuValue = this.context.globalState.get(UserInfoStore.SKU_STORAGE_KEY);
                const cachedIsFcv1Value = this.context.globalState.get(UserInfoStore.IS_FCV1_STORAGE_KEY);
                this.updateUserInfo(cachedInternalValue, cachedSkuValue, cachedIsFcv1Value);
            }
        }
    }
    get internalOrg() {
        return this._internalOrg;
    }
    get sku() {
        return this._sku;
    }
    get isFcv1() {
        return this._isFcv1;
    }
    updateUserInfo(internalOrg, sku, isFcv1) {
        if (this._internalOrg === internalOrg && this._sku === sku && this._isFcv1 === isFcv1) {
            // no change
            return;
        }
        this._internalOrg = internalOrg;
        this._sku = sku;
        this._isFcv1 = isFcv1;
        this.context.globalState.update(UserInfoStore.INTERNAL_ORG_STORAGE_KEY, this._internalOrg);
        this.context.globalState.update(UserInfoStore.SKU_STORAGE_KEY, this._sku);
        this.context.globalState.update(UserInfoStore.IS_FCV1_STORAGE_KEY, this._isFcv1);
        this._onDidChangeUserInfo.fire();
    }
}
exports.UserInfoStore = UserInfoStore;
let BaseExperimentationService = class BaseExperimentationService extends lifecycle_1.Disposable {
    constructor(delegateFn, context, copilotTokenStore, _configurationService, _logService) {
        super();
        this._configurationService = _configurationService;
        this._logService = _logService;
        this._refreshTimer = this._register(new async_1.IntervalTimer());
        this._previouslyReadTreatments = new Map();
        this._onDidTreatmentsChange = this._register(new event_1.Emitter());
        this.onDidTreatmentsChange = this._onDidTreatmentsChange.event;
        this._signalTreatmentsChangeEvent = () => {
            const affectedTreatmentVariables = [];
            for (const [key, previousValue] of this._previouslyReadTreatments) {
                const currentValue = this._delegate.getTreatmentVariable('vscode', key);
                if (currentValue !== previousValue) {
                    this._logService.trace(`[BaseExperimentationService] Treatment changed: ${key} from ${previousValue} to ${currentValue}`);
                    this._previouslyReadTreatments.set(key, currentValue);
                    affectedTreatmentVariables.push(key);
                }
            }
            if (affectedTreatmentVariables.length > 0) {
                this._onDidTreatmentsChange.fire({
                    affectedTreatmentVariables
                });
                this._configurationService.updateExperimentBasedConfiguration(affectedTreatmentVariables);
            }
        };
        // Note: This is only temporarily until we have fully migrated to the new completions implementation.
        // At that point, we can remove this method and the related code.
        this._completionsFilters = new Map();
        this._userInfoStore = new UserInfoStore(context, copilotTokenStore);
        // Refresh treatments when user info changes
        this._register(this._userInfoStore.onDidChangeUserInfo(async () => {
            await this._delegate.getTreatmentVariableAsync('vscode', 'refresh');
            this._logService.trace(`[BaseExperimentationService] User info changed, refreshed treatments`);
            this._signalTreatmentsChangeEvent();
        }));
        // Refresh treatments every hour
        this._refreshTimer.cancelAndSet(async () => {
            await this._delegate.getTreatmentVariableAsync('vscode', 'refresh');
            this._logService.trace(`[BaseExperimentationService] Refreshed treatments on timer`);
            this._signalTreatmentsChangeEvent();
        }, 60 * 60 * 1000);
        this._delegate = delegateFn(context.globalState, this._userInfoStore);
        this._delegate.initialFetch.then(() => {
            this._logService.trace(`[BaseExperimentationService] Initial fetch completed`);
        });
    }
    async hasTreatments() {
        await this._delegate.initializePromise;
        return this._delegate.initialFetch;
    }
    getTreatmentVariable(name) {
        const result = this._delegate.getTreatmentVariable('vscode', name);
        this._previouslyReadTreatments.set(name, result);
        return result;
    }
    async setCompletionsFilters(filters) {
        if (equalMap(this._completionsFilters, filters)) {
            return;
        }
        this._completionsFilters.clear();
        for (const [key, value] of filters) {
            this._completionsFilters.set(key, value);
        }
        await this._delegate.initialFetch;
        await this._delegate.getTreatmentVariableAsync('vscode', 'refresh');
        this._signalTreatmentsChangeEvent();
    }
    getCompletionsFilters() {
        return this._completionsFilters;
    }
};
exports.BaseExperimentationService = BaseExperimentationService;
exports.BaseExperimentationService = BaseExperimentationService = __decorate([
    __param(1, extensionContext_1.IVSCodeExtensionContext),
    __param(2, copilotTokenStore_1.ICopilotTokenStore),
    __param(3, configurationService_1.IConfigurationService),
    __param(4, logService_1.ILogService)
], BaseExperimentationService);
function equalMap(map1, map2) {
    if (map1.size !== map2.size) {
        return false;
    }
    for (const [key, value] of map1) {
        if (map2.get(key) !== value) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=baseExperimentationService.js.map