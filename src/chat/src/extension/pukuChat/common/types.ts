/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';

/**
 * Puku Chat model options
 */
export type PukuChatModel = 'GLM-4.6' | 'GLM-4.5' | 'GLM-4.5-Air' | 'puku-ai' | 'puku-ai-air';

/**
 * Chat message role
 */
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * A single chat message
 */
export interface ChatMessage {
	readonly role: ChatRole;
	readonly content: string;
	readonly name?: string;
	readonly tool_calls?: ToolCall[];
	readonly tool_call_id?: string;
}

/**
 * Tool call from the model
 */
export interface ToolCall {
	readonly id: string;
	readonly type: 'function';
	readonly function: {
		readonly name: string;
		readonly arguments: string;
	};
}

/**
 * Editor context for the current state
 */
export interface EditorContext {
	readonly uri?: vscode.Uri;
	readonly languageId?: string;
	readonly selection?: {
		readonly text: string;
		readonly startLine: number;
		readonly endLine: number;
	};
	readonly visibleRange?: {
		readonly startLine: number;
		readonly endLine: number;
	};
}

/**
 * Context chunk retrieved from workspace indexing
 */
export interface PukuContextChunk {
	readonly uri: vscode.Uri;
	readonly content: string;
	readonly score: number;
	readonly lineStart: number;
	readonly lineEnd: number;
}

/**
 * Options for chat requests
 */
export interface PukuChatOptions {
	/** Model to use */
	readonly model?: PukuChatModel;
	/** Temperature (0-1) */
	readonly temperature?: number;
	/** Max tokens to generate */
	readonly maxTokens?: number;
	/** Whether to include workspace context from indexing */
	readonly includeWorkspaceContext?: boolean;
	/** Maximum context chunks to include */
	readonly maxContextChunks?: number;
	/** Current editor context */
	readonly editorContext?: EditorContext;
	/** Conversation history */
	readonly history?: ChatMessage[];
	/** Whether to enable tool calling */
	readonly enableTools?: boolean;
}

/**
 * Streaming chunk types
 */
export type PukuChatChunkType = 'content' | 'reference' | 'tool_call' | 'error' | 'done';

/**
 * A streaming chunk from the chat
 */
export interface PukuChatChunk {
	readonly type: PukuChatChunkType;
	readonly content?: string;
	readonly reference?: vscode.Location;
	readonly toolCall?: ToolCall;
	readonly error?: string;
}

/**
 * Chat completion response (non-streaming)
 */
export interface PukuChatResponse {
	readonly content: string;
	readonly model: string;
	readonly usage?: {
		readonly promptTokens: number;
		readonly completionTokens: number;
		readonly totalTokens: number;
	};
	readonly toolCalls?: ToolCall[];
}

/**
 * Proxy request format (OpenAI-compatible)
 */
export interface ProxyChatRequest {
	readonly model: string;
	readonly messages: ChatMessage[];
	readonly temperature?: number;
	readonly max_tokens?: number;
	readonly stream?: boolean;
	readonly tools?: ProxyTool[];
}

/**
 * Tool definition for the proxy
 */
export interface ProxyTool {
	readonly type: 'function';
	readonly function: {
		readonly name: string;
		readonly description: string;
		readonly parameters: Record<string, unknown>;
	};
}

/**
 * Streaming response chunk from proxy
 */
export interface ProxyStreamChunk {
	readonly id: string;
	readonly object: string;
	readonly created: number;
	readonly model: string;
	readonly choices: Array<{
		readonly index: number;
		readonly delta: {
			readonly role?: string;
			readonly content?: string;
			readonly tool_calls?: Array<{
				readonly index: number;
				readonly id?: string;
				readonly type?: string;
				readonly function?: {
					readonly name?: string;
					readonly arguments?: string;
				};
			}>;
		};
		readonly finish_reason: string | null;
	}>;
}
