"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositeElement = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
/**
 * @deprecated Workaround for a prompt-tsx issue which has since been fixed
 * See https://github.com/microsoft/vscode-prompt-tsx/issues/90 and https://github.com/microsoft/vscode-prompt-tsx/pull/94
 */
class CompositeElement extends prompt_tsx_1.PromptElement {
    render() {
        return vscpp(vscppf, null, this.props.children);
    }
}
exports.CompositeElement = CompositeElement;
//# sourceMappingURL=common.js.map