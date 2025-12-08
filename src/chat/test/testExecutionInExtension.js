"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestExecutionInExtension = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const test_electron_1 = require("@vscode/test-electron");
const vsce_1 = require("@vscode/vsce");
const child_process_1 = require("child_process");
const net_1 = require("net");
const fs = __importStar(require("node:fs/promises"));
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
const rpc_1 = require("../src/extension/onboardDebug/node/copilotDebugWorker/rpc");
const promptContextModel_1 = require("../src/platform/test/node/promptContextModel");
const async_1 = require("../src/util/vs/base/common/async");
const event_1 = require("../src/util/vs/base/common/event");
const iterator_1 = require("../src/util/vs/base/common/iterator");
const lifecycle_1 = require("../src/util/vs/base/common/lifecycle");
const resources_1 = require("../src/util/vs/base/common/resources");
const uri_1 = require("../src/util/vs/base/common/uri");
const uuid_1 = require("../src/util/vs/base/common/uuid");
const simulationEndpointHealth_1 = require("./base/simulationEndpointHealth");
const simulationOutcome_1 = require("./base/simulationOutcome");
const jsonOutputPrinter_1 = require("./jsonOutputPrinter");
const simulationLogger_1 = require("./simulationLogger");
const ports_1 = require("../src/util/vs/base/node/ports");
const ports_2 = require("../src/util/node/ports");
const MAX_CONCURRENT_SESSIONS = 10;
const HOST = '127.0.0.1';
const CONNECT_TIMEOUT = 60_000;
class TestExecutionInExtension {
    static async create(ctx) {
        const store = new lifecycle_1.DisposableStore();
        const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
        //@ts-ignore
        const testConfig = await Promise.resolve().then(() => __importStar(require('../.vscode-test.mjs')));
        const [serverBinary, browser] = await Promise.all([
            (0, test_electron_1.downloadAndUnzipVSCode)(testConfig.default.version, getServerPlatform()),
            chromium.launch({ headless: ctx.opts.headless }),
        ]);
        const browserContext = await browser.newContext();
        const childPortNumber = await (0, ports_1.findFreePortFaster)(40_000, 1_000, 10_000);
        const connectionToken = (0, uuid_1.generateUuid)();
        const controlServer = (0, net_1.createServer)(s => inst._onConnection(s));
        await new Promise((resolve, reject) => {
            controlServer.on('listening', resolve);
            controlServer.on('error', reject);
            controlServer.listen(0, HOST);
        });
        store.add((0, lifecycle_1.toDisposable)(() => controlServer.close()));
        const vsixFile = await TestExecutionInExtension._packExtension();
        const child = (0, child_process_1.spawn)(serverBinary, [
            '--server-data-dir', path_1.default.resolve(__dirname, '../.vscode-test/server-data'),
            '--extensions-dir', path_1.default.resolve(__dirname, '../.vscode-test/server-extensions'),
            ...ctx.opts.installExtensions.flatMap(ext => ['--install-extension', ext]),
            '--install-extension', vsixFile,
            '--force',
            '--accept-server-license-terms',
            '--connection-token', connectionToken,
            '--port', String(childPortNumber),
            '--host', HOST,
            '--disable-workspace-trust',
            '--start-server'
        ], {
            shell: process.platform === 'win32',
            env: {
                ...process.env,
                VSCODE_SIMULATION_EXTENSION_ENTRY: __filename,
                VSCODE_SIMULATION_CONTROL_PORT: String(controlServer.address().port),
            }
        });
        const output = [];
        await new Promise((resolve, reject) => {
            const log = simulationLogger_1.logger.tag('VSCodeServer');
            const push = (data) => {
                log.trace(data.toString().trim());
                output.push(data);
            };
            child.stdout.on('data', push);
            child.stderr.on('data', push);
            child.on('error', reject);
            child.on('spawn', resolve);
        });
        store.add((0, lifecycle_1.toDisposable)(() => child.kill()));
        await (0, async_1.raceCancellablePromises)([
            (0, async_1.createCancelablePromise)(tkn => (0, ports_2.waitForListenerOnPort)(childPortNumber, HOST, tkn)),
            (0, async_1.createCancelablePromise)(tkn => new Promise((resolve, reject) => {
                const listener = () => {
                    reject(new Error(`Child process exited unexpectedly. Output: ${Buffer.concat(output).toString()}`));
                };
                child.on('exit', listener);
                const l = tkn.onCancellationRequested(() => {
                    l.dispose();
                    child.off('exit', listener);
                    resolve();
                });
            })),
            (0, async_1.createCancelablePromise)(tkn => (0, async_1.timeout)(10_000, tkn).then(e => {
                throw new Error(`Timeout waiting for server to start. Output: ${Buffer.concat(output).toString()}`);
            })),
        ]);
        const inst = new TestExecutionInExtension(ctx, output, browser, browserContext, child, childPortNumber, store, connectionToken);
        return inst;
    }
    static async _packExtension() {
        const packageJsonPath = path_1.default.resolve(__dirname, '..', 'package.json');
        const extensionDir = path_1.default.resolve(__dirname, '..', 'test', 'simulationExtension');
        const existingVsix = (await fs.readdir(extensionDir)).map(e => path_1.default.join(extensionDir, e)).find(f => f.endsWith('.vsix'));
        if (existingVsix) {
            const vsixMtime = await fs.stat(existingVsix).then(s => s.mtimeMs);
            const packageJsonMtime = await fs.stat(packageJsonPath).then(s => s.mtimeMs);
            if (vsixMtime >= packageJsonMtime) {
                return existingVsix;
            }
            await fs.rm(existingVsix, { force: true });
        }
        simulationLogger_1.logger.info('Packing extension for simulation test run...');
        const packageJsonContents = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        await fs.writeFile(path_1.default.join(extensionDir, 'package.json'), JSON.stringify({
            name: packageJsonContents.name,
            publisher: packageJsonContents.publisher,
            engines: packageJsonContents.engines,
            displayName: 'Simulation Extension',
            description: 'An extension installed in the VS Code server for the simulation test runs',
            enabledApiProposals: packageJsonContents.enabledApiProposals,
            version: `0.0.${Date.now()}`,
            activationEvents: ['*'],
            main: './extension.js',
            contributes: {
                languageModelTools: packageJsonContents.contributes?.languageModelTools,
            },
        }));
        const vsixPath = path_1.default.join(extensionDir, 'extension.vsix');
        await (0, vsce_1.createVSIX)({
            cwd: extensionDir,
            dependencies: false,
            packagePath: vsixPath,
            allowStarActivation: true,
            allowMissingRepository: true,
            skipLicense: true,
            allowUnusedFilesPattern: true,
        });
        simulationLogger_1.logger.info('Simulation extension packed successfully.');
        return vsixPath;
    }
    constructor(_ctx, output, _browser, _browserContext, _child, _serverPortNumber, _store, _connectionToken) {
        this._ctx = _ctx;
        this._browser = _browser;
        this._browserContext = _browserContext;
        this._child = _child;
        this._serverPortNumber = _serverPortNumber;
        this._store = _store;
        this._connectionToken = _connectionToken;
        this._isDisposed = false;
        this._pending = new Set();
        this._available = new Set();
        this._onDidChangeWorkspaces = new event_1.Emitter();
        _store.add(this._onDidChangeWorkspaces);
        this._child.on('exit', (code, signal) => {
            if (this._isDisposed) {
                return;
            }
            if (code !== 0) {
                simulationLogger_1.logger.error(`Child process exited with code ${code} and signal ${signal}. Output:`);
                simulationLogger_1.logger.error(Buffer.concat(output).toString());
            }
        });
    }
    async executeTest(ctx, _parallelism, outcomeDirectory, test, runNumber) {
        let workspace;
        const explicitWorkspaceFolder = test.options.scenarioFolderPath && test.options.stateFile ? (0, promptContextModel_1.deserializeWorkbenchState)(test.options.scenarioFolderPath, path_1.default.join(test.options.scenarioFolderPath, test.options.stateFile)).workspaceFolderPath : undefined;
        const beforeWorkspace = Date.now();
        try {
            workspace = await this._acquireWorkspace(ctx, explicitWorkspaceFolder);
            const afterWorkspace = Date.now();
            simulationOutcome_1.ProxiedSimulationOutcome.registerTo(ctx.simulationOutcome, workspace.connection);
            jsonOutputPrinter_1.ProxiedSONOutputPrinter.registerTo(ctx.jsonOutputPrinter, workspace.connection);
            simulationEndpointHealth_1.ProxiedSimulationEndpointHealth.registerTo(ctx.simulationEndpointHealth, workspace.connection);
            const res = await workspace.connection.callMethod('runTest', {
                testName: test.fullName,
                outcomeDirectory,
                runNumber,
            });
            // For running in an explicit folder, don't let other connections reuse it
            if (explicitWorkspaceFolder) {
                await workspace.dispose();
                this._available.delete(workspace);
            }
            else {
                await workspace.clean();
            }
            this._onDidChangeWorkspaces.fire(); // wake up any tests waiting for a workspace
            const afterTest = Date.now();
            simulationLogger_1.logger.trace(`[TestExecutionInExtension] Workspace acquired in ${afterWorkspace - beforeWorkspace}ms, test run in ${afterTest - afterWorkspace}ms`);
            return res.result;
        }
        catch (e) {
            simulationLogger_1.logger.error(`Error running test: ${e}`);
            if (workspace) {
                await this._disposeWorkspace(workspace);
            }
            throw e;
        }
    }
    async _disposeWorkspace(workspace) {
        await workspace.dispose().catch(() => { });
        this._available.delete(workspace);
        this._onDidChangeWorkspaces.fire();
    }
    async _acquireWorkspace(ctx, explicitWorkspaceFolder) {
        // Get a workspace if one is available. If not and there are no pending
        // workspaces, make one. And then wait for a workspace to be available.
        while (true) {
            const available = iterator_1.Iterable.find(this._available, v => !v.busy && (!explicitWorkspaceFolder || v.dir === explicitWorkspaceFolder));
            if (available) {
                available.busy = true;
                this._onDidChangeWorkspaces.fire();
                return available;
            }
            if (explicitWorkspaceFolder || this._pending.size + this._available.size < MAX_CONCURRENT_SESSIONS) {
                const dir = explicitWorkspaceFolder || path_1.default.join((0, os_1.tmpdir)(), 'vscode-simulation-extension-test', (0, uuid_1.generateUuid)());
                const workspace = ProxiedWorkspace.create(dir, this._browserContext, this._serverPortNumber, this._connectionToken);
                const pending = { dir, workspace };
                this._pending.add(pending);
                workspace.then(w => w.onDidTimeout(() => {
                    simulationLogger_1.logger.warn(`Pending workspace connection ${dir} timed out. Will retry...`);
                    this._pending.delete(pending);
                    this._onDidChangeWorkspaces.fire();
                    w.dispose();
                }));
            }
            await event_1.Event.toPromise(this._onDidChangeWorkspaces.event);
        }
    }
    _onConnection(socket) {
        const rpc = new rpc_1.SimpleRPC(socket);
        rpc.registerMethod('deviceCodeCallback', ({ url }) => {
            simulationLogger_1.logger.warn(`⚠️ \x1b[31mAuth Required!\x1b[0m Please open the link: ${url}`);
        });
        rpc.registerMethod('init', async (params) => {
            const record = [...this._pending].find(w => resources_1.extUriBiasedIgnorePathCase.isEqual(uri_1.URI.file(w.dir), uri_1.URI.file(params.folder)));
            if (!record) {
                socket.end();
                const err = new Error(`No workspace found for folder ${params.folder}`);
                simulationLogger_1.logger.error(err);
                throw err;
            }
            const workspace = await record.workspace;
            this._pending.delete(record);
            this._available.add(workspace.onConnection(rpc));
            this._onDidChangeWorkspaces.fire();
            const argv = [...process.argv, '--in-extension-host', 'false'];
            if (!argv.some(a => a.startsWith('--output'))) {
                // Ensure output is stable otherwise it's regenerated
                argv.push('--output', this._ctx.outputPath);
            }
            return { argv };
        });
    }
    async dispose() {
        this._isDisposed = true;
        await Promise.all([...this._pending].map(w => w.workspace.then(w => w.dispose())));
        await Promise.all([...this._available].map(w => w.dispose()));
        this._pending.clear();
        this._available.clear();
        await this._browserContext.close();
        await this._browser.close();
        this._store.dispose();
    }
}
exports.TestExecutionInExtension = TestExecutionInExtension;
class ProxiedWorkspace extends lifecycle_1.Disposable {
    static async create(dir, context, serverPort, connectionToken) {
        // swebench runs run on the 'real' working directory and expect to be modified
        // in-place. If it looks like this is happening, don't clear the directory
        // afte each run.
        let isReused = false;
        try {
            isReused = (await fs.readdir(dir)).length > 0;
        }
        catch {
            // ignore
        }
        await fs.mkdir(dir, { recursive: true });
        const url = new URL('http://127.0.0.1');
        url.port = String(serverPort);
        url.searchParams.set('tkn', connectionToken);
        url.searchParams.set('folder', uri_1.URI.file(dir).path);
        const page = await context.newPage();
        await page.goto(url.toString());
        return new ProxiedWorkspace(page, dir, isReused);
    }
    get connection() {
        return this._connection.value;
    }
    get onDidTimeout() {
        return this._onDidTimeout.event;
    }
    constructor(_page, dir, _dirIsReused) {
        super();
        this._page = _page;
        this.dir = dir;
        this._dirIsReused = _dirIsReused;
        this._connection = new async_1.DeferredPromise();
        this._onDidTimeout = this._register(new event_1.Emitter());
        this._connectionTimeout = this._register((0, async_1.disposableTimeout)(() => {
            this._onDidTimeout.fire();
        }, CONNECT_TIMEOUT));
        this.busy = false;
        const log = simulationLogger_1.logger.tag('ProxiedWorkspace');
        _page.on('console', e => log.debug(`[ProxiedWorkspace] ${e.type().toUpperCase()}: ${e.text()}`));
    }
    onConnection(rpc) {
        this._connection.complete(rpc);
        this._connectionTimeout.dispose();
        return this;
    }
    async clean() {
        if (!this._dirIsReused) {
            const entries = await fs.readdir(this.dir);
            for (const entry of entries) {
                await fs.rm(path_1.default.join(this.dir, entry), { recursive: true, force: true });
            }
        }
        this.busy = false;
    }
    async dispose() {
        super.dispose();
        await this._connection.value?.callMethod('close', {}).catch(() => { });
        this._connection.value?.dispose();
        await this._page.close();
        // retry because the folder will be locked until the EH gets shut down
        if (!this._dirIsReused) {
            await (0, async_1.retry)(() => fs.rm(this.dir, { recursive: true, force: true }).catch(() => { }), 400, 10);
        }
    }
}
function getServerPlatform() {
    switch (process.platform) {
        case 'darwin':
            return process.arch === 'arm64' ? 'server-darwin-arm64-web' : 'server-darwin-web';
        case 'linux':
            return process.arch === 'arm64' ? 'server-linux-arm64-web' : 'server-linux-x64-web';
        case 'win32':
            return process.arch === 'arm64' ? 'server-win32-arm64-web' : 'server-win32-x64-web';
        default:
            throw new Error(`Unsupported platform: ${process.platform}`);
    }
}
//# sourceMappingURL=testExecutionInExtension.js.map