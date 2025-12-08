"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewNotebookCodeImprovementPrompt = exports.NewNotebookCodeGenerationPrompt = exports.NewNotebookPlanningPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const globalStringUtils_1 = require("../../../../platform/chat/common/globalStringUtils");
const arrays_1 = require("../../../../util/vs/base/common/arrays");
const copilotIdentity_1 = require("../base/copilotIdentity");
const responseTranslationRules_1 = require("../base/responseTranslationRules");
const safetyRules_1 = require("../base/safetyRules");
const commonPrompts_1 = require("../notebook/commonPrompts");
const chatVariables_1 = require("./chatVariables");
const editorIntegrationRules_1 = require("./editorIntegrationRules");
const safeElements_1 = require("./safeElements");
class NewNotebookPlanningPrompt extends prompt_tsx_1.PromptElement {
    async prepare() {
        return {};
    }
    render(state, sizing) {
        return (vscpp(vscppf, null,
            vscpp(vscppf, null,
                vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                    "You are an AI that creates a detailed content outline for a Jupyter notebook on a given topic.",
                    vscpp("br", null),
                    vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                    vscpp(safetyRules_1.LegacySafetyRules, null),
                    vscpp(editorIntegrationRules_1.EditorIntegrationRules, null),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                    vscpp("br", null),
                    "Additional Rules",
                    vscpp("br", null),
                    "DO NOT include Introduction or Conclusion section in the outline!",
                    vscpp("br", null),
                    "Focus only on sections that will need code!",
                    vscpp("br", null),
                    [
                        '',
                        'Generate the outline as two parts:',
                        '- First part is markdown bullet list of section titles',
                        '- Second part is the JSON data that will validate against this JSON schema, wrap the response in code block. We assume that a code block begins with \`\`\`[optionally the language] and ends with \`\`\`',
                        '',
                        'The JSON schema is:',
                        '{',
                        '  "$schema": "http://json-schema.org/draft-07/schema#",',
                        '  "type": "object",',
                        '  "properties": {',
                        '	"description": {',
                        '	  "type": "string"',
                        '	},',
                        '	"sections": {',
                        '	  "type": "array",',
                        '	  "items": {',
                        '		"type": "object",',
                        '		"properties": {',
                        '		  "title": {',
                        '			"type": "string"',
                        '		  },',
                        '		  "content": {',
                        '			"type": "string"',
                        '		  }',
                        '		},',
                        '		"required": ["title", "content"]',
                        '	  }',
                        '	}',
                        '  },',
                        '  "required": ["sections"]',
                        '}'
                    ].join('\n'),
                    [
                        '',
                        'Examples:',
                        '',
                        'Below you will find a set of examples of what you should respond with. Please follow these examples as closely as possible.',
                        '',
                        '## Valid notebook creation question',
                        '',
                        'user: Creating Random Arrays with Numpy',
                        '',
                        'assistant: Here\'s an outline for a Jupyter notebook that creates Random Arrays with Numpy:',
                        '',
                        '* **Import Required Libraries**',
                        '* **Create Random Arrays**',
                        '* **Seed the Random Number Generator**',
                        '* **Generate Random Integers**',
                        '',
                        '\`\`\`json',
                        '{',
                        '  "description": "A Jupyter notebook that creates Random Arrays with Numpy.",',
                        '  "sections": [',
                        '    {',
                        '      "title": "Import Required Libraries",',
                        '      "content": "Import the necessary libraries, including NumPy."',
                        '    },',
                        '    {',
                        '      "title": "Create Random Arrays",',
                        '      "content": "Use NumPy to create random arrays of various shapes and sizes, including 1D, 2D, and 3D arrays."',
                        '    },',
                        '    {',
                        '      "title": "Seed the Random Number Generator",',
                        '      "content": "Use the seed() function to seed the random number generator for reproducibility."',
                        '    },',
                        '	{',
                        '	  "title": "Generate Random Integers",',
                        '	  "content": "Use the randint() function to generate random integers within a specified range."',
                        '	}',
                        '  ]',
                        '}',
                        '\`\`\`'
                    ].join('\n'))),
            vscpp(chatVariables_1.ChatToolReferences, { priority: 899, flexGrow: 2, promptContext: this.props.promptContext, embeddedInsideUserMessage: false }),
            this.props.promptContext.chatVariables && Object.keys(this.props.promptContext.chatVariables).length > 0 ? (vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 2, priority: 900, chatVariables: this.props.promptContext.chatVariables, query: this.props.promptContext.query, embeddedInsideUserMessage: false })) : (vscpp(prompt_tsx_1.UserMessage, { priority: 900 }, this.props.promptContext.query))));
    }
}
exports.NewNotebookPlanningPrompt = NewNotebookPlanningPrompt;
class NewNotebookCodeGenerationPrompt extends prompt_tsx_1.PromptElement {
    async prepare() {
        return {};
    }
    render(state, sizing) {
        return (vscpp(vscppf, null,
            vscpp(vscppf, null,
                (0, arrays_1.isNonEmptyArray)(this.props.history) && vscpp(GenerateNotebookConversationHistory, { messages: this.props.history }),
                vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                    "You are an AI that writes Python code for a single section of a Jupyter notebook.",
                    vscpp("br", null),
                    vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                    vscpp(safetyRules_1.LegacySafetyRules, null),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                    vscpp(commonPrompts_1.JupyterNotebookRules, null),
                    "When dealing with Jupyter Notebook, do not generate CELL INDEX in the code blocks in your answer, it is only used to help you understand the context.",
                    vscpp("br", null),
                    "Your output should be valid Python code with inline comments.",
                    vscpp("br", null),
                    "You should return the code directly without any explantion.",
                    vscpp("br", null),
                    "You should not print message to explain the code or purpose of the code.",
                    vscpp("br", null),
                    "You should return the code directly, without wrapping it inside \\`\\`\\`.",
                    vscpp("br", null),
                    "Please make sure that the new code is syntactically valid Python code. It can be validated by running it in a Python interpreter.",
                    vscpp("br", null),
                    "For example, it should pass the validation through builtin module codeop \\`codeop.compile_command(statement)\\`.",
                    vscpp("br", null)),
                vscpp(prompt_tsx_1.UserMessage, { priority: 900 },
                    "Overall topic of the notebook: ",
                    this.props.description,
                    vscpp("br", null),
                    "Title of the notebook section: ",
                    this.props.section.title,
                    vscpp("br", null),
                    "Description of the notebok section: ",
                    this.props.section.content,
                    vscpp("br", null),
                    "Given this information, write all the code for this section and this section only.",
                    vscpp("br", null),
                    "The request to generate the outline of the notebook is already completed.",
                    vscpp("br", null),
                    "Here is the request details for the outline generation:",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Code in the notebook so far:",
                    vscpp("br", null),
                    vscpp(safeElements_1.CodeBlock, { uri: this.props.uri, languageId: this.props.languageId, code: this.props.existingCode }),
                    vscpp("br", null),
                    "Please make sure the new code you generate works fine with the code above.",
                    vscpp("br", null)))));
    }
}
exports.NewNotebookCodeGenerationPrompt = NewNotebookCodeGenerationPrompt;
class GenerateNotebookConversationHistory extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const history = [];
        for (const curr of this.props.messages) {
            switch (curr.role) {
                case prompt_tsx_1.Raw.ChatRole.User:
                    history.push(vscpp(prompt_tsx_1.UserMessage, { priority: 800 }, (0, globalStringUtils_1.getTextPart)(curr.content)));
                    break;
                case prompt_tsx_1.Raw.ChatRole.Assistant:
                    history.push(vscpp(prompt_tsx_1.AssistantMessage, { priority: 800 }, (0, globalStringUtils_1.getTextPart)(curr.content)));
                    break;
                case prompt_tsx_1.Raw.ChatRole.System:
                    history.push(vscpp(prompt_tsx_1.SystemMessage, { priority: 100 }, (0, globalStringUtils_1.getTextPart)(curr.content)));
                    break;
                default:
                    break;
            }
        }
        return (vscpp(vscppf, null, history));
    }
}
class NewNotebookCodeImprovementPrompt extends prompt_tsx_1.PromptElement {
    async prepare() {
        return {};
    }
    render(state, sizing) {
        return (vscpp(vscppf, null,
            vscpp(vscppf, null,
                vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                    "You are an AI that improves Python code with respect to readability and performance for a single section of a Jupyter notebook.",
                    vscpp("br", null),
                    vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                    vscpp(safetyRules_1.LegacySafetyRules, null),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                    "You MUST return Python code as your answer.",
                    vscpp("br", null),
                    "DO NOT explain in inline comments for your the improvements.",
                    vscpp("br", null),
                    "You should not print messages to explain the code or purpose of the code.",
                    vscpp("br", null),
                    "Make sure the new code you generate works fine with the code above.",
                    vscpp("br", null),
                    "Make sure if a module is already imported in the code above, it can be used in the new code directly without importing it again. For the same reason, if a variable is defined above, it can be used in new code as well. ",
                    vscpp("br", null),
                    "Make sure to return the code only - don't give an explanation of the improvements.",
                    vscpp("br", null)),
                vscpp(prompt_tsx_1.UserMessage, { priority: 900 },
                    "Overall topic of the notebook: ",
                    this.props.description,
                    vscpp("br", null),
                    "Title of the notebook section: ",
                    this.props.section.title,
                    vscpp("br", null),
                    "Description of the notebook section: ",
                    this.props.section.content,
                    vscpp("br", null),
                    "Code in the notebook so far:",
                    vscpp("br", null),
                    vscpp("br", null),
                    vscpp(safeElements_1.CodeBlock, { uri: this.props.uri, languageId: this.props.languageId, code: this.props.existingCode }),
                    vscpp("br", null),
                    "Given this information, suggest improvements for the following code:",
                    vscpp("br", null),
                    vscpp("br", null),
                    this.props.code,
                    vscpp("br", null),
                    vscpp("br", null)))));
    }
}
exports.NewNotebookCodeImprovementPrompt = NewNotebookCodeImprovementPrompt;
//# sourceMappingURL=newNotebook.js.map