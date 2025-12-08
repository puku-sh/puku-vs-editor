"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectSpecificationPrompt = exports.FileContentsPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const globalStringUtils_1 = require("../../../../../platform/chat/common/globalStringUtils");
const copilotIdentity_1 = require("../../base/copilotIdentity");
const responseTranslationRules_1 = require("../../base/responseTranslationRules");
const safetyRules_1 = require("../../base/safetyRules");
class FileContentsPrompt extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            this.props.history && vscpp(NewWorkspaceConversationHistory, { messages: this.props.history }),
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a VS Code assistant. Your job is to generate the contents of a file in a project when given the user description, specification and tree structure of the project that a user wants to create. ",
                vscpp("br", null),
                vscpp("br", null),
                "Additional Rules",
                vscpp("br", null),
                "Think step by step and give me contents for just the file requested by the user. The code should not contain bugs.",
                vscpp("br", null),
                "If the user has asked for modifications to an existing file, please use the File path and File contents provided below if applicable.",
                vscpp("br", null),
                "If the file is supposed to be empty, please respond with a code comment saying that this file is intentionally left blank.",
                vscpp("br", null),
                "Do not include comments in json files.",
                vscpp("br", null),
                "Do not use code blocks or backticks.",
                vscpp("br", null),
                "Do not include product names such as Visual Studio in the comments.",
                vscpp("br", null)),
            this.props.relavantFiles && this.props.relavantFiles.size > 0 && vscpp(vscppf, null,
                vscpp(prompt_tsx_1.UserMessage, { priority: 500 },
                    "Below, you will find a list of file paths and their contents previously used",
                    vscpp("br", null),
                    Array.from(this.props.relavantFiles).map(([key, value]) => {
                        return `File path: ${key}\nFile contents: ${value}\n`;
                    }).join('\n'))),
            vscpp(prompt_tsx_1.UserMessage, { priority: 900 },
                "Generate the contents of the file: ",
                this.props.filePath,
                " ",
                vscpp("br", null),
                "This is the project tree structure:",
                vscpp("br", null),
                "\\`\\`\\`filetree' ",
                vscpp("br", null),
                this.props.fileTreeStr,
                vscpp("br", null),
                "\\`\\`\\`",
                vscpp("br", null),
                "The project should adhere to the following specification:",
                vscpp("br", null),
                this.props.projectSpecification,
                vscpp("br", null))));
    }
}
exports.FileContentsPrompt = FileContentsPrompt;
class ProjectSpecificationPrompt extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            this.props.history && vscpp(NewWorkspaceConversationHistory, { messages: this.props.history }),
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a VS Code assistant. Your job is to generate the project specification when given the user description and file tree structure of the project that a user wants to create. ",
                vscpp("br", null),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.SafetyRules, null),
                vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                vscpp("br", null),
                "Additional Rules",
                vscpp("br", null),
                "Think step by step and respond with a text description that lists and summarizes each file inside this project.",
                vscpp("br", null),
                "List the classes, types, interfaces, functions, and constants it exports and imports if it is a code file.",
                vscpp("br", null),
                "Consider filenames and file extensions when determining the programming languages used in the project. List any special configurations or settings required for configuration files such as package.json or tsconfig.json to help compile the project successfully",
                vscpp("br", null),
                "You should be as specific as possible when listing the public properties and methods for each exported class.",
                vscpp("br", null),
                "Do not use code blocks or backticks. Do not include any text before or after the file contents.",
                vscpp("br", null),
                "Do not include comments in json files.",
                vscpp("br", null),
                "Do not use code blocks or backticks.",
                vscpp("br", null),
                "Do not include product names such as Visual Studio in the comments.",
                vscpp("br", null),
                "Below you will find a set of examples of what you should respond with. Please follow these examples as closely as possible.",
                vscpp("br", null),
                vscpp("br", null),
                "## Valid question",
                vscpp("br", null),
                "User: I want to set up the following project: Create a TypeScript Express app",
                vscpp("br", null),
                "This is the project tree structure:",
                vscpp("br", null),
                "\\`\\`\\`markdown ",
                vscpp("br", null),
                "my-express-app",
                vscpp("br", null),
                "\u251C\u2500\u2500 src",
                vscpp("br", null),
                "\u2502   \u251C\u2500\u2500 app.ts",
                vscpp("br", null),
                "\u2502   \u251C\u2500\u2500 controllers",
                vscpp("br", null),
                "\u2502   \u2502   \u2514\u2500\u2500 index.ts",
                vscpp("br", null),
                "\u2502   \u251C\u2500\u2500 routes",
                vscpp("br", null),
                "\u2502   \u2502   \u2514\u2500\u2500 index.ts",
                vscpp("br", null),
                "\u2502   \u2514\u2500\u2500 types",
                vscpp("br", null),
                "\u2502       \u2514\u2500\u2500 index.ts",
                vscpp("br", null),
                "\u251C\u2500\u2500 package.json",
                vscpp("br", null),
                "\u251C\u2500\u2500 tsconfig.json",
                vscpp("br", null),
                "\u2514\u2500\u2500 README.md",
                vscpp("br", null),
                "\\`\\`\\`",
                vscpp("br", null),
                "## Valid response",
                vscpp("br", null),
                "Assistant: The project has the following files:",
                vscpp("br", null),
                "\\`src/app.ts\\`: This file is the entry point of the application. It creates an instance of the express app and sets up middleware and routes.",
                vscpp("br", null),
                "\\`src/controllers/index.ts\\`: This file exports a class \\`IndexController\\` which has a method \\`getIndex\\` that handles the root route of the application.",
                vscpp("br", null),
                "\\`src/routes/index.ts\\`: This file exports a function \\`setRoutes\\` which sets up the routes for the application. It uses the \\`IndexController\\` to handle the root route.",
                vscpp("br", null),
                "\\`src/types/index.ts\\`: This file exports interfaces \\`Request\\` and \\`Response\\` which extend the interfaces from the \\`express\\` library.",
                vscpp("br", null),
                "\\`tsconfig.json\\`: This file is the configuration file for TypeScript. It specifies the compiler options and the files to include in the compilation.",
                vscpp("br", null),
                "\\`package.json\\`: This file is the configuration file for npm. It lists the dependencies and scripts for the project.",
                vscpp("br", null),
                "\\`README.md\\`: This file contains the documentation for the project.",
                vscpp("br", null)),
            vscpp(prompt_tsx_1.UserMessage, { priority: 900 },
                "I want to set up the following project: ",
                this.props.query,
                vscpp("br", null),
                "This is the project tree structure:",
                vscpp("br", null),
                "\\`\\`\\`markdown' ",
                vscpp("br", null),
                this.props.fileTreeStr,
                vscpp("br", null),
                "\\`\\`\\`",
                vscpp("br", null))));
    }
}
exports.ProjectSpecificationPrompt = ProjectSpecificationPrompt;
class NewWorkspaceConversationHistory extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const history = [];
        for (const curr of this.props.messages) {
            switch (curr.role) {
                case prompt_tsx_1.Raw.ChatRole.User:
                    history.push(vscpp(prompt_tsx_1.UserMessage, { priority: 600 }, (0, globalStringUtils_1.getTextPart)(curr.content)));
                    break;
                case prompt_tsx_1.Raw.ChatRole.System:
                    history.push(vscpp(prompt_tsx_1.AssistantMessage, { priority: 800 }, (0, globalStringUtils_1.getTextPart)(curr.content)));
                    break;
                default:
                    break;
            }
        }
        return (vscpp(vscppf, null, history));
    }
}
//# sourceMappingURL=newWorkspaceContents.js.map