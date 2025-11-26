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
            return localize(5306, null);
        case AgentSessionProviders.Background:
            return localize(5307, null);
        case AgentSessionProviders.Cloud:
            return localize(5308, null);
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
//# sourceMappingURL=agentSessions.js.map