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
exports.RequestLogger = void 0;
const pukuRequestTypes_1 = require("../../../platform/api/common/pukuRequestTypes");
const vscode_1 = require("vscode");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const statefulMarkerContainer_1 = require("../../../platform/endpoint/common/statefulMarkerContainer");
const logService_1 = require("../../../platform/log/common/logService");
const messageStringify_1 = require("../../../platform/log/common/messageStringify");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const markdown_1 = require("../../../util/common/markdown");
const assert_1 = require("../../../util/vs/base/common/assert");
const codicons_1 = require("../../../util/vs/base/common/codicons");
const event_1 = require("../../../util/vs/base/common/event");
const iterator_1 = require("../../../util/vs/base/common/iterator");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const requestLoggerToolResult_1 = require("./requestLoggerToolResult");
const workspaceEditRecorder_1 = require("./workspaceEditRecorder");
// Utility function to process deltas into a message string
function processDeltasToMessage(deltas) {
    return deltas.map((d, i) => {
        let text = '';
        if (d.text) {
            text += d.text;
        }
        // Can include other parts as needed
        if (d.copilotToolCalls) {
            if (i > 0) {
                text += '\n';
            }
            text += d.copilotToolCalls.map(c => {
                let argsStr = c.arguments;
                try {
                    const parsedArgs = JSON.parse(c.arguments);
                    argsStr = JSON.stringify(parsedArgs, undefined, 2)
                        .replace(/(?<!\\)\\n/g, '\n')
                        .replace(/(?<!\\)\\t/g, '\t');
                }
                catch (e) { }
                return `🛠️ ${c.name} (${c.id}) ${argsStr}`;
            }).join('\n');
        }
        return text;
    }).join('');
}
// Implementation classes with toJson methods
class LoggedElementInfo {
    constructor(id, name, tokens, maxTokens, trace, chatRequest) {
        this.id = id;
        this.name = name;
        this.tokens = tokens;
        this.maxTokens = maxTokens;
        this.trace = trace;
        this.chatRequest = chatRequest;
        this.kind = 0 /* LoggedInfoKind.Element */;
    }
    toJSON() {
        return {
            id: this.id,
            kind: 'element',
            name: this.name,
            tokens: this.tokens,
            maxTokens: this.maxTokens
        };
    }
}
class LoggedRequestInfo {
    constructor(id, entry, chatRequest) {
        this.id = id;
        this.entry = entry;
        this.chatRequest = chatRequest;
        this.kind = 1 /* LoggedInfoKind.Request */;
    }
    toJSON() {
        const baseInfo = {
            id: this.id,
            kind: 'request',
            type: this.entry.type,
            name: this.entry.debugName
        };
        if (this.entry.type === "MarkdownContentRequest" /* LoggedRequestKind.MarkdownContentRequest */) {
            return {
                ...baseInfo,
                startTime: new Date(this.entry.startTimeMs).toISOString(),
                content: this.entry.markdownContent
            };
        }
        // Handle stateful marker like _renderRequestToMarkdown does
        let lastResponseId;
        if (!this.entry.chatParams.ignoreStatefulMarker) {
            const statefulMarker = iterator_1.Iterable.first((0, statefulMarkerContainer_1.getAllStatefulMarkersAndIndicies)(this.entry.chatParams.messages));
            if (statefulMarker) {
                lastResponseId = {
                    marker: statefulMarker.statefulMarker.marker,
                    modelId: statefulMarker.statefulMarker.modelId
                };
            }
        }
        // Build response data based on entry type
        let responseData;
        let errorInfo;
        if (this.entry.type === "ChatMLSuccess" /* LoggedRequestKind.ChatMLSuccess */) {
            responseData = {
                type: 'success',
                message: this.entry.result.value
            };
        }
        else if (this.entry.type === "ChatMLFailure" /* LoggedRequestKind.ChatMLFailure */) {
            if (this.entry.result.type === commonTypes_1.ChatFetchResponseType.Length) {
                responseData = {
                    type: 'truncated',
                    message: this.entry.result.truncatedValue
                };
            }
            else {
                errorInfo = {
                    type: 'failure',
                    reason: this.entry.result.reason
                };
            }
        }
        else if (this.entry.type === "ChatMLCancelation" /* LoggedRequestKind.ChatMLCancelation */) {
            errorInfo = {
                type: 'canceled'
            };
        }
        const metadata = {
            url: typeof this.entry.chatEndpoint.urlOrRequestMetadata === 'string' ?
                this.entry.chatEndpoint.urlOrRequestMetadata : undefined,
            requestType: typeof this.entry.chatEndpoint.urlOrRequestMetadata === 'object' ?
                this.entry.chatEndpoint.urlOrRequestMetadata?.type : undefined,
            model: this.entry.chatParams.model,
            maxPromptTokens: this.entry.chatEndpoint.modelMaxPromptTokens,
            maxResponseTokens: this.entry.chatParams.body?.max_tokens,
            location: this.entry.chatParams.location,
            reasoning: this.entry.chatParams.body?.reasoning,
            intent: this.entry.chatParams.intent,
            startTime: this.entry.startTime?.toISOString(),
            endTime: this.entry.endTime?.toISOString(),
            duration: this.entry.endTime && this.entry.startTime ?
                this.entry.endTime.getTime() - this.entry.startTime.getTime() : undefined,
            ourRequestId: this.entry.chatParams.ourRequestId,
            lastResponseId: lastResponseId,
            requestId: this.entry.type === "ChatMLSuccess" /* LoggedRequestKind.ChatMLSuccess */ || this.entry.type === "ChatMLFailure" /* LoggedRequestKind.ChatMLFailure */ ? this.entry.result.requestId : undefined,
            serverRequestId: this.entry.type === "ChatMLSuccess" /* LoggedRequestKind.ChatMLSuccess */ || this.entry.type === "ChatMLFailure" /* LoggedRequestKind.ChatMLFailure */ ? this.entry.result.serverRequestId : undefined,
            timeToFirstToken: this.entry.type === "ChatMLSuccess" /* LoggedRequestKind.ChatMLSuccess */ ? this.entry.timeToFirstToken : undefined,
            usage: this.entry.type === "ChatMLSuccess" /* LoggedRequestKind.ChatMLSuccess */ ? this.entry.usage : undefined,
            tools: this.entry.chatParams.body?.tools,
        };
        const requestMessages = {
            messages: this.entry.chatParams.messages,
            prediction: this.entry.chatParams.body?.prediction
        };
        const response = responseData || errorInfo ? {
            ...responseData,
            ...errorInfo
        } : undefined;
        return {
            ...baseInfo,
            metadata: metadata,
            requestMessages: requestMessages,
            response: response
        };
    }
}
class LoggedToolCall {
    constructor(id, name, args, response, chatRequest, time, thinking, edits, toolMetadata) {
        this.id = id;
        this.name = name;
        this.args = args;
        this.response = response;
        this.chatRequest = chatRequest;
        this.time = time;
        this.thinking = thinking;
        this.edits = edits;
        this.toolMetadata = toolMetadata;
        this.kind = 2 /* LoggedInfoKind.ToolCall */;
    }
    async toJSON() {
        const responseData = [];
        for (const content of this.response.content) {
            if (content instanceof vscode_1.LanguageModelTextPart) {
                responseData.push(content.value);
            }
            else if (content instanceof vscode_1.LanguageModelDataPart) {
                responseData.push((0, requestLoggerToolResult_1.renderDataPartToString)(content));
            }
            else if (content instanceof vscode_1.LanguageModelPromptTsxPart) {
                responseData.push(await (0, requestLoggerToolResult_1.renderToolResultToStringNoBudget)(content));
            }
        }
        const thinking = this.thinking?.text ? {
            id: this.thinking.id,
            text: Array.isArray(this.thinking.text) ? this.thinking.text.join('\n') : this.thinking.text
        } : undefined;
        return {
            id: this.id,
            kind: 'toolCall',
            tool: this.name,
            args: this.args,
            time: new Date(this.time).toISOString(),
            response: responseData,
            thinking: thinking,
            edits: this.edits ? this.edits.map(edit => ({ path: edit.path, edits: JSON.parse(edit.edits) })) : undefined,
            toolMetadata: this.toolMetadata
        };
    }
}
let RequestLogger = class RequestLogger extends requestLogger_1.AbstractRequestLogger {
    constructor(_logService, _configService, _instantiationService) {
        super();
        this._logService = _logService;
        this._configService = _configService;
        this._instantiationService = _instantiationService;
        this._didRegisterLinkProvider = false;
        this._entries = [];
        this._onDidChangeRequests = new event_1.Emitter();
        this.onDidChangeRequests = this._onDidChangeRequests.event;
        this._isFirst = true;
        this._register(vscode_1.workspace.registerTextDocumentContentProvider(requestLogger_1.ChatRequestScheme.chatRequestScheme, {
            onDidChange: event_1.Event.map(this.onDidChangeRequests, () => vscode_1.Uri.parse(requestLogger_1.ChatRequestScheme.buildUri({ kind: 'latest' }))),
            provideTextDocumentContent: (uri) => {
                const parseResult = requestLogger_1.ChatRequestScheme.parseUri(uri.toString());
                if (!parseResult) {
                    return `Invalid URI: ${uri}`;
                }
                const { data: uriData, format } = parseResult;
                const entry = uriData.kind === 'latest' ? this._entries.at(-1) : this._entries.find(e => e.id === uriData.id);
                if (!entry) {
                    return `Request not found`;
                }
                if (format === 'json') {
                    return this._renderToJson(entry);
                }
                else if (format === 'rawrequest') {
                    return this._renderRawRequestToJson(entry);
                }
                else {
                    // Existing markdown logic
                    switch (entry.kind) {
                        case 0 /* LoggedInfoKind.Element */:
                            return 'Not available';
                        case 2 /* LoggedInfoKind.ToolCall */:
                            return this._renderToolCallToMarkdown(entry);
                        case 1 /* LoggedInfoKind.Request */:
                            return this._renderRequestToMarkdown(entry.id, entry.entry);
                        default:
                            (0, assert_1.assertNever)(entry);
                    }
                }
            }
        }));
    }
    getRequests() {
        return [...this._entries];
    }
    logModelListCall(id, requestMetadata, models) {
        this.addEntry({
            type: "MarkdownContentRequest" /* LoggedRequestKind.MarkdownContentRequest */,
            debugName: 'modelList',
            startTimeMs: Date.now(),
            icon: codicons_1.Codicon.fileCode,
            markdownContent: this._renderModelListToMarkdown(id, requestMetadata, models)
        });
    }
    logToolCall(id, name, args, response, thinking) {
        const edits = this._workspaceEditRecorder?.getEditsAndReset();
        // Extract toolMetadata from response if it exists
        const toolMetadata = 'toolMetadata' in response ? response.toolMetadata : undefined;
        this._addEntry(new LoggedToolCall(id, name, args, response, this.currentRequest, Date.now(), thinking, edits, toolMetadata));
    }
    /** Start tracking edits made to the workspace for every tool call. */
    enableWorkspaceEditTracing() {
        if (!this._workspaceEditRecorder) {
            this._workspaceEditRecorder = this._instantiationService.createInstance(workspaceEditRecorder_1.WorkspaceEditRecorder);
        }
    }
    disableWorkspaceEditTracing() {
        if (this._workspaceEditRecorder) {
            this._workspaceEditRecorder.dispose();
            this._workspaceEditRecorder = undefined;
        }
    }
    addPromptTrace(elementName, endpoint, result, trace) {
        const id = (0, uuid_1.generateUuid)().substring(0, 8);
        this._addEntry(new LoggedElementInfo(id, elementName, result.tokenCount, endpoint.modelMaxPromptTokens, trace, this.currentRequest))
            .catch(e => this._logService.error(e));
    }
    addEntry(entry) {
        const id = (0, uuid_1.generateUuid)().substring(0, 8);
        if (!this._shouldLog(entry)) {
            return;
        }
        this._addEntry(new LoggedRequestInfo(id, entry, this.currentRequest))
            .then(ok => {
            if (ok) {
                this._ensureLinkProvider();
                let extraData;
                if (entry.type === "MarkdownContentRequest" /* LoggedRequestKind.MarkdownContentRequest */) {
                    extraData = 'markdown';
                }
                else {
                    const status = entry.type === "ChatMLCancelation" /* LoggedRequestKind.ChatMLCancelation */ ? 'cancelled' : entry.result.type;
                    let modelInfo = entry.chatEndpoint.model;
                    // Add resolved model if it differs from requested model
                    if (entry.type === "ChatMLSuccess" /* LoggedRequestKind.ChatMLSuccess */ &&
                        entry.result.resolvedModel &&
                        entry.result.resolvedModel !== entry.chatEndpoint.model) {
                        modelInfo += ` -> ${entry.result.resolvedModel}`;
                    }
                    const duration = `${entry.endTime.getTime() - entry.startTime.getTime()}ms`;
                    extraData = `${status} | ${modelInfo} | ${duration} | [${entry.debugName}]`;
                }
                this._logService.info(`${requestLogger_1.ChatRequestScheme.buildUri({ kind: 'request', id: id })} | ${extraData}`);
            }
        })
            .catch(e => this._logService.error(e));
    }
    _shouldLog(entry) {
        // don't log cancelled requests by XTabProviderId (because it triggers and cancels lots of requests)
        if (entry.debugName === configurationService_1.XTabProviderId &&
            !this._configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsLogCancelledRequests) &&
            entry.type === "ChatMLCancelation" /* LoggedRequestKind.ChatMLCancelation */) {
            return false;
        }
        return true;
    }
    async _addEntry(entry) {
        if (this._isFirst) {
            this._isFirst = false;
            this._logService.info(`Latest entry: ${requestLogger_1.ChatRequestScheme.buildUri({ kind: 'latest' })}`);
        }
        this._entries.push(entry);
        const maxEntries = this._configService.getConfig(configurationService_1.ConfigKey.Internal.RequestLoggerMaxEntries);
        if (this._entries.length > maxEntries) {
            this._entries.shift();
        }
        this._onDidChangeRequests.fire();
        return true;
    }
    _ensureLinkProvider() {
        if (this._didRegisterLinkProvider) {
            return;
        }
        this._didRegisterLinkProvider = true;
        const docLinkProvider = new (class {
            provideDocumentLinks(td, ct) {
                return requestLogger_1.ChatRequestScheme.findAllUris(td.getText()).map(u => new vscode_1.DocumentLink(new vscode_1.Range(td.positionAt(u.range.start), td.positionAt(u.range.endExclusive)), vscode_1.Uri.parse(u.uri)));
            }
        })();
        this._register(vscode_1.languages.registerDocumentLinkProvider({ scheme: 'output' }, docLinkProvider));
    }
    _renderMarkdownStyles() {
        return `
<style>
[id^="system"], [id^="user"], [id^="assistant"] {
		margin: 4px 0 4px 0;
}

.markdown-body > pre {
		padding: 4px 16px;
}
</style>
`;
    }
    async _renderToJson(entry) {
        try {
            const jsonObject = await entry.toJSON();
            return JSON.stringify(jsonObject, null, 2);
        }
        catch (error) {
            return JSON.stringify({
                id: entry.id,
                kind: 'error',
                error: error?.toString() || 'Unknown error',
                timestamp: new Date().toISOString()
            }, null, 2);
        }
    }
    async _renderToolCallToMarkdown(entry) {
        const result = [];
        result.push(`# Tool Call - ${entry.id}`);
        result.push(``);
        result.push(`## Request`);
        result.push(`~~~`);
        let args;
        if (typeof entry.args === 'string') {
            try {
                args = JSON.stringify(JSON.parse(entry.args), undefined, 2)
                    .replace(/\\n/g, '\n')
                    .replace(/(?!=\\)\\t/g, '\t');
            }
            catch {
                args = entry.args;
            }
        }
        else {
            args = JSON.stringify(entry.args, undefined, 2);
        }
        result.push(`id   : ${entry.id}`);
        result.push(`tool : ${entry.name}`);
        result.push(`args : ${args}`);
        result.push(`~~~`);
        result.push(`## Response`);
        for (const content of entry.response.content) {
            result.push(`~~~`);
            if (content instanceof vscode_1.LanguageModelTextPart) {
                result.push(content.value);
            }
            else if (content instanceof vscode_1.LanguageModelDataPart) {
                result.push((0, requestLoggerToolResult_1.renderDataPartToString)(content));
            }
            else if (content instanceof vscode_1.LanguageModelPromptTsxPart) {
                result.push(await (0, requestLoggerToolResult_1.renderToolResultToStringNoBudget)(content));
            }
            result.push(`~~~`);
        }
        if (entry.thinking?.text) {
            result.push(`## Thinking`);
            if (entry.thinking.id) {
                result.push(`thinkingId: ${entry.thinking.id}`);
            }
            result.push(`~~~`);
            result.push(Array.isArray(entry.thinking.text) ? entry.thinking.text.join('\n') : entry.thinking.text);
            result.push(`~~~`);
        }
        return result.join('\n');
    }
    _renderRequestToMarkdown(id, entry) {
        if (entry.type === "MarkdownContentRequest" /* LoggedRequestKind.MarkdownContentRequest */) {
            return entry.markdownContent;
        }
        const result = [];
        result.push(`> 🚨 Note: This log may contain personal information such as the contents of your files or terminal output. Please review the contents carefully before sharing.`);
        result.push(`# ${entry.debugName} - ${id}`);
        result.push(``);
        // Just some other options to track
        // TODO Probably we should just extract every item on the body and format it as below, instead of doing this one-by-one
        const otherOptions = {};
        for (const opt of ['temperature', 'stream', 'store']) {
            if (entry.chatParams.body?.[opt] !== undefined) {
                otherOptions[opt] = entry.chatParams.body[opt];
            }
        }
        const durationMs = entry.endTime.getTime() - entry.startTime.getTime();
        const tocItems = [];
        tocItems.push(`- [Request Messages](#request-messages)`);
        tocItems.push(`  - [System](#system)`);
        tocItems.push(`  - [User](#user)`);
        if (!!entry.chatParams.body?.prediction) {
            tocItems.push(`- [Prediction](#prediction)`);
        }
        tocItems.push(`- [Response](#response)`);
        if (tocItems.length) {
            for (const item of tocItems) {
                result.push(item);
            }
            result.push(``);
        }
        result.push(`## Metadata`);
        result.push(`~~~`);
        if (typeof entry.chatEndpoint.urlOrRequestMetadata === 'string') {
            result.push(`url              : ${entry.chatEndpoint.urlOrRequestMetadata}`);
        }
        else if (entry.chatEndpoint.urlOrRequestMetadata) {
            result.push(`requestType      : ${entry.chatEndpoint.urlOrRequestMetadata?.type}`);
        }
        result.push(`model            : ${entry.chatParams.model}`);
        result.push(`maxPromptTokens  : ${entry.chatEndpoint.modelMaxPromptTokens}`);
        result.push(`maxResponseTokens: ${entry.chatParams.body?.max_tokens}`);
        result.push(`location         : ${entry.chatParams.location}`);
        result.push(`otherOptions     : ${JSON.stringify(otherOptions)}`);
        if (entry.chatParams.body?.reasoning) {
            result.push(`reasoning        : ${JSON.stringify(entry.chatParams.body.reasoning)}`);
        }
        result.push(`intent           : ${entry.chatParams.intent}`);
        result.push(`startTime        : ${entry.startTime.toJSON()}`);
        result.push(`endTime          : ${entry.endTime.toJSON()}`);
        result.push(`duration         : ${durationMs}ms`);
        result.push(`ourRequestId     : ${entry.chatParams.ourRequestId}`);
        const ignoreStatefulMarker = entry.chatParams.ignoreStatefulMarker;
        if (!ignoreStatefulMarker) {
            const statefulMarker = iterator_1.Iterable.first((0, statefulMarkerContainer_1.getAllStatefulMarkersAndIndicies)(entry.chatParams.messages));
            if (statefulMarker) {
                result.push(`lastResponseId   : ${statefulMarker.statefulMarker.marker} using ${statefulMarker.statefulMarker.modelId}`);
            }
        }
        if (entry.type === "ChatMLSuccess" /* LoggedRequestKind.ChatMLSuccess */) {
            result.push(`requestId        : ${entry.result.requestId}`);
            result.push(`serverRequestId  : ${entry.result.serverRequestId}`);
            result.push(`timeToFirstToken : ${entry.timeToFirstToken}ms`);
            result.push(`resolved model   : ${entry.result.resolvedModel}`);
            result.push(`usage            : ${JSON.stringify(entry.usage)}`);
        }
        else if (entry.type === "ChatMLFailure" /* LoggedRequestKind.ChatMLFailure */) {
            result.push(`requestId        : ${entry.result.requestId}`);
            result.push(`serverRequestId  : ${entry.result.serverRequestId}`);
        }
        if (entry.chatParams.body?.tools) {
            result.push(`tools            : ${JSON.stringify(entry.chatParams.body.tools, undefined, 4)}`);
        }
        result.push(`~~~`);
        result.push(`## Request Messages`);
        for (const message of entry.chatParams.messages) {
            result.push((0, messageStringify_1.messageToMarkdown)(message, ignoreStatefulMarker));
        }
        if (typeof entry.chatParams.body?.prediction?.content === 'string') {
            result.push(`## Prediction`);
            result.push((0, markdown_1.createFencedCodeBlock)('markdown', entry.chatParams.body.prediction.content, false));
        }
        result.push(``);
        if (entry.type === "ChatMLSuccess" /* LoggedRequestKind.ChatMLSuccess */) {
            result.push(``);
            result.push(`## Response`);
            if (entry.deltas?.length) {
                result.push(this._renderDeltasToMarkdown('assistant', entry.deltas));
            }
            else {
                const messages = entry.result.value;
                let message = '';
                if (Array.isArray(messages)) {
                    if (messages.length === 1) {
                        message = messages[0];
                    }
                    else {
                        message = `${messages.map(v => `<<${v}>>`).join(', ')}`;
                    }
                }
                result.push(this._renderStringMessageToMarkdown('assistant', message));
            }
        }
        else if (entry.type === "ChatMLFailure" /* LoggedRequestKind.ChatMLFailure */) {
            result.push(``);
            result.push(`<a id="response"></a>`);
            if (entry.result.type === commonTypes_1.ChatFetchResponseType.Length) {
                result.push(`## Response (truncated)`);
                result.push(this._renderStringMessageToMarkdown('assistant', entry.result.truncatedValue));
            }
            else {
                result.push(`## FAILED: ${entry.result.reason}`);
            }
        }
        else if (entry.type === "ChatMLCancelation" /* LoggedRequestKind.ChatMLCancelation */) {
            result.push(``);
            result.push(`<a id="response"></a>`);
            result.push(`## CANCELED`);
        }
        result.push(this._renderMarkdownStyles());
        return result.join('\n');
    }
    _renderStringMessageToMarkdown(role, message) {
        const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1);
        return `### ${capitalizedRole}\n${(0, markdown_1.createFencedCodeBlock)('markdown', message)}\n`;
    }
    _renderDeltasToMarkdown(role, deltas) {
        const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1);
        const message = processDeltasToMessage(deltas);
        return `### ${capitalizedRole}\n~~~md\n${message}\n~~~\n`;
    }
    _renderModelListToMarkdown(requestId, requestMetadata, models) {
        const result = [];
        result.push(`# Model List Request`);
        result.push(``);
        result.push(`## Metadata`);
        result.push(`~~~`);
        result.push(`requestId        : ${requestId}`);
        result.push(`requestType      : ${requestMetadata?.type || 'unknown'}`);
        result.push(`isModelLab       : ${requestMetadata ? 'yes' : 'no'}`);
        if (requestMetadata.type === pukuRequestTypes_1.RequestType.ListModel) {
            result.push(`requestedModel   : ${requestMetadata?.modelId || 'unknown'}`);
        }
        result.push(`modelsCount      : ${models.length}`);
        result.push(`~~~`);
        if (models.length > 0) {
            result.push(`## Available Models (Raw API Response)`);
            result.push(``);
            result.push(`\`\`\`json`);
            result.push(JSON.stringify(models, null, 2));
            result.push(`\`\`\``);
            result.push(``);
            // Keep a brief summary for quick reference
            result.push(`## Summary`);
            result.push(`~~~`);
            result.push(`Total models     : ${models.length}`);
            result.push(`Chat models      : ${models.filter(m => m.capabilities.type === 'chat').length}`);
            result.push(`Completion models: ${models.filter(m => m.capabilities.type === 'completion').length}`);
            result.push(`Premium models   : ${models.filter(m => m.billing?.is_premium).length}`);
            result.push(`Preview models   : ${models.filter(m => m.preview).length}`);
            result.push(`Default chat     : ${models.find(m => m.is_chat_default)?.id || 'none'}`);
            result.push(`Fallback chat    : ${models.find(m => m.is_chat_fallback)?.id || 'none'}`);
            result.push(`~~~`);
        }
        result.push(this._renderMarkdownStyles());
        return result.join('\n');
    }
    _renderRawRequestToJson(entry) {
        if (entry.kind !== 1 /* LoggedInfoKind.Request */) {
            return 'Not available';
        }
        const req = entry.entry;
        if (req.type === "MarkdownContentRequest" /* LoggedRequestKind.MarkdownContentRequest */ || !req.chatParams.body) {
            return 'Not available';
        }
        try {
            return JSON.stringify(req.chatParams.body, null, 2);
        }
        catch (e) {
            return `Failed to render body: ${e}`;
        }
    }
};
exports.RequestLogger = RequestLogger;
exports.RequestLogger = RequestLogger = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, configurationService_1.IConfigurationService),
    __param(2, instantiation_1.IInstantiationService)
], RequestLogger);
//# sourceMappingURL=requestLoggerImpl.js.map