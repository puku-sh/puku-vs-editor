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
exports.AuthenticationService = void 0;
const vscode_1 = require("vscode");
const taskSingler_1 = require("../../../util/common/taskSingler");
const configurationService_1 = require("../../configuration/common/configurationService");
const domainService_1 = require("../../endpoint/common/domainService");
const logService_1 = require("../../log/common/logService");
const authentication_1 = require("../common/authentication");
const copilotTokenManager_1 = require("../common/copilotTokenManager");
const copilotTokenStore_1 = require("../common/copilotTokenStore");
// GitHub authentication removed - using Puku authentication only
function authProviderId(configurationService) {
    return (configurationService.getConfig({}).authProvider === configurationService_1.AuthProviderId.GitHubEnterprise
        ? configurationService_1.AuthProviderId.GitHubEnterprise
        : configurationService_1.AuthProviderId.GitHub);
}
let AuthenticationService = class AuthenticationService extends authentication_1.BaseAuthenticationService {
    constructor(configurationService, _domainService, logService, tokenStore, tokenManager) {
        super(logService, tokenStore, tokenManager, configurationService);
        this._domainService = _domainService;
        this._taskSingler = new taskSingler_1.TaskSingler();
        this._register(vscode_1.authentication.onDidChangeSessions((e) => {
            if (e.provider.id === authProviderId(configurationService) || e.provider.id === configurationService_1.AuthProviderId.Microsoft) {
                this._logService.debug('Handling onDidChangeSession.');
                void this._handleAuthChangeEvent();
            }
        }));
        this._register(this._domainService.onDidChangeDomains((e) => {
            if (e.dotcomUrlChanged) {
                this._logService.debug('Handling onDidChangeDomains.');
                void this._handleAuthChangeEvent();
            }
        }));
        void this._handleAuthChangeEvent();
    }
    async getAnyGitHubSession(options) {
        // GitHub authentication removed - always return undefined
        this._logService.info('[AuthenticationService] GitHub auth removed, returning undefined');
        return undefined;
    }
    async getPermissiveGitHubSession(options) {
        // GitHub authentication removed - always return undefined
        this._logService.info('[AuthenticationService] GitHub auth removed, returning undefined');
        return undefined;
    }
    async getAnyAdoSession(options) {
        const adoAuthProviderId = 'microsoft';
        const adoScopes = ['499b84ac-1321-427f-aa17-267ca6975798/.default', 'offline_access'];
        const func = async () => await vscode_1.authentication.getSession(adoAuthProviderId, adoScopes, options);
        // If we are doing an interactive flow, don't use the singler so that we don't get hung up on the user's choice
        const session = options?.createIfNone || options?.forceNewSession ? await func() : await this._taskSingler.getOrCreate('ado', func);
        this._anyAdoSession = session;
        return session;
    }
    async getAdoAccessTokenBase64(options) {
        const session = await this.getAnyAdoSession(options);
        return session ? Buffer.from(`PAT:${session.accessToken}`, 'utf8').toString('base64') : undefined;
    }
};
exports.AuthenticationService = AuthenticationService;
exports.AuthenticationService = AuthenticationService = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, domainService_1.IDomainService),
    __param(2, logService_1.ILogService),
    __param(3, copilotTokenStore_1.ICopilotTokenStore),
    __param(4, copilotTokenManager_1.ICopilotTokenManager)
], AuthenticationService);
//# sourceMappingURL=authenticationService.js.map