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
exports.FeedbackReporter = void 0;
exports.openIssueReporter = openIssueReporter;
exports.generateSTest = generateSTest;
exports.generateInlineChatSTest = generateInlineChatSTest;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const vscode = __importStar(require("vscode"));
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const globalStringUtils_1 = require("../../../platform/chat/common/globalStringUtils");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const editLogService_1 = require("../../../platform/multiFileEdit/common/editLogService");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const resources_1 = require("../../../util/vs/base/common/resources");
const strings_1 = require("../../../util/vs/base/common/strings");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const constants_1 = require("../../common/constants");
const conversation_1 = require("../../prompt/common/conversation");
const conversation_2 = require("../../prompt/node/conversation");
const semanticSearchTextSearchProvider_1 = require("../../workspaceSemanticSearch/node/semanticSearchTextSearchProvider");
const logWorkspaceState_1 = require("./logWorkspaceState");
const SEPARATOR = '---------------------------------';
let FeedbackReporter = class FeedbackReporter extends lifecycle_1.Disposable {
    constructor(_instantiationService, _configurationService, _requestLogger, telemetryService, _editLogService) {
        super();
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._requestLogger = _requestLogger;
        this.telemetryService = telemetryService;
        this._editLogService = _editLogService;
        this.canReport = this._configurationService.getConfigObservable(configurationService_1.ConfigKey.Internal.DebugReportFeedback);
    }
    _findChatParamsForTurn(turn) {
        for (const request of this._requestLogger.getRequests().reverse()) {
            if (request.kind !== 1 /* LoggedInfoKind.Request */) {
                continue;
            }
            if (request.entry.type === "MarkdownContentRequest" /* LoggedRequestKind.MarkdownContentRequest */) {
                continue;
            }
            if (request.entry.chatParams.ourRequestId === turn.id) {
                return request.entry.chatParams;
            }
        }
    }
    async reportInline(conversation, promptQuery, interactionOutcome) {
        if (!this.canReport) {
            return;
        }
        const turn = conversation.getLatestTurn();
        const latestMessages = this._findChatParamsForTurn(turn)?.messages;
        const intentDump = promptQuery.intent ? this._embedCodeblock('INTENT', promptQuery.intent.id) : '';
        const contextDump = this._embedCodeblock('CONTEXT', JSON.stringify({
            document: promptQuery.document.uri.toString(),
            fileIndentInfo: promptQuery.fileIndentInfo,
            language: promptQuery.language,
            wholeRange: promptQuery.wholeRange,
            selection: promptQuery.selection,
        }, null, '\t'));
        let messagesDump = '';
        if (latestMessages && latestMessages.length > 0) {
            const messagesInfo = latestMessages.map(message => this._embedCodeblock((0, globalStringUtils_1.roleToString)(message.role).toUpperCase(), (0, globalStringUtils_1.getTextPart)(message.content))).join('\n');
            messagesDump = `\t${SEPARATOR}\n${this._headerSeparator()}PROMPT MESSAGES:\n${messagesInfo}`;
        }
        else {
            messagesDump = this._embedCodeblock(turn.request.type.toUpperCase(), turn.request.message);
        }
        const responseDump = this._embedCodeblock('ASSISTANT', turn.responseMessage?.message || '');
        const parsedReplyDump = this._embedCodeblock('Interaction outcome', JSON.stringify(interactionOutcome, null, '\t'));
        const output = [];
        appendPromptDetailsSection(output, intentDump, contextDump, messagesDump, responseDump, parsedReplyDump);
        await appendSTestSection(output, turn);
        await this._reportIssue('Feedback for inline chat', output.join('\n'));
    }
    async reportChat(turn) {
        if (!this.canReport) {
            return;
        }
        let messagesDump = '';
        const params = this._findChatParamsForTurn(turn);
        if (params?.messages && params.messages.length > 0) {
            const messagesInfo = params.messages.map(message => {
                let content = (0, globalStringUtils_1.getTextPart)(message.content);
                if (message.content.some(part => part.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.CacheBreakpoint)) {
                    content += `\ncopilot_cache_control: { type: 'ephemeral' }`;
                }
                if (message.role === prompt_tsx_1.Raw.ChatRole.Assistant && message.toolCalls?.length) {
                    if (content) {
                        content += '\n';
                    }
                    content += message.toolCalls.map(c => {
                        let argsStr = c.function.arguments;
                        try {
                            const parsedArgs = JSON.parse(c.function.arguments);
                            argsStr = JSON.stringify(parsedArgs, undefined, 2);
                        }
                        catch (e) { }
                        return `🛠️ ${c.function.name} (${c.id}) ${argsStr}`;
                    }).join('\n');
                }
                else if (message.role === prompt_tsx_1.Raw.ChatRole.Tool) {
                    content = `🛠️ ${message.toolCallId}\n${content}`;
                }
                return this._embedCodeblock((0, globalStringUtils_1.roleToString)(message.role).toUpperCase(), content);
            }).join('\n');
            messagesDump += `\t${SEPARATOR}\n${this._headerSeparator()}PROMPT MESSAGES:\n${messagesInfo}`;
        }
        else {
            messagesDump += this._embedCodeblock(turn.request.type.toUpperCase(), turn.request.message);
        }
        const intent = turn.getMetadata(conversation_2.IntentInvocationMetadata)?.value.intent;
        const intentDump = intent ? this._embedCodeblock('INTENT', `[${intent.id}] ${intent.description}`) : '';
        const responseDump = this._embedCodeblock('ASSISTANT', turn.responseMessage?.message || '');
        const workspaceState = await this._instantiationService.createInstance(logWorkspaceState_1.WorkspaceStateSnapshotHelper).captureWorkspaceStateSnapshot([]);
        const workspaceStateDump = this._embedCodeblock('WORKSPACE STATE', JSON.stringify(workspaceState, null, 2));
        const toolsDump = params?.body?.tools ? this._embedCodeblock('TOOLS', JSON.stringify(params.body.tools, null, 2)) : '';
        const metadata = this._embedCodeblock('METADATA', `requestID: ${turn.id}\nmodel: ${params?.model}`);
        const edits = (await this._editLogService.getEditLog(turn.id))?.map((edit, i) => {
            return this._embedCodeblock(`EDIT ${i + 1}`, JSON.stringify(edit, null, 2));
        }).join('\n') || '';
        const output = [];
        appendPromptDetailsSection(output, intentDump, messagesDump, responseDump, workspaceStateDump, toolsDump, metadata, edits);
        await appendSTestSection(output, turn);
        await this._reportIssue('Feedback for sidebar chat', output.join('\n'));
    }
    async reportSearch(kind) {
        /* __GDPR__
            "copilot.search.feedback" : {
                "owner": "osortega",
                "comment": "Feedback telemetry for copilot search",
                "kind": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Feedback provided by the user." },
                "chunkCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Count of copilot search code chunks." },
                "rankResult": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Result of the copilot search ranking." },
                "rankResultsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Count of the results from copilot search ranking." },
                "combinedResultsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Count of combined results from copilot search." },
                "chunkSearchDuration": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "Duration of the chunk search" },
                "llmFilteringDuration": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "Duration of the LLM filtering" },
                "strategy": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Indicates the strategy used for the search." }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('copilot.search.feedback', {
            kind,
            rankResult: semanticSearchTextSearchProvider_1.SemanticSearchTextSearchProvider.feedBackTelemetry.rankResult,
            strategy: semanticSearchTextSearchProvider_1.SemanticSearchTextSearchProvider.feedBackTelemetry.strategy,
        }, {
            chunkCount: semanticSearchTextSearchProvider_1.SemanticSearchTextSearchProvider.feedBackTelemetry.chunkCount,
            rankResultsCount: semanticSearchTextSearchProvider_1.SemanticSearchTextSearchProvider.feedBackTelemetry.rankResultsCount,
            combinedResultsCount: semanticSearchTextSearchProvider_1.SemanticSearchTextSearchProvider.feedBackTelemetry.combinedResultsCount,
            chunkSearchDuration: semanticSearchTextSearchProvider_1.SemanticSearchTextSearchProvider.feedBackTelemetry.chunkSearchDuration,
            llmFilteringDuration: semanticSearchTextSearchProvider_1.SemanticSearchTextSearchProvider.feedBackTelemetry.llmFilteringDuration,
        });
    }
    _embedCodeblock(header, text) {
        const body = this._bodySeparator() + text.split('\n').join(`\n${this._bodySeparator()}`);
        return `\t${SEPARATOR}\n${this._headerSeparator()}${header}:\n${body}`;
    }
    _headerSeparator() {
        return `\t`;
    }
    _bodySeparator() {
        return `\t\t`;
    }
    async _reportIssue(title, body) {
        openIssueReporter({ title, data: body });
    }
};
exports.FeedbackReporter = FeedbackReporter;
exports.FeedbackReporter = FeedbackReporter = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, configurationService_1.IConfigurationService),
    __param(2, requestLogger_1.IRequestLogger),
    __param(3, telemetry_1.ITelemetryService),
    __param(4, editLogService_1.IEditLogService)
], FeedbackReporter);
async function openIssueReporter(args) {
    await vscode.commands.executeCommand('workbench.action.openIssueReporter', {
        extensionId: constants_1.EXTENSION_ID,
        issueTitle: args.title,
        data: args.data,
        issueBody: args.issueBody ?? '',
        // team -> vscode-copilot
        uri: vscode.Uri.parse(args.public ? 'https://github.com/microsoft/vscode' : 'https://github.com/microsoft/vscode-copilot-issues'),
    });
}
function appendPromptDetailsSection(output, ...dumps) {
    output.push(`<details><summary>Prompt Details</summary>`, `<p>`, '', // Necessary for the indentation to render as a codeblock inside the <p>
    ...dumps, `</p>`, `</details>`);
}
async function appendSTestSection(output, turn) {
    const test = await generateSTest(turn);
    if (test) {
        output.push(`<details><summary>STest</summary>`, `<p>`, `STest code:`, ``, '```ts', ...test, '```', `</p>`, `</details>`);
    }
}
async function generateSTest(turn) {
    const intentInvocation = turn.getMetadata(conversation_2.IntentInvocationMetadata)?.value;
    if (intentInvocation) {
        if (intentInvocation.location === commonTypes_1.ChatLocation.Editor) {
            return generateInlineChatSTest(turn);
        }
    }
    return undefined;
}
function generateInlineChatSTest(turn) {
    const requestInfo = turn.getMetadata(conversation_1.RequestDebugInformation);
    if (!requestInfo) {
        return undefined;
    }
    const fileName = (0, resources_1.basename)(requestInfo.uri);
    const str = (val) => JSON.stringify(val);
    return [
        `stest({ description: 'Issue #XXXXX', language: ${str(requestInfo.languageId)}, model }, (testingServiceCollection) => {`,
        `	return simulateInlineChat(testingServiceCollection, {`,
        `		files: [toFile({`,
        `			fileName: ${str(`${requestInfo.intentId}/issue-XXXXX/${fileName}`)},`,
        `			fileContents: [`,
        ...(0, strings_1.splitLinesIncludeSeparators)(requestInfo.initialDocumentText).map(line => `				${str(line)},`),
        `			]`,
        `		})],`,
        `		queries: [`,
        `			{`,
        `				file: ${str(fileName)},`,
        `				selection: ${str(selectionAsArray(requestInfo.userSelection))},`,
        `				query: ${str(requestInfo.userPrompt)},`,
        `				diagnostics: 'tsc',`,
        `				expectedIntent: ${str(requestInfo.intentId)},`,
        `				validate: async (outcome, workspace, accessor) => {`,
        `					assertInlineEdit(outcome);`,
        `					await assertNoDiagnosticsAsync(accessor, outcome, workspace, KnownDiagnosticProviders.tscIgnoreImportErrors);`,
        `				}`,
        `			}`,
        `		]`,
        `	});`,
        `});`
    ];
}
function selectionAsArray(range) {
    return [range.start.line, range.start.character, range.end.line, range.end.character];
}
//# sourceMappingURL=feedbackReporter.js.map