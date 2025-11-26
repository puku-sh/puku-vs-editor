/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import Severity from '../../../../../base/common/severity.js';
import * as nls from '../../../../../nls.js';
import { localize } from '../../../../../nls.js';
import { Action2, MenuId, MenuRegistry } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IExtensionGalleryService } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { AUX_WINDOW_GROUP, IEditorService, SIDE_GROUP } from '../../../../services/editor/common/editorService.js';
import { IWorkbenchExtensionManagementService } from '../../../../services/extensionManagement/common/extensionManagement.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { IChatService } from '../../common/chatService.js';
import { IChatSessionsService, localChatSessionType } from '../../common/chatSessionsService.js';
import { LocalChatSessionUri } from '../../common/chatUri.js';
import { LEGACY_AGENT_SESSIONS_VIEW_ID, ChatConfiguration } from '../../common/constants.js';
import { AGENT_SESSIONS_VIEW_CONTAINER_ID, AGENT_SESSIONS_VIEW_ID } from '../agentSessions/agentSessions.js';
import { ChatViewId, IChatWidgetService } from '../chat.js';
import { findExistingChatEditorByUri } from '../chatSessions/common.js';
import { ACTION_ID_OPEN_CHAT, CHAT_CATEGORY } from './chatActions.js';
export class RenameChatSessionAction extends Action2 {
    static { this.id = 'workbench.action.chat.renameSession'; }
    constructor() {
        super({
            id: RenameChatSessionAction.id,
            title: localize('renameSession', "Rename"),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.pencil,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 60 /* KeyCode.F2 */,
                when: ContextKeyExpr.equals('focusedView', 'workbench.view.chat.sessions.local')
            }
        });
    }
    async run(accessor, context) {
        if (!context) {
            return;
        }
        // Handle marshalled context from menu actions
        const label = context.session.label;
        const chatSessionsService = accessor.get(IChatSessionsService);
        const logService = accessor.get(ILogService);
        const chatService = accessor.get(IChatService);
        try {
            // Find the chat sessions view and trigger inline rename mode
            // This is similar to how file renaming works in the explorer
            await chatSessionsService.setEditableSession(context.session.resource, {
                validationMessage: (value) => {
                    if (!value || value.trim().length === 0) {
                        return { content: localize('renameSession.emptyName', "Name cannot be empty"), severity: Severity.Error };
                    }
                    if (value.length > 100) {
                        return { content: localize('renameSession.nameTooLong', "Name is too long (maximum 100 characters)"), severity: Severity.Error };
                    }
                    return null;
                },
                placeholder: localize('renameSession.placeholder', "Enter new name for chat session"),
                startingValue: label,
                onFinish: async (value, success) => {
                    if (success && value && value.trim() !== label) {
                        try {
                            const newTitle = value.trim();
                            chatService.setChatSessionTitle(context.session.resource, newTitle);
                            // Notify the local sessions provider that items have changed
                            chatSessionsService.notifySessionItemsChanged(localChatSessionType);
                        }
                        catch (error) {
                            logService.error(localize('renameSession.error', "Failed to rename chat session: {0}", (error instanceof Error ? error.message : String(error))));
                        }
                    }
                    await chatSessionsService.setEditableSession(context.session.resource, null);
                }
            });
        }
        catch (error) {
            logService.error('Failed to rename chat session', error instanceof Error ? error.message : String(error));
        }
    }
}
/**
 * Action to delete a chat session from history
 */
export class DeleteChatSessionAction extends Action2 {
    static { this.id = 'workbench.action.chat.deleteSession'; }
    constructor() {
        super({
            id: DeleteChatSessionAction.id,
            title: localize('deleteSession', "Delete"),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.x,
        });
    }
    async run(accessor, context) {
        if (!context) {
            return;
        }
        // Handle marshalled context from menu actions
        const chatService = accessor.get(IChatService);
        const dialogService = accessor.get(IDialogService);
        const logService = accessor.get(ILogService);
        const chatSessionsService = accessor.get(IChatSessionsService);
        try {
            // Show confirmation dialog
            const result = await dialogService.confirm({
                message: localize('deleteSession.confirm', "Are you sure you want to delete this chat session?"),
                detail: localize('deleteSession.detail', "This action cannot be undone."),
                primaryButton: localize('deleteSession.delete', "Delete"),
                type: 'warning'
            });
            if (result.confirmed) {
                await chatService.removeHistoryEntry(context.session.resource);
                // Notify the local sessions provider that items have changed
                chatSessionsService.notifySessionItemsChanged(localChatSessionType);
            }
        }
        catch (error) {
            logService.error('Failed to delete chat session', error instanceof Error ? error.message : String(error));
        }
    }
}
/**
 * Action to open a chat session in a new window
 */
export class OpenChatSessionInNewWindowAction extends Action2 {
    static { this.id = 'workbench.action.chat.openSessionInNewWindow'; }
    constructor() {
        super({
            id: OpenChatSessionInNewWindowAction.id,
            title: localize('chat.openSessionInNewWindow.label', "Move Chat into New Window"),
            category: CHAT_CATEGORY,
            f1: false,
        });
    }
    async run(accessor, context) {
        if (!context) {
            return;
        }
        const editorService = accessor.get(IEditorService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const uri = context.session.resource;
        // Check if this session is already open in another editor
        const existingEditor = findExistingChatEditorByUri(uri, editorGroupsService);
        if (existingEditor) {
            await editorService.openEditor(existingEditor.editor, existingEditor.group);
            return;
        }
        else if (chatWidgetService.getWidgetBySessionResource(uri)) {
            return;
        }
        else {
            const options = {
                ignoreInView: true,
                auxiliary: { compact: true, bounds: { width: 800, height: 640 } }
            };
            await editorService.openEditor({
                resource: uri,
                options,
            }, AUX_WINDOW_GROUP);
        }
    }
}
/**
 * Action to open a chat session in a new editor group to the side
 */
export class OpenChatSessionInNewEditorGroupAction extends Action2 {
    static { this.id = 'workbench.action.chat.openSessionInNewEditorGroup'; }
    constructor() {
        super({
            id: OpenChatSessionInNewEditorGroupAction.id,
            title: localize('chat.openSessionInNewEditorGroup.label', "Move Chat to the Side"),
            category: CHAT_CATEGORY,
            f1: false,
        });
    }
    async run(accessor, context) {
        if (!context) {
            return;
        }
        const editorService = accessor.get(IEditorService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const uri = context.session.resource;
        // Check if this session is already open in another editor
        const existingEditor = findExistingChatEditorByUri(uri, editorGroupsService);
        if (existingEditor) {
            await editorService.openEditor(existingEditor.editor, existingEditor.group);
            return;
        }
        else if (chatWidgetService.getWidgetBySessionResource(uri)) {
            // Already opened in chat widget
            return;
        }
        else {
            const options = {
                ignoreInView: true,
            };
            await editorService.openEditor({
                resource: uri,
                options,
            }, SIDE_GROUP);
        }
    }
}
/**
 * Action to open a chat session in the sidebar (chat widget)
 */
export class OpenChatSessionInSidebarAction extends Action2 {
    static { this.id = 'workbench.action.chat.openSessionInSidebar'; }
    constructor() {
        super({
            id: OpenChatSessionInSidebarAction.id,
            title: localize('chat.openSessionInSidebar.label', "Move Chat into Side Bar"),
            category: CHAT_CATEGORY,
            f1: false,
        });
    }
    async run(accessor, context) {
        const editorService = accessor.get(IEditorService);
        const viewsService = accessor.get(IViewsService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        if (!context) {
            return;
        }
        if (!LocalChatSessionUri.parseLocalSessionId(context.session.resource)) {
            // We only allow local sessions to be opened in the side bar
            return;
        }
        // Check if this session is already open in another editor
        // TODO: this feels strange. Should we prefer moving the editor to the sidebar instead?
        const existingEditor = findExistingChatEditorByUri(context.session.resource, editorGroupsService);
        if (existingEditor) {
            await editorService.openEditor(existingEditor.editor, existingEditor.group);
            return;
        }
        else if (chatWidgetService.getWidgetBySessionResource(context.session.resource)) {
            return;
        }
        // Open the chat view in the sidebar
        const chatViewPane = await viewsService.openView(ChatViewId);
        if (chatViewPane) {
            // Handle different session types
            await chatViewPane.loadSession(context.session.resource);
            // Focus the chat input
            chatViewPane.focusInput();
        }
    }
}
/**
 * Action to toggle the description display mode for Chat Sessions
 */
export class ToggleChatSessionsDescriptionDisplayAction extends Action2 {
    static { this.id = 'workbench.action.chatSessions.toggleDescriptionDisplay'; }
    constructor() {
        super({
            id: ToggleChatSessionsDescriptionDisplayAction.id,
            title: localize('chatSessions.toggleDescriptionDisplay.label', "Show Rich Descriptions"),
            category: CHAT_CATEGORY,
            f1: false,
            toggled: ContextKeyExpr.equals(`config.${ChatConfiguration.ShowAgentSessionsViewDescription}`, true)
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const currentValue = configurationService.getValue(ChatConfiguration.ShowAgentSessionsViewDescription);
        await configurationService.updateValue(ChatConfiguration.ShowAgentSessionsViewDescription, !currentValue);
    }
}
/**
 * Action to toggle between 'view' and 'single-view' modes for Agent Sessions
 */
export class ToggleAgentSessionsViewLocationAction extends Action2 {
    static { this.id = 'workbench.action.chatSessions.toggleNewCombinedView'; }
    constructor() {
        super({
            id: ToggleAgentSessionsViewLocationAction.id,
            title: localize('chatSessions.toggleViewLocation.label', "Combined Sessions View"),
            category: CHAT_CATEGORY,
            f1: false,
            toggled: ContextKeyExpr.equals(`config.${ChatConfiguration.AgentSessionsViewLocation}`, 'single-view'),
            menu: [
                {
                    id: MenuId.ViewContainerTitle,
                    when: ContextKeyExpr.equals('viewContainer', LEGACY_AGENT_SESSIONS_VIEW_ID),
                    group: '2_togglenew',
                    order: 1
                },
                {
                    id: MenuId.ViewContainerTitle,
                    when: ContextKeyExpr.equals('viewContainer', AGENT_SESSIONS_VIEW_CONTAINER_ID),
                    group: '2_togglenew',
                    order: 1
                }
            ]
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const viewsService = accessor.get(IViewsService);
        const currentValue = configurationService.getValue(ChatConfiguration.AgentSessionsViewLocation);
        const newValue = currentValue === 'single-view' ? 'view' : 'single-view';
        await configurationService.updateValue(ChatConfiguration.AgentSessionsViewLocation, newValue);
        const viewId = newValue === 'single-view' ? AGENT_SESSIONS_VIEW_ID : `${LEGACY_AGENT_SESSIONS_VIEW_ID}.local`;
        await viewsService.openView(viewId, true);
    }
}
export class ChatSessionsGettingStartedAction extends Action2 {
    static { this.ID = 'chat.sessions.gettingStarted'; }
    constructor() {
        super({
            id: ChatSessionsGettingStartedAction.ID,
            title: nls.localize2('chat.sessions.gettingStarted.action', "Getting Started with Chat Sessions"),
            icon: Codicon.sendToRemoteAgent,
            f1: false,
        });
    }
    async run(accessor) {
        const productService = accessor.get(IProductService);
        const quickInputService = accessor.get(IQuickInputService);
        const extensionManagementService = accessor.get(IWorkbenchExtensionManagementService);
        const extensionGalleryService = accessor.get(IExtensionGalleryService);
        const recommendations = productService.chatSessionRecommendations;
        if (!recommendations || recommendations.length === 0) {
            return;
        }
        const installedExtensions = await extensionManagementService.getInstalled();
        const isExtensionAlreadyInstalled = (extensionId) => {
            return installedExtensions.find(installed => installed.identifier.id === extensionId);
        };
        const quickPickItems = recommendations.map((recommendation) => {
            const extensionInstalled = !!isExtensionAlreadyInstalled(recommendation.extensionId);
            return {
                label: recommendation.displayName,
                description: recommendation.description,
                detail: extensionInstalled
                    ? nls.localize('chatSessions.extensionAlreadyInstalled', "'{0}' is already installed", recommendation.extensionName)
                    : nls.localize('chatSessions.installExtension', "Installs '{0}'", recommendation.extensionName),
                extensionId: recommendation.extensionId,
                disabled: extensionInstalled,
            };
        });
        const selected = await quickInputService.pick(quickPickItems, {
            title: nls.localize('chatSessions.selectExtension', "Install Chat Extensions"),
            placeHolder: nls.localize('chatSessions.pickPlaceholder', "Choose extensions to enhance your chat experience"),
            canPickMany: true,
        });
        if (!selected) {
            return;
        }
        const galleryExtensions = await extensionGalleryService.getExtensions(selected.map(item => ({ id: item.extensionId })), CancellationToken.None);
        if (!galleryExtensions) {
            return;
        }
        await extensionManagementService.installGalleryExtensions(galleryExtensions.map(extension => ({ extension, options: { preRelease: productService.quality !== 'stable' } })));
    }
}
// Register the menu item - show for all local chat sessions (including history items)
MenuRegistry.appendMenuItem(MenuId.ChatSessionsMenu, {
    command: {
        id: RenameChatSessionAction.id,
        title: localize('renameSession', "Rename"),
        icon: Codicon.pencil
    },
    group: 'inline',
    order: 1,
    when: ChatContextKeys.sessionType.isEqualTo(localChatSessionType)
});
// Register delete menu item - only show for non-active sessions (history items)
MenuRegistry.appendMenuItem(MenuId.ChatSessionsMenu, {
    command: {
        id: DeleteChatSessionAction.id,
        title: localize('deleteSession', "Delete"),
        icon: Codicon.x
    },
    group: 'inline',
    order: 2,
    when: ContextKeyExpr.and(ChatContextKeys.isArchivedItem.isEqualTo(true), ChatContextKeys.isActiveSession.isEqualTo(false))
});
MenuRegistry.appendMenuItem(MenuId.ChatSessionsMenu, {
    command: {
        id: OpenChatSessionInNewWindowAction.id,
        title: localize('openSessionInNewWindow', "Open in New Window")
    },
    group: 'navigation',
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.ChatSessionsMenu, {
    command: {
        id: OpenChatSessionInNewEditorGroupAction.id,
        title: localize('openToSide', "Open to the Side")
    },
    group: 'navigation',
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.ChatSessionsMenu, {
    command: {
        id: OpenChatSessionInSidebarAction.id,
        title: localize('openSessionInSidebar', "Open in Sidebar")
    },
    group: 'navigation',
    order: 3,
    when: ChatContextKeys.sessionType.isEqualTo(localChatSessionType),
});
// Register the toggle command for the ViewTitle menu
MenuRegistry.appendMenuItem(MenuId.ViewContainerTitle, {
    command: {
        id: ToggleChatSessionsDescriptionDisplayAction.id,
        title: localize('chatSessions.toggleDescriptionDisplay.label', "Show Rich Descriptions"),
        toggled: ContextKeyExpr.equals(`config.${ChatConfiguration.ShowAgentSessionsViewDescription}`, true)
    },
    group: '1_config',
    order: 1,
    when: ContextKeyExpr.equals('viewContainer', LEGACY_AGENT_SESSIONS_VIEW_ID),
});
MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
    command: {
        id: ACTION_ID_OPEN_CHAT,
        title: nls.localize2('interactiveSession.open', "New Chat Editor"),
        icon: Codicon.plus
    },
    group: 'navigation',
    order: 1,
    when: ContextKeyExpr.equals('view', `${LEGACY_AGENT_SESSIONS_VIEW_ID}.local`),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25BY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdFNlc3Npb25BY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUlqRSxPQUFPLFFBQVEsTUFBTSx3Q0FBd0MsQ0FBQztBQUM5RCxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFDO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBR3JILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDakcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNuSCxPQUFPLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUM5SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQW9CLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbkgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDOUQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDN0YsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0csT0FBTyxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUU1RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUV4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFPdEUsTUFBTSxPQUFPLHVCQUF3QixTQUFRLE9BQU87YUFDbkMsT0FBRSxHQUFHLHFDQUFxQyxDQUFDO0lBRTNEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHVCQUF1QixDQUFDLEVBQUU7WUFDOUIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsUUFBUSxDQUFDO1lBQzFDLEVBQUUsRUFBRSxLQUFLO1lBQ1QsUUFBUSxFQUFFLGFBQWE7WUFDdkIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1lBQ3BCLFVBQVUsRUFBRTtnQkFDWCxNQUFNLDZDQUFtQztnQkFDekMsT0FBTyxxQkFBWTtnQkFDbkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLG9DQUFvQyxDQUFDO2FBQ2hGO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxPQUF1QztRQUM1RSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPO1FBQ1IsQ0FBQztRQUVELDhDQUE4QztRQUM5QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztRQUNwQyxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUMvRCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFL0MsSUFBSSxDQUFDO1lBQ0osNkRBQTZEO1lBQzdELDZEQUE2RDtZQUM3RCxNQUFNLG1CQUFtQixDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFO2dCQUN0RSxpQkFBaUIsRUFBRSxDQUFDLEtBQWEsRUFBRSxFQUFFO29CQUNwQyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQ3pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLHlCQUF5QixFQUFFLHNCQUFzQixDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDM0csQ0FBQztvQkFDRCxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUM7d0JBQ3hCLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDJDQUEyQyxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDbEksQ0FBQztvQkFDRCxPQUFPLElBQUksQ0FBQztnQkFDYixDQUFDO2dCQUNELFdBQVcsRUFBRSxRQUFRLENBQUMsMkJBQTJCLEVBQUUsaUNBQWlDLENBQUM7Z0JBQ3JGLGFBQWEsRUFBRSxLQUFLO2dCQUNwQixRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQWEsRUFBRSxPQUFnQixFQUFFLEVBQUU7b0JBQ25ELElBQUksT0FBTyxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssS0FBSyxFQUFFLENBQUM7d0JBQ2hELElBQUksQ0FBQzs0QkFDSixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7NEJBQzlCLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQzs0QkFDcEUsNkRBQTZEOzRCQUM3RCxtQkFBbUIsQ0FBQyx5QkFBeUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO3dCQUNyRSxDQUFDO3dCQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7NEJBQ2hCLFVBQVUsQ0FBQyxLQUFLLENBQ2YsUUFBUSxDQUFDLHFCQUFxQixFQUFFLG9DQUFvQyxFQUNuRSxDQUFDLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQzFELENBQUM7d0JBQ0gsQ0FBQztvQkFDRixDQUFDO29CQUNELE1BQU0sbUJBQW1CLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzlFLENBQUM7YUFDRCxDQUFDLENBQUM7UUFDSixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixVQUFVLENBQUMsS0FBSyxDQUFDLCtCQUErQixFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzNHLENBQUM7SUFDRixDQUFDOztBQUdGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHVCQUF3QixTQUFRLE9BQU87YUFDbkMsT0FBRSxHQUFHLHFDQUFxQyxDQUFDO0lBRTNEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHVCQUF1QixDQUFDLEVBQUU7WUFDOUIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsUUFBUSxDQUFDO1lBQzFDLEVBQUUsRUFBRSxLQUFLO1lBQ1QsUUFBUSxFQUFFLGFBQWE7WUFDdkIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ2YsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxPQUF1QztRQUM1RSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPO1FBQ1IsQ0FBQztRQUVELDhDQUE4QztRQUM5QyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9DLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM3QyxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUUvRCxJQUFJLENBQUM7WUFDSiwyQkFBMkI7WUFDM0IsTUFBTSxNQUFNLEdBQUcsTUFBTSxhQUFhLENBQUMsT0FBTyxDQUFDO2dCQUMxQyxPQUFPLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLG9EQUFvRCxDQUFDO2dCQUNoRyxNQUFNLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLCtCQUErQixDQUFDO2dCQUN6RSxhQUFhLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLFFBQVEsQ0FBQztnQkFDekQsSUFBSSxFQUFFLFNBQVM7YUFDZixDQUFDLENBQUM7WUFFSCxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDdEIsTUFBTSxXQUFXLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDL0QsNkRBQTZEO2dCQUM3RCxtQkFBbUIsQ0FBQyx5QkFBeUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQ3JFLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixVQUFVLENBQUMsS0FBSyxDQUFDLCtCQUErQixFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzNHLENBQUM7SUFDRixDQUFDOztBQUdGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGdDQUFpQyxTQUFRLE9BQU87YUFDNUMsT0FBRSxHQUFHLDhDQUE4QyxDQUFDO0lBRXBFO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdDQUFnQyxDQUFDLEVBQUU7WUFDdkMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSwyQkFBMkIsQ0FBQztZQUNqRixRQUFRLEVBQUUsYUFBYTtZQUN2QixFQUFFLEVBQUUsS0FBSztTQUNULENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsT0FBdUM7UUFDNUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRS9ELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO1FBRXJDLDBEQUEwRDtRQUMxRCxNQUFNLGNBQWMsR0FBRywyQkFBMkIsQ0FBQyxHQUFHLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUM3RSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sYUFBYSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1RSxPQUFPO1FBQ1IsQ0FBQzthQUFNLElBQUksaUJBQWlCLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM5RCxPQUFPO1FBQ1IsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLE9BQU8sR0FBdUI7Z0JBQ25DLFlBQVksRUFBRSxJQUFJO2dCQUNsQixTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUFFO2FBQ2pFLENBQUM7WUFDRixNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUM7Z0JBQzlCLFFBQVEsRUFBRSxHQUFHO2dCQUNiLE9BQU87YUFDUCxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDdEIsQ0FBQztJQUNGLENBQUM7O0FBR0Y7O0dBRUc7QUFDSCxNQUFNLE9BQU8scUNBQXNDLFNBQVEsT0FBTzthQUNqRCxPQUFFLEdBQUcsbURBQW1ELENBQUM7SUFFekU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUscUNBQXFDLENBQUMsRUFBRTtZQUM1QyxLQUFLLEVBQUUsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLHVCQUF1QixDQUFDO1lBQ2xGLFFBQVEsRUFBRSxhQUFhO1lBQ3ZCLEVBQUUsRUFBRSxLQUFLO1NBQ1QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxPQUF1QztRQUM1RSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDM0QsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFL0QsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFFckMsMERBQTBEO1FBQzFELE1BQU0sY0FBYyxHQUFHLDJCQUEyQixDQUFDLEdBQUcsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQzdFLElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsTUFBTSxhQUFhLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzVFLE9BQU87UUFDUixDQUFDO2FBQU0sSUFBSSxpQkFBaUIsQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzlELGdDQUFnQztZQUNoQyxPQUFPO1FBQ1IsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLE9BQU8sR0FBdUI7Z0JBQ25DLFlBQVksRUFBRSxJQUFJO2FBQ2xCLENBQUM7WUFDRixNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUM7Z0JBQzlCLFFBQVEsRUFBRSxHQUFHO2dCQUNiLE9BQU87YUFDUCxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2hCLENBQUM7SUFDRixDQUFDOztBQUdGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLDhCQUErQixTQUFRLE9BQU87YUFDMUMsT0FBRSxHQUFHLDRDQUE0QyxDQUFDO0lBRWxFO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDhCQUE4QixDQUFDLEVBQUU7WUFDckMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSx5QkFBeUIsQ0FBQztZQUM3RSxRQUFRLEVBQUUsYUFBYTtZQUN2QixFQUFFLEVBQUUsS0FBSztTQUNULENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsT0FBdUM7UUFDNUUsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNuRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2pELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRS9ELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUN4RSw0REFBNEQ7WUFDNUQsT0FBTztRQUNSLENBQUM7UUFFRCwwREFBMEQ7UUFDMUQsdUZBQXVGO1FBQ3ZGLE1BQU0sY0FBYyxHQUFHLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDbEcsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDNUUsT0FBTztRQUNSLENBQUM7YUFBTSxJQUFJLGlCQUFpQixDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNuRixPQUFPO1FBQ1IsQ0FBQztRQUVELG9DQUFvQztRQUNwQyxNQUFNLFlBQVksR0FBRyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFpQixDQUFDO1FBQzdFLElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsaUNBQWlDO1lBQ2pDLE1BQU0sWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRXpELHVCQUF1QjtZQUN2QixZQUFZLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDM0IsQ0FBQztJQUNGLENBQUM7O0FBR0Y7O0dBRUc7QUFDSCxNQUFNLE9BQU8sMENBQTJDLFNBQVEsT0FBTzthQUN0RCxPQUFFLEdBQUcsd0RBQXdELENBQUM7SUFFOUU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsMENBQTBDLENBQUMsRUFBRTtZQUNqRCxLQUFLLEVBQUUsUUFBUSxDQUFDLDZDQUE2QyxFQUFFLHdCQUF3QixDQUFDO1lBQ3hGLFFBQVEsRUFBRSxhQUFhO1lBQ3ZCLEVBQUUsRUFBRSxLQUFLO1lBQ1QsT0FBTyxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsVUFBVSxpQkFBaUIsQ0FBQyxnQ0FBZ0MsRUFBRSxFQUFFLElBQUksQ0FBQztTQUNwRyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNqRSxNQUFNLFlBQVksR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztRQUV2RyxNQUFNLG9CQUFvQixDQUFDLFdBQVcsQ0FDckMsaUJBQWlCLENBQUMsZ0NBQWdDLEVBQ2xELENBQUMsWUFBWSxDQUNiLENBQUM7SUFDSCxDQUFDOztBQUdGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHFDQUFzQyxTQUFRLE9BQU87YUFFakQsT0FBRSxHQUFHLHFEQUFxRCxDQUFDO0lBRTNFO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHFDQUFxQyxDQUFDLEVBQUU7WUFDNUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSx3QkFBd0IsQ0FBQztZQUNsRixRQUFRLEVBQUUsYUFBYTtZQUN2QixFQUFFLEVBQUUsS0FBSztZQUNULE9BQU8sRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLFVBQVUsaUJBQWlCLENBQUMseUJBQXlCLEVBQUUsRUFBRSxhQUFhLENBQUM7WUFDdEcsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO29CQUM3QixJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsNkJBQTZCLENBQUM7b0JBQzNFLEtBQUssRUFBRSxhQUFhO29CQUNwQixLQUFLLEVBQUUsQ0FBQztpQkFDUjtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtvQkFDN0IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLGdDQUFnQyxDQUFDO29CQUM5RSxLQUFLLEVBQUUsYUFBYTtvQkFDcEIsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFakQsTUFBTSxZQUFZLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFTLGlCQUFpQixDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFFeEcsTUFBTSxRQUFRLEdBQUcsWUFBWSxLQUFLLGFBQWEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUM7UUFFekUsTUFBTSxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMseUJBQXlCLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFOUYsTUFBTSxNQUFNLEdBQUcsUUFBUSxLQUFLLGFBQWEsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEdBQUcsNkJBQTZCLFFBQVEsQ0FBQztRQUM5RyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzNDLENBQUM7O0FBR0YsTUFBTSxPQUFPLGdDQUFpQyxTQUFRLE9BQU87YUFDNUMsT0FBRSxHQUFHLDhCQUE4QixDQUFDO0lBRXBEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdDQUFnQyxDQUFDLEVBQUU7WUFDdkMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMscUNBQXFDLEVBQUUsb0NBQW9DLENBQUM7WUFDakcsSUFBSSxFQUFFLE9BQU8sQ0FBQyxpQkFBaUI7WUFDL0IsRUFBRSxFQUFFLEtBQUs7U0FDVCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUM1QyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3JELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELE1BQU0sMEJBQTBCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBRXZFLE1BQU0sZUFBZSxHQUFHLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQztRQUNsRSxJQUFJLENBQUMsZUFBZSxJQUFJLGVBQWUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdEQsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLG1CQUFtQixHQUFHLE1BQU0sMEJBQTBCLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDNUUsTUFBTSwyQkFBMkIsR0FBRyxDQUFDLFdBQW1CLEVBQUUsRUFBRTtZQUMzRCxPQUFPLG1CQUFtQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLFdBQVcsQ0FBQyxDQUFDO1FBQ3ZGLENBQUMsQ0FBQztRQUVGLE1BQU0sY0FBYyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxjQUEwQyxFQUFFLEVBQUU7WUFDekYsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLENBQUMsMkJBQTJCLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3JGLE9BQU87Z0JBQ04sS0FBSyxFQUFFLGNBQWMsQ0FBQyxXQUFXO2dCQUNqQyxXQUFXLEVBQUUsY0FBYyxDQUFDLFdBQVc7Z0JBQ3ZDLE1BQU0sRUFBRSxrQkFBa0I7b0JBQ3pCLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLDRCQUE0QixFQUFFLGNBQWMsQ0FBQyxhQUFhLENBQUM7b0JBQ3BILENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLGdCQUFnQixFQUFFLGNBQWMsQ0FBQyxhQUFhLENBQUM7Z0JBQ2hHLFdBQVcsRUFBRSxjQUFjLENBQUMsV0FBVztnQkFDdkMsUUFBUSxFQUFFLGtCQUFrQjthQUM1QixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLFFBQVEsR0FBRyxNQUFNLGlCQUFpQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDN0QsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsOEJBQThCLEVBQUUseUJBQXlCLENBQUM7WUFDOUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsOEJBQThCLEVBQUUsbURBQW1ELENBQUM7WUFDOUcsV0FBVyxFQUFFLElBQUk7U0FDakIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLGlCQUFpQixHQUFHLE1BQU0sdUJBQXVCLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEosSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDeEIsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLDBCQUEwQixDQUFDLHdCQUF3QixDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQyxPQUFPLEtBQUssUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM5SyxDQUFDOztBQUdGLHNGQUFzRjtBQUN0RixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRTtJQUNwRCxPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsdUJBQXVCLENBQUMsRUFBRTtRQUM5QixLQUFLLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUM7UUFDMUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxNQUFNO0tBQ3BCO0lBQ0QsS0FBSyxFQUFFLFFBQVE7SUFDZixLQUFLLEVBQUUsQ0FBQztJQUNSLElBQUksRUFBRSxlQUFlLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQztDQUNqRSxDQUFDLENBQUM7QUFFSCxnRkFBZ0Y7QUFDaEYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7SUFDcEQsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLHVCQUF1QixDQUFDLEVBQUU7UUFDOUIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsUUFBUSxDQUFDO1FBQzFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztLQUNmO0lBQ0QsS0FBSyxFQUFFLFFBQVE7SUFDZixLQUFLLEVBQUUsQ0FBQztJQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixlQUFlLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFDOUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQ2hEO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7SUFDcEQsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLGdDQUFnQyxDQUFDLEVBQUU7UUFDdkMsS0FBSyxFQUFFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxvQkFBb0IsQ0FBQztLQUMvRDtJQUNELEtBQUssRUFBRSxZQUFZO0lBQ25CLEtBQUssRUFBRSxDQUFDO0NBQ1IsQ0FBQyxDQUFDO0FBRUgsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7SUFDcEQsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLHFDQUFxQyxDQUFDLEVBQUU7UUFDNUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsa0JBQWtCLENBQUM7S0FDakQ7SUFDRCxLQUFLLEVBQUUsWUFBWTtJQUNuQixLQUFLLEVBQUUsQ0FBQztDQUNSLENBQUMsQ0FBQztBQUVILFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFO0lBQ3BELE9BQU8sRUFBRTtRQUNSLEVBQUUsRUFBRSw4QkFBOEIsQ0FBQyxFQUFFO1FBQ3JDLEtBQUssRUFBRSxRQUFRLENBQUMsc0JBQXNCLEVBQUUsaUJBQWlCLENBQUM7S0FDMUQ7SUFDRCxLQUFLLEVBQUUsWUFBWTtJQUNuQixLQUFLLEVBQUUsQ0FBQztJQUNSLElBQUksRUFBRSxlQUFlLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQztDQUNqRSxDQUFDLENBQUM7QUFFSCxxREFBcUQ7QUFDckQsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUU7SUFDdEQsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLDBDQUEwQyxDQUFDLEVBQUU7UUFDakQsS0FBSyxFQUFFLFFBQVEsQ0FBQyw2Q0FBNkMsRUFBRSx3QkFBd0IsQ0FBQztRQUN4RixPQUFPLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxVQUFVLGlCQUFpQixDQUFDLGdDQUFnQyxFQUFFLEVBQUUsSUFBSSxDQUFDO0tBQ3BHO0lBQ0QsS0FBSyxFQUFFLFVBQVU7SUFDakIsS0FBSyxFQUFFLENBQUM7SUFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsNkJBQTZCLENBQUM7Q0FDM0UsQ0FBQyxDQUFDO0FBRUgsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFO0lBQzdDLE9BQU8sRUFBRTtRQUNSLEVBQUUsRUFBRSxtQkFBbUI7UUFDdkIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMseUJBQXlCLEVBQUUsaUJBQWlCLENBQUM7UUFDbEUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO0tBQ2xCO0lBQ0QsS0FBSyxFQUFFLFlBQVk7SUFDbkIsS0FBSyxFQUFFLENBQUM7SUFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyw2QkFBNkIsUUFBUSxDQUFDO0NBQzdFLENBQUMsQ0FBQyJ9