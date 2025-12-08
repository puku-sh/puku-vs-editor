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
exports.NewWorkspaceMetaPrompt = exports.NewWorkspaceGithubContentMetadata = exports.NewWorkspacePrompt = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../../../platform/chat/common/commonTypes");
const embeddingsComputer_1 = require("../../../../../platform/embeddings/common/embeddingsComputer");
const endpointProvider_1 = require("../../../../../platform/endpoint/common/endpointProvider");
const githubService_1 = require("../../../../../platform/github/common/githubService");
const projectTemplatesIndex_1 = require("../../../../../platform/projectTemplatesIndex/common/projectTemplatesIndex");
const progress_1 = require("../../../../../util/common/progress");
const path = __importStar(require("../../../../../util/vs/base/common/path"));
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../../vscodeTypes");
const newIntent_1 = require("../../../../intents/node/newIntent");
const conversation_1 = require("../../../../prompt/common/conversation");
const copilotIdentity_1 = require("../../base/copilotIdentity");
const instructionMessage_1 = require("../../base/instructionMessage");
const promptRenderer_1 = require("../../base/promptRenderer");
const responseTranslationRules_1 = require("../../base/responseTranslationRules");
const safetyRules_1 = require("../../base/safetyRules");
const chatVariables_1 = require("../chatVariables");
const conversationHistory_1 = require("../conversationHistory");
const customInstructions_1 = require("../customInstructions");
const editorIntegrationRules_1 = require("../editorIntegrationRules");
const unsafeElements_1 = require("../unsafeElements");
function parseInstruction(input) {
    const lines = input.split('\n');
    const instruction = {};
    lines.forEach((line, index) => {
        if (line.startsWith('# Intent')) {
            instruction.intent = lines[index + 1]?.trim();
        }
        else if (line.startsWith('# Question')) {
            instruction.question = lines[index + 1]?.trim();
        }
    });
    return instruction;
}
let NewWorkspacePrompt = class NewWorkspacePrompt extends prompt_tsx_1.PromptElement {
    constructor(props, instantiationService, embeddingsComputer, endPointProvider, projectTemplatesIndex, repositoryService) {
        super(props);
        this.instantiationService = instantiationService;
        this.embeddingsComputer = embeddingsComputer;
        this.endPointProvider = endPointProvider;
        this.projectTemplatesIndex = projectTemplatesIndex;
        this.repositoryService = repositoryService;
    }
    async prepare(sizing, progress, token) {
        if (!progress) {
            throw new Error('Progress is required');
        }
        progress?.report(new vscodeTypes_1.ChatResponseProgressPart(l10n.t('Determining user intent...')));
        const endpoint = await this.endPointProvider.getChatEndpoint('copilot-fast');
        const { messages } = await buildNewWorkspaceMetaPrompt(this.instantiationService, endpoint, this.props.promptContext);
        if (token.isCancellationRequested) {
            return {};
        }
        const fetchResult = await endpoint.makeChatRequest('newWorkspace', messages, undefined, token, commonTypes_1.ChatLocation.Panel, undefined, {
            temperature: 0,
        });
        if (fetchResult.type === commonTypes_1.ChatFetchResponseType.Success) {
            const instruction = parseInstruction(fetchResult.value);
            if (instruction.intent === 'File') {
                return { intent: instruction };
            }
            else if (instruction.intent === 'Project') {
                if (this.props.useTemplates) {
                    const result = await this.embeddingsComputer.computeEmbeddings(embeddingsComputer_1.EmbeddingType.text3small_512, [instruction.question], {}, undefined);
                    progress.report(new vscodeTypes_1.ChatResponseProgressPart(l10n.t('Searching project template index...')));
                    const similarProjects = await this.projectTemplatesIndex.nClosestValues(result.values[0], 1);
                    if (similarProjects.length > 0) {
                        const content = similarProjects[0]?.split(':');
                        const org = content[0].trim();
                        const repo = content[1].trim();
                        const repoPath = content[2].trim() === '' ? '.' : content[2].trim();
                        if (org && repo && repoPath) {
                            const items = await (0, progress_1.reportProgressOnSlowPromise)(progress, new vscodeTypes_1.ChatResponseProgressPart(l10n.t('Fetching project contents...')), this.repositoryService.getRepositoryItems(org, repo, repoPath), 500);
                            if (items.length > 0) {
                                let url;
                                if (repoPath === '.') {
                                    url = `httpx://github.com/${org}/${repo}`;
                                }
                                else {
                                    url = path.dirname(items[0].html_url);
                                }
                                this._metadata = new NewWorkspaceGithubContentMetadata(org, repo, repoPath, items);
                                return { url: url };
                            }
                        }
                    }
                }
                return { intent: instruction };
            }
            else {
                // revert to default behavior
                return { intent: { intent: 'Project', question: this.props.promptContext.query } };
            }
        }
        else {
            throw new Error(l10n.t('Encountered an error while determining user intent: ({0}) {1}', fetchResult.type, fetchResult.reason));
        }
    }
    render(state) {
        const { query, history, chatVariables, } = this.props.promptContext;
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.SafetyRules, null)),
            vscpp(conversationHistory_1.ConversationHistory, { priority: 600, history: history.filter((turn) => turn.responseMessage?.name === newIntent_1.newId && turn.request.type === 'user') }),
            state.intent?.intent === 'File' && vscpp(vscppf, null,
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    "You are a Visual Studio Code assistant. Your job is to generate the contents of a new file based on the user's query.",
                    vscpp("br", null),
                    "If a code snippet or markdown is provided, consider it as part of the file content creation process.",
                    vscpp("br", null),
                    "The code should not contain bugs and should adhere to best practices.",
                    vscpp("br", null),
                    "Your response should be just two code blocks - the first one with the file contents and the second JSON code block with a file name.",
                    vscpp("br", null),
                    "Your response should not contain any other information or explanation.",
                    vscpp("br", null),
                    "# Response Template",
                    vscpp("br", null),
                    vscpp(unsafeElements_1.UnsafeCodeBlock, { code: `
    def greet(name):
      print(f"Hello, {name}!")
    greet("John Doe")
  `, languageId: 'python' }),
                    vscpp(unsafeElements_1.UnsafeCodeBlock, { code: `
    'fileName': 'suggestedFileName',
`, languageId: 'json' }),
                    vscpp("br", null),
                    "Examples:",
                    vscpp("br", null),
                    "User: Generate the contents of the new file based on this query:",
                    vscpp("br", null),
                    "python hello world file",
                    vscpp("br", null),
                    "Assistant:",
                    vscpp("br", null),
                    vscpp(unsafeElements_1.UnsafeCodeBlock, { code: `
    def greet(name):
      print(f"Hello, {name}!")

    greet("John Doe")
  `, languageId: 'python' }),
                    vscpp(unsafeElements_1.UnsafeCodeBlock, { code: `
    {
    'fileName': 'sampleHelloWorld.py',
    }
`, languageId: 'json' }),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null)),
                vscpp(chatVariables_1.ChatToolReferences, { priority: 899, flexGrow: 2, promptContext: this.props.promptContext, embeddedInsideUserMessage: false }),
                vscpp(chatVariables_1.ChatVariablesAndQuery, { priority: 900, chatVariables: chatVariables, query: state.intent.question, embeddedInsideUserMessage: false })),
            state.intent?.intent === 'Project' && !this._metadata && vscpp(vscppf, null,
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    "You are a VS Code assistant. Your job is to suggest a filetree directory structure for a project that a user wants to create.",
                    vscpp("br", null),
                    "If a step does not relate to filetree directory structures, do not respond. Please do not guess a response and instead just respond with a polite apology if you are unsure. ## Additional Rules ##",
                    vscpp("br", null),
                    "If the user does not specify \"app\" or \"project\" in their query, assume they are asking for a project.",
                    vscpp("br", null),
                    "You should always start your response to the user with \"Sure, here's a proposed directory structure for a [project type] app:\"",
                    vscpp("br", null),
                    "You should generate a markdown file tree structure for the sample project and include it in your response if you are proposing a sample.",
                    vscpp("br", null),
                    "You should only list common files for the user's desired project type if you are proposing a sample.",
                    vscpp("br", null),
                    "You should always include a README.md file which describes the project if you are proposing a sample.",
                    vscpp("br", null),
                    "Do not include folders and files generated after compiling, building or running the project such as node_modules, dist, build, out.",
                    vscpp("br", null),
                    "Do not include image files such as png, jpg, ico, etc.",
                    vscpp("br", null),
                    "Do not include any descriptions or explanations in your response other than what is shown in the response templates.",
                    vscpp("br", null),
                    "If the user asks for a file content to be modified, respond with the same file tree structure and ask them to open the file to view the modifications.",
                    vscpp("br", null),
                    "Do not attempt to modify the file content your self and simply respond with the same file tree structure.",
                    vscpp("br", null),
                    vscpp(editorIntegrationRules_1.EditorIntegrationRules, null),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                    vscpp("br", null),
                    "Additional Rules",
                    vscpp("br", null),
                    "## Response template ##",
                    vscpp("br", null),
                    "Sure, here's a proposed directory structure for a [project type] app:",
                    vscpp("br", null),
                    "\\`\\`\\`filetree",
                    vscpp("br", null),
                    "[project-name]",
                    vscpp("br", null),
                    "\u251C\u2500\u2500 src",
                    vscpp("br", null),
                    "\u2502   \u251C\u2500\u2500 app.ts",
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
                    [
                        '',
                        'Examples for response templates above. Please follow these examples as closely as possible.',
                        '',
                        '## Valid setup question',
                        '',
                        'User: Create a TypeScript express app',
                        'Assistant:',
                        '',
                        'Sure, here\'s a proposed directory structure for a TypeScript Express app:',
                        '',
                        '\`\`\`filetree',
                        'my-express-app',
                        '├── src',
                        '│   ├── app.ts',
                        '│   ├── controllers',
                        '│   │   └── index.ts',
                        '│   ├── routes',
                        '│   │   └── index.ts',
                        '│   └── types',
                        '│       └── index.ts',
                        '├── package.json',
                        '├── tsconfig.json',
                        '└── README.md',
                        '\`\`\`',
                        '',
                        '## Invalid setup question',
                        '',
                        'User: Create a horse project',
                        'Assistant: Sorry, I don\'t know how to set up a horse project.'
                    ].join('\n'),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null)),
                vscpp(prompt_tsx_1.UserMessage, { priority: 750 },
                    vscpp(customInstructions_1.CustomInstructions, { languageId: undefined, chatVariables: chatVariables })),
                vscpp(chatVariables_1.ChatToolReferences, { priority: 899, flexGrow: 2, promptContext: this.props.promptContext, embeddedInsideUserMessage: false }),
                vscpp(chatVariables_1.ChatVariablesAndQuery, { priority: 900, chatVariables: chatVariables, query: state.intent.question, embeddedInsideUserMessage: false })),
            !state.intent && this._metadata && vscpp(vscppf, null,
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    "You are a Visual Studio Code assistant. The user has identified a project URL for a new project they want to create. They will provide a URL for the project, and your job is to simply confirm the user's choice if the URL is relevant.",
                    vscpp("br", null),
                    "If the URL is not relevant, you should ignore the URL and simply suggest a file tree directory structure for a project that the user wants to create. Do not attempt to clarify the URL to the user.",
                    vscpp("br", null),
                    "Please do not guess a response and instead just respond with a polite apology if you are unsure.",
                    vscpp("br", null),
                    vscpp(editorIntegrationRules_1.EditorIntegrationRules, null),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                    vscpp("br", null),
                    "Additional Rules",
                    vscpp("br", null),
                    "## Response template when the user has provided a project URL but it is irrelevant. Notice how the response ignores the provided URL entirely and does not attempt to clarify this to the user. ##",
                    vscpp("br", null),
                    "Sure, here's a proposed directory structure for a [project type] app:",
                    vscpp("br", null),
                    "\\`\\`\\`filetree",
                    vscpp("br", null),
                    "[project-name]",
                    vscpp("br", null),
                    "\u251C\u2500\u2500 src",
                    vscpp("br", null),
                    "\u2502   \u251C\u2500\u2500 app.ts",
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
                    [
                        '',
                        'Examples for response templates above. Please follow these examples as closely as possible.',
                        '',
                        '## Valid setup question with an irrelevant URL ##',
                        '',
                        'User: Create a TypeScript express app',
                        'URL: https://github.com/microsoft/vscode-extension-samples/tree/main/getting-started-sample',
                        'Assistant:',
                        '',
                        'Sure, here\'s a proposed directory structure for a TypeScript Express app:',
                        '',
                        '\`\`\`filetree',
                        'my-express-app',
                        '├── src',
                        '│   ├── app.ts',
                        '│   ├── controllers',
                        '│   │   └── index.ts',
                        '│   ├── routes',
                        '│   │   └── index.ts',
                        '│   └── types',
                        '│       └── index.ts',
                        '├── package.json',
                        '├── tsconfig.json',
                        '└── README.md',
                        '\`\`\`',
                        '',
                        '## Invalid setup question ##',
                        '',
                        'User: Create a horse project',
                        'Assistant: Sorry, I don\'t know how to set up a horse project.'
                    ].join('\n'),
                    "## Response template when the user has provided a project URL that is relevant ##",
                    vscpp("br", null),
                    "# USING_URL ",
                    vscpp("br", null),
                    "Sure, here's a GitHub sample project to help you get started on [project type]: [Project Type Sample](url)",
                    vscpp("br", null),
                    [
                        '',
                        'Examples for response template with a relevant URL described above. Please follow this example as closely as possible.',
                        '',
                        '## Valid setup question with a relevant project URL. Notice how you should not propose a file directory structure in this case. ##',
                        '',
                        'User: Create a VSCode extension sample for contributing getting started walkthrough.',
                        'URL: https://github.com/microsoft/vscode-extension-samples/tree/main/getting-started-sample',
                        'Assistant:',
                        '',
                        '# USING_URL',
                        'Sure, here\'s a GitHub sample project to help you get started on creating a VSCode extension with a walkthrough contribution: [Walkthrough Sample](https://github.com/microsoft/vscode-extension-samples/tree/main/getting-started-sample)',
                        '',
                    ].join('\n'),
                    vscpp("br", null),
                    "## Additional Rules for Project Tree generation ##",
                    vscpp("br", null),
                    "You should only generate a file tree structure if the URL procvided by the user is not relevant.",
                    vscpp("br", null),
                    "You should generate a markdown file tree structure for the sample project and include it in your response if you are proposing a sample.",
                    vscpp("br", null),
                    "You should only list common files for the user's desired project type if you are proposing a sample.",
                    vscpp("br", null),
                    "You should always include a README.md file which describes the project if you are proposing a sample.",
                    vscpp("br", null),
                    "Do not include folders and files generated after compiling, building, or running the project such as node_modules, dist, build, out.",
                    vscpp("br", null),
                    "Do not include image files such as png, jpg, ico, etc.",
                    vscpp("br", null),
                    "Do not include any descriptions or explanations in your response other than what is shown in the response templates.",
                    vscpp("br", null),
                    "If the user asks for a file content to be modified, respond with the same file tree structure and ask them to open the file to view the modifications.",
                    vscpp("br", null),
                    "Do not attempt to modify the file content yourself and simply respond with the same file tree structure.",
                    vscpp("br", null),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null)),
                vscpp(prompt_tsx_1.UserMessage, { priority: 750 },
                    vscpp(customInstructions_1.CustomInstructions, { languageId: undefined, chatVariables: chatVariables })),
                vscpp(prompt_tsx_1.UserMessage, { priority: 900 }, state.url && vscpp(vscppf, null,
                    "Below is the URL you should consider for your response.",
                    vscpp("br", null),
                    "URL: ",
                    state.url,
                    vscpp("br", null))),
                vscpp(chatVariables_1.ChatToolReferences, { priority: 899, flexGrow: 2, promptContext: this.props.promptContext, embeddedInsideUserMessage: false }),
                vscpp(chatVariables_1.ChatVariablesAndQuery, { priority: 900, chatVariables: chatVariables, query: query, embeddedInsideUserMessage: false }),
                this._metadata && vscpp(vscppf, null,
                    vscpp("meta", { value: this._metadata })))));
    }
};
exports.NewWorkspacePrompt = NewWorkspacePrompt;
exports.NewWorkspacePrompt = NewWorkspacePrompt = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, embeddingsComputer_1.IEmbeddingsComputer),
    __param(3, endpointProvider_1.IEndpointProvider),
    __param(4, projectTemplatesIndex_1.IProjectTemplatesIndex),
    __param(5, githubService_1.IGithubRepositoryService)
], NewWorkspacePrompt);
class NewWorkspaceGithubContentMetadata extends conversation_1.PromptMetadata {
    constructor(org, repo, path, githubRepoItems) {
        super();
        this.org = org;
        this.repo = repo;
        this.path = path;
        this.githubRepoItems = githubRepoItems;
    }
}
exports.NewWorkspaceGithubContentMetadata = NewWorkspaceGithubContentMetadata;
(function (NewWorkspaceGithubContentMetadata) {
    function is(obj) {
        return obj instanceof NewWorkspaceGithubContentMetadata;
    }
    NewWorkspaceGithubContentMetadata.is = is;
})(NewWorkspaceGithubContentMetadata || (exports.NewWorkspaceGithubContentMetadata = NewWorkspaceGithubContentMetadata = {}));
async function buildNewWorkspaceMetaPrompt(instantiationService, endpoint, promptContext) {
    const renderer = promptRenderer_1.PromptRenderer.create(instantiationService, endpoint, NewWorkspaceMetaPrompt, {
        promptContext,
        endpoint
    });
    return renderer.render();
}
class NewWorkspaceMetaPrompt extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const { query, history, chatVariables, } = this.props.promptContext;
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a Visual Studio Code assistant focused on aiding users in crafting clear and specific specifications about project or file creation within Visual Studio Code. Your role involves:",
                vscpp("br", null),
                "- Helping users articulate their intent about creating projects for various platforms and programming languages.",
                vscpp("br", null),
                "- Assessing the user's intent to determine whether it pertains to project or file creation.",
                vscpp("br", null),
                "- Identifying the programming language the user is inquiring about, or inferring it based on the platform or project type mentioned.",
                vscpp("br", null),
                "- Rewriting the user's query to eliminate ambiguity and ensure clarity.",
                vscpp("br", null),
                "- Resolving any pronouns and vague terms to their specific referents.",
                vscpp("br", null),
                "- Responding with a rephrased question that accurately reflects the user's intent.",
                vscpp("br", null),
                "- Using the additional context to resolve ambiguities in the user's query, such as \"it\" or \"that\".",
                vscpp("br", null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { historyPriority: 500, passPriority: true, history: history || [] },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    "- If the user does not specify an application logic or feature, you should assume that the user is new to programming and provide a basic project structure to help with a simple Hello World project.",
                    vscpp("br", null),
                    "- If the user does not specify \"app,\" \"project,\" or \"file\" in their query, assume they are asking for a project. - If it is not clear what the user is asking for or if the question appears to be unrelated to Visual Studio Code, do not try to rephrase the question and simply return the original question.",
                    vscpp("br", null),
                    "- DO NOT ask the user for additional information or clarification.",
                    vscpp("br", null),
                    "- DO NOT answer the user's question directly.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Guidelines for rewriting questions:",
                    vscpp("br", null),
                    "- Understand the user's intent by carefully reading their question.",
                    vscpp("br", null),
                    "- Clarify pronouns ('it', 'that') by deducing their referents from the question or conversation context.",
                    vscpp("br", null),
                    "- Resolve ambiguous terms ('this') to their specific meanings based on the question or conversation context.",
                    vscpp("br", null),
                    "- Rephrase the question under a `# Question` header, ensuring all vague terms are clarified without altering the original intent.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "When responding:",
                    vscpp("br", null),
                    "- Use Markdown to format your response, starting with a `# Question` header followed by the rephrased question.",
                    vscpp("br", null),
                    "- If the user's intent is unclear or unrelated to Visual Studio Code, simply return the original question without modification.",
                    vscpp("br", null),
                    "- If the user has not explicitly mentioned that they are looking for a project or a file, assume that they are asking for a Visual Studio project.",
                    vscpp("br", null),
                    "- Avoid requesting additional information or directly answering the question.",
                    vscpp("br", null),
                    "- Use the template below to report the identified intent, rephrased question, and any application logic or feature that may be relevant.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "# Response Template",
                    vscpp("br", null),
                    "# Intent",
                    vscpp("br", null),
                    "Project|File",
                    vscpp("br", null),
                    "# Question",
                    vscpp("br", null),
                    "Rephrased question here.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "# Examples:",
                    vscpp("br", null),
                    "User: Python game.",
                    vscpp("br", null),
                    "Assistant:",
                    vscpp("br", null),
                    "# Intent",
                    vscpp("br", null),
                    "Project",
                    vscpp("br", null),
                    "# Question",
                    vscpp("br", null),
                    "Create a new Python sample game project.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "User: Node.js server",
                    vscpp("br", null),
                    "Assistant:",
                    vscpp("br", null),
                    "# Intent",
                    vscpp("br", null),
                    "Project",
                    vscpp("br", null),
                    "# Question",
                    vscpp("br", null),
                    "Create a new Node.js development environment.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "User: TS web app",
                    vscpp("br", null),
                    "Assistant:",
                    vscpp("br", null),
                    "# Intent",
                    vscpp("br", null),
                    "Project",
                    vscpp("br", null),
                    "# Question",
                    vscpp("br", null),
                    "Create a new TypeScript project with a basic \"Hello World\" web application.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "User: VS Code extension custom sidebar",
                    vscpp("br", null),
                    "Assistant:",
                    vscpp("br", null),
                    "# Intent",
                    vscpp("br", null),
                    "Project",
                    vscpp("br", null),
                    "# Question",
                    vscpp("br", null),
                    "Create a Visual Studio Code extension sample that adds a custom sidebar.",
                    vscpp("br", null),
                    vscpp("br", null),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null))),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 1, priority: 750 },
                vscpp(customInstructions_1.CustomInstructions, { languageId: undefined, chatVariables: chatVariables })),
            vscpp(chatVariables_1.ChatToolReferences, { priority: 899, flexGrow: 2, promptContext: this.props.promptContext, embeddedInsideUserMessage: false }),
            vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 2, priority: 900, chatVariables: chatVariables, query: query, embeddedInsideUserMessage: false }));
    }
}
exports.NewWorkspaceMetaPrompt = NewWorkspaceMetaPrompt;
//# sourceMappingURL=newWorkspace.js.map