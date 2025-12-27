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
import { equals as arraysEqual } from '../../../../base/common/arrays.js';
import { assertNever } from '../../../../base/common/assert.js';
import { Throttler } from '../../../../base/common/async.js';
import * as glob from '../../../../base/common/glob.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { equals as objectsEqual } from '../../../../base/common/objects.js';
import { autorun, autorunDelta, derivedOpts } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IDebugService } from '../../debug/common/debug.js';
import { IMcpRegistry } from './mcpRegistryTypes.js';
let McpDevModeServerAttache = class McpDevModeServerAttache extends Disposable {
    constructor(server, fwdRef, registry, fileService, workspaceContextService) {
        super();
        const workspaceFolder = server.readDefinitions().map(({ collection }) => collection?.presentation?.origin &&
            workspaceContextService.getWorkspaceFolder(collection.presentation?.origin)?.uri);
        const restart = async () => {
            const lastDebugged = fwdRef.lastModeDebugged;
            await server.stop();
            await server.start({ debug: lastDebugged });
        };
        // 1. Auto-start the server, restart if entering debug mode
        let didAutoStart = false;
        this._register(autorun(reader => {
            const defs = server.readDefinitions().read(reader);
            if (!defs.collection || !defs.server || !defs.server.devMode) {
                didAutoStart = false;
                return;
            }
            // don't keep trying to start the server unless it's a new server or devmode is newly turned on
            if (didAutoStart) {
                return;
            }
            const delegates = registry.delegates.read(reader);
            if (!delegates.some(d => d.canStart(defs.collection, defs.server))) {
                return;
            }
            server.start();
            didAutoStart = true;
        }));
        const debugMode = server.readDefinitions().map(d => !!d.server?.devMode?.debug);
        this._register(autorunDelta(debugMode, ({ lastValue, newValue }) => {
            if (!!newValue && !objectsEqual(lastValue, newValue)) {
                restart();
            }
        }));
        // 2. Watch for file changes
        const watchObs = derivedOpts({ equalsFn: arraysEqual }, reader => {
            const def = server.readDefinitions().read(reader);
            const watch = def.server?.devMode?.watch;
            return typeof watch === 'string' ? [watch] : watch;
        });
        const restartScheduler = this._register(new Throttler());
        this._register(autorun(reader => {
            const pattern = watchObs.read(reader);
            const wf = workspaceFolder.read(reader);
            if (!pattern || !wf) {
                return;
            }
            const includes = pattern.filter(p => !p.startsWith('!'));
            const excludes = pattern.filter(p => p.startsWith('!')).map(p => p.slice(1));
            reader.store.add(fileService.watch(wf, { includes, excludes, recursive: true }));
            const includeParse = includes.map(p => glob.parse({ base: wf.fsPath, pattern: p }));
            const excludeParse = excludes.map(p => glob.parse({ base: wf.fsPath, pattern: p }));
            reader.store.add(fileService.onDidFilesChange(e => {
                for (const change of [e.rawAdded, e.rawDeleted, e.rawUpdated]) {
                    for (const uri of change) {
                        if (includeParse.some(i => i(uri.fsPath)) && !excludeParse.some(e => e(uri.fsPath))) {
                            restartScheduler.queue(restart);
                            break;
                        }
                    }
                }
            }));
        }));
    }
};
McpDevModeServerAttache = __decorate([
    __param(2, IMcpRegistry),
    __param(3, IFileService),
    __param(4, IWorkspaceContextService)
], McpDevModeServerAttache);
export { McpDevModeServerAttache };
export const IMcpDevModeDebugging = createDecorator('mcpDevModeDebugging');
const DEBUG_HOST = '127.0.0.1';
let McpDevModeDebugging = class McpDevModeDebugging {
    constructor(_debugService, _commandService) {
        this._debugService = _debugService;
        this._commandService = _commandService;
    }
    async transform(definition, launch) {
        if (!definition.devMode?.debug || launch.type !== 1 /* McpServerTransportType.Stdio */) {
            return launch;
        }
        const port = await this.getDebugPort();
        const name = `MCP: ${definition.label}`; // for debugging
        const options = { startedByUser: false, suppressDebugView: true };
        const commonConfig = {
            internalConsoleOptions: 'neverOpen',
            suppressMultipleSessionWarning: true,
        };
        switch (definition.devMode.debug.type) {
            case 'node': {
                if (!/node[0-9]*$/.test(launch.command)) {
                    throw new Error(localize('mcp.debug.nodeBinReq', 'MCP server must be launched with the "node" executable to enable debugging, but was launched with "{0}"', launch.command));
                }
                // We intentionally assert types as the DA has additional properties beyong IConfig
                // eslint-disable-next-line local/code-no-dangerous-type-assertions
                this._debugService.startDebugging(undefined, {
                    type: 'pwa-node',
                    request: 'attach',
                    name,
                    port,
                    host: DEBUG_HOST,
                    timeout: 30_000,
                    continueOnAttach: true,
                    ...commonConfig,
                }, options);
                return { ...launch, args: [`--inspect-brk=${DEBUG_HOST}:${port}`, ...launch.args] };
            }
            case 'debugpy': {
                if (!/python[0-9.]*$/.test(launch.command)) {
                    throw new Error(localize('mcp.debug.pythonBinReq', 'MCP server must be launched with the "python" executable to enable debugging, but was launched with "{0}"', launch.command));
                }
                let command;
                let args = ['--wait-for-client', '--connect', `${DEBUG_HOST}:${port}`, ...launch.args];
                if (definition.devMode.debug.debugpyPath) {
                    command = definition.devMode.debug.debugpyPath;
                }
                else {
                    try {
                        // The Python debugger exposes a command to get its bundle debugpy module path.  Use that if it's available.
                        const debugPyPath = await this._commandService.executeCommand('python.getDebugpyPackagePath');
                        if (debugPyPath) {
                            command = launch.command;
                            args = [debugPyPath, ...args];
                        }
                    }
                    catch {
                        // ignored, no Python debugger extension installed or an error therein
                    }
                }
                if (!command) {
                    command = 'debugpy';
                }
                await Promise.race([
                    // eslint-disable-next-line local/code-no-dangerous-type-assertions
                    this._debugService.startDebugging(undefined, {
                        type: 'debugpy',
                        name,
                        request: 'attach',
                        listen: {
                            host: DEBUG_HOST,
                            port
                        },
                        ...commonConfig,
                    }, options),
                    this.ensureListeningOnPort(port)
                ]);
                return { ...launch, command, args };
            }
            default:
                assertNever(definition.devMode.debug, `Unknown debug type ${JSON.stringify(definition.devMode.debug)}`);
        }
    }
    ensureListeningOnPort(port) {
        return Promise.resolve();
    }
    getDebugPort() {
        return Promise.resolve(9230);
    }
};
McpDevModeDebugging = __decorate([
    __param(0, IDebugService),
    __param(1, ICommandService)
], McpDevModeDebugging);
export { McpDevModeDebugging };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwRGV2TW9kZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwRGV2TW9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxJQUFJLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE1BQU0sSUFBSSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMzRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFXLGFBQWEsRUFBd0IsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHOUMsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FB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