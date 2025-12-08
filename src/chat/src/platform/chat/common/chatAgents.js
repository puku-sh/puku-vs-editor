"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAT_PARTICIPANT_ID_PREFIX = exports.editsAgentName = exports.notebookEditorAgentName = exports.editingSessionAgentEditorName = exports.editingSessionAgent2Name = exports.editingSessionAgentName = exports.terminalAgentName = exports.vscodeAgentName = exports.workspaceAgentName = exports.editorAgentName = exports.defaultAgentName = exports.IChatAgentService = void 0;
exports.getChatParticipantIdFromName = getChatParticipantIdFromName;
exports.getChatParticipantNameFromId = getChatParticipantNameFromId;
const services_1 = require("../../../util/common/services");
exports.IChatAgentService = (0, services_1.createServiceIdentifier)('IChatAgentService');
exports.defaultAgentName = 'default';
exports.editorAgentName = 'editor';
exports.workspaceAgentName = 'workspace';
exports.vscodeAgentName = 'vscode';
exports.terminalAgentName = 'terminal';
exports.editingSessionAgentName = 'editingSession';
exports.editingSessionAgent2Name = 'editingSession2';
exports.editingSessionAgentEditorName = 'editingSessionEditor';
exports.notebookEditorAgentName = 'notebookEditorAgent';
exports.editsAgentName = 'editsAgent';
exports.CHAT_PARTICIPANT_ID_PREFIX = 'puku.';
function getChatParticipantIdFromName(name) {
    return `${exports.CHAT_PARTICIPANT_ID_PREFIX}${name}`;
}
function getChatParticipantNameFromId(id) {
    return id.replace(/^github\.copilot\./, '');
}
//# sourceMappingURL=chatAgents.js.map