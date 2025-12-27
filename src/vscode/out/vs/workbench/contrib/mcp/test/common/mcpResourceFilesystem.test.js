/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { Barrier, timeout } from '../../../../../base/common/async.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { FileSystemProviderErrorCode, FileType, IFileService, toFileSystemProviderErrorCode } from '../../../../../platform/files/common/files.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILoggerService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../../../services/environment/common/environmentService.js';
import { TestContextService, TestLoggerService, TestProductService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { IMcpRegistry } from '../../common/mcpRegistryTypes.js';
import { McpResourceFilesystem } from '../../common/mcpResourceFilesystem.js';
import { McpService } from '../../common/mcpService.js';
import { IMcpService } from '../../common/mcpTypes.js';
import { TestMcpMessageTransport, TestMcpRegistry } from './mcpRegistryTypes.js';
suite('Workbench - MCP - ResourceFilesystem', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    let transport;
    let fs;
    setup(() => {
        const services = new ServiceCollection([IFileService, { registerProvider: () => { } }], [IStorageService, ds.add(new TestStorageService())], [ILoggerService, ds.add(new TestLoggerService())], [IWorkspaceContextService, new TestContextService()], [IWorkbenchEnvironmentService, {}], [ITelemetryService, NullTelemetryService], [IProductService, TestProductService]);
        const parentInsta1 = ds.add(new TestInstantiationService(services));
        const registry = new TestMcpRegistry(parentInsta1);
        const parentInsta2 = ds.add(parentInsta1.createChild(new ServiceCollection([IMcpRegistry, registry])));
        const mcpService = ds.add(new McpService(parentInsta2, registry, new NullLogService(), new TestConfigurationService()));
        mcpService.updateCollectedServers();
        const instaService = ds.add(parentInsta2.createChild(new ServiceCollection([IMcpRegistry, registry], [IMcpService, mcpService])));
        fs = ds.add(instaService.createInstance(McpResourceFilesystem));
        transport = ds.add(new TestMcpMessageTransport());
        registry.makeTestTransport = () => transport;
    });
    test('reads a basic file', async () => {
        transport.setResponder('resources/read', msg => {
            const request = msg;
            assert.strictEqual(request.params.uri, 'custom://hello/world.txt');
            return {
                id: request.id,
                jsonrpc: '2.0',
                result: {
                    contents: [{ uri: request.params.uri, text: 'Hello World' }],
                }
            };
        });
        const response = await fs.readFile(URI.parse('mcp-resource://746573742D736572766572/custom/hello/world.txt'));
        assert.strictEqual(new TextDecoder().decode(response), 'Hello World');
    });
    test('stat returns file information', async () => {
        transport.setResponder('resources/read', msg => {
            const request = msg;
            assert.strictEqual(request.params.uri, 'custom://hello/world.txt');
            return {
                id: request.id,
                jsonrpc: '2.0',
                result: {
                    contents: [{ uri: request.params.uri, text: 'Hello World' }],
                }
            };
        });
        const fileStats = await fs.stat(URI.parse('mcp-resource://746573742D736572766572/custom/hello/world.txt'));
        assert.strictEqual(fileStats.type, FileType.File);
        assert.strictEqual(fileStats.size, 'Hello World'.length);
    });
    test('stat returns directory information', async () => {
        transport.setResponder('resources/read', msg => {
            const request = msg;
            assert.strictEqual(request.params.uri, 'custom://hello');
            return {
                id: request.id,
                jsonrpc: '2.0',
                result: {
                    contents: [
                        { uri: 'custom://hello/file1.txt', text: 'File 1' },
                        { uri: 'custom://hello/file2.txt', text: 'File 2' },
                    ],
                }
            };
        });
        const dirStats = await fs.stat(URI.parse('mcp-resource://746573742D736572766572/custom/hello/'));
        assert.strictEqual(dirStats.type, FileType.Directory);
        // Size should be sum of all file contents in the directory
        assert.strictEqual(dirStats.size, 'File 1'.length + 'File 2'.length);
    });
    test('stat throws FileNotFound for nonexistent resources', async () => {
        transport.setResponder('resources/read', msg => {
            const request = msg;
            return {
                id: request.id,
                jsonrpc: '2.0',
                result: {
                    contents: [],
                }
            };
        });
        await assert.rejects(() => fs.stat(URI.parse('mcp-resource://746573742D736572766572/custom/nonexistent.txt')), (err) => toFileSystemProviderErrorCode(err) === FileSystemProviderErrorCode.FileNotFound);
    });
    test('readdir returns directory contents', async () => {
        transport.setResponder('resources/read', msg => {
            const request = msg;
            assert.strictEqual(request.params.uri, 'custom://hello/dir');
            return {
                id: request.id,
                jsonrpc: '2.0',
                result: {
                    contents: [
                        { uri: 'custom://hello/dir/file1.txt', text: 'File 1' },
                        { uri: 'custom://hello/dir/file2.txt', text: 'File 2' },
                        { uri: 'custom://hello/dir/subdir/file3.txt', text: 'File 3' },
                    ],
                }
            };
        });
        const dirEntries = await fs.readdir(URI.parse('mcp-resource://746573742D736572766572/custom/hello/dir/'));
        assert.deepStrictEqual(dirEntries, [
            ['file1.txt', FileType.File],
            ['file2.txt', FileType.File],
            ['subdir', FileType.Directory],
        ]);
    });
    test('readdir throws when reading a file as directory', async () => {
        transport.setResponder('resources/read', msg => {
            const request = msg;
            return {
                id: request.id,
                jsonrpc: '2.0',
                result: {
                    contents: [{ uri: request.params.uri, text: 'This is a file' }],
                }
            };
        });
        await assert.rejects(() => fs.readdir(URI.parse('mcp-resource://746573742D736572766572/custom/hello/file.txt')), (err) => toFileSystemProviderErrorCode(err) === FileSystemProviderErrorCode.FileNotADirectory);
    });
    test('watch file emits change events', async () => {
        // Set up the responder for resource reading
        transport.setResponder('resources/read', msg => {
            const request = msg;
            return {
                id: request.id,
                jsonrpc: '2.0',
                result: {
                    contents: [{ uri: request.params.uri, text: 'File content' }],
                }
            };
        });
        const didSubscribe = new Barrier();
        // Set up the responder for resource subscription
        transport.setResponder('resources/subscribe', msg => {
            const request = msg;
            didSubscribe.open();
            return {
                id: request.id,
                jsonrpc: '2.0',
                result: {},
            };
        });
        const uri = URI.parse('mcp-resource://746573742D736572766572/custom/hello/file.txt');
        const fileChanges = [];
        // Create a listener for file change events
        const disposable = fs.onDidChangeFile(events => {
            fileChanges.push(...events);
        });
        // Start watching the file
        const watchDisposable = fs.watch(uri, { excludes: [], recursive: false });
        // Simulate a file update notification from the server
        await didSubscribe.wait();
        await timeout(10); // wait for listeners to attach
        transport.simulateReceiveMessage({
            jsonrpc: '2.0',
            method: 'notifications/resources/updated',
            params: {
                uri: 'custom://hello/file.txt',
            },
        });
        transport.simulateReceiveMessage({
            jsonrpc: '2.0',
            method: 'notifications/resources/updated',
            params: {
                uri: 'custom://hello/unrelated.txt',
            },
        });
        // Check that we received a file change event
        assert.strictEqual(fileChanges.length, 1);
        assert.strictEqual(fileChanges[0].type, 0 /* FileChangeType.UPDATED */);
        assert.strictEqual(fileChanges[0].resource.toString(), uri.toString());
        // Clean up
        disposable.dispose();
        watchDisposable.dispose();
    });
    test('read blob resource', async () => {
        const blobBase64 = 'SGVsbG8gV29ybGQgYXMgQmxvYg=='; // "Hello World as Blob" in base64
        transport.setResponder('resources/read', msg => {
            const params = msg;
            assert.strictEqual(params.params.uri, 'custom://hello/blob.bin');
            return {
                id: params.id,
                jsonrpc: '2.0',
                result: {
                    contents: [{ uri: params.params.uri, blob: blobBase64 }],
                }
            };
        });
        const response = await fs.readFile(URI.parse('mcp-resource://746573742D736572766572/custom/hello/blob.bin'));
        assert.strictEqual(new TextDecoder().decode(response), 'Hello World as Blob');
    });
    test('throws error for write operations', async () => {
        const uri = URI.parse('mcp-resource://746573742D736572766572/custom/hello/file.txt');
        await assert.rejects(async () => fs.writeFile(uri, new Uint8Array(), { create: true, overwrite: true, atomic: false, unlock: false }), (err) => toFileSystemProviderErrorCode(err) === FileSystemProviderErrorCode.NoPermissions);
        await assert.rejects(async () => fs.delete(uri, { recursive: false, useTrash: false, atomic: false }), (err) => toFileSystemProviderErrorCode(err) === FileSystemProviderErrorCode.NoPermissions);
        await assert.rejects(async () => fs.mkdir(uri), (err) => toFileSystemProviderErrorCode(err) === FileSystemProviderErrorCode.NoPermissions);
        await assert.rejects(async () => fs.rename(uri, URI.parse('mcp-resource://746573742D736572766572/custom/hello/newfile.txt'), { overwrite: false }), (err) => toFileSystemProviderErrorCode(err) === FileSystemProviderErrorCode.NoPermissions);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVzb3VyY2VGaWxlc3lzdGVtLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvdGVzdC9jb21tb24vbWNwUmVzb3VyY2VGaWxlc3lzdGVtLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFrQiwyQkFBMkIsRUFBRSxRQUFRLEVBQWUsWUFBWSxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDaEwsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFN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