/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands, languages } from 'vscode';
import { IAuthenticationService } from '../../../platform/authentication/common/authentication';
import { ConfigKey, IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { IExperimentationService } from '../../../platform/telemetry/common/nullExperimentationService';
import { Disposable, DisposableStore } from '../../../util/vs/base/common/lifecycle';
import { autorun, observableFromEvent } from '../../../util/vs/base/common/observableInternal';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { createContext, registerUnificationCommands, setup } from '../../completions-core/vscode-node/completionsServiceBridges';
import { CopilotInlineCompletionItemProvider } from '../../completions-core/vscode-node/extension/src/inlineCompletion';
import { unificationStateObservable } from './completionsUnificationContribution';

export class CompletionsCoreContribution extends Disposable {

	private _provider: CopilotInlineCompletionItemProvider | undefined;

	private readonly _copilotToken = observableFromEvent(this, this.authenticationService.onDidAuthenticationChange, () => this.authenticationService.copilotToken);

	private _completionsInstantiationService: IInstantiationService | undefined;

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IExperimentationService experimentationService: IExperimentationService,
		@IAuthenticationService private readonly authenticationService: IAuthenticationService
	) {
		super();

		console.log('[CompletionsCoreContribution] Constructor called');

		const unificationState = unificationStateObservable(this);

		this._register(autorun(reader => {
			const unificationStateValue = unificationState.read(reader);
			const configEnabled = configurationService.getExperimentBasedConfigObservable<boolean>(ConfigKey.Internal.InlineEditsEnableGhCompletionsProvider, experimentationService).read(reader);
			const extensionUnification = unificationStateValue?.extensionUnification ?? false;

			// Puku Editor: Also enable inline completions when overrideProxyUrl is set (for BYOK models)
			const overrideProxyUrl = configurationService.getConfig(ConfigKey.Shared.DebugOverrideProxyUrl);
			const copilotToken = this._copilotToken.read(reader);

			// Puku Editor: Disable Copilot inline completions if Puku AI is configured
			const pukuAIEndpoint = configurationService.getConfig(ConfigKey.PukuAIEndpoint);
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
				reader.store.add(languages.registerInlineCompletionItemProvider({ pattern: '**' }, provider, { debounceDelayMs: 0, excludes: ['puku'], groupId: 'completions' }));
			} else {
				console.log('[CompletionsCoreContribution] NOT registering Copilot inline completion provider -', usePukuAI ? 'Puku AI is configured' : 'conditions not met');
			}

			void commands.executeCommand('setContext', 'puku.extensionUnification.activated', extensionUnification);

			if (extensionUnification && this._completionsInstantiationService) {
				reader.store.add(this._completionsInstantiationService.invokeFunction(registerUnificationCommands));
			}
		}));

		this._register(autorun(reader => {
			const token = this._copilotToken.read(reader);
			void commands.executeCommand('setContext', 'puku.activated', token !== undefined);
		}));
	}

	private _getOrCreateProvider() {
		if (!this._provider) {
			console.log('[CompletionsCoreContribution] Creating inline completion provider');
			const disposables = this._register(new DisposableStore());
			this._completionsInstantiationService = this._instantiationService.invokeFunction(createContext, disposables);
			this._completionsInstantiationService.invokeFunction(setup, disposables);
			this._provider = disposables.add(this._completionsInstantiationService.createInstance(CopilotInlineCompletionItemProvider));
			console.log('[CompletionsCoreContribution] Provider created successfully');
		}
		return this._provider;
	}
}
