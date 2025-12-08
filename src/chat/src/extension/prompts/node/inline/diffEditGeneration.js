"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditGenerationExampleSolution = exports.EditGenerationExampleSetup = exports.EditGenerationRules = void 0;
exports.getReplyProcessor = getReplyProcessor;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const markdown_1 = require("../../../../util/common/markdown");
const strings_1 = require("../../../../util/vs/base/common/strings");
const editFromDiffGeneration_1 = require("../../../prompt/node/editFromDiffGeneration");
const editGeneration_1 = require("../../../prompt/node/editGeneration");
class EditGenerationRules extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "For the response always follow these instructions:",
            vscpp("br", null),
            "Describe in a single sentence how you would solve the problem. After that sentence, add an empty line. Then add a code block with the fix.",
            vscpp("br", null),
            "When proposing a change in the code, use a single code block that starts with ```diff and that describes the changes in the diff format. In the diff, always use tab to indent, never spaces. Make sure that the diff format is valid and contains all changes: Removed and unchanged lines must match exactly the original code line. Keep the changes minimal and the diff short.",
            vscpp("br", null),
            "When proposing to fix the problem by running a terminal command, provide the terminal script in a code block that starts with ```bash.",
            vscpp("br", null)));
    }
}
exports.EditGenerationRules = EditGenerationRules;
class EditGenerationExampleSetup extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "```csharp",
            vscpp("br", null)
        // This is my class<br />
        ,
            "// This is my class",
            vscpp("br", null),
            "class C { }",
            vscpp("br", null),
            vscpp("br", null),
            "new C().Field = 9;",
            vscpp("br", null),
            "```"));
    }
}
exports.EditGenerationExampleSetup = EditGenerationExampleSetup;
class EditGenerationExampleSolution extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "The problem is that the class 'C' does not have a field or property named 'Field'. To fix this, you need to add a 'Field' property to the 'C' class.",
            vscpp("br", null),
            vscpp("br", null),
            "```diff",
            vscpp("br", null)
        // This is my class<br />
        ,
            "// This is my class",
            vscpp("br", null),
            "-class C { }",
            vscpp("br", null),
            "+class C {",
            vscpp("br", null),
            "+   public int Field { get; set; }",
            vscpp("br", null),
            "+}",
            vscpp("br", null),
            vscpp("br", null),
            "new C().Field = 9;",
            vscpp("br", null),
            "```",
            vscpp("br", null)));
    }
}
exports.EditGenerationExampleSolution = EditGenerationExampleSolution;
function getReplyProcessor() {
    return {
        getFirstSentence(text) {
            return text.split('```', 1)[0].match(/^.+/)?.[0] ?? '';
        },
        process(replyText, documentText, lineRange) {
            const annotations = [];
            const extractResult = extractAndParseFirstCodeBlock(replyText);
            if (!extractResult || extractResult.language === 'bash' || extractResult.language === 'ps1') {
                return { content: replyText, annotations };
            }
            let lineEdits = [];
            if (extractResult.language === 'diff') {
                const diff = editGeneration_1.Lines.fromString(extractResult.code);
                const code = editGeneration_1.Lines.fromString(documentText);
                const reporter = {
                    recovery: () => { },
                    warning(message) {
                        if (annotations.length === 0) {
                            annotations.push({ message: message, label: 'invalid diff', severity: 'error' });
                        }
                    }
                };
                lineEdits = (0, editFromDiffGeneration_1.createEditsFromPseudoDiff)(code, diff, reporter);
            }
            else {
                lineEdits = [new editGeneration_1.LinesEdit(lineRange.firstLineIndex, lineRange.endLineIndex, editGeneration_1.Lines.fromString(extractResult.code))];
            }
            const edits = lineEdits.map(e => e.toTextEdit());
            return { edits, annotations };
        }
    };
}
function extractAndParseFirstCodeBlock(text) {
    const blocks = (0, markdown_1.extractCodeBlocks)(text);
    const firstBlock = blocks.at(0);
    if (firstBlock) {
        const lines = (0, strings_1.splitLines)(text);
        return { code: firstBlock.code, contentBeforeCode: lines.slice(0, firstBlock.startLine).join('\n').trimEnd(), language: firstBlock.language };
    }
    return undefined;
}
//# sourceMappingURL=diffEditGeneration.js.map