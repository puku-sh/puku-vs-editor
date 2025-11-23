/* eslint-disable header/header */
import type { CancellationToken } from 'vscode';
import { IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { TelemetryCorrelationId } from '../../../util/common/telemetryCorrelationId';
import { ComputeEmbeddingsOptions, EmbeddingType, Embeddings, IEmbeddingsComputer } from '../../../platform/embeddings/common/embeddingsComputer';
import { RemoteEmbeddingsComputer } from '../../../platform/embeddings/common/remoteEmbeddingsComputer';
import { PukuEmbeddingsComputer } from '../../../platform/embeddings/node/pukuEmbeddingsComputer';

/**
 * Conditionally uses PukuEmbeddingsComputer if puku embeddings endpoint is configured,
 * otherwise falls back to RemoteEmbeddingsComputer
 */
export class ConditionalEmbeddingsComputer implements IEmbeddingsComputer {
	declare readonly _serviceBrand: undefined;

	private _delegate: IEmbeddingsComputer | undefined;

	constructor(
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
	) { }

	private getDelegate(): IEmbeddingsComputer {
		if (!this._delegate) {
			// Use PukuEmbeddingsComputer if:
			// 1. PukuAI endpoint is configured (indicates using Puku AI)
			// 2. Ollama endpoint is configured (indicates using proxy/Ollama)
			// 3. Puku embeddings endpoint is explicitly configured
			if (this._shouldUsePukuEmbeddings()) {
				this._delegate = this._instantiationService.createInstance(PukuEmbeddingsComputer);
			} else {
				this._delegate = this._instantiationService.createInstance(RemoteEmbeddingsComputer);
			}
		}
		return this._delegate;
	}

	private _shouldUsePukuEmbeddings(): boolean {
		// Check if PukuAI endpoint is configured, which indicates we're using Puku AI
		const pukuAIEndpoint = this._configurationService.getNonExtensionConfig('pukuai.endpoint');
		const ollamaEndpoint = this._configurationService.getNonExtensionConfig('github.copilot.chat.byok.ollamaEndpoint');
		const pukuEmbeddingsEndpoint = this._configurationService.getNonExtensionConfig('puku.embeddings.endpoint');
		
		// Use Puku embeddings if any of these are configured
		return !!(pukuAIEndpoint || ollamaEndpoint || pukuEmbeddingsEndpoint);
	}

	public async computeEmbeddings(
		type: EmbeddingType,
		inputs: readonly string[],
		options?: ComputeEmbeddingsOptions,
		telemetryInfo?: TelemetryCorrelationId,
		cancellationToken?: CancellationToken,
	): Promise<Embeddings> {
		return this.getDelegate().computeEmbeddings(type, inputs, options, telemetryInfo, cancellationToken);
	}
}

