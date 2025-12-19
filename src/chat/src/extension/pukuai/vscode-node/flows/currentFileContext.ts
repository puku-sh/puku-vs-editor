/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Current file context flow (extract relevant code from same file for style matching)
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { PukuASTChunker, type SemanticChunk } from '../../../pukuIndexing/node/pukuASTChunker';

/**
 * Default token budget for current file context (characters as proxy for tokens)
 * Average: 1 token ≈ 4 characters, so 2500 tokens ≈ 10000 chars
 */
const DEFAULT_TOKEN_BUDGET = 10000;

/**
 * Maximum distance from cursor to consider chunks (in lines)
 */
const MAX_DISTANCE_FROM_CURSOR = 200;

/**
 * Extracts relevant code chunks from the current file for FIM context
 * Enables code style matching by providing model with examples from same file
 *
 * Architecture:
 * 1. Parse current file with Tree-sitter to extract semantic chunks (functions, classes, etc.)
 * 2. Calculate priority score for each chunk based on:
 *    - Cursor position (chunks containing cursor = highest priority)
 *    - Distance from cursor (closer = higher priority)
 *    - Chunk type (functions/methods = higher priority)
 *    - Position relative to cursor (above cursor = slight boost)
 * 3. Sort chunks by priority and select top chunks within token budget
 * 4. Format selected chunks into clean code context string
 */
export class CurrentFileContextFlow {
	private readonly _chunker: PukuASTChunker;

	constructor() {
		this._chunker = new PukuASTChunker();
	}

	/**
	 * Extract relevant code chunks from current file for style matching
	 *
	 * @param document Current document
	 * @param position Current cursor position
	 * @param tokenBudget Maximum characters to include (default: 10000 ≈ 2500 tokens)
	 * @returns Formatted code context string with relevant chunks
	 */
	async getCurrentFileContext(
		document: vscode.TextDocument,
		position: vscode.Position,
		tokenBudget: number = DEFAULT_TOKEN_BUDGET
	): Promise<string> {
		const startTime = Date.now();

		// Extract semantic chunks using AST
		const chunks = await this._chunker.chunkContent(document.getText(), document.languageId);

		if (chunks.length === 0) {
			console.log('[CurrentFileContext] No chunks extracted (unsupported language or empty file)');
			return '';
		}

		// Calculate priority for each chunk
		const cursorLine = position.line;
		const rankedChunks = this._rankChunks(chunks, cursorLine);

		// Select chunks within token budget
		const selectedChunks = this._selectChunksWithinBudget(rankedChunks, tokenBudget);

		// Format selected chunks into context string
		const contextString = this._formatContext(selectedChunks);

		const elapsed = Date.now() - startTime;
		console.log(`[CurrentFileContext] Extracted ${selectedChunks.length}/${chunks.length} chunks in ${elapsed}ms`);
		console.log(`[CurrentFileContext] Token budget: ${contextString.length}/${tokenBudget}`);
		console.log(`[CurrentFileContext] Selected chunks:`, selectedChunks.map((c, i) =>
			`${i + 1}. ${c.chunk.chunkType} ${c.chunk.symbolName || '(anonymous)'} (priority: ${c.priority}, tokens: ${c.chunk.text.length})`
		));

		return contextString;
	}

	/**
	 * Rank chunks by relevance to cursor position
	 * Priority score algorithm matches architecture doc
	 */
	private _rankChunks(chunks: SemanticChunk[], cursorLine: number): Array<{ chunk: SemanticChunk; priority: number }> {
		return chunks.map(chunk => ({
			chunk,
			priority: this._calculatePriority(chunk, cursorLine)
		})).sort((a, b) => b.priority - a.priority);
	}

	/**
	 * Calculate priority score for a chunk
	 * Higher score = more relevant to cursor
	 */
	private _calculatePriority(chunk: SemanticChunk, cursorLine: number): number {
		let score = 0;

		// 1. Cursor inside chunk? Highest priority
		if (cursorLine >= chunk.lineStart && cursorLine <= chunk.lineEnd) {
			score += 1000;
		}

		// 2. Distance from cursor (closer = higher priority)
		const chunkMidpoint = (chunk.lineStart + chunk.lineEnd) / 2;
		const distance = Math.abs(chunkMidpoint - cursorLine);

		// Only consider chunks within reasonable distance
		if (distance > MAX_DISTANCE_FROM_CURSOR) {
			return 0; // Too far, skip
		}

		score += Math.max(0, 500 - distance);

		// 3. Chunk type bonus (functions/methods more relevant than classes/interfaces)
		if (chunk.chunkType === 'function' || chunk.chunkType === 'method') {
			score += 100;
		} else if (chunk.chunkType === 'class') {
			score += 50;
		}

		// 4. Above cursor bonus (prior context more relevant for style learning)
		if (chunk.lineEnd < cursorLine) {
			score += 50;
		}

		return score;
	}

	/**
	 * Select chunks within token budget, prioritizing highest-ranked
	 */
	private _selectChunksWithinBudget(
		rankedChunks: Array<{ chunk: SemanticChunk; priority: number }>,
		budget: number
	): Array<{ chunk: SemanticChunk; priority: number }> {
		const selected: Array<{ chunk: SemanticChunk; priority: number }> = [];
		let usedTokens = 0;

		for (const item of rankedChunks) {
			const chunkSize = item.chunk.text.length;

			// Skip if chunk exceeds remaining budget
			if (usedTokens + chunkSize > budget) {
				continue;
			}

			selected.push(item);
			usedTokens += chunkSize;
		}

		return selected;
	}

	/**
	 * Format selected chunks into clean code context string
	 * Preserves original code formatting for style learning
	 */
	private _formatContext(selectedChunks: Array<{ chunk: SemanticChunk; priority: number }>): string {
		if (selectedChunks.length === 0) {
			return '';
		}

		// Sort by line number (not priority) for coherent reading
		const sortedByLine = [...selectedChunks].sort((a, b) => a.chunk.lineStart - b.chunk.lineStart);

		// Join chunks with blank line separator
		return sortedByLine.map(item => item.chunk.text).join('\n\n');
	}
}
