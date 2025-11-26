/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Extension } from '../../browser/extensionsWorkbenchService.js';
import { URI } from '../../../../../base/common/uri.js';
import { getGalleryExtensionId } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Extension Test', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(() => {
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(IProductService, { quality: 'insiders' });
    });
    test('extension is not outdated when there is no local and gallery', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, undefined, undefined, undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is not outdated when there is local and no gallery', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension(), undefined, undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is not outdated when there is no local and has gallery', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, undefined, aGalleryExtension(), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is not outdated when local and gallery are on same version', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension(), aGalleryExtension(), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is outdated when local is older than gallery', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }), aGalleryExtension('somext', { version: '1.0.1' }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is outdated when local is built in and older than gallery', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { type: 0 /* ExtensionType.System */ }), aGalleryExtension('somext', { version: '1.0.1' }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is not outdated when local is built in and older than gallery but product quality is stable', () => {
        instantiationService.stub(IProductService, { quality: 'stable' });
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { type: 0 /* ExtensionType.System */ }), aGalleryExtension('somext', { version: '1.0.1' }), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is outdated when local and gallery are on same version but on different target platforms', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', {}, { targetPlatform: "win32-arm64" /* TargetPlatform.WIN32_ARM64 */ }), aGalleryExtension('somext', {}, { targetPlatform: "win32-x64" /* TargetPlatform.WIN32_X64 */ }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is not outdated when local and gallery are on same version and local is on web', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', {}, { targetPlatform: "web" /* TargetPlatform.WEB */ }), aGalleryExtension('somext'), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is not outdated when local and gallery are on same version and gallery is on web', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext'), aGalleryExtension('somext', {}, { targetPlatform: "web" /* TargetPlatform.WEB */ }), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is not outdated when local is not pre-release but gallery is pre-release', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }), aGalleryExtension('somext', { version: '1.0.1' }, { isPreReleaseVersion: true }), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is outdated when local and gallery are pre-releases', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { preRelease: true, isPreReleaseVersion: true }), aGalleryExtension('somext', { version: '1.0.1' }, { isPreReleaseVersion: true }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is outdated when local was opted to pre-release but current version is not pre-release', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { preRelease: true, isPreReleaseVersion: false }), aGalleryExtension('somext', { version: '1.0.1' }, { isPreReleaseVersion: true }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is outdated when local is pre-release but gallery is not', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { preRelease: true, isPreReleaseVersion: true }), aGalleryExtension('somext', { version: '1.0.1' }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is outdated when local was opted pre-release but current version is not and gallery is not', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { preRelease: true, isPreReleaseVersion: false }), aGalleryExtension('somext', { version: '1.0.1' }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    function aLocalExtension(name = 'someext', manifest = {}, properties = {}) {
        manifest = { name, publisher: 'pub', version: '1.0.0', ...manifest };
        properties = {
            type: 1 /* ExtensionType.User */,
            location: URI.file(`pub.${name}`),
            identifier: { id: getGalleryExtensionId(manifest.publisher, manifest.name) },
            targetPlatform: "undefined" /* TargetPlatform.UNDEFINED */,
            ...properties
        };
        return Object.create({ manifest, ...properties });
    }
    function aGalleryExtension(name = 'somext', properties = {}, galleryExtensionProperties = {}) {
        const targetPlatform = galleryExtensionProperties.targetPlatform ?? "undefined" /* TargetPlatform.UNDEFINED */;
        const galleryExtension = Object.create({ name, publisher: 'pub', version: '1.0.0', allTargetPlatforms: [targetPlatform], properties: {}, assets: {}, ...properties });
        galleryExtension.properties = { ...galleryExtension.properties, dependencies: [], targetPlatform, ...galleryExtensionProperties };
        galleryExtension.identifier = { id: getGalleryExtensionId(galleryExtension.publisher, galleryExtension.name), uuid: generateUuid() };
        return galleryExtension;
    }
});
//# sourceMappingURL=extension.test.js.map