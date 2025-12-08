/*---------------------------------------------------------------------------------------------
 *  Puku AI Completions Cache
 *  Inspired by GitHub Copilot's CompletionsCache implementation
 *--------------------------------------------------------------------------------------------*/

import { LRURadixTrie } from './radixTrie';

interface CompletionsCacheContents {
	content: {
		suffix: string;
		completions: string[]; // Feature #64: Support multiple completions
	}[];
}

/** Caches recent completions by document prefix using a Radix Trie for efficient prefix matching. */
export class CompletionsCache {
	private cache = new LRURadixTrie<CompletionsCacheContents>(500);

	/**
	 * Given a document prefix and suffix, return all of the completions that match.
	 * Returns array of completion arrays, with the portion already typed sliced off.
	 * Feature #64: Returns multiple completions for cycling support.
	 */
	findAll(prefix: string, suffix: string): string[][] {
		return this.cache.findAll(prefix).flatMap(({ remainingKey, value }) =>
			value.content
				.filter(c => c.suffix === suffix)
				.map(c =>
					c.completions
						.filter(completion =>
							completion.startsWith(remainingKey) &&
							completion.length > remainingKey.length
						)
						.map(completion => completion.slice(remainingKey.length))
				)
				.filter(completions => completions.length > 0)
		);
	}

	/**
	 * Add cached completions for a given prefix.
	 * Feature #64: Accepts array of completions for cycling support.
	 */
	append(prefix: string, suffix: string, completions: string[]) {
		const existing = this.cache.findAll(prefix);
		// Append to an existing array if there is an exact match.
		if (existing.length > 0 && existing[0].remainingKey === '') {
			const content = existing[0].value.content;
			this.cache.set(prefix, { content: [...content, { suffix, completions }] });
		} else {
			// Otherwise, add a new value.
			this.cache.set(prefix, { content: [{ suffix, completions }] });
		}
	}

	clear() {
		this.cache = new LRURadixTrie<CompletionsCacheContents>(100);
	}
}
