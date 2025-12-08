"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubPullRequestPrompt = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const safetyRules_1 = require("../base/safetyRules");
const tag_1 = require("../base/tag");
const customInstructions_1 = require("../panel/customInstructions");
class GitHubPullRequestIssueList extends prompt_tsx_1.PromptElement {
    render() {
        const issuesString = this.props.issues?.map(issue => {
            return vscpp(vscppf, null,
                "------- Issue ",
                issue.reference,
                ":",
                vscpp("br", null),
                issue.content,
                vscpp("br", null));
        });
        return issuesString && issuesString.length > 0 ? (vscpp(vscppf, null,
            "You are an AI assistant for a software developer who is about to make a pull request to a GitHub repository to fix the following issues: ",
            vscpp("br", null),
            issuesString)) : (vscpp(vscppf, null, "You are an AI assistant for a software developer who is about to make a pull request to a GitHub repository."));
    }
}
class GitHubPullRequestSystemExamples extends prompt_tsx_1.PromptElement {
    render() {
        return vscpp(vscppf, null,
            "Here are two good examples:",
            vscpp("br", null),
            " ",
            this.props.issues && this.props.issues.length > 0 ? (vscpp(vscppf, null,
                "Example One:",
                vscpp("br", null),
                "+++Batch mark/unmark files as viewed",
                vscpp("br", null),
                "+++Previously, when marking/unmarking a folder as viewed, a request was sent for every single file. This PR ensures that only one request is sent when marking/unmarking a folder as viewed.",
                vscpp("br", null),
                "Fixes #4520+++",
                vscpp("br", null),
                "Example two:",
                vscpp("br", null),
                "+++Fallback to hybrid after 20 process ports",
                vscpp("br", null),
                "+++Additionally the \\`remote.autoForwardPortsSource\\` setting has been updated to remove the \\`markdownDescription\\` reference to a reload being required for changes to take effect.",
                vscpp("br", null),
                "Fixes microsoft/vscode#4533+++",
                vscpp("br", null))) : (vscpp(vscppf, null,
                "Example One:",
                vscpp("br", null),
                "+++Batch mark/unmark files as viewed",
                vscpp("br", null),
                "+++Previously, when marking/unmarking a folder as viewed, a request was sent for every single file. This PR ensures that only one request is sent when marking/unmarking a folder as viewed.+++",
                vscpp("br", null),
                "Example two:",
                vscpp("br", null),
                "+++Fallback to hybrid after 20 process ports",
                vscpp("br", null),
                "+++Additionally the \\`remote.autoForwardPortsSource\\` setting has been updated to remove the \\`markdownDescription\\` reference to a reload being required for changes to take effect.+++",
                vscpp("br", null),
                "Example three:",
                vscpp("br", null),
                "+++Add a favicon",
                vscpp("br", null),
                "+++Add a favicon to the webview+++",
                vscpp("br", null))),
            ";");
    }
}
class GitHubPullRequestSystemRules extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            vscpp(GitHubPullRequestIssueList, { issues: this.props.issues }),
            "Pull requests have a short and concise title that describes the changes in the code and a description that is much shorter than the changes.",
            vscpp("br", null),
            "To compose the description, read through each commit and patch and tersly describe the intent of the changes, not the changes themselves. Do not list commits, files or patches. Do not make up an issue reference if the pull request isn't fixing an issue.",
            vscpp("br", null),
            "If the pull request is fixing an issue, consider how the commits relate to the issue and include that in the description.",
            vscpp("br", null),
            "Avoid saying \"this PR\" or similar. Avoid passive voice.",
            vscpp("br", null),
            "If a template is specified, the description must match the template, filling in any required fields.",
            vscpp("br", null),
            "The title and description of a pull request should be markdown and start with +++ and end with +++.",
            vscpp("br", null),
            vscpp(GitHubPullRequestSystemExamples, { issues: this.props.issues })));
    }
}
class GitHubPullRequestUserMessage extends prompt_tsx_1.PromptElement {
    render() {
        const formattedCommitMessages = this.props.commitMessages.map(commit => `"${commit.replace(/\n/g, '. ')}"`).join(', ');
        const formattedPatches = this.props.patches.map(patch => vscpp(vscppf, null,
            "```diff",
            vscpp("br", null),
            patch,
            vscpp("br", null),
            "```",
            vscpp("br", null)));
        return (vscpp(vscppf, null,
            "These are the commits that will be included in the pull request you are about to make:",
            vscpp("br", null),
            formattedCommitMessages,
            vscpp("br", null),
            "Below is a list of git patches that contain the file changes for all the files that will be included in the pull request:",
            vscpp("br", null),
            formattedPatches,
            vscpp("br", null),
            this.props.template && (vscpp(vscppf, null,
                "The pull request description should match the following template:",
                vscpp("br", null),
                "```",
                vscpp("br", null),
                this.props.template,
                vscpp("br", null),
                "```",
                vscpp("br", null))),
            "Based on the git patches and on the git commit messages above, the title and description of the pull request should be:",
            vscpp("br", null)));
    }
}
class GitHubPullRequestPrompt extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, null,
                vscpp(GitHubPullRequestSystemRules, { issues: this.props.issues }),
                vscpp(safetyRules_1.SafetyRules, null)),
            vscpp(prompt_tsx_1.UserMessage, null,
                vscpp(GitHubPullRequestUserMessage, { commitMessages: this.props.commitMessages, patches: this.props.patches, template: this.props.template }),
                vscpp(tag_1.Tag, { priority: 750, name: 'custom-instructions' },
                    vscpp(customInstructions_1.CustomInstructions, { chatVariables: undefined, customIntroduction: 'When generating the pull request title and description, please use the following custom instructions provided by the user.', languageId: undefined, includeCodeGenerationInstructions: false, includePullRequestDescriptionGenerationInstructions: true })))));
    }
}
exports.GitHubPullRequestPrompt = GitHubPullRequestPrompt;
//# sourceMappingURL=pullRequestDescriptionPrompt.js.map