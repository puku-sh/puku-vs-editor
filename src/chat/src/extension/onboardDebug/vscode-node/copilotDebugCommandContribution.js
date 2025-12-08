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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotDebugCommandContribution = exports.COPILOT_DEBUG_COMMAND = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const fs_1 = require("fs");
const net_1 = require("net");
const vscode = __importStar(require("vscode"));
const authentication_1 = require("../../../platform/authentication/common/authentication");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const gitExtensionService_1 = require("../../../platform/git/common/gitExtensionService");
const gitService_1 = require("../../../platform/git/common/gitService");
const githubService_1 = require("../../../platform/github/common/githubService");
const logService_1 = require("../../../platform/log/common/logService");
const tasksService_1 = require("../../../platform/tasks/common/tasksService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const terminalService_1 = require("../../../platform/terminal/common/terminalService");
const assert_1 = require("../../../util/vs/base/common/assert");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const path = __importStar(require("../../../util/vs/base/common/path"));
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const chatSessionsUriHandler_1 = require("../../chatSessions/vscode/chatSessionsUriHandler");
const constants_1 = require("../../common/constants");
const launchConfigService_1 = require("../common/launchConfigService");
const copilotDebugCommandSessionFactory_1 = require("../node/copilotDebugCommandSessionFactory");
const rpc_1 = require("../node/copilotDebugWorker/rpc");
const copilotDebugCommandHandle_1 = require("./copilotDebugCommandHandle");
const copilotDebugCommandSession_1 = require("./copilotDebugCommandSession");
//@ts-ignore
const copilotDebugWorker_ps1_1 = __importDefault(require("../node/copilotDebugWorker/copilotDebugWorker.ps1"));
// When enabled, holds the storage location of binaries for the PATH:
const WAS_REGISTERED_STORAGE_KEY = 'copilot-chat.terminalToDebugging.registered';
exports.COPILOT_DEBUG_COMMAND = `copilot-debug`;
const DEBUG_COMMAND_JS = 'copilotDebugCommand.js';
let CopilotDebugCommandContribution = class CopilotDebugCommandContribution extends lifecycle_1.Disposable {
    constructor(context, logService, instantiationService, configurationService, launchConfigService, authService, telemetryService, tasksService, terminalService, _octoKitService, _gitService, _gitExtensionService, fileSystemService) {
        super();
        this.context = context;
        this.logService = logService;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.launchConfigService = launchConfigService;
        this.authService = authService;
        this.telemetryService = telemetryService;
        this.tasksService = tasksService;
        this.terminalService = terminalService;
        this._octoKitService = _octoKitService;
        this._gitService = _gitService;
        this._gitExtensionService = _gitExtensionService;
        this.fileSystemService = fileSystemService;
        this._register(vscode.window.registerUriHandler(this));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(configurationService_1.ConfigKey.TerminalToDebuggerEnabled.fullyQualifiedId)) {
                this.registerSerializer = this.registerSerializer.then(() => this.registerEnvironment());
            }
        }));
        this._register(vscode.commands.registerCommand('puku.chat.startCopilotDebugCommand', async () => {
            const term = vscode.window.createTerminal();
            term.show(false);
            term.sendText('copilot-debug <your command here>', false);
        }));
        this.registerSerializer = this.registerEnvironment();
        // Initialize ChatSessionsUriHandler with extension context for storage
        this.chatSessionsUriHandler = new chatSessionsUriHandler_1.ChatSessionsUriHandler(this._octoKitService, this._gitService, this._gitExtensionService, this.context, this.logService, this.fileSystemService, this.telemetryService);
        // Check for pending chat sessions when this contribution is initialized
        this.chatSessionsUriHandler.openPendingSession().catch((err) => {
            this.logService.error('Failed to check for pending chat sessions from debug command contribution:', err);
        });
        const globPattern = new vscode.RelativePattern(this.context.globalStorageUri, '.pendingSession');
        const fileWatcher = vscode.workspace.createFileSystemWatcher(globPattern);
        this._register(fileWatcher);
        const pendingFileHandling = async () => {
            this.logService.info('Detected creation of pending session file from debug command contribution.');
            // A new pending session file was created, try to open it
            this.chatSessionsUriHandler.openPendingSession().catch((err) => {
                this.logService.error('Failed to open pending chat session after pending session file creation:', err);
            });
        };
        this._register(fileWatcher.onDidCreate(async () => {
            await pendingFileHandling();
        }));
        this._register(fileWatcher.onDidChange(async () => {
            await pendingFileHandling();
        }));
    }
    async ensureTask(workspaceFolder, def, handle) {
        if (!workspaceFolder) {
            handle.printLabel('red', (0, launchConfigService_1.needsWorkspaceFolderForTaskError)());
            return false;
        }
        if (this.tasksService.hasTask(workspaceFolder, def)) {
            return true;
        }
        handle.printJson(def);
        const run = await handle.confirm(l10n.t `The model indicates the above task should be run before debugging. Do you want to save+run it?`, true);
        if (!run) {
            return false;
        }
        // Configure the task to only show on errors to avoid taking focus away
        // from the terminal in this use case.
        def.presentation ??= {};
        def.presentation.reveal = 'silent';
        await this.tasksService.ensureTask(workspaceFolder, def);
        return true;
    }
    handleUri(uri) {
        if (this.chatSessionsUriHandler.canHandleUri(uri)) {
            return this.chatSessionsUriHandler.handleUri(uri);
        }
        const pipePath = process.platform === 'win32' ? '\\\\.\\pipe\\' + uri.path.slice(1) : uri.path;
        const cts = new cancellation_1.CancellationTokenSource();
        const queryParams = new URLSearchParams(uri.query);
        const referrer = queryParams.get('referrer');
        /* __GDPR__
            "uriHandler" : {
                "owner": "lramos15",
                "comment": "Reports when the uri handler is called in the copilot extension",
                "referrer": { "classification": "SystemMetaData", "purpose": "BusinessInsight", "comment": "The referrer query param for the uri" }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('uriHandler', {
            referrer: referrer || 'unknown',
        });
        const socket = (0, net_1.connect)(pipePath, () => {
            this.logService.info(`Got a debug connection on ${pipePath}`);
            const rpc = new rpc_1.SimpleRPC(socket);
            const handle = new copilotDebugCommandHandle_1.CopilotDebugCommandHandle(rpc);
            const { launchConfigService, authService } = this;
            const exit = (code, error) => handle.exit(code, error);
            const factory = this.instantiationService.createInstance(copilotDebugCommandSessionFactory_1.CopilotDebugCommandSessionFactory, {
                ensureTask: (wf, def) => this.ensureTask(wf || vscode.workspace.workspaceFolders?.[0].uri, def, handle),
                isGenerating: () => handle.printLabel('blue', l10n.t('Generating debug configuration...')),
                prompt: async (text, defaultValue) => handle.question(text, defaultValue).then(r => r || defaultValue),
            });
            rpc.registerMethod('start', async function start(opts) {
                if (!authService.copilotToken) {
                    await authService.getAnyGitHubSession({ createIfNone: true });
                }
                const result = await factory.start(opts, cts.token);
                switch (result.kind) {
                    case 0 /* StartResultKind.NoConfig */:
                        await handle.printLabel('red', l10n.t `Could not create a launch configuration: ${result.text}`);
                        await exit(1);
                        break;
                    case 1 /* StartResultKind.Ok */:
                        if (opts.printOnly) {
                            await handle.output('stdout', JSON.stringify(result.config, undefined, 2).replaceAll('\n', '\r\n'));
                            await exit(0);
                        }
                        else if (opts.save) {
                            handle.confirm(l10n.t('Configuration saved, debug now?'), true).then(debug => {
                                if (debug) {
                                    vscode.debug.startDebugging(result.folder && vscode.workspace.getWorkspaceFolder(result.folder), result.config);
                                }
                                exit(0);
                            });
                        }
                        else {
                            (0, copilotDebugCommandSession_1.handleDebugSession)(launchConfigService, result.folder && vscode.workspace.getWorkspaceFolder(result.folder), {
                                ...result.config,
                                internalConsoleOptions: 'neverOpen',
                            }, handle, opts.once, newOpts => start({ ...opts, ...newOpts }));
                        }
                        break;
                    case 3 /* StartResultKind.Cancelled */:
                        exit(1);
                        break;
                    case 2 /* StartResultKind.NeedExtension */:
                        handle.confirm(l10n.t `We generated a "${result.debugType}" debug configuration, but you don't have an extension installed for that. Do you want to look for one?`, true).then(search => {
                            if (search) {
                                vscode.commands.executeCommand('workbench.extensions.search', `@category:debuggers ${result.debugType}`);
                            }
                            exit(0);
                        });
                        break;
                    default:
                        (0, assert_1.assertNever)(result);
                }
            });
        });
        socket.on('error', e => {
            this.logService.error(`Error connecting to debug client on ${pipePath}: ${e}`);
            cts.dispose(true);
        });
        socket.on('end', () => {
            cts.dispose(true);
        });
    }
    getVersionNonce() {
        if (this.context.extensionMode !== vscode.ExtensionMode.Production) {
            return String(Date.now());
        }
        const extensionInfo = vscode.extensions.getExtension(constants_1.EXTENSION_ID);
        return (extensionInfo?.packageJSON.version ?? String(Date.now())) + '/' + vscode.env.remoteName;
    }
    async registerEnvironment() {
        const enabled = this.configurationService.getConfig(configurationService_1.ConfigKey.TerminalToDebuggerEnabled);
        const globalStorageUri = this.context.globalStorageUri;
        if (!globalStorageUri) {
            // globalStorageUri is not available in extension tests: see MockExtensionContext
            return;
        }
        const storageLocation = path.join(this.context.globalStorageUri.fsPath, 'debugCommand');
        const previouslyStoredAt = this.context.globalState.get(WAS_REGISTERED_STORAGE_KEY);
        const versionNonce = this.getVersionNonce();
        if (!enabled) {
            if (previouslyStoredAt) {
                // 1. disabling an enabled state
                this.terminalService.removePathContribution('copilot-debug');
                await fs_1.promises.rm(previouslyStoredAt.location, { recursive: true, force: true });
            }
        }
        else if (!previouslyStoredAt) {
            // 2. enabling a disabled state
            await this.fillStoragePath(storageLocation);
            this.terminalService.contributePath('copilot-debug', storageLocation, { command: exports.COPILOT_DEBUG_COMMAND });
        }
        else if (previouslyStoredAt.version !== versionNonce) {
            // 3. upgrading the worker
            await this.fillStoragePath(storageLocation);
            this.terminalService.contributePath('copilot-debug', storageLocation, { command: exports.COPILOT_DEBUG_COMMAND });
        }
        else if (enabled) {
            // 4. already enabled and up to date, just ensure PATH contribution
            this.terminalService.contributePath('copilot-debug', storageLocation, { command: exports.COPILOT_DEBUG_COMMAND });
        }
        this.context.globalState.update(WAS_REGISTERED_STORAGE_KEY, enabled ? {
            location: storageLocation,
            version: versionNonce,
        } : undefined);
    }
    async fillStoragePath(storagePath) {
        const callbackUri = vscode.Uri.from({
            scheme: vscode.env.uriScheme,
            authority: constants_1.EXTENSION_ID,
        });
        let remoteCommand = '';
        if (vscode.env.remoteName) {
            remoteCommand = (vscode.env.appName.includes('Insider') ? 'code-insiders' : 'code') + ' --openExternal ';
        }
        await fs_1.promises.mkdir(storagePath, { recursive: true });
        if (process.platform === 'win32') {
            const ps1Path = path.join(storagePath, `${exports.COPILOT_DEBUG_COMMAND}.ps1`);
            await fs_1.promises.writeFile(ps1Path, copilotDebugWorker_ps1_1.default
                .replaceAll('__CALLBACK_URL_PLACEHOLDER__', callbackUri)
                .replaceAll('__REMOTE_COMMAND_PLACEHOLDER__', remoteCommand));
            await fs_1.promises.writeFile(path.join(storagePath, `${exports.COPILOT_DEBUG_COMMAND}.bat`), makeBatScript(ps1Path));
        }
        else {
            const shPath = path.join(storagePath, exports.COPILOT_DEBUG_COMMAND);
            await fs_1.promises.writeFile(shPath, makeShellScript(remoteCommand, storagePath, callbackUri));
            await fs_1.promises.chmod(shPath, 0o750);
        }
        await fs_1.promises.copyFile(path.join(__dirname, DEBUG_COMMAND_JS), path.join(storagePath, DEBUG_COMMAND_JS));
    }
};
exports.CopilotDebugCommandContribution = CopilotDebugCommandContribution;
exports.CopilotDebugCommandContribution = CopilotDebugCommandContribution = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext),
    __param(1, logService_1.ILogService),
    __param(2, instantiation_1.IInstantiationService),
    __param(3, configurationService_1.IConfigurationService),
    __param(4, launchConfigService_1.ILaunchConfigService),
    __param(5, authentication_1.IAuthenticationService),
    __param(6, telemetry_1.ITelemetryService),
    __param(7, tasksService_1.ITasksService),
    __param(8, terminalService_1.ITerminalService),
    __param(9, githubService_1.IOctoKitService),
    __param(10, gitService_1.IGitService),
    __param(11, gitExtensionService_1.IGitExtensionService),
    __param(12, fileSystemService_1.IFileSystemService)
], CopilotDebugCommandContribution);
const makeShellScript = (remoteCommand, dir, callbackUri) => `#!/bin/sh
unset NODE_OPTIONS
ELECTRON_RUN_AS_NODE=1 "${process.execPath}" "${path.join(dir, DEBUG_COMMAND_JS)}" "${callbackUri}" "${remoteCommand}" "$@"`;
const makeBatScript = (ps1Path) => `@echo off
powershell -ExecutionPolicy Bypass -File "${ps1Path}" %*
`;
//# sourceMappingURL=copilotDebugCommandContribution.js.map