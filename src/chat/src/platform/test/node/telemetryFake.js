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
exports.startFakeTelemetryServerIfNecessary = startFakeTelemetryServerIfNecessary;
const http = __importStar(require("http"));
const zlib = __importStar(require("zlib"));
const ports_1 = require("../../../util/vs/base/node/ports");
/**
 * A fake AIP telemetry server, that we can use to test the messages we send.
 * The idea is that we the client can be told to POST to http://localhost:{port}/{path}
 * via an override, e.g. TelemetryReporter.appInsightsClient.config.endpointUrl in
 * the JavaScript client.
 *
 * This server will stored the raw (gzipped) JSON messages sent to each path.
 * A subsequent GET request to http://localhost:{port}/{path} will return the stored
 * messages for that path, and also reset the stored messages for that path to empty.
 */
class FakeTelemetryServer {
    constructor(port) {
        this.port = port;
        this.messages = {};
        this.server = http.createServer((req, res) => {
            const url = req.url ?? 'nourl';
            if (req.method === 'POST') {
                if (this.messages[url] === undefined) {
                    this.messages[url] = [];
                }
                let body = '';
                const uncompress = zlib.createGunzip();
                req.pipe(uncompress)
                    .on('data', chunk => {
                    body = body + chunk.toString();
                })
                    .on('end', () => {
                    const lines = body.split('\n');
                    for (const line of lines) {
                        const item = JSON.parse(line);
                        this.messages[url].push(item);
                    }
                    // Only send a response once we've finished processing all the messages.
                    res.writeHead(204);
                    res.end();
                });
            }
            if (req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ messages: this.messages[url] }));
                this.messages[url] = [];
            }
        });
    }
    start() {
        return new Promise((resolve, reject) => {
            this.server.on('listening', function () {
                resolve();
            });
            this.server.listen(this.port);
        });
    }
    stop() {
        this.server.close();
    }
}
async function startFakeTelemetryServerIfNecessary() {
    const newPort = await findFreePort();
    const server = new FakeTelemetryServer(newPort);
    await server.start();
    return server;
}
async function findFreePort() {
    return await (0, ports_1.findFreePortFaster)(5789, 100, 3000);
}
//# sourceMappingURL=telemetryFake.js.map