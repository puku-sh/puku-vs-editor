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
//#region --- workbench (desktop main)
import './electron-browser/desktop.main.js';
import './electron-browser/desktop.contribution.js';
//#endregion
//#region --- workbench parts
import './electron-browser/parts/dialogs/dialog.contribution.js';
//#endregion
//#region --- workbench services
import './services/textfile/electron-browser/nativeTextFileService.js';
import './services/dialogs/electron-browser/fileDialogService.js';
import './services/workspaces/electron-browser/workspacesService.js';
import './services/menubar/electron-browser/menubarService.js';
import './services/update/electron-browser/updateService.js';
import './services/url/electron-browser/urlService.js';
import './services/lifecycle/electron-browser/lifecycleService.js';
import './services/title/electron-browser/titleService.js';
import './services/host/electron-browser/nativeHostService.js';
import './services/request/electron-browser/requestService.js';
import './services/clipboard/electron-browser/clipboardService.js';
import './services/contextmenu/electron-browser/contextmenuService.js';
import './services/workspaces/electron-browser/workspaceEditingService.js';
import './services/configurationResolver/electron-browser/configurationResolverService.js';
import './services/accessibility/electron-browser/accessibilityService.js';
import './services/keybinding/electron-browser/nativeKeyboardLayout.js';
import './services/path/electron-browser/pathService.js';
import './services/themes/electron-browser/nativeHostColorSchemeService.js';
import './services/extensionManagement/electron-browser/extensionManagementService.js';
import './services/mcp/electron-browser/mcpGalleryManifestService.js';
import './services/mcp/electron-browser/mcpWorkbenchManagementService.js';
import './services/encryption/electron-browser/encryptionService.js';
import './services/imageResize/electron-browser/imageResizeService.js';
import './services/browserElements/electron-browser/browserElementsService.js';
import './services/secrets/electron-browser/secretStorageService.js';
import './services/localization/electron-browser/languagePackService.js';
import './services/telemetry/electron-browser/telemetryService.js';
import './services/extensions/electron-browser/extensionHostStarter.js';
import '../platform/extensionResourceLoader/common/extensionResourceLoaderService.js';
import './services/localization/electron-browser/localeService.js';
import './services/extensions/electron-browser/extensionsScannerService.js';
import './services/extensionManagement/electron-browser/extensionManagementServerService.js';
import './services/extensionManagement/electron-browser/extensionGalleryManifestService.js';
import './services/extensionManagement/electron-browser/extensionTipsService.js';
import './services/userDataSync/electron-browser/userDataSyncService.js';
import './services/userDataSync/electron-browser/userDataAutoSyncService.js';
import './services/timer/electron-browser/timerService.js';
import './services/environment/electron-browser/shellEnvironmentService.js';
import './services/integrity/electron-browser/integrityService.js';
import './services/workingCopy/electron-browser/workingCopyBackupService.js';
import './services/checksum/electron-browser/checksumService.js';
import '../platform/remote/electron-browser/sharedProcessTunnelService.js';
import './services/tunnel/electron-browser/tunnelService.js';
import '../platform/diagnostics/electron-browser/diagnosticsService.js';
import '../platform/profiling/electron-browser/profilingService.js';
import '../platform/telemetry/electron-browser/customEndpointTelemetryService.js';
import '../platform/remoteTunnel/electron-browser/remoteTunnelService.js';
import './services/files/electron-browser/elevatedFileService.js';
import './services/search/electron-browser/searchService.js';
import './services/workingCopy/electron-browser/workingCopyHistoryService.js';
import './services/userDataSync/browser/userDataSyncEnablementService.js';
import './services/extensions/electron-browser/nativeExtensionService.js';
import '../platform/userDataProfile/electron-browser/userDataProfileStorageService.js';
import './services/auxiliaryWindow/electron-browser/auxiliaryWindowService.js';
import '../platform/extensionManagement/electron-browser/extensionsProfileScannerService.js';
import '../platform/webContentExtractor/electron-browser/webContentExtractorService.js';
import './services/process/electron-browser/processService.js';
import { registerSingleton } from '../platform/instantiation/common/extensions.js';
import { IUserDataInitializationService, UserDataInitializationService } from './services/userData/browser/userDataInit.js';
import { SyncDescriptor } from '../platform/instantiation/common/descriptors.js';
registerSingleton(IUserDataInitializationService, new SyncDescriptor(UserDataInitializationService, [[]], true));
//#endregion
//#region --- workbench contributions
// Logs
import './contrib/logs/electron-browser/logs.contribution.js';
// Localizations
import './contrib/localization/electron-browser/localization.contribution.js';
// Explorer
import './contrib/files/electron-browser/fileActions.contribution.js';
// CodeEditor Contributions
import './contrib/codeEditor/electron-browser/codeEditor.contribution.js';
// Debug
import './contrib/debug/electron-browser/extensionHostDebugService.js';
// Extensions Management
import './contrib/extensions/electron-browser/extensions.contribution.js';
// Issues
import './contrib/issue/electron-browser/issue.contribution.js';
// Process Explorer
import './contrib/processExplorer/electron-browser/processExplorer.contribution.js';
// Remote
import './contrib/remote/electron-browser/remote.contribution.js';
// Terminal
import './contrib/terminal/electron-browser/terminal.contribution.js';
// Themes
import './contrib/themes/browser/themes.test.contribution.js';
import './services/themes/electron-browser/themes.contribution.js';
// User Data Sync
import './contrib/userDataSync/electron-browser/userDataSync.contribution.js';
// Tags
import './contrib/tags/electron-browser/workspaceTagsService.js';
import './contrib/tags/electron-browser/tags.contribution.js';
// Performance
import './contrib/performance/electron-browser/performance.contribution.js';
// Tasks
import './contrib/tasks/electron-browser/taskService.js';
// External terminal
import './contrib/externalTerminal/electron-browser/externalTerminal.contribution.js';
// Webview
import './contrib/webview/electron-browser/webview.contribution.js';
// Splash
import './contrib/splash/electron-browser/splash.contribution.js';
// Local History
import './contrib/localHistory/electron-browser/localHistory.contribution.js';
// Merge Editor
import './contrib/mergeEditor/electron-browser/mergeEditor.contribution.js';
// Multi Diff Editor
import './contrib/multiDiffEditor/browser/multiDiffEditor.contribution.js';
// Remote Tunnel
import './contrib/remoteTunnel/electron-browser/remoteTunnel.contribution.js';
// Chat
import './contrib/chat/electron-browser/chat.contribution.js';
import './contrib/inlineChat/electron-browser/inlineChat.contribution.js';
// Encryption
import './contrib/encryption/electron-browser/encryption.contribution.js';
// Emergency Alert
import './contrib/emergencyAlert/electron-browser/emergencyAlert.contribution.js';
// MCP
import './contrib/mcp/electron-browser/mcp.contribution.js';
// Policy Export
import './contrib/policyExport/electron-browser/policyExport.contribution.js';
//#endregion
export { main } from './electron-browser/desktop.main.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmRlc2t0b3AubWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC93b3JrYmVuY2guZGVza3RvcC5tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLDBFQUEwRTtBQUMxRSwwRUFBMEU7QUFDMUUsMEVBQTBFO0FBQzFFLDBFQUEwRTtBQUMxRSwwRUFBMEU7QUFFMUUsOEJBQThCO0FBRTlCLE9BQU8sNEJBQTRCLENBQUM7QUFFcEMsWUFBWTtBQUdaLHNDQUFzQztBQUV0QyxPQUFPLG9DQUFvQyxDQUFDO0FBQzVDLE9BQU8sNENBQTRDLENBQUM7QUFFcEQsWUFBWTtBQUdaLDZCQUE2QjtBQUU3QixPQUFPLHlEQUF5RCxDQUFDO0FBRWpFLFlBQVk7QUFHWixnQ0FBZ0M7QUFFaEMsT0FBTywrREFBK0QsQ0FBQztBQUN2RSxPQUFPLDBEQUEwRCxDQUFDO0FBQ2xFLE9BQU8sNkRBQTZELENBQUM7QUFDckUsT0FBTyx1REFBdUQsQ0FBQztBQUMvRCxPQUFPLHFEQUFxRCxDQUFDO0FBQzdELE9BQU8sK0NBQStDLENBQUM7QUFDdkQsT0FBTywyREFBMkQsQ0FBQztBQUNuRSxPQUFPLG1EQUFtRCxDQUFDO0FBQzNELE9BQU8sdURBQXVELENBQUM7QUFDL0QsT0FBTyx1REFBdUQsQ0FBQztBQUMvRCxPQUFPLDJEQUEyRCxDQUFDO0FBQ25FLE9BQU8sK0RBQStELENBQUM7QUFDdkUsT0FBTyxtRUFBbUUsQ0FBQztBQUMzRSxPQUFPLG1GQUFtRixDQUFDO0FBQzNGLE9BQU8sbUVBQW1FLENBQUM7QUFDM0UsT0FBTyxnRUFBZ0UsQ0FBQztBQUN4RSxPQUFPLGlEQUFpRCxDQUFDO0FBQ3pELE9BQU8sb0VBQW9FLENBQUM7QUFDNUUsT0FBTywrRUFBK0UsQ0FBQztBQUN2RixP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