/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Simplified InlineEditRequestLogContext for diagnostics provider compatibility
 *  Based on Copilot's InlineEditRequestLogContext (inlineEditLogContext.ts:23-447)
 *
 *  NOTE: This is a simplified version. Full implementation requires copying many utility
 *  types from Copilot reference implementation.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Log context for inline edit requests
 * Compatible with DiagnosticsNextEditProvider.runUntilNextEdit() which expects logContext.addLog()
 *
 * This is a simplified version of Copilot's full InlineEditRequestLogContext class.
 * The full version is at: src/vscode/reference/vscode-copilot-chat/src/platform/inlineEdits/common/inlineEditLogContext.ts
 */
export class InlineEditRequestLogContext {
	private static _id = 0;

	public readonly requestId = InlineEditRequestLogContext._id++;
	public readonly time = Date.now();

	constructor(
		public readonly filePath: string,
		public readonly version: number,
		private _context: vscode.InlineCompletionContext | undefined
	) {}

	/**
	 * Recording bookmark for debug purposes
	 * Based on Copilot's implementation at inlineEditLogContext.ts:44
	 */
	public recordingBookmark: any | undefined = undefined;

	/**
	 * Add a log entry (called by diagnostics provider)
	 * Based on Copilot's implementation at inlineEditLogContext.ts:378-380
	 */
	private _logs: string[] = [];
	addLog(content: string): void {
		this._logs.push(content.replace('\n', '\\n').replace('\t', '\\t').replace('`', '\\`') + '\n');
	}

	/**
	 * Get all logged content
	 */
	getLogs(): string[] {
		return this._logs;
	}

	/**
	 * Add a list of items to the log
	 * Based on Copilot's implementation at inlineEditLogContext.ts:388-390
	 */
	addListToLog(list: string[]): void {
		list.forEach(l => this.addLog(`- ${l}`));
	}

	/**
	 * Add a code block to the log
	 * Based on Copilot's implementation at inlineEditLogContext.ts:392-394
	 */
	addCodeblockToLog(code: string, language: string = ''): void {
		this._logs.push(`\`\`\`${language}\n${code}\n\`\`\`\n`);
	}
}
