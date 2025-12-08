"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PromptRenderer_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptRenderer = exports.RendererIntentInvocation = exports.IPromptEndpoint = void 0;
exports.renderPromptElement = renderPromptElement;
exports.renderPromptElementJSON = renderPromptElementJSON;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const authentication_1 = require("../../../../platform/authentication/common/authentication");
const globalStringUtils_1 = require("../../../../platform/chat/common/globalStringUtils");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../../platform/log/common/logService");
const requestLogger_1 = require("../../../../platform/requestLogger/node/requestLogger");
const tokenizer_1 = require("../../../../platform/tokenizer/node/tokenizer");
const services_1 = require("../../../../util/common/services");
const types_1 = require("../../../../util/common/types");
const uri_1 = require("../../../../util/vs/base/common/uri");
const serviceCollection_1 = require("../../../../util/vs/platform/instantiation/common/serviceCollection");
const rendererVisualization_1 = require("../../../inlineChat/node/rendererVisualization");
const conversation_1 = require("../../../prompt/common/conversation");
exports.IPromptEndpoint = (0, services_1.createServiceIdentifier)('IPromptEndpoint');
/**
 * Convenience intent invocation that uses a renderer for prompt crafting.
 */
class RendererIntentInvocation {
    constructor(intent, location, endpoint) {
        this.intent = intent;
        this.location = location;
        this.endpoint = endpoint;
    }
    async buildPrompt(promptParams, progress, token) {
        const renderer = await this.createRenderer(promptParams, this.endpoint, progress, token);
        return await renderer.render(progress, token);
    }
}
exports.RendererIntentInvocation = RendererIntentInvocation;
let PromptRenderer = PromptRenderer_1 = class PromptRenderer extends prompt_tsx_1.PromptRenderer {
    static create(instantiationService, endpoint, ctor, props) {
        // TODO@Alex, TODO@Joh: instantiationService.createInstance doesn't work here
        const hydratedInstaService = instantiationService.createChild(new serviceCollection_1.ServiceCollection([exports.IPromptEndpoint, endpoint]));
        return hydratedInstaService.invokeFunction((accessor) => {
            const tokenizerProvider = accessor.get(tokenizer_1.ITokenizerProvider);
            let renderer = new PromptRenderer_1(hydratedInstaService, endpoint, ctor, props, tokenizerProvider, accessor.get(requestLogger_1.IRequestLogger), accessor.get(authentication_1.IAuthenticationService), accessor.get(logService_1.ILogService));
            const visualizations = rendererVisualization_1.RendererVisualizations.getIfVisualizationTestIsRunning();
            if (visualizations) {
                renderer = visualizations.decorateAndRegister(renderer, ctor.name);
            }
            return renderer;
        });
    }
    constructor(_instantiationService, endpoint, ctor, props, tokenizerProvider, _requestLogger, authenticationService, _logService) {
        const tokenizer = tokenizerProvider.acquireTokenizer(endpoint);
        super(endpoint, ctor, props, tokenizer);
        this._instantiationService = _instantiationService;
        this.endpoint = endpoint;
        this._requestLogger = _requestLogger;
        this._logService = _logService;
        const token = authenticationService.copilotToken;
        const isTeamMember = !!(token?.isInternal && token.isVscodeTeamMember);
        if (isTeamMember) {
            this.ctorName = ctor.name || '<anonymous>';
            this.tracer = new prompt_tsx_1.HTMLTracer();
        }
    }
    createElement(element, ...args) {
        return this._instantiationService.createInstance(element.ctor, element.props, ...args);
    }
    async render(progress, token, opts) {
        const result = await super.render(progress, token);
        const defaultOptions = { trace: true };
        opts = { ...defaultOptions, ...opts };
        if (this.tracer && !!opts.trace) {
            this._requestLogger.addPromptTrace(this.ctorName, this.endpoint, result, this.tracer);
        }
        // Collapse consecutive system messages because CAPI currently expects a single
        // system message per prompt. Note: this may slightly reduce the actual
        // token usage under the `RenderPromptResult.tokenCount`.
        for (let i = 1; i < result.messages.length; i++) {
            const current = result.messages[i];
            const prev = result.messages[i - 1];
            if (current.role === prompt_tsx_1.Raw.ChatRole.System && prev.role === prompt_tsx_1.Raw.ChatRole.System) {
                const lastContent = prev.content.at(-1);
                const nextContent = current.content.at(0);
                if (lastContent && nextContent && lastContent.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text && nextContent.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text) {
                    lastContent.text = lastContent.text.trimEnd() + '\n' + nextContent.text;
                    prev.content = prev.content.concat(current.content.slice(1));
                }
                else {
                    prev.content.push((0, globalStringUtils_1.toTextPart)('\n'));
                    prev.content = prev.content.concat(current.content);
                }
                result.messages.splice(i, 1);
                i--;
            }
        }
        const references = result.references.filter(ref => this.validateReference(ref));
        this._instantiationService.dispose(); // Dispose the hydrated instantiation service
        return { ...result, references: (0, conversation_1.getUniqueReferences)(references) };
    }
    validateReference(reference) {
        const validateLocation = (value) => {
            const uri = (0, types_1.isLocation)(value) ? value.uri : value;
            if (!uri_1.URI.isUri(uri)) {
                this._logService.warn(`Invalid PromptReference, uri not an instance of URI: ${uri}. Try to find the code that is creating this reference and fix it.`);
                return false;
            }
            return true;
        };
        const refAnchor = reference.anchor;
        if ('variableName' in refAnchor) {
            return refAnchor.value === undefined || validateLocation(refAnchor.value);
        }
        return validateLocation(refAnchor);
    }
    async countTokens(token) {
        const result = await super.render(undefined, token);
        return result.tokenCount;
    }
};
exports.PromptRenderer = PromptRenderer;
exports.PromptRenderer = PromptRenderer = PromptRenderer_1 = __decorate([
    __param(4, tokenizer_1.ITokenizerProvider),
    __param(5, requestLogger_1.IRequestLogger),
    __param(6, authentication_1.IAuthenticationService),
    __param(7, logService_1.ILogService)
], PromptRenderer);
async function renderPromptElement(instantiationService, endpoint, ctor, props, progress, token) {
    const renderer = PromptRenderer.create(instantiationService, endpoint, ctor, props);
    const { messages, tokenCount, references, metadata } = await renderer.render(progress, token);
    return { messages, tokenCount, metadatas: metadata, references: (0, conversation_1.getUniqueReferences)(references) };
}
// The below all exists to wrap `renderElementJSON` to call our instantiation service
class PromptRendererForJSON extends prompt_tsx_1.PromptRenderer {
    constructor(ctor, props, tokenOptions, chatEndpoint, instantiationService) {
        // Copied from prompt-tsx to map the vscode tool tokenOptions to ITokenizer
        const tokenizer = {
            mode: prompt_tsx_1.OutputMode.Raw,
            countMessageTokens(message) {
                throw new Error('Tools may only return text, not messages.');
            },
            tokenLength(text, token) {
                if (text.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text) {
                    return Promise.resolve(tokenOptions?.countTokens(text.text, token) ?? Promise.resolve(1));
                }
                else {
                    return Promise.resolve(1);
                }
            },
        };
        super({ modelMaxPromptTokens: tokenOptions?.tokenBudget ?? chatEndpoint.modelMaxPromptTokens }, ctor, props, tokenizer);
        this.instantiationService = instantiationService;
    }
    createElement(element, ...args) {
        return this.instantiationService.createInstance(element.ctor, element.props, ...args);
    }
}
async function renderPromptElementJSON(instantiationService, ctor, props, tokenOptions, token) {
    // todo@connor4312: we don't know what model the tool call will use, just assume GPT family
    // todo@lramos15: We should pass in endpoint provider rather than doing invoke function, but this was easier
    const endpoint = await instantiationService.invokeFunction((accessor) => {
        return accessor.get(endpointProvider_1.IEndpointProvider).getChatEndpoint('gpt-4.1');
    });
    const hydratedInstaService = instantiationService.createChild(new serviceCollection_1.ServiceCollection([exports.IPromptEndpoint, endpoint]));
    const renderer = new PromptRendererForJSON(ctor, props, tokenOptions, endpoint, hydratedInstaService);
    return await renderer.renderElementJSON(token);
}
//# sourceMappingURL=promptRenderer.js.map