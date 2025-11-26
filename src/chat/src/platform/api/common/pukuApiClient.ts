/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Puku AI. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	CopilotToken,
	FetchOptions,
	IDomainChangeResponse,
	IExtensionInformation,
	IFetcherService,
	RequestMetadata,
	RequestType
} from './pukuRequestTypes';

/**
 * Domain service for managing API endpoints
 */
class DomainService {
	private _capiUrl = 'https://api.githubcopilot.com';
	private _telemetryUrl = 'https://copilot-telemetry.githubusercontent.com';
	private _dotcomUrl = 'https://api.github.com';
	private _proxyUrl = 'https://copilot-proxy.githubusercontent.com';
	private _originTrackerUrl = 'https://origin-tracker.githubusercontent.com';

	updateDomains(copilotToken: CopilotToken | undefined, enterpriseUrlConfig: string | undefined): IDomainChangeResponse {
		const result: IDomainChangeResponse = {
			capiUrlChanged: false,
			telemetryUrlChanged: false,
			dotcomUrlChanged: false,
			proxyUrlChanged: false
		};

		if (copilotToken?.endpoints) {
			if (copilotToken.endpoints.api && copilotToken.endpoints.api !== this._capiUrl) {
				this._capiUrl = copilotToken.endpoints.api;
				result.capiUrlChanged = true;
			}
			if (copilotToken.endpoints.telemetry && copilotToken.endpoints.telemetry !== this._telemetryUrl) {
				this._telemetryUrl = copilotToken.endpoints.telemetry;
				result.telemetryUrlChanged = true;
			}
			if (copilotToken.endpoints.proxy && copilotToken.endpoints.proxy !== this._proxyUrl) {
				this._proxyUrl = copilotToken.endpoints.proxy;
				result.proxyUrlChanged = true;
			}
			if (copilotToken.endpoints['origin-tracker']) {
				this._originTrackerUrl = copilotToken.endpoints['origin-tracker'];
			}
		}

		// Enterprise URL override
		if (enterpriseUrlConfig) {
			const normalizedUrl = enterpriseUrlConfig.replace(/\/$/, '');
			if (normalizedUrl !== this._dotcomUrl) {
				this._dotcomUrl = normalizedUrl;
				result.dotcomUrlChanged = true;
			}
		}

		return result;
	}

	get capiUrl(): string { return this._capiUrl; }
	get telemetryUrl(): string { return this._telemetryUrl; }
	get dotcomUrl(): string { return this._dotcomUrl; }
	get proxyUrl(): string { return this._proxyUrl; }
	get originTrackerUrl(): string { return this._originTrackerUrl; }
}

/**
 * CAPIClient - replaces @vscode/copilot-api CAPIClient
 *
 * This is a drop-in replacement that maintains the same interface
 * but can be extended to support multiple backends (Puku AI, Ollama, etc.)
 */
export class CAPIClient {
	private readonly _domainService: DomainService;
	private _copilotSku: string = '';
	private _licenseCheckSucceeded: boolean = false;

	constructor(
		private readonly _extensionInfo: IExtensionInformation,
		private readonly _license: string | undefined,
		private readonly _fetcherService?: IFetcherService,
		private readonly _hmacSecret?: string,
		private readonly _forceDevIntegration?: boolean
	) {
		this._domainService = new DomainService();
	}

	updateDomains(copilotToken: CopilotToken | undefined, enterpriseUrlConfig: string | undefined): IDomainChangeResponse {
		if (copilotToken?.sku) {
			this._copilotSku = copilotToken.sku;
		}
		return this._domainService.updateDomains(copilotToken, enterpriseUrlConfig);
	}

	async makeRequest<T>(request: FetchOptions, requestMetadata: RequestMetadata): Promise<T> {
		const url = this._getUrlForRequest(requestMetadata);
		const headers = this._mixinHeaders(request.headers ?? {}, requestMetadata);

		const options: FetchOptions = {
			...request,
			headers
		};

		if (!this._fetcherService) {
			throw new Error('FetcherService not provided');
		}

		return this._fetcherService.fetch(url, options) as Promise<T>;
	}

	private _getUrlForRequest(metadata: RequestMetadata): string {
		const baseUrl = this._domainService.capiUrl;
		const proxyUrl = this._domainService.proxyUrl;

		switch (metadata.type) {
			case RequestType.CopilotToken:
				return `${this._domainService.dotcomUrl}/copilot_internal/v2/token`;

			case RequestType.CopilotNLToken:
				return `${this._domainService.dotcomUrl}/copilot_internal/v2/token`;

			case RequestType.CopilotUserInfo:
				return `${this._domainService.dotcomUrl}/copilot_internal/user`;

			case RequestType.ChatCompletions:
				return `${baseUrl}/chat/completions`;

			case RequestType.ChatResponses:
				return `${baseUrl}/chat/responses`;

			case RequestType.ProxyChatCompletions:
			case RequestType.ProxyCompletions:
				return `${proxyUrl}/v1/engines/copilot-codex/completions`;

			case RequestType.Models:
			case RequestType.AutoModels:
				return `${baseUrl}/models`;

			case RequestType.ModelPolicy:
				return `${baseUrl}/models/${(metadata as { modelId: string }).modelId}/policy`;

			case RequestType.ListModel:
				return `${baseUrl}/models/${(metadata as { modelId: string }).modelId}`;

			case RequestType.CAPIEmbeddings:
				return `${baseUrl}/embeddings`;

			case RequestType.DotcomEmbeddings:
				return `${this._domainService.dotcomUrl}/embeddings`;

			case RequestType.EmbeddingsIndex:
				return `${baseUrl}/embeddings/index`;

			case RequestType.EmbeddingsCodeSearch:
				return `${baseUrl}/embeddings/search`;

			case RequestType.EmbeddingsModels:
				return `${baseUrl}/embeddings/models`;

			case RequestType.Chunks:
				return `${baseUrl}/chunks`;

			case RequestType.ContentExclusion:
				return this._prepareContentExclusionUrl((metadata as { repos: string[] }).repos);

			case RequestType.ChatAttachmentUpload:
				return `${baseUrl}/chat/attachments`;

			case RequestType.RemoteAgent:
				return `${baseUrl}/agents`;

			case RequestType.RemoteAgentChat:
				const slug = (metadata as { slug?: string }).slug;
				return slug ? `${baseUrl}/agents/${slug}/chat` : `${baseUrl}/agents/chat`;

			case RequestType.ListSkills:
				return `${baseUrl}/skills`;

			case RequestType.SearchSkill:
				return `${baseUrl}/skills/${(metadata as { slug: string }).slug}/search`;

			case RequestType.SnippyMatch:
				return this.snippyMatchPath;

			case RequestType.SnippyFilesForMatch:
				return this.snippyFilesForMatchPath;

			case RequestType.CodeReviewAgent:
				return `${baseUrl}/code-review`;

			case RequestType.CodingGuidelines:
				return `${baseUrl}/coding-guidelines`;

			case RequestType.Telemetry:
				return this._domainService.telemetryUrl;

			default:
				return baseUrl;
		}
	}

	private _prepareContentExclusionUrl(repos: string[]): string {
		const url = new URL(`${this._domainService.capiUrl}/content_exclusion`);
		for (const repo of repos) {
			url.searchParams.append('repos', repo);
		}
		return url.toString();
	}

	private _mixinHeaders(headers: { [name: string]: string }, metadata: RequestMetadata): { [name: string]: string } {
		const result = { ...headers };

		// Add integration ID unless suppressed
		if (!result['X-Integration-Id']) {
			result['X-Integration-Id'] = `vscode/${this._extensionInfo.vscodeVersion}`;
		}

		// Add extension info
		result['Editor-Version'] = `vscode/${this._extensionInfo.vscodeVersion}`;
		result['Editor-Plugin-Version'] = `${this._extensionInfo.name}/${this._extensionInfo.version}`;
		result['X-Request-Id'] = this._generateRequestId();

		// Add machine/session IDs
		result['X-Machine-Id'] = this._extensionInfo.machineId;
		result['X-Session-Id'] = this._extensionInfo.sessionId;

		// Add HMAC if available
		if (this._hmacSecret) {
			result['X-HMAC'] = this._hmacSecret;
		}

		return result;
	}

	private _generateRequestId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	get copilotTelemetryURL(): string {
		return this._domainService.telemetryUrl;
	}

	get dotcomAPIURL(): string {
		return this._domainService.dotcomUrl;
	}

	get capiPingURL(): string {
		return `${this._domainService.capiUrl}/ping`;
	}

	get proxyBaseURL(): string {
		return this._domainService.proxyUrl;
	}

	get originTrackerURL(): string {
		return this._domainService.originTrackerUrl;
	}

	get snippyMatchPath(): string {
		return `${this._domainService.capiUrl}/snippy/match`;
	}

	get snippyFilesForMatchPath(): string {
		return `${this._domainService.capiUrl}/snippy/files`;
	}
}
