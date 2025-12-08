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
exports.ExplainIntent = exports.explainIntentPromptSnippet = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const intents_1 = require("../../prompt/node/intents");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const explain_1 = require("../../prompts/node/panel/explain");
exports.explainIntentPromptSnippet = 'Write an explanation for the active selection as paragraphs of text.';
let ExplainIntentInvocation = class ExplainIntentInvocation extends promptRenderer_1.RendererIntentInvocation {
    constructor(intent, location, endpoint, tabsAndEditorsService, instantiationService) {
        super(intent, location, endpoint);
        this.tabsAndEditorsService = tabsAndEditorsService;
        this.instantiationService = instantiationService;
        this.defaultQuery = 'Write an explanation for the code above as paragraphs of text.';
    }
    async buildPrompt(promptParams, progress, token) {
        if (promptParams.query === '') {
            promptParams = { ...promptParams, query: this.defaultQuery };
        }
        return super.buildPrompt(promptParams, progress, token);
    }
    createRenderer(promptContext, endpoint, progress, token) {
        const editor = this.tabsAndEditorsService.activeTextEditor;
        return promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, explain_1.ExplainPrompt, {
            promptContext,
            document: editor ? textDocumentSnapshot_1.TextDocumentSnapshot.create(editor?.document) : undefined,
            selection: editor?.selection,
            isInlineChat: this.location === commonTypes_1.ChatLocation.Editor,
            endpoint
        });
    }
};
ExplainIntentInvocation = __decorate([
    __param(3, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(4, instantiation_1.IInstantiationService)
], ExplainIntentInvocation);
class InlineExplainIntentInvocation extends ExplainIntentInvocation {
    constructor() {
        super(...arguments);
        this.defaultQuery = exports.explainIntentPromptSnippet;
    }
    processResponse(context, inputStream, outputStream, token) {
        const replyInterpreter = new intents_1.StreamingMarkdownReplyInterpreter();
        return replyInterpreter.processResponse(context, inputStream, outputStream, token);
    }
}
let ExplainIntent = class ExplainIntent {
    static { this.ID = "explain" /* Intent.Explain */; }
    constructor(endpointProvider, instantiationService) {
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
        this.id = "explain" /* Intent.Explain */;
        this.locations = [commonTypes_1.ChatLocation.Panel, commonTypes_1.ChatLocation.Editor, commonTypes_1.ChatLocation.Notebook];
        this.description = l10n.t('Explain how the code in your active editor works');
    }
    async invoke(invocationContext) {
        const location = invocationContext.location;
        const endpoint = await this.endpointProvider.getChatEndpoint(invocationContext.request);
        if (location === commonTypes_1.ChatLocation.Editor) {
            return this.instantiationService.createInstance(InlineExplainIntentInvocation, this, location, endpoint);
        }
        return this.instantiationService.createInstance(ExplainIntentInvocation, this, location, endpoint);
    }
};
exports.ExplainIntent = ExplainIntent;
exports.ExplainIntent = ExplainIntent = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, instantiation_1.IInstantiationService)
], ExplainIntent);
//# sourceMappingURL=explainIntent.js.map