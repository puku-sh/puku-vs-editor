"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.participantIdToModeName = participantIdToModeName;
const chatAgents_1 = require("../../../platform/chat/common/chatAgents");
/**
 * Create a mode name for gh telemetry
 */
function participantIdToModeName(participantId) {
    const name = (0, chatAgents_1.getChatParticipantNameFromId)(participantId);
    switch (name) {
        case chatAgents_1.defaultAgentName:
        case chatAgents_1.workspaceAgentName:
        case chatAgents_1.vscodeAgentName:
        case 'terminalPanel':
            return 'ask';
        case chatAgents_1.editsAgentName:
            return 'agent';
        case chatAgents_1.editingSessionAgentName:
        case chatAgents_1.editingSessionAgent2Name:
            return 'edit';
        case chatAgents_1.editorAgentName:
        case chatAgents_1.terminalAgentName: // Count terminal and "etc" as 'inline'
        default:
            return 'inline';
    }
}
//# sourceMappingURL=intents.js.map