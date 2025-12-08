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
exports.InlineFixIntentInvocation = void 0;
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const intents_1 = require("../../../prompt/node/intents");
const promptRenderer_1 = require("../../../prompts/node/base/promptRenderer");
let InlineFixIntentInvocation = class InlineFixIntentInvocation {
    constructor(intent, location, endpoint, prompt, documentContext, features, instantiationService) {
        this.intent = intent;
        this.location = location;
        this.endpoint = endpoint;
        this.prompt = prompt;
        this.documentContext = documentContext;
        this.features = features;
        this.instantiationService = instantiationService;
        this.replyInterpreter = null;
    }
    async buildPrompt(promptContext, progress, token) {
        const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, this.endpoint, this.prompt, {
            documentContext: this.documentContext,
            promptContext,
            features: this.features,
        });
        const result = await renderer.render(progress, token);
        this.replyInterpreter = result.metadata.get(intents_1.ReplyInterpreterMetaData)?.replyInterpreter ?? (result.hasIgnoredFiles ? new intents_1.NoopReplyInterpreter() : null);
        return result;
    }
    processResponse(context, inputStream, outputStream, token) {
        if (!this.replyInterpreter) {
            throw new Error('Could not process response without a reply interpreter.');
        }
        return this.replyInterpreter.processResponse(context, inputStream, outputStream, token);
    }
};
exports.InlineFixIntentInvocation = InlineFixIntentInvocation;
exports.InlineFixIntentInvocation = InlineFixIntentInvocation = __decorate([
    __param(6, instantiation_1.IInstantiationService)
], InlineFixIntentInvocation);
//# sourceMappingURL=inlineFixIntentInvocation.js.map