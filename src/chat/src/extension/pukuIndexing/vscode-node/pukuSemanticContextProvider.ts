/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { CancellationToken } from 'vscode-languageserver-protocol';
import { Copilot } from '../../../platform/inlineCompletions/common/api';
import { ILanguageContextProviderService } from '../../../platform/languageContextProvider/common/languageContextProviderService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { IPukuIndexingService, PukuIndexingStatus } from '../node/pukuIndexingService';

/**
 * Puku Semantic Context Provider
 *
 * Provides semantically relevant code snippets from the workspace index
 * to be used in FIM (Fill-In-Middle) completions.
 */
export class PukuSemanticContextProvider extends Disposable {
	static readonly PROVIDER_ID = 'puku.semanticContext';

	private _registration: vscode.Disposable | undefined;

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
	) {
		super();

		// Register context provider after workspace is loaded
		setTimeout(() => this._registerContextProvider(), 5000);
	}

	private _registerContextProvider(): void {
		try {
			const languageContextService = this._instantiationService.invokeFunction((accessor) => {
				return accessor.get(ILanguageContextProviderService);
			});

			const indexingService = this._instantiationService.invokeFunction((accessor) => {
				return accessor.get(IPukuIndexingService);
			});

			// Create the context provider
			const provider: Copilot.ContextProvider<Copilot.CodeSnippet> = {
				id: PukuSemanticContextProvider.PROVIDER_ID,
				// Match all supported languages
				selector: [
					{ language: 'typescript' },
					{ language: 'typescriptreact' },
					{ language: 'javascript' },
					{ language: 'javascriptreact' },
					{ language: 'python' },
					{ language: 'java' },
					{ language: 'c' },
					{ language: 'cpp' },
					{ language: 'csharp' },
					{ language: 'go' },
					{ language: 'rust' },
					{ language: 'ruby' },
					{ language: 'php' },
					{ language: 'swift' },
					{ language: 'kotlin' },
					{ language: 'scala' },
					{ language: 'vue' },
					{ language: 'svelte' },
				],
				resolver: {
					resolve: async (request: Copilot.ResolveRequest, token: CancellationToken): Promise<Copilot.CodeSnippet[]> => {
						// Check if indexing is ready
						if (indexingService.status !== PukuIndexingStatus.Ready) {
							console.log('[PukuSemanticContext] Indexing not ready, skipping');
							return [];
						}

						if (token.isCancellationRequested) {
							return [];
						}

						try {
							// Get current document content around cursor for semantic search
							const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(request.documentContext.uri));
							const position = new vscode.Position(
								request.documentContext.position.line,
								request.documentContext.position.character
							);

							// Extract context around cursor (5 lines before + current line)
							const startLine = Math.max(0, position.line - 5);
							const contextRange = new vscode.Range(startLine, 0, position.line, position.character);
							const contextText = document.getText(contextRange);

							if (!contextText || contextText.trim().length < 10) {
								console.log('[PukuSemanticContext] Context too short, skipping');
								return [];
							}

							console.log('[PukuSemanticContext] Searching for context:', contextText.substring(0, 100));

							// Search the index for semantically similar code
							const results = await indexingService.search(contextText, 5);

							if (results.length === 0) {
								console.log('[PukuSemanticContext] No results found');
								return [];
							}

							console.log(`[PukuSemanticContext] Found ${results.length} results`);

							// Convert to CodeSnippet format
							const snippets: Copilot.CodeSnippet[] = results
								.filter(result => {
									// Exclude the current file
									return result.uri.toString() !== request.documentContext.uri;
								})
								.map((result, index) => ({
									uri: result.uri.toString(),
									value: result.content,
									importance: Math.round((1 - index * 0.1) * 100), // Decrease importance for later results
									id: `puku-semantic-${index}`,
								}));

							console.log(`[PukuSemanticContext] Returning ${snippets.length} snippets`);
							return snippets;
						} catch (error) {
							console.error('[PukuSemanticContext] Error resolving context:', error);
							return [];
						}
					},
				},
			};

			// Register with the language context provider service
			this._registration = languageContextService.registerContextProvider(provider);
			this._register({ dispose: () => this._registration?.dispose() });

			console.log('[PukuSemanticContext] Context provider registered');
		} catch (error) {
			console.error('[PukuSemanticContext] Failed to register context provider:', error);
		}
	}

	override dispose(): void {
		this._registration?.dispose();
		super.dispose();
	}
}
