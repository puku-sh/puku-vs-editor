"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const vscode_1 = require("vscode");
const logService_1 = require("../../../platform/log/common/logService");
const urlChunkEmbeddingsIndex_1 = require("../../../platform/urlChunkSearch/node/urlChunkEmbeddingsIndex");
const lazy_1 = require("../../../util/vs/base/common/lazy");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const languageModelChatMessageHelpers_1 = require("../../conversation/common/languageModelChatMessageHelpers");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const toolCalling_1 = require("../../prompts/node/panel/toolCalling");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
/**
 * The internal tool that we wrap.
 */
const internalToolName = 'vscode_fetchWebPage_internal';
/**
 * A thin wrapper tool to provide indexing & prompt-tsx priority on top of the internal tool.
 */
let FetchWebPageTool = class FetchWebPageTool {
    constructor(_instantiationService, _logService) {
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._index = new lazy_1.Lazy(() => _instantiationService.createInstance(urlChunkEmbeddingsIndex_1.UrlChunkEmbeddingsIndex));
    }
    static { this.toolName = toolNames_1.ToolName.FetchWebPage; }
    prepareInvocation(_options, _token) {
        // The Core version of this tool handles the confirmation message & other messages
        this._logService.trace('FetchWebPageTool: prepareInvocation');
        return {
            presentation: 'hidden'
        };
    }
    async invoke(options, token) {
        this._logService.trace('FetchWebPageTool: invoke');
        const tool = vscode_1.lm.tools.find(t => t.name === internalToolName);
        if (!tool) {
            throw new Error('Tool not found');
        }
        const { urls } = options.input;
        const { content } = await vscode_1.lm.invokeTool(internalToolName, options, token);
        if (urls.length !== content.length) {
            this._logService.error(`Expected ${urls.length} responses but got ${content.length}`);
            return new vscode_1.LanguageModelToolResult([
                new vscode_1.LanguageModelTextPart('Error: I did not receive the expected number of responses from the tool.')
            ]);
        }
        const invalidUrls = [];
        const validTextContent = [];
        const imageResults = [];
        for (let i = 0; i < urls.length; i++) {
            try {
                const uri = uri_1.URI.parse(urls[i]);
                const contentPart = content[i];
                if (options.model?.capabilities.supportsImageToText && (0, languageModelChatMessageHelpers_1.isImageDataPart)(contentPart)) {
                    // Handle image data - don't chunk it, just pass it through
                    imageResults.push({ uri, imagePart: contentPart });
                }
                else if (contentPart instanceof vscode_1.LanguageModelTextPart) {
                    // Handle text content - this will be chunked
                    validTextContent.push({ uri, content: contentPart.value });
                }
                else {
                    // Handle other data parts as text if they have a value property
                    const textValue = contentPart.value;
                    if (typeof textValue === 'string') {
                        validTextContent.push({ uri, content: textValue });
                    }
                    else {
                        this._logService.warn(`Unsupported content type at index ${i}: ${urls[i]}`);
                        invalidUrls.push(urls[i]);
                    }
                }
            }
            catch (error) {
                this._logService.error(`Invalid URL at index ${i}: ${urls[i]}`, error);
                invalidUrls.push(urls[i]);
            }
        }
        const filesAndTheirChunks = await this._index.value.findInUrls(validTextContent, options.input.query ?? '', token);
        const webPageResults = new Array();
        for (let i = 0; i < validTextContent.length; i++) {
            const file = validTextContent[i];
            const chunks = filesAndTheirChunks[i];
            const sumScore = chunks.reduce((acc, chunk) => acc + (chunk.distance?.value ?? 0), 0);
            webPageResults.push({ uri: file.uri, chunks, sumScore });
        }
        // Sort by sumScore descending
        webPageResults.sort((a, b) => b.sumScore - a.sumScore);
        const element = await (0, promptRenderer_1.renderPromptElementJSON)(this._instantiationService, WebPageResults, { webPageResults, imageResults, invalidUrls }, options.tokenizationOptions, token);
        return new vscode_1.LanguageModelToolResult([new vscode_1.LanguageModelPromptTsxPart(element)]);
    }
};
FetchWebPageTool = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, logService_1.ILogService)
], FetchWebPageTool);
toolsRegistry_1.ToolRegistry.registerTool(FetchWebPageTool);
class WebPageResults extends prompt_tsx_1.PromptElement {
    render(_state, _sizing) {
        return vscpp(vscppf, null,
            this.props.webPageResults.map(result => vscpp(WebPageContentChunks, { uri: result.uri, chunks: result.chunks, passPriority: true })),
            this.props.imageResults.map(result => vscpp(WebPageImage, { uri: result.uri, imagePart: result.imagePart, passPriority: true })),
            this.props.invalidUrls.map(url => vscpp(prompt_tsx_1.TextChunk, null,
                "Invalid URL so no data was provided: ",
                url)));
    }
}
class WebPageContentChunks extends prompt_tsx_1.PromptElement {
    static { this.PRIORITY_BASE = 1000; }
    static { this.DEFAULT_SCORE = 0; }
    render(_state, _sizing) {
        // First, create a sorted array of scores to determine ranks
        const scores = this.props.chunks.map(chunk => chunk.distance?.value ?? WebPageContentChunks.DEFAULT_SCORE);
        scores.sort((a, b) => b - a);
        // Create map of score to rank
        const scoreToRank = new Map();
        scores.forEach((score, index) => {
            if (!scoreToRank.has(score)) {
                scoreToRank.set(score, index);
            }
        });
        // Assign rank-based priorities without changing chunk order
        const chunksWithRankPriorities = this.props.chunks.map(chunk => {
            const score = chunk.distance?.value ?? WebPageContentChunks.DEFAULT_SCORE;
            const rank = scoreToRank.get(score) ?? WebPageContentChunks.PRIORITY_BASE;
            return {
                ...chunk,
                rankPriority: WebPageContentChunks.PRIORITY_BASE - rank // Higher rank (lower index) gets higher priority
            };
        });
        const KeepWith = (0, prompt_tsx_1.useKeepWith)();
        return vscpp(prompt_tsx_1.Chunk, { passPriority: true },
            vscpp(KeepWith, null,
                vscpp(prompt_tsx_1.TextChunk, null,
                    "Here is some relevant context from the web page ",
                    this.props.uri.toString(),
                    ":")),
            vscpp(KeepWith, { passPriority: true }, chunksWithRankPriorities.map(c => vscpp(prompt_tsx_1.TextChunk, { priority: c.rankPriority }, c.chunk.text))));
    }
}
class WebPageImage extends prompt_tsx_1.PromptElement {
    render(_state, _sizing) {
        const KeepWith = (0, prompt_tsx_1.useKeepWith)();
        const imageElement = (0, toolCalling_1.imageDataPartToTSX)(this.props.imagePart);
        return vscpp(prompt_tsx_1.Chunk, { passPriority: true },
            vscpp(KeepWith, null,
                vscpp(prompt_tsx_1.TextChunk, null,
                    "Here is an image from the web page ",
                    this.props.uri.toString(),
                    ":")),
            vscpp(KeepWith, { passPriority: true }, imageElement));
    }
}
//# sourceMappingURL=fetchWebPageTool.js.map