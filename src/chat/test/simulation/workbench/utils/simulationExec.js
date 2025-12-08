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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIMULATION_MAIN_PATH = void 0;
exports.spawnSimulation = spawnSimulation;
exports.spawnSimulationFromMainProcess = spawnSimulationFromMainProcess;
exports.extractJSONL = extractJSONL;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const cp = __importStar(require("child_process"));
const electron_1 = require("electron");
const path = __importStar(require("path"));
const async_1 = require("../../../../src/util/vs/base/common/async");
const cancellation_1 = require("../../../../src/util/vs/base/common/cancellation");
const utils_1 = require("./utils");
exports.SIMULATION_MAIN_PATH = path.join(utils_1.REPO_ROOT, './dist/simulationMain.js');
function spawnSimulation(options, token = cancellation_1.CancellationToken.None) {
    return extractJSONL(forkSimulationMain(options.args, token), options);
}
/** spawn `npm run simulate` from Electron main process */
function spawnSimulationFromMainProcess(options, token = cancellation_1.CancellationToken.None) {
    return extractJSONL(forkSimulationMainFromMainProcess(options.args, token), options);
}
let mainRendererEventProcessor;
function forkSimulationMainFromMainProcess(args, token) {
    if (!mainRendererEventProcessor) {
        mainRendererEventProcessor = new MainProcessEventHandler();
    }
    return mainRendererEventProcessor.spawn(args, token);
}
function extractJSONL(source, options) {
    return splitToLines(source).map((line) => {
        if (line.length === 0) {
            // always ignore empty lines
            return null;
        }
        if (!line.startsWith('{') || !line.endsWith('}')) {
            if (!options?.ignoreNonJSONLines) {
                console.warn(line);
            }
            return null;
        }
        try {
            const obj = JSON.parse(line);
            return obj;
        }
        catch (err) {
            if (!options?.ignoreNonJSONLines) {
                console.error(`ignoring invalid line: ${line}`);
            }
            return null;
        }
    }).coalesce();
}
/**
 * Split an incoming stream of text to a stream of lines.
 */
function splitToLines(source) {
    return new async_1.AsyncIterableObject(async (emitter) => {
        let buffer = '';
        for await (const str of source) {
            buffer += str;
            do {
                const newlineIndex = buffer.indexOf('\n');
                if (newlineIndex === -1) {
                    break;
                }
                // take the first line
                const line = buffer.substring(0, newlineIndex);
                buffer = buffer.substring(newlineIndex + 1);
                emitter.emitOne(line);
            } while (true);
        }
        if (buffer.length > 0) {
            // last line which doesn't end with \n
            emitter.emitOne(buffer);
        }
    });
}
function forkSimulationMain(args, token) {
    return new async_1.AsyncIterableObject((emitter) => {
        return new Promise((resolve, reject) => {
            const proc = cp.spawn('node', [exports.SIMULATION_MAIN_PATH, ...args], { stdio: 'pipe' });
            const listener = token.onCancellationRequested(() => {
                proc.kill('SIGTERM');
                // FIXME@ulugbekna: let's not reject the promise for now -- otherwise, stdout.json.txt isn't written
                // reject(new CancellationError());
            });
            proc.on('error', (err) => {
                listener.dispose();
                reject(err);
            });
            proc.on('exit', (code, signal) => {
                listener.dispose();
                if (code !== 0) {
                    reject(new Error(`Process exited with code ${code}`));
                    return;
                }
                resolve();
            });
            proc.stdout?.setEncoding('utf8');
            proc.stdout?.on('data', (data) => {
                emitter?.emitOne(data);
            });
            proc.stderr?.setEncoding('utf8');
            proc.stderr?.on('data', (data) => {
                console.error(data);
            });
        });
    });
}
// change to configure logging, e.g., to `console.debug`
const log = {
    debug: (...args) => { }
};
class MainProcessEventHandler {
    constructor() {
        this.i = 0;
        this.idMap = new Map();
        electron_1.ipcRenderer.on('stdout-data', (_event, { id, data }) => {
            log.debug(`stdout-data (ID ${id}): ${data.toString()}`);
            const handle = this.getHandleOrThrow(id);
            handle.emitter.emitOne(data);
        });
        electron_1.ipcRenderer.on('stderr-data', (_event, { id, data }) => {
            console.warn(`stderr-data (ID ${id}): ${data.toString()}`);
            // const handle = this.getHandleOrThrow(id);
            // handle.emitter.emitOne(data);
        });
        electron_1.ipcRenderer.on('process-exit', (_event, { id, code }) => {
            log.debug(`process exit (ID ${id}) with code ${code}`);
            const handle = this.getHandleOrThrow(id);
            this.idMap.delete(id);
            handle.cancellationListener.dispose();
            if (code === 0) {
                handle.resolve();
            }
            else {
                handle.reject(`Process exited with code ${code}`);
            }
        });
    }
    spawn(processArgs, token) {
        const id = this.i++;
        const idMap = this.idMap;
        return new async_1.AsyncIterableObject((emitter) => {
            return new Promise((resolve, reject) => {
                const cancellationListener = token.onCancellationRequested(() => {
                    electron_1.ipcRenderer.send('kill-process', { id });
                });
                idMap.set(id, { emitter, cancellationListener, resolve, reject });
                electron_1.ipcRenderer.send('spawn-process', { id, processArgs });
            });
        });
    }
    getHandleOrThrow(id) {
        const handle = this.idMap.get(id);
        if (!handle) {
            throw new Error(`[MainProcessEventHandler] No handle found for ID ${id}`);
        }
        return handle;
    }
}
//# sourceMappingURL=simulationExec.js.map