"use strict";
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
exports.NewNotebookIntent = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const l10n = __importStar(require("@vscode/l10n"));
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const newNotebook_1 = require("../../prompts/node/panel/newNotebook");
const newNotebookIntent_1 = require("./newNotebookIntent");
let NewNotebookIntent = class NewNotebookIntent {
    static { this.ID = "newNotebook" /* Intent.NewNotebook */; }
    constructor(endpointProvider, instantiationService) {
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
        this.id = "newNotebook" /* Intent.NewNotebook */;
        this.description = l10n.t('Create a new Jupyter Notebook');
        this.locations = [commonTypes_1.ChatLocation.Panel];
        this.commandInfo = {
            allowsEmptyArgs: false,
            yieldsTo: [
                { command: 'fix' },
                { command: 'explain' },
                { command: 'workspace' },
                { command: 'tests' },
            ],
            defaultEnablement: true,
            sampleRequest: l10n.t('How do I create a notebook to load data from a csv file?')
        };
    }
    async invoke(invocationContext) {
        const location = invocationContext.location;
        const endpoint = await this.endpointProvider.getChatEndpoint(invocationContext.request);
        return this.instantiationService.createInstance(NewNotebookPlanningInvocation, this, endpoint, location, invocationContext.request.prompt);
    }
};
exports.NewNotebookIntent = NewNotebookIntent;
exports.NewNotebookIntent = NewNotebookIntent = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, instantiation_1.IInstantiationService)
], NewNotebookIntent);
let NewNotebookPlanningInvocation = class NewNotebookPlanningInvocation {
    constructor(intent, endpoint, location, query, instantiationService) {
        this.intent = intent;
        this.endpoint = endpoint;
        this.location = location;
        this.query = query;
        this.instantiationService = instantiationService;
        this.linkification = { disable: true };
    }
    async buildPrompt(promptContext, progress, token) {
        this.context = promptContext;
        const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, this.endpoint, newNotebook_1.NewNotebookPlanningPrompt, {
            promptContext,
            endpoint: this.endpoint,
        });
        return await renderer.render(progress, token);
    }
    processResponse(context, inputStream, outputStream, token) {
        outputStream.markdown(l10n.t('Creating a new notebook:\n'));
        const responseProcessor = this.instantiationService.createInstance(newNotebookIntent_1.NewNotebookResponseProcessor, this.endpoint, this.context);
        return responseProcessor.processResponse(context, inputStream, outputStream, token);
    }
};
NewNotebookPlanningInvocation = __decorate([
    __param(4, instantiation_1.IInstantiationService)
], NewNotebookPlanningInvocation);
//# sourceMappingURL=newNotebookIntent.contribution.js.map