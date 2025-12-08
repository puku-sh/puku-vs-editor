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
exports.describeBulkToolGroups = describeBulkToolGroups;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const JSONC = __importStar(require("jsonc-parser"));
const commonTypes_1 = require("../../../../platform/chat/common/commonTypes");
const markdown_1 = require("../../../../util/common/markdown");
const virtualToolsConstants_1 = require("./virtualToolsConstants");
function normalizeGroupName(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}
/**
 * Bulk describe multiple tool groups in a single LLM call for efficiency.
 * The index of summarized categories in the output corresponds to the index
 * of the input `toolGroups`. Missing or failed descriptions result in `undefined`.
 */
async function describeBulkToolGroups(endpoint, toolGroups, token) {
    const results = [];
    // Process in chunks of max 16 groups
    for (let i = 0; i < toolGroups.length; i += virtualToolsConstants_1.MAX_GROUPS_PER_CHUNK) {
        const chunk = toolGroups.slice(i, i + virtualToolsConstants_1.MAX_GROUPS_PER_CHUNK);
        const chunkResults = describeToolGroupsChunk(endpoint, chunk, token);
        results.push(chunkResults.catch(() => chunk.map(() => undefined)));
    }
    return (await Promise.all(results)).flat();
}
/**
 * Process a single chunk of tool groups
 */
async function describeToolGroupsChunk(endpoint, toolGroups, token) {
    const renderer = new prompt_tsx_1.PromptRenderer(endpoint, BulkGroupDescriptorPrompt, { toolGroups }, endpoint.acquireTokenizer());
    const result = await renderer.render(undefined, token);
    const json = await getJsonResponse(endpoint, result, token);
    const output = Array.from({ length: toolGroups.length }, () => undefined);
    if (!json || !Array.isArray(json)) {
        return output;
    }
    for (const item of json) {
        const index = Number(item.groupIndex) - 1;
        if (!isNaN(index) && toolGroups[index] && typeof item.groupName === 'string' && typeof item.summary === 'string') {
            output[index] = {
                name: normalizeGroupName(item.groupName),
                summary: item.summary,
                tools: toolGroups[index]
            };
        }
    }
    return output;
}
class ToolInformation extends prompt_tsx_1.PromptElement {
    render() {
        const { tool } = this.props;
        return vscpp(vscppf, null,
            `<tool name=${JSON.stringify(tool.name)}>${tool.description}</tool>`,
            vscpp("br", null));
    }
}
class BulkGroupDescriptorPrompt extends prompt_tsx_1.PromptElement {
    render() {
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, null,
                "Context: You are given multiple groups of tools that have been clustered together based on semantic similarity. Your task is to provide a descriptive name and summary for each group that accurately reflects the common functionality and purpose of the tools within that group.",
                vscpp("br", null),
                vscpp("br", null),
                "For each group, analyze the tools and determine what they have in common, what domain or functionality they serve, and how they might be used together. Create a concise but descriptive name and a comprehensive summary for each group.",
                vscpp("br", null)),
            vscpp(prompt_tsx_1.UserMessage, null,
                "You will be given ",
                this.props.toolGroups.length,
                " groups of tools. For each group, provide a name and summary that describes the group's purpose and capabilities.",
                vscpp("br", null),
                vscpp("br", null),
                this.props.toolGroups.map((group, index) => {
                    const groupIndex = index + 1; // 1-indexed
                    return (vscpp(vscppf, null,
                        `<group index="${groupIndex}">`,
                        vscpp("br", null),
                        group.map(tool => vscpp(ToolInformation, { tool: tool })),
                        `</group>`,
                        vscpp("br", null)));
                }),
                vscpp("br", null),
                "Your response must follow the JSON schema:",
                vscpp("br", null),
                vscpp("br", null),
                "```",
                vscpp("br", null),
                JSON.stringify({
                    type: 'array',
                    items: {
                        type: 'object',
                        required: ['groupIndex', 'groupName', 'summary'],
                        properties: {
                            groupIndex: {
                                type: 'integer',
                                description: 'The index of the group as provided above (e.g., "1", "2", etc.)',
                                example: 1
                            },
                            groupName: {
                                type: 'string',
                                description: 'A short, descriptive name for the group. It may only contain the characters a-z, A-Z, 0-9, and underscores.',
                                example: 'file_management_tools'
                            },
                            summary: {
                                type: 'string',
                                description: 'A comprehensive summary of the group capabilities, including what the tools do and how they can be used together. This may be up to five paragraphs long, be careful not to leave out important details.',
                                example: 'These tools provide comprehensive file management capabilities including reading, writing, searching, and organizing files and directories.'
                            }
                        }
                    }
                }, null, 2),
                vscpp("br", null),
                "```",
                vscpp("br", null),
                vscpp("br", null),
                "Provide descriptions for the groups presented above. You must include the exact groupIndex as shown in the input. You must generate a description for every group and each groupName must be unique.",
                vscpp("br", null)));
    }
}
async function getJsonResponse(endpoint, rendered, token) {
    const result = await endpoint.makeChatRequest('summarizeVirtualTools', rendered.messages, undefined, token, commonTypes_1.ChatLocation.Other);
    if (result.type !== commonTypes_1.ChatFetchResponseType.Success) {
        return undefined;
    }
    for (const block of (0, markdown_1.extractCodeBlocks)(result.value)) {
        try {
            return JSONC.parse(block.code);
        }
        catch {
            // ignored
        }
    }
    const idx = result.value.indexOf('{');
    return JSONC.parse(result.value.slice(idx)) || undefined;
}
//# sourceMappingURL=virtualToolSummarizer.js.map