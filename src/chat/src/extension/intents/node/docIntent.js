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
var InlineDocIntent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InlineDocIntent = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const parserService_1 = require("../../../platform/parser/node/parserService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const markdown_1 = require("../../../util/common/markdown");
const stringEdit_1 = require("../../../util/vs/editor/common/core/edits/stringEdit");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const definitionAroundCursor_1 = require("../../prompt/node/definitionAroundCursor");
const intents_1 = require("../../prompt/node/intents");
const streamingEdits_1 = require("../../prompt/node/streamingEdits");
const instructionMessage_1 = require("../../prompts/node/base/instructionMessage");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const promptingSummarizedDocument_1 = require("../../prompts/node/inline/promptingSummarizedDocument");
const summarizeDocument_1 = require("../../prompts/node/inline/summarizedDocument/summarizeDocument");
const chatVariables_1 = require("../../prompts/node/panel/chatVariables");
const conversationHistory_1 = require("../../prompts/node/panel/conversationHistory");
const toolNames_1 = require("../../tools/common/toolNames");
let InlineDocIntent = class InlineDocIntent {
    static { InlineDocIntent_1 = this; }
    static { this.ID = 'doc'; }
    constructor(endpointProvider, telemetryService, parserService, instaService) {
        this.endpointProvider = endpointProvider;
        this.telemetryService = telemetryService;
        this.parserService = parserService;
        this.instaService = instaService;
        this.id = InlineDocIntent_1.ID;
        this.description = l10n.t('Add documentation comment for this symbol');
        this.locations = [commonTypes_1.ChatLocation.Editor];
        this.commandInfo = { toolEquivalent: toolNames_1.ContributedToolName.DocInfo };
    }
    async invoke(invocationContext) {
        const { documentContext, request } = invocationContext;
        if (!documentContext) {
            throw new Error('Open a file to add documentation.');
        }
        const nodeToDocument = await (0, definitionAroundCursor_1.determineNodeToDocument)(this.parserService, this.telemetryService, documentContext);
        const endpoint = await this.endpointProvider.getChatEndpoint(request);
        return this.instaService.createInstance(DocInvocation, endpoint, documentContext, this, nodeToDocument);
    }
};
exports.InlineDocIntent = InlineDocIntent;
exports.InlineDocIntent = InlineDocIntent = InlineDocIntent_1 = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, telemetry_1.ITelemetryService),
    __param(2, parserService_1.IParserService),
    __param(3, instantiation_1.IInstantiationService)
], InlineDocIntent);
let DocInvocation = class DocInvocation {
    constructor(endpoint, context, intent, nodeToDocument, parserService, telemetryService, instantiationService) {
        this.endpoint = endpoint;
        this.context = context;
        this.intent = intent;
        this.nodeToDocument = nodeToDocument;
        this.parserService = parserService;
        this.telemetryService = telemetryService;
        this.instantiationService = instantiationService;
        this.location = commonTypes_1.ChatLocation.Editor;
    }
    async buildPrompt(promptContext, progress, token) {
        const { query, history, chatVariables, } = promptContext;
        const nodeToDocument = this.nodeToDocument ?? await (0, definitionAroundCursor_1.determineNodeToDocument)(this.parserService, this.telemetryService, this.context);
        const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, this.endpoint, DocPrompt, {
            userQuery: query,
            documentContext: this.context,
            nodeToDocument,
            endpointInfo: this.endpoint,
            history: history,
            chatVariables,
            promptContext
        });
        const renderedPrompt = await renderer.render(progress, token);
        return renderedPrompt;
    }
    processResponse(context, inputStream, outputStream, token) {
        const document = this.context.document;
        const projectedDoc = new summarizeDocument_1.ProjectedDocument(document.getText(), stringEdit_1.StringEdit.empty, document.languageId);
        const range = this.nodeToDocument?.range ?? this.context.selection;
        let replyInterpreter;
        if (document.languageId === 'python') {
            /* @ulugbekna: for python, insert below first line of node being documented, e.g.,

                ```python
                class Foo: # <- this's being documented, so the node to document is the whole class; the docstring must be the line below `class Foo:`

                    def bar():
                        pass
                ```

            */
            const linesInRange = document.getText(range).split('\n').filter(s => s !== '').map(s => s.trim());
            const linesInOriginalRange = new Set(linesInRange);
            replyInterpreter = new promptingSummarizedDocument_1.InlineReplyInterpreter(this.context.document.uri, projectedDoc, this.context.fileIndentInfo, intents_1.LeadingMarkdownStreaming.Mute, 1 /* EarlyStopping.StopAfterFirstCodeBlock */, (lineFilter, streamingWorkingCopyDocument) => new streamingEdits_1.InsertionStreamingEdits(streamingWorkingCopyDocument, range.start, lineFilter), streamingEdits_1.TextPieceClassifiers.createCodeBlockClassifier(), (line) => !line.value.includes('FILEPATH') /* @ulugbekna: this's to remove marker lines if any */ &&
                !linesInOriginalRange.has(line.value.trim()) /* @ulugbekna: this's to prevent repeating of existing code */);
        }
        else {
            replyInterpreter = new promptingSummarizedDocument_1.InlineReplyInterpreter(this.context.document.uri, projectedDoc, this.context.fileIndentInfo, intents_1.LeadingMarkdownStreaming.Mute, 1 /* EarlyStopping.StopAfterFirstCodeBlock */, (lineFilter, streamingWorkingCopyDocument) => new streamingEdits_1.InsertOrReplaceStreamingEdits(streamingWorkingCopyDocument, range, range, 1 /* EditStrategy.FallbackToInsertAboveRange */, false, lineFilter), streamingEdits_1.TextPieceClassifiers.createCodeBlockClassifier(), (line) => !line.value.includes('FILEPATH'));
        }
        return replyInterpreter.processResponse(context, inputStream, outputStream, token);
    }
};
DocInvocation = __decorate([
    __param(4, parserService_1.IParserService),
    __param(5, telemetry_1.ITelemetryService),
    __param(6, instantiation_1.IInstantiationService)
], DocInvocation);
class DocPrompt extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const language = (0, markdown_1.languageIdToMDCodeBlockLang)(this.props.documentContext.language.languageId);
        const rewrittenMessage = this.props.chatVariables.substituteVariablesWithReferences(this.props.userQuery);
        const query = `${this.getQueryPrefix()} ${rewrittenMessage}`.trim();
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, null,
                "You are an AI programming assistant.",
                vscpp("br", null),
                "When asked for your name, you must respond with \"GitHub Copilot\".",
                vscpp("br", null),
                "You must follow user's requirements carefully.",
                vscpp("br", null),
                "You must follow Microsoft content policies.",
                vscpp("br", null),
                "You must avoid content that violates copyrights.",
                vscpp("br", null),
                "For questions not related to software development, you should give a reminder that you are an AI programming assistant.",
                vscpp("br", null)),
            vscpp(chatVariables_1.ChatToolReferences, { priority: 750, promptContext: this.props.promptContext, flexGrow: 1, embeddedInsideUserMessage: false }),
            vscpp(chatVariables_1.ChatVariables, { chatVariables: this.props.chatVariables, embeddedInsideUserMessage: false }),
            vscpp(definitionAroundCursor_1.DefinitionAroundCursor, { documentContext: this.props.documentContext, nodeToDocument: this.props.nodeToDocument, endpointInfo: this.props.endpointInfo }),
            vscpp(conversationHistory_1.HistoryWithInstructions, { inline: true, history: this.props.history, passPriority: true, historyPriority: 700 },
                vscpp(instructionMessage_1.InstructionMessage, null,
                    "When user asks you to document something, you must answer in the form of a ",
                    language,
                    " markdown code block.",
                    vscpp("br", null))),
            vscpp(prompt_tsx_1.UserMessage, null, query)));
    }
    getQueryPrefix() {
        const identifier = this.props.nodeToDocument?.identifier;
        const hasIdentifier = identifier !== undefined && identifier !== '';
        const docCommentTarget = hasIdentifier ? identifier : 'the selection';
        let docName;
        switch (this.props.documentContext.language.languageId) {
            case 'typescript':
            case 'typescriptreact':
                docName = (hasIdentifier ? 'a TSDoc comment' : 'TSDoc comment');
                break;
            case 'javascript':
            case 'javascriptreact':
                docName = (hasIdentifier ? 'a JSDoc comment' : 'JSDoc comment');
                break;
            case 'python':
                docName = 'docstring';
                break;
            default: // TODO@ulugbekna: add more languages based on tree-sitter parsers we have
                docName = 'documentation comment';
        }
        return `Please, given ${docCommentTarget}, generate ${docName} only. Do not repeat given code, only reply with ${docName} in a code block.`;
    }
}
//# sourceMappingURL=docIntent.js.map