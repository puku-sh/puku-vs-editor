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
exports.PromptFileContextContribution = exports.promptFileSelector = void 0;
const vscode = __importStar(require("vscode"));
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const languageContextProviderService_1 = require("../../../platform/languageContextProvider/common/languageContextProviderService");
const logService_1 = require("../../../platform/log/common/logService");
const promptsService_1 = require("../../../platform/promptFiles/common/promptsService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const observableInternal_1 = require("../../../util/vs/base/common/observableInternal");
exports.promptFileSelector = [promptsService_1.PromptFileLangageId.prompt, promptsService_1.PromptFileLangageId.instructions, promptsService_1.PromptFileLangageId.agent];
let PromptFileContextContribution = class PromptFileContextContribution extends lifecycle_1.Disposable {
    constructor(configurationService, logService, experimentationService, endpointProvider, languageContextProviderService) {
        super();
        this.logService = logService;
        this.endpointProvider = endpointProvider;
        this.languageContextProviderService = languageContextProviderService;
        this.models = ['GPT-4.1', 'GPT-4o'];
        this._enableCompletionContext = configurationService.getExperimentBasedConfigObservable(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.PromptFileContext, experimentationService);
        this._register((0, observableInternal_1.autorun)(reader => {
            if (this._enableCompletionContext.read(reader)) {
                this.registration = this.register();
            }
            else if (this.registration) {
                this.registration.then(disposable => disposable.dispose());
                this.registration = undefined;
            }
        }));
    }
    dispose() {
        super.dispose();
        if (this.registration) {
            this.registration.then(disposable => disposable.dispose());
            this.registration = undefined;
        }
    }
    async register() {
        const disposables = new lifecycle_1.DisposableStore();
        try {
            const self = this;
            const resolver = {
                async resolve(request, token) {
                    const [document, position] = self.getDocumentAndPosition(request, token);
                    if (document === undefined || position === undefined) {
                        return [];
                    }
                    const tokenBudget = self.getTokenBudget(document);
                    if (tokenBudget <= 0) {
                        return [];
                    }
                    return self.getContext(document.languageId);
                }
            };
            this.endpointProvider.getAllChatEndpoints().then(endpoints => {
                const modelNames = new Set();
                for (const endpoint of endpoints) {
                    if (endpoint.showInModelPicker) {
                        modelNames.add(endpoint.name);
                    }
                }
                this.models = [...modelNames.keys()];
            });
            const provider = {
                id: 'promptfile-ai-context-provider',
                selector: exports.promptFileSelector,
                resolver: resolver
            };
            const copilotAPI = await this.getCopilotApi();
            if (copilotAPI) {
                disposables.add(copilotAPI.registerContextProvider(provider));
            }
            disposables.add(this.languageContextProviderService.registerContextProvider(provider));
        }
        catch (error) {
            this.logService.error('Error regsistering prompt file context provider:', error);
        }
        return disposables;
    }
    getContext(languageId) {
        switch (languageId) {
            case promptsService_1.PromptFileLangageId.prompt: {
                const toolNamesList = this.getToolNames().join(', ');
                return [
                    {
                        name: 'This is a prompt file. It uses markdown with a YAML front matter header that only supports a limited set of attributes and values. Do not suggest any other properties',
                        value: [promptsService_1.PromptHeaderAttributes.name, promptsService_1.PromptHeaderAttributes.description, promptsService_1.PromptHeaderAttributes.argumentHint, promptsService_1.PromptHeaderAttributes.agent, promptsService_1.PromptHeaderAttributes.model, promptsService_1.PromptHeaderAttributes.tools].join(', '),
                    },
                    {
                        name: '`agent` is optional and must be one of the following values',
                        value: `ask, edit or agent`,
                    },
                    {
                        name: '`model` is optional and must be one of the following values',
                        value: this.models.join(', '),
                    },
                    {
                        name: '`tools` is optional and is an array that can consist of any number of the following values',
                        value: toolNamesList
                    },
                    {
                        name: 'Here is an example of a prompt file',
                        value: [
                            ``,
                            '```md',
                            `---`,
                            `agent: agent`,
                            `description: This prompt is used to generate a new issue template for GitHub repositories.`,
                            `model: ${this.models[0] || 'GPT-4.1'}`,
                            `tools: [${toolNamesList}]`,
                            `---`,
                            `Generate a new issue template for a GitHub repository.`,
                            '```',
                        ].join('\n'),
                    },
                ];
            }
            case promptsService_1.PromptFileLangageId.instructions: {
                return [
                    {
                        name: 'This is a instructions file. It uses markdown with a YAML front matter header that only supports a limited set of attributes and values. Do not suggest any other properties',
                        value: [promptsService_1.PromptHeaderAttributes.name, promptsService_1.PromptHeaderAttributes.description, promptsService_1.PromptHeaderAttributes.applyTo].join(', ')
                    },
                    {
                        name: '`applyTo` is one or more glob patterns that specify which files the instructions apply to',
                        value: `**`,
                    },
                    {
                        name: 'Here is an example of an instruction file',
                        value: [
                            ``,
                            '```md',
                            `---`,
                            `description: This file describes the TypeScript code style for the project.`,
                            `applyTo: **/*.ts, **/*.js`,
                            `---`,
                            `For private fields, start the field name with an underscore (_).`,
                            '```',
                        ].join('\n'),
                    },
                ];
            }
            case promptsService_1.PromptFileLangageId.agent: {
                const toolNamesList = this.getToolNames().join(', ');
                return [
                    {
                        name: 'This is a custom agent file. It uses markdown with a YAML front matter header that only supports a limited set of attributes and values. Do not suggest any other properties',
                        value: [promptsService_1.PromptHeaderAttributes.name, promptsService_1.PromptHeaderAttributes.description, promptsService_1.PromptHeaderAttributes.argumentHint, promptsService_1.PromptHeaderAttributes.target, promptsService_1.PromptHeaderAttributes.model, promptsService_1.PromptHeaderAttributes.tools, promptsService_1.PromptHeaderAttributes.handOffs].join(', '),
                    },
                    {
                        name: '`model` is optional and must be one of the following values',
                        value: this.models.join(', '),
                    },
                    {
                        name: '`tools` is optional and is an array that can consist of any number of the following values',
                        value: `[${toolNamesList}]`,
                    },
                    {
                        name: '`target` is optional and must be one of the following values',
                        value: `vscode, github-copilot`,
                    },
                    {
                        name: '`handoffs` is optional and is a sequence of mappings with `label`, `agent`, `prompt` and `send` properties',
                        value: [
                            `handoffs:`,
                            `  - label: Start Implementation`,
                            `    agent: agent`,
                            `    prompt: Implement the plan`,
                            `    send: true`,
                        ].join('\n'),
                    },
                    {
                        name: 'Here is an example of a custom agent file',
                        value: [
                            ``,
                            '```md',
                            `---`,
                            `description: This custom agent researches and plans new features for VS Code extensions.`,
                            `model: GPT-4.1`,
                            `tools: [${toolNamesList}]`,
                            `handoffs:`,
                            `  - label: Start Implementation`,
                            `    agent: agent`,
                            `    prompt: Implement the plan`,
                            `    send: true`,
                            `---`,
                            `First come up with a plan for the new feature. Write a todo list of tasks to complete the feature.`,
                            '```',
                        ].join('\n'),
                    },
                ];
            }
            default:
                return [];
        }
    }
    getToolNames() {
        return ['edit', 'runNotebooks', 'search', 'new', 'runCommands', 'runTasks', 'runSubagent', 'usages', 'vscodeAPI', 'problems', 'changes', 'testFailure', 'openSimpleBrowser', 'fetch', 'githubRepo', 'extensions', 'todos'];
    }
    async getCopilotApi() {
        const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
        if (copilotExtension === undefined) {
            this.logService.error('Copilot extension not found');
            return undefined;
        }
        try {
            const api = await copilotExtension.activate();
            return api.getContextProviderAPI('v1');
        }
        catch (error) {
            if (error instanceof Error) {
                this.logService.error('Error activating Copilot extension:', error.message);
            }
            else {
                this.logService.error('Error activating Copilot extension: Unknown error.');
            }
            return undefined;
        }
    }
    getTokenBudget(document) {
        return Math.trunc((8 * 1024) - (document.getText().length / 4) - 256);
    }
    getDocumentAndPosition(request, token) {
        let document;
        if (vscode.window.activeTextEditor?.document.uri.toString() === request.documentContext.uri) {
            document = vscode.window.activeTextEditor.document;
        }
        else {
            document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === request.documentContext.uri);
        }
        if (document === undefined) {
            return [undefined, undefined];
        }
        const requestPos = request.documentContext.position;
        const position = requestPos !== undefined ? new vscode.Position(requestPos.line, requestPos.character) : document.positionAt(request.documentContext.offset);
        if (document.version > request.documentContext.version) {
            if (!token?.isCancellationRequested) {
            }
            return [undefined, undefined];
        }
        if (document.version < request.documentContext.version) {
            return [undefined, undefined];
        }
        return [document, position];
    }
};
exports.PromptFileContextContribution = PromptFileContextContribution;
exports.PromptFileContextContribution = PromptFileContextContribution = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, logService_1.ILogService),
    __param(2, nullExperimentationService_1.IExperimentationService),
    __param(3, endpointProvider_1.IEndpointProvider),
    __param(4, languageContextProviderService_1.ILanguageContextProviderService)
], PromptFileContextContribution);
//# sourceMappingURL=promptFileContextService.js.map