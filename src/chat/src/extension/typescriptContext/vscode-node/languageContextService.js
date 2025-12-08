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
var LanguageContextServiceImpl_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InlineCompletionContribution = exports.LanguageContextServiceImpl = void 0;
const vscode = __importStar(require("vscode"));
const lru_cache_1 = require("lru-cache");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const languageContextProviderService_1 = require("../../../platform/languageContextProvider/common/languageContextProviderService");
const languageContextService_1 = require("../../../platform/languageServer/common/languageContextService");
const logService_1 = require("../../../platform/log/common/logService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const async_1 = require("../../../util/vs/base/common/async");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const protocol = __importStar(require("../common/serverProtocol"));
const inspector_1 = require("./inspector");
const throttledDebounce_1 = require("./throttledDebounce");
const types_1 = require("./types");
const currentTokenBudget = 8 * 1024;
var ExecutionTarget;
(function (ExecutionTarget) {
    ExecutionTarget[ExecutionTarget["Semantic"] = 0] = "Semantic";
    ExecutionTarget[ExecutionTarget["Syntax"] = 1] = "Syntax";
})(ExecutionTarget || (ExecutionTarget = {}));
var ErrorLocation;
(function (ErrorLocation) {
    ErrorLocation["Client"] = "client";
    ErrorLocation["Server"] = "server";
})(ErrorLocation || (ErrorLocation = {}));
var ErrorPart;
(function (ErrorPart) {
    ErrorPart["ServerPlugin"] = "server-plugin";
    ErrorPart["TypescriptPlugin"] = "typescript-plugin";
    ErrorPart["CopilotExtension"] = "copilot-extension";
})(ErrorPart || (ErrorPart = {}));
var TypeScriptServerError;
(function (TypeScriptServerError) {
    function is(value) {
        const candidate = value;
        return candidate instanceof Error && candidate.response !== undefined && candidate.version !== undefined && typeof candidate.version.displayName === 'string';
    }
    TypeScriptServerError.is = is;
})(TypeScriptServerError || (TypeScriptServerError = {}));
var RequestContext;
(function (RequestContext) {
    function getSampleTelemetry(context) {
        return Math.max(1, Math.min(100, context.sampleTelemetry ?? 1));
    }
    RequestContext.getSampleTelemetry = getSampleTelemetry;
})(RequestContext || (RequestContext = {}));
class TelemetrySender {
    constructor(telemetryService, logService) {
        this.telemetryService = telemetryService;
        this.logService = logService;
        this.sendRequestTelemetryCounter = 0;
        this.sendSpeculativeRequestTelemetryCounter = 0;
    }
    sendSpeculativeRequestTelemetry(context, originalRequestId, numberOfItems) {
        const sampleTelemetry = RequestContext.getSampleTelemetry(context);
        const shouldSendTelemetry = sampleTelemetry === 1 || this.sendSpeculativeRequestTelemetryCounter % sampleTelemetry === 0;
        this.sendSpeculativeRequestTelemetryCounter++;
        if (shouldSendTelemetry) {
            /* __GDPR__
                "typescript-context-plugin.completion-context.speculative" : {
                    "owner": "dirkb",
                    "comment": "Telemetry for copilot inline completion context",
                    "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The request correlation id" },
                    "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The source of the request" },
                    "originalRequestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The original request id for which this is a speculative request" },
                    "numberOfItems": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of items in the speculative request", "isMeasurement": true },
                    "sampleTelemetry": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The sampling rate for telemetry. A value of 1 means every request is logged, a value of 5 means every 5th request is logged, etc.", "isMeasurement": true }
                }
            */
            this.telemetryService.sendMSFTTelemetryEvent('typescript-context-plugin.completion-context.speculative', {
                requestId: context.requestId,
                source: context.source ?? languageContextService_1.KnownSources.unknown,
                originalRequestId: originalRequestId
            }, {
                numberOfItems: numberOfItems,
                sampleTelemetry: sampleTelemetry
            });
        }
        this.logService.debug(`TypeScript Copilot context speculative request: [${context.requestId} - ${originalRequestId}, numberOfItems: ${numberOfItems}]`);
    }
    willLogRequestTelemetry(context) {
        const sampleTelemetry = RequestContext.getSampleTelemetry(context);
        return sampleTelemetry === 1 || this.sendRequestTelemetryCounter % sampleTelemetry === 0;
    }
    sendRequestTelemetry(document, position, context, data, timeTaken, cacheState, cacheRequest) {
        const stats = data.stats;
        const nodePath = data?.path ? JSON.stringify(data.path) : JSON.stringify([0]);
        const items = stats.items;
        const totalSize = stats.totalSize;
        const fileSize = document.getText().length;
        const sampleTelemetry = RequestContext.getSampleTelemetry(context);
        const shouldSendTelemetry = sampleTelemetry === 1 || this.sendRequestTelemetryCounter % sampleTelemetry === 0;
        this.sendRequestTelemetryCounter++;
        if (shouldSendTelemetry) {
            /* __GDPR__
                "typescript-context-plugin.completion-context.request" : {
                    "owner": "dirkb",
                    "comment": "Telemetry for copilot inline completion context",
                    "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The request correlation id" },
                    "opportunityId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The opportunity id" },
                    "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The source of the request" },
                    "trigger": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The trigger kind of the request" },
                    "cacheRequest": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The cache request that was used to populate the cache" },
                    "nodePath": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The syntax kind path to the AST node the position resolved to." },
                    "cancelled": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the request got cancelled on the client side" },
                    "timedOut": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the request timed out on the server side" },
                    "tokenBudgetExhausted": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the token budget was exhausted" },
                    "serverTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Time taken on the server side", "isMeasurement": true },
                    "contextComputeTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Time taken on the server side to compute the context", "isMeasurement": true },
                    "timeTaken": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Time taken to provide the completion", "isMeasurement": true },
                    "total": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Total number of context items", "isMeasurement": true },
                    "snippets": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of code snippets", "isMeasurement": true },
                    "traits": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of traits", "isMeasurement": true },
                    "yielded": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of yielded items", "isMeasurement": true },
                    "items": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Detailed information about each context item delivered." },
                    "totalSize": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Total size of all context items", "isMeasurement": true },
                    "fileSize": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The size of the file", "isMeasurement": true },
                    "cachedItems": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of cache items", "isMeasurement": true },
                    "referencedItems": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of referenced items", "isMeasurement": true },
                    "isSpeculative": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the request was speculative" },
                    "beforeCacheState": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The cache state before the request was sent" },
                    "afterCacheState": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The cache state after the request was sent" },
                    "fromCache": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the context was fully provided from cache" },
                    "sampleTelemetry": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The sampling rate for telemetry. A value of 1 means every request is logged, a value of 5 means every 5th request is logged, etc.", "isMeasurement": true }
                }
            */
            this.telemetryService.sendMSFTTelemetryEvent('typescript-context-plugin.completion-context.request', {
                requestId: context.requestId,
                opportunityId: context.opportunityId ?? 'unknown',
                source: context.source ?? languageContextService_1.KnownSources.unknown,
                trigger: context.trigger ?? languageContextService_1.TriggerKind.unknown,
                cacheRequest: cacheRequest ?? 'unknown',
                nodePath: nodePath,
                cancelled: data.cancelled.toString(),
                timedOut: data.timedOut.toString(),
                tokenBudgetExhausted: data.tokenBudgetExhausted.toString(),
                items: JSON.stringify(items),
                isSpeculative: (context.proposedEdits !== undefined && context.proposedEdits.length > 0 ? true : false).toString(),
                beforeCacheState: cacheState?.before.toString(),
                afterCacheState: cacheState?.after.toString(),
                fromCache: data.fromCache.toString(),
            }, {
                serverTime: data.serverTime,
                contextComputeTime: data.contextComputeTime,
                timeTaken,
                total: stats.total,
                snippets: stats.snippets,
                traits: stats.traits,
                yielded: stats.yielded,
                totalSize: totalSize,
                fileSize: fileSize,
                cachedItems: data.cachedItems,
                referencedItems: data.referencedItems,
                sampleTelemetry: sampleTelemetry
            });
        }
        this.logService.debug(`TypeScript Copilot context: [${context.requestId}, ${context.source ?? languageContextService_1.KnownSources.unknown}, ${JSON.stringify(position, undefined, 0)}, ${JSON.stringify(nodePath, undefined, 0)}, ${JSON.stringify(stats, undefined, 0)}, cacheItems:${data.cachedItems}, cacheState:${JSON.stringify(cacheState, undefined, 0)}, budgetExhausted:${data.tokenBudgetExhausted}, cancelled:${data.cancelled}, timedOut:${data.timedOut}, fileSize:${fileSize}] in [${timeTaken},${data.serverTime},${data.contextComputeTime}]ms.${data.timedOut ? ' Timed out.' : ''}`);
        if (data.errorData !== undefined && data.errorData.length > 0) {
            const errorData = data.errorData;
            for (const error of errorData) {
                /* __GDPR__
                    "typescript-context-plugin.completion-context.error" : {
                        "owner": "dirkb",
                        "comment": "Telemetry for copilot inline completion context errors",
                        "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The request correlation id" },
                        "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The source of the request" },
                        "code": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The failure code", "isMeasurement": true },
                        "message": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth", "comment": "The failure message" }
                    }
                */
                this.telemetryService.sendMSFTTelemetryEvent('typescript-context-plugin.completion-context.error', {
                    requestId: context.requestId,
                    source: context.source ?? languageContextService_1.KnownSources.unknown,
                    message: error.message
                }, {
                    code: error.code
                });
                this.logService.error('Error computing context:', `${error.message} [${error.code}]`);
            }
        }
    }
    sendRequestOnTimeoutTelemetry(context, data, cacheState) {
        const stats = data.stats;
        const items = stats.items;
        const totalSize = stats.totalSize;
        /* __GDPR__
            "typescript-context-plugin.completion-context.on-timeout" : {
                "owner": "dirkb",
                "comment": "Telemetry for copilot inline completion context on timeout",
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The request correlation id" },
                "opportunityId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The opportunity id" },
                "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The source of the request" },
                "total": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Total number of context items", "isMeasurement": true },
                "snippets": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of code snippets", "isMeasurement": true },
                "traits": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of traits", "isMeasurement": true },
                "yielded": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of yielded items", "isMeasurement": true },
                "items": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Detailed information about each context item delivered." },
                "totalSize": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Total size of all context items", "isMeasurement": true },
                "cacheState": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The cache state for the onTimeout request" }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('typescript-context-plugin.completion-context.on-timeout', {
            requestId: context.requestId,
            opportunityId: context.opportunityId ?? 'unknown',
            source: context.source ?? languageContextService_1.KnownSources.unknown,
            items: JSON.stringify(items),
            cacheState: cacheState.toString()
        }, {
            total: stats.total,
            snippets: stats.snippets,
            traits: stats.traits,
            yielded: stats.yielded,
            totalSize: totalSize
        });
        this.logService.debug(`TypeScript Copilot context on timeout: [${context.requestId}, ${JSON.stringify(stats, undefined, 0)}]`);
    }
    sendRequestFailureTelemetry(context, data) {
        /* __GDPR__
            "typescript-context-plugin.completion-context.failed" : {
                "owner": "dirkb",
                "comment": "Telemetry for copilot inline completion context in failure case",
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The request correlation id" },
                "opportunityId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The opportunity id" },
                "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The source of the request" },
                "code:": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The failure code" },
                "message": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth", "comment": "The failure message" },
                "stack": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth", "comment": "The failure stack" }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('typescript-context-plugin.completion-context.failed', {
            requestId: context.requestId,
            opportunityId: context.opportunityId ?? 'unknown',
            source: context.source ?? languageContextService_1.KnownSources.unknown,
            code: data.error,
            message: data.message,
            stack: data.stack ?? 'Not available'
        });
    }
    sendRequestCancelledTelemetry(context, timeTaken) {
        /* __GDPR__
            "typescript-context-plugin.completion-context.cancelled" : {
                "owner": "dirkb",
                "comment": "Telemetry for copilot inline completion context in cancellation case",
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The request correlation id" },
                "opportunityId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The opportunity id" },
                "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The source of the request" },
                "timeTaken": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Time taken to provide the completion", "isMeasurement": true }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('typescript-context-plugin.completion-context.cancelled', {
            requestId: context.requestId,
            opportunityId: context.opportunityId ?? 'unknown',
            source: context.source ?? languageContextService_1.KnownSources.unknown
        }, {
            timeTaken: timeTaken
        });
        this.logService.debug(`TypeScript Copilot context request ${context.requestId} got cancelled.`);
    }
    sendActivationTelemetry(response, error) {
        if (response !== undefined) {
            const body = response?.body;
            if (body?.kind === 'ok') {
                /* __GDPR__
                    "typescript-context-plugin.activation.ok" : {
                        "owner": "dirkb",
                        "comment": "Telemetry for TypeScript server plugin",
                        "session": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the TypeScript server had a session" },
                        "supported": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the TypeScript server version is supported" },
                        "version": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The version of the TypeScript server" }
                    }
                */
                this.telemetryService.sendMSFTTelemetryEvent('typescript-context-plugin.activation.ok', {
                    session: body.session.toString(),
                    supported: body.supported.toString(),
                    version: body.version ?? 'unknown'
                });
            }
            else if (body?.kind === 'error') {
                this.sendActivationFailedTelemetry(ErrorLocation.Server, ErrorPart.ServerPlugin, body.message, body.stack);
            }
            else {
                this.sendUnknownPingResponseTelemetry(ErrorLocation.Server, ErrorPart.ServerPlugin, response);
            }
        }
        else if (error !== undefined) {
            if (TypeScriptServerError.is(error)) {
                this.sendActivationFailedTelemetry(ErrorLocation.Server, ErrorPart.ServerPlugin, error.response.message ?? error.message, undefined, error.version.displayName);
            }
            else if (error instanceof Error) {
                this.sendActivationFailedTelemetry(ErrorLocation.Client, ErrorPart.ServerPlugin, error.message, error.stack);
            }
            else {
                this.sendActivationFailedTelemetry(ErrorLocation.Client, ErrorPart.ServerPlugin, 'Unknown error', undefined);
            }
        }
        else {
            this.sendActivationFailedTelemetry(ErrorLocation.Client, ErrorPart.ServerPlugin, 'Neither response nor error received.', undefined);
        }
    }
    sendActivationFailedTelemetry(location, part, message, stack, version) {
        /* __GDPR__
            "typescript-context-plugin.activation.failed" : {
                "owner": "dirkb",
                "comment": "Telemetry for TypeScript server plugin",
                "location": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The location of the failure" },
                "part": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The part that errored" },
                "message": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth", "comment": "The failure message" },
                "stack": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth", "comment": "The failure stack" },
                "version": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The version" }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('typescript-context-plugin.activation.failed', {
            location: location,
            part: part,
            message: message,
            stack: stack ?? 'Not available',
            version: version ?? 'Not specified'
        });
    }
    sendUnknownPingResponseTelemetry(location, part, response) {
        /* __GDPR__
            "typescript-context-plugin.activation.unknown-ping-response" : {
                "owner": "dirkb",
                "comment": "Telemetry for TypeScript server plugin",
                "location": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The location of the failure" },
                "part": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The part that errored" },
                "response": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth", "comment": "The response literal" }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('typescript-context-plugin.activation.unknown-ping-response', {
            location: location,
            part: part,
            response: JSON.stringify(response, undefined, 0)
        });
    }
    sendIntegrationTelemetry(requestId, document, versionMismatch) {
        /* __GDPR__
            "typescript-context-plugin.integration.failed" : {
                "owner": "dirkb",
                "comment": "Telemetry for Copilot inline chat integration.",
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The request correlation id" },
                "document": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The document for which the integration failed" },
                "versionMismatch": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The version mismatch" }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('typescript-context-plugin.integration.failed', {
            requestId: requestId,
            document: document,
            versionMismatch: versionMismatch
        });
    }
    sendInlineCompletionProviderTelemetry(source, registered) {
        if (registered) {
            /* __GDPR__
                "typescript-context-plugin.inline-completion-provider.registered" : {
                    "owner": "dirkb",
                    "comment": "Telemetry for Copilot inline completions",
                    "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The source of the request" }
                }
            */
            this.telemetryService.sendMSFTTelemetryEvent('typescript-context-plugin.inline-completion-provider.registered', {
                source: source
            });
        }
        else {
            /* __GDPR__
                "typescript-context-plugin.inline-completion-provider.unregistered" : {
                    "owner": "dirkb",
                    "comment": "Telemetry for Copilot inline completions",
                    "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The source of the request" }
                }
            */
            this.telemetryService.sendMSFTTelemetryEvent('typescript-context-plugin.inline-completion-provider.unregistered', {
                source: source
            });
        }
    }
}
var CacheState;
(function (CacheState) {
    CacheState["NotPopulated"] = "NotPopulated";
    CacheState["PartiallyPopulated"] = "PartiallyPopulated";
    CacheState["FullyPopulated"] = "FullyPopulated";
})(CacheState || (CacheState = {}));
class RunnableResultManager {
    constructor() {
        this.disposables = new lifecycle_1.DisposableStore();
        this.outsideRangeRunnableResults = [];
        this.requestInfo = undefined;
        this.results = new Map();
        this.cacheInfo = {
            version: 0,
            state: CacheState.NotPopulated
        };
        this.withInRangeRunnableResults = [];
        this.outsideRangeRunnableResults = [];
        this.neighborFileRunnableResults = [];
        this.disposables.add(vscode.workspace.onDidChangeTextDocument((event) => {
            if (this.requestInfo === undefined || event.contentChanges.length === 0) {
                return;
            }
            if (event.document.uri.toString() !== this.requestInfo.document) {
                if (this.affectsTypeScript(event)) {
                    this.clear();
                }
            }
            else {
                for (const change of event.contentChanges) {
                    const changeRange = change.range;
                    for (let i = 0; i < this.withInRangeRunnableResults.length;) {
                        const entry = this.withInRangeRunnableResults[i];
                        if (entry.range.contains(changeRange)) {
                            entry.range = this.applyTextContentChangeEventToWithinRange(change, entry.range);
                            i++;
                        }
                        else {
                            const id = entry.resultId;
                            this.results.delete(id);
                            this.withInRangeRunnableResults.splice(i, 1);
                        }
                    }
                    for (let i = 0; i < this.outsideRangeRunnableResults.length;) {
                        const entry = this.outsideRangeRunnableResults[i];
                        const ranges = this.applyTextContentChangeEventToOutsideRanges(change, entry.ranges);
                        if (ranges === undefined) {
                            const id = entry.resultId;
                            this.results.delete(id);
                            this.outsideRangeRunnableResults.splice(i, 1);
                        }
                        else {
                            entry.ranges = ranges;
                            i++;
                        }
                    }
                    this.cacheInfo.version = event.document.version;
                }
            }
        }));
        this.disposables.add(vscode.workspace.onDidCloseTextDocument((document) => {
            if (this.requestInfo?.document === document.uri.toString()) {
                this.clear();
            }
        }));
        this.disposables.add(vscode.window.onDidChangeActiveTextEditor(() => {
            this.clear();
        }));
        this.disposables.add(vscode.window.tabGroups.onDidChangeTabs((event) => {
            if (event.closed.length === 0 && event.opened.length === 0) {
                return;
            }
            for (const item of this.neighborFileRunnableResults) {
                this.results.delete(item.resultId);
            }
            this.neighborFileRunnableResults.length = 0;
        }));
    }
    clear() {
        this.requestInfo = undefined;
        this.results.clear();
        this.cacheInfo = {
            version: 0,
            state: CacheState.NotPopulated
        };
        this.withInRangeRunnableResults.length = 0;
        this.outsideRangeRunnableResults.length = 0;
        this.neighborFileRunnableResults.length = 0;
    }
    getCacheState() {
        return this.cacheInfo.state;
    }
    update(document, version, position, context, body, requestState) {
        const itemMap = requestState?.itemMap ?? new Map();
        const usedResults = requestState?.resultMap ?? new Map();
        this.withInRangeRunnableResults.length = 0;
        this.outsideRangeRunnableResults.length = 0;
        this.neighborFileRunnableResults.length = 0;
        this.results.clear();
        this.cacheInfo = {
            version: version,
            state: CacheState.NotPopulated
        };
        let cachedItems = 0;
        let referencedItems = 0;
        const serverComputed = new Set();
        this.requestInfo = {
            document: document.uri.toString(),
            version: version,
            languageId: document.languageId,
            position: position,
            requestId: context.requestId,
            path: body.path ?? [0]
        };
        if (body.runnableResults === undefined || body.runnableResults.length === 0 || body.path === undefined || body.path.length === 0 || body.path[0] === 0) {
            return { resolved: [], cached: cachedItems, referenced: referencedItems, serverComputed: serverComputed };
        }
        const serverItems = new Set();
        // Add new client side context items to the item map.
        if (body.contextItems !== undefined && body.contextItems.length > 0) {
            for (const item of body.contextItems) {
                if (protocol.ContextItem.hasKey(item)) {
                    itemMap.set(item.key, item);
                    serverItems.add(item.key);
                }
            }
        }
        const updateRunnableResult = (resultItem) => {
            let result;
            if (resultItem.kind === protocol.ContextRunnableResultKind.ComputedResult) {
                serverComputed.add(resultItem.id);
                const items = [];
                for (const contextItem of resultItem.items) {
                    if (contextItem.kind === protocol.ContextKind.Reference) {
                        const referenced = itemMap.get(contextItem.key);
                        if (referenced !== undefined) {
                            referencedItems++;
                            items.push(referenced);
                            if (!serverItems.has(contextItem.key)) {
                                cachedItems++;
                            }
                        }
                    }
                    else {
                        items.push(contextItem);
                    }
                }
                result = types_1.ResolvedRunnableResult.from(resultItem, items);
            }
            else if (resultItem.kind === protocol.ContextRunnableResultKind.Reference) {
                result = usedResults.get(resultItem.id);
                if (result !== undefined) {
                    cachedItems += result.items.length;
                }
            }
            if (result === undefined) {
                return;
            }
            this.results.set(result.id, result);
            if (result.cache !== undefined) {
                if (result.cache.scope.kind === protocol.CacheScopeKind.WithinRange) {
                    const scopeRange = result.cache.scope.range;
                    const range = new vscode.Range(scopeRange.start.line, scopeRange.start.character, scopeRange.end.line, scopeRange.end.character);
                    this.withInRangeRunnableResults.push({ range, resultId: result.id });
                }
                else if (result.cache.scope.kind === protocol.CacheScopeKind.NeighborFiles) {
                    this.neighborFileRunnableResults.push({ resultId: result.id });
                }
                else if (result.cache.scope.kind === protocol.CacheScopeKind.OutsideRange) {
                    const ranges = [];
                    for (const scopeRange of result.cache.scope.ranges) {
                        ranges.push(new vscode.Range(scopeRange.start.line, scopeRange.start.character, scopeRange.end.line, scopeRange.end.character));
                    }
                    this.outsideRangeRunnableResults.push({ resultId: result.id, ranges });
                }
            }
            this.updateCacheState(result.state);
            return result;
        };
        const results = [];
        for (const runnableResult of body.runnableResults) {
            const result = updateRunnableResult(runnableResult);
            if (result !== undefined) {
                results.push(result);
            }
        }
        return { resolved: results, cached: cachedItems, referenced: referencedItems, serverComputed: serverComputed };
    }
    updateCacheState(state) {
        switch (this.cacheInfo.state) {
            case CacheState.NotPopulated:
                switch (state) {
                    case protocol.ContextRunnableState.Finished:
                        this.cacheInfo.state = CacheState.FullyPopulated;
                        break;
                    case protocol.ContextRunnableState.IsFull:
                    case protocol.ContextRunnableState.InProgress:
                        this.cacheInfo.state = CacheState.PartiallyPopulated;
                        break;
                    default:
                        this.cacheInfo.state = CacheState.NotPopulated;
                }
                break;
            case CacheState.PartiallyPopulated:
                // If the cache is partially populated we can only stay in that state.
                break;
            case CacheState.FullyPopulated:
                switch (state) {
                    case protocol.ContextRunnableState.Finished:
                        // If the cache is fully populated we can only stay in that state.
                        break;
                    case protocol.ContextRunnableState.IsFull:
                    case protocol.ContextRunnableState.InProgress:
                        this.cacheInfo.state = CacheState.PartiallyPopulated;
                        break;
                    default:
                        this.cacheInfo.state = CacheState.NotPopulated;
                }
                break;
        }
    }
    getRequestId() {
        return this.requestInfo?.requestId;
    }
    getNodePath() {
        return this.requestInfo?.path ?? [0];
    }
    getRunnableResult(id) {
        return this.results.get(id);
    }
    getCachedRunnableResults(document, position, emitMode) {
        const results = [];
        if (this.requestInfo?.document !== document.uri.toString()) {
            return results;
        }
        if (this.cacheInfo.version !== document.version || this.cacheInfo.state === CacheState.NotPopulated || this.requestInfo.path.length === 0 || this.requestInfo.path[0] === 0) {
            return results;
        }
        for (const item of this.results.values()) {
            if (emitMode !== undefined && item.cache?.emitMode === emitMode) {
                continue;
            }
            const scope = item.cache?.scope;
            if (scope === undefined || scope.kind !== protocol.CacheScopeKind.WithinRange) {
                results.push(item);
            }
            else {
                const r = scope.range;
                const range = new vscode.Range(r.start.line, r.start.character, r.end.line, r.end.character);
                if (range.contains(position)) {
                    results.push(item);
                }
            }
        }
        // Sort them by priority so that the most important items are emitted first if they
        // are contained in more than one runnable result.
        return results.sort((a, b) => {
            return a.priority < b.priority ? 1 : a.priority > b.priority ? -1 : 0;
        });
    }
    getContextRequestState(document, position) {
        if (this.requestInfo?.document !== document.uri.toString()) {
            return undefined;
        }
        if (this.cacheInfo.version !== document.version || this.cacheInfo.state === CacheState.NotPopulated || this.requestInfo.path.length === 0 || this.requestInfo.path[0] === 0) {
            return undefined;
        }
        const items = new Map();
        const client = [];
        const clientOnTimeout = [];
        const server = [];
        if (this.isCacheFullyUpToDate(document, position)) {
            for (const item of this.results.values()) {
                client.push(item);
            }
        }
        else {
            const canSkipItems = (rr, cache) => {
                if (rr.state === protocol.ContextRunnableState.Finished) {
                    return true;
                }
                if (rr.state === protocol.ContextRunnableState.IsFull) {
                    const kind = cache.scope.kind;
                    return kind === protocol.CacheScopeKind.WithinRange || kind === protocol.CacheScopeKind.NeighborFiles || kind === protocol.CacheScopeKind.File;
                }
                return false;
            };
            const handleRunnableResult = (id, rr) => {
                const cache = rr.cache;
                const cachedResult = {
                    id: id,
                    kind: protocol.ContextRunnableResultKind.CacheEntry,
                    state: rr.state,
                    items: []
                };
                let skipItems = false;
                if (cache !== undefined) {
                    cachedResult.cache = cache;
                    const emitMode = cache.emitMode;
                    if (emitMode === protocol.EmitMode.ClientBased) {
                        client.push(rr);
                        skipItems = canSkipItems(rr, cache);
                    }
                    else if (emitMode === protocol.EmitMode.ClientBasedOnTimeout) {
                        clientOnTimeout.push(rr);
                    }
                }
                server.push(cachedResult);
                if (skipItems) {
                    return;
                }
                // Add cached context items to the result;
                for (const item of rr.items) {
                    if (!protocol.ContextItem.hasKey(item)) {
                        continue;
                    }
                    const key = item.key;
                    let size = undefined;
                    switch (item.kind) {
                        case protocol.ContextKind.Snippet:
                            size = protocol.CodeSnippet.sizeInChars(item);
                            break;
                        case protocol.ContextKind.Trait:
                            size = protocol.Trait.sizeInChars(item);
                            break;
                        default:
                    }
                    cachedResult.items.push(protocol.CachedContextItem.create(key, size));
                    items.set(key, item);
                }
            };
            // We don't need to sort by priority here since the data is used for the next cache request.
            for (const [id, item] of this.results.entries()) {
                const scope = item.cache?.scope;
                if (scope === undefined || scope.kind !== protocol.CacheScopeKind.WithinRange) {
                    handleRunnableResult(id, item);
                }
                else {
                    const r = scope.range;
                    const range = new vscode.Range(r.start.line, r.start.character, r.end.line, r.end.character);
                    if (range.contains(position)) {
                        handleRunnableResult(id, item);
                    }
                }
            }
        }
        return { client, clientOnTimeout, server, itemMap: items, resultMap: new Map(this.results) };
    }
    isCacheFullyUpToDate(document, position) {
        if (this.requestInfo === undefined) {
            return false;
        }
        if (this.requestInfo.document !== document.uri.toString()) {
            return false;
        }
        // Same document, version and position. Cache can be full used.
        if (this.requestInfo.version === document.version && this.requestInfo.position.isEqual(position)) {
            return true;
        }
        // Document is older than cached request. Not up to date.
        if (this.requestInfo.version > document.version) {
            return false;
        }
        // if the position is not contained in all ranges return false.
        for (const runnable of this.withInRangeRunnableResults) {
            if (!runnable.range.contains(position)) {
                return false;
            }
        }
        const range = position.isBefore(this.requestInfo.position) ? new vscode.Range(position, this.requestInfo.position) : new vscode.Range(this.requestInfo.position, position);
        const text = document.getText(range);
        return text.trim().length === 0;
    }
    dispose() {
        this.clear();
        this.disposables.dispose();
    }
    affectsTypeScript(event) {
        const languageId = event.document.languageId;
        return languageId === 'typescript' || languageId === 'typescriptreact' || languageId === 'javascript' || languageId === 'javascriptreact' || languageId === 'json';
    }
    applyTextContentChangeEventToWithinRange(event, range) {
        // The start stays untouched since the change range is contained in the range.
        const eventRange = event.range;
        const eventText = event.text;
        // Calculate how many lines the new text adds or removes
        const linesDelta = (eventText.match(/\n/g) || []).length - (eventRange.end.line - eventRange.start.line);
        // Calculate the new end position
        const endLine = range.end.line + linesDelta;
        let endCharacter = range.end.character;
        if (eventRange.end.line === range.end.line) {
            // Calculate the character delta for the last line of the change
            const lastNewLineIndex = eventText.lastIndexOf('\n');
            const newTextLength = lastNewLineIndex !== -1 ? eventText.length - lastNewLineIndex - 1 : eventText.length;
            const oldTextLength = eventRange.end.character - (eventRange.end.line > eventRange.start.line ? 0 : eventRange.start.character);
            const charDelta = newTextLength - oldTextLength;
            endCharacter += charDelta;
        }
        return new vscode.Range(range.start, new vscode.Position(endLine, endCharacter));
    }
    applyTextContentChangeEventToOutsideRanges(event, ranges) {
        if (ranges.length === 0) {
            return ranges;
        }
        const changeRange = event.range;
        const eventText = event.text;
        // Quick optimization: if change is completely after last range, no ranges need adjustment
        const lastRange = ranges[ranges.length - 1];
        if (changeRange.start.isAfter(lastRange.end)) {
            return ranges;
        }
        // Calculate how many lines the new text adds or removes
        const linesDelta = (eventText.match(/\n/g) || []).length - (changeRange.end.line - changeRange.start.line);
        const adjustedRanges = [];
        for (const range of ranges) {
            if (range.end.isBefore(changeRange.start)) {
                // Range is completely before change, no adjustment needed
                adjustedRanges.push(range);
            }
            else if (range.start.isAfter(changeRange.end)) {
                // Range is completely after change, adjust by lines delta
                if (linesDelta === 0) {
                    adjustedRanges.push(range);
                }
                else {
                    adjustedRanges.push(new vscode.Range(new vscode.Position(range.start.line + linesDelta, range.start.character), new vscode.Position(range.end.line + linesDelta, range.end.character)));
                }
            }
            else {
                // The range intersects with the range with will invalidate the cache entry.
                return undefined;
            }
        }
        return adjustedRanges;
    }
}
var TextDocuments;
(function (TextDocuments) {
    function consider(document) {
        return document.uri.scheme === 'file' && (document.languageId === 'typescript' || document.languageId === 'typescriptreact');
    }
    TextDocuments.consider = consider;
})(TextDocuments || (TextDocuments = {}));
class NeighborFileModel {
    constructor() {
        this.disposables = new lifecycle_1.DisposableStore();
        this.order = new lru_cache_1.LRUCache({ max: 32 });
        this.disposables.add(vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor === undefined) {
                return;
            }
            const document = editor.document;
            if (TextDocuments.consider(document)) {
                this.order.set(document.uri.toString(), document.uri.fsPath);
            }
        }));
        this.disposables.add(vscode.workspace.onDidCloseTextDocument((document) => {
            this.order.delete(document.uri.toString());
        }));
        this.disposables.add(vscode.window.tabGroups.onDidChangeTabs((e) => {
            for (const tab of e.closed) {
                if (tab.input instanceof vscode.TabInputText) {
                    this.order.delete(tab.input.uri.toString());
                }
            }
        }));
        const openTextDocuments = new Set();
        for (const document of vscode.workspace.textDocuments) {
            if (TextDocuments.consider(document)) {
                openTextDocuments.add(document.uri.toString());
            }
        }
        for (const group of vscode.window.tabGroups.all) {
            for (const tab of group.tabs) {
                if (tab.input instanceof vscode.TabInputText && openTextDocuments.has(tab.input.uri.toString())) {
                    this.order.set(tab.input.uri.toString(), tab.input.uri.fsPath);
                }
            }
        }
        if (vscode.window.activeTextEditor !== undefined) {
            const document = vscode.window.activeTextEditor.document;
            if (TextDocuments.consider(document)) {
                this.order.set(document.uri.toString(), document.uri.fsPath);
            }
        }
    }
    getNeighborFiles(currentDocument) {
        const result = [];
        const currentUri = currentDocument.uri.toString();
        for (const [key, value] of this.order.entries()) {
            if (key === currentUri) {
                continue;
            }
            result.push(value);
            if (result.length >= 10) {
                break;
            }
        }
        return result;
    }
    dispose() {
        this.disposables.dispose();
    }
}
var ComputeContextRequestArgs;
(function (ComputeContextRequestArgs) {
    function create(document, position, context, startTime, timeBudget, willLogRequestTelemetry, neighborFiles, clientSideRunnableResults, includeDocumentation) {
        return {
            file: vscode.Uri.file(document.fileName),
            line: position.line + 1,
            offset: position.character + 1,
            startTime: startTime,
            timeBudget: timeBudget,
            primaryCharacterBudget: (context.tokenBudget ?? 7 * 1024) * 4,
            secondaryCharacterBudget: (currentTokenBudget * 4),
            includeDocumentation: includeDocumentation,
            neighborFiles: neighborFiles !== undefined && neighborFiles.length > 0 ? neighborFiles : undefined,
            clientSideRunnableResults: clientSideRunnableResults,
            $traceId: willLogRequestTelemetry ? context.requestId : undefined
        };
    }
    ComputeContextRequestArgs.create = create;
})(ComputeContextRequestArgs || (ComputeContextRequestArgs = {}));
class PendingRequestInfo {
    constructor(document, position, context) {
        this.document = document.uri.toString();
        this.version = document.version;
        this.position = position;
        this.context = context;
    }
}
class InflightRequestInfo {
    constructor(document, position, context, tokenSource, serverPromise) {
        this.document = document.uri.toString();
        this.position = position;
        this.requestId = context.requestId;
        this.source = context.source ?? languageContextService_1.KnownSources.unknown;
        this.tokenSource = tokenSource;
        this.serverPromise = serverPromise;
    }
    matches(document, position) {
        return this.document === document.uri.toString() && this.position.isEqual(position);
    }
    matchesDocument(document) {
        return this.document === document.uri.toString();
    }
    cancel() {
        this.tokenSource.cancel();
    }
}
class OnTimeoutData {
    constructor(document, position) {
        this.runnableResults = [];
        this.document = document.uri.toString();
        this.version = document.version;
        this.position = position;
    }
    addRunnableResult(result) {
        this.runnableResults.push(result);
    }
    addRunnableResults(results) {
        this.runnableResults.push(...results);
    }
    matches(document, position) {
        return this.document === document.uri.toString() && this.version === document.version && this.position.isEqual(position);
    }
}
var ContextItemUsageMode;
(function (ContextItemUsageMode) {
    ContextItemUsageMode["minimal"] = "minimal";
    ContextItemUsageMode["double"] = "double";
    ContextItemUsageMode["fillHalf"] = "fillHalf";
    ContextItemUsageMode["fill"] = "fill";
})(ContextItemUsageMode || (ContextItemUsageMode = {}));
(function (ContextItemUsageMode) {
    function fromString(value) {
        switch (value) {
            case 'minimal': return ContextItemUsageMode.minimal;
            case 'double': return ContextItemUsageMode.double;
            case 'fillHalf': return ContextItemUsageMode.fillHalf;
            case 'fill': return ContextItemUsageMode.fill;
            default: return ContextItemUsageMode.minimal;
        }
    }
    ContextItemUsageMode.fromString = fromString;
})(ContextItemUsageMode || (ContextItemUsageMode = {}));
class CharacterBudget {
    constructor(mandatory, optional) {
        this.overall = mandatory;
        this.mandatory = mandatory;
        this.optional = optional;
        this.start = { mandatory, optional };
    }
    spend(chars) {
        this.mandatory -= chars;
        this.optional -= chars;
    }
    isExhausted() {
        return this.mandatory <= 0;
    }
    isOptionalExhausted() {
        return this.optional <= 0;
    }
    fresh() {
        return new CharacterBudget(this.start.mandatory, this.start.optional);
    }
}
let LanguageContextServiceImpl = class LanguageContextServiceImpl {
    static { LanguageContextServiceImpl_1 = this; }
    static { this.defaultCachePopulationBudget = 500; }
    static { this.defaultCachePopulationRaceTimeout = 20; }
    static { this.ExecConfig = { executionTarget: ExecutionTarget.Semantic }; }
    constructor(configurationService, experimentationService, telemetryService, logService) {
        this.configurationService = configurationService;
        this.experimentationService = experimentationService;
        this.telemetryService = telemetryService;
        this.logService = logService;
        this.isDebugging = process.execArgv.some((arg) => /^--(?:inspect|debug)(?:-brk)?(?:=\d+)?$/i.test(arg));
        this.telemetrySender = new TelemetrySender(telemetryService, logService);
        this.runnableResultManager = new RunnableResultManager();
        this.neighborFileModel = new NeighborFileModel();
        this.pendingRequest = undefined;
        this.inflightCachePopulationRequest = undefined;
        this.onTimeoutData = undefined;
        this.cachePopulationTimeout = this.getCachePopulationBudget();
        this.usageMode = this.getUsageMode();
        this.includeDocumentation = this.getIncludeDocumentation();
        this.disposables = new lifecycle_1.DisposableStore();
        this.disposables.add(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(configurationService_1.ConfigKey.TypeScriptLanguageContextMode.fullyQualifiedId)) {
                this.usageMode = this.getUsageMode();
            }
            else if (e.affectsConfiguration(configurationService_1.ConfigKey.TypeScriptLanguageContextCacheTimeout.fullyQualifiedId)) {
                this.cachePopulationTimeout = this.getCachePopulationBudget();
            }
            else if (e.affectsConfiguration(configurationService_1.ConfigKey.TypeScriptLanguageContextIncludeDocumentation.fullyQualifiedId)) {
                this.includeDocumentation = this.getIncludeDocumentation();
            }
        }));
        this._onCachePopulated = this.disposables.add(new vscode.EventEmitter());
        this.onCachePopulated = this._onCachePopulated.event;
        this._onContextComputed = this.disposables.add(new vscode.EventEmitter());
        this.onContextComputed = this._onContextComputed.event;
        this._onContextComputedOnTimeout = this.disposables.add(new vscode.EventEmitter());
        this.onContextComputedOnTimeout = this._onContextComputedOnTimeout.event;
    }
    dispose() {
        this.runnableResultManager.dispose();
        this.neighborFileModel.dispose();
        this.inflightCachePopulationRequest = undefined;
    }
    async isActivated(documentOrLanguageId) {
        const languageId = typeof documentOrLanguageId === 'string' ? documentOrLanguageId : documentOrLanguageId.languageId;
        if (languageId !== 'typescript' && languageId !== 'typescriptreact') {
            return false;
        }
        if (this._isActivated === undefined) {
            this._isActivated = this.doIsTypeScriptActivated(languageId);
        }
        return this._isActivated;
    }
    async doIsTypeScriptActivated(languageId) {
        let activated = false;
        try {
            // Check that the TypeScript extension is installed and runs in the same extension host.
            const typeScriptExtension = vscode.extensions.getExtension('vscode.typescript-language-features');
            if (typeScriptExtension === undefined) {
                return false;
            }
            // Make sure the TypeScript extension is activated.
            await typeScriptExtension.activate();
            // Send a ping request to see if the TS server plugin got installed correctly.
            const response = await vscode.commands.executeCommand('typescript.tsserverRequest', '_.copilot.ping', LanguageContextServiceImpl_1.ExecConfig, new vscode.CancellationTokenSource().token);
            this.telemetrySender.sendActivationTelemetry(response, undefined);
            if (response !== undefined) {
                if (response.body?.kind === 'ok') {
                    this.logService.info('TypeScript server plugin activated.');
                    activated = true;
                }
                else {
                    this.logService.error('TypeScript server plugin not activated:', response.body?.message ?? 'Message not provided.');
                }
            }
            else {
                this.logService.error('TypeScript server plugin not activated:', 'No ping response received.');
            }
        }
        catch (error) {
            this.telemetrySender.sendActivationTelemetry(undefined, error);
            this.logService.error('Error pinging TypeScript server plugin:', error);
        }
        return activated;
    }
    async populateCache(document, position, context) {
        if (document.languageId !== 'typescript' && document.languageId !== 'typescriptreact') {
            return;
        }
        if (this.inflightCachePopulationRequest !== undefined) {
            if (!this.inflightCachePopulationRequest.matches(document, position)) {
                // We have a request running. Do not issue another cache request but remember the pending request.
                this.pendingRequest = new PendingRequestInfo(document, position, context);
            }
            return;
        }
        const startTime = Date.now();
        const contextRequestState = this.runnableResultManager.getContextRequestState(document, position);
        if (contextRequestState !== undefined && contextRequestState.server.length === 0) {
            // There is nothing to do on the server. Cache is up to date.
            return;
        }
        const neighborFiles = this.neighborFileModel.getNeighborFiles(document);
        const timeBudget = this.cachePopulationTimeout;
        const willLogRequestTelemetry = this.telemetrySender.willLogRequestTelemetry(context);
        const args = ComputeContextRequestArgs.create(document, position, context, startTime, timeBudget, willLogRequestTelemetry, neighborFiles, contextRequestState?.server, this.includeDocumentation);
        try {
            const isDebugging = this.isDebugging;
            const forDebugging = isDebugging ? [] : undefined;
            const tokenSource = new vscode.CancellationTokenSource();
            const token = tokenSource.token;
            const documentVersion = document.version;
            const cacheState = this.runnableResultManager.getCacheState();
            let response;
            let inflightRequest = undefined;
            try {
                const promise = vscode.commands.executeCommand('typescript.tsserverRequest', '_.copilot.context', args, LanguageContextServiceImpl_1.ExecConfig, token);
                inflightRequest = new InflightRequestInfo(document, position, context, tokenSource, promise);
                this.inflightCachePopulationRequest = inflightRequest;
                response = await promise;
            }
            finally {
                if (this.inflightCachePopulationRequest === inflightRequest) {
                    this.inflightCachePopulationRequest = undefined;
                }
                tokenSource.dispose();
            }
            const timeTaken = Date.now() - startTime;
            if (protocol.ComputeContextResponse.isCancelled(response)) {
                this.telemetrySender.sendRequestCancelledTelemetry(context, timeTaken);
            }
            else if (protocol.ComputeContextResponse.isOk(response)) {
                const body = response.body;
                const contextItemResult = new types_1.ContextItemResultBuilder(timeTaken);
                const { resolved, cached, referenced, serverComputed } = this.runnableResultManager.update(document, documentVersion, position, context, body, contextRequestState);
                contextItemResult.cachedItems += cached;
                contextItemResult.referencedItems += referenced;
                contextItemResult.serverComputed = serverComputed;
                if (resolved.length > 0) {
                    // Update the stats for telemetry.
                    for (const runnableResult of resolved) {
                        for (const converted of contextItemResult.update(runnableResult)) {
                            forDebugging?.push(converted.item);
                        }
                    }
                }
                contextItemResult.updateResponse(body, token);
                this.telemetrySender.sendRequestTelemetry(document, position, context, contextItemResult, timeTaken, { before: cacheState, after: this.runnableResultManager.getCacheState() }, undefined);
                isDebugging && forDebugging?.length;
                this._onCachePopulated.fire({ document, position, source: context.source, items: resolved, summary: contextItemResult });
            }
            else if (protocol.ComputeContextResponse.isError(response)) {
                this.telemetrySender.sendRequestFailureTelemetry(context, response.body);
                console.error('Error populating cache:', response.body.message, response.body.stack);
            }
        }
        catch (error) {
            this.logService.error(error, `Error populating cache for document: ${document.uri.toString()} at position: ${position.line + 1}:${position.character + 1}`);
        }
        if (this.pendingRequest !== undefined) {
            // We had a pending request. Clear it and try to populate the cache again.
            const pendingRequest = this.pendingRequest;
            this.pendingRequest = undefined;
            const textEditor = vscode.window.activeTextEditor;
            if (textEditor !== undefined) {
                const document = textEditor.document;
                if (document.uri.toString() === pendingRequest.document && document.version === pendingRequest.version && document.validatePosition(pendingRequest.position).isEqual(pendingRequest.position)) {
                    this.populateCache(document, pendingRequest.position, pendingRequest.context).catch(() => { });
                }
            }
        }
    }
    async *getContext(document, position, context, token) {
        this.onTimeoutData = undefined;
        if (document.languageId !== 'typescript' && document.languageId !== 'typescriptreact') {
            return;
        }
        const startTime = Date.now();
        let cacheRequest = 'none';
        const cachePopulationRequestInflight = this.inflightCachePopulationRequest !== undefined && this.inflightCachePopulationRequest.matchesDocument(document);
        if (cachePopulationRequestInflight) {
            this.onTimeoutData = new OnTimeoutData(document, position);
            cacheRequest = 'inflight';
        }
        if (token.isCancellationRequested) {
            this.telemetrySender.sendRequestCancelledTelemetry(context, Date.now() - startTime);
            return;
        }
        const isDebugging = this.isDebugging;
        const forDebugging = isDebugging ? [] : undefined;
        const contextItemResult = new types_1.ContextItemResultBuilder(Date.now() - startTime);
        if (this.onTimeoutData !== undefined) {
            this.onTimeoutData.resultBuilder = contextItemResult;
        }
        const characterBudget = this.getCharacterBudget(context, document);
        // We first collect all items to yield so that the state of the cache doesn't change underneath us.
        // This could otherwise happen if the cache population request finishes while we are yielding items.
        const itemsToYield = [];
        const { mandatory, optional, onTimeout } = this.getRunnables(document, position, cachePopulationRequestInflight);
        if (this.onTimeoutData !== undefined) {
            this.onTimeoutData.addRunnableResults(onTimeout);
        }
        outer: for (const runnableResult of mandatory) {
            for (const { item, size } of contextItemResult.update(runnableResult, true)) {
                forDebugging?.push(item);
                characterBudget.spend(size);
                if (characterBudget.isExhausted()) {
                    break outer;
                }
                itemsToYield.push(item);
            }
        }
        if (!characterBudget.isOptionalExhausted()) {
            outer: for (const runnableResult of optional) {
                for (const { item, size } of contextItemResult.update(runnableResult, true)) {
                    forDebugging?.push(item);
                    characterBudget.spend(size);
                    if (characterBudget.isOptionalExhausted()) {
                        break outer;
                    }
                    itemsToYield.push(item);
                }
            }
        }
        if (!token.isCancellationRequested) {
            for (const item of itemsToYield) {
                if (token.isCancellationRequested) {
                    this.onTimeoutData = undefined;
                    break;
                }
                yield item;
            }
            // Recheck for an inflight request and join it if it is for the same document and position.
            if (this.inflightCachePopulationRequest !== undefined && this.inflightCachePopulationRequest.matchesDocument(document)) {
                cacheRequest = 'inflight';
                // We have an inflight request for the same document and position.
                // We wait for the server promise to resolve and then see if we can yield items from the
                // inflight request.
                const timeOut = Math.max(0, Math.min(context.timeBudget ?? LanguageContextServiceImpl_1.defaultCachePopulationRaceTimeout, LanguageContextServiceImpl_1.defaultCachePopulationRaceTimeout));
                const result = await Promise.race([this.inflightCachePopulationRequest.serverPromise, new Promise((resolve) => setTimeout(resolve, timeOut)).then(() => 'timedOut')]);
                // The server promised resolved first. So the inflight request is done.
                if (result !== 'timedOut') {
                    this.inflightCachePopulationRequest = undefined;
                    if (this.onTimeoutData !== undefined) {
                        this.onTimeoutData = undefined;
                        const runnableResults = this.runnableResultManager.getCachedRunnableResults(document, position, protocol.EmitMode.ClientBasedOnTimeout);
                        for (const runnableResult of runnableResults) {
                            for (const { item } of contextItemResult.update(runnableResult)) {
                                forDebugging?.push(item);
                                yield item;
                            }
                        }
                        cacheRequest = 'awaited';
                    }
                }
            }
        }
        else {
            this.onTimeoutData = undefined;
        }
        const isSpeculativeRequest = context.proposedEdits !== undefined;
        if (isSpeculativeRequest) {
            this.telemetrySender.sendSpeculativeRequestTelemetry(context, this.runnableResultManager.getRequestId() ?? 'unknown', contextItemResult.stats.yielded);
        }
        else {
            const cacheState = this.runnableResultManager.getCacheState();
            contextItemResult.path = this.runnableResultManager.getNodePath();
            contextItemResult.cancelled = token.isCancellationRequested;
            contextItemResult.serverTime = 0;
            contextItemResult.contextComputeTime = 0;
            contextItemResult.fromCache = true;
            this.telemetrySender.sendRequestTelemetry(document, position, context, contextItemResult, Date.now() - startTime, { before: cacheState, after: cacheState }, cacheRequest);
            isDebugging && forDebugging?.length;
            this._onContextComputed.fire({
                document, position, source: context.source, items: itemsToYield, summary: contextItemResult
            });
        }
        return;
    }
    getRunnables(document, position, cachePopulationInflight) {
        const mandatory = [];
        const optional = [];
        const onTimeout = [];
        for (const runnable of this.runnableResultManager.getCachedRunnableResults(document, position)) {
            if (cachePopulationInflight && runnable.cache?.emitMode === protocol.EmitMode.ClientBasedOnTimeout) {
                onTimeout.push(runnable);
            }
            else {
                const priority = runnable.priority;
                if (priority === protocol.Priorities.Expression || priority === protocol.Priorities.Locals || priority === protocol.Priorities.Inherited || priority === protocol.Priorities.Traits) {
                    mandatory.push(runnable);
                }
                else {
                    optional.push(runnable);
                }
            }
        }
        return { mandatory, optional, onTimeout };
    }
    getContextOnTimeout(document, position, context) {
        try {
            if (this.onTimeoutData === undefined) {
                return [];
            }
            if (!this.onTimeoutData.matches(document, position) || this.onTimeoutData.resultBuilder === undefined) {
                return [];
            }
            const result = [];
            const contextItemResult = this.onTimeoutData.resultBuilder;
            for (const runnableResult of this.onTimeoutData.runnableResults) {
                for (const { item } of contextItemResult.update(runnableResult, true)) {
                    result.push(item);
                }
            }
            return result;
        }
        finally {
            this.onTimeoutData = undefined;
        }
    }
    getCachePopulationBudget() {
        const result = this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.TypeScriptLanguageContextCacheTimeout, this.experimentationService);
        return result ?? LanguageContextServiceImpl_1.defaultCachePopulationBudget;
    }
    getUsageMode() {
        const value = this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.TypeScriptLanguageContextMode, this.experimentationService);
        return ContextItemUsageMode.fromString(value);
    }
    getIncludeDocumentation() {
        return this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.TypeScriptLanguageContextIncludeDocumentation, this.experimentationService);
    }
    getCharacterBudget(context, document) {
        const chars = (context.tokenBudget ?? currentTokenBudget) * 4;
        switch (this.usageMode) {
            case ContextItemUsageMode.minimal:
                return new CharacterBudget(chars, 0);
            case ContextItemUsageMode.double:
                return new CharacterBudget(chars, Math.min(chars, document.getText().length));
            case ContextItemUsageMode.fillHalf:
                return new CharacterBudget(chars, Math.floor(chars / 2));
            case ContextItemUsageMode.fill:
                return new CharacterBudget(chars, chars);
            default:
                return new CharacterBudget(chars, chars);
        }
    }
};
exports.LanguageContextServiceImpl = LanguageContextServiceImpl;
exports.LanguageContextServiceImpl = LanguageContextServiceImpl = LanguageContextServiceImpl_1 = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, nullExperimentationService_1.IExperimentationService),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, logService_1.ILogService)
], LanguageContextServiceImpl);
class CachePopulationTrigger {
    constructor(languageContextService, tokenBudgetProvider) {
        this.languageContextService = languageContextService;
        this.tokenBudgetProvider = tokenBudgetProvider;
        this.disposables = new lifecycle_1.DisposableStore();
        this.lastDocumentChange = undefined;
        this.selectionChangeDebouncer = this.disposables.add(new throttledDebounce_1.ThrottledDebouncer());
        this.disposables.add(vscode.workspace.onDidChangeTextDocument((event) => {
            // console.log(`Text document change ${Date.now()}`);
            this.didChangeTextDocument(event);
        }));
        this.disposables.add(vscode.window.onDidChangeActiveTextEditor((editor) => {
            this.didChangeActiveTextEditor(editor);
        }));
        this.disposables.add(vscode.window.onDidChangeTextEditorSelection(async (event) => {
            // console.log(`Selection ${Date.now()}`);
            this.didChangeTextEditorSelection(event);
        }));
        this.disposables.add(vscode.languages.registerInlineCompletionItemProvider([{ scheme: 'file', language: 'typescript' }, { scheme: 'file', language: 'typescriptreact' }], {
            provideInlineCompletionItems: async (document, position, context, _token) => {
                // console.log(`Inline completion ${Date.now()}`);
                this.onInlineCompletion(document, position, context);
                return undefined;
            }
        }, { debounceDelayMs: 0, groupId: 'contextService' }));
    }
    dispose() {
        this.disposables.dispose();
    }
    didChangeTextDocument(event) {
        const time = Date.now();
        this.lastDocumentChange = undefined;
        const document = event.document;
        if (document.languageId !== 'typescript' && document.languageId !== 'typescriptreact') {
            return;
        }
        if (event.contentChanges.length === 0) {
            return;
        }
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor === undefined || activeEditor.document.uri.toString() !== document.uri.toString()) {
            return;
        }
        this.lastDocumentChange = { document: document.uri.toString(), time: time };
    }
    didChangeActiveTextEditor(editor) {
        if (this.lastDocumentChange === undefined) {
            return;
        }
        if (editor === undefined) {
            this.lastDocumentChange = undefined;
            return;
        }
        const document = editor.document;
        if (this.lastDocumentChange.document !== document.uri.toString()) {
            this.lastDocumentChange = undefined;
        }
    }
    didChangeTextEditorSelection(event) {
        const document = event.textEditor.document;
        const tokenBudget = this.tokenBudgetProvider.getTokenBudget(document);
        if (tokenBudget <= 0) {
            // There is no token budget left, so we don't want to trigger the cache population.
            return;
        }
        const position = this.getPosition(event);
        if (position === undefined) {
            this.selectionChangeDebouncer.cancel();
            return;
        }
        try {
            if (event.kind === vscode.TextEditorSelectionChangeKind.Command || event.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
                this.selectionChangeDebouncer.cancel();
                this.populateCache(document, position, tokenBudget, undefined, languageContextService_1.TriggerKind.selection, false);
            }
            this.selectionChangeDebouncer.trigger(() => {
                this.populateCache(document, position, tokenBudget, undefined, languageContextService_1.TriggerKind.selection, true);
            });
        }
        catch (error) {
            console.error(error);
        }
    }
    onInlineCompletion(document, position, context) {
        const tokenBudget = this.tokenBudgetProvider.getTokenBudget(document);
        if (tokenBudget <= 0) {
            // There is no token budget left, so we don't want to trigger the cache population.
            return;
        }
        this.populateCache(document, position, tokenBudget, context.requestUuid, languageContextService_1.TriggerKind.completion, false);
    }
    getPosition(event) {
        const time = Date.now();
        const activeEditor = vscode.window.activeTextEditor;
        if (event.textEditor !== activeEditor) {
            return undefined;
        }
        const document = event.textEditor.document;
        if (document.languageId !== 'typescript' && document.languageId !== 'typescriptreact') {
            return;
        }
        if (event.selections.length !== 1) {
            return undefined;
        }
        const range = event.selections[0];
        if (!range.isEmpty) {
            return undefined;
        }
        const line = document.lineAt(range.start.line);
        const end = line.text.substring(range.start.character);
        // If we are not on an empty line or the end of the line is not empty, we don't want to trigger the context request.
        if (line.text.trim().length !== 0 && end.length > 0) {
            return undefined;
        }
        // If the last document change was within 500 ms, we don't want to trigger the context request. Instead we wait for the next change or
        // a normal inline completion request.
        if (this.lastDocumentChange !== undefined && this.lastDocumentChange.document === document.uri.toString() && time - this.lastDocumentChange.time < 500) {
            return undefined;
        }
        return range.start;
    }
    populateCache(document, position, tokenBudget, requestId, trigger, check) {
        if (check) {
            const activeTextEditor = vscode.window.activeTextEditor;
            if (activeTextEditor === undefined || activeTextEditor.document.uri.toString() !== document.uri.toString()) {
                return;
            }
            const selections = activeTextEditor.selections;
            if (selections === undefined || selections.length !== 1) {
                return;
            }
            const selection = selections[0];
            if (!selection.isEmpty || selection.start.line !== position.line || selection.start.character !== position.character) {
                return;
            }
        }
        const context = {
            requestId: requestId ?? (0, uuid_1.generateUuid)(),
            timeBudget: 50,
            tokenBudget: tokenBudget,
            source: languageContextService_1.KnownSources.populateCache,
            trigger: trigger,
            proposedEdits: undefined
        };
        this.languageContextService.populateCache(document, position, context).catch(() => {
            // Error got log inside the cache population call.
        });
    }
}
async function* mapAsyncIterable(source, transform) {
    for await (const item of source) {
        const result = transform(item);
        if (result !== undefined) {
            yield result;
        }
    }
}
const showContextInspectorViewContextKey = `puku.chat.showContextInspectorView`;
let InlineCompletionContribution = class InlineCompletionContribution {
    constructor(configurationService, experimentationService, logService, telemetryService, languageContextService, languageContextProviderService) {
        this.configurationService = configurationService;
        this.experimentationService = experimentationService;
        this.logService = logService;
        this.telemetryService = telemetryService;
        this.languageContextService = languageContextService;
        this.languageContextProviderService = languageContextProviderService;
        this.registrations = undefined;
        this.telemetrySender = new TelemetrySender(telemetryService, logService);
        this.registrationQueue = new async_1.Queue();
        this.disposables = new lifecycle_1.DisposableStore();
        if (languageContextService instanceof LanguageContextServiceImpl) {
            this.disposables.add(vscode.commands.registerCommand('puku.debug.showContextInspectorView', async () => {
                await vscode.commands.executeCommand('setContext', showContextInspectorViewContextKey, true);
                await vscode.commands.executeCommand('context-inspector.focus');
            }));
            this.disposables.add(vscode.window.registerTreeDataProvider('context-inspector', new inspector_1.InspectorDataProvider(languageContextService)));
        }
        // Check if there are any TypeScript files open in the workspace.
        const open = vscode.workspace.textDocuments.some((document) => document.languageId === 'typescript' || document.languageId === 'typescriptreact');
        if (open) {
            this.typeScriptFileOpen();
        }
        else {
            const disposable = vscode.workspace.onDidOpenTextDocument((document) => {
                if (document.languageId === 'typescript' || document.languageId === 'typescriptreact') {
                    disposable.dispose();
                    this.typeScriptFileOpen();
                }
            });
        }
    }
    dispose() {
        this.registrations?.dispose();
        this.disposables.dispose();
        this.registrationQueue.dispose();
    }
    typeScriptFileOpen() {
        this.checkRegistration();
        this.disposables.add(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(configurationService_1.ConfigKey.TypeScriptLanguageContext.fullyQualifiedId)) {
                this.checkRegistration();
            }
        }));
    }
    checkRegistration() {
        this.registrationQueue.queue(async () => {
            const value = this.getConfig();
            if (value === 'on') {
                await this.register();
            }
            else {
                this.unregister();
            }
        }).catch((error) => this.logService.error('Error checking TypeScript context provider registration:', error));
    }
    async register() {
        if (!await this.isTypeScriptRunning()) {
            return;
        }
        const languageContextService = this.languageContextService;
        const logService = this.logService;
        try {
            if (!await languageContextService.isActivated('typescript')) {
                return;
            }
            const copilotAPI = await this.getCopilotApi();
            if (copilotAPI === undefined) {
                logService.warn('Copilot API is undefined, unable to register context provider.');
                return;
            }
            if (this.registrations !== undefined) {
                this.registrations.dispose();
                this.registrations = undefined;
            }
            this.registrations = new lifecycle_1.DisposableStore();
            this.registrations.add(new CachePopulationTrigger(this.languageContextService, this));
            const telemetrySender = this.telemetrySender;
            const self = this;
            const resolver = {
                resolve(request, token) {
                    // console.log(`Resolve request ${Date.now()}`);
                    const isSpeculativeRequest = request.documentContext.proposedEdits !== undefined;
                    const [document, position] = self.getDocumentAndPosition(request, token);
                    if (document === undefined || position === undefined) {
                        return Promise.resolve([]);
                    }
                    const tokenBudget = self.getTokenBudget(document);
                    if (tokenBudget <= 0) {
                        telemetrySender.sendRequestTelemetry(document, position, { requestId: request.completionId, source: languageContextService_1.KnownSources.completion }, types_1.ContextItemSummary.DefaultExhausted, 0, undefined, undefined);
                        return Promise.resolve([]);
                    }
                    const context = {
                        requestId: request.completionId,
                        opportunityId: request.opportunityId,
                        timeBudget: request.timeBudget,
                        tokenBudget: tokenBudget,
                        source: request.source === 'nes' ? languageContextService_1.KnownSources.nes : languageContextService_1.KnownSources.completion,
                        trigger: languageContextService_1.TriggerKind.completion,
                        proposedEdits: isSpeculativeRequest ? [] : undefined,
                        sampleTelemetry: self.getSampleTelemetry(request.activeExperiments)
                    };
                    const items = languageContextService.getContext(document, position, context, token);
                    if (Array.isArray(items)) {
                        const convertedItems = [];
                        for (const item of items) {
                            const converted = self.convertItem(item);
                            if (converted === undefined) {
                                continue;
                            }
                            convertedItems.push(converted);
                        }
                        return Promise.resolve(convertedItems);
                    }
                    else if (typeof items[Symbol.asyncIterator] === 'function') {
                        return mapAsyncIterable(items, (item) => self.convertItem(item));
                    }
                    else if (items instanceof Promise) {
                        return items.then((resolvedItems) => {
                            const convertedItems = [];
                            for (const item of resolvedItems) {
                                const converted = self.convertItem(item);
                                if (converted === undefined) {
                                    continue;
                                }
                                convertedItems.push(converted);
                            }
                            return convertedItems;
                        });
                    }
                    else {
                        return Promise.resolve([]);
                    }
                }
            };
            if (typeof languageContextService.getContextOnTimeout === 'function') {
                resolver.resolveOnTimeout = (request) => {
                    if (typeof languageContextService.getContextOnTimeout !== 'function') {
                        return;
                    }
                    const [document, position] = self.getDocumentAndPosition(request);
                    if (document === undefined || position === undefined) {
                        return;
                    }
                    const context = {
                        requestId: request.completionId,
                        source: languageContextService_1.KnownSources.completion,
                    };
                    const items = languageContextService.getContextOnTimeout(document, position, context);
                    if (items === undefined) {
                        return;
                    }
                    const result = [];
                    for (const item of items) {
                        const converted = self.convertItem(item);
                        if (converted === undefined) {
                            continue;
                        }
                        result.push(converted);
                    }
                    return result;
                };
            }
            const provider = {
                id: 'typescript-ai-context-provider',
                selector: { scheme: 'file', language: 'typescript' },
                resolver: resolver
            };
            this.registrations.add(copilotAPI.registerContextProvider(provider));
            this.registrations.add(this.languageContextProviderService.registerContextProvider(provider));
            this.telemetrySender.sendInlineCompletionProviderTelemetry(languageContextService_1.KnownSources.completion, true);
            logService.info('Registered TypeScript context provider with Copilot inline completions.');
        }
        catch (error) {
            logService.error('Error checking if server plugin is installed:', error);
        }
    }
    async isTypeScriptRunning() {
        // Check that the TypeScript extension is installed and runs in the same extension host.
        const typeScriptExtension = vscode.extensions.getExtension('vscode.typescript-language-features');
        if (typeScriptExtension === undefined) {
            this.telemetrySender.sendActivationFailedTelemetry(ErrorLocation.Client, ErrorPart.TypescriptPlugin, 'TypeScript extension not found', undefined);
            this.logService.error('TypeScript extension not found');
            return false;
        }
        try {
            await typeScriptExtension.activate();
            return true;
        }
        catch (error) {
            if (error instanceof Error) {
                this.telemetrySender.sendActivationFailedTelemetry(ErrorLocation.Client, ErrorPart.TypescriptPlugin, error.message, error.stack);
                this.logService.error('Error checking if TypeScript plugin is installed:', error.message);
            }
            else {
                this.telemetrySender.sendActivationFailedTelemetry(ErrorLocation.Client, ErrorPart.TypescriptPlugin, 'Unknown error', undefined);
                this.logService.error('Error checking if TypeScript plugin is installed: Unknown error');
            }
            return false;
        }
    }
    getDocumentAndPosition(request, token) {
        let document;
        if (vscode.window.activeTextEditor?.document.uri.toString() === request.documentContext.uri) {
            document = vscode.window.activeTextEditor.document;
        }
        else {
            document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === request.documentContext.uri);
        }
        if (document === undefined) {
            this.telemetrySender.sendIntegrationTelemetry(request.completionId, request.documentContext.uri);
            return [undefined, undefined];
        }
        const requestPos = request.documentContext.position;
        const position = requestPos !== undefined ? new vscode.Position(requestPos.line, requestPos.character) : document.positionAt(request.documentContext.offset);
        if (document.version > request.documentContext.version) {
            if (!token?.isCancellationRequested) {
                this.telemetrySender.sendIntegrationTelemetry(request.completionId, request.documentContext.uri, `Version mismatch: ${document.version} !== ${request.documentContext.version}`);
            }
            return [undefined, undefined];
        }
        if (document.version < request.documentContext.version) {
            this.telemetrySender.sendIntegrationTelemetry(request.completionId, request.documentContext.uri, `Version mismatch: ${document.version} !== ${request.documentContext.version}`);
            return [undefined, undefined];
        }
        return [document, position];
    }
    convertItem(item) {
        if (item.kind === languageContextService_1.ContextKind.Snippet) {
            const converted = {
                importance: item.priority * 100,
                id: item.id,
                uri: item.uri.toString(),
                value: item.value
            };
            if (item.additionalUris !== undefined) {
                converted.additionalUris = item.additionalUris.map((uri) => uri.toString());
            }
            return converted;
        }
        else if (item.kind === languageContextService_1.ContextKind.Trait) {
            const converted = {
                importance: item.priority * 100,
                id: item.id,
                name: item.name,
                value: item.value
            };
            return converted;
        }
        return undefined;
    }
    async getCopilotApi() {
        const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
        if (copilotExtension === undefined) {
            this.telemetrySender.sendActivationFailedTelemetry(ErrorLocation.Client, ErrorPart.CopilotExtension, 'Copilot extension not found', undefined);
            this.logService.error('Copilot extension not found');
            return undefined;
        }
        try {
            const api = await copilotExtension.activate();
            return api.getContextProviderAPI('v1');
        }
        catch (error) {
            if (error instanceof Error) {
                this.telemetrySender.sendActivationFailedTelemetry(ErrorLocation.Client, ErrorPart.CopilotExtension, error.message, error.stack);
                this.logService.error('Error activating Copilot extension:', error.message);
            }
            else {
                this.telemetrySender.sendActivationFailedTelemetry(ErrorLocation.Client, ErrorPart.CopilotExtension, 'Unknown error', undefined);
                this.logService.error('Error activating Copilot extension: Unknown error.');
            }
            return undefined;
        }
    }
    unregister() {
        if (this.registrations !== undefined) {
            this.registrations.dispose();
            this.registrations = undefined;
        }
        this.telemetrySender.sendInlineCompletionProviderTelemetry(languageContextService_1.KnownSources.completion, false);
    }
    getConfig() {
        const expFlag = this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.TypeScriptLanguageContext, this.experimentationService);
        return expFlag === true ? 'on' : 'off';
    }
    getTokenBudget(document) {
        return Math.trunc((currentTokenBudget) - (document.getText().length / 4) - 256);
    }
    getSampleTelemetry(activeExperiments) {
        const value = activeExperiments.get('sampleTelemetry');
        if (value === undefined || value === null || value === false) {
            return 1;
        }
        if (value === true) {
            return 10;
        }
        if (typeof value === 'number') {
            return Math.max(1, Math.min(100, value));
        }
        return 1;
    }
};
exports.InlineCompletionContribution = InlineCompletionContribution;
exports.InlineCompletionContribution = InlineCompletionContribution = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, nullExperimentationService_1.IExperimentationService),
    __param(2, logService_1.ILogService),
    __param(3, telemetry_1.ITelemetryService),
    __param(4, languageContextService_1.ILanguageContextService),
    __param(5, languageContextProviderService_1.ILanguageContextProviderService)
], InlineCompletionContribution);
//# sourceMappingURL=languageContextService.js.map