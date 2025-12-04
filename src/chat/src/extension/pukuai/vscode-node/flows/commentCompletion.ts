/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Comment-based completion flow (Copilot-style)
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { IPukuIndexingService } from '../../../pukuIndexing/node/pukuIndexingService';

/**
 * Detects and handles comment-based code generation
 * Example: "// add number inverse function" → generates the function
 */
export class CommentCompletionFlow {
	constructor(
		private readonly _indexingService: IPukuIndexingService
	) { }

	/**
	 * Check if current position is after a comment (Cursor-style: trigger at end of comment line or next line)
	 */
	isCommentBasedCompletion(document: vscode.TextDocument, position: vscode.Position): boolean {
		const currentLine = document.lineAt(position.line);
		const lineText = currentLine.text;

		// Check if current line or previous line is a comment
		const commentPattern = this._getCommentPattern(document.languageId);
		if (!commentPattern) {
			return false;
		}

		const trimmedLine = lineText.trim();
		const textBeforeCursor = lineText.substring(0, position.character).trim();

		// Trigger Case 1: At end of comment line (Cursor-style)
		// Example: "// add function|" where | is cursor
		const atEndOfComment = commentPattern.test(textBeforeCursor) &&
			position.character >= lineText.trimEnd().length;

		// Trigger Case 2: On empty line after comment (existing behavior)
		// Example: "// add function\n|" where | is cursor on next line
		const afterCommentLine = trimmedLine.length === 0 &&
			position.line > 0 &&
			commentPattern.test(document.lineAt(position.line - 1).text.trim());

		return atEndOfComment || afterCommentLine;
	}

	/**
	 * Extract comment text for semantic search
	 * Returns the natural language description from the comment
	 */
	extractCommentIntent(document: vscode.TextDocument, position: vscode.Position): string | null {
		const currentLine = document.lineAt(position.line);
		let commentText = currentLine.text.trim();

		// If current line is empty, check previous line
		if (!commentText && position.line > 0) {
			commentText = document.lineAt(position.line - 1).text.trim();
		}

		if (!commentText) {
			return null;
		}

		// Strip comment markers
		const cleaned = this._stripCommentMarkers(commentText, document.languageId);
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

	/**
	 * Get comment pattern for a language
	 */
	private _getCommentPattern(languageId: string): RegExp | null {
		// Language-specific comment patterns
		const patterns: Record<string, RegExp> = {
			'typescript': /^\/\/.+|^\/\*.+\*\/$/,
			'javascript': /^\/\/.+|^\/\*.+\*\/$/,
			'python': /^#.+/,
			'go': /^\/\/.+|^\/\*.+\*\/$/,
			'rust': /^\/\/.+|^\/\*.+\*\/$/,
			'java': /^\/\/.+|^\/\*.+\*\/$/,
			'c': /^\/\/.+|^\/\*.+\*\/$/,
			'cpp': /^\/\/.+|^\/\*.+\*\/$/,
			'csharp': /^\/\/.+|^\/\*.+\*\/$/,
			'php': /^\/\/.+|^\/\*.+\*\/|^#.+/,
			'ruby': /^#.+/,
			'shell': /^#.+/,
			'bash': /^#.+/,
			'yaml': /^#.+/,
			'dockerfile': /^#.+/,
		};

		return patterns[languageId] || /^\/\/.+|^\/\*.+\*\/|^#.+/;
	}

	/**
	 * Strip comment markers from text
	 */
	private _stripCommentMarkers(text: string, languageId: string): string {
		let cleaned = text;

		// Remove common comment markers
		cleaned = cleaned.replace(/^\/\/\s*/, ''); // //
		cleaned = cleaned.replace(/^\/\*\s*/, '').replace(/\s*\*\/$/, ''); // /* */
		cleaned = cleaned.replace(/^#\s*/, ''); // #
		cleaned = cleaned.replace(/^\*\s*/, ''); // * (multi-line comment continuation)

		return cleaned.trim();
	}
}
