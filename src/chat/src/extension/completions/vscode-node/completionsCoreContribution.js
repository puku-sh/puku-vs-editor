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
exports.CompletionsCoreContribution = void 0;
const vscode_1 = require("vscode");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const observableInternal_1 = require("../../../util/vs/base/common/observableInternal");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const completionsServiceBridges_1 = require("../../completions-core/vscode-node/completionsServiceBridges");
const inlineCompletion_1 = require("../../completions-core/vscode-node/extension/src/inlineCompletion");
const completionsUnificationContribution_1 = require("./completionsUnificationContribution");
let CompletionsCoreContribution = class CompletionsCoreContribution extends lifecycle_1.Disposable {
    constructor(_instantiationService, configurationService, experimentationService, authenticationService) {
        super();
        this._instantiationService = _instantiationService;
        this.configurationService = configurationService;
        this.authenticationService = authenticationService;
        this._copilotToken = (0, observableInternal_1.observableFromEvent)(this, this.authenticationService.onDidAuthenticationChange, () => this.authenticationService.copilotToken);
        console.log('[CompletionsCoreContribution] Constructor called');
        const unificationState = (0, completionsUnificationContribution_1.unificationStateObservable)(this);
        this._register((0, observableInternal_1.autorun)(reader => {
            const unificationStateValue = unificationState.read(reader);
            const configEnabled = configurationService.getExperimentBasedConfigObservable(configurationService_1.ConfigKey.Internal.InlineEditsEnableGhCompletionsProvider, experimentationService).read(reader);
            const extensionUnification = unificationStateValue?.extensionUnification ?? false;
            // Puku Editor: Also enable inline completions when overrideProxyUrl is set (for BYOK models)
            const overrideProxyUrl = configurationService.getConfig(configurationService_1.ConfigKey.Shared.DebugOverrideProxyUrl);
            const copilotToken = this._copilotToken.read(reader);
            // Puku Editor: Disable Copilot inline completions if Puku AI is configured
            const pukuAIEndpoint = configurationService.getConfig(configurationService_1.ConfigKey.PukuAIEndpoint);
            const usePukuAI = !!pukuAIEndpoint;
            console.log('[CompletionsCoreContribution] Autorun triggered:', {
                codeUnification: unificationStateValue?.codeUnification,
                extensionUnification,
                configEnabled,
                isNoAuthUser: copilotToken?.isNoAuthUser,
                overrideProxyUrl,
                hasToken: copilotToken !== undefined,
                usePukuAI,
                pukuAIEndpoint
            });
            // Puku Editor: Don't register Copilot provider if Puku AI is configured
            if (!usePukuAI && (unificationStateValue?.codeUnification || extensionUnification || configEnabled || copilotToken?.isNoAuthUser || overrideProxyUrl)) {
                console.log('[CompletionsCoreContribution] Registering Copilot inline completion provider');
                const provider = this._getOrCreateProvider();
                reader.store.add(vscode_1.languages.registerInlineCompletionItemProvider({ pattern: '**' }, provider, { debounceDelayMs: 0, excludes: ['puku'], groupId: 'completions' }));
            }
            else {
                console.log('[CompletionsCoreContribution] NOT registering Copilot inline completion provider -', usePukuAI ? 'Puku AI is configured' : 'conditions not met');
            }
            void vscode_1.commands.executeCommand('setContext', 'puku.extensionUnification.activated', extensionUnification);
            if (extensionUnification && this._completionsInstantiationService) {
                reader.store.add(this._completionsInstantiationService.invokeFunction(completionsServiceBridges_1.registerUnificationCommands));
            }
        }));
        this._register((0, observableInternal_1.autorun)(reader => {
            const token = this._copilotToken.read(reader);
            void vscode_1.commands.executeCommand('setContext', 'puku.activated', token !== undefined);
        }));
    }
    _getOrCreateProvider() {
        if (!this._provider) {
            console.log('[CompletionsCoreContribution] Creating inline completion provider');
            const disposables = this._register(new lifecycle_1.DisposableStore());
            this._completionsInstantiationService = this._instantiationService.invokeFunction(completionsServiceBridges_1.createContext, disposables);
            this._completionsInstantiationService.invokeFunction(completionsServiceBridges_1.setup, disposables);
            this._provider = disposables.add(this._completionsInstantiationService.createInstance(inlineCompletion_1.CopilotInlineCompletionItemProvider));
            console.log('[CompletionsCoreContribution] Provider created successfully');
        }
        return this._provider;
    }
};
exports.CompletionsCoreContribution = CompletionsCoreContribution;
exports.CompletionsCoreContribution = CompletionsCoreContribution = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, configurationService_1.IConfigurationService),
    __param(2, nullExperimentationService_1.IExperimentationService),
    __param(3, authentication_1.IAuthenticationService)
], CompletionsCoreContribution);
//# sourceMappingURL=completionsCoreContribution.js.map