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
var McpSetupCommands_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpSetupCommands = void 0;
const vscode = __importStar(require("vscode"));
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const crypto_1 = require("../../../util/common/crypto");
const markdown_1 = require("../../../util/common/markdown");
const arraysFind_1 = require("../../../util/vs/base/common/arraysFind");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const objects_1 = require("../../../util/vs/base/common/objects");
const stopwatch_1 = require("../../../util/vs/base/common/stopwatch");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const nls_1 = require("../../../util/vs/nls");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const conversation_1 = require("../../prompt/common/conversation");
const mcpToolCallingLoop_1 = require("./mcpToolCallingLoop");
const mcpToolCallingTools_1 = require("./mcpToolCallingTools");
const nuget_1 = require("./nuget");
let McpSetupCommands = McpSetupCommands_1 = class McpSetupCommands extends lifecycle_1.Disposable {
    constructor(telemetryService, logService, fetcherService, instantiationService) {
        super();
        this.telemetryService = telemetryService;
        this.logService = logService;
        this.fetcherService = fetcherService;
        this.instantiationService = instantiationService;
        this._register((0, lifecycle_1.toDisposable)(() => this.pendingSetup?.cts.dispose(true)));
        this._register(vscode.commands.registerCommand('puku.chat.mcp.setup.flow', async (args) => {
            let finalState = "Failed" /* FlowFinalState.Failed */;
            let result;
            try {
                // allow case-insensitive comparison
                if (this.pendingSetup?.pendingArgs.name.toUpperCase() !== args.name.toUpperCase()) {
                    finalState = "NameMismatch" /* FlowFinalState.NameMismatch */;
                    vscode.window.showErrorMessage((0, nls_1.localize)("mcp.setup.nameMismatch", "Failed to generate MCP server configuration with a matching package name. Expected '{0}' but got '{1}' from generated configuration.", args.name, this.pendingSetup?.pendingArgs.name));
                    return undefined;
                }
                this.pendingSetup.canPrompt.complete(undefined);
                result = await this.pendingSetup.done;
                finalState = "Done" /* FlowFinalState.Done */;
                return result;
            }
            finally {
                /* __GDPR__
                    "mcp.setup.flow" : {
                        "owner": "joelverhagen",
                        "comment": "Reports the result of the agent-assisted MCP server installation",
                        "finalState": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The final state of the installation (e.g., 'Done', 'Failed')" },
                        "configurationType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Generic configuration typed produced by the installation" },
                        "packageType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Package type (e.g., npm)" },
                        "packageName": { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight", "comment": "Package name used for installation" },
                        "packageVersion": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Package version" },
                        "durationMs": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Duration of the installation process in milliseconds" }
                    }
                */
                this.telemetryService.sendMSFTTelemetryEvent('mcp.setup.flow', {
                    finalState: finalState,
                    configurationType: result?.type,
                    packageType: this.pendingSetup?.validateArgs.type,
                    packageName: await this.lowerHash(this.pendingSetup?.pendingArgs.name || args.name),
                    packageVersion: this.pendingSetup?.pendingArgs.version,
                }, {
                    durationMs: this.pendingSetup?.stopwatch.elapsed() ?? -1
                });
            }
        }));
        this._register(vscode.commands.registerCommand('puku.chat.mcp.setup.validatePackage', async (args) => {
            const sw = new stopwatch_1.StopWatch();
            const result = await McpSetupCommands_1.validatePackageRegistry(args, this.logService, this.fetcherService);
            if (result.state === 'ok') {
                this.enqueuePendingSetup(args, result, sw);
            }
            /* __GDPR__
                "mcp.setup.validatePackage" : {
                    "owner": "joelverhagen",
                    "comment": "Reports success or failure of agent-assisted MCP server validation step",
                    "state": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Validation state of the package" },
                    "packageType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Package type (e.g., npm)" },
                    "packageName": { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight", "comment": "Package name used for installation" },
                    "packageVersion": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Package version" },
                    "errorType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Generic type of error encountered during validation" },
                    "durationMs": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Duration of the validation process in milliseconds" }
                }
            */
            this.telemetryService.sendMSFTTelemetryEvent('mcp.setup.validatePackage', result.state === 'ok' ?
                {
                    state: result.state,
                    packageType: args.type,
                    packageName: await this.lowerHash(result.name || args.name),
                    packageVersion: result.version
                } :
                {
                    state: result.state,
                    packageType: args.type,
                    packageName: await this.lowerHash(args.name),
                    errorType: result.errorType
                }, { durationMs: sw.elapsed() });
            // return the minimal result to avoid leaking implementation details
            // not all package information is needed to request consent to install the package
            return result.state === 'ok' ?
                { state: 'ok', publisher: result.publisher, name: result.name, version: result.version } :
                { state: 'error', error: result.error, helpUri: result.helpUri, helpUriLabel: result.helpUriLabel, errorType: result.errorType };
        }));
        this._register(vscode.commands.registerCommand('puku.chat.mcp.setup.check', () => {
            return 1;
        }));
    }
    async lowerHash(input) {
        return input ? await (0, crypto_1.createSha256Hash)(input.toLowerCase()) : undefined;
    }
    async enqueuePendingSetup(validateArgs, pendingArgs, sw) {
        const cts = new cancellation_1.CancellationTokenSource();
        const canPrompt = new async_1.DeferredPromise();
        const pickRef = new mcpToolCallingTools_1.McpPickRef((0, async_1.raceCancellation)(canPrompt.p, cts.token));
        // we start doing the prompt in the background so the first call is speedy
        const done = (async () => {
            // if the package has a server manifest, we can fetch it and use it instead of a tool loop
            if (pendingArgs.getMcpServer) {
                let mcpServer;
                try {
                    mcpServer = await pendingArgs.getMcpServer(canPrompt.p);
                }
                catch (error) {
                    this.logService.warn(`Unable to fetch MCP server configuration for ${validateArgs.type} package ${pendingArgs.name}@${pendingArgs.version}. Configuration will be generated from the package README.
Error: ${error}`);
                }
                if (mcpServer) {
                    return {
                        type: "mapped",
                        name: pendingArgs.name,
                        server: mcpServer.config,
                        inputs: mcpServer.inputs
                    };
                }
            }
            const fakePrompt = `Generate an MCP configuration for ${validateArgs.name}`;
            const mcpLoop = this.instantiationService.createInstance(mcpToolCallingLoop_1.McpToolCallingLoop, {
                toolCallLimit: 100, // limited via `getAvailableTools` in the loop
                conversation: new conversation_1.Conversation((0, uuid_1.generateUuid)(), [new conversation_1.Turn(undefined, { type: 'user', message: fakePrompt })]),
                request: {
                    attempt: 0,
                    enableCommandDetection: false,
                    isParticipantDetected: false,
                    location: vscodeTypes_1.ChatLocation.Panel,
                    command: undefined,
                    location2: undefined,
                    // note: this is not used, model is hardcoded in the McpToolCallingLoop
                    model: (await vscode.lm.selectChatModels())[0],
                    prompt: fakePrompt,
                    references: [],
                    toolInvocationToken: (0, uuid_1.generateUuid)(),
                    toolReferences: [],
                    tools: new Map(),
                    id: '1',
                    sessionId: ''
                },
                props: {
                    targetSchema: validateArgs.targetConfig,
                    packageName: pendingArgs.name, // prefer the resolved name, not the input
                    packageVersion: pendingArgs.version,
                    packageType: validateArgs.type,
                    pickRef,
                    packageReadme: pendingArgs.readme || '<empty>',
                },
            });
            const toolCallLoopResult = await mcpLoop.run(undefined, cts.token);
            if (toolCallLoopResult.response.type !== commonTypes_1.ChatFetchResponseType.Success) {
                vscode.window.showErrorMessage((0, nls_1.localize)("mcp.setup.failed", "Failed to generate MCP configuration for {0}: {1}", validateArgs.name, toolCallLoopResult.response.reason));
                return undefined;
            }
            const { name, ...server } = (0, arraysFind_1.mapFindFirst)((0, markdown_1.extractCodeBlocks)(toolCallLoopResult.response.value), block => {
                try {
                    const j = JSON.parse(block.code);
                    // Unwrap if the model returns `mcpServers` in a wrapper object
                    if (j && typeof j === 'object' && j.hasOwnProperty('mcpServers')) {
                        const [name, obj] = Object.entries(j.mcpServers)[0];
                        return { ...obj, name };
                    }
                    return j;
                }
                catch {
                    return undefined;
                }
            });
            const inputs = [];
            let inputValues;
            const extracted = (0, objects_1.cloneAndChange)(server, value => {
                if (typeof value === 'string') {
                    const fromInput = pickRef.picks.find(p => p.choice === value);
                    if (fromInput) {
                        inputs.push({ id: fromInput.id, type: 'promptString', description: fromInput.title });
                        inputValues ??= {};
                        const replacement = '${input:' + fromInput.id + '}';
                        inputValues[replacement] = value;
                        return replacement;
                    }
                }
            });
            return { type: "assisted", name, server: extracted, inputs, inputValues };
        })().finally(() => {
            cts.dispose();
            pickRef.dispose();
        });
        this.pendingSetup?.cts.dispose(true);
        this.pendingSetup = { cts, canPrompt, done, validateArgs, pendingArgs, stopwatch: sw };
    }
    static async validatePackageRegistry(args, logService, fetcherService) {
        try {
            if (args.type === 'npm') {
                const response = await fetcherService.fetch(`https://registry.npmjs.org/${encodeURIComponent(args.name)}`, { method: 'GET' });
                if (!response.ok) {
                    return { state: 'error', errorType: "NotFound" /* ValidatePackageErrorType.NotFound */, error: (0, nls_1.localize)("mcp.setup.npmPackageNotFound", "Package {0} not found in npm registry", args.name) };
                }
                const data = await response.json();
                const version = data['dist-tags']?.latest;
                return {
                    state: 'ok',
                    publisher: data.maintainers?.[0]?.name || 'unknown',
                    name: args.name,
                    version,
                    readme: data.readme,
                };
            }
            else if (args.type === 'pip') {
                const response = await fetcherService.fetch(`https://pypi.org/pypi/${encodeURIComponent(args.name)}/json`, { method: 'GET' });
                if (!response.ok) {
                    return { state: 'error', errorType: "NotFound" /* ValidatePackageErrorType.NotFound */, error: (0, nls_1.localize)("mcp.setup.pythonPackageNotFound", "Package {0} not found in PyPI registry", args.name) };
                }
                const data = await response.json();
                const publisher = data.info?.author || data.info?.author_email || 'unknown';
                const name = data.info?.name || args.name;
                const version = data.info?.version;
                return {
                    state: 'ok',
                    publisher,
                    name,
                    version,
                    readme: data.info?.description
                };
            }
            else if (args.type === 'nuget') {
                const nuGetMcpSetup = new nuget_1.NuGetMcpSetup(logService, fetcherService);
                return await nuGetMcpSetup.getNuGetPackageMetadata(args.name);
            }
            else if (args.type === 'docker') {
                // Docker Hub API uses namespace/repository format
                // Handle both formats: 'namespace/repository' or just 'repository' (assumes 'library/' namespace)
                const [namespace, repository] = args.name.includes('/')
                    ? args.name.split('/', 2)
                    : ['library', args.name];
                const response = await fetcherService.fetch(`https://hub.docker.com/v2/repositories/${encodeURIComponent(namespace)}/${encodeURIComponent(repository)}`, { method: 'GET' });
                if (!response.ok) {
                    return { state: 'error', errorType: "NotFound" /* ValidatePackageErrorType.NotFound */, error: (0, nls_1.localize)("mcp.setup.dockerRepositoryNotFound", "Docker image {0} not found in Docker Hub registry", args.name) };
                }
                const data = await response.json();
                return {
                    state: 'ok',
                    publisher: data.namespace || data.user || 'unknown',
                    name: args.name,
                    readme: data.full_description || data.description,
                };
            }
            return { state: 'error', error: (0, nls_1.localize)("mcp.setup.unknownPackageType", "Unsupported package type: {0}", args.type), errorType: "UnknownPackageType" /* ValidatePackageErrorType.UnknownPackageType */ };
        }
        catch (error) {
            return { state: 'error', error: (0, nls_1.localize)("mcp.setup.errorQueryingPackage", "Error querying package: {0}", error.message), errorType: "UnhandledError" /* ValidatePackageErrorType.UnhandledError */ };
        }
    }
};
exports.McpSetupCommands = McpSetupCommands;
exports.McpSetupCommands = McpSetupCommands = McpSetupCommands_1 = __decorate([
    __param(0, telemetry_1.ITelemetryService),
    __param(1, logService_1.ILogService),
    __param(2, fetcherService_1.IFetcherService),
    __param(3, instantiation_1.IInstantiationService)
], McpSetupCommands);
//# sourceMappingURL=commands.js.map