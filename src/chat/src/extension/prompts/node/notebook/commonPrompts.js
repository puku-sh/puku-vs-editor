"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.JupyterNotebookRules = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
class JupyterNotebookRules extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "When dealing with Jupyter Notebook, if a module is already imported in a cell, it can be used in other cells directly without importing it again. For the same reason, if a variable is defined in a cell, it can be used in other cells as well",
            vscpp("br", null),
            "When dealing with Jupyter Notebook, cells below the current cell can be executed before the current cell, you must use the variables defined in the cells below, unless you want to overwrite them.",
            vscpp("br", null),
            "If the Jupyter Notebook already contains variables, you should respect the name and value of the variables, and use them in your code when necessary.",
            vscpp("br", null)));
    }
}
exports.JupyterNotebookRules = JupyterNotebookRules;
//# sourceMappingURL=commonPrompts.js.map