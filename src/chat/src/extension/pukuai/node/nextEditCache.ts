/*---------------------------------------------------------------------------------------------
 *  Puku NES NextEditCache - LRU cache for edit suggestions
 *  Based on: vscode-copilot-chat/src/extension/inlineEdits/node/nextEditCache.ts
 *
 *  This simplified version provides core caching functionality without ObservableWorkspace.
 *  Future enhancements will add edit tracking and rebasing.
 *--------------------------------------------------------------------------------------------*/

import { ILogService } from '../../../platform/log/common/logService';
import { DocumentId } from '../../../platform/inlineEdits/common/dataTypes/documentId';
import { LRUCache } from '../../../util/common/cache';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { StringReplacement, StringEdit } from '../../../util/vs/editor/common/core/edits/stringEdit';
import { OffsetRange } from '../../../util/vs/editor/common/core/ranges/offsetRange';
import { StringText } from '../../../util/vs/editor/common/core/text/abstractText';

/**
 * Cached edit entry
 */
export interface CachedEdit {
	docId: DocumentId;
	documentBeforeEdit: StringText;
	editWindow?: OffsetRange;
	edit: StringReplacement;
	edits?: StringReplacement[];
	userEditSince?: StringEdit;
	cacheTime: number;
}

/**
 * Cached or rebased edit result
 */
export type CachedOrRebasedEdit = CachedEdit & {
	rebasedEdit?: StringReplacement;
	rebasedEditIndex?: number;
	showLabel?: boolean;
	isFromCache: boolean;
};

/**
 * NextEditCache - LRU cache for NES edit suggestions
 *
 * Architecture:
 * - 50-entry shared LRU cache across all documents
 * - Per-document caches for tracking edits
 * - Cache key: [docId, documentContent]
 *
 * Performance:
 * - Cache hit: <15ms (no API call)
 * - Cache miss: 800-1000ms (API call + debounce)
 * - Expected hit rate: 40-60%
 */
export class NextEditCache extends Disposable {
	private readonly _documentCaches = new Map<string, DocumentEditCache>();
	private readonly _sharedCache = new LRUCache<CachedEdit>(50);

	constructor(
		private readonly _logService: ILogService,
	) {
		super();
	}

	/**
	 * Cache an edit for a document
	 */
	public cacheEdit(
		docId: DocumentId,
		documentContents: StringText,
		editWindow: OffsetRange | undefined,
		edit: StringReplacement,
		edits?: StringReplacement[],
		userEditSince?: StringEdit
	): CachedEdit {
		const docCache = this._getOrCreateDocCache(docId);
		return docCache.cacheEdit(documentContents, editWindow, edit, edits, userEditSince);
	}

	/**
	 * Cache a "no edit" result (prevents repeated failed lookups)
	 */
	public cacheNoEdit(
		docId: DocumentId,
		documentContents: StringText,
		editWindow: OffsetRange | undefined
	): void {
		const docCache = this._getOrCreateDocCache(docId);
		docCache.cacheNoEdit(documentContents, editWindow);
	}

	/**
	 * Look up cached edit for current document state
	 */
	public lookupNextEdit(
		docId: DocumentId,
		currentDocumentContents: StringText,
		currentSelection: readonly OffsetRange[]
	): CachedOrRebasedEdit | undefined {
		const docCache = this._documentCaches.get(docId.uri);
		if (!docCache) {
			return undefined;
		}
		return docCache.lookupNextEdit(currentDocumentContents, currentSelection);
	}


	/**
	 * Clear cache for a specific document
	 */
	public clearDocument(docId: DocumentId): void {
		this._documentCaches.delete(docId.uri);
		this._logService.trace(`[NextEditCache] Cleared cache for ${docId.uri}`);
	}

	/**
	 * Clear entire cache
	 */
	public clear(): void {
		this._documentCaches.clear();
		this._sharedCache.clear();
		this._logService.trace('[NextEditCache] Cleared entire cache');
	}

	private _getOrCreateDocCache(docId: DocumentId): DocumentEditCache {
		let docCache = this._documentCaches.get(docId.uri);
		if (!docCache) {
			docCache = new DocumentEditCache(docId, this._sharedCache, this._logService);
			this._documentCaches.set(docId.uri, docCache);
		}
		return docCache;
	}
}

/**
 * Per-document edit cache
 */
class DocumentEditCache {
	constructor(
		private readonly _docId: DocumentId,
		private readonly _sharedCache: LRUCache<CachedEdit>,
		private readonly _logService: ILogService,
	) {}

	/**
	 * Cache an edit
	 */
	public cacheEdit(
		documentContents: StringText,
		editWindow: OffsetRange | undefined,
		edit: StringReplacement,
		edits?: StringReplacement[],
		userEditSince?: StringEdit
	): CachedEdit {
		const key = this._getKey(documentContents.value);
		const cachedEdit: CachedEdit = {
			docId: this._docId,
			documentBeforeEdit: documentContents,
			editWindow,
			edit,
			edits,
			userEditSince,
			cacheTime: Date.now(),
		};

		const evicted = this._sharedCache.put(key, cachedEdit);
		if (evicted) {
			this._logService.trace(`[NextEditCache] Evicted cached edit for ${evicted[0]}`);
		}

		this._logService.trace(`[NextEditCache] Cached edit for ${this._docId.uri}`);
		return cachedEdit;
	}

	/**
	 * Cache "no edit" result
	 */
	public cacheNoEdit(
		documentContents: StringText,
		editWindow: OffsetRange | undefined
	): void {
		const key = this._getKey(documentContents.value);
		const cachedEdit: CachedEdit = {
			docId: this._docId,
			documentBeforeEdit: documentContents,
			editWindow,
			edit: StringReplacement.replace(OffsetRange.ofLength(0, 0), ''), // empty edit
			cacheTime: Date.now(),
		};

		this._sharedCache.put(key, cachedEdit);
		this._logService.trace(`[NextEditCache] Cached "no edit" for ${this._docId.uri}`);
	}

	/**
	 * Look up cached edit
	 */
	public lookupNextEdit(
		currentDocumentContents: StringText,
		currentSelection: readonly OffsetRange[]
	): CachedOrRebasedEdit | undefined {
		const key = this._getKey(currentDocumentContents.value);
		const cachedEdit = this._sharedCache.get(key);

		if (!cachedEdit) {
			return undefined;
		}

		// Check if edit window still valid
		const editWindow = cachedEdit.editWindow;
		const cursorRange = currentSelection[0];
		if (editWindow && cursorRange && !editWindow.containsRange(cursorRange)) {
			this._logService.trace(`[NextEditCache] Cache miss - cursor outside edit window`);
			return undefined;
		}

		// Check if edit is empty (cached "no edit")
		if (cachedEdit.edit.isEmpty) {
			this._logService.trace(`[NextEditCache] Cache hit - no edit`);
			return undefined;
		}

		this._logService.trace(`[NextEditCache] Cache HIT for ${this._docId.uri}`);
		return {
			...cachedEdit,
			isFromCache: true,
		};
	}

	/**
	 * Generate cache key from document content
	 */
	private _getKey(content: string): string {
		return JSON.stringify([this._docId.uri, content]);
	}
}
