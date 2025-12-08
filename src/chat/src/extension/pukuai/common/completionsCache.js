"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku AI Completions Cache
 *  Inspired by GitHub Copilot's CompletionsCache implementation
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompletionsCache = void 0;
const radixTrie_1 = require("./radixTrie");
/** Caches recent completions by document prefix using a Radix Trie for efficient prefix matching. */
class CompletionsCache {
    constructor() {
        this.cache = new radixTrie_1.LRURadixTrie(500);
    }
    /**
     * Given a document prefix and suffix, return all of the completions that match.
     * Returns completions with the portion already typed sliced off.
     */
    findAll(prefix, suffix) {
        return this.cache.findAll(prefix).flatMap(({ remainingKey, value }) => value.content
            .filter(c => c.suffix === suffix &&
            c.completion.startsWith(remainingKey) &&
            c.completion.length > remainingKey.length)
            .map(c => c.completion.slice(remainingKey.length)));
    }
    /** Add cached completions for a given prefix. */
    append(prefix, suffix, completion) {
        const existing = this.cache.findAll(prefix);
        // Append to an existing array if there is an exact match.
        if (existing.length > 0 && existing[0].remainingKey === '') {
            const content = existing[0].value.content;
            this.cache.set(prefix, { content: [...content, { suffix, completion }] });
        }
        else {
            // Otherwise, add a new value.
            this.cache.set(prefix, { content: [{ suffix, completion }] });
        }
    }
    clear() {
        this.cache = new radixTrie_1.LRURadixTrie(100);
    }
}
exports.CompletionsCache = CompletionsCache;
//# sourceMappingURL=completionsCache.js.map