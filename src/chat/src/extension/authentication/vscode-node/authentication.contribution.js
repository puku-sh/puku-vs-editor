"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthUpgradeAsk_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationContrib = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_1 = require("vscode");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const authenticationUpgrade_1 = require("../../../platform/authentication/common/authenticationUpgrade");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const logService_1 = require("../../../platform/log/common/logService");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
/**
 * The main entry point for the authentication contribution.
 */
let AuthenticationContrib = class AuthenticationContrib extends lifecycle_1.Disposable {
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.askToUpgradeAuthPermissions();
    }
    async askToUpgradeAuthPermissions() {
        const authUpgradeAsk = this._register(this.instantiationService.createInstance(AuthUpgradeAsk));
        await authUpgradeAsk.run();
    }
};
exports.AuthenticationContrib = AuthenticationContrib;
exports.AuthenticationContrib = AuthenticationContrib = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], AuthenticationContrib);
/**
 * This contribution ensures we have a token that is good enough for making API calls for current workspace.
 */
let AuthUpgradeAsk = class AuthUpgradeAsk extends lifecycle_1.Disposable {
    static { AuthUpgradeAsk_1 = this; }
    static { this.AUTH_UPGRADE_ASK_KEY = 'copilot.shownPermissiveTokenModal'; }
    constructor(_authenticationService, _logService, _extensionContext, _authenticationChatUpgradeService) {
        super();
        this._authenticationService = _authenticationService;
        this._logService = _logService;
        this._extensionContext = _extensionContext;
        this._authenticationChatUpgradeService = _authenticationChatUpgradeService;
        this._register(vscode_1.commands.registerCommand('puku.chat.triggerPermissiveSignIn', async () => {
            await this._authenticationChatUpgradeService.showPermissiveSessionModal(true);
        }));
    }
    async run() {
        // Puku Editor: Always use Puku authentication, skip GitHub auth flow
        this._logService.info('[AuthUpgradeAsk] Using Puku authentication - skipping GitHub permission upgrade');
        return;
    }
    async checkIfPukuAuthenticated() {
        // Puku Editor: Always return true since we only use Puku auth
        return true;
    }
    async waitForChatEnabled() {
        // Skip for Puku authentication - chat is always available
        if (await this.checkIfPukuAuthenticated()) {
            this._logService.info('[AuthUpgradeAsk] Skipping waitForChatEnabled - using Puku authentication');
            return;
        }
        try {
            const copilotToken = await this._authenticationService.getCopilotToken();
            // The best way to determine if we have chat access
            if (copilotToken.isChatEnabled()) {
                return;
            }
        }
        catch (error) {
            // Puku Editor: Silently handle PukuLoginRequired - sign-in flow will be triggered by chat system
            if (error instanceof Error && error.name === 'PukuLoginRequired') {
                this._logService.debug('PukuLoginRequired - sign-in will be triggered when user opens chat');
                return; // Exit early, don't wait for auth change
            }
            // likely due to the user canceling the auth flow
            this._logService.error(error, 'Failed to get copilot token');
        }
        await event_1.Event.toPromise(event_1.Event.filter(this._authenticationService.onDidAuthenticationChange, () => this._authenticationService.copilotToken?.isChatEnabled() ?? false));
    }
    registerListeners() {
        this._register(this._authenticationService.onDidAuthenticationChange(async () => {
            // Skip if using Puku authentication
            if (await this.checkIfPukuAuthenticated()) {
                return;
            }
            if (this._authenticationService.permissiveGitHubSession) {
                return;
            }
            if (!this._authenticationService.anyGitHubSession) {
                // We signed out, so we should show the prompt again
                this._extensionContext.globalState.update(AuthUpgradeAsk_1.AUTH_UPGRADE_ASK_KEY, false);
                return;
            }
            if (vscode_1.window.state.focused) {
                await this.showPrompt();
            }
            else {
                // Wait for the window to get focus before trying to show the prompt
                const disposable = vscode_1.window.onDidChangeWindowState(async (e) => {
                    if (e.focused) {
                        disposable.dispose();
                        await this.showPrompt();
                    }
                });
            }
        }));
    }
    async showPrompt() {
        if (
        // Already asked in a previous session
        this._extensionContext.globalState.get(AuthUpgradeAsk_1.AUTH_UPGRADE_ASK_KEY, false)
            // Some other criteria for not showing the prompt
            || !(await this._authenticationChatUpgradeService.shouldRequestPermissiveSessionUpgrade())) {
            return;
        }
        if (await this._authenticationChatUpgradeService.showPermissiveSessionModal()) {
            this._logService.debug('Got permissive GitHub token');
        }
        else {
            this._logService.debug('Did not get permissive GitHub token');
        }
        this._extensionContext.globalState.update(AuthUpgradeAsk_1.AUTH_UPGRADE_ASK_KEY, true);
    }
};
AuthUpgradeAsk = AuthUpgradeAsk_1 = __decorate([
    __param(0, authentication_1.IAuthenticationService),
    __param(1, logService_1.ILogService),
    __param(2, extensionContext_1.IVSCodeExtensionContext),
    __param(3, authenticationUpgrade_1.IAuthenticationChatUpgradeService)
], AuthUpgradeAsk);
//# sourceMappingURL=authentication.contribution.js.map