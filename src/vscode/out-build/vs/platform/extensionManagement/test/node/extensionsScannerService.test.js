var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { dirname, joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { INativeEnvironmentService } from '../../../environment/common/environment.js';
import { IExtensionsProfileScannerService } from '../../common/extensionsProfileScannerService.js';
import { AbstractExtensionsScannerService, ExtensionScannerInput } from '../../common/extensionsScannerService.js';
import { ExtensionsProfileScannerService } from '../../node/extensionsProfileScannerService.js';
import { IFileService } from '../../../files/common/files.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { IInstantiationService } from '../../../instantiation/common/instantiation.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../log/common/log.js';
import { IProductService } from '../../../product/common/productService.js';
import { IUriIdentityService } from '../../../uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
import { IUserDataProfilesService, UserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
let translations = Object.create(null);
const ROOT = URI.file('/ROOT');
let ExtensionsScannerService = class ExtensionsScannerService extends AbstractExtensionsScannerService {
    constructor(userDataProfilesService, extensionsProfileScannerService, fileService, logService, nativeEnvironmentService, productService, uriIdentityService, instantiationService) {
        super(URI.file(nativeEnvironmentService.builtinExtensionsPath), URI.file(nativeEnvironmentService.extensionsPath), joinPath(nativeEnvironmentService.userHome, '.vscode-oss-dev', 'extensions', 'control.json'), userDataProfilesService.defaultProfile, userDataProfilesService, extensionsProfileScannerService, fileService, logService, nativeEnvironmentService, productService, uriIdentityService, instantiationService);
    }
    async getTranslations(language) {
        return translations;
    }
};
ExtensionsScannerService = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, IExtensionsProfileScannerService),
    __param(2, IFileService),
    __param(3, ILogService),
    __param(4, INativeEnvironmentService),
    __param(5, IProductService),
    __param(6, IUriIdentityService),
    __param(7, IInstantiationService)
], ExtensionsScannerService);
suite('NativeExtensionsScanerService Test', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        translations = {};
        instantiationService = disposables.add(new TestInstantiationService());
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        instantiationService.stub(ILogService, logService);
        instantiationService.stub(IFileService, fileService);
        const systemExtensionsLocation = joinPath(ROOT, 'system');
        const userExtensionsLocation = joinPath(ROOT, 'extensions');
        const environmentService = instantiationService.stub(INativeEnvironmentService, {
            userHome: ROOT,
            userRoamingDataHome: ROOT,
            builtinExtensionsPath: systemExtensionsLocation.fsPath,
            extensionsPath: userExtensionsLocation.fsPath,
            cacheHome: joinPath(ROOT, 'cache'),
        });
        instantiationService.stub(IProductService, { version: '1.66.0' });
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        instantiationService.stub(IUriIdentityService, uriIdentityService);
        const userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        instantiationService.stub(IUserDataProfilesService, userDataProfilesService);
        instantiationService.stub(IExtensionsProfileScannerService, disposables.add(new ExtensionsProfileScannerService(environmentService, fileService, userDataProfilesService, uriIdentityService, logService)));
        await fileService.createFolder(systemExtensionsLocation);
        await fileService.createFolder(userExtensionsLocation);
    });
    test('scan system extension', async () => {
        const manifest = anExtensionManifest({ 'name': 'name', 'publisher': 'pub' });
        const extensionLocation = await aSystemExtension(manifest);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanSystemExtensions({});
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].location.toString(), extensionLocation.toString());
        assert.deepStrictEqual(actual[0].isBuiltin, true);
        assert.deepStrictEqual(actual[0].type, 0 /* ExtensionType.System */);
        assert.deepStrictEqual(actual[0].isValid, true);
        assert.deepStrictEqual(actual[0].validations, []);
        assert.deepStrictEqual(actual[0].metadata, undefined);
        assert.deepStrictEqual(actual[0].targetPlatform, "undefined" /* TargetPlatform.UNDEFINED */);
        assert.deepStrictEqual(actual[0].manifest, manifest);
    });
    test('scan user extensions', async () => {
        const manifest = anExtensionManifest({ 'name': 'name', 'publisher': 'pub' });
        const extensionLocation = await aUserExtension(manifest);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions();
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].location.toString(), extensionLocation.toString());
        assert.deepStrictEqual(actual[0].isBuiltin, false);
        assert.deepStrictEqual(actual[0].type, 1 /* ExtensionType.User */);
        assert.deepStrictEqual(actual[0].isValid, true);
        assert.deepStrictEqual(actual[0].validations, []);
        assert.deepStrictEqual(actual[0].metadata, undefined);
        assert.deepStrictEqual(actual[0].targetPlatform, "undefined" /* TargetPlatform.UNDEFINED */);
        delete manifest.__metadata;
        assert.deepStrictEqual(actual[0].manifest, manifest);
    });
    test('scan existing extension', async () => {
        const manifest = anExtensionManifest({ 'name': 'name', 'publisher': 'pub' });
        const extensionLocation = await aUserExtension(manifest);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanExistingExtension(extensionLocation, 1 /* ExtensionType.User */, {});
        assert.notEqual(actual, null);
        assert.deepStrictEqual(actual.identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual.location.toString(), extensionLocation.toString());
        assert.deepStrictEqual(actual.isBuiltin, false);
        assert.deepStrictEqual(actual.type, 1 /* ExtensionType.User */);
        assert.deepStrictEqual(actual.isValid, true);
        assert.deepStrictEqual(actual.validations, []);
        assert.deepStrictEqual(actual.metadata, undefined);
        assert.deepStrictEqual(actual.targetPlatform, "undefined" /* TargetPlatform.UNDEFINED */);
        assert.deepStrictEqual(actual.manifest, manifest);
    });
    test('scan single extension', async () => {
        const manifest = anExtensionManifest({ 'name': 'name', 'publisher': 'pub' });
        const extensionLocation = await aUserExtension(manifest);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanOneOrMultipleExtensions(extensionLocation, 1 /* ExtensionType.User */, {});
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].location.toString(), extensionLocation.toString());
        assert.deepStrictEqual(actual[0].isBuiltin, false);
        assert.deepStrictEqual(actual[0].type, 1 /* ExtensionType.User */);
        assert.deepStrictEqual(actual[0].isValid, true);
        assert.deepStrictEqual(actual[0].validations, []);
        assert.deepStrictEqual(actual[0].metadata, undefined);
        assert.deepStrictEqual(actual[0].targetPlatform, "undefined" /* TargetPlatform.UNDEFINED */);
        assert.deepStrictEqual(actual[0].manifest, manifest);
    });
    test('scan multiple extensions', async () => {
        const extensionLocation = await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub' }));
        await aUserExtension(anExtensionManifest({ 'name': 'name2', 'publisher': 'pub' }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanOneOrMultipleExtensions(dirname(extensionLocation), 1 /* ExtensionType.User */, {});
        assert.deepStrictEqual(actual.length, 2);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[1].identifier, { id: 'pub.name2' });
    });
    test('scan all user extensions with different versions', async () => {
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', version: '1.0.1' }));
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', version: '1.0.2' }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions({ includeAllVersions: false, includeInvalid: false });
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].manifest.version, '1.0.2');
    });
    test('scan all user extensions include all versions', async () => {
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', version: '1.0.1' }));
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', version: '1.0.2' }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions();
        assert.deepStrictEqual(actual.length, 2);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].manifest.version, '1.0.1');
        assert.deepStrictEqual(actual[1].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[1].manifest.version, '1.0.2');
    });
    test('scan all user extensions with different versions and higher version is not compatible', async () => {
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', version: '1.0.1' }));
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', version: '1.0.2', engines: { vscode: '^1.67.0' } }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions({ includeAllVersions: false, includeInvalid: false });
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].manifest.version, '1.0.1');
    });
    test('scan all user extensions exclude invalid extensions', async () => {
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub' }));
        await aUserExtension(anExtensionManifest({ 'name': 'name2', 'publisher': 'pub', engines: { vscode: '^1.67.0' } }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions({ includeAllVersions: false, includeInvalid: false });
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
    });
    test('scan all user extensions include invalid extensions', async () => {
        await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub' }));
        await aUserExtension(anExtensionManifest({ 'name': 'name2', 'publisher': 'pub', engines: { vscode: '^1.67.0' } }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions({ includeAllVersions: false, includeInvalid: true });
        assert.deepStrictEqual(actual.length, 2);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[1].identifier, { id: 'pub.name2' });
    });
    test('scan system extensions include additional builtin extensions', async () => {
        instantiationService.stub(IProductService, {
            version: '1.66.0',
            builtInExtensions: [
                { name: 'pub.name2', version: '', repo: '', metadata: undefined },
                { name: 'pub.name', version: '', repo: '', metadata: undefined }
            ]
        });
        await anExtension(anExtensionManifest({ 'name': 'name2', 'publisher': 'pub' }), joinPath(ROOT, 'additional'));
        const extensionLocation = await anExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub' }), joinPath(ROOT, 'additional'));
        await aSystemExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', version: '1.0.1' }));
        await instantiationService.get(IFileService).writeFile(joinPath(instantiationService.get(INativeEnvironmentService).userHome, '.vscode-oss-dev', 'extensions', 'control.json'), VSBuffer.fromString(JSON.stringify({ 'pub.name2': 'disabled', 'pub.name': extensionLocation.fsPath })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanSystemExtensions({ checkControlFile: true });
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].manifest.version, '1.0.0');
    });
    test('scan all user extensions with default nls replacements', async () => {
        const extensionLocation = await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', displayName: '%displayName%' }));
        await instantiationService.get(IFileService).writeFile(joinPath(extensionLocation, 'package.nls.json'), VSBuffer.fromString(JSON.stringify({ displayName: 'Hello World' })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions();
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].manifest.displayName, 'Hello World');
    });
    test('scan extension with en nls replacements', async () => {
        const extensionLocation = await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', displayName: '%displayName%' }));
        await instantiationService.get(IFileService).writeFile(joinPath(extensionLocation, 'package.nls.json'), VSBuffer.fromString(JSON.stringify({ displayName: 'Hello World' })));
        const nlsLocation = joinPath(extensionLocation, 'package.en.json');
        await instantiationService.get(IFileService).writeFile(nlsLocation, VSBuffer.fromString(JSON.stringify({ contents: { package: { displayName: 'Hello World EN' } } })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        translations = { 'pub.name': nlsLocation.fsPath };
        const actual = await testObject.scanExistingExtension(extensionLocation, 1 /* ExtensionType.User */, { language: 'en' });
        assert.ok(actual !== null);
        assert.deepStrictEqual(actual.identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual.manifest.displayName, 'Hello World EN');
    });
    test('scan extension falls back to default nls replacements', async () => {
        const extensionLocation = await aUserExtension(anExtensionManifest({ 'name': 'name', 'publisher': 'pub', displayName: '%displayName%' }));
        await instantiationService.get(IFileService).writeFile(joinPath(extensionLocation, 'package.nls.json'), VSBuffer.fromString(JSON.stringify({ displayName: 'Hello World' })));
        const nlsLocation = joinPath(extensionLocation, 'package.en.json');
        await instantiationService.get(IFileService).writeFile(nlsLocation, VSBuffer.fromString(JSON.stringify({ contents: { package: { displayName: 'Hello World EN' } } })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        translations = { 'pub.name2': nlsLocation.fsPath };
        const actual = await testObject.scanExistingExtension(extensionLocation, 1 /* ExtensionType.User */, { language: 'en' });
        assert.ok(actual !== null);
        assert.deepStrictEqual(actual.identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual.manifest.displayName, 'Hello World');
    });
    test('scan single extension with manifest metadata retains manifest metadata', async () => {
        const manifest = anExtensionManifest({ 'name': 'name', 'publisher': 'pub' });
        const expectedMetadata = { size: 12345, installedTimestamp: 1234567890, targetPlatform: "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */ };
        const extensionLocation = await aUserExtension({
            ...manifest,
            __metadata: expectedMetadata
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanExistingExtension(extensionLocation, 1 /* ExtensionType.User */, {});
        assert.notStrictEqual(actual, null);
        assert.deepStrictEqual(actual.identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual.location.toString(), extensionLocation.toString());
        assert.deepStrictEqual(actual.isBuiltin, false);
        assert.deepStrictEqual(actual.type, 1 /* ExtensionType.User */);
        assert.deepStrictEqual(actual.isValid, true);
        assert.deepStrictEqual(actual.validations, []);
        assert.deepStrictEqual(actual.metadata, expectedMetadata);
        assert.deepStrictEqual(actual.manifest, manifest);
    });
    async function aUserExtension(manifest) {
        const environmentService = instantiationService.get(INativeEnvironmentService);
        return anExtension(manifest, URI.file(environmentService.extensionsPath));
    }
    async function aSystemExtension(manifest) {
        const environmentService = instantiationService.get(INativeEnvironmentService);
        return anExtension(manifest, URI.file(environmentService.builtinExtensionsPath));
    }
    async function anExtension(manifest, root) {
        const fileService = instantiationService.get(IFileService);
        const extensionLocation = joinPath(root, `${manifest.publisher}.${manifest.name}-${manifest.version}`);
        await fileService.writeFile(joinPath(extensionLocation, 'package.json'), VSBuffer.fromString(JSON.stringify(manifest)));
        return extensionLocation;
    }
    function anExtensionManifest(manifest) {
        return { engines: { vscode: '^1.66.0' }, version: '1.0.0', main: 'main.js', activationEvents: ['*'], ...manifest };
    }
});
suite('ExtensionScannerInput', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('compare inputs - location', () => {
        const anInput = (location, mtime) => new ExtensionScannerInput(location, mtime, undefined, undefined, false, undefined, 1 /* ExtensionType.User */, true, '1.1.1', undefined, undefined, true, undefined, {});
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, undefined), anInput(ROOT, undefined)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, 100), anInput(ROOT, 100)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(joinPath(ROOT, 'foo'), undefined), anInput(ROOT, undefined)), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, 100), anInput(ROOT, 200)), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, undefined), anInput(ROOT, 200)), false);
    });
    test('compare inputs - application location', () => {
        const anInput = (location, mtime) => new ExtensionScannerInput(ROOT, undefined, location, mtime, false, undefined, 1 /* ExtensionType.User */, true, '1.1.1', undefined, undefined, true, undefined, {});
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, undefined), anInput(ROOT, undefined)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, 100), anInput(ROOT, 100)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(joinPath(ROOT, 'foo'), undefined), anInput(ROOT, undefined)), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, 100), anInput(ROOT, 200)), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, undefined), anInput(ROOT, 200)), false);
    });
    test('compare inputs - profile', () => {
        const anInput = (profile, profileScanOptions) => new ExtensionScannerInput(ROOT, undefined, undefined, undefined, profile, profileScanOptions, 1 /* ExtensionType.User */, true, '1.1.1', undefined, undefined, true, undefined, {});
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, { bailOutWhenFileNotFound: true }), anInput(true, { bailOutWhenFileNotFound: true })), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(false, { bailOutWhenFileNotFound: true }), anInput(false, { bailOutWhenFileNotFound: true })), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, { bailOutWhenFileNotFound: false }), anInput(true, { bailOutWhenFileNotFound: false })), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, {}), anInput(true, {})), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, { bailOutWhenFileNotFound: true }), anInput(true, { bailOutWhenFileNotFound: false })), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, {}), anInput(true, { bailOutWhenFileNotFound: true })), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, undefined), anInput(true, {})), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(false, { bailOutWhenFileNotFound: true }), anInput(true, { bailOutWhenFileNotFound: true })), false);
    });
    test('compare inputs - extension type', () => {
        const anInput = (type) => new ExtensionScannerInput(ROOT, undefined, undefined, undefined, false, undefined, type, true, '1.1.1', undefined, undefined, true, undefined, {});
        assert.strictEqual(ExtensionScannerInput.equals(anInput(0 /* ExtensionType.System */), anInput(0 /* ExtensionType.System */)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(1 /* ExtensionType.User */), anInput(1 /* ExtensionType.User */)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(1 /* ExtensionType.User */), anInput(0 /* ExtensionType.System */)), false);
    });
});
//# sourceMappingURL=extensionsScannerService.test.js.map