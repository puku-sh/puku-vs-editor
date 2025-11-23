/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Puku AI. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Request types for Puku API - replaces @vscode/copilot-api RequestType
 *
 * This enum defines all the request types used throughout the codebase.
 * It maintains compatibility with the original Copilot API types while
 * allowing Puku to operate independently.
 *
 * NOTE: Enum values must match exactly with @vscode/copilot-api for backward compatibility
 */
export enum RequestType {
	// Authentication
	CopilotToken = 'CopilotToken',
	CopilotNLToken = 'CopilotNLToken',
	CopilotUserInfo = 'CopilotUserInfo',

	// Chat
	ChatCompletions = 'ChatCompletions',
	ChatResponses = 'ChatResponses',
	ProxyCompletions = 'ProxyCompletions',
	ProxyChatCompletions = 'ProxyChatCompletions',

	// Models
	Models = 'Models',
	AutoModels = 'AutoModels',
	ModelPolicy = 'ModelPolicy',
	ListModel = 'ListModel',

	// Embeddings
	CAPIEmbeddings = 'CAPIEmbeddings',
	DotcomEmbeddings = 'DotcomEmbeddings',
	EmbeddingsIndex = 'EmbedingsIndex', // Note: typo matches original
	EmbeddingsCodeSearch = 'EmbeddingsCodeSearch',
	EmbeddingsModels = 'EmbeddingsModels',

	// Chunking
	Chunks = 'Chunks',

	// Content
	ContentExclusion = 'ContentExclusion',
	ChatAttachmentUpload = 'ChatAttachmentUpload',
	CodingGuidelines = 'CodingGuidelines',

	// Remote Agents
	RemoteAgent = 'RemoteAgent',
	RemoteAgentChat = 'RemoteAgentChat',
	ListSkills = 'ListSkills',
	SearchSkill = 'SearchSkill',

	// Snippy
	SnippyMatch = 'SnippyMatch',
	SnippyFilesForMatch = 'SnippyFlesForMatch', // Note: typo matches original

	// Code Review
	CodeReviewAgent = 'CodeReviewAgent',

	// Telemetry
	Telemetry = 'Telemetry',
}

/**
 * Request metadata - replaces @vscode/copilot-api RequestMetadata
 * Union type to match original API structure
 */
export type RequestMetadata =
	| { type: Exclude<RequestType, RequestType.ListModel | RequestType.ModelPolicy | RequestType.SearchSkill | RequestType.RemoteAgentChat | RequestType.ContentExclusion | RequestType.ChatCompletions | RequestType.ChatResponses | RequestType.Models | RequestType.CodingGuidelines | RequestType.EmbeddingsIndex | RequestType.ChatAttachmentUpload> }
	| { type: RequestType.CodingGuidelines | RequestType.EmbeddingsIndex; repoWithOwner: string }
	| { type: RequestType.ChatCompletions | RequestType.ChatResponses | RequestType.Models; isModelLab?: boolean }
	| { type: RequestType.ListModel | RequestType.ModelPolicy; modelId: string; isModelLab?: boolean }
	| { type: RequestType.SearchSkill; slug: string }
	| { type: RequestType.RemoteAgentChat; slug?: string }
	| { type: RequestType.ContentExclusion; repos: string[] }
	| { type: RequestType.ChatAttachmentUpload; uploadName: string; mimeType: string };

/**
 * Abort signal interface - matches @vscode/copilot-api IAbortSignal
 */
export interface IAbortSignal {
	readonly aborted: boolean;
	addEventListener(type: 'abort', listener: (this: AbortSignal) => void): void;
	removeEventListener(type: 'abort', listener: (this: AbortSignal) => void): void;
}

/**
 * Fetch options - matches @vscode/copilot-api FetchOptions
 */
export interface FetchOptions {
	headers?: { [name: string]: string };
	body?: string | ArrayBuffer | Uint8Array | Blob | FormData | URLSearchParams | ReadableStream<Uint8Array>;
	timeout?: number;
	json?: unknown;
	method?: 'GET' | 'POST';
	signal?: IAbortSignal;
	suppressIntegrationId?: boolean;
}

/**
 * Fetcher service interface - matches @vscode/copilot-api IFetcherService
 */
export interface IFetcherService {
	fetch(url: string, options: FetchOptions): Promise<unknown>;
}

/**
 * Extension information - matches @vscode/copilot-api IExtensionInformation
 */
export interface IExtensionInformation {
	name: string;
	sessionId: string;
	machineId: string;
	vscodeVersion: string;
	version: string;
	buildType: 'dev' | 'prod';
}

/**
 * Copilot token structure - matches @vscode/copilot-api CopilotToken
 */
export interface CopilotToken {
	endpoints: {
		api?: string;
		telemetry?: string;
		proxy?: string;
		'origin-tracker'?: string;
	};
	sku: string;
}

/**
 * Domain change response - matches @vscode/copilot-api IDomainChangeResponse
 */
export interface IDomainChangeResponse {
	capiUrlChanged: boolean;
	telemetryUrlChanged: boolean;
	dotcomUrlChanged: boolean;
	proxyUrlChanged: boolean;
}
