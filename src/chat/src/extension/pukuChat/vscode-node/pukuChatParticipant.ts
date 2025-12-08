/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IPukuIndexingService, PukuIndexingStatus } from '../../pukuIndexing/node/pukuIndexingService';

/**
 * Puku Status Bar
 *
 * Shows Puku indexing status in the status bar.
 * The chat is handled by the existing infrastructure (renamed from Copilot to Puku)
 * which uses Puku embeddings via ConditionalEmbeddingsComputer.
 */
export class PukuChatParticipant extends Disposable {
	private _statusBarItem: vscode.StatusBarItem | undefined;

	constructor(
		@IPukuIndexingService private readonly _indexingService: IPukuIndexingService,
	) {
		super();

		// Create status bar
		this._createStatusBar();

		console.log('[Puku] Status bar initialized');
	}

	private _createStatusBar(): void {
		this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
		this._updateStatusBar();
		// this._statusBarItem.show(); // Hidden - workbench layer handles status bar
		this._register({ dispose: () => this._statusBarItem?.dispose() });

		// Listen for indexing status changes
		this._register(this._indexingService.onDidChangeStatus(() => {
			this._updateStatusBar();
		}));
	}

	private _updateStatusBar(): void {
		if (!this._statusBarItem) {
			return;
		}

		const files = this._indexingService.getIndexedFiles();
		const chunks = files.reduce((sum, f) => sum + f.chunks, 0);

		switch (this._indexingService.status) {
			case PukuIndexingStatus.Ready:
				this._statusBarItem.text = `$(sparkle) Puku`;
				this._statusBarItem.tooltip = `Puku AI Ready\nIndexed: ${files.length} files, ${chunks} chunks`;
				this._statusBarItem.backgroundColor = undefined;
				break;
			case PukuIndexingStatus.Indexing:
				const progress = this._indexingService.progress;
				const percent = progress.totalFiles > 0
					? Math.round((progress.indexedFiles / progress.totalFiles) * 100)
					: 0;
				this._statusBarItem.text = `$(sync~spin) Puku ${percent}%`;
				this._statusBarItem.tooltip = `Puku Indexing: ${progress.indexedFiles}/${progress.totalFiles} files`;
				this._statusBarItem.backgroundColor = undefined;
				break;
			case PukuIndexingStatus.Error:
				this._statusBarItem.text = `$(error) Puku`;
				this._statusBarItem.tooltip = 'Puku: Error - Check proxy connection';
				this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
				break;
			default:
				this._statusBarItem.text = `$(circle-outline) Puku`;
				this._statusBarItem.tooltip = 'Puku: Initializing...';
				this._statusBarItem.backgroundColor = undefined;
		}
	}
}
