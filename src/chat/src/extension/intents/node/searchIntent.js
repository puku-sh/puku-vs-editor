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
exports.SearchIntent = exports.searchIntentPromptSnippet = void 0;
exports.parseSearchParams = parseSearchParams;
const l10n = __importStar(require("@vscode/l10n"));
const jsonc_parser_1 = require("jsonc-parser");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const packagejson_1 = require("../../../platform/env/common/packagejson");
const markdown_1 = require("../../../util/common/markdown");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const pseudoStartStopConversationCallback_1 = require("../../prompt/node/pseudoStartStopConversationCallback");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const search_1 = require("../../prompts/node/panel/search");
function createSearchFollowUps(args) {
    if (!args) {
        return [];
    }
    const searchResponses = [];
    const searchArg = {
        query: args.query ?? '',
        replace: args.replace ?? '',
        filesToInclude: args.filesToInclude ?? '',
        filesToExclude: args.filesToExclude ?? '',
        isRegex: args.isRegex ?? false,
        isCaseSensitive: args.isRegex ?? false,
    };
    searchResponses.push({
        command: 'puku.executeSearch',
        arguments: [searchArg],
        title: l10n.t("Search"),
    });
    return searchResponses;
}
function parseSearchParams(modelResponseString) {
    const codeBlock = (0, markdown_1.extractCodeBlocks)(modelResponseString).at(0);
    let args = undefined;
    if (codeBlock) {
        let parsed;
        try {
            parsed = (0, jsonc_parser_1.parse)(codeBlock.code);
        }
        catch (e) {
            // Ignore
        }
        if (parsed) {
            args = parsed;
        }
    }
    return args;
}
function jsonToTable(args) {
    if (!args) {
        return [];
    }
    const table = ['| Parameter  | Value |\n', '| ------ | ----- |\n'];
    for (const [key, value] of Object.entries(args)) {
        if (value === '') {
            continue;
        }
        let nonEscapeValue = value;
        if (typeof value === 'string' || value instanceof String) {
            // CodeQL [SM02383] Since this is inside of a markdown table cell, only a `|` pipe character would interfere with formatting.
            nonEscapeValue = value.replace(/\|/g, '\\|');
        }
        table.push(`| ${key} | \`${nonEscapeValue}\` |\n`);
    }
    table.push(`\n`);
    return table;
}
exports.searchIntentPromptSnippet = `Search for 'foo' in all files under my 'src' directory`;
let SearchIntentInvocation = class SearchIntentInvocation extends promptRenderer_1.RendererIntentInvocation {
    constructor(intent, location, endpoint, instantiationService) {
        super(intent, location, endpoint);
        this.instantiationService = instantiationService;
    }
    createRenderer(promptContext, endpoint, progress, token) {
        return promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, search_1.SearchPrompt, {
            promptContext
        });
    }
    processResponse(context, inputStream, outputStream, token) {
        const responseProcessor = this.instantiationService.createInstance(SearchResponseProcessor);
        return responseProcessor.processResponse(context, inputStream, outputStream, token);
    }
};
SearchIntentInvocation = __decorate([
    __param(3, instantiation_1.IInstantiationService)
], SearchIntentInvocation);
class SearchResponseProcessor extends pseudoStartStopConversationCallback_1.PseudoStopStartResponseProcessor {
    constructor() {
        super([{ start: '[ARGS END]', stop: '[ARGS START]' }], (delta) => jsonToTable(parseSearchParams(delta.join(''))));
        this._response = '';
    }
    async doProcessResponse(responseStream, progress, token) {
        await super.doProcessResponse(responseStream, progress, token);
        const args = parseSearchParams(this._response ?? '');
        for (const command of createSearchFollowUps(args)) {
            progress.button(command);
        }
    }
    applyDelta(delta, progress) {
        this._response += delta.text;
        super.applyDelta(delta, progress);
    }
}
let SearchIntent = class SearchIntent {
    static { this.ID = "search" /* Intent.Search */; }
    constructor(instantiationService, endpointProvider) {
        this.instantiationService = instantiationService;
        this.endpointProvider = endpointProvider;
        this.id = "search" /* Intent.Search */;
        this.locations = [commonTypes_1.ChatLocation.Panel];
        this.description = l10n.t('Generate query parameters for workspace search');
        this.commandInfo = {
            allowsEmptyArgs: false,
            defaultEnablement: packagejson_1.isPreRelease,
        };
    }
    async invoke(invocationContext) {
        const location = invocationContext.location;
        const endpoint = await this.endpointProvider.getChatEndpoint(invocationContext.request);
        return this.instantiationService.createInstance(SearchIntentInvocation, this, location, endpoint);
    }
};
exports.SearchIntent = SearchIntent;
exports.SearchIntent = SearchIntent = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, endpointProvider_1.IEndpointProvider)
], SearchIntent);
//# sourceMappingURL=searchIntent.js.map