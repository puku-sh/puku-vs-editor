/*---------------------------------------------------------------------------------------------
 *  Puku Semantic Context Component - Inject semantic search results into prompts
 *  Shared component for both inline chat and panel chat
 *--------------------------------------------------------------------------------------------*/

import { PromptElement, PromptSizing, TextChunk } from '@vscode/prompt-tsx';

export interface PukuSemanticContextProps {
	/** Semantic search results to inject */
	results: Array<{
		file: string;
		chunk: string;
		score: number;  // 0-1 range
	}>;
	/** Language ID for syntax highlighting (optional, defaults to generic code block) */
	languageId?: string;
}

/**
 * Injects semantic search results into chat prompts
 *
 * This component searches the workspace for similar code patterns
 * and injects them into the prompt to help the AI generate
 * code that matches the user's existing codebase style.
 *
 * Example output:
 * ```
 * Similar code patterns in your workspace:
 *
 * From: src/utils/math.ts (relevance: 85%)
 * ```typescript
 * function safeMod(a: number, b: number): number {
 *   if (b === 0) throw new Error('Modulo by zero');
 *   return a % b;
 * }
 * ```
 * ```
 */
export class PukuSemanticContext extends PromptElement<PukuSemanticContextProps> {
	render(state: void, sizing: PromptSizing) {
		const { results, languageId } = this.props;

		console.log(`[PukuSemanticContext] Rendering with ${results?.length || 0} results`);

		// No results? Don't render anything
		if (!results || results.length === 0) {
			console.log(`[PukuSemanticContext] No results to render - returning null`);
			return null;
		}

		// Build context string manually (more control than JSX components)
		const contextLines: string[] = [];
		contextLines.push('Similar code patterns in your workspace:');
		contextLines.push('');

		for (const result of results) {
			const relevancePercent = (result.score * 100).toFixed(0);
			contextLines.push(`From: ${result.file} (relevance: ${relevancePercent}%)`);
			contextLines.push('```' + (languageId || ''));
			contextLines.push(result.chunk);
			contextLines.push('```');
			contextLines.push('');
		}

		const contextText = contextLines.join('\n');
		console.log(`[PukuSemanticContext] Rendering context (${contextText.length} chars): "${contextText.substring(0, 200)}..."`);

		return (
			<TextChunk priority={800}>
				{contextText}
			</TextChunk>
		);
	}
}
