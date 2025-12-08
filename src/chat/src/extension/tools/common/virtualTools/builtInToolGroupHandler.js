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
exports.BuiltInToolGroupHandler = void 0;
const assert_1 = require("../../../../util/vs/base/common/assert");
const collections_1 = require("../../../../util/vs/base/common/collections");
const toolNames_1 = require("../toolNames");
const virtualTool_1 = require("./virtualTool");
const Constant = __importStar(require("./virtualToolsConstants"));
const BUILT_IN_GROUP = 'builtin';
const SUMMARY_PREFIX = 'Call this tool when you need access to a new category of tools. The category of tools is described as follows:\n\n';
const SUMMARY_SUFFIX = '\n\nBe sure to call this tool if you need a capability related to the above.';
/**
 * Get the summary description for a tool category.
 * For RedundantButSpecific, dynamically includes the list of tool names.
 */
function getCategorySummary(category) {
    switch (category) {
        case toolNames_1.ToolCategory.JupyterNotebook:
            return 'Call tools from this group when you need to work with Jupyter notebooks - creating, editing, running cells, and managing notebook operations.';
        case toolNames_1.ToolCategory.WebInteraction:
            return 'Call tools from this group when you need to interact with web content, browse websites, or access external resources.';
        case toolNames_1.ToolCategory.VSCodeInteraction:
            return 'Call tools from this group when you need to interact with the VS Code workspace and access VS Code features.';
        case toolNames_1.ToolCategory.Testing:
            return 'Call tools from this group when you need to run tests, analyze test failures, and manage test workflows.';
        case toolNames_1.ToolCategory.RedundantButSpecific: {
            const toolNames = (0, toolNames_1.getToolsForCategory)(category);
            return `These tools have overlapping functionalities but are highly specialized for certain tasks. Tools: ${toolNames.join(', ')}`;
        }
        case toolNames_1.ToolCategory.Core:
            return 'Core tools that should always be available without grouping.';
        default:
            return (0, assert_1.assertNever)(category);
    }
}
class BuiltInToolGroupHandler {
    constructor() { }
    /** Creates groups for built-in tools based on the type-safe categorization system */
    createBuiltInToolGroups(tools) {
        // If there are too few tools, don't group them
        if (tools.length <= Constant.MIN_TOOLSET_SIZE_TO_GROUP) {
            return tools;
        }
        const contributedTools = tools.filter(t => !toolNames_1.toolCategories.hasOwnProperty(t.name));
        const builtInTools = tools.filter(t => toolNames_1.toolCategories.hasOwnProperty(t.name));
        // Filter out Core tools from grouping (they should remain individual)
        const toolsToGroup = builtInTools.filter(t => toolNames_1.toolCategories[t.name] !== toolNames_1.ToolCategory.Core);
        const coreTools = builtInTools.filter(t => toolNames_1.toolCategories[t.name] === toolNames_1.ToolCategory.Core);
        const categories = (0, collections_1.groupBy)(toolsToGroup, t => toolNames_1.toolCategories[t.name]);
        const virtualTools = Object.entries(categories).flatMap(([category, tools]) => {
            if (tools.length < Constant.MIN_TOOLSET_SIZE_TO_GROUP) {
                return tools;
            }
            return new virtualTool_1.VirtualTool(virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX + category.toLowerCase().replace(/\s+/g, '_'), SUMMARY_PREFIX + getCategorySummary(category) + SUMMARY_SUFFIX, 0, {
                possiblePrefix: 'builtin_',
                wasExpandedByDefault: false,
                canBeCollapsed: true
            }, tools);
        });
        // Return: virtual tool groups + individual core tools + contributed tools
        return [...virtualTools, ...coreTools, ...contributedTools];
    }
    static get BUILT_IN_GROUP_KEY() {
        return BUILT_IN_GROUP;
    }
}
exports.BuiltInToolGroupHandler = BuiltInToolGroupHandler;
//# sourceMappingURL=builtInToolGroupHandler.js.map