/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../base/common/lifecycle.js';
import { Event, Emitter } from '../../base/common/event.js';
import { EventType, addDisposableListener, getClientArea, size, isAncestorUsingFlowTo, computeScreenAwareSize, getActiveDocument, getWindows, getActiveWindow, isActiveDocument, getWindow, getWindowId, getActiveElement, Dimension } from '../../base/browser/dom.js';
import { onDidChangeFullscreen, isFullscreen, isWCOEnabled } from '../../base/browser/browser.js';
import { isWindows, isLinux, isMacintosh, isWeb, isIOS } from '../../base/common/platform.js';
import { isResourceEditorInput, pathsToEditors } from '../common/editor.js';
import { SidebarPart } from './parts/sidebar/sidebarPart.js';
import { PanelPart } from './parts/panel/panelPart.js';
import { positionFromString, positionToString, partOpensMaximizedFromString, shouldShowCustomTitleBar, isHorizontal, isMultiWindowPart } from '../services/layout/browser/layoutService.js';
import { isTemporaryWorkspace, IWorkspaceContextService } from '../../platform/workspace/common/workspace.js';
import { IStorageService } from '../../platform/storage/common/storage.js';
import { IConfigurationService, isConfigured } from '../../platform/configuration/common/configuration.js';
import { ITitleService } from '../services/title/browser/titleService.js';
import { ILifecycleService } from '../services/lifecycle/common/lifecycle.js';
import { getMenuBarVisibility, hasNativeTitlebar, hasCustomTitlebar, useWindowControlsOverlay, DEFAULT_EMPTY_WINDOW_SIZE, DEFAULT_WORKSPACE_WINDOW_SIZE, hasNativeMenu } from '../../platform/window/common/window.js';
import { IHostService } from '../services/host/browser/host.js';
import { IBrowserWorkbenchEnvironmentService } from '../services/environment/browser/environmentService.js';
import { IEditorService } from '../services/editor/common/editorService.js';
import { IEditorGroupsService } from '../services/editor/common/editorGroupsService.js';
import { SerializableGrid, Sizing } from '../../base/browser/ui/grid/grid.js';
import { Part } from './part.js';
import { IStatusbarService } from '../services/statusbar/browser/statusbar.js';
import { IFileService } from '../../platform/files/common/files.js';
import { isCodeEditor } from '../../editor/browser/editorBrowser.js';
import { coalesce } from '../../base/common/arrays.js';
import { assertReturnsDefined } from '../../base/common/types.js';
import { INotificationService, NotificationsFilter } from '../../platform/notification/common/notification.js';
import { IThemeService } from '../../platform/theme/common/themeService.js';
import { WINDOW_ACTIVE_BORDER, WINDOW_INACTIVE_BORDER } from '../common/theme.js';
import { URI } from '../../base/common/uri.js';
import { IViewDescriptorService } from '../common/views.js';
import { DiffEditorInput } from '../common/editor/diffEditorInput.js';
import { mark } from '../../base/common/performance.js';
import { IExtensionService } from '../services/extensions/common/extensions.js';
import { ILogService } from '../../platform/log/common/log.js';
import { DeferredPromise, Promises } from '../../base/common/async.js';
import { IBannerService } from '../services/banner/browser/bannerService.js';
import { IPaneCompositePartService } from '../services/panecomposite/browser/panecomposite.js';
import { AuxiliaryBarPart } from './parts/auxiliarybar/auxiliaryBarPart.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { IAuxiliaryWindowService } from '../services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import { mainWindow } from '../../base/browser/window.js';
var LayoutClasses;
(function (LayoutClasses) {
    LayoutClasses["SIDEBAR_HIDDEN"] = "nosidebar";
    LayoutClasses["MAIN_EDITOR_AREA_HIDDEN"] = "nomaineditorarea";
    LayoutClasses["PANEL_HIDDEN"] = "nopanel";
    LayoutClasses["AUXILIARYBAR_HIDDEN"] = "noauxiliarybar";
    LayoutClasses["STATUSBAR_HIDDEN"] = "nostatusbar";
    LayoutClasses["FULLSCREEN"] = "fullscreen";
    LayoutClasses["MAXIMIZED"] = "maximized";
    LayoutClasses["WINDOW_BORDER"] = "border";
})(LayoutClasses || (LayoutClasses = {}));
const COMMAND_CENTER_SETTINGS = [
    'chat.commandCenter.enabled',
    'workbench.navigationControl.enabled',
    'workbench.experimental.share.enabled',
];
export const TITLE_BAR_SETTINGS = [
    "workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */,
    "window.commandCenter" /* LayoutSettings.COMMAND_CENTER */,
    ...COMMAND_CENTER_SETTINGS,
    "workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */,
    "workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */,
    "window.menuBarVisibility" /* MenuSettings.MenuBarVisibility */,
    "window.titleBarStyle" /* TitleBarSetting.TITLE_BAR_STYLE */,
    "window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */,
];
const DEFAULT_EMPTY_WINDOW_DIMENSIONS = new Dimension(DEFAULT_EMPTY_WINDOW_SIZE.width, DEFAULT_EMPTY_WINDOW_SIZE.height);
const DEFAULT_WORKSPACE_WINDOW_DIMENSIONS = new Dimension(DEFAULT_WORKSPACE_WINDOW_SIZE.width, DEFAULT_WORKSPACE_WINDOW_SIZE.height);
export class Layout extends Disposable {
    get activeContainer() { return this.getContainerFromDocument(getActiveDocument()); }
    get containers() {
        const containers = [];
        for (const { window } of getWindows()) {
            containers.push(this.getContainerFromDocument(window.document));
        }
        return containers;
    }
    getContainerFromDocument(targetDocument) {
        if (targetDocument === this.mainContainer.ownerDocument) {
            return this.mainContainer; // main window
        }
        else {
            // eslint-disable-next-line no-restricted-syntax
            return targetDocument.body.getElementsByClassName('monaco-workbench')[0]; // auxiliary window
        }
    }
    whenContainerStylesLoaded(window) {
        return this.containerStylesLoaded.get(window.vscodeWindowId);
    }
    get mainContainerDimension() { return this._mainContainerDimension; }
    get activeContainerDimension() {
        return this.getContainerDimension(this.activeContainer);
    }
    getContainerDimension(container) {
        if (container === this.mainContainer) {
            return this.mainContainerDimension; // main window
        }
        else {
            return getClientArea(container); // auxiliary window
        }
    }
    get mainContainerOffset() {
        return this.computeContainerOffset(mainWindow);
    }
    get activeContainerOffset() {
        return this.computeContainerOffset(getWindow(this.activeContainer));
    }
    computeContainerOffset(targetWindow) {
        let top = 0;
        let quickPickTop = 0;
        if (this.isVisible("workbench.parts.banner" /* Parts.BANNER_PART */)) {
            top = this.getPart("workbench.parts.banner" /* Parts.BANNER_PART */).maximumHeight;
            quickPickTop = top;
        }
        const titlebarVisible = this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, targetWindow);
        if (titlebarVisible) {
            top += this.getPart("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */).maximumHeight;
            quickPickTop = top;
        }
        const isCommandCenterVisible = titlebarVisible && this.configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */) !== false;
        if (isCommandCenterVisible) {
            // If the command center is visible then the quickinput
            // should go over the title bar and the banner
            quickPickTop = 6;
        }
        return { top, quickPickTop };
    }
    constructor(parent, layoutOptions) {
        super();
        this.parent = parent;
        this.layoutOptions = layoutOptions;
        //#region Events
        this._onDidChangeZenMode = this._register(new Emitter());
        this.onDidChangeZenMode = this._onDidChangeZenMode.event;
        this._onDidChangeMainEditorCenteredLayout = this._register(new Emitter());
        this.onDidChangeMainEditorCenteredLayout = this._onDidChangeMainEditorCenteredLayout.event;
        this._onDidChangePanelAlignment = this._register(new Emitter());
        this.onDidChangePanelAlignment = this._onDidChangePanelAlignment.event;
        this._onDidChangeWindowMaximized = this._register(new Emitter());
        this.onDidChangeWindowMaximized = this._onDidChangeWindowMaximized.event;
        this._onDidChangePanelPosition = this._register(new Emitter());
        this.onDidChangePanelPosition = this._onDidChangePanelPosition.event;
        this._onDidChangePartVisibility = this._register(new Emitter());
        this.onDidChangePartVisibility = this._onDidChangePartVisibility.event;
        this._onDidChangeNotificationsVisibility = this._register(new Emitter());
        this.onDidChangeNotificationsVisibility = this._onDidChangeNotificationsVisibility.event;
        this._onDidChangeAuxiliaryBarMaximized = this._register(new Emitter());
        this.onDidChangeAuxiliaryBarMaximized = this._onDidChangeAuxiliaryBarMaximized.event;
        this._onDidLayoutMainContainer = this._register(new Emitter());
        this.onDidLayoutMainContainer = this._onDidLayoutMainContainer.event;
        this._onDidLayoutActiveContainer = this._register(new Emitter());
        this.onDidLayoutActiveContainer = this._onDidLayoutActiveContainer.event;
        this._onDidLayoutContainer = this._register(new Emitter());
        this.onDidLayoutContainer = this._onDidLayoutContainer.event;
        this._onDidAddContainer = this._register(new Emitter());
        this.onDidAddContainer = this._onDidAddContainer.event;
        this._onDidChangeActiveContainer = this._register(new Emitter());
        this.onDidChangeActiveContainer = this._onDidChangeActiveContainer.event;
        //#endregion
        //#region Properties
        this.mainContainer = document.createElement('div');
        this.containerStylesLoaded = new Map();
        //#endregion
        this.parts = new Map();
        this.initialized = false;
        this.disposed = false;
        this._openedDefaultEditors = false;
        this.whenReadyPromise = new DeferredPromise();
        this.whenReady = this.whenReadyPromise.p;
        this.whenRestoredPromise = new DeferredPromise();
        this.whenRestored = this.whenRestoredPromise.p;
        this.restored = false;
        this.inMaximizedAuxiliaryBarTransition = false;
    }
    initLayout(accessor) {
        // Services
        this.environmentService = accessor.get(IBrowserWorkbenchEnvironmentService);
        this.configurationService = accessor.get(IConfigurationService);
        this.hostService = accessor.get(IHostService);
        this.contextService = accessor.get(IWorkspaceContextService);
        this.storageService = accessor.get(IStorageService);
        this.themeService = accessor.get(IThemeService);
        this.extensionService = accessor.get(IExtensionService);
        this.logService = accessor.get(ILogService);
        this.telemetryService = accessor.get(ITelemetryService);
        this.auxiliaryWindowService = accessor.get(IAuxiliaryWindowService);
        // Parts
        this.editorService = accessor.get(IEditorService);
        this.editorGroupService = accessor.get(IEditorGroupsService);
        this.mainPartEditorService = this.editorService.createScoped(this.editorGroupService.mainPart, this._store);
        this.paneCompositeService = accessor.get(IPaneCompositePartService);
        this.viewDescriptorService = accessor.get(IViewDescriptorService);
        this.titleService = accessor.get(ITitleService);
        this.notificationService = accessor.get(INotificationService);
        this.statusBarService = accessor.get(IStatusbarService);
        accessor.get(IBannerService);
        // Listeners
        this.registerLayoutListeners();
        // State
        this.initLayoutState(accessor.get(ILifecycleService), accessor.get(IFileService));
    }
    registerLayoutListeners() {
        // Restore editor if hidden and an editor is to show
        const showEditorIfHidden = () => {
            if (!this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, mainWindow)) {
                if (this.isAuxiliaryBarMaximized()) {
                    this.toggleMaximizedAuxiliaryBar();
                }
                else {
                    this.toggleMaximizedPanel();
                }
            }
        };
        // Wait to register these listeners after the editor group service
        // is ready to avoid conflicts on startup
        this.editorGroupService.whenRestored.then(() => {
            // Restore main editor part on any editor change in main part
            this._register(this.mainPartEditorService.onDidVisibleEditorsChange(showEditorIfHidden));
            this._register(this.editorGroupService.mainPart.onDidActivateGroup(showEditorIfHidden));
            // Revalidate center layout when active editor changes: diff editor quits centered mode.
            this._register(this.mainPartEditorService.onDidActiveEditorChange(() => this.centerMainEditorLayout(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED))));
        });
        // Configuration changes
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if ([
                ...TITLE_BAR_SETTINGS,
                LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION,
                LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE,
            ].some(setting => e.affectsConfiguration(setting))) {
                // Show Command Center if command center actions enabled
                const shareEnabled = e.affectsConfiguration('workbench.experimental.share.enabled') && this.configurationService.getValue('workbench.experimental.share.enabled');
                const navigationControlEnabled = e.affectsConfiguration('workbench.navigationControl.enabled') && this.configurationService.getValue('workbench.navigationControl.enabled');
                // Currently not supported for "chat.commandCenter.enabled" as we
                // programatically set this during setup and could lead to unwanted titlebar appearing
                // const chatControlsEnabled = e.affectsConfiguration('chat.commandCenter.enabled') && this.configurationService.getValue<boolean>('chat.commandCenter.enabled');
                if (shareEnabled || navigationControlEnabled) {
                    if (this.configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */) === false) {
                        this.configurationService.updateValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */, true);
                        return; // onDidChangeConfiguration will be triggered again
                    }
                }
                // Show Custom TitleBar if actions enabled in (or moved to) the titlebar
                const editorActionsMovedToTitlebar = e.affectsConfiguration("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */) && this.configurationService.getValue("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */) === "titleBar" /* EditorActionsLocation.TITLEBAR */;
                const commandCenterEnabled = e.affectsConfiguration("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */) && this.configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */);
                const layoutControlsEnabled = e.affectsConfiguration("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */) && this.configurationService.getValue("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */);
                const activityBarMovedToTopOrBottom = e.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */) && ["top" /* ActivityBarPosition.TOP */, "bottom" /* ActivityBarPosition.BOTTOM */].includes(this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */));
                if (activityBarMovedToTopOrBottom || editorActionsMovedToTitlebar || commandCenterEnabled || layoutControlsEnabled) {
                    if (this.configurationService.getValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */) === "never" /* CustomTitleBarVisibility.NEVER */) {
                        this.configurationService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "auto" /* CustomTitleBarVisibility.AUTO */);
                        return; // onDidChangeConfiguration will be triggered again
                    }
                }
                this.doUpdateLayoutConfiguration();
            }
        }));
        // Fullscreen changes
        this._register(onDidChangeFullscreen(windowId => this.onFullscreenChanged(windowId)));
        // Group changes
        this._register(this.editorGroupService.mainPart.onDidAddGroup(() => this.centerMainEditorLayout(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED))));
        this._register(this.editorGroupService.mainPart.onDidRemoveGroup(() => this.centerMainEditorLayout(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED))));
        this._register(this.editorGroupService.mainPart.onDidChangeGroupMaximized(() => this.centerMainEditorLayout(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED))));
        // Prevent workbench from scrolling #55456
        this._register(addDisposableListener(this.mainContainer, EventType.SCROLL, () => this.mainContainer.scrollTop = 0));
        // Menubar visibility changes
        const showingCustomMenu = (isWindows || isLinux || isWeb) && !hasNativeTitlebar(this.configurationService);
        if (showingCustomMenu) {
            this._register(this.titleService.onMenubarVisibilityChange(visible => this.onMenubarToggled(visible)));
        }
        // Theme changes
        this._register(this.themeService.onDidColorThemeChange(() => this.updateWindowBorder()));
        // Window active / focus changes
        this._register(this.hostService.onDidChangeFocus(focused => this.onWindowFocusChanged(focused)));
        this._register(this.hostService.onDidChangeActiveWindow(() => this.onActiveWindowChanged()));
        // WCO changes
        if (isWeb && typeof navigator.windowControlsOverlay === 'object') {
            this._register(addDisposableListener(navigator.windowControlsOverlay, 'geometrychange', () => this.onDidChangeWCO()));
        }
        // Auxiliary windows
        this._register(this.auxiliaryWindowService.onDidOpenAuxiliaryWindow(({ window, disposables }) => {
            const windowId = window.window.vscodeWindowId;
            this.containerStylesLoaded.set(windowId, window.whenStylesHaveLoaded);
            window.whenStylesHaveLoaded.then(() => this.containerStylesLoaded.delete(windowId));
            disposables.add(toDisposable(() => this.containerStylesLoaded.delete(windowId)));
            const eventDisposables = disposables.add(new DisposableStore());
            this._onDidAddContainer.fire({ container: window.container, disposables: eventDisposables });
            disposables.add(window.onDidLayout(dimension => this.handleContainerDidLayout(window.container, dimension)));
        }));
    }
    onMenubarToggled(visible) {
        if (visible !== this.state.runtime.menuBar.toggled) {
            this.state.runtime.menuBar.toggled = visible;
            const menuBarVisibility = getMenuBarVisibility(this.configurationService);
            // The menu bar toggles the title bar in web because it does not need to be shown for window controls only
            if (isWeb && menuBarVisibility === 'toggle') {
                this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled));
            }
            // The menu bar toggles the title bar in full screen for toggle and classic settings
            else if (this.state.runtime.mainWindowFullscreen && (menuBarVisibility === 'toggle' || menuBarVisibility === 'classic')) {
                this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled));
            }
            // Move layout call to any time the menubar
            // is toggled to update consumers of offset
            // see issue #115267
            this.handleContainerDidLayout(this.mainContainer, this._mainContainerDimension);
        }
    }
    handleContainerDidLayout(container, dimension) {
        if (container === this.mainContainer) {
            this._onDidLayoutMainContainer.fire(dimension);
        }
        if (isActiveDocument(container)) {
            this._onDidLayoutActiveContainer.fire(dimension);
        }
        this._onDidLayoutContainer.fire({ container, dimension });
    }
    onFullscreenChanged(windowId) {
        if (windowId !== mainWindow.vscodeWindowId) {
            return; // ignore all but main window
        }
        this.state.runtime.mainWindowFullscreen = isFullscreen(mainWindow);
        // Apply as CSS class
        if (this.state.runtime.mainWindowFullscreen) {
            this.mainContainer.classList.add(LayoutClasses.FULLSCREEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.FULLSCREEN);
            const zenModeExitInfo = this.stateModel.getRuntimeValue(LayoutStateKeys.ZEN_MODE_EXIT_INFO);
            if (zenModeExitInfo.transitionedToFullScreen && this.isZenModeActive()) {
                this.toggleZenMode();
            }
        }
        // Change edge snapping accordingly
        this.workbenchGrid.edgeSnapping = this.state.runtime.mainWindowFullscreen;
        // Changing fullscreen state of the main window has an impact
        // on custom title bar visibility, so we need to update
        if (hasCustomTitlebar(this.configurationService)) {
            // Propagate to grid
            this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled));
            // Indicate active window border
            this.updateWindowBorder(true);
        }
    }
    onActiveWindowChanged() {
        const activeContainerId = this.getActiveContainerId();
        if (this.state.runtime.activeContainerId !== activeContainerId) {
            this.state.runtime.activeContainerId = activeContainerId;
            // Indicate active window border
            this.updateWindowBorder();
            this._onDidChangeActiveContainer.fire();
        }
    }
    onWindowFocusChanged(hasFocus) {
        if (this.state.runtime.hasFocus !== hasFocus) {
            this.state.runtime.hasFocus = hasFocus;
            // Indicate active window border
            this.updateWindowBorder();
        }
    }
    getActiveContainerId() {
        const activeContainer = this.activeContainer;
        return getWindow(activeContainer).vscodeWindowId;
    }
    doUpdateLayoutConfiguration(skipLayout) {
        // Custom Titlebar visibility with native titlebar
        this.updateCustomTitleBarVisibility();
        // Menubar visibility
        this.updateMenubarVisibility(!!skipLayout);
        // Centered Layout
        this.editorGroupService.whenRestored.then(() => this.centerMainEditorLayout(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED), skipLayout));
    }
    setSideBarPosition(position) {
        const activityBar = this.getPart("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */);
        const sideBar = this.getPart("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        const auxiliaryBar = this.getPart("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        const newPositionValue = (position === 0 /* Position.LEFT */) ? 'left' : 'right';
        const oldPositionValue = (position === 1 /* Position.RIGHT */) ? 'left' : 'right';
        const panelAlignment = this.getPanelAlignment();
        const panelPosition = this.getPanelPosition();
        this.stateModel.setRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON, position);
        // Adjust CSS
        const activityBarContainer = assertReturnsDefined(activityBar.getContainer());
        const sideBarContainer = assertReturnsDefined(sideBar.getContainer());
        const auxiliaryBarContainer = assertReturnsDefined(auxiliaryBar.getContainer());
        activityBarContainer.classList.remove(oldPositionValue);
        sideBarContainer.classList.remove(oldPositionValue);
        activityBarContainer.classList.add(newPositionValue);
        sideBarContainer.classList.add(newPositionValue);
        // Auxiliary Bar has opposite values
        auxiliaryBarContainer.classList.remove(newPositionValue);
        auxiliaryBarContainer.classList.add(oldPositionValue);
        // Update Styles
        activityBar.updateStyles();
        sideBar.updateStyles();
        auxiliaryBar.updateStyles();
        // Move activity bar and side bars
        this.adjustPartPositions(position, panelAlignment, panelPosition);
    }
    updateWindowBorder(skipLayout = false) {
        if (isWeb ||
            isWindows || // not working well with zooming (border often not visible)
            ((isWindows || isLinux) &&
                useWindowControlsOverlay(this.configurationService) // Windows/Linux: not working with WCO (border cannot draw over the overlay)
            ) ||
            hasNativeTitlebar(this.configurationService)) {
            return;
        }
        const theme = this.themeService.getColorTheme();
        const activeBorder = theme.getColor(WINDOW_ACTIVE_BORDER);
        const inactiveBorder = theme.getColor(WINDOW_INACTIVE_BORDER);
        const didHaveMainWindowBorder = this.hasMainWindowBorder();
        for (const container of this.containers) {
            const isMainContainer = container === this.mainContainer;
            const isActiveContainer = this.activeContainer === container;
            let windowBorder = false;
            if (!this.state.runtime.mainWindowFullscreen && (activeBorder || inactiveBorder)) {
                windowBorder = true;
                // If the inactive color is missing, fallback to the active one
                const borderColor = isActiveContainer && this.state.runtime.hasFocus ? activeBorder : inactiveBorder ?? activeBorder;
                container.style.setProperty('--window-border-color', borderColor?.toString() ?? 'transparent');
            }
            if (isMainContainer) {
                this.state.runtime.mainWindowBorder = windowBorder;
            }
            container.classList.toggle(LayoutClasses.WINDOW_BORDER, windowBorder);
        }
        if (!skipLayout && didHaveMainWindowBorder !== this.hasMainWindowBorder()) {
            this.layout();
        }
    }
    initLayoutState(lifecycleService, fileService) {
        this._mainContainerDimension = getClientArea(this.parent, this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ ? DEFAULT_EMPTY_WINDOW_DIMENSIONS : DEFAULT_WORKSPACE_WINDOW_DIMENSIONS); // running with fallback to ensure no error is thrown (https://github.com/microsoft/vscode/issues/240242)
        this.stateModel = new LayoutStateModel(this.storageService, this.configurationService, this.contextService, this.environmentService);
        this.stateModel.load({
            mainContainerDimension: this._mainContainerDimension,
            resetLayout: Boolean(this.layoutOptions?.resetLayout)
        });
        this._register(this.stateModel.onDidChangeState(change => {
            if (change.key === LayoutStateKeys.ACTIVITYBAR_HIDDEN) {
                this.setActivityBarHidden(change.value);
            }
            if (change.key === LayoutStateKeys.STATUSBAR_HIDDEN) {
                this.setStatusBarHidden(change.value);
            }
            if (change.key === LayoutStateKeys.SIDEBAR_POSITON) {
                this.setSideBarPosition(change.value);
            }
            if (change.key === LayoutStateKeys.PANEL_POSITION) {
                this.setPanelPosition(change.value);
            }
            if (change.key === LayoutStateKeys.PANEL_ALIGNMENT) {
                this.setPanelAlignment(change.value);
            }
            this.doUpdateLayoutConfiguration();
        }));
        // Layout Initialization State
        const initialEditorsState = this.getInitialEditorsState();
        if (initialEditorsState) {
            this.logService.trace('Initial editor state', initialEditorsState);
        }
        const initialLayoutState = {
            layout: {
                editors: initialEditorsState?.layout
            },
            editor: {
                restoreEditors: this.shouldRestoreEditors(this.contextService, initialEditorsState),
                editorsToOpen: this.resolveEditorsToOpen(fileService, initialEditorsState),
            },
            views: {
                defaults: this.getDefaultLayoutViews(this.environmentService, this.storageService),
                containerToRestore: {}
            }
        };
        // Layout Runtime State
        const layoutRuntimeState = {
            activeContainerId: this.getActiveContainerId(),
            mainWindowFullscreen: isFullscreen(mainWindow),
            hasFocus: this.hostService.hasFocus,
            maximized: new Set(),
            mainWindowBorder: false,
            menuBar: {
                toggled: false,
            },
            zenMode: {
                transitionDisposables: new DisposableMap(),
            }
        };
        this.state = {
            initialization: initialLayoutState,
            runtime: layoutRuntimeState,
        };
        // Sidebar View Container To Restore
        if (this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            let viewContainerToRestore = this.storageService.get(SidebarPart.activeViewletSettingsKey, 1 /* StorageScope.WORKSPACE */, this.viewDescriptorService.getDefaultViewContainer(0 /* ViewContainerLocation.Sidebar */)?.id);
            if (!this.environmentService.isBuilt ||
                lifecycleService.startupKind === 3 /* StartupKind.ReloadedWindow */ ||
                this.environmentService.isExtensionDevelopment && !this.environmentService.extensionTestsLocationURI) {
                // allow to restore a non-default viewlet in development mode or when window reloads
            }
            else if (viewContainerToRestore !== this.viewDescriptorService.getDefaultViewContainer(0 /* ViewContainerLocation.Sidebar */)?.id &&
                viewContainerToRestore !== this.viewDescriptorService.getDefaultViewContainer(2 /* ViewContainerLocation.AuxiliaryBar */)?.id) {
                // fallback to default viewlet otherwise if the viewlet is not a default viewlet
                viewContainerToRestore = this.viewDescriptorService.getDefaultViewContainer(0 /* ViewContainerLocation.Sidebar */)?.id;
            }
            if (viewContainerToRestore) {
                this.state.initialization.views.containerToRestore.sideBar = viewContainerToRestore;
            }
            else {
                this.stateModel.setRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN, true);
            }
        }
        // Panel View Container To Restore
        if (this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            const viewContainerToRestore = this.storageService.get(PanelPart.activePanelSettingsKey, 1 /* StorageScope.WORKSPACE */, this.viewDescriptorService.getDefaultViewContainer(1 /* ViewContainerLocation.Panel */)?.id);
            if (viewContainerToRestore) {
                this.state.initialization.views.containerToRestore.panel = viewContainerToRestore;
            }
            else {
                this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_HIDDEN, true);
            }
        }
        // Auxiliary View to restore
        if (this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            const viewContainerToRestore = this.storageService.get(AuxiliaryBarPart.activeViewSettingsKey, 1 /* StorageScope.WORKSPACE */, this.viewDescriptorService.getDefaultViewContainer(2 /* ViewContainerLocation.AuxiliaryBar */)?.id);
            if (viewContainerToRestore) {
                this.state.initialization.views.containerToRestore.auxiliaryBar = viewContainerToRestore;
            }
            else {
                this.stateModel.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN, true);
            }
        }
        // Window border
        this.updateWindowBorder(true);
    }
    getDefaultLayoutViews(environmentService, storageService) {
        const defaultLayout = environmentService.options?.defaultLayout;
        if (!defaultLayout) {
            return undefined;
        }
        if (!defaultLayout.force && !storageService.isNew(1 /* StorageScope.WORKSPACE */)) {
            return undefined;
        }
        const { views } = defaultLayout;
        if (views?.length) {
            return views.map(view => view.id);
        }
        return undefined;
    }
    shouldRestoreEditors(contextService, initialEditorsState) {
        // Restore editors based on a set of rules:
        // - never when running on temporary workspace
        // - not when we have files to open, unless:
        // - always when `window.restoreWindows: preserve`
        if (isTemporaryWorkspace(contextService.getWorkspace())) {
            return false;
        }
        const forceRestoreEditors = this.configurationService.getValue('window.restoreWindows') === 'preserve';
        return !!forceRestoreEditors || initialEditorsState === undefined;
    }
    willRestoreEditors() {
        return this.state.initialization.editor.restoreEditors;
    }
    async resolveEditorsToOpen(fileService, initialEditorsState) {
        if (initialEditorsState) {
            // Merge editor (single)
            const filesToMerge = coalesce(await pathsToEditors(initialEditorsState.filesToMerge, fileService, this.logService));
            if (filesToMerge.length === 4 && isResourceEditorInput(filesToMerge[0]) && isResourceEditorInput(filesToMerge[1]) && isResourceEditorInput(filesToMerge[2]) && isResourceEditorInput(filesToMerge[3])) {
                return [{
                        editor: {
                            input1: { resource: filesToMerge[0].resource },
                            input2: { resource: filesToMerge[1].resource },
                            base: { resource: filesToMerge[2].resource },
                            result: { resource: filesToMerge[3].resource },
                            options: { pinned: true }
                        }
                    }];
            }
            // Diff editor (single)
            const filesToDiff = coalesce(await pathsToEditors(initialEditorsState.filesToDiff, fileService, this.logService));
            if (filesToDiff.length === 2) {
                return [{
                        editor: {
                            original: { resource: filesToDiff[0].resource },
                            modified: { resource: filesToDiff[1].resource },
                            options: { pinned: true }
                        }
                    }];
            }
            // Normal editor (multiple)
            const filesToOpenOrCreate = [];
            const resolvedFilesToOpenOrCreate = await pathsToEditors(initialEditorsState.filesToOpenOrCreate, fileService, this.logService);
            for (let i = 0; i < resolvedFilesToOpenOrCreate.length; i++) {
                const resolvedFileToOpenOrCreate = resolvedFilesToOpenOrCreate[i];
                if (resolvedFileToOpenOrCreate) {
                    filesToOpenOrCreate.push({
                        editor: resolvedFileToOpenOrCreate,
                        viewColumn: initialEditorsState.filesToOpenOrCreate?.[i].viewColumn // take over `viewColumn` from initial state
                    });
                }
            }
            return filesToOpenOrCreate;
        }
        // Empty workbench configured to open untitled file if empty
        else if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ && this.configurationService.getValue('workbench.startupEditor') === 'newUntitledFile') {
            if (this.editorGroupService.hasRestorableState) {
                return []; // do not open any empty untitled file if we restored groups/editors from previous session
            }
            return [{
                    editor: { resource: undefined } // open empty untitled file
                }];
        }
        return [];
    }
    get openedDefaultEditors() { return this._openedDefaultEditors; }
    getInitialEditorsState() {
        // Check for editors / editor layout from `defaultLayout` options first
        const defaultLayout = this.environmentService.options?.defaultLayout;
        if ((defaultLayout?.editors?.length || defaultLayout?.layout?.editors) && (defaultLayout.force || this.storageService.isNew(1 /* StorageScope.WORKSPACE */))) {
            this._openedDefaultEditors = true;
            return {
                layout: defaultLayout.layout?.editors,
                filesToOpenOrCreate: defaultLayout?.editors?.map(editor => {
                    return {
                        viewColumn: editor.viewColumn,
                        fileUri: URI.revive(editor.uri),
                        openOnlyIfExists: editor.openOnlyIfExists,
                        options: editor.options
                    };
                })
            };
        }
        // Then check for files to open, create or diff/merge from main side
        const { filesToOpenOrCreate, filesToDiff, filesToMerge } = this.environmentService;
        if (filesToOpenOrCreate || filesToDiff || filesToMerge) {
            return { filesToOpenOrCreate, filesToDiff, filesToMerge };
        }
        return undefined;
    }
    isRestored() {
        return this.restored;
    }
    restoreParts() {
        // distinguish long running restore operations that
        // are required for the layout to be ready from those
        // that are needed to signal restoring is done
        const layoutReadyPromises = [];
        const layoutRestoredPromises = [];
        // Restore editors
        layoutReadyPromises.push((async () => {
            mark('code/willRestoreEditors');
            // first ensure the editor part is ready
            await this.editorGroupService.whenReady;
            mark('code/restoreEditors/editorGroupsReady');
            // apply editor layout if any
            if (this.state.initialization.layout?.editors) {
                this.editorGroupService.mainPart.applyLayout(this.state.initialization.layout.editors);
            }
            // then see for editors to open as instructed
            // it is important that we trigger this from
            // the overall restore flow to reduce possible
            // flicker on startup: we want any editor to
            // open to get a chance to open first before
            // signaling that layout is restored, but we do
            // not need to await the editors from having
            // fully loaded.
            const editors = await this.state.initialization.editor.editorsToOpen;
            mark('code/restoreEditors/editorsToOpenResolved');
            let openEditorsPromise = undefined;
            if (editors.length) {
                // we have to map editors to their groups as instructed
                // by the input. this is important to ensure that we open
                // the editors in the groups they belong to.
                const editorGroupsInVisualOrder = this.editorGroupService.mainPart.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
                const mapEditorsToGroup = new Map();
                for (const editor of editors) {
                    const group = editorGroupsInVisualOrder[(editor.viewColumn ?? 1) - 1]; // viewColumn is index+1 based
                    let editorsByGroup = mapEditorsToGroup.get(group.id);
                    if (!editorsByGroup) {
                        editorsByGroup = new Set();
                        mapEditorsToGroup.set(group.id, editorsByGroup);
                    }
                    editorsByGroup.add(editor.editor);
                }
                openEditorsPromise = Promise.all(Array.from(mapEditorsToGroup).map(async ([groupId, editors]) => {
                    try {
                        await this.editorService.openEditors(Array.from(editors), groupId, { validateTrust: true });
                    }
                    catch (error) {
                        this.logService.error(error);
                    }
                }));
            }
            // do not block the overall layout ready flow from potentially
            // slow editors to resolve on startup
            layoutRestoredPromises.push(Promise.all([
                openEditorsPromise?.finally(() => mark('code/restoreEditors/editorsOpened')),
                this.editorGroupService.whenRestored.finally(() => mark('code/restoreEditors/editorGroupsRestored'))
            ]).finally(() => {
                // the `code/didRestoreEditors` perf mark is specifically
                // for when visible editors have resolved, so we only mark
                // if when editor group service has restored.
                mark('code/didRestoreEditors');
            }));
        })());
        // Restore default views (only when `IDefaultLayout` is provided)
        const restoreDefaultViewsPromise = (async () => {
            if (this.state.initialization.views.defaults?.length) {
                mark('code/willOpenDefaultViews');
                const locationsRestored = [];
                const tryOpenView = (view) => {
                    const location = this.viewDescriptorService.getViewLocationById(view.id);
                    if (location !== null) {
                        const container = this.viewDescriptorService.getViewContainerByViewId(view.id);
                        if (container) {
                            if (view.order >= (locationsRestored?.[location]?.order ?? 0)) {
                                locationsRestored[location] = { id: container.id, order: view.order };
                            }
                            const containerModel = this.viewDescriptorService.getViewContainerModel(container);
                            containerModel.setCollapsed(view.id, false);
                            containerModel.setVisible(view.id, true);
                            return true;
                        }
                    }
                    return false;
                };
                const defaultViews = [...this.state.initialization.views.defaults].reverse().map((v, index) => ({ id: v, order: index }));
                let i = defaultViews.length;
                while (i) {
                    i--;
                    if (tryOpenView(defaultViews[i])) {
                        defaultViews.splice(i, 1);
                    }
                }
                // If we still have views left over, wait until all extensions have been registered and try again
                if (defaultViews.length) {
                    await this.extensionService.whenInstalledExtensionsRegistered();
                    let i = defaultViews.length;
                    while (i) {
                        i--;
                        if (tryOpenView(defaultViews[i])) {
                            defaultViews.splice(i, 1);
                        }
                    }
                }
                // If we opened a view in the sidebar, stop any restore there
                if (locationsRestored[0 /* ViewContainerLocation.Sidebar */]) {
                    this.state.initialization.views.containerToRestore.sideBar = locationsRestored[0 /* ViewContainerLocation.Sidebar */].id;
                }
                // If we opened a view in the panel, stop any restore there
                if (locationsRestored[1 /* ViewContainerLocation.Panel */]) {
                    this.state.initialization.views.containerToRestore.panel = locationsRestored[1 /* ViewContainerLocation.Panel */].id;
                }
                // If we opened a view in the auxiliary bar, stop any restore there
                if (locationsRestored[2 /* ViewContainerLocation.AuxiliaryBar */]) {
                    this.state.initialization.views.containerToRestore.auxiliaryBar = locationsRestored[2 /* ViewContainerLocation.AuxiliaryBar */].id;
                }
                mark('code/didOpenDefaultViews');
            }
        })();
        layoutReadyPromises.push(restoreDefaultViewsPromise);
        // Restore Sidebar
        layoutReadyPromises.push((async () => {
            // Restoring views could mean that sidebar already
            // restored, as such we need to test again
            await restoreDefaultViewsPromise;
            if (!this.state.initialization.views.containerToRestore.sideBar) {
                return;
            }
            mark('code/willRestoreViewlet');
            await this.openViewContainer(0 /* ViewContainerLocation.Sidebar */, this.state.initialization.views.containerToRestore.sideBar);
            mark('code/didRestoreViewlet');
        })());
        // Restore Panel
        layoutReadyPromises.push((async () => {
            // Restoring views could mean that panel already
            // restored, as such we need to test again
            await restoreDefaultViewsPromise;
            if (!this.state.initialization.views.containerToRestore.panel) {
                return;
            }
            mark('code/willRestorePanel');
            await this.openViewContainer(1 /* ViewContainerLocation.Panel */, this.state.initialization.views.containerToRestore.panel);
            mark('code/didRestorePanel');
        })());
        // Restore Auxiliary Bar
        layoutReadyPromises.push((async () => {
            // Restoring views could mean that auxbar already
            // restored, as such we need to test again
            await restoreDefaultViewsPromise;
            if (!this.state.initialization.views.containerToRestore.auxiliaryBar) {
                return;
            }
            mark('code/willRestoreAuxiliaryBar');
            await this.openViewContainer(2 /* ViewContainerLocation.AuxiliaryBar */, this.state.initialization.views.containerToRestore.auxiliaryBar);
            mark('code/didRestoreAuxiliaryBar');
        })());
        // Restore Zen Mode
        const zenModeWasActive = this.isZenModeActive();
        const restoreZenMode = getZenModeConfiguration(this.configurationService).restore;
        if (zenModeWasActive) {
            this.setZenModeActive(!restoreZenMode);
            this.toggleZenMode(false, true);
        }
        // Restore Main Editor Center Mode
        if (this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED)) {
            this.centerMainEditorLayout(true, true);
        }
        // Await for promises that we recorded to update
        // our ready and restored states properly.
        Promises.settled(layoutReadyPromises).finally(() => {
            // Focus the active maximized part in case we have
            // not yet focused a specific element and panel
            // or auxiliary bar are maximized.
            if (getActiveElement() === mainWindow.document.body && (this.isPanelMaximized() || this.isAuxiliaryBarMaximized())) {
                this.focus();
            }
            this.whenReadyPromise.complete();
            Promises.settled(layoutRestoredPromises).finally(() => {
                this.restored = true;
                this.whenRestoredPromise.complete();
            });
        });
    }
    async openViewContainer(location, id, focus) {
        let viewContainer = await this.paneCompositeService.openPaneComposite(id, location, focus);
        if (viewContainer) {
            return;
        }
        // fallback to default view container
        viewContainer = await this.paneCompositeService.openPaneComposite(this.viewDescriptorService.getDefaultViewContainer(location)?.id, location, focus);
        if (viewContainer) {
            return;
        }
        // finally try to just open the first visible view container
        await this.paneCompositeService.openPaneComposite(this.paneCompositeService.getVisiblePaneCompositeIds(location).at(0), location, focus);
    }
    registerPart(part) {
        const id = part.getId();
        this.parts.set(id, part);
        return toDisposable(() => this.parts.delete(id));
    }
    getPart(key) {
        const part = this.parts.get(key);
        if (!part) {
            throw new Error(`Unknown part ${key}`);
        }
        return part;
    }
    registerNotifications(delegate) {
        this._register(delegate.onDidChangeNotificationsVisibility(visible => this._onDidChangeNotificationsVisibility.fire(visible)));
    }
    hasFocus(part) {
        const container = this.getContainer(getActiveWindow(), part);
        if (!container) {
            return false;
        }
        const activeElement = getActiveElement();
        if (!activeElement) {
            return false;
        }
        return isAncestorUsingFlowTo(activeElement, container);
    }
    _getFocusedPart() {
        for (const part of this.parts.keys()) {
            if (this.hasFocus(part)) {
                return part;
            }
        }
        return undefined;
    }
    focusPart(part, targetWindow = mainWindow) {
        const container = this.getContainer(targetWindow, part) ?? this.mainContainer;
        switch (part) {
            case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                this.editorGroupService.getPart(container).activeGroup.focus();
                break;
            case "workbench.parts.panel" /* Parts.PANEL_PART */: {
                this.paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */)?.focus();
                break;
            }
            case "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */: {
                this.paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */)?.focus();
                break;
            }
            case "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */: {
                this.paneCompositeService.getActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */)?.focus();
                break;
            }
            case "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */:
                this.getPart("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */).focusActivityBar();
                break;
            case "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */:
                this.statusBarService.getPart(container).focus();
                break;
            default: {
                container?.focus();
            }
        }
    }
    getContainer(targetWindow, part) {
        if (typeof part === 'undefined') {
            return this.getContainerFromDocument(targetWindow.document);
        }
        if (targetWindow === mainWindow) {
            return this.getPart(part).getContainer();
        }
        // Only some parts are supported for auxiliary windows
        let partCandidate;
        if (part === "workbench.parts.editor" /* Parts.EDITOR_PART */) {
            partCandidate = this.editorGroupService.getPart(this.getContainerFromDocument(targetWindow.document));
        }
        else if (part === "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */) {
            partCandidate = this.statusBarService.getPart(this.getContainerFromDocument(targetWindow.document));
        }
        else if (part === "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */) {
            partCandidate = this.titleService.getPart(this.getContainerFromDocument(targetWindow.document));
        }
        if (partCandidate instanceof Part) {
            return partCandidate.getContainer();
        }
        return undefined;
    }
    isVisible(part, targetWindow = mainWindow) {
        if (targetWindow !== mainWindow && part === "workbench.parts.editor" /* Parts.EDITOR_PART */) {
            return true; // cannot hide editor part in auxiliary windows
        }
        switch (part) {
            case "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */:
                return this.initialized ?
                    this.workbenchGrid.isViewVisible(this.titleBarPartView) :
                    shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled);
            case "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN);
            case "workbench.parts.panel" /* Parts.PANEL_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN);
            case "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN);
            case "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN);
            case "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN);
            case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN);
            case "workbench.parts.banner" /* Parts.BANNER_PART */:
                return this.initialized ? this.workbenchGrid.isViewVisible(this.bannerPartView) : false;
            default:
                return false; // any other part cannot be hidden
        }
    }
    shouldShowBannerFirst() {
        return isWeb && !isWCOEnabled();
    }
    focus() {
        if (this.isPanelMaximized() && this.mainContainer === this.activeContainer) {
            this.focusPart("workbench.parts.panel" /* Parts.PANEL_PART */);
        }
        else if (this.isAuxiliaryBarMaximized() && this.mainContainer === this.activeContainer) {
            this.focusPart("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        }
        else {
            this.focusPart("workbench.parts.editor" /* Parts.EDITOR_PART */, getWindow(this.activeContainer));
        }
    }
    focusPanelOrEditor() {
        const activePanel = this.paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */);
        if ((this.hasFocus("workbench.parts.panel" /* Parts.PANEL_PART */) || !this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */)) && activePanel) {
            activePanel.focus(); // prefer panel if it has focus or editor is hidden
        }
        else {
            this.focus(); // otherwise focus editor
        }
    }
    getMaximumEditorDimensions(container) {
        const targetWindow = getWindow(container);
        const containerDimension = this.getContainerDimension(container);
        if (container === this.mainContainer) {
            const isPanelHorizontal = isHorizontal(this.getPanelPosition());
            const takenWidth = (this.isVisible("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */) ? this.activityBarPartView.minimumWidth : 0) +
                (this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) ? this.sideBarPartView.minimumWidth : 0) +
                (this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) && !isPanelHorizontal ? this.panelPartView.minimumWidth : 0) +
                (this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) ? this.auxiliaryBarPartView.minimumWidth : 0);
            const takenHeight = (this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, targetWindow) ? this.titleBarPartView.minimumHeight : 0) +
                (this.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, targetWindow) ? this.statusBarPartView.minimumHeight : 0) +
                (this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) && isPanelHorizontal ? this.panelPartView.minimumHeight : 0);
            const availableWidth = containerDimension.width - takenWidth;
            const availableHeight = containerDimension.height - takenHeight;
            return { width: availableWidth, height: availableHeight };
        }
        else {
            const takenHeight = (this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, targetWindow) ? this.titleBarPartView.minimumHeight : 0) +
                (this.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, targetWindow) ? this.statusBarPartView.minimumHeight : 0);
            return { width: containerDimension.width, height: containerDimension.height - takenHeight };
        }
    }
    isZenModeActive() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);
    }
    setZenModeActive(active) {
        this.stateModel.setRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE, active);
    }
    toggleZenMode(skipLayout, restoring = false) {
        const focusedPartPreTransition = this._getFocusedPart();
        this.setZenModeActive(!this.isZenModeActive());
        this.state.runtime.zenMode.transitionDisposables.clearAndDisposeAll();
        const setLineNumbers = (lineNumbers) => {
            for (const editor of this.mainPartEditorService.visibleTextEditorControls) {
                // To properly reset line numbers we need to read the configuration for each editor respecting it's uri.
                if (!lineNumbers && isCodeEditor(editor) && editor.hasModel()) {
                    const model = editor.getModel();
                    lineNumbers = this.configurationService.getValue('editor.lineNumbers', { resource: model.uri, overrideIdentifier: model.getLanguageId() });
                }
                if (!lineNumbers) {
                    lineNumbers = this.configurationService.getValue('editor.lineNumbers');
                }
                editor.updateOptions({ lineNumbers });
            }
        };
        // Check if zen mode transitioned to full screen and if now we are out of zen mode
        // -> we need to go out of full screen (same goes for the centered editor layout)
        let toggleMainWindowFullScreen = false;
        const config = getZenModeConfiguration(this.configurationService);
        const zenModeExitInfo = this.stateModel.getRuntimeValue(LayoutStateKeys.ZEN_MODE_EXIT_INFO);
        // Zen Mode Active
        if (this.isZenModeActive()) {
            toggleMainWindowFullScreen = !this.state.runtime.mainWindowFullscreen && config.fullScreen && !isIOS;
            if (!restoring) {
                zenModeExitInfo.transitionedToFullScreen = toggleMainWindowFullScreen;
                zenModeExitInfo.transitionedToCenteredEditorLayout = !this.isMainEditorLayoutCentered() && config.centerLayout;
                zenModeExitInfo.handleNotificationsDoNotDisturbMode = this.notificationService.getFilter() === NotificationsFilter.OFF;
                zenModeExitInfo.wasVisible.sideBar = this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
                zenModeExitInfo.wasVisible.panel = this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */);
                zenModeExitInfo.wasVisible.auxiliaryBar = this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
                this.stateModel.setRuntimeValue(LayoutStateKeys.ZEN_MODE_EXIT_INFO, zenModeExitInfo);
            }
            this.setPanelHidden(true, true);
            this.setAuxiliaryBarHidden(true, true);
            this.setSideBarHidden(true);
            if (config.hideActivityBar) {
                this.setActivityBarHidden(true);
            }
            if (config.hideStatusBar) {
                this.setStatusBarHidden(true);
            }
            if (config.hideLineNumbers) {
                setLineNumbers('off');
                this.state.runtime.zenMode.transitionDisposables.set("zenMode.hideLineNumbers" /* ZenModeSettings.HIDE_LINENUMBERS */, this.mainPartEditorService.onDidVisibleEditorsChange(() => setLineNumbers('off')));
            }
            if (config.showTabs !== this.editorGroupService.partOptions.showTabs) {
                this.state.runtime.zenMode.transitionDisposables.set("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */, this.editorGroupService.mainPart.enforcePartOptions({ showTabs: config.showTabs }));
            }
            if (config.silentNotifications && zenModeExitInfo.handleNotificationsDoNotDisturbMode) {
                this.notificationService.setFilter(NotificationsFilter.ERROR);
            }
            if (config.centerLayout) {
                this.centerMainEditorLayout(true, true);
            }
            // Zen Mode Configuration Changes
            this.state.runtime.zenMode.transitionDisposables.set('configurationChange', this.configurationService.onDidChangeConfiguration(e => {
                // Activity Bar
                if (e.affectsConfiguration("zenMode.hideActivityBar" /* ZenModeSettings.HIDE_ACTIVITYBAR */) || e.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */)) {
                    const zenModeHideActivityBar = this.configurationService.getValue("zenMode.hideActivityBar" /* ZenModeSettings.HIDE_ACTIVITYBAR */);
                    const activityBarLocation = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
                    this.setActivityBarHidden(zenModeHideActivityBar ? true : (activityBarLocation === "top" /* ActivityBarPosition.TOP */ || activityBarLocation === "bottom" /* ActivityBarPosition.BOTTOM */));
                }
                // Status Bar
                if (e.affectsConfiguration("zenMode.hideStatusBar" /* ZenModeSettings.HIDE_STATUSBAR */)) {
                    const zenModeHideStatusBar = this.configurationService.getValue("zenMode.hideStatusBar" /* ZenModeSettings.HIDE_STATUSBAR */);
                    this.setStatusBarHidden(zenModeHideStatusBar);
                }
                // Center Layout
                if (e.affectsConfiguration("zenMode.centerLayout" /* ZenModeSettings.CENTER_LAYOUT */)) {
                    const zenModeCenterLayout = this.configurationService.getValue("zenMode.centerLayout" /* ZenModeSettings.CENTER_LAYOUT */);
                    this.centerMainEditorLayout(zenModeCenterLayout, true);
                }
                // Show Tabs
                if (e.affectsConfiguration("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */)) {
                    const zenModeShowTabs = this.configurationService.getValue("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */) ?? 'multiple';
                    this.state.runtime.zenMode.transitionDisposables.set("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */, this.editorGroupService.mainPart.enforcePartOptions({ showTabs: zenModeShowTabs }));
                }
                // Notifications
                if (e.affectsConfiguration("zenMode.silentNotifications" /* ZenModeSettings.SILENT_NOTIFICATIONS */)) {
                    const zenModeSilentNotifications = !!this.configurationService.getValue("zenMode.silentNotifications" /* ZenModeSettings.SILENT_NOTIFICATIONS */);
                    if (zenModeExitInfo.handleNotificationsDoNotDisturbMode) {
                        this.notificationService.setFilter(zenModeSilentNotifications ? NotificationsFilter.ERROR : NotificationsFilter.OFF);
                    }
                }
                // Center Layout
                if (e.affectsConfiguration("zenMode.hideLineNumbers" /* ZenModeSettings.HIDE_LINENUMBERS */)) {
                    const lineNumbersType = this.configurationService.getValue("zenMode.hideLineNumbers" /* ZenModeSettings.HIDE_LINENUMBERS */) ? 'off' : undefined;
                    setLineNumbers(lineNumbersType);
                    this.state.runtime.zenMode.transitionDisposables.set("zenMode.hideLineNumbers" /* ZenModeSettings.HIDE_LINENUMBERS */, this.mainPartEditorService.onDidVisibleEditorsChange(() => setLineNumbers(lineNumbersType)));
                }
            }));
        }
        // Zen Mode Inactive
        else {
            if (zenModeExitInfo.wasVisible.panel) {
                this.setPanelHidden(false, true);
            }
            if (zenModeExitInfo.wasVisible.auxiliaryBar) {
                this.setAuxiliaryBarHidden(false, true);
            }
            if (zenModeExitInfo.wasVisible.sideBar) {
                this.setSideBarHidden(false);
            }
            if (!this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN, true)) {
                this.setActivityBarHidden(false);
            }
            if (!this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN, true)) {
                this.setStatusBarHidden(false);
            }
            if (zenModeExitInfo.transitionedToCenteredEditorLayout) {
                this.centerMainEditorLayout(false, true);
            }
            if (zenModeExitInfo.handleNotificationsDoNotDisturbMode) {
                this.notificationService.setFilter(NotificationsFilter.OFF);
            }
            setLineNumbers();
            toggleMainWindowFullScreen = zenModeExitInfo.transitionedToFullScreen && this.state.runtime.mainWindowFullscreen;
        }
        if (!skipLayout) {
            this.layout();
        }
        if (toggleMainWindowFullScreen) {
            this.hostService.toggleFullScreen(mainWindow);
        }
        // restore focus if part is still visible, otherwise fallback to editor
        if (focusedPartPreTransition && this.isVisible(focusedPartPreTransition, getWindow(this.activeContainer))) {
            if (isMultiWindowPart(focusedPartPreTransition)) {
                this.focusPart(focusedPartPreTransition, getWindow(this.activeContainer));
            }
            else {
                this.focusPart(focusedPartPreTransition);
            }
        }
        else {
            this.focus();
        }
        // Event
        this._onDidChangeZenMode.fire(this.isZenModeActive());
    }
    setStatusBarHidden(hidden) {
        this.stateModel.setRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN, hidden);
        // Adjust CSS
        if (hidden) {
            this.mainContainer.classList.add(LayoutClasses.STATUSBAR_HIDDEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.STATUSBAR_HIDDEN);
        }
        // Propagate to grid
        this.workbenchGrid.setViewVisible(this.statusBarPartView, !hidden);
    }
    createWorkbenchLayout() {
        const titleBar = this.getPart("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */);
        const bannerPart = this.getPart("workbench.parts.banner" /* Parts.BANNER_PART */);
        const editorPart = this.getPart("workbench.parts.editor" /* Parts.EDITOR_PART */);
        const activityBar = this.getPart("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */);
        const panelPart = this.getPart("workbench.parts.panel" /* Parts.PANEL_PART */);
        const auxiliaryBarPart = this.getPart("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        const sideBar = this.getPart("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        const statusBar = this.getPart("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */);
        // View references for all parts
        this.titleBarPartView = titleBar;
        this.bannerPartView = bannerPart;
        this.sideBarPartView = sideBar;
        this.activityBarPartView = activityBar;
        this.editorPartView = editorPart;
        this.panelPartView = panelPart;
        this.auxiliaryBarPartView = auxiliaryBarPart;
        this.statusBarPartView = statusBar;
        const viewMap = {
            ["workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */]: this.activityBarPartView,
            ["workbench.parts.banner" /* Parts.BANNER_PART */]: this.bannerPartView,
            ["workbench.parts.titlebar" /* Parts.TITLEBAR_PART */]: this.titleBarPartView,
            ["workbench.parts.editor" /* Parts.EDITOR_PART */]: this.editorPartView,
            ["workbench.parts.panel" /* Parts.PANEL_PART */]: this.panelPartView,
            ["workbench.parts.sidebar" /* Parts.SIDEBAR_PART */]: this.sideBarPartView,
            ["workbench.parts.statusbar" /* Parts.STATUSBAR_PART */]: this.statusBarPartView,
            ["workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */]: this.auxiliaryBarPartView
        };
        const fromJSON = ({ type }) => viewMap[type];
        const workbenchGrid = SerializableGrid.deserialize(this.createGridDescriptor(), { fromJSON }, { proportionalLayout: false });
        this.mainContainer.prepend(workbenchGrid.element);
        this.mainContainer.setAttribute('role', 'application');
        this.workbenchGrid = workbenchGrid;
        this.workbenchGrid.edgeSnapping = this.state.runtime.mainWindowFullscreen;
        for (const part of [titleBar, editorPart, activityBar, panelPart, sideBar, statusBar, auxiliaryBarPart, bannerPart]) {
            this._register(part.onDidVisibilityChange(visible => {
                if (!this.inMaximizedAuxiliaryBarTransition) {
                    // skip reacting when we are transitioning
                    // in or out of maximised auxiliary bar to prevent
                    // stepping on each other toes because this
                    // transition is already dealing with all parts
                    // visibility efficiently.
                    if (part === sideBar) {
                        this.setSideBarHidden(!visible);
                    }
                    else if (part === panelPart) {
                        this.setPanelHidden(!visible, true);
                    }
                    else if (part === auxiliaryBarPart) {
                        this.setAuxiliaryBarHidden(!visible, true);
                    }
                    else if (part === editorPart) {
                        this.setEditorHidden(!visible);
                    }
                }
                this._onDidChangePartVisibility.fire();
                this.handleContainerDidLayout(this.mainContainer, this._mainContainerDimension);
            }));
        }
        this._register(this.storageService.onWillSaveState(() => {
            // Side Bar Size
            const sideBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN)
                ? this.workbenchGrid.getViewCachedVisibleSize(this.sideBarPartView)
                : this.workbenchGrid.getViewSize(this.sideBarPartView).width;
            this.stateModel.setInitializationValue(LayoutStateKeys.SIDEBAR_SIZE, sideBarSize);
            // Panel Size
            const panelSize = this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN)
                ? this.workbenchGrid.getViewCachedVisibleSize(this.panelPartView)
                : isHorizontal(this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_POSITION))
                    ? this.workbenchGrid.getViewSize(this.panelPartView).height
                    : this.workbenchGrid.getViewSize(this.panelPartView).width;
            this.stateModel.setInitializationValue(LayoutStateKeys.PANEL_SIZE, panelSize);
            // Auxiliary Bar Size
            const auxiliaryBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN)
                ? this.workbenchGrid.getViewCachedVisibleSize(this.auxiliaryBarPartView)
                : this.workbenchGrid.getViewSize(this.auxiliaryBarPartView).width;
            this.stateModel.setInitializationValue(LayoutStateKeys.AUXILIARYBAR_SIZE, auxiliaryBarSize);
            this.stateModel.save(true, true);
        }));
        this._register(Event.any(this.paneCompositeService.onDidPaneCompositeOpen, this.paneCompositeService.onDidPaneCompositeClose)(() => {
            // Auxiliary Bar State
            this.stateModel.setInitializationValue(LayoutStateKeys.AUXILIARYBAR_EMPTY, this.paneCompositeService.getPaneCompositeIds(2 /* ViewContainerLocation.AuxiliaryBar */).length === 0);
        }));
    }
    layout() {
        if (!this.disposed) {
            this._mainContainerDimension = getClientArea(this.state.runtime.mainWindowFullscreen ?
                mainWindow.document.body : // in fullscreen mode, make sure to use <body> element because
                this.parent, // in that case the workbench will span the entire site
            this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ ? DEFAULT_EMPTY_WINDOW_DIMENSIONS : DEFAULT_WORKSPACE_WINDOW_DIMENSIONS // running with fallback to ensure no error is thrown (https://github.com/microsoft/vscode/issues/240242)
            );
            this.logService.trace(`Layout#layout, height: ${this._mainContainerDimension.height}, width: ${this._mainContainerDimension.width}`);
            size(this.mainContainer, this._mainContainerDimension.width, this._mainContainerDimension.height);
            // Layout the grid widget
            this.workbenchGrid.layout(this._mainContainerDimension.width, this._mainContainerDimension.height);
            this.initialized = true;
            // Emit as event
            this.handleContainerDidLayout(this.mainContainer, this._mainContainerDimension);
        }
    }
    isMainEditorLayoutCentered() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED);
    }
    centerMainEditorLayout(active, skipLayout) {
        this.stateModel.setRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED, active);
        const mainVisibleEditors = coalesce(this.editorGroupService.mainPart.groups.map(group => group.activeEditor));
        const isEditorComplex = mainVisibleEditors.some(editor => {
            if (editor instanceof DiffEditorInput) {
                return this.configurationService.getValue('diffEditor.renderSideBySide');
            }
            if (editor?.hasCapability(256 /* EditorInputCapabilities.MultipleEditors */)) {
                return true;
            }
            return false;
        });
        const layout = this.editorGroupService.getLayout();
        let hasMoreThanOneColumn = false;
        if (layout.orientation === 0 /* GroupOrientation.HORIZONTAL */) {
            hasMoreThanOneColumn = layout.groups.length > 1;
        }
        else {
            hasMoreThanOneColumn = layout.groups.some(group => group.groups && group.groups.length > 1);
        }
        const isCenteredLayoutAutoResizing = this.configurationService.getValue('workbench.editor.centeredLayoutAutoResize');
        if (isCenteredLayoutAutoResizing &&
            ((hasMoreThanOneColumn && !this.editorGroupService.mainPart.hasMaximizedGroup()) || isEditorComplex)) {
            active = false; // disable centered layout for complex editors or when there is more than one group
        }
        if (this.editorGroupService.mainPart.isLayoutCentered() !== active) {
            this.editorGroupService.mainPart.centerLayout(active);
            if (!skipLayout) {
                this.layout();
            }
        }
        this._onDidChangeMainEditorCenteredLayout.fire(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED));
    }
    getSize(part) {
        return this.workbenchGrid.getViewSize(this.getPart(part));
    }
    setSize(part, size) {
        this.workbenchGrid.resizeView(this.getPart(part), size);
    }
    resizePart(part, sizeChangeWidth, sizeChangeHeight) {
        const sizeChangePxWidth = Math.sign(sizeChangeWidth) * computeScreenAwareSize(getActiveWindow(), Math.abs(sizeChangeWidth));
        const sizeChangePxHeight = Math.sign(sizeChangeHeight) * computeScreenAwareSize(getActiveWindow(), Math.abs(sizeChangeHeight));
        let viewSize;
        switch (part) {
            case "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */:
                viewSize = this.workbenchGrid.getViewSize(this.sideBarPartView);
                this.workbenchGrid.resizeView(this.sideBarPartView, {
                    width: viewSize.width + sizeChangePxWidth,
                    height: viewSize.height
                });
                break;
            case "workbench.parts.panel" /* Parts.PANEL_PART */:
                viewSize = this.workbenchGrid.getViewSize(this.panelPartView);
                this.workbenchGrid.resizeView(this.panelPartView, {
                    width: viewSize.width + (isHorizontal(this.getPanelPosition()) ? 0 : sizeChangePxWidth),
                    height: viewSize.height + (isHorizontal(this.getPanelPosition()) ? sizeChangePxHeight : 0)
                });
                break;
            case "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */:
                viewSize = this.workbenchGrid.getViewSize(this.auxiliaryBarPartView);
                this.workbenchGrid.resizeView(this.auxiliaryBarPartView, {
                    width: viewSize.width + sizeChangePxWidth,
                    height: viewSize.height
                });
                break;
            case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                viewSize = this.workbenchGrid.getViewSize(this.editorPartView);
                // Single Editor Group
                if (this.editorGroupService.mainPart.count === 1) {
                    this.workbenchGrid.resizeView(this.editorPartView, {
                        width: viewSize.width + sizeChangePxWidth,
                        height: viewSize.height + sizeChangePxHeight
                    });
                }
                else {
                    const activeGroup = this.editorGroupService.mainPart.activeGroup;
                    const { width, height } = this.editorGroupService.mainPart.getSize(activeGroup);
                    this.editorGroupService.mainPart.setSize(activeGroup, { width: width + sizeChangePxWidth, height: height + sizeChangePxHeight });
                    // After resizing the editor group
                    // if it does not change in either direction
                    // try resizing the full editor part
                    const { width: newWidth, height: newHeight } = this.editorGroupService.mainPart.getSize(activeGroup);
                    if ((sizeChangePxHeight && height === newHeight) || (sizeChangePxWidth && width === newWidth)) {
                        this.workbenchGrid.resizeView(this.editorPartView, {
                            width: viewSize.width + (sizeChangePxWidth && width === newWidth ? sizeChangePxWidth : 0),
                            height: viewSize.height + (sizeChangePxHeight && height === newHeight ? sizeChangePxHeight : 0)
                        });
                    }
                }
                break;
            default:
                return; // Cannot resize other parts
        }
    }
    setActivityBarHidden(hidden) {
        this.stateModel.setRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN, hidden);
        this.workbenchGrid.setViewVisible(this.activityBarPartView, !hidden);
    }
    setBannerHidden(hidden) {
        this.workbenchGrid.setViewVisible(this.bannerPartView, !hidden);
    }
    setEditorHidden(hidden) {
        if (!hidden && this.setAuxiliaryBarMaximized(false) && this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */)) {
            return; // return: leaving maximised auxiliary bar made this part visible
        }
        this.stateModel.setRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN, hidden);
        // Adjust CSS
        if (hidden) {
            this.mainContainer.classList.add(LayoutClasses.MAIN_EDITOR_AREA_HIDDEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.MAIN_EDITOR_AREA_HIDDEN);
        }
        // Propagate to grid
        this.workbenchGrid.setViewVisible(this.editorPartView, !hidden);
        // The editor and panel cannot be hidden at the same time
        // unless we have a maximized auxiliary bar
        if (hidden && !this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) && !this.isAuxiliaryBarMaximized()) {
            this.setPanelHidden(false, true);
        }
    }
    getLayoutClasses() {
        return coalesce([
            !this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) ? LayoutClasses.SIDEBAR_HIDDEN : undefined,
            !this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, mainWindow) ? LayoutClasses.MAIN_EDITOR_AREA_HIDDEN : undefined,
            !this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) ? LayoutClasses.PANEL_HIDDEN : undefined,
            !this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) ? LayoutClasses.AUXILIARYBAR_HIDDEN : undefined,
            !this.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */) ? LayoutClasses.STATUSBAR_HIDDEN : undefined,
            this.state.runtime.mainWindowFullscreen ? LayoutClasses.FULLSCREEN : undefined
        ]);
    }
    setSideBarHidden(hidden) {
        if (!hidden && this.setAuxiliaryBarMaximized(false) && this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            return; // return: leaving maximised auxiliary bar made this part visible
        }
        this.stateModel.setRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN, hidden);
        // Adjust CSS
        if (hidden) {
            this.mainContainer.classList.add(LayoutClasses.SIDEBAR_HIDDEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.SIDEBAR_HIDDEN);
        }
        // If sidebar becomes hidden, also hide the current active Viewlet if any
        if (hidden && this.paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */)) {
            this.paneCompositeService.hideActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
            if (!this.isAuxiliaryBarMaximized()) {
                this.focusPanelOrEditor(); // do not auto focus when auxiliary bar is maximized
            }
        }
        // If sidebar becomes visible, show last active Viewlet or default viewlet
        else if (!hidden && !this.paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */)) {
            const viewletToOpen = this.paneCompositeService.getLastActivePaneCompositeId(0 /* ViewContainerLocation.Sidebar */);
            if (viewletToOpen) {
                this.openViewContainer(0 /* ViewContainerLocation.Sidebar */, viewletToOpen, true);
            }
        }
        // Propagate to grid
        this.workbenchGrid.setViewVisible(this.sideBarPartView, !hidden);
    }
    hasViews(id) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(id);
        if (!viewContainer) {
            return false;
        }
        const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
        if (!viewContainerModel) {
            return false;
        }
        return viewContainerModel.activeViewDescriptors.length >= 1;
    }
    adjustPartPositions(sideBarPosition, panelAlignment, panelPosition) {
        // Move activity bar and side bars
        const isPanelVertical = !isHorizontal(panelPosition);
        const sideBarSiblingToEditor = isPanelVertical || !(panelAlignment === 'center' || (sideBarPosition === 0 /* Position.LEFT */ && panelAlignment === 'right') || (sideBarPosition === 1 /* Position.RIGHT */ && panelAlignment === 'left'));
        const auxiliaryBarSiblingToEditor = isPanelVertical || !(panelAlignment === 'center' || (sideBarPosition === 1 /* Position.RIGHT */ && panelAlignment === 'right') || (sideBarPosition === 0 /* Position.LEFT */ && panelAlignment === 'left'));
        const preMovePanelWidth = !this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) ? Sizing.Invisible(this.workbenchGrid.getViewCachedVisibleSize(this.panelPartView) ?? this.panelPartView.minimumWidth) : this.workbenchGrid.getViewSize(this.panelPartView).width;
        const preMovePanelHeight = !this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) ? Sizing.Invisible(this.workbenchGrid.getViewCachedVisibleSize(this.panelPartView) ?? this.panelPartView.minimumHeight) : this.workbenchGrid.getViewSize(this.panelPartView).height;
        const preMoveSideBarSize = !this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) ? Sizing.Invisible(this.workbenchGrid.getViewCachedVisibleSize(this.sideBarPartView) ?? this.sideBarPartView.minimumWidth) : this.workbenchGrid.getViewSize(this.sideBarPartView).width;
        const preMoveAuxiliaryBarSize = !this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) ? Sizing.Invisible(this.workbenchGrid.getViewCachedVisibleSize(this.auxiliaryBarPartView) ?? this.auxiliaryBarPartView.minimumWidth) : this.workbenchGrid.getViewSize(this.auxiliaryBarPartView).width;
        const focusedPart = ["workbench.parts.panel" /* Parts.PANEL_PART */, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */].find(part => this.hasFocus(part));
        if (sideBarPosition === 0 /* Position.LEFT */) {
            this.workbenchGrid.moveViewTo(this.activityBarPartView, [2, 0]);
            this.workbenchGrid.moveView(this.sideBarPartView, preMoveSideBarSize, sideBarSiblingToEditor ? this.editorPartView : this.activityBarPartView, sideBarSiblingToEditor ? 2 /* Direction.Left */ : 3 /* Direction.Right */);
            if (auxiliaryBarSiblingToEditor) {
                this.workbenchGrid.moveView(this.auxiliaryBarPartView, preMoveAuxiliaryBarSize, this.editorPartView, 3 /* Direction.Right */);
            }
            else {
                this.workbenchGrid.moveViewTo(this.auxiliaryBarPartView, [2, -1]);
            }
        }
        else {
            this.workbenchGrid.moveViewTo(this.activityBarPartView, [2, -1]);
            this.workbenchGrid.moveView(this.sideBarPartView, preMoveSideBarSize, sideBarSiblingToEditor ? this.editorPartView : this.activityBarPartView, sideBarSiblingToEditor ? 3 /* Direction.Right */ : 2 /* Direction.Left */);
            if (auxiliaryBarSiblingToEditor) {
                this.workbenchGrid.moveView(this.auxiliaryBarPartView, preMoveAuxiliaryBarSize, this.editorPartView, 2 /* Direction.Left */);
            }
            else {
                this.workbenchGrid.moveViewTo(this.auxiliaryBarPartView, [2, 0]);
            }
        }
        // Maintain focus after moving parts
        if (focusedPart) {
            this.focusPart(focusedPart);
        }
        // We moved all the side parts based on the editor and ignored the panel
        // Now, we need to put the panel back in the right position when it is next to the editor
        if (isPanelVertical) {
            this.workbenchGrid.moveView(this.panelPartView, preMovePanelWidth, this.editorPartView, panelPosition === 0 /* Position.LEFT */ ? 2 /* Direction.Left */ : 3 /* Direction.Right */);
            this.workbenchGrid.resizeView(this.panelPartView, {
                height: preMovePanelHeight,
                width: preMovePanelWidth
            });
        }
        // Moving views in the grid can cause them to re-distribute sizing unnecessarily
        // Resize visible parts to the width they were before the operation
        if (this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            this.workbenchGrid.resizeView(this.sideBarPartView, {
                height: this.workbenchGrid.getViewSize(this.sideBarPartView).height,
                width: preMoveSideBarSize
            });
        }
        if (this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            this.workbenchGrid.resizeView(this.auxiliaryBarPartView, {
                height: this.workbenchGrid.getViewSize(this.auxiliaryBarPartView).height,
                width: preMoveAuxiliaryBarSize
            });
        }
    }
    setPanelAlignment(alignment) {
        // Panel alignment only applies to a panel in the top/bottom position
        if (!isHorizontal(this.getPanelPosition())) {
            this.setPanelPosition(2 /* Position.BOTTOM */);
        }
        // the workbench grid currently prevents us from supporting panel maximization with non-center panel alignment
        if (alignment !== 'center' && this.isPanelMaximized()) {
            this.toggleMaximizedPanel();
        }
        this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_ALIGNMENT, alignment);
        this.adjustPartPositions(this.getSideBarPosition(), alignment, this.getPanelPosition());
        this._onDidChangePanelAlignment.fire(alignment);
    }
    setPanelHidden(hidden, skipLayout) {
        if (!this.workbenchGrid) {
            return; // Return if not initialized fully (https://github.com/microsoft/vscode/issues/105480)
        }
        if (!hidden && this.setAuxiliaryBarMaximized(false) && this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            return; // return: leaving maximised auxiliary bar made this part visible
        }
        const wasHidden = !this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */);
        this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_HIDDEN, hidden);
        const isPanelMaximized = this.isPanelMaximized();
        const panelOpensMaximized = this.panelOpensMaximized();
        // Adjust CSS
        if (hidden) {
            this.mainContainer.classList.add(LayoutClasses.PANEL_HIDDEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.PANEL_HIDDEN);
        }
        // If panel part becomes hidden, also hide the current active panel if any
        let focusEditor = false;
        if (hidden && this.paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */)) {
            this.paneCompositeService.hideActivePaneComposite(1 /* ViewContainerLocation.Panel */);
            if (!isIOS && // do not auto focus on iOS (https://github.com/microsoft/vscode/issues/127832)
                !this.isAuxiliaryBarMaximized() // do not auto focus when auxiliary bar is maximized
            ) {
                focusEditor = true;
            }
        }
        // If panel part becomes visible, show last active panel or default panel
        else if (!hidden && !this.paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */)) {
            let panelToOpen = this.paneCompositeService.getLastActivePaneCompositeId(1 /* ViewContainerLocation.Panel */);
            // verify that the panel we try to open has views before we default to it
            // otherwise fall back to any view that has views still refs #111463
            if (!panelToOpen || !this.hasViews(panelToOpen)) {
                panelToOpen = this.viewDescriptorService
                    .getViewContainersByLocation(1 /* ViewContainerLocation.Panel */)
                    .find(viewContainer => this.hasViews(viewContainer.id))?.id;
            }
            if (panelToOpen) {
                this.openViewContainer(1 /* ViewContainerLocation.Panel */, panelToOpen, !skipLayout);
            }
        }
        // If maximized and in process of hiding, unmaximize before
        // hiding to allow caching of non-maximized size
        if (hidden && isPanelMaximized) {
            this.toggleMaximizedPanel();
        }
        // Don't proceed if we have already done this before
        if (wasHidden === hidden) {
            return;
        }
        // Propagate layout changes to grid
        this.workbenchGrid.setViewVisible(this.panelPartView, !hidden);
        // If in process of showing, toggle whether or not panel is maximized
        if (!hidden) {
            if (!skipLayout && isPanelMaximized !== panelOpensMaximized) {
                this.toggleMaximizedPanel();
            }
        }
        else {
            // If in process of hiding, remember whether the panel is maximized or not
            this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_WAS_LAST_MAXIMIZED, isPanelMaximized);
        }
        if (focusEditor) {
            this.editorGroupService.mainPart.activeGroup.focus(); // Pass focus to editor group if panel part is now hidden
        }
    }
    isAuxiliaryBarMaximized() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_WAS_LAST_MAXIMIZED);
    }
    toggleMaximizedAuxiliaryBar() {
        this.setAuxiliaryBarMaximized(!this.isAuxiliaryBarMaximized());
    }
    setAuxiliaryBarMaximized(maximized) {
        if (this.inMaximizedAuxiliaryBarTransition || // prevent re-entrance
            (maximized === this.isAuxiliaryBarMaximized()) // return early if state is already present
        ) {
            return false;
        }
        if (maximized) {
            const state = {
                sideBarVisible: this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */),
                editorVisible: this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */),
                panelVisible: this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */),
                auxiliaryBarVisible: this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)
            };
            this.stateModel.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_WAS_LAST_MAXIMIZED, true);
            this.inMaximizedAuxiliaryBarTransition = true;
            try {
                if (!state.auxiliaryBarVisible) {
                    this.setAuxiliaryBarHidden(false);
                }
                const size = this.workbenchGrid.getViewSize(this.auxiliaryBarPartView).width;
                this.stateModel.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_LAST_NON_MAXIMIZED_SIZE, size);
                if (state.sideBarVisible) {
                    this.setSideBarHidden(true);
                }
                if (state.panelVisible) {
                    this.setPanelHidden(true);
                }
                if (state.editorVisible) {
                    this.setEditorHidden(true);
                }
                this.stateModel.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_LAST_NON_MAXIMIZED_VISIBILITY, state);
            }
            finally {
                this.inMaximizedAuxiliaryBarTransition = false;
            }
        }
        else {
            const state = assertReturnsDefined(this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_LAST_NON_MAXIMIZED_VISIBILITY));
            this.stateModel.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_WAS_LAST_MAXIMIZED, false);
            this.inMaximizedAuxiliaryBarTransition = true;
            try {
                this.setEditorHidden(!state?.editorVisible); // this order of updating view visibility
                this.setPanelHidden(!state?.panelVisible); // helps in restoring the previous view
                this.setSideBarHidden(!state?.sideBarVisible); // sizes we had
                const size = this.workbenchGrid.getViewSize(this.auxiliaryBarPartView);
                this.workbenchGrid.resizeView(this.auxiliaryBarPartView, {
                    width: this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_LAST_NON_MAXIMIZED_SIZE),
                    height: size.height
                });
            }
            finally {
                this.inMaximizedAuxiliaryBarTransition = false;
            }
        }
        this.focusPart("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        this._onDidChangeAuxiliaryBarMaximized.fire();
        return true;
    }
    isPanelMaximized() {
        return (this.getPanelAlignment() === 'center' || // the workbench grid currently prevents us from supporting panel
            !isHorizontal(this.getPanelPosition()) // maximization with non-center panel alignment
        ) && !this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, mainWindow) && !this.isAuxiliaryBarMaximized();
    }
    toggleMaximizedPanel() {
        const size = this.workbenchGrid.getViewSize(this.panelPartView);
        const panelPosition = this.getPanelPosition();
        const maximize = !this.isPanelMaximized();
        if (maximize) {
            if (this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
                if (isHorizontal(panelPosition)) {
                    this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_HEIGHT, size.height);
                }
                else {
                    this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_WIDTH, size.width);
                }
            }
            this.setEditorHidden(true);
        }
        else {
            this.setEditorHidden(false);
            this.workbenchGrid.resizeView(this.panelPartView, {
                width: isHorizontal(panelPosition) ? size.width : this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_WIDTH),
                height: isHorizontal(panelPosition) ? this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_HEIGHT) : size.height
            });
        }
        this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_WAS_LAST_MAXIMIZED, maximize);
    }
    panelOpensMaximized() {
        if (this.getPanelAlignment() !== 'center' && isHorizontal(this.getPanelPosition())) {
            return false; // The workbench grid currently prevents us from supporting panel maximization with non-center panel alignment
        }
        const panelOpensMaximized = partOpensMaximizedFromString(this.configurationService.getValue(WorkbenchLayoutSettings.PANEL_OPENS_MAXIMIZED));
        const panelLastIsMaximized = this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_WAS_LAST_MAXIMIZED);
        return panelOpensMaximized === 0 /* PartOpensMaximizedOptions.ALWAYS */ || (panelOpensMaximized === 2 /* PartOpensMaximizedOptions.REMEMBER_LAST */ && panelLastIsMaximized);
    }
    setAuxiliaryBarHidden(hidden, skipLayout) {
        if (hidden && this.setAuxiliaryBarMaximized(false) && !this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            return; // return: leaving maximised auxiliary bar made this part hidden
        }
        this.stateModel.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN, hidden);
        // Adjust CSS
        if (hidden) {
            this.mainContainer.classList.add(LayoutClasses.AUXILIARYBAR_HIDDEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.AUXILIARYBAR_HIDDEN);
        }
        // If auxiliary bar becomes hidden, also hide the current active pane composite if any
        if (hidden && this.paneCompositeService.getActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */)) {
            this.paneCompositeService.hideActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */);
            this.focusPanelOrEditor();
        }
        // If auxiliary bar becomes visible, show last active pane composite or default pane composite
        else if (!hidden && !this.paneCompositeService.getActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */)) {
            let viewletToOpen = this.paneCompositeService.getLastActivePaneCompositeId(2 /* ViewContainerLocation.AuxiliaryBar */);
            // verify that the viewlet we try to open has views before we default to it
            // otherwise fall back to any view that has views still refs #111463
            if (!viewletToOpen || !this.hasViews(viewletToOpen)) {
                viewletToOpen = this.viewDescriptorService
                    .getViewContainersByLocation(2 /* ViewContainerLocation.AuxiliaryBar */)
                    .find(viewContainer => this.hasViews(viewContainer.id))?.id;
            }
            if (viewletToOpen) {
                this.openViewContainer(2 /* ViewContainerLocation.AuxiliaryBar */, viewletToOpen, !skipLayout);
            }
        }
        // Propagate to grid
        this.workbenchGrid.setViewVisible(this.auxiliaryBarPartView, !hidden);
    }
    setPartHidden(hidden, part) {
        switch (part) {
            case "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */:
                return this.setActivityBarHidden(hidden);
            case "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */:
                return this.setSideBarHidden(hidden);
            case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                return this.setEditorHidden(hidden);
            case "workbench.parts.banner" /* Parts.BANNER_PART */:
                return this.setBannerHidden(hidden);
            case "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */:
                return this.setAuxiliaryBarHidden(hidden);
            case "workbench.parts.panel" /* Parts.PANEL_PART */:
                return this.setPanelHidden(hidden);
        }
    }
    hasMainWindowBorder() {
        return this.state.runtime.mainWindowBorder;
    }
    getMainWindowBorderRadius() {
        return this.state.runtime.mainWindowBorder && isMacintosh ? '10px' : undefined;
    }
    getSideBarPosition() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON);
    }
    getPanelAlignment() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_ALIGNMENT);
    }
    updateMenubarVisibility(skipLayout) {
        const shouldShowTitleBar = shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled);
        if (!skipLayout && this.workbenchGrid && shouldShowTitleBar !== this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow)) {
            this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowTitleBar);
        }
    }
    updateCustomTitleBarVisibility() {
        const shouldShowTitleBar = shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled);
        const titlebarVisible = this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */);
        if (shouldShowTitleBar !== titlebarVisible) {
            this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowTitleBar);
        }
    }
    toggleMenuBar() {
        let currentVisibilityValue = getMenuBarVisibility(this.configurationService);
        if (typeof currentVisibilityValue !== 'string') {
            currentVisibilityValue = 'classic';
        }
        let newVisibilityValue;
        if (currentVisibilityValue === 'visible' || currentVisibilityValue === 'classic') {
            newVisibilityValue = hasNativeMenu(this.configurationService) ? 'toggle' : 'compact';
        }
        else {
            newVisibilityValue = 'classic';
        }
        this.configurationService.updateValue("window.menuBarVisibility" /* MenuSettings.MenuBarVisibility */, newVisibilityValue);
    }
    getPanelPosition() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_POSITION);
    }
    setPanelPosition(position) {
        if (!this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            this.setPanelHidden(false);
        }
        const panelPart = this.getPart("workbench.parts.panel" /* Parts.PANEL_PART */);
        const oldPositionValue = positionToString(this.getPanelPosition());
        const newPositionValue = positionToString(position);
        // Adjust CSS
        const panelContainer = assertReturnsDefined(panelPart.getContainer());
        panelContainer.classList.remove(oldPositionValue);
        panelContainer.classList.add(newPositionValue);
        // Update Styles
        panelPart.updateStyles();
        // Layout
        const size = this.workbenchGrid.getViewSize(this.panelPartView);
        const sideBarSize = this.workbenchGrid.getViewSize(this.sideBarPartView);
        const auxiliaryBarSize = this.workbenchGrid.getViewSize(this.auxiliaryBarPartView);
        let editorHidden = !this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, mainWindow);
        // Save last non-maximized size for panel before move
        if (newPositionValue !== oldPositionValue && !editorHidden) {
            // Save the current size of the panel for the new orthogonal direction
            // If moving down, save the width of the panel
            // Otherwise, save the height of the panel
            if (isHorizontal(position)) {
                this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_WIDTH, size.width);
            }
            else if (isHorizontal(positionFromString(oldPositionValue))) {
                this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_HEIGHT, size.height);
            }
        }
        if (isHorizontal(position) && this.getPanelAlignment() !== 'center' && editorHidden) {
            this.toggleMaximizedPanel();
            editorHidden = false;
        }
        this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_POSITION, position);
        const sideBarVisible = this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        const auxiliaryBarVisible = this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        const hadFocus = this.hasFocus("workbench.parts.panel" /* Parts.PANEL_PART */);
        if (position === 2 /* Position.BOTTOM */) {
            this.workbenchGrid.moveView(this.panelPartView, editorHidden ? size.height : this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_HEIGHT), this.editorPartView, 1 /* Direction.Down */);
        }
        else if (position === 3 /* Position.TOP */) {
            this.workbenchGrid.moveView(this.panelPartView, editorHidden ? size.height : this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_HEIGHT), this.editorPartView, 0 /* Direction.Up */);
        }
        else if (position === 1 /* Position.RIGHT */) {
            this.workbenchGrid.moveView(this.panelPartView, editorHidden ? size.width : this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_WIDTH), this.editorPartView, 3 /* Direction.Right */);
        }
        else {
            this.workbenchGrid.moveView(this.panelPartView, editorHidden ? size.width : this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_WIDTH), this.editorPartView, 2 /* Direction.Left */);
        }
        if (hadFocus) {
            this.focusPart("workbench.parts.panel" /* Parts.PANEL_PART */);
        }
        // Reset sidebar to original size before shifting the panel
        this.workbenchGrid.resizeView(this.sideBarPartView, sideBarSize);
        if (!sideBarVisible) {
            this.setSideBarHidden(true);
        }
        this.workbenchGrid.resizeView(this.auxiliaryBarPartView, auxiliaryBarSize);
        if (!auxiliaryBarVisible) {
            this.setAuxiliaryBarHidden(true);
        }
        if (isHorizontal(position)) {
            this.adjustPartPositions(this.getSideBarPosition(), this.getPanelAlignment(), position);
        }
        this._onDidChangePanelPosition.fire(newPositionValue);
    }
    isWindowMaximized(targetWindow) {
        return this.state.runtime.maximized.has(getWindowId(targetWindow));
    }
    updateWindowMaximizedState(targetWindow, maximized) {
        this.mainContainer.classList.toggle(LayoutClasses.MAXIMIZED, maximized);
        const targetWindowId = getWindowId(targetWindow);
        if (maximized === this.state.runtime.maximized.has(targetWindowId)) {
            return;
        }
        if (maximized) {
            this.state.runtime.maximized.add(targetWindowId);
        }
        else {
            this.state.runtime.maximized.delete(targetWindowId);
        }
        this.updateWindowBorder();
        this._onDidChangeWindowMaximized.fire({ windowId: targetWindowId, maximized });
    }
    getVisibleNeighborPart(part, direction) {
        if (!this.workbenchGrid) {
            return undefined;
        }
        if (!this.isVisible(part, mainWindow)) {
            return undefined;
        }
        const neighborViews = this.workbenchGrid.getNeighborViews(this.getPart(part), direction, false);
        if (!neighborViews) {
            return undefined;
        }
        for (const neighborView of neighborViews) {
            const neighborPart = ["workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */, "workbench.parts.editor" /* Parts.EDITOR_PART */, "workbench.parts.panel" /* Parts.PANEL_PART */, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */, "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */]
                .find(partId => this.getPart(partId) === neighborView && this.isVisible(partId, mainWindow));
            if (neighborPart !== undefined) {
                return neighborPart;
            }
        }
        return undefined;
    }
    onDidChangeWCO() {
        const bannerFirst = this.workbenchGrid.getNeighborViews(this.titleBarPartView, 0 /* Direction.Up */, false).length > 0;
        const shouldBannerBeFirst = this.shouldShowBannerFirst();
        if (bannerFirst !== shouldBannerBeFirst) {
            this.workbenchGrid.moveView(this.bannerPartView, Sizing.Distribute, this.titleBarPartView, shouldBannerBeFirst ? 0 /* Direction.Up */ : 1 /* Direction.Down */);
        }
        this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled));
    }
    arrangeEditorNodes(nodes, availableHeight, availableWidth) {
        if (!nodes.sideBar && !nodes.auxiliaryBar) {
            nodes.editor.size = availableHeight;
            return nodes.editor;
        }
        const result = [nodes.editor];
        nodes.editor.size = availableWidth;
        if (nodes.sideBar) {
            if (this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON) === 0 /* Position.LEFT */) {
                result.splice(0, 0, nodes.sideBar);
            }
            else {
                result.push(nodes.sideBar);
            }
            nodes.editor.size -= this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN) ? 0 : nodes.sideBar.size;
        }
        if (nodes.auxiliaryBar) {
            if (this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON) === 1 /* Position.RIGHT */) {
                result.splice(0, 0, nodes.auxiliaryBar);
            }
            else {
                result.push(nodes.auxiliaryBar);
            }
            nodes.editor.size -= this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN) ? 0 : nodes.auxiliaryBar.size;
        }
        return {
            type: 'branch',
            data: result,
            size: availableHeight,
            visible: result.some(node => node.visible)
        };
    }
    arrangeMiddleSectionNodes(nodes, availableWidth, availableHeight) {
        const activityBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN) ? 0 : nodes.activityBar.size;
        const sideBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN) ? 0 : nodes.sideBar.size;
        const auxiliaryBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN) ? 0 : nodes.auxiliaryBar.size;
        const panelSize = this.stateModel.getInitializationValue(LayoutStateKeys.PANEL_SIZE) ? 0 : nodes.panel.size;
        const panelPostion = this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_POSITION);
        const sideBarPosition = this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON);
        const result = [];
        if (!isHorizontal(panelPostion)) {
            result.push(nodes.editor);
            nodes.editor.size = availableWidth - activityBarSize - sideBarSize - panelSize - auxiliaryBarSize;
            if (panelPostion === 1 /* Position.RIGHT */) {
                result.push(nodes.panel);
            }
            else {
                result.splice(0, 0, nodes.panel);
            }
            if (sideBarPosition === 0 /* Position.LEFT */) {
                result.push(nodes.auxiliaryBar);
                result.splice(0, 0, nodes.sideBar);
                result.splice(0, 0, nodes.activityBar);
            }
            else {
                result.splice(0, 0, nodes.auxiliaryBar);
                result.push(nodes.sideBar);
                result.push(nodes.activityBar);
            }
        }
        else {
            const panelAlignment = this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_ALIGNMENT);
            const sideBarNextToEditor = !(panelAlignment === 'center' || (sideBarPosition === 0 /* Position.LEFT */ && panelAlignment === 'right') || (sideBarPosition === 1 /* Position.RIGHT */ && panelAlignment === 'left'));
            const auxiliaryBarNextToEditor = !(panelAlignment === 'center' || (sideBarPosition === 1 /* Position.RIGHT */ && panelAlignment === 'right') || (sideBarPosition === 0 /* Position.LEFT */ && panelAlignment === 'left'));
            const editorSectionWidth = availableWidth - activityBarSize - (sideBarNextToEditor ? 0 : sideBarSize) - (auxiliaryBarNextToEditor ? 0 : auxiliaryBarSize);
            const editorNodes = this.arrangeEditorNodes({
                editor: nodes.editor,
                sideBar: sideBarNextToEditor ? nodes.sideBar : undefined,
                auxiliaryBar: auxiliaryBarNextToEditor ? nodes.auxiliaryBar : undefined
            }, availableHeight - panelSize, editorSectionWidth);
            const data = panelPostion === 2 /* Position.BOTTOM */ ? [editorNodes, nodes.panel] : [nodes.panel, editorNodes];
            result.push({
                type: 'branch',
                data,
                size: editorSectionWidth,
                visible: data.some(node => node.visible)
            });
            if (!sideBarNextToEditor) {
                if (sideBarPosition === 0 /* Position.LEFT */) {
                    result.splice(0, 0, nodes.sideBar);
                }
                else {
                    result.push(nodes.sideBar);
                }
            }
            if (!auxiliaryBarNextToEditor) {
                if (sideBarPosition === 1 /* Position.RIGHT */) {
                    result.splice(0, 0, nodes.auxiliaryBar);
                }
                else {
                    result.push(nodes.auxiliaryBar);
                }
            }
            if (sideBarPosition === 0 /* Position.LEFT */) {
                result.splice(0, 0, nodes.activityBar);
            }
            else {
                result.push(nodes.activityBar);
            }
        }
        return result;
    }
    createGridDescriptor() {
        const { width, height } = this._mainContainerDimension;
        const sideBarSize = this.stateModel.getInitializationValue(LayoutStateKeys.SIDEBAR_SIZE);
        const auxiliaryBarSize = this.stateModel.getInitializationValue(LayoutStateKeys.AUXILIARYBAR_SIZE);
        const panelSize = this.stateModel.getInitializationValue(LayoutStateKeys.PANEL_SIZE);
        const titleBarHeight = this.titleBarPartView.minimumHeight;
        const bannerHeight = this.bannerPartView.minimumHeight;
        const statusBarHeight = this.statusBarPartView.minimumHeight;
        const activityBarWidth = this.activityBarPartView.minimumWidth;
        const middleSectionHeight = height - titleBarHeight - statusBarHeight;
        const titleAndBanner = [
            {
                type: 'leaf',
                data: { type: "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */ },
                size: titleBarHeight,
                visible: this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow)
            },
            {
                type: 'leaf',
                data: { type: "workbench.parts.banner" /* Parts.BANNER_PART */ },
                size: bannerHeight,
                visible: false
            }
        ];
        const activityBarNode = {
            type: 'leaf',
            data: { type: "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */ },
            size: activityBarWidth,
            visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN)
        };
        const sideBarNode = {
            type: 'leaf',
            data: { type: "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */ },
            size: sideBarSize,
            visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN)
        };
        const auxiliaryBarNode = {
            type: 'leaf',
            data: { type: "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */ },
            size: auxiliaryBarSize,
            visible: this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)
        };
        const editorNode = {
            type: 'leaf',
            data: { type: "workbench.parts.editor" /* Parts.EDITOR_PART */ },
            size: 0, // Update based on sibling sizes
            visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN)
        };
        const panelNode = {
            type: 'leaf',
            data: { type: "workbench.parts.panel" /* Parts.PANEL_PART */ },
            size: panelSize,
            visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN)
        };
        const middleSection = this.arrangeMiddleSectionNodes({
            activityBar: activityBarNode,
            auxiliaryBar: auxiliaryBarNode,
            editor: editorNode,
            panel: panelNode,
            sideBar: sideBarNode
        }, width, middleSectionHeight);
        const result = {
            root: {
                type: 'branch',
                size: width,
                data: [
                    ...(this.shouldShowBannerFirst() ? titleAndBanner.reverse() : titleAndBanner),
                    {
                        type: 'branch',
                        data: middleSection,
                        size: middleSectionHeight
                    },
                    {
                        type: 'leaf',
                        data: { type: "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */ },
                        size: statusBarHeight,
                        visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN)
                    }
                ]
            },
            orientation: 0 /* Orientation.VERTICAL */,
            width,
            height
        };
        const layoutDescriptor = {
            activityBarVisible: !this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN),
            sideBarVisible: !this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN),
            auxiliaryBarVisible: !this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN),
            panelVisible: !this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN),
            statusbarVisible: !this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN),
            sideBarPosition: positionToString(this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON)),
            panelPosition: positionToString(this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_POSITION)),
        };
        this.telemetryService.publicLog2('startupLayout', layoutDescriptor);
        return result;
    }
    dispose() {
        super.dispose();
        this.disposed = true;
    }
}
function getZenModeConfiguration(configurationService) {
    return configurationService.getValue(WorkbenchLayoutSettings.ZEN_MODE_CONFIG);
}
class WorkbenchLayoutStateKey {
    constructor(name, scope, target, defaultValue) {
        this.name = name;
        this.scope = scope;
        this.target = target;
        this.defaultValue = defaultValue;
    }
}
class RuntimeStateKey extends WorkbenchLayoutStateKey {
    constructor(name, scope, target, defaultValue, zenModeIgnore) {
        super(name, scope, target, defaultValue);
        this.zenModeIgnore = zenModeIgnore;
        this.runtime = true;
    }
}
class InitializationStateKey extends WorkbenchLayoutStateKey {
    constructor() {
        super(...arguments);
        this.runtime = false;
    }
}
const LayoutStateKeys = {
    // Editor
    MAIN_EDITOR_CENTERED: new RuntimeStateKey('editor.centered', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    // Zen Mode
    ZEN_MODE_ACTIVE: new RuntimeStateKey('zenMode.active', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    ZEN_MODE_EXIT_INFO: new RuntimeStateKey('zenMode.exitInfo', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, {
        transitionedToCenteredEditorLayout: false,
        transitionedToFullScreen: false,
        handleNotificationsDoNotDisturbMode: false,
        wasVisible: {
            auxiliaryBar: false,
            panel: false,
            sideBar: false,
        },
    }),
    // Part Sizing
    SIDEBAR_SIZE: new InitializationStateKey('sideBar.size', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 300),
    AUXILIARYBAR_SIZE: new InitializationStateKey('auxiliaryBar.size', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 300),
    PANEL_SIZE: new InitializationStateKey('panel.size', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 300),
    // Part State
    PANEL_LAST_NON_MAXIMIZED_HEIGHT: new RuntimeStateKey('panel.lastNonMaximizedHeight', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 300),
    PANEL_LAST_NON_MAXIMIZED_WIDTH: new RuntimeStateKey('panel.lastNonMaximizedWidth', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 300),
    PANEL_WAS_LAST_MAXIMIZED: new RuntimeStateKey('panel.wasLastMaximized', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    AUXILIARYBAR_WAS_LAST_MAXIMIZED: new RuntimeStateKey('auxiliaryBar.wasLastMaximized', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    AUXILIARYBAR_LAST_NON_MAXIMIZED_SIZE: new RuntimeStateKey('auxiliaryBar.lastNonMaximizedSize', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 300),
    AUXILIARYBAR_LAST_NON_MAXIMIZED_VISIBILITY: new RuntimeStateKey('auxiliaryBar.lastNonMaximizedVisibility', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, {
        sideBarVisible: false,
        editorVisible: false,
        panelVisible: false,
        auxiliaryBarVisible: false
    }),
    AUXILIARYBAR_EMPTY: new InitializationStateKey('auxiliaryBar.empty', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, false),
    // Part Positions
    SIDEBAR_POSITON: new RuntimeStateKey('sideBar.position', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, 0 /* Position.LEFT */),
    PANEL_POSITION: new RuntimeStateKey('panel.position', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, 2 /* Position.BOTTOM */),
    PANEL_ALIGNMENT: new RuntimeStateKey('panel.alignment', 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */, 'center'),
    // Part Visibility
    ACTIVITYBAR_HIDDEN: new RuntimeStateKey('activityBar.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false, true),
    SIDEBAR_HIDDEN: new RuntimeStateKey('sideBar.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    EDITOR_HIDDEN: new RuntimeStateKey('editor.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    PANEL_HIDDEN: new RuntimeStateKey('panel.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, true),
    AUXILIARYBAR_HIDDEN: new RuntimeStateKey('auxiliaryBar.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, true),
    STATUSBAR_HIDDEN: new RuntimeStateKey('statusBar.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false, true)
};
var WorkbenchLayoutSettings;
(function (WorkbenchLayoutSettings) {
    WorkbenchLayoutSettings["AUXILIARYBAR_DEFAULT_VISIBILITY"] = "workbench.secondarySideBar.defaultVisibility";
    WorkbenchLayoutSettings["ACTIVITY_BAR_VISIBLE"] = "workbench.activityBar.visible";
    WorkbenchLayoutSettings["PANEL_POSITION"] = "workbench.panel.defaultLocation";
    WorkbenchLayoutSettings["PANEL_OPENS_MAXIMIZED"] = "workbench.panel.opensMaximized";
    WorkbenchLayoutSettings["ZEN_MODE_CONFIG"] = "zenMode";
    WorkbenchLayoutSettings["EDITOR_CENTERED_LAYOUT_AUTO_RESIZE"] = "workbench.editor.centeredLayoutAutoResize";
})(WorkbenchLayoutSettings || (WorkbenchLayoutSettings = {}));
var LegacyWorkbenchLayoutSettings;
(function (LegacyWorkbenchLayoutSettings) {
    LegacyWorkbenchLayoutSettings["STATUSBAR_VISIBLE"] = "workbench.statusBar.visible";
    LegacyWorkbenchLayoutSettings["SIDEBAR_POSITION"] = "workbench.sideBar.location";
})(LegacyWorkbenchLayoutSettings || (LegacyWorkbenchLayoutSettings = {}));
class LayoutStateModel extends Disposable {
    static { this.STORAGE_PREFIX = 'workbench.'; }
    constructor(storageService, configurationService, contextService, environmentService) {
        super();
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.environmentService = environmentService;
        this._onDidChangeState = this._register(new Emitter());
        this.onDidChangeState = this._onDidChangeState.event;
        this.stateCache = new Map();
        this.isNew = {
            [1 /* StorageScope.WORKSPACE */]: this.storageService.isNew(1 /* StorageScope.WORKSPACE */),
            [0 /* StorageScope.PROFILE */]: this.storageService.isNew(0 /* StorageScope.PROFILE */),
            [-1 /* StorageScope.APPLICATION */]: this.storageService.isNew(-1 /* StorageScope.APPLICATION */)
        };
        this._register(this.configurationService.onDidChangeConfiguration(configurationChange => this.updateStateFromLegacySettings(configurationChange)));
    }
    updateStateFromLegacySettings(configurationChangeEvent) {
        if (configurationChangeEvent.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */)) {
            this.setRuntimeValueAndFire(LayoutStateKeys.ACTIVITYBAR_HIDDEN, this.isActivityBarHidden());
        }
        if (configurationChangeEvent.affectsConfiguration(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE)) {
            this.setRuntimeValueAndFire(LayoutStateKeys.STATUSBAR_HIDDEN, !this.configurationService.getValue(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE));
        }
        if (configurationChangeEvent.affectsConfiguration(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION)) {
            this.setRuntimeValueAndFire(LayoutStateKeys.SIDEBAR_POSITON, positionFromString(this.configurationService.getValue(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION) ?? 'left'));
        }
    }
    updateLegacySettingsFromState(key, value) {
        const isZenMode = this.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);
        if (key.zenModeIgnore && isZenMode) {
            return;
        }
        if (key === LayoutStateKeys.ACTIVITYBAR_HIDDEN) {
            this.configurationService.updateValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, value ? "hidden" /* ActivityBarPosition.HIDDEN */ : undefined);
        }
        else if (key === LayoutStateKeys.STATUSBAR_HIDDEN) {
            this.configurationService.updateValue(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE, !value);
        }
        else if (key === LayoutStateKeys.SIDEBAR_POSITON) {
            this.configurationService.updateValue(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION, positionToString(value));
        }
    }
    load(configuration) {
        let key;
        // Load stored values for all keys unless we explicitly set to reset
        if (!configuration.resetLayout) {
            for (key in LayoutStateKeys) {
                const stateKey = LayoutStateKeys[key];
                const value = this.loadKeyFromStorage(stateKey);
                if (value !== undefined) {
                    this.stateCache.set(stateKey.name, value);
                }
            }
        }
        // Apply legacy settings
        this.stateCache.set(LayoutStateKeys.ACTIVITYBAR_HIDDEN.name, this.isActivityBarHidden());
        this.stateCache.set(LayoutStateKeys.STATUSBAR_HIDDEN.name, !this.configurationService.getValue(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE));
        this.stateCache.set(LayoutStateKeys.SIDEBAR_POSITON.name, positionFromString(this.configurationService.getValue(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION) ?? 'left'));
        // Set dynamic defaults: part sizing and side bar visibility
        const workbenchState = this.contextService.getWorkbenchState();
        const mainContainerDimension = configuration.mainContainerDimension;
        LayoutStateKeys.SIDEBAR_SIZE.defaultValue = Math.min(300, mainContainerDimension.width / 4);
        LayoutStateKeys.SIDEBAR_HIDDEN.defaultValue = workbenchState === 1 /* WorkbenchState.EMPTY */;
        LayoutStateKeys.AUXILIARYBAR_SIZE.defaultValue = Math.min(300, mainContainerDimension.width / 4);
        LayoutStateKeys.AUXILIARYBAR_HIDDEN.defaultValue = (() => {
            if (isWeb && !this.environmentService.remoteAuthority) {
                return true; // TODO@bpasero remove this condition once Chat web support lands
            }
            const configuration = this.configurationService.inspect(WorkbenchLayoutSettings.AUXILIARYBAR_DEFAULT_VISIBILITY);
            // Unless auxiliary bar visibility is explicitly configured, make
            // sure to not force open it in case we know it was empty before.
            if (configuration.defaultValue !== 'hidden' && !isConfigured(configuration) && this.stateCache.get(LayoutStateKeys.AUXILIARYBAR_EMPTY.name)) {
                return true;
            }
            // New users: Show auxiliary bar even in empty workspaces
            // but not if the user explicitly hides it
            if (this.isNew[-1 /* StorageScope.APPLICATION */] &&
                configuration.value !== 'hidden') {
                return false;
            }
            // Existing users: respect visibility setting
            switch (configuration.value) {
                case 'hidden':
                    return true;
                case 'visibleInWorkspace':
                case 'maximizedInWorkspace':
                    return workbenchState === 1 /* WorkbenchState.EMPTY */;
                default:
                    return false;
            }
        })();
        LayoutStateKeys.PANEL_SIZE.defaultValue = (this.stateCache.get(LayoutStateKeys.PANEL_POSITION.name) ?? isHorizontal(LayoutStateKeys.PANEL_POSITION.defaultValue)) ? mainContainerDimension.height / 3 : mainContainerDimension.width / 4;
        LayoutStateKeys.PANEL_POSITION.defaultValue = positionFromString(this.configurationService.getValue(WorkbenchLayoutSettings.PANEL_POSITION) ?? 'bottom');
        // Apply all defaults
        for (key in LayoutStateKeys) {
            const stateKey = LayoutStateKeys[key];
            if (this.stateCache.get(stateKey.name) === undefined) {
                this.stateCache.set(stateKey.name, stateKey.defaultValue);
            }
        }
        // Apply all overrides
        this.applyOverrides(configuration);
        // Register for runtime key changes
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, undefined, this._store)(storageChangeEvent => {
            let key;
            for (key in LayoutStateKeys) {
                const stateKey = LayoutStateKeys[key];
                if (stateKey instanceof RuntimeStateKey && stateKey.scope === 0 /* StorageScope.PROFILE */ && stateKey.target === 0 /* StorageTarget.USER */) {
                    if (`${LayoutStateModel.STORAGE_PREFIX}${stateKey.name}` === storageChangeEvent.key) {
                        const value = this.loadKeyFromStorage(stateKey) ?? stateKey.defaultValue;
                        if (this.stateCache.get(stateKey.name) !== value) {
                            this.stateCache.set(stateKey.name, value);
                            this._onDidChangeState.fire({ key: stateKey, value });
                        }
                    }
                }
            }
        }));
    }
    applyOverrides(configuration) {
        // Auxiliary bar: Maximized setting (new workspaces)
        if (this.isNew[1 /* StorageScope.WORKSPACE */]) {
            const defaultAuxiliaryBarVisibility = this.configurationService.getValue(WorkbenchLayoutSettings.AUXILIARYBAR_DEFAULT_VISIBILITY);
            if (defaultAuxiliaryBarVisibility === 'maximized' ||
                (defaultAuxiliaryBarVisibility === 'maximizedInWorkspace' && this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */)) {
                this.applyAuxiliaryBarMaximizedOverride();
            }
        }
        // Both editor and panel should not be hidden on startup unless auxiliary bar is maximized
        if (this.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN) &&
            this.getRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN) &&
            !this.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_WAS_LAST_MAXIMIZED)) {
            this.setRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN, false);
        }
        // Restrict auxiliary bar size in case of small window dimensions
        if (this.isNew[1 /* StorageScope.WORKSPACE */] && configuration.mainContainerDimension.width <= DEFAULT_WORKSPACE_WINDOW_DIMENSIONS.width) {
            this.setInitializationValue(LayoutStateKeys.SIDEBAR_SIZE, Math.min(300, configuration.mainContainerDimension.width / 4));
            this.setInitializationValue(LayoutStateKeys.AUXILIARYBAR_SIZE, Math.min(300, configuration.mainContainerDimension.width / 4));
        }
    }
    applyAuxiliaryBarMaximizedOverride() {
        this.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_LAST_NON_MAXIMIZED_VISIBILITY, {
            sideBarVisible: !this.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN),
            panelVisible: !this.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN),
            editorVisible: !this.getRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN),
            auxiliaryBarVisible: !this.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN)
        });
        this.setRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN, true);
        this.setRuntimeValue(LayoutStateKeys.PANEL_HIDDEN, true);
        this.setRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN, true);
        this.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN, false);
        this.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_LAST_NON_MAXIMIZED_SIZE, this.getInitializationValue(LayoutStateKeys.AUXILIARYBAR_SIZE));
        this.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_WAS_LAST_MAXIMIZED, true);
    }
    save(workspace, global) {
        let key;
        const isZenMode = this.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);
        for (key in LayoutStateKeys) {
            const stateKey = LayoutStateKeys[key];
            if ((workspace && stateKey.scope === 1 /* StorageScope.WORKSPACE */) ||
                (global && stateKey.scope === 0 /* StorageScope.PROFILE */)) {
                if (isZenMode && stateKey instanceof RuntimeStateKey && stateKey.zenModeIgnore) {
                    continue; // Don't write out specific keys while in zen mode
                }
                this.saveKeyToStorage(stateKey);
            }
        }
    }
    getInitializationValue(key) {
        return this.stateCache.get(key.name);
    }
    setInitializationValue(key, value) {
        this.stateCache.set(key.name, value);
    }
    getRuntimeValue(key, fallbackToSetting) {
        if (fallbackToSetting) {
            switch (key) {
                case LayoutStateKeys.ACTIVITYBAR_HIDDEN:
                    this.stateCache.set(key.name, this.isActivityBarHidden());
                    break;
                case LayoutStateKeys.STATUSBAR_HIDDEN:
                    this.stateCache.set(key.name, !this.configurationService.getValue(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE));
                    break;
                case LayoutStateKeys.SIDEBAR_POSITON:
                    this.stateCache.set(key.name, this.configurationService.getValue(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION) ?? 'left');
                    break;
            }
        }
        return this.stateCache.get(key.name);
    }
    setRuntimeValue(key, value) {
        this.stateCache.set(key.name, value);
        const isZenMode = this.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);
        if (key.scope === 0 /* StorageScope.PROFILE */) {
            if (!isZenMode || !key.zenModeIgnore) {
                this.saveKeyToStorage(key);
                this.updateLegacySettingsFromState(key, value);
            }
        }
    }
    isActivityBarHidden() {
        const oldValue = this.configurationService.getValue(WorkbenchLayoutSettings.ACTIVITY_BAR_VISIBLE);
        if (oldValue !== undefined) {
            return !oldValue;
        }
        return this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */) !== "default" /* ActivityBarPosition.DEFAULT */;
    }
    setRuntimeValueAndFire(key, value) {
        const previousValue = this.stateCache.get(key.name);
        if (previousValue === value) {
            return;
        }
        this.setRuntimeValue(key, value);
        this._onDidChangeState.fire({ key, value });
    }
    saveKeyToStorage(key) {
        const value = this.stateCache.get(key.name);
        this.storageService.store(`${LayoutStateModel.STORAGE_PREFIX}${key.name}`, typeof value === 'object' ? JSON.stringify(value) : value, key.scope, key.target);
    }
    loadKeyFromStorage(key) {
        let value = this.storageService.get(`${LayoutStateModel.STORAGE_PREFIX}${key.name}`, key.scope);
        // TODO@bpasero remove this code in 1y when "pre-AI" workspaces have migrated
        // Refs: https://github.com/microsoft/vscode-internalbacklog/issues/6168
        if (key.scope === 1 /* StorageScope.WORKSPACE */ &&
            key.name === LayoutStateKeys.AUXILIARYBAR_HIDDEN.name &&
            this.configurationService.getValue('workbench.secondarySideBar.enableDefaultVisibilityInOldWorkspace') === true &&
            this.storageService.get('workbench.panel.chat.numberOfVisibleViews', 1 /* StorageScope.WORKSPACE */) === undefined) {
            value = undefined;
        }
        if (value !== undefined) {
            this.isNew[key.scope] = false; // remember that we had previous state for this scope
            switch (typeof key.defaultValue) {
                case 'boolean': return (value === 'true');
                case 'number': return parseInt(value);
                case 'object': return JSON.parse(value);
            }
        }
        return value;
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvbGF5b3V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN2SCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUscUJBQXFCLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBYyxxQkFBcUIsRUFBRSxzQkFBc0IsRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDcFIsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNsRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzlGLE9BQU8sRUFBNEMscUJBQXFCLEVBQXVCLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzNJLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDdkQsT0FBTyxFQUF1RSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBRSw0QkFBNEIsRUFBd0osd0JBQXdCLEVBQUUsWUFBWSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7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