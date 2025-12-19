/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { OverlayNode } from '../../../platform/parser/node/nodes';
import { structureComputer } from '../../../platform/parser/node/structure';
import { getWasmLanguage, WASMLanguage } from '../../../platform/parser/node/treeSitterLanguages';

/**
 * Chunk type for semantic classification
 */
export type ChunkType = 'function' | 'method' | 'class' | 'interface' | 'type' | 'module' | 'block' | 'unknown';

/**
 * Semantic chunk extracted from AST
 */
export interface SemanticChunk {
	readonly text: string;
	readonly lineStart: number;
	readonly lineEnd: number;
	readonly chunkType: ChunkType;
	readonly symbolName?: string;
}

/**
 * Node kinds that represent semantic units we want to chunk
 * Maps AST node types (from Tree-sitter) to chunk types
 */
const SEMANTIC_NODE_KINDS: Record<string, ChunkType> = {
	// Functions (JS/TS/Go)
	'function_declaration': 'function',
	'function_definition': 'function',
	'arrow_function': 'function',
	'function_expression': 'function',
	'method_definition': 'method',
	'method_declaration': 'method',
	'constructor': 'method',
	'constructor_declaration': 'method',

	// Classes (JS/TS/Java)
	'class_declaration': 'class',
	'class_definition': 'class',
	'class_body': 'class',
	'class_specifier': 'class', // C++

	// Interfaces/Types
	'interface_declaration': 'interface',
	'type_alias_declaration': 'type',
	'type_definition': 'type',
	'type_declaration': 'type', // Go
	'struct_specifier': 'type', // C++

	// Modules
	'module_declaration': 'module',
	'namespace_declaration': 'module',

	// Python specific
	'function_def': 'function',
	'class_def': 'class',
	'decorated_definition': 'function',

	// Rust specific
	'function_item': 'function',
	'impl_item': 'class',
	'struct_item': 'type',
	'enum_item': 'type',
	'trait_item': 'interface',
};

/**
 * Maximum chunk size in characters (to avoid huge chunks)
 */
const MAX_CHUNK_SIZE = 8000;

/**
 * Minimum chunk size in characters (to avoid tiny chunks)
 */
const MIN_CHUNK_SIZE = 100;

/**
 * Puku AST Chunker - extracts semantic chunks from source code using Tree-sitter
 *
 * Unlike line-based chunking, this ensures each chunk is a complete semantic unit
 * (function, class, method, etc.) which produces better embeddings.
 */
export class PukuASTChunker {
	/**
	 * Chunk source code using AST-based semantic analysis
	 *
	 * @param content Source code content
	 * @param languageId VS Code language ID
	 * @returns Array of semantic chunks, or fallback line-based chunks if AST not available
	 */
	async chunkContent(content: string, languageId: string): Promise<SemanticChunk[]> {
		// Try AST-based chunking for supported languages
		const wasmLanguage = getWasmLanguage(languageId);
		if (wasmLanguage) {
			try {
				const astChunks = await this._chunkWithAST(content, wasmLanguage);
				if (astChunks.length > 0) {
// 					console.log(`[PukuASTChunker] AST chunking produced ${astChunks.length} chunks for ${languageId}`);
					return astChunks;
				}
			} catch (error) {
				console.warn(`[PukuASTChunker] AST chunking failed for ${languageId}, falling back to line-based:`, error);
			}
		}

		// Fallback to line-based chunking for unsupported languages
// 		console.log(`[PukuASTChunker] Using line-based chunking for ${languageId}`);
		return this._chunkByLines(content);
	}

	/**
	 * Check if a language is supported for AST chunking
	 */
	isASTSupported(languageId: string): boolean {
		return getWasmLanguage(languageId) !== undefined;
	}

	/**
	 * AST-based chunking using Tree-sitter
	 */
	private async _chunkWithAST(content: string, language: WASMLanguage): Promise<SemanticChunk[]> {
		const structure = await structureComputer.getStructure(language, content);
		if (!structure) {
			return [];
		}

		const chunks: SemanticChunk[] = [];
		const lines = content.split('\n');

		// Traverse the structure tree and extract semantic chunks
		this._extractChunksFromNode(structure, content, lines, chunks);

		// If AST produced no meaningful chunks, return empty to trigger fallback
		if (chunks.length === 0) {
			return [];
		}

		// Sort by line number
		chunks.sort((a, b) => a.lineStart - b.lineStart);

		// Fill gaps between chunks (code that's not in any function/class)
		const filledChunks = this._fillGaps(chunks, content, lines);

		return filledChunks;
	}

	/**
	 * Recursively extract chunks from AST nodes
	 */
	private _extractChunksFromNode(
		node: OverlayNode,
		content: string,
		lines: string[],
		chunks: SemanticChunk[],
		parentType?: ChunkType
	): void {
		const chunkType = SEMANTIC_NODE_KINDS[node.kind];

		if (chunkType) {
			const text = content.substring(node.startIndex, node.endIndex);
			const lineStart = this._offsetToLine(content, node.startIndex);
			const lineEnd = this._offsetToLine(content, node.endIndex);

			// Check size constraints
			if (text.length >= MIN_CHUNK_SIZE && text.length <= MAX_CHUNK_SIZE) {
				// Extract symbol name if possible
				const symbolName = this._extractSymbolName(text, chunkType);

				chunks.push({
					text,
					lineStart,
					lineEnd,
					chunkType,
					symbolName,
				});

				// Don't recurse into children of extracted chunks (they're included)
				return;
			} else if (text.length > MAX_CHUNK_SIZE) {
				// Chunk is too large, recurse into children
				for (const child of node.children) {
					this._extractChunksFromNode(child, content, lines, chunks, chunkType);
				}
				return;
			}
		}

		// Recurse into children for non-semantic nodes
		for (const child of node.children) {
			this._extractChunksFromNode(child, content, lines, chunks, parentType);
		}
	}

	/**
	 * Fill gaps between AST chunks with line-based chunks
	 */
	private _fillGaps(astChunks: SemanticChunk[], content: string, lines: string[]): SemanticChunk[] {
		if (astChunks.length === 0) {
			return this._chunkByLines(content);
		}

		const result: SemanticChunk[] = [];
		let currentLine = 1;

		for (const chunk of astChunks) {
			// Fill gap before this chunk
			if (chunk.lineStart > currentLine) {
				const gapLines = lines.slice(currentLine - 1, chunk.lineStart - 1);
				const gapText = gapLines.join('\n').trim();

				if (gapText.length >= MIN_CHUNK_SIZE) {
					result.push({
						text: gapText,
						lineStart: currentLine,
						lineEnd: chunk.lineStart - 1,
						chunkType: 'block',
					});
				}
			}

			result.push(chunk);
			currentLine = chunk.lineEnd + 1;
		}

		// Fill gap after last chunk
		if (currentLine <= lines.length) {
			const gapLines = lines.slice(currentLine - 1);
			const gapText = gapLines.join('\n').trim();

			if (gapText.length >= MIN_CHUNK_SIZE) {
				result.push({
					text: gapText,
					lineStart: currentLine,
					lineEnd: lines.length,
					chunkType: 'block',
				});
			}
		}

		return result;
	}

	/**
	 * Fallback line-based chunking for unsupported languages
	 */
	private _chunkByLines(content: string): SemanticChunk[] {
		const chunks: SemanticChunk[] = [];
		const lines = content.split('\n');
		const chunkSize = 50; // lines per chunk
		const overlap = 10; // overlapping lines

		for (let i = 0; i < lines.length; i += (chunkSize - overlap)) {
			const lineStart = i + 1; // 1-indexed
			const lineEnd = Math.min(i + chunkSize, lines.length);
			const chunkLines = lines.slice(i, lineEnd);
			const text = chunkLines.join('\n').trim();

			if (text.length >= MIN_CHUNK_SIZE) {
				chunks.push({
					text,
					lineStart,
					lineEnd,
					chunkType: 'block',
				});
			}
		}

		return chunks;
	}

	/**
	 * Convert byte offset to line number (1-indexed)
	 */
	private _offsetToLine(content: string, offset: number): number {
		const beforeOffset = content.substring(0, offset);
		return beforeOffset.split('\n').length;
	}

	/**
	 * Extract symbol name from chunk text
	 */
	private _extractSymbolName(text: string, chunkType: ChunkType): string | undefined {
		const patterns: Record<ChunkType, RegExp[]> = {
			function: [
				/function\s+(\w+)/,
				/const\s+(\w+)\s*=/,
				/let\s+(\w+)\s*=/,
				/def\s+(\w+)/,
				/func\s+(\w+)/,
				/fn\s+(\w+)/,
			],
			method: [
				/(\w+)\s*\(/,
				/def\s+(\w+)/,
			],
			class: [
				/class\s+(\w+)/,
				/struct\s+(\w+)/,
			],
			interface: [
				/interface\s+(\w+)/,
				/trait\s+(\w+)/,
			],
			type: [
				/type\s+(\w+)/,
				/struct\s+(\w+)/,
				/enum\s+(\w+)/,
			],
			module: [
				/module\s+(\w+)/,
				/namespace\s+(\w+)/,
			],
			block: [],
			unknown: [],
		};

		const typePatterns = patterns[chunkType] || [];
		for (const pattern of typePatterns) {
			const match = text.match(pattern);
			if (match && match[1]) {
				return match[1];
			}
		}

		return undefined;
	}
}

/**
 * Singleton instance
 */
export const pukuASTChunker = new PukuASTChunker();
