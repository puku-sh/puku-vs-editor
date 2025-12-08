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
exports.TestsIntent = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const authentication_1 = require("../../../../platform/authentication/common/authentication");
const commonTypes_1 = require("../../../../platform/chat/common/commonTypes");
const conversationOptions_1 = require("../../../../platform/chat/common/conversationOptions");
const editSurvivalTrackerService_1 = require("../../../../platform/editSurvivalTracking/common/editSurvivalTrackerService");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../../platform/log/common/logService");
const requestLogger_1 = require("../../../../platform/requestLogger/node/requestLogger");
const surveyService_1 = require("../../../../platform/survey/common/surveyService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const setupTestDetector_1 = require("../../../../platform/testing/node/setupTestDetector");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const languages_1 = require("../../../../util/common/languages");
const types_1 = require("../../../../util/common/types");
const uri_1 = require("../../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const defaultIntentRequestHandler_1 = require("../../../prompt/node/defaultIntentRequestHandler");
const testFiles_1 = require("../../../prompt/node/testFiles");
const toolNames_1 = require("../../../tools/common/toolNames");
const testFromSrcInvocation_1 = require("./testFromSrcInvocation");
const testFromTestInvocation_1 = require("./testFromTestInvocation");
const userQueryParser_1 = require("./userQueryParser");
let TestsIntent = class TestsIntent {
    static { this.ID = "tests" /* Intent.Tests */; }
    constructor(instantiationService, endpointProvider, ignoreService, workspaceService, logService) {
        this.instantiationService = instantiationService;
        this.endpointProvider = endpointProvider;
        this.ignoreService = ignoreService;
        this.workspaceService = workspaceService;
        this.logService = logService;
        this.id = "tests" /* Intent.Tests */;
        this.locations = [commonTypes_1.ChatLocation.Panel, commonTypes_1.ChatLocation.Editor];
        this.description = l10n.t('Generate unit tests for the selected code');
        this.commandInfo = { toolEquivalent: toolNames_1.ContributedToolName.FindTestFiles };
    }
    handleRequest(conversation, request, stream, token, documentContext, agentName, location, chatTelemetry, onPaused) {
        return this.instantiationService.createInstance(RequestHandler, this, conversation, request, stream, token, documentContext, location, chatTelemetry, onPaused).getResult();
    }
    async invoke(invocationContext) {
        let documentContext = invocationContext.documentContext;
        let alreadyConsumedChatVariable;
        // try resolving the document context programmatically
        if (!documentContext) {
            const r = await this.resolveDocContextProgrammatically(invocationContext);
            if (r) {
                documentContext = r.documentContext;
                alreadyConsumedChatVariable = r.alreadyConsumedChatVariable;
            }
        }
        // try resolving the document context using LLM
        if (!documentContext) {
            const r = await this.resolveDocContextUsingLlm(invocationContext);
            if (r) {
                documentContext = r.documentContext;
                alreadyConsumedChatVariable = r.alreadyConsumedChatVariable;
            }
        }
        if (!documentContext) {
            throw new Error('To generate tests, open a file and select code to test.');
        }
        if (await this.ignoreService.isCopilotIgnored(documentContext.document.uri)) {
            throw new Error('Copilot is disabled for this file.');
        }
        const location = invocationContext.location;
        const endpoint = await this.endpointProvider.getChatEndpoint(invocationContext.request);
        return (0, testFiles_1.isTestFile)(documentContext.document)
            ? this.instantiationService.createInstance(testFromTestInvocation_1.TestFromTestInvocation, this, endpoint, location, documentContext, alreadyConsumedChatVariable)
            : this.instantiationService.createInstance(testFromSrcInvocation_1.TestFromSourceInvocation, this, endpoint, location, documentContext, alreadyConsumedChatVariable);
    }
    async resolveDocContextProgrammatically(invocationContext) {
        const refs = invocationContext.request.references;
        // find a #file to use for testing
        // count #file's because we use LLM if there're more than 1 in the prompt
        let hashFileCount = 0;
        const fileRefs = [];
        for (const ref of refs) {
            if (ref.id === 'copilot.file' || ref.id === 'vscode.file') {
                if ((0, types_1.isUri)(ref.value)) {
                    hashFileCount += 1;
                    fileRefs.push([ref, ref.value]);
                }
            }
            else {
                if (!(0, types_1.isUri)(ref.id)) {
                    continue;
                }
                const uri = uri_1.URI.parse(ref.id);
                if (uri !== undefined) {
                    fileRefs.push([ref, uri]);
                }
            }
        }
        if (hashFileCount > 1 // use LLM if there's more than 1 file reference
            || fileRefs.length === 0) {
            return;
        }
        const [ref, fileUri] = fileRefs[0];
        return {
            documentContext: await this.createDocumentContext(fileUri),
            alreadyConsumedChatVariable: ref,
        };
    }
    async resolveDocContextUsingLlm(invocationContext) {
        const queryParser = this.instantiationService.createInstance(userQueryParser_1.UserQueryParser);
        const parsedQuery = await queryParser.parse(invocationContext.request.prompt);
        if (parsedQuery === null) {
            return;
        }
        // FIXME@ulugbekna: UserQueryParser also returns symbols that need testing; we should use that info
        const { fileToTest, } = parsedQuery;
        // if parser couldn't identify the file, if there's only one file referenced, use that
        if (fileToTest === undefined) {
            return;
        }
        for (let i = 0; i < invocationContext.request.references.length; i++) {
            const ref = invocationContext.request.references[i];
            // FIXME@ulugbekna: I don't like how I fish for #file references
            if (ref.id !== 'vscode.file' && ref.id !== 'copilot.file') {
                continue;
            }
            const [kind, fileName] = ref.name.trim().split(':');
            if (kind !== 'file' ||
                fileName === undefined ||
                !(uri_1.URI.isUri(ref.value)) ||
                fileName !== fileToTest) {
                continue;
            }
            return {
                documentContext: await this.createDocumentContext(ref.value),
                alreadyConsumedChatVariable: ref,
            };
        }
    }
    /**
     *
     * @param selection defaults to whole file
     */
    async createDocumentContext(file, selection) {
        let td;
        try {
            td = await this.workspaceService.openTextDocumentAndSnapshot(file);
        }
        catch (e) {
            this.log(`Tried opening file ${file.toString()} but got error: ${e}`);
            return;
        }
        const wholeFile = selection ?? new vscodeTypes_1.Range(new vscodeTypes_1.Position(0, 0), new vscodeTypes_1.Position(td.lineCount - 1, td.lineAt(td.lineCount - 1).text.length));
        return {
            document: td,
            fileIndentInfo: undefined,
            language: (0, languages_1.getLanguage)(td.languageId),
            wholeRange: wholeFile,
            selection: new vscodeTypes_1.Selection(wholeFile.start, wholeFile.end),
        };
    }
    log(...args) {
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, '\t') : arg).join('\n');
        this.logService.debug(`[TestsIntent] ${message}`);
    }
};
exports.TestsIntent = TestsIntent;
exports.TestsIntent = TestsIntent = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, ignoreService_1.IIgnoreService),
    __param(3, workspaceService_1.IWorkspaceService),
    __param(4, logService_1.ILogService)
], TestsIntent);
let RequestHandler = class RequestHandler extends defaultIntentRequestHandler_1.DefaultIntentRequestHandler {
    constructor(intent, conversation, request, stream, token, documentContext, location, chatTelemetry, onPaused, instantiationService, conversationOptions, telemetryService, logService, surveyService, setupTestsDetector, requestLogger, editSurvivalTrackerService, authenticationService) {
        super(intent, conversation, request, stream, token, documentContext, location, chatTelemetry, undefined, onPaused, instantiationService, conversationOptions, telemetryService, logService, surveyService, requestLogger, editSurvivalTrackerService, authenticationService);
        this.setupTestsDetector = setupTestsDetector;
    }
    /**
     * - Delegates out to setting up tests if the user confirmed they wanted to do that
     * - Otherwise try to detect if setup should be shown
     *   - If not, just delegate to the base class
     *   - If so, either return just that or append a reminder.
     */
    async getResult() {
        // if the user is starting test setup, we need to finish this request
        // before they can prompt us with the new one
        if (this.request.acceptedConfirmationData?.some(setupTestDetector_1.isStartSetupTestConfirmation)) {
            setTimeout(() => this.getResultInner());
            return {};
        }
        return this.getResultInner();
    }
    async getResultInner() {
        const suggestion = this.documentContext && await this.setupTestsDetector.shouldSuggestSetup(this.documentContext, this.request, this.stream);
        if (!suggestion) {
            return super.getResult();
        }
        let result = {};
        if (suggestion.type === 4 /* SetupTestActionType.Remind */) {
            result = await super.getResult();
        }
        this.setupTestsDetector.showSuggestion(suggestion).forEach(p => this.stream.push(p));
        return result;
    }
};
RequestHandler = __decorate([
    __param(9, instantiation_1.IInstantiationService),
    __param(10, conversationOptions_1.IConversationOptions),
    __param(11, telemetry_1.ITelemetryService),
    __param(12, logService_1.ILogService),
    __param(13, surveyService_1.ISurveyService),
    __param(14, setupTestDetector_1.ISetupTestsDetector),
    __param(15, requestLogger_1.IRequestLogger),
    __param(16, editSurvivalTrackerService_1.IEditSurvivalTrackerService),
    __param(17, authentication_1.IAuthenticationService)
], RequestHandler);
//# sourceMappingURL=testIntent.js.map