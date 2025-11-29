/*---------------------------------------------------------------------------------------------
 *  Puku AI Completions Cache
 *  Inspired by GitHub Copilot's CompletionsCache implementation
 *--------------------------------------------------------------------------------------------*/

import { LRURadixTrie } from './radixTrie';

interface CompletionsCacheContents {
	content: {
		suffix: string;
		completion: string;
	}[];
}

/** Caches recent completions by document prefix using a Radix Trie for efficient prefix matching. */
export class CompletionsCache {
	private cache = new LRURadixTrie<CompletionsCacheContents>(100);

	/**
	 * Given a document prefix and suffix, return all of the completions that match.
	 * Returns completions with the portion already typed sliced off.
	 */
	findAll(prefix: string, suffix: string): string[] {
		return this.cache.findAll(prefix).flatMap(({ remainingKey, value }) =>
			value.content
				.filter(
					c =>
						c.suffix === suffix &&
						c.completion.startsWith(remainingKey) &&
						c.completion.length > remainingKey.length
				)
				.map(c => c.completion.slice(remainingKey.length))
		);
	}

	/** Add cached completions for a given prefix. */
	append(prefix: string, suffix: string, completion: string) {
		const existing = this.cache.findAll(prefix);
		// Append to an existing array if there is an exact match.
		if (existing.length > 0 && existing[0].remainingKey === '') {
			const content = existing[0].value.content;
			this.cache.set(prefix, { content: [...content, { suffix, completion }] });
		} else {
			// Otherwise, add a new value.
			this.cache.set(prefix, { content: [{ suffix, completion }] });
		}
	}

	clear() {
		this.cache = new LRURadixTrie<CompletionsCacheContents>(100);
	}
}
