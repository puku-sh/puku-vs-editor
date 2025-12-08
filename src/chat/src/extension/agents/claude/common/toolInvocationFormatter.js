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
exports.createFormattedToolInvocation = createFormattedToolInvocation;
const l10n = __importStar(require("@vscode/l10n"));
const uri_1 = require("../../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const claudeTools_1 = require("./claudeTools");
/**
 * Creates a formatted tool invocation part based on the tool type and input
 */
function createFormattedToolInvocation(toolUse, toolResult, incompleteToolInvocation) {
    const invocation = incompleteToolInvocation ?? new vscodeTypes_1.ChatToolInvocationPart(toolUse.name, toolUse.id, false);
    invocation.isConfirmed = true;
    if (toolResult) {
        invocation.isError = toolResult.is_error; // Currently unused!
    }
    if (toolUse.name === claudeTools_1.ClaudeToolNames.Bash) {
        formatBashInvocation(invocation, toolUse);
    }
    else if (toolUse.name === claudeTools_1.ClaudeToolNames.Read) {
        formatReadInvocation(invocation, toolUse);
    }
    else if (toolUse.name === claudeTools_1.ClaudeToolNames.Glob) {
        formatGlobInvocation(invocation, toolUse);
    }
    else if (toolUse.name === claudeTools_1.ClaudeToolNames.Grep) {
        formatGrepInvocation(invocation, toolUse);
    }
    else if (toolUse.name === claudeTools_1.ClaudeToolNames.LS) {
        formatLSInvocation(invocation, toolUse);
    }
    else if (toolUse.name === claudeTools_1.ClaudeToolNames.Edit || toolUse.name === claudeTools_1.ClaudeToolNames.MultiEdit) {
        return; // edit diff is shown
    }
    else if (toolUse.name === claudeTools_1.ClaudeToolNames.Write) {
        return; // edit diff is shown
    }
    else if (toolUse.name === claudeTools_1.ClaudeToolNames.ExitPlanMode) {
        formatExitPlanModeInvocation(invocation, toolUse);
    }
    else if (toolUse.name === claudeTools_1.ClaudeToolNames.Task) {
        formatTaskInvocation(invocation, toolUse);
    }
    else if (toolUse.name === claudeTools_1.ClaudeToolNames.TodoWrite) {
        // Suppress this, it's too common
        return;
    }
    else {
        formatGenericInvocation(invocation, toolUse);
    }
    return invocation;
}
function formatBashInvocation(invocation, toolUse) {
    invocation.invocationMessage = '';
    invocation.toolSpecificData = {
        commandLine: {
            original: toolUse.input?.command,
        },
        language: 'bash'
    };
}
function formatReadInvocation(invocation, toolUse) {
    const filePath = toolUse.input?.file_path ?? '';
    const display = filePath ? formatUriForMessage(filePath) : '';
    invocation.invocationMessage = new vscodeTypes_1.MarkdownString(l10n.t("Read {0}", display));
}
function formatGlobInvocation(invocation, toolUse) {
    const pattern = toolUse.input?.pattern ?? '';
    invocation.invocationMessage = new vscodeTypes_1.MarkdownString(l10n.t("Searched for files matching `{0}`", pattern));
}
function formatGrepInvocation(invocation, toolUse) {
    const pattern = toolUse.input?.pattern ?? '';
    invocation.invocationMessage = new vscodeTypes_1.MarkdownString(l10n.t("Searched for regex `{0}`", pattern));
}
function formatLSInvocation(invocation, toolUse) {
    const path = toolUse.input?.path ?? '';
    const display = path ? formatUriForMessage(path) : '';
    invocation.invocationMessage = new vscodeTypes_1.MarkdownString(l10n.t("Read {0}", display));
}
function formatExitPlanModeInvocation(invocation, toolUse) {
    invocation.invocationMessage = `Here is Claude's plan:\n\n${toolUse.input?.plan}`;
}
function formatTaskInvocation(invocation, toolUse) {
    const description = toolUse.input?.description ?? '';
    invocation.invocationMessage = new vscodeTypes_1.MarkdownString(l10n.t("Completed Task: \"{0}\"", description));
}
function formatGenericInvocation(invocation, toolUse) {
    invocation.invocationMessage = l10n.t("Used tool: {0}", toolUse.name);
}
function formatUriForMessage(path) {
    return `[](${uri_1.URI.file(path).toString()})`;
}
//# sourceMappingURL=toolInvocationFormatter.js.map