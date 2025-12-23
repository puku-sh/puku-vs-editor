/*---------------------------------------------------------------------------------------------
 *  Puku Editor - Diagnostics Provider Adapter
 *  Adapts Copilot's DiagnosticsNextEditProvider to Puku's IPukuNextEditProvider interface
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../../platform/log/common/logService';
import { Disposable } from '../../../../util/vs/base/common/lifecycle';
import { DiagnosticsNextEditProvider, DiagnosticsNextEditResult } from '../../../inlineEdits/vscode-node/features/diagnosticsInlineEditProvider';
import { IPukuNextEditProvider, PukuDiagnosticsResult, DocumentId } from '../../common/nextEditProvider';
import { InlineEditRequestLogContext } from '../../common/inlineEditLogContext';
import { DocumentId as CopilotDocumentId } from '../../../../platform/inlineEdits/common/dataTypes/documentId';

/**
 * Adapter that wraps Copilot's DiagnosticsNextEditProvider to work with Puku's racing model
 *
 * Key responsibilities:
 * - Convert DiagnosticsNextEditResult → PukuDiagnosticsResult
 * - Extract displayLocation metadata from DiagnosticCompletionItem
 * - Preserve label and other metadata for displayLocation labels
 */
export class DiagnosticsProviderAdapter extends Disposable implements IPukuNextEditProvider<PukuDiagnosticsResult> {
	readonly ID = 'diagnostics-adapter';

	constructor(
		private readonly _copilotProvider: DiagnosticsNextEditProvider,
		@ILogService private readonly _logService: ILogService
	) {
		super();
		this._register(_copilotProvider);
		console.log('[DiagnosticsAdapter] Adapter created for Copilot DiagnosticsNextEditProvider');
	}

	async getNextEdit(
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<PukuDiagnosticsResult | null> {
		console.log('[DiagnosticsAdapter] getNextEdit called');

		// Convert Puku DocumentId to Copilot DocumentId
		const copilotDocId = CopilotDocumentId.create(docId.document.uri);
		const logContext = new InlineEditRequestLogContext(
			docId.document.uri.toString(),
			docId.document.version,
			context
		);

		// Call Copilot provider
		const result = await this._copilotProvider.getNextEdit(
			copilotDocId,
			context,
			logContext,
			token,
			undefined as any // telemetry builder - not used
		);

		return this._convertResult(result, docId);
	}

	async runUntilNextEdit(
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		logContext: InlineEditRequestLogContext,
		delayMs: number,
		token: vscode.CancellationToken
	): Promise<PukuDiagnosticsResult | null> {
		console.log(`[DiagnosticsAdapter] runUntilNextEdit called with delay ${delayMs}ms`);
		console.log(`[DiagnosticsAdapter] Document: ${docId.document.uri.toString()}, Line: ${docId.position.line}, Char: ${docId.position.character}`);

		// Check what diagnostics VS Code sees
		const vscDiagnostics = vscode.languages.getDiagnostics(docId.document.uri);
		console.log(`[DiagnosticsAdapter] VS Code diagnostics count: ${vscDiagnostics.length}`);
		if (vscDiagnostics.length > 0) {
			console.log(`[DiagnosticsAdapter] Sample diagnostics:`, vscDiagnostics.slice(0, 3).map(d => ({
				message: d.message,
				range: `${d.range.start.line}:${d.range.start.character}`,
				code: d.code
			})));
		}

		// Convert Puku DocumentId to Copilot DocumentId
		const copilotDocId = CopilotDocumentId.create(docId.document.uri);

		console.log(`[DiagnosticsAdapter] Calling Copilot provider...`);
		// Call Copilot provider with delay
		const result = await this._copilotProvider.runUntilNextEdit(
			copilotDocId,
			context,
			logContext,
			delayMs,
			token,
			undefined as any // telemetry builder - not used
		);

		console.log(`[DiagnosticsAdapter] Copilot provider returned:`, {
			hasResult: !!result,
			hasResultData: !!result?.result,
			requestId: result?.requestId
		});

		if (result?.result) {
			console.log(`[DiagnosticsAdapter] Result details:`, {
				editRange: result.result.edit.range,
				editText: result.result.edit.text.substring(0, 100),
				hasDisplayLocation: !!result.result.displayLocation,
				itemType: result.result.item.type
			});
		}

		return this._convertResult(result, docId);
	}

	/**
	 * Convert Copilot's DiagnosticsNextEditResult to Puku's PukuDiagnosticsResult
	 * Extracts displayLocation metadata from DiagnosticCompletionItem
	 */
	private _convertResult(
		copilotResult: DiagnosticsNextEditResult,
		docId: DocumentId
	): PukuDiagnosticsResult | null {
		if (!copilotResult.result) {
			console.log('[DiagnosticsAdapter] No result from Copilot diagnostics provider');
			return null;
		}

		const { edit, displayLocation, item } = copilotResult.result;

		// Extract label from displayLocation (Copilot's approach)
		const label = displayLocation?.label || 'Apply fix';

		// Convert offset-based edit range to Position-based Range
		const editStartPos = docId.document.positionAt(edit.range.start);
		const editEndPos = docId.document.positionAt(edit.range.end);
		const editRange = new vscode.Range(editStartPos, editEndPos);

		console.log('[DiagnosticsAdapter] ✅ Converted Copilot result to Puku result:', {
			hasDisplayLocation: !!displayLocation,
			label,
			editRange: `${editRange.start.line}:${editRange.start.character} -> ${editRange.end.line}:${editRange.end.character}`,
			itemType: item.type
		});

		// Convert to Puku format
		const result: PukuDiagnosticsResult = {
			type: 'diagnostics',
			fix: {
				range: editRange,
				newText: edit.text,
				label: label,
				// IMPORTANT: Add displayLocation metadata for Tab-to-jump
				displayLocation: displayLocation ? {
					// displayLocation.range is already a Position-based Range (from INextEditDisplayLocation)
					// Convert from 1-indexed (Copilot) to 0-indexed (VS Code)
					range: new vscode.Range(
						new vscode.Position(displayLocation.range.startLineNumber - 1, displayLocation.range.startColumn - 1),
						new vscode.Position(displayLocation.range.endLineNumber - 1, displayLocation.range.endColumn - 1)
					),
					label: displayLocation.label
				} : undefined
			},
			requestId: copilotResult.requestId
		};

		return result;
	}

	handleShown(result: PukuDiagnosticsResult): void {
		// Forward to Copilot provider if needed
		console.log('[DiagnosticsAdapter] handleShown:', result.fix.label);
	}

	handleAcceptance(docId: DocumentId, result: PukuDiagnosticsResult): void {
		console.log('[DiagnosticsAdapter] handleAcceptance:', result.fix.label);
		// Convert back to Copilot format and forward
		const copilotDocId = CopilotDocumentId.create(docId.document.uri);
		const copilotResult = new DiagnosticsNextEditResult(result.requestId, undefined);
		this._copilotProvider.handleAcceptance(copilotDocId, copilotResult);
	}

	handleRejection(docId: DocumentId, result: PukuDiagnosticsResult): void {
		console.log('[DiagnosticsAdapter] handleRejection:', result.fix.label);
		// Convert back to Copilot format and forward
		const copilotDocId = CopilotDocumentId.create(docId.document.uri);
		const copilotResult = new DiagnosticsNextEditResult(result.requestId, undefined);
		this._copilotProvider.handleRejection(copilotDocId, copilotResult);
	}

	handleIgnored(docId: DocumentId, result: PukuDiagnosticsResult, supersededBy?: PukuDiagnosticsResult): void {
		console.log('[DiagnosticsAdapter] handleIgnored:', result.fix.label);
		// Convert back to Copilot format and forward
		const copilotDocId = CopilotDocumentId.create(docId.document.uri);
		const copilotResult = new DiagnosticsNextEditResult(result.requestId, undefined);
		const supersededByResult = supersededBy ? new DiagnosticsNextEditResult(supersededBy.requestId, undefined) : undefined;
		this._copilotProvider.handleIgnored(copilotDocId, copilotResult, supersededByResult);
	}
}
