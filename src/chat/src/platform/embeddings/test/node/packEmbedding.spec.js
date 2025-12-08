"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const embeddingsComputer_1 = require("../../../embeddings/common/embeddingsComputer");
const embeddingsStorage_1 = require("../../common/embeddingsStorage");
(0, vitest_1.suite)('Pack Embedding', () => {
    (0, vitest_1.test)('Text3small should pack and unpack to same values', () => {
        const embedding = {
            type: embeddingsComputer_1.EmbeddingType.text3small_512,
            // Start with float32 array so that we don't check for the very small rounding
            // that can happen when going from js number -> float32
            value: Array.from(Float32Array.from({ length: 512 }, () => Math.random())),
        };
        const serialized = (0, embeddingsStorage_1.packEmbedding)(embedding);
        const deserialized = (0, embeddingsStorage_1.unpackEmbedding)(embeddingsComputer_1.EmbeddingType.text3small_512, serialized);
        assert_1.default.deepStrictEqual(deserialized.value.length, embedding.value.length);
        assert_1.default.deepStrictEqual(deserialized.value, embedding.value);
    });
    (0, vitest_1.test)('Metis should use binary storage', () => {
        const embedding = {
            type: embeddingsComputer_1.EmbeddingType.metis_1024_I16_Binary,
            value: Array.from({ length: 1024 }, () => Math.random() < 0.5 ? 0.03125 : -0.03125)
        };
        const serialized = (0, embeddingsStorage_1.packEmbedding)(embedding);
        assert_1.default.strictEqual(serialized.length, 1024 / 8);
        const deserialized = (0, embeddingsStorage_1.unpackEmbedding)(embeddingsComputer_1.EmbeddingType.metis_1024_I16_Binary, serialized);
        assert_1.default.deepStrictEqual(deserialized.value.length, embedding.value.length);
        assert_1.default.deepStrictEqual(deserialized.value, embedding.value);
    });
    (0, vitest_1.test)('Unpack should work with buffer offsets', () => {
        const embedding = {
            type: embeddingsComputer_1.EmbeddingType.metis_1024_I16_Binary,
            value: Array.from({ length: 1024 }, () => Math.random() < 0.5 ? 0.03125 : -0.03125)
        };
        const serialized = (0, embeddingsStorage_1.packEmbedding)(embedding);
        // Now create a new buffer and write the serialized data to it at an offset
        const prefixAndSuffixSize = 512;
        const buffer = new Uint8Array(serialized.length + prefixAndSuffixSize * 2);
        for (let i = 0; i < serialized.length; i++) {
            buffer[i + prefixAndSuffixSize] = serialized[i];
        }
        const serializedCopy = new Uint8Array(buffer.buffer, prefixAndSuffixSize, serialized.length);
        const deserialized = (0, embeddingsStorage_1.unpackEmbedding)(embeddingsComputer_1.EmbeddingType.metis_1024_I16_Binary, serializedCopy);
        assert_1.default.deepStrictEqual(deserialized.value.length, embedding.value.length);
        assert_1.default.deepStrictEqual(deserialized.value, embedding.value);
    });
    (0, vitest_1.test)('Unpack should work with old style metis data', () => {
        const embedding = {
            type: embeddingsComputer_1.EmbeddingType.metis_1024_I16_Binary,
            value: Array.from({ length: 1024 }, () => Math.random() < 0.5 ? 0.03125 : -0.03125)
        };
        // Don't use pack
        const float32Buf = Float32Array.from(embedding.value);
        const serialized = new Uint8Array(float32Buf.buffer, float32Buf.byteOffset, float32Buf.byteLength);
        const deserialized = (0, embeddingsStorage_1.unpackEmbedding)(embeddingsComputer_1.EmbeddingType.metis_1024_I16_Binary, serialized);
        assert_1.default.deepStrictEqual(deserialized.value.length, embedding.value.length);
        assert_1.default.deepStrictEqual(deserialized.value, embedding.value);
    });
});
//# sourceMappingURL=packEmbedding.spec.js.map