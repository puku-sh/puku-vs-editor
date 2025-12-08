"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBlockFormattingRules = exports.EXISTING_CODE_MARKER = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const markdown_1 = require("../../../../util/common/markdown");
const safeElements_1 = require("./safeElements");
exports.EXISTING_CODE_MARKER = '...existing code...';
class CodeBlockFormattingRules extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        return (vscpp(vscppf, null,
            "When suggesting code changes or new content, use Markdown code blocks.",
            vscpp("br", null),
            "To start a code block, use 4 backticks.",
            vscpp("br", null),
            "After the backticks, add the programming language name.",
            vscpp("br", null),
            !this.props.disableCodeBlockUris &&
                vscpp(vscppf, null,
                    "If the code modifies an existing file or should be placed at a specific location, add a line comment with '",
                    markdown_1.filepathCodeBlockMarker,
                    "' and the file path.",
                    vscpp("br", null),
                    "If you want the user to decide where to place the code, do not add the file path comment.",
                    vscpp("br", null)),
            "In the code block, use a line comment with '",
            exports.EXISTING_CODE_MARKER,
            "' to indicate code that is already present in the file.",
            vscpp("br", null),
            vscpp(safeElements_1.ExampleCodeBlock, { languageId: "languageId", examplePath: '/path/to/file', includeFilepath: true, minNumberOfBackticks: 4, code: [
                    `// ${exports.EXISTING_CODE_MARKER}`,
                    `{ changed code }`,
                    `// ${exports.EXISTING_CODE_MARKER}`,
                    `{ changed code }`,
                    `// ${exports.EXISTING_CODE_MARKER}`
                ].join('\n') })));
    }
}
exports.CodeBlockFormattingRules = CodeBlockFormattingRules;
//# sourceMappingURL=codeBlockFormattingRules.js.map