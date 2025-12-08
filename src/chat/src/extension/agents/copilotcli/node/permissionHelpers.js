"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestPermission = requestPermission;
exports.requiresFileEditconfirmation = requiresFileEditconfirmation;
exports.getConfirmationToolParams = getConfirmationToolParams;
const uri_1 = require("../../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const toolNames_1 = require("../../../tools/common/toolNames");
const editFileToolUtils_1 = require("../../../tools/node/editFileToolUtils");
async function requestPermission(instaService, permissionRequest, toolCall, toolsService, toolInvocationToken, token) {
    const toolParams = await getConfirmationToolParams(instaService, permissionRequest, toolCall);
    if (!toolParams) {
        return true;
    }
    const { tool, input } = toolParams;
    const result = await toolsService.invokeTool(tool, { input, toolInvocationToken }, token);
    const firstResultPart = result.content.at(0);
    return (firstResultPart instanceof vscodeTypes_1.LanguageModelTextPart && firstResultPart.value === 'yes');
}
async function requiresFileEditconfirmation(instaService, permissionRequest) {
    const confirmationInfo = await getFileEditConfirmationToolParams(instaService, permissionRequest);
    return confirmationInfo !== undefined;
}
async function getFileEditConfirmationToolParams(instaService, permissionRequest, toolCall) {
    if (permissionRequest.kind !== 'write') {
        return;
    }
    const file = permissionRequest.fileName ? uri_1.URI.file(permissionRequest.fileName) : undefined;
    if (!file) {
        return;
    }
    const details = async (accessor) => {
        if (!toolCall) {
            return '';
        }
        else if (toolCall.toolName === 'str_replace_editor' && toolCall.arguments.path) {
            if (toolCall.arguments.command === 'edit' || toolCall.arguments.command === 'str_replace') {
                return getDetailsForFileEditPermissionRequest(accessor, toolCall.arguments);
            }
            else if (toolCall.arguments.command === 'create') {
                return getDetailsForFileCreatePermissionRequest(accessor, toolCall.arguments);
            }
            else if (toolCall.arguments.command === 'insert') {
                return getDetailsForFileInsertPermissionRequest(accessor, toolCall.arguments);
            }
        }
        else if (toolCall.toolName === 'edit') {
            return getDetailsForFileEditPermissionRequest(accessor, toolCall.arguments);
        }
        else if (toolCall.toolName === 'create') {
            return getDetailsForFileCreatePermissionRequest(accessor, toolCall.arguments);
        }
        else if (toolCall.toolName === 'insert') {
            return getDetailsForFileInsertPermissionRequest(accessor, toolCall.arguments);
        }
    };
    const getDetails = () => instaService.invokeFunction(details).then(d => d || '');
    const confirmationInfo = await instaService.invokeFunction(editFileToolUtils_1.createEditConfirmation, [file], getDetails);
    const confirmationMessage = confirmationInfo.confirmationMessages;
    if (!confirmationMessage) {
        return;
    }
    return {
        tool: toolNames_1.ToolName.CoreConfirmationTool,
        input: {
            title: confirmationMessage.title,
            message: typeof confirmationMessage.message === 'string' ? confirmationMessage.message : confirmationMessage.message.value,
            confirmationType: 'basic'
        }
    };
}
async function getDetailsForFileInsertPermissionRequest(accessor, args) {
    if (args.path && args.new_str) {
        return (0, editFileToolUtils_1.formatDiffAsUnified)(accessor, uri_1.URI.file(args.path), '', args.new_str);
    }
}
async function getDetailsForFileCreatePermissionRequest(accessor, args) {
    if (args.path && args.file_text) {
        return (0, editFileToolUtils_1.formatDiffAsUnified)(accessor, uri_1.URI.file(args.path), '', args.file_text);
    }
}
async function getDetailsForFileEditPermissionRequest(accessor, args) {
    if (args.path && (args.new_str || args.old_str)) {
        return (0, editFileToolUtils_1.formatDiffAsUnified)(accessor, uri_1.URI.file(args.path), args.old_str ?? '', args.new_str ?? '');
    }
}
/**
 * Pure function mapping a Copilot CLI permission request -> tool invocation params.
 * Keeps logic out of session class for easier unit testing.
 */
async function getConfirmationToolParams(instaService, permissionRequest, toolCall) {
    if (permissionRequest.kind === 'shell') {
        return {
            tool: toolNames_1.ToolName.CoreTerminalConfirmationTool,
            input: {
                message: permissionRequest.intention || permissionRequest.fullCommandText || codeBlock(permissionRequest),
                command: permissionRequest.fullCommandText,
                isBackground: false
            }
        };
    }
    if (permissionRequest.kind === 'write') {
        return getFileEditConfirmationToolParams(instaService, permissionRequest, toolCall);
    }
    if (permissionRequest.kind === 'mcp') {
        const serverName = permissionRequest.serverName;
        const toolTitle = permissionRequest.toolTitle;
        const toolName = permissionRequest.toolName;
        const args = permissionRequest.args;
        return {
            tool: toolNames_1.ToolName.CoreConfirmationTool,
            input: {
                title: toolTitle || `MCP Tool: ${toolName || 'Unknown'}`,
                message: serverName
                    ? `Server: ${serverName}\n\`\`\`json\n${JSON.stringify(args, null, 2)}\n\`\`\``
                    : `\`\`\`json\n${JSON.stringify(permissionRequest, null, 2)}\n\`\`\``,
                confirmationType: 'basic'
            }
        };
    }
    if (permissionRequest.kind === 'read' && typeof permissionRequest.intention === 'string' && permissionRequest.intention) {
        return {
            tool: toolNames_1.ToolName.CoreConfirmationTool,
            input: {
                title: 'Read file(s)',
                message: permissionRequest.intention,
                confirmationType: 'basic'
            }
        };
    }
    return {
        tool: toolNames_1.ToolName.CoreConfirmationTool,
        input: {
            title: 'Copilot CLI Permission Request',
            message: codeBlock(permissionRequest),
            confirmationType: 'basic'
        }
    };
}
function codeBlock(obj) {
    return `\n\n\`\`\`\n${JSON.stringify(obj, null, 2)}\n\`\`\``;
}
//# sourceMappingURL=permissionHelpers.js.map