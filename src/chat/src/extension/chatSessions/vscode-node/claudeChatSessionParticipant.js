"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeChatSessionParticipant = void 0;
const nls_1 = require("../../../util/vs/nls");
const claudeChatSessionItemProvider_1 = require("./claudeChatSessionItemProvider");
class ClaudeChatSessionParticipant {
    constructor(sessionType, claudeAgentManager, sessionItemProvider) {
        this.sessionType = sessionType;
        this.claudeAgentManager = claudeAgentManager;
        this.sessionItemProvider = sessionItemProvider;
    }
    createHandler() {
        return this.handleRequest.bind(this);
    }
    async handleRequest(request, context, stream, token) {
        const create = async () => {
            const { claudeSessionId } = await this.claudeAgentManager.handleRequest(undefined, request, context, stream, token);
            if (!claudeSessionId) {
                stream.warning((0, nls_1.localize)('claude.failedToCreateSession', "Failed to create a new Claude Code session."));
                return undefined;
            }
            return claudeSessionId;
        };
        const { chatSessionContext } = context;
        if (chatSessionContext) {
            if (chatSessionContext.isUntitled) {
                /* New, empty session */
                const claudeSessionId = await create();
                if (claudeSessionId) {
                    // Tell UI to replace with claude-backed session
                    this.sessionItemProvider.swap(chatSessionContext.chatSessionItem, {
                        resource: claudeChatSessionItemProvider_1.ClaudeSessionUri.forSessionId(claudeSessionId),
                        label: request.prompt ?? 'Claude Code'
                    });
                }
                return {};
            }
            /* Existing session */
            const id = claudeChatSessionItemProvider_1.ClaudeSessionUri.getId(chatSessionContext.chatSessionItem.resource);
            await this.claudeAgentManager.handleRequest(id, request, context, stream, token);
            return {};
        }
        /* Via @claude */
        // TODO: Think about how this should work
        stream.markdown((0, nls_1.localize)('claude.viaAtClaude', "Start a new Claude Code session"));
        stream.button({ command: `workbench.action.chat.openNewSessionEditor.${this.sessionType}`, title: (0, nls_1.localize)('claude.startNewSession', "Start Session") });
        return {};
    }
}
exports.ClaudeChatSessionParticipant = ClaudeChatSessionParticipant;
//# sourceMappingURL=claudeChatSessionParticipant.js.map