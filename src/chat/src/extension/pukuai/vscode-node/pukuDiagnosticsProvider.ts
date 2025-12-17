/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Diagnostics-based code fix provider (Delegates to PukuDiagnosticsNextEditProvider)
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { IPukuAuthService } from '../../pukuIndexing/common/pukuAuth';
import { IPukuConfigService } from '../../pukuIndexing/common/pukuConfig';
import { IPukuIndexingService } from '../../pukuIndexing/node/pukuIndexingService';
import { IPukuDiagnosticsProvider, PukuDiagnosticsResult } from './pukuInlineEditModel';
import { PukuDiagnosticsNextEditProvider } from './providers/pukuDiagnosticsNextEditProvider';
import { DocumentId } from '../common/nextEditProvider';

/**
 * Provides diagnostic fixes via CodeActionProvider (lightbulb menu 💡)
 * Delegates to PukuDiagnosticsNextEditProvider for fix generation
 *
 * Architecture:
 * - Implements IPukuDiagnosticsProvider: getDiagnosticsFix() for backwards compatibility
 * - Implements CodeActionProvider: provideCodeActions() for lightbulb menu (💡)
 * - Delegates all fix generation to PukuDiagnosticsNextEditProvider
 *
 * Note: Does NOT implement InlineCompletionItemProvider (handled by PukuUnifiedInlineProvider)
 */
export class PukuDiagnosticsProvider implements vscode.CodeActionProvider, IPukuDiagnosticsProvider {
	private _disposables: vscode.Disposable[] = [];

	constructor(
		private readonly _nextEditProvider: PukuDiagnosticsNextEditProvider,
		@IPukuAuthService private readonly _authService: IPukuAuthService,
		@IPukuConfigService private readonly _configService: IPukuConfigService,
		@IPukuIndexingService private readonly _indexingService: IPukuIndexingService,
		@ILogService private readonly _logService: ILogService
	) {
		this._logService.info('[PukuDiagnostics] Provider initialized (delegating to NextEditProvider)');
	}

	/**
	 * Public API for unified provider - implements IPukuDiagnosticsProvider
	 * Delegates to PukuDiagnosticsNextEditProvider
	 */
	async getDiagnosticsFix(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<PukuDiagnosticsResult | null> {
		console.log('[PukuDiagnostics] getDiagnosticsFix called (delegating to NextEditProvider)');

		// Create DocumentId for next edit provider
		const docId: DocumentId = { document, position };

		// Delegate to next edit provider
		return await this._nextEditProvider.getNextEdit(docId, context, token);
	}

	// Note: provideInlineCompletionItems() removed - handled by PukuUnifiedInlineProvider
	// All inline completion requests go through: UnifiedProvider → Racing Model → NextEditProvider

	/**
	 * Provide code actions for diagnostics (lightbulb menu 💡)
	 * Delegates to NextEditProvider for fix generation
	 */
	async provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext,
		token: vscode.CancellationToken
	): Promise<vscode.CodeAction[] | undefined> {
		// Only provide code actions if there are diagnostics
		if (context.diagnostics.length === 0) {
			return undefined;
		}

		const actions: vscode.CodeAction[] = [];

		for (const diagnostic of context.diagnostics) {
			// Only handle errors and warnings
			if (diagnostic.severity > vscode.DiagnosticSeverity.Warning) {
				continue;
			}

			// Create DocumentId for next edit provider
			const position = diagnostic.range.start;
			const docId: DocumentId = { document, position };

			// Delegate to next edit provider for fix generation
			const context: vscode.InlineCompletionContext = {
				triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
				selectedCompletionInfo: undefined
			};
			const result = await this._nextEditProvider.getNextEdit(
				docId,
				context,
				token
			);

			if (!result) {
				continue;
			}

			const fix = result.fix;

			// Create code action
			const action = new vscode.CodeAction(
				fix.label.replace('TAB to ', ''), // Remove TAB instruction for lightbulb
				vscode.CodeActionKind.QuickFix
			);

			// Apply the fix
			const edit = new vscode.WorkspaceEdit();
			edit.replace(document.uri, fix.range, fix.newText);

			action.edit = edit;
			action.diagnostics = [diagnostic];
			action.isPreferred = true; // Mark as preferred quick fix

			actions.push(action);
		}

		return actions.length > 0 ? actions : undefined;
	}

	/**
	 * Enable/disable the provider
	 */
	setEnabled(enabled: boolean): void {
		this._nextEditProvider.setEnabled(enabled);
		this._logService.info(`[PukuDiagnostics] Provider ${enabled ? 'enabled' : 'disabled'}`);
	}

	/**
	 * Cleanup
	 */
	dispose(): void {
		this._disposables.forEach(d => d.dispose());
		this._nextEditProvider.dispose();
		this._logService.info('[PukuDiagnostics] Provider disposed');
	}
}
