/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Next Edit Provider interfaces - Copilot-style architecture
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Document identifier for provider operations
 * Combines document and position for provider interface
 */
export interface DocumentId {
	document: vscode.TextDocument;
	position: vscode.Position;
	isCycling?: boolean; // Feature #64: Multiple completions (user pressed Alt+] or Alt+[)
}

/**
 * Common interface for next edit providers (Copilot pattern)
 * Enables racing between different completion sources (FIM, diagnostics, etc.)
 */
export interface IPukuNextEditProvider<T> {
	/**
	 * Unique identifier for this provider
	 */
	readonly ID: string;

	/**
	 * Get next edit suggestion
	 * @param docId Document identifier
	 * @param context VS Code inline completion context
	 * @param token Cancellation token
	 * @returns Edit result or null
	 */
	getNextEdit(
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<T | null>;

	/**
	 * Optional: Run until next edit with delay (Copilot diagnostics pattern)
	 * @param docId Document identifier
	 * @param context VS Code inline completion context
	 * @param delayMs Delay before starting (allows other providers head start)
	 * @param token Cancellation token
	 * @returns Edit result or null
	 */
	runUntilNextEdit?(
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		delayMs: number,
		token: vscode.CancellationToken
	): Promise<T | null>;

	/**
	 * Handle when suggestion is shown to user
	 * @param result The result that was shown
	 */
	handleShown(result: T): void;

	/**
	 * Handle when suggestion is accepted (TAB)
	 * @param docId Document identifier
	 * @param result The result that was accepted
	 */
	handleAcceptance(docId: DocumentId, result: T): void;

	/**
	 * Handle when suggestion is rejected (ESC or typing)
	 * @param docId Document identifier
	 * @param result The result that was rejected
	 */
	handleRejection(docId: DocumentId, result: T): void;

	/**
	 * Handle when suggestion is ignored (superseded by another)
	 * @param docId Document identifier
	 * @param result The result that was ignored
	 * @param supersededBy The result that superseded this one
	 */
	handleIgnored(docId: DocumentId, result: T, supersededBy?: T): void;
}

/**
 * FIM (Fill-In-Middle) completion result
 */
export interface PukuFimResult {
	type: 'fim';
	completion: vscode.InlineCompletionItem | vscode.InlineCompletionItem[]; // Feature #64: Support multiple completions
	requestId: number;
}

/**
 * Diagnostics-based fix result
 */
export interface PukuDiagnosticsResult {
	type: 'diagnostics';
	fix: {
		range: vscode.Range;
		newText: string;
		label: string; // e.g., "TAB to add import"
	};
	requestId: number;
}

/**
 * NES (Next Edit Suggestions) result - refactoring suggestions
 */
export interface PukuNesResult {
	type: 'nes';
	items: vscode.InlineCompletionItem[];
	requestId: string;
	enableForwardStability?: boolean;
	completionList?: vscode.InlineCompletionList; // Optional: Store the class instance for lifecycle tracking
}

/**
 * Union type for all completion results
 */
export type PukuNextEditResult = PukuFimResult | PukuDiagnosticsResult | PukuNesResult | null;
