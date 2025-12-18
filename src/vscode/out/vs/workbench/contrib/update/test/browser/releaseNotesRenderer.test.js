/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ContextMenuService } from '../../../../../platform/contextview/browser/contextMenuService.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { SimpleSettingRenderer } from '../../../markdown/browser/markdownSettingRenderer.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { renderReleaseNotesMarkdown } from '../../browser/releaseNotesEditor.js';
import { URI } from '../../../../../base/common/uri.js';
import { Emitter } from '../../../../../base/common/event.js';
suite('Release notes renderer', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let extensionService;
    let languageService;
    setup(() => {
        instantiationService = store.add(new TestInstantiationService());
        extensionService = instantiationService.get(IExtensionService);
        languageService = instantiationService.get(ILanguageService);
        instantiationService.stub(IContextMenuService, store.add(instantiationService.createInstance(ContextMenuService)));
    });
    test('Should render TOC', async () => {
        const content = `<table class="highlights-table">
	<tr>
		<th>a</th>
	</tr>
</table>

<br>

> text

<!-- TOC
<div class="toc-nav-layout">
	<nav id="toc-nav">
		<div>In this update</div>
		<ul>
			<li><a href="#chat">test</a></li>
		</ul>
	</nav>
	<div class="notes-main">
Navigation End -->

## Test`;
        const result = await renderReleaseNotesMarkdown(content, extensionService, languageService, instantiationService.createInstance(SimpleSettingRenderer));
        await assertSnapshot(result.toString());
    });
    test('Should render code settings', async () => {
        // Stub preferences service with a known setting so the SimpleSettingRenderer treats it as valid
        const testSettingId = 'editor.wordWrap';
        instantiationService.stub(IPreferencesService, {
            _serviceBrand: undefined,
            onDidDefaultSettingsContentChanged: new Emitter().event,
            userSettingsResource: URI.parse('test://test'),
            workspaceSettingsResource: null,
            getFolderSettingsResource: () => null,
            createPreferencesEditorModel: async () => null,
            getDefaultSettingsContent: () => undefined,
            hasDefaultSettingsContent: () => false,
            createSettings2EditorModel: () => { throw new Error('not needed'); },
            openPreferences: async () => undefined,
            openRawDefaultSettings: async () => undefined,
            openSettings: async () => undefined,
            openApplicationSettings: async () => undefined,
            openUserSettings: async () => undefined,
            openRemoteSettings: async () => undefined,
            openWorkspaceSettings: async () => undefined,
            openFolderSettings: async () => undefined,
            openGlobalKeybindingSettings: async () => undefined,
            openDefaultKeybindingsFile: async () => undefined,
            openLanguageSpecificSettings: async () => undefined,
            getEditableSettingsURI: async () => null,
            getSetting: (id) => {
                if (id === testSettingId) {
                    // Provide the minimal fields accessed by SimpleSettingRenderer
                    return {
                        key: testSettingId,
                        value: 'off',
                        type: 'string'
                    };
                }
                return undefined;
            },
            createSplitJsonEditorInput: () => { throw new Error('not needed'); }
        });
        const content = `Here is a setting: \`setting(${testSettingId}:on)\` and another \`setting(${testSettingId}:off)\``;
        const result = await renderReleaseNotesMarkdown(content, extensionService, languageService, instantiationService.createInstance(SimpleSettingRenderer));
        await assertSnapshot(result.toString());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVsZWFzZU5vdGVzUmVuZGVyZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VwZGF0ZS90ZXN0L2Jyb3dzZXIvcmVsZWFzZU5vdGVzUmVuZGVyZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDakcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDakYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUc5RCxLQUFLLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO0lBQ3BDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxvQkFBOEMsQ0FBQztJQUNuRCxJQUFJLGdCQUFt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