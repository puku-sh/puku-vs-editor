"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseTreeReference = exports.ParserWithCaching = void 0;
exports._dispose = _dispose;
exports._parse = _parse;
const Parser = require("web-tree-sitter");
const cache_1 = require("../../../util/common/cache");
const languageLoader_1 = require("./languageLoader");
class ParserWithCaching {
    static { this.INSTANCE = new ParserWithCaching(); }
    static { this.CACHE_SIZE_PER_LANGUAGE = 5; }
    constructor() {
        this.caches = new Map();
        this.languageLoader = new languageLoader_1.LanguageLoader();
        this._parser = null;
    }
    /** @remarks must not be called before `Parser.init()` */
    get parser() {
        if (!this._parser) {
            this._parser = new Parser();
        }
        return this._parser;
    }
    /**
     * @remarks Do not `delete()` the returned parse tree manually.
     */
    async parse(lang, source) {
        await Parser.init();
        const cache = this.getParseTreeCache(lang);
        let cacheEntry = cache.get(source);
        if (cacheEntry) {
            return cacheEntry.createReference();
        }
        const parserLang = await this.languageLoader.loadLanguage(lang);
        this.parser.setLanguage(parserLang);
        // check again the cache, maybe someone else has already parsed the source during the await
        cacheEntry = cache.get(source);
        if (cacheEntry) {
            return cacheEntry.createReference();
        }
        const parseTree = this.parser.parse(source);
        cacheEntry = new CacheableParseTree(parseTree);
        cache.put(source, cacheEntry);
        return cacheEntry.createReference();
    }
    dispose() {
        if (this._parser) {
            this.parser.delete();
            this._parser = null;
        }
        for (const cache of this.caches.values()) {
            cache.dispose();
        }
    }
    getParseTreeCache(lang) {
        let cache = this.caches.get(lang);
        if (!cache) {
            cache = new cache_1.DisposablesLRUCache(ParserWithCaching.CACHE_SIZE_PER_LANGUAGE);
            this.caches.set(lang, cache);
        }
        return cache;
    }
}
exports.ParserWithCaching = ParserWithCaching;
/**
 * A parse tree that can be cached (i.e. it can be referenced multiple
 * times and will be disppsed when it is evicted from cache and all
 * references to it are also disposed.
 */
class CacheableParseTree {
    constructor(tree) {
        this._tree = new RefCountedParseTree(tree);
    }
    dispose() {
        this._tree.deref();
    }
    createReference() {
        return new ParseTreeReference(this._tree);
    }
}
/**
 * A reference to a parse tree.
 * You must call `dispose()` when you're done with it.
 */
class ParseTreeReference {
    get tree() {
        return this._parseTree.tree;
    }
    constructor(_parseTree) {
        this._parseTree = _parseTree;
        this._parseTree.ref();
    }
    dispose() {
        this._parseTree.deref();
    }
}
exports.ParseTreeReference = ParseTreeReference;
/**
 * Will dispose the referenced parse tree when the ref count reaches 0.
 * The ref count is initialized to 1.
 */
class RefCountedParseTree {
    get tree() {
        if (this._refCount === 0) {
            throw new Error(`Cannot access disposed RefCountedParseTree`);
        }
        return this._tree;
    }
    constructor(_tree) {
        this._tree = _tree;
        this._refCount = 1;
    }
    ref() {
        if (this._refCount === 0) {
            throw new Error(`Cannot ref disposed RefCountedParseTree`);
        }
        this._refCount++;
    }
    deref() {
        if (this._refCount === 0) {
            throw new Error(`Cannot deref disposed RefCountedParseTree`);
        }
        this._refCount--;
        if (this._refCount === 0) {
            this._tree.delete();
        }
    }
}
function _dispose() {
    ParserWithCaching.INSTANCE.dispose();
}
/**
 * Parses the given source code and returns the root node of the resulting syntax tree.
 */
function _parse(language, source) {
    return ParserWithCaching.INSTANCE.parse(language, source);
}
//# sourceMappingURL=parserWithCaching.js.map