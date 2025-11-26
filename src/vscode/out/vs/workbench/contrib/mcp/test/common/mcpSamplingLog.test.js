/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { McpSamplingLog } from '../../common/mcpSamplingLog.js';
suite('MCP - Sampling Log', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    const fakeServer = {
        definition: { id: 'testServer' },
        readDefinitions: () => ({
            get: () => ({ collection: { scope: -1 /* StorageScope.APPLICATION */ } }),
        }),
    };
    let log;
    let storage;
    let clock;
    setup(() => {
        storage = ds.add(new TestStorageService());
        log = ds.add(new McpSamplingLog(storage));
        clock = sinon.useFakeTimers();
        clock.setSystemTime(new Date('2023-10-01T00:00:00Z').getTime());
    });
    teardown(() => {
        clock.restore();
    });
    test('logs a single request', async () => {
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'test request' } }], 'test response here', 'foobar9000');
        // storage.testEmitWillSaveState(WillSaveStateReason.NONE);
        await storage.flush();
        assert.deepStrictEqual(storage.getObject('mcp.sampling.logs', -1 /* StorageScope.APPLICATION */), [
            [
                'testServer',
                {
                    head: 19631,
                    bins: [1, 0, 0, 0, 0, 0, 0],
                    lastReqs: [
                        {
                            request: [{ role: 'user', content: { type: 'text', text: 'test request' } }],
                            response: 'test response here',
                            at: 1696118400000,
                            model: 'foobar9000',
                        },
                    ],
                },
            ],
        ]);
    });
    test('logs multiple requests on the same day', async () => {
        // First request
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'first request' } }], 'first response', 'foobar9000');
        // Advance time by a few hours but stay on the same day
        clock.tick(5 * 60 * 60 * 1000); // 5 hours
        // Second request
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'second request' } }], 'second response', 'foobar9000');
        await storage.flush();
        const data = storage.getObject('mcp.sampling.logs', -1 /* StorageScope.APPLICATION */)[0][1];
        // Verify the bin for the current day has 2 requests
        assert.strictEqual(data.bins[0], 2);
        // Verify both requests are in the lastReqs array, with the most recent first
        assert.strictEqual(data.lastReqs.length, 2);
        assert.strictEqual(data.lastReqs[0].request[0].content.text, 'second request');
        assert.strictEqual(data.lastReqs[1].request[0].content.text, 'first request');
    });
    test('shifts bins when adding requests on different days', async () => {
        // First request on day 1
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'day 1 request' } }], 'day 1 response', 'foobar9000');
        // Advance time to the next day
        clock.tick(24 * 60 * 60 * 1000);
        // Second request on day 2
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'day 2 request' } }], 'day 2 response', 'foobar9000');
        await storage.flush();
        const data = storage.getObject('mcp.sampling.logs', -1 /* StorageScope.APPLICATION */)[0][1];
        // Verify the bins: day 2 should have 1 request, day 1 should have 1 request
        assert.strictEqual(data.bins[0], 1); // day 2
        assert.strictEqual(data.bins[1], 1); // day 1
        // Advance time by 5 more days
        clock.tick(5 * 24 * 60 * 60 * 1000);
        // Request on day 7
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'day 7 request' } }], 'day 7 response', 'foobar9000');
        await storage.flush();
        const updatedData = storage.getObject('mcp.sampling.logs', -1 /* StorageScope.APPLICATION */)[0][1];
        // Verify the bins have shifted correctly
        assert.strictEqual(updatedData.bins[0], 1); // day 7
        assert.strictEqual(updatedData.bins[5], 1); // day 2
        assert.strictEqual(updatedData.bins[6], 1); // day 1
    });
    test('limits the number of stored requests', async () => {
        // Add more than the maximum number of requests (Constants.SamplingLastNMessage = 30)
        for (let i = 0; i < 35; i++) {
            log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: `request ${i}` } }], `response ${i}`, 'foobar9000');
        }
        await storage.flush();
        const data = storage.getObject('mcp.sampling.logs', -1 /* StorageScope.APPLICATION */)[0][1];
        // Verify only the last 30 requests are kept
        assert.strictEqual(data.lastReqs.length, 30);
        assert.strictEqual(data.lastReqs[0].request[0].content.text, 'request 34');
        assert.strictEqual(data.lastReqs[29].request[0].content.text, 'request 5');
    });
    test('handles different content types', async () => {
        // Add a request with text content
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'text request' } }], 'text response', 'foobar9000');
        // Add a request with image content
        log.add(fakeServer, [{
                role: 'user',
                content: {
                    type: 'image',
                    data: 'base64data',
                    mimeType: 'image/png'
                }
            }], 'image response', 'foobar9000');
        // Add a request with mixed content
        log.add(fakeServer, [
            { role: 'user', content: { type: 'text', text: 'text and image' } },
            {
                role: 'assistant',
                content: {
                    type: 'image',
                    data: 'base64data',
                    mimeType: 'image/jpeg'
                }
            }
        ], 'mixed response', 'foobar9000');
        await storage.flush();
        const data = storage.getObject('mcp.sampling.logs', -1 /* StorageScope.APPLICATION */)[0][1];
        // Verify all requests are stored correctly
        assert.strictEqual(data.lastReqs.length, 3);
        assert.strictEqual(data.lastReqs[0].request.length, 2); // Mixed content request has 2 messages
        assert.strictEqual(data.lastReqs[1].request[0].content.type, 'image');
        assert.strictEqual(data.lastReqs[2].request[0].content.type, 'text');
    });
    test('handles multiple servers', async () => {
        const fakeServer2 = {
            definition: { id: 'testServer2' },
            readDefinitions: () => ({
                get: () => ({ collection: { scope: -1 /* StorageScope.APPLICATION */ } }),
            }),
        };
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'server1 request' } }], 'server1 response', 'foobar9000');
        log.add(fakeServer2, [{ role: 'user', content: { type: 'text', text: 'server2 request' } }], 'server2 response', 'foobar9000');
        await storage.flush();
        const storageData = storage.getObject('mcp.sampling.logs', -1 /* StorageScope.APPLICATION */);
        // Verify both servers have their data stored
        assert.strictEqual(storageData.length, 2);
        assert.strictEqual(storageData[0][0], 'testServer');
        assert.strictEqual(storageData[1][0], 'testServer2');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2FtcGxpbmdMb2cudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC90ZXN0L2NvbW1vbi9tY3BTYW1wbGluZ0xvZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFDO0FBQy9CLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBSW5HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3RGLE9BQU8sRUFBdUIsY0FBYyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHckYsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNoQyxNQUFNLEVBQUUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBQ3JELE1BQU0sVUFBVSxHQUFlO1FBQzlCLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxZQUFZLEVBQUU7UUFDaEMsZUFBZSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDdkIsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxLQUFLLG1DQUEwQixFQUFFLEVBQUUsQ0FBQztTQUNoRSxDQUFDO0tBQ1ksQ0FBQztJQUVoQixJQUFJLEdBQW1CLENBQUM7SUFDeEIsSUFBSSxPQUEyQixDQUFDO0lBQ2hDLElBQUksS0FBNEIsQ0FBQztJQUVqQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsT0FBTyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFDM0MsR0FBRyxHQUFHLEVB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