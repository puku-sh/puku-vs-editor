/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *--------------------------------------------------------------------------------------------*/
import { lm } from 'vscode';
import { ConfigKey, IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { IVSCodeExtensionContext } from '../../../platform/extContext/common/extensionContext';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { BYOKStorageService, IBYOKStorageService } from '../../byok/vscode-node/byokStorageService';
import { IExtensionContribution } from '../../common/contributions';
import { PukuAILanguageModelProvider } from './pukuaiProvider';

export class PukuAIContribution extends Disposable implements IExtensionContribution {
	public readonly id: string = 'pukuai-contribution';
	private _providerRegistered = false;
	private readonly _byokStorageService: IBYOKStorageService;

	constructor(
		@IFetcherService private readonly _fetcherService: IFetcherService,
		@ILogService private readonly _logService: ILogService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IVSCodeExtensionContext extensionContext: IVSCodeExtensionContext,
	) {
		super();
		this._byokStorageService = new BYOKStorageService(extensionContext);
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

		if (this._providerRegistered) {
			this._logService.info('Puku AI: Provider already registered');
			return;
		}

		try {
			// Check if this is a Puku AI proxy
			// Check if the endpoint is reachable
			const versionUrl = `${endpoint}/api/version`; // Standard Ollama/Proxy version check
			console.log(`Puku AI: Checking version at ${versionUrl}`);

			const response = await this._fetcherService.fetch(versionUrl, { method: 'GET' });
			console.log(`Puku AI: Version response status: ${response.status}`);
			if (!response.ok) {
				console.log('Puku AI: Endpoint not reachable or not an Ollama-compatible proxy');
				return;
			}

			console.log('Puku AI: Detected compatible proxy, registering provider');

			const provider = this._instantiationService.createInstance(PukuAILanguageModelProvider, endpoint);

			// Register as 'pukuai' vendor
			const vendorName = 'pukuai';

			console.log(`Puku AI: Registering as '${vendorName}' vendor`);
			this._logService.info(`Puku AI: Registering as '${vendorName}' vendor`);

			this._register(lm.registerLanguageModelChatProvider(vendorName, provider));

			this._providerRegistered = true;
			console.log('Puku AI: Provider registered successfully');

		} catch (error) {
			console.error(`Puku AI: Failed to register provider: ${error}`);
		}
	}
}
