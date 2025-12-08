"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
exports.SetupTestsInvocation = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const chatMLFetcher_1 = require("../../../../platform/chat/common/chatMLFetcher");
const commonTypes_1 = require("../../../../platform/chat/common/commonTypes");
const runCommandExecutionService_1 = require("../../../../platform/commands/common/runCommandExecutionService");
const extensionsService_1 = require("../../../../platform/extensions/common/extensionsService");
const setupTestExtensions_1 = require("../../../../platform/testing/common/setupTestExtensions");
const workspaceMutationManager_1 = require("../../../../platform/testing/common/workspaceMutationManager");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const arraysFind_1 = require("../../../../util/vs/base/common/arraysFind");
const lazy_1 = require("../../../../util/vs/base/common/lazy");
const uri_1 = require("../../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const fileTreeParser_1 = require("../../../prompt/common/fileTreeParser");
const streamingGrammar_1 = require("../../../prompt/common/streamingGrammar");
const intents_1 = require("../../../prompt/node/intents");
const copilotIdentity_1 = require("../../../prompts/node/base/copilotIdentity");
const instructionMessage_1 = require("../../../prompts/node/base/instructionMessage");
const promptRenderer_1 = require("../../../prompts/node/base/promptRenderer");
const responseTranslationRules_1 = require("../../../prompts/node/base/responseTranslationRules");
const safetyRules_1 = require("../../../prompts/node/base/safetyRules");
const chatVariables_1 = require("../../../prompts/node/panel/chatVariables");
const editorIntegrationRules_1 = require("../../../prompts/node/panel/editorIntegrationRules");
const workspaceStructure_1 = require("../../../prompts/node/panel/workspace/workspaceStructure");
const files_1 = require("../../../testing/common/files");
const setupTestsFrameworkQueryInvocation_1 = require("./setupTestsFrameworkQueryInvocation");
let SetupTestsInvocation = class SetupTestsInvocation {
    constructor(intent, endpoint, location, prompt, instantiationService, workspaceService, workspaceMutationManager, extensionsService, commandService) {
        this.intent = intent;
        this.endpoint = endpoint;
        this.location = location;
        this.prompt = prompt;
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
        this.workspaceMutationManager = workspaceMutationManager;
        this.extensionsService = extensionsService;
        this.commandService = commandService;
        this.recommendedExtension = new lazy_1.Lazy(() => getKnownExtensionInText(this.prompt));
    }
    async buildPrompt(context, progress, token) {
        this.buildPromptContext = context;
        this.delegatedSetup = await this.delegateHandling();
        if (this.delegatedSetup) {
            return (0, intents_1.nullRenderPromptResult)();
        }
        this.setupConfirmation = await this.getSetupConfirmation();
        const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, this.endpoint, SetupTestsPrompt, {
            endpoint: this.endpoint,
            promptContext: context,
            query: this.prompt,
            setupConfirmation: this.setupConfirmation,
        });
        return renderer.render(progress, token);
    }
    async processResponse(context, inputStream, outputStream, token) {
        const requestId = context.turn.id;
        const pushTokens = (tokens) => {
            for (const token of tokens) {
                if (token.transitionTo === 1 /* State.FileTree */) {
                    // tokens are accumulated into a file tree is seen (generally the first
                    // thing in the response) to avoid printing a generic "what framework are
                    // you using?" if the user gave a generic questioning prompt
                    outputStream.markdown(grammar.accumulate(0, grammar.tokens.length - 1));
                }
                else if (token.transitionTo === 2 /* State.FoundTree */) {
                    const tree = grammar.accumulate(undefined, undefined, 1 /* State.FileTree */);
                    this.handleFileTree(requestId, tree, outputStream);
                }
                else if (token.transitionTo === undefined && token.state !== 1 /* State.FileTree */ && grammar.visited(1 /* State.FileTree */)) {
                    outputStream.markdown(token.token);
                }
            }
        };
        const grammar = new streamingGrammar_1.StreamingGrammar(0 /* State.LookingForTree */, {
            [0 /* State.LookingForTree */]: { '```filetree': 1 /* State.FileTree */ },
            [1 /* State.FileTree */]: { '```': 2 /* State.FoundTree */ },
        });
        for await (const { delta } of inputStream) {
            pushTokens(grammar.append(delta.text));
        }
        pushTokens(grammar.flush());
        if (this.delegatedSetup) {
            outputStream.markdown(this.delegatedSetup.message);
        }
        const command = this.setupConfirmation?.command || this.delegatedSetup?.command;
        if (command) {
            // prompt will already include the `message` at the end, just add the button as needed
            outputStream.button(command);
        }
        else if (grammar.visited(1 /* State.FileTree */)) {
            await this.recommendExtension(grammar.accumulate(undefined, undefined, 0 /* State.LookingForTree */), outputStream, token);
        }
        else {
            // if we never saw a file tree, automatically do the generic test setup
            await this.doFrameworkQuery(context, outputStream, token);
        }
    }
    async doFrameworkQuery(context, outputStream, token) {
        const invocation = this.instantiationService.createInstance(setupTestsFrameworkQueryInvocation_1.SetupTestsFrameworkQueryInvocationRaw, this.endpoint, undefined);
        const prompt = await invocation.buildPrompt(this.buildPromptContext, undefined, token);
        const inputStream = new chatMLFetcher_1.FetchStreamSource();
        const responseProcessing = invocation.processResponse(context, inputStream.stream, outputStream, token);
        await this.endpoint.makeChatRequest('testSetupAutomaticFrameworkID', prompt.messages, (text, _, delta) => {
            inputStream.update(text, delta);
            return Promise.resolve(undefined);
        }, token, this.location);
        inputStream.resolve();
        await responseProcessing;
    }
    async getSetupConfirmation() {
        const extensionInfo = this.recommendedExtension.value;
        const extension = extensionInfo ? this.extensionsService.getExtension(extensionInfo.id) : undefined;
        const command = extension?.packageJSON?.copilot?.tests?.getSetupConfirmation;
        if (!command) {
            return;
        }
        let result;
        try {
            result = await this.commandService.executeCommand(command);
        }
        catch {
            // ignored
        }
        return result;
    }
    async delegateHandling() {
        const extensionInfo = this.recommendedExtension.value;
        const extension = extensionInfo ? this.extensionsService.getExtension(extensionInfo.id) : undefined;
        const command = extension?.packageJSON?.copilot?.tests?.setupTests;
        return command ? await this.commandService.executeCommand(command) : undefined;
    }
    async recommendExtension(outputText, outputStream, token) {
        let searchText;
        let extensionInfo;
        if (this.recommendedExtension.value) {
            searchText = this.prompt;
            extensionInfo = this.recommendedExtension.value;
        }
        else {
            searchText = await this.deriveFrameworkFromResponse(outputText, token);
            extensionInfo = getKnownExtensionInText(searchText);
        }
        if (extensionInfo && this.extensionsService.getExtension(extensionInfo.id)) {
            return; // extension already installed
        }
        outputStream.markdown('\n\n');
        if (extensionInfo) {
            outputStream.markdown(l10n.t('I also recommend installing the {0} extension to make tests easy to run in VS Code:', extensionInfo.name));
            outputStream.markdown('\n\n');
            outputStream.push(new vscodeTypes_1.ChatResponseExtensionsPart([extensionInfo.id]));
        }
        else {
            outputStream.markdown(l10n.t('You can also search for an extension to make tests easy to run in VS Code:'));
            outputStream.button({
                command: 'workbench.extensions.search',
                title: l10n.t('Search Extensions'),
                arguments: [`@category:testing ${this.prompt}`]
            });
        }
    }
    async deriveFrameworkFromResponse(outputText, token) {
        const deriveResponsePrompt = await promptRenderer_1.PromptRenderer.create(this.instantiationService, this.endpoint, TestFrameworkFromResponsePrompt, {
            query: outputText,
        }).render();
        const fetchResult = await this.endpoint.makeChatRequest('setupTestDeriveName', deriveResponsePrompt.messages, undefined, token, commonTypes_1.ChatLocation.Panel);
        if (fetchResult.type !== commonTypes_1.ChatFetchResponseType.Success) {
            return '';
        }
        return fetchResult.value.replaceAll('`', '');
    }
    handleFileTree(requestId, tree, outputStream) {
        const workspaceFolder = this.workspaceService.getWorkspaceFolders().at(0);
        if (!workspaceFolder) {
            return;
        }
        // todo: make the preview URI a diff for existing files
        const { chatResponseTree } = (0, fileTreeParser_1.convertFileTreeToChatResponseFileTree)(tree, () => makePreviewUri(requestId));
        // Handle a root '[project-name]' or similar fake root node
        const first = chatResponseTree.value[0];
        if (chatResponseTree.value.length === 1 && /^\[.+\]$/.test(first.name) && first.children) {
            chatResponseTree.value = first.children;
        }
        this.workspaceMutationManager.create(requestId, {
            baseURI: workspaceFolder,
            files: (0, fileTreeParser_1.listFilesInResponseFileTree)(chatResponseTree.value),
            fileTree: tree,
            query: this.prompt,
        });
        outputStream.push(chatResponseTree);
        outputStream.button({
            command: 'github.copilot.tests.applyMutations',
            title: l10n.t('Apply Changes'),
            arguments: [requestId],
        });
    }
};
exports.SetupTestsInvocation = SetupTestsInvocation;
exports.SetupTestsInvocation = SetupTestsInvocation = __decorate([
    __param(4, instantiation_1.IInstantiationService),
    __param(5, workspaceService_1.IWorkspaceService),
    __param(6, workspaceMutationManager_1.IWorkspaceMutationManager),
    __param(7, extensionsService_1.IExtensionsService),
    __param(8, runCommandExecutionService_1.IRunCommandExecutionService)
], SetupTestsInvocation);
const projectNameToken = '[project-name]';
function makePreviewUri(requestId, filePath) {
    return uri_1.URI.from({
        scheme: files_1.SetupTestFileScheme,
        authority: requestId,
        path: filePath ? `/${filePath}` : '/'
    });
}
class SetupTestsPrompt extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const { query, setupConfirmation } = this.props;
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a software engineer with expert knowledge around software testing frameworks.",
                vscpp("br", null),
                vscpp("br", null),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.SafetyRules, null),
                vscpp(editorIntegrationRules_1.EditorIntegrationRules, null),
                vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                "# Additional Rules",
                vscpp("br", null),
                "1. The user will tell you what testing framework they want to set up, and provide you their workspace structure.",
                vscpp("br", null),
                "2. Determine how to test up the desired testing framework.",
                vscpp("br", null),
                "3. Generate a markdown file tree structure listing files you want to create or edit in order to set up the testing framework. The tree MUST NOT include files that don't need to be modified.",
                vscpp("br", null),
                "4. Make sure to include a basic \"hello world\" test to help the user get started. If you see existing test files in the workspace, make sure to try to match their naming convention.",
                vscpp("br", null),
                "5. Do not attempt to modify the file content yourself and simply respond with the file tree structure.",
                vscpp("br", null),
                "6. After listing the file tree structure, respond with any terminal commands the user should execute to finish installing the testing framework. Terminal commands should be wrapped in a code fence tagged with the \"sh\" language.",
                vscpp("br", null),
                "7. Finally, provide a command line a user can execute to run their tests.",
                vscpp("br", null),
                setupConfirmation && vscpp(vscppf, null,
                    "8. At the end, include a phrase that conveys '",
                    setupConfirmation.message,
                    "', but rephrase this to indicate that this is the last step the user needs to take to enable rich UI integration in VS Code.",
                    setupConfirmation.command && ` This message will be followed by a button that says "${setupConfirmation.command.title}".`,
                    vscpp("br", null)),
                vscpp("br", null),
                "# Example",
                vscpp("br", null),
                "## Question:",
                vscpp("br", null),
                "I want to: set up mocha tests in the workspace",
                vscpp("br", null),
                "I am working in a workspace that has the following structure:",
                vscpp("br", null),
                `\`\`\`
src/
  index.ts
package.json
tsconfig.json
\`\`\``,
                vscpp("br", null),
                "## Response:",
                vscpp("br", null),
                "Let's create a `.mocharc.js` file to configure your test settings, as well as a \"hello world\" test:",
                vscpp("br", null),
                vscpp("br", null),
                `\`\`\`filetree
${projectNameToken}
├── src
│   └── index.test.ts
└── mocha.opts
\`\`\``,
                vscpp("br", null),
                "Then, we'll need to install Mocha in your workspace:",
                vscpp("br", null),
                "```sh",
                vscpp("br", null),
                "npm install --save-dev mocha ```",
                vscpp("br", null),
                vscpp("br", null),
                "Finally, you can run your tests with the following command:",
                vscpp("br", null),
                "```sh",
                vscpp("br", null),
                "npx mocha",
                vscpp("br", null),
                "```",
                vscpp("br", null)),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 2 },
                vscpp(SetupWorkspaceStructure, null)),
            vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 2, priority: 900, chatVariables: this.props.promptContext.chatVariables, query: `I want to: ${query}`, embeddedInsideUserMessage: false }));
    }
}
class SetupWorkspaceStructure extends prompt_tsx_1.PromptElement {
    render(_state, sizing) {
        return vscpp(workspaceStructure_1.WorkspaceStructure, { maxSize: (sizing.tokenBudget * 4) / 3 });
    }
}
class TestFrameworkFromResponsePrompt extends prompt_tsx_1.PromptElement {
    render() {
        const { query } = this.props;
        return vscpp(vscppf, null,
            vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                "# Rules:",
                vscpp("br", null),
                "1. The user will give you instructions they were told regarding how to set up a testing framework.",
                vscpp("br", null),
                "2. Your job is to print the name of the testing framework referred to in the response.",
                vscpp("br", null),
                "3. Do not print any other information except for the name of the framework.",
                vscpp("br", null),
                vscpp("br", null),
                "# Example",
                vscpp("br", null),
                "## Question:",
                vscpp("br", null),
                "Given the structure of your workspace, I recommend using Mocha for testing. To set up Mocha, you should create a `.mocharc.js` file to configure your test settings, as well as a \"hello world\" test.",
                vscpp("br", null),
                "## Response:",
                vscpp("br", null),
                "mocha"),
            vscpp(prompt_tsx_1.UserMessage, null, query));
    }
}
function getKnownExtensionInText(text) {
    const haystack = text.toLowerCase();
    return (0, arraysFind_1.mapFindFirst)(setupTestExtensions_1.testExtensionsForLanguage.values(), ext => {
        if (ext.forLanguage?.associatedFrameworks?.some(f => haystack.includes(f))) {
            return ext.forLanguage.extension;
        }
        return ext.perFramework && (0, arraysFind_1.mapFindFirst)(ext.perFramework, ([f, ext]) => haystack.includes(f) ? ext : undefined);
    });
}
//# sourceMappingURL=setupTestsInvocation.js.map