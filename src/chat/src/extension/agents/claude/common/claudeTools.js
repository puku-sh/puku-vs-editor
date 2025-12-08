"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeEditTools = exports.ClaudeToolNames = void 0;
exports.getAffectedUrisForEditTool = getAffectedUrisForEditTool;
const uri_1 = require("../../../../util/vs/base/common/uri");
var ClaudeToolNames;
(function (ClaudeToolNames) {
    ClaudeToolNames["Task"] = "Task";
    ClaudeToolNames["Bash"] = "Bash";
    ClaudeToolNames["Glob"] = "Glob";
    ClaudeToolNames["Grep"] = "Grep";
    ClaudeToolNames["LS"] = "LS";
    ClaudeToolNames["ExitPlanMode"] = "ExitPlanMode";
    ClaudeToolNames["Read"] = "Read";
    ClaudeToolNames["Edit"] = "Edit";
    ClaudeToolNames["MultiEdit"] = "MultiEdit";
    ClaudeToolNames["Write"] = "Write";
    ClaudeToolNames["NotebookEdit"] = "NotebookEdit";
    ClaudeToolNames["WebFetch"] = "WebFetch";
    ClaudeToolNames["TodoWrite"] = "TodoWrite";
    ClaudeToolNames["WebSearch"] = "WebSearch";
    ClaudeToolNames["BashOutput"] = "BashOutput";
    ClaudeToolNames["KillBash"] = "KillBash";
})(ClaudeToolNames || (exports.ClaudeToolNames = ClaudeToolNames = {}));
exports.claudeEditTools = [ClaudeToolNames.Edit, ClaudeToolNames.MultiEdit, ClaudeToolNames.Write, ClaudeToolNames.NotebookEdit];
function getAffectedUrisForEditTool(input) {
    switch (input.tool_name) {
        case ClaudeToolNames.Edit:
        case ClaudeToolNames.MultiEdit:
            return [uri_1.URI.file(input.tool_input.file_path)];
        case ClaudeToolNames.Write:
            return [uri_1.URI.file(input.tool_input.file_path)];
        case ClaudeToolNames.NotebookEdit:
            return [uri_1.URI.file(input.tool_input.notebook_path)];
        default:
            return [];
    }
}
//# sourceMappingURL=claudeTools.js.map