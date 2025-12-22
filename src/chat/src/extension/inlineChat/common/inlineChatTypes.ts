/*---------------------------------------------------------------------------------------------
 *  Inline Chat Types - Type definitions for inline chat feature
 *  ISOLATED from FIM - no shared state with pukuFimProvider
 *--------------------------------------------------------------------------------------------*/

/**
 * Inline chat intent types
 * Based on Copilot's inline chat commands: /fix, /generate, /doc, /explain
 */
export type InlineChatIntent = 'fix' | 'generate' | 'doc' | 'explain';

/**
 * Semantic search result for prompt injection
 * These results are injected into prompts as context
 */
export interface SemanticSearchResult {
	/** File path relative to workspace */
	file: string;
	/** Code chunk content */
	chunk: string;
	/** Relevance score 0-1 (will be converted to 0-100% for display) */
	score: number;
	/** Start line in file (0-indexed) */
	lineStart: number;
	/** End line in file (0-indexed) */
	lineEnd: number;
}

/**
 * Inline chat configuration
 * Settings for controlling inline chat behavior
 */
export interface InlineChatConfig {
	/** Enable inline chat feature (Ctrl+I) */
	enabled: boolean;
	/** Enable semantic search integration */
	enableSemanticSearch: boolean;
	/** Maximum number of semantic search results to include in prompts */
	maxSearchResults: number;
	/** Minimum relevance score (0-1) for including results */
	minRelevanceScore: number;
}

/**
 * Default inline chat configuration
 */
export const DEFAULT_INLINE_CHAT_CONFIG: InlineChatConfig = {
	enabled: true,
	enableSemanticSearch: true,
	maxSearchResults: 3,
	minRelevanceScore: 0.7
};
