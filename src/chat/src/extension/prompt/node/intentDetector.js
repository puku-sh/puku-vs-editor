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
exports.GPT4OIntentDetectionPrompt = exports.IntentDetector = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const chatAgents_1 = require("../../../platform/chat/common/chatAgents");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const globalStringUtils_1 = require("../../../platform/chat/common/globalStringUtils");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../platform/log/common/logService");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const notebooks_1 = require("../../../util/common/notebooks");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const constants_1 = require("../../common/constants");
const intentService_1 = require("../../intents/node/intentService");
const unknownIntent_1 = require("../../intents/node/unknownIntent");
const instructionMessage_1 = require("../../prompts/node/base/instructionMessage");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const chatVariables_1 = require("../../prompts/node/panel/chatVariables");
const conversationHistory_1 = require("../../prompts/node/panel/conversationHistory");
const currentSelection_1 = require("../../prompts/node/panel/currentSelection");
const safeElements_1 = require("../../prompts/node/panel/safeElements");
const toolNames_1 = require("../../tools/common/toolNames");
const codebaseTool_1 = require("../../tools/node/codebaseTool");
const chatVariablesCollection_1 = require("../common/chatVariablesCollection");
const chatParticipantRequestHandler_1 = require("./chatParticipantRequestHandler");
const documentContext_1 = require("./documentContext");
let IntentDetector = class IntentDetector {
    constructor(logService, endpointProvider, telemetryService, configurationService, intentService, instantiationService, tabsAndEditorsService, experimentationService) {
        this.logService = logService;
        this.endpointProvider = endpointProvider;
        this.telemetryService = telemetryService;
        this.configurationService = configurationService;
        this.intentService = intentService;
        this.instantiationService = instantiationService;
        this.tabsAndEditorsService = tabsAndEditorsService;
        this.experimentationService = experimentationService;
    }
    async provideParticipantDetection(chatRequest, context, options, token) {
        if ((options.location !== commonTypes_1.ChatLocation.Panel && options.location !== commonTypes_1.ChatLocation.Editor) || this.configurationService.getNonExtensionConfig('chat.detectParticipant.enabled') === false) {
            return;
        }
        const selectedEndpoint = await this.endpointProvider.getChatEndpoint(chatRequest);
        // Disable intent detection if the user is requesting their request be completed with o1 since o1 has such a low RPS the cost of an incorrect intent is high
        if (selectedEndpoint.family.startsWith('o1')) {
            return;
        }
        const chatVariables = new chatVariablesCollection_1.ChatVariablesCollection(chatRequest.references);
        const { turns } = this.instantiationService.invokeFunction(accessor => (0, chatParticipantRequestHandler_1.addHistoryToConversation)(accessor, context.history));
        let detectedIntentId;
        const shouldIncludeGitHub = (chatRequest.toolReferences.length === 0);
        const builtinParticipants = options.participants?.filter(p => ((p.participant === constants_1.GITHUB_PLATFORM_AGENT && shouldIncludeGitHub) || p.participant.startsWith(chatAgents_1.CHAT_PARTICIPANT_ID_PREFIX)) && p.disambiguation.length) ?? [];
        const thirdPartyParticipants = options.participants?.filter(p => p.participant !== constants_1.GITHUB_PLATFORM_AGENT && !p.participant.startsWith(chatAgents_1.CHAT_PARTICIPANT_ID_PREFIX) && p.disambiguation.length) ?? [];
        try {
            const detectedIntent = await this.detectIntent(options.location, documentContext_1.IDocumentContext.inferDocumentContext(chatRequest, this.tabsAndEditorsService.activeTextEditor, turns), chatRequest.prompt, token, undefined, chatVariables, builtinParticipants, undefined, turns);
            if (detectedIntent && 'participant' in detectedIntent) {
                if (detectedIntent.participant === (0, chatAgents_1.getChatParticipantIdFromName)('workspace')) {
                    if (chatRequest.toolReferences.find((ref) => (0, toolNames_1.getToolName)(ref.name) === codebaseTool_1.CodebaseTool.toolName)) {
                        return undefined;
                    }
                    if (this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.AskAgent, this.experimentationService)
                        && chatRequest.model.capabilities.supportsToolCalling) {
                        return undefined;
                    }
                }
                detectedIntentId = detectedIntent;
                return detectedIntent;
            }
            else if (detectedIntent) {
                detectedIntentId = detectedIntent.id;
                const agent = (0, constants_1.getAgentForIntent)(detectedIntent.id, options.location);
                if (agent) {
                    const overrideCommand = agent.agent === "editor" /* Intent.Editor */ && (agent.command === "edit" /* Intent.Edit */ || agent.command === "generate" /* Intent.Generate */) ? undefined : agent.command;
                    return {
                        participant: (0, chatAgents_1.getChatParticipantIdFromName)(agent.agent),
                        command: overrideCommand,
                    };
                }
            }
            else if (thirdPartyParticipants.length && options.location === commonTypes_1.ChatLocation.Panel) {
                // If the detected intent is `unknown` and we have 3P participants, try picking from them instead
                const detectedIntent = await this.detectIntent(options.location, undefined, chatRequest.prompt, token, undefined, new chatVariablesCollection_1.ChatVariablesCollection(chatRequest.references), builtinParticipants, thirdPartyParticipants, turns);
                if (detectedIntent && 'participant' in detectedIntent) {
                    detectedIntentId = detectedIntent;
                    return detectedIntent;
                }
            }
        }
        finally {
            if (detectedIntentId) {
                // Collect telemetry based on the full unfiltered history, rather than when the request handler is invoked (at which point the conversation history is already scoped)
                const doc = this.tabsAndEditorsService.activeTextEditor?.document;
                const docSnapshot = doc ? textDocumentSnapshot_1.TextDocumentSnapshot.create(doc) : undefined;
                this.collectIntentDetectionContextInternal(chatRequest.prompt, detectedIntentId, chatVariables, options.location, turns.slice(0, -1), docSnapshot);
            }
        }
    }
    async getPreferredIntent(location, documentContext, history, messageText) {
        let preferredIntent;
        if (location === commonTypes_1.ChatLocation.Editor && documentContext && !history?.length) {
            if (documentContext.selection.isEmpty && documentContext.document.lineAt(documentContext.selection.start.line).text.trim() === '') {
                preferredIntent = "generate" /* Intent.Generate */;
            }
            else if (!documentContext.selection.isEmpty && documentContext.selection.start.line !== documentContext.selection.end.line) {
                preferredIntent = "edit" /* Intent.Edit */;
            }
        }
        // /fixTestFailure was removed, delegate to /fix if there are historical usages of it.
        if (messageText?.trimStart().startsWith('/fixTestFailure')) {
            preferredIntent = "fix" /* Intent.Fix */;
        }
        return preferredIntent;
    }
    /**
     * @param preferredIntent tells the model that this intent is the most likely the developer wants.
     * @param currentFilePath file path relative to the workspace root and will be mentioned in the prompt if present
     * @param isRerunWithoutIntentDetection for telemetry purposes -- if `undefined`, then intent detection is invoked either from inline chat of an older vscode or from panel chat
     */
    async detectIntent(location, documentContext, messageText, token, baseUserTelemetry, chatVariables, builtinParticipants, thirdPartyParticipants, history) {
        this.logService.trace('Building intent detector');
        if (builtinParticipants.length === 0 && ((0, arrays_1.isFalsyOrEmpty)(thirdPartyParticipants))) {
            this.logService.trace('No participants available for intent detection');
            return undefined;
        }
        const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        const preferredIntent = await this.getPreferredIntent(location, documentContext, history, messageText);
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, (location === commonTypes_1.ChatLocation.Editor
            ? IntentDetectionPrompt
            : GPT4OIntentDetectionPrompt), {
            preferredIntent,
            location,
            userQuestion: messageText,
            documentContext,
            history,
            chatVariables,
            builtinParticipants: builtinParticipants,
            thirdPartyParticipants: thirdPartyParticipants,
        });
        const { messages, metadata } = await promptRenderer.render(undefined, token);
        this.logService.trace('Built intent detector');
        const fetchResult = await endpoint.makeChatRequest('intentDetection', messages, undefined, token, location, undefined, {
            stop: [';'],
            max_tokens: 20
        });
        const intent = this.validateResult(fetchResult, baseUserTelemetry, messageText, location, preferredIntent, thirdPartyParticipants ? thirdPartyParticipants : builtinParticipants, documentContext);
        const chosenIntent = intent && 'id' in intent ? intent?.id : intent?.participant;
        this.sendTelemetry(preferredIntent, chosenIntent, documentContext?.language.languageId, undefined, location);
        const fileMetadata = metadata.get(DocumentExcerptInfo);
        this.sendInternalTelemetry(messageText, preferredIntent, fileMetadata?.filePath, fileMetadata?.fileExcerpt, chosenIntent, documentContext?.language.languageId, undefined, messages.slice(0, -1), location);
        return intent;
    }
    async collectIntentDetectionContextInternal(userQuery, assignedIntent, chatVariables, location, history = [], document) {
        const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        const { messages: currentSelection } = await (0, promptRenderer_1.renderPromptElement)(this.instantiationService, endpoint, currentSelection_1.CurrentSelection, { document });
        const { messages: conversationHistory } = await (0, promptRenderer_1.renderPromptElement)(this.instantiationService, endpoint, conversationHistory_1.ConversationHistory, { history, priority: 1000 }, undefined, undefined).catch(() => ({ messages: [] }));
        const { history: historyMessages, fileExcerpt, attachedContext, fileExcerptExceedsBudget } = this.prepareInternalTelemetryContext((0, globalStringUtils_1.getTextPart)(currentSelection?.[0]?.content), conversationHistory, chatVariables);
        this.telemetryService.sendInternalMSFTTelemetryEvent('participantDetectionContext', {
            chatLocation: commonTypes_1.ChatLocation.toString(location),
            userQuery,
            history: historyMessages.join(''),
            assignedIntent: typeof assignedIntent === 'string' ? assignedIntent : undefined,
            assignedThirdPartyChatParticipant: typeof assignedIntent !== 'string' ? assignedIntent.participant : undefined,
            assignedThirdPartyChatCommand: typeof assignedIntent !== 'string' ? assignedIntent.command : undefined,
            fileExcerpt: fileExcerpt ?? (fileExcerptExceedsBudget ? '<truncated>' : '<none>'),
            attachedContext: attachedContext.join(';')
        }, {});
    }
    validateResult(fetchResult, baseUserTelemetry, messageText, location, preferredIntent, participants, documentContext) {
        if (fetchResult.type !== commonTypes_1.ChatFetchResponseType.Success) {
            if (baseUserTelemetry) {
                this.sendPromptIntentErrorTelemetry(baseUserTelemetry, fetchResult);
            }
            return undefined;
        }
        let cleanedIntentResponses = [fetchResult.value].map(intentResponse => intentResponse
            .trimStart()
            .split('\n')[0]
            .replaceAll('```', '')
            .replace(/function id:|response:/i, '')
            .trim());
        cleanedIntentResponses = cleanedIntentResponses.filter(i => i !== unknownIntent_1.UnknownIntent.ID);
        if (!cleanedIntentResponses.length && preferredIntent) {
            cleanedIntentResponses = [preferredIntent];
        }
        // Dynamic chat participants
        if ((cleanedIntentResponses[0] === 'github_questions') && participants?.find(p => p.participant === constants_1.GITHUB_PLATFORM_AGENT)) {
            return { participant: constants_1.GITHUB_PLATFORM_AGENT };
        }
        const categoryNamesToParticipants = participants?.reduce((acc, participant) => {
            participant.disambiguation.forEach((alias) => {
                acc[alias.category] = { participant: participant.participant, command: participant.command };
            });
            return acc;
        }, {});
        let intent = cleanedIntentResponses
            .map(r => this.intentService.getIntent(r, location) ?? categoryNamesToParticipants?.[r])
            .filter((s) => s !== undefined)?.[0];
        const chosenIntent = intent && 'id' in intent ? intent?.id : intent?.participant;
        this.logService.debug(`picked intent "${chosenIntent}" from ${JSON.stringify(fetchResult.value, null, '\t')}`);
        // override /edit in inline chat based on the document context
        if (location === commonTypes_1.ChatLocation.Editor
            && chosenIntent === "edit" /* Intent.Edit */
            && documentContext
            && documentContext.selection.isEmpty
            && documentContext.document.lineAt(documentContext.selection.start.line).text.trim() === '') {
            // the selection is empty and sits on a whitespace only line, we will always detect generate instead of edit
            const editIntent = this.intentService.getIntent("generate" /* Intent.Generate */, commonTypes_1.ChatLocation.Editor);
            if (editIntent) {
                intent = editIntent;
            }
        }
        if (baseUserTelemetry) {
            const promptTelemetryData = baseUserTelemetry.extendedBy({
                messageText,
                promptContext: cleanedIntentResponses.join(),
                intent: chosenIntent || 'unknown',
            });
            this.telemetryService.sendEnhancedGHTelemetryEvent('conversation.promptIntent', promptTelemetryData.raw.properties, promptTelemetryData.raw.measurements);
        }
        return intent;
    }
    sendPromptIntentErrorTelemetry(baseUserTelemetry, fetchResult) {
        const telemetryErrorData = baseUserTelemetry.extendedBy({
            resultType: fetchResult.type,
            reason: fetchResult.reason,
        });
        this.telemetryService.sendEnhancedGHTelemetryErrorEvent('conversation.promptIntentError', telemetryErrorData.raw.properties, telemetryErrorData.raw.measurements);
    }
    sendTelemetry(preferredIntent, detectedIntent, languageId, isRerunWithoutIntentDetection, location) {
        /* __GDPR__
            "intentDetection" : {
                "owner": "ulugbekna",
                "comment": "Intent detection telemetry.",
                "chatLocation": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Which chat (panel or inline) intent detection is used for." },
                "preferredIntent": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Which intent was initially provided as preferred." },
                "detectedIntent": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Intent that was detected by Copilot" },
                "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Language ID of the document for which intent detection happened." },
                "isRerunWithoutIntentDetection": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the user disliked the detected intent and tried to rerun without it." }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('intentDetection', {
            chatLocation: commonTypes_1.ChatLocation.toString(location),
            preferredIntent: preferredIntent ?? '<none>',
            detectedIntent: detectedIntent ?? '<none>',
            languageId: languageId ?? '<none>',
            isRerunWithoutIntentDetection: String(isRerunWithoutIntentDetection) ?? '<none>',
        });
    }
    prepareInternalTelemetryContext(fileExcerpt, historyMessages, attachedContext) {
        // Single internal telemetry size must be less than 8KB
        // Be conservative and set the budget to 5KB to account for other properties
        let telemetryBudget = 5000;
        const names = [];
        if (attachedContext) {
            for (const attachment of attachedContext) {
                const nameLength = Buffer.byteLength(attachment.uniqueName, 'utf8');
                if (telemetryBudget - nameLength < 0) {
                    break;
                }
                telemetryBudget -= nameLength;
                names.push(attachment.uniqueName);
            }
        }
        let fileExcerptExceedsBudget = false;
        if (fileExcerpt) {
            const fileExcerptSize = Buffer.byteLength(fileExcerpt, 'utf8');
            if (fileExcerptSize > telemetryBudget) {
                fileExcerptExceedsBudget = true;
                fileExcerpt = undefined;
            }
            else {
                telemetryBudget -= fileExcerptSize;
            }
        }
        else {
            fileExcerpt = undefined;
        }
        const history = [];
        for (let i = historyMessages.length - 1; i >= 0; i -= 1) {
            const message = historyMessages[i];
            const text = `${(0, globalStringUtils_1.roleToString)(message.role).toUpperCase()}: ${message.content}\n\n`;
            const textLength = Buffer.byteLength(text, 'utf8');
            if (telemetryBudget - textLength < 0) {
                break;
            }
            history.push(text);
            telemetryBudget -= textLength;
        }
        return { fileExcerpt, fileExcerptExceedsBudget, history: history.reverse(), attachedContext: names };
    }
    sendInternalTelemetry(request, preferredIntent, currentFilePath, fileExerpt, detectedIntent, languageId, isRerunWithoutIntentDetection, historyMessages, location) {
        const { fileExcerpt, history } = this.prepareInternalTelemetryContext(fileExerpt, historyMessages);
        this.telemetryService.sendInternalMSFTTelemetryEvent('intentDetection', {
            chatLocation: commonTypes_1.ChatLocation.toString(location),
            request,
            preferredIntent: preferredIntent ?? '<none>',
            filePath: currentFilePath ?? '<none>',
            fileExerpt: fileExcerpt ?? '<none>',
            detectedIntent: detectedIntent ?? '<none>',
            languageId: languageId ?? '<none>',
            isRerunWithoutIntentDetection: String(isRerunWithoutIntentDetection) ?? '<none>',
            history: history.join('')
        }, {});
    }
};
exports.IntentDetector = IntentDetector;
exports.IntentDetector = IntentDetector = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, configurationService_1.IConfigurationService),
    __param(4, intentService_1.IIntentService),
    __param(5, instantiation_1.IInstantiationService),
    __param(6, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(7, nullExperimentationService_1.IExperimentationService)
], IntentDetector);
class DocumentExcerptInfo extends prompt_tsx_1.PromptMetadata {
    constructor(fileExcerpt, filePath) {
        super();
        this.fileExcerpt = fileExcerpt;
        this.filePath = filePath;
    }
}
let IntentDetectionPrompt = class IntentDetectionPrompt extends prompt_tsx_1.PromptElement {
    constructor(props, _ignoreService, _configurationService, _intentService) {
        super(props);
        this._ignoreService = _ignoreService;
        this._configurationService = _configurationService;
        this._intentService = _intentService;
    }
    async render() {
        let { builtinParticipants, preferredIntent, userQuestion, documentContext, } = this.props;
        let currentFileUri;
        let currentFileContext;
        let fileExcerptCodeBlock;
        try {
            if (documentContext !== undefined && !(await this._ignoreService.isCopilotIgnored(documentContext.document.uri))) {
                const { document, selection } = documentContext;
                currentFileUri = document.uri;
                const range = new vscodeTypes_1.Range(new vscodeTypes_1.Position(Math.max(selection.start.line - 5, 0), 0), new vscodeTypes_1.Position(Math.min(selection.end.line + 5, document.lineCount), document.lineAt(selection.end.line).text.length));
                currentFileContext = document.getText(range);
                fileExcerptCodeBlock = currentFileContext.trim().length > 0 ? vscpp(safeElements_1.CodeBlock, { uri: currentFileUri, languageId: document.languageId, code: currentFileContext, shouldTrim: false }) : undefined;
            }
        }
        catch (_e) { }
        const fileMetadata = new DocumentExcerptInfo(currentFileContext, currentFileUri?.path);
        if (documentContext !== undefined && (0, notebooks_1.isNotebookCellOrNotebookChatInput)(documentContext.document.uri)) {
            builtinParticipants = builtinParticipants.filter((participant) => participant.command !== 'tests');
        }
        function commands(participant) {
            const seen = new Set();
            const a = participant.flatMap((p) => p.disambiguation);
            return a.filter(value => {
                if (seen.has(value.category)) {
                    return false;
                }
                seen.add(value.category);
                return true;
            });
        }
        return (vscpp(vscppf, null,
            vscpp("meta", { value: fileMetadata }),
            vscpp(prompt_tsx_1.SystemMessage, null,
                "When asked for your name, you must respond with \"GitHub Copilot\".",
                vscpp("br", null),
                "Follow the user's requirements carefully & to the letter.",
                vscpp("br", null)),
            vscpp(prompt_tsx_1.UserMessage, null,
                "A software developer is using an AI chatbot in a code editor",
                currentFileUri && ` in file ${currentFileUri.path}`,
                ".",
                vscpp("br", null),
                fileExcerptCodeBlock === undefined
                    ? vscpp("br", null)
                    : vscpp(vscppf, null,
                        "Current active file contains following excerpt:",
                        vscpp("br", null),
                        fileExcerptCodeBlock,
                        vscpp("br", null)),
                "The developer added the following request to the chat and your goal is to select a function to perform the request.",
                vscpp("br", null),
                preferredIntent && `The developer probably wants Function Id '${preferredIntent}', pick different only if you're certain.`,
                vscpp("br", null),
                "Request: ",
                userQuestion,
                vscpp("br", null),
                vscpp("br", null),
                "Available functions:",
                vscpp("br", null),
                commands(builtinParticipants).map((alias) => vscpp(vscppf, null,
                    "Function Id: ",
                    alias.category,
                    vscpp("br", null),
                    "Function Description: ",
                    alias.description,
                    vscpp("br", null),
                    vscpp("br", null))),
                vscpp("br", null),
                "Here are some examples to make the instructions clearer:",
                vscpp("br", null),
                commands(builtinParticipants).map((alias) => vscpp(vscppf, null,
                    "Request: ",
                    alias.examples[0],
                    vscpp("br", null),
                    "Response: ",
                    alias.category,
                    vscpp("br", null),
                    vscpp("br", null))),
                "Request: ",
                userQuestion,
                vscpp("br", null),
                "Response:")));
    }
};
IntentDetectionPrompt = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, intentService_1.IIntentService)
], IntentDetectionPrompt);
class ParticipantDescriptions extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            this.props.participants.flatMap((p) => {
                return p.disambiguation.map((alias) => {
                    return (vscpp(vscppf, null,
                        "| ",
                        alias.category ?? alias.categoryName,
                        " | ",
                        alias.description,
                        " | ",
                        alias.examples.length ? alias.examples.map(example => `"${example}"`).join(', ') : '--',
                        " |",
                        vscpp("br", null)));
                });
            }),
            this.props.includeDynamicParticipants && vscpp(vscppf, null,
                "| github_questions | The user is asking about an issue, pull request, branch, commit hash, diff, discussion, repository, or published release on GitHub.com.  This category does not include performing local Git operations using the CLI. | \"What has been changed in the pull request 1361 in browserify/browserify repo?\" |",
                vscpp("br", null)),
            this.props.includeDynamicParticipants && vscpp(vscppf, null,
                "| web_questions | The user is asking a question that requires current knowledge from a web search engine. Such questions often reference time periods that exceed your knowledge cutoff. | \"What is the latest LTS version of Node.js?\" |",
                vscpp("br", null)),
            "| unknown | The user's question does not fit exactly one of the categories above, is about a product other than Visual Studio Code or GitHub, or is a general question about code, code errors, or software engineering. | \"How do I center a div in CSS?\" |",
            vscpp("br", null)));
    }
}
class GPT4OIntentDetectionPrompt extends IntentDetectionPrompt {
    render() {
        const { history, chatVariables, userQuestion } = this.props;
        return (vscpp(vscppf, null,
            vscpp(conversationHistory_1.HistoryWithInstructions, { history: history || [], passPriority: true, historyPriority: 800 },
                vscpp(instructionMessage_1.InstructionMessage, null,
                    "You are a helpful AI programming assistant to a user who is a software engineer, acting on behalf of the Visual Studio Code editor. Your task is to choose one category from the Markdown table of categories below that matches the user's question. Carefully review the user's question, any previous messages, and any provided context such as code snippets. Respond with just the category name. Your chosen category will help Visual Studio Code provide the user with a higher-quality response, and choosing incorrectly will degrade the user's experience of using Visual Studio Code, so you must choose wisely. If you cannot choose just one category, or if none of the categories seem like they would provide the user with a better result, you must always respond with \"unknown\".",
                    vscpp("br", null),
                    vscpp("br", null),
                    "| Category name | Category description | Example of matching question |",
                    vscpp("br", null),
                    "| -- | -- | -- |",
                    vscpp("br", null),
                    vscpp(ParticipantDescriptions, { participants: this.props.thirdPartyParticipants ? this.props.thirdPartyParticipants : this.props.builtinParticipants, includeDynamicParticipants: !this.props.thirdPartyParticipants }))),
            vscpp(chatVariables_1.ChatVariablesAndQuery, { query: userQuestion, chatVariables: chatVariables, priority: 900, embeddedInsideUserMessage: false })));
    }
}
exports.GPT4OIntentDetectionPrompt = GPT4OIntentDetectionPrompt;
//# sourceMappingURL=intentDetector.js.map