/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as cp from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { dirname, join } from '../../../../../base/common/path.js';
import { FileAccess } from '../../../../../base/common/network.js';
import * as util from 'util';
const exec = util.promisify(cp.exec);
suite('PolicyExport Integration Tests', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('exported policy data matches checked-in file', async function () {
        // Skip this test in ADO pipelines
        if (process.env['TF_BUILD']) {
            this.skip();
        }
        // This test launches VS Code with --export-policy-data flag, so it takes longer
        this.timeout(60000);
        // Get the repository root (FileAccess.asFileUri('') points to the 'out' directory)
        const rootPath = dirname(FileAccess.asFileUri('').fsPath);
        const checkedInFile = join(rootPath, 'build/lib/policies/policyData.jsonc');
        const tempFile = join(os.tmpdir(), `policyData-test-${Date.now()}.jsonc`);
        try {
            // Launch VS Code with --export-policy-data flag
            const scriptPath = isWindows
                ? join(rootPath, 'scripts', 'code.bat')
                : join(rootPath, 'scripts', 'code.sh');
            await exec(`"${scriptPath}" --export-policy-data="${tempFile}"`, {
                cwd: rootPath
            });
            // Read both files
            const [exportedContent, checkedInContent] = await Promise.all([
                fs.readFile(tempFile, 'utf-8'),
                fs.readFile(checkedInFile, 'utf-8')
            ]);
            // Compare contents
            assert.strictEqual(exportedContent, checkedInContent, 'Exported policy data should match the checked-in file. If this fails, run: ./scripts/code.sh --export-policy-data');
        }
        finally {
            // Clean up temp file
            try {
                await fs.unlink(tempFile);
            }
            catch {
                // Ignore cleanup errors
            }
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9saWN5RXhwb3J0LmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3BvbGljeUV4cG9ydC90ZXN0L25vZGUvcG9saWN5RXhwb3J0LmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNwQyxPQUFPLEVBQUUsUUFBUSxJQUFJLEVBQUUsRUFBRSxNQUFNLElBQUksQ0FBQztBQUNwQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFFN0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFckMsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtJQUM1Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxLQUFLO1FBQ3pELGtDQUFrQztRQUNsQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDYixDQUFDO1FBRUQsZ0ZBQWdGO1FBQ2hGLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFcEIsbUZBQW1GO1FBQ25GLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUscUNBQXFDLENBQUMsQ0FBQztRQUM1RSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLG1CQUFtQixJQUFJLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRTFFLElBQUksQ0FBQztZQUNKLGdEQUFnRDtZQUNoRCxNQUFNLFVBQVUsR0FBRyxTQUFTO2dCQUMzQixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDO2dCQUN2QyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFeEMsTUFBTSxJQUFJLENBQUMsSUFBSSxVQUFVLDJCQUEyQixRQUFRLEdBQUcsRUFBRTtnQkFDaEUsR0FBRyxFQUFFLFFBQVE7YUFDYixDQUFDLENBQUM7WUFFSCxrQkFBa0I7WUFDbEIsTUFBTSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFDN0QsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDO2dCQUM5QixFQUFFLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUM7YUFDbkMsQ0FBQyxDQUFDO1lBRUgsbUJBQW1CO1lBQ25CLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGVBQWUsRUFDZixnQkFBZ0IsRUFDaEIsbUhBQW1ILENBQ25ILENBQUM7UUFDSCxDQUFDO2dCQUFTLENBQUM7WUFDVixxQkFBcUI7WUFDckIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzQixDQUFDO1lBQUMsTUFBTSxDQUFDO2dCQUNSLHdCQUF3QjtZQUN6QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==