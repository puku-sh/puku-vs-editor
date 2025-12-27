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
var ErrorRenderer_1, TestItemRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { DefaultKeyboardNavigationDelegate } from '../../../../base/browser/ui/list/listWidget.js';
import { Action, ActionRunner, Separator, toAction } from '../../../../base/common/actions.js';
import { mapFindFirst } from '../../../../base/common/arraysFind.js';
import { RunOnceScheduler, disposableTimeout } from '../../../../base/common/async.js';
import { groupBy } from '../../../../base/common/collections.js';
import { Color, RGBA } from '../../../../base/common/color.js';
import { compareFileNames } from '../../../../base/common/comparers.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, observableFromEvent } from '../../../../base/common/observable.js';
import { fuzzyContains } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isDefined } from '../../../../base/common/types.js';
import { IMarkdownRendererService } from '../../../../platform/markdown/browser/markdownRenderer.js';
import { localize } from '../../../../nls.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { MenuEntryActionViewItem, createActionViewItem, getActionBarActions, getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { UnmanagedProgress } from '../../../../platform/progress/common/progress.js';
import { IStorageService, WillSaveStateReason } from '../../../../platform/storage/common/storage.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { foreground } from '../../../../platform/theme/common/colorRegistry.js';
import { spinningLoading } from '../../../../platform/theme/common/iconRegistry.js';
import { IThemeService, registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { registerNavigableContainer } from '../../../browser/actions/widgetNavigationCommands.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IActivityService, IconBadge, NumberBadge } from '../../../services/activity/common/activity.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { getTestingConfiguration } from '../common/configuration.js';
import { labelForTestInState } from '../common/constants.js';
import { StoredValue } from '../common/storedValue.js';
import { ITestExplorerFilterState } from '../common/testExplorerFilterState.js';
import { TestId } from '../common/testId.js';
import { ITestProfileService, canUseProfileWithTest } from '../common/testProfileService.js';
import { LiveTestResult } from '../common/testResult.js';
import { ITestResultService } from '../common/testResultService.js';
import { ITestService, testCollectionIsEmpty } from '../common/testService.js';
import { testProfileBitset, testResultStateToContextValues } from '../common/testTypes.js';
import { TestingContextKeys } from '../common/testingContextKeys.js';
import { ITestingContinuousRunService } from '../common/testingContinuousRunService.js';
import { ITestingPeekOpener } from '../common/testingPeekOpener.js';
import { collectTestStateCounts, getTestProgressText } from '../common/testingProgressMessages.js';
import { cmpPriority, isFailedState, isStateWithResult, statesInOrder } from '../common/testingStates.js';
import { TestItemTreeElement, TestTreeErrorMessage } from './explorerProjections/index.js';
import { ListProjection } from './explorerProjections/listProjection.js';
import { getTestItemContextOverlay } from './explorerProjections/testItemContextOverlay.js';
import { TestingObjectTree } from './explorerProjections/testingObjectTree.js';
import { TreeProjection } from './explorerProjections/treeProjection.js';
import * as icons from './icons.js';
import './media/testing.css';
import { DebugLastRun, ReRunLastRun } from './testExplorerActions.js';
import { TestingExplorerFilter } from './testingExplorerFilter.js';
var LastFocusState;
(function (LastFocusState) {
    LastFocusState[LastFocusState["Input"] = 0] = "Input";
    LastFocusState[LastFocusState["Tree"] = 1] = "Tree";
})(LastFocusState || (LastFocusState = {}));
let TestingExplorerView = class TestingExplorerView extends ViewPane {
    get focusedTreeElements() {
        return this.viewModel.tree.getFocus().filter(isDefined);
    }
    constructor(options, contextMenuService, keybindingService, configurationService, instantiationService, viewDescriptorService, contextKeyService, openerService, themeService, testService, hoverService, testProfileService, commandService, menuService, crService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.testService = testService;
        this.testProfileService = testProfileService;
        this.commandService = commandService;
        this.menuService = menuService;
        this.crService = crService;
        this.filterActionBar = this._register(new MutableDisposable());
        this.discoveryProgress = this._register(new MutableDisposable());
        this.filter = this._register(new MutableDisposable());
        this.filterFocusListener = this._register(new MutableDisposable());
        this.dimensions = { width: 0, height: 0 };
        this.lastFocusState = 0 /* LastFocusState.Input */;
        const relayout = this._register(new RunOnceScheduler(() => this.layoutBody(), 1));
        this._register(this.onDidChangeViewWelcomeState(() => {
            if (!this.shouldShowWelcome()) {
                relayout.schedule();
            }
        }));
        this._register(Event.any(crService.onDidChange, testProfileService.onDidChange)(() => {
            this.updateActions();
        }));
        this._register(testService.collection.onBusyProvidersChange(busy => {
            this.updateDiscoveryProgress(busy);
        }));
        this._register(testProfileService.onDidChange(() => this.updateActions()));
    }
    shouldShowWelcome() {
        return this.viewModel?.welcomeExperience === 1 /* WelcomeExperience.ForWorkspace */;
    }
    focus() {
        super.focus();
        if (this.lastFocusState === 1 /* LastFocusState.Tree */) {
            this.viewModel.tree.domFocus();
        }
        else {
            this.filter.value?.focus();
        }
    }
    /**
     * Gets include/exclude items in the tree, based either on visible tests
     * or a use selection. If a profile is given, only tests in that profile
     * are collected. If a bitset is given, any test that can run in that
     * bitset is collected.
     */
    getTreeIncludeExclude(profileOrBitset, withinItems, filterToType = 'visible') {
        const projection = this.viewModel.projection.value;
        if (!projection) {
            return { include: [], exclude: [] };
        }
        // To calculate includes and excludes, we include the first children that
        // have a majority of their items included too, and then apply exclusions.
        const include = new Set();
        const exclude = [];
        const runnableWithProfileOrBitset = new Map();
        const isRunnableWithProfileOrBitset = (item) => {
            let value = runnableWithProfileOrBitset.get(item);
            if (value === undefined) {
                value = typeof profileOrBitset === 'number'
                    ? !!this.testProfileService.getDefaultProfileForTest(profileOrBitset, item)
                    : canUseProfileWithTest(profileOrBitset, item);
                runnableWithProfileOrBitset.set(item, value);
            }
            return value;
        };
        const attempt = (element, alreadyIncluded) => {
            // sanity check hasElement since updates are debounced and they may exist
            // but not be rendered yet
            if (!(element instanceof TestItemTreeElement) || !this.viewModel.tree.hasElement(element)) {
                return;
            }
            // If the current node is not visible or runnable in the current profile, it's excluded
            const inTree = this.viewModel.tree.getNode(element);
            if (!inTree.visible) {
                if (alreadyIncluded) {
                    exclude.push(element.test);
                }
                return;
            }
            // Only count relevant children when deciding whether to include this node, #229120
            const visibleRunnableChildren = inTree.children.filter(c => c.visible
                && c.element instanceof TestItemTreeElement
                && isRunnableWithProfileOrBitset(c.element.test)).length;
            // If it's not already included but most of its children are, then add it
            // if it can be run under the current profile (when specified)
            if (
            // If it's not already included...
            !alreadyIncluded
                // And it can be run using the current profile (if any)
                && isRunnableWithProfileOrBitset(element.test)
                // And either it's a leaf node or most children are included, then include it.
                && (visibleRunnableChildren === 0 || visibleRunnableChildren * 2 >= inTree.children.length)
                // And not if we're only showing a single of its children, since it
                // probably fans out later. (Worse case we'll directly include its single child)
                && visibleRunnableChildren !== 1) {
                include.add(element.test);
                alreadyIncluded = true;
            }
            // Recurse ✨
            for (const child of element.children) {
                attempt(child, alreadyIncluded);
            }
        };
        if (filterToType === 'selected') {
            const sel = this.viewModel.tree.getSelection().filter(isDefined);
            if (sel.length) {
                L: for (const node of sel) {
                    if (node instanceof TestItemTreeElement) {
                        // avoid adding an item if its parent is already included
                        for (let i = node; i; i = i.parent) {
                            if (include.has(i.test)) {
                                continue L;
                            }
                        }
                        include.add(node.test);
                        node.children.forEach(c => attempt(c, true));
                    }
                }
                return { include: [...include], exclude };
            }
        }
        for (const root of withinItems || this.testService.collection.rootItems) {
            const element = projection.getElementByTestId(root.item.extId);
            if (!element) {
                continue;
            }
            if (typeof profileOrBitset === 'object' && !canUseProfileWithTest(profileOrBitset, root)) {
                continue;
            }
            include.add(element.test);
            element.children.forEach(c => attempt(c, true));
        }
        return { include: [...include], exclude };
    }
    render() {
        super.render();
        this._register(registerNavigableContainer({
            name: 'testingExplorerView',
            focusNotifiers: [this],
            focusNextWidget: () => {
                if (!this.viewModel.tree.isDOMFocused()) {
                    this.viewModel.tree.domFocus();
                }
            },
            focusPreviousWidget: () => {
                if (this.viewModel.tree.isDOMFocused()) {
                    this.filter.value?.focus();
                }
            }
        }));
    }
    /**
     * @override
     */
    renderBody(container) {
        super.renderBody(container);
        this.container = dom.append(container, dom.$('.test-explorer'));
        this.treeHeader = dom.append(this.container, dom.$('.test-explorer-header'));
        this.filterActionBar.value = this.createFilterActionBar();
        const messagesContainer = dom.append(this.treeHeader, dom.$('.result-summary-container'));
        this._register(this.instantiationService.createInstance(ResultSummaryView, messagesContainer));
        const listContainer = dom.append(this.container, dom.$('.test-explorer-tree'));
        this.viewModel = this.instantiationService.createInstance(TestingExplorerViewModel, listContainer, this.onDidChangeBodyVisibility);
        this._register(this.viewModel.tree.onDidFocus(() => this.lastFocusState = 1 /* LastFocusState.Tree */));
        this._register(this.viewModel.onChangeWelcomeVisibility(() => this._onDidChangeViewWelcomeState.fire()));
        this._register(this.viewModel);
        this._onDidChangeViewWelcomeState.fire();
    }
    /** @override  */
    createActionViewItem(action, options) {
        switch (action.id) {
            case "workbench.actions.treeView.testExplorer.filter" /* TestCommandId.FilterAction */:
                this.filter.value = this.instantiationService.createInstance(TestingExplorerFilter, action, options);
                this.filterFocusListener.value = this.filter.value.onDidFocus(() => this.lastFocusState = 0 /* LastFocusState.Input */);
                return this.filter.value;
            case "testing.runSelected" /* TestCommandId.RunSelectedAction */:
                return this.getRunGroupDropdown(2 /* TestRunProfileBitset.Run */, action, options);
            case "testing.debugSelected" /* TestCommandId.DebugSelectedAction */:
                return this.getRunGroupDropdown(4 /* TestRunProfileBitset.Debug */, action, options);
            case "testing.startContinuousRun" /* TestCommandId.StartContinousRun */:
            case "testing.stopContinuousRun" /* TestCommandId.StopContinousRun */:
                return this.getContinuousRunDropdown(action, options);
            default:
                return super.createActionViewItem(action, options);
        }
    }
    /** @inheritdoc */
    getTestConfigGroupActions(group) {
        const profileActions = [];
        let participatingGroups = 0;
        let participatingProfiles = 0;
        let hasConfigurable = false;
        const defaults = this.testProfileService.getGroupDefaultProfiles(group);
        for (const { profiles, controller } of this.testProfileService.all()) {
            let hasAdded = false;
            for (const profile of profiles) {
                if (profile.group !== group) {
                    continue;
                }
                if (!hasAdded) {
                    hasAdded = true;
                    participatingGroups++;
                    profileActions.push(toAction({ id: `${controller.id}.$root`, label: controller.label.get(), enabled: false, checked: false, run: () => { } }));
                }
                hasConfigurable = hasConfigurable || profile.hasConfigurationHandler;
                participatingProfiles++;
                profileActions.push(toAction({
                    id: `${controller.id}.${profile.profileId}`,
                    label: defaults.includes(profile) ? localize('defaultTestProfile', '{0} (Default)', profile.label) : profile.label,
                    run: () => {
                        const { include, exclude } = this.getTreeIncludeExclude(profile);
                        this.testService.runResolvedTests({
                            exclude: exclude.map(e => e.item.extId),
                            group: profile.group,
                            targets: [{
                                    profileId: profile.profileId,
                                    controllerId: profile.controllerId,
                                    testIds: include.map(i => i.item.extId),
                                }]
                        });
                    },
                }));
            }
        }
        const contextKeys = [];
        // allow extension author to define context for when to show the test menu actions for run or debug menus
        if (group === 2 /* TestRunProfileBitset.Run */) {
            contextKeys.push(['testing.profile.context.group', 'run']);
        }
        if (group === 4 /* TestRunProfileBitset.Debug */) {
            contextKeys.push(['testing.profile.context.group', 'debug']);
        }
        if (group === 8 /* TestRunProfileBitset.Coverage */) {
            contextKeys.push(['testing.profile.context.group', 'coverage']);
        }
        const key = this.contextKeyService.createOverlay(contextKeys);
        const menu = this.menuService.getMenuActions(MenuId.TestProfilesContext, key);
        // fill if there are any actions
        const menuActions = getFlatContextMenuActions(menu);
        const postActions = [];
        if (participatingProfiles > 1) {
            postActions.push(toAction({
                id: 'selectDefaultTestConfigurations',
                label: localize('selectDefaultConfigs', 'Select Default Profile'),
                run: () => this.commandService.executeCommand("testing.selectDefaultTestProfiles" /* TestCommandId.SelectDefaultTestProfiles */, group),
            }));
        }
        if (hasConfigurable) {
            postActions.push(toAction({
                id: 'configureTestProfiles',
                label: localize('configureTestProfiles', 'Configure Test Profiles'),
                run: () => this.commandService.executeCommand("testing.configureProfile" /* TestCommandId.ConfigureTestProfilesAction */, group),
            }));
        }
        // show menu actions if there are any otherwise don't
        return {
            numberOfProfiles: participatingProfiles,
            actions: menuActions.length > 0
                ? Separator.join(profileActions, menuActions, postActions)
                : Separator.join(profileActions, postActions),
        };
    }
    /**
     * @override
     */
    saveState() {
        this.filter.value?.saveState();
        super.saveState();
    }
    getRunGroupDropdown(group, defaultAction, options) {
        const dropdownActions = this.getTestConfigGroupActions(group);
        if (dropdownActions.numberOfProfiles < 2) {
            return super.createActionViewItem(defaultAction, options);
        }
        const primaryAction = this.instantiationService.createInstance(MenuItemAction, {
            id: defaultAction.id,
            title: defaultAction.label,
            icon: group === 2 /* TestRunProfileBitset.Run */
                ? icons.testingRunAllIcon
                : icons.testingDebugAllIcon,
        }, undefined, undefined, undefined, undefined);
        return this.instantiationService.createInstance(DropdownWithPrimaryActionViewItem, primaryAction, this.getDropdownAction(), dropdownActions.actions, '', options);
    }
    getDropdownAction() {
        return new Action('selectRunConfig', localize('testingSelectConfig', 'Select Configuration...'), 'codicon-chevron-down', true);
    }
    getContinuousRunDropdown(defaultAction, options) {
        const allProfiles = [...Iterable.flatMap(this.testProfileService.all(), (cr) => {
                if (this.testService.collection.getNodeById(cr.controller.id)?.children.size) {
                    return Iterable.filter(cr.profiles, p => p.supportsContinuousRun);
                }
                return Iterable.empty();
            })];
        if (allProfiles.length <= 1) {
            return super.createActionViewItem(defaultAction, options);
        }
        const primaryAction = this.instantiationService.createInstance(MenuItemAction, {
            id: defaultAction.id,
            title: defaultAction.label,
            icon: defaultAction.id === "testing.startContinuousRun" /* TestCommandId.StartContinousRun */ ? icons.testingTurnContinuousRunOn : icons.testingTurnContinuousRunOff,
        }, undefined, undefined, undefined, undefined);
        const dropdownActions = [];
        const groups = groupBy(allProfiles, p => p.group);
        const crService = this.crService;
        for (const group of [2 /* TestRunProfileBitset.Run */, 4 /* TestRunProfileBitset.Debug */, 8 /* TestRunProfileBitset.Coverage */]) {
            const profiles = groups[group];
            if (!profiles) {
                continue;
            }
            if (Object.keys(groups).length > 1) {
                dropdownActions.push({
                    id: `${group}.label`,
                    label: testProfileBitset[group],
                    enabled: false,
                    class: undefined,
                    tooltip: testProfileBitset[group],
                    run: () => { },
                });
            }
            for (const profile of profiles) {
                dropdownActions.push({
                    id: `${group}.${profile.profileId}`,
                    label: profile.label,
                    enabled: true,
                    class: undefined,
                    tooltip: profile.label,
                    checked: crService.isEnabledForProfile(profile),
                    run: () => crService.isEnabledForProfile(profile)
                        ? crService.stopProfile(profile)
                        : crService.start([profile]),
                });
            }
        }
        return this.instantiationService.createInstance(DropdownWithPrimaryActionViewItem, primaryAction, this.getDropdownAction(), dropdownActions, '', options);
    }
    createFilterActionBar() {
        const bar = new ActionBar(this.treeHeader, {
            actionViewItemProvider: (action, options) => this.createActionViewItem(action, options),
            triggerKeys: { keyDown: false, keys: [] },
        });
        bar.push(new Action("workbench.actions.treeView.testExplorer.filter" /* TestCommandId.FilterAction */));
        bar.getContainer().classList.add('testing-filter-action-bar');
        return bar;
    }
    updateDiscoveryProgress(busy) {
        if (!busy && this.discoveryProgress) {
            this.discoveryProgress.clear();
        }
        else if (busy && !this.discoveryProgress.value) {
            this.discoveryProgress.value = this.instantiationService.createInstance(UnmanagedProgress, { location: this.getProgressLocation() });
        }
    }
    /**
     * @override
     */
    layoutBody(height = this.dimensions.height, width = this.dimensions.width) {
        super.layoutBody(height, width);
        this.dimensions.height = height;
        this.dimensions.width = width;
        this.container.style.height = `${height}px`;
        this.viewModel?.layout(height - this.treeHeader.clientHeight, width);
        this.filter.value?.layout(width);
    }
};
TestingExplorerView = __decorate([
    __param(1, IContextMenuService),
    __param(2, IKeybindingService),
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IViewDescriptorService),
    __param(6, IContextKeyService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, ITestService),
    __param(10, IHoverService),
    __param(11, ITestProfileService),
    __param(12, ICommandService),
    __param(13, IMenuService),
    __param(14, ITestingContinuousRunService)
], TestingExplorerView);
export { TestingExplorerView };
const SUMMARY_RENDER_INTERVAL = 200;
let ResultSummaryView = class ResultSummaryView extends Disposable {
    constructor(container, resultService, activityService, crService, configurationService, instantiationService, hoverService) {
        super();
        this.container = container;
        this.resultService = resultService;
        this.activityService = activityService;
        this.crService = crService;
        this.elementsWereAttached = false;
        this.badgeDisposable = this._register(new MutableDisposable());
        this.renderLoop = this._register(new RunOnceScheduler(() => this.render(), SUMMARY_RENDER_INTERVAL));
        this.elements = dom.h('div.result-summary', [
            dom.h('div@status'),
            dom.h('div@count'),
            dom.h('div@count'),
            dom.h('span'),
            dom.h('duration@duration'),
            dom.h('a@rerun'),
        ]);
        this.badgeType = configurationService.getValue("testing.countBadge" /* TestingConfigKeys.CountBadge */);
        this._register(resultService.onResultsChanged(this.render, this));
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("testing.countBadge" /* TestingConfigKeys.CountBadge */)) {
                this.badgeType = configurationService.getValue("testing.countBadge" /* TestingConfigKeys.CountBadge */);
                this.render();
            }
        }));
        this.countHover = this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.elements.count, ''));
        const ab = this._register(new ActionBar(this.elements.rerun, {
            actionViewItemProvider: (action, options) => createActionViewItem(instantiationService, action, options),
        }));
        ab.push(instantiationService.createInstance(MenuItemAction, { ...new ReRunLastRun().desc, icon: icons.testingRerunIcon }, { ...new DebugLastRun().desc, icon: icons.testingDebugIcon }, {}, undefined, undefined), { icon: true, label: false });
        this.render();
    }
    render() {
        const { results } = this.resultService;
        const { count, root, status, duration, rerun } = this.elements;
        if (!results.length) {
            if (this.elementsWereAttached) {
                root.remove();
                this.elementsWereAttached = false;
            }
            this.container.innerText = localize('noResults', 'No test results yet.');
            this.badgeDisposable.clear();
            return;
        }
        const live = results.filter(r => !r.completedAt);
        let counts;
        if (live.length) {
            status.className = ThemeIcon.asClassName(spinningLoading);
            counts = collectTestStateCounts(true, live);
            this.renderLoop.schedule();
            const last = live[live.length - 1];
            duration.textContent = formatDuration(Date.now() - last.startedAt);
            rerun.style.display = 'none';
        }
        else {
            const last = results[0];
            const dominantState = mapFindFirst(statesInOrder, s => last.counts[s] > 0 ? s : undefined);
            status.className = ThemeIcon.asClassName(icons.testingStatesToIcons.get(dominantState ?? 0 /* TestResultState.Unset */));
            counts = collectTestStateCounts(false, [last]);
            duration.textContent = last instanceof LiveTestResult ? formatDuration(last.completedAt - last.startedAt) : '';
            rerun.style.display = 'block';
        }
        count.textContent = `${counts.passed}/${counts.totalWillBeRun}`;
        this.countHover.update(getTestProgressText(counts));
        this.renderActivityBadge(counts);
        if (!this.elementsWereAttached) {
            dom.clearNode(this.container);
            this.container.appendChild(root);
            this.elementsWereAttached = true;
        }
    }
    renderActivityBadge(countSummary) {
        if (countSummary && this.badgeType !== "off" /* TestingCountBadge.Off */ && countSummary[this.badgeType] !== 0) {
            if (this.lastBadge instanceof NumberBadge && this.lastBadge.number === countSummary[this.badgeType]) {
                return;
            }
            this.lastBadge = new NumberBadge(countSummary[this.badgeType], num => this.getLocalizedBadgeString(this.badgeType, num));
        }
        else if (this.crService.isEnabled()) {
            if (this.lastBadge instanceof IconBadge && this.lastBadge.icon === icons.testingContinuousIsOn) {
                return;
            }
            this.lastBadge = new IconBadge(icons.testingContinuousIsOn, () => localize('testingContinuousBadge', 'Tests are being watched for changes'));
        }
        else {
            if (!this.lastBadge) {
                return;
            }
            this.lastBadge = undefined;
        }
        this.badgeDisposable.value = this.lastBadge && this.activityService.showViewActivity("workbench.view.testing" /* Testing.ExplorerViewId */, { badge: this.lastBadge });
    }
    getLocalizedBadgeString(countBadgeType, count) {
        switch (countBadgeType) {
            case "passed" /* TestingCountBadge.Passed */:
                return localize('testingCountBadgePassed', '{0} passed tests', count);
            case "skipped" /* TestingCountBadge.Skipped */:
                return localize('testingCountBadgeSkipped', '{0} skipped tests', count);
            default:
                return localize('testingCountBadgeFailed', '{0} failed tests', count);
        }
    }
};
ResultSummaryView = __decorate([
    __param(1, ITestResultService),
    __param(2, IActivityService),
    __param(3, ITestingContinuousRunService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IHoverService)
], ResultSummaryView);
var WelcomeExperience;
(function (WelcomeExperience) {
    WelcomeExperience[WelcomeExperience["None"] = 0] = "None";
    WelcomeExperience[WelcomeExperience["ForWorkspace"] = 1] = "ForWorkspace";
    WelcomeExperience[WelcomeExperience["ForDocument"] = 2] = "ForDocument";
})(WelcomeExperience || (WelcomeExperience = {}));
let TestingExplorerViewModel = class TestingExplorerViewModel extends Disposable {
    get viewMode() {
        return this._viewMode.get() ?? "true" /* TestExplorerViewMode.Tree */;
    }
    set viewMode(newMode) {
        if (newMode === this._viewMode.get()) {
            return;
        }
        this._viewMode.set(newMode);
        this.updatePreferredProjection();
        this.storageService.store('testing.viewMode', newMode, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    get viewSorting() {
        return this._viewSorting.get() ?? "status" /* TestExplorerViewSorting.ByStatus */;
    }
    set viewSorting(newSorting) {
        if (newSorting === this._viewSorting.get()) {
            return;
        }
        this._viewSorting.set(newSorting);
        this.tree.resort(null);
        this.storageService.store('testing.viewSorting', newSorting, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    constructor(listContainer, onDidChangeVisibility, configurationService, editorService, editorGroupsService, menuService, contextMenuService, testService, filterState, instantiationService, storageService, contextKeyService, testResults, peekOpener, testProfileService, crService, commandService) {
        super();
        this.menuService = menuService;
        this.contextMenuService = contextMenuService;
        this.testService = testService;
        this.filterState = filterState;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.contextKeyService = contextKeyService;
        this.testResults = testResults;
        this.peekOpener = peekOpener;
        this.testProfileService = testProfileService;
        this.crService = crService;
        this.projection = this._register(new MutableDisposable());
        this.revealTimeout = new MutableDisposable();
        this.welcomeVisibilityEmitter = new Emitter();
        this.actionRunner = this._register(new TestExplorerActionRunner(() => this.tree.getSelection().filter(isDefined)));
        /**
         * Whether there's a reveal request which has not yet been delivered. This
         * can happen if the user asks to reveal before the test tree is loaded.
         * We check to see if the reveal request is present on each tree update,
         * and do it then if so.
         */
        this.hasPendingReveal = false;
        /**
         * Fires when the visibility of the placeholder state changes.
         */
        this.onChangeWelcomeVisibility = this.welcomeVisibilityEmitter.event;
        /**
         * Gets whether the welcome should be visible.
         */
        this.welcomeExperience = 0 /* WelcomeExperience.None */;
        this.hasPendingReveal = !!filterState.reveal.get();
        this.noTestForDocumentWidget = this._register(instantiationService.createInstance(NoTestsForDocumentWidget, listContainer));
        this.lastViewState = this._register(new StoredValue({
            key: 'testing.treeState',
            scope: 1 /* StorageScope.WORKSPACE */,
            target: 1 /* StorageTarget.MACHINE */,
        }, this.storageService));
        this._viewMode = TestingContextKeys.viewMode.bindTo(contextKeyService);
        this._viewSorting = TestingContextKeys.viewSorting.bindTo(contextKeyService);
        this._viewMode.set(this.storageService.get('testing.viewMode', 1 /* StorageScope.WORKSPACE */, "true" /* TestExplorerViewMode.Tree */));
        this._viewSorting.set(this.storageService.get('testing.viewSorting', 1 /* StorageScope.WORKSPACE */, "location" /* TestExplorerViewSorting.ByLocation */));
        this.reevaluateWelcomeState();
        this.filter = this.instantiationService.createInstance(TestsFilter, testService.collection);
        this.tree = instantiationService.createInstance(TestingObjectTree, 'Test Explorer List', listContainer, new ListDelegate(), [
            instantiationService.createInstance(TestItemRenderer, this.actionRunner),
            instantiationService.createInstance(ErrorRenderer),
        ], {
            identityProvider: instantiationService.createInstance(IdentityProvider),
            hideTwistiesOfChildlessElements: false,
            sorter: instantiationService.createInstance(TreeSorter, this),
            keyboardNavigationLabelProvider: instantiationService.createInstance(TreeKeyboardNavigationLabelProvider),
            accessibilityProvider: instantiationService.createInstance(ListAccessibilityProvider),
            filter: this.filter,
            findWidgetEnabled: false,
        });
        // saves the collapse state so that if items are removed or refreshed, they
        // retain the same state (#170169)
        const collapseStateSaver = this._register(new RunOnceScheduler(() => {
            // reuse the last view state to avoid making a bunch of object garbage:
            const state = this.tree.getOptimizedViewState(this.lastViewState.get({}));
            const projection = this.projection.value;
            if (projection) {
                projection.lastState = state;
            }
        }, 3000));
        this._register(this.tree.onDidChangeCollapseState(evt => {
            if (evt.node.element instanceof TestItemTreeElement) {
                if (!evt.node.collapsed) {
                    this.projection.value?.expandElement(evt.node.element, evt.deep ? Infinity : 0);
                }
                collapseStateSaver.schedule();
            }
        }));
        this._register(this.crService.onDidChange(testId => {
            if (testId) {
                // a continuous run test will sort to the top:
                const elem = this.projection.value?.getElementByTestId(testId);
                this.tree.resort(elem?.parent && this.tree.hasElement(elem.parent) ? elem.parent : null, false);
            }
        }));
        this._register(onDidChangeVisibility(visible => {
            if (visible) {
                this.ensureProjection();
            }
        }));
        this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));
        this._register(Event.any(filterState.text.onDidChange, filterState.fuzzy.onDidChange, testService.excluded.onTestExclusionsChanged)(() => {
            if (!filterState.text.value) {
                return this.tree.refilter();
            }
            const items = this.filter.lastIncludedTests = new Set();
            this.tree.refilter();
            this.filter.lastIncludedTests = undefined;
            for (const test of items) {
                this.tree.expandTo(test);
            }
        }));
        this._register(this.tree.onDidOpen(e => {
            if (!(e.element instanceof TestItemTreeElement)) {
                return;
            }
            filterState.didSelectTestInExplorer(e.element.test.item.extId);
            if (!e.element.children.size && e.element.test.item.uri) {
                if (!this.tryPeekError(e.element)) {
                    commandService.executeCommand('vscode.revealTest', e.element.test.item.extId, {
                        openToSide: e.sideBySide,
                        preserveFocus: true,
                    });
                }
            }
        }));
        this._register(this.tree);
        this._register(this.onChangeWelcomeVisibility(e => {
            this.noTestForDocumentWidget.setVisible(e === 2 /* WelcomeExperience.ForDocument */);
        }));
        this._register(dom.addStandardDisposableListener(this.tree.getHTMLElement(), 'keydown', evt => {
            if (evt.equals(3 /* KeyCode.Enter */)) {
                this.handleExecuteKeypress(evt);
            }
            else if (DefaultKeyboardNavigationDelegate.mightProducePrintableCharacter(evt)) {
                filterState.text.value = evt.browserEvent.key;
                filterState.focusInput();
            }
        }));
        this._register(autorun(reader => {
            this.revealById(filterState.reveal.read(reader), undefined, false);
        }));
        this._register(onDidChangeVisibility(visible => {
            if (visible) {
                filterState.focusInput();
            }
        }));
        let followRunningTests = getTestingConfiguration(configurationService, "testing.followRunningTest" /* TestingConfigKeys.FollowRunningTest */);
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("testing.followRunningTest" /* TestingConfigKeys.FollowRunningTest */)) {
                followRunningTests = getTestingConfiguration(configurationService, "testing.followRunningTest" /* TestingConfigKeys.FollowRunningTest */);
            }
        }));
        let alwaysRevealTestAfterStateChange = getTestingConfiguration(configurationService, "testing.alwaysRevealTestOnStateChange" /* TestingConfigKeys.AlwaysRevealTestOnStateChange */);
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("testing.alwaysRevealTestOnStateChange" /* TestingConfigKeys.AlwaysRevealTestOnStateChange */)) {
                alwaysRevealTestAfterStateChange = getTestingConfiguration(configurationService, "testing.alwaysRevealTestOnStateChange" /* TestingConfigKeys.AlwaysRevealTestOnStateChange */);
            }
        }));
        this._register(testResults.onTestChanged(evt => {
            if (!followRunningTests) {
                return;
            }
            if (evt.reason !== 1 /* TestResultItemChangeReason.OwnStateChange */) {
                return;
            }
            if (this.tree.selectionSize > 1) {
                return; // don't change a multi-selection #180950
            }
            // follow running tests, or tests whose state changed. Tests that
            // complete very fast may not enter the running state at all.
            if (evt.item.ownComputedState !== 2 /* TestResultState.Running */ && !(evt.previousState === 1 /* TestResultState.Queued */ && isStateWithResult(evt.item.ownComputedState))) {
                return;
            }
            this.revealById(evt.item.item.extId, alwaysRevealTestAfterStateChange, false);
        }));
        this._register(testResults.onResultsChanged(() => {
            this.tree.resort(null);
        }));
        this._register(this.testProfileService.onDidChange(() => {
            this.tree.rerender();
        }));
        const allOpenEditorInputs = observableFromEvent(this, editorService.onDidEditorsChange, () => new Set(editorGroupsService.groups.flatMap(g => g.editors).map(e => e.resource).filter(isDefined)));
        const activeResource = observableFromEvent(this, editorService.onDidActiveEditorChange, () => {
            if (editorService.activeEditor instanceof DiffEditorInput) {
                return editorService.activeEditor.primary.resource;
            }
            else {
                return editorService.activeEditor?.resource;
            }
        });
        const filterText = observableFromEvent(this.filterState.text.onDidChange, () => this.filterState.text);
        this._register(autorun(reader => {
            filterText.read(reader);
            if (this.filterState.isFilteringFor("@openedFiles" /* TestFilterTerm.OpenedFiles */)) {
                this.filter.filterToDocumentUri([...allOpenEditorInputs.read(reader)]);
            }
            else {
                this.filter.filterToDocumentUri([activeResource.read(reader)].filter(isDefined));
            }
            if (this.filterState.isFilteringFor("@doc" /* TestFilterTerm.CurrentDoc */) || this.filterState.isFilteringFor("@openedFiles" /* TestFilterTerm.OpenedFiles */)) {
                this.tree.refilter();
            }
        }));
        this._register(this.storageService.onWillSaveState(({ reason, }) => {
            if (reason === WillSaveStateReason.SHUTDOWN) {
                this.lastViewState.store(this.tree.getOptimizedViewState());
            }
        }));
    }
    /**
     * Re-layout the tree.
     */
    layout(height, width) {
        this.tree.layout(height, width);
    }
    /**
     * Tries to reveal by extension ID. Queues the request if the extension
     * ID is not currently available.
     */
    revealById(id, expand = true, focus = true) {
        if (!id) {
            this.hasPendingReveal = false;
            return;
        }
        const projection = this.ensureProjection();
        // If the item itself is visible in the tree, show it. Otherwise, expand
        // its closest parent.
        let expandToLevel = 0;
        const idPath = [...TestId.fromString(id).idsFromRoot()];
        for (let i = idPath.length - 1; i >= expandToLevel; i--) {
            const element = projection.getElementByTestId(idPath[i].toString());
            // Skip all elements that aren't in the tree.
            if (!element || !this.tree.hasElement(element)) {
                continue;
            }
            // If this 'if' is true, we're at the closest-visible parent to the node
            // we want to expand. Expand that, and then start the loop again because
            // we might already have children for it.
            if (i < idPath.length - 1) {
                if (expand) {
                    this.tree.expand(element);
                    expandToLevel = i + 1; // avoid an infinite loop if the test does not exist
                    i = idPath.length - 1; // restart the loop since new children may now be visible
                    continue;
                }
            }
            // Otherwise, we've arrived!
            // If the node or any of its children are excluded, flip on the 'show
            // excluded tests' checkbox automatically. If we didn't expand, then set
            // target focus target to the first collapsed element.
            let focusTarget = element;
            for (let n = element; n instanceof TestItemTreeElement; n = n.parent) {
                if (n.test && this.testService.excluded.contains(n.test)) {
                    this.filterState.toggleFilteringFor("@hidden" /* TestFilterTerm.Hidden */, true);
                    break;
                }
                if (!expand && (this.tree.hasElement(n) && this.tree.isCollapsed(n))) {
                    focusTarget = n;
                }
            }
            this.filterState.reveal.set(undefined, undefined);
            this.hasPendingReveal = false;
            if (focus) {
                this.tree.domFocus();
            }
            if (this.tree.getRelativeTop(focusTarget) === null) {
                this.tree.reveal(focusTarget, 0.5);
            }
            this.revealTimeout.value = disposableTimeout(() => {
                this.tree.setFocus([focusTarget]);
                this.tree.setSelection([focusTarget]);
            }, 1);
            return;
        }
        // If here, we've expanded all parents we can. Waiting on data to come
        // in to possibly show the revealed test.
        this.hasPendingReveal = true;
    }
    /**
     * Collapse all items in the tree.
     */
    async collapseAll() {
        this.tree.collapseAll();
    }
    /**
     * Tries to peek the first test error, if the item is in a failed state.
     */
    tryPeekError(item) {
        const lookup = item.test && this.testResults.getStateById(item.test.item.extId);
        return lookup && lookup[1].tasks.some(s => isFailedState(s.state))
            ? this.peekOpener.tryPeekFirstError(lookup[0], lookup[1], { preserveFocus: true })
            : false;
    }
    onContextMenu(evt) {
        const element = evt.element;
        if (!(element instanceof TestItemTreeElement)) {
            return;
        }
        const { actions } = getActionableElementActions(this.contextKeyService, this.menuService, this.testService, this.crService, this.testProfileService, element);
        this.contextMenuService.showContextMenu({
            getAnchor: () => evt.anchor,
            getActions: () => actions.secondary,
            getActionsContext: () => element,
            actionRunner: this.actionRunner,
        });
    }
    handleExecuteKeypress(evt) {
        const focused = this.tree.getFocus();
        const selected = this.tree.getSelection();
        let targeted;
        if (focused.length === 1 && selected.includes(focused[0])) {
            evt.browserEvent?.preventDefault();
            targeted = selected;
        }
        else {
            targeted = focused;
        }
        const toRun = targeted
            .filter((e) => e instanceof TestItemTreeElement);
        if (toRun.length) {
            this.testService.runTests({
                group: 2 /* TestRunProfileBitset.Run */,
                tests: toRun.map(t => t.test),
            });
        }
    }
    reevaluateWelcomeState() {
        const shouldShowWelcome = this.testService.collection.busyProviders === 0 && testCollectionIsEmpty(this.testService.collection);
        const welcomeExperience = shouldShowWelcome
            ? (this.filterState.isFilteringFor("@doc" /* TestFilterTerm.CurrentDoc */) ? 2 /* WelcomeExperience.ForDocument */ : 1 /* WelcomeExperience.ForWorkspace */)
            : 0 /* WelcomeExperience.None */;
        if (welcomeExperience !== this.welcomeExperience) {
            this.welcomeExperience = welcomeExperience;
            this.welcomeVisibilityEmitter.fire(welcomeExperience);
        }
    }
    ensureProjection() {
        return this.projection.value ?? this.updatePreferredProjection();
    }
    updatePreferredProjection() {
        this.projection.clear();
        const lastState = this.lastViewState.get({});
        if (this._viewMode.get() === "list" /* TestExplorerViewMode.List */) {
            this.projection.value = this.instantiationService.createInstance(ListProjection, lastState);
        }
        else {
            this.projection.value = this.instantiationService.createInstance(TreeProjection, lastState);
        }
        const scheduler = this._register(new RunOnceScheduler(() => this.applyProjectionChanges(), 200));
        this.projection.value.onUpdate(() => {
            if (!scheduler.isScheduled()) {
                scheduler.schedule();
            }
        });
        this.applyProjectionChanges();
        return this.projection.value;
    }
    applyProjectionChanges() {
        this.reevaluateWelcomeState();
        this.projection.value?.applyTo(this.tree);
        this.tree.refilter();
        if (this.hasPendingReveal) {
            this.revealById(this.filterState.reveal.get());
        }
    }
    /**
     * Gets the selected tests from the tree.
     */
    getSelectedTests() {
        return this.tree.getSelection();
    }
};
TestingExplorerViewModel = __decorate([
    __param(2, IConfigurationService),
    __param(3, IEditorService),
    __param(4, IEditorGroupsService),
    __param(5, IMenuService),
    __param(6, IContextMenuService),
    __param(7, ITestService),
    __param(8, ITestExplorerFilterState),
    __param(9, IInstantiationService),
    __param(10, IStorageService),
    __param(11, IContextKeyService),
    __param(12, ITestResultService),
    __param(13, ITestingPeekOpener),
    __param(14, ITestProfileService),
    __param(15, ITestingContinuousRunService),
    __param(16, ICommandService)
], TestingExplorerViewModel);
var FilterResult;
(function (FilterResult) {
    FilterResult[FilterResult["Exclude"] = 0] = "Exclude";
    FilterResult[FilterResult["Inherit"] = 1] = "Inherit";
    FilterResult[FilterResult["Include"] = 2] = "Include";
})(FilterResult || (FilterResult = {}));
const hasNodeInOrParentOfUri = (collection, ident, testUri, fromNode) => {
    const queue = [fromNode ? [fromNode] : collection.rootIds];
    while (queue.length) {
        for (const id of queue.pop()) {
            const node = collection.getNodeById(id);
            if (!node) {
                continue;
            }
            if (!node.item.uri || !ident.extUri.isEqualOrParent(testUri, node.item.uri)) {
                continue;
            }
            // Only show nodes that can be expanded (and might have a child with
            // a range) or ones that have a physical location.
            if (node.item.range || node.expand === 1 /* TestItemExpandState.Expandable */) {
                return true;
            }
            queue.push(node.children);
        }
    }
    return false;
};
let TestsFilter = class TestsFilter {
    constructor(collection, state, testService, uriIdentityService) {
        this.collection = collection;
        this.state = state;
        this.testService = testService;
        this.uriIdentityService = uriIdentityService;
        this.documentUris = [];
    }
    /**
     * @inheritdoc
     */
    filter(element) {
        if (element instanceof TestTreeErrorMessage) {
            return 1 /* TreeVisibility.Visible */;
        }
        if (element.test
            && !this.state.isFilteringFor("@hidden" /* TestFilterTerm.Hidden */)
            && this.testService.excluded.contains(element.test)) {
            return 0 /* TreeVisibility.Hidden */;
        }
        switch (Math.min(this.testFilterText(element), this.testLocation(element), this.testState(element), this.testTags(element))) {
            case 0 /* FilterResult.Exclude */:
                return 0 /* TreeVisibility.Hidden */;
            case 2 /* FilterResult.Include */:
                this.lastIncludedTests?.add(element);
                return 1 /* TreeVisibility.Visible */;
            default:
                return 2 /* TreeVisibility.Recurse */;
        }
    }
    filterToDocumentUri(uris) {
        this.documentUris = [...uris];
    }
    testTags(element) {
        if (!this.state.includeTags.size && !this.state.excludeTags.size) {
            return 2 /* FilterResult.Include */;
        }
        return (this.state.includeTags.size ?
            element.test.item.tags.some(t => this.state.includeTags.has(t)) :
            true) && element.test.item.tags.every(t => !this.state.excludeTags.has(t))
            ? 2 /* FilterResult.Include */
            : 1 /* FilterResult.Inherit */;
    }
    testState(element) {
        if (this.state.isFilteringFor("@failed" /* TestFilterTerm.Failed */)) {
            return isFailedState(element.state) ? 2 /* FilterResult.Include */ : 1 /* FilterResult.Inherit */;
        }
        if (this.state.isFilteringFor("@executed" /* TestFilterTerm.Executed */)) {
            return element.state !== 0 /* TestResultState.Unset */ ? 2 /* FilterResult.Include */ : 1 /* FilterResult.Inherit */;
        }
        return 2 /* FilterResult.Include */;
    }
    testLocation(element) {
        if (this.documentUris.length === 0) {
            return 2 /* FilterResult.Include */;
        }
        if ((!this.state.isFilteringFor("@doc" /* TestFilterTerm.CurrentDoc */) && !this.state.isFilteringFor("@openedFiles" /* TestFilterTerm.OpenedFiles */)) || !(element instanceof TestItemTreeElement)) {
            return 2 /* FilterResult.Include */;
        }
        if (this.documentUris.some(uri => hasNodeInOrParentOfUri(this.collection, this.uriIdentityService, uri, element.test.item.extId))) {
            return 2 /* FilterResult.Include */;
        }
        return 1 /* FilterResult.Inherit */;
    }
    testFilterText(element) {
        if (this.state.globList.length === 0) {
            return 2 /* FilterResult.Include */;
        }
        const fuzzy = this.state.fuzzy.value;
        for (let e = element; e; e = e.parent) {
            // start as included if the first glob is a negation
            let included = this.state.globList[0].include === false ? 2 /* FilterResult.Include */ : 1 /* FilterResult.Inherit */;
            const data = e.test.item.label.toLowerCase();
            for (const { include, text } of this.state.globList) {
                if (fuzzy ? fuzzyContains(data, text) : data.includes(text)) {
                    included = include ? 2 /* FilterResult.Include */ : 0 /* FilterResult.Exclude */;
                }
            }
            if (included !== 1 /* FilterResult.Inherit */) {
                return included;
            }
        }
        return 1 /* FilterResult.Inherit */;
    }
};
TestsFilter = __decorate([
    __param(1, ITestExplorerFilterState),
    __param(2, ITestService),
    __param(3, IUriIdentityService)
], TestsFilter);
class TreeSorter {
    constructor(viewModel) {
        this.viewModel = viewModel;
    }
    compare(a, b) {
        if (a instanceof TestTreeErrorMessage || b instanceof TestTreeErrorMessage) {
            return (a instanceof TestTreeErrorMessage ? -1 : 0) + (b instanceof TestTreeErrorMessage ? 1 : 0);
        }
        const durationDelta = (b.duration || 0) - (a.duration || 0);
        if (this.viewModel.viewSorting === "duration" /* TestExplorerViewSorting.ByDuration */ && durationDelta !== 0) {
            return durationDelta;
        }
        const stateDelta = cmpPriority(a.state, b.state);
        if (this.viewModel.viewSorting === "status" /* TestExplorerViewSorting.ByStatus */ && stateDelta !== 0) {
            return stateDelta;
        }
        let inSameLocation = false;
        if (a instanceof TestItemTreeElement && b instanceof TestItemTreeElement && a.test.item.uri && b.test.item.uri && a.test.item.uri.toString() === b.test.item.uri.toString() && a.test.item.range && b.test.item.range) {
            inSameLocation = true;
            const delta = a.test.item.range.startLineNumber - b.test.item.range.startLineNumber;
            if (delta !== 0) {
                return delta;
            }
        }
        const sa = a.test.item.sortText;
        const sb = b.test.item.sortText;
        // If tests are in the same location and there's no preferred sortText,
        // keep the extension's insertion order (#163449).
        return inSameLocation && !sa && !sb
            ? 0
            : compareFileNames(sa || a.test.item.label, sb || b.test.item.label);
    }
}
let NoTestsForDocumentWidget = class NoTestsForDocumentWidget extends Disposable {
    constructor(container, filterState) {
        super();
        const el = this.el = dom.append(container, dom.$('.testing-no-test-placeholder'));
        const emptyParagraph = dom.append(el, dom.$('p'));
        emptyParagraph.innerText = localize('testingNoTest', 'No tests were found in this file.');
        const buttonLabel = localize('testingFindExtension', 'Show Workspace Tests');
        const button = this._register(new Button(el, { title: buttonLabel, ...defaultButtonStyles }));
        button.label = buttonLabel;
        this._register(button.onDidClick(() => filterState.toggleFilteringFor("@doc" /* TestFilterTerm.CurrentDoc */, false)));
    }
    setVisible(isVisible) {
        this.el.classList.toggle('visible', isVisible);
    }
};
NoTestsForDocumentWidget = __decorate([
    __param(1, ITestExplorerFilterState)
], NoTestsForDocumentWidget);
class TestExplorerActionRunner extends ActionRunner {
    constructor(getSelectedTests) {
        super();
        this.getSelectedTests = getSelectedTests;
    }
    async runAction(action, context) {
        if (!(action instanceof MenuItemAction)) {
            return super.runAction(action, context);
        }
        const selection = this.getSelectedTests();
        const contextIsSelected = selection.some(s => s === context);
        const actualContext = contextIsSelected ? selection : [context];
        const actionable = actualContext.filter((t) => t instanceof TestItemTreeElement);
        await action.run(...actionable);
    }
}
const getLabelForTestTreeElement = (element) => {
    let label = labelForTestInState(element.description || element.test.item.label, element.state);
    if (element instanceof TestItemTreeElement) {
        if (element.duration !== undefined) {
            label = localize({
                key: 'testing.treeElementLabelDuration',
                comment: ['{0} is the original label in testing.treeElementLabel, {1} is a duration'],
            }, '{0}, in {1}', label, formatDuration(element.duration));
        }
        if (element.retired) {
            label = localize({
                key: 'testing.treeElementLabelOutdated',
                comment: ['{0} is the original label in testing.treeElementLabel'],
            }, '{0}, outdated result', label);
        }
    }
    return label;
};
class ListAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('testExplorer', "Test Explorer");
    }
    getAriaLabel(element) {
        return element instanceof TestTreeErrorMessage
            ? element.description
            : getLabelForTestTreeElement(element);
    }
}
class TreeKeyboardNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        return element instanceof TestTreeErrorMessage ? element.message : element.test.item.label;
    }
}
class ListDelegate {
    getHeight(element) {
        return element instanceof TestTreeErrorMessage ? 17 + 10 : 22;
    }
    getTemplateId(element) {
        if (element instanceof TestTreeErrorMessage) {
            return ErrorRenderer.ID;
        }
        return TestItemRenderer.ID;
    }
}
class IdentityProvider {
    getId(element) {
        return element.treeId;
    }
}
let ErrorRenderer = class ErrorRenderer {
    static { ErrorRenderer_1 = this; }
    static { this.ID = 'error'; }
    constructor(hoverService, markdownRendererService) {
        this.hoverService = hoverService;
        this.markdownRendererService = markdownRendererService;
    }
    get templateId() {
        return ErrorRenderer_1.ID;
    }
    renderTemplate(container) {
        const label = dom.append(container, dom.$('.error'));
        return { label, disposable: new DisposableStore() };
    }
    renderElement({ element }, _, data) {
        dom.clearNode(data.label);
        if (typeof element.message === 'string') {
            data.label.innerText = element.message;
        }
        else {
            const result = this.markdownRendererService.render(element.message, undefined, document.createElement('span'));
            data.label.appendChild(result.element);
        }
        data.disposable.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.label, element.description));
    }
    disposeTemplate(data) {
        data.disposable.dispose();
    }
};
ErrorRenderer = ErrorRenderer_1 = __decorate([
    __param(0, IHoverService),
    __param(1, IMarkdownRendererService)
], ErrorRenderer);
let TestItemRenderer = class TestItemRenderer extends Disposable {
    static { TestItemRenderer_1 = this; }
    static { this.ID = 'testItem'; }
    constructor(actionRunner, menuService, testService, profiles, contextKeyService, instantiationService, crService, hoverService) {
        super();
        this.actionRunner = actionRunner;
        this.menuService = menuService;
        this.testService = testService;
        this.profiles = profiles;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this.crService = crService;
        this.hoverService = hoverService;
        /**
         * @inheritdoc
         */
        this.templateId = TestItemRenderer_1.ID;
    }
    /**
     * @inheritdoc
     */
    renderTemplate(wrapper) {
        wrapper.classList.add('testing-stdtree-container');
        const icon = dom.append(wrapper, dom.$('.computed-state'));
        const label = dom.append(wrapper, dom.$('.label'));
        const disposable = new DisposableStore();
        dom.append(wrapper, dom.$(ThemeIcon.asCSSSelector(icons.testingHiddenIcon)));
        const actionBar = disposable.add(new ActionBar(wrapper, {
            actionRunner: this.actionRunner,
            actionViewItemProvider: (action, options) => action instanceof MenuItemAction
                ? this.instantiationService.createInstance(MenuEntryActionViewItem, action, { hoverDelegate: options.hoverDelegate })
                : undefined
        }));
        disposable.add(this.profiles.onDidChange(() => {
            if (templateData.current) {
                this.fillActionBar(templateData.current, templateData);
            }
        }));
        disposable.add(this.crService.onDidChange(changed => {
            const id = templateData.current?.test.item.extId;
            if (id && (!changed || changed === id || TestId.isChild(id, changed))) {
                this.fillActionBar(templateData.current, templateData);
            }
        }));
        const templateData = { wrapper, label, actionBar, icon, elementDisposable: new DisposableStore(), templateDisposable: disposable };
        return templateData;
    }
    /**
     * @inheritdoc
     */
    disposeTemplate(templateData) {
        templateData.templateDisposable.clear();
    }
    /**
     * @inheritdoc
     */
    disposeElement(_element, _, templateData) {
        templateData.elementDisposable.clear();
    }
    fillActionBar(element, data) {
        const { actions, contextOverlay } = getActionableElementActions(this.contextKeyService, this.menuService, this.testService, this.crService, this.profiles, element);
        const crSelf = !!contextOverlay.getContextKeyValue(TestingContextKeys.isContinuousModeOn.key);
        const crChild = !crSelf && this.crService.isEnabledForAChildOf(element.test.item.extId);
        data.actionBar.domNode.classList.toggle('testing-is-continuous-run', crSelf || crChild);
        data.actionBar.clear();
        data.actionBar.context = element;
        data.actionBar.push(actions.primary, { icon: true, label: false });
    }
    /**
     * @inheritdoc
     */
    renderElement(node, _depth, data) {
        data.elementDisposable.clear();
        data.current = node.element;
        data.elementDisposable.add(node.element.onChange(() => this._renderElement(node, data)));
        this._renderElement(node, data);
    }
    _renderElement(node, data) {
        this.fillActionBar(node.element, data);
        const testHidden = this.testService.excluded.contains(node.element.test);
        data.wrapper.classList.toggle('test-is-hidden', testHidden);
        const icon = icons.testingStatesToIcons.get(node.element.test.expand === 2 /* TestItemExpandState.BusyExpanding */ || node.element.test.item.busy
            ? 2 /* TestResultState.Running */
            : node.element.state);
        data.icon.className = 'computed-state ' + (icon ? ThemeIcon.asClassName(icon) : '');
        if (node.element.retired) {
            data.icon.className += ' retired';
        }
        data.elementDisposable.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.label, getLabelForTestTreeElement(node.element)));
        if (node.element.test.item.label.trim()) {
            dom.reset(data.label, ...renderLabelWithIcons(node.element.test.item.label));
        }
        else {
            data.label.textContent = String.fromCharCode(0xA0); // &nbsp;
        }
        let description = node.element.description;
        if (node.element.duration !== undefined) {
            description = description
                ? `${description}: ${formatDuration(node.element.duration)}`
                : formatDuration(node.element.duration);
        }
        if (description) {
            dom.append(data.label, dom.$('span.test-label-description', {}, description));
        }
    }
};
TestItemRenderer = TestItemRenderer_1 = __decorate([
    __param(1, IMenuService),
    __param(2, ITestService),
    __param(3, ITestProfileService),
    __param(4, IContextKeyService),
    __param(5, IInstantiationService),
    __param(6, ITestingContinuousRunService),
    __param(7, IHoverService)
], TestItemRenderer);
const formatDuration = (ms) => {
    if (ms < 10) {
        return `${ms.toFixed(1)}ms`;
    }
    if (ms < 1_000) {
        return `${ms.toFixed(0)}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
};
const getActionableElementActions = (contextKeyService, menuService, testService, crService, profiles, element) => {
    const test = element instanceof TestItemTreeElement ? element.test : undefined;
    const contextKeys = getTestItemContextOverlay(test, test ? profiles.capabilitiesForTest(test.item) : 0);
    contextKeys.push(['view', "workbench.view.testing" /* Testing.ExplorerViewId */]);
    if (test) {
        const ctrl = testService.getTestController(test.controllerId);
        const supportsCr = !!ctrl && profiles.getControllerProfiles(ctrl.id).some(p => p.supportsContinuousRun && canUseProfileWithTest(p, test));
        contextKeys.push([
            TestingContextKeys.canRefreshTests.key,
            ctrl && !!(ctrl.capabilities.get() & 2 /* TestControllerCapability.Refresh */) && TestId.isRoot(test.item.extId),
        ], [
            TestingContextKeys.testItemIsHidden.key,
            testService.excluded.contains(test)
        ], [
            TestingContextKeys.isContinuousModeOn.key,
            supportsCr && crService.isSpecificallyEnabledFor(test.item.extId)
        ], [
            TestingContextKeys.isParentRunningContinuously.key,
            supportsCr && crService.isEnabledForAParentOf(test.item.extId)
        ], [
            TestingContextKeys.supportsContinuousRun.key,
            supportsCr,
        ], [
            TestingContextKeys.testResultOutdated.key,
            element.retired,
        ], [
            TestingContextKeys.testResultState.key,
            testResultStateToContextValues[element.state],
        ]);
    }
    const contextOverlay = contextKeyService.createOverlay(contextKeys);
    const menu = menuService.getMenuActions(MenuId.TestItem, contextOverlay, {
        shouldForwardArgs: true,
    });
    const actions = getActionBarActions(menu, 'inline');
    return { actions, contextOverlay };
};
registerThemingParticipant((theme, collector) => {
    if (theme.type === 'dark') {
        const foregroundColor = theme.getColor(foreground);
        if (foregroundColor) {
            const fgWithOpacity = new Color(new RGBA(foregroundColor.rgba.r, foregroundColor.rgba.g, foregroundColor.rgba.b, 0.65));
            collector.addRule(`.test-explorer .test-explorer-messages { color: ${fgWithOpacity}; }`);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0V4cGxvcmVyVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90ZXN0aW5nRXhwbG9yZXJWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBR3ZELE9BQU8sRUFBRSxTQUFTLEVBQW1CLE1BQU0sb0RBQW9ELENBQUM7QUFDaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXRFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRTNGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBOEIsTUFBTSxnREFBZ0QsQ0FBQztBQUUvSCxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBVyxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDeEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxN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