"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolResultToString = toolResultToString;
exports.renderElementToString = renderElementToString;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const globalStringUtils_1 = require("../../../../platform/chat/common/globalStringUtils");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const promptRenderer_1 = require("../../../prompts/node/base/promptRenderer");
async function toolResultToString(accessor, result) {
    return renderElementToString(accessor, vscpp(prompt_tsx_1.ToolResult, { data: result }));
}
async function renderElementToString(accessor, element) {
    const clz = class extends prompt_tsx_1.PromptElement {
        render() {
            return vscpp(prompt_tsx_1.UserMessage, null, element);
        }
    };
    const endpoint = await accessor.get(endpointProvider_1.IEndpointProvider).getChatEndpoint('gpt-4.1');
    const renderer = promptRenderer_1.PromptRenderer.create(accessor.get(instantiation_1.IInstantiationService), endpoint, clz, {});
    const r = await renderer.render();
    return r.messages.map(m => (0, globalStringUtils_1.getTextPart)(m.content)).join('\n').replace(/\\+/g, '/');
}
//# sourceMappingURL=toolTestUtils.js.map