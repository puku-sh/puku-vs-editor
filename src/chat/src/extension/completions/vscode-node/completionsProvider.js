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
exports.CompletionsProvider = void 0;
const authentication_1 = require("../../../platform/authentication/common/authentication");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const logService_1 = require("../../../platform/log/common/logService");
const completionsAPI_1 = require("../../../platform/nesFetch/common/completionsAPI");
const completionsFetchService_1 = require("../../../platform/nesFetch/common/completionsFetchService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const tracing_1 = require("../../../util/common/tracing");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const stringEdit_1 = require("../../../util/vs/editor/common/core/edits/stringEdit");
const offsetRange_1 = require("../../../util/vs/editor/common/core/ranges/offsetRange");
const nextEditProvider_1 = require("../../inlineEdits/node/nextEditProvider");
const nextEditResult_1 = require("../../inlineEdits/node/nextEditResult");
const promptCrafting_1 = require("../../xtab/common/promptCrafting");
const config_1 = require("../common/config");
const parseBlock_1 = require("../common/parseBlock");
let CompletionsProvider = class CompletionsProvider extends lifecycle_1.Disposable {
    constructor(workspace, authService, fetchService, configService, expService, logService) {
        super();
        this.workspace = workspace;
        this.authService = authService;
        this.fetchService = fetchService;
        this.configService = configService;
        this.expService = expService;
        this.logService = logService;
        this.tracer = (0, tracing_1.createTracer)(['NES', 'Completions'], (msg) => this.logService.trace(msg));
    }
    async getCompletions(documentId, context, logContext, token) {
        const startTime = Date.now();
        const doc = this.workspace.getDocument(documentId);
        if (!doc) {
            throw new Error(`Document with ID ${documentId} not found.`);
        }
        const docContents = doc.value.get();
        const docSelection = doc.selection.get();
        const languageId = doc.languageId.get();
        // TODO@ulugbekna: handle multi-selection cases
        if (docSelection.length !== 1 || !docSelection[0].isEmpty) {
            return;
        }
        const selection = docSelection[0];
        const isMidword = this.isAtMidword(docContents, selection.start);
        if (isMidword) {
            this.tracer.returns('Midword completion not supported');
            return;
        }
        const prefix = docContents.getValue().substring(0, selection.start);
        const suffix = docContents.getValue().substring(selection.start); // we use `.start` again because the selection is empty
        const workspaceRoot = this.workspace.getWorkspaceRoot(documentId);
        const filepath = (0, promptCrafting_1.toUniquePath)(documentId, workspaceRoot?.path);
        const blockMode = config_1.BlockMode.ParsingAndServer;
        const url = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsCompletionsUrl, this.expService);
        if (!url) {
            this.tracer.throws('No completions URL configured');
            throw new Error('No completions URL configured');
        }
        const r = await this.fetchService.fetch(url, // TODO@ulugbekna: use CAPIClient to make the fetch
        (await this.authService.getCopilotToken()).token, {
            prompt: prefix,
            suffix: suffix,
            max_tokens: 500, // TODO@ulugbekna
            temperature: 0,
            top_p: 1,
            n: 1,
            stop: [
                "\n" // TODO@ulugbekna
            ],
            stream: true,
            extra: {
                language: languageId,
                next_indent: (0, parseBlock_1.contextIndentation)(docContents, selection.start, languageId).next ?? 0,
                trim_by_indentation: (0, config_1.shouldDoServerTrimming)(blockMode),
                prompt_tokens: Math.ceil(prefix.length / 4), // TODO@ulugbekna
                suffix_tokens: Math.ceil(suffix.length / 4),
                context: [
                    `Path: ${filepath}`
                ]
            },
            // nwo // TODO@ulugbekna
            code_annotations: false, // TODO@ulugbekna
        }, (0, uuid_1.generateUuid)(), token);
        if (r.isError()) {
            return;
        }
        const maybeCompletion = await r.val.response;
        if (maybeCompletion.isError() || maybeCompletion.val.choices.length === 0) {
            return;
        }
        const choice = maybeCompletion.val.choices[0];
        if (choice.finish_reason !== completionsAPI_1.Completion.FinishReason.Stop || !choice.text) {
            return;
        }
        return new nextEditResult_1.NextEditResult(logContext.requestId, new nextEditProvider_1.NextEditFetchRequest(context.requestUuid, logContext, startTime), {
            edit: new stringEdit_1.StringReplacement(new offsetRange_1.OffsetRange(selection.start, selection.endExclusive), choice.text),
            documentBeforeEdits: docContents,
            showRangePreference: "always" /* ShowNextEditPreference.Always */,
        });
    }
    isAtMidword(document, offset) {
        const isAtLastChar = offset + 1 >= document.value.length;
        if (isAtLastChar) {
            return false;
        }
        return document.value[offset + 1].match(/\w/) !== null;
    }
};
exports.CompletionsProvider = CompletionsProvider;
exports.CompletionsProvider = CompletionsProvider = __decorate([
    __param(1, authentication_1.IAuthenticationService),
    __param(2, completionsFetchService_1.ICompletionsFetchService),
    __param(3, configurationService_1.IConfigurationService),
    __param(4, nullExperimentationService_1.IExperimentationService),
    __param(5, logService_1.ILogService)
], CompletionsProvider);
//# sourceMappingURL=completionsProvider.js.map