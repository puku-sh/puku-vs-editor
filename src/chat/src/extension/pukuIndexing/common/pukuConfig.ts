/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { createServiceIdentifier } from '../../../util/common/services';
import { Emitter, Event } from '../../../util/vs/base/common/event';
import { Disposable } from '../../../util/vs/base/common/lifecycle';

/**
 * Puku configuration from server
 */
export interface PukuConfig {
	readonly semanticSearch: {
		readonly minLimit: number;
		readonly maxLimit: number;
		readonly defaultLimit: number;
		readonly commentShortLimit: number;
		readonly commentMediumLimit: number;
		readonly commentLongLimit: number;
	};
	readonly endpoints: {
		readonly fim: string;
		readonly summarize: string;
		readonly embeddings: string;
	};
	readonly models: {
		readonly fim: string;
		readonly summarization: string;
		readonly embeddings: string;
	};
	readonly performance: {
		readonly debounceMs: number;
		readonly cacheTTL: number;
		readonly maxConcurrentJobs: number;
		readonly chunksPerJob: number;
		readonly batchSize: number;
	};
	readonly diagnostics: {
		readonly maxDistanceForImport: number;
		readonly maxDistanceForAsync: number;
		readonly maxDistanceForAny: number;
		readonly delayBeforeFixMs: number;
	};
	readonly chat: {
		readonly summarizeAgentConversationHistoryEnabled: boolean;
		readonly summarizeAgentConversationHistoryThreshold: number;
	};
	readonly embeddingsCache: {
		readonly schemaVersion: string;
		readonly modelId: string;
		readonly embeddingDimensions: number;
	};
}

/**
 * Default fallback configuration (used if server is unavailable)
 */
export const DEFAULT_PUKU_CONFIG: PukuConfig = {
	semanticSearch: {
		minLimit: 2,
		maxLimit: 20,
		defaultLimit: 10,
		commentShortLimit: 5,
		commentMediumLimit: 10,
		commentLongLimit: 15,
	},
	endpoints: {
		fim: 'https://api.puku.sh/v1/fim/context',
		summarize: 'https://api.puku.sh/v1/summarize/batch',
		embeddings: 'https://api.puku.sh/v1/embeddings',
	},
	models: {
		fim: 'mistralai/codestral-2501',
		summarization: 'qwen/qwen-2.5-coder-32b-instruct',
		embeddings: 'nomic-ai/nomic-embed-text',
	},
	performance: {
		debounceMs: 200,
		cacheTTL: 300000, // 5 minutes
		maxConcurrentJobs: 5,
		chunksPerJob: 50, // Increased from 20 for faster indexing
		batchSize: 50, // 50 chunks per API request (~18,750 tokens, safe for 32k context)
	},
	diagnostics: {
		maxDistanceForImport: 12, // GitHub Copilot uses 12
		maxDistanceForAsync: 3, // GitHub Copilot uses 3
		maxDistanceForAny: 5, // GitHub Copilot uses 5
		delayBeforeFixMs: 50, // GitHub Copilot uses 50ms (see inlineCompletionProvider.ts:183)
	},
	chat: {
		summarizeAgentConversationHistoryEnabled: true, // Default: enabled
		summarizeAgentConversationHistoryThreshold: 100000, // Default: 100k tokens
	},
	embeddingsCache: {
		schemaVersion: '7', // Schema version for embeddings cache
		modelId: 'puku-embeddings-1024',
		embeddingDimensions: 1024,
	},
};

export const IPukuConfigService = createServiceIdentifier<IPukuConfigService>('IPukuConfigService');

export interface IPukuConfigService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when configuration changes
	 */
	readonly onDidChangeConfig: Event<PukuConfig>;

	/**
	 * Current configuration (undefined if not yet loaded)
	 */
	readonly config: PukuConfig | undefined;

	/**
	 * Initialize and fetch configuration from server
	 */
	initialize(): Promise<void>;

	/**
	 * Refresh configuration from server
	 */
	refresh(): Promise<void>;

	/**
	 * Get configuration (with fallback to defaults)
	 */
	getConfig(): PukuConfig;
}

/**
 * Base Puku Config Service - manages configuration from server
 */
export class PukuConfigService extends Disposable implements IPukuConfigService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeConfig = this._register(new Emitter<PukuConfig>());
	readonly onDidChangeConfig = this._onDidChangeConfig.event;

	protected _config: PukuConfig | undefined;
	protected _refreshTimeout: ReturnType<typeof setTimeout> | undefined;
	private _initialized = false;

	private readonly _configEndpoint: string;

	constructor(configEndpoint: string) {
		super();
		this._configEndpoint = configEndpoint;
	}

	get config(): PukuConfig | undefined {
		return this._config;
	}

	async initialize(): Promise<void> {
		if (this._initialized) {
			return;
		}
		this._initialized = true;
		await this._fetchConfig();
		this._scheduleRefresh();
	}

	async refresh(): Promise<void> {
		await this._fetchConfig();
	}

	getConfig(): PukuConfig {
		return this._config || DEFAULT_PUKU_CONFIG;
	}

	protected async _fetchConfig(): Promise<void> {
		try {
			const response = await fetch(this._configEndpoint);
			if (!response.ok) {
				console.warn(`[PukuConfig] Failed to fetch config (${response.status}), using defaults`);
				this._config = DEFAULT_PUKU_CONFIG;
				return;
			}

			const data = await response.json();
			this._config = data as PukuConfig;
			this._onDidChangeConfig.fire(this._config);
			console.log('[PukuConfig] Configuration loaded from server:', this._config);
		} catch (error) {
			console.error('[PukuConfig] Error fetching config:', error);
			this._config = DEFAULT_PUKU_CONFIG;
		}
	}

	protected _scheduleRefresh(): void {
		if (this._refreshTimeout) {
			clearTimeout(this._refreshTimeout);
		}

		const ttl = this._config?.performance.cacheTTL || DEFAULT_PUKU_CONFIG.performance.cacheTTL;
		this._refreshTimeout = setTimeout(() => {
			this.refresh().catch(console.error);
			this._scheduleRefresh();
		}, ttl);
	}

	override dispose(): void {
		if (this._refreshTimeout) {
			clearTimeout(this._refreshTimeout);
		}
		super.dispose();
	}
}
