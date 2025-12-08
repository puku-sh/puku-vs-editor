"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingsSQLiteCache = exports.usedEmbeddingsCaches = void 0;
const cache_1 = require("./cache");
exports.usedEmbeddingsCaches = new Set();
class EmbeddingsSQLiteCache extends cache_1.SQLiteCache {
    constructor(salt, currentTestRunInfo) {
        super('embeddings', salt, currentTestRunInfo);
    }
}
exports.EmbeddingsSQLiteCache = EmbeddingsSQLiteCache;
//# sourceMappingURL=embeddingsCache.js.map