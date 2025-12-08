"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplaceStringTool = void 0;
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const abstractReplaceStringTool_1 = require("./abstractReplaceStringTool");
class ReplaceStringTool extends abstractReplaceStringTool_1.AbstractReplaceStringTool {
    static { this.toolName = toolNames_1.ToolName.ReplaceString; }
    extractReplaceInputs(input) {
        return [{
                filePath: input.filePath,
                oldString: input.oldString,
                newString: input.newString,
            }];
    }
    async invoke(options, token) {
        const prepared = await this.prepareEdits(options, token);
        return this.applyAllEdits(options, prepared, token);
    }
    toolName() {
        return ReplaceStringTool.toolName;
    }
}
exports.ReplaceStringTool = ReplaceStringTool;
toolsRegistry_1.ToolRegistry.registerTool(ReplaceStringTool);
//# sourceMappingURL=replaceStringTool.js.map