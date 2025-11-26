/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { isUUID } from '../../../../base/common/uuid.js';
import { mock } from '../../../../base/test/common/mock.js';
import { TestConfigurationService } from '../../../configuration/test/common/testConfigurationService.js';
import { sortExtensionVersions, filterLatestExtensionVersionsForTargetPlatform } from '../../common/extensionGalleryService.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
import product from '../../../product/common/product.js';
import { resolveMarketplaceHeaders } from '../../../externalServices/common/marketplace.js';
import { InMemoryStorageService } from '../../../storage/common/storage.js';
import { TELEMETRY_SETTING_ID } from '../../../telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../telemetry/common/telemetryUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
class EnvironmentServiceMock extends mock() {
    constructor(serviceMachineIdResource) {
        super();
        this.serviceMachineIdResource = serviceMachineIdResource;
        this.isBuilt = true;
    }
}
suite('Extension Gallery Service', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let fileService, environmentService, storageService, productService, configurationService;
    setup(() => {
        const serviceMachineIdResource = joinPath(URI.file('tests').with({ scheme: 'vscode-tests' }), 'machineid');
        environmentService = new EnvironmentServiceMock(serviceMachineIdResource);
        fileService = disposables.add(new FileService(new NullLogService()));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(serviceMachineIdResource.scheme, fileSystemProvider));
        storageService = disposables.add(new InMemoryStorageService());
        configurationService = new TestConfigurationService({ [TELEMETRY_SETTING_ID]: "all" /* TelemetryConfiguration.ON */ });
        configurationService.updateValue(TELEMETRY_SETTING_ID, "all" /* TelemetryConfiguration.ON */);
        productService = { _serviceBrand: undefined, ...product, enableTelemetry: true };
    });
    test('marketplace machine id', async () => {
        const headers = await resolveMarketplaceHeaders(product.version, productService, environmentService, configurationService, fileService, storageService, NullTelemetryService);
        assert.ok(headers['X-Market-User-Id']);
        assert.ok(isUUID(headers['X-Market-User-Id']));
        const headers2 = await resolveMarketplaceHeaders(product.version, productService, environmentService, configurationService, fileService, storageService, NullTelemetryService);
        assert.strictEqual(headers['X-Market-User-Id'], headers2['X-Market-User-Id']);
    });
    test('sorting single extension version without target platform', async () => {
        const actual = [aExtensionVersion('1.1.2')];
        const expected = [...actual];
        sortExtensionVersions(actual, "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting single extension version with preferred target platform', async () => {
        const actual = [aExtensionVersion('1.1.2', "darwin-x64" /* TargetPlatform.DARWIN_X64 */)];
        const expected = [...actual];
        sortExtensionVersions(actual, "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting single extension version with not compatible target platform', async () => {
        const actual = [aExtensionVersion('1.1.2', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */)];
        const expected = [...actual];
        sortExtensionVersions(actual, "win32-x64" /* TargetPlatform.WIN32_X64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions without target platforms', async () => {
        const actual = [aExtensionVersion('1.2.4'), aExtensionVersion('1.1.3'), aExtensionVersion('1.1.2'), aExtensionVersion('1.1.1')];
        const expected = [...actual];
        sortExtensionVersions(actual, "win32-arm64" /* TargetPlatform.WIN32_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions with target platforms - 1', async () => {
        const actual = [aExtensionVersion('1.2.4', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */), aExtensionVersion('1.2.4', "win32-arm64" /* TargetPlatform.WIN32_ARM64 */), aExtensionVersion('1.2.4', "linux-arm64" /* TargetPlatform.LINUX_ARM64 */), aExtensionVersion('1.1.3'), aExtensionVersion('1.1.2'), aExtensionVersion('1.1.1')];
        const expected = [actual[1], actual[0], actual[2], actual[3], actual[4], actual[5]];
        sortExtensionVersions(actual, "win32-arm64" /* TargetPlatform.WIN32_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions with target platforms - 2', async () => {
        const actual = [aExtensionVersion('1.2.4'), aExtensionVersion('1.2.3', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */), aExtensionVersion('1.2.3', "win32-arm64" /* TargetPlatform.WIN32_ARM64 */), aExtensionVersion('1.2.3', "linux-arm64" /* TargetPlatform.LINUX_ARM64 */), aExtensionVersion('1.1.2'), aExtensionVersion('1.1.1')];
        const expected = [actual[0], actual[3], actual[1], actual[2], actual[4], actual[5]];
        sortExtensionVersions(actual, "linux-arm64" /* TargetPlatform.LINUX_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions with target platforms - 3', async () => {
        const actual = [aExtensionVersion('1.2.4'), aExtensionVersion('1.1.2'), aExtensionVersion('1.1.1'), aExtensionVersion('1.0.0', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */), aExtensionVersion('1.0.0', "win32-arm64" /* TargetPlatform.WIN32_ARM64 */)];
        const expected = [actual[0], actual[1], actual[2], actual[4], actual[3]];
        sortExtensionVersions(actual, "win32-arm64" /* TargetPlatform.WIN32_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    function aExtensionVersion(version, targetPlatform) {
        return { version, targetPlatform };
    }
    function aPreReleaseExtensionVersion(version, targetPlatform) {
        return {
            version,
            targetPlatform,
            properties: [{ key: 'Microsoft.VisualStudio.Code.PreRelease', value: 'true' }]
        };
    }
    suite('filterLatestExtensionVersionsForTargetPlatform', () => {
        test('should return empty array for empty input', () => {
            const result = filterLatestExtensionVersionsForTargetPlatform([], "win32-x64" /* TargetPlatform.WIN32_X64 */, ["win32-x64" /* TargetPlatform.WIN32_X64 */]);
            assert.deepStrictEqual(result, []);
        });
        test('should return single version when only one version provided', () => {
            const versions = [aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */)];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            assert.deepStrictEqual(result, versions);
        });
        test('should filter out duplicate target platforms for release versions', () => {
            const version1 = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const version2 = aExtensionVersion('0.9.0', "win32-x64" /* TargetPlatform.WIN32_X64 */); // Same platform, older version
            const versions = [version1, version2];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should only include the first version (latest) for this platform
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0], version1);
        });
        test('should include one version per target platform for release versions', () => {
            const version1 = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const version2 = aExtensionVersion('1.0.0', "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
            const version3 = aExtensionVersion('1.0.0', "linux-x64" /* TargetPlatform.LINUX_X64 */);
            const versions = [version1, version2, version3];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */, "linux-x64" /* TargetPlatform.LINUX_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should include all three versions: WIN32_X64 (compatible, first of type) + DARWIN_X64 & LINUX_X64 (non-compatible)
            assert.strictEqual(result.length, 3);
            assert.ok(result.includes(version1)); // Compatible with target platform
            assert.ok(result.includes(version2)); // Non-compatible, included
            assert.ok(result.includes(version3)); // Non-compatible, included
        });
        test('should separate release and pre-release versions', () => {
            const releaseVersion = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const preReleaseVersion = aPreReleaseExtensionVersion('1.1.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const versions = [releaseVersion, preReleaseVersion];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should include both since they are different types (release vs pre-release)
            assert.strictEqual(result.length, 2);
            assert.ok(result.includes(releaseVersion));
            assert.ok(result.includes(preReleaseVersion));
        });
        test('should filter duplicate pre-release versions by target platform', () => {
            const preRelease1 = aPreReleaseExtensionVersion('1.1.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const preRelease2 = aPreReleaseExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */); // Same platform, older
            const versions = [preRelease1, preRelease2];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should only include the first pre-release version for this platform
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0], preRelease1);
        });
        test('should handle versions without target platform (UNDEFINED)', () => {
            const version1 = aExtensionVersion('1.0.0'); // No target platform specified
            const version2 = aExtensionVersion('0.9.0'); // No target platform specified
            const versions = [version1, version2];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should only include the first version since they both have UNDEFINED platform
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0], version1);
        });
        test('should handle mixed release and pre-release versions across multiple platforms', () => {
            const releaseWin = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const releaseMac = aExtensionVersion('1.0.0', "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
            const preReleaseWin = aPreReleaseExtensionVersion('1.1.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const preReleaseMac = aPreReleaseExtensionVersion('1.1.0', "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
            const oldReleaseWin = aExtensionVersion('0.9.0', "win32-x64" /* TargetPlatform.WIN32_X64 */); // Should be filtered out
            const versions = [releaseWin, releaseMac, preReleaseWin, preReleaseMac, oldReleaseWin];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should include: WIN32_X64 compatible (release + prerelease) + DARWIN_X64 non-compatible (all versions)
            assert.strictEqual(result.length, 4);
            assert.ok(result.includes(releaseWin)); // Compatible release
            assert.ok(result.includes(releaseMac)); // Non-compatible, included
            assert.ok(result.includes(preReleaseWin)); // Compatible pre-release
            assert.ok(result.includes(preReleaseMac)); // Non-compatible, included
            assert.ok(!result.includes(oldReleaseWin)); // Filtered (older compatible release)
        });
        test('should handle complex scenario with multiple versions and platforms', () => {
            const versions = [
                aExtensionVersion('2.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */),
                aExtensionVersion('2.0.0', "darwin-x64" /* TargetPlatform.DARWIN_X64 */),
                aExtensionVersion('1.9.0', "win32-x64" /* TargetPlatform.WIN32_X64 */), // Older release, same platform
                aPreReleaseExtensionVersion('2.1.0', "win32-x64" /* TargetPlatform.WIN32_X64 */),
                aPreReleaseExtensionVersion('2.0.5', "win32-x64" /* TargetPlatform.WIN32_X64 */), // Older pre-release, same platform
                aPreReleaseExtensionVersion('2.1.0', "linux-x64" /* TargetPlatform.LINUX_X64 */),
                aExtensionVersion('2.0.0'), // No platform specified
                aPreReleaseExtensionVersion('2.1.0'), // Pre-release, no platform specified
            ];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */, "linux-x64" /* TargetPlatform.LINUX_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Expected for WIN32_X64 target platform:
            // - Compatible (WIN32_X64 + UNDEFINED): Only first release and first pre-release
            // - Non-compatible: DARWIN_X64 release, LINUX_X64 pre-release
            // Total: 4 versions (1 compatible release + 1 compatible pre-release + 2 non-compatible)
            assert.strictEqual(result.length, 4);
            // Check specific versions are included
            assert.ok(result.includes(versions[0])); // 2.0.0 WIN32_X64 (first compatible release)
            assert.ok(result.includes(versions[1])); // 2.0.0 DARWIN_X64 (non-compatible)
            assert.ok(result.includes(versions[3])); // 2.1.0 WIN32_X64 (first compatible pre-release)
            assert.ok(result.includes(versions[5])); // 2.1.0 LINUX_X64 (non-compatible)
        });
        test('should handle UNDEFINED platform interaction with specific platforms', () => {
            // Test how UNDEFINED platform interacts with specific platforms
            const versions = [
                aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */),
                aExtensionVersion('1.0.0'), // UNDEFINED platform - compatible with all
            ];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Both are compatible with WIN32_X64, but only the first of each type should be included
            // Since both are release versions, only the first one should be included
            assert.strictEqual(result.length, 1);
            assert.ok(result.includes(versions[0])); // WIN32_X64 should be included (first release)
        });
        test('should handle higher version with specific platform vs lower version with universal platform', () => {
            // Scenario: newer version for specific platform vs older version with universal compatibility
            const higherVersionSpecificPlatform = aExtensionVersion('2.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const lowerVersionUniversal = aExtensionVersion('1.5.0'); // UNDEFINED/universal platform
            const versions = [higherVersionSpecificPlatform, lowerVersionUniversal];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Both are compatible with WIN32_X64, but only the first release version should be included
            assert.strictEqual(result.length, 1);
            assert.ok(result.includes(higherVersionSpecificPlatform)); // First compatible release
            assert.ok(!result.includes(lowerVersionUniversal)); // Filtered (second compatible release)
        });
        test('should handle lower version with specific platform vs higher version with universal platform', () => {
            // Reverse scenario: older version for specific platform vs newer version with universal compatibility
            const lowerVersionSpecificPlatform = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const higherVersionUniversal = aExtensionVersion('2.0.0'); // UNDEFINED/universal platform
            const versions = [lowerVersionSpecificPlatform, higherVersionUniversal];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Both are compatible with WIN32_X64, but only the first release version should be included
            assert.strictEqual(result.length, 1);
            assert.ok(result.includes(lowerVersionSpecificPlatform)); // First compatible release
            assert.ok(!result.includes(higherVersionUniversal)); // Filtered (second compatible release)
        });
        test('should handle multiple specific platforms vs universal platform with version differences', () => {
            // Complex scenario with multiple platforms and universal compatibility
            const versions = [
                aExtensionVersion('2.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */), // Highest version, specific platform
                aExtensionVersion('1.9.0', "darwin-x64" /* TargetPlatform.DARWIN_X64 */), // Lower version, different specific platform
                aExtensionVersion('1.8.0'), // Lowest version, universal platform
                aExtensionVersion('1.7.0', "win32-x64" /* TargetPlatform.WIN32_X64 */), // Even older, same platform as first - should be filtered
            ];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */, "linux-x64" /* TargetPlatform.LINUX_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should include:
            // - 2.0.0 WIN32_X64 (first compatible release for WIN32_X64)
            // - 1.9.0 DARWIN_X64 (non-compatible, included)
            // - 1.8.0 UNDEFINED (second compatible release, filtered)
            // Should NOT include:
            // - 1.7.0 WIN32_X64 (third compatible release, filtered)
            assert.strictEqual(result.length, 2);
            assert.ok(result.includes(versions[0])); // 2.0.0 WIN32_X64
            assert.ok(result.includes(versions[1])); // 1.9.0 DARWIN_X64
            assert.ok(!result.includes(versions[2])); // 1.8.0 UNDEFINED should be filtered
            assert.ok(!result.includes(versions[3])); // 1.7.0 WIN32_X64 should be filtered
        });
        test('should include universal platform when no specific platforms conflict', () => {
            // Test where universal platform is included because no specific platforms conflict
            const universalVersion = aExtensionVersion('1.0.0'); // UNDEFINED/universal platform
            const specificVersion = aExtensionVersion('1.0.0', "linux-arm64" /* TargetPlatform.LINUX_ARM64 */);
            const versions = [universalVersion, specificVersion];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */]; // Note: LINUX_ARM64 not in target platforms
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Universal is compatible with WIN32_X64, specific version is not compatible
            // So we should get: universal (first compatible release) + specific (non-compatible)
            assert.strictEqual(result.length, 2);
            assert.ok(result.includes(universalVersion)); // Compatible with WIN32_X64
            assert.ok(result.includes(specificVersion)); // Non-compatible, included
        });
        test('should preserve order of input when no filtering occurs', () => {
            const version1 = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const version2 = aExtensionVersion('1.0.0', "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
            const version3 = aPreReleaseExtensionVersion('1.1.0', "linux-x64" /* TargetPlatform.LINUX_X64 */);
            const versions = [version1, version2, version3];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */, "linux-x64" /* TargetPlatform.LINUX_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // For WIN32_X64 target: version1 (compatible release) + version2, version3 (non-compatible)
            assert.strictEqual(result.length, 3);
            assert.ok(result.includes(version1)); // Compatible release
            assert.ok(result.includes(version2)); // Non-compatible, included
            assert.ok(result.includes(version3)); // Non-compatible, included
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvdGVzdC9jb21tb24vZXh0ZW5zaW9uR2FsbGVyeVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDekQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRTVELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBRTFHLE9BQU8sRUFBK0IscUJBQXFCLEVBQUUsOENBQThDLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU3SixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzVELE9BQU8sT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBRXpELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxzQkFBc0IsRUFBbUIsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RixPQUFPLEVBQTBCLG9CQUFvQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFdEcsT0FBTyxFQUFFLG9CQUFvQixF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