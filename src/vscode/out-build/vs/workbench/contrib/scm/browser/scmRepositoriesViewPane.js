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
var ArtifactGroupRenderer_1, ArtifactRenderer_1;
import './media/scm.css';
import { localize } from '../../../../nls.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { append, $ } from '../../../../base/browser/dom.js';
import { WorkbenchCompressibleAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { ISCMService, ISCMViewService } from '../common/scm.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { combinedDisposable, Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { RepositoryActionRunner, RepositoryRenderer } from './scmRepositoryRenderer.js';
import { collectContextMenuActions, connectPrimaryMenu, getActionViewItemProvider, isSCMArtifactGroupTreeElement, isSCMArtifactNode, isSCMArtifactTreeElement, isSCMRepository } from './util.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { autorun, observableSignalFromEvent, runOnChange } from '../../../../base/common/observable.js';
import { Sequencer, Throttler } from '../../../../base/common/async.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { SCMViewService } from './scmViewService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ResourceTree } from '../../../../base/common/resourceTree.js';
import { URI } from '../../../../base/common/uri.js';
import { basename } from '../../../../base/common/resources.js';
import { Codicon } from '../../../../base/common/codicons.js';
class ListDelegate {
    getHeight() {
        return 22;
    }
    getTemplateId(element) {
        if (isSCMRepository(element)) {
            return RepositoryRenderer.TEMPLATE_ID;
        }
        else if (isSCMArtifactGroupTreeElement(element)) {
            return ArtifactGroupRenderer.TEMPLATE_ID;
        }
        else if (isSCMArtifactTreeElement(element) || isSCMArtifactNode(element)) {
            return ArtifactRenderer.TEMPLATE_ID;
        }
        else {
            throw new Error('Invalid tree element');
        }
    }
}
let ArtifactGroupRenderer = class ArtifactGroupRenderer {
    static { ArtifactGroupRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'artifactGroup'; }
    get templateId() { return ArtifactGroupRenderer_1.TEMPLATE_ID; }
    constructor(_contextMenuService, _contextKeyService, _keybindingService, _menuService, _commandService, _scmViewService, _telemetryService) {
        this._contextMenuService = _contextMenuService;
        this._contextKeyService = _contextKeyService;
        this._keybindingService = _keybindingService;
        this._menuService = _menuService;
        this._commandService = _commandService;
        this._scmViewService = _scmViewService;
        this._telemetryService = _telemetryService;
    }
    renderTemplate(container) {
        const element = append(container, $('.scm-artifact-group'));
        const icon = append(element, $('.icon'));
        const label = new IconLabel(element, { supportIcons: false });
        const actionsContainer = append(element, $('.actions'));
        const actionBar = new WorkbenchToolBar(actionsContainer, undefined, this._menuService, this._contextKeyService, this._contextMenuService, this._keybindingService, this._commandService, this._telemetryService);
        return { icon, label, actionBar, elementDisposables: new DisposableStore(), templateDisposable: combinedDisposable(label, actionBar) };
    }
    renderElement(node, index, templateData) {
        const provider = node.element.repository.provider;
        const artifactGroup = node.element.artifactGroup;
        templateData.icon.className = ThemeIcon.isThemeIcon(artifactGroup.icon)
            ? `icon ${ThemeIcon.asClassName(artifactGroup.icon)}`
            : '';
        templateData.label.setLabel(artifactGroup.name);
        const repositoryMenus = this._scmViewService.menus.getRepositoryMenus(provider);
        templateData.elementDisposables.add(connectPrimaryMenu(repositoryMenus.getArtifactGroupMenu(artifactGroup), primary => {
            templateData.actionBar.setActions(primary);
        }, 'inline', provider));
        templateData.actionBar.context = artifactGroup;
    }
    renderCompressedElements(node, index, templateData, details) {
        throw new Error('Should never happen since node is incompressible');
    }
    disposeElement(element, index, templateData, details) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
        templateData.templateDisposable.dispose();
    }
};
ArtifactGroupRenderer = ArtifactGroupRenderer_1 = __decorate([
    __param(0, IContextMenuService),
    __param(1, IContextKeyService),
    __param(2, IKeybindingService),
    __param(3, IMenuService),
    __param(4, ICommandService),
    __param(5, ISCMViewService),
    __param(6, ITelemetryService)
], ArtifactGroupRenderer);
let ArtifactRenderer = class ArtifactRenderer {
    static { ArtifactRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'artifact'; }
    get templateId() { return ArtifactRenderer_1.TEMPLATE_ID; }
    constructor(_contextMenuService, _contextKeyService, _keybindingService, _menuService, _commandService, _scmViewService, _telemetryService) {
        this._contextMenuService = _contextMenuService;
        this._contextKeyService = _contextKeyService;
        this._keybindingService = _keybindingService;
        this._menuService = _menuService;
        this._commandService = _commandService;
        this._scmViewService = _scmViewService;
        this._telemetryService = _telemetryService;
    }
    renderTemplate(container) {
        const element = append(container, $('.scm-artifact'));
        const icon = append(element, $('.icon'));
        const label = new IconLabel(element, { supportIcons: false });
        const actionsContainer = append(element, $('.actions'));
        const actionBar = new WorkbenchToolBar(actionsContainer, undefined, this._menuService, this._contextKeyService, this._contextMenuService, this._keybindingService, this._commandService, this._telemetryService);
        return { icon, label, actionBar, elementDisposables: new DisposableStore(), templateDisposable: combinedDisposable(label, actionBar) };
    }
    renderElement(nodeOrElement, index, templateData) {
        const artifactOrFolder = nodeOrElement.element;
        // Label
        if (isSCMArtifactTreeElement(artifactOrFolder)) {
            // Artifact
            const artifact = artifactOrFolder.artifact;
            const artifactIcon = artifact.icon ?? artifactOrFolder.group.icon;
            templateData.icon.className = ThemeIcon.isThemeIcon(artifactIcon)
                ? `icon ${ThemeIcon.asClassName(artifactIcon)}`
                : '';
            const artifactLabel = artifact.name.split('/').pop() ?? artifact.name;
            templateData.label.setLabel(artifactLabel, artifact.description);
        }
        else if (isSCMArtifactNode(artifactOrFolder)) {
            // Folder
            templateData.icon.className = `icon ${ThemeIcon.asClassName(Codicon.folder)}`;
            templateData.label.setLabel(basename(artifactOrFolder.uri));
        }
        // Actions
        this._renderActionBar(artifactOrFolder, templateData);
    }
    renderCompressedElements(node, index, templateData, details) {
        const compressed = node.element;
        const artifactOrFolder = compressed.elements[compressed.elements.length - 1];
        // Label
        if (isSCMArtifactTreeElement(artifactOrFolder)) {
            // Artifact
            const artifact = artifactOrFolder.artifact;
            const artifactIcon = artifact.icon ?? artifactOrFolder.group.icon;
            templateData.icon.className = ThemeIcon.isThemeIcon(artifactIcon)
                ? `icon ${ThemeIcon.asClassName(artifactIcon)}`
                : '';
            templateData.label.setLabel(artifact.name, artifact.description);
        }
        else if (isSCMArtifactNode(artifactOrFolder)) {
            // Folder
            templateData.icon.className = `icon ${ThemeIcon.asClassName(Codicon.folder)}`;
            templateData.label.setLabel(artifactOrFolder.uri.fsPath.substring(1));
        }
        // Actions
        this._renderActionBar(artifactOrFolder, templateData);
    }
    _renderActionBar(artifactOrFolder, templateData) {
        if (isSCMArtifactTreeElement(artifactOrFolder)) {
            const artifact = artifactOrFolder.artifact;
            const provider = artifactOrFolder.repository.provider;
            const repositoryMenus = this._scmViewService.menus.getRepositoryMenus(provider);
            templateData.elementDisposables.add(connectPrimaryMenu(repositoryMenus.getArtifactMenu(artifactOrFolder.group, artifact), primary => {
                templateData.actionBar.setActions(primary);
            }, 'inline', provider));
            templateData.actionBar.context = artifact;
        }
        else if (ResourceTree.isResourceNode(artifactOrFolder)) {
            templateData.actionBar.setActions([]);
            templateData.actionBar.context = undefined;
        }
    }
    disposeElement(element, index, templateData, details) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
        templateData.templateDisposable.dispose();
    }
};
ArtifactRenderer = ArtifactRenderer_1 = __decorate([
    __param(0, IContextMenuService),
    __param(1, IContextKeyService),
    __param(2, IKeybindingService),
    __param(3, IMenuService),
    __param(4, ICommandService),
    __param(5, ISCMViewService),
    __param(6, ITelemetryService)
], ArtifactRenderer);
let RepositoryTreeDataSource = class RepositoryTreeDataSource extends Disposable {
    constructor(scmViewService) {
        super();
        this.scmViewService = scmViewService;
    }
    async getChildren(inputOrElement) {
        if (this.scmViewService.explorerEnabledConfig.get() === false) {
            const parentId = isSCMRepository(inputOrElement)
                ? inputOrElement.provider.id
                : undefined;
            const repositories = this.scmViewService.repositories
                .filter(r => r.provider.parentId === parentId);
            return repositories;
        }
        // Explorer mode
        if (inputOrElement instanceof SCMViewService) {
            // Get all top level repositories
            const repositories = this.scmViewService.repositories
                .filter(r => r.provider.parentId === undefined);
            // Check whether there are any child repositories
            if (repositories.length !== this.scmViewService.repositories.length) {
                for (const repository of repositories) {
                    const childRepositories = this.scmViewService.repositories
                        .filter(r => r.provider.parentId === repository.provider.id);
                    if (childRepositories.length === 0) {
                        continue;
                    }
                    // Insert child repositories right after the parent
                    const repositoryIndex = repositories.indexOf(repository);
                    repositories.splice(repositoryIndex + 1, 0, ...childRepositories);
                }
            }
            return repositories;
        }
        else if (isSCMRepository(inputOrElement)) {
            const artifactGroups = await inputOrElement.provider.artifactProvider.get()?.provideArtifactGroups() ?? [];
            return artifactGroups.map(group => ({
                repository: inputOrElement,
                artifactGroup: group,
                type: 'artifactGroup'
            }));
        }
        else if (isSCMArtifactGroupTreeElement(inputOrElement)) {
            const repository = inputOrElement.repository;
            const artifacts = await repository.provider.artifactProvider.get()?.provideArtifacts(inputOrElement.artifactGroup.id) ?? [];
            // Create resource tree for artifacts
            const artifactsTree = new ResourceTree(inputOrElement);
            for (const artifact of artifacts) {
                artifactsTree.add(URI.from({
                    scheme: 'scm-artifact', path: artifact.name
                }), {
                    repository,
                    group: inputOrElement.artifactGroup,
                    artifact,
                    type: 'artifact'
                });
            }
            return Iterable.map(artifactsTree.root.children, node => node.element ?? node);
        }
        else if (isSCMArtifactNode(inputOrElement)) {
            return Iterable.map(inputOrElement.children, node => node.element && node.childrenCount === 0 ? node.element : node);
        }
        else if (isSCMArtifactTreeElement(inputOrElement)) { }
        return [];
    }
    hasChildren(inputOrElement) {
        if (this.scmViewService.explorerEnabledConfig.get() === false) {
            const parentId = isSCMRepository(inputOrElement)
                ? inputOrElement.provider.id
                : undefined;
            const repositories = this.scmViewService.repositories
                .filter(r => r.provider.parentId === parentId);
            return repositories.length > 0;
        }
        // Explorer mode
        if (inputOrElement instanceof SCMViewService) {
            return this.scmViewService.repositories.length > 0;
        }
        else if (isSCMRepository(inputOrElement)) {
            return true;
        }
        else if (isSCMArtifactGroupTreeElement(inputOrElement)) {
            return true;
        }
        else if (isSCMArtifactTreeElement(inputOrElement)) {
            return false;
        }
        else if (isSCMArtifactNode(inputOrElement)) {
            return inputOrElement.childrenCount > 0;
        }
        else {
            return false;
        }
    }
};
RepositoryTreeDataSource = __decorate([
    __param(0, ISCMViewService)
], RepositoryTreeDataSource);
class RepositoryTreeIdentityProvider {
    getId(element) {
        if (isSCMRepository(element)) {
            return `repo:${element.provider.id}`;
        }
        else if (isSCMArtifactGroupTreeElement(element)) {
            return `artifactGroup:${element.repository.provider.id}/${element.artifactGroup.id}`;
        }
        else if (isSCMArtifactTreeElement(element)) {
            return `artifact:${element.repository.provider.id}/${element.group.id}/${element.artifact.id}`;
        }
        else if (isSCMArtifactNode(element)) {
            return `artifactFolder:${element.context.repository.provider.id}/${element.context.artifactGroup.id}/${element.uri.fsPath}`;
        }
        else {
            throw new Error('Invalid tree element');
        }
    }
}
class RepositoriesTreeCompressionDelegate {
    isIncompressible(element) {
        if (ResourceTree.isResourceNode(element)) {
            return element.childrenCount > 1;
        }
        else {
            return true;
        }
    }
}
let SCMRepositoriesViewPane = class SCMRepositoriesViewPane extends ViewPane {
    constructor(options, scmService, scmViewService, keybindingService, contextMenuService, instantiationService, viewDescriptorService, contextKeyService, configurationService, openerService, themeService, hoverService) {
        super({ ...options, titleMenuId: MenuId.SCMSourceControlTitle }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.scmService = scmService;
        this.scmViewService = scmViewService;
        this.treeOperationSequencer = new Sequencer();
        this.updateChildrenThrottler = new Throttler();
        this.visibilityDisposables = new DisposableStore();
        this.repositoryDisposables = new DisposableMap();
        this.visibleCountObs = observableConfigValue('scm.repositories.visible', 10, this.configurationService);
        this.providerCountBadgeObs = observableConfigValue('scm.providerCountBadge', 'hidden', this.configurationService);
        this._register(this.updateChildrenThrottler);
    }
    renderBody(container) {
        super.renderBody(container);
        const treeContainer = append(container, $('.scm-view.scm-repositories-view'));
        // scm.providerCountBadge setting
        this._register(autorun(reader => {
            const providerCountBadge = this.providerCountBadgeObs.read(reader);
            treeContainer.classList.toggle('hide-provider-counts', providerCountBadge === 'hidden');
            treeContainer.classList.toggle('auto-provider-counts', providerCountBadge === 'auto');
        }));
        this.createTree(treeContainer);
        this.onDidChangeBodyVisibility(async (visible) => {
            if (!visible) {
                this.visibilityDisposables.clear();
                return;
            }
            this.treeOperationSequencer.queue(async () => {
                // Initial rendering
                await this.tree.setInput(this.scmViewService);
                // scm.repositories.visible setting
                this.visibilityDisposables.add(autorun(reader => {
                    const visibleCount = this.visibleCountObs.read(reader);
                    this.updateBodySize(this.tree.contentHeight, visibleCount);
                }));
                // scm.repositories.explorer setting
                this.visibilityDisposables.add(runOnChange(this.scmViewService.explorerEnabledConfig, async () => {
                    await this.updateChildren();
                    this.updateBodySize(this.tree.contentHeight);
                    // If we only have one repository, expand it
                    if (this.scmViewService.repositories.length === 1) {
                        await this.treeOperationSequencer.queue(() => this.tree.expand(this.scmViewService.repositories[0]));
                    }
                }));
                // Update tree selection
                const onDidChangeVisibleRepositoriesSignal = observableSignalFromEvent(this, this.scmViewService.onDidChangeVisibleRepositories);
                this.visibilityDisposables.add(autorun(async (reader) => {
                    onDidChangeVisibleRepositoriesSignal.read(reader);
                    await this.treeOperationSequencer.queue(() => this.updateTreeSelection());
                }));
                // Add/Remove event handlers
                this.scmService.onDidAddRepository(this.onDidAddRepository, this, this.visibilityDisposables);
                this.scmService.onDidRemoveRepository(this.onDidRemoveRepository, this, this.visibilityDisposables);
                for (const repository of this.scmService.repositories) {
                    this.onDidAddRepository(repository);
                }
            });
        }, this, this._store);
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.layout(height, width);
    }
    focus() {
        super.focus();
        this.tree.domFocus();
    }
    createTree(container) {
        this.treeIdentityProvider = new RepositoryTreeIdentityProvider();
        this.treeDataSource = this.instantiationService.createInstance(RepositoryTreeDataSource);
        this._register(this.treeDataSource);
        this.tree = this.instantiationService.createInstance(WorkbenchCompressibleAsyncDataTree, 'SCM Repositories', container, new ListDelegate(), new RepositoriesTreeCompressionDelegate(), [
            this.instantiationService.createInstance(RepositoryRenderer, MenuId.SCMSourceControlInline, getActionViewItemProvider(this.instantiationService)),
            this.instantiationService.createInstance(ArtifactGroupRenderer),
            this.instantiationService.createInstance(ArtifactRenderer)
        ], this.treeDataSource, {
            identityProvider: this.treeIdentityProvider,
            horizontalScrolling: false,
            collapseByDefault: (e) => {
                if (this.scmViewService.explorerEnabledConfig.get() === false) {
                    if (isSCMRepository(e) && e.provider.parentId === undefined) {
                        return false;
                    }
                    return true;
                }
                // Explorer mode
                if (isSCMArtifactNode(e)) {
                    // Only expand artifact folders as they are compressed by default
                    return !(e.childrenCount === 1 && Iterable.first(e.children)?.element === undefined);
                }
                else {
                    return true;
                }
            },
            compressionEnabled: true,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            multipleSelectionSupport: this.scmViewService.selectionModeConfig.get() === 'multiple',
            expandOnDoubleClick: true,
            expandOnlyOnTwistieClick: true,
            accessibilityProvider: {
                getAriaLabel(element) {
                    if (isSCMRepository(element)) {
                        return element.provider.label;
                    }
                    else if (isSCMArtifactGroupTreeElement(element)) {
                        return element.artifactGroup.name;
                    }
                    else if (isSCMArtifactTreeElement(element)) {
                        return element.artifact.name;
                    }
                    else {
                        return '';
                    }
                },
                getWidgetAriaLabel() {
                    return localize(11631, null);
                }
            }
        });
        this._register(this.tree);
        this._register(autorun(reader => {
            const selectionMode = this.scmViewService.selectionModeConfig.read(reader);
            this.tree.updateOptions({ multipleSelectionSupport: selectionMode === 'multiple' });
        }));
        this._register(this.tree.onDidChangeSelection(this.onTreeSelectionChange, this));
        this._register(this.tree.onDidChangeFocus(this.onTreeDidChangeFocus, this));
        this._register(this.tree.onDidFocus(this.onDidTreeFocus, this));
        this._register(this.tree.onContextMenu(this.onTreeContextMenu, this));
        this._register(this.tree.onDidChangeContentHeight(this.onTreeContentHeightChange, this));
    }
    async onDidAddRepository(repository) {
        const disposables = new DisposableStore();
        // Artifact group changed
        disposables.add(autorun(async (reader) => {
            const explorerEnabled = this.scmViewService.explorerEnabledConfig.read(reader);
            const artifactsProvider = repository.provider.artifactProvider.read(reader);
            if (!explorerEnabled || !artifactsProvider) {
                return;
            }
            reader.store.add(artifactsProvider.onDidChangeArtifacts(async (groups) => {
                await this.updateRepository(repository);
            }));
        }));
        // HistoryItemRef changed
        disposables.add(autorun(async (reader) => {
            const historyProvider = repository.provider.historyProvider.read(reader);
            if (!historyProvider) {
                return;
            }
            reader.store.add(runOnChange(historyProvider.historyItemRef, async () => {
                await this.updateRepository(repository);
            }));
        }));
        await this.updateRepository(repository);
        this.repositoryDisposables.set(repository, disposables);
    }
    async onDidRemoveRepository(repository) {
        await this.updateRepository(repository);
        this.repositoryDisposables.deleteAndDispose(repository);
    }
    onTreeContextMenu(e) {
        if (!e.element) {
            return;
        }
        if (isSCMRepository(e.element)) {
            // Repository
            const provider = e.element.provider;
            const menus = this.scmViewService.menus.getRepositoryMenus(provider);
            const menu = menus.getRepositoryContextMenu(e.element);
            const actions = collectContextMenuActions(menu);
            const disposables = new DisposableStore();
            const actionRunner = new RepositoryActionRunner(() => {
                return this.getTreeSelection();
            });
            disposables.add(actionRunner);
            disposables.add(actionRunner.onWillRun(() => this.tree.domFocus()));
            this.contextMenuService.showContextMenu({
                actionRunner,
                getAnchor: () => e.anchor,
                getActions: () => actions,
                getActionsContext: () => provider,
                onHide: () => disposables.dispose()
            });
        }
        else if (isSCMArtifactTreeElement(e.element)) {
            // Artifact
            const provider = e.element.repository.provider;
            const artifact = e.element.artifact;
            const menus = this.scmViewService.menus.getRepositoryMenus(provider);
            const menu = menus.getArtifactMenu(e.element.group, artifact);
            const actions = collectContextMenuActions(menu, provider);
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => actions,
                getActionsContext: () => artifact
            });
        }
    }
    onTreeSelectionChange(e) {
        if (e.browserEvent && e.elements.length > 0) {
            const scrollTop = this.tree.scrollTop;
            if (e.elements.every(e => isSCMRepository(e))) {
                this.scmViewService.visibleRepositories = e.elements;
            }
            else if (e.elements.every(e => isSCMArtifactGroupTreeElement(e) || isSCMArtifactTreeElement(e))) {
                this.scmViewService.visibleRepositories = e.elements.map(e => e.repository);
            }
            this.tree.scrollTop = scrollTop;
        }
    }
    onTreeDidChangeFocus(e) {
        if (e.browserEvent && e.elements.length > 0) {
            if (isSCMRepository(e.elements[0])) {
                this.scmViewService.focus(e.elements[0]);
            }
        }
    }
    onDidTreeFocus() {
        const focused = this.tree.getFocus();
        if (focused.length > 0) {
            if (isSCMRepository(focused[0])) {
                this.scmViewService.focus(focused[0]);
            }
            else if (isSCMArtifactGroupTreeElement(focused[0]) || isSCMArtifactTreeElement(focused[0])) {
                this.scmViewService.focus(focused[0].repository);
            }
        }
    }
    onTreeContentHeightChange(height) {
        this.updateBodySize(height);
        // Refresh the selection
        this.treeOperationSequencer.queue(() => this.updateTreeSelection());
    }
    async updateChildren(element) {
        return this.updateChildrenThrottler.queue(() => this.treeOperationSequencer.queue(async () => {
            if (element && this.tree.hasNode(element)) {
                await this.tree.updateChildren(element, true);
            }
            else {
                await this.tree.updateChildren(undefined, true);
            }
        }));
    }
    async expand(element) {
        await this.treeOperationSequencer.queue(() => this.tree.expand(element, true));
    }
    async updateRepository(repository) {
        if (this.scmViewService.explorerEnabledConfig.get() === false) {
            if (repository.provider.parentId === undefined) {
                await this.updateChildren();
                return;
            }
            await this.updateParentRepository(repository);
        }
        // Explorer mode
        await this.updateChildren();
    }
    async updateParentRepository(repository) {
        const parentRepository = this.scmViewService.repositories
            .find(r => r.provider.id === repository.provider.parentId);
        if (!parentRepository) {
            return;
        }
        await this.updateChildren(parentRepository);
        await this.expand(parentRepository);
    }
    updateBodySize(contentHeight, visibleCount) {
        if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
            return;
        }
        if (this.scmViewService.explorerEnabledConfig.get() === false) {
            visibleCount = visibleCount ?? this.visibleCountObs.get();
            const empty = this.scmViewService.repositories.length === 0;
            const size = Math.min(contentHeight / 22, visibleCount) * 22;
            this.minimumBodySize = visibleCount === 0 ? 22 : size;
            this.maximumBodySize = visibleCount === 0 ? Number.POSITIVE_INFINITY : empty ? Number.POSITIVE_INFINITY : size;
        }
        else {
            this.minimumBodySize = 120;
            this.maximumBodySize = Number.POSITIVE_INFINITY;
        }
    }
    async updateTreeSelection() {
        const oldSelection = this.getTreeSelection();
        const oldSet = new Set(oldSelection);
        const set = new Set(this.scmViewService.visibleRepositories);
        const added = new Set(Iterable.filter(set, r => !oldSet.has(r)));
        const removed = new Set(Iterable.filter(oldSet, r => !set.has(r)));
        if (added.size === 0 && removed.size === 0) {
            return;
        }
        const selection = oldSelection.filter(repo => !removed.has(repo));
        for (const repo of this.scmViewService.repositories) {
            if (added.has(repo)) {
                selection.push(repo);
            }
        }
        const visibleSelection = selection
            .filter(s => this.tree.hasNode(s));
        this.tree.setSelection(visibleSelection);
        if (visibleSelection.length > 0 && !this.tree.getFocus().includes(visibleSelection[0])) {
            this.tree.setAnchor(visibleSelection[0]);
            this.tree.setFocus([visibleSelection[0]]);
        }
    }
    getTreeSelection() {
        return this.tree.getSelection()
            .map(e => {
            if (isSCMRepository(e)) {
                return e;
            }
            else if (isSCMArtifactGroupTreeElement(e) || isSCMArtifactTreeElement(e)) {
                return e.repository;
            }
            else if (isSCMArtifactNode(e)) {
                return e.context.repository;
            }
            else {
                throw new Error('Invalid tree element');
            }
        });
    }
    dispose() {
        this.visibilityDisposables.dispose();
        super.dispose();
    }
};
SCMRepositoriesViewPane = __decorate([
    __param(1, ISCMService),
    __param(2, ISCMViewService),
    __param(3, IKeybindingService),
    __param(4, IContextMenuService),
    __param(5, IInstantiationService),
    __param(6, IViewDescriptorService),
    __param(7, IContextKeyService),
    __param(8, IConfigurationService),
    __param(9, IOpenerService),
    __param(10, IThemeService),
    __param(11, IHoverService)
], SCMRepositoriesViewPane);
export { SCMRepositoriesViewPane };
//# sourceMappingURL=scmRepositoriesViewPane.js.map