/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { createServiceIdentifier } from '../../../util/common/services';
import { Event } from '../../../util/vs/base/common/event';
import { PukuChatChunk, PukuChatOptions, PukuChatResponse, PukuContextChunk } from './types';

/**
 * Puku Chat Service status
 */
export enum PukuChatStatus {
	/** Service not initialized */
	Uninitialized = 'uninitialized',
	/** Service ready to use */
	Ready = 'ready',
	/** Service is processing a request */
	Busy = 'busy',
	/** Service encountered an error */
	Error = 'error',
}

export const IPukuChatService = createServiceIdentifier<IPukuChatService>('IPukuChatService');

/**
 * Puku Chat Service Interface
 *
 * Provides chat functionality using:
 * - IPukuIndexingService for workspace context (semantic search)
 * - Puku Proxy for GLM model inference
 */
export interface IPukuChatService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when service status changes
	 */
	readonly onDidChangeStatus: Event<PukuChatStatus>;

	/**
	 * Current service status
	 */
	readonly status: PukuChatStatus;

	/**
	 * Initialize the chat service
	 */
	initialize(): Promise<void>;

	/**
	 * Check if the service is ready
	 */
	isReady(): boolean;

	/**
	 * Send a chat message and stream the response
	 *
	 * @param query User's query
	 * @param options Chat options
	 * @param token Cancellation token
	 * @returns Async iterable of chat chunks
	 */
	chat(
		query: string,
		options?: PukuChatOptions,
		token?: { isCancellationRequested: boolean }
	): AsyncIterable<PukuChatChunk>;

	/**
	 * Send a chat message and get a complete response (non-streaming)
	 *
	 * @param query User's query
	 * @param options Chat options
	 * @returns Complete chat response
	 */
	chatComplete(
		query: string,
		options?: PukuChatOptions
	): Promise<PukuChatResponse>;

	/**
	 * Get relevant workspace context for a query using semantic search
	 *
	 * @param query Search query
	 * @param limit Maximum number of results
	 * @returns Array of relevant context chunks
	 */
	getWorkspaceContext(query: string, limit?: number): Promise<PukuContextChunk[]>;

	/**
	 * Check if workspace indexing is ready
	 */
	isIndexingReady(): boolean;

	/**
	 * Get indexing statistics
	 */
	getIndexingStats(): { fileCount: number; chunkCount: number; status: string };
}
