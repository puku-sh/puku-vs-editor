/*---------------------------------------------------------------------------------------------
 *  Puku NES Next Edit Provider - Adapter for XtabProvider
 *  Wraps XtabProvider (IStatelessNextEditProvider) to match IPukuNextEditProvider interface
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { ILogService } from '../../../../platform/log/common/logService';
import { Disposable } from '../../../../util/vs/base/common/lifecycle';
import { IPukuNextEditProvider, PukuNesResult, DocumentId as PukuDocumentId } from '../../common/nextEditProvider';
import { IStatelessNextEditProvider, StatelessNextEditDocument, StatelessNextEditRequest, PushEdit, NoNextEditReason } from '../../../../platform/inlineEdits/common/statelessNextEditProvider';
import { InlineEditRequestLogContext } from '../../../../platform/inlineEdits/common/inlineEditLogContext';
import { IHistoryContextProvider, HistoryContext, DocumentHistory } from '../../../../platform/inlineEdits/common/workspaceEditTracker/historyContextProvider';
import { NesXtabHistoryTracker } from '../../../../platform/inlineEdits/common/workspaceEditTracker/nesXtabHistoryTracker';
import { ObservableWorkspace } from '../../../../platform/inlineEdits/common/observableWorkspace';
import { DeferredPromise } from '../../../../util/vs/base/common/async';
import { Result } from '../../../../util/common/result';
import { StringText } from '../../../../util/vs/editor/common/core/text/abstractText';
import { LineEdit } from '../../../../util/vs/editor/common/core/edits/lineEdit';
import { RootedLineEdit } from '../../../../platform/inlineEdits/common/dataTypes/rootedLineEdit';
import { StringEdit, StringReplacement } from '../../../../util/vs/editor/common/core/edits/stringEdit';
import { OffsetRange } from '../../../../util/vs/editor/common/core/ranges/offsetRange';
import { DocumentId } from '../../../../platform/inlineEdits/common/dataTypes/documentId';
import { RootedEdit } from '../../../../platform/inlineEdits/common/dataTypes/edit';
import { generateUuid } from '../../../../util/vs/base/common/uuid';
import { CachedFunction } from '../../../../util/vs/base/common/cache';
import { BugIndicatingError } from '../../../../util/vs/base/common/errors';

/**
 * Cached or rebased edit result
 */
interface CachedOrRebasedEdit {
	edit: StringReplacement;
	stringEdit: StringEdit;
	documentId: DocumentId;
	isFromCache: boolean;
	showLabel?: boolean;
}

/**
 * Processed document with edit information
 */
interface ProcessedDoc {
	recentEdit: RootedEdit<StringEdit>;
	nextEditDoc: StatelessNextEditDocument;
	documentAfterEdits: StringText;
}

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
		private readonly historyContextProvider: IHistoryContextProvider,
		private readonly xtabHistoryTracker: NesXtabHistoryTracker,
		private readonly workspace: ObservableWorkspace,
		@ILogService private readonly _logService: ILogService
	) {
		super();
		this._logService.info('[PukuNesNextEdit] Provider initialized');
	}

	/**
	 * IPukuNextEditProvider implementation - main entry point
	 */
	async getNextEdit(
		pukuDocId: PukuDocumentId,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<PukuNesResult | null> {
		const reqId = ++this._requestId;
		const document = pukuDocId.document;
		const position = pukuDocId.position;

		this._logService.trace(`[PukuNesNextEdit][${reqId}] getNextEdit called at ${document.fileName}:${position.line}:${position.character}`);

		try {
			// Convert Puku DocumentId to NES DocumentId
			const docId = new DocumentId(document.uri);
			const doc = this.workspace.getDocument(docId);
			if (!doc) {
				this._logService.warn(`[PukuNesNextEdit][${reqId}] Document not found in workspace`);
				return null;
			}

			// Get history context
			const historyContext = this.historyContextProvider.getHistoryContext(docId);
			if (!historyContext) {
				this._logService.warn(`[PukuNesNextEdit][${reqId}] No history context available`);
				return null;
			}

			// Process documents
			const activeDocAndIdx = historyContext.getDocumentAndIdx(docId);
			if (!activeDocAndIdx) {
				this._logService.warn(`[PukuNesNextEdit][${reqId}] Active document not found in history`);
				return null;
			}

			const projectedDocuments = historyContext.documents.map(doc => this._processDoc(doc));

			// Get xtab history
			const xtabEditHistory = this.xtabHistoryTracker.getHistory();

			// Create request context
			const logContext = new InlineEditRequestLogContext(generateUuid(), 'puku-nes-request');
			logContext.setRecentEdit(historyContext);

			// Create deferred promise for first edit
			const firstEdit = new DeferredPromise<Result<CachedOrRebasedEdit, NoNextEditReason>>();

			// Create StatelessNextEditRequest
			const documentBeforeEdits = doc.value.get();
			const nextEditRequest = new StatelessNextEditRequest(
				generateUuid(), // headerRequestId
				generateUuid(), // opportunityId
				documentBeforeEdits, // documentBeforeEdits
				projectedDocuments.map(d => d.nextEditDoc), // documents
				activeDocAndIdx.idx, // activeDocumentIdx
				xtabEditHistory, // xtabEditHistory
				firstEdit, // firstEdit promise
				undefined, // nLinesEditWindow (no expansion)
				logContext, // logContext
				undefined, // recordingBookmark
				undefined, // recording
				Date.now() // providerRequestStartDateTime
			);

			// Create PushEdit callback
			const pushEdit = this._createPushEdit(firstEdit, docId, projectedDocuments);

			// Call XtabProvider with PushEdit callback
			this._logService.trace(`[PukuNesNextEdit][${reqId}] Calling xtabProvider.provideNextEdit`);
			const providerPromise = this.xtabProvider.provideNextEdit(
				nextEditRequest,
				pushEdit,
				logContext,
				token
			);

			// Wait for first edit (with timeout)
			const firstEditResult = await Promise.race([
				firstEdit.p,
				new Promise<Result<CachedOrRebasedEdit, NoNextEditReason>>((resolve) =>
					setTimeout(() => resolve(Result.error(new NoNextEditReason.GotCancelled('afterDebounce'))), 5000)
				)
			]);

			if (firstEditResult.isError()) {
				this._logService.warn(`[PukuNesNextEdit][${reqId}] No edit returned: ${firstEditResult.err.toString()}`);
				return null;
			}

			// Convert to InlineCompletionItem
			const cachedEdit = firstEditResult.val;
			const inlineCompletion = this._convertToInlineCompletion(cachedEdit, document, position);

			if (!inlineCompletion) {
				this._logService.warn(`[PukuNesNextEdit][${reqId}] Failed to convert edit to inline completion`);
				return null;
			}

			this._logService.trace(`[PukuNesNextEdit][${reqId}] Returning NES suggestion`);
			return {
				type: 'nes',
				items: [inlineCompletion],
				requestId: reqId.toString()
			};

		} catch (error) {
			this._logService.error(`[PukuNesNextEdit][${reqId}] Error getting next edit:`, error);
			return null;
		}
	}

	/**
	 * Process a DocumentHistory into a ProcessedDoc with StatelessNextEditDocument
	 * Based on reference: nextEditProvider.ts:378-407
	 */
	private _processDoc(doc: DocumentHistory): ProcessedDoc {
		const documentLinesBeforeEdit = doc.lastEdit.base.getLines();
		const recentEdits = doc.lastEdits;
		const recentEdit = RootedLineEdit.fromEdit(new RootedEdit(doc.lastEdit.base, doc.lastEdits.compose())).removeCommonSuffixPrefixLines().edit;
		const documentBeforeEdits = doc.lastEdit.base;
		const lastSelectionInAfterEdits = doc.lastSelection;
		const workspaceRoot = this.workspace.getWorkspaceRoot(doc.docId);

		const nextEditDoc = new StatelessNextEditDocument(
			doc.docId,
			workspaceRoot,
			doc.languageId,
			documentLinesBeforeEdit,
			recentEdit,
			documentBeforeEdits,
			recentEdits,
			lastSelectionInAfterEdits,
		);

		return {
			recentEdit: doc.lastEdit,
			nextEditDoc,
			documentAfterEdits: nextEditDoc.documentAfterEdits,
		};
	}

	/**
	 * Create PushEdit callback handler to process streaming LineEdit results
	 * Based on reference: nextEditProvider.ts:582-690
	 */
	private _createPushEdit(
		firstEdit: DeferredPromise<Result<CachedOrRebasedEdit, NoNextEditReason>>,
		docId: DocumentId,
		projectedDocuments: ProcessedDoc[]
	): PushEdit {
		let ithEdit = -1;
		const statePerDoc = new CachedFunction((id: DocumentId) => {
			const doc = projectedDocuments.find(d => d.nextEditDoc.id === id);
			if (!doc) {
				throw new BugIndicatingError(`Document not found: ${id}`);
			}
			return {
				docContents: doc.documentAfterEdits,
				editsSoFar: StringEdit.empty,
				nextEdits: [] as StringReplacement[],
				docId: id,
			};
		});

		const pushEdit: PushEdit = (result) => {
			++ithEdit;
			this._logService.trace(`[PukuNesNextEdit] Processing edit #${ithEdit}`);

			// Handle errors
			if (result.isError()) {
				this._logService.trace(`[PukuNesNextEdit] Edit ${ithEdit} error: ${result.err.toString()}`);
				if (!firstEdit.isSettled) {
					firstEdit.complete(result);
				}
				return;
			}

			// Get successful edit
			const nextEditSuccess = result.val;
			const singleLineEdit = nextEditSuccess.edit;
			const showLabel = nextEditSuccess.showLabel;
			const targetDocId = nextEditSuccess.targetDocument ?? docId;

			if (!singleLineEdit) {
				this._logService.trace(`[PukuNesNextEdit] Edit ${ithEdit} has no edit`);
				if (!firstEdit.isSettled) {
					firstEdit.complete(Result.error(new NoNextEditReason.Unexpected(new Error('NoNextEdit'))));
				}
				return;
			}

			// Convert LineEdit to StringEdit
			const lineEdit = new LineEdit([singleLineEdit]);
			const targetDocState = statePerDoc.get(targetDocId);
			const rootedLineEdit = new RootedLineEdit(targetDocState.docContents, lineEdit);
			const stringEdit = rootedLineEdit.toEdit();

			// Rebase edit
			const rebasedEdit = stringEdit.tryRebase(targetDocState.editsSoFar);
			if (rebasedEdit === undefined) {
				this._logService.trace(`[PukuNesNextEdit] Edit ${ithEdit} failed to rebase`);
				if (!firstEdit.isSettled) {
					firstEdit.complete(Result.error(new NoNextEditReason.Uncategorized(new Error('Rebased edit is undefined'))));
				}
				return;
			}

			// Update state
			targetDocState.editsSoFar = targetDocState.editsSoFar.compose(rebasedEdit);

			if (rebasedEdit.replacements.length === 0) {
				this._logService.warn(`[PukuNesNextEdit] Edit ${ithEdit} has no replacements`);
			} else if (rebasedEdit.replacements.length > 1) {
				this._logService.warn(`[PukuNesNextEdit] Edit ${ithEdit} has ${rebasedEdit.replacements.length} replacements (expected 1)`);
			} else {
				const nextEdit = rebasedEdit.replacements[0];
				targetDocState.nextEdits.push(nextEdit);

				// Complete first edit promise
				if (!firstEdit.isSettled) {
					const cachedEdit: CachedOrRebasedEdit = {
						edit: nextEdit,
						stringEdit: rebasedEdit,
						documentId: targetDocId,
						isFromCache: false,
						showLabel,
					};
					this._logService.trace(`[PukuNesNextEdit] Resolving firstEdit promise with edit`);
					firstEdit.complete(Result.ok(cachedEdit));
				}
			}

			targetDocState.docContents = rebasedEdit.applyOnText(targetDocState.docContents);
		};

		return pushEdit;
	}

	/**
	 * Convert CachedOrRebasedEdit to VS Code InlineCompletionItem
	 * Based on reference: vscode-copilot-chat/src/extension/inlineEdits/vscode-node/inlineCompletionProvider.ts:238-254
	 */
	private _convertToInlineCompletion(
		cachedEdit: CachedOrRebasedEdit,
		document: vscode.TextDocument,
		position: vscode.Position
	): vscode.InlineCompletionItem | null {
		const edit = cachedEdit.edit;
		if (!edit) {
			return null;
		}

		// Convert OffsetRange to VS Code Position/Range
		const replaceRange = edit.replaceRange;
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

	/**
	 * Lifecycle handlers - IPukuNextEditProvider interface
	 */

	handleShown(result: PukuNesResult): void {
		this._logService.trace(`[PukuNesNextEdit] NES suggestion shown (requestId: ${result.requestId})`);
		// Delegate to xtabProvider if it has acceptance handler
		// (Typically used for telemetry)
	}

	handleAcceptance(docId: PukuDocumentId, result: PukuNesResult): void {
		this._logService.trace(`[PukuNesNextEdit] NES suggestion accepted (requestId: ${result.requestId})`);
		// Delegate to xtabProvider if it has acceptance handler
		this.xtabProvider.handleAcceptance?.();
	}

	handleRejection(docId: PukuDocumentId, result: PukuNesResult): void {
		this._logService.trace(`[PukuNesNextEdit] NES suggestion rejected (requestId: ${result.requestId})`);
		// Delegate to xtabProvider if it has rejection handler
		this.xtabProvider.handleRejection?.();
	}

	handleIgnored(docId: PukuDocumentId, result: PukuNesResult, supersededBy?: PukuNesResult): void {
		this._logService.trace(`[PukuNesNextEdit] NES suggestion ignored (requestId: ${result.requestId}), supersededBy: ${supersededBy?.type || 'none'}`);
		// Track when suggestions are superseded by newer ones (racing)
	}

	override dispose(): void {
		super.dispose();
		this._logService.info('[PukuNesNextEdit] Provider disposed');
	}
}
