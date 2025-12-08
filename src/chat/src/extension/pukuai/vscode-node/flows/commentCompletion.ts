/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Comment-based completion flow (Copilot-style)
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { IPukuIndexingService } from '../../../pukuIndexing/node/pukuIndexingService';
import { getCommentAtPosition } from '../helpers/commentDetection';

/**
 * Detects and handles comment-based code generation
 * Example: "// add number inverse function" → generates the function
 */
export class CommentCompletionFlow {
	constructor(
		private readonly _indexingService: IPukuIndexingService
	) { }

	/**
	 * Check if current position is after a comment using Tree-sitter AST
	 * Cursor-style: trigger at end of comment line or next line
	 */
	async isCommentBasedCompletion(document: vscode.TextDocument, position: vscode.Position): Promise<boolean> {
		// Use Tree-sitter to detect comment
		const commentInfo = await getCommentAtPosition(document, position);

		if (!commentInfo) {
			return false;
		}

		// Case 1: Cursor at end of comment line
		const currentLine = document.lineAt(position.line);
		const atLineEnd = position.character >= currentLine.text.trimEnd().length;
		const commentOnCurrentLine = commentInfo.node.startPosition.row === position.line;

		// Case 2: On empty line after comment
		const currentLineEmpty = currentLine.text.trim().length === 0;
		const commentOnPreviousLine = position.line > 0 && commentInfo.node.startPosition.row === position.line - 1;

		const result = (commentOnCurrentLine && atLineEnd) || (commentOnPreviousLine && currentLineEmpty);

		console.log('[CommentCompletion] Tree-sitter Detection:', {
			languageId: document.languageId,
			commentType: commentInfo.type,
			commentText: JSON.stringify(commentInfo.text),
			cleanText: JSON.stringify(commentInfo.cleanText),
			commentLine: commentInfo.node.startPosition.row,
			cursorLine: position.line,
			cursorPos: position.character,
			lineEndPos: currentLine.text.trimEnd().length,
			atLineEnd,
			commentOnCurrentLine,
			commentOnPreviousLine,
			currentLineEmpty,
			result
		});

		return result;
	}

	/**
	 * Extract comment text for semantic search using Tree-sitter
	 * Returns the natural language description from the comment
	 */
	async extractCommentIntent(document: vscode.TextDocument, position: vscode.Position): Promise<string | null> {
		const commentInfo = await getCommentAtPosition(document, position);

		if (!commentInfo) {
			return null;
		}

		const cleaned = commentInfo.cleanText;
		return cleaned.length > 3 ? cleaned : null;
	}

	/**
	 * Get context for comment-based completion
	 * Uses semantic search on the comment text to find similar functionality
	 */
	async getCommentContext(
		commentIntent: string,
		document: vscode.TextDocument,
		maxResults: number = 3
	): Promise<Array<{ filepath: string; content: string }>> {
		if (!this._indexingService.isAvailable()) {
			return [];
		}

		try {
			// Search using natural language from comment
			const searchResults = await this._indexingService.search(
				commentIntent,
				maxResults,
				document.languageId
			);

			// Return full implementations (not signatures) for comment-based completions
			// The model needs to see example implementations to generate similar code
			return searchResults
				.filter(result => result.uri.fsPath !== document.uri.fsPath)
				.map(result => ({
					filepath: result.uri.fsPath,
					content: result.content
				}));
		} catch (error) {
			console.error(`[CommentCompletion] Semantic search failed: ${error}`);
			return [];
		}
	}
}
