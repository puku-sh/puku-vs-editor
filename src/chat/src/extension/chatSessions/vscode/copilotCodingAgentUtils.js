"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionIdForPr = exports.JOBS_API_VERSION = exports.body_suffix = exports.CONTINUE_TRUNCATION = exports.MAX_PROBLEM_STATEMENT_LENGTH = void 0;
exports.truncatePrompt = truncatePrompt;
exports.extractTitle = extractTitle;
exports.formatBodyPlaceholder = formatBodyPlaceholder;
exports.getRepoId = getRepoId;
exports.toOpenPullRequestWebviewUri = toOpenPullRequestWebviewUri;
exports.getAuthorDisplayName = getAuthorDisplayName;
const vscode = __importStar(require("vscode"));
const gitService_1 = require("../../../platform/git/common/gitService");
const chatSessionsUriHandler_1 = require("./chatSessionsUriHandler");
exports.MAX_PROBLEM_STATEMENT_LENGTH = 30_000 - 50; // 50 character buffer
exports.CONTINUE_TRUNCATION = vscode.l10n.t('Continue with truncation');
exports.body_suffix = vscode.l10n.t('Created from [VS Code](https://code.visualstudio.com/docs/copilot/copilot-coding-agent).');
// https://github.com/github/sweagentd/blob/main/docs/adr/0001-create-job-api.md
exports.JOBS_API_VERSION = 'v1';
/**
 * Truncation utility to ensure the problem statement sent to Copilot API is under the maximum length.
 * Truncation is not ideal. The caller providing the prompt/context should be summarizing so this is a no-op whenever possible.
 *
 * @param prompt The final message submitted by the user
 * @param context Any additional context collected by the caller (chat history, open files, etc...)
 * @returns A complete 'problem statement' string that is under the maximum length, and a flag indicating if truncation occurred
 */
function truncatePrompt(logService, prompt, context) {
    // Prioritize the userPrompt
    // Take the last n characters that fit within the limit
    if (prompt.length >= exports.MAX_PROBLEM_STATEMENT_LENGTH) {
        logService.warn(`Truncation: Prompt length ${prompt.length} exceeds max of ${exports.MAX_PROBLEM_STATEMENT_LENGTH}`);
        prompt = prompt.slice(-exports.MAX_PROBLEM_STATEMENT_LENGTH);
        return { problemStatement: prompt, isTruncated: true };
    }
    if (context && (prompt.length + context.length >= exports.MAX_PROBLEM_STATEMENT_LENGTH)) {
        const availableLength = exports.MAX_PROBLEM_STATEMENT_LENGTH - prompt.length - 2 /* new lines */;
        logService.warn(`Truncation: Combined prompt and context length ${prompt.length + context.length} exceeds max of ${exports.MAX_PROBLEM_STATEMENT_LENGTH}`);
        context = context.slice(-availableLength);
        return {
            problemStatement: prompt + (context ? `\n\n${context}` : ''),
            isTruncated: true
        };
    }
    // No truncation occurred
    return {
        problemStatement: prompt + (context ? `\n\n${context}` : ''),
        isTruncated: false
    };
}
function extractTitle(prompt, context) {
    const fromTitle = () => {
        if (!prompt) {
            return;
        }
        if (prompt.length <= 20) {
            return prompt;
        }
        return prompt.substring(0, 20) + '...';
    };
    const titleMatch = context?.match(/TITLE: \s*(.*)/i);
    if (titleMatch && titleMatch[1]) {
        return titleMatch[1].trim();
    }
    return fromTitle();
}
function formatBodyPlaceholder(title) {
    return vscode.l10n.t('Cloud agent has begun work on **{0}** and will update this pull request as work progresses.', title || vscode.l10n.t('your request'));
}
async function getRepoId(gitService) {
    let timeout = 5000;
    while (!gitService.isInitialized) {
        await new Promise(resolve => setTimeout(resolve, 100));
        timeout -= 100;
        if (timeout <= 0) {
            break;
        }
    }
    const repo = gitService.activeRepository.get();
    if (repo && repo.remoteFetchUrls?.[0]) {
        return (0, gitService_1.getGithubRepoIdFromFetchUrl)(repo.remoteFetchUrls[0]);
    }
}
var SessionIdForPr;
(function (SessionIdForPr) {
    const prefix = 'pull-session-by-index';
    function getId(prNumber, sessionIndex) {
        return `${prefix}-${prNumber}-${sessionIndex}`;
    }
    SessionIdForPr.getId = getId;
    function parse(resource) {
        const match = resource.path.match(new RegExp(`^/${prefix}-(\\d+)-(\\d+)$`));
        if (match) {
            return {
                prNumber: parseInt(match[1], 10),
                sessionIndex: parseInt(match[2], 10)
            };
        }
        return undefined;
    }
    SessionIdForPr.parse = parse;
    function parsePullRequestNumber(resource) {
        return parseInt(resource.path.slice(1));
    }
    SessionIdForPr.parsePullRequestNumber = parsePullRequestNumber;
})(SessionIdForPr || (exports.SessionIdForPr = SessionIdForPr = {}));
async function toOpenPullRequestWebviewUri(params) {
    const query = JSON.stringify(params);
    const extensionId = chatSessionsUriHandler_1.UriHandlers[chatSessionsUriHandler_1.UriHandlerPaths.External_OpenPullRequestWebview];
    return await vscode.env.asExternalUri(vscode.Uri.from({ scheme: vscode.env.uriScheme, authority: extensionId, path: chatSessionsUriHandler_1.UriHandlerPaths.External_OpenPullRequestWebview, query }));
}
function getAuthorDisplayName(author) {
    if (!author) {
        return 'Unknown';
    }
    if (author.login.startsWith('copilot')) {
        return 'Copilot';
    }
    return author.login;
}
//# sourceMappingURL=copilotCodingAgentUtils.js.map