"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.IEmbeddingsComputer = exports.EmbeddingType = void 0;
exports.getWellKnownEmbeddingTypeInfo = getWellKnownEmbeddingTypeInfo;
exports.distance = distance;
exports.rankEmbeddings = rankEmbeddings;
const services_1 = require("../../../util/common/services");
/**
 * Fully qualified type of the embedding.
 *
 * This includes both the model identifier and the dimensions.
 */
class EmbeddingType {
    static { this.text3small_512 = new EmbeddingType('text-embedding-3-small-512'); }
    static { this.metis_1024_I16_Binary = new EmbeddingType('metis-1024-I16-Binary'); }
    static { this.codestralEmbed = new EmbeddingType('mistralai/codestral-embed-2505'); }
    constructor(id) {
        this.id = id;
    }
    toString() {
        return this.id;
    }
    equals(other) {
        return this.id === other.id;
    }
}
exports.EmbeddingType = EmbeddingType;
const wellKnownEmbeddingMetadata = Object.freeze({
    [EmbeddingType.text3small_512.id]: {
        model: "text-embedding-3-small" /* LEGACY_EMBEDDING_MODEL_ID.TEXT3SMALL */,
        dimensions: 512,
        quantization: {
            query: 'float32',
            document: 'float32'
        },
    },
    [EmbeddingType.metis_1024_I16_Binary.id]: {
        model: "metis-I16-Binary" /* LEGACY_EMBEDDING_MODEL_ID.Metis_I16_Binary */,
        dimensions: 1024,
        quantization: {
            query: 'float16',
            document: 'binary'
        },
    },
    [EmbeddingType.codestralEmbed.id]: {
        model: "text-embedding-3-small" /* LEGACY_EMBEDDING_MODEL_ID.TEXT3SMALL */, // Use TEXT3SMALL as fallback for legacy API
        dimensions: 1024, // Codestral Embed outputs 1024-dimensional vectors
        quantization: {
            query: 'float32',
            document: 'float32'
        },
    },
});
function getWellKnownEmbeddingTypeInfo(type) {
    return wellKnownEmbeddingMetadata[type.id];
}
exports.IEmbeddingsComputer = (0, services_1.createServiceIdentifier)('IEmbeddingsComputer');
function dotProduct(a, b) {
    if (a.length !== b.length) {
        console.warn('Embeddings do not have same length for computing dot product');
    }
    let dotProduct = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        dotProduct += a[i] * b[i];
    }
    return dotProduct;
}
/**
 * Gets the similarity score from 0-1 between two embeddings.
 */
function distance(queryEmbedding, otherEmbedding) {
    if (!queryEmbedding.type.equals(otherEmbedding.type)) {
        throw new Error(`Embeddings must be of the same type to compute similarity. Got: ${queryEmbedding.type.id} and ${otherEmbedding.type.id}`);
    }
    return {
        embeddingType: queryEmbedding.type,
        value: dotProduct(otherEmbedding.value, queryEmbedding.value),
    };
}
/**
 * Rank the embedding items by their cosine similarity to a query
 *
 * @returns The top {@linkcode maxResults} items.
 */
function rankEmbeddings(queryEmbedding, items, maxResults, options) {
    const minThreshold = options?.minDistance ?? 0;
    const results = items
        .map(([value, embedding]) => {
        return { distance: distance(embedding, queryEmbedding), value };
    })
        .filter(entry => entry.distance.value > minThreshold)
        .sort((a, b) => b.distance.value - a.distance.value)
        .slice(0, maxResults)
        .map(entry => {
        return {
            distance: entry.distance,
            value: entry.value,
        };
    });
    if (results.length && typeof options?.maxSpread === 'number') {
        const minScore = results.at(0).distance.value * (1.0 - options.maxSpread);
        const out = results.filter(x => x.distance.value >= minScore);
        return out;
    }
    return results;
}
//# sourceMappingURL=embeddingsComputer.js.map