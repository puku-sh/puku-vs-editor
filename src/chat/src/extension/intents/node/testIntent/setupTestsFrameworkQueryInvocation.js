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
exports.SetupTestsFrameworkQueryInvocation = exports.SetupTestsFrameworkQueryInvocationRaw = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const runCommandExecutionService_1 = require("../../../../platform/commands/common/runCommandExecutionService");
const setupTestExtensions_1 = require("../../../../platform/testing/common/setupTestExtensions");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const streamingGrammar_1 = require("../../../prompt/common/streamingGrammar");
const copilotIdentity_1 = require("../../../prompts/node/base/copilotIdentity");
const promptRenderer_1 = require("../../../prompts/node/base/promptRenderer");
const responseTranslationRules_1 = require("../../../prompts/node/base/responseTranslationRules");
const safetyRules_1 = require("../../../prompts/node/base/safetyRules");
const chatVariables_1 = require("../../../prompts/node/panel/chatVariables");
const editorIntegrationRules_1 = require("../../../prompts/node/panel/editorIntegrationRules");
const workspaceStructure_1 = require("../../../prompts/node/panel/workspace/workspaceStructure");
let SetupTestsFrameworkQueryInvocationRaw = class SetupTestsFrameworkQueryInvocationRaw {
    constructor(endpoint, documentContext, instantiationService, commandService) {
        this.endpoint = endpoint;
        this.documentContext = documentContext;
        this.instantiationService = instantiationService;
        this.commandService = commandService;
    }
    async buildPrompt(context, progress, token) {
        const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, this.endpoint, SetupTestsPrompt, {
            endpoint: this.endpoint,
            promptContext: context,
            document: this.documentContext?.document,
            selection: this.documentContext?.selection,
        });
        return renderer.render(progress, token);
    }
    async processResponse(context, inputStream, outputStream, token) {
        const pushTokens = (tokens) => {
            for (const token of tokens) {
                if (token.state === 0 /* State.Reasoning */ && token.transitionTo === undefined) {
                    outputStream.markdown(token.token);
                }
            }
        };
        const grammar = new streamingGrammar_1.StreamingGrammar(0 /* State.Reasoning */, {
            [0 /* State.Reasoning */]: { [frameworkPrefix]: 1 /* State.Frameworks */ },
        });
        for await (const { delta } of inputStream) {
            if (token.isCancellationRequested) {
                return;
            }
            pushTokens(grammar.append(delta.text));
        }
        pushTokens(grammar.flush());
        const frameworks = grammar.accumulate(undefined, undefined, 1 /* State.Frameworks */)
            .split('\n')
            .map(line => line.replace(frameworkPrefix, '').trim())
            .filter(l => !!l);
        if (frameworks.length) {
            outputStream.confirmation(l10n.t('Pick a testing framework'), l10n.t('Pick from these options, or use chat to tell me what you\'d prefer:'), undefined, frameworks);
        }
        else {
            outputStream.markdown(l10n.t('Use chat to tell me which framework you\'d prefer.'));
        }
        await this.commandService.executeCommand('workbench.action.chat.open', {
            query: `@${"workspace" /* Intent.Workspace */} /${"setupTests" /* Intent.SetupTests */} `,
            isPartialQuery: true,
        });
    }
};
exports.SetupTestsFrameworkQueryInvocationRaw = SetupTestsFrameworkQueryInvocationRaw;
exports.SetupTestsFrameworkQueryInvocationRaw = SetupTestsFrameworkQueryInvocationRaw = __decorate([
    __param(2, instantiation_1.IInstantiationService),
    __param(3, runCommandExecutionService_1.IRunCommandExecutionService)
], SetupTestsFrameworkQueryInvocationRaw);
/**
 * Asks the user what framework they want to use to set up their tests.
 */
let SetupTestsFrameworkQueryInvocation = class SetupTestsFrameworkQueryInvocation extends SetupTestsFrameworkQueryInvocationRaw {
    constructor(intent, endpoint, location, documentContext, instantiationService, commandService) {
        super(endpoint, documentContext, instantiationService, commandService);
        this.intent = intent;
        this.location = location;
    }
};
exports.SetupTestsFrameworkQueryInvocation = SetupTestsFrameworkQueryInvocation;
exports.SetupTestsFrameworkQueryInvocation = SetupTestsFrameworkQueryInvocation = __decorate([
    __param(4, instantiation_1.IInstantiationService),
    __param(5, runCommandExecutionService_1.IRunCommandExecutionService)
], SetupTestsFrameworkQueryInvocation);
const frameworkPrefix = 'FRAMEWORK: ';
class SetupTestsPrompt extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const { query, chatVariables } = this.props.promptContext;
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
                "1. Examine the workspace structure the user is giving you.",
                vscpp("br", null),
                "2. Determine the best testing frameworks that should be used for the project.",
                vscpp("br", null),
                "3. Give a brief explanation why a user would choose one framework over the other, but be concise and never give the user steps to set up the framework.",
                vscpp("br", null),
                "4. If you're unsure which specific framework is best, you can suggest multiple frameworks.",
                vscpp("br", null),
                "5. Suggest only frameworks that are used to run tests. Do not suggest things like assertion libraries or build tools.",
                vscpp("br", null),
                "6. After determining the best framework to use, write out the name of 1 to 3 suggested frameworks prefixed by the phrase \"",
                frameworkPrefix,
                "\", for example: \"",
                frameworkPrefix,
                "vitest\".",
                vscpp("br", null),
                vscpp("br", null),
                "DO NOT mention that you cannot read files in the workspace.",
                vscpp("br", null),
                "DO NOT ask the user to provide additional information about files in the workspace.",
                vscpp("br", null),
                vscpp("br", null),
                "# Example",
                vscpp("br", null),
                "## Question:",
                vscpp("br", null),
                "I am working in a workspace that has the following structure:",
                vscpp("br", null),
                `\`\`\`
src/
  index.ts
package.json
tsconfig.json
vite.config.ts
\`\`\``,
                vscpp("br", null),
                "## Response:",
                vscpp("br", null),
                "Because you have a `vite.config.ts` file, it looks like you're working on a browser or Node.js application. If you're working on a browser application, I recommend using Playwright. Otherwise, Vitest is a good choice for Node.js.",
                vscpp("br", null),
                frameworkPrefix,
                "playwright",
                vscpp("br", null),
                frameworkPrefix,
                "vitest",
                vscpp("br", null)),
            this.props.document && vscpp(PreferredExtensions, { document: this.props.document }),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 2 },
                vscpp(SetupWorkspaceStructure, null)),
            vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 2, priority: 900, chatVariables: chatVariables, query: query, embeddedInsideUserMessage: false }));
    }
}
class SetupWorkspaceStructure extends prompt_tsx_1.PromptElement {
    render(_state, sizing) {
        return vscpp(workspaceStructure_1.WorkspaceStructure, { maxSize: (sizing.tokenBudget * 4) / 3 });
    }
}
class PreferredExtensions extends prompt_tsx_1.PromptElement {
    render() {
        const extensions = setupTestExtensions_1.testExtensionsForLanguage.get(this.props.document.languageId);
        if (!extensions?.perFramework) {
            return;
        }
        return vscpp(prompt_tsx_1.SystemMessage, { priority: 600 },
            "These are the preferred test frameworks for ",
            this.props.document.languageId,
            ":",
            vscpp("br", null),
            vscpp("br", null),
            [...extensions.perFramework.keys()].map(f => `- ${f}`).join('\n'),
            vscpp("br", null));
    }
}
//# sourceMappingURL=setupTestsFrameworkQueryInvocation.js.map