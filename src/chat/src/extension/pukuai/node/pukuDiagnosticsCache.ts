/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Diagnostics caching to avoid redundant API calls
 *  Based on Copilot's DiagnosticsCollection pattern
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { PukuDiagnosticsResult } from '../vscode-node/pukuInlineEditModel';

/**
 * Cache for diagnostics state and computed fixes
 *
 * Implements Copilot's DiagnosticsCollection pattern to:
 * - Cache diagnostics state (avoid redundant VS Code API calls)
 * - Track diagnostic positions across edits
 * - Cache computed fixes (avoid redundant LLM API calls)
 *
 * Based on: diagnosticsCompletionProcessor.ts:57-140
 */
export class PukuDiagnosticsCache {
	private _diagnostics: vscode.Diagnostic[] = [];
	private _cachedFix: PukuDiagnosticsResult | null = null;

	/**
	 * Check if diagnostics changed compared to cached state
	 * Updates cache if different
	 *
	 * Follows Copilot's approach: content-based comparison only (no file tracking)
	 * Based on: diagnosticsCompletionProcessor.ts:129-135
	 *
	 * @param newDiagnostics Current diagnostics from VS Code
	 * @param documentUri Document URI (unused, kept for API compatibility)
	 * @returns true if diagnostics changed (recompute needed), false if same (use cache)
	 */
	isEqualAndUpdate(newDiagnostics: vscode.Diagnostic[], documentUri: vscode.Uri): boolean {
		// Compare diagnostics by content (Copilot approach)
		const isEqual = this._isEqual(this._diagnostics, newDiagnostics);
		console.log('[DiagnosticsCache] Comparing diagnostics: isEqual =', isEqual, '(cached:', this._diagnostics.length, ', new:', newDiagnostics.length, ')');

		if (!isEqual) {
			// Diagnostics changed, update cache and invalidate fix
			this._diagnostics = newDiagnostics;
			this._cachedFix = null;
			console.log('[DiagnosticsCache] Diagnostics changed, cache invalidated');
			return true; // Changed
		}

		// Same diagnostics, use cached fix
		console.log('[DiagnosticsCache] Diagnostics unchanged, returning cached fix');
		return false; // Unchanged
	}

	/**
	 * Update diagnostic positions after document edits
	 * Keeps cached diagnostics valid when user types
	 *
	 * Based on: diagnosticsCompletionProcessor.ts:61-127 (applyEdit)
	 */
	applyEdit(change: vscode.TextDocumentContentChangeEvent): void {
		if (this._diagnostics.length === 0) {
			return;
		}

		// Update diagnostic ranges based on edit
		this._diagnostics = this._diagnostics.map(d => {
			const adjustedRange = this._adjustRange(d.range, change.range, change.text);
			return {
				...d,
				range: adjustedRange
			};
		});
	}

	/**
	 * Get cached fix (fast path)
	 */
	getCachedFix(): PukuDiagnosticsResult | null {
		return this._cachedFix;
	}

	/**
	 * Set cached fix after computation
	 */
	setCachedFix(fix: PukuDiagnosticsResult | null): void {
		this._cachedFix = fix;
	}

	/**
	 * Clear all cached state
	 */
	clear(): void {
		this._diagnostics = [];
		this._cachedFix = null;
	}

	/**
	 * Compare two diagnostic arrays for equality
	 * Diagnostics must match by message, range, and severity (order-independent)
	 */
	private _isEqual(a: vscode.Diagnostic[], b: vscode.Diagnostic[]): boolean {
		if (a.length !== b.length) {
			return false;
		}

		// Sort both arrays by position for consistent comparison
		const sortedA = [...a].sort((x, y) => x.range.start.compareTo(y.range.start));
		const sortedB = [...b].sort((x, y) => x.range.start.compareTo(y.range.start));

		// Compare each diagnostic
		return sortedA.every((diagA, i) => {
			const diagB = sortedB[i];
			const messageMatch = diagA.message === diagB.message;
			const rangeMatch = diagA.range.isEqual(diagB.range);
			const severityMatch = diagA.severity === diagB.severity;

			if (!messageMatch || !rangeMatch || !severityMatch) {
				console.log('[DiagnosticsCache] Diagnostic mismatch at index', i, ':', {
					messageMatch,
					rangeMatch,
					severityMatch,
					diagA: { message: diagA.message, range: diagA.range.toString(), severity: diagA.severity },
					diagB: { message: diagB.message, range: diagB.range.toString(), severity: diagB.severity }
				});
			}

			return messageMatch && rangeMatch && severityMatch;
		});
	}

	/**
	 * Adjust diagnostic range after document edit
	 * Shifts range positions to account for inserted/deleted text
	 */
	private _adjustRange(
		diagnosticRange: vscode.Range,
		editRange: vscode.Range,
		newText: string
	): vscode.Range {
		// If edit is after diagnostic, no adjustment needed
		if (editRange.start.isAfterOrEqual(diagnosticRange.end)) {
			return diagnosticRange;
		}

		// If edit is before diagnostic, shift diagnostic
		if (editRange.end.isBeforeOrEqual(diagnosticRange.start)) {
			const lineDelta = this._getLineDelta(editRange, newText);
			const charDelta = this._getCharDelta(editRange, newText);

			// Shift start position
			let newStart: vscode.Position;
			if (lineDelta !== 0) {
				newStart = new vscode.Position(
					diagnosticRange.start.line + lineDelta,
					diagnosticRange.start.character
				);
			} else {
				newStart = new vscode.Position(
					diagnosticRange.start.line,
					diagnosticRange.start.character + charDelta
				);
			}

			// Shift end position
			let newEnd: vscode.Position;
			if (lineDelta !== 0) {
				newEnd = new vscode.Position(
					diagnosticRange.end.line + lineDelta,
					diagnosticRange.end.character
				);
			} else {
				newEnd = new vscode.Position(
					diagnosticRange.end.line,
					diagnosticRange.end.character + charDelta
				);
			}

			return new vscode.Range(newStart, newEnd);
		}

		// Edit overlaps diagnostic - invalidate by returning original
		// (will be caught by isEqualAndUpdate on next check)
		return diagnosticRange;
	}

	/**
	 * Calculate line delta from edit
	 */
	private _getLineDelta(editRange: vscode.Range, newText: string): number {
		const oldLines = editRange.end.line - editRange.start.line;
		const newLines = (newText.match(/\n/g) || []).length;
		return newLines - oldLines;
	}

	/**
	 * Calculate character delta from edit (same line only)
	 */
	private _getCharDelta(editRange: vscode.Range, newText: string): number {
		// Only for single-line edits
		if (editRange.start.line !== editRange.end.line) {
			return 0;
		}

		const oldLength = editRange.end.character - editRange.start.character;
		const newLength = newText.length;
		return newLength - oldLength;
	}
}
