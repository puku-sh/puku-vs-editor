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
exports.CopilotCLITerminalIntegration = exports.ICopilotCLITerminalIntegration = void 0;
const fs_1 = require("fs");
const vscode_1 = require("vscode");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const envService_1 = require("../../../platform/env/common/envService");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const logService_1 = require("../../../platform/log/common/logService");
const terminalService_1 = require("../../../platform/terminal/common/terminalService");
const services_1 = require("../../../util/common/services");
const async_1 = require("../../../util/vs/base/common/async");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const path = __importStar(require("../../../util/vs/base/common/path"));
const pythonTerminalService_1 = require("./pythonTerminalService");
//@ts-ignore
const copilotCLIShim_ps1_1 = __importDefault(require("./copilotCLIShim.ps1"));
const COPILOT_CLI_SHIM_JS = 'copilotCLIShim.js';
const COPILOT_CLI_COMMAND = 'copilot';
exports.ICopilotCLITerminalIntegration = (0, services_1.createServiceIdentifier)('ICopilotCLITerminalIntegration');
let CopilotCLITerminalIntegration = class CopilotCLITerminalIntegration extends lifecycle_1.Disposable {
    constructor(context, _authenticationService, configurationService, terminalService, envService, logService) {
        super();
        this.context = context;
        this._authenticationService = _authenticationService;
        this.configurationService = configurationService;
        this.terminalService = terminalService;
        this.envService = envService;
        this.pythonTerminalService = new pythonTerminalService_1.PythonTerminalService(logService);
        this.initialization = this.initialize();
    }
    async initialize() {
        const enabled = this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.CopilotCLIEnabled);
        if (!enabled) {
            return;
        }
        const globalStorageUri = this.context.globalStorageUri;
        if (!globalStorageUri) {
            // globalStorageUri is not available in extension tests
            return;
        }
        const storageLocation = path.join(globalStorageUri.fsPath, 'copilotCli');
        this.terminalService.contributePath('copilot-cli', storageLocation, { command: COPILOT_CLI_COMMAND }, true);
        await fs_1.promises.mkdir(storageLocation, { recursive: true });
        if (process.platform === 'win32') {
            this.powershellScriptPath = path.join(storageLocation, `${COPILOT_CLI_COMMAND}.ps1`);
            await fs_1.promises.writeFile(this.powershellScriptPath, copilotCLIShim_ps1_1.default);
            const copilotPowershellScript = `@echo off
powershell -ExecutionPolicy Bypass -File "${this.powershellScriptPath}" %*
`;
            this.shellScriptPath = path.join(storageLocation, `${COPILOT_CLI_COMMAND}.bat`);
            await fs_1.promises.writeFile(this.shellScriptPath, copilotPowershellScript);
        }
        else {
            const copilotShellScript = `#!/bin/sh
unset NODE_OPTIONS
ELECTRON_RUN_AS_NODE=1 "${process.execPath}" "${path.join(storageLocation, COPILOT_CLI_SHIM_JS)}" "$@"`;
            await fs_1.promises.copyFile(path.join(__dirname, COPILOT_CLI_SHIM_JS), path.join(storageLocation, COPILOT_CLI_SHIM_JS));
            this.shellScriptPath = path.join(storageLocation, COPILOT_CLI_COMMAND);
            this.powershellScriptPath = path.join(storageLocation, `copilotCLIShim.ps1`);
            await fs_1.promises.writeFile(this.shellScriptPath, copilotShellScript);
            await fs_1.promises.writeFile(this.powershellScriptPath, copilotCLIShim_ps1_1.default);
            await fs_1.promises.chmod(this.shellScriptPath, 0o750);
        }
    }
    async openTerminal(name, cliArgs = []) {
        // Generate another set of shell args, but with --clear to clear the terminal before running the command.
        // We'd like to hide all of the custom shell commands we send to the terminal from the user.
        cliArgs.unshift('--clear');
        let [shellPathAndArgs] = await Promise.all([
            this.getShellInfo(cliArgs),
            this.initialization
        ]);
        const options = await getCommonTerminalOptions(name, this._authenticationService);
        if (shellPathAndArgs) {
            options.iconPath = shellPathAndArgs.iconPath ?? options.iconPath;
        }
        if (shellPathAndArgs && (shellPathAndArgs.shell !== 'powershell' && shellPathAndArgs.shell !== 'pwsh')) {
            const terminal = await this.pythonTerminalService.createTerminal(options);
            if (terminal) {
                this._register(terminal);
                const command = this.buildCommandForPythonTerminal(shellPathAndArgs?.copilotCommand, cliArgs, shellPathAndArgs);
                await this.sendCommandToTerminal(terminal, command, true, shellPathAndArgs);
                return;
            }
        }
        if (!shellPathAndArgs) {
            const terminal = this._register(this.terminalService.createTerminal(options));
            cliArgs.shift(); // Remove --clear as we can't run it without a shell integration
            const command = this.buildCommandForTerminal(terminal, COPILOT_CLI_COMMAND, cliArgs);
            await this.sendCommandToTerminal(terminal, command, false, shellPathAndArgs);
            return;
        }
        cliArgs.shift(); // Remove --clear as we are creating a new terminal with our own args.
        shellPathAndArgs = await this.getShellInfo(cliArgs);
        if (shellPathAndArgs) {
            options.shellPath = shellPathAndArgs.shellPath;
            options.shellArgs = shellPathAndArgs.shellArgs;
            const terminal = this._register(this.terminalService.createTerminal(options));
            terminal.show();
        }
    }
    buildCommandForPythonTerminal(copilotCommand, cliArgs, shellInfo) {
        let commandPrefix = '';
        if (shellInfo.shell === 'zsh' || shellInfo.shell === 'bash') {
            // Starting with empty space to hide from terminal history (only for bash and zsh which use &&)
            commandPrefix = ' ';
        }
        if (shellInfo.shell === 'powershell' || shellInfo.shell === 'pwsh') {
            // Run powershell script
            commandPrefix = '& ';
        }
        const exitCommand = shellInfo.exitCommand || '';
        return `${commandPrefix}${quoteArgsForShell(copilotCommand, [])} ${cliArgs.join(' ')} ${exitCommand}`;
    }
    buildCommandForTerminal(terminal, copilotCommand, cliArgs) {
        return `${quoteArgsForShell(copilotCommand, [])} ${cliArgs.join(' ')}`;
    }
    async sendCommandToTerminal(terminal, command, waitForPythonActivation, shellInfo = undefined) {
        // Wait for shell integration to be available
        const shellIntegrationTimeout = 3000;
        let shellIntegrationAvailable = terminal.shellIntegration ? true : false;
        const integrationPromise = shellIntegrationAvailable ? Promise.resolve() : new Promise((resolve) => {
            const disposable = this._register(this.terminalService.onDidChangeTerminalShellIntegration(e => {
                if (e.terminal === terminal && e.shellIntegration) {
                    shellIntegrationAvailable = true;
                    disposable.dispose();
                    resolve();
                }
            }));
            this._register((0, async_1.disposableTimeout)(() => {
                disposable.dispose();
                resolve();
            }, shellIntegrationTimeout));
        });
        await integrationPromise;
        if (waitForPythonActivation) {
            // Wait for python extension to send its initialization commands.
            // Else if we send too early, the copilot command might not get executed properly.
            // Activating powershell scripts can take longer, so wait a bit more.
            const delay = (shellInfo?.shell === 'powershell' || shellInfo?.shell === 'pwsh') ? 3000 : 1000;
            await new Promise(resolve => this._register((0, async_1.disposableTimeout)(resolve, delay))); // Wait a bit to ensure the terminal is ready
        }
        if (terminal.shellIntegration) {
            terminal.shellIntegration.executeCommand(command);
        }
        else {
            terminal.sendText(command);
        }
        terminal.show();
    }
    async getShellInfo(cliArgs) {
        const configPlatform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
        const defaultProfile = this.getDefaultShellProfile();
        if (!defaultProfile) {
            return;
        }
        const profiles = vscode_1.workspace.getConfiguration('terminal').get(`integrated.profiles.${configPlatform}`);
        const profile = profiles ? profiles[defaultProfile] : undefined;
        if (!profile) {
            return;
        }
        let iconPath = undefined;
        try {
            if (profile.icon) {
                iconPath = new vscode_1.ThemeIcon(profile.icon);
            }
        }
        catch {
            //
        }
        const shellArgs = Array.isArray(profile.args) ? profile.args : [];
        const paths = profile.path ? (Array.isArray(profile.path) ? profile.path : [profile.path]) : [];
        const shellPath = (await getFirstAvailablePath(paths)) || this.envService.shell;
        if (defaultProfile === 'zsh' && this.shellScriptPath) {
            return {
                shell: 'zsh',
                shellPath: shellPath || 'zsh',
                shellArgs: [`-ci${shellArgs.includes('-l') ? 'l' : ''}`, quoteArgsForShell(this.shellScriptPath, cliArgs)],
                iconPath,
                copilotCommand: this.shellScriptPath,
                exitCommand: `&& exit`
            };
        }
        else if (defaultProfile === 'bash' && this.shellScriptPath) {
            return {
                shell: 'bash',
                shellPath: shellPath || 'bash',
                shellArgs: [`-${shellArgs.includes('-l') ? 'l' : ''}ic`, quoteArgsForShell(this.shellScriptPath, cliArgs)],
                iconPath,
                copilotCommand: this.shellScriptPath,
                exitCommand: `&& exit`
            };
        }
        else if (defaultProfile === 'pwsh' && this.powershellScriptPath && configPlatform !== 'windows') {
            return {
                shell: 'pwsh',
                shellPath: shellPath || 'pwsh',
                shellArgs: ['-File', this.powershellScriptPath, ...cliArgs],
                iconPath,
                copilotCommand: this.powershellScriptPath,
                exitCommand: `&& exit`
            };
        }
        else if (defaultProfile === 'PowerShell' && this.powershellScriptPath && configPlatform === 'windows' && shellPath) {
            return {
                shell: 'powershell',
                shellPath,
                shellArgs: ['-File', this.powershellScriptPath, ...cliArgs],
                iconPath,
                copilotCommand: this.powershellScriptPath,
                exitCommand: `&& exit`
            };
        }
        else if (defaultProfile === 'Command Prompt' && this.shellScriptPath && configPlatform === 'windows') {
            return {
                shell: 'cmd',
                shellPath: shellPath || 'cmd.exe',
                shellArgs: ['/c', this.shellScriptPath, ...cliArgs],
                iconPath,
                copilotCommand: this.shellScriptPath,
                exitCommand: '&& exit'
            };
        }
    }
    getDefaultShellProfile() {
        const configPlatform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
        const defaultProfile = vscode_1.workspace.getConfiguration('terminal').get(`integrated.defaultProfile.${configPlatform}`);
        if (defaultProfile) {
            return defaultProfile === 'Windows PowerShell' ? 'PowerShell' : defaultProfile;
        }
        const shell = this.envService.shell;
        switch (configPlatform) {
            case 'osx':
            case 'linux': {
                return shell.includes('zsh') ? 'zsh' : shell.includes('bash') ? 'bash' : undefined;
            }
            case 'windows': {
                return shell.includes('pwsh') ? 'PowerShell' : shell.includes('powershell') ? 'PowerShell' : undefined;
            }
        }
    }
};
exports.CopilotCLITerminalIntegration = CopilotCLITerminalIntegration;
exports.CopilotCLITerminalIntegration = CopilotCLITerminalIntegration = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext),
    __param(1, authentication_1.IAuthenticationService),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, terminalService_1.ITerminalService),
    __param(4, envService_1.IEnvService),
    __param(5, logService_1.ILogService)
], CopilotCLITerminalIntegration);
function quoteArgsForShell(shellScript, args) {
    const escapeArg = (arg) => {
        // If argument contains spaces, quotes, or special characters, wrap in quotes and escape internal quotes
        if (/[\s"'$`\\|&;()<>]/.test(arg)) {
            return `"${arg.replace(/["\\]/g, '\\$&')}"`;
        }
        return arg;
    };
    const escapedArgs = args.map(escapeArg);
    return args.length ? `${escapeArg(shellScript)} ${escapedArgs.join(' ')}` : escapeArg(shellScript);
}
async function getCommonTerminalOptions(name, authenticationService) {
    const options = {
        name,
        iconPath: new vscode_1.ThemeIcon('terminal'),
        location: { viewColumn: vscode_1.ViewColumn.Active },
        hideFromUser: false
    };
    const session = await authenticationService.getAnyGitHubSession();
    if (session) {
        options.env = {
            // Old Token name for GitHub integrations (deprecate once the new variable has been adopted widely)
            GH_TOKEN: session.accessToken,
            // New Token name for Copilot
            COPILOT_GITHUB_TOKEN: session.accessToken
        };
    }
    return options;
}
const pathValidations = new Map();
async function getFirstAvailablePath(paths) {
    for (const p of paths) {
        // Sometimes we can have paths like `${env:HOME}\Systemycmd.exe` which need to be resolved
        const resolvedPath = resolveEnvVariables(p);
        if (pathValidations.get(resolvedPath) === true) {
            return resolvedPath;
        }
        if (pathValidations.get(resolvedPath) === false) {
            continue;
        }
        // Possible its just a command name without path
        if (path.basename(p) === p) {
            return p;
        }
        try {
            const stat = await fs_1.promises.stat(resolvedPath);
            if (stat.isFile()) {
                pathValidations.set(resolvedPath, true);
                return resolvedPath;
            }
            pathValidations.set(resolvedPath, false);
        }
        catch {
            // Ignore errors and continue checking other paths
            pathValidations.set(resolvedPath, false);
        }
    }
    return undefined;
}
function resolveEnvVariables(value) {
    return value.replace(/\$\{env:([^}]+)\}/g, (match, envVarName) => {
        const envValue = process.env[envVarName];
        return envValue !== undefined ? envValue : match;
    });
}
//# sourceMappingURL=copilotCLITerminalIntegration.js.map