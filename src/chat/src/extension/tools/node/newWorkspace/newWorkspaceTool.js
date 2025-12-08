"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewWorkspaceCreationResult = exports.GetNewWorkspaceTool = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const runCommandExecutionService_1 = require("../../../../platform/commands/common/runCommandExecutionService");
const dialogService_1 = require("../../../../platform/dialog/common/dialogService");
const extensionContext_1 = require("../../../../platform/extContext/common/extensionContext");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const interactiveSessionService_1 = require("../../../../platform/interactive/common/interactiveSessionService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const errors_1 = require("../../../../util/vs/base/common/errors");
const resources_1 = require("../../../../util/vs/base/common/resources");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const newWorkspaceContext_1 = require("../../../getting-started/common/newWorkspaceContext");
const promptRenderer_1 = require("../../../prompts/node/base/promptRenderer");
const unsafeElements_1 = require("../../../prompts/node/panel/unsafeElements");
const toolNames_1 = require("../../common/toolNames");
const toolsRegistry_1 = require("../../common/toolsRegistry");
let GetNewWorkspaceTool = class GetNewWorkspaceTool {
    static { this.toolName = toolNames_1.ToolName.CreateNewWorkspace; }
    constructor(workspaceService, fileSystemService, instantiationService, dialogService, _extensionContext, interactiveSession, commandService) {
        this.workspaceService = workspaceService;
        this.fileSystemService = fileSystemService;
        this.instantiationService = instantiationService;
        this.dialogService = dialogService;
        this._extensionContext = _extensionContext;
        this.interactiveSession = interactiveSession;
        this.commandService = commandService;
        this._shouldPromptWorkspaceOpen = false;
    }
    async prepareInvocation(options, token) {
        this._shouldPromptWorkspaceOpen = false;
        const workspace = this.workspaceService.getWorkspaceFolders();
        if (!workspace || workspace.length === 0) {
            this._shouldPromptWorkspaceOpen = true;
        }
        else if (workspace && workspace.length > 0) {
            this._shouldPromptWorkspaceOpen = (await this.fileSystemService.readDirectory(workspace[0])).length > 0;
        }
        if (this._shouldPromptWorkspaceOpen) {
            const confirmationMessages = {
                title: l10n.t `Open an empty folder to continue`,
                message: l10n.t `Copilot requires an empty folder as a workspace to continue workspace creation.`
            };
            return {
                confirmationMessages,
            };
        }
        return {
            invocationMessage: l10n.t `Generating plan to create a new workspace`,
        };
    }
    async invoke(options, token) {
        if (token.isCancellationRequested) {
            throw new errors_1.CancellationError();
        }
        const workspace = this.workspaceService.getWorkspaceFolders();
        let workspaceUri = workspace.length > 0 ? workspace[0] : undefined;
        if (this._shouldPromptWorkspaceOpen) {
            const newWorkspaceUri = (await this.dialogService.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false, openLabel: 'Select an Empty Workspace Folder' }))?.[0];
            if (newWorkspaceUri && !resources_1.extUri.isEqual(newWorkspaceUri, workspaceUri)) {
                if ((await this.fileSystemService.readDirectory(newWorkspaceUri)).length > 0) {
                    return new vscodeTypes_1.LanguageModelToolResult([
                        new vscodeTypes_1.LanguageModelTextPart('The user has not opened a valid workspace folder in VS Code. Ask them to open an empty folder before continuing.')
                    ]);
                }
                (0, newWorkspaceContext_1.saveNewWorkspaceContext)({
                    workspaceURI: newWorkspaceUri.toString(),
                    userPrompt: options.input.query,
                    initialized: false, /*not already opened */
                }, this._extensionContext);
                workspaceUri = newWorkspaceUri;
                this.commandService.executeCommand('setContext', 'chatSkipRequestInProgressMessage', true);
                this.interactiveSession.transferActiveChat(newWorkspaceUri);
                this.commandService.executeCommand('vscode.openFolder', newWorkspaceUri, { forceReuseWindow: true });
                return new vscodeTypes_1.LanguageModelToolResult([
                    new vscodeTypes_1.LanguageModelTextPart(`The user is opening the folder ${newWorkspaceUri.toString()}. Do not proceed with project generation till the user has confirmed opening the folder.`)
                ]);
            }
            return new vscodeTypes_1.LanguageModelToolResult([
                new vscodeTypes_1.LanguageModelTextPart('The user has not opened a valid workspace folder in VS Code. Ask them to open an empty folder before continuing.')
            ]);
        }
        if (!workspaceUri) {
            return new vscodeTypes_1.LanguageModelToolResult([
                new vscodeTypes_1.LanguageModelTextPart('The user has not opened a valid workspace folder in VS Code. Ask them to open an empty folder before continuing.')
            ]);
        }
        const json = await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, NewWorkspaceCreationResult, { query: options.input.query });
        return new vscodeTypes_1.LanguageModelToolResult([
            new vscodeTypes_1.LanguageModelPromptTsxPart(json),
        ]);
    }
};
exports.GetNewWorkspaceTool = GetNewWorkspaceTool;
exports.GetNewWorkspaceTool = GetNewWorkspaceTool = __decorate([
    __param(0, workspaceService_1.IWorkspaceService),
    __param(1, fileSystemService_1.IFileSystemService),
    __param(2, instantiation_1.IInstantiationService),
    __param(3, dialogService_1.IDialogService),
    __param(4, extensionContext_1.IVSCodeExtensionContext),
    __param(5, interactiveSessionService_1.IInteractiveSessionService),
    __param(6, runCommandExecutionService_1.IRunCommandExecutionService)
], GetNewWorkspaceTool);
let NewWorkspaceCreationResult = class NewWorkspaceCreationResult extends prompt_tsx_1.PromptElement {
    constructor(props, workspaceService, commandService) {
        super(props);
        this.workspaceService = workspaceService;
        this.commandService = commandService;
    }
    async render(state, sizing) {
        const workspace = this.workspaceService.getWorkspaceFolders();
        const workspaceUri = workspace.length > 0 ? workspace[0] : undefined;
        if (!workspaceUri) {
            return vscpp(prompt_tsx_1.TextChunk, null,
                "The user has not opened an empty workspace folder in VS Code. Ask them to open an empty folder before continuing.",
                vscpp("br", null));
        }
        // For https://github.com/microsoft/vscode/issues/258252
        this.commandService.executeCommand('workbench.action.terminal.focus');
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.TextChunk, null,
                "Create or update the copilot-instructions.md file in the .github directory with the exact content shown below.",
                vscpp("br", null),
                vscpp("br", null)),
            vscpp(unsafeElements_1.UnsafeCodeBlock, { code: `
<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->
- [ ] Verify that the copilot-instructions.md file in the .github directory is created.

- [ ] Clarify Project Requirements
	<!-- Ask for project type, language, and frameworks if not specified. Skip if already provided. -->

- [ ] Scaffold the Project
	<!--
	Ensure that the previous step has been marked as completed.
	Call project setup tool with projectType parameter.
	Run scaffolding command to create project files and folders.
	Use '.' as the working directory.
	If no appropriate projectType is available, search documentation using available tools.
	Otherwise, create the project structure manually using available file creation tools.
	-->

- [ ] Customize the Project
	<!--
	Verify that all previous steps have been completed successfully and you have marked the step as completed.
	Develop a plan to modify codebase according to user requirements.
	Apply modifications using appropriate tools and user-provided references.
	Skip this step for "Hello World" projects.
	-->

- [ ] Install Required Extensions
	<!-- ONLY install extensions provided mentioned in the ${toolNames_1.ToolName.GetProjectSetupInfo}. Skip this step otherwise and mark as completed. -->

- [ ] Compile the Project
	<!--
	Verify that all previous steps have been completed.
	Install any missing dependencies.
	Run diagnostics and resolve any issues.
	Check for markdown files in project folder for relevant instructions on how to do this.
	-->

- [ ] Create and Run Task
	<!--
	Verify that all previous steps have been completed.
	Check https://code.visualstudio.com/docs/debugtest/tasks to determine if the project needs a task. If so, use the ${toolNames_1.ToolName.CoreCreateAndRunTask} to create and launch a task based on package.json, README.md, and project structure.
	Skip this step otherwise.
	 -->

- [ ] Launch the Project
	<!--
	Verify that all previous steps have been completed.
	Prompt user for debug mode, launch only if confirmed.
	 -->

- [ ] Ensure Documentation is Complete
	<!--
	Verify that all previous steps have been completed.
	Verify that README.md and the copilot-instructions.md file in the .github directory exists and contains current project information.
	Clean up the copilot-instructions.md file in the .github directory by removing all HTML comments.
	 -->

<!--
## Execution Guidelines
PROGRESS TRACKING:
- If any tools are available to manage the above todo list, use it to track progress through this checklist.
- After completing each step, mark it complete and add a summary.
- Read current todo list status before starting each new step.

COMMUNICATION RULES:
- Avoid verbose explanations or printing full command outputs.
- If a step is skipped, state that briefly (e.g. "No extensions needed").
- Do not explain project structure unless asked.
- Keep explanations concise and focused.

DEVELOPMENT RULES:
- Use '.' as the working directory unless user specifies otherwise.
- Avoid adding media or external links unless explicitly requested.
- Use placeholders only with a note that they should be replaced.
- Use VS Code API tool only for VS Code extension projects.
- Once the project is created, it is already opened in Visual Studio Code—do not suggest commands to open this project in Visual Studio again.
- If the project setup information has additional rules, follow them strictly.

FOLDER CREATION RULES:
- Always use the current directory as the project root.
- If you are running any terminal commands, use the '.' argument to ensure that the current working directory is used ALWAYS.
- Do not create a new folder unless the user explicitly requests it besides a .vscode folder for a tasks.json file.
- If any of the scaffolding commands mention that the folder name is not correct, let the user know to create a new folder with the correct name and then reopen it again in vscode.

EXTENSION INSTALLATION RULES:
- Only install extension specified by the ${toolNames_1.ToolName.GetProjectSetupInfo} tool. DO NOT INSTALL any other extensions.

PROJECT CONTENT RULES:
- If the user has not specified project details, assume they want a "Hello World" project as a starting point.
- Avoid adding links of any type (URLs, files, folders, etc.) or integrations that are not explicitly required.
- Avoid generating images, videos, or any other media files unless explicitly requested.
- If you need to use any media assets as placeholders, let the user know that these are placeholders and should be replaced with the actual assets later.
- Ensure all generated components serve a clear purpose within the user's requested workflow.
- If a feature is assumed but not confirmed, prompt the user for clarification before including it.
- If you are working on a VS Code extension, use the VS Code API tool with a query to find relevant VS Code API references and samples related to that query.

TASK COMPLETION RULES:
- Your task is complete when:
  - Project is successfully scaffolded and compiled without errors
  - copilot-instructions.md file in the .github directory exists in the project
  - README.md file exists and is up to date
  - User is provided with clear instructions to debug/launch the project

Before starting a new task in the above plan, update progress in the plan.
-->
- Work through each checklist item systematically.
- Keep communication concise and focused.
- Follow development best practices.
`, languageId: 'markdown' }),
            vscpp(prompt_tsx_1.TextChunk, null,
                vscpp("br", null),
                "Verify that a copilot-instructions.md file in the .github directory exists and systematically work through each item in the task list.",
                vscpp("br", null),
                "Update the copilot-instructions.md file in the .github directory directly as you complete each step.",
                vscpp("br", null),
                vscpp("br", null),
                "If the user asks to \"continue,\" refer to the previous steps and proceed accordingly."));
    }
};
exports.NewWorkspaceCreationResult = NewWorkspaceCreationResult;
exports.NewWorkspaceCreationResult = NewWorkspaceCreationResult = __decorate([
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, runCommandExecutionService_1.IRunCommandExecutionService)
], NewWorkspaceCreationResult);
toolsRegistry_1.ToolRegistry.registerTool(GetNewWorkspaceTool);
//# sourceMappingURL=newWorkspaceTool.js.map