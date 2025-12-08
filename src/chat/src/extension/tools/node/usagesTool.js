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
const map_1 = require("../../../util/vs/base/common/map");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const tag_1 = require("../../prompts/node/base/tag");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolUtils_1 = require("./toolUtils");
let GetUsagesTool = class GetUsagesTool {
    static { this.toolName = toolNames_1.ToolName.Usages; }
    constructor(instantiationService, languageFeaturesService, _promptPathService) {
        this.instantiationService = instantiationService;
        this.languageFeaturesService = languageFeaturesService;
        this._promptPathService = _promptPathService;
    }
    async _getDefinitionLocation(symbolName, filePaths) {
        const seen = new map_1.ResourceSet();
        for (const filePath of filePaths) {
            const uri = (0, toolUtils_1.resolveToolInputPath)(filePath, this._promptPathService);
            if (seen.has(uri)) {
                continue;
            }
            seen.add(uri);
            const symbols = await this.languageFeaturesService.getDocumentSymbols(uri);
            const symbol = symbols.find(value => value.name === symbolName);
            if (symbol) {
                return new vscodeTypes_1.Location(uri, symbol.selectionRange);
            }
        }
    }
    async invoke(options, token) {
        let def;
        if (options.input.filePaths?.length) {
            def = await this._getDefinitionLocation(options.input.symbolName, options.input.filePaths);
        }
        if (!def) {
            const symbols = await this.languageFeaturesService.getWorkspaceSymbols(options.input.symbolName);
            const filePaths = symbols.map(s => this._promptPathService.getFilePath(s.location.uri));
            def = await this._getDefinitionLocation(options.input.symbolName, filePaths);
        }
        if (!def) {
            const message = `Symbol \`${options.input.symbolName}\` not found`;
            const toolResult = new vscodeTypes_1.ExtendedLanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart(message)]);
            toolResult.toolResultMessage = new vscodeTypes_1.MarkdownString(message);
            return toolResult;
        }
        const [definitions, references, implementations] = await Promise.all([
            this.languageFeaturesService.getDefinitions(def.uri, def.range.start),
            this.languageFeaturesService.getReferences(def.uri, def.range.start),
            this.languageFeaturesService.getImplementations(def.uri, def.range.start)
        ]);
        const result = await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, UsagesOutput, { definitions, references, implementations }, options.tokenizationOptions, token);
        const toolResult = new vscodeTypes_1.ExtendedLanguageModelToolResult([new vscodeTypes_1.LanguageModelPromptTsxPart(result)]);
        toolResult.toolResultDetails = references;
        const query = `\`${options.input.symbolName}\``;
        toolResult.toolResultMessage = references.length === 0
            ? new vscodeTypes_1.MarkdownString(l10n.t `Analyzed usages of ${query}, no results`)
            : references.length === 1
                ? new vscodeTypes_1.MarkdownString(l10n.t `Analyzed usages of ${query}, 1 result`)
                : new vscodeTypes_1.MarkdownString(l10n.t `Analyzed usages of ${query}, ${references.length} results`);
        return toolResult;
    }
    prepareInvocation(options, token) {
        const query = `\`${options.input.symbolName}\``;
        return {
            invocationMessage: l10n.t `Analyzing usages of ${query}`,
        };
    }
};
GetUsagesTool = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, languageFeaturesService_1.ILanguageFeaturesService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService)
], GetUsagesTool);
toolsRegistry_1.ToolRegistry.registerTool(GetUsagesTool);
let UsagesOutput = class UsagesOutput extends prompt_tsx_1.PromptElement {
    constructor(props, promptPathRepresentationService) {
        super(props);
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    render() {
        const { references, definitions, implementations } = this.props;
        if (references.length === 0) {
            return vscpp(vscppf, null, "No usages found.");
        }
        function isEqual(a, b) {
            const [uriA, rangeA] = a instanceof vscodeTypes_1.Location ? [a.uri, a.range] : [a.targetUri, a.targetRange];
            const [uriB, rangeB] = b instanceof vscodeTypes_1.Location ? [b.uri, b.range] : [b.targetUri, b.targetRange];
            return uriA.toString() === uriB.toString() && (rangeA.isEqual(rangeB) ||
                rangeA.contains(rangeB) ||
                rangeB.contains(rangeA));
        }
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.TextChunk, null,
                references.length,
                " usages"),
            references.map((ref, i) => {
                let referenceType = 'usage';
                if (definitions.find(candidate => isEqual(candidate, ref))) {
                    referenceType = 'definition';
                }
                else if (implementations.find(candidate => isEqual(candidate, ref))) {
                    referenceType = 'implementation';
                }
                const [uri, range] = ref instanceof vscodeTypes_1.Location ? [ref.uri, ref.range] : [ref.targetUri, ref.targetRange];
                const filePath = this.promptPathRepresentationService.getFilePath(uri);
                return vscpp(vscppf, null,
                    vscpp(tag_1.Tag, { name: referenceType, priority: references.length - i },
                        vscpp("references", { value: [new prompt_tsx_1.PromptReference(new vscodeTypes_1.Location(uri, range), undefined, { isFromTool: true })] }),
                        filePath,
                        ", line ",
                        range.start.line,
                        ", column ",
                        range.start.character),
                    vscpp("br", null));
            }));
    }
};
UsagesOutput = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], UsagesOutput);
//# sourceMappingURL=usagesTool.js.map