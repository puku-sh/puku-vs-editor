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
exports.CodebaseTool = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const telemetryCorrelationId_1 = require("../../../util/common/telemetryCorrelationId");
const types_1 = require("../../../util/common/types");
const path_1 = require("../../../util/vs/base/common/path");
const uri_1 = require("../../../util/vs/base/common/uri");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const chatVariablesCollection_1 = require("../../prompt/common/chatVariablesCollection");
const conversation_1 = require("../../prompt/common/conversation");
const codebaseToolCalling_1 = require("../../prompt/node/codebaseToolCalling");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const toolCalling_1 = require("../../prompts/node/panel/toolCalling");
const workspaceContext_1 = require("../../prompts/node/panel/workspace/workspaceContext");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolUtils_1 = require("./toolUtils");
let CodebaseTool = class CodebaseTool {
    static { this.toolName = toolNames_1.ToolName.Codebase; }
    constructor(instantiationService, configurationService, authenticationService) {
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.authenticationService = authenticationService;
    }
    async invoke(options, token) {
        if (this._input && this._isCodebaseAgentCall(options)) {
            const input = this._input;
            this._input = undefined; // consumed
            return this.invokeCodebaseAgent(input, token);
        }
        if (!options.input.query) {
            throw new Error('Invalid input');
        }
        (0, toolUtils_1.checkCancellation)(token);
        let references = [];
        const id = (0, uuid_1.generateUuid)();
        const promptTsxResult = await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, WorkspaceContextWrapper, {
            telemetryInfo: new telemetryCorrelationId_1.TelemetryCorrelationId('codebaseTool', id),
            promptContext: {
                requestId: id,
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([]),
                query: options.input.query,
                history: [],
            },
            maxResults: 32,
            include: {
                workspaceChunks: true,
                workspaceStructure: options.input.includeFileStructure ?? false
            },
            scopedDirectories: options.input.scopedDirectories?.map(dir => uri_1.URI.file(dir)),
            referencesOut: references,
            isToolCall: true,
            lines1Indexed: true,
            absolutePaths: true,
            priority: 100,
        }, undefined, token);
        const result = new vscodeTypes_1.ExtendedLanguageModelToolResult([
            new vscodeTypes_1.LanguageModelPromptTsxPart(promptTsxResult)
        ]);
        references = (0, conversation_1.getUniqueReferences)(references);
        result.toolResultMessage = references.length === 0 ?
            new vscodeTypes_1.MarkdownString(l10n.t `Searched ${this.getDisplaySearchTarget(options.input)} for "${options.input.query}", no results`) :
            references.length === 1 ?
                new vscodeTypes_1.MarkdownString(l10n.t `Searched ${this.getDisplaySearchTarget(options.input)} for "${options.input.query}", 1 result`) :
                new vscodeTypes_1.MarkdownString(l10n.t `Searched ${this.getDisplaySearchTarget(options.input)} for "${options.input.query}", ${references.length} results`);
        result.toolResultDetails = references
            .map(r => r.anchor)
            .filter(r => (0, types_1.isUri)(r) || (0, types_1.isLocation)(r));
        return result;
    }
    async invokeCodebaseAgent(input, token) {
        if (!input.request || !input.conversation) {
            throw new Error('Invalid input');
        }
        const codebaseTool = this.instantiationService.createInstance(codebaseToolCalling_1.CodebaseToolCallingLoop, {
            toolCallLimit: 5,
            conversation: input.conversation,
            request: input.request,
            location: input.request.location,
        });
        const toolCallLoopResult = await codebaseTool.run(undefined, token);
        const promptElement = await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, toolCalling_1.ToolCallResultWrapper, { toolCallResults: toolCallLoopResult.toolCallResults });
        return { content: [new vscodeTypes_1.LanguageModelPromptTsxPart(promptElement)] };
    }
    async provideInput(promptContext) {
        this._input = promptContext; // TODO@joyceerhl @roblourens HACK: Avoid types in the input being serialized and not deserialized when they go through invokeTool
        return promptContext;
    }
    prepareInvocation(options, token) {
        if (this._input && this._isCodebaseAgentCall(options)) {
            return {
                presentation: 'hidden'
            };
        }
        return {
            invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Searching ${this.getDisplaySearchTarget(options.input)} for "${options.input.query}"`),
        };
    }
    getDisplaySearchTarget(input) {
        let targetSearch;
        if (input.scopedDirectories && input.scopedDirectories.length === 1) {
            targetSearch = `${(0, path_1.basename)(input.scopedDirectories[0])}`;
        }
        else if (input.scopedDirectories && input.scopedDirectories.length > 1) {
            targetSearch = l10n.t("{0} directories", input.scopedDirectories.length);
        }
        else {
            targetSearch = l10n.t("codebase");
        }
        return targetSearch;
    }
    _isCodebaseAgentCall(options) {
        const input = options.input;
        const agentEnabled = this.configurationService.getConfig(configurationService_1.ConfigKey.CodeSearchAgentEnabled);
        const noScopedDirectories = input.scopedDirectories === undefined || input.scopedDirectories.length === 0;
        // When anonymous (no GitHub session), always force agent path so we avoid relying on semantic index features.
        const isAnonymous = !this.authenticationService.anyGitHubSession;
        return (isAnonymous || agentEnabled) && noScopedDirectories;
    }
};
exports.CodebaseTool = CodebaseTool;
exports.CodebaseTool = CodebaseTool = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, configurationService_1.IConfigurationService),
    __param(2, authentication_1.IAuthenticationService)
], CodebaseTool);
toolsRegistry_1.ToolRegistry.registerTool(CodebaseTool);
class WorkspaceContextWrapper extends prompt_tsx_1.PromptElement {
    constructor(props) {
        super(props);
    }
    render() {
        // Main limit is set via maxChunks. Set a TokenLimit just to be sure.
        return vscpp(prompt_tsx_1.TokenLimit, { max: 28_000 },
            vscpp(workspaceContext_1.WorkspaceContext, { ...this.props }));
    }
}
//# sourceMappingURL=codebaseTool.js.map