/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Enhanced Inline Edit Model with Next Edit Suggestions Integration
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IPukuAuthService } from '../../pukuIndexing/common/pukuAuth';
import { IPukuConfigService } from '../../pukuIndexing/common/pukuConfig';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { ILogService } from '../../../platform/log/common/logService';
import { IPukuIndexingService } from '../../pukuIndexing/node/pukuIndexingService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { PukuNextEditManager } from './pukuNextEditManager';
import { PukuNesNextEditProvider } from './pukuNesNextEditProvider';
import { PukuFimNextEditProvider } from './pukuFimNextEditProvider';
import { DocumentId, PukuNextEditResult } from '../../common/nextEditProvider';
import { CancellationToken } from '../../../base/common/cancellation';

/**
 * Enhanced inline edit model that coordinates FIM and NES providers
 */
export interface IPukuInlineCompletionProvider {
	provideInlineCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionList | null>;
}

/**
 * Enhanced Inline Completion Provider with Next Edit Suggestions
 *
 * Integrates the existing FIM functionality with new NES capabilities.
 * Uses the PukuNextEditManager to coordinate multiple providers.
 */
export class PukuEnhancedInlineCompletionProvider extends Disposable implements vscode.InlineCompletionItemProvider {
	private readonly nextEditManager: PukuNextEditManager;
	private readonly originalProvider: IPukuInlineCompletionProvider;

	private _lastRequestTime = 0;
	private _enabled = true;

	constructor(
		private readonly endpoint: string,
		private readonly fetcherService: IFetcherService,
		private readonly logService: ILogService,
		private readonly authService: IPukuAuthService,
		private readonly indexingService: IPukuIndexingService,
		private readonly configService: IPukuConfigService,
		private readonly originalInlineCompletionProvider: IPukuInlineCompletionProvider,
	) {
		super();

		// Initialize next edit manager
		this.nextEditManager = this._register(new PukuNextEditManager(logService, configService));
		this.originalProvider = originalInlineCompletionProvider;

		// Register providers with the manager
		this.registerProviders();

		// Register VS Code command for NES acceptance
		this.registerCommands();

		this.logService.info('[PukuEnhancedInlineCompletionProvider] Initialized with NES integration');
	}

	/**
	 * Register all providers with the next edit manager
	 */
	private registerProviders(): void {
		// Create and register NES provider
		const nesProvider = this._register(new PukuNesNextEditProvider(
			this.authService,
			this.configService,
			this.fetcherService,
			this.logService,
			// TODO: Add IEditorService dependency
		));
		this.nextEditManager.registerProvider(nesProvider);

		// Create and register FIM provider (wrapper around existing functionality)
		const fimProvider = this._register(new PukuFimNextEditProvider(
			this.originalProvider,
			this.logService,
		));
		this.nextEditManager.registerProvider(fimProvider);
	}

	/**
	 * Register VS Code commands for NES functionality
	 */
	private registerCommands(): void {
		const acceptCommand = vscode.commands.registerCommand('puku.acceptNextEdit', () => {
			const activeEditor = vscode.window.activeTextEditor;
			if (activeEditor) {
				const docId: DocumentId = {
					document: activeEditor.document,
					position: activeEditor.selection.active
				};
				this.nextEditManager.acceptSuggestion(docId);
			}
		});

		const rejectCommand = vscode.commands.registerCommand('puku.rejectNextEdit', () => {
			const activeEditor = vscode.window.activeTextEditor;
			if (activeEditor) {
				const docId: DocumentId = {
					document: activeEditor.document,
					position: activeEditor.selection.active
				};
				this.nextEditManager.rejectSuggestion(docId);
			}
		});

		this._register(acceptCommand);
		this._register(rejectCommand);

		this.logService.debug('[PukuEnhancedInlineCompletionProvider] Registered NES commands');
	}

	/**
	 * Main inline completion provider method
	 */
	async provideInlineCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionList | null> {
		try {
			if (!this._enabled) {
				return null;
			}

			// Check debounce timing
			if (!this.shouldRequest(document, position)) {
				// Return current cached suggestion if available
				return this.getCurrentSuggestion();
			}

			// Create document identifier
			const docId: DocumentId = {
				document,
				position,
				isCycling: context.triggerKind === vscode.InlineCompletionTriggerKind.Invoke
			};

			// Race all providers through the manager
			const nextEditResult = await this.nextEditManager.getNextEdit(docId, context, token);

			if (nextEditResult && !token.isCancellationRequested) {
				// Convert next edit result to inline completion list
				return this.convertToInlineCompletionList(nextEditResult);
			}

		} catch (error) {
			this.logService.error('[PukuEnhancedInlineCompletionProvider] Error providing completions:', error);
		}

		return null;
	}

	/**
	 * Check if we should make a request based on timing and debounce
	 */
	private shouldRequest(document: vscode.TextDocument, position: vscode.Position): boolean {
		const config = this.configService.getConfig();
		const debounceMs = config.performance.debounceMs;
		const now = Date.now();

		// Check if enough time has passed since last request
		if (now - this._lastRequestTime < debounceMs) {
			return false;
		}

		// TODO: Add more sophisticated debounce logic based on document changes
		this._lastRequestTime = now;
		return true;
	}

	/**
	 * Get current suggestion from the manager
	 */
	private getCurrentSuggestion(): vscode.InlineCompletionList | null {
		const currentResult = this.nextEditManager.getCurrentSuggestion();
		if (currentResult) {
			return this.convertToInlineCompletionList(currentResult);
		}
		return null;
	}

	/**
	 * Convert next edit result to VS Code inline completion list
	 */
	private convertToInlineCompletionList(result: PukuNextEditResult): vscode.InlineCompletionList {
		let items: vscode.InlineCompletionItem[];

		if (Array.isArray(result.completion)) {
			items = result.completion;
		} else {
			items = [result.completion];
		}

		// Add additional metadata for NES items
		if (result.type === 'nes') {
			items = items.map(item => ({
				...item,
				// Ensure NES items are marked as inline edits
				isInlineEdit: true,
				// Add command for accepting NES
				command: item.command || {
					title: "Accept Next Edit",
					command: "puku.acceptNextEdit"
				}
			}));
		}

		return {
			items,
			enableForwardStability: true
		};
	}

	/**
	 * Enable or disable the provider
	 */
	setEnabled(enabled: boolean): void {
		this._enabled = enabled;
		this.logService.info(`[PukuEnhancedInlineCompletionProvider] ${enabled ? 'Enabled' : 'Disabled'}`);
	}

	/**
	 * Get provider statistics
	 */
	getStats(): { enabled: boolean; lastRequestTime: number } {
		return {
			enabled: this._enabled,
			lastRequestTime: this._lastRequestTime
		};
	}
}