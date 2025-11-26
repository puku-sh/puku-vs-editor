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
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IAuthenticationService } from '../../authentication/common/authentication.js';
import { asJson, IRequestService } from '../../../../platform/request/common/request.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { localize } from '../../../../nls.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { Barrier } from '../../../../base/common/async.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { getErrorMessage } from '../../../../base/common/errors.js';
import { isString } from '../../../../base/common/types.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { isWeb } from '../../../../base/common/platform.js';
export const DEFAULT_ACCOUNT_SIGN_IN_COMMAND = 'workbench.actions.accounts.signIn';
var DefaultAccountStatus;
(function (DefaultAccountStatus) {
    DefaultAccountStatus["Uninitialized"] = "uninitialized";
    DefaultAccountStatus["Unavailable"] = "unavailable";
    DefaultAccountStatus["Available"] = "available";
})(DefaultAccountStatus || (DefaultAccountStatus = {}));
const CONTEXT_DEFAULT_ACCOUNT_STATE = new RawContextKey('defaultAccountStatus', "uninitialized" /* DefaultAccountStatus.Uninitialized */);
export const IDefaultAccountService = createDecorator('defaultAccountService');
export class DefaultAccountService extends Disposable {
    constructor() {
        super(...arguments);
        this._defaultAccount = undefined;
        this.initBarrier = new Barrier();
        this._onDidChangeDefaultAccount = this._register(new Emitter());
        this.onDidChangeDefaultAccount = this._onDidChangeDefaultAccount.event;
    }
    get defaultAccount() { return this._defaultAccount ?? null; }
    async getDefaultAccount() {
        await this.initBarrier.wait();
        return this.defaultAccount;
    }
    setDefaultAccount(account) {
        const oldAccount = this._defaultAccount;
        this._defaultAccount = account;
        if (oldAccount !== this._defaultAccount) {
            this._onDidChangeDefaultAccount.fire(this._defaultAccount);
        }
        this.initBarrier.open();
    }
}
let DefaultAccountManagementContribution = class DefaultAccountManagementContribution extends Disposable {
    static { this.ID = 'workbench.contributions.defaultAccountManagement'; }
    constructor(defaultAccountService, configurationService, authenticationService, extensionService, productService, requestService, logService, environmentService, contextKeyService) {
        super();
        this.defaultAccountService = defaultAccountService;
        this.configurationService = configurationService;
        this.authenticationService = authenticationService;
        this.extensionService = extensionService;
        this.productService = productService;
        this.requestService = requestService;
        this.logService = logService;
        this.environmentService = environmentService;
        this.defaultAccount = null;
        this.accountStatusContext = CONTEXT_DEFAULT_ACCOUNT_STATE.bindTo(contextKeyService);
        this.initialize();
    }
    async initialize() {
        this.logService.debug('[DefaultAccount] Starting initialization');
        if (!this.productService.defaultAccount) {
            this.logService.debug('[DefaultAccount] No default account configuration in product service, skipping initialization');
            return;
        }
        if (isWeb && !this.environmentService.remoteAuthority) {
            this.logService.debug('[DefaultAccount] Running in web without remote, skipping initialization');
            return;
        }
        const defaultAccountProviderId = this.getDefaultAccountProviderId();
        this.logService.debug('[DefaultAccount] Default account provider ID:', defaultAccountProviderId);
        if (!defaultAccountProviderId) {
            return;
        }
        await this.extensionService.whenInstalledExtensionsRegistered();
        this.logService.debug('[DefaultAccount] Installed extensions registered.');
        const declaredProvider = this.authenticationService.declaredProviders.find(provider => provider.id === defaultAccountProviderId);
        if (!declaredProvider) {
            this.logService.info(`[DefaultAccount] Authentication provider is not declared.`, defaultAccountProviderId);
            return;
        }
        this.registerSignInAction(defaultAccountProviderId, this.productService.defaultAccount.authenticationProvider.scopes[0]);
        this.setDefaultAccount(await this.getDefaultAccountFromAuthenticatedSessions(defaultAccountProviderId, this.productService.defaultAccount.authenticationProvider.scopes));
        this._register(this.authenticationService.onDidChangeSessions(async (e) => {
            if (e.providerId !== this.getDefaultAccountProviderId()) {
                return;
            }
            if (this.defaultAccount && e.event.removed?.some(session => session.id === this.defaultAccount?.sessionId)) {
                this.setDefaultAccount(null);
                return;
            }
            this.setDefaultAccount(await this.getDefaultAccountFromAuthenticatedSessions(defaultAccountProviderId, this.productService.defaultAccount.authenticationProvider.scopes));
        }));
        this.logService.debug('[DefaultAccount] Initialization complete');
    }
    setDefaultAccount(account) {
        this.defaultAccount = account;
        this.defaultAccountService.setDefaultAccount(this.defaultAccount);
        if (this.defaultAccount) {
            this.accountStatusContext.set("available" /* DefaultAccountStatus.Available */);
            this.logService.debug('[DefaultAccount] Account status set to Available');
        }
        else {
            this.accountStatusContext.set("unavailable" /* DefaultAccountStatus.Unavailable */);
            this.logService.debug('[DefaultAccount] Account status set to Unavailable');
        }
    }
    extractFromToken(token) {
        const result = new Map();
        const firstPart = token?.split(':')[0];
        const fields = firstPart?.split(';');
        for (const field of fields) {
            const [key, value] = field.split('=');
            result.set(key, value);
        }
        this.logService.debug(`[DefaultAccount] extractFromToken: ${JSON.stringify(Object.fromEntries(result))}`);
        return result;
    }
    async getDefaultAccountFromAuthenticatedSessions(authProviderId, scopes) {
        try {
            this.logService.debug('[DefaultAccount] Getting Default Account from authenticated sessions for provider:', authProviderId);
            const session = await this.findMatchingProviderSession(authProviderId, scopes);
            if (!session) {
                this.logService.debug('[DefaultAccount] No matching session found for provider:', authProviderId);
                return null;
            }
            const [chatEntitlements, tokenEntitlements] = await Promise.all([
                this.getChatEntitlements(session.accessToken),
                this.getTokenEntitlements(session.accessToken),
            ]);
            const mcpRegistryProvider = tokenEntitlements.mcp ? await this.getMcpRegistryProvider(session.accessToken) : undefined;
            const account = {
                sessionId: session.id,
                enterprise: this.isEnterpriseAuthenticationProvider(authProviderId) || session.account.label.includes('_'),
                ...chatEntitlements,
                ...tokenEntitlements,
                mcpRegistryUrl: mcpRegistryProvider?.url,
                mcpAccess: mcpRegistryProvider?.registry_access,
            };
            this.logService.debug('[DefaultAccount] Successfully created default account for provider:', authProviderId);
            return account;
        }
        catch (error) {
            this.logService.error('[DefaultAccount] Failed to create default account for provider:', authProviderId, getErrorMessage(error));
            return null;
        }
    }
    async findMatchingProviderSession(authProviderId, allScopes) {
        const sessions = await this.authenticationService.getSessions(authProviderId, undefined, undefined, true);
        for (const session of sessions) {
            this.logService.debug('[DefaultAccount] Checking session with scopes', session.scopes);
            for (const scopes of allScopes) {
                if (this.scopesMatch(session.scopes, scopes)) {
                    return session;
                }
            }
        }
        return undefined;
    }
    scopesMatch(scopes, expectedScopes) {
        return scopes.length === expectedScopes.length && expectedScopes.every(scope => scopes.includes(scope));
    }
    async getTokenEntitlements(accessToken) {
        const tokenEntitlementsUrl = this.getTokenEntitlementUrl();
        if (!tokenEntitlementsUrl) {
            this.logService.debug('[DefaultAccount] No token entitlements URL found');
            return {};
        }
        this.logService.debug('[DefaultAccount] Fetching token entitlements from:', tokenEntitlementsUrl);
        try {
            const chatContext = await this.requestService.request({
                type: 'GET',
                url: tokenEntitlementsUrl,
                disableCache: true,
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }, CancellationToken.None);
            const chatData = await asJson(chatContext);
            if (chatData) {
                const tokenMap = this.extractFromToken(chatData.token);
                return {
                    // Editor preview features are disabled if the flag is present and set to 0
                    chat_preview_features_enabled: tokenMap.get('editor_preview_features') !== '0',
                    chat_agent_enabled: tokenMap.get('agent_mode') !== '0',
                    // MCP is disabled if the flag is present and set to 0
                    mcp: tokenMap.get('mcp') !== '0',
                };
            }
            this.logService.error('Failed to fetch token entitlements', 'No data returned');
        }
        catch (error) {
            this.logService.error('Failed to fetch token entitlements', getErrorMessage(error));
        }
        return {};
    }
    async getChatEntitlements(accessToken) {
        const chatEntitlementsUrl = this.getChatEntitlementUrl();
        if (!chatEntitlementsUrl) {
            this.logService.debug('[DefaultAccount] No chat entitlements URL found');
            return {};
        }
        this.logService.debug('[DefaultAccount] Fetching chat entitlements from:', chatEntitlementsUrl);
        try {
            const context = await this.requestService.request({
                type: 'GET',
                url: chatEntitlementsUrl,
                disableCache: true,
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }, CancellationToken.None);
            const data = await asJson(context);
            if (data) {
                return data;
            }
            this.logService.error('Failed to fetch entitlements', 'No data returned');
        }
        catch (error) {
            this.logService.error('Failed to fetch entitlements', getErrorMessage(error));
        }
        return {};
    }
    async getMcpRegistryProvider(accessToken) {
        const mcpRegistryDataUrl = this.getMcpRegistryDataUrl();
        if (!mcpRegistryDataUrl) {
            this.logService.debug('[DefaultAccount] No MCP registry data URL found');
            return undefined;
        }
        try {
            const context = await this.requestService.request({
                type: 'GET',
                url: mcpRegistryDataUrl,
                disableCache: true,
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }, CancellationToken.None);
            const data = await asJson(context);
            if (data) {
                this.logService.debug('Fetched MCP registry providers', data.mcp_registries);
                return data.mcp_registries[0];
            }
            this.logService.debug('Failed to fetch MCP registry providers', 'No data returned');
        }
        catch (error) {
            this.logService.error('Failed to fetch MCP registry providers', getErrorMessage(error));
        }
        return undefined;
    }
    getChatEntitlementUrl() {
        if (!this.productService.defaultAccount) {
            return undefined;
        }
        if (this.isEnterpriseAuthenticationProvider(this.getDefaultAccountProviderId())) {
            try {
                const enterpriseUrl = this.getEnterpriseUrl();
                if (!enterpriseUrl) {
                    return undefined;
                }
                return `${enterpriseUrl.protocol}//api.${enterpriseUrl.hostname}${enterpriseUrl.port ? ':' + enterpriseUrl.port : ''}/copilot_internal/user`;
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        return this.productService.defaultAccount?.chatEntitlementUrl;
    }
    getTokenEntitlementUrl() {
        if (!this.productService.defaultAccount) {
            return undefined;
        }
        if (this.isEnterpriseAuthenticationProvider(this.getDefaultAccountProviderId())) {
            try {
                const enterpriseUrl = this.getEnterpriseUrl();
                if (!enterpriseUrl) {
                    return undefined;
                }
                return `${enterpriseUrl.protocol}//api.${enterpriseUrl.hostname}${enterpriseUrl.port ? ':' + enterpriseUrl.port : ''}/copilot_internal/v2/token`;
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        return this.productService.defaultAccount?.tokenEntitlementUrl;
    }
    getMcpRegistryDataUrl() {
        if (!this.productService.defaultAccount) {
            return undefined;
        }
        if (this.isEnterpriseAuthenticationProvider(this.getDefaultAccountProviderId())) {
            try {
                const enterpriseUrl = this.getEnterpriseUrl();
                if (!enterpriseUrl) {
                    return undefined;
                }
                return `${enterpriseUrl.protocol}//api.${enterpriseUrl.hostname}${enterpriseUrl.port ? ':' + enterpriseUrl.port : ''}/copilot/mcp_registry`;
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        return this.productService.defaultAccount?.mcpRegistryDataUrl;
    }
    getDefaultAccountProviderId() {
        if (this.productService.defaultAccount && this.configurationService.getValue(this.productService.defaultAccount.authenticationProvider.enterpriseProviderConfig) === this.productService.defaultAccount?.authenticationProvider.enterpriseProviderId) {
            return this.productService.defaultAccount?.authenticationProvider.enterpriseProviderId;
        }
        return this.productService.defaultAccount?.authenticationProvider.id;
    }
    isEnterpriseAuthenticationProvider(providerId) {
        if (!providerId) {
            return false;
        }
        return providerId === this.productService.defaultAccount?.authenticationProvider.enterpriseProviderId;
    }
    getEnterpriseUrl() {
        if (!this.productService.defaultAccount) {
            return undefined;
        }
        const value = this.configurationService.getValue(this.productService.defaultAccount.authenticationProvider.enterpriseProviderUriSetting);
        if (!isString(value)) {
            return undefined;
        }
        return new URL(value);
    }
    registerSignInAction(authProviderId, scopes) {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: DEFAULT_ACCOUNT_SIGN_IN_COMMAND,
                    title: localize(14916, null),
                });
            }
            run() {
                return that.authenticationService.createSession(authProviderId, scopes);
            }
        }));
    }
};
DefaultAccountManagementContribution = __decorate([
    __param(0, IDefaultAccountService),
    __param(1, IConfigurationService),
    __param(2, IAuthenticationService),
    __param(3, IExtensionService),
    __param(4, IProductService),
    __param(5, IRequestService),
    __param(6, ILogService),
    __param(7, IWorkbenchEnvironmentService),
    __param(8, IContextKeyService)
], DefaultAccountManagementContribution);
export { DefaultAccountManagementContribution };
registerWorkbenchContribution2('workbench.contributions.defaultAccountManagement', DefaultAccountManagementContribution, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=defaultAccount.js.map