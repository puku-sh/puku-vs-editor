/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { IPukuIndexingService, PukuIndexingStatus } from '../node/pukuIndexingService';

/**
 * Puku Indexing Contribution - auto-triggers workspace indexing on startup
 */
export class PukuIndexingContribution extends Disposable {
	static readonly ID = 'pukuIndexing.contribution';

	private _statusBarItem: vscode.StatusBarItem | undefined;

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
	) {
		super();

		// Initialize indexing after a short delay to let the workspace fully load
		setTimeout(() => this._initializeIndexing(), 3000);
	}

	private async _initializeIndexing(): Promise<void> {
		try {
			const indexingService = this._instantiationService.invokeFunction((accessor) => {
				return accessor.get(IPukuIndexingService);
			});

			// Create status bar item
			this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
			this._statusBarItem.text = '$(sync~spin) Puku: Initializing...';
			this._statusBarItem.tooltip = 'Puku Indexing Service';
			this._statusBarItem.show();
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

			if (indexingService.isAvailable()) {
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
