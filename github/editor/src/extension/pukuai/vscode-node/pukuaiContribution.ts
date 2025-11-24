/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { lm, languages } from 'vscode';
import { ConfigKey, IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { IVSCodeExtensionContext } from '../../../platform/extContext/common/extensionContext';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { IExtensionContribution } from '../../common/contributions';
import { PukuAILanguageModelProvider } from './pukuaiProvider';
import { PukuInlineCompletionProvider } from './pukuInlineCompletionProvider';

export class PukuAIContribution extends Disposable implements IExtensionContribution {
	public readonly id: string = 'pukuai-contribution';
	private _providerRegistered = false;
	private _inlineProviderRegistered = false;

	constructor(
		@IFetcherService private readonly _fetcherService: IFetcherService,
		@ILogService private readonly _logService: ILogService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IVSCodeExtensionContext extensionContext: IVSCodeExtensionContext,
	) {
		super();
		console.log('Puku AI: PukuAIContribution constructor called');
		this._logService.info('Puku AI: PukuAIContribution constructor called');

		// Register Puku AI provider if endpoint is configured
		this._registerProvider();

		// Re-register on configuration change
		this._register(this._configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(ConfigKey.PukuAIEndpoint.fullyQualifiedId)) {
				this._registerProvider();
			}
		}));
	}

	private async _registerProvider() {
		// Get endpoint - always try to register if endpoint is set
		const endpoint = this._configurationService.getConfig(ConfigKey.PukuAIEndpoint);
		console.log(`Puku AI: _registerProvider called, endpoint=${endpoint}`);
		this._logService.info(`Puku AI: _registerProvider called, endpoint=${endpoint}`);

		if (this._providerRegistered) {
			this._logService.info('Puku AI: Provider already registered');
			console.log('Puku AI: Provider already registered');
			return;
		}

		if (!endpoint) {
			console.log('Puku AI: No endpoint configured, skipping registration');
			this._logService.info('Puku AI: No endpoint configured, skipping registration');
			return;
		}

		try {
			// Check if this is a Puku AI proxy
			// Check if the endpoint is reachable
			const versionUrl = `${endpoint}/api/version`; // Standard Ollama/Proxy version check
			console.log(`Puku AI: Checking version at ${versionUrl}`);
			this._logService.info(`Puku AI: Checking version at ${versionUrl}`);

			const response = await this._fetcherService.fetch(versionUrl, { method: 'GET' });
			console.log(`Puku AI: Version response status: ${response.status}`);
			this._logService.info(`Puku AI: Version response status: ${response.status}`);

			if (!response.ok) {
				console.log(`Puku AI: Endpoint not reachable or not an Ollama-compatible proxy (status ${response.status})`);
				this._logService.warn(`Puku AI: Endpoint not reachable or not an Ollama-compatible proxy (status ${response.status})`);
				return;
			}

			console.log('Puku AI: Detected compatible proxy, registering provider');
			this._logService.info('Puku AI: Detected compatible proxy, registering provider');

			const provider = this._instantiationService.createInstance(PukuAILanguageModelProvider, endpoint);

			// Register as 'pukuai' vendor - our own vendor identity
			const vendorName = 'pukuai';

			console.log(`Puku AI: Registering as '${vendorName}' vendor`);
			this._logService.info(`Puku AI: Registering as '${vendorName}' vendor`);

			this._register(lm.registerLanguageModelChatProvider(vendorName, provider));

			this._providerRegistered = true;
			console.log('Puku AI: Provider registered successfully');
			this._logService.info('Puku AI: Provider registered successfully');

			// Also register inline completion provider
			this._registerInlineCompletionProvider(endpoint);

		} catch (error) {
			console.error(`Puku AI: Failed to register provider: ${error}`);
			this._logService.error(`Puku AI: Failed to register provider`, error);
		}
	}

	/**
	 * Register standalone inline completion provider for FIM
	 */
	private _registerInlineCompletionProvider(endpoint: string) {
		if (this._inlineProviderRegistered) {
			console.log('Puku AI: Inline completion provider already registered');
			return;
		}

		console.log('Puku AI: Registering inline completion provider');
		this._logService.info('Puku AI: Registering inline completion provider');

		const inlineProvider = this._instantiationService.createInstance(
			PukuInlineCompletionProvider,
			endpoint
		);

		// Register for supported languages with specific selectors
		// Using specific language selectors like typescriptContext does
		const selector: vscode.DocumentSelector = [
			{ scheme: 'file', language: 'python' },
			{ scheme: 'file', language: 'typescript' },
			{ scheme: 'file', language: 'typescriptreact' },
			{ scheme: 'file', language: 'javascript' },
			{ scheme: 'file', language: 'javascriptreact' },
			{ scheme: 'untitled', language: 'python' },
			{ scheme: 'untitled', language: 'typescript' },
			{ scheme: 'untitled', language: 'javascript' },
		];

		// Use vscode.languages directly to ensure correct API
		// Try both proposed and standard API
		try {
			console.log('Puku AI: About to register inline completion provider with vscode.languages');
			const disposable = vscode.languages.registerInlineCompletionItemProvider(selector, inlineProvider, {
				debounceDelayMs: 0,
				groupId: 'puku' // Must match the exclude in completionsCoreContribution to disable Copilot FIM
			});
			this._register(disposable);
			console.log('Puku AI: Registered with proposed API metadata');
		} catch (e) {
			// Fallback to standard API without metadata
			console.log('Puku AI: Proposed API failed, trying standard API:', e);
			try {
				const disposable = vscode.languages.registerInlineCompletionItemProvider(selector, inlineProvider);
				this._register(disposable);
				console.log('Puku AI: Registered with standard API');
			} catch (e2) {
				console.error('Puku AI: Failed to register inline completion provider:', e2);
			}
		}

		this._inlineProviderRegistered = true;
		console.log('Puku AI: Inline completion provider registered successfully');
		this._logService.info('Puku AI: Inline completion provider registered successfully');
	}
}
