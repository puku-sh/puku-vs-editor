/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Auto-trigger service for inline completions (NES, diagnostics, FIM)
 *
 *  Reference: vscode-copilot-chat/src/extension/inlineEdits/vscode-node/inlineEditModel.ts:66-313
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { ILogService } from '../../../platform/log/common/logService';

// Cooldown constants (matching Copilot reference - inlineEditModel.ts:29-31)
const TRIGGER_INLINE_EDIT_AFTER_CHANGE_LIMIT = 10000; // 10 seconds
const TRIGGER_INLINE_EDIT_ON_SAME_LINE_COOLDOWN = 5000; // 5 seconds
const TRIGGER_INLINE_EDIT_REJECTION_COOLDOWN = 5000; // 5 seconds

/**
 * Tracks last change state for a document
 * Reference: inlineEditModel.ts:66-85 (LastChange class)
 */
class LastChange extends Disposable {
	public lastEditedTimestamp: number;
	public lineNumberTriggers: Map<number /* lineNumber */, number /* timestamp */>;

	constructor(public documentTrigger: vscode.TextDocument) {
		super();
		this.lastEditedTimestamp = Date.now();
		this.lineNumberTriggers = new Map();
	}
}

/**
 * Auto-triggering system for inline completions
 *
 * Monitors document changes and cursor movements to automatically trigger
 * inline completion suggestions. Based on GitHub Copilot's InlineEditTriggerer.
 *
 * Reference: vscode-copilot-chat/src/extension/inlineEdits/vscode-node/inlineEditModel.ts:87-313
 */
export class PukuAutoTrigger extends Disposable {
	private readonly docToLastChangeMap = new Map<string, LastChange>();
	private lastDocWithSelectionUri: string | undefined;
	private lastEditTimestamp: number | undefined;

	// Track rejection time for cooldown (will be set by PukuUnifiedInlineProvider)
	public lastRejectionTime: number = 0;

	constructor(
		private readonly triggerCallback: () => void,
		@ILogService private readonly logService: ILogService
	) {
		super();
		console.log('[PukuAutoTrigger] Auto-trigger service initialized');
		this.logService.info('[PukuAutoTrigger] Auto-trigger service initialized');
		this.registerListeners();
	}

	private registerListeners() {
		this._registerDocumentChangeListener();
		this._registerSelectionChangeListener();
	}

	/**
	 * Check if document should be ignored
	 * Reference: inlineEditModel.ts:117-119
	 */
	private _shouldIgnoreDoc(doc: vscode.TextDocument): boolean {
		return doc.uri.scheme === 'output'; // ignore output pane documents
	}

	/**
	 * Monitor document changes to track edit timestamps
	 * Reference: inlineEditModel.ts:121-147
	 */
	private _registerDocumentChangeListener() {
		this._register(vscode.workspace.onDidChangeTextDocument(e => {
			if (this._shouldIgnoreDoc(e.document)) {
				return;
			}

			this.lastEditTimestamp = Date.now();

			// Ignore undo/redo events (reference: inlineEditModel.ts:131-134)
			if (e.reason === vscode.TextDocumentChangeReason.Undo ||
			    e.reason === vscode.TextDocumentChangeReason.Redo) {
				this.logService.trace('[PukuAutoTrigger] Ignoring undo/redo event');
				return;
			}

			const docUri = e.document.uri.toString();

			// Create new LastChange for this document
			const lastChange = new LastChange(e.document);
			this.docToLastChangeMap.set(docUri, lastChange);

			this.logService.trace(`[PukuAutoTrigger] Document changed: ${e.document.fileName}`);
		}));
	}

	/**
	 * Monitor cursor movements to trigger completions
	 * Reference: inlineEditModel.ts:149-263
	 */
	private _registerSelectionChangeListener() {
		this._register(vscode.window.onDidChangeTextEditorSelection((e) => {
			if (this._shouldIgnoreDoc(e.textEditor.document)) {
				return;
			}

			const isSameDoc = this.lastDocWithSelectionUri === e.textEditor.document.uri.toString();
			this.lastDocWithSelectionUri = e.textEditor.document.uri.toString();

			// Ignore multi-selection case (reference: inlineEditModel.ts:160-163)
			if (e.selections.length !== 1) {
				this.logService.trace('[PukuAutoTrigger] Ignoring multiple selections');
				return;
			}

			// Ignore non-empty selection (reference: inlineEditModel.ts:165-168)
			if (!e.selections[0].isEmpty) {
				this.logService.trace('[PukuAutoTrigger] Ignoring non-empty selection');
				return;
			}

			const now = Date.now();
			const timeSince = (timestamp: number) => now - timestamp;

			// Rejection cooldown: Don't auto-trigger within 5s of last rejection
			// Reference: inlineEditModel.ts:178-183
			if (timeSince(this.lastRejectionTime) < TRIGGER_INLINE_EDIT_REJECTION_COOLDOWN) {
				const docUri = e.textEditor.document.uri.toString();
				const lastChange = this.docToLastChangeMap.get(docUri);
				if (lastChange) {
					lastChange.dispose();
					this.docToLastChangeMap.delete(docUri);
				}
				this.logService.trace('[PukuAutoTrigger] Rejection cooldown active, skipping trigger');
				return;
			}

			const docUri = e.textEditor.document.uri.toString();
			const mostRecentChange = this.docToLastChangeMap.get(docUri);

			if (!mostRecentChange) {
				// No recent changes in this document (reference: inlineEditModel.ts:186-191)
				this.logService.trace('[PukuAutoTrigger] Document not tracked - no recent changes');
				return;
			}

			// Only trigger if document was edited within last 10 seconds
			// Reference: inlineEditModel.ts:193-200
			const hasRecentEdit = timeSince(mostRecentChange.lastEditedTimestamp) < TRIGGER_INLINE_EDIT_AFTER_CHANGE_LIMIT;
			if (!hasRecentEdit) {
				this.logService.trace('[PukuAutoTrigger] No recent edit, skipping trigger');
				return;
			}

			// Get selection line (reference: inlineEditModel.ts:212-218)
			const selectionLine = e.selections[0].active.line;

			// Same-line cooldown: Don't trigger on same line within 5 seconds
			// Reference: inlineEditModel.ts:226-231
			const lastTriggerTimestampForLine = mostRecentChange.lineNumberTriggers.get(selectionLine);
			if (lastTriggerTimestampForLine !== undefined &&
			    timeSince(lastTriggerTimestampForLine) < TRIGGER_INLINE_EDIT_ON_SAME_LINE_COOLDOWN) {
				this.logService.trace('[PukuAutoTrigger] Same line cooldown, skipping trigger');
				return;
			}

			// Cleanup old line triggers to prevent memory leak
			// Reference: inlineEditModel.ts:236-242
			if (mostRecentChange.lineNumberTriggers.size > 100) {
				for (const [lineNumber, timestamp] of mostRecentChange.lineNumberTriggers.entries()) {
					if (now - timestamp > TRIGGER_INLINE_EDIT_AFTER_CHANGE_LIMIT) {
						mostRecentChange.lineNumberTriggers.delete(lineNumber);
					}
				}
			}

			// Record this trigger (reference: inlineEditModel.ts:244-246)
			mostRecentChange.lineNumberTriggers.set(selectionLine, now);
			mostRecentChange.documentTrigger = e.textEditor.document;

			this.logService.info(`[PukuAutoTrigger] ⚡ Triggering inline completion at line ${selectionLine + 1}`);

			// Trigger inline edit (reference: inlineEditModel.ts:310-312)
			this._triggerInlineEdit();
		}));
	}

	/**
	 * Trigger inline completion via callback
	 * Reference: inlineEditModel.ts:310-312
	 */
	private _triggerInlineEdit() {
		this.triggerCallback();
	}

	override dispose(): void {
		super.dispose();

		// Dispose all LastChange instances
		for (const lastChange of this.docToLastChangeMap.values()) {
			lastChange.dispose();
		}
		this.docToLastChangeMap.clear();

		this.logService.info('[PukuAutoTrigger] Auto-trigger service disposed');
	}
}
