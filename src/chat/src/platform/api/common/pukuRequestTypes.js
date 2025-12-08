"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Puku AI. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestType = void 0;
/**
 * Request types for Puku API - replaces @vscode/copilot-api RequestType
 *
 * This enum defines all the request types used throughout the codebase.
 * It maintains compatibility with the original Copilot API types while
 * allowing Puku to operate independently.
 *
 * NOTE: Enum values must match exactly with @vscode/copilot-api for backward compatibility
 */
var RequestType;
(function (RequestType) {
    // Authentication
    RequestType["CopilotToken"] = "CopilotToken";
    RequestType["CopilotNLToken"] = "CopilotNLToken";
    RequestType["CopilotUserInfo"] = "CopilotUserInfo";
    // Chat
    RequestType["ChatCompletions"] = "ChatCompletions";
    RequestType["ChatResponses"] = "ChatResponses";
    RequestType["ProxyCompletions"] = "ProxyCompletions";
    RequestType["ProxyChatCompletions"] = "ProxyChatCompletions";
    // Models
    RequestType["Models"] = "Models";
    RequestType["AutoModels"] = "AutoModels";
    RequestType["ModelPolicy"] = "ModelPolicy";
    RequestType["ListModel"] = "ListModel";
    // Embeddings
    RequestType["CAPIEmbeddings"] = "CAPIEmbeddings";
    RequestType["DotcomEmbeddings"] = "DotcomEmbeddings";
    RequestType["EmbeddingsIndex"] = "EmbedingsIndex";
    RequestType["EmbeddingsCodeSearch"] = "EmbeddingsCodeSearch";
    RequestType["EmbeddingsModels"] = "EmbeddingsModels";
    // Chunking
    RequestType["Chunks"] = "Chunks";
    // Content
    RequestType["ContentExclusion"] = "ContentExclusion";
    RequestType["ChatAttachmentUpload"] = "ChatAttachmentUpload";
    RequestType["CodingGuidelines"] = "CodingGuidelines";
    // Remote Agents
    RequestType["RemoteAgent"] = "RemoteAgent";
    RequestType["RemoteAgentChat"] = "RemoteAgentChat";
    RequestType["ListSkills"] = "ListSkills";
    RequestType["SearchSkill"] = "SearchSkill";
    // Snippy
    RequestType["SnippyMatch"] = "SnippyMatch";
    RequestType["SnippyFilesForMatch"] = "SnippyFlesForMatch";
    // Code Review
    RequestType["CodeReviewAgent"] = "CodeReviewAgent";
    // Telemetry
    RequestType["Telemetry"] = "Telemetry";
})(RequestType || (exports.RequestType = RequestType = {}));
//# sourceMappingURL=pukuRequestTypes.js.map