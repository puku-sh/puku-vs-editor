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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericInlineIntentInvocation = void 0;
const network_1 = require("../../../../util/vs/base/common/network");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const intents_1 = require("../../../prompt/node/intents");
const promptRenderer_1 = require("../../../prompts/node/base/promptRenderer");
const inlineChatEditCodePrompt_1 = require("../../../prompts/node/inline/inlineChatEditCodePrompt");
const inlineChatEditMarkdownPrompt_1 = require("../../../prompts/node/inline/inlineChatEditMarkdownPrompt");
const inlineChatGenerateCodePrompt_1 = require("../../../prompts/node/inline/inlineChatGenerateCodePrompt");
const inlineChatGenerateMarkdownPrompt_1 = require("../../../prompts/node/inline/inlineChatGenerateMarkdownPrompt");
const inlineChatNotebookEditPrompt_1 = require("../../../prompts/node/inline/inlineChatNotebookEditPrompt");
const inlineChatNotebookGeneratePrompt_1 = require("../../../prompts/node/inline/inlineChatNotebookGeneratePrompt");
let GenericInlineIntentInvocation = class GenericInlineIntentInvocation {
    constructor(intent, location, endpoint, documentContext, editStrategy, instantiationService) {
        this.intent = intent;
        this.location = location;
        this.endpoint = endpoint;
        this.documentContext = documentContext;
        this.editStrategy = editStrategy;
        this.instantiationService = instantiationService;
        this.replyInterpreter = null;
    }
    async buildPrompt(promptContext, progress, token) {
        let prompt;
        if (this.documentContext.document.uri.scheme === network_1.Schemas.vscodeNotebookCell) {
            prompt = (this.editStrategy === 4 /* EditStrategy.ForceInsertion */ ? inlineChatNotebookGeneratePrompt_1.InlineChatNotebookGeneratePrompt : inlineChatNotebookEditPrompt_1.InlineChatNotebookEditPrompt);
        }
        else if (this.documentContext.document.languageId === 'markdown') {
            prompt = (this.editStrategy === 4 /* EditStrategy.ForceInsertion */ ? inlineChatGenerateMarkdownPrompt_1.InlineChatGenerateMarkdownPrompt : inlineChatEditMarkdownPrompt_1.InlineChatEditMarkdownPrompt);
        }
        else {
            prompt = (this.editStrategy === 4 /* EditStrategy.ForceInsertion */ ? inlineChatGenerateCodePrompt_1.InlineChatGenerateCodePrompt : inlineChatEditCodePrompt_1.InlineChatEditCodePrompt);
        }
        const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, this.endpoint, prompt, {
            documentContext: this.documentContext,
            promptContext
        });
        const result = await renderer.render(progress, token);
        this.replyInterpreter = result.metadata.get(intents_1.ReplyInterpreterMetaData)?.replyInterpreter ?? null;
        if (!this.replyInterpreter && result.hasIgnoredFiles) {
            this.replyInterpreter = new intents_1.NoopReplyInterpreter();
        }
        return result;
    }
    processResponse(context, inputStream, outputStream, token) {
        if (!this.replyInterpreter) {
            throw new Error(`Could not process response without a reply interpreter!`);
        }
        return this.replyInterpreter.processResponse(context, inputStream, outputStream, token);
    }
};
exports.GenericInlineIntentInvocation = GenericInlineIntentInvocation;
exports.GenericInlineIntentInvocation = GenericInlineIntentInvocation = __decorate([
    __param(5, instantiation_1.IInstantiationService)
], GenericInlineIntentInvocation);
//# sourceMappingURL=genericInlineIntentInvocation.js.map