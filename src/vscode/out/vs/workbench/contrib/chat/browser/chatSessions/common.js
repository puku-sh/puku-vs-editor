/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { fromNow } from '../../../../../base/common/date.js';
import { Schemas } from '../../../../../base/common/network.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { localChatSessionType } from '../../common/chatSessionsService.js';
import { ChatEditorInput } from '../chatEditorInput.js';
export const NEW_CHAT_SESSION_ACTION_ID = 'workbench.action.chat.openNewSessionEditor';
export function isChatSession(schemes, editor) {
    if (!(editor instanceof ChatEditorInput)) {
        return false;
    }
    if (!schemes.includes(editor.resource?.scheme) && editor.resource?.scheme !== Schemas.vscodeLocalChatSession && editor.resource?.scheme !== Schemas.vscodeChatEditor) {
        return false;
    }
    if (editor.options.ignoreInView) {
        return false;
    }
    return true;
}
/**
 * Find existing chat editors that have the same session URI (for external providers)
 */
export function findExistingChatEditorByUri(sessionUri, editorGroupsService) {
    for (const group of editorGroupsService.groups) {
        for (const editor of group.editors) {
            if (editor instanceof ChatEditorInput && isEqual(editor.sessionResource, sessionUri)) {
                return { editor, group };
            }
        }
    }
    return undefined;
}
// Helper function to update relative time for chat sessions (similar to timeline)
function updateRelativeTime(item, lastRelativeTime) {
    if (item.timing?.startTime) {
        item.relativeTime = fromNow(item.timing.startTime);
        item.relativeTimeFullWord = fromNow(item.timing.startTime, false, true);
        if (lastRelativeTime === undefined || item.relativeTime !== lastRelativeTime) {
            lastRelativeTime = item.relativeTime;
            item.hideRelativeTime = false;
        }
        else {
            item.hideRelativeTime = true;
        }
    }
    else {
        // Clear timestamp properties if no timestamp
        item.relativeTime = undefined;
        item.relativeTimeFullWord = undefined;
        item.hideRelativeTime = false;
    }
    return lastRelativeTime;
}
// Helper function to extract timestamp from session item
export function extractTimestamp(item) {
    // Use timing.startTime if available from the API
    if (item.timing?.startTime) {
        return item.timing.startTime;
    }
    // For other items, timestamp might already be set
    if ('timestamp' in item) {
        // eslint-disable-next-line local/code-no-any-casts
        return item.timestamp;
    }
    return undefined;
}
// Helper function to sort sessions by timestamp (newest first)
function sortSessionsByTimestamp(sessions) {
    sessions.sort((a, b) => {
        const aTime = a.timing?.startTime ?? 0;
        const bTime = b.timing?.startTime ?? 0;
        return bTime - aTime; // newest first
    });
}
// Helper function to apply time grouping to a list of sessions
function applyTimeGrouping(sessions) {
    let lastRelativeTime;
    sessions.forEach(session => {
        lastRelativeTime = updateRelativeTime(session, lastRelativeTime);
    });
}
// Helper function to process session items with timestamps, sorting, and grouping
export function processSessionsWithTimeGrouping(sessions) {
    const sessionsTemp = [...sessions];
    // Only process if we have sessions with timestamps
    if (sessions.some(session => session.timing?.startTime !== undefined)) {
        sortSessionsByTimestamp(sessionsTemp);
        applyTimeGrouping(sessionsTemp);
    }
    return sessionsTemp;
}
// Helper function to create context overlay for session items
export function getSessionItemContextOverlay(session, provider, chatWidgetService, chatService, editorGroupsService) {
    const overlay = [];
    if (provider) {
        overlay.push([ChatContextKeys.sessionType.key, provider.chatSessionType]);
    }
    // Mark history items
    overlay.push([ChatContextKeys.isArchivedItem.key, session.archived]);
    // Mark active sessions - check if session is currently open in editor or widget
    let isActiveSession = false;
    if (!session.archived && provider?.chatSessionType === localChatSessionType) {
        // Local non-history sessions are always active
        isActiveSession = true;
    }
    else if (session.archived && chatWidgetService && chatService && editorGroupsService) {
        // Check if session is open in a chat widget
        const widget = chatWidgetService.getWidgetBySessionResource(session.resource);
        if (widget) {
            isActiveSession = true;
        }
        else {
            // Check if session is open in any editor
            isActiveSession = !!findExistingChatEditorByUri(session.resource, editorGroupsService);
        }
    }
    overlay.push([ChatContextKeys.isActiveSession.key, isActiveSession]);
    return overlay;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRTZXNzaW9ucy9jb21tb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFJbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRWxFLE9BQU8sRUFBOEMsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV2SCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHeEQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsNENBQTRDLENBQUM7QUFTdkYsTUFBTSxVQUFVLGFBQWEsQ0FBQyxPQUEwQixFQUFFLE1BQW9CO0lBQzdFLElBQUksQ0FBQyxDQUFDLE1BQU0sWUFBWSxlQUFlLENBQUMsRUFBRSxDQUFDO1FBQzFDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLEtBQUssT0FBTyxDQUFDLHNCQUFzQixJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxLQUFLLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3RLLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxZ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