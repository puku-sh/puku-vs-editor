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
var LanguageServerContextPrompt_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageServerContextPrompt = exports.LanguageServerContextStats = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const languageContextService_1 = require("../../../../platform/languageServer/common/languageContextService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const iterator_1 = require("../../../../util/vs/base/common/iterator");
const intents_1 = require("../../../prompt/node/intents");
const tag_1 = require("../base/tag");
const safeElements_1 = require("../panel/safeElements");
class LanguageServerContextStats extends intents_1.TelemetryData {
    constructor(snippetCounts, totalCharLength) {
        super();
        this.snippetCounts = snippetCounts;
        this.totalCharLength = totalCharLength;
    }
}
exports.LanguageServerContextStats = LanguageServerContextStats;
let LanguageServerContextPrompt = class LanguageServerContextPrompt extends prompt_tsx_1.PromptElement {
    static { LanguageServerContextPrompt_1 = this; }
    static { this.CompletionContext = {
        requestId: '0013686c-f799-4ed9-ad07-35369dbd6e26',
        timeBudget: 2500,
        tokenBudget: 32_000,
    }; }
    constructor(props, languageContextService, configurationService, experimentationService, ignoreService) {
        super(props);
        this.languageContextService = languageContextService;
        this.configurationService = configurationService;
        this.experimentationService = experimentationService;
        this.ignoreService = ignoreService;
    }
    async render(_state, sizing, _progress, token) {
        const configKey = this.props.source === languageContextService_1.KnownSources.chat
            ? configurationService_1.ConfigKey.TypeScriptLanguageContextInline
            : this.props.source === languageContextService_1.KnownSources.fix
                ? configurationService_1.ConfigKey.TypeScriptLanguageContextFix
                : undefined;
        if (configKey === undefined) {
            return;
        }
        const useLanguageServerContext = this.configurationService.getExperimentBasedConfig(configKey, this.experimentationService);
        if (!useLanguageServerContext) {
            return;
        }
        if (!await this.languageContextService.isActivated(this.props.document.languageId)) {
            return;
        }
        const context = Object.assign({}, LanguageServerContextPrompt_1.CompletionContext, { tokenBudget: sizing.tokenBudget });
        if (this.props.requestId !== undefined) {
            context.requestId = this.props.requestId;
        }
        if (this.props.source !== undefined) {
            context.source = this.props.source;
        }
        const validItems = [];
        const contextItems = this.languageContextService.getContext(this.props.document.document, this.props.position, context, token);
        outer: for await (const item of contextItems) {
            if (item.kind === languageContextService_1.ContextKind.Snippet) {
                if (item.value.length === 0) {
                    continue;
                }
                if (await this.ignoreService.isCopilotIgnored(item.uri)) {
                    continue;
                }
                if (item.additionalUris !== undefined && item.additionalUris.length > 0) {
                    for (const uri of item.additionalUris) {
                        if (await this.ignoreService.isCopilotIgnored(uri)) {
                            continue outer;
                        }
                    }
                }
                validItems.push(item);
            }
        }
        if (validItems.length === 0) {
            return;
        }
        return vscpp(tag_1.Tag, { name: 'languageServerContext' },
            "A language server finds these documents helpful for answering the user's question",
            vscpp("br", null),
            vscpp(tag_1.Tag, { name: 'note' }, "These documents are provided as extra insights but are not meant to be edited or changed in any way."),
            validItems.map(item => {
                return vscpp(vscppf, null,
                    vscpp(tag_1.Tag, { name: 'documentFragment' },
                        "From `",
                        vscpp(safeElements_1.Uri, { value: item.uri, mode: 1 /* UriMode.Path */ }),
                        "` I have read or edited:",
                        vscpp("br", null),
                        vscpp(safeElements_1.CodeBlock, { uri: item.uri, code: item.value, priority: item.priority * Number.MAX_SAFE_INTEGER })),
                    vscpp("br", null));
            }),
            vscpp("meta", { value: new LanguageServerContextStats(validItems.length, iterator_1.Iterable.reduce(validItems.values(), (t, item) => t + item.value.length, 0)) }));
    }
};
exports.LanguageServerContextPrompt = LanguageServerContextPrompt;
exports.LanguageServerContextPrompt = LanguageServerContextPrompt = LanguageServerContextPrompt_1 = __decorate([
    __param(1, languageContextService_1.ILanguageContextService),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, nullExperimentationService_1.IExperimentationService),
    __param(4, ignoreService_1.IIgnoreService)
], LanguageServerContextPrompt);
//# sourceMappingURL=languageServerContextPrompt.js.map