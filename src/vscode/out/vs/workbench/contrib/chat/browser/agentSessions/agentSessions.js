/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { localChatSessionType } from '../../common/chatSessionsService.js';
export const AGENT_SESSIONS_VIEW_CONTAINER_ID = 'workbench.viewContainer.agentSessions';
export const AGENT_SESSIONS_VIEW_ID = 'workbench.view.agentSessions';
export var AgentSessionProviders;
(function (AgentSessionProviders) {
    AgentSessionProviders["Local"] = "local";
    AgentSessionProviders["Background"] = "copilotcli";
    AgentSessionProviders["Cloud"] = "copilot-cloud-agent";
})(AgentSessionProviders || (AgentSessionProviders = {}));
export function getAgentSessionProviderName(provider) {
    switch (provider) {
        case AgentSessionProviders.Local:
            return localize('chat.session.providerLabel.local', "Local");
        case AgentSessionProviders.Background:
            return localize('chat.session.providerLabel.background', "Background");
        case AgentSessionProviders.Cloud:
            return localize('chat.session.providerLabel.cloud', "Cloud");
    }
}
export function getAgentSessionProviderIcon(provider) {
    switch (provider) {
        case AgentSessionProviders.Local:
            return Codicon.vm;
        case AgentSessionProviders.Background:
            return Codicon.collection;
        case AgentSessionProviders.Cloud:
            return Codicon.cloud;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hZ2VudFNlc3Npb25zL2FnZW50U2Vzc2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUzRSxNQUFNLENBQUMsTUFBTSxnQ0FBZ0MsR0FBRyx1Q0FBdUMsQ0FBQztBQUN4RixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyw4QkFBOEIsQ0FBQztBQUVyRSxNQUFNLENBQU4sSUFBWSxxQkFJWDtBQUpELFdBQVkscUJBQXFCO0lBQ2hDLHdDQUE0QixDQUFBO0lBQzVCLGtEQUF5QixDQUFBO0lBQ3pCLHNEQUE2QixDQUFBO0FBQzlCLENBQUMsRUFKVyxxQkFBcUIsS0FBckIscUJBQXFCLFFBSWhDO0FBRUQsTUFBTSxVQUFVLDJCQUEyQixDQUFDLFFBQStCO0lBQzFFLFFBQVEsUUFBUSxFQUFFLENBQUM7UUFDbEIsS0FBSyxxQkFBcUIsQ0FBQyxLQUFLO1lBQy9CLE9BQU8sUUFBUSxDQUFDLGtDQUFrQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzlELEtBQUsscUJBQXFCLENBQUMsVUFBVTtZQUNwQyxPQUFPLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUN4RSxLQUFLLHFCQUFxQixDQUFDLEtBQUs7WUFDL0IsT0FBTyxRQUFRLENBQUMsa0NBQWtDLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDL0QsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsMkJBQTJCLENBQUMsUUFBK0I7SUFDMUUsUUFBUSxRQUFRLEVBQUUsQ0FBQztRQUNsQixLQUFLLHFCQUFxQixDQUFDLEtBQUs7WUFDL0IsT0FBTyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ25CLEtBQUsscUJBQXFCLENBQUMsVUFBVTtZQUNwQyxPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUM7UUFDM0IsS0FBSyxxQkFBcUIsQ0FBQyxLQUFLO1lBQy9CLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQztJQUN2QixDQUFDO0FBQ0YsQ0FBQyJ9