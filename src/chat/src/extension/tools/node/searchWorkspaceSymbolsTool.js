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
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const languageFeaturesService_1 = require("../../../platform/languages/common/languageFeaturesService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const tag_1 = require("../../prompts/node/base/tag");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolUtils_1 = require("./toolUtils");
let SearchWorkspaceSymbolsTool = class SearchWorkspaceSymbolsTool {
    static { this.toolName = toolNames_1.ToolName.SearchWorkspaceSymbols; }
    constructor(instantiationService, languageFeaturesService) {
        this.instantiationService = instantiationService;
        this.languageFeaturesService = languageFeaturesService;
    }
    async invoke(options, token) {
        const symbols = await this.languageFeaturesService.getWorkspaceSymbols(options.input.symbolName);
        (0, toolUtils_1.checkCancellation)(token);
        const result = await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, WorkspaceSymbolSearchOutput, { symbols }, options.tokenizationOptions, token);
        const toolResult = new vscodeTypes_1.ExtendedLanguageModelToolResult([
            new vscodeTypes_1.LanguageModelPromptTsxPart(result)
        ]);
        const query = `\`${options.input.symbolName}\``;
        toolResult.toolResultMessage = symbols.length === 0 ?
            new vscodeTypes_1.MarkdownString(l10n.t `Searched for ${query}, no results`) :
            symbols.length === 1 ?
                new vscodeTypes_1.MarkdownString(l10n.t `Searched for ${query}, 1 result`) :
                new vscodeTypes_1.MarkdownString(l10n.t `Searched for ${query}, ${symbols.length} results`);
        return toolResult;
    }
    prepareInvocation(options, token) {
        const query = `\`${options.input.symbolName}\``;
        return {
            invocationMessage: l10n.t `Searching for ${query}`,
            pastTenseMessage: l10n.t `Searched for ${query}`
        };
    }
};
SearchWorkspaceSymbolsTool = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, languageFeaturesService_1.ILanguageFeaturesService)
], SearchWorkspaceSymbolsTool);
toolsRegistry_1.ToolRegistry.registerTool(SearchWorkspaceSymbolsTool);
let WorkspaceSymbolSearchOutput = class WorkspaceSymbolSearchOutput extends prompt_tsx_1.PromptElement {
    constructor(props, promptPathRepresentationService) {
        super(props);
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    async render(state, sizing, progress, token) {
        if (!this.props.symbols.length) {
            return vscpp(vscppf, null, "No symbols found.");
        }
        const symbols = this.props.symbols.slice(0, 20);
        const maxResultsText = this.props.symbols.length > 20 ? ` (additional ${this.props.symbols.length - symbols.length} results omitted)` : '';
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.TextChunk, { priority: 20 },
                this.props.symbols.length,
                " total result",
                this.props.symbols.length === 1 ? '' : 's',
                maxResultsText),
            symbols.map((s, i) => (vscpp(vscppf, null,
                vscpp(tag_1.Tag, { name: 'symbol', priority: 20 - i },
                    vscpp("references", { value: [new prompt_tsx_1.PromptReference(s.location, undefined, { isFromTool: true })] }),
                    "From ",
                    this.promptPathRepresentationService.getFilePath(s.location.uri),
                    ", lines ",
                    s.location.range.start.line,
                    " to ",
                    s.location.range.end.line,
                    ":",
                    vscpp("br", null),
                    "Symbol: ",
                    s.name,
                    ", containing symbol: ",
                    s.containerName),
                vscpp("br", null)))),
            symbols.length < this.props.symbols.length && vscpp(prompt_tsx_1.TextChunk, { priority: 20 }, "..."));
    }
};
WorkspaceSymbolSearchOutput = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], WorkspaceSymbolSearchOutput);
//# sourceMappingURL=searchWorkspaceSymbolsTool.js.map