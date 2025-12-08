"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const embeddingsComputer_1 = require("../../../../../platform/embeddings/common/embeddingsComputer");
const extensionContext_1 = require("../../../../../platform/extContext/common/extensionContext");
const fileSystemService_1 = require("../../../../../platform/filesystem/common/fileSystemService");
const mockFileSystemService_1 = require("../../../../../platform/filesystem/node/test/mockFileSystemService");
const lifecycle_1 = require("../../../../../util/vs/base/common/lifecycle");
const uri_1 = require("../../../../../util/vs/base/common/uri");
const services_1 = require("../../../../test/node/services");
const toolEmbeddingsLocalCache_1 = require("../../../common/virtualTools/toolEmbeddingsLocalCache");
// Enhanced MockFileSystemService that supports writeFile for testing
class TestableFileSystemService extends mockFileSystemService_1.MockFileSystemService {
    constructor() {
        super(...arguments);
        this.writtenFiles = new Map();
    }
    async writeFile(uri, content) {
        const uriString = uri.toString();
        this.writtenFiles.set(uriString, content);
        // Make the file available for reading
        const contentString = Buffer.from(content).toString('base64');
        this.mockFile(uri, contentString);
    }
    async readFile(uri) {
        const uriString = uri.toString();
        // Check if file was written in this test session
        if (this.writtenFiles.has(uriString)) {
            return this.writtenFiles.get(uriString);
        }
        // Fall back to mocked files (return as base64 decoded)
        try {
            const base64Content = await super.readFile(uri);
            return Buffer.from(new TextDecoder().decode(base64Content), 'base64');
        }
        catch {
            throw new Error('ENOENT');
        }
    }
    getWrittenContent(uri) {
        return this.writtenFiles.get(uri.toString());
    }
}
(0, vitest_1.describe)('ToolEmbeddingLocalCache', () => {
    let disposables;
    let accessor;
    let mockFileSystem;
    let cache;
    let mockContext;
    let embeddingType;
    // Sample test data
    const createSampleTool = (name, description = `Description for ${name}`) => ({
        name,
        description
    });
    const createSampleEmbedding = (type, values = [0.1, 0.2, 0.3, 0.4]) => ({
        type,
        value: values
    });
    // Helper to create embeddings with Float32 precision for accurate testing
    const createFloat32Embedding = (type, values) => ({
        type,
        value: Array.from(Float32Array.from(values))
    });
    // Helper to compare embeddings with Float32 tolerance
    const expectEmbeddingToEqual = (actual, expected) => {
        (0, vitest_1.expect)(actual).toBeDefined();
        (0, vitest_1.expect)(actual.type).toEqual(expected.type);
        (0, vitest_1.expect)(actual.value.length).toBe(expected.value.length);
        // Compare with Float32 precision
        actual.value.forEach((actualVal, i) => {
            const expectedVal = expected.value[i];
            (0, vitest_1.expect)(Math.abs(actualVal - expectedVal)).toBeLessThan(1e-5);
        });
    };
    (0, vitest_1.beforeEach)(() => {
        disposables = new lifecycle_1.DisposableStore();
        const testingServiceCollection = disposables.add((0, services_1.createExtensionUnitTestingServices)());
        mockFileSystem = new TestableFileSystemService();
        testingServiceCollection.set(fileSystemService_1.IFileSystemService, mockFileSystem);
        testingServiceCollection.set(extensionContext_1.IVSCodeExtensionContext, { globalStorageUri: uri_1.URI.file('/tmp') });
        accessor = testingServiceCollection.createTestingAccessor();
        mockContext = accessor.get(extensionContext_1.IVSCodeExtensionContext);
        embeddingType = embeddingsComputer_1.EmbeddingType.text3small_512;
        // Create cache instance
        cache = disposables.add(new toolEmbeddingsLocalCache_1.ToolEmbeddingLocalCache(embeddingType, mockFileSystem, mockContext));
    });
    (0, vitest_1.afterEach)(() => {
        disposables.dispose();
    });
    (0, vitest_1.describe)('Basic Operations', () => {
        (0, vitest_1.it)('should initialize without error when no cache file exists', async () => {
            await (0, vitest_1.expect)(cache.initialize()).resolves.not.toThrow();
        });
        (0, vitest_1.it)('should get undefined for non-existent tool', () => {
            const tool = createSampleTool('nonexistent');
            (0, vitest_1.expect)(cache.get(tool)).toBeUndefined();
        });
        (0, vitest_1.it)('should store and retrieve embeddings', () => {
            const tool = createSampleTool('test-tool');
            const embedding = createSampleEmbedding(embeddingType);
            cache.set(tool, embedding);
            const retrieved = cache.get(tool);
            (0, vitest_1.expect)(retrieved).toEqual(embedding);
        });
        (0, vitest_1.it)('should generate consistent keys for same tool', () => {
            const tool1 = createSampleTool('same-tool', 'description');
            const tool2 = createSampleTool('same-tool', 'description');
            const embedding = createSampleEmbedding(embeddingType);
            cache.set(tool1, embedding);
            const retrieved = cache.get(tool2);
            (0, vitest_1.expect)(retrieved).toEqual(embedding);
        });
        (0, vitest_1.it)('should generate different keys for different tools', () => {
            const tool1 = createSampleTool('tool1');
            const tool2 = createSampleTool('tool2');
            const embedding1 = createSampleEmbedding(embeddingType, [0.1, 0.2]);
            const embedding2 = createSampleEmbedding(embeddingType, [0.3, 0.4]);
            cache.set(tool1, embedding1);
            cache.set(tool2, embedding2);
            (0, vitest_1.expect)(cache.get(tool1)).toEqual(embedding1);
            (0, vitest_1.expect)(cache.get(tool2)).toEqual(embedding2);
        });
    });
    (0, vitest_1.describe)('Persistence', () => {
        (0, vitest_1.it)('should save and load cache to/from binary format', async () => {
            const tool1 = createSampleTool('persistent-tool-1');
            const tool2 = createSampleTool('persistent-tool-2');
            const embedding1 = createFloat32Embedding(embeddingType, [0.1, 0.2, 0.3, 0.4]);
            const embedding2 = createFloat32Embedding(embeddingType, [0.5, 0.6, 0.7, 0.8]);
            // Store embeddings
            cache.set(tool1, embedding1);
            cache.set(tool2, embedding2);
            // Manually save
            cache.save();
            // Verify file was written
            const cacheUri = uri_1.URI.joinPath(mockContext.globalStorageUri, 'toolEmbeddingsCache.bin');
            const writtenContent = mockFileSystem.getWrittenContent(cacheUri);
            (0, vitest_1.expect)(writtenContent).toBeDefined();
            (0, vitest_1.expect)(writtenContent.length).toBeGreaterThan(0);
            // Create new cache and load
            const newCache = disposables.add(new toolEmbeddingsLocalCache_1.ToolEmbeddingLocalCache(embeddingType, mockFileSystem, mockContext));
            await newCache.initialize();
            // Verify loaded data with Float32 precision
            expectEmbeddingToEqual(newCache.get(tool1), embedding1);
            expectEmbeddingToEqual(newCache.get(tool2), embedding2);
        });
        (0, vitest_1.it)('should discard cache when embedding type does not match', async () => {
            const tool = createSampleTool('type-mismatch-tool');
            const embedding = createSampleEmbedding(embeddingType);
            // Store with current type
            cache.set(tool, embedding);
            cache.save();
            // Create cache with different embedding type
            const differentType = embeddingsComputer_1.EmbeddingType.metis_1024_I16_Binary;
            const newCache = disposables.add(new toolEmbeddingsLocalCache_1.ToolEmbeddingLocalCache(differentType, mockFileSystem, mockContext));
            await newCache.initialize();
            // Should not find the embedding due to type mismatch
            (0, vitest_1.expect)(newCache.get(tool)).toBeUndefined();
        });
        (0, vitest_1.it)('should handle corrupted cache file gracefully', async () => {
            const cacheUri = uri_1.URI.joinPath(mockContext.globalStorageUri, 'toolEmbeddingsCache.bin');
            // Write corrupted data
            const corruptedData = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]);
            await mockFileSystem.writeFile(cacheUri, corruptedData);
            // Should not throw and should start with empty cache
            await (0, vitest_1.expect)(cache.initialize()).resolves.not.toThrow();
            const tool = createSampleTool('test-after-corruption');
            (0, vitest_1.expect)(cache.get(tool)).toBeUndefined();
        });
        (0, vitest_1.it)('should handle version mismatch gracefully', async () => {
            const tool = createSampleTool('version-test-tool');
            const embedding = createSampleEmbedding(embeddingType);
            // Store with current implementation
            cache.set(tool, embedding);
            cache.save();
            // Modify the saved file to have wrong version (overwrite first bytes)
            const cacheUri = uri_1.URI.joinPath(mockContext.globalStorageUri, 'toolEmbeddingsCache.bin');
            const currentContent = mockFileSystem.getWrittenContent(cacheUri);
            const modifiedContent = new Uint8Array(currentContent);
            modifiedContent[0] = 99; // Invalid version
            await mockFileSystem.writeFile(cacheUri, modifiedContent);
            // Create new cache
            const newCache = disposables.add(new toolEmbeddingsLocalCache_1.ToolEmbeddingLocalCache(embeddingType, mockFileSystem, mockContext));
            await newCache.initialize();
            // Should start with empty cache due to version mismatch
            (0, vitest_1.expect)(newCache.get(tool)).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('Binary Format Efficiency', () => {
        (0, vitest_1.it)('should use binary format with fixed-length keys', async () => {
            const tool = createSampleTool('efficiency-test');
            const embedding = createSampleEmbedding(embeddingType, new Array(512).fill(0).map((_, i) => i / 512));
            cache.set(tool, embedding);
            cache.save();
            const cacheUri = uri_1.URI.joinPath(mockContext.globalStorageUri, 'toolEmbeddingsCache.bin');
            const content = mockFileSystem.getWrittenContent(cacheUri);
            // Should be much smaller than JSON would be
            // A JSON representation would be several KB, binary should be much less
            (0, vitest_1.expect)(content.length).toBeLessThan(3000); // Reasonable upper bound
            (0, vitest_1.expect)(content.length).toBeGreaterThan(100); // Has actual content
        });
    });
    (0, vitest_1.describe)('Multiple Tool Scenarios', () => {
        (0, vitest_1.it)('should handle many tools efficiently', async () => {
            const tools = [];
            const embeddings = [];
            // Create 50 tools with different embeddings
            for (let i = 0; i < 50; i++) {
                const tool = createSampleTool(`bulk-tool-${i}`, `Description ${i}`);
                const embedding = createSampleEmbedding(embeddingType, [i, i + 0.1, i + 0.2, i + 0.3]);
                tools.push(tool);
                embeddings.push(embedding);
                cache.set(tool, embedding);
            }
            await cache.save();
            const newCache = disposables.add(new toolEmbeddingsLocalCache_1.ToolEmbeddingLocalCache(embeddingType, mockFileSystem, mockContext));
            await newCache.initialize();
            // Verify all can be retrieved
            tools.forEach((tool, i) => {
                (0, vitest_1.expect)(cache.get(tool)).toEqual(embeddings[i]);
                expectEmbeddingToEqual(newCache.get(tool), embeddings[i]);
            });
        });
    });
});
//# sourceMappingURL=toolEmbeddingsLocalCache.spec.js.map