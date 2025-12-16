/*---------------------------------------------------------------------------------------------
 *  Puku NES Next Edit Provider - Adapter for XtabProvider
 *  Wraps XtabProvider (IStatelessNextEditProvider) to match IPukuNextEditProvider interface
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { ILogService } from '../../../../platform/log/common/logService';
import { Disposable } from '../../../../util/vs/base/common/lifecycle';
import { IPukuNextEditProvider, PukuNesResult, DocumentId } from '../../common/nextEditProvider';
import { IStatelessNextEditProvider, StatelessNextEditDocument, StatelessNextEditRequest, PushEdit } from '../../../../platform/inlineEdits/common/statelessNextEditProvider';
import { Position } from '../../../../util/vs/editor/common/core/position';
import { InlineEditRequestLogContext } from '../../../../platform/inlineEdits/common/inlineEditLogContext';

/**
 * NES (Next Edit Suggestions) Next Edit Provider
 * Adapts XtabProvider to IPukuNextEditProvider interface for racing
 *
 * Key features:
 * - Wraps XtabProvider (stateless provider) to racing provider interface
 * - Converts between VS Code types and internal types
 * - Provides lifecycle hooks for telemetry
 */
export class PukuNesNextEditProvider extends Disposable implements IPukuNextEditProvider<PukuNesResult> {
	readonly ID = 'puku-nes';

	private _requestId = 0;

	constructor(
		private readonly xtabProvider: IStatelessNextEditProvider,
		@ILogService private readonly _logService: ILogService
	) {
		super();
		this._logService.info('[PukuNesNextEdit] Provider initialized');
	}

	/**
	 * IPukuNextEditProvider implementation - main entry point
	 */
	async getNextEdit(
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<PukuNesResult | null> {
		const reqId = ++this._requestId;
		const document = docId.document;
		const position = docId.position;

		console.log(`[PukuNesNextEdit][${reqId}] ⚡ getNextEdit called at ${document.fileName}:${position.line}:${position.character}`);

		// Convert VS Code types to internal types
		const doc: StatelessNextEditDocument = {
			uri: document.uri,
			languageId: document.languageId as any,
			version: document.version,
			getLine: (line: number) => document.lineAt(line).text,
			lineCount: document.lineCount,
		};

		const internalPosition = new Position(position.line + 1, position.character + 1); // 1-indexed

		const request: StatelessNextEditRequest = {
			document: doc,
			position: internalPosition,
		};

		// Create log context for telemetry
		const logContext = new InlineEditRequestLogContext(reqId, document.uri, position.line);

		// Create pushEdit callback (no-op for now, we just wait for final result)
		const pushEdit: PushEdit = (_result) => {
			// Intentionally empty - we don't handle streaming edits in the adapter
		};

		try {
			// Call XtabProvider with proper parameters
			const result = await this.xtabProvider.provideNextEdit(request, pushEdit, logContext, token);

			if (!result || !result.result || !result.result.isOk()) {
				console.log(`[PukuNesNextEdit][${reqId}] No result from XtabProvider`);
				return null;
			}

			const okResult = result.result.val;
			console.log(`[PukuNesNextEdit][${reqId}] Got result from XtabProvider:`, {
				hasEdit: !!okResult.edit
			});

			// Convert result to inline completion item
			const completionItem = this._convertToInlineCompletion(okResult.edit, document, position);

			if (!completionItem) {
				console.log(`[PukuNesNextEdit][${reqId}] Failed to convert result to inline completion`);
				return null;
			}

			// Return as PukuNesResult
			const nesResult: PukuNesResult = {
				type: 'nes',
				completion: completionItem,
				requestId: reqId
			};

			console.log(`[PukuNesNextEdit][${reqId}] ✅ Returning NES result`);
			return nesResult;

		} catch (error) {
			console.log(`[PukuNesNextEdit][${reqId}] Error:`, error);
			this._logService.error(`[PukuNesNextEdit][${reqId}] Error:`, error);
			return null;
		}
	}

	/**
	 * Convert internal edit format to VS Code InlineCompletionItem
	 * Based on reference: vscode-copilot-chat/src/extension/inlineEdits/vscode-node/inlineCompletionProvider.ts:238-254
	 */
	private _convertToInlineCompletion(
		edit: any,
		document: vscode.TextDocument,
		position: vscode.Position
	): vscode.InlineCompletionItem | null {
		if (!edit) {
			return null;
		}

		// StatelessNextEditResult has edit.newText and edit.replaceRange (OffsetRange)
		if (edit.newText && edit.replaceRange) {
			const replaceRange = edit.replaceRange; // OffsetRange with start/endExclusive
			const text = document.getText();

			// Convert OffsetRange to VS Code Position/Range
			// replaceRange.start is character offset, replaceRange.endExclusive is end offset
			const startPos = document.positionAt(replaceRange.start);
			const endPos = document.positionAt(replaceRange.endExclusive);
			const range = new vscode.Range(startPos, endPos);

			// Create inline completion item with the new text and range
			return new vscode.InlineCompletionItem(
				edit.newText,
				range,
				{ title: 'NES Refactoring Suggestion', command: 'puku.acceptNesSuggestion' }
			);
		}

		// Fallback: no valid edit format
		console.log('[PukuNesNextEdit] Unknown edit format:', edit);
		return null;
	}

	/**
	 * Lifecycle handlers - IPukuNextEditProvider interface
	 */

	handleShown(result: PukuNesResult): void {
		console.log(`[PukuNesNextEdit] 👁️ NES suggestion shown`);
		// Track shown suggestions for analytics
	}

	handleAcceptance(docId: DocumentId, result: PukuNesResult): void {
		console.log(`[PukuNesNextEdit] ✅ NES suggestion accepted`);
		// Track acceptance for analytics and model improvement
	}

	handleRejection(docId: DocumentId, result: PukuNesResult): void {
		console.log(`[PukuNesNextEdit] ❌ NES suggestion rejected`);
		// Track rejection for analytics
	}

	handleIgnored(docId: DocumentId, result: PukuNesResult, supersededBy?: PukuNesResult): void {
		console.log(`[PukuNesNextEdit] ⏭️ NES suggestion ignored, supersededBy: ${supersededBy?.type}`);
		// Track when suggestions are superseded by newer ones (racing)
	}

	override dispose(): void {
		super.dispose();
		this._logService.info('[PukuNesNextEdit] Provider disposed');
	}
}
