/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// #######################################################################
// ###                                                                 ###
// ### !!! PLEASE ADD COMMON IMPORTS INTO WORKBENCH.COMMON.MAIN.TS !!! ###
// ###                                                                 ###
// #######################################################################
//#region --- workbench common
import './workbench.common.main.js';
//#endregion
//#region --- workbench parts
import './browser/parts/dialogs/dialog.web.contribution.js';
//#endregion
//#region --- workbench (web main)
import './browser/web.main.js';
//#endregion
//#region --- workbench services
import './services/integrity/browser/integrityService.js';
import './services/search/browser/searchService.js';
import './services/textfile/browser/browserTextFileService.js';
import './services/keybinding/browser/keyboardLayoutService.js';
import './services/extensions/browser/extensionService.js';
import './services/extensionManagement/browser/extensionsProfileScannerService.js';
import './services/extensions/browser/extensionsScannerService.js';
import './services/extensionManagement/browser/webExtensionsScannerService.js';
import './services/extensionManagement/common/extensionManagementServerService.js';
import './services/mcp/browser/mcpGalleryManifestService.js';
import './services/mcp/browser/mcpWorkbenchManagementService.js';
import './services/extensionManagement/browser/extensionGalleryManifestService.js';
import './services/telemetry/browser/telemetryService.js';
import './services/url/browser/urlService.js';
import './services/update/browser/updateService.js';
import './services/workspaces/browser/workspacesService.js';
import './services/workspaces/browser/workspaceEditingService.js';
import './services/dialogs/browser/fileDialogService.js';
import './services/host/browser/browserHostService.js';
import './services/lifecycle/browser/lifecycleService.js';
import './services/clipboard/browser/clipboardService.js';
import './services/localization/browser/localeService.js';
import './services/path/browser/pathService.js';
import './services/themes/browser/browserHostColorSchemeService.js';
import './services/encryption/browser/encryptionService.js';
import './services/imageResize/browser/imageResizeService.js';
import './services/secrets/browser/secretStorageService.js';
import './services/workingCopy/browser/workingCopyBackupService.js';
import './services/tunnel/browser/tunnelService.js';
import './services/files/browser/elevatedFileService.js';
import './services/workingCopy/browser/workingCopyHistoryService.js';
import './services/userDataSync/browser/webUserDataSyncEnablementService.js';
import './services/userDataProfile/browser/userDataProfileStorageService.js';
import './services/configurationResolver/browser/configurationResolverService.js';
import '../platform/extensionResourceLoader/browser/extensionResourceLoaderService.js';
import './services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import './services/browserElements/browser/webBrowserElementsService.js';
import { registerSingleton } from '../platform/instantiation/common/extensions.js';
import { IAccessibilityService } from '../platform/accessibility/common/accessibility.js';
import { IContextMenuService } from '../platform/contextview/browser/contextView.js';
import { ContextMenuService } from '../platform/contextview/browser/contextMenuService.js';
import { IExtensionTipsService } from '../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionTipsService } from '../platform/extensionManagement/common/extensionTipsService.js';
import { IWorkbenchExtensionManagementService } from './services/extensionManagement/common/extensionManagement.js';
import { ExtensionManagementService } from './services/extensionManagement/common/extensionManagementService.js';
import { LogLevel } from '../platform/log/common/log.js';
import { UserDataSyncMachinesService, IUserDataSyncMachinesService } from '../platform/userDataSync/common/userDataSyncMachines.js';
import { IUserDataSyncStoreService, IUserDataSyncService, IUserDataAutoSyncService, IUserDataSyncLocalStoreService, IUserDataSyncResourceProviderService } from '../platform/userDataSync/common/userDataSync.js';
import { UserDataSyncStoreService } from '../platform/userDataSync/common/userDataSyncStoreService.js';
import { UserDataSyncLocalStoreService } from '../platform/userDataSync/common/userDataSyncLocalStoreService.js';
import { UserDataSyncService } from '../platform/userDataSync/common/userDataSyncService.js';
import { IUserDataSyncAccountService, UserDataSyncAccountService } from '../platform/userDataSync/common/userDataSyncAccount.js';
import { UserDataAutoSyncService } from '../platform/userDataSync/common/userDataAutoSyncService.js';
import { AccessibilityService } from '../platform/accessibility/browser/accessibilityService.js';
import { ICustomEndpointTelemetryService } from '../platform/telemetry/common/telemetry.js';
import { NullEndpointTelemetryService } from '../platform/telemetry/common/telemetryUtils.js';
import { ITitleService } from './services/title/browser/titleService.js';
import { BrowserTitleService } from './browser/parts/titlebar/titlebarPart.js';
import { ITimerService, TimerService } from './services/timer/browser/timerService.js';
import { IDiagnosticsService, NullDiagnosticsService } from '../platform/diagnostics/common/diagnostics.js';
import { ILanguagePackService } from '../platform/languagePacks/common/languagePacks.js';
import { WebLanguagePacksService } from '../platform/languagePacks/browser/languagePacks.js';
import { IWebContentExtractorService, NullWebContentExtractorService, ISharedWebContentExtractorService, NullSharedWebContentExtractorService } from '../platform/webContentExtractor/common/webContentExtractor.js';
registerSingleton(IWorkbenchExtensionManagementService, ExtensionManagementService, 1 /* InstantiationType.Delayed */);
registerSingleton(IAccessibilityService, AccessibilityService, 1 /* InstantiationType.Delayed */);
registerSingleton(IContextMenuService, ContextMenuService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncStoreService, UserDataSyncStoreService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncMachinesService, UserDataSyncMachinesService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncLocalStoreService, UserDataSyncLocalStoreService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncAccountService, UserDataSyncAccountService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncService, UserDataSyncService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncResourceProviderService, UserDataSyncResourceProviderService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataAutoSyncService, UserDataAutoSyncService, 0 /* InstantiationType.Eager */);
registerSingleton(ITitleService, BrowserTitleService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtensionTipsService, ExtensionTipsService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITimerService, TimerService, 1 /* InstantiationType.Delayed */);
registerSingleton(ICustomEndpointTelemetryService, NullEndpointTelemetryService, 1 /* InstantiationType.Delayed */);
registerSingleton(IDiagnosticsService, NullDiagnosticsService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguagePackService, WebLanguagePacksService, 1 /* InstantiationType.Delayed */);
registerSingleton(IWebContentExtractorService, NullWebContentExtractorService, 1 /* InstantiationType.Delayed */);
registerSingleton(ISharedWebContentExtractorService, NullSharedWebContentExtractorService, 1 /* InstantiationType.Delayed */);
//#endregion
//#region --- workbench contributions
// Logs
import './contrib/logs/browser/logs.contribution.js';
// Localization
import './contrib/localization/browser/localization.contribution.js';
// Performance
import './contrib/performance/browser/performance.web.contribution.js';
// Preferences
import './contrib/preferences/browser/keyboardLayoutPicker.js';
// Debug
import './contrib/debug/browser/extensionHostDebugService.js';
// Welcome Banner
import './contrib/welcomeBanner/browser/welcomeBanner.contribution.js';
// Webview
import './contrib/webview/browser/webview.web.contribution.js';
// Extensions Management
import './contrib/extensions/browser/extensions.web.contribution.js';
// Terminal
import './contrib/terminal/browser/terminal.web.contribution.js';
import './contrib/externalTerminal/browser/externalTerminal.contribution.js';
import './contrib/terminal/browser/terminalInstanceService.js';
// Tasks
import './contrib/tasks/browser/taskService.js';
// Tags
import './contrib/tags/browser/workspaceTagsService.js';
// Issues
import './contrib/issue/browser/issue.contribution.js';
// Splash
import './contrib/splash/browser/splash.contribution.js';
// Remote Start Entry for the Web
import './contrib/remote/browser/remoteStartEntry.contribution.js';
// Process Explorer
import './contrib/processExplorer/browser/processExplorer.web.contribution.js';
//#endregion
//#region --- export workbench factory
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// Do NOT change these exports in a way that something is removed unless
// intentional. These exports are used by web embedders and thus require
// an adoption when something changes.
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
import { create, commands, env, window, workspace, logger } from './browser/web.factory.js';
import { Menu } from './browser/web.api.js';
import { URI } from '../base/common/uri.js';
import { Event, Emitter } from '../base/common/event.js';
import { Disposable } from '../base/common/lifecycle.js';
import { GroupOrientation } from './services/editor/common/editorGroupsService.js';
import { UserDataSyncResourceProviderService } from '../platform/userDataSync/common/userDataSyncResourceProvider.js';
import { RemoteAuthorityResolverError, RemoteAuthorityResolverErrorCode } from '../platform/remote/common/remoteAuthorityResolver.js';
// TODO@esm remove me once we stop supporting our web-esm-bridge
// eslint-disable-next-line local/code-no-any-casts
if (globalThis.__VSCODE_WEB_ESM_PROMISE) {
    const exports = {
        // Factory
        create: create,
        // Basic Types
        URI: URI,
        Event: Event,
        Emitter: Emitter,
        Disposable: Disposable,
        // GroupOrientation,
        LogLevel: LogLevel,
        RemoteAuthorityResolverError: RemoteAuthorityResolverError,
        RemoteAuthorityResolverErrorCode: RemoteAuthorityResolverErrorCode,
        // Facade API
        env: env,
        window: window,
        workspace: workspace,
        commands: commands,
        logger: logger,
        Menu: Menu
    };
    // eslint-disable-next-line local/code-no-any-casts
    globalThis.__VSCODE_WEB_ESM_PROMISE(exports);
    // eslint-disable-next-line local/code-no-any-casts
    delete globalThis.__VSCODE_WEB_ESM_PROMISE;
}
export { 
// Factory
create, 
// Basic Types
URI, Event, Emitter, Disposable, GroupOrientation, LogLevel, RemoteAuthorityResolverError, RemoteAuthorityResolverErrorCode, 
// Facade API
env, window, workspace, commands, logger, Menu };
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLndlYi5tYWluLmludGVybmFsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3dvcmtiZW5jaC53ZWIubWFpbi5pbnRlcm5hbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRywwRUFBMEU7QUFDMUUsMEVBQTBFO0FBQzFFLDBFQUEwRTtBQUMxRSwwRUFBMEU7QUFDMUUsMEVBQTBFO0FBRzFFLDhCQUE4QjtBQUU5QixPQUFPLDRCQUE0QixDQUFDO0FBRXBDLFlBQVk7QUFHWiw2QkFBNkI7QUFFN0IsT0FBTyxvREFBb0QsQ0FBQztBQUU1RCxZQUFZO0FBR1osa0NBQWtDO0FBRWxDLE9BQU8sdUJBQXVCLENBQUM7QUFFL0IsWUFBWTtBQUdaLGdDQUFnQztBQUVoQyxPQUFPLGtEQUFrRCxDQUFDO0FBQzFELE9BQU8sNENBQTRDLENBQUM7QUFDcEQsT0FBTyx1REFBdUQsQ0FBQztBQUMvRCxPQUFPLHdEQUF3RCxDQUFDO0FBQ2hFLE9BQU8sbURBQW1ELENBQUM7QUFDM0QsT0FBTywyRUFBMkUsQ0FBQztBQUNuRixPQUFPLDJEQUEyRCxDQUFDO0FBQ25FLE9BQU8sdUVBQXVFLENBQUM7QUFDL0UsT0FBTywyRUFBMkUsQ0FBQztBQUNuRixPQUFPLHFEQUFxRCxDQUFDO0FBQzdELE9BQU8seURBQXlELENBQUM7QUFDakUsT0FBTywyRUFBMkUsQ0FBQztBQUNuRixPQUFPLGtEQUFrRCxDQUFDO0FBQzFELE9BQU8sc0NBQXNDLENBQUM7QUFDOUMsT0FBTyw0Q0FBNEMsQ0FBQztBQUNwRCxPQUFPLG9EQUFvRCxDQUFDO0FBQzVELE9BQU8sMERBQTBELENBQUM7QUFDbEUsT0FBTyxpREFBaUQsQ0FBQztBQUN6RCxPQUFPLCtDQUErQyxDQUFDO0FBQ3ZELE9BQU8sa0RBQWtELENB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