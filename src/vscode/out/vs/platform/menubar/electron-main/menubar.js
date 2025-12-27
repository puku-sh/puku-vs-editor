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
var Menubar_1;
import { app, BrowserWindow, Menu, MenuItem } from 'electron';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { mnemonicMenuLabel } from '../../../base/common/labels.js';
import { isMacintosh, language } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import * as nls from '../../../nls.js';
import { IAuxiliaryWindowsMainService } from '../../auxiliaryWindow/electron-main/auxiliaryWindows.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { isMenubarMenuItemAction, isMenubarMenuItemRecentAction, isMenubarMenuItemSeparator, isMenubarMenuItemSubmenu } from '../common/menubar.js';
import { INativeHostMainService } from '../../native/electron-main/nativeHostMainService.js';
import { IProductService } from '../../product/common/productService.js';
import { IStateService } from '../../state/node/state.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUpdateService } from '../../update/common/update.js';
import { hasNativeMenu } from '../../window/common/window.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
import { IWorkspacesHistoryMainService } from '../../workspaces/electron-main/workspacesHistoryMainService.js';
import { Disposable } from '../../../base/common/lifecycle.js';
const telemetryFrom = 'menu';
let Menubar = class Menubar extends Disposable {
    static { Menubar_1 = this; }
    static { this.lastKnownMenubarStorageKey = 'lastKnownMenubarData'; }
    constructor(updateService, configurationService, windowsMainService, environmentMainService, telemetryService, workspacesHistoryMainService, stateService, lifecycleMainService, logService, nativeHostMainService, productService, auxiliaryWindowsMainService) {
        super();
        this.updateService = updateService;
        this.configurationService = configurationService;
        this.windowsMainService = windowsMainService;
        this.environmentMainService = environmentMainService;
        this.telemetryService = telemetryService;
        this.workspacesHistoryMainService = workspacesHistoryMainService;
        this.stateService = stateService;
        this.lifecycleMainService = lifecycleMainService;
        this.logService = logService;
        this.nativeHostMainService = nativeHostMainService;
        this.productService = productService;
        this.auxiliaryWindowsMainService = auxiliaryWindowsMainService;
        this.fallbackMenuHandlers = Object.create(null);
        this.menuUpdater = new RunOnceScheduler(() => this.doUpdateMenu(), 0);
        this.menuGC = new RunOnceScheduler(() => { this.oldMenus = []; }, 10000);
        this.menubarMenus = Object.create(null);
        this.keybindings = Object.create(null);
        this.showNativeMenu = hasNativeMenu(configurationService);
        if (isMacintosh || this.showNativeMenu) {
            this.restoreCachedMenubarData();
        }
        this.addFallbackHandlers();
        this.closedLastWindow = false;
        this.noActiveMainWindow = false;
        this.oldMenus = [];
        this.install();
        this.registerListeners();
    }
    restoreCachedMenubarData() {
        const menubarData = this.stateService.getItem(Menubar_1.lastKnownMenubarStorageKey);
        if (menubarData) {
            if (menubarData.menus) {
                this.menubarMenus = menubarData.menus;
            }
            if (menubarData.keybindings) {
                this.keybindings = menubarData.keybindings;
            }
        }
    }
    addFallbackHandlers() {
        // File Menu Items
        this.fallbackMenuHandlers['workbench.action.files.newUntitledFile'] = (menuItem, win, event) => {
            if (!this.runActionInRenderer({ type: 'commandId', commandId: 'workbench.action.files.newUntitledFile' })) { // this is one of the few supported actions when aux window has focus
                this.windowsMainService.openEmptyWindow({ context: 2 /* OpenContext.MENU */, contextWindowId: win?.id });
            }
        };
        this.fallbackMenuHandlers['workbench.action.newWindow'] = (menuItem, win, event) => this.windowsMainService.openEmptyWindow({ context: 2 /* OpenContext.MENU */, contextWindowId: win?.id });
        this.fallbackMenuHandlers['workbench.action.files.openFileFolder'] = (menuItem, win, event) => this.nativeHostMainService.pickFileFolderAndOpen(undefined, { forceNewWindow: this.isOptionClick(event), telemetryExtraData: { from: telemetryFrom } });
        this.fallbackMenuHandlers['workbench.action.files.openFolder'] = (menuItem, win, event) => this.nativeHostMainService.pickFolderAndOpen(undefined, { forceNewWindow: this.isOptionClick(event), telemetryExtraData: { from: telemetryFrom } });
        this.fallbackMenuHandlers['workbench.action.openWorkspace'] = (menuItem, win, event) => this.nativeHostMainService.pickWorkspaceAndOpen(undefined, { forceNewWindow: this.isOptionClick(event), telemetryExtraData: { from: telemetryFrom } });
        // Recent Menu Items
        this.fallbackMenuHandlers['workbench.action.clearRecentFiles'] = () => this.workspacesHistoryMainService.clearRecentlyOpened({ confirm: true /* ask for confirmation */ });
        // Help Menu Items
        const youTubeUrl = this.productService.youTubeUrl;
        if (youTubeUrl) {
            this.fallbackMenuHandlers['workbench.action.openYouTubeUrl'] = () => this.openUrl(youTubeUrl, 'openYouTubeUrl');
        }
        const requestFeatureUrl = this.productService.requestFeatureUrl;
        if (requestFeatureUrl) {
            this.fallbackMenuHandlers['workbench.action.openRequestFeatureUrl'] = () => this.openUrl(requestFeatureUrl, 'openUserVoiceUrl');
        }
        const reportIssueUrl = this.productService.reportIssueUrl;
        if (reportIssueUrl) {
            this.fallbackMenuHandlers['workbench.action.openIssueReporter'] = () => this.openUrl(reportIssueUrl, 'openReportIssues');
        }
        const licenseUrl = this.productService.licenseUrl;
        if (licenseUrl) {
            this.fallbackMenuHandlers['workbench.action.openLicenseUrl'] = () => {
                if (language) {
                    const queryArgChar = licenseUrl.indexOf('?') > 0 ? '&' : '?';
                    this.openUrl(`${licenseUrl}${queryArgChar}lang=${language}`, 'openLicenseUrl');
                }
                else {
                    this.openUrl(licenseUrl, 'openLicenseUrl');
                }
            };
        }
        const privacyStatementUrl = this.productService.privacyStatementUrl;
        if (privacyStatementUrl && licenseUrl) {
            this.fallbackMenuHandlers['workbench.action.openPrivacyStatementUrl'] = () => {
                this.openUrl(privacyStatementUrl, 'openPrivacyStatement');
            };
        }
    }
    registerListeners() {
        // Keep flag when app quits
        this._register(this.lifecycleMainService.onWillShutdown(() => this.willShutdown = true));
        // Listen to some events from window service to update menu
        this._register(this.windowsMainService.onDidChangeWindowsCount(e => this.onDidChangeWindowsCount(e)));
        this._register(this.nativeHostMainService.onDidBlurMainWindow(() => this.onDidChangeWindowFocus()));
        this._register(this.nativeHostMainService.onDidFocusMainWindow(() => this.onDidChangeWindowFocus()));
    }
    get currentEnableMenuBarMnemonics() {
        const enableMenuBarMnemonics = this.configurationService.getValue('window.enableMenuBarMnemonics');
        if (typeof enableMenuBarMnemonics !== 'boolean') {
            return true;
        }
        return enableMenuBarMnemonics;
    }
    get currentEnableNativeTabs() {
        if (!isMacintosh) {
            return false;
        }
        const enableNativeTabs = this.configurationService.getValue('window.nativeTabs');
        if (typeof enableNativeTabs !== 'boolean') {
            return false;
        }
        return enableNativeTabs;
    }
    updateMenu(menubarData, windowId) {
        this.menubarMenus = menubarData.menus;
        this.keybindings = menubarData.keybindings;
        // Save off new menu and keybindings
        this.stateService.setItem(Menubar_1.lastKnownMenubarStorageKey, menubarData);
        this.scheduleUpdateMenu();
    }
    scheduleUpdateMenu() {
        this.menuUpdater.schedule(); // buffer multiple attempts to update the menu
    }
    doUpdateMenu() {
        // Due to limitations in Electron, it is not possible to update menu items dynamically. The suggested
        // workaround from Electron is to set the application menu again.
        // See also https://github.com/electron/electron/issues/846
        //
        // Run delayed to prevent updating menu while it is open
        if (!this.willShutdown) {
            setTimeout(() => {
                if (!this.willShutdown) {
                    this.install();
                }
            }, 10 /* delay this because there is an issue with updating a menu when it is open */);
        }
    }
    onDidChangeWindowsCount(e) {
        if (!isMacintosh) {
            return;
        }
        // Update menu if window count goes from N > 0 or 0 > N to update menu item enablement
        if ((e.oldCount === 0 && e.newCount > 0) || (e.oldCount > 0 && e.newCount === 0)) {
            this.closedLastWindow = e.newCount === 0;
            this.scheduleUpdateMenu();
        }
    }
    onDidChangeWindowFocus() {
        if (!isMacintosh) {
            return;
        }
        const focusedWindow = BrowserWindow.getFocusedWindow();
        this.noActiveMainWindow = !focusedWindow || !!this.auxiliaryWindowsMainService.getWindowByWebContents(focusedWindow.webContents);
        this.scheduleUpdateMenu();
    }
    install() {
        // Store old menu in our array to avoid GC to collect the menu and crash. See #55347
        // TODO@sbatten Remove this when fixed upstream by Electron
        const oldMenu = Menu.getApplicationMenu();
        if (oldMenu) {
            this.oldMenus.push(oldMenu);
        }
        // If we don't have a menu yet, set it to null to avoid the electron menu.
        // This should only happen on the first launch ever
        if (Object.keys(this.menubarMenus).length === 0) {
            this.doSetApplicationMenu(isMacintosh ? new Menu() : null);
            return;
        }
        // Menus
        const menubar = new Menu();
        // Mac: Application
        let macApplicationMenuItem;
        if (isMacintosh) {
            const applicationMenu = new Menu();
            macApplicationMenuItem = new MenuItem({ label: this.productService.nameShort, submenu: applicationMenu });
            this.setMacApplicationMenu(applicationMenu);
            menubar.append(macApplicationMenuItem);
        }
        // Mac: Dock
        if (isMacintosh && !this.appMenuInstalled) {
            this.appMenuInstalled = true;
            const dockMenu = new Menu();
            dockMenu.append(new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'miNewWindow', comment: ['&& denotes a mnemonic'] }, "New &&Window")), click: () => this.windowsMainService.openEmptyWindow({ context: 1 /* OpenContext.DOCK */ }) }));
            app.dock.setMenu(dockMenu);
        }
        // File
        if (this.shouldDrawMenu('File')) {
            const fileMenu = new Menu();
            const fileMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mFile', comment: ['&& denotes a mnemonic'] }, "&&File")), submenu: fileMenu });
            this.setMenuById(fileMenu, 'File');
            menubar.append(fileMenuItem);
        }
        // Edit
        if (this.shouldDrawMenu('Edit')) {
            const editMenu = new Menu();
            const editMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mEdit', comment: ['&& denotes a mnemonic'] }, "&&Edit")), submenu: editMenu });
            this.setMenuById(editMenu, 'Edit');
            menubar.append(editMenuItem);
        }
        // Selection
        if (this.shouldDrawMenu('Selection')) {
            const selectionMenu = new Menu();
            const selectionMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mSelection', comment: ['&& denotes a mnemonic'] }, "&&Selection")), submenu: selectionMenu });
            this.setMenuById(selectionMenu, 'Selection');
            menubar.append(selectionMenuItem);
        }
        // View
        if (this.shouldDrawMenu('View')) {
            const viewMenu = new Menu();
            const viewMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mView', comment: ['&& denotes a mnemonic'] }, "&&View")), submenu: viewMenu });
            this.setMenuById(viewMenu, 'View');
            menubar.append(viewMenuItem);
        }
        // Go
        if (this.shouldDrawMenu('Go')) {
            const gotoMenu = new Menu();
            const gotoMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mGoto', comment: ['&& denotes a mnemonic'] }, "&&Go")), submenu: gotoMenu });
            this.setMenuById(gotoMenu, 'Go');
            menubar.append(gotoMenuItem);
        }
        // Debug
        if (this.shouldDrawMenu('Run')) {
            const debugMenu = new Menu();
            const debugMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mRun', comment: ['&& denotes a mnemonic'] }, "&&Run")), submenu: debugMenu });
            this.setMenuById(debugMenu, 'Run');
            menubar.append(debugMenuItem);
        }
        // Terminal
        if (this.shouldDrawMenu('Terminal')) {
            const terminalMenu = new Menu();
            const terminalMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mTerminal', comment: ['&& denotes a mnemonic'] }, "&&Terminal")), submenu: terminalMenu });
            this.setMenuById(terminalMenu, 'Terminal');
            menubar.append(terminalMenuItem);
        }
        // Mac: Window
        let macWindowMenuItem;
        if (this.shouldDrawMenu('Window')) {
            const windowMenu = new Menu();
            macWindowMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize('mWindow', "Window")), submenu: windowMenu, role: 'window' });
            this.setMacWindowMenu(windowMenu);
        }
        if (macWindowMenuItem) {
            menubar.append(macWindowMenuItem);
        }
        // Help
        if (this.shouldDrawMenu('Help')) {
            const helpMenu = new Menu();
            const helpMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mHelp', comment: ['&& denotes a mnemonic'] }, "&&Help")), submenu: helpMenu, role: 'help' });
            this.setMenuById(helpMenu, 'Help');
            menubar.append(helpMenuItem);
        }
        if (menubar.items && menubar.items.length > 0) {
            this.doSetApplicationMenu(menubar);
        }
        else {
            this.doSetApplicationMenu(null);
        }
        // Dispose of older menus after some time
        this.menuGC.schedule();
    }
    doSetApplicationMenu(menu) {
        // Setting the application menu sets it to all opened windows,
        // but we currently do not support a menu in auxiliary windows,
        // so we need to unset it there.
        //
        // This is a bit ugly but `setApplicationMenu()` has some nice
        // behaviour we want:
        // - on macOS it is required because menus are application set
        // - we use `getApplicationMenu()` to access the current state
        // - new windows immediately get the same menu when opening
        //   reducing overall flicker for these
        Menu.setApplicationMenu(menu);
        if (menu) {
            for (const window of this.auxiliaryWindowsMainService.getWindows()) {
                window.win?.setMenu(null);
            }
        }
    }
    setMacApplicationMenu(macApplicationMenu) {
        const about = this.createMenuItem(nls.localize('mAbout', "About {0}", this.productService.nameLong), 'workbench.action.showAboutDialog');
        const checkForUpdates = this.getUpdateMenuItems();
        let preferences;
        if (this.shouldDrawMenu('Preferences')) {
            const preferencesMenu = new Menu();
            this.setMenuById(preferencesMenu, 'Preferences');
            preferences = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'miPreferences', comment: ['&& denotes a mnemonic'] }, "&&Preferences")), submenu: preferencesMenu });
        }
        const servicesMenu = new Menu();
        const services = new MenuItem({ label: nls.localize('mServices', "Services"), role: 'services', submenu: servicesMenu });
        const hide = new MenuItem({ label: nls.localize('mHide', "Hide {0}", this.productService.nameLong), role: 'hide', accelerator: 'Command+H' });
        const hideOthers = new MenuItem({ label: nls.localize('mHideOthers', "Hide Others"), role: 'hideOthers', accelerator: 'Command+Alt+H' });
        const showAll = new MenuItem({ label: nls.localize('mShowAll', "Show All"), role: 'unhide' });
        const quit = new MenuItem(this.likeAction('workbench.action.quit', {
            label: nls.localize('miQuit', "Quit {0}", this.productService.nameLong), click: async (item, window, event) => {
                const lastActiveWindow = this.windowsMainService.getLastActiveWindow();
                if (this.windowsMainService.getWindowCount() === 0 || // allow to quit when no more windows are open
                    !!BrowserWindow.getFocusedWindow() || // allow to quit when window has focus (fix for https://github.com/microsoft/vscode/issues/39191)
                    lastActiveWindow?.win?.isMinimized() // allow to quit when window has no focus but is minimized (https://github.com/microsoft/vscode/issues/63000)
                ) {
                    const confirmed = await this.confirmBeforeQuit(event);
                    if (confirmed) {
                        this.nativeHostMainService.quit(undefined);
                    }
                }
            }
        }));
        const actions = [about];
        actions.push(...checkForUpdates);
        if (preferences) {
            actions.push(...[
                __separator__(),
                preferences
            ]);
        }
        actions.push(...[
            __separator__(),
            services,
            __separator__(),
            hide,
            hideOthers,
            showAll,
            __separator__(),
            quit
        ]);
        actions.forEach(i => macApplicationMenu.append(i));
    }
    async confirmBeforeQuit(event) {
        if (this.windowsMainService.getWindowCount() === 0) {
            return true; // never confirm when no windows are opened
        }
        const confirmBeforeClose = this.configurationService.getValue('window.confirmBeforeClose');
        if (confirmBeforeClose === 'always' || (confirmBeforeClose === 'keyboardOnly' && this.isKeyboardEvent(event))) {
            const { response } = await this.nativeHostMainService.showMessageBox(this.windowsMainService.getFocusedWindow()?.id, {
                type: 'question',
                buttons: [
                    isMacintosh ? nls.localize({ key: 'quit', comment: ['&& denotes a mnemonic'] }, "&&Quit") : nls.localize({ key: 'exit', comment: ['&& denotes a mnemonic'] }, "&&Exit"),
                    nls.localize('cancel', "Cancel")
                ],
                message: isMacintosh ? nls.localize('quitMessageMac', "Are you sure you want to quit?") : nls.localize('quitMessage', "Are you sure you want to exit?")
            });
            return response === 0;
        }
        return true;
    }
    shouldDrawMenu(menuId) {
        if (!isMacintosh && !this.showNativeMenu) {
            return false; // We need to draw an empty menu to override the electron default
        }
        switch (menuId) {
            case 'File':
            case 'Help':
                if (isMacintosh) {
                    return (this.windowsMainService.getWindowCount() === 0 && this.closedLastWindow) || (this.windowsMainService.getWindowCount() > 0 && this.noActiveMainWindow) || (!!this.menubarMenus && !!this.menubarMenus[menuId]);
                }
            case 'Window':
                if (isMacintosh) {
                    return (this.windowsMainService.getWindowCount() === 0 && this.closedLastWindow) || (this.windowsMainService.getWindowCount() > 0 && this.noActiveMainWindow) || !!this.menubarMenus;
                }
            default:
                return this.windowsMainService.getWindowCount() > 0 && (!!this.menubarMenus && !!this.menubarMenus[menuId]);
        }
    }
    setMenu(menu, items) {
        items.forEach((item) => {
            if (isMenubarMenuItemSeparator(item)) {
                menu.append(__separator__());
            }
            else if (isMenubarMenuItemSubmenu(item)) {
                const submenu = new Menu();
                const submenuItem = new MenuItem({ label: this.mnemonicLabel(item.label), submenu });
                this.setMenu(submenu, item.submenu.items);
                menu.append(submenuItem);
            }
            else if (isMenubarMenuItemRecentAction(item)) {
                menu.append(this.createOpenRecentMenuItem(item));
            }
            else if (isMenubarMenuItemAction(item)) {
                if (item.id === 'workbench.action.showAboutDialog') {
                    this.insertCheckForUpdatesItems(menu);
                }
                if (isMacintosh) {
                    if ((this.windowsMainService.getWindowCount() === 0 && this.closedLastWindow) ||
                        (this.windowsMainService.getWindowCount() > 0 && this.noActiveMainWindow)) {
                        // In the fallback scenario, we are either disabled or using a fallback handler
                        if (this.fallbackMenuHandlers[item.id]) {
                            menu.append(new MenuItem(this.likeAction(item.id, { label: this.mnemonicLabel(item.label), click: this.fallbackMenuHandlers[item.id] })));
                        }
                        else {
                            menu.append(this.createMenuItem(item.label, item.id, false, item.checked));
                        }
                    }
                    else {
                        menu.append(this.createMenuItem(item.label, item.id, item.enabled !== false, !!item.checked));
                    }
                }
                else {
                    menu.append(this.createMenuItem(item.label, item.id, item.enabled !== false, !!item.checked));
                }
            }
        });
    }
    setMenuById(menu, menuId) {
        if (this.menubarMenus?.[menuId]) {
            this.setMenu(menu, this.menubarMenus[menuId].items);
        }
    }
    insertCheckForUpdatesItems(menu) {
        const updateItems = this.getUpdateMenuItems();
        if (updateItems.length) {
            updateItems.forEach(i => menu.append(i));
            menu.append(__separator__());
        }
    }
    createOpenRecentMenuItem(item) {
        const revivedUri = URI.revive(item.uri);
        const commandId = item.id;
        const openable = (commandId === 'openRecentFile') ? { fileUri: revivedUri } :
            (commandId === 'openRecentWorkspace') ? { workspaceUri: revivedUri } : { folderUri: revivedUri };
        return new MenuItem(this.likeAction(commandId, {
            label: item.label,
            click: async (menuItem, win, event) => {
                const openInNewWindow = this.isOptionClick(event);
                const success = (await this.windowsMainService.open({
                    context: 2 /* OpenContext.MENU */,
                    cli: this.environmentMainService.args,
                    urisToOpen: [openable],
                    forceNewWindow: openInNewWindow,
                    gotoLineMode: false,
                    remoteAuthority: item.remoteAuthority
                })).length > 0;
                if (!success) {
                    await this.workspacesHistoryMainService.removeRecentlyOpened([revivedUri]);
                }
            }
        }, false));
    }
    isOptionClick(event) {
        return !!(event && ((!isMacintosh && (event.ctrlKey || event.shiftKey)) || (isMacintosh && (event.metaKey || event.altKey))));
    }
    isKeyboardEvent(event) {
        return !!(event.triggeredByAccelerator || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey);
    }
    createRoleMenuItem(label, commandId, role) {
        const options = {
            label: this.mnemonicLabel(label),
            role,
            enabled: true
        };
        return new MenuItem(this.withKeybinding(commandId, options));
    }
    setMacWindowMenu(macWindowMenu) {
        const minimize = new MenuItem({ label: nls.localize('mMinimize', "Minimize"), role: 'minimize', accelerator: 'Command+M', enabled: this.windowsMainService.getWindowCount() > 0 });
        const zoom = new MenuItem({ label: nls.localize('mZoom', "Zoom"), role: 'zoom', enabled: this.windowsMainService.getWindowCount() > 0 });
        const bringAllToFront = new MenuItem({ label: nls.localize('mBringToFront', "Bring All to Front"), role: 'front', enabled: this.windowsMainService.getWindowCount() > 0 });
        const switchWindow = this.createMenuItem(nls.localize({ key: 'miSwitchWindow', comment: ['&& denotes a mnemonic'] }, "Switch &&Window..."), 'workbench.action.switchWindow');
        const nativeTabMenuItems = [];
        if (this.currentEnableNativeTabs) {
            nativeTabMenuItems.push(__separator__());
            nativeTabMenuItems.push(this.createMenuItem(nls.localize('mNewTab', "New Tab"), 'workbench.action.newWindowTab'));
            nativeTabMenuItems.push(this.createRoleMenuItem(nls.localize('mShowPreviousTab', "Show Previous Tab"), 'workbench.action.showPreviousWindowTab', 'selectPreviousTab'));
            nativeTabMenuItems.push(this.createRoleMenuItem(nls.localize('mShowNextTab', "Show Next Tab"), 'workbench.action.showNextWindowTab', 'selectNextTab'));
            nativeTabMenuItems.push(this.createRoleMenuItem(nls.localize('mMoveTabToNewWindow', "Move Tab to New Window"), 'workbench.action.moveWindowTabToNewWindow', 'moveTabToNewWindow'));
            nativeTabMenuItems.push(this.createRoleMenuItem(nls.localize('mMergeAllWindows', "Merge All Windows"), 'workbench.action.mergeAllWindowTabs', 'mergeAllWindows'));
        }
        [
            minimize,
            zoom,
            __separator__(),
            switchWindow,
            ...nativeTabMenuItems,
            __separator__(),
            bringAllToFront
        ].forEach(item => macWindowMenu.append(item));
    }
    getUpdateMenuItems() {
        const state = this.updateService.state;
        switch (state.type) {
            case "idle" /* StateType.Idle */:
                return [new MenuItem({
                        label: this.mnemonicLabel(nls.localize('miCheckForUpdates', "Check for &&Updates...")), click: () => setTimeout(() => {
                            this.reportMenuActionTelemetry('CheckForUpdate');
                            this.updateService.checkForUpdates(true);
                        }, 0)
                    })];
            case "checking for updates" /* StateType.CheckingForUpdates */:
                return [new MenuItem({ label: nls.localize('miCheckingForUpdates', "Checking for Updates..."), enabled: false })];
            case "available for download" /* StateType.AvailableForDownload */:
                return [new MenuItem({
                        label: this.mnemonicLabel(nls.localize('miDownloadUpdate', "D&&ownload Available Update")), click: () => {
                            this.updateService.downloadUpdate();
                        }
                    })];
            case "downloading" /* StateType.Downloading */:
                return [new MenuItem({ label: nls.localize('miDownloadingUpdate', "Downloading Update..."), enabled: false })];
            case "downloaded" /* StateType.Downloaded */:
                return isMacintosh ? [] : [new MenuItem({
                        label: this.mnemonicLabel(nls.localize('miInstallUpdate', "Install &&Update...")), click: () => {
                            this.reportMenuActionTelemetry('InstallUpdate');
                            this.updateService.applyUpdate();
                        }
                    })];
            case "updating" /* StateType.Updating */:
                return [new MenuItem({ label: nls.localize('miInstallingUpdate', "Installing Update..."), enabled: false })];
            case "ready" /* StateType.Ready */:
                return [new MenuItem({
                        label: this.mnemonicLabel(nls.localize('miRestartToUpdate', "Restart to &&Update")), click: () => {
                            this.reportMenuActionTelemetry('RestartToUpdate');
                            this.updateService.quitAndInstall();
                        }
                    })];
            default:
                return [];
        }
    }
    createMenuItem(labelOpt, commandId, enabledOpt, checkedOpt) {
        const label = this.mnemonicLabel(labelOpt);
        const click = (menuItem, window, event) => {
            const userSettingsLabel = menuItem ? menuItem.userSettingsLabel : null;
            if (userSettingsLabel && event.triggeredByAccelerator) {
                this.runActionInRenderer({ type: 'keybinding', userSettingsLabel });
            }
            else {
                this.runActionInRenderer({ type: 'commandId', commandId });
            }
        };
        const enabled = typeof enabledOpt === 'boolean' ? enabledOpt : this.windowsMainService.getWindowCount() > 0;
        const checked = typeof checkedOpt === 'boolean' ? checkedOpt : false;
        const options = {
            label,
            click,
            enabled
        };
        if (checked) {
            options.type = 'checkbox';
            options.checked = checked;
        }
        if (isMacintosh) {
            // Add role for special case menu items
            if (commandId === 'editor.action.clipboardCutAction') {
                options.role = 'cut';
            }
            else if (commandId === 'editor.action.clipboardCopyAction') {
                options.role = 'copy';
            }
            else if (commandId === 'editor.action.clipboardPasteAction') {
                options.role = 'paste';
            }
            // Add context aware click handlers for special case menu items
            if (commandId === 'undo') {
                options.click = this.makeContextAwareClickHandler(click, {
                    inDevTools: devTools => devTools.undo(),
                    inNoWindow: () => Menu.sendActionToFirstResponder('undo:')
                });
            }
            else if (commandId === 'redo') {
                options.click = this.makeContextAwareClickHandler(click, {
                    inDevTools: devTools => devTools.redo(),
                    inNoWindow: () => Menu.sendActionToFirstResponder('redo:')
                });
            }
            else if (commandId === 'editor.action.selectAll') {
                options.click = this.makeContextAwareClickHandler(click, {
                    inDevTools: devTools => devTools.selectAll(),
                    inNoWindow: () => Menu.sendActionToFirstResponder('selectAll:')
                });
            }
        }
        return new MenuItem(this.withKeybinding(commandId, options));
    }
    makeContextAwareClickHandler(click, contextSpecificHandlers) {
        return (menuItem, win, event) => {
            // No Active Window
            const activeWindow = BrowserWindow.getFocusedWindow();
            if (!activeWindow) {
                return contextSpecificHandlers.inNoWindow();
            }
            // DevTools focused
            if (activeWindow.webContents.isDevToolsFocused() &&
                activeWindow.webContents.devToolsWebContents) {
                return contextSpecificHandlers.inDevTools(activeWindow.webContents.devToolsWebContents);
            }
            // Finally execute command in Window
            click(menuItem, win || activeWindow, event);
        };
    }
    runActionInRenderer(invocation) {
        // We want to support auxililary windows that may have focus by
        // returning their parent windows as target to support running
        // actions via the main window.
        let activeBrowserWindow = BrowserWindow.getFocusedWindow();
        if (activeBrowserWindow) {
            const auxiliaryWindowCandidate = this.auxiliaryWindowsMainService.getWindowByWebContents(activeBrowserWindow.webContents);
            if (auxiliaryWindowCandidate) {
                activeBrowserWindow = this.windowsMainService.getWindowById(auxiliaryWindowCandidate.parentId)?.win ?? null;
            }
        }
        // We make sure to not run actions when the window has no focus, this helps
        // for https://github.com/microsoft/vscode/issues/25907 and specifically for
        // https://github.com/microsoft/vscode/issues/11928
        // Still allow to run when the last active window is minimized though for
        // https://github.com/microsoft/vscode/issues/63000
        if (!activeBrowserWindow) {
            const lastActiveWindow = this.windowsMainService.getLastActiveWindow();
            if (lastActiveWindow?.win?.isMinimized()) {
                activeBrowserWindow = lastActiveWindow.win;
            }
        }
        const activeWindow = activeBrowserWindow ? this.windowsMainService.getWindowById(activeBrowserWindow.id) : undefined;
        if (activeWindow) {
            this.logService.trace('menubar#runActionInRenderer', invocation);
            if (isMacintosh && !this.environmentMainService.isBuilt && !activeWindow.isReady) {
                if ((invocation.type === 'commandId' && invocation.commandId === 'workbench.action.toggleDevTools') || (invocation.type !== 'commandId' && invocation.userSettingsLabel === 'alt+cmd+i')) {
                    // prevent this action from running twice on macOS (https://github.com/microsoft/vscode/issues/62719)
                    // we already register a keybinding in workbench.ts for opening developer tools in case something
                    // goes wrong and that keybinding is only removed when the application has loaded (= window ready).
                    return false;
                }
            }
            if (invocation.type === 'commandId') {
                const runActionPayload = { id: invocation.commandId, from: 'menu' };
                activeWindow.sendWhenReady('vscode:runAction', CancellationToken.None, runActionPayload);
            }
            else {
                const runKeybindingPayload = { userSettingsLabel: invocation.userSettingsLabel };
                activeWindow.sendWhenReady('vscode:runKeybinding', CancellationToken.None, runKeybindingPayload);
            }
            return true;
        }
        else {
            this.logService.trace('menubar#runActionInRenderer: no active window found', invocation);
            return false;
        }
    }
    withKeybinding(commandId, options) {
        const binding = typeof commandId === 'string' ? this.keybindings[commandId] : undefined;
        // Apply binding if there is one
        if (binding?.label) {
            // if the binding is native, we can just apply it
            if (binding.isNative !== false) {
                options.accelerator = binding.label;
                options.userSettingsLabel = binding.userSettingsLabel;
            }
            // the keybinding is not native so we cannot show it as part of the accelerator of
            // the menu item. we fallback to a different strategy so that we always display it
            else if (typeof options.label === 'string') {
                const bindingIndex = options.label.indexOf('[');
                if (bindingIndex >= 0) {
                    options.label = `${options.label.substr(0, bindingIndex)} [${binding.label}]`;
                }
                else {
                    options.label = `${options.label} [${binding.label}]`;
                }
            }
        }
        // Unset bindings if there is none
        else {
            options.accelerator = undefined;
        }
        return options;
    }
    likeAction(commandId, options, setAccelerator = !options.accelerator) {
        if (setAccelerator) {
            options = this.withKeybinding(commandId, options);
        }
        const originalClick = options.click;
        options.click = (item, window, event) => {
            this.reportMenuActionTelemetry(commandId);
            originalClick?.(item, window, event);
        };
        return options;
    }
    openUrl(url, id) {
        this.nativeHostMainService.openExternal(undefined, url);
        this.reportMenuActionTelemetry(id);
    }
    reportMenuActionTelemetry(id) {
        this.telemetryService.publicLog2('workbenchActionExecuted', { id, from: telemetryFrom });
    }
    mnemonicLabel(label) {
        return mnemonicMenuLabel(label, !this.currentEnableMenuBarMnemonics);
    }
};
Menubar = Menubar_1 = __decorate([
    __param(0, IUpdateService),
    __param(1, IConfigurationService),
    __param(2, IWindowsMainService),
    __param(3, IEnvironmentMainService),
    __param(4, ITelemetryService),
    __param(5, IWorkspacesHistoryMainService),
    __param(6, IStateService),
    __param(7, ILifecycleMainService),
    __param(8, ILogService),
    __param(9, INativeHostMainService),
    __param(10, IProductService),
    __param(11, IAuxiliaryWindowsMainService)
], Menubar);
export { Menubar };
function __separator__() {
    return new MenuItem({ type: 'separator' });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL21lbnViYXIvZWxlY3Ryb24tbWFpbi9tZW51YmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBNkIsSUFBSSxFQUFFLFFBQVEsRUFBMkMsTUFBTSxVQUFVLENBQUM7QUFFbEksT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN2RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNwRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFnRix1QkFBdUIsRUFBRSw2QkFBNkIsRUFBRSwwQkFBMEIsRUFBRSx3QkFBd0IsRUFBbUIsTUFBTSxzQkFBc0IsQ0FBQztBQUNuUCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxx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