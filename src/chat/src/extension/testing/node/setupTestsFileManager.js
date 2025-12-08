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
exports.WorkspaceMutationManager = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const parserService_1 = require("../../../platform/parser/node/parserService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const iterator_1 = require("../../../util/vs/base/common/iterator");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const intents_1 = require("../../prompt/node/intents");
const copilotIdentity_1 = require("../../prompts/node/base/copilotIdentity");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const responseTranslationRules_1 = require("../../prompts/node/base/responseTranslationRules");
const safetyRules_1 = require("../../prompts/node/base/safetyRules");
const patchEditGeneration_1 = require("../../prompts/node/codeMapper/patchEditGeneration");
const summarizeDocumentHelpers_1 = require("../../prompts/node/inline/summarizedDocument/summarizeDocumentHelpers");
const safeElements_1 = require("../../prompts/node/panel/safeElements");
const KEEP_LAST_N = 5;
let WorkspaceMutationManager = class WorkspaceMutationManager {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
        this.requests = new Map();
    }
    create(requestId, options) {
        const mut = this.instantiationService.createInstance(WorkspaceMutation, options);
        this.requests.set(requestId, mut);
        if (this.requests.size > KEEP_LAST_N) {
            this.requests.delete(iterator_1.Iterable.first(this.requests.keys()));
        }
        return mut;
    }
    get(requestId) {
        const req = this.requests.get(requestId);
        if (!req) {
            throw new Error(l10n.t(`No request found, or it has expired. Please re-submit your query.`));
        }
        return req;
    }
};
exports.WorkspaceMutationManager = WorkspaceMutationManager;
exports.WorkspaceMutationManager = WorkspaceMutationManager = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], WorkspaceMutationManager);
let WorkspaceMutation = class WorkspaceMutation {
    constructor(opts, fileSystemService, endpointProvider, instantiationService, workspaceService, promptPathRepresentationService) {
        this.opts = opts;
        this.fileSystemService = fileSystemService;
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.fileDescriptions = this.getFileDescriptions();
        this.fileContents = new Map();
        this.applied = false;
        this.fileDescriptions = this.getFileDescriptions();
    }
    /** @inheritdoc */
    get(file) {
        file = file.replaceAll('\\', '/').replace(/^\//, '');
        const res = this.getInner(file);
        // optimisiticly pre-fetch for a case of a user going through the files in sequence
        const index = this.opts.files.indexOf(file);
        if (index !== -1 && index < this.opts.files.length - 1) {
            res.then(() => this.getInner(this.opts.files[index + 1]));
        }
        return res;
    }
    /** @inheritdoc */
    async apply(progress, token) {
        if (this.applied) {
            throw new Error(l10n.t('Edits have already been applied'));
        }
        try {
            this.applied = true;
            for (const file of this.opts.files) {
                if (token.isCancellationRequested) {
                    return;
                }
                progress?.report({ message: l10n.t('Generating {0}', file) });
                const contents = await this.getInner(file);
                await this.fileSystemService.writeFile(uri_1.URI.joinPath(this.opts.baseURI, file), new TextEncoder().encode(contents));
            }
            progress?.report({ message: l10n.t('Edits applied successfully') });
        }
        catch (e) {
            this.applied = false;
            throw e;
        }
    }
    async getInner(file) {
        const prev = this.fileContents.get(file);
        if (prev) {
            return prev;
        }
        const promise = this.generateContent(file);
        this.fileContents.set(file, promise);
        return promise;
    }
    async generateContent(file) {
        const descriptions = await this.fileDescriptions;
        let document;
        try {
            document = await this.workspaceService.openTextDocumentAndSnapshot(uri_1.URI.joinPath(this.opts.baseURI, file));
        }
        catch {
            // ignored
        }
        const originalText = document?.getText();
        const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, WorkspaceMutationFilePrompt, {
            file,
            document,
            allInstructions: descriptions?.response,
            fileTree: this.opts.fileTree,
            query: this.opts.query,
            instructionsForThisFile: descriptions?.perFile.find(f => f.file === file)?.description,
        });
        const prompt = await promptRenderer.render();
        const fetchResult = await endpoint
            .makeChatRequest('workspaceMutationFileGenerator', prompt.messages, undefined, cancellation_1.CancellationToken.None, commonTypes_1.ChatLocation.Other);
        if (fetchResult.type !== commonTypes_1.ChatFetchResponseType.Success) {
            this.fileContents.delete(file);
            throw new Error(l10n.t('Encountered an error while generating the file: ({0}) {1}', fetchResult.type, fetchResult.reason));
        }
        if (originalText && document) {
            const reply = (0, patchEditGeneration_1.getPatchEditReplyProcessor)(this.promptPathRepresentationService).process(fetchResult.value, originalText, document.uri);
            return (0, intents_1.applyEdits)(originalText, reply.edits);
        }
        return fetchResult.value;
    }
    async getFileDescriptions() {
        const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, WorkspaceMutationInstructionsPrompt, {
            fileTreeStr: this.opts.fileTree,
            query: this.opts.query,
        });
        const prompt = await promptRenderer.render();
        const fetchResult = await endpoint
            .makeChatRequest('workspaceMutationSummarizer', prompt.messages, undefined, cancellation_1.CancellationToken.None, commonTypes_1.ChatLocation.Other);
        if (fetchResult.type !== commonTypes_1.ChatFetchResponseType.Success) {
            return undefined;
        }
        const out = [];
        for (const [, file, description] of fetchResult.value.matchAll(/^`?(.*?)`?:\s*(.+)$/gm)) {
            out.push({ file, description });
        }
        return { perFile: out, response: fetchResult.value };
    }
};
WorkspaceMutation = __decorate([
    __param(1, fileSystemService_1.IFileSystemService),
    __param(2, endpointProvider_1.IEndpointProvider),
    __param(3, instantiation_1.IInstantiationService),
    __param(4, workspaceService_1.IWorkspaceService),
    __param(5, promptPathRepresentationService_1.IPromptPathRepresentationService)
], WorkspaceMutation);
class WorkspaceMutationInstructionsPrompt extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a VS Code assistant. Your job is to generate the project specification when given the user description and file tree structure of the project that a user wants to create. ",
                vscpp("br", null),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.SafetyRules, null),
                vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                vscpp("br", null),
                "Additional Rules",
                vscpp("br", null),
                "You will be given a user query and a tree of files they wish to edit or create in order to accomplish a task. Think step by step and respond with a text description that lists and summarizes what needs to be done in each file to accomplish the user's task.",
                vscpp("br", null),
                "Below you will find a set of examples of what you should respond with. Please follow these examples as closely as possible.",
                vscpp("br", null),
                vscpp("br", null),
                "## Valid question",
                vscpp("br", null),
                "User: I want to: add the sequelize ORM to my project and add a user model",
                vscpp("br", null),
                "This is the project tree structure:",
                vscpp("br", null),
                "```markdown ",
                vscpp("br", null),
                "my-express-app",
                vscpp("br", null),
                "\u251C\u2500\u2500 src",
                vscpp("br", null),
                "\u2502   \u2514\u2500\u2500 models",
                vscpp("br", null),
                "\u2502       \u2514\u2500\u2500 user.ts",
                vscpp("br", null),
                "\u251C\u2500\u2500 package.json",
                vscpp("br", null),
                "\u2514\u2500\u2500 README.md",
                vscpp("br", null),
                "```",
                vscpp("br", null),
                "## Valid response",
                vscpp("br", null),
                "`src/models/user.ts`: This file defines and exports the User model for use in the application.",
                vscpp("br", null),
                "`src/routes/index.ts`: This file exports a function `setRoutes` which sets up the routes for the application. It uses the `IndexController` to handle the root route.",
                vscpp("br", null),
                "`package.json`: We need to edit the package.json to ensure Sequelize is defined as a dependency",
                vscpp("br", null),
                "`README.md`: We should add documentation to the readme file to make consumers aware of the new setup steps.",
                vscpp("br", null)),
            vscpp(prompt_tsx_1.UserMessage, { priority: 900 },
                "I want to: ",
                this.props.query,
                vscpp("br", null),
                "This is the project tree structure:",
                vscpp("br", null),
                "```markdown' ",
                vscpp("br", null),
                this.props.fileTreeStr,
                vscpp("br", null),
                "```",
                vscpp("br", null))));
    }
}
class WorkspaceMutationFilePrompt extends prompt_tsx_1.PromptElement {
    render() {
        const { file, query, fileTree, allInstructions, instructionsForThisFile, document } = this.props;
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a VS Code assistant. Your job is to generate the project specification when given the user description and file tree structure of the project that a user wants to create. ",
                vscpp("br", null),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.SafetyRules, null),
                vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                vscpp("br", null),
                "Additional Rules",
                vscpp("br", null),
                "The user will describe the task they're trying to accomplish, and ask you to generate or edit a file in persuit of that task.",
                vscpp("br", null),
                document ? vscpp(patchEditGeneration_1.PatchEditRules, null) : vscpp(vscppf, null,
                    "Print the entire contents of the file you propose.",
                    vscpp("br", null),
                    "If asked to generate a test file, create a file with a self-contained 'hello world' test case without dependency on any other files or imports aside from the testing framwork.",
                    vscpp("br", null)),
                "Do not include comments in json files.",
                vscpp("br", null),
                "Do not use code blocks or backticks.",
                vscpp("br", null),
                "Do not include any other explanation.",
                vscpp("br", null),
                vscpp("br", null),
                document ? vscpp(patchEditGeneration_1.PatchEditExamplePatch, { changes: [{
                            uri: uri_1.URI.file('/package.json'),
                            find: ['"dependencies": {', '  "typescript": "^4.5.4",'],
                            replace: ['"dependencies": {', '  "mocha": "latest"', '  "typescript": "^4.5.4",'],
                        }] }) : vscpp(vscppf, null,
                    "# Example",
                    vscpp("br", null),
                    "## Question:",
                    vscpp("br", null),
                    "I want to: set up mocha in my workspace",
                    vscpp("br", null),
                    "Please print the contents of the file `src/index.test.ts`",
                    vscpp("br", null),
                    "## Response:",
                    `
const assert = require('assert');
test('hello world!', () => {
	assert.strictEqual(1 + 1, 2);
});
`)),
            vscpp(prompt_tsx_1.UserMessage, { priority: 900 },
                "I want to: ",
                query,
                vscpp("br", null),
                "Please print the contents of the file `",
                file,
                "`",
                vscpp("br", null),
                instructionsForThisFile
                    ? vscpp(vscppf, null,
                        "Description of this file: ",
                        instructionsForThisFile)
                    : vscpp(vscppf, null,
                        "Here are the files in my workspace, including this one: ",
                        allInstructions,
                        "`"),
                vscpp("br", null),
                "This is the project tree structure:",
                vscpp("br", null),
                "```filetree",
                vscpp("br", null),
                fileTree,
                vscpp("br", null),
                "```",
                vscpp("br", null),
                vscpp("br", null),
                document && vscpp(WorkspaceMutationFileContents, { flexGrow: 1, document: document }))));
    }
}
let WorkspaceMutationFileContents = class WorkspaceMutationFileContents extends prompt_tsx_1.PromptElement {
    constructor(props, parserService) {
        super(props);
        this.parserService = parserService;
    }
    async render(state, sizing) {
        const { document } = this.props;
        const codeExcerpt = await (0, summarizeDocumentHelpers_1.summarizeDocument)(this.parserService, document, undefined, new vscodeTypes_1.Range(0, 0, 0, 0), sizing.tokenBudget * (2 / 3));
        return vscpp(safeElements_1.CodeBlock, { uri: document.uri, languageId: document.languageId, code: codeExcerpt.text });
    }
};
WorkspaceMutationFileContents = __decorate([
    __param(1, parserService_1.IParserService)
], WorkspaceMutationFileContents);
//# sourceMappingURL=setupTestsFileManager.js.map