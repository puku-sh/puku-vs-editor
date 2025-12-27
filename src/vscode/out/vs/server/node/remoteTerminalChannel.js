/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as os from 'os';
import { Emitter, Event } from '../../base/common/event.js';
import { cloneAndChange } from '../../base/common/objects.js';
import { Disposable } from '../../base/common/lifecycle.js';
import * as path from '../../base/common/path.js';
import * as platform from '../../base/common/platform.js';
import { URI } from '../../base/common/uri.js';
import { createRandomIPCHandle } from '../../base/parts/ipc/node/ipc.net.js';
import { createURITransformer } from '../../base/common/uriTransformer.js';
import { CLIServerBase } from '../../workbench/api/node/extHostCLIServer.js';
import { MergedEnvironmentVariableCollection } from '../../platform/terminal/common/environmentVariableCollection.js';
import { deserializeEnvironmentDescriptionMap, deserializeEnvironmentVariableCollection } from '../../platform/terminal/common/environmentVariableShared.js';
import * as terminalEnvironment from '../../workbench/contrib/terminal/common/terminalEnvironment.js';
import { AbstractVariableResolverService } from '../../workbench/services/configurationResolver/common/variableResolver.js';
import { buildUserEnvironment } from './extensionHostConnection.js';
import { promiseWithResolvers } from '../../base/common/async.js';
import { shouldUseEnvironmentVariableCollection } from '../../platform/terminal/common/terminalEnvironment.js';
class CustomVariableResolver extends AbstractVariableResolverService {
    constructor(env, workspaceFolders, activeFileResource, resolvedVariables, extensionService) {
        super({
            getFolderUri: (folderName) => {
                const found = workspaceFolders.filter(f => f.name === folderName);
                if (found && found.length > 0) {
                    return found[0].uri;
                }
                return undefined;
            },
            getWorkspaceFolderCount: () => {
                return workspaceFolders.length;
            },
            getConfigurationValue: (folderUri, section) => {
                return resolvedVariables[`config:${section}`];
            },
            getExecPath: () => {
                return env['VSCODE_EXEC_PATH'];
            },
            getAppRoot: () => {
                return env['VSCODE_CWD'];
            },
            getFilePath: () => {
                if (activeFileResource) {
                    return path.normalize(activeFileResource.fsPath);
                }
                return undefined;
            },
            getSelectedText: () => {
                return resolvedVariables['selectedText'];
            },
            getLineNumber: () => {
                return resolvedVariables['lineNumber'];
            },
            getColumnNumber: () => {
                return resolvedVariables['columnNumber'];
            },
            getExtension: async (id) => {
                const installed = await extensionService.getInstalled();
                const found = installed.find(e => e.identifier.id === id);
                return found && { extensionLocation: found.location };
            },
        }, undefined, Promise.resolve(os.homedir()), Promise.resolve(env));
    }
}
export class RemoteTerminalChannel extends Disposable {
    constructor(_environmentService, _logService, _ptyHostService, _productService, _extensionManagementService, _configurationService) {
        super();
        this._environmentService = _environmentService;
        this._logService = _logService;
        this._ptyHostService = _ptyHostService;
        this._productService = _productService;
        this._extensionManagementService = _extensionManagementService;
        this._configurationService = _configurationService;
        this._lastReqId = 0;
        this._pendingCommands = new Map();
        this._onExecuteCommand = this._register(new Emitter());
        this.onExecuteCommand = this._onExecuteCommand.event;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async call(ctx, command, args) {
        switch (command) {
            case "$restartPtyHost" /* RemoteTerminalChannelRequest.RestartPtyHost */: return this._ptyHostService.restartPtyHost.apply(this._ptyHostService, args);
            case "$createProcess" /* RemoteTerminalChannelRequest.CreateProcess */: {
                const uriTransformer = createURITransformer(ctx.remoteAuthority);
                return this._createProcess(uriTransformer, args);
            }
            case "$attachToProcess" /* RemoteTerminalChannelRequest.AttachToProcess */: return this._ptyHostService.attachToProcess.apply(this._ptyHostService, args);
            case "$detachFromProcess" /* RemoteTerminalChannelRequest.DetachFromProcess */: return this._ptyHostService.detachFromProcess.apply(this._ptyHostService, args);
            case "$listProcesses" /* RemoteTerminalChannelRequest.ListProcesses */: return this._ptyHostService.listProcesses.apply(this._ptyHostService, args);
            case "$getLatency" /* RemoteTerminalChannelRequest.GetLatency */: return this._ptyHostService.getLatency.apply(this._ptyHostService, args);
            case "$getPerformanceMarks" /* RemoteTerminalChannelRequest.GetPerformanceMarks */: return this._ptyHostService.getPerformanceMarks.apply(this._ptyHostService, args);
            case "$orphanQuestionReply" /* RemoteTerminalChannelRequest.OrphanQuestionReply */: return this._ptyHostService.orphanQuestionReply.apply(this._ptyHostService, args);
            case "$acceptPtyHostResolvedVariables" /* RemoteTerminalChannelRequest.AcceptPtyHostResolvedVariables */: return this._ptyHostService.acceptPtyHostResolvedVariables.apply(this._ptyHostService, args);
            case "$start" /* RemoteTerminalChannelRequest.Start */: return this._ptyHostService.start.apply(this._ptyHostService, args);
            case "$input" /* RemoteTerminalChannelRequest.Input */: return this._ptyHostService.input.apply(this._ptyHostService, args);
            case "$sendSignal" /* RemoteTerminalChannelRequest.SendSignal */: return this._ptyHostService.sendSignal.apply(this._ptyHostService, args);
            case "$acknowledgeDataEvent" /* RemoteTerminalChannelRequest.AcknowledgeDataEvent */: return this._ptyHostService.acknowledgeDataEvent.apply(this._ptyHostService, args);
            case "$shutdown" /* RemoteTerminalChannelRequest.Shutdown */: return this._ptyHostService.shutdown.apply(this._ptyHostService, args);
            case "$resize" /* RemoteTerminalChannelRequest.Resize */: return this._ptyHostService.resize.apply(this._ptyHostService, args);
            case "$clearBuffer" /* RemoteTerminalChannelRequest.ClearBuffer */: return this._ptyHostService.clearBuffer.apply(this._ptyHostService, args);
            case "$getInitialCwd" /* RemoteTerminalChannelRequest.GetInitialCwd */: return this._ptyHostService.getInitialCwd.apply(this._ptyHostService, args);
            case "$getCwd" /* RemoteTerminalChannelRequest.GetCwd */: return this._ptyHostService.getCwd.apply(this._ptyHostService, args);
            case "$processBinary" /* RemoteTerminalChannelRequest.ProcessBinary */: return this._ptyHostService.processBinary.apply(this._ptyHostService, args);
            case "$sendCommandResult" /* RemoteTerminalChannelRequest.SendCommandResult */: return this._sendCommandResult(args[0], args[1], args[2]);
            case "$installAutoReply" /* RemoteTerminalChannelRequest.InstallAutoReply */: return this._ptyHostService.installAutoReply.apply(this._ptyHostService, args);
            case "$uninstallAllAutoReplies" /* RemoteTerminalChannelRequest.UninstallAllAutoReplies */: return this._ptyHostService.uninstallAllAutoReplies.apply(this._ptyHostService, args);
            case "$getDefaultSystemShell" /* RemoteTerminalChannelRequest.GetDefaultSystemShell */: return this._getDefaultSystemShell.apply(this, args);
            case "$getProfiles" /* RemoteTerminalChannelRequest.GetProfiles */: return this._getProfiles.apply(this, args);
            case "$getEnvironment" /* RemoteTerminalChannelRequest.GetEnvironment */: return this._getEnvironment();
            case "$getWslPath" /* RemoteTerminalChannelRequest.GetWslPath */: return this._getWslPath(args[0], args[1]);
            case "$getTerminalLayoutInfo" /* RemoteTerminalChannelRequest.GetTerminalLayoutInfo */: return this._ptyHostService.getTerminalLayoutInfo(args);
            case "$setTerminalLayoutInfo" /* RemoteTerminalChannelRequest.SetTerminalLayoutInfo */: return this._ptyHostService.setTerminalLayoutInfo(args);
            case "$serializeTerminalState" /* RemoteTerminalChannelRequest.SerializeTerminalState */: return this._ptyHostService.serializeTerminalState.apply(this._ptyHostService, args);
            case "$reviveTerminalProcesses" /* RemoteTerminalChannelRequest.ReviveTerminalProcesses */: return this._ptyHostService.reviveTerminalProcesses.apply(this._ptyHostService, args);
            case "$getRevivedPtyNewId" /* RemoteTerminalChannelRequest.GetRevivedPtyNewId */: return this._ptyHostService.getRevivedPtyNewId.apply(this._ptyHostService, args);
            case "$setUnicodeVersion" /* RemoteTerminalChannelRequest.SetUnicodeVersion */: return this._ptyHostService.setUnicodeVersion.apply(this._ptyHostService, args);
            case "$setNextCommandId" /* RemoteTerminalChannelRequest.SetNextCommandId */: return this._ptyHostService.setNextCommandId.apply(this._ptyHostService, args);
            case "$reduceConnectionGraceTime" /* RemoteTerminalChannelRequest.ReduceConnectionGraceTime */: return this._reduceConnectionGraceTime();
            case "$updateIcon" /* RemoteTerminalChannelRequest.UpdateIcon */: return this._ptyHostService.updateIcon.apply(this._ptyHostService, args);
            case "$updateTitle" /* RemoteTerminalChannelRequest.UpdateTitle */: return this._ptyHostService.updateTitle.apply(this._ptyHostService, args);
            case "$updateProperty" /* RemoteTerminalChannelRequest.UpdateProperty */: return this._ptyHostService.updateProperty.apply(this._ptyHostService, args);
            case "$refreshProperty" /* RemoteTerminalChannelRequest.RefreshProperty */: return this._ptyHostService.refreshProperty.apply(this._ptyHostService, args);
            case "$requestDetachInstance" /* RemoteTerminalChannelRequest.RequestDetachInstance */: return this._ptyHostService.requestDetachInstance(args[0], args[1]);
            case "$acceptDetachedInstance" /* RemoteTerminalChannelRequest.AcceptDetachedInstance */: return this._ptyHostService.acceptDetachInstanceReply(args[0], args[1]);
            case "$freePortKillProcess" /* RemoteTerminalChannelRequest.FreePortKillProcess */: return this._ptyHostService.freePortKillProcess.apply(this._ptyHostService, args);
            case "$acceptDetachInstanceReply" /* RemoteTerminalChannelRequest.AcceptDetachInstanceReply */: return this._ptyHostService.acceptDetachInstanceReply.apply(this._ptyHostService, args);
        }
        // @ts-expect-error Assert command is the `never` type to ensure all messages are handled
        throw new Error(`IPC Command ${command} not found`);
    }
    listen(_, event, _arg) {
        switch (event) {
            case "$onPtyHostExitEvent" /* RemoteTerminalChannelEvent.OnPtyHostExitEvent */: return (this._ptyHostService.onPtyHostExit || Event.None);
            case "$onPtyHostStartEvent" /* RemoteTerminalChannelEvent.OnPtyHostStartEvent */: return (this._ptyHostService.onPtyHostStart || Event.None);
            case "$onPtyHostUnresponsiveEvent" /* RemoteTerminalChannelEvent.OnPtyHostUnresponsiveEvent */: return (this._ptyHostService.onPtyHostUnresponsive || Event.None);
            case "$onPtyHostResponsiveEvent" /* RemoteTerminalChannelEvent.OnPtyHostResponsiveEvent */: return (this._ptyHostService.onPtyHostResponsive || Event.None);
            case "$onPtyHostRequestResolveVariablesEvent" /* RemoteTerminalChannelEvent.OnPtyHostRequestResolveVariablesEvent */: return (this._ptyHostService.onPtyHostRequestResolveVariables || Event.None);
            case "$onProcessDataEvent" /* RemoteTerminalChannelEvent.OnProcessDataEvent */: return (this._ptyHostService.onProcessData);
            case "$onProcessReadyEvent" /* RemoteTerminalChannelEvent.OnProcessReadyEvent */: return (this._ptyHostService.onProcessReady);
            case "$onProcessExitEvent" /* RemoteTerminalChannelEvent.OnProcessExitEvent */: return (this._ptyHostService.onProcessExit);
            case "$onProcessReplayEvent" /* RemoteTerminalChannelEvent.OnProcessReplayEvent */: return (this._ptyHostService.onProcessReplay);
            case "$onProcessOrphanQuestion" /* RemoteTerminalChannelEvent.OnProcessOrphanQuestion */: return (this._ptyHostService.onProcessOrphanQuestion);
            case "$onExecuteCommand" /* RemoteTerminalChannelEvent.OnExecuteCommand */: return (this.onExecuteCommand);
            case "$onDidRequestDetach" /* RemoteTerminalChannelEvent.OnDidRequestDetach */: return (this._ptyHostService.onDidRequestDetach || Event.None);
            case "$onDidChangeProperty" /* RemoteTerminalChannelEvent.OnDidChangeProperty */: return (this._ptyHostService.onDidChangeProperty);
        }
        // @ts-expect-error Assert event is the `never` type to ensure all messages are handled
        throw new Error(`IPC Command ${event} not found`);
    }
    async _createProcess(uriTransformer, args) {
        const shellLaunchConfig = {
            name: args.shellLaunchConfig.name,
            executable: args.shellLaunchConfig.executable,
            args: args.shellLaunchConfig.args,
            cwd: (typeof args.shellLaunchConfig.cwd === 'string' || typeof args.shellLaunchConfig.cwd === 'undefined'
                ? args.shellLaunchConfig.cwd
                : URI.revive(uriTransformer.transformIncoming(args.shellLaunchConfig.cwd))),
            env: args.shellLaunchConfig.env,
            useShellEnvironment: args.shellLaunchConfig.useShellEnvironment,
            reconnectionProperties: args.shellLaunchConfig.reconnectionProperties,
            type: args.shellLaunchConfig.type,
            isFeatureTerminal: args.shellLaunchConfig.isFeatureTerminal,
            tabActions: args.shellLaunchConfig.tabActions,
            shellIntegrationEnvironmentReporting: args.shellLaunchConfig.shellIntegrationEnvironmentReporting,
        };
        const baseEnv = await buildUserEnvironment(args.resolverEnv, !!args.shellLaunchConfig.useShellEnvironment, platform.language, this._environmentService, this._logService, this._configurationService);
        this._logService.trace('baseEnv', baseEnv);
        const reviveWorkspaceFolder = (workspaceData) => {
            return {
                uri: URI.revive(uriTransformer.transformIncoming(workspaceData.uri)),
                name: workspaceData.name,
                index: workspaceData.index,
                toResource: () => {
                    throw new Error('Not implemented');
                }
            };
        };
        const workspaceFolders = args.workspaceFolders.map(reviveWorkspaceFolder);
        const activeWorkspaceFolder = args.activeWorkspaceFolder ? reviveWorkspaceFolder(args.activeWorkspaceFolder) : undefined;
        const activeFileResource = args.activeFileResource ? URI.revive(uriTransformer.transformIncoming(args.activeFileResource)) : undefined;
        const customVariableResolver = new CustomVariableResolver(baseEnv, workspaceFolders, activeFileResource, args.resolvedVariables, this._extensionManagementService);
        const variableResolver = terminalEnvironment.createVariableResolver(activeWorkspaceFolder, process.env, customVariableResolver);
        // Get the initial cwd
        const initialCwd = await terminalEnvironment.getCwd(shellLaunchConfig, os.homedir(), variableResolver, activeWorkspaceFolder?.uri, args.configuration['terminal.integrated.cwd'], this._logService);
        shellLaunchConfig.cwd = initialCwd;
        const envPlatformKey = platform.isWindows ? 'terminal.integrated.env.windows' : (platform.isMacintosh ? 'terminal.integrated.env.osx' : 'terminal.integrated.env.linux');
        const envFromConfig = args.configuration[envPlatformKey];
        const env = await terminalEnvironment.createTerminalEnvironment(shellLaunchConfig, envFromConfig, variableResolver, this._productService.version, args.configuration['terminal.integrated.detectLocale'], baseEnv);
        // Apply extension environment variable collections to the environment
        if (shouldUseEnvironmentVariableCollection(shellLaunchConfig)) {
            const entries = [];
            for (const [k, v, d] of args.envVariableCollections) {
                entries.push([k, { map: deserializeEnvironmentVariableCollection(v), descriptionMap: deserializeEnvironmentDescriptionMap(d) }]);
            }
            const envVariableCollections = new Map(entries);
            const mergedCollection = new MergedEnvironmentVariableCollection(envVariableCollections);
            const workspaceFolder = activeWorkspaceFolder ? activeWorkspaceFolder ?? undefined : undefined;
            await mergedCollection.applyToProcessEnvironment(env, { workspaceFolder }, variableResolver);
        }
        // Fork the process and listen for messages
        this._logService.debug(`Terminal process launching on remote agent`, { shellLaunchConfig, initialCwd, cols: args.cols, rows: args.rows, env });
        // Setup the CLI server to support forwarding commands run from the CLI
        const ipcHandlePath = createRandomIPCHandle();
        env.VSCODE_IPC_HOOK_CLI = ipcHandlePath;
        const persistentProcessId = await this._ptyHostService.createProcess(shellLaunchConfig, initialCwd, args.cols, args.rows, args.unicodeVersion, env, baseEnv, args.options, args.shouldPersistTerminal, args.workspaceId, args.workspaceName);
        const commandsExecuter = {
            executeCommand: (id, ...args) => this._executeCommand(persistentProcessId, id, args, uriTransformer)
        };
        const cliServer = new CLIServerBase(commandsExecuter, this._logService, ipcHandlePath);
        this._ptyHostService.onProcessExit(e => e.id === persistentProcessId && cliServer.dispose());
        return {
            persistentTerminalId: persistentProcessId,
            resolvedShellLaunchConfig: shellLaunchConfig
        };
    }
    _executeCommand(persistentProcessId, commandId, commandArgs, uriTransformer) {
        const { resolve, reject, promise } = promiseWithResolvers();
        const reqId = ++this._lastReqId;
        this._pendingCommands.set(reqId, { resolve: resolve, reject, uriTransformer });
        const serializedCommandArgs = cloneAndChange(commandArgs, (obj) => {
            if (obj && obj.$mid === 1) {
                // this is UriComponents
                return uriTransformer.transformOutgoing(obj);
            }
            if (obj && obj instanceof URI) {
                return uriTransformer.transformOutgoingURI(obj);
            }
            return undefined;
        });
        this._onExecuteCommand.fire({
            reqId,
            persistentProcessId,
            commandId,
            commandArgs: serializedCommandArgs
        });
        return promise;
    }
    _sendCommandResult(reqId, isError, serializedPayload) {
        const data = this._pendingCommands.get(reqId);
        if (!data) {
            return;
        }
        this._pendingCommands.delete(reqId);
        const payload = cloneAndChange(serializedPayload, (obj) => {
            if (obj && obj.$mid === 1) {
                // this is UriComponents
                return data.uriTransformer.transformIncoming(obj);
            }
            return undefined;
        });
        if (isError) {
            data.reject(payload);
        }
        else {
            data.resolve(payload);
        }
    }
    _getDefaultSystemShell(osOverride) {
        return this._ptyHostService.getDefaultSystemShell(osOverride);
    }
    async _getProfiles(workspaceId, profiles, defaultProfile, includeDetectedProfiles) {
        return this._ptyHostService.getProfiles(workspaceId, profiles, defaultProfile, includeDetectedProfiles) || [];
    }
    _getEnvironment() {
        return { ...process.env };
    }
    _getWslPath(original, direction) {
        return this._ptyHostService.getWslPath(original, direction);
    }
    _reduceConnectionGraceTime() {
        return this._ptyHostService.reduceConnectionGraceTime();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVGVybWluYWxDaGFubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvcmVtb3RlVGVybWluYWxDaGFubmVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM1RCxPQUFPLEtBQUssSUFBSSxNQUFNLDJCQUEyQixDQUFDO0FBQ2xELE9BQU8sS0FBSyxRQUFRLE1BQU0sK0JBQStCLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRy9DLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBSzdFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxhQUFhLEVBQXFCLE1BQU0sOENBQThDLENBQUM7QUFFaEcsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDdEgsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLHdDQUF3QyxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFFN0osT0FBTyxLQUFLLG1CQUFtQixNQUFNLGdFQUFnRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQzVILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBTXBFLE9BQU8sRUFBRSxvQkFBb0Is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