/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { PukuASTChunker, type SemanticChunk } from '../../../../pukuIndexing/node/pukuASTChunker';

const DEFAULT_TOKEN_BUDGET = 10000; // ~2500 tokens

/**
 * CurrentFileContextFlow - Extracts relevant code chunks from the current file
 * for style matching (like GitHub Copilot's same-file context feature)
 */
export class CurrentFileContextFlow {
	private _chunker: PukuASTChunker;

	constructor() {
		this._chunker = new PukuASTChunker();
	}

	/**
	 * Get relevant code chunks from current file based on cursor position
	 * @param document Current document
	 * @param position Cursor position
	 * @param tokenBudget Character budget (default 10000 chars ~2500 tokens)
	 * @returns Formatted context string with relevant code chunks
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

		const elapsedMs = Date.now() - startTime;
		console.log(`[CurrentFileContext] Extracted ${selectedChunks.length}/${chunks.length} chunks (${contextString.length} chars) in ${elapsedMs}ms`);

		return contextString;
	}

	/**
	 * Rank chunks by priority based on cursor position
	 * Priority scoring:
	 * 1. Cursor inside chunk? +1000 (highest priority)
	 * 2. Distance from cursor: +500 - distance
	 * 3. Chunk type bonus: function/method/class +100
	 * 4. Above cursor bonus: +50
	 */
	private _rankChunks(chunks: SemanticChunk[], cursorLine: number): Array<{ chunk: SemanticChunk; priority: number }> {
		return chunks.map(chunk => ({
			chunk,
			priority: this._calculatePriority(chunk, cursorLine)
		})).sort((a, b) => b.priority - a.priority);
	}

	private _calculatePriority(chunk: SemanticChunk, cursorLine: number): number {
		let score = 0;

		// 1. Cursor inside chunk? Highest priority
		if (cursorLine >= chunk.lineStart && cursorLine <= chunk.lineEnd) {
			score += 1000;
		}

		// 2. Distance from cursor (closer = higher priority)
		const chunkCenter = (chunk.lineStart + chunk.lineEnd) / 2;
		const distance = Math.abs(chunkCenter - cursorLine);
		score += Math.max(0, 500 - distance);

		// 3. Chunk type bonus
		if (chunk.chunkType === 'function' || chunk.chunkType === 'method') {
			score += 100;
		} else if (chunk.chunkType === 'class') {
			score += 80;
		}

		// 4. Above cursor bonus (prefer seeing prior context)
		if (chunk.lineEnd < cursorLine) {
			score += 50;
		}

		return score;
	}

	/**
	 * Select chunks within token budget
	 */
	private _selectChunksWithinBudget(rankedChunks: Array<{ chunk: SemanticChunk; priority: number }>, tokenBudget: number): SemanticChunk[] {
		const selected: SemanticChunk[] = [];
		let currentSize = 0;

		for (const { chunk } of rankedChunks) {
			const chunkSize = chunk.text.length;
			if (currentSize + chunkSize <= tokenBudget) {
				selected.push(chunk);
				currentSize += chunkSize;
			} else {
				break; // Budget exceeded
			}
		}

		// Sort selected chunks by line number (maintain original order)
		return selected.sort((a, b) => a.lineStart - b.lineStart);
	}

	/**
	 * Format chunks into context string
	 */
	private _formatContext(chunks: SemanticChunk[]): string {
		if (chunks.length === 0) {
			return '';
		}

		return chunks.map(chunk => {
			// Include line numbers for reference
			const header = `// Lines ${chunk.lineStart + 1}-${chunk.lineEnd + 1} (${chunk.chunkType})`;
			return `${header}\n${chunk.text}`;
		}).join('\n\n');
	}
}
