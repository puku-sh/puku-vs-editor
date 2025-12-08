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
const crypto_1 = require("crypto");
const node_net_1 = require("node:net");
const os_1 = require("os");
const readline = __importStar(require("readline"));
const path = __importStar(require("../../../../util/vs/base/common/path"));
const open_1 = require("./open");
const rpc_1 = require("./rpc");
// ⚠️⚠️⚠️
// This file is built into a standlone bundle, executed in a worker.
// Avoid including unnecessary dependencies!
//
// This is used on macOS and Linux. On Windows, you'll need to make changes
// in copilotDebugWorker.ps1 instead. This is because Electron on Windows
// is not built with support for console stdin.
// ⚠️⚠️⚠️
const [_node, _script, callbackUrl, remoteCommand, ...args] = process.argv;
const flagConfig = {
    ["--print" /* Flags.Print */]: false,
    ["--no-cache" /* Flags.NoCache */]: false,
    ["--help" /* Flags.Help */]: false,
    ["--save" /* Flags.Save */]: false,
    ["--once" /* Flags.Once */]: false,
};
while (args.length && flagConfig.hasOwnProperty(args[0])) {
    flagConfig[args.shift()] = true;
}
if (!args.length || flagConfig["--help" /* Flags.Help */]) {
    console.log(`Usage: copilot-debug [${Object.keys(flagConfig).join('] [')}] <command> <args...>`);
    console.log('');
    console.log('Options:');
    console.log('  --print     Print the generated configuration without running it');
    console.log('  --no-cache  Generate a new configuration without checking the cache.');
    console.log('  --save      Save the configuration to your launch.json.');
    console.log('  --once      Exit after the debug session ends.');
    console.log('  --help      Print this help.');
    process.exit(flagConfig["--help" /* Flags.Help */] ? 0 : 1);
}
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
const server = (0, node_net_1.createServer)(socket => {
    clearInterval(waitingMessage);
    const rpc = new rpc_1.SimpleRPC(socket);
    rpc.registerMethod('output', ({ category, output }) => {
        if (category === 'stderr') {
            process.stderr.write(output);
        }
        else if (category === 'stdout') {
            process.stdout.write(output);
        }
        else if (category !== 'telemetry' && output) {
            console.log(output); // so that a newline is added
        }
        return Promise.resolve();
    });
    rpc.registerMethod('exit', async ({ code, error }) => {
        if (error && !triedToStop) {
            console.error(error);
        }
        await Promise.all([
            new Promise(resolve => process.stdout.end(resolve)),
            new Promise(resolve => process.stderr.end(resolve)),
        ]).then(() => process.exit(code));
    });
    let triedToStop = false;
    function onInterrupt() {
        if (triedToStop) {
            process.exit(1);
        }
        else {
            triedToStop = true;
            socket.end(() => {
                process.exit(1);
            });
        }
    }
    process.on('SIGINT', onInterrupt);
    process.stdin.on('keypress', (_str, key) => {
        if (key.sequence === '\x03' || (key.name === 'c' && (key.ctrl || key.meta))) {
            onInterrupt();
        }
    });
    rpc.registerMethod('question', (r) => {
        return new Promise((resolve) => {
            if (r.singleKey) {
                console.log(r.message);
                const onKeyPress = (str) => {
                    if (str) {
                        process.stdout.write('\x08');
                        process.stdin.off('keypress', onKeyPress);
                        resolve(str === '\n' || str === '\r' ? 'Enter' : (str?.toUpperCase() || ''));
                    }
                };
                process.stdin.on('keypress', onKeyPress);
            }
            else {
                rl.question(`${r.message} [${r.defaultValue}] `, resolve);
            }
        });
    });
    rpc.registerMethod('confirm', (r) => {
        return new Promise((resolve) => {
            rl.question(`${r.message} [${r.defaultValue ? 'Y/n' : 'y/N'}] `, (answer) => {
                resolve(answer === '' ? r.defaultValue : answer.toLowerCase()[0] === 'y');
            });
        });
    });
    const opts = {
        cwd: process.cwd(),
        args,
        forceNew: flagConfig["--no-cache" /* Flags.NoCache */],
        printOnly: flagConfig["--print" /* Flags.Print */],
        save: flagConfig["--save" /* Flags.Save */],
        once: flagConfig["--once" /* Flags.Once */],
    };
    rpc.callMethod('start', opts);
});
const waitingMessage = setInterval(() => {
    console.log('> Waiting for VS Code to connect...');
}, 2000);
const pipeName = `copilot-dbg.${process.pid}-${(0, crypto_1.randomBytes)(4).toString('hex')}.sock`;
const pipePath = path.join(process.platform === 'win32' ? '\\\\.\\pipe\\' : (0, os_1.tmpdir)(), pipeName);
server.listen(pipePath, () => {
    (0, open_1.openVscodeUri)(remoteCommand, callbackUrl + (process.platform === 'win32' ? `/${pipeName}` : pipePath)).then(() => {
        // no-op
    }, error => {
        console.error('Failed to open the activation URI:', error);
        process.exit(1);
    });
});
//# sourceMappingURL=index.js.map