/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { IPukuIndexingService, PukuIndexingStatus } from '../node/pukuIndexingService';
import { IPukuConfigService } from '../common/pukuConfig';
import { IPukuAuthService } from '../common/pukuAuth';

/**
 * Puku Indexing Contribution - auto-triggers workspace indexing on startup
 */
export class PukuIndexingContribution extends Disposable {
	static readonly ID = 'pukuIndexing.contribution';

	private _statusBarItem: vscode.StatusBarItem | undefined;
	private _indexingService: IPukuIndexingService | undefined;

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
	) {
		super();

		// Ensure .puku folder exists immediately (like Cursor's .cursor folder)
		this._ensurePukuFolder();

		// Register search command
		this._registerCommands();

		// Register internal command to refresh indexing when auth changes
		this._register(vscode.commands.registerCommand('_puku.refreshIndexing', async () => {
			console.log('[PukuIndexing.contribution] Refresh indexing command received');
			// If indexing hasn't been initialized yet, try to initialize it now
			if (!this._indexingService) {
				const authService = this._instantiationService.invokeFunction((accessor) => {
					return accessor.get(IPukuAuthService);
				});
				if (authService.isSignedIn()) {
					console.log('[PukuIndexing.contribution] User is signed in, initializing indexing');
					await this._initializeIndexing();
				} else {
					console.log('[PukuIndexing.contribution] User not signed in, skipping indexing');
				}
			} else {
				console.log('[PukuIndexing.contribution] Indexing already initialized');
			}
		}));

		// Initialize indexing after a short delay to let the workspace fully load
		setTimeout(() => this._initializeIndexing(), 3000);
	}

	/**
	 * Ensure .puku folder exists in workspace root
	 * Creates folder proactively (like Cursor's .cursor folder) so it's always available
	 */
	private _ensurePukuFolder(): void {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			return;
		}

		const pukuFolderUri = vscode.Uri.joinPath(workspaceFolder.uri, '.puku');

		// Only create on local file system (not remote/virtual)
		if (pukuFolderUri.scheme !== 'file') {
			return;
		}

		// Create folder async (don't block extension activation)
		(async () => {
			try {
				const fs = await import('fs');
				await fs.promises.mkdir(pukuFolderUri.fsPath, { recursive: true });
			} catch (error) {
				// Ignore errors (might already exist or permissions issue)
				// Embeddings cache will try again later if needed
			}
		})();
	}

	private _registerCommands(): void {
		// Puku Semantic Search command for testing
		this._register(vscode.commands.registerCommand('puku.semanticSearch', async () => {
			if (!this._indexingService) {
				vscode.window.showErrorMessage('Puku Indexing not initialized');
				return;
			}

			if (this._indexingService.status !== PukuIndexingStatus.Ready) {
				vscode.window.showWarningMessage('Puku Indexing is not ready. Please wait for indexing to complete.');
				return;
			}

			const query = await vscode.window.showInputBox({
				prompt: 'Enter search query',
				placeHolder: 'Search for semantically similar code...',
			});

			if (!query) {
				return;
			}

			try {
				const results = await this._indexingService.search(query, 10);

				if (results.length === 0) {
					vscode.window.showInformationMessage('No results found');
					return;
				}

				// Show results in a quick pick
				const items = results.map((result, index) => ({
					label: `$(file) ${vscode.workspace.asRelativePath(result.uri)}`,
					description: `Score: ${(result.score * 100).toFixed(1)}%`,
					detail: result.content.substring(0, 100).replace(/\n/g, ' ') + '...',
					uri: result.uri,
				}));

				const selected = await vscode.window.showQuickPick(items, {
					placeHolder: `Found ${results.length} results`,
					matchOnDescription: true,
					matchOnDetail: true,
				});

				if (selected) {
					const document = await vscode.workspace.openTextDocument(selected.uri);
					await vscode.window.showTextDocument(document);
				}
			} catch (error) {
				console.error('[PukuIndexing] Search failed:', error);
				vscode.window.showErrorMessage(`Search failed: ${error}`);
			}
		}));

		// Re-index command
		this._register(vscode.commands.registerCommand('puku.reindex', async () => {
			if (!this._indexingService) {
				vscode.window.showErrorMessage('Puku Indexing not initialized');
				return;
			}

			if (this._indexingService.status === PukuIndexingStatus.Indexing) {
				vscode.window.showWarningMessage('Indexing already in progress');
				return;
			}

			vscode.window.showInformationMessage('Starting re-index...');
			await this._indexingService.startIndexing();
		}));

		// Clear cache command - useful for troubleshooting or after updates
		this._register(vscode.commands.registerCommand('puku.clearIndexCache', async () => {
			const confirm = await vscode.window.showWarningMessage(
				'This will delete the embeddings cache and re-index the workspace. Continue?',
				{ modal: true },
				'Clear Cache'
			);

			if (confirm !== 'Clear Cache') {
				return;
			}

			// Get storage path and delete database
			const storageUri = vscode.workspace.workspaceFolders?.[0]
				? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, '.puku')
				: undefined;

			const { PukuEmbeddingsCache } = await import('../node/pukuEmbeddingsCache');
			const deleted = await PukuEmbeddingsCache.deleteDatabase(storageUri);

			if (deleted) {
				vscode.window.showInformationMessage('Cache cleared. Restarting indexing...');
				// Trigger re-index
				if (this._indexingService) {
					await this._indexingService.startIndexing();
				}
			} else {
				vscode.window.showInformationMessage('No cache to clear or cache not found.');
			}
		}));

		// Internal command: Get indexing status (for dashboard display)
		this._register(vscode.commands.registerCommand('_puku.getIndexingStatus', () => {
			if (!this._indexingService) {
				return {
					status: 'disabled',
					indexedFiles: 0,
					chunks: 0
				};
			}

			const files = this._indexingService.getIndexedFiles();
			const totalChunks = files.reduce((sum, f) => sum + f.chunks, 0);
			const progress = this._indexingService.progress;

			return {
				status: this._indexingService.status,
				indexedFiles: files.length,
				chunks: totalChunks,
				progress: this._indexingService.status === PukuIndexingStatus.Indexing
					? {
						totalFiles: progress.totalFiles,
						indexedFiles: progress.indexedFiles
					}
					: undefined
			};
		}));
	}

	private async _initializeIndexing(): Promise<void> {
		try {
			// Initialize config service first
			const configService = this._instantiationService.invokeFunction((accessor) => {
				return accessor.get(IPukuConfigService);
			});
			await configService.initialize();
			console.log('[PukuIndexing.contribution] Config service initialized');

			// Get auth service to check sign-in status
			const authService = this._instantiationService.invokeFunction((accessor) => {
				return accessor.get(IPukuAuthService);
			});

			// ALWAYS create the indexing service (even when signed out)
			// This ensures the auth status listener is set up to respond to sign-in events
			console.log('[PukuIndexing.contribution] Creating indexing service (auth status:', authService.isSignedIn() ? 'signed in' : 'signed out', ')');

			this._indexingService = this._instantiationService.invokeFunction((accessor) => {
				return accessor.get(IPukuIndexingService);
			});
			const indexingService = this._indexingService;

			// Create status bar item (hidden - workbench layer handles status with dashboard)
			this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
			this._statusBarItem.text = '$(sync~spin) Puku: Initializing...';
			this._statusBarItem.tooltip = 'Puku Indexing Service';
			// this._statusBarItem.show(); // Hidden - workbench shows status + dashboard with sign-in
			this._register({ dispose: () => this._statusBarItem?.dispose() });

			// Listen for status changes
			this._register(indexingService.onDidChangeStatus((progress) => {
				this._updateStatusBar(progress.status, progress);
			}));

			// Listen for completion
			this._register(indexingService.onDidCompleteIndexing(() => {
				const files = indexingService.getIndexedFiles();
				vscode.window.showInformationMessage(`Puku: Indexed ${files.length} files for semantic search`);
			}));

			// Initialize and start indexing
			await indexingService.initialize();

			if (await indexingService.isAvailable()) {
				console.log('[PukuIndexing.contribution] Starting workspace indexing');
				await indexingService.startIndexing();
			} else {
				console.log('[PukuIndexing.contribution] Indexing not available');
				this._updateStatusBar(PukuIndexingStatus.Disabled);
			}
		} catch (error) {
			console.error('[PukuIndexing.contribution] Failed to initialize indexing:', error);
			this._updateStatusBar(PukuIndexingStatus.Error);
		}
	}

	private _updateStatusBar(status: PukuIndexingStatus, progress?: { totalFiles: number; indexedFiles: number; currentFile?: string }): void {
		if (!this._statusBarItem) {
			return;
		}

		switch (status) {
			case PukuIndexingStatus.Initializing:
				this._statusBarItem.text = '$(sync~spin) Puku: Initializing...';
				this._statusBarItem.backgroundColor = undefined;
				break;

			case PukuIndexingStatus.Indexing:
				if (progress) {
					const percent = progress.totalFiles > 0
						? Math.round((progress.indexedFiles / progress.totalFiles) * 100)
						: 0;
					this._statusBarItem.text = `$(sync~spin) Puku: Indexing ${percent}%`;
					this._statusBarItem.tooltip = progress.currentFile
						? `Indexing: ${progress.currentFile}\n${progress.indexedFiles}/${progress.totalFiles} files`
						: `${progress.indexedFiles}/${progress.totalFiles} files`;
				} else {
					this._statusBarItem.text = '$(sync~spin) Puku: Indexing...';
				}
				this._statusBarItem.backgroundColor = undefined;
				break;

			case PukuIndexingStatus.Ready:
				this._statusBarItem.text = '$(check) Puku: Ready';
				this._statusBarItem.tooltip = 'Puku Indexing: Ready for semantic search';
				this._statusBarItem.backgroundColor = undefined;
				break;

			case PukuIndexingStatus.Error:
				this._statusBarItem.text = '$(error) Puku: Error';
				this._statusBarItem.tooltip = 'Puku Indexing: Error occurred';
				this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
				break;

			case PukuIndexingStatus.Disabled:
				this._statusBarItem.text = '$(circle-slash) Puku: Disabled';
				this._statusBarItem.tooltip = 'Puku Indexing: Not available';
				this._statusBarItem.backgroundColor = undefined;
				break;

			case PukuIndexingStatus.Idle:
			default:
				this._statusBarItem.text = '$(circle-outline) Puku: Idle';
				this._statusBarItem.tooltip = 'Puku Indexing: Idle';
				this._statusBarItem.backgroundColor = undefined;
				break;
		}
	}
}
