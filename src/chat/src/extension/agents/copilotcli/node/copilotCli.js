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
exports.CopilotCLISDK = exports.CopilotCLIModels = exports.ICopilotCLIModels = exports.ICopilotCLISDK = exports.CopilotCLISessionOptions = void 0;
exports.getAuthInfo = getAuthInfo;
const envService_1 = require("../../../../platform/env/common/envService");
const extensionContext_1 = require("../../../../platform/extContext/common/extensionContext");
const logService_1 = require("../../../../platform/log/common/logService");
const services_1 = require("../../../../util/common/services");
const lazy_1 = require("../../../../util/vs/base/common/lazy");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const logger_1 = require("./logger");
const nodePtyShim_1 = require("./nodePtyShim");
const COPILOT_CLI_MODEL_MEMENTO_KEY = 'puku.cli.sessionModel';
const DEFAULT_CLI_MODEL = 'claude-sonnet-4';
class CopilotCLISessionOptions {
    constructor(options, logger) {
        this.isolationEnabled = !!options.isolationEnabled;
        this.workingDirectory = options.workingDirectory;
        this.model = options.model;
        this.mcpServers = options.mcpServers;
        this.logger = (0, logger_1.getCopilotLogger)(logger);
        this.requestPermissionRejected = async (permission) => {
            logger.info(`[CopilotCLISession] Permission request denied for permission as no handler was set: ${permission.kind}`);
            return {
                kind: "denied-interactively-by-user"
            };
        };
        this.requestPermissionHandler = this.requestPermissionRejected;
    }
    addPermissionHandler(handler) {
        this.requestPermissionHandler = handler;
        return (0, lifecycle_1.toDisposable)(() => {
            if (this.requestPermissionHandler === handler) {
                this.requestPermissionHandler = this.requestPermissionRejected;
            }
        });
    }
    toSessionOptions() {
        const allOptions = {
            env: {
                ...process.env,
                COPILOTCLI_DISABLE_NONESSENTIAL_TRAFFIC: '1'
            },
            logger: this.logger,
            requestPermission: async (request) => {
                return await this.requestPermissionHandler(request);
            }
        };
        if (this.workingDirectory) {
            allOptions.workingDirectory = this.workingDirectory;
        }
        if (this.model) {
            allOptions.model = this.model;
        }
        if (this.mcpServers && Object.keys(this.mcpServers).length > 0) {
            allOptions.mcpServers = this.mcpServers;
        }
        return allOptions;
    }
}
exports.CopilotCLISessionOptions = CopilotCLISessionOptions;
exports.ICopilotCLISDK = (0, services_1.createServiceIdentifier)('ICopilotCLISDK');
exports.ICopilotCLIModels = (0, services_1.createServiceIdentifier)('ICopilotCLIModels');
let CopilotCLIModels = class CopilotCLIModels {
    constructor(copilotCLISDK, extensionContext) {
        this.copilotCLISDK = copilotCLISDK;
        this.extensionContext = extensionContext;
        this._availableModels = new lazy_1.Lazy(() => this._getAvailableModels());
    }
    toModelProvider(modelId) {
        return modelId;
    }
    async getDefaultModel() {
        // We control this
        const models = await this.getAvailableModels();
        const defaultModel = models.find(m => m.id.toLowerCase() === DEFAULT_CLI_MODEL.toLowerCase()) ?? models[0];
        const preferredModelId = this.extensionContext.globalState.get(COPILOT_CLI_MODEL_MEMENTO_KEY, defaultModel.id);
        return models.find(m => m.id === preferredModelId) ?? defaultModel;
    }
    async setDefaultModel(model) {
        await this.extensionContext.globalState.update(COPILOT_CLI_MODEL_MEMENTO_KEY, model.id);
    }
    async getAvailableModels() {
        // No need to query sdk multiple times, cache the result, this cannot change during a vscode session.
        return this._availableModels.value;
    }
    async _getAvailableModels() {
        const { getAvailableModels } = await this.copilotCLISDK.getPackage();
        const models = await getAvailableModels();
        return models.map(model => ({
            id: model.model,
            name: model.label
        }));
    }
};
exports.CopilotCLIModels = CopilotCLIModels;
exports.CopilotCLIModels = CopilotCLIModels = __decorate([
    __param(0, exports.ICopilotCLISDK),
    __param(1, extensionContext_1.IVSCodeExtensionContext)
], CopilotCLIModels);
let CopilotCLISDK = class CopilotCLISDK {
    constructor(extensionContext, envService, logService) {
        this.extensionContext = extensionContext;
        this.envService = envService;
        this.logService = logService;
    }
    async getPackage() {
        try {
            // Ensure the node-pty shim exists before importing the SDK (required for CLI sessions)
            await this.ensureNodePtyShim();
            return await Promise.resolve().then(() => __importStar(require('@github/copilot/sdk')));
        }
        catch (error) {
            this.logService.error(`[CopilotCLISession] Failed to load @github/copilot/sdk: ${error}`);
            throw error;
        }
    }
    async ensureNodePtyShim() {
        await (0, nodePtyShim_1.ensureNodePtyShim)(this.extensionContext.extensionPath, this.envService.appRoot, this.logService);
    }
};
exports.CopilotCLISDK = CopilotCLISDK;
exports.CopilotCLISDK = CopilotCLISDK = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext),
    __param(1, envService_1.IEnvService),
    __param(2, logService_1.ILogService)
], CopilotCLISDK);
async function getAuthInfo(authentService) {
    const copilotToken = await authentService.getAnyGitHubSession();
    return {
        type: 'token',
        token: copilotToken?.accessToken ?? '',
        host: 'https://github.com'
    };
}
//# sourceMappingURL=copilotCli.js.map