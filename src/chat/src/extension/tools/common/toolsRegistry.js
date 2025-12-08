"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRegistry = exports.CopilotToolMode = void 0;
var CopilotToolMode;
(function (CopilotToolMode) {
    /**
     * Give a shorter result, agent mode can call again to get more context
    */
    CopilotToolMode[CopilotToolMode["PartialContext"] = 0] = "PartialContext";
    /**
     * Give a longer result, it gets one shot
     */
    CopilotToolMode[CopilotToolMode["FullContext"] = 1] = "FullContext";
})(CopilotToolMode || (exports.CopilotToolMode = CopilotToolMode = {}));
exports.ToolRegistry = new class {
    constructor() {
        this._tools = [];
        this._toolExtensions = [];
    }
    registerTool(tool) {
        this._tools.push(tool);
    }
    getTools() {
        return this._tools;
    }
    registerToolExtension(tool) {
        this._toolExtensions.push(tool);
    }
    getToolExtensions() {
        return this._toolExtensions;
    }
}();
//# sourceMappingURL=toolsRegistry.js.map