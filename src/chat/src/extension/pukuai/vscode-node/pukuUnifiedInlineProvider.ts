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
import { RejectionCollector } from '../common/rejectionCollector';

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
	private readonly rejectionCollector: RejectionCollector;

	// Track completions by their text to enable rejection tracking
	private readonly completionsByText = new Map<string, { document: vscode.TextDocument; position: vscode.Position }>();

	constructor(
		private readonly fimProvider: PukuFimProvider,
		private readonly diagnosticsProvider: PukuDiagnosticsNextEditProvider | undefined,
		private readonly logService: ILogService,
		private readonly instantiationService: IInstantiationService
	) {
		super();

		console.log('[PukuUnifiedProvider] Constructor called (racing architecture)');
		this.logService.info('[PukuUnifiedProvider] Constructor called (racing architecture)');

		// Initialize rejection collector (Issue #56)
		this.rejectionCollector = new RejectionCollector();

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
		// Detect cycling: user pressed Alt+] or Alt+[ to see more completions
		const isCycling = context.triggerKind === vscode.InlineCompletionTriggerKind.Invoke;

		console.log('[PukuUnifiedProvider] provideInlineCompletionItems called', {
			file: document.fileName,
			line: position.line,
			char: position.character,
			isCycling // Log cycling state
		});
		this.logService.info(`[PukuUnifiedProvider] provideInlineCompletionItems called (cycling: ${isCycling})`);

		if (token.isCancellationRequested) {
			return null;
		}

		// Get completion from model (coordinates diagnostics + FIM)
		console.log('[PukuUnifiedProvider] ⚡ Calling model.getCompletion()...');
		this.logService.info('[PukuUnifiedProvider] Calling model.getCompletion()');

		const result = await this.model.getCompletion(document, position, context, token, isCycling);

		console.log('[PukuUnifiedProvider] ⚡ Model returned:', result?.type ?? 'null');
		this.logService.info('[PukuUnifiedProvider] Model returned:', result?.type ?? 'null');

		if (!result) {
			this.logService.info('[PukuUnifiedProvider] No result from model');
			return null;
		}

		// Check if completion was previously rejected (Issue #56)
		if (result.type === 'fim') {
			const items = Array.isArray(result.completion) ? result.completion : [result.completion];
			const completionText = typeof items[0]?.insertText === 'string' ? items[0].insertText : '';

			if (this.rejectionCollector.isRejected(document, completionText, position)) {
				this.logService.info('[PukuUnifiedProvider] ⛔ Blocking previously rejected completion');
				console.log('[PukuUnifiedProvider] ⛔ Completion was previously rejected, not showing');
				return null;
			}
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
				// For import fixes: Show at top of file (line 0)
				// Even though cursor is elsewhere, VS Code can still show this
				console.log('[PukuUnifiedProvider] Import fix - showing at top of file');
				console.log('[PukuUnifiedProvider] Creating import completion item:', {
					insertText: fix.newText,
					range: `[${fix.range.start.line},${fix.range.start.character} -> ${fix.range.end.line},${fix.range.end.character}]`,
					cursorDistance: Math.abs(fix.range.start.line - position.line)
				});

				const item: vscode.InlineCompletionItem = {
					insertText: fix.newText,
					range: fix.range, // Line 0 - top of file
				};
				console.log('[PukuUnifiedProvider] ✅ Returning import completion item to VS Code with forward stability');
				// Return InlineCompletionList with enableForwardStability (Issue #55)
				return {
					items: [item],
					enableForwardStability: true
				};
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
				// Return InlineCompletionList with enableForwardStability (Issue #55)
				return {
					items: [item],
					enableForwardStability: true
				};
			}
		}

		// Handle FIM result
		if (result.type === 'fim') {
			// Support multiple completions (Feature #64)
			const items = Array.isArray(result.completion) ? result.completion : [result.completion];
			this.logService.info(`[PukuUnifiedProvider] Returning ${items.length} FIM completion(s) with forward stability`);

			// Track completions for rejection tracking (Issue #56)
			for (const item of items) {
				const text = typeof item.insertText === 'string' ? item.insertText : '';
				this.completionsByText.set(text, { document, position });
			}

			// Return InlineCompletionList with enableForwardStability (Issue #55)
			return {
				items,
				enableForwardStability: true
			};
		}

		return null;
	}

	/**
	 * Handle completion lifecycle (Issue #56: Rejection Tracking)
	 * Called by VS Code when completion is accepted, rejected, or ignored
	 *
	 * Based on: vscode-copilot-chat/src/extension/inlineEdits/vscode-node/inlineCompletionProvider.ts:412
	 */
	public handleEndOfLifetime?(
		item: vscode.InlineCompletionItem,
		reason: vscode.InlineCompletionEndOfLifeReason
	): void {
		const text = typeof item.insertText === 'string' ? item.insertText : '';
		const metadata = this.completionsByText.get(text);

		if (!metadata) {
			console.log('[PukuUnifiedProvider] ⚠️  handleEndOfLifetime called for unknown completion');
			return;
		}

		const reasonKind = vscode.InlineCompletionEndOfLifeReasonKind[reason.kind];
		console.log(`[PukuUnifiedProvider] handleEndOfLifetime: ${reasonKind}`, {
			textPreview: text.substring(0, 50),
			position: `${metadata.document.fileName}:${metadata.position.line}:${metadata.position.character}`
		});

		const fileUri = metadata.document.uri.toString();

		switch (reason.kind) {
			case vscode.InlineCompletionEndOfLifeReasonKind.Accepted:
				this.logService.info('[PukuUnifiedProvider] ✅ Completion accepted');
				// Issue #57: Clear ghost text on acceptance
				this.fimProvider.clearGhostText(fileUri);
				// TODO: Send acceptance telemetry (Issue #56 - future work)
				break;

			case vscode.InlineCompletionEndOfLifeReasonKind.Rejected:
				this.logService.info('[PukuUnifiedProvider] ❌ Completion explicitly rejected (ESC key)');
				this.rejectionCollector.reject(metadata.document, text, metadata.position);
				// Issue #57: Clear ghost text on rejection
				this.fimProvider.clearGhostText(fileUri);
				// TODO: Send rejection telemetry (Issue #56 - future work)
				break;

			case vscode.InlineCompletionEndOfLifeReasonKind.Ignored:
				this.logService.info('[PukuUnifiedProvider] 🔄 Completion ignored (superseded or timeout)');
				// Issue #57: Clear ghost text on ignore (user typed something different)
				this.fimProvider.clearGhostText(fileUri);
				// Don't track ignores as rejections - user didn't explicitly reject
				break;
		}

		// Clean up tracking
		this.completionsByText.delete(text);
	}

	override dispose(): void {
		super.dispose();
		this.logService.info('[PukuUnifiedProvider] Provider disposed');

		// Log rejection stats before disposal
		const stats = this.rejectionCollector.getStats();
		console.log('[PukuUnifiedProvider] Rejection tracker stats on dispose:', stats);
	}
}
