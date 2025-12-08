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
var McpLinkedResourceToolResult_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolCallResultWrapper = exports.ToolResult = exports.ToolResultMetadata = exports.ToolFailureEncountered = exports.ChatToolCalls = void 0;
exports.sendInvokedToolTelemetry = sendInvokedToolTelemetry;
exports.imageDataPartToTSX = imageDataPartToTSX;
exports.toolCallErrorToResult = toolCallErrorToResult;
const pukuRequestTypes_1 = require("../../../../platform/api/common/pukuRequestTypes");
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const authentication_1 = require("../../../../platform/authentication/common/authentication");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const chatModelCapabilities_1 = require("../../../../platform/endpoint/common/chatModelCapabilities");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const endpointTypes_1 = require("../../../../platform/endpoint/common/endpointTypes");
const statefulMarkerContainer_1 = require("../../../../platform/endpoint/common/statefulMarkerContainer");
const thinkingDataContainer_1 = require("../../../../platform/endpoint/common/thinkingDataContainer");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const imageService_1 = require("../../../../platform/image/common/imageService");
const logService_1 = require("../../../../platform/log/common/logService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const errorMessage_1 = require("../../../../util/vs/base/common/errorMessage");
const errors_1 = require("../../../../util/vs/base/common/errors");
const uri_1 = require("../../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const languageModelChatMessageHelpers_1 = require("../../../conversation/common/languageModelChatMessageHelpers");
const toolNames_1 = require("../../../tools/common/toolNames");
const toolsRegistry_1 = require("../../../tools/common/toolsRegistry");
const toolsService_1 = require("../../../tools/common/toolsService");
const promptRenderer_1 = require("../base/promptRenderer");
const tag_1 = require("../base/tag");
const MAX_INPUT_VALIDATION_RETRIES = 5;
/**
 * Render one round of the assistant response's tool calls.
 * One assistant response "turn" which contains multiple rounds of assistant message text, tool calls, and tool results.
 */
let ChatToolCalls = class ChatToolCalls extends prompt_tsx_1.PromptElement {
    constructor(props, toolsService, promptEndpoint, instantiationService) {
        super(props);
        this.toolsService = toolsService;
        this.promptEndpoint = promptEndpoint;
        this.instantiationService = instantiationService;
    }
    async render(state, sizing) {
        if (!this.props.promptContext.tools || !this.props.toolCallRounds?.length) {
            return;
        }
        const toolCallRounds = this.props.toolCallRounds.flatMap((round, i) => {
            return this.renderOneToolCallRound(round, i, this.props.toolCallRounds.length);
        });
        if (!toolCallRounds.length) {
            return;
        }
        const KeepWith = (0, prompt_tsx_1.useKeepWith)();
        return vscpp(vscppf, null,
            vscpp(KeepWith, { priority: 1, flexGrow: 1 }, toolCallRounds));
    }
    /**
     * Render one round of tool calling: the assistant message text, its tool calls, and the results of those tool calls.
     */
    renderOneToolCallRound(round, index, total) {
        let fixedNameToolCalls = round.toolCalls.map(tc => ({ ...tc, name: this.toolsService.validateToolName(tc.name) ?? tc.name }));
        if (this.props.isHistorical) {
            fixedNameToolCalls = fixedNameToolCalls.filter(tc => tc.id && this.props.toolCallResults?.[tc.id]);
        }
        if (round.toolCalls.length && !fixedNameToolCalls.length) {
            return [];
        }
        const assistantToolCalls = fixedNameToolCalls.map(tc => ({
            type: 'function',
            function: { name: tc.name, arguments: tc.arguments },
            id: tc.id,
            keepWith: (0, prompt_tsx_1.useKeepWith)(),
        }));
        const children = [];
        // Don't include this when rendering and triggering summarization
        const statefulMarker = round.statefulMarker && vscpp(statefulMarkerContainer_1.StatefulMarkerContainer, { statefulMarker: { modelId: this.promptEndpoint.model, marker: round.statefulMarker } });
        const thinking = (!this.props.isHistorical) && round.thinking && vscpp(thinkingDataContainer_1.ThinkingDataContainer, { thinking: round.thinking });
        children.push(vscpp(prompt_tsx_1.AssistantMessage, { toolCalls: assistantToolCalls },
            statefulMarker,
            thinking,
            round.response));
        // Tool call elements should be rendered with the later elements first, allowed to grow to fill the available space
        // Each tool 'reserves' 1/(N*4) of the available space just so that newer tool calls don't completely elimate
        // older tool calls.
        const reserve1N = (1 / (total * 4)) / fixedNameToolCalls.length;
        // todo@connor4312: historical tool calls don't need to reserve and can all be flexed together
        for (const [i, toolCall] of fixedNameToolCalls.entries()) {
            const KeepWith = assistantToolCalls[i].keepWith;
            children.push(vscpp(KeepWith, { priority: index, flexGrow: index + 1, flexReserve: `/${1 / reserve1N}` }, this.instantiationService.invokeFunction(buildToolResultElement, {
                toolCall: toolCall,
                toolInvocationToken: this.props.promptContext.tools.toolInvocationToken,
                toolCallResult: this.props.toolCallResults?.[toolCall.id],
                allowInvokingTool: !this.props.isHistorical,
                validateInput: round.toolInputRetry < MAX_INPUT_VALIDATION_RETRIES,
                requestId: this.props.promptContext.requestId,
                toolCallMode: this.props.toolCallMode ?? toolsRegistry_1.CopilotToolMode.PartialContext,
                promptContext: this.props.promptContext,
                isLast: !this.props.isHistorical && i === fixedNameToolCalls.length - 1 && index === total - 1,
                enableCacheBreakpoints: this.props.enableCacheBreakpoints ?? false,
                truncateAt: this.props.truncateAt,
            })));
        }
        return children;
    }
};
exports.ChatToolCalls = ChatToolCalls;
exports.ChatToolCalls = ChatToolCalls = __decorate([
    __param(1, toolsService_1.IToolsService),
    __param(2, promptRenderer_1.IPromptEndpoint),
    __param(3, instantiation_1.IInstantiationService)
], ChatToolCalls);
const toolErrorSuffix = '\nPlease check your input and try again.';
/**
 * Creates a <ToolResult /> element. Eagerly starts the tool call if we know
 * that the tool will not need/consume sizing information (e.g. MCP calls) and
 * therefore don't need to wait for other elements to sequentially render.
 */
function buildToolResultElement(accessor, props) {
    const toolsService = accessor.get(toolsService_1.IToolsService);
    const logService = accessor.get(logService_1.ILogService);
    const telemetryService = accessor.get(telemetry_1.ITelemetryService);
    const endpointProvider = accessor.get(endpointProvider_1.IEndpointProvider);
    const promptEndpoint = accessor.get(promptRenderer_1.IPromptEndpoint);
    const tool = toolsService.getTool(props.toolCall.name);
    async function getToolResult(sizing) {
        const tokenizationOptions = {
            tokenBudget: sizing.tokenBudget,
            countTokens: async (content) => sizing.countTokens(content),
        };
        if (!props.toolCallResult && !props.allowInvokingTool) {
            throw new Error(`Missing tool call result for "${props.toolCall.id}" (${props.toolCall.name})`);
        }
        const extraMetadata = [];
        let isCancelled = false;
        let toolResult = props.toolCallResult;
        const copilotTool = toolsService.getCopilotTool(props.toolCall.name);
        if (toolResult === undefined) {
            let inputObj;
            let validation = ToolValidationOutcome.Unknown;
            if (props.validateInput) {
                const validationResult = toolsService.validateToolInput(props.toolCall.name, props.toolCall.arguments);
                if ('error' in validationResult) {
                    validation = ToolValidationOutcome.Invalid;
                    extraMetadata.push(new ToolFailureEncountered(props.toolCall.id));
                    toolResult = textToolResult(validationResult.error + toolErrorSuffix);
                }
                else {
                    validation = ToolValidationOutcome.Valid;
                    inputObj = validationResult.inputObj;
                }
            }
            else {
                inputObj = JSON.parse(props.toolCall.arguments);
            }
            let outcome = toolResult === undefined ? ToolInvocationOutcome.Success : ToolInvocationOutcome.InvalidInput;
            if (toolResult === undefined) {
                try {
                    if (props.promptContext.tools && !props.promptContext.tools.availableTools.find(t => t.name === props.toolCall.name)) {
                        outcome = ToolInvocationOutcome.DisabledByUser;
                        throw new Error(`Tool ${props.toolCall.name} is currently disabled by the user, and cannot be called.`);
                    }
                    if (copilotTool?.resolveInput) {
                        inputObj = await copilotTool.resolveInput(inputObj, props.promptContext, props.toolCallMode);
                    }
                    const invocationOptions = {
                        input: inputObj,
                        toolInvocationToken: props.toolInvocationToken,
                        tokenizationOptions,
                        chatRequestId: props.requestId
                    };
                    if (props.promptContext.tools?.inSubAgent || props.promptContext.request?.isSubagent) {
                        invocationOptions.fromSubAgent = true;
                    }
                    toolResult = await toolsService.invokeTool(props.toolCall.name, invocationOptions, cancellation_1.CancellationToken.None);
                    sendInvokedToolTelemetry(promptEndpoint.acquireTokenizer(), telemetryService, props.toolCall.name, toolResult);
                }
                catch (err) {
                    const errResult = toolCallErrorToResult(err);
                    toolResult = errResult.result;
                    isCancelled = errResult.isCancelled ?? false;
                    if (errResult.isCancelled) {
                        outcome = ToolInvocationOutcome.Cancelled;
                    }
                    else {
                        outcome = outcome === ToolInvocationOutcome.DisabledByUser ? outcome : ToolInvocationOutcome.Error;
                        extraMetadata.push(new ToolFailureEncountered(props.toolCall.id));
                        logService.error(`Error from tool ${props.toolCall.name} with args ${props.toolCall.arguments}`, (0, errorMessage_1.toErrorMessage)(err, true));
                    }
                }
            }
            sendToolCallTelemetry(props, outcome, validation, endpointProvider, telemetryService);
        }
        return { toolResult, isCancelled, extraMetadata };
    }
    let call;
    if (tool?.source instanceof vscodeTypes_1.LanguageModelToolMCPSource) {
        const promise = getToolResult({ tokenBudget: 1, countTokens: () => 1, endpoint: { modelMaxPromptTokens: 1 } });
        call = () => promise;
    }
    else {
        call = getToolResult;
    }
    return vscpp(ToolResultElement, { call: call, enableCacheBreakpoints: props.enableCacheBreakpoints, truncateAt: props.truncateAt, toolCall: props.toolCall, isLast: props.isLast });
}
async function sendToolCallTelemetry(props, invokeOutcome, validateOutcome, endpointProvider, telemetryService) {
    const model = props.promptContext.request?.model && (await endpointProvider.getChatEndpoint(props.promptContext.request?.model)).model;
    const toolName = props.toolCall.name;
    /* __GDPR__
        "toolInvoke" : {
            "owner": "donjayamanne",
            "comment": "Details about invocation of tools",
            "validateOutcome": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The outcome of the tool input validation. valid, invalid and unknown" },
            "invokeOutcome": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The outcome of the tool Invokcation. invalidInput, disabledByUser, success, error, cancelled" },
            "toolName": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The name of the tool being invoked." },
            "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that invoked the tool" }
        }
    */
    telemetryService.sendMSFTTelemetryEvent('toolInvoke', {
        validateOutcome,
        invokeOutcome,
        toolName,
        model
    });
    if (toolName === toolNames_1.ToolName.EditNotebook) {
        sendNotebookEditToolValidationTelemetry(invokeOutcome, validateOutcome, props.toolCall.arguments, telemetryService, model);
    }
}
/**
 * One tool call result, which either comes from the cache or from invoking the tool.
 */
class ToolResultElement extends prompt_tsx_1.PromptElement {
    async render(state, sizing) {
        const { extraMetadata, toolResult, isCancelled } = await this.props.call(sizing);
        const toolResultElement = this.props.enableCacheBreakpoints ?
            vscpp(vscppf, null,
                vscpp(prompt_tsx_1.Chunk, null,
                    vscpp(ToolResult, { content: toolResult.content, truncate: this.props.truncateAt }))) :
            vscpp(ToolResult, { content: toolResult.content, truncate: this.props.truncateAt });
        return (vscpp(prompt_tsx_1.ToolMessage, { toolCallId: this.props.toolCall.id },
            vscpp("meta", { value: new ToolResultMetadata(this.props.toolCall.id, toolResult, isCancelled) }),
            ...extraMetadata.map(m => vscpp("meta", { value: m })),
            toolResultElement,
            this.props.isLast && this.props.enableCacheBreakpoints && vscpp("cacheBreakpoint", { type: endpointTypes_1.CacheType })));
    }
}
function sendInvokedToolTelemetry(tokenizer, telemetry, toolName, toolResult) {
    new prompt_tsx_1.PromptRenderer({ modelMaxPromptTokens: Infinity }, class extends prompt_tsx_1.PromptElement {
        render() {
            return vscpp(prompt_tsx_1.UserMessage, null,
                vscpp(PrimitiveToolResult, { content: toolResult.content }));
        }
    }, {}, tokenizer).render().then(({ tokenCount }) => {
        /* __GDPR__
            "agent.tool.responseLength" : {
                "owner": "connor4312",
                "comment": "Counts the number of tokens generated by tools",
                "toolName": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The name of the tool being invoked." },
                "tokenCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of tokens used.", "isMeasurement": true }
            }
        */
        telemetry.sendMSFTTelemetryEvent('agent.tool.responseLength', { toolName }, { tokenCount });
    });
}
var ToolValidationOutcome;
(function (ToolValidationOutcome) {
    ToolValidationOutcome["Valid"] = "valid";
    ToolValidationOutcome["Invalid"] = "invalid";
    ToolValidationOutcome["Unknown"] = "unknown";
})(ToolValidationOutcome || (ToolValidationOutcome = {}));
var ToolInvocationOutcome;
(function (ToolInvocationOutcome) {
    ToolInvocationOutcome["InvalidInput"] = "invalidInput";
    ToolInvocationOutcome["DisabledByUser"] = "disabledByUser";
    ToolInvocationOutcome["Success"] = "success";
    ToolInvocationOutcome["Error"] = "error";
    ToolInvocationOutcome["Cancelled"] = "cancelled";
})(ToolInvocationOutcome || (ToolInvocationOutcome = {}));
async function imageDataPartToTSX(part, githubToken, urlOrRequestMetadata, logService, imageService) {
    if ((0, languageModelChatMessageHelpers_1.isImageDataPart)(part)) {
        const base64 = Buffer.from(part.data).toString('base64');
        let imageSource = `data:${part.mimeType};base64,${base64}`;
        const isChatCompletions = typeof urlOrRequestMetadata !== 'string' && urlOrRequestMetadata?.type === pukuRequestTypes_1.RequestType.ChatCompletions;
        if (githubToken && isChatCompletions && imageService) {
            try {
                const uri = await imageService.uploadChatImageAttachment(part.data, 'tool-result-image', part.mimeType ?? 'image/png', githubToken);
                if (uri) {
                    imageSource = uri.toString();
                }
            }
            catch (error) {
                if (logService) {
                    logService.warn(`Image upload failed, using base64 fallback: ${error}`);
                }
            }
        }
        return vscpp(prompt_tsx_1.Image, { src: imageSource });
    }
}
function textToolResult(text) {
    return new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart(text)]);
}
function toolCallErrorToResult(err) {
    if ((0, errors_1.isCancellationError)(err)) {
        return { result: textToolResult('The user cancelled the tool call.'), isCancelled: true };
    }
    else {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { result: textToolResult(`ERROR while calling tool: ${errorMessage}${toolErrorSuffix}`) };
    }
}
class ToolFailureEncountered extends prompt_tsx_1.PromptMetadata {
    constructor(toolCallId) {
        super();
        this.toolCallId = toolCallId;
    }
}
exports.ToolFailureEncountered = ToolFailureEncountered;
class ToolResultMetadata extends prompt_tsx_1.PromptMetadata {
    constructor(toolCallId, result, isCancelled) {
        super();
        this.toolCallId = toolCallId;
        this.result = result;
        this.isCancelled = isCancelled;
    }
}
exports.ToolResultMetadata = ToolResultMetadata;
// Some MCP servers return a ton of resources as a 'download' action.
// Only include them all eagerly if we have a manageable number.
const DONT_INCLUDE_RESOURCE_CONTENT_IF_TOOL_HAS_MORE_THAN = 9;
let McpLinkedResourceToolResult = class McpLinkedResourceToolResult extends prompt_tsx_1.PromptElement {
    static { McpLinkedResourceToolResult_1 = this; }
    static { this.mimeType = 'application/vnd.code.resource-link'; }
    static { this.MAX_PREVIEW_LINES = 500; }
    constructor(props, fileSystemService, ignoreService) {
        super(props);
        this.fileSystemService = fileSystemService;
        this.ignoreService = ignoreService;
    }
    async render() {
        if (await this.ignoreService.isCopilotIgnored(this.props.resourceUri)) {
            return null;
        }
        if (this.props.count > DONT_INCLUDE_RESOURCE_CONTENT_IF_TOOL_HAS_MORE_THAN) {
            return vscpp(tag_1.Tag, { name: 'resource', attrs: { uri: this.props.resourceUri.toString() } });
        }
        const contents = await this.fileSystemService.readFile(this.props.resourceUri);
        const lines = new TextDecoder().decode(contents).split(/\r?\n/g);
        const maxLines = McpLinkedResourceToolResult_1.MAX_PREVIEW_LINES;
        return vscpp(vscppf, null,
            vscpp(tag_1.Tag, { name: 'resource', attrs: { uri: this.props.resourceUri.toString(), isTruncated: lines.length > maxLines } }, lines.slice(0, maxLines).join('\n')));
    }
};
McpLinkedResourceToolResult = McpLinkedResourceToolResult_1 = __decorate([
    __param(1, fileSystemService_1.IFileSystemService),
    __param(2, ignoreService_1.IIgnoreService)
], McpLinkedResourceToolResult);
let PrimitiveToolResult = class PrimitiveToolResult extends prompt_tsx_1.PromptElement {
    constructor(props, endpoint, authService, logService, imageService, configurationService, experimentationService) {
        super(props);
        this.endpoint = endpoint;
        this.authService = authService;
        this.logService = logService;
        this.imageService = imageService;
        this.configurationService = configurationService;
        this.experimentationService = experimentationService;
        /**
         * Some models do not yet support CAPI image uploads. For these cases,
         * track the number of images bytes we're sending and truncate any images
         * that would exceed that budget. Current CAPI default is 5MB, so allow
         * images to use half of that.
         */
        this.imageSizeBudgetLeft = (5 * 1024 * 1024) / 2; // 5MB
        this.linkedResources = this.props.content.filter((c) => c instanceof vscodeTypes_1.LanguageModelDataPart && c.mimeType === McpLinkedResourceToolResult.mimeType);
    }
    async render() {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.IfEmpty, { alt: '(empty)' },
                await Promise.all(this.props.content.filter(part => this.hasAssistantAudience(part)).map(async (part) => {
                    if (part instanceof vscodeTypes_1.LanguageModelTextPart) {
                        return await this.onText(part.value);
                    }
                    else if (part instanceof vscodeTypes_1.LanguageModelPromptTsxPart) {
                        return await this.onTSX(part.value);
                    }
                    else if ((0, languageModelChatMessageHelpers_1.isImageDataPart)(part)) {
                        return await this.onImage(part);
                    }
                    else if (part instanceof vscodeTypes_1.LanguageModelDataPart) {
                        return await this.onData(part);
                    }
                })),
                this.linkedResources.length > 0 && `\n\nHint: you can read the full contents of any ${this.linkedResources.length > DONT_INCLUDE_RESOURCE_CONTENT_IF_TOOL_HAS_MORE_THAN ? '' : 'truncated '}resources by passing their URIs as the absolutePath to the ${toolNames_1.ToolName.ReadFile}.\n`)));
    }
    hasAssistantAudience(part) {
        if (part instanceof vscodeTypes_1.LanguageModelPromptTsxPart) {
            return true;
        }
        if (!(part instanceof vscodeTypes_1.LanguageModelDataPart2 || part instanceof vscodeTypes_1.LanguageModelTextPart2) || !part.audience) {
            return true;
        }
        return part.audience.includes(vscodeTypes_1.LanguageModelPartAudience.Assistant);
    }
    async onData(part) {
        if (part.mimeType === McpLinkedResourceToolResult.mimeType) {
            return this.onResourceLink(new TextDecoder().decode(part.data));
        }
        else {
            return '';
        }
    }
    async onImage(part) {
        const githubToken = (await this.authService.getAnyGitHubSession())?.accessToken;
        const uploadsEnabled = this.configurationService && this.experimentationService
            ? this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.EnableChatImageUpload, this.experimentationService)
            : false;
        // Anthropic (from CAPI) currently does not support image uploads from tool calls.
        const uploadToken = uploadsEnabled && await (0, chatModelCapabilities_1.modelCanUseMcpResultImageURL)(this.endpoint) ? githubToken : undefined;
        if (!uploadToken) {
            if (this.imageSizeBudgetLeft < 0) {
                return ''; // already exceeded and messages about it
            }
            else if (part.data.length > this.imageSizeBudgetLeft) {
                this.imageSizeBudgetLeft = -1; // just now exceeding
                return 'Additional images are available, but there is no more space in the context. Try requesting a smaller amount of data, if possible.';
            }
            else {
                this.imageSizeBudgetLeft -= part.data.length; // bookkeep
            }
        }
        return Promise.resolve(imageDataPartToTSX(part, uploadToken, this.endpoint.urlOrRequestMetadata, this.logService, this.imageService));
    }
    onTSX(part) {
        return Promise.resolve(vscpp("elementJSON", { data: part }));
    }
    onText(part) {
        return Promise.resolve(part);
    }
    onResourceLink(data) {
        return '';
    }
};
PrimitiveToolResult = __decorate([
    __param(1, promptRenderer_1.IPromptEndpoint),
    __param(2, authentication_1.IAuthenticationService),
    __param(3, logService_1.ILogService),
    __param(4, imageService_1.IImageService),
    __param(5, configurationService_1.IConfigurationService),
    __param(6, nullExperimentationService_1.IExperimentationService)
], PrimitiveToolResult);
/**
 * Inlined from prompt-tsx. In prompt-tsx it does `require('vscode)` for the instanceof checks which breaks in vitest
 * and unfortunately I can't figure out how to work around that with the tools we have!
 */
class ToolResult extends PrimitiveToolResult {
    async onTSX(part) {
        if (this.props.truncate) {
            return vscpp(prompt_tsx_1.TokenLimit, { max: this.props.truncate }, await super.onTSX(part));
        }
        return super.onTSX(part);
    }
    async onText(content) {
        const truncateAtTokens = this.props.truncate;
        if (!truncateAtTokens || content.length < truncateAtTokens) { // always >=1 character per token, early bail-out
            return content;
        }
        const tokens = await this.endpoint.acquireTokenizer().tokenLength(content);
        if (tokens < truncateAtTokens) {
            return content;
        }
        const approxCharsPerToken = content.length / tokens;
        const removedMessage = '\n[Tool response was too long and was truncated.]\n';
        const targetChars = Math.round(approxCharsPerToken * (truncateAtTokens - removedMessage.length));
        const keepInFirstHalf = Math.round(targetChars * 0.4);
        const keepInSecondHalf = targetChars - keepInFirstHalf;
        return content.slice(0, keepInFirstHalf) + removedMessage + content.slice(-keepInSecondHalf);
    }
    onResourceLink(data) {
        // https://github.com/microsoft/vscode/blob/34e38b4a78a751d006b99acee1a95d76117fec7b/src/vs/workbench/contrib/mcp/common/mcpTypes.ts#L846
        let parsed;
        try {
            parsed = JSON.parse(data);
        }
        catch {
            return null;
        }
        return vscpp(McpLinkedResourceToolResult, { resourceUri: uri_1.URI.revive(parsed.uri), mimeType: parsed.underlyingMimeType, count: this.linkedResources.length });
    }
}
exports.ToolResult = ToolResult;
// Wrapper around ToolResult to allow rendering prompts
class ToolCallResultWrapper extends prompt_tsx_1.PromptElement {
    async render() {
        return (vscpp(vscppf, null, Object.entries(this.props.toolCallResults ?? {}).map(([toolCallId, toolCallResult]) => (vscpp(prompt_tsx_1.ToolMessage, { toolCallId: toolCallId },
            vscpp(ToolResult, { content: toolCallResult.content }))))));
    }
}
exports.ToolCallResultWrapper = ToolCallResultWrapper;
function sendNotebookEditToolValidationTelemetry(invokeOutcome, validationResult, toolArgs, telemetryService, model) {
    let editType = 'unknown';
    let explanation = 'unknown';
    let newCodeType = 'unknown';
    let cellId = 'unknown';
    let inputParsed = 0;
    const knownProps = ['editType', 'explanation', 'newCode', 'cellId', 'filePath', 'language'];
    let missingProps = [];
    let unknownProps = [];
    try {
        const args = JSON.parse(toolArgs);
        if (args && typeof args === 'object' && !Array.isArray(args) && Object.keys(args).length > 0) {
            const props = Object.keys(args);
            unknownProps = props.filter(key => !knownProps.includes(key));
            unknownProps.sort();
            missingProps = knownProps.filter(key => !props.includes(key));
            missingProps.sort();
        }
        inputParsed = 1;
        if (args.editType) {
            editType = args.editType;
        }
        if (args.explanation) {
            explanation = 'provided';
        }
        else {
            explanation = 'empty';
        }
        if (args.newCode || typeof args.newCode === 'string') {
            if (typeof args.newCode === 'string') {
                newCodeType = 'string';
            }
            else if (Array.isArray(args.newCode) && args.newCode.every(item => typeof item === 'string')) {
                newCodeType = 'string[]';
            }
            else if (Array.isArray(args.newCode)) {
                newCodeType = 'object[]';
            }
            else if (typeof args.newCode === 'object') {
                newCodeType = 'object';
            }
        }
        if (editType === 'delete') {
            newCodeType = '';
        }
        const cellIdValue = args.cellId;
        if (typeof cellIdValue === 'string') {
            if (cellIdValue === 'TOP' || cellIdValue === 'BOTTOM') {
                cellId = cellIdValue;
            }
            else {
                cellId = cellIdValue.trim().length === 0 ? 'cellid' : 'empty';
            }
        }
    }
    catch {
        //
    }
    /* __GDPR__
        "editNotebook.validation" : {
            "owner": "donjayamanne",
            "comment": "Validation failure for a Edit Notebook tool invocation",
            "validationResult": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The result of the tool input validation. valid, invalid and unknown" },
            "invokeOutcome": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The result of the tool Invocation. invalidInput, disabledByUser, success, error, cancelled" },
            "editType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The type of edit that was attempted. insert, delete, edit or unknown" },
            "unknownProps": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "List of unknown properties in the input" },
            "missingProps": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "List of missing properties in the input" },
            "newCodeType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The type of code, whether its string, string[], object, object[] or unknown" },
            "cellId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the cell, TOP, BOTTOM, cellid, empty or unknown" },
            "explanation": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The explanation for the edit. provided, empty and unknown" },
            "inputParsed": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the input was parsed as JSON" },
            "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that invoked the tool" }
        }
    */
    telemetryService.sendMSFTTelemetryEvent('editNotebook.validation', {
        validationResult,
        invokeOutcome,
        editType,
        newCodeType,
        cellId,
        explanation,
        model,
        unknownProps: unknownProps.join(','),
        missingProps: missingProps.join(','),
    }, {
        inputParsed,
    });
}
//# sourceMappingURL=toolCalling.js.map