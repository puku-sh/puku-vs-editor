/* eslint-disable header/header */
import type { CancellationToken } from 'vscode';
import { IConfigurationService } from '../../configuration/common/configurationService';
import { IVSCodeExtensionContext } from '../../extContext/common/extensionContext';
import { IFileSystemService } from '../../filesystem/common/fileSystemService';
import { logExecTime } from '../../log/common/logExecTime';
import { ILogService } from '../../log/common/logService';
import { IFetcherService } from '../../networking/common/fetcherService';
import { ITelemetryService } from '../../telemetry/common/telemetry';
import { TelemetryCorrelationId } from '../../../util/common/telemetryCorrelationId';
import { ComputeEmbeddingsOptions, Embedding, EmbeddingType, Embeddings, IEmbeddingsComputer } from '../common/embeddingsComputer';
import { PukuEmbeddingsCache } from './pukuEmbeddingsCache';

interface EmbeddingResponse {
	object: string;
	data: Array<{
		object: string;
		embedding: number[];
		index: number;
	}>;
	model: string;
	usage: {
		prompt_tokens: number;
		total_tokens: number;
	};
}

export class PukuEmbeddingsComputer implements IEmbeddingsComputer {
	declare readonly _serviceBrand: undefined;

	private readonly batchSize = 100;
	private readonly _endpoint: string;
	private readonly _model: string;
	private readonly _dimensions: number;
	private readonly _authToken: string | undefined;
	private readonly _cache: PukuEmbeddingsCache;
	private _cacheInitialized = false;

	constructor(
		@IFetcherService private readonly _fetcherService: IFetcherService,
		@ILogService private readonly _logService: ILogService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IVSCodeExtensionContext private readonly _extensionContext: IVSCodeExtensionContext,
		@IFileSystemService private readonly _fileSystemService: IFileSystemService,
	) {
		// Get configuration values with defaults
		this._endpoint = this._configurationService.getNonExtensionConfig('puku.embeddings.endpoint') || 'https://api.puku.sh/v1/embeddings';
		this._model = this._configurationService.getNonExtensionConfig('puku.embeddings.model') || 'mistralai/codestral-embed-2505';
		this._dimensions = this._configurationService.getNonExtensionConfig('puku.embeddings.dimensions') || 1024;
		this._authToken = this._configurationService.getNonExtensionConfig('puku.embeddings.token');

		// Initialize cache
		this._cache = new PukuEmbeddingsCache(
			this._extensionContext.globalStorageUri,
			this._fileSystemService,
			this._logService,
		);
	}

	public async computeEmbeddings(
		type: EmbeddingType,
		inputs: readonly string[],
		options?: ComputeEmbeddingsOptions,
		telemetryInfo?: TelemetryCorrelationId,
		cancellationToken?: CancellationToken,
	): Promise<Embeddings> {
		return logExecTime(this._logService, 'PukuEmbeddingsComputer::computeEmbeddings', async () => {
			if (inputs.length === 0) {
				return { type, values: [] };
			}

			// Initialize cache if not already done
			if (!this._cacheInitialized) {
				await this._cache.load();
				this._cacheInitialized = true;
			}

			// Use codestralEmbed type for Codestral Embed model
			const embeddingType = type.equals(EmbeddingType.text3small_512) && this._model.includes('codestral')
				? EmbeddingType.codestralEmbed
				: type;

			const embeddingsOut: Embedding[] = [];
			const inputsToFetch: { index: number; input: string; hash: string }[] = [];

			// Check cache for each input
			for (let i = 0; i < inputs.length; i++) {
				const input = inputs[i];
				const hash = PukuEmbeddingsCache.computeHash(input);
				const cacheKey = `${embeddingType.id}-${hash}`;
				const cached = await this._cache.get(cacheKey, hash);

				if (cached) {
					embeddingsOut[i] = cached;
				} else {
					inputsToFetch.push({ index: i, input, hash });
				}
			}

			// Fetch missing embeddings in batches
			if (inputsToFetch.length > 0) {
				for (let i = 0; i < inputsToFetch.length; i += this.batchSize) {
					const batch = inputsToFetch.slice(i, i + this.batchSize);
					if (!batch.length) {
						break;
					}

					if (cancellationToken?.isCancellationRequested) {
						throw new Error('Embeddings computation cancelled');
					}

					try {
						const batchInputs = batch.map(b => b.input);
						const headers: Record<string, string> = {
							'Content-Type': 'application/json',
						};
						
						// Add Authorization header if token is configured
						if (this._authToken) {
							headers['Authorization'] = `Bearer ${this._authToken}`;
						}
						
						const response = await this._fetcherService.fetch(this._endpoint, {
							method: 'POST',
							headers,
							body: JSON.stringify({
								input: batchInputs,
								model: this._model,
								dimensions: this._dimensions,
							}),
						});

						if (!response.ok) {
							const errorText = await response.text();
							this._logService.error(`Embeddings API error: ${response.status} ${errorText}`);
							this._telemetryService.sendMSFTTelemetryErrorEvent('puku.embeddings.error', {
								statusCode: String(response.status),
								error: errorText.substring(0, 200),
							});
							throw new Error(`Error fetching embeddings: ${response.status} ${errorText}`);
						}

						const jsonResponse: EmbeddingResponse = await response.json();

						if (batch.length !== jsonResponse.data.length) {
							throw new Error(`Mismatched embedding result count. Expected: ${batch.length}. Got: ${jsonResponse.data.length}`);
						}

						// Store embeddings in output array and cache
						for (let j = 0; j < batch.length; j++) {
							const batchItem = batch[j];
							const embedding: Embedding = {
								type: embeddingType,
								value: jsonResponse.data[j].embedding,
							};
							embeddingsOut[batchItem.index] = embedding;
							const cacheKey = `${embeddingType.id}-${batchItem.hash}`;
							await this._cache.set(cacheKey, batchItem.hash, embedding);
						}

						// Log success telemetry
						this._telemetryService.sendMSFTTelemetryEvent('puku.embeddings.success', {
							model: this._model,
							correlationId: telemetryInfo?.correlationId,
						}, {
							batchSize: batch.length,
							totalTokens: jsonResponse.usage.total_tokens,
						});

					} catch (error) {
						this._logService.error('PukuEmbeddingsComputer error:', error);
						this._telemetryService.sendMSFTTelemetryErrorEvent('puku.embeddings.error', {
							error: error instanceof Error ? error.message : 'Unknown error',
						});
						throw error;
					}
				}

				// Persist cache after fetching
				await this._cache.persist();
			}

			// Ensure all embeddings are in order
			const finalEmbeddings = inputs.map((_, index) => embeddingsOut[index]).filter((e): e is Embedding => e !== undefined);

			return { type: embeddingType, values: finalEmbeddings };
		});
	}
}

