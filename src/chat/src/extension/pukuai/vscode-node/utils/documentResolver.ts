/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Document resolver for multi-document inline completions
 *  Based on Copilot's doc.fromOffsetRange() pattern (vscodeWorkspace.ts)
 *  Reference: inlineCompletionProvider.ts:238-239
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Resolved document with target range
 */
export interface ResolvedDocument {
	uri: vscode.Uri;
	document: vscode.TextDocument;
	range: vscode.Range;
}

/**
 * Metadata extracted from completion response
 */
export interface CompletionMetadata {
	targetDocument?: string;  // URI string
	targetLine?: number;      // 0-indexed
	targetColumn?: number;    // 0-indexed
	displayType?: 'code' | 'label';
}

/**
 * Document resolver for multi-document completions
 * Resolves target document from completion metadata
 */
export class DocumentResolver {
	private readonly _cache = new Map<string, vscode.TextDocument>();

	constructor(
		private readonly _workspace: typeof vscode.workspace
	) {}

	/**
	 * Resolve target document from completion metadata
	 * Based on Copilot's doc.fromOffsetRange() pattern
	 * Reference: inlineCompletionProvider.ts:238-239
	 *
	 * @param metadata Completion metadata from API response
	 * @param currentDocumentUri Current document URI
	 * @returns Resolved document or undefined if same document/not found
	 */
	resolveFromMetadata(
		metadata: CompletionMetadata | undefined,
		currentDocumentUri: vscode.Uri
	): ResolvedDocument | undefined {
		if (!metadata || !metadata.targetDocument) {
			return undefined; // Same document edit (no metadata)
		}

		let targetUri = vscode.Uri.parse(metadata.targetDocument);

		// Normalize /workspace prefix to actual workspace root
		// API returns: file:///workspace/src/utils.ts
		// VS Code has: file:///Users/.../workspace-name/src/utils.ts
		if (targetUri.path.startsWith('/workspace/')) {
			const workspaceFolder = this._workspace.getWorkspaceFolder(currentDocumentUri);
			if (workspaceFolder) {
				const relativePath = targetUri.path.replace('/workspace/', '');
				targetUri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
				console.log(`[DocumentResolver] Normalized /workspace URI: ${metadata.targetDocument} → ${targetUri.toString()}`);
			}
		}

		// Resolve document from workspace (works for both same and different documents)
		const document = this.resolveFromUri(targetUri);
		if (!document) {
			console.warn(`[DocumentResolver] Target document not found: ${targetUri.toString()}`);
			return undefined;
		}

		// Create range from metadata
		const line = metadata.targetLine ?? 0;
		const col = metadata.targetColumn ?? 0;
		const range = new vscode.Range(
			new vscode.Position(line, col),
			new vscode.Position(line, col)
		);

		// Return resolved document even if same as current
		// This allows same-document redirects (e.g., import to line 0)
		return { uri: targetUri, document, range };
	}

	/**
	 * Resolve document from URI
	 * Uses cache for performance
	 *
	 * @param uri Document URI
	 * @returns TextDocument if found, undefined otherwise
	 */
	resolveFromUri(uri: vscode.Uri): vscode.TextDocument | undefined {
		const uriString = uri.toString();

		// Check cache
		if (this._cache.has(uriString)) {
			return this._cache.get(uriString);
		}

		// Find in workspace
		const document = this._workspace.textDocuments.find(
			d => d.uri.toString() === uriString
		);

		if (document) {
			this._cache.set(uriString, document);
		}

		return document;
	}

	/**
	 * Clear cache entry for URI
	 * Called when document deleted/renamed
	 *
	 * @param uriString Document URI string
	 */
	clearCache(uriString: string): void {
		this._cache.delete(uriString);
	}

	/**
	 * Clear all cache entries
	 * Called on workspace close
	 */
	clearAllCache(): void {
		this._cache.clear();
	}

	/**
	 * Update URI mapping after file rename
	 *
	 * @param oldUriString Old URI string
	 * @param newUriString New URI string
	 */
	updateUri(oldUriString: string, newUriString: string): void {
		const document = this._cache.get(oldUriString);
		if (document) {
			this._cache.delete(oldUriString);
			this._cache.set(newUriString, document);
		}
	}
}
