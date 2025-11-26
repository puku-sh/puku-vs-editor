/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TreeFindMatchType, TreeFindMode } from '../../../../../base/browser/ui/tree/abstractTree.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { basename } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { WorkbenchCompressibleAsyncDataTree } from '../../../../../platform/list/browser/listService.js';
import { ISearchService } from '../../../../services/search/common/search.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { NullFilesConfigurationService, TestFileService } from '../../../../test/common/workbenchTestServices.js';
import { IExplorerService } from '../../browser/files.js';
import { ExplorerFindProvider } from '../../browser/views/explorerViewer.js';
import { ExplorerItem } from '../../common/explorerModel.js';
function find(element, id) {
    if (element.name === id) {
        return element;
    }
    if (!element.children) {
        return undefined;
    }
    for (const child of element.children.values()) {
        const result = find(child, id);
        if (result) {
            return result;
        }
    }
    return undefined;
}
class Renderer {
    constructor() {
        this.templateId = 'default';
    }
    renderTemplate(container) {
        return container;
    }
    renderElement(element, index, templateData) {
        templateData.textContent = element.element.name;
    }
    disposeTemplate(templateData) {
        // noop
    }
    renderCompressedElements(node, index, templateData) {
        const result = [];
        for (const element of node.element.elements) {
            result.push(element.name);
        }
        templateData.textContent = result.join('/');
    }
}
class IdentityProvider {
    getId(element) {
        return {
            toString: () => { return element.name; }
        };
    }
}
class VirtualDelegate {
    getHeight() { return 20; }
    getTemplateId(element) { return 'default'; }
}
class DataSource {
    hasChildren(element) {
        return !!element.children && element.children.size > 0;
    }
    getChildren(element) {
        return Promise.resolve(Array.from(element.children.values()) || []);
    }
    getParent(element) {
        return element.parent;
    }
}
class AccessibilityProvider {
    getWidgetAriaLabel() {
        return '';
    }
    getAriaLabel(stat) {
        return stat.name;
    }
}
class KeyboardNavigationLabelProvider {
    getKeyboardNavigationLabel(stat) {
        return stat.name;
    }
    getCompressedNodeKeyboardNavigationLabel(stats) {
        return stats.map(stat => stat.name).join('/');
    }
}
class CompressionDelegate {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    isIncompressible(element) {
        return !this.dataSource.hasChildren(element);
    }
}
class TestFilesFilter {
    filter() { return true; }
    isIgnored() { return false; }
    dispose() { }
}
suite('Find Provider - ExplorerView', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const fileService = new TestFileService();
    const configService = new TestConfigurationService();
    function createStat(path, isFolder) {
        return new ExplorerItem(URI.from({ scheme: 'file', path }), fileService, configService, NullFilesConfigurationService, undefined, isFolder);
    }
    let root;
    let instantiationService;
    const searchMappings = new Map([
        ['bb', [URI.file('/root/b/bb/bbb.txt'), URI.file('/root/a/ab/abb.txt'), URI.file('/root/b/bb/bba.txt')]],
    ]);
    setup(() => {
        root = createStat.call(this, '/root', true);
        const a = createStat.call(this, '/root/a', true);
        const aa = createStat.call(this, '/root/a/aa', true);
        const ab = createStat.call(this, '/root/a/ab', true);
        const aba = createStat.call(this, '/root/a/ab/aba.txt', false);
        const abb = createStat.call(this, '/root/a/ab/abb.txt', false);
        const b = createStat.call(this, '/root/b', true);
        const ba = createStat.call(this, '/root/b/ba', true);
        const baa = createStat.call(this, '/root/b/ba/baa.txt', false);
        const bab = createStat.call(this, '/root/b/ba/bab.txt', false);
        const bb = createStat.call(this, '/root/b/bb', true);
        root.addChild(a);
        a.addChild(aa);
        a.addChild(ab);
        ab.addChild(aba);
        ab.addChild(abb);
        root.addChild(b);
        b.addChild(ba);
        ba.addChild(baa);
        ba.addChild(bab);
        b.addChild(bb);
        instantiationService = workbenchInstantiationService(undefined, disposables);
        instantiationService.stub(IExplorerService, {
            roots: [root],
            refresh: () => Promise.resolve(),
            findClosest: (resource) => {
                return find(root, basename(resource)) ?? null;
            },
        });
        instantiationService.stub(ISearchService, {
            fileSearch(query, token) {
                const filePattern = query.filePattern?.replace(/\//g, '')
                    .replace(/\*/g, '')
                    .replace(/\[/g, '')
                    .replace(/\]/g, '')
                    .replace(/[A-Z]/g, '') ?? '';
                const fileMatches = (searchMappings.get(filePattern) ?? []).map(u => ({ resource: u }));
                return Promise.resolve({ results: fileMatches, messages: [] });
            },
            schemeHasFileSearchProvider() {
                return true;
            }
        });
    });
    test('find provider', async function () {
        const disposables = new DisposableStore();
        // Tree Stuff
        const container = document.createElement('div');
        const dataSource = new DataSource();
        const compressionDelegate = new CompressionDelegate(dataSource);
        const keyboardNavigationLabelProvider = new KeyboardNavigationLabelProvider();
        const accessibilityProvider = new AccessibilityProvider();
        const filter = instantiationService.createInstance(TestFilesFilter);
        const options = { identityProvider: new IdentityProvider(), keyboardNavigationLabelProvider, accessibilityProvider };
        const tree = disposables.add(instantiationService.createInstance((WorkbenchCompressibleAsyncDataTree), 'test', container, new VirtualDelegate(), compressionDelegate, [new Renderer()], dataSource, options));
        tree.layout(200);
        await tree.setInput(root);
        const findProvider = instantiationService.createInstance(ExplorerFindProvider, filter, () => tree);
        findProvider.startSession();
        assert.strictEqual(find(root, 'abb.txt') !== undefined, true);
        assert.strictEqual(find(root, 'bba.txt') !== undefined, false);
        assert.strictEqual(find(root, 'bbb.txt') !== undefined, false);
        assert.strictEqual(find(root, 'abb.txt')?.isMarkedAsFiltered(), false);
        assert.strictEqual(find(root, 'a')?.isMarkedAsFiltered(), false);
        assert.strictEqual(find(root, 'ab')?.isMarkedAsFiltered(), false);
        await findProvider.find('bb', { matchType: TreeFindMatchType.Contiguous, findMode: TreeFindMode.Filter }, new CancellationTokenSource().token);
        assert.strictEqual(find(root, 'abb.txt') !== undefined, true);
        assert.strictEqual(find(root, 'bba.txt') !== undefined, true);
        assert.strictEqual(find(root, 'bbb.txt') !== undefined, true);
        assert.strictEqual(find(root, 'abb.txt')?.isMarkedAsFiltered(), true);
        assert.strictEqual(find(root, 'bba.txt')?.isMarkedAsFiltered(), true);
        assert.strictEqual(find(root, 'bbb.txt')?.isMarkedAsFiltered(), true);
        assert.strictEqual(find(root, 'a')?.isMarkedAsFiltered(), true);
        assert.strictEqual(find(root, 'ab')?.isMarkedAsFiltered(), true);
        assert.strictEqual(find(root, 'b')?.isMarkedAsFiltered(), true);
        assert.strictEqual(find(root, 'bb')?.isMarkedAsFiltered(), true);
        assert.strictEqual(find(root, 'aa')?.isMarkedAsFiltered(), false);
        assert.strictEqual(find(root, 'ba')?.isMarkedAsFiltered(), false);
        assert.strictEqual(find(root, 'aba.txt')?.isMarkedAsFiltered(), false);
        await findProvider.endSession();
        assert.strictEqual(find(root, 'abb.txt') !== undefined, true);
        assert.strictEqual(find(root, 'baa.txt') !== undefined, true);
        assert.strictEqual(find(root, 'baa.txt') !== undefined, true);
        assert.strictEqual(find(root, 'bba.txt') !== undefined, false);
        assert.strictEqual(find(root, 'bbb.txt') !== undefined, false);
        assert.strictEqual(find(root, 'a')?.isMarkedAsFiltered(), false);
        assert.strictEqual(find(root, 'ab')?.isMarkedAsFiltered(), false);
        assert.strictEqual(find(root, 'b')?.isMarkedAsFiltered(), false);
        assert.strictEqual(find(root, 'bb')?.isMarkedAsFiltered(), false);
        disposables.dispose();
    });
});
//# sourceMappingURL=explorerFindProvider.test.js.map