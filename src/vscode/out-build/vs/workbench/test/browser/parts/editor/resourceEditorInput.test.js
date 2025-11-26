/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { workbenchInstantiationService } from '../../workbenchTestServices.js';
import { AbstractResourceEditorInput } from '../../../../common/editor/resourceEditorInput.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { CustomEditorLabelService, ICustomEditorLabelService } from '../../../../services/editor/common/customEditorLabelService.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
suite('ResourceEditorInput', () => {
    const disposables = new DisposableStore();
    let TestResourceEditorInput = class TestResourceEditorInput extends AbstractResourceEditorInput {
        constructor(resource, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService) {
            super(resource, resource, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
            this.typeId = 'test.typeId';
        }
    };
    TestResourceEditorInput = __decorate([
        __param(1, ILabelService),
        __param(2, IFileService),
        __param(3, IFilesConfigurationService),
        __param(4, ITextResourceConfigurationService),
        __param(5, ICustomEditorLabelService)
    ], TestResourceEditorInput);
    async function createServices() {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const testConfigurationService = new TestConfigurationService();
        instantiationService.stub(IConfigurationService, testConfigurationService);
        const customEditorLabelService = disposables.add(new CustomEditorLabelService(testConfigurationService, instantiationService.get(IWorkspaceContextService)));
        instantiationService.stub(ICustomEditorLabelService, customEditorLabelService);
        return [instantiationService, testConfigurationService, customEditorLabelService];
    }
    teardown(() => {
        disposables.clear();
    });
    test('basics', async () => {
        const [instantiationService] = await createServices();
        const resource = URI.from({ scheme: 'testResource', path: 'thePath/of/the/resource.txt' });
        const input = disposables.add(instantiationService.createInstance(TestResourceEditorInput, resource));
        assert.ok(input.getName().length > 0);
        assert.ok(input.getDescription(0 /* Verbosity.SHORT */).length > 0);
        assert.ok(input.getDescription(1 /* Verbosity.MEDIUM */).length > 0);
        assert.ok(input.getDescription(2 /* Verbosity.LONG */).length > 0);
        assert.ok(input.getTitle(0 /* Verbosity.SHORT */).length > 0);
        assert.ok(input.getTitle(1 /* Verbosity.MEDIUM */).length > 0);
        assert.ok(input.getTitle(2 /* Verbosity.LONG */).length > 0);
        assert.strictEqual(input.hasCapability(2 /* EditorInputCapabilities.Readonly */), false);
        assert.strictEqual(input.isReadonly(), false);
        assert.strictEqual(input.hasCapability(4 /* EditorInputCapabilities.Untitled */), true);
    });
    test('custom editor name', async () => {
        const [instantiationService, testConfigurationService, customEditorLabelService] = await createServices();
        const resource1 = URI.from({ scheme: 'testResource', path: 'thePath/of/the/resource.txt' });
        const resource2 = URI.from({ scheme: 'testResource', path: 'theOtherPath/of/the/resource.md' });
        const input1 = disposables.add(instantiationService.createInstance(TestResourceEditorInput, resource1));
        const input2 = disposables.add(instantiationService.createInstance(TestResourceEditorInput, resource2));
        await testConfigurationService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_PATTERNS, {
            '**/theOtherPath/**': 'Label 1',
            '**/*.txt': 'Label 2',
            '**/resource.txt': 'Label 3',
        });
        // eslint-disable-next-line local/code-no-any-casts
        testConfigurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration(configuration) { return configuration === CustomEditorLabelService.SETTING_ID_PATTERNS; }, source: 2 /* ConfigurationTarget.USER */ });
        let label1Name = '';
        let label2Name = '';
        disposables.add(customEditorLabelService.onDidChange(() => {
            label1Name = input1.getName();
            label2Name = input2.getName();
        }));
        await testConfigurationService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_ENABLED, true);
        // eslint-disable-next-line local/code-no-any-casts
        testConfigurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration(configuration) { return configuration === CustomEditorLabelService.SETTING_ID_ENABLED; }, source: 2 /* ConfigurationTarget.USER */ });
        assert.ok(label1Name === 'Label 3');
        assert.ok(label2Name === 'Label 1');
        await testConfigurationService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_ENABLED, false);
        // eslint-disable-next-line local/code-no-any-casts
        testConfigurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration(configuration) { return configuration === CustomEditorLabelService.SETTING_ID_ENABLED; }, source: 2 /* ConfigurationTarget.USER */ });
        assert.ok(label1Name === 'resource.txt');
        assert.ok(label2Name === 'resource.md');
        await testConfigurationService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_ENABLED, true);
        // eslint-disable-next-line local/code-no-any-casts
        testConfigurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration(configuration) { return configuration === CustomEditorLabelService.SETTING_ID_ENABLED; }, source: 2 /* ConfigurationTarget.USER */ });
        await testConfigurationService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_PATTERNS, {
            'thePath/**/resource.txt': 'Label 4',
            'thePath/of/*/resource.txt': 'Label 5',
        });
        // eslint-disable-next-line local/code-no-any-casts
        testConfigurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration(configuration) { return configuration === CustomEditorLabelService.SETTING_ID_PATTERNS; }, source: 2 /* ConfigurationTarget.USER */ });
        assert.ok(label1Name === 'Label 5');
        assert.ok(label2Name === 'resource.md');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=resourceEditorInput.test.js.map