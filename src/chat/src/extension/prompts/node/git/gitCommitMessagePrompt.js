"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitCommitMessagePrompt = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const path_1 = require("../../../../util/vs/base/common/path");
const responseTranslationRules_1 = require("../base/responseTranslationRules");
const safetyRules_1 = require("../base/safetyRules");
const tag_1 = require("../base/tag");
const customInstructions_1 = require("../panel/customInstructions");
const fileVariable_1 = require("../panel/fileVariable");
const unsafeElements_1 = require("../panel/unsafeElements");
class GitCommitMessagePrompt extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                vscpp(GitCommitMessageSystemRules, null),
                vscpp(safetyRules_1.SafetyRules, null),
                vscpp(responseTranslationRules_1.ResponseTranslationRules, null)),
            vscpp(prompt_tsx_1.UserMessage, null,
                vscpp(tag_1.Tag, { priority: 850, name: 'repository-context' },
                    "# REPOSITORY DETAILS:",
                    vscpp("br", null),
                    "Repository name: ",
                    this.props.repositoryName,
                    vscpp("br", null),
                    "Branch name: ",
                    this.props.branchName,
                    vscpp("br", null)),
                this.props.recentCommitMessages.user.length > 0 && (vscpp(tag_1.Tag, { priority: 700, name: 'user-commits' },
                    "# RECENT USER COMMITS (For reference only, do not copy!):",
                    vscpp("br", null),
                    this.props.recentCommitMessages.user.map(message => `- ${message}\n`).join(''))),
                this.props.recentCommitMessages.repository.length > 0 && (vscpp(tag_1.Tag, { priority: 600, name: 'recent-commits' },
                    "# RECENT REPOSITORY COMMITS (For reference only, do not copy!):",
                    vscpp("br", null),
                    this.props.recentCommitMessages.repository.map(message => `- ${message}\n`).join(''))),
                vscpp(tag_1.Tag, { priority: 900, name: 'changes' }, this.props.changes.map((change) => (vscpp(vscppf, null,
                    vscpp(tag_1.Tag, { name: 'original-code', priority: 800 },
                        "# ORIGINAL CODE:",
                        vscpp("br", null),
                        vscpp(fileVariable_1.FileVariable, { filePathMode: fileVariable_1.FilePathMode.AsComment, lineNumberStyle: 'legacy', passPriority: true, variableName: (0, path_1.basename)(change.uri.toString()), variableValue: change.uri })),
                    vscpp(tag_1.Tag, { name: 'code-changes', priority: 900 },
                        "# CODE CHANGES:",
                        vscpp("br", null),
                        vscpp(unsafeElements_1.UnsafeCodeBlock, { code: change.diff, languageId: 'diff' })))))),
                vscpp(tag_1.Tag, { priority: 950, name: 'reminder' },
                    "Now generate a commit messages that describe the CODE CHANGES.",
                    vscpp("br", null),
                    "DO NOT COPY commits from RECENT COMMITS, but use it as reference for the commit style.",
                    vscpp("br", null),
                    "ONLY return a single markdown code block, NO OTHER PROSE!",
                    vscpp("br", null),
                    vscpp(unsafeElements_1.UnsafeCodeBlock, { languageId: 'text', code: 'commit message goes here' })),
                vscpp(tag_1.Tag, { priority: 950, name: 'custom-instructions' },
                    vscpp(customInstructions_1.CustomInstructions, { chatVariables: undefined, customIntroduction: 'When generating the commit message, please use the following custom instructions provided by the user.', languageId: undefined, includeCodeGenerationInstructions: false, includeCommitMessageGenerationInstructions: true })))));
    }
}
exports.GitCommitMessagePrompt = GitCommitMessagePrompt;
class GitCommitMessageSystemRules extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "You are an AI programming assistant, helping a software developer to come with the best git commit message for their code changes.",
            vscpp("br", null),
            "You excel in interpreting the purpose behind code changes to craft succinct, clear commit messages that adhere to the repository's guidelines.",
            vscpp("br", null),
            vscpp("br", null),
            "# First, think step-by-step:",
            vscpp("br", null),
            "1. Analyze the CODE CHANGES thoroughly to understand what's been modified.",
            vscpp("br", null),
            "2. Use the ORIGINAL CODE to understand the context of the CODE CHANGES. Use the line numbers to map the CODE CHANGES to the ORIGINAL CODE.",
            vscpp("br", null),
            "3. Identify the purpose of the changes to answer the *why* for the commit messages, also considering the optionally provided RECENT USER COMMITS.",
            vscpp("br", null),
            "4. Review the provided RECENT REPOSITORY COMMITS to identify established commit message conventions. Focus on the format and style, ignoring commit-specific details like refs, tags, and authors.",
            vscpp("br", null),
            "5. Generate a thoughtful and succinct commit message for the given CODE CHANGES. It MUST follow the the established writing conventions. 6. Remove any meta information like issue references, tags, or author names from the commit message. The developer will add them.",
            vscpp("br", null),
            "7. Now only show your message, wrapped with a single markdown ```text codeblock! Do not provide any explanations or details",
            vscpp("br", null)));
    }
}
//# sourceMappingURL=gitCommitMessagePrompt.js.map