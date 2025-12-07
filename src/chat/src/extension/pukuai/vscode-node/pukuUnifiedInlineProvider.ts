/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Unified inline completion provider - coordinates diagnostics and FIM (Racing Architecture)
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { PukuInlineEditModel } from './pukuInlineEditModel';
import { PukuFimProvider } from './providers/pukuFimProvider';
import { PukuDiagnosticsNextEditProvider } from './providers/pukuDiagnosticsNextEditProvider';

/**
 * Unified provider that coordinates between diagnostics and FIM providers
 * Now uses Copilot-style racing architecture with IPukuNextEditProvider
 *
 * Architecture:
 * - Single provider registered with VS Code
 * - Internal model coordinates racing between FIM and diagnostics
 * - FIM starts immediately, diagnostics with delay (Copilot pattern)
 * - Priority: FIM > Diagnostics (first wins)
 */
export class PukuUnifiedInlineProvider extends Disposable implements vscode.InlineCompletionItemProvider {
	private readonly model: PukuInlineEditModel;

	constructor(
		private readonly fimProvider: PukuFimProvider,
		private readonly diagnosticsProvider: PukuDiagnosticsNextEditProvider | undefined,
		private readonly logService: ILogService,
		private readonly instantiationService: IInstantiationService
	) {
		super();

		console.log('[PukuUnifiedProvider] Constructor called (racing architecture)');
		this.logService.info('[PukuUnifiedProvider] Constructor called (racing architecture)');

		// Create coordinating model with racing providers
		// Don't pass logService - it's injected by instantiationService
		this.model = this._register(
			this.instantiationService.createInstance(
				PukuInlineEditModel,
				fimProvider,
				diagnosticsProvider
			)
		);

		console.log('[PukuUnifiedProvider] Provider initialized with racing model');
		this.logService.info('[PukuUnifiedProvider] Provider initialized with racing model');
	}

	async provideInlineCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null> {
		console.log('[PukuUnifiedProvider] provideInlineCompletionItems called', {
			file: document.fileName,
			line: position.line,
			char: position.character
		});
		this.logService.info('[PukuUnifiedProvider] provideInlineCompletionItems called');

		if (token.isCancellationRequested) {
			return null;
		}

		// Get completion from model (coordinates diagnostics + FIM)
		console.log('[PukuUnifiedProvider] ⚡ Calling model.getCompletion()...');
		this.logService.info('[PukuUnifiedProvider] Calling model.getCompletion()');

		const result = await this.model.getCompletion(document, position, context, token);

		console.log('[PukuUnifiedProvider] ⚡ Model returned:', result?.type ?? 'null');
		this.logService.info('[PukuUnifiedProvider] Model returned:', result?.type ?? 'null');

		if (!result) {
			this.logService.info('[PukuUnifiedProvider] No result from model');
			return null;
		}

		// Handle diagnostics result
		if (result.type === 'diagnostics') {
			const fix = result.fix;

			console.log('[PukuUnifiedProvider] Diagnostics fix details:', {
				range: `[${fix.range.start.line},${fix.range.start.character} -> ${fix.range.end.line},${fix.range.end.character}]`,
				newText: fix.newText.substring(0, 100),
				label: fix.label,
				cursorLine: position.line
			});

			this.logService.info('[PukuUnifiedProvider] Returning diagnostics fix');

			// IMPORTANT: For inline edits to be accepted with TAB, the range MUST match cursor position
			// But we want to insert at fix.range (top of file). Solution: use a workaround.

			// Check if this is an import fix (range at line 0, cursor elsewhere)
			const isImportFix = fix.range.start.line === 0 && position.line > 0;

			if (isImportFix) {
				// For import fixes: Show suggestion at top of file where it will be inserted
				// IMPORTANT: isInlineEdit: true does NOT support additionalTextEdits (see VS Code InlineEditItem source)
				// So we can't show label at cursor while inserting at top.
				// Instead, show the import preview at the top of the file (line 0)
				console.log('[PukuUnifiedProvider] Import fix - showing at top of file');
				console.log('[PukuUnifiedProvider] Creating import completion item:', {
					insertText: fix.newText,
					range: `[${fix.range.start.line},${fix.range.start.character} -> ${fix.range.end.line},${fix.range.end.character}]`,
					cursorDistance: Math.abs(fix.range.start.line - position.line)
				});

				const item: vscode.InlineCompletionItem = {
					insertText: fix.newText,
					range: fix.range, // Line 0 - top of file
					// Regular inline completion (not inline edit)
					// Will show grey preview text at line 0
				};
				console.log('[PukuUnifiedProvider] ✅ Returning import completion item to VS Code');
				return [item];
			} else {
				// For non-import fixes: Use isInlineEdit for proper diff view
				const item: vscode.InlineCompletionItem = {
					insertText: fix.newText,
					range: fix.range,
					isInlineEdit: true,
					displayLocation: {
						range: new vscode.Range(fix.range.end, fix.range.end),
						label: fix.label,
						kind: vscode.InlineCompletionDisplayLocationKind.Code
					}
				};
				return [item];
			}
		}

		// Handle FIM result
		if (result.type === 'fim') {
			this.logService.info('[PukuUnifiedProvider] Returning FIM completion');
			return [result.completion];
		}

		return null;
	}

	override dispose(): void {
		super.dispose();
		this.logService.info('[PukuUnifiedProvider] Provider disposed');
	}
}
