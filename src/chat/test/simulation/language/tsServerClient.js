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
exports.TSServerClient = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert_1 = __importDefault(require("assert"));
const cp = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const tsserverlibrary_1 = __importDefault(require("typescript/lib/tsserverlibrary"));
const async_1 = require("../../../src/util/vs/base/common/async");
const vscodeTypes_1 = require("../../../src/vscodeTypes");
const stest_1 = require("../../base/stest");
const tsc_1 = require("../diagnosticProviders/tsc");
const utils_1 = require("../diagnosticProviders/utils");
const stestUtil_1 = require("../stestUtil");
class TSServerRPC {
    constructor(_server) {
        this._server = _server;
        _server.stdin?.setDefaultEncoding('utf8');
        _server.stdout?.setEncoding('utf8');
        _server.stderr?.setEncoding('utf8');
        _server.on('close', () => {
            for (const reply of this._awaitingResponse.values()) {
                reply.error(new Error('server closed'));
            }
        });
        this._seq = 0;
        this._awaitingResponse = new Map();
        this._stdoutBuffer = '';
        this._registerOnDataHandler();
    }
    send(data) {
        const obj = { ...data, seq: this._seq++ };
        const objS = `${JSON.stringify(obj)}\r\n`;
        const reply = new async_1.DeferredPromise();
        this._server.stdin.write(objS, err => {
            if (err) {
                reply.error(err);
            }
        });
        this._awaitingResponse.set(obj.seq, reply);
        return reply.p;
    }
    emit(data) {
        const obj = { ...data, seq: this._seq++ };
        const objS = `${JSON.stringify(obj)}\r\n`;
        this._server.stdin.write(objS, (_err) => {
            // ignored, server closed
        });
    }
    _registerOnDataHandler() {
        this._server.stdout.on('data', (chunk) => {
            this._stdoutBuffer += chunk;
            this._tryProcessStdoutBuffer();
        });
        this._server.stderr.on('data', (chunk) => {
            console.error(`stderr chunk: ${chunk}`);
        });
    }
    _tryProcessStdoutBuffer() {
        do {
            const eolIndex = this._stdoutBuffer.indexOf('\r\n');
            if (eolIndex === -1) {
                break;
            }
            // parse header
            const firstLine = this._stdoutBuffer.substring(0, eolIndex);
            const contentLength = parseInt(firstLine.substring('Content-Length: '.length), 10);
            // try parse body
            const body = this._stdoutBuffer.substring(eolIndex + 4, eolIndex + 4 + contentLength);
            if (body.length < contentLength) {
                // entire body did not arrive yet
                break;
            }
            this._stdoutBuffer = this._stdoutBuffer.substring(eolIndex + 4 + contentLength);
            this._handleServerMessage(JSON.parse(body));
        } while (true);
    }
    _handleServerMessage(msg) {
        switch (msg.type) {
            case 'event':
            case 'request':
                break;
            case 'response': {
                const resp = msg;
                const respP = this._awaitingResponse.get(resp.request_seq);
                if (respP === undefined) {
                    console.error(`received response for unexpected seq ${resp.request_seq}`);
                }
                else {
                    respP.complete(resp);
                }
                break;
            }
        }
    }
}
class TSServerClient {
    static { this.id = 'tsc-language-features'; }
    static cacheVersion() {
        return 1;
    }
    constructor(_workspaceFiles) {
        this._workspaceFiles = _workspaceFiles;
        this._state = { k: 'uninitialized' };
    }
    async _init() {
        this._initPromise ??= (async () => {
            const { workspacePath, files } = await this._setUp(this._workspaceFiles);
            const tsserverPath = path_1.default.resolve(path_1.default.join(stest_1.REPO_ROOT, 'node_modules/typescript/lib/tsserver.js'));
            const tsServerCP = cp.fork(tsserverPath, {
                cwd: workspacePath,
                stdio: ['pipe', 'pipe', 'pipe', 'ipc']
            });
            const tsServerRpc = new TSServerRPC(tsServerCP);
            this._state = {
                k: 'initialized',
                workspacePath,
                files,
                tsServerCP,
                tsServerRpc,
            };
            // send "open" notifications
            for (const file of files) {
                tsServerRpc.emit({
                    "type": "request",
                    "command": "open",
                    "arguments": { "file": file.filePath }
                });
            }
        })();
        await this._initPromise;
    }
    async teardown() {
        if (this._state.k === 'uninitialized') {
            return;
        }
        await this._state.tsServerRpc.send({
            "type": "request",
            "command": "exit",
        });
        await (0, stestUtil_1.cleanTempDirWithRetry)(this._state.workspacePath);
    }
    async findDefinitions(fileName, position) {
        return this.find(tsserverlibrary_1.default.server.protocol.CommandTypes.DefinitionAndBoundSpan, fileName, position);
    }
    async findReferences(fileName, position) {
        return this.find(tsserverlibrary_1.default.server.protocol.CommandTypes.References, fileName, position);
    }
    async find(command, fileName, position) {
        await this._init();
        (0, assert_1.default)(this._state.k === 'initialized');
        const response = await this._state.tsServerRpc.send({
            type: "request",
            command,
            arguments: {
                file: this._state.files.find(file => file.fileName === fileName).filePath,
                line: position.line + 1,
                offset: position.character + 1,
            }
        });
        (0, assert_1.default)(response.command === command);
        if (!response.success) {
            throw new Error(`Request failed: ${response.message}`);
        }
        const locations = command === tsserverlibrary_1.default.server.protocol.CommandTypes.DefinitionAndBoundSpan ? response.body.definitions : response.body.refs;
        const workspacePathWithSlash = path_1.default.join(this._state.workspacePath, '/');
        const resultingDefinitions = [];
        for (const location of locations) {
            if (path_1.default.normalize(location.file).startsWith(workspacePathWithSlash)) {
                const range = new vscodeTypes_1.Range(location.start.line - 1, location.start.offset - 1, location.end.line - 1, location.end.offset - 1);
                const fileName = location.file.substring(workspacePathWithSlash.length);
                resultingDefinitions.push({ fileName, range });
            }
            else {
                // ignore all matches in non-workspace files, e.g. in d.ts files
            }
        }
        return resultingDefinitions;
    }
    async _setUp(_files = []) {
        const workspacePath = await (0, stestUtil_1.createTempDir)();
        const files = await (0, utils_1.setupTemporaryWorkspace)(workspacePath, _files);
        const packagejson = files.find(file => path_1.default.basename(file.fileName) === 'package.json');
        if (packagejson) {
            await (0, tsc_1.doRunNpmInstall)(path_1.default.dirname(packagejson.filePath));
        }
        const hasTSConfigFile = files.some(file => path_1.default.basename(file.fileName) === 'tsconfig.json');
        if (!hasTSConfigFile) {
            const tsconfigPath = path_1.default.join(workspacePath, 'tsconfig.json');
            await fs.promises.writeFile(tsconfigPath, JSON.stringify({
                "compilerOptions": {
                    "target": "es2021",
                    "strict": true,
                    "module": "commonjs",
                    "outDir": "out",
                    "sourceMap": true
                },
                "exclude": [
                    "node_modules",
                    "outcome",
                    "scenarios"
                ]
            }));
        }
        return { workspacePath, files };
    }
}
exports.TSServerClient = TSServerClient;
//# sourceMappingURL=tsServerClient.js.map