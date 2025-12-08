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
exports.GenericPanelIntentInvocation = void 0;
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const promptRenderer_1 = require("../../../prompts/node/base/promptRenderer");
const panelChatBasePrompt_1 = require("../../../prompts/node/panel/panelChatBasePrompt");
let GenericPanelIntentInvocation = class GenericPanelIntentInvocation extends promptRenderer_1.RendererIntentInvocation {
    constructor(intent, location, endpoint, prompt = panelChatBasePrompt_1.PanelChatBasePrompt, documentContext, instantiationService) {
        super(intent, location, endpoint);
        this.prompt = prompt;
        this.documentContext = documentContext;
        this.instantiationService = instantiationService;
    }
    createRenderer(promptContext, endpoint, progress, token) {
        return promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, this.prompt, {
            documentContext: this.documentContext,
            promptContext
        });
    }
};
exports.GenericPanelIntentInvocation = GenericPanelIntentInvocation;
exports.GenericPanelIntentInvocation = GenericPanelIntentInvocation = __decorate([
    __param(5, instantiation_1.IInstantiationService)
], GenericPanelIntentInvocation);
//# sourceMappingURL=genericPanelIntentInvocation.js.map