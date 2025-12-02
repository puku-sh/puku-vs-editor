/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Position validation helper for inline completions
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Position Validation Helper
 *
 * Tracks completion positions per file to prevent showing stale completions
 * when cursor moves away from the original completion position.
 *
 * **Problem:**
 * Completions generated at one position can still be displayed after the cursor
 * moves to a completely different location, causing confusing ghost text.
 *
 * **Solution:**
 * Store the position where each completion was generated. Before showing a completion,
 * verify the cursor hasn't moved away. If it has, clear the stale completion state.
 *
 * @example
 * ```typescript
 * const validator = new PositionValidator();
 *
 * // Before showing completion
 * validator.validate(fileUri, currentPosition, reqId);
 *
 * // After successful completion
 * validator.update(fileUri, position);
 *
 * // On file switch
 * validator.clear(oldFileUri);
 * ```
 */
export class PositionValidator {
	private _completionPositionByFile = new Map<string, vscode.Position>();

	/**
	 * Check if cursor has moved away from stored completion position.
	 * Clears stale position state if cursor moved.
	 *
	 * @param fileUri - File URI to check
	 * @param currentPosition - Current cursor position
	 * @param reqId - Request ID for logging
	 */
	validate(fileUri: string, currentPosition: vscode.Position, reqId: number): void {
		const lastPosition = this._completionPositionByFile.get(fileUri);

		// No previous position stored - nothing to validate
		if (!lastPosition) {
			return;
		}

		// Check if cursor moved away from completion position
		if (!lastPosition.isEqual(currentPosition)) {
			console.log(
				`[PukuInlineCompletion][${reqId}] POSITION VALIDATION: Cursor moved from ` +
				`${lastPosition.line}:${lastPosition.character} to ` +
				`${currentPosition.line}:${currentPosition.character} - clearing stale state`
			);
			this._completionPositionByFile.delete(fileUri);
		}
	}

	/**
	 * Store position after successful completion.
	 *
	 * @param fileUri - File URI where completion was generated
	 * @param position - Position where completion was generated
	 */
	update(fileUri: string, position: vscode.Position): void {
		this._completionPositionByFile.set(fileUri, position);
	}

	/**
	 * Clear position validation state for a file.
	 * Should be called when switching files or when position is no longer relevant.
	 *
	 * @param fileUri - File URI to clear state for
	 */
	clear(fileUri: string): void {
		this._completionPositionByFile.delete(fileUri);
	}

	/**
	 * Get stored position for a file (for testing/debugging).
	 *
	 * @param fileUri - File URI to get position for
	 * @returns Stored position or undefined
	 */
	getStoredPosition(fileUri: string): vscode.Position | undefined {
		return this._completionPositionByFile.get(fileUri);
	}
}
