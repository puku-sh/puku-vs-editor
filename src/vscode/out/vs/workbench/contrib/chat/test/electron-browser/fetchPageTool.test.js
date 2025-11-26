/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { URI } from '../../../../../base/common/uri.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { FetchWebPageTool } from '../../electron-browser/tools/fetchPageTool.js';
import { TestFileService } from '../../../../test/common/workbenchTestServices.js';
import { MockTrustedDomainService } from '../../../url/test/browser/mockTrustedDomainService.js';
import { InternalFetchWebPageToolId } from '../../common/tools/tools.js';
import { MockChatService } from '../common/mockChatService.js';
import { upcastDeepPartial } from '../../../../../base/test/common/mock.js';
class TestWebContentExtractorService {
    constructor(uriToContentMap) {
        this.uriToContentMap = uriToContentMap;
    }
    async extract(uris) {
        return uris.map(uri => {
            const content = this.uriToContentMap.get(uri);
            if (content === undefined) {
                throw new Error(`No content configured for URI: ${uri.toString()}`);
            }
            return { status: 'ok', result: content };
        });
    }
}
class ExtendedTestFileService extends TestFileService {
    constructor(uriToContentMap) {
        super();
        this.uriToContentMap = uriToContentMap;
    }
    async readFile(resource, options) {
        const content = this.uriToContentMap.get(resource);
        if (content === undefined) {
            throw new Error(`File not found: ${resource.toString()}`);
        }
        const buffer = typeof content === 'string' ? VSBuffer.fromString(content) : content;
        return {
            resource,
            value: buffer,
            name: '',
            size: buffer.byteLength,
            etag: '',
            mtime: 0,
            ctime: 0,
            readonly: false,
            locked: false
        };
    }
    async stat(resource) {
        // Check if the resource exists in our map
        if (!this.uriToContentMap.has(resource)) {
            throw new Error(`File not found: ${resource.toString()}`);
        }
        return super.stat(resource);
    }
}
suite('FetchWebPageTool', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should handle http/https via web content extractor and other schemes via file service', async () => {
        const webContentMap = new ResourceMap([
            [URI.parse('https://example.com'), 'HTTPS content'],
            [URI.parse('http://example.com'), 'HTTP content']
        ]);
        const fileContentMap = new ResourceMap([
            [URI.parse('test://static/resource/50'), 'MCP resource content'],
            [URI.parse('mcp-resource://746573742D736572766572/custom/hello/world.txt'), 'Custom MCP content']
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(fileContentMap), new MockTrustedDomainService(), new MockChatService());
        const testUrls = [
            'https://example.com',
            'http://example.com',
            'test://static/resource/50',
            'mcp-resource://746573742D736572766572/custom/hello/world.txt',
            'file:///path/to/nonexistent',
            'ftp://example.com',
            'invalid-url'
        ];
        const result = await tool.invoke({ callId: 'test-call-1', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // Should have 7 results (one for each input URL)
        assert.strictEqual(result.content.length, 7, 'Should have result for each input URL');
        // HTTP and HTTPS URLs should have their content from web extractor
        assert.strictEqual(result.content[0].value, 'HTTPS content', 'HTTPS URL should return content');
        assert.strictEqual(result.content[1].value, 'HTTP content', 'HTTP URL should return content');
        // MCP resources should have their content from file service
        assert.strictEqual(result.content[2].value, 'MCP resource content', 'test:// URL should return content from file service');
        assert.strictEqual(result.content[3].value, 'Custom MCP content', 'mcp-resource:// URL should return content from file service');
        // Nonexistent file should be marked as invalid
        assert.strictEqual(result.content[4].value, 'Invalid URL', 'Nonexistent file should be invalid');
        // Unsupported scheme (ftp) should be marked as invalid since file service can't handle it
        assert.strictEqual(result.content[5].value, 'Invalid URL', 'ftp:// URL should be invalid');
        // Invalid URL should be marked as invalid
        assert.strictEqual(result.content[6].value, 'Invalid URL', 'Invalid URL should be invalid');
        // All successfully fetched URLs should be in toolResultDetails
        assert.strictEqual(Array.isArray(result.toolResultDetails) ? result.toolResultDetails.length : 0, 4, 'Should have 4 valid URLs in toolResultDetails');
    });
    test('should handle empty and undefined URLs', async () => {
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(new ResourceMap()), new MockTrustedDomainService([]), new MockChatService());
        // Test empty array
        const emptyResult = await tool.invoke({ callId: 'test-call-2', toolId: 'fetch-page', parameters: { urls: [] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        assert.strictEqual(emptyResult.content.length, 1, 'Empty array should return single message');
        assert.strictEqual(emptyResult.content[0].value, 'No valid URLs provided.', 'Should indicate no valid URLs');
        // Test undefined
        const undefinedResult = await tool.invoke({ callId: 'test-call-3', toolId: 'fetch-page', parameters: {}, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        assert.strictEqual(undefinedResult.content.length, 1, 'Undefined URLs should return single message');
        assert.strictEqual(undefinedResult.content[0].value, 'No valid URLs provided.', 'Should indicate no valid URLs');
        // Test array with invalid URLs
        const invalidResult = await tool.invoke({ callId: 'test-call-4', toolId: 'fetch-page', parameters: { urls: ['', ' ', 'invalid-scheme-that-fileservice-cannot-handle://test'] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        assert.strictEqual(invalidResult.content.length, 3, 'Should have result for each invalid URL');
        assert.strictEqual(invalidResult.content[0].value, 'Invalid URL', 'Empty string should be invalid');
        assert.strictEqual(invalidResult.content[1].value, 'Invalid URL', 'Space-only string should be invalid');
        assert.strictEqual(invalidResult.content[2].value, 'Invalid URL', 'Unhandleable scheme should be invalid');
    });
    test('should provide correct past tense messages for mixed valid/invalid URLs', async () => {
        const webContentMap = new ResourceMap([
            [URI.parse('https://valid.com'), 'Valid content']
        ]);
        const fileContentMap = new ResourceMap([
            [URI.parse('test://valid/resource'), 'Valid MCP content']
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(fileContentMap), new MockTrustedDomainService(), new MockChatService());
        const preparation = await tool.prepareToolInvocation({ parameters: { urls: ['https://valid.com', 'test://valid/resource', 'invalid://invalid'] } }, CancellationToken.None);
        assert.ok(preparation, 'Should return prepared invocation');
        assert.ok(preparation.pastTenseMessage, 'Should have past tense message');
        const messageText = typeof preparation.pastTenseMessage === 'string' ? preparation.pastTenseMessage : preparation.pastTenseMessage.value;
        assert.ok(messageText.includes('Fetched'), 'Should mention fetched resources');
        assert.ok(messageText.includes('invalid://invalid'), 'Should mention invalid URL');
    });
    test('should approve when all URLs were mentioned in chat', async () => {
        const webContentMap = new ResourceMap([
            [URI.parse('https://valid.com'), 'Valid content']
        ]);
        const fileContentMap = new ResourceMap([
            [URI.parse('test://valid/resource'), 'Valid MCP content']
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(fileContentMap), new MockTrustedDomainService(), upcastDeepPartial({
            getSession: () => {
                return {
                    getRequests: () => [{
                            message: {
                                text: 'fetch https://example.com'
                            }
                        }],
                };
            },
        }));
        const preparation1 = await tool.prepareToolInvocation({ parameters: { urls: ['https://example.com'] }, chatSessionId: 'a' }, CancellationToken.None);
        assert.ok(preparation1, 'Should return prepared invocation');
        assert.strictEqual(preparation1.confirmationMessages?.title, undefined);
        const preparation2 = await tool.prepareToolInvocation({ parameters: { urls: ['https://other.com'] }, chatSessionId: 'a' }, CancellationToken.None);
        assert.ok(preparation2, 'Should return prepared invocation');
        assert.ok(preparation2.confirmationMessages?.title);
    });
    test('should return message for binary files indicating they are not supported', async () => {
        // Create binary content (a simple PNG-like header with null bytes)
        const binaryContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
        const binaryBuffer = VSBuffer.wrap(binaryContent);
        const fileContentMap = new ResourceMap([
            [URI.parse('file:///path/to/binary.dat'), binaryBuffer],
            [URI.parse('file:///path/to/text.txt'), 'This is text content']
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap), new MockTrustedDomainService(), new MockChatService());
        const result = await tool.invoke({
            callId: 'test-call-binary',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///path/to/binary.dat', 'file:///path/to/text.txt'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // Should have 2 results
        assert.strictEqual(result.content.length, 2, 'Should have 2 results');
        // First result should be a text part with binary not supported message
        assert.strictEqual(result.content[0].kind, 'text', 'Binary file should return text part');
        if (result.content[0].kind === 'text') {
            assert.strictEqual(result.content[0].value, 'Binary files are not supported at the moment.', 'Should return not supported message');
        }
        // Second result should be a text part for the text file
        assert.strictEqual(result.content[1].kind, 'text', 'Text file should return text part');
        if (result.content[1].kind === 'text') {
            assert.strictEqual(result.content[1].value, 'This is text content', 'Should return text content');
        }
        // Both files should be in toolResultDetails since they were successfully fetched
        assert.strictEqual(Array.isArray(result.toolResultDetails) ? result.toolResultDetails.length : 0, 2, 'Should have 2 valid URLs in toolResultDetails');
    });
    test('PNG files are now supported as image data parts (regression test)', async () => {
        // This test ensures that PNG files that previously returned "not supported"
        // messages now return proper image data parts
        const binaryContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
        const binaryBuffer = VSBuffer.wrap(binaryContent);
        const fileContentMap = new ResourceMap([
            [URI.parse('file:///path/to/image.png'), binaryBuffer]
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap), new MockTrustedDomainService(), new MockChatService());
        const result = await tool.invoke({
            callId: 'test-png-support',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///path/to/image.png'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // Should have 1 result
        assert.strictEqual(result.content.length, 1, 'Should have 1 result');
        // PNG file should now be returned as a data part, not a "not supported" message
        assert.strictEqual(result.content[0].kind, 'data', 'PNG file should return data part');
        if (result.content[0].kind === 'data') {
            assert.strictEqual(result.content[0].value.mimeType, 'image/png', 'Should have PNG MIME type');
            assert.strictEqual(result.content[0].value.data, binaryBuffer, 'Should have correct binary data');
        }
    });
    test('should correctly distinguish between binary and text content', async () => {
        // Create content that might be ambiguous
        const jsonData = '{"name": "test", "value": 123}';
        // Create definitely binary data - some random bytes with null bytes that don't follow UTF-16 pattern
        const realBinaryData = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x00, 0x00, 0x00, 0x0D, 0xFF, 0x00, 0xAB]); // More clearly binary
        const fileContentMap = new ResourceMap([
            [URI.parse('file:///data.json'), jsonData], // Should be detected as text
            [URI.parse('file:///binary.dat'), VSBuffer.wrap(realBinaryData)] // Should be detected as binary
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap), new MockTrustedDomainService(), new MockChatService());
        const result = await tool.invoke({
            callId: 'test-distinguish',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///data.json', 'file:///binary.dat'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // JSON should be returned as text
        assert.strictEqual(result.content[0].kind, 'text', 'JSON should be detected as text');
        if (result.content[0].kind === 'text') {
            assert.strictEqual(result.content[0].value, jsonData, 'Should return JSON as text');
        }
        // Binary data should be returned as not supported message
        assert.strictEqual(result.content[1].kind, 'text', 'Binary content should return text part with message');
        if (result.content[1].kind === 'text') {
            assert.strictEqual(result.content[1].value, 'Binary files are not supported at the moment.', 'Should return not supported message');
        }
    });
    test('Supported image files are returned as data parts', async () => {
        // Test data for different supported image formats
        const pngData = VSBuffer.fromString('fake PNG data');
        const jpegData = VSBuffer.fromString('fake JPEG data');
        const gifData = VSBuffer.fromString('fake GIF data');
        const webpData = VSBuffer.fromString('fake WebP data');
        const bmpData = VSBuffer.fromString('fake BMP data');
        const fileContentMap = new ResourceMap();
        fileContentMap.set(URI.parse('file:///image.png'), pngData);
        fileContentMap.set(URI.parse('file:///photo.jpg'), jpegData);
        fileContentMap.set(URI.parse('file:///animation.gif'), gifData);
        fileContentMap.set(URI.parse('file:///modern.webp'), webpData);
        fileContentMap.set(URI.parse('file:///bitmap.bmp'), bmpData);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap), new MockTrustedDomainService(), new MockChatService());
        const result = await tool.invoke({
            callId: 'test-images',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///image.png', 'file:///photo.jpg', 'file:///animation.gif', 'file:///modern.webp', 'file:///bitmap.bmp'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // All images should be returned as data parts
        assert.strictEqual(result.content.length, 5, 'Should have 5 results');
        // Check PNG
        assert.strictEqual(result.content[0].kind, 'data', 'PNG should be data part');
        if (result.content[0].kind === 'data') {
            assert.strictEqual(result.content[0].value.mimeType, 'image/png', 'PNG should have correct MIME type');
            assert.strictEqual(result.content[0].value.data, pngData, 'PNG should have correct data');
        }
        // Check JPEG
        assert.strictEqual(result.content[1].kind, 'data', 'JPEG should be data part');
        if (result.content[1].kind === 'data') {
            assert.strictEqual(result.content[1].value.mimeType, 'image/jpeg', 'JPEG should have correct MIME type');
            assert.strictEqual(result.content[1].value.data, jpegData, 'JPEG should have correct data');
        }
        // Check GIF
        assert.strictEqual(result.content[2].kind, 'data', 'GIF should be data part');
        if (result.content[2].kind === 'data') {
            assert.strictEqual(result.content[2].value.mimeType, 'image/gif', 'GIF should have correct MIME type');
            assert.strictEqual(result.content[2].value.data, gifData, 'GIF should have correct data');
        }
        // Check WebP
        assert.strictEqual(result.content[3].kind, 'data', 'WebP should be data part');
        if (result.content[3].kind === 'data') {
            assert.strictEqual(result.content[3].value.mimeType, 'image/webp', 'WebP should have correct MIME type');
            assert.strictEqual(result.content[3].value.data, webpData, 'WebP should have correct data');
        }
        // Check BMP
        assert.strictEqual(result.content[4].kind, 'data', 'BMP should be data part');
        if (result.content[4].kind === 'data') {
            assert.strictEqual(result.content[4].value.mimeType, 'image/bmp', 'BMP should have correct MIME type');
            assert.strictEqual(result.content[4].value.data, bmpData, 'BMP should have correct data');
        }
    });
    test('Mixed image and text files work correctly', async () => {
        const textData = 'This is some text content';
        const imageData = VSBuffer.fromString('fake image data');
        const fileContentMap = new ResourceMap();
        fileContentMap.set(URI.parse('file:///text.txt'), textData);
        fileContentMap.set(URI.parse('file:///image.png'), imageData);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap), new MockTrustedDomainService(), new MockChatService());
        const result = await tool.invoke({
            callId: 'test-mixed',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///text.txt', 'file:///image.png'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // Text should be returned as text part
        assert.strictEqual(result.content[0].kind, 'text', 'Text file should be text part');
        if (result.content[0].kind === 'text') {
            assert.strictEqual(result.content[0].value, textData, 'Text should have correct content');
        }
        // Image should be returned as data part
        assert.strictEqual(result.content[1].kind, 'data', 'Image file should be data part');
        if (result.content[1].kind === 'data') {
            assert.strictEqual(result.content[1].value.mimeType, 'image/png', 'Image should have correct MIME type');
            assert.strictEqual(result.content[1].value.data, imageData, 'Image should have correct data');
        }
    });
    test('Case insensitive image extensions work', async () => {
        const imageData = VSBuffer.fromString('fake image data');
        const fileContentMap = new ResourceMap();
        fileContentMap.set(URI.parse('file:///image.PNG'), imageData);
        fileContentMap.set(URI.parse('file:///photo.JPEG'), imageData);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap), new MockTrustedDomainService(), new MockChatService());
        const result = await tool.invoke({
            callId: 'test-case',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///image.PNG', 'file:///photo.JPEG'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // Both should be returned as data parts despite uppercase extensions
        assert.strictEqual(result.content[0].kind, 'data', 'PNG with uppercase extension should be data part');
        if (result.content[0].kind === 'data') {
            assert.strictEqual(result.content[0].value.mimeType, 'image/png', 'Should have correct MIME type');
        }
        assert.strictEqual(result.content[1].kind, 'data', 'JPEG with uppercase extension should be data part');
        if (result.content[1].kind === 'data') {
            assert.strictEqual(result.content[1].value.mimeType, 'image/jpeg', 'Should have correct MIME type');
        }
    });
    // Comprehensive tests for toolResultDetails
    suite('toolResultDetails', () => {
        test('should include only successfully fetched URIs in correct order', async () => {
            const webContentMap = new ResourceMap([
                [URI.parse('https://success1.com'), 'Content 1'],
                [URI.parse('https://success2.com'), 'Content 2']
            ]);
            const fileContentMap = new ResourceMap([
                [URI.parse('file:///success.txt'), 'File content'],
                [URI.parse('mcp-resource://server/file.txt'), 'MCP content']
            ]);
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(fileContentMap), new MockTrustedDomainService(), new MockChatService());
            const testUrls = [
                'https://success1.com', // index 0 - should be in toolResultDetails
                'invalid-url', // index 1 - should NOT be in toolResultDetails
                'file:///success.txt', // index 2 - should be in toolResultDetails
                'https://success2.com', // index 3 - should be in toolResultDetails
                'file:///nonexistent.txt', // index 4 - should NOT be in toolResultDetails
                'mcp-resource://server/file.txt' // index 5 - should be in toolResultDetails
            ];
            const result = await tool.invoke({ callId: 'test-details', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            // Verify toolResultDetails contains exactly the successful URIs
            assert.ok(Array.isArray(result.toolResultDetails), 'toolResultDetails should be an array');
            assert.strictEqual(result.toolResultDetails.length, 4, 'Should have 4 successful URIs');
            // Check that all entries are URI objects
            const uriDetails = result.toolResultDetails;
            assert.ok(uriDetails.every(uri => uri instanceof URI), 'All toolResultDetails entries should be URI objects');
            // Check specific URIs are included (web URIs first, then successful file URIs)
            const expectedUris = [
                'https://success1.com/',
                'https://success2.com/',
                'file:///success.txt',
                'mcp-resource://server/file.txt'
            ];
            const actualUriStrings = uriDetails.map(uri => uri.toString());
            assert.deepStrictEqual(actualUriStrings.sort(), expectedUris.sort(), 'Should contain exactly the expected successful URIs');
            // Verify content array matches input order (including failures)
            assert.strictEqual(result.content.length, 6, 'Content should have result for each input URL');
            assert.strictEqual(result.content[0].value, 'Content 1', 'First web URI content');
            assert.strictEqual(result.content[1].value, 'Invalid URL', 'Invalid URL marked as invalid');
            assert.strictEqual(result.content[2].value, 'File content', 'File URI content');
            assert.strictEqual(result.content[3].value, 'Content 2', 'Second web URI content');
            assert.strictEqual(result.content[4].value, 'Invalid URL', 'Nonexistent file marked as invalid');
            assert.strictEqual(result.content[5].value, 'MCP content', 'MCP resource content');
        });
        test('should exclude failed web requests from toolResultDetails', async () => {
            // Set up web content extractor that will throw for some URIs
            const webContentMap = new ResourceMap([
                [URI.parse('https://success.com'), 'Success content']
                // https://failure.com not in map - will throw error
            ]);
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(new ResourceMap()), new MockTrustedDomainService([]), new MockChatService());
            const testUrls = [
                'https://success.com', // Should succeed
                'https://failure.com' // Should fail (not in content map)
            ];
            try {
                await tool.invoke({ callId: 'test-web-failure', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
                // If the web extractor throws, it should be handled gracefully
                // But in this test setup, the TestWebContentExtractorService throws for missing content
                assert.fail('Expected test web content extractor to throw for missing URI');
            }
            catch (error) {
                // This is expected behavior with the current test setup
                // The TestWebContentExtractorService throws when content is not found
                assert.ok(error.message.includes('No content configured for URI'), 'Should throw for unconfigured URI');
            }
        });
        test('should exclude failed file reads from toolResultDetails', async () => {
            const fileContentMap = new ResourceMap([
                [URI.parse('file:///existing.txt'), 'File exists']
                // file:///missing.txt not in map - will throw error
            ]);
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap), new MockTrustedDomainService(), new MockChatService());
            const testUrls = [
                'file:///existing.txt', // Should succeed
                'file:///missing.txt' // Should fail (not in file map)
            ];
            const result = await tool.invoke({ callId: 'test-file-failure', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            // Verify only successful file URI is in toolResultDetails
            assert.ok(Array.isArray(result.toolResultDetails), 'toolResultDetails should be an array');
            assert.strictEqual(result.toolResultDetails.length, 1, 'Should have only 1 successful URI');
            const uriDetails = result.toolResultDetails;
            assert.strictEqual(uriDetails[0].toString(), 'file:///existing.txt', 'Should contain only the successful file URI');
            // Verify content reflects both attempts
            assert.strictEqual(result.content.length, 2, 'Should have results for both input URLs');
            assert.strictEqual(result.content[0].value, 'File exists', 'First file should have content');
            assert.strictEqual(result.content[1].value, 'Invalid URL', 'Second file should be marked invalid');
        });
        test('should handle mixed success and failure scenarios', async () => {
            const webContentMap = new ResourceMap([
                [URI.parse('https://web-success.com'), 'Web success']
            ]);
            const fileContentMap = new ResourceMap([
                [URI.parse('file:///file-success.txt'), 'File success'],
                [URI.parse('mcp-resource://good/file.txt'), VSBuffer.fromString('MCP binary content')]
            ]);
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(fileContentMap), new MockTrustedDomainService(), new MockChatService());
            const testUrls = [
                'invalid-scheme://bad', // Invalid URI
                'https://web-success.com', // Web success
                'file:///file-missing.txt', // File failure
                'file:///file-success.txt', // File success
                'completely-invalid-url', // Invalid URL format
                'mcp-resource://good/file.txt' // MCP success
            ];
            const result = await tool.invoke({ callId: 'test-mixed', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            // Should have 3 successful URIs: web-success, file-success, mcp-success
            assert.ok(Array.isArray(result.toolResultDetails), 'toolResultDetails should be an array');
            assert.strictEqual(result.toolResultDetails.length, 3, 'Should have 3 successful URIs');
            const uriDetails = result.toolResultDetails;
            const actualUriStrings = uriDetails.map(uri => uri.toString());
            const expectedSuccessful = [
                'https://web-success.com/',
                'file:///file-success.txt',
                'mcp-resource://good/file.txt'
            ];
            assert.deepStrictEqual(actualUriStrings.sort(), expectedSuccessful.sort(), 'Should contain exactly the successful URIs');
            // Verify content array reflects all inputs in original order
            assert.strictEqual(result.content.length, 6, 'Should have results for all input URLs');
            assert.strictEqual(result.content[0].value, 'Invalid URL', 'Invalid scheme marked as invalid');
            assert.strictEqual(result.content[1].value, 'Web success', 'Web success content');
            assert.strictEqual(result.content[2].value, 'Invalid URL', 'Missing file marked as invalid');
            assert.strictEqual(result.content[3].value, 'File success', 'File success content');
            assert.strictEqual(result.content[4].value, 'Invalid URL', 'Invalid URL marked as invalid');
            assert.strictEqual(result.content[5].value, 'MCP binary content', 'MCP success content');
        });
        test('should return empty toolResultDetails when all requests fail', async () => {
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), // Empty - all web requests fail
            new ExtendedTestFileService(new ResourceMap()), // Empty - all file ,
            new MockTrustedDomainService([]), new MockChatService());
            const testUrls = [
                'https://nonexistent.com',
                'file:///missing.txt',
                'invalid-url',
                'bad://scheme'
            ];
            try {
                const result = await tool.invoke({ callId: 'test-all-fail', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
                // If web extractor doesn't throw, check the results
                assert.ok(Array.isArray(result.toolResultDetails), 'toolResultDetails should be an array');
                assert.strictEqual(result.toolResultDetails.length, 0, 'Should have no successful URIs');
                assert.strictEqual(result.content.length, 4, 'Should have results for all input URLs');
                assert.ok(result.content.every(content => content.value === 'Invalid URL'), 'All content should be marked as invalid');
            }
            catch (error) {
                // Expected with TestWebContentExtractorService when no content is configured
                assert.ok(error.message.includes('No content configured for URI'), 'Should throw for unconfigured URI');
            }
        });
        test('should handle empty URL array', async () => {
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(new ResourceMap()), new MockTrustedDomainService([]), new MockChatService());
            const result = await tool.invoke({ callId: 'test-empty', toolId: 'fetch-page', parameters: { urls: [] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            assert.strictEqual(result.content.length, 1, 'Should have one content item for empty URLs');
            assert.strictEqual(result.content[0].value, 'No valid URLs provided.', 'Should indicate no valid URLs');
            assert.ok(!result.toolResultDetails, 'toolResultDetails should not be present for empty URLs');
        });
        test('should handle image files in toolResultDetails', async () => {
            const imageBuffer = VSBuffer.fromString('fake-png-data');
            const fileContentMap = new ResourceMap([
                [URI.parse('file:///image.png'), imageBuffer],
                [URI.parse('file:///document.txt'), 'Text content']
            ]);
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap), new MockTrustedDomainService(), new MockChatService());
            const result = await tool.invoke({ callId: 'test-images', toolId: 'fetch-page', parameters: { urls: ['file:///image.png', 'file:///document.txt'] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            // Both files should be successful and in toolResultDetails
            assert.ok(Array.isArray(result.toolResultDetails), 'toolResultDetails should be an array');
            assert.strictEqual(result.toolResultDetails.length, 2, 'Should have 2 successful file URIs');
            const uriDetails = result.toolResultDetails;
            assert.strictEqual(uriDetails[0].toString(), 'file:///image.png', 'Should include image file');
            assert.strictEqual(uriDetails[1].toString(), 'file:///document.txt', 'Should include text file');
            // Check content types
            assert.strictEqual(result.content[0].kind, 'data', 'Image should be data part');
            assert.strictEqual(result.content[1].kind, 'text', 'Text file should be text part');
        });
        test('confirmResults is false when all web contents are errors or redirects', async () => {
            const webContentMap = new ResourceMap();
            const tool = new FetchWebPageTool(new class extends TestWebContentExtractorService {
                constructor() {
                    super(webContentMap);
                }
                async extract(uris) {
                    return uris.map(() => ({ status: 'error', error: 'Failed to fetch' }));
                }
            }(), new ExtendedTestFileService(new ResourceMap()), new MockTrustedDomainService(), new MockChatService());
            const result = await tool.invoke({ callId: 'test-call', toolId: 'fetch-page', parameters: { urls: ['https://example.com'] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            assert.strictEqual(result.confirmResults, false, 'confirmResults should be false when all results are errors');
        });
        test('confirmResults is false when all web contents are redirects', async () => {
            const webContentMap = new ResourceMap();
            const tool = new FetchWebPageTool(new class extends TestWebContentExtractorService {
                constructor() {
                    super(webContentMap);
                }
                async extract(uris) {
                    return uris.map(() => ({ status: 'redirect', toURI: URI.parse('https://redirected.com') }));
                }
            }(), new ExtendedTestFileService(new ResourceMap()), new MockTrustedDomainService(), new MockChatService());
            const result = await tool.invoke({ callId: 'test-call', toolId: 'fetch-page', parameters: { urls: ['https://example.com'] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            assert.strictEqual(result.confirmResults, false, 'confirmResults should be false when all results are redirects');
        });
        test('confirmResults is undefined when at least one web content succeeds', async () => {
            const webContentMap = new ResourceMap([
                [URI.parse('https://success.com'), 'Success content']
            ]);
            const tool = new FetchWebPageTool(new class extends TestWebContentExtractorService {
                constructor() {
                    super(webContentMap);
                }
                async extract(uris) {
                    return [
                        { status: 'ok', result: 'Success content' },
                        { status: 'error', error: 'Failed' }
                    ];
                }
            }(), new ExtendedTestFileService(new ResourceMap()), new MockTrustedDomainService(), new MockChatService());
            const result = await tool.invoke({ callId: 'test-call', toolId: 'fetch-page', parameters: { urls: ['https://success.com', 'https://error.com'] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            assert.strictEqual(result.confirmResults, undefined, 'confirmResults should be undefined when at least one result succeeds');
        });
        test('redirect result provides correct message with new URL', async () => {
            const redirectURI = URI.parse('https://redirected.com/page');
            const tool = new FetchWebPageTool(new class extends TestWebContentExtractorService {
                constructor() {
                    super(new ResourceMap());
                }
                async extract(uris) {
                    return [{ status: 'redirect', toURI: redirectURI }];
                }
            }(), new ExtendedTestFileService(new ResourceMap()), new MockTrustedDomainService(), new MockChatService());
            const result = await tool.invoke({ callId: 'test-call', toolId: 'fetch-page', parameters: { urls: ['https://example.com'] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            assert.strictEqual(result.content.length, 1);
            assert.strictEqual(result.content[0].kind, 'text');
            if (result.content[0].kind === 'text') {
                assert.ok(result.content[0].value.includes(redirectURI.toString(true)), 'Redirect message should include target URL');
                assert.ok(result.content[0].value.includes(InternalFetchWebPageToolId), 'Redirect message should suggest using tool again');
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2hQYWdlVG9vbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2VsZWN0cm9uLWJyb3dzZXIvZmV0Y2hQYWdlVG9vbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR25HLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHNUUsTUFBTSw4QkFBOEI7SUFHbkMsWUFBb0IsZUFBb0M7UUFBcEMsb0JBQWUsR0FBZixlQUFlLENBQXFCO0lBQUksQ0FBQztJQUU3RCxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVc7UUFDeEIsT0FBTyxJQUFJLENBQUMs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